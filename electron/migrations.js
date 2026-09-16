const { app } = require('electron');
module.exports = function (db, saveDb) {
    var v = 0;
    try {
        var r = db.exec("SELECT value FROM system_settings WHERE key = 'emis_db_version'");
        if (r.length > 0 && r[0].values.length > 0) { v = parseInt(r[0].values[0][0]) || 0; }
    } catch (e) { console.log('Version check error: ' + e.message); }
    if (v >= 7) { console.log('Database already up to date (v7)'); return; }
    console.log('Running migrations: v' + v + ' -> v7...');
    if (v < 5) {
        var cols1 = ["ALTER TABLE students ADD COLUMN other_name TEXT", "ALTER TABLE students ADD COLUMN emis_student_id TEXT", "ALTER TABLE staff ADD COLUMN tsc_number TEXT DEFAULT ''", "ALTER TABLE users ADD COLUMN security_question TEXT"];
        for (var i = 0; i < cols1.length; i++) { try { db.run(cols1[i]); } catch (e) {} }
        var tables = ["CREATE TABLE IF NOT EXISTS school_registration (id INTEGER PRIMARY KEY, school_name TEXT)", "CREATE TABLE IF NOT EXISTS academic_years (id INTEGER PRIMARY KEY AUTOINCREMENT, year_name TEXT)", "CREATE TABLE IF NOT EXISTS student_enrollment (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER)", "CREATE TABLE IF NOT EXISTS infrastructure (id INTEGER PRIMARY KEY AUTOINCREMENT, classrooms_permanent INTEGER DEFAULT 0)", "CREATE TABLE IF NOT EXISTS uneb_candidates (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER)", "CREATE TABLE IF NOT EXISTS meeting_minutes (id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_type TEXT)", "CREATE TABLE IF NOT EXISTS deduction_types (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"];
        for (var i = 0; i < tables.length; i++) { try { db.run(tables[i]); } catch (e) {} }
    }
    if (v < 6) {
        db.run("CREATE TABLE IF NOT EXISTS schools (id INTEGER PRIMARY KEY AUTOINCREMENT, school_name TEXT NOT NULL, emis_number TEXT, school_level TEXT DEFAULT 'Primary', school_type TEXT DEFAULT 'Private', is_active INTEGER DEFAULT 1)");
        var t = ['students','staff','classes','subjects','payments','attendance','marks','discipline','expenses','payroll_payments','fees_structure','visitors','library_books','canteen_items','transport_routes','student_requirements','nursery_assessments','infrastructure','latrines','textbooks','school_finances_emis','wash_data','health_nutrition','governance_members','dropout_records','meeting_minutes','purchase_requests','bank_payments','payment_transactions','student_documents','parent_profiles','student_timeline','special_needs_learners','ovc_data','student_enrollment','uneb_candidates','canteen_sales','audit_log','users'];
        for (var i = 0; i < t.length; i++) { try { db.run("ALTER TABLE " + t[i] + " ADD COLUMN school_id INTEGER DEFAULT 1"); } catch (e) {} }
    }
    if (v < 7) {
        try { db.run("ALTER TABLE students ADD COLUMN system_uuid TEXT"); } catch(e) {}
        try { db.run("ALTER TABLE students ADD COLUMN birth_certificate TEXT"); } catch(e) {}
        try { db.run("ALTER TABLE students ADD COLUMN emergency_contact_name TEXT"); } catch(e) {}
        try { db.run("ALTER TABLE students ADD COLUMN emergency_contact_phone TEXT"); } catch(e) {}
        try { db.run("ALTER TABLE students ADD COLUMN blood_group TEXT"); } catch(e) {}
        try { db.run("ALTER TABLE classes ADD COLUMN stream_name TEXT"); } catch(e) {}
        
        db.run("CREATE TABLE IF NOT EXISTS sickbay_log (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, date TEXT, complaint TEXT, treatment TEXT, status TEXT)");
        db.run("CREATE TABLE IF NOT EXISTS grading_systems (id INTEGER PRIMARY KEY AUTOINCREMENT, level TEXT, min_score INTEGER, grade TEXT, remark TEXT)");
        db.run("CREATE TABLE IF NOT EXISTS staff_clockins (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER, clock_in_time DATETIME, clock_out_time DATETIME)");
        
        var defaultGrades = [['Primary', 80, 'D1', 'Excellent'], ['Primary', 75, 'D2', 'Very Good'], ['Primary', 70, 'C3', 'Good'], ['Primary', 65, 'C4', 'Good'], ['Primary', 60, 'C5', 'Fair'], ['Primary', 55, 'C6', 'Fair'], ['Primary', 50, 'P7', 'Pass'], ['Primary', 45, 'P8', 'Pass'], ['Primary', 0, 'F9', 'Fail']];
        for (var i = 0; i < defaultGrades.length; i++) {
            db.run("INSERT INTO grading_systems (level, min_score, grade, remark) VALUES (?, ?, ?, ?)", defaultGrades[i]);
        }
    }
    db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('emis_db_version', '7')");
    try { db.run("VACUUM"); console.log('  [VACUUM] Database optimized.'); } catch(e) {}
    saveDb();
    console.log('Migrations complete! (v7)');
};