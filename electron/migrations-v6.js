// Multi-school migration v6
module.exports = function(db, saveDb) {
    var v = 0;
    try {
        var r = db.exec("SELECT value FROM system_settings WHERE key = 'emis_db_version'");
        if (r.length > 0 && r[0].values.length > 0) {
            v = parseInt(r[0].values[0][0]) || 0;
        }
    } catch (e) {
        console.log('Version check error: ' + e.message);
    }
    if (v >= 6) { console.log('Multi-school already applied (v6)'); return; }
    console.log('Running multi-school migration: v' + v + ' -> v6...');

    db.run("CREATE TABLE IF NOT EXISTS schools (id INTEGER PRIMARY KEY AUTOINCREMENT, school_name TEXT NOT NULL, emis_number TEXT, school_level TEXT DEFAULT 'Primary', school_type TEXT DEFAULT 'Private', district_name TEXT, county_name TEXT, sub_county_name TEXT, parish_name TEXT, village TEXT, phone TEXT, email TEXT, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");

    var tables = ['students','staff','classes','subjects','payments','attendance','marks','discipline','expenses','payroll_payments','fees_structure','visitors','library_books','canteen_items','transport_routes','student_requirements','nursery_assessments','infrastructure','latrines','textbooks','school_finances_emis','wash_data','health_nutrition','governance_members','dropout_records','meeting_minutes','purchase_requests','bank_payments','payment_transactions','student_documents','parent_profiles','student_timeline','special_needs_learners','ovc_data','student_enrollment','uneb_candidates','canteen_sales','audit_log','users'];
    for (var i = 0; i < tables.length; i++) {
        try { db.run("ALTER TABLE " + tables[i] + " ADD COLUMN school_id INTEGER DEFAULT 1"); } catch (e) { console.log('  ' + tables[i] + ': school_id exists'); }
    }

    try {
        var chk = db.exec("SELECT COUNT(*) FROM schools");
        if (chk.length > 0 && chk[0].values[0][0] === 0) {
            var nr = db.exec("SELECT value FROM system_settings WHERE key = 'school_name'");
            var sn = (nr.length > 0 && nr[0].values.length > 0) ? nr[0].values[0][0] : 'Default School';
            var stmt = db.prepare("INSERT INTO schools (school_name, school_level, school_type, is_active) VALUES (?, 'Primary', 'Private', 1)");
            stmt.bind([sn]); stmt.step(); stmt.free();
            console.log('  Seeded default school: ' + sn);
        }
    } catch (e) {
        console.log('Seed error: ' + e.message);
    }

    db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('emis_db_version', '6')");
    saveDb();
    console.log('Multi-school migration complete! (v6)');
};
