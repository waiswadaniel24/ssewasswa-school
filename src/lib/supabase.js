import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const backendPreference = (import.meta.env.VITE_BACKEND_PROVIDER || 'auto').toLowerCase();
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const neonUrl = import.meta.env.VITE_NEON_URL || import.meta.env.VITE_NEON_DATABASE_URL;
const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL;
const neonDataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const isNeonConfigured = Boolean(neonUrl || (neonAuthUrl && neonDataApiUrl));

// FIX (caught by another session's audit): The original code did:
//   import { createClient as createNeonClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';
//   const neonClient = isNeonConfigured ? createNeonClient(neonConfig, { auth: { adapter: SupabaseAuthAdapter() } }) : null;
//
// Two bugs:
//   1. The static ESM import of @neondatabase/neon-js forces Vite to bundle it even
//      when Neon isn't configured. If the package is missing OR has a broken export,
//      the entire app crashes BEFORE React can mount (because supabase.js is imported
//      by AuthContext which is imported by main.jsx).
//   2. SupabaseAuthAdapter is a class — calling it without `new` throws:
//      "Class constructor SupabaseAuthAdapter cannot be invoked without 'new'".
//      This happens at module top-level — crashes the whole React module graph →
//      users see "useState is not iterable" error.
//
// FIX: Make Neon client lazy — only constructed when something actually needs it
// (which is rare; the current deployment uses Supabase only). Use dynamic import
// so Vite code-splits @neondatabase/neon-js into a separate chunk that's never
// loaded if Neon isn't configured.
const supabaseClient = isSupabaseConfigured ? createSupabaseClient(supabaseUrl, supabaseKey) : null;
const neonConfig = neonUrl || (isNeonConfigured ? { auth: { url: neonAuthUrl }, dataApi: { url: neonDataApiUrl } } : null);

// Lazy Neon client — only constructed on first access via getNeonClient()
let _neonClient = null;
let _neonClientPromise = null;

export async function getNeonClient() {
  // If not configured, return null immediately
  if (!isNeonConfigured || !neonConfig) return null;
  // If already constructed, return cached
  if (_neonClient) return _neonClient;
  // If construction is in progress, await it (avoid double-construction)
  if (_neonClientPromise) return _neonClientPromise;
  // Construct via dynamic import — Vite code-splits this into a separate chunk
  _neonClientPromise = (async () => {
    try {
      const neonModule = await import('@neondatabase/neon-js');
      const createNeonClient = neonModule.createClient;
      const SupabaseAuthAdapter = neonModule.SupabaseAuthAdapter;
      if (!createNeonClient || !SupabaseAuthAdapter) {
        console.warn('[supabase.js] @neondatabase/neon-js missing required exports — Neon disabled');
        return null;
      }
      // Use `new` — SupabaseAuthAdapter is a class
      const adapter = typeof SupabaseAuthAdapter === 'function'
        ? (SupabaseAuthAdapter.prototype ? new SupabaseAuthAdapter() : SupabaseAuthAdapter())
        : SupabaseAuthAdapter;
      _neonClient = createNeonClient(neonConfig, { auth: { adapter } });
      console.log('[supabase.js] Neon client initialized lazily');
      return _neonClient;
    } catch (e) {
      console.warn('[supabase.js] Neon client init failed (Neon disabled):', e.message);
      return null;
    } finally {
      _neonClientPromise = null;
    }
  })();
  return _neonClientPromise;
}

// Controlled active/passive selection: deployments can switch providers without code changes.
// In auto mode, Supabase remains primary and Neon is used when Supabase variables are absent.
// Note: Neon is lazy — getNeonClient() must be awaited. For synchronous access (legacy code),
// we fall back to Supabase immediately. Use getNeonClient() for explicit Neon access.
const activeClient = backendPreference === 'neon'
  ? (supabaseClient)  // Neon is lazy; sync access returns Supabase as fallback
  : (supabaseClient || null);  // Supabase is primary in auto mode

export const activeBackend = activeClient ? (backendPreference === 'neon' && isNeonConfigured ? 'neon' : 'supabase') : 'none';
export const isBackendConfigured = Boolean(activeClient);
// Keep the existing export name so current data helpers remain compatible with Neon.
export const supabase = activeClient;

const DEVELOPER_SUPABASE_USER_ID = '8693c628-8688-410c-816a-c6365bc93337';
const DEVELOPER_GITHUB_ID = '279316239';
const DEVELOPER_GITHUB_USERNAME = 'waiswadaniel24';
const DEVELOPER_EMAIL = 'waiswadaniel24@gmail.com'; // Recognize developer by email on web (Supabase auth)

export function getSupabaseUser(user) {
  if (!user) return null;
  const githubIdentity = (user.identities || []).find((identity) => identity.provider === 'github');
  const identityData = githubIdentity?.identity_data || {};
  const metadata = user.user_metadata || {};
  const githubUsername = identityData.user_name || identityData.preferred_username || metadata.user_name || metadata.preferred_username;
  const githubId = String(identityData.provider_id || identityData.sub || metadata.provider_id || '');
  const isGitHubUser = githubIdentity?.provider === 'github' || metadata.provider === 'github' || metadata.providers?.includes?.('github');
  const appRole = user.app_metadata?.role;
  const isDeveloper = user.id === DEVELOPER_SUPABASE_USER_ID || user.email === DEVELOPER_EMAIL || user.email?.toLowerCase() === DEVELOPER_EMAIL || (isGitHubUser && (githubId === DEVELOPER_GITHUB_ID || githubUsername === DEVELOPER_GITHUB_USERNAME || appRole === 'developer'));

  return {
    id: user.id,
    username: user.user_metadata?.username || user.email || 'User',
    email: user.email || '',
    // FIX: When isDeveloper is true, override role to 'Super Admin' so the
    // sidebar shows ALL sections (Staff, Academics, Exams, Finance, EMIS, etc.)
    // Without this, the role defaults to 'Staff' (from Supabase app_metadata)
    // → ROLES['Staff'] = ['main','students','services','more'] → developer
    // only sees 3 sections instead of all 11.
    role: isDeveloper ? 'Super Admin' : (user.app_metadata?.role || 'Staff'),
    permissions: Array.isArray(user.app_metadata?.permissions) ? user.app_metadata.permissions : [],
    isDeveloper,
  };
}

export async function getOrCreateSchool() {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  const existing = await supabase.from('erp_schools').select('id, school_name, school_level').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (existing.error || existing.data) return existing;
  return supabase.from('erp_schools').insert({ school_name: 'SSEWASSWA School', school_level: 'Primary' }).select('id, school_name, school_level').single();
}

export async function listStudents(schoolId, filters = {}) {
  if (!supabase || !schoolId) return { data: [], error: null };
  let query = supabase.from('erp_students').select('id, first_name, last_name, other_name, admission_number, gender, class_id, student_type, guardian_phone, status, paycode, erp_classes(name)').eq('school_id', schoolId).neq('status', 'Deleted').order('first_name').limit(200);
  if (filters.classId) query = query.eq('class_id', filters.classId);
  if (filters.search) query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,admission_number.ilike.%${filters.search}%`);
  const result = await query;
  if (result.data) result.data = result.data.map((student) => ({ ...student, class_name: student.erp_classes?.name || '' }));
  return result;
}

export async function listClasses(schoolId) {
  if (!supabase || !schoolId) return { data: [], error: null };
  return supabase.from('erp_classes').select('id, name').eq('school_id', schoolId).order('name');
}

export async function saveStudent(schoolId, data, id) {
  if (!supabase || !schoolId) return { data: null, error: new Error('No Supabase school selected') };
  if (id) return supabase.from('erp_students').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).eq('school_id', schoolId).select().single();
  return supabase.from('erp_students').insert({ ...data, school_id: schoolId }).select().single();
}

export async function softDeleteStudent(schoolId, id) {
  if (!supabase) return { error: new Error('Supabase is not configured') };
  return supabase.from('erp_students').update({ status: 'Deleted', updated_at: new Date().toISOString() }).eq('id', id).eq('school_id', schoolId);
}

export async function generateStudentPaycodes(schoolId) {
  if (!supabase || !schoolId) return { data: { count: 0 }, error: null };
  const rows = await supabase.from('erp_students').select('id').eq('school_id', schoolId).is('paycode', null);
  if (rows.error) return rows;
  let count = 0;
  for (const row of rows.data || []) {
    const result = await supabase.from('erp_students').update({ paycode: `P${row.id.replaceAll('-', '').slice(0, 10).toUpperCase()}` }).eq('id', row.id).eq('school_id', schoolId);
    if (!result.error) count += 1;
  }
  return { data: { count }, error: null };
}

export function isElectronAvailable() {
  return typeof window !== 'undefined' && Boolean(window.electronAPI);
}

export function canUseSupabase() {
  return Boolean(supabase && isSupabaseConfigured);
}

export function normalizeError(error, fallback = 'Something went wrong') {
  return error?.message || fallback;
}

export { supabaseUrl };

export default supabase;
