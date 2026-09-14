// migrations.js — v1 to v5 ONLY (v6 is in migrations-v6.js)
module.exports = function (db, saveDb) {
    var v = 0;
    try {
        var r = db.exec("SELECT value FROM system_settings WHERE key = 'emis_db_version'");
        if (r.length > 0 && r[0].values.length > 0) {
            v = parseInt(r[0].values[0][0]) || 0;
        }
    } catch (e) { /* settings table might not exist yet */ }

    if (v >= 5) { console.log('[Migrations] Already at v5'); return; }
    console.log('[Migrations] Running: v' + v + ' -> v5...');

    // V1: Column additions
    if (v < 1) {
        console.log('  [v1] Adding EMIS columns...');
        var cols1 = [
            "ALTER TABLE students ADD COLUMN other_name TEXT",
            "ALTER TABLE students ADD COLUMN gender TEXT DEFAULT 'M'",
            "ALTER TABLE students ADD COLUMN date_of_birth TEXT",
            "ALTER TABLE students ADD COLUMN student_type TEXT DEFAULT 'Day'",
            "ALTER TABLE students ADD COLUMN residence TEXT",
            "ALTER TABLE students ADD COLUMN photo_path TEXT",
            "ALTER TABLE students ADD COLUMN guardian_phone2 TEXT",
            "ALTER TABLE students ADD COLUMN guardian_email TEXT",
            "ALTER TABLE students ADD COLUMN guardian_occupation TEXT",
            "ALTER TABLE students ADD COLUMN guardian_nin TEXT",
            "ALTER TABLE students ADD COLUMN nin TEXT",
            "ALTER TABLE students ADD COLUMN emis_student_id TEXT",
            "ALTER TABLE students ADD COLUMN previous_school TEXT",
            "ALTER TABLE students ADD COLUMN admission_date TEXT",
            "ALTER TABLE students ADD COLUMN dropout_reason TEXT",
            "ALTER TABLE students ADD COLUMN transfer_date TEXT",
            "ALTER TABLE students ADD COLUMN updated_at DATETIME",
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
            "ALTER TABLE payments ADD COLUMN method TEXT DEFAULT 'Cash'",
            "ALTER TABLE payments ADD COLUMN reference TEXT",
            "ALTER TABLE marks ADD COLUMN is_military_protected INTEGER DEFAULT 0",
            "ALTER TABLE classes ADD COLUMN teacher_id INTEGER",
            "ALTER TABLE classes ADD COLUMN student_count INTEGER DEFAULT 0",
            "ALTER TABLE classes ADD COLUMN academic_year_id INTEGER"
        ];
        for (var i = 0; i < cols1.length; i++) { try { db.run(cols1[i]); } catch (e) { /* column exists */ } }
        console.log('  [v1] Done');
    }

    // V2: EMIS core tables
    if (v < 2) {
        console.log('  [v2] Creating EMIS tables...');
        var t2 = [
            "CREATE TABLE IF NOT EXISTS school_registration (id INTEGER PRIMARY KEY, school_name TEXT, emis_number TEXT, uneb_center_number TEXT, school_type TEXT DEFAULT 'Private', school_level TEXT DEFAULT 'Secondary', co_education_type TEXT DEFAULT 'Mixed', boarding_status TEXT DEFAULT 'Day', district_name TEXT, county_name TEXT, sub_county_name TEXT, parish_name TEXT, village TEXT, gps_latitude REAL, gps_longitude REAL, founding_year INTEGER, phone TEXT, email TEXT, postal_address TEXT, head_teacher_name TEXT, head_teacher_phone TEXT, chairperson_name TEXT, chairperson_phone TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS academic_years (id INTEGER PRIMARY KEY AUTOINCREMENT, year_name TEXT NOT NULL, term_1_start TEXT, term_1_end TEXT, term_2_start TEXT, term_2_end TEXT, term_3_start TEXT, term_3_end TEXT, is_current INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS student_enrollment (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, class_id INTEGER NOT NULL, stream_id INTEGER, academic_year_id INTEGER NOT NULL, term INTEGER DEFAULT 1, enrollment_status TEXT DEFAULT 'Enrolled', enrollment_date TEXT, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS infrastructure (id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER, classrooms_permanent INTEGER DEFAULT 0, classrooms_semi_permanent INTEGER DEFAULT 0, classrooms_temporary INTEGER DEFAULT 0, classrooms_good INTEGER DEFAULT 0, classrooms_fair INTEGER DEFAULT 0, classrooms_poor INTEGER DEFAULT 0, classrooms_under_construction INTEGER DEFAULT 0, water_source TEXT, water_functional INTEGER DEFAULT 1, power_source TEXT, power_functional INTEGER DEFAULT 1, has_computer_lab INTEGER DEFAULT 0, number_of_computers INTEGER DEFAULT 0, computers_functional INTEGER DEFAULT 0, has_internet INTEGER DEFAULT 0, internet_type TEXT, has_library INTEGER DEFAULT 0, library_capacity INTEGER DEFAULT 0, has_fence INTEGER DEFAULT 0, fence_type TEXT, has_playground INTEGER DEFAULT 0, staff_houses INTEGER DEFAULT 0, staff_houses_occupied INTEGER DEFAULT 0, desks_benches INTEGER DEFAULT 0, desks_good INTEGER DEFAULT 0, desks_fair INTEGER DEFAULT 0, desks_poor INTEGER DEFAULT 0, overall_condition TEXT DEFAULT 'Fair', remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS latrines (id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER, stance_type TEXT, latrine_type TEXT, number_of_stances INTEGER DEFAULT 0, is_functional INTEGER DEFAULT 1, has_handwashing INTEGER DEFAULT 0, condition_text TEXT DEFAULT 'Good', remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS textbooks (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER, class_id INTEGER, academic_year_id INTEGER, textbook_title TEXT, books_received INTEGER DEFAULT 0, books_available INTEGER DEFAULT 0, books_good INTEGER DEFAULT 0, books_fair INTEGER DEFAULT 0, books_poor INTEGER DEFAULT 0, source TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS special_needs_learners (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, disability_type TEXT NOT NULL, severity TEXT DEFAULT 'Mild', assistive_device TEXT, receiving_support INTEGER DEFAULT 0, support_type TEXT, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS ovc_data (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, ovc_category TEXT NOT NULL, is_receiving_support INTEGER DEFAULT 0, support_type TEXT, support_source TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS school_finances_emis (id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER, term INTEGER, upe_grant REAL DEFAULT 0, use_grant REAL DEFAULT 0, wash_grant REAL DEFAULT 0, special_needs_grant REAL DEFAULT 0, school_feeding_grant REAL DEFAULT 0, school_fees_collected REAL DEFAULT 0, pta_contributions REAL DEFAULT 0, donor_funding REAL DEFAULT 0, other_income REAL DEFAULT 0, other_income_source TEXT, expenditure_instructional REAL DEFAULT 0, expenditure_administration REAL DEFAULT 0, expenditure_development REAL DEFAULT 0, expenditure_co_curricular REAL DEFAULT 0, expenditure_school_feeding REAL DEFAULT 0, expenditure_utilities REAL DEFAULT 0, expenditure_transport REAL DEFAULT 0, expenditure_staff_wages REAL DEFAULT 0, expenditure_maintenance REAL DEFAULT 0, expenditure_other REAL DEFAULT 0, bank_name TEXT, bank_account TEXT, bank_branch TEXT, last_audit_date TEXT, smc_budget_approval INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS wash_data (id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER, water_source_type TEXT, water_treatment TEXT, drinking_water_available INTEGER DEFAULT 0, handwashing_stations INTEGER DEFAULT 0, handwashing_with_soap INTEGER DEFAULT 0, menstrual_hygiene INTEGER DEFAULT 0, waste_disposal TEXT, school_cleanliness TEXT DEFAULT 'Good', deworming_done INTEGER DEFAULT 0, last_deworming TEXT, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS military_grade_config (id INTEGER PRIMARY KEY AUTOINCREMENT, school_name TEXT, is_military INTEGER DEFAULT 0, military_school TEXT, combination TEXT, is_current INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS dropout_records (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, dropout_date TEXT, dropout_reason TEXT, destination_known INTEGER DEFAULT 0, destination_school TEXT, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS health_nutrition (id INTEGER PRIMARY KEY AUTOINCREMENT, academic_year_id INTEGER, has_feeding_program INTEGER DEFAULT 0, feeding_type TEXT, feeding_funding TEXT, beneficiaries INTEGER DEFAULT 0, has_first_aid INTEGER DEFAULT 0, has_school_nurse INTEGER DEFAULT 0, deworming_done INTEGER DEFAULT 0, hiv_life_skills INTEGER DEFAULT 0, mental_health_support INTEGER DEFAULT 0, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS governance_members (id INTEGER PRIMARY KEY AUTOINCREMENT, member_type TEXT, name TEXT, phone TEXT, position TEXT, status TEXT DEFAULT 'Active', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS nursery_assessments (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, area TEXT, term TEXT DEFAULT 'Term 1', rating TEXT DEFAULT 'Satisfactory', comments TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        ];
        for (var i = 0; i < t2.length; i++) { try { db.run(t2[i]); } catch (e) { /* table exists */ } }
        console.log('  [v2] Done');
    }

    // V3: UNEB tables
    if (v < 3) {
        console.log('  [v3] Creating UNEB tables...');
        var t3 = [
            "CREATE TABLE IF NOT EXISTS uneb_candidates (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, center_number TEXT, exam_type TEXT, academic_year_id INTEGER, candidate_number TEXT, candidate_name TEXT, gender TEXT, date_of_birth TEXT, subjects_registered TEXT, registration_status TEXT DEFAULT 'Pending', submitted_to_uneb INTEGER DEFAULT 0, submission_date TEXT, fees_paid INTEGER DEFAULT 0, passport_photo_path TEXT, remarks TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS uneb_results (id INTEGER PRIMARY KEY AUTOINCREMENT, candidate_id INTEGER, student_id INTEGER, exam_type TEXT, academic_year_id INTEGER, subject_name TEXT, subject_code TEXT, result_grade TEXT, result_score INTEGER, aggregate INTEGER, division TEXT, fetched_from_uneb INTEGER DEFAULT 0, fetch_date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        ];
        for (var i = 0; i < t3.length; i++) { try { db.run(t3[i]); } catch (e) { /* exists */ } }
        console.log('  [v3] Done');
    }

    // V4: API & payment tables
    if (v < 4) {
        console.log('  [v4] Creating API tables...');
        var t4 = [
            "CREATE TABLE IF NOT EXISTS emis_sync_log (id INTEGER PRIMARY KEY AUTOINCREMENT, sync_type TEXT, sync_direction TEXT, academic_year_id INTEGER, term INTEGER, records_pushed INTEGER DEFAULT 0, records_pulled INTEGER DEFAULT 0, status TEXT DEFAULT 'Started', error_message TEXT, api_key_used TEXT, sync_data TEXT, started_at TEXT, completed_at TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS bank_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT UNIQUE, bank_name TEXT, account_number TEXT, account_name TEXT, amount REAL, student_name TEXT, narration TEXT, status TEXT DEFAULT 'Pending', confirmed_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS payment_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT UNIQUE, student_id INTEGER, method TEXT, phone TEXT, amount REAL, status TEXT DEFAULT 'Pending', narration TEXT, api_response TEXT, confirmed_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS student_documents (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, document_type TEXT, filename TEXT, original_name TEXT, file_size INTEGER, uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        ];
        for (var i = 0; i < t4.length; i++) { try { db.run(t4[i]); } catch (e) { /* exists */ } }
        console.log('  [v4] Done');
    }

    // V5: Document & governance tables
    if (v < 5) {
        console.log('  [v5] Creating document tables...');
        var t5 = [
            "CREATE TABLE IF NOT EXISTS teacher_qualifications (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER, qualification_type TEXT, institution TEXT, year_obtained INTEGER, certificate_number TEXT, tsc_registration_number TEXT, specialization TEXT, is_uneb_examiner INTEGER DEFAULT 0, teaching_subjects TEXT, years_experience INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS meeting_minutes (id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_type TEXT, date TEXT, time TEXT, venue TEXT, chairperson TEXT, secretary TEXT, agenda TEXT, minutes TEXT, action_items TEXT, attendees TEXT, status TEXT DEFAULT 'Draft', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_by INTEGER)",
            "CREATE TABLE IF NOT EXISTS stored_signatures (id INTEGER PRIMARY KEY AUTOINCREMENT, person_id INTEGER, person_type TEXT, person_name TEXT, signature_image TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS document_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, template_name TEXT, doc_type TEXT, header_config TEXT, footer_config TEXT, boundary_style TEXT DEFAULT 'simple', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS parent_profiles (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, parent_name TEXT, relationship TEXT, phone TEXT, phone2 TEXT, email TEXT, occupation TEXT, nin TEXT, photo_path TEXT, residence TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS student_timeline (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER, event_type TEXT, event_date TEXT, description TEXT, recorded_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS signature_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, person_name TEXT, person_role TEXT, doc_type TEXT, signature_position TEXT DEFAULT 'bottom_left', enabled INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS deduction_types (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, is_percentage INTEGER DEFAULT 0, amount REAL DEFAULT 0, is_mandatory INTEGER DEFAULT 0, applies_to TEXT DEFAULT 'all', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS staff_deductions (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER, deduction_type_id INTEGER, month TEXT, year TEXT, amount REAL, reason TEXT, approved_by INTEGER, status TEXT DEFAULT 'Pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS purchase_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, item_description TEXT, quantity INTEGER, estimated_cost REAL, vendor TEXT, urgency TEXT DEFAULT 'Normal', requested_by INTEGER, requested_by_name TEXT, status TEXT DEFAULT 'Pending', authorized_by INTEGER, authorized_by_name TEXT, authorized_at DATETIME, rejection_reason TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
            "CREATE TABLE IF NOT EXISTS school_branding (id INTEGER PRIMARY KEY, logo_path TEXT, stamp_path TEXT, signature_path TEXT, header_line1 TEXT, header_line2 TEXT, header_line3 TEXT, footer_line1 TEXT, footer_line2 TEXT, motto TEXT, vision TEXT, mission TEXT, po_box TEXT, district TEXT, region TEXT, telephone TEXT, email TEXT, website TEXT)",
            "CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT, table_name TEXT, record_id INTEGER, old_values TEXT, new_values TEXT, user_id INTEGER, username TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
        ];
        for (var i = 0; i < t5.length; i++) { try { db.run(t5[i]); } catch (e) { /* exists */ } }
        console.log('  [v5] Done');
    }

    // Seed defaults
    try {
        var sc = db.exec("SELECT COUNT(*) FROM school_registration");
        if (sc.length > 0 && sc[0].values[0][0] === 0) {
            db.run("INSERT INTO school_registration (id, school_name) VALUES (1, '')");
        }
    } catch (e) { /* ignore */ }

    try {
        var yc = db.exec("SELECT COUNT(*) FROM academic_years");
        if (yc.length > 0 && yc[0].values[0][0] === 0) {
            var yr = new Date().getFullYear();
            var s = db.prepare("INSERT INTO academic_years (year_name, term_1_start, term_1_end, term_2_start, term_2_end, term_3_start, term_3_end, is_current) VALUES (?,?,?,?,?,?,?,?)");
            s.bind([String(yr), yr + '-02-03', yr + '-05-03', yr + '-05-27', yr + '-08-18', yr + '-09-15', yr + '-12-11', 1]);
            s.step(); s.free();
        }
    } catch (e) { /* ignore */ }

    db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('emis_db_version', '5')");
    saveDb();
    console.log('[Migrations] Complete! v5');
};
