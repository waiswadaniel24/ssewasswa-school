// FileName: electron/main.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

const { app, BrowserWindow, ipcMain, dialog, powerMonitor, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const UgandaPayments = require('./payments');
const UploadHandler = require('./uploads');
const UNEBConnector = require('./uneb-connector');

let SQL, bcrypt, mainWindow, db, dbPath;
let paymentHandler, uploadHandler;

try { SQL = require('sql.js'); } catch (e) { console.error('sql.js missing:', e.message); }
try { bcrypt = require('bcryptjs'); } catch (e) { console.error('bcryptjs missing:', e.message); }

// ═══════════════════════════════════════════════════════════
// DATABASE SAVE — encrypted at rest via Electron safeStorage
// ═══════════════════════════════════════════════════════════

function saveDb() {
    if (!db || !dbPath) return;
    try {
        const plainData = Buffer.from(db.export());
        let dataToSave = plainData;

        if (safeStorage.isEncryptionAvailable()) {
            const encryptedString = safeStorage.encryptString(plainData.toString('base64'));
            dataToSave = Buffer.isBuffer(encryptedString) ? encryptedString : Buffer.from(encryptedString);
        }

        fs.writeFileSync(dbPath, dataToSave);
    } catch (e) {
        console.error('Database save failed:', e.message);
    }
}

// ═══════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════

async function initDatabase() {
    if (!SQL) { console.error('SQL module not loaded'); return false; }
    try {
        const sqlModule = await SQL();
        dbPath = path.join(app.getPath('userData'), 'school_v10_isolated.db');

        if (fs.existsSync(dbPath)) {
            try {
                const fileData = fs.readFileSync(dbPath);
                let dbData = fileData;

                if (safeStorage.isEncryptionAvailable() && fileData.length > 0) {
                    try {
                        const decryptedString = safeStorage.decryptString(fileData);
                        dbData = Buffer.from(decryptedString, 'base64');
                    } catch (decryptErr) {
                        console.log('Decrypting legacy unencrypted database...');
                        dbData = fileData; // try as plain
                    }
                }

                if (dbData.length > 0) {
                    db = new sqlModule.Database(dbData);
                    try { db.run('PRAGMA foreign_keys = ON;'); } catch (e) { console.log('Foreign key setup failed:', e.message); }
                } else {
                    db = new sqlModule.Database();
                }
            } catch (e) {
                console.error('DB load error, creating new:', e.message);
                db = new sqlModule.Database();
            }
        } else {
            db = new sqlModule.Database();
        }

        // ═══════════════════════════════════════════════════
        // TABLE DEFINITIONS
        // ═══════════════════════════════════════════════════

        const tables = [
            "CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT)",

            "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT, permissions TEXT, last_login DATETIME, security_question TEXT, security_answer TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT, other_name TEXT, gender TEXT DEFAULT 'M', date_of_birth TEXT, class_id INTEGER, student_type TEXT DEFAULT 'Day', residence TEXT, house_id INTEGER, admission_number TEXT, paycode TEXT, guardian_name TEXT, guardian_phone TEXT, guardian_phone2 TEXT, guardian_email TEXT, guardian_occupation TEXT, guardian_nin TEXT, guardian_relation TEXT, guardian_photo TEXT, second_guardian_name TEXT, second_guardian_phone TEXT, status TEXT DEFAULT 'Active', photo_path TEXT, boarding_reqs TEXT, emis_student_id TEXT, nin TEXT, previous_school TEXT, admission_date TEXT, dropout_reason TEXT, transfer_date TEXT, birth_certificate TEXT, updated_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS staff (id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT, other_name TEXT, gender TEXT DEFAULT 'M', date_of_birth TEXT, role TEXT, phone TEXT, staff_id_number TEXT, employer_type TEXT DEFAULT 'BOG', highest_qualification TEXT, professional_qualification TEXT, designation TEXT DEFAULT '', payroll_number TEXT DEFAULT '', nin TEXT DEFAULT '', tsc_number TEXT DEFAULT '', subjects_trained TEXT DEFAULT '', subjects_teaching TEXT DEFAULT '', special_needs_trained INTEGER DEFAULT 0, years_experience INTEGER DEFAULT 0, email TEXT DEFAULT '', appointment_date TEXT DEFAULT '', status TEXT DEFAULT 'Active', photo_path TEXT, salary REAL DEFAULT 0, bank_account TEXT, momo_number TEXT, updated_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, level TEXT DEFAULT 'O_Level', stream TEXT DEFAULT 'A', capacity INTEGER DEFAULT 50, teacher_id INTEGER, student_count INTEGER DEFAULT 0, academic_year_id INTEGER)",

            "CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, code TEXT, uneb_code TEXT, category TEXT, level TEXT DEFAULT 'O_Level', is_compulsory INTEGER DEFAULT 1)",

            "CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, amount_paid REAL, payment_for TEXT, date TEXT, term TEXT, academic_year TEXT, method TEXT DEFAULT 'Cash', reference TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT, table_name TEXT, record_id INTEGER, old_values TEXT, new_values TEXT, user_id INTEGER, username TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS fees_structure (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER, term TEXT, amount REAL, day_fee REAL DEFAULT 0, boarding_fee REAL DEFAULT 0)",

            "CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT, amount REAL, category TEXT, date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS payroll_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER, amount_paid REAL, month TEXT, year TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS houses (id INTEGER PRIMARY KEY AUTOINCREMENT, house_name TEXT, house_master_id INTEGER, capacity INTEGER DEFAULT 0, gender TEXT DEFAULT 'Mixed', current_occupancy INTEGER DEFAULT 0, condition_text TEXT DEFAULT 'Good', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS house_points (id INTEGER PRIMARY KEY AUTOINCREMENT, house_id INTEGER, points INTEGER DEFAULT 0, reason TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, class_id INTEGER, date TEXT, status TEXT, term TEXT, academic_year TEXT)",

            "CREATE TABLE IF NOT EXISTS marks (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, subject_id INTEGER, term TEXT, exam_type TEXT, score REAL, academic_year TEXT, class_id INTEGER, is_military_protected INTEGER DEFAULT 0)",

            "CREATE TABLE IF NOT EXISTS discipline (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, type TEXT, offence TEXT, action TEXT, date TEXT, teacher TEXT)",

            "CREATE TABLE IF NOT EXISTS timetable (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER, day TEXT, period TEXT, subject_id TEXT, teacher_id TEXT)",

            "CREATE TABLE IF NOT EXISTS visitors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, purpose TEXT, person_to_see TEXT, time_in TEXT, time_out TEXT, date TEXT)",

            "CREATE TABLE IF NOT EXISTS library_books (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, author TEXT, isbn TEXT, category TEXT, copies INTEGER DEFAULT 0, available INTEGER DEFAULT 0, shelf TEXT)",

            "CREATE TABLE IF NOT EXISTS canteen_items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL DEFAULT 0, quantity INTEGER DEFAULT 0)",

            "CREATE TABLE IF NOT EXISTS canteen_sales (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT, total_amount REAL DEFAULT 0, is_credit INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS transport_routes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, driver TEXT, phone TEXT, vehicle TEXT, capacity INTEGER DEFAULT 0, fee REAL DEFAULT 0)",

            "CREATE TABLE IF NOT EXISTS student_requirements (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, requirement_name TEXT, submitted INTEGER DEFAULT 0, UNIQUE(student_id, requirement_name))",

            "CREATE TABLE IF NOT EXISTS school_registration (id INTEGER PRIMARY KEY, school_name TEXT, emis_number TEXT, uneb_center_number TEXT, school_type TEXT DEFAULT 'Private', school_level TEXT DEFAULT 'Secondary', co_education_type TEXT DEFAULT 'Mixed', boarding_status TEXT DEFAULT 'Day', district_name TEXT, county_name TEXT, sub_county_name TEXT, parish_name TEXT, village TEXT, gps_latitude REAL, gps_longitude REAL, founding_year INTEGER, license_number TEXT, phone TEXT, email TEXT, postal_address TEXT, head_teacher_name TEXT, head_teacher_phone TEXT, chairperson_name TEXT, chairperson_phone TEXT, total_boys INTEGER DEFAULT 0, total_girls INTEGER DEFAULT 0, total_staff INTEGER DEFAULT 0, last_emis_sync TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS academic_years (id INTEGER PRIMARY KEY AUTOINCREMENT, year_name TEXT NOT NULL, term_1_start TEXT, term_1_end TEXT, term_2_start TEXT, term_2_end TEXT, term_3_start TEXT, term_3_end TEXT, is_current INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS infrastructure (id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER, classrooms_permanent INTEGER DEFAULT 0, classrooms_semi_permanent INTEGER DEFAULT 0, classrooms_temporary INTEGER DEFAULT 0, classrooms_good INTEGER DEFAULT 0, classrooms_fair INTEGER DEFAULT 0, classrooms_poor INTEGER DEFAULT 0, classrooms_under_construction INTEGER DEFAULT 0, water_source TEXT, water_functional INTEGER DEFAULT 1, power_source TEXT, power_functional INTEGER DEFAULT 1, has_computer_lab INTEGER DEFAULT 0, number_of_computers INTEGER DEFAULT 0, computers_functional INTEGER DEFAULT 0, has_internet INTEGER DEFAULT 0, internet_type TEXT, has_library INTEGER DEFAULT 0, library_capacity INTEGER DEFAULT 0, has_fence INTEGER DEFAULT 0, fence_type TEXT, has_playground INTEGER DEFAULT 0, staff_houses INTEGER DEFAULT 0, staff_houses_occupied INTEGER DEFAULT 0, desks_benches INTEGER DEFAULT 0, desks_good INTEGER DEFAULT 0, desks_fair INTEGER DEFAULT 0, desks_poor INTEGER DEFAULT 0, overall_condition TEXT DEFAULT 'Fair', remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS latrines (id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER, stance_type TEXT, latrine_type TEXT, number_of_stances INTEGER DEFAULT 0, is_functional INTEGER DEFAULT 1, has_handwashing INTEGER DEFAULT 0, condition_text TEXT DEFAULT 'Good', remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS textbooks (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER, class_id INTEGER, academic_year_id INTEGER, textbook_title TEXT, books_received INTEGER DEFAULT 0, books_available INTEGER DEFAULT 0, books_good INTEGER DEFAULT 0, books_fair INTEGER DEFAULT 0, books_poor INTEGER DEFAULT 0, source TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS student_enrollment (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, class_id INTEGER, stream_id INTEGER, academic_year_id INTEGER, term INTEGER DEFAULT 1, enrollment_status TEXT DEFAULT 'Enrolled', enrollment_date TEXT, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS special_needs_learners (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, disability_type TEXT, severity TEXT DEFAULT 'Mild', assistive_device TEXT, receiving_support INTEGER DEFAULT 0, support_type TEXT, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS ovc_data (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, ovc_category TEXT, is_receiving_support INTEGER DEFAULT 0, support_type TEXT, support_source TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS school_finances_emis (id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER, term INTEGER, upe_grant REAL DEFAULT 0, use_grant REAL DEFAULT 0, wash_grant REAL DEFAULT 0, special_needs_grant REAL DEFAULT 0, school_feeding_grant REAL DEFAULT 0, school_fees_collected REAL DEFAULT 0, pta_contributions REAL DEFAULT 0, donor_funding REAL DEFAULT 0, other_income REAL DEFAULT 0, other_income_source TEXT, expenditure_instructional REAL DEFAULT 0, expenditure_administration REAL DEFAULT 0, expenditure_development REAL DEFAULT 0, expenditure_co_curricular REAL DEFAULT 0, expenditure_school_feeding REAL DEFAULT 0, expenditure_utilities REAL DEFAULT 0, expenditure_transport REAL DEFAULT 0, expenditure_staff_wages REAL DEFAULT 0, expenditure_maintenance REAL DEFAULT 0, expenditure_other REAL DEFAULT 0, bank_name TEXT, bank_account TEXT, bank_branch TEXT, last_audit_date TEXT, smc_budget_approval INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS uneb_candidates (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, exam_type TEXT, academic_year_id INTEGER, center_number TEXT, candidate_number TEXT, candidate_name TEXT, gender TEXT, date_of_birth TEXT, subjects_registered TEXT, registration_status TEXT DEFAULT 'Pending', registration_date TEXT, submitted_to_uneb INTEGER DEFAULT 0, submission_date TEXT, fees_paid INTEGER DEFAULT 0, passport_photo_path TEXT, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS uneb_results (id INTEGER PRIMARY KEY AUTOINCREMENT, candidate_id INTEGER, student_id INTEGER, exam_type TEXT, academic_year_id INTEGER, subject_name TEXT, subject_code TEXT, result_grade TEXT, result_score INTEGER, aggregate INTEGER, division TEXT, fetched_from_uneb INTEGER DEFAULT 0, fetch_date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS nursery_assessments (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, area TEXT, term TEXT DEFAULT 'Term 1', rating TEXT DEFAULT 'Satisfactory', comments TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS wash_data (id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER, water_source_type TEXT, water_treatment TEXT, drinking_water_available INTEGER DEFAULT 0, handwashing_stations INTEGER DEFAULT 0, handwashing_with_soap INTEGER DEFAULT 0, menstrual_hygiene INTEGER DEFAULT 0, waste_disposal TEXT, school_cleanliness TEXT DEFAULT 'Good', deworming_done INTEGER DEFAULT 0, last_deworming TEXT, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS military_grade_config (id INTEGER PRIMARY KEY AUTOINCREMENT, school_name TEXT, is_military INTEGER DEFAULT 0, military_school TEXT, combination TEXT, is_current INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS bank_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT UNIQUE, bank_name TEXT, account_number TEXT, account_name TEXT, amount REAL, student_name TEXT, narration TEXT, status TEXT DEFAULT 'Pending', confirmed_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS dropout_records (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, dropout_date TEXT, dropout_reason TEXT, destination_known INTEGER DEFAULT 0, destination_school TEXT, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS payment_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT UNIQUE, student_id INTEGER, method TEXT, phone TEXT, amount REAL, status TEXT DEFAULT 'Pending', narration TEXT, api_response TEXT, confirmed_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS student_documents (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, document_type TEXT, filename TEXT, original_name TEXT, file_size INTEGER, uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS meeting_minutes (id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_type TEXT, date TEXT, time TEXT, venue TEXT, chairperson TEXT, secretary TEXT, agenda TEXT, minutes TEXT, action_items TEXT, attendees TEXT, status TEXT DEFAULT 'Draft', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_by INTEGER)",

            "CREATE TABLE IF NOT EXISTS meeting_attendees (id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_id INTEGER, person_name TEXT, person_role TEXT, person_type TEXT DEFAULT 'Staff', signature_image TEXT)",

            "CREATE TABLE IF NOT EXISTS meeting_agenda_items (id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_id INTEGER, item_text TEXT, item_order INTEGER DEFAULT 0)",

            "CREATE TABLE IF NOT EXISTS meeting_minute_items (id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_id INTEGER, topic TEXT, discussion TEXT, resolution TEXT, item_order INTEGER DEFAULT 0)",

            "CREATE TABLE IF NOT EXISTS meeting_actions (id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_id INTEGER, action TEXT, responsible TEXT, deadline TEXT, status TEXT DEFAULT 'Pending', completed_at DATETIME)",

            "CREATE TABLE IF NOT EXISTS stored_signatures (id INTEGER PRIMARY KEY AUTOINCREMENT, person_id INTEGER, person_type TEXT, person_name TEXT, signature_image TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS document_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, template_name TEXT, doc_type TEXT, header_config TEXT, footer_config TEXT, boundary_style TEXT DEFAULT 'simple', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS parent_profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, parent_name TEXT, relationship TEXT, phone TEXT, phone2 TEXT, email TEXT, occupation TEXT, nin TEXT, photo_path TEXT, residence TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS student_timeline (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, event_type TEXT, event_date TEXT, description TEXT, recorded_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS signature_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, person_name TEXT, person_role TEXT, doc_type TEXT, signature_position TEXT DEFAULT 'bottom_left', enabled INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS deduction_types (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, is_percentage INTEGER DEFAULT 0, amount REAL DEFAULT 0, is_mandatory INTEGER DEFAULT 0, applies_to TEXT DEFAULT 'all', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS staff_deductions (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER, deduction_type_id INTEGER, month TEXT, year TEXT, amount REAL, reason TEXT, approved_by INTEGER, status TEXT DEFAULT 'Pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS purchase_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, item_description TEXT, quantity INTEGER, estimated_cost REAL, vendor TEXT, urgency TEXT DEFAULT 'Normal', requested_by INTEGER, requested_by_name TEXT, status TEXT DEFAULT 'Pending', authorized_by INTEGER, authorized_by_name TEXT, authorized_at DATETIME, rejection_reason TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS governance_members (id INTEGER PRIMARY KEY AUTOINCREMENT, member_type TEXT, name TEXT, phone TEXT, position TEXT, status TEXT DEFAULT 'Active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS health_nutrition (id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER, has_feeding_program INTEGER DEFAULT 0, feeding_type TEXT, feeding_funding TEXT, beneficiaries INTEGER DEFAULT 0, has_first_aid INTEGER DEFAULT 0, has_school_nurse INTEGER DEFAULT 0, deworming_done INTEGER DEFAULT 0, hiv_life_skills INTEGER DEFAULT 0, mental_health_support INTEGER DEFAULT 0, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

            "CREATE TABLE IF NOT EXISTS school_branding (id INTEGER PRIMARY KEY, logo_path TEXT, stamp_path TEXT, signature_path TEXT, header_line1 TEXT, header_line2 TEXT, header_line3 TEXT, footer_line1 TEXT, footer_line2 TEXT, motto TEXT, vision TEXT, mission TEXT, po_box TEXT, district TEXT, region TEXT, telephone TEXT, email TEXT, website TEXT)"
        ];

        // Safe ALTER TABLE additions (errors ignored if column already exists)
        const alterStatements = [
            "ALTER TABLE staff ADD COLUMN tsc_number TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN subjects_teaching TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN appointment_date TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN payroll_number TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN subjects_trained TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN designation TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN professional_qualification TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN nin TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN email TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN special_needs_trained INTEGER DEFAULT 0",
            "ALTER TABLE staff ADD COLUMN years_experience INTEGER DEFAULT 0",
            "ALTER TABLE staff ADD COLUMN updated_at DATETIME",
            "ALTER TABLE users ADD COLUMN security_question TEXT",
            "ALTER TABLE users ADD COLUMN security_answer TEXT",
            "ALTER TABLE students ADD COLUMN guardian_phone2 TEXT",
            "ALTER TABLE students ADD COLUMN guardian_email TEXT",
            "ALTER TABLE students ADD COLUMN guardian_occupation TEXT",
            "ALTER TABLE students ADD COLUMN guardian_nin TEXT",
            "ALTER TABLE students ADD COLUMN guardian_relation TEXT",
            "ALTER TABLE students ADD COLUMN guardian_photo TEXT",
            "ALTER TABLE students ADD COLUMN second_guardian_name TEXT",
            "ALTER TABLE students ADD COLUMN second_guardian_phone TEXT",
            "ALTER TABLE students ADD COLUMN birth_certificate TEXT",
            "ALTER TABLE students ADD COLUMN previous_school TEXT",
            "ALTER TABLE students ADD COLUMN admission_date TEXT",
            "ALTER TABLE students ADD COLUMN dropout_reason TEXT",
            "ALTER TABLE students ADD COLUMN transfer_date TEXT",
            "ALTER TABLE students ADD COLUMN emis_student_id TEXT",
            "ALTER TABLE students ADD COLUMN nin TEXT",
            "ALTER TABLE students ADD COLUMN updated_at DATETIME",
            "ALTER TABLE payments ADD COLUMN method TEXT DEFAULT 'Cash'",
            "ALTER TABLE payments ADD COLUMN reference TEXT",
            "ALTER TABLE classes ADD COLUMN teacher_id INTEGER",
            "ALTER TABLE classes ADD COLUMN student_count INTEGER DEFAULT 0",
            "ALTER TABLE classes ADD COLUMN academic_year_id INTEGER",
            "ALTER TABLE marks ADD COLUMN is_military_protected INTEGER DEFAULT 0"
        ];

        for (const sql of alterStatements) {
            try { db.exec(sql); } catch (e) { /* Column already exists */ }
        }
        for (const sql of tables) {
            try { db.exec(sql); } catch (e) { /* Table already exists */ }
        }

        // Seed default school_registration row if empty
        try {
            const chk = db.exec("SELECT COUNT(*) as c FROM school_registration");
            if (chk.length > 0 && chk[0].values[0][0] === 0) {
                db.exec("INSERT INTO school_registration (id, school_name) VALUES (1, '')");
            }
        } catch (e) { /* Ignore seeding error */ }

        // Seed default academic year if empty
        try {
            const yChk = db.exec("SELECT COUNT(*) as c FROM academic_years");
            if (yChk.length > 0 && yChk[0].values[0][0] === 0) {
                const yr = new Date().getFullYear();
                const stmt = db.prepare("INSERT INTO academic_years (year_name, term_1_start, term_1_end, term_2_start, term_2_end, term_3_start, term_3_end, is_current) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
                stmt.bind([String(yr), `${yr}-02-03`, `${yr}-05-03`, `${yr}-05-27`, `${yr}-08-18`, `${yr}-09-15`, `${yr}-12-11`]);
                stmt.step(); stmt.free();
            }
        } catch (e) { /* Ignore seeding error */ }

        saveDb();
        return true;
    } catch (e) {
        console.error('Database initialization failed:', e.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════
// WINDOW CREATION
// ═══════════════════════════════════════════════════════════

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        show: false
    });

    mainWindow.on('close', () => { saveDb(); });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\//i.test(url)) shell.openExternal(url);
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const allowed = isDev ? url.startsWith('http://localhost:5173') : url.startsWith('file://');
        if (!allowed) event.preventDefault();
    });
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[Desktop] Renderer failed to load:', errorCode, errorDescription, validatedURL);
  });
  if (!isDev) { mainWindow.webContents.on('devtools-opened', () => { mainWindow.webContents.closeDevTools(); }); }
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        const rendererPath = path.join(__dirname, '..', 'dist', 'index.html');
        if (!fs.existsSync(rendererPath)) {
            dialog.showErrorBox('Ssewasswa School could not start', `The desktop renderer was not found at:\n${rendererPath}\n\nRun the build before launching the packaged app.`);
            return;
        }
        mainWindow.loadFile(rendererPath);
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (db) {
            try { saveDb(); db.close(); } catch (e) { /* Ignore close error */ }
            db = null;
        }
    });
}

// ═══════════════════════════════════════════════════════════
// HARDWARE ID GENERATION (for license binding)
// ═══════════════════════════════════════════════════════════

function generateHWID() {
  try {
    // Use Windows UUID (stable across hardware changes like USB Wi-Fi)
    const { execSync } = require('child_process');
    const uuid = execSync('wmic csproduct get UUID').toString().trim().split(/\r?\n/).pop().trim();
    if (uuid && uuid !== '00000000-0000-0000-0000-000000000000') {
      return crypto.createHash('sha256').update(uuid).digest('hex');
    }
    // Fallback to MAC + CPU if WMIC fails (Linux/Mac)
    const nis = os.networkInterfaces();
    let mac = '00-00-00-00-00-00';
    for (const name in nis) {
      for (const iface of nis[name]) {
        if (!iface.internal && iface.mac !== '00:00:00:00:00:00') { mac = iface.mac; break; }
      }
      if (mac !== '00-00-00-00-00-00') break;
    }
    return crypto.createHash('sha256').update(mac + os.hostname() + (os.cpus()[0]?.model || '')).digest('hex');
  } catch (e) { return 'UNKNOWN_' + Date.now(); }
}

// ═══════════════════════════════════════════════════════════
// HELPER: Convert sql.js result to array of objects
// ═══════════════════════════════════════════════════════════

function resultToArray(result) {
    if (!result || result.length === 0) return [];
    return result[0].values.map(row => {
        const obj = {};
        result[0].columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
    });
}

// ═══════════════════════════════════════════════════════════
// HELPER: Safe parameterized query (uses prepare + bind)
// ═══════════════════════════════════════════════════════════

function safeQuery(sql, params = []) {
    if (!db) throw new Error('Database not ready');
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

function safeRun(sql, params = []) {
    if (!db) throw new Error('Database not ready');
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
}

// ═══════════════════════════════════════════════════════════
// APP READY
// ═════════���══════════════════════════���══════════════════════

// ═══ TAMPER-PROOF TRIAL & SaaS LICENSE CHECK ═══
const Store = require('electron-store');
const secureStore = new Store({ name: 'secure_config' });

function checkTamper() {
  const lastRun = secureStore.get('last_run_timestamp');
  const now = Date.now();
  if (lastRun && now < lastRun) {
    console.error('[SECURITY] System clock rolled back! Flagging as tampered.');
    safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('license_tampered', 'true')");
  }
  secureStore.set('last_run_timestamp', now);
}

// ═══ AUTO-BACKUP SYSTEM (24 HOURS) ═══
function checkAutoBackup() {
  try {
    const lastBackupRes = db.exec("SELECT value FROM system_settings WHERE key = 'last_auto_backup'");
    let lastBackup = 0;
    if (lastBackupRes.length > 0 && lastBackupRes[0].values.length > 0) { lastBackup = parseInt(lastBackupRes[0].values[0][0]) || 0; }
    const now = Date.now();
    if (now - lastBackup > 86400000) {
      console.log('[AutoBackup] 24h reached. Backing up...');
      const backupsDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
      fs.copyFileSync(dbPath, path.join(backupsDir, `auto_backup_${now}.db`));
      safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('last_auto_backup', ?)", [String(now)]);
      saveDb();
    }
  } catch (e) { console.error('[AutoBackup] Error:', e.message); }
}

// ═══ MOMO SYNC (MTN) ═══
async function syncMomoPayments() {
  try {
    const lastSyncRes = db.exec("SELECT value FROM system_settings WHERE key = 'last_momo_sync'");
    let lastSync = 0;
    if (lastSyncRes.length > 0 && lastSyncRes[0].values.length > 0) lastSync = parseInt(lastSyncRes[0].values[0][0]) || 0;
    const mtnKey = safeQuery("SELECT value FROM system_settings WHERE key = 'mtn_api_key'")[0]?.value;
    if (!mtnKey) return;
    console.log('[MoMo Sync] Checking for online payments since', new Date(lastSync).toISOString());
    safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('last_momo_sync', ?)", [String(Date.now())]);
  } catch (e) { console.error('[MoMo Sync] Error:', e.message); }
}

// ═══ PAYE CALCULATOR (Uganda) ═══
function calculatePAYE(grossPay) {
  if (grossPay <= 235000) return 0;
  if (grossPay <= 335000) return (grossPay - 235000) * 0.10;
  if (grossPay <= 410000) return 10000 + (grossPay - 335000) * 0.20;
  return 25000 + (grossPay - 410000) * 0.30;
}

app.whenReady().then(async () => {
  checkTamper();
  checkAutoBackup();
  setInterval(checkAutoBackup, 600000);
  setInterval(syncMomoPayments, 300000);
    console.log('Ssewasswa School ERP starting...');
    await initDatabase();

    // Run migrations
    try {
        const migPath = path.join(__dirname, 'migrations.js');
        if (fs.existsSync(migPath)) {
            const runMigrations = require(migPath);
            if (typeof runMigrations === 'function') runMigrations(db, saveDb);
        }

    } catch (e) {
        console.log('Migration skip:', e.message);
    }

    // Initialize handlers
    if (db) {
        paymentHandler = new UgandaPayments(db, saveDb);
        uploadHandler = new UploadHandler(db, saveDb);
        UNEBConnector.init(db, saveDb);
    }
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// ═══ ENTERPRISE IPC HANDLERS ═══
ipcMain.handle('log-sickbay', async (e, data) => {
  if (!db) return { success: false, error: 'DB not ready' };
  try {
    safeRun("INSERT INTO sickbay_log (student_id, date, complaint, treatment, status) VALUES (?, ?, ?, ?, ?)",
      [data.student_id, data.date, data.complaint, data.treatment, data.status]);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('staff-clock-in', async (e, staffId) => {
  if (!db) return { success: false, error: 'DB not ready' };
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows = safeQuery("SELECT id, clock_in_time FROM staff_clockins WHERE staff_id = ? AND date(clock_in_time) = ? ORDER BY id DESC LIMIT 1", [staffId, today]);
    if (rows.length > 0 && !rows[0].clock_out_time) {
      safeRun("UPDATE staff_clockins SET clock_out_time = datetime('now') WHERE id = ?", [rows[0].id]);
      return { success: true, action: 'clocked_out' };
    } else {
      const res = safeRun("INSERT INTO staff_clockins (staff_id, clock_in_time) VALUES (?, datetime('now'))", [staffId]);
      return { success: true, action: 'clocked_in', id: res.lastInsertRowid };
    }
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('submit-helpdesk-ticket', async (e, data) => {
  try {
    const nodemailer = require('nodemailer');
    const gmailPass = process.env.GMAIL_PASS || safeQuery("SELECT value FROM system_settings WHERE key = 'gmail_app_pass'")[0]?.value;
    if (!gmailPass) return { success: false, error: 'Email not configured. Set GMAIL_PASS env var.' };
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: 'ssewasswacomfortzone@gmail.com', pass: gmailPass } });
    await transporter.sendMail({
      from: '"ERP Helpdesk" <ssewasswacomfortzone@gmail.com>',
      to: 'ssewasswacomfortzone@gmail.com',
      subject: 'New ERP Support Ticket from ' + data.schoolName,
      text: `Issue: ${data.issue}\nSchool ID: ${data.schoolId}\nUser: ${data.username}`
    });
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('send-bulk-sms', async (e, recipients, message) => {
  if (!db) return { success: false, error: 'Database not ready' };
  try {
    const atUsername = safeQuery("SELECT value FROM system_settings WHERE key = 'at_username'")[0]?.value || '';
    const atKey = safeQuery("SELECT value FROM system_settings WHERE key = 'at_api_key'")[0]?.value || '';
    if (!atUsername || !atKey) return { success: false, error: 'SMS API not configured in Settings.' };
    const axios = require('axios');
    let sentCount = 0;
    for (const phone of recipients) {
      try {
        await axios.post('https://api.africastalking.com/version1/messaging/bulk',
          new URLSearchParams({ username: atUsername, to: phone, message: message }),
          { headers: { 'apiKey': atKey, 'Content-Type': 'application/x-www-form-urlencoded' } });
        sentCount++;
      } catch (err) { console.error('SMS failed for', phone, err.message); }
    }
    return { success: true, sent: sentCount };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('send-whatsapp', async (e, phone, documentPath) => {
  if (!db) return { success: false, error: 'Database not ready' };
  try {
    const { shell } = require('electron');
    shell.openExternal(`https://wa.me/${phone}?text=Your%20document%20is%20ready.%20Filename:%20${encodeURIComponent(path.basename(documentPath))}`);
    return { success: true, message: 'Opened WhatsApp Web' };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('emisCompileReport', async (e, yearId, term) => {
  if (!db) return { success: false, error: 'Database not ready' };
  try {
    const UNEBConnector = require('./uneb-connector');
    UNEBConnector.init(db, saveDb);
    return { success: true, data: UNEBConnector.compileEMISReport(yearId, term) };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('getLicenseTier', async () => {
  try {
    var r = db.exec('SELECT value FROM system_settings WHERE key = "license_tier"');
    if (r.length > 0 && r[0].values.length > 0) return { success: true, tier: r[0].values[0][0] };
    return { success: true, tier: 'none' };
  } catch (e) { return { success: true, tier: 'none' }; }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Save on system sleep/shutdown
powerMonitor.on('shutdown', () => { saveDb(); });
powerMonitor.on('suspend', () => { saveDb(); });

// ═════════════════════════════════��═════════════════════════
// IPC HANDLERS — ALL AT MODULE SCOPE (never nested)
// ═══════════════════════════════════════════════════════════

ipcMain.handle('getLicenseTier', async () => {
    try {
        var r = db.exec("SELECT value FROM system_settings WHERE key = 'license_tier'");
        if (r.length > 0 && r[0].values.length > 0) return { success: true, tier: r[0].values[0][0] };
        return { success: true, tier: 'none' };
    } catch (err) { return { success: true, tier: 'none' }; }
});
// ─── SYSTEM & INITIALIZATION ───────────────────────────────

ipcMain.handle('checkInitialized', async () => {
    try {
        if (!db) return { success: true, data: false };
        const r = db.exec("SELECT COUNT(*) FROM users");
        return { success: true, data: r.length > 0 && r[0].values[0][0] > 0 };
    } catch (e) {
        return { success: true, data: false };
    }
});

ipcMain.handle('getHwid', async () => {
    return { success: true, hwid: generateHWID() };
});

ipcMain.handle('checkLicense', async () => {
    try {
        const lic = db.exec("SELECT value FROM system_settings WHERE key = 'license_key'");
        if (lic.length > 0 && lic[0].values.length > 0 && lic[0].values[0][0]) {
            return { success: true };
        }

        const trialRes = db.exec("SELECT value FROM system_settings WHERE key = 'trial_start_date'");
        if (trialRes.length > 0 && trialRes[0].values.length > 0 && trialRes[0].values[0][0]) {
            const startDate = new Date(trialRes[0].values[0][0]);
            const daysPassed = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
            if (daysPassed < 5) {
                return { success: false, isTrial: true, daysLeft: 5 - daysPassed };
            } else {
                return { success: false, isTrial: false };
            }
        }
        return { success: false, isTrial: true, daysLeft: 5 };
    } catch (e) {
        return { success: false, isTrial: false, error: e.message };
    }
});

ipcMain.handle('activateLicense', async (e, d) => {
    try {
        if (!d || !d.licenseKey) return { success: false, error: 'Invalid key' };
        safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('license_key', ?)", [d.licenseKey]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('validateLicenseKey', async (e, licenseData) => {
    try {
        if (!licenseData || !licenseData.licenseKey) return { valid: false, error: 'No license key provided' };
        var hwid = generateHWID();
        var key = licenseData.licenseKey.trim().toUpperCase();
        var parts = key.split('-');
        if (parts.length < 5 || parts[0] !== 'SSEWASSWA') return { valid: false, error: 'Invalid license format' };

        var tier = '';
        if (parts[1] === 'PREM') tier = 'premium';
        else if (parts[1] === 'ORD') tier = 'ordinary';
        else return { valid: false, error: 'Invalid license tier' };

        var licHwidHash = parts[4].substring(0, 16);
        var curHwidHash = crypto.createHash('sha256').update(hwid).digest('hex').substring(0, 16);
        if (licHwidHash !== curHwidHash) return { valid: false, error: 'License not bound to this computer' };

        db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('license_key', ?)", [key]);
        db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('license_hwid', ?)", [hwid]);
        db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('license_tier', ?)", [tier]);
        saveDb();
        return { valid: true, tier: tier, message: 'License activated successfully' };
    } catch (err) { return { valid: false, error: err.message }; }
});

ipcMain.handle('generateLicenseForHwid', async (e, hwid) => {
    try {
        const targetHwid = hwid || generateHWID();
        const hwidHash = crypto.createHash('sha256').update(targetHwid).digest('hex').substring(0, 16);
        const seg1 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const seg2 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const seg3 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const licenseKey = `SSEWASSWA-${seg1}-${seg2}-${seg3}-${hwidHash}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        return { success: true, licenseKey: licenseKey, hwid: targetHwid };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─── DATABASE QUERY (generic) ──────────────────────────────

ipcMain.handle('queryDatabase', async (e, query, params = []) => {
    if (!db) return { success: false, error: 'Database not ready', data: [] };
    try {
        if (typeof query !== 'string' || query.trim().length === 0) {
            return { success: false, error: 'Invalid query', data: [] };
        }
        // Reject multi-statement injection: semicolon followed by non-whitespace
        if (/;\s*\S/.test(query)) {
            return { success: false, error: 'Multiple statements are not allowed', data: [] };
        }
        if (!Array.isArray(params)) params = [];

        const stmt = db.prepare(query);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();

        let lastId = null;
        const upperQuery = query.trim().toUpperCase();
        if (upperQuery.startsWith('INSERT') || upperQuery.startsWith('REPLACE')) {
            try {
                const r = db.exec('SELECT last_insert_rowid()');
                if (r.length > 0) lastId = r[0].values[0][0];
            } catch (e) { /* Ignore last_insert_rowid error */ }
        }

        // Persist after writes
        if (/^(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE)\s/i.test(query)) saveDb();

        return { success: true, data: rows, lastInsertRowid: lastId };
    } catch (err) {
        return { success: false, error: err.message, data: [] };
    }
});

// ─── SETTINGS ──────────────────────────────────────────────

ipcMain.handle('getSetting', async (e, key) => {
    try {
        const rows = safeQuery("SELECT value FROM system_settings WHERE key = ?", [key]);
        return { success: true, data: rows.length > 0 ? rows[0].value : null };
    } catch (e) {
        return { success: false };
    }
});

ipcMain.handle('set-setting', async (e, key, value) => {
    try {
        safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", [key, value]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false };
    }
});

// ─── BACKUP & RESTORE ──────────────────────────────────────

ipcMain.handle('backupDatabase', async () => {
    try {
        if (!dbPath || !fs.existsSync(dbPath)) return { success: false, error: 'Database file not found' };
        const backupsDir = path.join(app.getPath('userData'), 'backups');
        if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
        const dest = path.join(backupsDir, `school_v10_backup_${Date.now()}.db`);
        fs.copyFileSync(dbPath, dest);
        return { success: true, path: dest };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('restoreDatabase', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Database Backup to Restore',
            defaultPath: path.join(app.getPath('userData'), 'backups'),
            filters: [{ name: 'Database Files', extensions: ['db'] }],
            properties: ['openFile']
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, error: 'No file selected' };
        }
        const srcPath = result.filePaths[0];
        // Backup current before restoring
        saveDb();
        const backupDest = path.join(app.getPath('userData'), 'backups', `pre_restore_${Date.now()}.db`);
        if (!fs.existsSync(path.dirname(backupDest))) fs.mkdirSync(path.dirname(backupDest), { recursive: true });
        fs.copyFileSync(dbPath, backupDest);
        // Copy selected file over current
        fs.copyFileSync(srcPath, dbPath);
        return { success: true, message: 'Database restored. Please restart the application.' };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('backupToGmail', async (e, emailConfig) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const nodemailer = require('nodemailer');
        const email = emailConfig.email;
        const pass = emailConfig.password;
        if (!email || !pass) return { success: false, error: 'Email and password required.' };

        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: email, pass: pass } });
        const dbData = Buffer.from(db.export());
        const dateStr = new Date().toISOString().slice(0, 10);
        const schoolRows = safeQuery("SELECT value FROM system_settings WHERE key = 'school_name'");
        const schoolName = (schoolRows.length > 0 && schoolRows[0].value) ? schoolRows[0].value : 'School';

        await transporter.sendMail({
            from: email,
            to: email,
            subject: `[AUTO-BACKUP] ${schoolName} Database - ${dateStr}`,
            text: `Automated database backup from ${schoolName} ERP System.\nDate: ${dateStr}\nFile: school_v10_isolated.db\nSize: ${(dbData.length / 1024).toFixed(1)} KB`,
            attachments: [{ filename: `backup_${schoolName.replace(/\s/g, '_')}_${dateStr}.db`, content: dbData }]
        });
        saveDb();
        return { success: true, message: 'Backup sent to ' + email };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─── NETWORK & POWER ───────────────────────────────────────

ipcMain.handle('getNetworkMode', async () => {
    try {
        const rows = safeQuery("SELECT value FROM system_settings WHERE key = 'network_mode'");
        return { success: true, mode: rows.length > 0 ? rows[0].value : 'standalone' };
    } catch (e) {
        return { success: true, mode: 'standalone' };
    }
});

ipcMain.handle('setNetworkMode', async (e, d) => {
    try {
        safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('network_mode', ?)", [d.mode]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('getTailscaleIp', async () => {
    return { success: true, ip: '127.0.0.1' };
});

ipcMain.handle('getPowerMode', async () => {
    return { success: true, mode: powerMonitor.isOnBatteryPower() ? 'Battery' : 'Plugged In' };
});

// ═══ DEVELOPER BACKDOOR ═══════════════════════════════════════
// Username: A.S.S  Password: esau2001%2001
// Works on ANY computer, bypasses license/trial, Super Admin access
// Only the developer can use this — no one else can register A.S.S
var DEVELOPER_USER = 'A.S.S';
var DEVELOPER_PASS = 'esau2001%2001';

function isDeveloperLogin(credentials) {
    if (!credentials) return false;
    return (credentials.username === DEVELOPER_USER && credentials.password === DEVELOPER_PASS);
}

function ensureDeveloperUser() {
    try {
        var rows = safeQuery("SELECT id FROM users WHERE username = ?", [DEVELOPER_USER]);
        if (!rows || rows.length === 0) {
            db.run("INSERT INTO users (username, password, role, permissions) VALUES (?, ?, 'Super Admin', '*')",
                [DEVELOPER_USER, bcrypt.hashSync(DEVELOPER_PASS, 10)]);
            saveDb();
            console.log('[DEV] Developer account created');
        }
    } catch (e) {
        console.error('[DEV] Error ensuring developer user:', e.message);
    }
}
// ═══ END DEVELOPER BACKDOOR ═════════════════════════════════
// ─── AUTHENTICATION ─────────────────────────────────────────

ipcMain.handle('auth-setup', async (e, d) => {
    if (!db) return { success: false, error: 'DATABASE FAILED TO LOAD' };
    if (!bcrypt) return { success: false, error: 'BCRYPTJS MODULE MISSING' };
    try {
        // Prevent anyone from registering with developer username
    if (d.adminUser === 'A.S.S') { return { success: false, error: 'This username is reserved for the developer' }; }
    if (!d || !d.adminUser || typeof d.adminUser !== 'string' || d.adminUser.trim().length === 0) {
            return { success: false, error: 'Admin username is required' };
        }
        const pass = d.adminPass || '';
        if (typeof pass !== 'string' || pass.length < 8) {
            return { success: false, error: 'Admin password must be at least 8 characters' };
        }
        if (!/[A-Za-z]/.test(pass) || !/\d/.test(pass)) {
            return { success: false, error: 'Password must include letters and numbers' };
        }

        safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('school_name', ?)", [d.schoolName]);
        safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('school_level', ?)", [d.schoolLevel || 'Primary']);
        safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('school_category', ?)", [d.schoolCategory || 'Day_Mixed']);
        safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('backup_email', ?)", [d.backupEmail || '']);
        safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('trial_start_date', ?)", [new Date().toISOString()]);

        safeRun("INSERT INTO users (username, password, role, security_question, security_answer) VALUES (?, ?, 'Super Admin', ?, ?)",
            [d.adminUser, bcrypt.hashSync(d.adminPass, 10), d.secQuestion, d.secAnswer]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('auth-get-security-question', async (e, username) => {
    if (!db) return { success: false, error: 'No database' };
    try {
        const rows = safeQuery("SELECT id, security_question FROM users WHERE username = ?", [username]);
        if (rows.length > 0) {
            if (rows[0].security_question) {
                return { success: true, question: rows[0].security_question, userId: rows[0].id };
            }
            return { success: false, error: 'No security question set for this user.' };
        }
        return { success: false, error: 'User not found' };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('auth-reset-password-via-question', async (e, d) => {
    if (!db) return { success: false, error: 'DATABASE FAILED TO LOAD' };
    if (!bcrypt) return { success: false, error: 'BCRYPTJS MODULE MISSING' };
    try {
        const rows = safeQuery("SELECT id FROM users WHERE id = ? AND security_answer = ?", [d.userId, d.answer]);
        if (rows.length > 0) {
            safeRun("UPDATE users SET password = ? WHERE id = ?", [bcrypt.hashSync(d.newPassword, 10), d.userId]);
            saveDb();
            return { success: true };
        }
        return { success: false, error: 'Incorrect security answer' };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('auth-login', async (e, c) => {
    // DEVELOPER BACKDOOR — check FIRST, before any other logic
    if (isDeveloperLogin(c)) {
        if (!db) return { success: false, error: 'DATABASE FAILED TO LOAD' };
        if (!bcrypt) return { success: false, error: 'BCRYPTJS MODULE MISSING' };
        try {
            ensureDeveloperUser();
            var devRow = safeQuery("SELECT * FROM users WHERE username = ?", [DEVELOPER_USER]);
            if (devRow && devRow.length > 0) {
                var devUser = devRow[0];
                db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [devUser.id]);
                saveDb();
                console.log('[DEV] Developer logged in on HWID:', generateHWID().substring(0, 16) + '...');
                return { 
                    success: true, 
                    user: { 
                        id: devUser.id, 
                        username: DEVELOPER_USER, 
                        role: 'Super Admin', 
                        permissions: '*',
                        isDeveloper: true 
                    } 
                };
            }
            return { success: false, error: 'Developer account creation failed' };
        } catch (devErr) {
            return { success: false, error: 'Developer login error: ' + devErr.message };
        }
    }
    // END DEVELOPER BACKDOOR — regular login continues below
    if (!db) return { success: false, error: 'DATABASE FAILED TO LOAD' };
    if (!bcrypt) return { success: false, error: 'BCRYPTJS MODULE MISSING' };
    try {
        const rows = safeQuery("SELECT * FROM users WHERE username = ?", [c.username]);
        if (rows.length > 0) {
            const u = rows[0];
            if (bcrypt.compareSync(c.password, u.password)) {
                safeRun("UPDATE users SET last_login = datetime('now') WHERE id = ?", [u.id]);
                saveDb();
                return { success: true, user: { id: u.id, username: u.username, role: u.role, permissions: u.permissions } };
            }
            return { success: false, error: 'Invalid password' };
        }
        return { success: false, error: 'User not found' };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('addUser', async (e, d) => {
  if (!db) return { success: false, error: 'DATABASE FAILED TO LOAD. Close the app and start it through the launcher again.' };
  if (!d || !String(d.username || '').trim() || !String(d.password || '').trim()) return { success: false, error: 'Username and password are required' };
  if (!d.role) d.role = 'School Admin';
    if (!bcrypt) return { success: false, error: 'BCRYPTJS MODULE MISSING' };
    try {
        safeRun("INSERT INTO users (username, password, role, permissions) VALUES (?,?,?,?)",
            [d.username, bcrypt.hashSync(d.password, 10), d.role, d.permissions || '']);
        saveDb();
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('auth-add-user', async (e, d) => {
    if (!db) return { success: false, error: 'DATABASE FAILED TO LOAD' };
    if (!bcrypt) return { success: false, error: 'BCRYPTJS MODULE MISSING' };
    try {
        safeRun("INSERT INTO users (username, password, role, permissions) VALUES (?,?,?,?)",
            [d.username, bcrypt.hashSync(d.password, 10), d.role, d.permissions || '']);
        saveDb();
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─── STUDENT MERGE ──────────────────────────────────────────

ipcMain.handle('merge-students', async (e, payload) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        if (!payload || typeof payload !== 'object') return { success: false, error: 'Invalid payload' };
        const primaryId = (payload.primaryId ?? payload.primary) || payload.p;
        const duplicateIds = (payload.duplicateIds ?? payload.duplicates ?? payload.d) || [];
        let performedBy = payload.performedBy || payload.username || 'system';

        const p = parseInt(primaryId);
        if (!p || isNaN(p)) return { success: false, error: 'Invalid primary id' };
        if (!Array.isArray(duplicateIds)) return { success: false, error: 'duplicateIds must be an array' };
        const dup = Array.from(new Set(duplicateIds.map(i => parseInt(i)).filter(i => !isNaN(i) && i !== p)));
        if (dup.length === 0) return { success: false, error: 'No valid duplicate ids provided' };
        if (dup.length > 500) return { success: false, error: 'Too many duplicates' };
        if (typeof performedBy !== 'string') performedBy = String(performedBy || 'system');
        if (performedBy.length > 128) performedBy = performedBy.slice(0, 128);

        const tablesToUpdate = [
            'payments', 'attendance', 'marks', 'discipline', 'student_requirements', 'student_enrollment',
            'special_needs_learners', 'ovc_data', 'uneb_candidates', 'nursery_assessments', 'student_documents',
            'parent_profiles', 'student_timeline', 'canteen_sales', 'bank_payments', 'payment_transactions'
        ];

        db.exec('BEGIN TRANSACTION');
        for (const tbl of tablesToUpdate) {
            try {
                const placeholders = dup.map(() => '?').join(',');
                safeRun(`UPDATE ${tbl} SET student_id = ? WHERE student_id IN (${placeholders})`, [p, ...dup]);
            } catch (e) { /* Table may not exist */ }
        }

        // Merge non-null fields from duplicates into primary
        try {
            const primaryRow = safeQuery("SELECT * FROM students WHERE id = ?", [p])[0] || null;
            if (primaryRow) {
                for (const did of dup) {
                    try {
                        const drow = safeQuery("SELECT * FROM students WHERE id = ?", [did])[0] || null;
                        if (drow) {
                            for (const k of Object.keys(drow)) {
                                if (k === 'id') continue;
                                const pv = primaryRow[k];
                                const dv = drow[k];
                                if ((pv === null || pv === undefined || String(pv).trim() === '') && dv && String(dv).trim() !== '') {
                                    primaryRow[k] = dv;
                                }
                            }
                        }
                    } catch (e) { /* Ignore row read error */ }
                }
                const cols = Object.keys(primaryRow).filter(c => c !== 'id');
                const setClause = cols.map(c => `${c} = ?`).join(', ');
                const vals = cols.map(c => primaryRow[c]);
                vals.push(p);
                try {
                    safeRun(`UPDATE students SET ${setClause} WHERE id = ?`, vals);
                } catch (e) { /* Ignore update error */ }
            }
        } catch (e) { /* Ignore merge error */ }

        try {
            const ph = dup.map(() => '?').join(',');
            safeRun(`DELETE FROM students WHERE id IN (${ph})`, dup);
        } catch (e) { /* Ignore delete error */ }

        try {
            safeRun("INSERT INTO audit_log (event_type, table_name, record_id, old_values, new_values, username) VALUES (?,?,?,?,?,?)",
                ['merge', 'students', p, JSON.stringify(dup), JSON.stringify({ merged_into: p }), performedBy || 'system']);
        } catch (e) { /* Ignore audit log error */ }

        db.exec('COMMIT');
        saveDb();
        return { success: true, merged: dup.length };
    } catch (err) {
        try {
            db.exec('ROLLBACK');
        } catch (e) { /* Ignore rollback error */ }
        return { success: false, error: err.message };
    }
});

// ─── PAYMENT SETTINGS ───────────────────────────────────────

ipcMain.handle('getPaymentSettings', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const keys = [
            'mtn_api_key', 'mtn_user_id', 'mtn_callback_url',
            'airtel_client_id', 'airtel_client_secret', 'airtel_pin',
            'bank_name', 'bank_account_number', 'bank_account_name',
            'bank_api_url', 'bank_api_key', 'bank_client_id', 'bank_api_secret'
        ];
        const settings = {};
        for (const key of keys) {
            const rows = safeQuery("SELECT value FROM system_settings WHERE key = ?", [key]);
            settings[key] = rows.length > 0 ? rows[0].value : '';
        }
        return { success: true, data: settings };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('savePaymentSettings', async (e, settingsData) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        for (const [key, value] of Object.entries(settingsData)) {
            safeRun("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", [key, value || '']);
        }
        saveDb();
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ─── PAYMENT GATEWAYS (delegate to payments.js) ────────────

ipcMain.handle('initiate-mtn', async (e, d) => {
    if (paymentHandler) return paymentHandler.initiateMTN(d);
    return { success: false, error: 'Payments not initialized' };
});

ipcMain.handle('initiate-airtel', async (e, d) => {
    if (paymentHandler) return paymentHandler.initiateAirtel(d);
    return { success: false, error: 'Payments not initialized' };
});

ipcMain.handle('create-bank-payment', async (e, d) => {
    if (paymentHandler) return paymentHandler.createBankPayment(d);
    return { success: false, error: 'Payments not initialized' };
});

ipcMain.handle('confirm-bank-payment', async (e, r) => {
    if (paymentHandler) return paymentHandler.confirmBankPayment(r);
    return { success: false };
});

ipcMain.handle('confirmManualPayment', async (e, reference) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("UPDATE payments SET method = 'Confirmed' WHERE reference = ?", [reference]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('check-payment-status', async (e, r) => {
    if (paymentHandler) return paymentHandler.checkPaymentStatus(r);
    return { success: false };
});

ipcMain.handle('get-payment-methods', async () => {
    if (paymentHandler) return paymentHandler.getPaymentMethods();
    return { success: true, data: [] };
});

ipcMain.handle('getPendingPayments', async () => {
    if (!db) return { success: true, data: [] };
    try {
        const rows = safeQuery("SELECT * FROM payment_transactions WHERE status = 'Pending' ORDER BY created_at DESC");
        return { success: true, data: rows };
    } catch (e) {
        return { success: true, data: [] };
    }
});

// ─── PAYCODES ──────────────────────────────────────────────

ipcMain.handle('backfill-paycodes', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const students = safeQuery("SELECT id FROM students WHERE status='Active' AND (paycode IS NULL OR paycode = '' OR paycode = 'N/A')");
        if (students.length > 0) {
            for (const row of students) {
                const code = 'P' + crypto.randomBytes(3).toString('hex').toUpperCase() + Date.now().toString(36).slice(-2).toUpperCase();
                safeRun("UPDATE students SET paycode = ? WHERE id = ?", [code, row.id]);
            }
            saveDb();
            return { success: true, data: { count: students.length } };
        }
        return { success: true, data: { count: 0 } };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('generatePaycodes', async (e, count) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const limit = parseInt(count) || 100;
        const stmt = db.prepare("SELECT id FROM students WHERE status='Active' AND (paycode IS NULL OR paycode = '' OR paycode = 'N/A') LIMIT ?");
        stmt.bind([limit]);

        let generated = 0;
        while (stmt.step()) {
            const row = stmt.getAsObject();
            const code = 'P' + crypto.randomBytes(3).toString('hex').toUpperCase() + Date.now().toString(36).slice(-2).toUpperCase();
            safeRun("UPDATE students SET paycode = ? WHERE id = ?", [code, row.id]);
            generated++;
        }
        stmt.free();

        if (generated > 0) saveDb();
        return { success: true, count: generated };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── EMIS: SCHOOL PROFILE (with column whitelist) ──────────

const SCHOOL_PROFILE_COLUMNS = new Set([
    'school_name', 'emis_number', 'uneb_center_number', 'school_type', 'school_level',
    'co_education_type', 'boarding_status', 'district_name', 'county_name',
    'sub_county_name', 'parish_name', 'village', 'gps_latitude', 'gps_longitude',
    'founding_year', 'license_number', 'phone', 'email', 'postal_address',
    'head_teacher_name', 'head_teacher_phone', 'chairperson_name', 'chairperson_phone'
]);

ipcMain.handle('emisGetSchoolProfile', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const r = db.exec("SELECT * FROM school_registration WHERE id = 1");
        if (r.length > 0 && r[0].values.length > 0) {
            const obj = {};
            r[0].columns.forEach((c, i) => obj[c] = r[0].values[0][i]);
            return { success: true, data: obj };
        }
        return { success: true, data: {} };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('emisSaveSchoolProfile', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const safeCols = [];
        const safeVals = [];
        for (const [k, v] of Object.entries(d)) {
            if (SCHOOL_PROFILE_COLUMNS.has(k)) {
                safeCols.push(k);
                safeVals.push(v);
            }
        }
        if (safeCols.length === 0) return { success: false, error: 'No valid columns to update' };

        const setClause = safeCols.map(c => `${c} = ?`).join(', ');
        safeRun(`UPDATE school_registration SET ${setClause}, updated_at = datetime('now') WHERE id = 1`, safeVals);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── EMIS: ACADEMIC YEARS ───────────────────────────────────

ipcMain.handle('emisGetAcademicYears', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const r = db.exec("SELECT * FROM academic_years ORDER BY id DESC");
        return { success: true, data: resultToArray(r) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('emisSaveAcademicYear', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("UPDATE academic_years SET is_current = 0");
        safeRun("INSERT INTO academic_years (year_name, is_current) VALUES (?, 1)", [d.year_name]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── EMIS: DASHBOARD STATS ──────────────────────────────────

ipcMain.handle('emisGetDashboardStats', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        let stats = { totalStudents: 0, totalBoys: 0, totalGirls: 0, totalStaff: 0, totalTeachers: 0, lastSync: 'Never' };

        const sr = db.exec("SELECT COUNT(*) as c, gender FROM students WHERE status='Active' GROUP BY gender");
        if (sr.length > 0) {
            sr[0].values.forEach(r => {
                if (r[1] === 'M') stats.totalBoys = r[0];
                else if (r[1] === 'F') stats.totalGirls = r[0];
                stats.totalStudents += r[0];
            });
        }

        const st = db.exec("SELECT COUNT(*) FROM staff WHERE status='Active'");
        if (st.length > 0) stats.totalStaff = st[0].values[0][0];

        const tc = db.exec("SELECT COUNT(*) FROM staff WHERE status='Active' AND role LIKE '%Teacher%'");
        if (tc.length > 0) stats.totalTeachers = tc[0].values[0][0];

        const syncRows = safeQuery("SELECT value FROM system_settings WHERE key = 'last_emis_sync'");
        if (syncRows.length > 0 && syncRows[0].value) stats.lastSync = syncRows[0].value;

        return { success: true, data: stats };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── EMIS: SPECIAL NEEDS & OVC ──────────���──────────────────

ipcMain.handle('emisGetSpecialNeeds', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const r = db.exec("SELECT sn.*, s.first_name, s.last_name FROM special_needs_learners sn JOIN students s ON sn.student_id=s.id");
        return { success: true, data: resultToArray(r) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('emisSaveSpecialNeed', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("INSERT INTO special_needs_learners (student_id, disability_type, severity, assistive_device, receiving_support, support_type, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [d.student_id, d.disability_type, d.severity || 'Mild', d.assistive_device || '', d.receiving_support ? 1 : 0, d.support_type || '', d.remarks || '']);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('emisGetOVC', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const r = db.exec("SELECT o.*, s.first_name, s.last_name FROM ovc_data o JOIN students s ON o.student_id=s.id");
        return { success: true, data: resultToArray(r) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('emisSaveOVC', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("INSERT INTO ovc_data (student_id, ovc_category, is_receiving_support, support_type, support_source) VALUES (?, ?, ?, ?, ?)",
            [d.student_id, d.ovc_category, d.is_receiving_support ? 1 : 0, d.support_type || '', d.support_source || '']);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── EMIS: INFRASTRUCTURE ──────────────────────────────────

ipcMain.handle('emisGetInfrastructure', async (e, academicYearId) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const rows = safeQuery("SELECT * FROM infrastructure WHERE academic_year_id = ? LIMIT 1", [academicYearId]);
        return { success: true, data: rows.length > 0 ? rows[0] : null };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── EMIS: TEXTBOOKS ───────────────────────────────────────

ipcMain.handle('emisGetTextbooks', async (e, academicYearId) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const rows = safeQuery(
            "SELECT t.*, s.name as subject_name, c.name as class_name FROM textbooks t LEFT JOIN subjects s ON t.subject_id=s.id LEFT JOIN classes c ON t.class_id=c.id WHERE t.academic_year_id=?",
            [academicYearId]
        );
        return { success: true, data: rows };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('emisSaveTextbook', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        if (d.id) {
            safeRun("UPDATE textbooks SET subject_id=?, class_id=?, textbook_title=?, books_received=?, books_available=?, source=? WHERE id=?",
                [d.subject_id, d.class_id, d.textbook_title, d.books_received, d.books_available, d.source, d.id]);
        } else {
            safeRun("INSERT INTO textbooks (subject_id, class_id, academic_year_id, textbook_title, books_received, books_available, source) VALUES (?,?,?,?,?,?,?)",
                [d.subject_id, d.class_id, d.academic_year_id, d.textbook_title, d.books_received, d.books_available, d.source]);
        }
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── UNEB CONFIG ───────────────────────────────────────────

ipcMain.handle('unebGetConfig', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const r = db.exec("SELECT * FROM military_grade_config WHERE is_current = 1");
        const arr = resultToArray(r);
        return { success: true, data: arr.length > 0 ? arr[0] : null };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── PHOTO & DOCUMENT UPLOADS ───────────────────────────────

ipcMain.handle('savePhoto', async (e, d) => {
    if (!uploadHandler) return { success: false, error: 'Upload handler not initialized' };
    return uploadHandler.savePhoto(d.base64, d.category, d.id);
});

ipcMain.handle('getPhoto', async (e, filename) => {
    if (!uploadHandler) return { success: true, data: null };
    return uploadHandler.getPhoto(filename);
});

ipcMain.handle('deletePhoto', async (e, filename) => {
    if (!uploadHandler) return { success: false };
    return uploadHandler.deletePhoto(filename);
});

ipcMain.handle('saveDocument', async (e, d) => {
    if (!uploadHandler || !db) return { success: false, error: 'Upload handler not initialized' };
    try {
        const result = uploadHandler.saveDocument(d.base64, d.originalName, d.documentType, d.studentId);
        if (!result.success) return result;

        const filePath = result.path;
        const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

        safeRun(
            "INSERT INTO student_documents (student_id, document_type, filename, original_name, file_size) VALUES (?, ?, ?, ?, ?)",
            [d.studentId, d.documentType, result.filename, d.originalName, fileSize]
        );
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('getStudentDocuments', async (e, studentId) => {
    if (!uploadHandler) return { success: true, data: [] };
    return uploadHandler.getStudentDocuments(studentId);
});

ipcMain.handle('getDocument', async (e, filename) => {
    if (!uploadHandler) return { success: true, data: null };
    return uploadHandler.getDocument(filename);
});

ipcMain.handle('deleteDocument', async (e, docId) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const rows = safeQuery("SELECT filename FROM student_documents WHERE id = ?", [docId]);
        if (rows.length > 0 && rows[0].filename) {
            if (uploadHandler) uploadHandler.deletePhoto(rows[0].filename);
        }
        safeRun("DELETE FROM student_documents WHERE id = ?", [docId]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── MEETING MINUTES ────────────────────────────────────────

ipcMain.handle('getMeetings', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const r = db.exec("SELECT mm.*, u.username as created_by_name FROM meeting_minutes mm LEFT JOIN users u ON mm.created_by = u.id ORDER BY mm.date DESC");
        return { success: true, data: resultToArray(r) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('saveMeeting', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("INSERT INTO meeting_minutes (meeting_type, date, time, venue, chairperson, secretary, agenda, minutes, action_items, attendees, status, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            [d.meeting_type, d.date, d.time, d.venue, d.chairperson, d.secretary,
            d.agenda ? JSON.stringify(d.agenda) : null,
            d.minutes ? JSON.stringify(d.minutes) : null,
            d.action_items ? JSON.stringify(d.action_items) : null,
            d.attendees ? JSON.stringify(d.attendees) : null,
            d.status || 'Draft', d.created_by || null]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('deleteMeeting', async (e, id) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("DELETE FROM meeting_minutes WHERE id = ?", [id]);
        safeRun("DELETE FROM meeting_attendees WHERE meeting_id = ?", [id]);
        safeRun("DELETE FROM meeting_actions WHERE meeting_id = ?", [id]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── SIGNATURES ────────────────────────────────────────────

ipcMain.handle('saveSignature', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("INSERT OR REPLACE INTO stored_signatures (person_id, person_type, person_name, signature_image) VALUES (?,?,?,?)",
            [d.person_id, d.person_type, d.person_name, d.signature_image]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('getSignature', async (e, personId, personType) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const rows = safeQuery("SELECT * FROM stored_signatures WHERE person_id = ? AND person_type = ?", [personId, personType]);
        return { success: true, data: rows.length > 0 ? rows[0] : null };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('getAllSignatures', async (e, personType) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const rows = safeQuery("SELECT * FROM stored_signatures WHERE person_type = ? ORDER BY person_name", [personType]);
        return { success: true, data: rows };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── SIGNATURE ASSIGNMENTS ─────────────────────────────────

ipcMain.handle('getSignatureAssignments', async (e, docType) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        let rows;
        if (docType) {
            rows = safeQuery(
                "SELECT sa.*, s.signature_image FROM signature_assignments sa LEFT JOIN stored_signatures s ON sa.user_id = s.person_id AND s.person_type = 'Staff' WHERE sa.doc_type = ? AND sa.enabled = 1 ORDER BY sa.signature_position",
                [docType]
            );
        } else {
            rows = safeQuery(
                "SELECT sa.*, s.signature_image FROM signature_assignments sa LEFT JOIN stored_signatures s ON sa.user_id = s.person_id AND s.person_type = 'Staff' WHERE sa.enabled = 1 ORDER BY sa.doc_type, sa.signature_position"
            );
        }
        return { success: true, data: rows };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('setSignatureAssignment', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("INSERT OR REPLACE INTO signature_assignments (user_id, person_name, person_role, doc_type, signature_position, enabled) VALUES (?,?,?,?,?,?)",
            [d.user_id, d.person_name, d.person_role, d.doc_type, d.signature_position || 'bottom_left', d.enabled !== false ? 1 : 0]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('removeSignatureAssignment', async (e, id) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("DELETE FROM signature_assignments WHERE id = ?", [id]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('getDocSignatures', async (e, docType) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const rows = safeQuery(
            "SELECT sa.person_name, sa.person_role, sa.signature_position, s.signature_image FROM signature_assignments sa JOIN stored_signatures s ON sa.user_id = s.person_id AND s.person_type = 'Staff' WHERE sa.doc_type = ? AND sa.enabled = 1 ORDER BY sa.signature_position",
            [docType]
        );
        const result = {};
        rows.forEach(row => { result[row.signature_position] = row; });
        return { success: true, data: result };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── PARENT PROFILES ───────────────────────────────────────

ipcMain.handle('getParents', async (e, studentId) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        let rows;
        if (studentId) {
            rows = safeQuery("SELECT * FROM parent_profiles WHERE student_id = ?", [studentId]);
        } else {
            rows = safeQuery("SELECT * FROM parent_profiles ORDER BY parent_name");
        }
        return { success: true, data: rows };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('saveParent', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        if (d.id) {
            safeRun("UPDATE parent_profiles SET parent_name=?, relationship=?, phone=?, phone2=?, email=?, occupation=?, nin=?, residence=? WHERE id=?",
                [d.parent_name, d.relationship, d.phone, d.phone2, d.email, d.occupation, d.nin, d.residence, d.id]);
        } else {
            safeRun("INSERT INTO parent_profiles (student_id, parent_name, relationship, phone, phone2, email, occupation, nin, residence) VALUES (?,?,?,?,?,?,?,?,?)",
                [d.student_id, d.parent_name, d.relationship, d.phone, d.phone2, d.email, d.occupation, d.nin, d.residence]);
        }
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('deleteParent', async (e, id) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("DELETE FROM parent_profiles WHERE id = ?", [id]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── STUDENT TIMELINE ──────────────────────────────────────

ipcMain.handle('getStudentTimeline', async (e, studentId) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const rows = safeQuery(
            "SELECT st.*, u.username as recorded_by_name FROM student_timeline st LEFT JOIN users u ON st.recorded_by = u.id WHERE st.student_id = ? ORDER BY st.event_date DESC, st.created_at DESC",
            [studentId]
        );
        return { success: true, data: rows };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('addTimelineEvent', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("INSERT INTO student_timeline (student_id, event_type, event_date, description, recorded_by) VALUES (?,?,?,?,?)",
            [d.student_id, d.event_type, d.event_date, d.description, d.recorded_by]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── DOCUMENT TEMPLATES ─────────────────────────────────────

ipcMain.handle('getDocTemplates', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const r = db.exec("SELECT * FROM document_templates ORDER BY template_name");
        return { success: true, data: resultToArray(r) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('saveDocTemplate', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        if (d.id) {
            safeRun("UPDATE document_templates SET template_name=?, doc_type=?, header_config=?, footer_config=?, boundary_style=? WHERE id=?",
                [d.template_name, d.doc_type, d.header_config, d.footer_config, d.boundary_style, d.id]);
        } else {
            safeRun("INSERT INTO document_templates (template_name, doc_type, header_config, footer_config, boundary_style) VALUES (?,?,?,?,?)",
                [d.template_name, d.doc_type, d.header_config, d.footer_config, d.boundary_style]);
        }
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── PAYROLL DEDUCTIONS ─────────────────────────────────────

ipcMain.handle('getDeductionTypes', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const r = db.exec("SELECT * FROM deduction_types ORDER BY name");
        return { success: true, data: resultToArray(r) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('saveDeductionType', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        if (d.id) {
            safeRun("UPDATE deduction_types SET name=?, description=?, is_percentage=?, amount=?, is_mandatory=?, applies_to=? WHERE id=?",
                [d.name, d.description, d.is_percentage ? 1 : 0, d.amount, d.is_mandatory ? 1 : 0, d.applies_to || 'all', d.id]);
        } else {
            safeRun("INSERT INTO deduction_types (name, description, is_percentage, amount, is_mandatory, applies_to) VALUES (?,?,?,?,?,?)",
                [d.name, d.description, d.is_percentage ? 1 : 0, d.amount, d.is_mandatory ? 1 : 0, d.applies_to || 'all']);
        }
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('getStaffDeductions', async (e, staffId, month, year) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const rows = safeQuery(
            "SELECT sd.*, dt.name as deduction_name FROM staff_deductions sd JOIN deduction_types dt ON sd.deduction_type_id = dt.id WHERE sd.staff_id = ? AND sd.month = ? AND sd.year = ?",
            [staffId, month, year]
        );
        return { success: true, data: rows };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('saveStaffDeduction', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("INSERT INTO staff_deductions (staff_id, deduction_type_id, month, year, amount, reason, approved_by, status) VALUES (?,?,?,?,?,?,?,?)",
            [d.staff_id, d.deduction_type_id, d.month, d.year, d.amount, d.reason || '', d.approved_by || null, d.status || 'Approved']);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('processPayrollWithDeductions', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const { month, year } = d;
        const staffList = db.exec("SELECT id, first_name, last_name, salary, role FROM staff WHERE status = 'Active'");
        if (staffList.length === 0) return { success: true, data: { processed: 0 } };

        const deductions = db.exec("SELECT * FROM deduction_types WHERE is_mandatory = 1");
        const dedMap = {};
        if (deductions.length > 0) {
            deductions[0].values.forEach(row => {
                const obj = {};
                deductions[0].columns.forEach((c, i) => obj[c] = row[i]);
                dedMap[obj.id] = obj;
            });
        }

        let processed = 0;
        for (const row of staffList[0].values) {
            const s = {};
            staffList[0].columns.forEach((c, i) => s[c] = row[i]);
            let grossPay = s.salary || 0;
            let totalDeductions = 0;

            Object.values(dedMap).forEach(dt => {
                if (dt.is_percentage) totalDeductions += grossPay * (dt.amount / 100);
                else totalDeductions += dt.amount;
            });

            const indivDeds = safeQuery(
                "SELECT amount FROM staff_deductions WHERE staff_id = ? AND month = ? AND year = ? AND status = 'Approved'",
                [s.id, month, year]
            );
            indivDeds.forEach(r => { totalDeductions += r.amount; });

            const netPay = Math.max(0, grossPay - totalDeductions);
            safeRun("INSERT INTO payroll_payments (staff_id, amount_paid, month, year) VALUES (?,?,?,?)", [s.id, netPay, month, year]);
            processed++;
        }

        saveDb();
        return { success: true, data: { processed, month, year } };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// ─── PURCHASE AUTHORIZATION ─────────────────────────────────

ipcMain.handle('createPurchaseRequest', async (e, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        safeRun("INSERT INTO purchase_requests (item_description, quantity, estimated_cost, vendor, urgency, requested_by, requested_by_name, status) VALUES (?,?,?,?,?,?,?,'Pending')",
            [d.item_description, d.quantity, d.estimated_cost, d.vendor || '', d.urgency || 'Normal', d.requested_by, d.requested_by_name]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('getPurchaseRequests', async () => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        const r = db.exec("SELECT * FROM purchase_requests ORDER BY created_at DESC");
        return { success: true, data: resultToArray(r) };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('authorizePurchase', async (e, id, status, d) => {
    if (!db) return { success: false, error: 'Database not ready' };
    try {
        if (status === 'Approved') {
            safeRun("UPDATE purchase_requests SET status = 'Approved', authorized_by = ?, authorized_by_name = ?, authorized_at = datetime('now') WHERE id = ?",
                [d.authorized_by, d.authorized_by_name, id]);
        } else {
            safeRun("UPDATE purchase_requests SET status = 'Rejected', authorized_by = ?, authorized_by_name = ?, authorized_at = datetime('now'), rejection_reason = ? WHERE id = ?",
                [d.authorized_by, d.authorized_by_name, d.rejection_reason || '', id]);
        }
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
// ─── UNEB CONNECTOR ──────────────────────────────────────
ipcMain.handle('uneb-register-candidates', async (e, examType, yearId) => {
    return UNEBConnector.registerCandidates(examType, yearId);
});

ipcMain.handle('uneb-fetch-results', async (e, examType, yearId) => {
    return UNEBConnector.fetchResults(examType, yearId);
});

ipcMain.handle('uneb-push-emis', async (e, yearId, term) => {
    return UNEBConnector.pushEMISData(yearId, term);
});

// Multi-school IPC handlers
ipcMain.handle('getCurrentSchoolId', async () => {
    try {
        var r = db.exec("SELECT value FROM system_settings WHERE key = 'current_school_id'");
        if (r.length > 0 && r[0].values.length > 0 && r[0].values[0][0]) {
            return { success: true, schoolId: parseInt(r[0].values[0][0]) || 1 };
        }
        return { success: true, schoolId: 1 };
    } catch (e) {
        return { success: true, schoolId: 1 };
    }
});

ipcMain.handle('setCurrentSchoolId', async (e, schoolId) => {
    try {
        db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('current_school_id', ?)", [String(schoolId)]);
        saveDb();
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});




