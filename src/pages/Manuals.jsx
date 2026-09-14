// FileName: src/pages/Manuals.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: System manuals — user guide and developer documentation

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Manuals() {
  var [tab, setTab] = useState('user');
  var auth = useAuth();
  var user = (auth && auth.user) ? auth.user : null;

  // FIXED: Replace user?.role with explicit null check
  var userRole = (user && user.role) ? user.role : '';
  var userName = (user && user.username) ? user.username : '';
  var isDev = userRole === 'Super Admin' && userName === 'A.S.S';

  var handlePrint = function () {
    window.print();
  };

  return (
    <div className="page-container">
      <h1 className="page-title">📖 System Manuals</h1>

      {/* ─── Print CSS ───────────────────────────────────────── */}
      <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
            `}</style>

      {/* ─── Tabs + Print Button ──────────────────────────────── */}
      <div className="no-print" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', borderBottom: '2px solid #dadce0',
        paddingBottom: '5px', flexWrap: 'wrap', gap: '10px'
      }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={function () { setTab('user'); }}
            style={{
              padding: '8px 16px', border: 'none',
              background: tab === 'user' ? '#1a73e8' : 'transparent',
              color: tab === 'user' ? 'white' : '#5f6368',
              cursor: 'pointer', borderRadius: '4px', fontWeight: 600
            }}
          >
            📗 User Manual
          </button>
          {isDev && (
            <button
              onClick={function () { setTab('dev'); }}
              style={{
                padding: '8px 16px', border: 'none',
                background: tab === 'dev' ? '#1a73e8' : 'transparent',
                color: tab === 'dev' ? 'white' : '#5f6368',
                cursor: 'pointer', borderRadius: '4px', fontWeight: 600
              }}
            >
              📕 Developer Manual
            </button>
          )}
        </div>
        <button
          onClick={handlePrint}
          className="btn btn-secondary"
          style={{ width: 'auto', marginTop: 0 }}
        >
          🖨️ Print Hard Copy
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* USER MANUAL                                           */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'user' ? (
        <div className="card" id="print-area">
          <div className="card-header">📗 Ssewasswa School ERP V10 — User Guide</div>
          <div className="card-body" style={{ lineHeight: '1.6', maxWidth: '800px' }}>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>1. Initial Setup</h4>
            <p>
              Upon launching the app for the first time, you will be prompted to enter your School Name,
              EMIS Number, and set up an Admin account. This initializes the database. Ensure you select
              the correct School Level (Primary/Secondary) as this affects the menu options available.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>2. Student Admissions</h4>
            <p>
              Navigate to <strong>Students &amp; Admissions</strong>. Click the {"Register"} button to add
              a new student. Fill in personal details, upload a passport photo, and specify if they are
              Day or Boarding. The system auto-generates an Admission Number if left blank.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>3. Finance &amp; Fees</h4>
            <p>
              Go to <strong>Fees &amp; Payments</strong>. First, set the Fee Structure for each class and
              term. Then, you can record payments. A printable receipt is generated automatically. You can
              also track outstanding debts in the <strong>Debts &amp; Balances</strong> section.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>4. EMIS &amp; UNEB</h4>
            <p>
              For secondary schools, the EMIS &amp; UNEB section allows you to compile EMIS reports
              (enrollment, infrastructure) and register PLE/UCE/UACE candidates directly with UNEB if you
              have configured your API keys in Settings.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>5. Staff &amp; Payroll</h4>
            <p>
              Under <strong>Staff &amp; HR</strong>, you can add teachers, specify their qualifications
              (required by MoES), and input their Bank/MoMo details. In <strong>Staff Payroll</strong>,
              you can track partial payments and disburse bulk salaries with one click.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>6. System Lock &amp; Activation</h4>
            <p>
              The system operates on a 5-day free trial. After 5 days, it will lock. You must contact
              Ssewasswa Comfort&apos;s Technologies (ssewasswacomfortzone@gmail.com or +256 752 971 118)
              to purchase an activation key specific to your school level.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>7. Security &amp; Auto-Logout</h4>
            <p>
              The system will automatically log out after 1 hour of inactivity to prevent unauthorized
              access. Always log out manually using the button in the top right corner when leaving your
              desk. Passwords must be at least 8 characters and include both letters and numbers.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>8. Data Backup</h4>
            <p>
              Go to <strong>Settings</strong> and click {"Backup Database to Gmail"} to send an encrypted
              copy of your database to your Gmail account. Use a Gmail App Password (not your regular
              password). Google Account → Security → 2-Step Verification → App Passwords.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>9. Document Generation</h4>
            <p>
              Use the <strong>Generate Documents</strong> page to create report cards, official letters,
              certificates, and ID cards. These include your school logo, motto, scripture, and assigned
              signatures. Configure branding in <strong>Settings → School Branding</strong>.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>10. EMIS Compliance</h4>
            <p>
              The system is fully EMIS-compliant with Uganda Ministry of Education standards. Use the
              <strong> KPI Dashboard</strong> to monitor PTR (Pupil-Teacher Ratio), PCR (Pupil-Classroom
              Ratio), dropout rate, and Gender Parity Index. Run <strong>Data Validation</strong> before
              submitting EMIS returns to catch data entry errors.
            </p>

            <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />

            <p style={{ textAlign: 'center', color: '#999', fontSize: '12px' }}>
              &copy; 2024 Ssewasswa Comfort&apos;s Technologies | +256 752 971 118 | +256 789 736 737
            </p>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════ */
        /* DEVELOPER MANUAL                                      */
        /* ═══════════════════════════════════════════════════════ */
        <div className="card" id="print-area">
          <div className="card-header">📕 Developer Manual &amp; Architecture</div>
          <div className="card-body" style={{ lineHeight: '1.6', maxWidth: '800px' }}>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>1. Tech Stack</h4>
            <p>
              <strong>Frontend:</strong> React 18, Vite, React Router v6 (hash router).<br />
              <strong>Backend:</strong> Electron, Node.js.<br />
              <strong>Database:</strong> SQLite (via sql.js) stored locally in AppData as
              &apos;school_v10_isolated.db&apos;.<br />
              <strong>Encryption:</strong> Electron safeStorage for at-rest database encryption.<br />
              <strong>PDF:</strong> jsPDF + custom DocumentEngine.js (SchoolDocument class).
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>2. IPC Communication</h4>
            <p>
              Communication between React and Electron happens via contextBridge. The electronAPI object
              exposes methods like queryDatabase(q, p) which invoke the queryDatabase handler in main.js.
              All generic invoke() access is disabled for security — use explicit methods only.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>3. Database Schema</h4>
            <p>
              The database is initialized in initDatabase() in electron/main.js. EMIS tables are created
              in migrations.js (versioned migration system, currently at v5). The schema includes tables
              for student_enrollment, infrastructure, uneb_candidates, school_finances_emis, etc.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>4. SQL Safety</h4>
            <p>
              sql.js db.exec() does NOT support parameter binding. Only db.prepare() + bind() does.
              All user input MUST use ? placeholders with db.prepare() + bind(). Column names in dynamic
              queries must come from a hardcoded whitelist (never from user input).
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>5. Security Architecture</h4>
            <p>
              Passwords are hashed using bcryptjs (10 rounds). Login queries are parameterized to prevent
              SQL Injection. The app enforces a 5-day trial lockout mechanism. License keys are
              HWID-bound using SHA-256 hash. Database is encrypted at rest using Electron safeStorage.
              Session auto-logout after 1 hour of inactivity.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>6. Payment Integration</h4>
            <p>
              MTN MoMo and Airtel Money integrations are in electron/payments.js. Bank payments are
              manual (reference-based). All API keys are stored in system_settings table and accessed
              via _getConfig() helper which uses parameterized queries.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>7. UNEB Integration</h4>
            <p>
              The UNEB connector is in electron/uneb-connector.js. It handles candidate registration,
              results fetching, and EMIS data pushing. Uses HMAC-SHA256 signature authentication.
              API keys are configured in EMIS Config page.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>8. Building the App</h4>
            <p>
              To compile the desktop executable, run npm run build. This uses electron-builder to package
              the app into an NSIS installer in the release folder. The build uses Vite for the frontend
              bundle and electron-builder for the desktop packaging.
            </p>

            <h4 style={{ color: '#1a73e8', marginTop: '20px' }}>9. Access Control</h4>
            <p>
              Role-based access control is defined in src/config/accessControl.js. SCHOOL_LEVELS defines
              what modules each school level can access (Nursery, Primary, Secondary, etc.). ROLES defines
              what sections each user role can see (Super Admin, Admin, Bursar, Teacher, Staff, Viewer).
            </p>

            <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />

            <p style={{ textAlign: 'center', color: '#999', fontSize: '12px' }}>
              &copy; 2024 Ssewasswa Comfort&apos;s Technologies | +256 752 971 118
            </p>
          </div>
        </div>
      )}
    </div>
  );
}