// FileName: electron/syncManager.js
// Ssewasswa Comforts Technologies — Hybrid Cloud Sync Manager
//
// Pushes local SQLite changes to Supabase (online) and pulls remote changes
// back to local SQLite. Designed for offline-first: the desktop app keeps
// working without internet, and syncs when the network returns.
//
// CONFLICT RESOLUTION: every table MUST have a `last_modified` TIMESTAMPTZ
// column. When both local and remote rows were modified, the row with the
// newer `last_modified` wins. Hard-delete sync is not supported (rows are
// soft-deleted via `is_deleted` flag).
//
// USAGE (in electron/main.js):
//   const { SyncManager } = require('./syncManager');
//   const sync = new SyncManager({ db, saveDb, supabaseUrl, supabaseKey, schoolId });
//   sync.startAutoSync();  // every 5 min
//   ipcMain.handle('sync-now', () => sync.syncNow());

const { ipcMain } = require('electron');

const SYNCABLE_TABLES = [
  // School ERP
  'schools', 'students', 'staff', 'attendance', 'exams', 'exam_results',
  'fees', 'payments', 'debts', 'payroll', 'finance_transactions',
  'library_books', 'library_loans', 'transport_routes', 'transport_students',
  'discipline_incidents', 'meetings',
  // HMIS
  'patients', 'opd_visits', 'ipd_admissions', 'lab_tests', 'lab_results',
  'pharmacy_stock', 'pharmacy_dispensing', 'billing_invoices', 'beds',
];

const SYNC_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes

class SyncManager {
  constructor({ db, saveDb, supabaseUrl, supabaseKey, schoolId }) {
    this.db = db;
    this.saveDb = saveDb;
    this.supabaseUrl = supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    this.supabaseKey = supabaseKey || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    this.schoolId = schoolId || 1;
    this.syncing = false;
    this.lastSyncAt = null;
    this.timer = null;
  }

  // ─── Lifecycle ──────────────────────────────────────────────

  startAutoSync() {
    if (this.timer) return;
    // Initial sync 30s after startup (give DB time to init)
    setTimeout(() => this.syncNow(), 30 * 1000);
    // Then every 5 min
    this.timer = setInterval(() => this.syncNow(), SYNC_INTERVAL_MS);
    console.log('[Sync] Auto-sync started — every 5 min');
  }

  stopAutoSync() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[Sync] Auto-sync stopped');
    }
  }

  // ─── Public: trigger sync immediately ──────────────────────

  async syncNow() {
    if (this.syncing) {
      console.log('[Sync] Already running — skipping');
      return { success: false, skipped: true, reason: 'already running' };
    }
    if (!this.supabaseUrl || !this.supabaseKey) {
      console.log('[Sync] Supabase not configured — skipping');
      return { success: false, skipped: true, reason: 'no supabase' };
    }
    this.syncing = true;
    const stats = { pushed: 0, pulled: 0, conflicts: 0, errors: [] };
    try {
      for (const table of SYNCABLE_TABLES) {
        if (!this.tableExists(table)) continue;
        const result = await this.syncTable(table);
        stats.pushed += result.pushed;
        stats.pulled += result.pulled;
        stats.conflicts += result.conflicts;
        if (result.error) stats.errors.push(`${table}: ${result.error}`);
      }
      this.lastSyncAt = new Date().toISOString();
      // Persist last_sync timestamp to system_settings so other clients know
      this.runLocal(
        `INSERT OR REPLACE INTO system_settings (key, value) VALUES ('last_cloud_sync', ?)`,
        [this.lastSyncAt]
      );
      this.saveDb();
      console.log(`[Sync] Done — pushed ${stats.pushed}, pulled ${stats.pulled}, conflicts ${stats.conflicts}`);
      return { success: true, ...stats, syncedAt: this.lastSyncAt };
    } catch (err) {
      console.error('[Sync] Error:', err.message);
      return { success: false, error: err.message, ...stats };
    } finally {
      this.syncing = false;
    }
  }

  // ─── Per-table sync ────────────────────────────────────────

  async syncTable(table) {
    const result = { pushed: 0, pulled: 0, conflicts: 0, error: null };

    // 1. PUSH local changes since last_sync_at
    const lastSync = this.getLocalLastSync();
    let localChanges;
    try {
      localChanges = this.queryLocal(
        `SELECT * FROM ${table} WHERE last_modified > ? OR (last_modified IS NULL AND id IS NOT NULL)`,
        [lastSync]
      );
    } catch (e) {
      // Table likely missing last_modified column — fall back to full row scan
      try {
        localChanges = this.queryLocal(`SELECT * FROM ${table}`);
      } catch (e2) {
        result.error = `local query failed: ${e2.message}`;
        return result;
      }
    }

    if (localChanges && localChanges.length > 0) {
      for (const row of localChanges) {
        try {
          const res = await this.upsertRemote(table, row);
          if (res === 'conflict') result.conflicts++;
          else result.pushed++;
        } catch (e) {
          console.error(`[Sync] Push ${table} id=${row.id} failed:`, e.message);
        }
      }
    }

    // 2. PULL remote changes since last_sync_at
    try {
      const remoteRows = await this.fetchRemote(table, lastSync);
      for (const remote of remoteRows) {
        const local = this.queryLocal(`SELECT * FROM ${table} WHERE id = ?`, [remote.id]);
        if (local.length === 0) {
          // Insert
          this.insertLocal(table, remote);
          result.pulled++;
        } else {
          // Compare last_modified — remote wins if newer
          const localRow = local[0];
          const localMod = localRow.last_modified ? new Date(localRow.last_modified).getTime() : 0;
          const remoteMod = remote.last_modified ? new Date(remote.last_modified).getTime() : 0;
          if (remoteMod > localMod) {
            this.updateLocal(table, remote);
            result.pulled++;
          } else if (remoteMod < localMod) {
            // Local is newer — push will overwrite remote. Skip.
            result.conflicts++;
          }
        }
      }
    } catch (e) {
      result.error = `pull failed: ${e.message}`;
    }

    return result;
  }

  // ─── Local DB helpers ──────────────────────────────────────

  tableExists(table) {
    try {
      this.queryLocal(`SELECT 1 FROM ${table} LIMIT 1`);
      return true;
    } catch { return false; }
  }

  queryLocal(sql, params = []) {
    if (!this.db) return [];
    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    } catch (e) {
      throw new Error(`local query failed: ${e.message} — SQL: ${sql}`);
    }
  }

  runLocal(sql, params = []) {
    if (!this.db) return;
    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
    } catch (e) {
      console.error('[Sync] runLocal failed:', e.message);
    }
  }

  insertLocal(table, row) {
    // Generic insert using column names from row keys
    const cols = Object.keys(row);
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map((c) => row[c]);
    this.runLocal(`INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`, values);
  }

  updateLocal(table, row) {
    this.insertLocal(table, row);  // INSERT OR REPLACE = upsert
  }

  getLocalLastSync() {
    const rows = this.queryLocal("SELECT value FROM system_settings WHERE key = 'last_cloud_sync'");
    return rows[0]?.value || '1970-01-01T00:00:00Z';
  }

  // ─── Remote (Supabase REST) helpers ────────────────────────

  async fetchRemote(table, since) {
    const url = `${this.supabaseUrl}/rest/v1/${table}?school_id=eq.${this.schoolId}&last_modified=gt.${encodeURIComponent(since)}`;
    const res = await fetch(url, {
      headers: {
        apikey: this.supabaseKey,
        Authorization: `Bearer ${this.supabaseKey}`,
      },
    });
    if (!res.ok) throw new Error(`fetch ${table} HTTP ${res.status}`);
    return await res.json();
  }

  async upsertRemote(table, row) {
    // Use Supabase upsert via POST with Prefer: resolution=merge-duplicates
    const url = `${this.supabaseUrl}/rest/v1/${table}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: this.supabaseKey,
        Authorization: `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify({ ...row, school_id: this.schoolId }),
    });
    if (res.status === 409) return 'conflict';
    if (!res.ok) throw new Error(`upsert ${table} HTTP ${res.status}`);
    return 'pushed';
  }

  // ─── IPC handlers (so the renderer can trigger sync) ───────

  registerIpc() {
    ipcMain.handle('sync-now', async () => this.syncNow());
    ipcMain.handle('sync-status', async () => ({
      lastSyncAt: this.lastSyncAt,
      syncing: this.syncing,
      supabaseConfigured: Boolean(this.supabaseUrl && this.supabaseKey),
    }));
    ipcMain.handle('sync-start-auto', () => { this.startAutoSync(); return { success: true }; });
    ipcMain.handle('sync-stop-auto', () => { this.stopAutoSync(); return { success: true }; });
  }
}

// Add last_modified column to all tables (idempotent — safe to run on every boot)
function ensureSyncColumns(db) {
  if (!db) return;
  const tables = SYNCABLE_TABLES;
  for (const table of tables) {
    try {
      // SQLite doesn't support "IF NOT EXISTS" on ALTER TABLE ADD COLUMN,
      // so we use pragma to check first
      const cols = db.exec(`PRAGMA table_info(${table})`);
      if (!cols[0]) continue;
      const colNames = cols[0].values.map((c) => c[1]);
      if (!colNames.includes('last_modified')) {
        try { db.run(`ALTER TABLE ${table} ADD COLUMN last_modified TEXT`); } catch (e) { /* ignore */ }
      }
      if (!colNames.includes('is_deleted')) {
        try { db.run(`ALTER TABLE ${table} ADD COLUMN is_deleted INTEGER DEFAULT 0`); } catch (e) { /* ignore */ }
      }
      if (!colNames.includes('school_id')) {
        try { db.run(`ALTER TABLE ${table} ADD COLUMN school_id INTEGER DEFAULT 1`); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // Table doesn't exist yet — skip
    }
  }
}

module.exports = { SyncManager, ensureSyncColumns, SYNCABLE_TABLES };
