// FileName: electron/preload.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Context bridge between renderer and main process — exposes only explicit, validated IPC methods

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Validate that a SQL query string is non-empty and not a multi-statement attack.
 * Multi-statement detection: a semicolon followed by non-whitespace.
 */
function validateQuery(query) {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Invalid query: query must be a non-empty string');
  }
  // Reject obvious multi-statement injection attempts
  if (/;\s*\S/i.test(query)) {
    throw new Error('Multiple SQL statements are not allowed');
  }
}

/**
 * Validate that params (if provided) is an array.
 */
function validateParams(params) {
  if (params !== undefined && !Array.isArray(params)) {
    throw new Error('Query params must be an array');
  }
  return params || [];
}

contextBridge.exposeInMainWorld('electronAPI', {

  // ═══════════════════════════════════════════════════════
  // SYSTEM & INITIALIZATION
  // ═══════════════════════════════════════════════════════

  /** Check if the system has been initialized (at least one user exists) */
  checkInitialized: () => ipcRenderer.invoke('checkInitialized'),

  /** Get the hardware ID for license binding */
  getHwid: () => ipcRenderer.invoke('getHwid'),

  /** Check license status — returns { success, isTrial, daysLeft } */
  checkLicense: () => ipcRenderer.invoke('checkLicense'),

  /** Activate software with a license key */
  activateLicense: (data) => {
    if (!data || typeof data !== 'object' || !data.licenseKey) {
      return Promise.reject(new Error('License key is required'));
    }
    return ipcRenderer.invoke('activateLicense', data);
  },

  /** Validate a license key against HWID */
  validateLicenseKey: (data) => {
    if (!data || typeof data !== 'object' || !data.licenseKey) {
      return Promise.reject(new Error('License key is required'));
    }
    return ipcRenderer.invoke('validateLicenseKey', data);
  },

  /** Generate a license key for a specific HWID (admin/dev use) */
  generateLicenseForHwid: (hwid) => ipcRenderer.invoke('generateLicenseForHwid', hwid),

  // ═══════════════════════════════════════════════════════
  // DATABASE QUERIES
  // ═══════════════════════════════════════════════════════

  /**
   * Execute a SQL query with optional parameterized values.
   * @param {string} query - SQL statement with ? placeholders
   * @param {Array} params - Array of values to bind to placeholders
   * @returns {Promise<{success: boolean, data: Array, error?: string, lastInsertRowid?: number}>}
   */
  queryDatabase: (query, params) => {
    try {
      validateQuery(query);
      params = validateParams(params);
    } catch (e) {
      return Promise.reject(e);
    }
    return ipcRenderer.invoke('queryDatabase', query, params);
  },

  /** Get a single system setting by key */
  getSetting: (key) => {
    if (typeof key !== 'string' || !key.trim()) {
      return Promise.reject(new Error('Setting key is required'));
    }
    return ipcRenderer.invoke('getSetting', key);
  },

  /** Set a system setting (key-value pair) */
  setSetting: (key, value) => {
    if (typeof key !== 'string' || !key.trim()) {
      return Promise.reject(new Error('Setting key is required'));
    }
    return ipcRenderer.invoke('set-setting', key, value);
  },

  /** Create a quick database backup snapshot */
  backupDatabase: () => ipcRenderer.invoke('backupDatabase'),

  /** Restore database from a backup file */
  restoreDatabase: () => ipcRenderer.invoke('restoreDatabase'),

  /** Backup database to Gmail via nodemailer */
  backupToGmail: (config) => {
    if (!config || typeof config !== 'object') {
      return Promise.reject(new Error('Backup configuration is required'));
    }
    return ipcRenderer.invoke('backupToGmail', config);
  },

  // ═══════════════════════════════════════════════════════
  // AUTHENTICATION & USER MANAGEMENT
  // ═══════════════════════════════════════════════════════

  /** Initialize system with school profile + super admin account */
  authSetup: (data) => {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('Setup data is required'));
    }
    return ipcRenderer.invoke('auth-setup', data);
  },

  /** Login with username + password */
  authLogin: (credentials) => {
    if (!credentials || typeof credentials !== 'object' || !credentials.username || !credentials.password) {
      return Promise.reject(new Error('Username and password are required'));
    }
    return ipcRenderer.invoke('auth-login', credentials);
  },

  /** Add a new user (Super Admin only) */
  addUser: (data) => {
    if (!data || typeof data !== 'object' || !data.username || !data.password) {
      return Promise.reject(new Error('Username and password are required'));
    }
    return ipcRenderer.invoke('addUser', data);
  },

  /** Alias for addUser (some components use this name) */
  authAddUser: (data) => {
    if (!data || typeof data !== 'object' || !data.username || !data.password) {
      return Promise.reject(new Error('Username and password are required'));
    }
    return ipcRenderer.invoke('auth-add-user', data);
  },

  /** Get security question for password recovery */
  authGetSecurityQuestion: (username) => {
    if (typeof username !== 'string' || !username.trim()) {
      return Promise.reject(new Error('Username is required'));
    }
    return ipcRenderer.invoke('auth-get-security-question', username);
  },

  /** Reset password using security question answer */
  authResetPasswordViaQuestion: (data) => {
    if (!data || typeof data !== 'object' || !data.userId || !data.answer || !data.newPassword) {
      return Promise.reject(new Error('User ID, answer, and new password are required'));
    }
    return ipcRenderer.invoke('auth-reset-password-via-question', data);
  },

  // ═══════════════════════════════════════════════════════
  // NETWORK & SYSTEM STATUS
  // ═══════════════════════════════════════════════════════

  /** Get network mode (standalone or client/server) */
  getNetworkMode: () => ipcRenderer.invoke('getNetworkMode'),

  /** Set network mode */
  setNetworkMode: (data) => {
    if (!data || typeof data !== 'object' || !data.mode) {
      return Promise.reject(new Error('Network mode is required'));
    }
    return ipcRenderer.invoke('setNetworkMode', data);
  },

  /** Get Tailscale IP for remote connections */
  getTailscaleIp: () => ipcRenderer.invoke('getTailscaleIp'),

  /** Get power mode (Battery or Plugged In) */
  getPowerMode: () => ipcRenderer.invoke('getPowerMode'),

  // ═══════════════════════════════════════════════════════
  // EMIS — SCHOOL PROFILE & ACADEMIC YEARS
  // ═══════════════════════════════════════════════════════

  /** Get school registration profile */
  emisGetSchoolProfile: () => ipcRenderer.invoke('emisGetSchoolProfile'),

  /** Save school registration profile */
  emisSaveSchoolProfile: (data) => {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('School profile data is required'));
    }
    return ipcRenderer.invoke('emisSaveSchoolProfile', data);
  },

  /** Get all academic years */
  emisGetAcademicYears: () => ipcRenderer.invoke('emisGetAcademicYears'),

  /** Save/create a new academic year */
  emisSaveAcademicYear: (data) => {
    if (!data || typeof data !== 'object' || !data.year_name) {
      return Promise.reject(new Error('Year name is required'));
    }
    return ipcRenderer.invoke('emisSaveAcademicYear', data);
  },

  /** Get dashboard statistics (student counts, staff counts, etc.) */
  emisGetDashboardStats: () => ipcRenderer.invoke('emisGetDashboardStats'),

  // ═══════════════════════════════════════════════════════
  // EMIS — SPECIAL NEEDS & OVC
  // ═══════════════════════════════════════════════════════

  /** Get all special needs learners records */
  emisGetSpecialNeeds: () => ipcRenderer.invoke('emisGetSpecialNeeds'),

  /** Save a special needs learner record */
  emisSaveSpecialNeed: (data) => {
    if (!data || typeof data !== 'object' || !data.student_id || !data.disability_type) {
      return Promise.reject(new Error('Student ID and disability type are required'));
    }
    return ipcRenderer.invoke('emisSaveSpecialNeed', data);
  },

  /** Get all OVC (Orphans & Vulnerable Children) records */
  emisGetOVC: () => ipcRenderer.invoke('emisGetOVC'),

  /** Save an OVC record */
  emisSaveOVC: (data) => {
    if (!data || typeof data !== 'object' || !data.student_id || !data.ovc_category) {
      return Promise.reject(new Error('Student ID and OVC category are required'));
    }
    return ipcRenderer.invoke('emisSaveOVC', data);
  },

  // ═══════════════════════════════════════════════════════
  // EMIS — INFRASTRUCTURE & TEXTBOOKS
  // ═══════════════════════════════════════════════════════

  /** Get infrastructure records for an academic year */
  emisGetInfrastructure: (academicYearId) => {
    if (!academicYearId) {
      return Promise.reject(new Error('Academic year ID is required'));
    }
    return ipcRenderer.invoke('emisGetInfrastructure', academicYearId);
  },

  /** Get textbook inventory for an academic year */
  emisGetTextbooks: (academicYearId) => {
    if (!academicYearId) {
      return Promise.reject(new Error('Academic year ID is required'));
    }
    return ipcRenderer.invoke('emisGetTextbooks', academicYearId);
  },

  /** Save a textbook record */
  emisSaveTextbook: (data) => {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('Textbook data is required'));
    }
    return ipcRenderer.invoke('emisSaveTextbook', data);
  },

  // ═══════════════════════════════════════════════════════
  // PAYMENT SETTINGS & GATEWAYS
  // ═══════════════════════════════════════════════════════

  /** Get all payment gateway settings (MTN, Airtel, Bank) */
  getPaymentSettings: () => ipcRenderer.invoke('getPaymentSettings'),

  /** Save payment gateway settings */
  savePaymentSettings: (settings) => {
    if (!settings || typeof settings !== 'object') {
      return Promise.reject(new Error('Payment settings data is required'));
    }
    return ipcRenderer.invoke('savePaymentSettings', settings);
  },

  /** Get list of configured payment methods */
  getPaymentMethods: () => ipcRenderer.invoke('get-payment-methods'),

  /** Initiate MTN Mobile Money payment */
  initiateMTN: (data) => {
    if (!data || typeof data !== 'object' || !data.phone || !data.amount) {
      return Promise.reject(new Error('Phone number and amount are required for MTN payment'));
    }
    return ipcRenderer.invoke('initiate-mtn', data);
  },

  /** Initiate Airtel Money payment */
  initiateAirtel: (data) => {
    if (!data || typeof data !== 'object' || !data.phone || !data.amount) {
      return Promise.reject(new Error('Phone number and amount are required for Airtel payment'));
    }
    return ipcRenderer.invoke('initiate-airtel', data);
  },

  /** Create a bank payment reference (manual deposit) */
  createBankPayment: (data) => {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('Bank payment data is required'));
    }
    return ipcRenderer.invoke('create-bank-payment', data);
  },

  /** Confirm a bank payment (mark as received) */
  confirmBankPayment: (reference) => {
    if (!reference) {
      return Promise.reject(new Error('Payment reference is required'));
    }
    return ipcRenderer.invoke('confirm-bank-payment', reference);
  },

  /** Confirm a manual payment (cash, cheque) */
  confirmManualPayment: (reference) => {
    if (!reference) {
      return Promise.reject(new Error('Payment reference is required'));
    }
    return ipcRenderer.invoke('confirmManualPayment', reference);
  },

  /** Check payment status by reference number */
  checkPaymentStatus: (reference) => {
    if (!reference) {
      return Promise.reject(new Error('Payment reference is required'));
    }
    return ipcRenderer.invoke('check-payment-status', reference);
  },

  /** Get all pending payments awaiting confirmation */
  getPendingPayments: () => ipcRenderer.invoke('getPendingPayments'),

  // ═══════════════════════════════════════════════════════
  // UNEB
  // ═══════════════════════════════════════════════════════

  /** Get current UNEB/military grade configuration */
  unebGetConfig: () => ipcRenderer.invoke('unebGetConfig'),

  /** Register pending UNEB candidates with national system */
  unebRegisterCandidates: (examType, yearId) => {
    if (!examType || !yearId) {
      return Promise.reject(new Error('Exam type and year ID are required'));
    }
    return ipcRenderer.invoke('uneb-register-candidates', examType, yearId);
  },

  /** Fetch UNEB exam results from national system */
  unebFetchResults: (examType, yearId) => {
    if (!examType || !yearId) {
      return Promise.reject(new Error('Exam type and year ID are required'));
    }
    return ipcRenderer.invoke('uneb-fetch-results', examType, yearId);
  },

  /** Push school EMIS data to national system */
  unebPushEMIS: (yearId, term) => {
    if (!yearId || !term) {
      return Promise.reject(new Error('Year ID and term are required'));
    }
    return ipcRenderer.invoke('uneb-push-emis', yearId, term);
  },



  // ═══════════════════════════════════════════════════════
  // PAYCODES
  // ═══════════════════════════════════════════════════════

  /** Backfill missing paycodes for all active students */
  backfillPaycodes: () => ipcRenderer.invoke('backfill-paycodes'),

  /** Generate paycodes for specific students */
  generatePaycodes: (count) => ipcRenderer.invoke('generatePaycodes', count),

  // ═══════════════════════════════════════════════════════
  // PHOTO & DOCUMENT UPLOADS
  // ═══════════════════════════════════════════════════════

  /**
   * Save a photo (base64) to the file system.
   * @param {Object} data - { base64, category, id }
   */
  savePhoto: (data) => {
    if (!data || typeof data !== 'object' || !data.base64) {
      return Promise.reject(new Error('Photo base64 data is required'));
    }
    return ipcRenderer.invoke('savePhoto', data);
  },

  /**
   * Get a photo as base64 data URL for display.
   * @param {string} filename - The filename stored in the database
   */
  getPhoto: (filename) => ipcRenderer.invoke('getPhoto', filename),

  /** Delete a photo from the file system */
  deletePhoto: (filename) => ipcRenderer.invoke('deletePhoto', filename),

  /**
   * Save a document (PDF, image, etc.) to the file system and record in DB.
   * @param {Object} data - { base64, originalName, documentType, studentId }
   */
  saveDocument: (data) => {
    if (!data || typeof data !== 'object' || !data.base64 || !data.originalName) {
      return Promise.reject(new Error('Document base64 and original name are required'));
    }
    return ipcRenderer.invoke('saveDocument', data);
  },

  /**
   * Get all documents for a student.
   * @param {number} studentId
   */
  getStudentDocuments: (studentId) => {
    if (!studentId) {
      return Promise.reject(new Error('Student ID is required'));
    }
    return ipcRenderer.invoke('getStudentDocuments', studentId);
  },

  /**
   * Get a document as base64 data URL for download/preview.
   * @param {string} filename
   */
  getDocument: (filename) => ipcRenderer.invoke('getDocument', filename),

  /**
   * Delete a document record and its file.
   * @param {number} docId - The document record ID
   */
  deleteDocument: (docId) => {
    if (!docId) {
      return Promise.reject(new Error('Document ID is required'));
    }
    return ipcRenderer.invoke('deleteDocument', docId);
  },

  // ═══════════════════════════════════════════════════════
  // MEETING MINUTES
  // ═══════════════════════════════════════════════════════

  /** Get all meeting minutes records */
  getMeetings: () => ipcRenderer.invoke('getMeetings'),

  /** Save a meeting minutes record */
  saveMeeting: (data) => {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new Error('Meeting data is required'));
    }
    return ipcRenderer.invoke('saveMeeting', data);
  },

  /** Delete a meeting and all its related records (attendees, actions) */
  deleteMeeting: (id) => {
    if (!id) {
      return Promise.reject(new Error('Meeting ID is required'));
    }
    return ipcRenderer.invoke('deleteMeeting', id);
  },

  // ═══════════════════════════════════════════════════════
  // SIGNATURES
  // ═══════════════════════════════════════════════════════

  /** Save a captured signature image */
  saveSignature: (data) => {
    if (!data || typeof data !== 'object' || !data.person_id || !data.person_type || !data.signature_image) {
      return Promise.reject(new Error('Person ID, type, and signature image are required'));
    }
    return ipcRenderer.invoke('saveSignature', data);
  },

  /** Get a signature for a specific person */
  getSignature: (personId, personType) => {
    if (!personId || !personType) {
      return Promise.reject(new Error('Person ID and type are required'));
    }
    return ipcRenderer.invoke('getSignature', personId, personType);
  },

  /** Get all signatures for a person type (e.g., all staff signatures) */
  getAllSignatures: (personType) => ipcRenderer.invoke('getAllSignatures', personType),

  /** Get signature assignments for a document type (or all if null) */
  getSignatureAssignments: (docType) => ipcRenderer.invoke('getSignatureAssignments', docType),

  /** Assign a signature to a document type at a specific position */
  setSignatureAssignment: (data) => {
    if (!data || typeof data !== 'object' || !data.user_id || !data.doc_type) {
      return Promise.reject(new Error('User ID and document type are required'));
    }
    return ipcRenderer.invoke('setSignatureAssignment', data);
  },

  /** Remove a signature assignment */
  removeSignatureAssignment: (id) => {
    if (!id) {
      return Promise.reject(new Error('Assignment ID is required'));
    }
    return ipcRenderer.invoke('removeSignatureAssignment', id);
  },

  /** Get all signatures ready for document generation (returns image data keyed by position) */
  getDocSignatures: (docType) => {
    if (!docType) {
      return Promise.reject(new Error('Document type is required'));
    }
    return ipcRenderer.invoke('getDocSignatures', docType);
  },

  // ═══════════════════════════════════════════════════════
  // PARENT / GUARDIAN PROFILES
  // ═══════════════════════════════════════════════════════

  /** Get parent profiles for a student (or all if no studentId) */
  getParents: (studentId) => ipcRenderer.invoke('getParents', studentId),

  /** Save a parent/guardian profile */
  saveParent: (data) => {
    if (!data || typeof data !== 'object' || !data.parent_name) {
      return Promise.reject(new Error('Parent name is required'));
    }
    return ipcRenderer.invoke('saveParent', data);
  },

  /** Delete a parent/guardian profile */
  deleteParent: (id) => {
    if (!id) {
      return Promise.reject(new Error('Parent ID is required'));
    }
    return ipcRenderer.invoke('deleteParent', id);
  },

  // ═══════════════════════════════════════════════════════
  // STUDENT TIMELINE
  // ═══════════════════════════════════════════════════════

  /** Get timeline events for a student */
  getStudentTimeline: (studentId) => {
    if (!studentId) {
      return Promise.reject(new Error('Student ID is required'));
    }
    return ipcRenderer.invoke('getStudentTimeline', studentId);
  },

  /** Add a timeline event for a student */
  addTimelineEvent: (data) => {
    if (!data || typeof data !== 'object' || !data.student_id || !data.description) {
      return Promise.reject(new Error('Student ID and description are required'));
    }
    return ipcRenderer.invoke('addTimelineEvent', data);
  },

  // ═══════════════════════════════════════════════════════
  // STUDENT MERGE (deduplication)
  // ═══════════════════════════════════════════════════════

  /**
   * Merge duplicate student records into a primary record.
   * Reassigns all FK references from duplicates to primary, then deletes duplicates.
   * @param {Object} payload - { primaryId, duplicateIds, performedBy }
   */
  mergeStudents: (payload) => {
    if (!payload || typeof payload !== 'object') {
      return Promise.reject(new Error('Invalid payload'));
    }
    const primaryId = payload.primaryId ?? payload.primary;
    const duplicateIds = payload.duplicateIds ?? payload.duplicates;
    if (!primaryId) {
      return Promise.reject(new Error('Primary student ID is required'));
    }
    if (!Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return Promise.reject(new Error('At least one duplicate ID is required'));
    }
    if (duplicateIds.length > 500) {
      return Promise.reject(new Error('Too many duplicates (max 500)'));
    }
    return ipcRenderer.invoke('merge-students', payload);
  },

  // ═══════════════════════════════════════════════════════
  // DOCUMENT TEMPLATES
  // ═══════════════════════════════════════════════════════

  /** Get all document templates */
  getDocTemplates: () => ipcRenderer.invoke('getDocTemplates'),

  /** Save a document template configuration */
  saveDocTemplate: (data) => {
    if (!data || typeof data !== 'object' || !data.template_name) {
      return Promise.reject(new Error('Template name is required'));
    }
    return ipcRenderer.invoke('saveDocTemplate', data);
  },

  // ═══════════════════════════════════════════════════════
  // PAYROLL DEDUCTIONS
  // ═══════════════════════════════════════════════════════

  /** Get all deduction types (NSSF, PAYE, Loan, etc.) */
  getDeductionTypes: () => ipcRenderer.invoke('getDeductionTypes'),

  /** Save or update a deduction type */
  saveDeductionType: (data) => {
    if (!data || typeof data !== 'object' || !data.name) {
      return Promise.reject(new Error('Deduction type name is required'));
    }
    return ipcRenderer.invoke('saveDeductionType', data);
  },

  /** Get individual deductions for a staff member for a specific month/year */
  getStaffDeductions: (staffId, month, year) => {
    if (!staffId || !month || !year) {
      return Promise.reject(new Error('Staff ID, month, and year are required'));
    }
    return ipcRenderer.invoke('getStaffDeductions', staffId, month, year);
  },

  /** Save an individual staff deduction */
  saveStaffDeduction: (data) => {
    if (!data || typeof data !== 'object' || !data.staff_id || !data.deduction_type_id || !data.amount) {
      return Promise.reject(new Error('Staff ID, deduction type, and amount are required'));
    }
    return ipcRenderer.invoke('saveStaffDeduction', data);
  },

  /** Process payroll for all active staff with mandatory + individual deductions */
  processPayrollWithDeductions: (data) => {
    if (!data || typeof data !== 'object' || !data.month || !data.year) {
      return Promise.reject(new Error('Month and year are required'));
    }
    return ipcRenderer.invoke('processPayrollWithDeductions', data);
  },

  // ═══════════════════════════════════════════════════════
  // PURCHASE AUTHORIZATION
  // ═══════════════════════════════════════════════════════

  /** Create a new purchase request */
  createPurchaseRequest: (data) => {
    if (!data || typeof data !== 'object' || !data.item_description) {
      return Promise.reject(new Error('Item description is required'));
    }
    return ipcRenderer.invoke('createPurchaseRequest', data);
  },

  /** Get all purchase requests */
  getPurchaseRequests: () => ipcRenderer.invoke('getPurchaseRequests'),

  /** Approve or reject a purchase request */
  authorizePurchase: (id, status, data) => {
    if (!id || !status) {
      return Promise.reject(new Error('Purchase ID and status are required'));
    }
    return ipcRenderer.invoke('authorizePurchase', id, status, data);
  },
  getCurrentSchoolId: () => ipcRenderer.invoke('getCurrentSchoolId'),
  emisCompileReport: (yearId, term) => ipcRenderer.invoke('emisCompileReport', yearId, term),
  setCurrentSchoolId: (id) => ipcRenderer.invoke('setCurrentSchoolId', id),
  getLicenseTier: () => ipcRenderer.invoke('getLicenseTier'),
});



