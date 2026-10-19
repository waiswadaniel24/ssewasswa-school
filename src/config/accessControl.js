// FileName: src/config/accessControl.js
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

// Role hierarchy (higher number = more access)
export const ROLE_HIERARCHY = {
    'Viewer': 1,
    'Staff': 2,
    'Teacher': 3,
    'Bursar': 4,
    'Admin': 5,
    'Super Admin': 6
};

// What each role can do beyond viewing
export const ROLE_PERMISSIONS = {
    'Viewer': ['view'],
    'Staff': ['view', 'own_profile'],
    'Teacher': ['view', 'own_profile', 'attendance', 'marks', 'report_cards', 'timetable'],
    'Bursar': ['view', 'finance', 'debts', 'payments', 'accounting', 'canteen', 'payroll_view'],
    'Admin': ['view', 'add', 'edit', 'delete', 'export', 'configure', 'finance', 'reports'],
    'Super Admin': ['view', 'add', 'edit', 'delete', 'export', 'configure', 'finance', 'reports', 'users', 'settings', 'backup']
};

// School levels and what modules they can access
export const SCHOOL_LEVELS = {
    'Kindergarten': { label: 'Kindergarten Only', modules: ['dashboard', 'students', 'attendance', 'nursery', 'ecd', 'finance', 'settings'], academicLevels: ['Kindergarten'], examTypes: [], showUNEB: false, showEMIS: false, showNursery: true, showSecondary: false, showExtracurricular: false },
    'Nursery': {
        label: 'Nursery Only',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'attendance', 'academics',
            'timetable', 'calendar', 'finance', 'debts', 'canteen', 'nursery',
            'ecd', 'health-nutrition', 'wash', 'infrastructure', 'requirements',
            'reports', 'data-export', 'settings', 'users', 'manuals', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Nursery'],
        examTypes: [],
        showUNEB: false,
        showEMIS: false,
        showNursery: true,
        showSecondary: false,
        showExtracurricular: false
    },
    'Primary': {
        label: 'Primary Only',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'broad-sheet', 'report-cards',
            'promotion', 'id-cards', 'finance', 'payments', 'debts', 'school-finances', 'accounting',
            'canteen', 'library', 'discipline', 'transport', 'requirements',
            'uneb-exams',
            'kpi-dashboard', 'data-validation', 'data-export', 'infrastructure', 'wash',
            'governance', 'health-nutrition', 'special-needs', 'dropouts', 'textbooks',
            'emis-report', 'emis-config', 'reports', 'settings', 'users', 'manuals',
            'generate-docs', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Nursery', 'Primary'],
        examTypes: ['PLE'],
        showUNEB: true,
        showEMIS: true,
        showNursery: false,
        showSecondary: false,
        showExtracurricular: false
    },
    'Nursery_Primary': {
        label: 'Nursery & Primary',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'broad-sheet', 'report-cards',
            'promotion', 'id-cards', 'finance', 'payments', 'debts', 'school-finances', 'accounting',
            'canteen', 'library', 'discipline', 'transport', 'requirements',
            'nursery', 'ecd', 'uneb-exams',
            'kpi-dashboard', 'data-validation', 'data-export',
            'infrastructure', 'wash', 'governance', 'health-nutrition', 'special-needs',
            'dropouts', 'textbooks', 'emis-report', 'emis-config', 'reports',
            'settings', 'users', 'manuals', 'generate-docs', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Nursery', 'Primary'],
        examTypes: ['PLE'],
        showUNEB: true,
        showEMIS: true,
        showNursery: true,
        showSecondary: false,
        showExtracurricular: false
    },
    'Secondary': {
        label: 'Secondary (O-Level/A-Level)',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'broad-sheet', 'report-cards',
            'promotion', 'id-cards', 'finance', 'payments', 'debts', 'school-finances', 'accounting',
            'canteen', 'library', 'discipline', 'transport', 'requirements', 'kpi-dashboard',
            'data-validation', 'data-export', 'infrastructure', 'wash', 'governance',
            'health-nutrition', 'special-needs', 'dropouts', 'textbooks', 'emis-report',
            'emis-config', 'uneb-exams', 'military-grades', 'extracurricular', 'reports',
            'settings', 'users', 'manuals', 'generate-docs', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['O_Level', 'A_Level'],
        examTypes: ['UCE', 'UACE'],
        showUNEB: true,
        showEMIS: true,
        showNursery: false,
        showSecondary: true,
        showExtracurricular: true
    },
    'Primary_Secondary': {
        label: 'Primary & Secondary',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance', 'academics',
            'timetable', 'calendar', 'exams', 'broad-sheet', 'report-cards', 'promotion', 'id-cards',
            'finance', 'payments', 'debts', 'school-finances', 'accounting', 'canteen', 'library',
            'discipline', 'transport', 'nursery', 'ecd', 'kpi-dashboard', 'data-validation',
            'data-export', 'infrastructure', 'wash', 'governance', 'health-nutrition',
            'special-needs', 'dropouts', 'textbooks', 'emis-report', 'emis-config',
            'uneb-exams', 'military-grades', 'extracurricular', 'reports',
            'settings', 'users', 'manuals', 'generate-docs', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Nursery', 'Primary', 'O_Level', 'A_Level'],
        examTypes: ['PLE', 'UCE', 'UACE'],
        showUNEB: true,
        showEMIS: true,
        showNursery: true,
        showSecondary: true,
        showExtracurricular: true
    },
    'Tertiary': {
        label: 'Tertiary/College',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'report-cards', 'id-cards',
            'finance', 'debts', 'payments', 'accounting', 'library', 'discipline',
            'transport', 'requirements', 'kpi-dashboard', 'data-validation', 'data-export',
            'infrastructure', 'wash', 'governance', 'special-needs', 'dropouts',
            'textbooks', 'reports', 'settings', 'users', 'manuals', 'generate-docs', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Certificate', 'Diploma', 'Degree'],
        examTypes: ['UBTEB'],
        showUNEB: false,
        showEMIS: false,
        showNursery: false,
        showSecondary: false,
        showExtracurricular: false
    },
    'University': {
        label: 'University',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'report-cards', 'id-cards',
            'finance', 'debts', 'payments', 'accounting', 'library', 'discipline',
            'transport', 'requirements', 'kpi-dashboard', 'data-validation', 'data-export',
            'infrastructure', 'wash', 'governance', 'special-needs', 'reports',
            'settings', 'users', 'manuals', 'generate-docs', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Undergraduate', 'Postgraduate'],
        examTypes: ['NCHE'],
        showUNEB: false,
        showEMIS: false,
        showNursery: false,
        showSecondary: false,
        showExtracurricular: false
    },
    'Technical': {
        label: 'Technical/Vocational Institute',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'broad-sheet', 'report-cards',
            'promotion', 'id-cards', 'finance', 'debts', 'school-finances', 'accounting',
            'canteen', 'library', 'discipline', 'transport', 'requirements',
            'kpi-dashboard', 'data-validation', 'data-export', 'infrastructure', 'wash',
            'governance', 'health-nutrition', 'special-needs', 'dropouts', 'textbooks',
            'reports', 'settings', 'users', 'manuals', 'generate-docs', 'about',
            'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Technical', 'Vocational', 'Certificate', 'Diploma'],
        examTypes: ['UBTEB'],
        showUNEB: false,
        showEMIS: true,
        showNursery: false,
        showSecondary: false,
        showExtracurricular: true
    },
    'Health': {
        label: 'Health Training Institute',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'broad-sheet', 'report-cards',
            'promotion', 'id-cards', 'finance', 'debts', 'school-finances', 'accounting',
            'canteen', 'library', 'discipline', 'transport', 'requirements',
            'health-nutrition', 'wash', 'infrastructure', 'special-needs',
            'kpi-dashboard', 'data-validation', 'data-export',
            'governance', 'dropouts', 'textbooks',
            'reports', 'settings', 'users', 'manuals', 'generate-docs', 'about',
            'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Certificate', 'Diploma', 'Advanced Diploma'],
        examTypes: ['Nurses Council', 'AHPC'],
        showUNEB: false,
        showEMIS: true,
        showNursery: false,
        showSecondary: false,
        showExtracurricular: false
    },
    'Business': {
        label: 'Business/Commerce Institute',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'broad-sheet', 'report-cards',
            'promotion', 'id-cards', 'finance', 'debts', 'school-finances', 'accounting',
            'canteen', 'library', 'discipline', 'transport', 'requirements',
            'kpi-dashboard', 'data-validation', 'data-export', 'infrastructure', 'wash',
            'governance', 'health-nutrition', 'special-needs', 'dropouts', 'textbooks',
            'emis-report', 'emis-config', 'reports', 'settings', 'users', 'manuals',
            'generate-docs', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Certificate', 'Diploma', 'Bachelor', 'MBA'],
        examTypes: ['UBTEB'],
        showUNEB: false,
        showEMIS: true,
        showNursery: false,
        showSecondary: false,
        showExtracurricular: false
    },
    'Arts': {
        label: 'Arts & Humanities Institute',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'broad-sheet', 'report-cards',
            'promotion', 'id-cards', 'finance', 'debts', 'school-finances', 'accounting',
            'canteen', 'library', 'discipline', 'transport', 'requirements',
            'kpi-dashboard', 'data-validation', 'data-export', 'infrastructure', 'wash',
            'governance', 'health-nutrition', 'special-needs', 'dropouts', 'textbooks',
            'emis-report', 'emis-config', 'reports', 'settings', 'users', 'manuals',
            'generate-docs', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Certificate', 'Diploma', 'Bachelor', 'Masters'],
        examTypes: ['UNEB', 'NCHE'],
        showUNEB: false,
        showEMIS: true,
        showNursery: false,
        showSecondary: false,
        showExtracurricular: true
    },
    'Sciences': {
        label: 'Sciences & Technology Institute',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'broad-sheet', 'report-cards',
            'promotion', 'id-cards', 'finance', 'debts', 'school-finances', 'accounting',
            'canteen', 'library', 'discipline', 'transport', 'requirements',
            'kpi-dashboard', 'data-validation', 'data-export', 'infrastructure', 'wash',
            'governance', 'health-nutrition', 'special-needs', 'dropouts', 'textbooks',
            'emis-report', 'emis-config', 'reports', 'settings', 'users', 'manuals',
            'generate-docs', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Certificate', 'Diploma', 'Bachelor', 'Masters', 'PhD'],
        examTypes: ['NCHE'],
        showUNEB: false,
        showEMIS: true,
        showNursery: false,
        showSecondary: false,
        showExtracurricular: true
    },
    'Theological': {
        label: 'Theological Seminary',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'broad-sheet', 'report-cards',
            'promotion', 'id-cards', 'finance', 'debts', 'school-finances', 'accounting',
            'canteen', 'library', 'discipline', 'transport', 'requirements',
            'governance', 'health-nutrition', 'special-needs', 'dropouts',
            'data-export', 'reports', 'settings', 'users', 'manuals',
            'generate-docs', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Certificate', 'Diploma', 'Bachelor', 'Masters'],
        examTypes: ['NCHE'],
        showUNEB: false,
        showEMIS: false,
        showNursery: false,
        showSecondary: false,
        showExtracurricular: false
    },
    'Vocational': {
        label: 'Vocational Training Centre',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'report-cards',
            'id-cards', 'finance', 'debts', 'accounting',
            'canteen', 'library', 'transport', 'requirements',
            'data-export', 'infrastructure', 'wash', 'health-nutrition',
            'settings', 'users', 'manuals', 'generate-docs', 'about',
            'signatures', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Certificate', 'Trade', 'Apprenticeship'],
        examTypes: ['Vocational'],
        showUNEB: false,
        showEMIS: true,
        showNursery: false,
        showSecondary: false,
        showExtracurricular: true
    },
    'TeacherTraining': {
        label: 'Teacher Training College (PTC/NTC)',
        modules: [
            'dashboard', 'students', 'student/:id', 'staff', 'payroll', 'attendance',
            'academics', 'timetable', 'calendar', 'exams', 'broad-sheet', 'report-cards',
            'promotion', 'id-cards', 'finance', 'debts', 'school-finances', 'accounting',
            'canteen', 'library', 'discipline', 'transport', 'requirements',
            'kpi-dashboard', 'data-validation', 'data-export', 'infrastructure', 'wash',
            'governance', 'health-nutrition', 'special-needs', 'dropouts', 'textbooks',
            'emis-report', 'emis-config', 'reports', 'settings', 'users', 'manuals',
            'generate-docs', 'about', 'signatures', 'deductions', 'purchases', 'meeting-minutes'
        ],
        academicLevels: ['Certificate', 'Diploma', 'Degree'],
        examTypes: ['Kyambogo', 'PTC'],
        showUNEB: false,
        showEMIS: true,
        showNursery: false,
        showSecondary: false,
        showExtracurricular: false
    }
};

// All menu items with their required permissions and applicable levels
export const MENU_ITEMS = [
    // DASHBOARD
    { path: '/', name: 'Dashboard', icon: '📊', section: 'Main', roles: ['Super Admin', 'Admin', 'Teacher', 'Staff', 'Bursar', 'Viewer'], levels: 'all' },
    { path: 'military-grades', name: 'Military Grades', icon: '🎖️', section: 'uneb', unebOnly: true },
    { path: 'copyright', name: 'Copyright & Licensing', icon: '©️', section: 'admin' },
    { path: 'terms', name: 'Terms & Conditions', icon: '📜', section: 'admin' },
    // STUDENT MANAGEMENT
    { path: '/students', name: 'Students & Admissions', icon: '🎓', section: 'Student Management', roles: ['Super Admin', 'Admin', 'Teacher', 'Staff'], levels: 'all' },
    { path: '/student/:id', name: 'Student Profile', icon: '👤', section: 'Student Management', roles: ['Super Admin', 'Admin', 'Teacher', 'Staff'], levels: 'all', hidden: true },
    { path: '/student-history', name: 'Student History', icon: '🗂️', section: 'Student Management', roles: ['Super Admin', 'Admin', 'Teacher', 'Staff'], levels: 'all' },
    { path: '/requirements', name: 'Requirements', icon: '📋', section: 'Student Management', roles: ['Super Admin', 'Admin', 'Teacher', 'Staff'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },

    // STAFF MANAGEMENT
    { path: '/staff', name: 'Staff & HR', icon: '👨‍🏫', section: 'Staff Management', roles: ['Super Admin', 'Admin'], levels: 'all' },
    { path: '/payroll', name: 'Staff Payroll', icon: '💰', section: 'Staff Management', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary', 'Tertiary', 'University'] },

    // ACADEMICS
    { path: '/academics', name: 'Academics Config', icon: '📚', section: 'Academics', roles: ['Super Admin', 'Admin', 'Teacher'], levels: 'all' },
    { path: '/attendance', name: 'Attendance', icon: '✅', section: 'Academics', roles: ['Super Admin', 'Admin', 'Teacher'], levels: 'all' },
    { path: '/timetable', name: 'Timetable', icon: '📅', section: 'Academics', roles: ['Super Admin', 'Admin', 'Teacher'], levels: 'all' },
    { path: '/calendar', name: 'Academic Calendar', icon: '📆', section: 'Academics', roles: ['Super Admin', 'Admin', 'Teacher', 'Staff'], levels: 'all' },
    { path: '/discipline', name: 'Discipline', icon: '⚠️', section: 'Academics', roles: ['Super Admin', 'Admin', 'Teacher'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },

    // EXAMS - Level specific
    { path: '/exams', name: 'Exams & Marks', icon: '📝', section: 'Examinations', roles: ['Super Admin', 'Admin', 'Teacher'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary', 'Tertiary', 'University'] },
    { path: '/broad-sheet', name: 'Broad Sheet', icon: '📊', section: 'Examinations', roles: ['Super Admin', 'Admin', 'Teacher'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/report-cards', name: 'Report Cards', icon: '📄', section: 'Examinations', roles: ['Super Admin', 'Admin', 'Teacher'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary', 'Tertiary', 'University'] },
    { path: '/promotion', name: 'Promotion & TC', icon: '⬆️', section: 'Examinations', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/id-cards', name: 'ID Cards', icon: '🪪', section: 'Examinations', roles: ['Super Admin', 'Admin', 'Staff'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary', 'Tertiary', 'University'] },

    // UNEB - Only for Ugandan curriculum levels
    { path: '/uneb-exams', name: 'UNEB Registration', icon: '🏛️', section: 'UNEB & Exams', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'], unebOnly: true },

    // ─── OTHER EXAM BOARDS (6 total — UNEB + 5 more) ───────────
    // Each exam board has its own registration page.
    // Visible to Super Admin + Admin + Developer (full access).
    // Levels filter which school types see which board.
    { path: '/ubteb-exams', name: 'UBTEB Registration', icon: '🏢', section: 'UNEB & Exams', roles: ['Super Admin', 'Admin'], levels: ['Business', 'Technical', 'Vocational', 'Tertiary'] },
    { path: '/nche-accreditation', name: 'NCHE Accreditation', icon: '🎓', section: 'UNEB & Exams', roles: ['Super Admin', 'Admin'], levels: ['University', 'Tertiary', 'Business', 'Arts', 'Sciences', 'Theological'] },
    { path: '/nurses-council-exams', name: 'Nurses Council Exams', icon: '🏥', section: 'UNEB & Exams', roles: ['Super Admin', 'Admin'], levels: ['Health'] },
    { path: '/ahpc-exams', name: 'AHPC Exams', icon: '💊', section: 'UNEB & Exams', roles: ['Super Admin', 'Admin'], levels: ['Health'] },
    { path: '/kyambogo-teacher-ed', name: 'Kyambogo Teacher Ed.', icon: '👨‍🏫', section: 'UNEB & Exams', roles: ['Super Admin', 'Admin'], levels: ['TeacherTraining', 'University'] },

    // FINANCE
    { path: '/finance', name: 'Fees & Payments', icon: '💵', section: 'Finance', roles: ['Super Admin', 'Admin', 'Bursar'], levels: 'all' },
    { path: '/payments', name: 'Mobile Money & Bank', icon: '📱', section: 'Finance', roles: ['Super Admin', 'Admin', 'Bursar'], levels: 'all' },
    { path: '/debts', name: 'Debts & Balances', icon: '📉', section: 'Finance', roles: ['Super Admin', 'Admin', 'Bursar'], levels: 'all' },
    { path: '/school-finances', name: 'School Finances (EMIS)', icon: '🏦', section: 'Finance', roles: ['Super Admin', 'Admin', 'Bursar'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/accounting', name: 'Accounting (P&L)', icon: '📊', section: 'Finance', roles: ['Super Admin', 'Admin', 'Bursar'], levels: 'all' },
    { path: '/deductions', name: 'Payroll Deductions', icon: '📉', section: 'Finance', roles: ['Super Admin', 'Admin', 'Bursar'], levels: 'all' },
    { path: '/canteen', name: 'Canteen (Tuck Shop)', icon: '🏪', section: 'Finance', roles: ['Super Admin', 'Admin', 'Bursar', 'Staff'], levels: 'all' },

    // OTHER SERVICES
    { path: '/library', name: 'Library', icon: '📖', section: 'Services', roles: ['Super Admin', 'Admin', 'Staff'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary', 'Tertiary', 'University'] },
    { path: '/transport', name: 'Transport', icon: '🚌', section: 'Services', roles: ['Super Admin', 'Admin'], levels: 'all' },
    { path: '/gatebook', name: 'Gate Book', icon: '📋', section: 'Services', roles: ['Super Admin', 'Admin', 'Staff'], levels: 'all' },
    { path: '/broadcast', name: 'Mass Broadcast', icon: '📢', section: 'Services', roles: ['Super Admin', 'Admin'], levels: 'all' },
    { path: '/extracurricular', name: 'Extracurricular', icon: '⚽', section: 'Services', roles: ['Super Admin', 'Admin'], levels: ['Secondary', 'Primary_Secondary'] },
    { path: '/signatures', name: 'Signature Management', icon: '✍️', section: 'Services', roles: ['Super Admin', 'Admin', 'Teacher', 'Bursar'], levels: 'all' },
    { path: '/purchases', name: 'Purchase Authorization', icon: '🛒', section: 'Services', roles: ['Super Admin', 'Admin', 'Bursar'], levels: 'all' },

    // NURSERY/ECD - Only for Nursery levels
    { path: '/nursery', name: 'Nursery Management', icon: '🧒', section: 'Early Childhood', roles: ['Super Admin', 'Admin', 'Teacher', 'Staff'], levels: ['Nursery', 'Nursery_Primary', 'Primary', 'Primary_Secondary'] },
    { path: '/ecd', name: 'ECD Center', icon: '👶', section: 'Early Childhood', roles: ['Super Admin', 'Admin'], levels: ['Nursery', 'Nursery_Primary', 'Primary', 'Primary_Secondary'] },

    // EMIS COMPLIANCE
    { path: '/kpi-dashboard', name: 'KPI Dashboard', icon: '📈', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/data-validation', name: 'Data Validation', icon: '✅', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/data-export', name: 'Data Export', icon: '📤', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/infrastructure', name: 'Infrastructure', icon: '🏗️', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/wash', name: 'WASH & Sanitation', icon: '🚰', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/governance', name: 'Governance (SMC/BOG)', icon: '🏛️', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/health-nutrition', name: 'Health & Nutrition', icon: '🍎', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/special-needs', name: 'Special Needs & OVC', icon: '♿', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/dropouts', name: 'Dropout Tracking', icon: '📉', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/textbooks', name: 'Textbooks', icon: '📚', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/emis-report', name: 'EMIS Report', icon: '📊', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/emis-config', name: 'EMIS Setup & Sync', icon: '⚙️', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },
    { path: '/enrollment', name: 'Enrollment (EMIS)', icon: '📝', section: 'EMIS Compliance', roles: ['Super Admin', 'Admin'], levels: ['Primary', 'Nursery_Primary', 'Secondary', 'Primary_Secondary'] },

    // ADMINISTRATION
    { path: '/users', name: 'User Management', icon: '👥', section: 'Administration', roles: ['Super Admin'], levels: 'all' },
    { path: '/manuals', name: 'System Manuals', icon: '📖', section: 'Administration', roles: ['Super Admin', 'Admin', 'Teacher', 'Staff', 'Bursar', 'Viewer'], levels: 'all' },
    { path: '/generate-docs', name: 'Print Word Documents', icon: '🖨️', section: 'Administration', roles: ['Super Admin'], levels: 'all' },
    { path: '/settings', name: 'System Settings', icon: '⚙️', section: 'Administration', roles: ['Super Admin', 'Admin'], levels: 'all' },
    { path: '/meeting-minutes', name: 'Meeting Minutes', icon: '📝', section: 'Administration', roles: ['Super Admin', 'Admin', 'Staff'], levels: 'all' },
    { path: '/about', name: 'About', icon: 'ℹ️', section: 'Administration', roles: ['Super Admin', 'Admin', 'Teacher', 'Staff', 'Bursar', 'Viewer'], levels: 'all' },

    // ─── MORE FEATURES (ported from legacy platform) ───────
    // One-stop hub showing all 70 features (15 fully implemented + 55 coming soon).
    // Visible to all logged-in users — provides catalog of upcoming + ready features.
    { path: '/more', name: 'More Features', icon: '🧰', section: 'More', roles: ['Super Admin', 'Admin', 'Teacher', 'Staff', 'Bursar', 'Viewer', 'Developer'], levels: 'all' }
];

/**
 * Check if a user can access a module
 * @param {string} userRole
 * @param {string} schoolLevel
 * @param {string} modulePath  e.g. '/app/students' or '/students' or 'students'
 * @returns {boolean}
 */
export function canAccess(userRole, schoolLevel, modulePath) {
    // Normalize: strip the '/app' or '/hmis' prefix so paths like
    // '/app/students' become '/students' to match MENU_ITEMS paths.
    let normalized = String(modulePath || '');
    // Strip leading '/app' or '/hmis' (router base paths for School ERP / HMIS)
    normalized = normalized.replace(/^\/(app|hmis)(?=\/|$)/, '');
    // Now `normalized` looks like '/students', '/', 'students', etc.

    // ─── SPECIAL CASE: /more/* paths ────────────────────────────
    // All routes under /app/more/* (Business, Church, Org, Individual,
    // Parent, Student portals + 19 implemented features + 51 coming-soon
    // features) should be accessible to ANY authenticated user.
    // Without this, canAccess tries to match '/more/business-portal' against
    // MENU_ITEMS — which only has '/more' (no child paths) → returns false
    // → ProtectedRoute redirects to / → user can't access any portal/feature.
    if (normalized === '/more' || normalized.startsWith('/more/')) {
        return true;
    }

    const menuItem = MENU_ITEMS.find(item => {
        const itemPath = item.path.replace(/:\w+$/, ':id');
        return itemPath === normalized || item.path === normalized;
    });

    if (!menuItem) return false;
    if (!menuItem.roles.includes(userRole)) return false;
    if (menuItem.levels === 'all') return true;

    const levelConfig = SCHOOL_LEVELS[schoolLevel];
    if (!levelConfig) return false;

    if (menuItem.unebOnly && !levelConfig.showUNEB) return false;

    const cleanPath = normalized.replace(/:\w+$/, ':id').replace(/^\//, '');
    return levelConfig.modules.includes(cleanPath);
}

/**
 * Get filtered menu for sidebar
 * @param {string} userRole 
 * @param {string} schoolLevel 
 * @param {string} searchQuery 
 * @returns {Object} Grouped menu items
 */
export function getFilteredMenu(userRole, schoolLevel, searchQuery = '') {
    const levelConfig = SCHOOL_LEVELS[schoolLevel] || SCHOOL_LEVELS['Primary'];

    return MENU_ITEMS
        .filter(item => {
            if (item.hidden) return false;
            if (!item.roles.includes(userRole)) return false;
            if (item.levels === 'all') {
                // Include globally allowed items, but respect UNEB filter
                if (item.unebOnly && !levelConfig.showUNEB) return false;
                return true;
            }

            if (item.unebOnly && !levelConfig.showUNEB) return false;

            const cleanPath = item.path.replace(/:\w+$/, ':id').replace(/^\//, '');
            if (!levelConfig.modules.includes(cleanPath)) return false;

            if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            return true;
        })
        .reduce((groups, item) => {
            const section = item.section || 'Other';
            if (!groups[section]) groups[section] = [];
            groups[section].push(item);
            return groups;
        }, {});
}

export function getAcademicLevels(schoolLevel) {
    return SCHOOL_LEVELS[schoolLevel]?.academicLevels || [];
}

export function getExamTypes(schoolLevel) {
    return SCHOOL_LEVELS[schoolLevel]?.examTypes || [];
}

export function getSchoolLevelLabel(schoolLevel) {
    return SCHOOL_LEVELS[schoolLevel]?.label || schoolLevel;
}
// Dynamic Terminology Helper
export function getTerminology(schoolLevel) {
    const isPrimaryLevel = ['Kindergarten', 'Nursery', 'Primary', 'Nursery_Primary'].includes(schoolLevel);
    return {
        student: isPrimaryLevel ? 'Pupil' : 'Student',
        students: isPrimaryLevel ? 'Pupils' : 'Students',
        admission: isPrimaryLevel ? 'Pupil Admissions' : 'Student Admissions'
    };
}
