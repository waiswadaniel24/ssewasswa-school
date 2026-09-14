// FileName: electron/uneb-connector.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: UNEB (Uganda National Examinations Board) API connector for candidate registration and results

const axios = require('axios');
const crypto = require('crypto');

const UNEB = {
    // These are set by init() when main.js starts
    db: null,
    saveDb: null,

    // ═════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═════════════════════════════════════════════════════════

    /**
     * Initialize the UNEB connector with database instance.
     * Called from main.js after database is ready.
     * @param {Object} dbInstance - sql.js database instance
     * @param {Function} saveDbFn - Function to persist database to disk
     */
    init: function (dbInstance, saveDbFn) {
        this.db = dbInstance;
        this.saveDb = saveDbFn;
    },

    // ═════════════════════════════════════════════════════════
    // CONFIG HELPER (FIXED: uses prepare+bind, NOT string interpolation)
    // ═════════════════════════════════════════════════════════

    /**
     * Get a UNEB API configuration value from system_settings.
     * FIXED: Uses db.prepare() + bind() instead of string concatenation.
     * @param {string} key - Setting key (e.g., 'uneb_api_key')
     * @returns {string} Setting value or empty string
     */
    _getSetting: function (key) {
        try {
            const stmt = this.db.prepare("SELECT value FROM system_settings WHERE key = ?");
            stmt.bind([key]);
            let value = '';
            if (stmt.step()) {
                const row = stmt.getAsObject();
                value = row.value || '';
            }
            stmt.free();
            return value;
        } catch (e) {
            return '';
        }
    },

    /**
     * Get all UNEB API configuration.
     * @returns {{apiKey: string, apiSecret: string, baseURL: string, centerNumber: string, emisNumber: string, isActive: boolean}}
     */
    getConfig: function () {
        try {
            return {
                apiKey: this._getSetting('uneb_api_key'),
                apiSecret: this._getSetting('uneb_api_secret'),
                baseURL: this._getSetting('uneb_api_url') || 'https://emis.uneb.go.ug/api/v1',
                centerNumber: this._getSetting('uneb_center_number'),
                emisNumber: this._getSetting('emis_number'),
                isActive: !!this._getSetting('uneb_api_key')
            };
        } catch (e) {
            return { isActive: false };
        }
    },

    // ═════════════════════════════════════════════════════════
    // API AUTHENTICATION
    // ═════════════════════════════════════════════════════════

    /**
     * Generate HMAC-SHA256 signature for UNEB API authentication.
     * @param {string} apiKey - API key
     * @param {string} apiSecret - API secret
     * @param {string} timestamp - Unix timestamp string
     * @returns {string} Hex-encoded signature
     */
    generateSignature: function (apiKey, apiSecret, timestamp) {
        if (!apiSecret || !apiKey) return '';
        return crypto.createHmac('sha256', apiSecret).update(apiKey + timestamp).digest('hex');
    },

    /**
     * Make an authenticated HTTP request to the UNEB API.
     * @param {string} endpoint - API path (e.g., '/candidates/register')
     * @param {string} method - HTTP method (GET, POST, PUT)
     * @param {Object} data - Request body for POST/PUT
     * @returns {Promise<Object>} API response data
     * @throws {Error} If API is not configured or request fails
     */
    makeRequest: async function (endpoint, method, data) {
        const config = this.getConfig();
        if (!config.isActive) {
            throw new Error('UNEB API not configured. Go to Settings > EMIS Config to set up API keys.');
        }

        const timestamp = Date.now().toString();
        const signature = this.generateSignature(config.apiKey, config.apiSecret, timestamp);

        const headers = {
            'X-API-Key': config.apiKey,
            'X-Timestamp': timestamp,
            'X-Signature': signature,
            'Content-Type': 'application/json'
        };

        const response = await axios({
            method: method || 'GET',
            url: config.baseURL + endpoint,
            headers: headers,
            data: data || undefined,
            timeout: 30000
        });

        return response.data;
    },

    // ═════════════════════════════════════════════════════════
    // SYNC LOG
    // ═════════════════════════════════════════════════════════

    /**
     * Log a sync event to the emis_sync_log table.
     * @param {string} type - Sync type (e.g., 'UNEB_Registration', 'UNEB_Results')
     * @param {string} direction - 'Push' or 'Pull'
     * @param {string} status - 'Success' or 'Failed'
     * @param {number} recordsCount - Number of records processed
     * @param {string} error - Error message if failed
     */
    logSync: function (type, direction, status, recordsCount, error) {
        try {
            this.db.run(
                "INSERT INTO emis_sync_log (sync_type, sync_direction, status, records_pushed, error_message, started_at, completed_at) VALUES (?,?,?,?,?,datetime('now'),datetime('now'))",
                [type, direction, status, recordsCount || 0, error || '']
            );
            this.saveDb();
        } catch (e) {
            console.error('Failed to log sync event:', e.message);
        }
    },

    // ═════════════════════════════════════════════════════════
    // CANDIDATE REGISTRATION
    // ═════════════════════════════════════════════════════════

    /**
     * Register pending UNEB candidates with the national system.
     * FIXED: Uses db.prepare() + bind() for all queries (no string concatenation).
     * @param {string} examType - 'PLE', 'UCE', or 'UACE'
     * @param {number} academicYearId - Academic year ID
     * @returns {Promise<{success: boolean, count?: number, message?: string, error?: string}>}
     */
    registerCandidates: async function (examType, academicYearId) {
        const config = this.getConfig();
        try {
            // Get pending candidates using parameterized query (FIXED)
            const stmt = this.db.prepare(
                "SELECT c.id, s.admission_number, s.first_name, s.last_name, s.other_name, " +
                "s.gender, s.date_of_birth, c.subjects_registered, c.candidate_name " +
                "FROM uneb_candidates c " +
                "JOIN students s ON c.student_id = s.id " +
                "WHERE c.center_number = ? AND c.exam_type = ? AND c.academic_year_id = ? " +
                "AND c.submitted_to_uneb = 0 AND c.registration_status = 'Pending'"
            );
            stmt.bind([config.centerNumber, examType, academicYearId]);

            const candidates = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                candidates.push({
                    local_id: row.id,
                    admission_number: row.admission_number,
                    full_name: row.candidate_name || (row.first_name + ' ' + row.last_name + (row.other_name ? ' ' + row.other_name : '')),
                    gender: row.gender,
                    date_of_birth: row.date_of_birth,
                    subjects: JSON.parse(row.subjects_registered || '[]')
                });
            }
            stmt.free();

            if (candidates.length === 0) {
                return { success: true, message: 'No pending candidates to register', count: 0 };
            }

            // Send to UNEB API
            const payload = {
                center_number: config.centerNumber,
                emis_number: config.emisNumber,
                exam_type: examType,
                academic_year_id: academicYearId,
                candidates: candidates
            };

            const result = await this.makeRequest('/candidates/register', 'POST', payload);

            if (result.success) {
                // Mark candidates as submitted (parameterized query)
                const updateStmt = this.db.prepare(
                    "UPDATE uneb_candidates SET submitted_to_uneb = 1, submission_date = datetime('now'), " +
                    "registration_status = 'Submitted' " +
                    "WHERE center_number = ? AND exam_type = ? AND academic_year_id = ? AND submitted_to_uneb = 0"
                );
                updateStmt.bind([config.centerNumber, examType, academicYearId]);
                updateStmt.step();
                updateStmt.free();
                this.saveDb();
            }

            this.logSync('UNEB_Registration', 'Push', result.success ? 'Success' : 'Failed', candidates.length, result.error || '');
            return {
                success: result.success,
                count: candidates.length,
                message: result.success ? candidates.length + ' candidates registered!' : result.error
            };
        } catch (e) {
            this.logSync('UNEB_Registration', 'Push', 'Failed', 0, e.message);
            return { success: false, error: e.message };
        }
    },

    // ═════════════════════════════════════════════════════════
    // FETCH RESULTS
    // ═════════════════════════════════════════════════════════

    /**
     * Fetch UNEB exam results from the national system.
     * @param {string} examType - 'PLE', 'UCE', or 'UACE'
     * @param {number} academicYearId - Academic year ID
     * @returns {Promise<{success: boolean, count?: number, message?: string, error?: string}>}
     */
    fetchResults: async function (examType, academicYearId) {
        const config = this.getConfig();
        try {
            const endpoint = '/results/' + encodeURIComponent(config.centerNumber) +
                '?exam_type=' + encodeURIComponent(examType) +
                '&year=' + encodeURIComponent(academicYearId);

            const result = await this.makeRequest(endpoint, 'GET');

            if (result.success && result.results && result.results.length > 0) {
                // Insert results using parameterized query
                for (const r of result.results) {
                    try {
                        this.db.run(
                            "INSERT OR REPLACE INTO uneb_results " +
                            "(candidate_id, student_id, exam_type, academic_year_id, subject_name, subject_code, " +
                            "result_grade, result_score, aggregate, division, fetched_from_uneb, fetch_date) " +
                            "VALUES (?,?,?,?,?,?,?,?,?,?,?,1,datetime('now'))",
                            [
                                r.candidate_id, r.student_id, examType, academicYearId,
                                r.subject_name, r.subject_code,
                                r.result_grade, r.result_score,
                                r.aggregate, r.division
                            ]
                        );
                    } catch (e) {
                        console.error('Failed to insert result for candidate:', r.candidate_id, e.message);
                    }
                }
                this.saveDb();
            }

            this.logSync('UNEB_Results', 'Pull', result.success ? 'Success' : 'Failed',
                result.results ? result.results.length : 0, result.error || '');

            return {
                success: result.success,
                count: result.results ? result.results.length : 0,
                message: result.success ? 'Results fetched!' : result.error
            };
        } catch (e) {
            this.logSync('UNEB_Results', 'Pull', 'Failed', 0, e.message);
            return { success: false, error: e.message };
        }
    },

    // ═════════════════════════════════════════════════════════
    // PUSH EMIS DATA
    // ═════════════════════════════════════════════════════════

    /**
     * Push school EMIS data to the national system.
     * @param {number} academicYearId - Academic year ID
     * @param {number} term - Term number (1, 2, or 3)
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    pushEMISData: async function (academicYearId, term) {
        const config = this.getConfig();
        try {
            const report = this.compileEMISReport(academicYearId, term);
            report.emis_number = config.emisNumber;

            const result = await this.makeRequest('/emis/school-data', 'POST', report);

            this.logSync('EMIS_Push', 'Push', result.success ? 'Success' : 'Failed', 1, result.error || '');

            if (result.success) {
                // Update last sync timestamp
                this.db.run("UPDATE school_registration SET last_emis_sync = datetime('now') WHERE id = 1");
                this.saveDb();
            }

            return {
                success: result.success,
                message: result.success ? 'EMIS data pushed successfully!' : result.error
            };
        } catch (e) {
            this.logSync('EMIS_Push', 'Push', 'Failed', 0, e.message);
            return { success: false, error: e.message };
        }
    },

    // ═════════════════════════════════════════════════════════
    // COMPILE EMIS REPORT
    // ═════════════════════════════════════════════════════════

    /**
     * Compile a full EMIS report from local database data.
     * FIXED: Uses db.prepare() + bind() for all queries (no string concatenation).
     * @param {number} academicYearId - Academic year ID
     * @param {number} term - Term number
     * @returns {Object} EMIS report object
     */
    compileEMISReport: function (academicYearId, term) {
        const report = {
            generated_at: new Date().toISOString(),
            academic_year_id: academicYearId,
            term: term,
            school_info: {},
            enrollment: [],
            staff: [],
            infrastructure: {}
        };

        // ─── School Info ──────────────────────────────────
        try {
            const r = this.db.exec("SELECT * FROM school_registration WHERE id = 1");
            if (r.length > 0 && r[0].values.length > 0) {
                r[0].columns.forEach((c, i) => {
                    report.school_info[c] = r[0].values[0][i];
                });
            }
        } catch (e) {
            console.error('EMIS report: school_info error:', e.message);
        }

        // ─── Enrollment by Class ─────────────────────────
        try {
            const stmt = this.db.prepare(
                "SELECT c.name, " +
                "COUNT(CASE WHEN s.gender = 'M' THEN 1 END) as boys, " +
                "COUNT(CASE WHEN s.gender = 'F' THEN 1 END) as girls, " +
                "COUNT(*) as total " +
                "FROM student_enrollment se " +
                "JOIN students s ON se.student_id = s.id " +
                "JOIN classes c ON se.class_id = c.id " +
                "WHERE se.academic_year_id = ? AND se.term = ? " +
                "GROUP BY c.name"
            );
            stmt.bind([academicYearId, term]);

            while (stmt.step()) {
                const row = stmt.getAsObject();
                report.enrollment.push({
                    class_name: row.name,
                    boys: row.boys,
                    girls: row.girls,
                    total: row.total
                });
            }
            stmt.free();
        } catch (e) {
            console.error('EMIS report: enrollment error:', e.message);
        }

        // ─── Staff Summary ────────────────────────────────
        try {
            const r = this.db.exec(
                "SELECT role, employer_type, highest_qualification, gender, COUNT(*) as count " +
                "FROM staff WHERE status = 'Active' " +
                "GROUP BY role, employer_type, highest_qualification, gender"
            );
            if (r.length > 0) {
                r[0].values.forEach(row => {
                    report.staff.push({
                        role: row[0],
                        employer_type: row[1],
                        qualification: row[2],
                        gender: row[3],
                        count: row[4]
                    });
                });
            }
        } catch (e) {
            console.error('EMIS report: staff error:', e.message);
        }

        // ─── Infrastructure ───────────────────────────────
        try {
            const stmt = this.db.prepare("SELECT * FROM infrastructure WHERE academic_year_id = ? LIMIT 1");
            stmt.bind([academicYearId]);
            if (stmt.step()) {
                report.infrastructure = stmt.getAsObject();
            }
            stmt.free();
        } catch (e) {
            console.error('EMIS report: infrastructure error:', e.message);
        }

        return report;
    }
};

module.exports = UNEB;