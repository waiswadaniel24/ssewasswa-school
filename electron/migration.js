// FileName: electron/migrations.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Versioned database migrations — upgrades old databases to current schema (v5)

/**
 * Run EMIS database migrations.
 * Tracks version in system_settings and applies incremental changes.
 * Idempotent: safe to run multiple times (CREATE TABLE IF NOT EXISTS, ALTER TABLE errors ignored).
 * @param {Object} db - sql.js database instance
 * @param {Function} saveDb - Function to persist database to disk
 */
module.exports = function (db, saveDb) {

    // ═══════════════════════════════════════════════════
    // DETERMINE CURRENT VERSION
    // ═══════════════════════════════════════════════════

    let v = 0;
    try {
        const result = db.exec("SELECT value FROM system_settings WHERE key = 'emis_db_version'");
        if (result.length > 0 && result[0].values.length > 0 && result[0].values[0][0]) {
            v = parseInt(result[0].values[0][0]) || 0;
        }
    } catch (e) {
        // system_settings table may not exist yet — v stays 0, migrations will create it
    }

    if (v >= 5) {
        console.log('[Migrations] Database already up to date (v' + v + ')');
        return;
    }

    console.log('[Migrations] Running: v' + v + ' -> v5...');

    // ═══════════════════════════════════════════════════
    // V1: COLUMN ADDITIONS
    // ═══════════════════════════════════════════════════

    if (v < 1) {
        console.log('  [v1] Adding EMIS columns...');

        // ─── Students ───────────────────────────────────
        const studentCols = [
            "ALTER TABLE students ADD COLUMN other_name TEXT",
            "ALTER TABLE students ADD COLUMN gender TEXT DEFAULT 'M'",
            "ALTER TABLE students ADD COLUMN date_of_birth TEXT",
            "ALTER TABLE students ADD COLUMN student_type TEXT DEFAULT 'Day'",
            "ALTER TABLE students ADD COLUMN residence TEXT",
            "ALTER TABLE students ADD COLUMN house_id INTEGER",
            "ALTER TABLE students ADD COLUMN photo_path TEXT",
            "ALTER TABLE students ADD COLUMN guardian_relation TEXT",
            "ALTER TABLE students ADD COLUMN guardian_phone2 TEXT",
            "ALTER TABLE students ADD COLUMN guardian_email TEXT",
            "ALTER TABLE students ADD COLUMN guardian_occupation TEXT",
            "ALTER TABLE students ADD COLUMN guardian_nin TEXT",
            "ALTER TABLE students ADD COLUMN guardian_photo TEXT",
            "ALTER TABLE students ADD COLUMN second_guardian_name TEXT",
            "ALTER TABLE students ADD COLUMN second_guardian_phone TEXT",
            "ALTER TABLE students ADD COLUMN birth_certificate TEXT",
            "ALTER TABLE students ADD COLUMN nin TEXT",
            "ALTER TABLE students ADD COLUMN emis_student_id TEXT",
            "ALTER TABLE students ADD COLUMN previous_school TEXT",
            "ALTER TABLE students ADD COLUMN admission_date TEXT",
            "ALTER TABLE students ADD COLUMN dropout_reason TEXT",
            "ALTER TABLE students ADD COLUMN transfer_date TEXT",
            "ALTER TABLE students ADD COLUMN updated_at DATETIME"
        ];
        for (const sql of studentCols) { try { db.run(sql); } catch (e) { /* column exists */ } }

        // ─── Staff ───────────────────────────────────────
        const staffCols = [
            "ALTER TABLE staff ADD COLUMN other_name TEXT",
            "ALTER TABLE staff ADD COLUMN date_of_birth TEXT",
            "ALTER TABLE staff ADD COLUMN gender TEXT DEFAULT 'M'",
            "ALTER TABLE staff ADD COLUMN designation TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN employer_type TEXT DEFAULT 'BOG'",
            "ALTER TABLE staff ADD COLUMN payroll_number TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN nin TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN tsc_number TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN highest_qualification TEXT",
            "ALTER TABLE staff ADD COLUMN professional_qualification TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN subjects_trained TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN subjects_teaching TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN special_needs_trained INTEGER DEFAULT 0",
            "ALTER TABLE staff ADD COLUMN years_experience INTEGER DEFAULT 0",
            "ALTER TABLE staff ADD COLUMN phone TEXT",
            "ALTER TABLE staff ADD COLUMN email TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN photo_path TEXT",
            "ALTER TABLE staff ADD COLUMN appointment_date TEXT DEFAULT ''",
            "ALTER TABLE staff ADD COLUMN status TEXT DEFAULT 'Active'",
            "ALTER TABLE staff ADD COLUMN updated_at DATETIME"
        ];
        for (const sql of staffCols) { try { db.run(sql); } catch (e) { /* column exists */ } }

        // ─── Classes ─────────────────────────────────────
        const classCols = [
            "ALTER TABLE classes ADD COLUMN level TEXT DEFAULT 'O_Level'",
            "ALTER TABLE classes ADD COLUMN stream TEXT DEFAULT 'A'",
            "ALTER TABLE classes ADD COLUMN class_teacher_id INTEGER",
            "ALTER TABLE classes ADD COLUMN capacity INTEGER DEFAULT 50",
            "ALTER TABLE classes ADD COLUMN academic_year_id INTEGER",
            "ALTER TABLE classes ADD COLUMN teacher_id INTEGER",
            "ALTER TABLE classes ADD COLUMN student_count INTEGER DEFAULT 0"
        ];
        for (const sql of classCols) { try { db.run(sql); } catch (e) { /* column exists */ } }

        // ─── Subjects ────────────────────────────────────
        const subjectCols = [
            "ALTER TABLE subjects ADD COLUMN code TEXT",
            "ALTER TABLE subjects ADD COLUMN uneb_code TEXT",
            "ALTER TABLE subjects ADD COLUMN category TEXT",
            "ALTER TABLE subjects ADD COLUMN level TEXT DEFAULT 'O_Level'",
            "ALTER TABLE subjects ADD COLUMN is_compulsory INTEGER DEFAULT 1"
        ];
        for (const sql of subjectCols) { try { db.run(sql); } catch (e) { /* column exists */ } }

        // ─── Payments ────────────────────────────────────
        try { db.run("ALTER TABLE payments ADD COLUMN method TEXT DEFAULT 'Cash'"); } catch (e) { /* exists */ }
        try { db.run("ALTER TABLE payments ADD COLUMN reference TEXT"); } catch (e) { /* exists */ }

        // ─── Marks (military grade protection) ──────────
        try { db.run("ALTER TABLE marks ADD COLUMN is_military_protected INTEGER DEFAULT 0"); } catch (e) { /* exists */ }

        // ─── Users (security questions) ──────────────────
        try { db.run("ALTER TABLE users ADD COLUMN security_question TEXT"); } catch (e) { /* exists */ }
        try { db.run("ALTER TABLE users ADD COLUMN security_answer TEXT"); } catch (e) { /* exists */ }

        console.log('  [v1] Column additions complete');
    }

    // ═══════════════════════════════════════════════════
    // V2: EMIS CORE TABLES
    // ═══════════════════════════════════════════════════

    if (v < 2) {
        console.log('  [v2] Creating EMIS core tables...');

        db.run(`CREATE TABLE IF NOT EXISTS school_registration (
            id INTEGER PRIMARY KEY,
            school_name TEXT NOT NULL DEFAULT '',
            emis_number TEXT,
            uneb_center_number TEXT,
            school_type TEXT DEFAULT 'Private',
            school_level TEXT DEFAULT 'Secondary',
            co_education_type TEXT DEFAULT 'Mixed',
            boarding_status TEXT DEFAULT 'Day',
            district_name TEXT, county_name TEXT, sub_county_name TEXT,
            parish_name TEXT, village TEXT,
            gps_latitude REAL, gps_longitude REAL,
            founding_year INTEGER, license_number TEXT,
            phone TEXT, email TEXT, postal_address TEXT,
            head_teacher_name TEXT, head_teacher_phone TEXT,
            chairperson_name TEXT, chairperson_phone TEXT,
            total_boys INTEGER DEFAULT 0, total_girls INTEGER DEFAULT 0,
            total_staff INTEGER DEFAULT 0, last_emis_sync TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS academic_years (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year_name TEXT NOT NULL,
            term_1_start TEXT, term_1_end TEXT,
            term_2_start TEXT, term_2_end TEXT,
            term_3_start TEXT, term_3_end TEXT,
            is_current INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS streams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER NOT NULL, stream_name TEXT NOT NULL,
            stream_teacher_id INTEGER, academic_year_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS student_enrollment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL, class_id INTEGER NOT NULL,
            stream_id INTEGER, academic_year_id INTEGER NOT NULL,
            term INTEGER DEFAULT 1, enrollment_status TEXT DEFAULT 'Enrolled',
            enrollment_date TEXT, remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS student_transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL, transfer_type TEXT,
            from_school TEXT, from_emis_number TEXT,
            to_school TEXT, to_emis_number TEXT,
            transfer_date TEXT, reason TEXT, transfer_letter_path TEXT,
            academic_year_id INTEGER, term INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS infrastructure (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            academic_year_id INTEGER,
            classrooms_permanent INTEGER DEFAULT 0,
            classrooms_semi_permanent INTEGER DEFAULT 0,
            classrooms_temporary INTEGER DEFAULT 0,
            classrooms_good INTEGER DEFAULT 0,
            classrooms_fair INTEGER DEFAULT 0,
            classrooms_poor INTEGER DEFAULT 0,
            classrooms_under_construction INTEGER DEFAULT 0,
            water_source TEXT, water_functional INTEGER DEFAULT 1,
            power_source TEXT, power_functional INTEGER DEFAULT 1,
            has_computer_lab INTEGER DEFAULT 0,
            number_of_computers INTEGER DEFAULT 0,
            computers_functional INTEGER DEFAULT 0,
            has_internet INTEGER DEFAULT 0, internet_type TEXT,
            has_library INTEGER DEFAULT 0, library_capacity INTEGER DEFAULT 0,
            has_fence INTEGER DEFAULT 0, fence_type TEXT,
            has_playground INTEGER DEFAULT 0,
            staff_houses INTEGER DEFAULT 0, staff_houses_occupied INTEGER DEFAULT 0,
            desks_benches INTEGER DEFAULT 0,
            desks_good INTEGER DEFAULT 0, desks_fair INTEGER DEFAULT 0, desks_poor INTEGER DEFAULT 0,
            overall_condition TEXT DEFAULT 'Fair', remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS latrines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            academic_year_id INTEGER,
            stance_type TEXT, latrine_type TEXT,
            number_of_stances INTEGER DEFAULT 0,
            is_functional INTEGER DEFAULT 1,
            has_handwashing INTEGER DEFAULT 0,
            condition_text TEXT DEFAULT 'Good',
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS textbooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER, class_id INTEGER, academic_year_id INTEGER,
            textbook_title TEXT,
            books_received INTEGER DEFAULT 0, books_available INTEGER DEFAULT 0,
            books_good INTEGER DEFAULT 0, books_fair INTEGER DEFAULT 0, books_poor INTEGER DEFAULT 0,
            source TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS special_needs_learners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            disability_type TEXT NOT NULL,
            severity TEXT DEFAULT 'Mild',
            assistive_device TEXT,
            receiving_support INTEGER DEFAULT 0,
            support_type TEXT, remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS ovc_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            ovc_category TEXT NOT NULL,
            is_receiving_support INTEGER DEFAULT 0,
            support_type TEXT, support_source TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // School finances — FULL schema matching SchoolFinances.jsx
        db.run(`CREATE TABLE IF NOT EXISTS school_finances_emis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            academic_year_id INTEGER, term INTEGER,
            upe_grant REAL DEFAULT 0, use_grant REAL DEFAULT 0,
            wash_grant REAL DEFAULT 0, special_needs_grant REAL DEFAULT 0,
            school_feeding_grant REAL DEFAULT 0,
            school_fees_collected REAL DEFAULT 0,
            pta_contributions REAL DEFAULT 0,
            donor_funding REAL DEFAULT 0,
            other_income REAL DEFAULT 0, other_income_source TEXT,
            expenditure_instructional REAL DEFAULT 0,
            expenditure_administration REAL DEFAULT 0,
            expenditure_development REAL DEFAULT 0,
            expenditure_co_curricular REAL DEFAULT 0,
            expenditure_school_feeding REAL DEFAULT 0,
            expenditure_utilities REAL DEFAULT 0,
            expenditure_transport REAL DEFAULT 0,
            expenditure_staff_wages REAL DEFAULT 0,
            expenditure_maintenance REAL DEFAULT 0,
            expenditure_other REAL DEFAULT 0,
            bank_name TEXT, bank_account TEXT, bank_branch TEXT,
            last_audit_date TEXT,
            smc_budget_approval INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS houses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            house_name TEXT NOT NULL,
            house_master_id INTEGER, capacity INTEGER DEFAULT 0,
            gender TEXT DEFAULT 'Mixed',
            current_occupancy INTEGER DEFAULT 0,
            condition_text TEXT DEFAULT 'Good',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS house_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            house_id INTEGER, points INTEGER DEFAULT 0,
            reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS wash_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            academic_year_id INTEGER,
            water_source_type TEXT, water_treatment TEXT,
            drinking_water_available INTEGER DEFAULT 0,
            handwashing_stations INTEGER DEFAULT 0,
            handwashing_with_soap INTEGER DEFAULT 0,
            menstrual_hygiene INTEGER DEFAULT 0,
            waste_disposal TEXT,
            school_cleanliness TEXT DEFAULT 'Good',
            deworming_done INTEGER DEFAULT 0,
            last_deworming TEXT, remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS military_grade_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            school_name TEXT NOT NULL,
            is_military INTEGER DEFAULT 0,
            military_school TEXT,
            combination TEXT,
            is_current INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS dropout_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            dropout_date TEXT,
            dropout_reason TEXT,
            destination_known INTEGER DEFAULT 0,
            destination_school TEXT,
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS health_nutrition (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            academic_year_id INTEGER,
            has_feeding_program INTEGER DEFAULT 0,
            feeding_type TEXT, feeding_funding TEXT,
            beneficiaries INTEGER DEFAULT 0,
            has_first_aid INTEGER DEFAULT 0,
            has_school_nurse INTEGER DEFAULT 0,
            deworming_done INTEGER DEFAULT 0,
            hiv_life_skills INTEGER DEFAULT 0,
            mental_health_support INTEGER DEFAULT 0,
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS governance_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_type TEXT,
            name TEXT, phone TEXT, position TEXT,
            status TEXT DEFAULT 'Active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS nursery_assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            area TEXT,
            term TEXT DEFAULT 'Term 1',
            rating TEXT DEFAULT 'Satisfactory',
            comments TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('  [v2] EMIS core tables created');
    }

    // ═══════════════════════════════════════════════════
    // V3: UNEB TABLES
    // ═══════════════════════════════════════════════════

    if (v < 3) {
        console.log('  [v3] Creating UNEB tables...');

        db.run(`CREATE TABLE IF NOT EXISTS uneb_center (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            center_number TEXT UNIQUE NOT NULL,
            center_name TEXT, exam_type TEXT,
            academic_year_id INTEGER,
            is_registered INTEGER DEFAULT 0,
            registration_date TEXT, last_sync TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS uneb_candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            center_number TEXT NOT NULL,
            exam_type TEXT NOT NULL,
            academic_year_id INTEGER NOT NULL,
            candidate_index_number TEXT,
            candidate_number TEXT,
            candidate_name TEXT,
            gender TEXT, date_of_birth TEXT,
            subjects_registered TEXT,
            registration_status TEXT DEFAULT 'Pending',
            registration_date TEXT,
            submitted_to_uneb INTEGER DEFAULT 0,
            submission_date TEXT,
            fees_paid INTEGER DEFAULT 0,
            passport_photo_path TEXT, remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS uneb_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER NOT NULL,
            student_id INTEGER,
            exam_type TEXT NOT NULL,
            academic_year_id INTEGER NOT NULL,
            subject_name TEXT, subject_code TEXT,
            result_grade TEXT, result_score INTEGER,
            aggregate INTEGER, division TEXT,
            fetched_from_uneb INTEGER DEFAULT 0,
            fetch_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS uneb_subject_registration (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_id INTEGER,
            subject_id INTEGER,
            is_compulsory INTEGER DEFAULT 0,
            paper_type TEXT,
            special_needs_accommodation TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('  [v3] UNEB tables created');
    }

    // ═══════════════════════════════════════════════════
    // V4: API, SYNC & PAYMENT TABLES
    // ═══════════════════════════════════════════════════

    if (v < 4) {
        console.log('  [v4] Creating API, sync & payment tables...');

        db.run(`CREATE TABLE IF NOT EXISTS emis_sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sync_type TEXT NOT NULL,
            sync_direction TEXT,
            academic_year_id INTEGER, term INTEGER,
            records_pushed INTEGER DEFAULT 0,
            records_pulled INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Started',
            error_message TEXT,
            api_key_used TEXT,
            sync_data TEXT,
            started_at TEXT, completed_at TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_name TEXT NOT NULL,
            api_key TEXT NOT NULL, api_secret TEXT,
            base_url TEXT,
            is_active INTEGER DEFAULT 1,
            expires_at TEXT, last_used TEXT,
            permissions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS bank_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE,
            bank_name TEXT, account_number TEXT, account_name TEXT,
            amount REAL, student_name TEXT, narration TEXT,
            status TEXT DEFAULT 'Pending',
            confirmed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS payment_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE,
            student_id INTEGER, method TEXT, phone TEXT,
            amount REAL,
            status TEXT DEFAULT 'Pending',
            narration TEXT, api_response TEXT,
            confirmed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS student_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            document_type TEXT,
            filename TEXT, original_name TEXT,
            file_size INTEGER,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('  [v4] API, sync & payment tables created');
    }

    // ═══════════════════════════════════════════════════
    // V5: GOVERNANCE, QUALIFICATIONS & DOCUMENT TABLES
    // ═══════════════════════════════════════════════════

    if (v < 5) {
        console.log('  [v5] Creating governance, qualification & document tables...');

        db.run(`CREATE TABLE IF NOT EXISTS teacher_qualifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_id INTEGER,
            qualification_type TEXT,
            institution TEXT,
            year_obtained INTEGER,
            certificate_number TEXT,
            tsc_registration_number TEXT,
            specialization TEXT,
            is_uneb_examiner INTEGER DEFAULT 0,
            teaching_subjects TEXT,
            years_experience INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS exam_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            exam_type TEXT,
            academic_year TEXT,
            total_marks INTEGER,
            aggregate TEXT,
            division TEXT,
            subjects_json TEXT,
            center_number TEXT,
            candidate_number TEXT,
            rank_in_class INTEGER,
            rank_in_school INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS meeting_minutes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_type TEXT, date TEXT, time TEXT, venue TEXT,
            chairperson TEXT, secretary TEXT,
            agenda TEXT, minutes TEXT, action_items TEXT, attendees TEXT,
            status TEXT DEFAULT 'Draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS meeting_attendees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER,
            person_name TEXT, person_role TEXT,
            person_type TEXT DEFAULT 'Staff',
            signature_image TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS meeting_agenda_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER,
            item_text TEXT,
            item_order INTEGER DEFAULT 0
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS meeting_minute_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER,
            topic TEXT, discussion TEXT, resolution TEXT,
            item_order INTEGER DEFAULT 0
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS meeting_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id INTEGER,
            action TEXT, responsible TEXT,
            deadline TEXT,
            status TEXT DEFAULT 'Pending',
            completed_at DATETIME
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS stored_signatures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id INTEGER,
            person_type TEXT,
            person_name TEXT,
            signature_image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS document_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_name TEXT,
            doc_type TEXT,
            header_config TEXT,
            footer_config TEXT,
            boundary_style TEXT DEFAULT 'simple',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS parent_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            parent_name TEXT,
            relationship TEXT,
            phone TEXT, phone2 TEXT,
            email TEXT, occupation TEXT,
            nin TEXT, photo_path TEXT,
            residence TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS student_timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            event_type TEXT,
            event_date TEXT,
            description TEXT,
            recorded_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS signature_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            person_name TEXT,
            person_role TEXT,
            doc_type TEXT,
            signature_position TEXT DEFAULT 'bottom_left',
            enabled INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS deduction_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            description TEXT,
            is_percentage INTEGER DEFAULT 0,
            amount REAL DEFAULT 0,
            is_mandatory INTEGER DEFAULT 0,
            applies_to TEXT DEFAULT 'all',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS staff_deductions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_id INTEGER,
            deduction_type_id INTEGER,
            month TEXT, year TEXT,
            amount REAL,
            reason TEXT,
            approved_by INTEGER,
            status TEXT DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS purchase_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_description TEXT,
            quantity INTEGER,
            estimated_cost REAL,
            vendor TEXT,
            urgency TEXT DEFAULT 'Normal',
            requested_by INTEGER,
            requested_by_name TEXT,
            status TEXT DEFAULT 'Pending',
            authorized_by INTEGER,
            authorized_by_name TEXT,
            authorized_at DATETIME,
            rejection_reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS school_branding (
            id INTEGER PRIMARY KEY,
            logo_path TEXT, stamp_path TEXT, signature_path TEXT,
            header_line1 TEXT, header_line2 TEXT, header_line3 TEXT,
            footer_line1 TEXT, footer_line2 TEXT,
            motto TEXT, vision TEXT, mission TEXT,
            po_box TEXT, district TEXT, region TEXT,
            telephone TEXT, email TEXT, website TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT,
            table_name TEXT,
            record_id INTEGER,
            old_values TEXT,
            new_values TEXT,
            user_id INTEGER,
            username TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        console.log('  [v5] Governance, qualification & document tables created');
    }

    // ═══════════════════════════════════════════════════
    // SEED DEFAULT DATA
    // ═══════════════════════════════════════════════════

    // Seed default school_registration row if empty
    try {
        const chk = db.exec("SELECT COUNT(*) FROM school_registration");
        if (chk.length > 0 && chk[0].values[0][0] === 0) {
            db.run("INSERT INTO school_registration (id, school_name) VALUES (1, '')");
            console.log('  [Seed] Default school_registration created');
        }
    } catch (e) { /* ignore */ }

    // Seed default academic year if empty
    try {
        const yChk = db.exec("SELECT COUNT(*) FROM academic_years");
        if (yChk.length > 0 && yChk[0].values[0][0] === 0) {
            const yr = new Date().getFullYear();
            const stmt = db.prepare(
                "INSERT INTO academic_years (year_name, term_1_start, term_1_end, term_2_start, term_2_end, term_3_start, term_3_end, is_current) VALUES (?,?,?,?,?,?,?,?)"
            );
            stmt.bind([
                String(yr),
                yr + '-02-03', yr + '-05-03',
                yr + '-05-27', yr + '-08-18',
                yr + '-09-15', yr + '-12-11',
                1
            ]);
            stmt.step();
            stmt.free();
            console.log('  [Seed] Default academic year created');
        }
    } catch (e) { /* ignore */ }

    // ═══════════════════════════════════════════════════
    // UPDATE VERSION & SAVE
    // ═══════════════════════════════════════════════════

    db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('emis_db_version', '5')");
    saveDb();
    console.log('[Migrations] Complete! Database is now at v5');
};