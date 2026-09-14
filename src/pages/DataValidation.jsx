// FileName: src/pages/DataValidation.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useCallback, useRef } from 'react';

function calculateAge(dobStr) {
  if (!dobStr || typeof dobStr !== 'string') return null;
  try {
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    return Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  } catch (e) {
    return null;
  }
}

export default function DataValidation() {
  // ─── State variables ──────────────────────────────────────
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [activeCheck, setActiveCheck] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Run all validation checks ────────────────────────────
  const runValidation = useCallback(async () => {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) return;

    setLoading(true);
    setMsg('⏳ Running validation checks...');
    setResults(null);
    setActiveCheck(null);

    try {
      const checks = { /* no-op */ };

      // ─── Load students ─────────────────────────────────
      let students = [];
      try {
        const sRes = await window.electronAPI.queryDatabase(
          "SELECT id, first_name, last_name, other_name, gender, date_of_birth, admission_number, nin, class_id, status FROM students"
        );
        if (sRes && sRes.success && Array.isArray(sRes.data)) {
          students = sRes.data;
        }
      } catch (e) { /* ignore student load error */ }

      // ─── Load staff ──────────────────────────────────────
      let staff = [];
      try {
        const stRes = await window.electronAPI.queryDatabase(
          "SELECT id, first_name, last_name, role, phone, tsc_number, status FROM staff"
        );
        if (stRes && stRes.success && Array.isArray(stRes.data)) {
          staff = stRes.data;
        }
      } catch (e) { /* ignore staff load error */ }

      // ─── Load marks (for orphan check) ───────────────────
      let marks = [];
      try {
        const mRes = await window.electronAPI.queryDatabase(
          "SELECT id, student_id FROM marks"
        );
        if (mRes && mRes.success && Array.isArray(mRes.data)) {
          marks = mRes.data;
        }
      } catch (e) { /* ignore marks load error */ }

      if (!mountedRef.current) return;

      // ═══ CHECK 1: Missing student names ════════════════
      checks.missingName = students.filter(s => !s || !s.first_name || !s.first_name.trim() || !s.last_name || !s.last_name.trim());

      // ═══ CHECK 2: Missing gender ════════════════════════
      checks.missingGender = students.filter(s => !s || !s.gender || (s.gender !== 'M' && s.gender !== 'F'));

      // ═══ CHECK 3: Missing DOB ═══════════════════════════
      checks.missingDOB = students.filter(s => !s || !s.date_of_birth || s.date_of_birth.trim() === '');

      // ═══ CHECK 4: Implausible ages ═════════════════════
      checks.implausibleAge = students.filter(s => {
        if (!s || !s.date_of_birth) return false;
        const age = calculateAge(s.date_of_birth);
        return age !== null && (age < 3 || age > 25);
      }).map(s => {
        const age = calculateAge(s.date_of_birth);
        return { ...s, calculated_age: age };
      });

      // ═══ CHECK 5: Duplicate admission numbers ═══════════
      const admMap = { /* no-op */ };
      students.forEach(s => {
        if (!s || !s.admission_number || s.admission_number.trim() === '') return;
        const key = s.admission_number.trim();
        if (!admMap[key]) admMap[key] = [];
        admMap[key].push(s);
      });
      checks.duplicateAdmission = [];
      // FIXED: Replaced for...in with Object.values to avoid Object.prototype access
      Object.values(admMap).forEach(group => {
        if (group.length > 1) {
          checks.duplicateAdmission = checks.duplicateAdmission.concat(group);
        }
      });

      // ═══ CHECK 6: Duplicate NIN ═════════════════════════
      const ninMap = { /* no-op */ };
      students.forEach(s => {
        if (!s || !s.nin || s.nin.trim() === '') return;
        const nKey = s.nin.trim();
        if (!ninMap[nKey]) ninMap[nKey] = [];
        ninMap[nKey].push(s);
      });
      checks.duplicateNIN = [];
      // FIXED: Replaced for...in with Object.values to avoid Object.prototype access
      Object.values(ninMap).forEach(group => {
        if (group.length > 1) {
          checks.duplicateNIN = checks.duplicateNIN.concat(group);
        }
      });

      // ═══ CHECK 7: Active students without class ═══════════
      checks.noClass = students.filter(s => s && s.status === 'Active' && (!s.class_id || s.class_id === null));

      // ═══ CHECK 8: Staff with missing role ═══════════════
      checks.staffMissingRole = staff.filter(s => !s || !s.role || s.role.trim() === '');

      // ═══ CHECK 9: Staff with missing phone ═══════════════
      checks.staffMissingPhone = staff.filter(s => s && s.status === 'Active' && (!s.phone || s.phone.trim() === ''));

      // ═══ CHECK 10: Duplicate staff TSC numbers ══════════
      const tscMap = { /* no-op */ };
      staff.forEach(s => {
        if (!s || !s.tsc_number || s.tsc_number.trim() === '') return;
        const tKey = s.tsc_number.trim();
        if (!tscMap[tKey]) tscMap[tKey] = [];
        tscMap[tKey].push(s);
      });
      checks.duplicateTSC = [];
      // FIXED: Replaced for...in with Object.values to avoid Object.prototype access
      Object.values(tscMap).forEach(group => {
        if (group.length > 1) {
          checks.duplicateTSC = checks.duplicateTSC.concat(group);
        }
      });

      // ═══ CHECK 11: Orphaned marks (student_id not in students) ═══
      const studentIds = new Set(students.map(s => s ? String(s.id) : ''));
      checks.orphanedMarks = marks.filter(m => {
        if (!m || !m.student_id) return true;
        return !studentIds.has(String(m.student_id));
      });

      if (!mountedRef.current) return;

      // Calculate overall health
      let totalIssues = 0;
      const checkKeys = Object.keys(checks);
      checkKeys.forEach(k => {
        if (checks[k] && Array.isArray(checks[k])) {
          totalIssues += checks[k].length;
        }
      });

      setResults({
        checks: checks,
        totalStudents: students.length,
        totalStaff: staff.length,
        totalMarks: marks.length,
        totalIssues: totalIssues,
        passedCount: checkKeys.filter(k => checks[k] && checks[k].length === 0).length,
        failedCount: checkKeys.filter(k => checks[k] && checks[k].length > 0).length
      });

      if (totalIssues === 0) {
        setMsg('✅ All validation checks passed! Data is clean.');
      } else {
        const failedCount = checkKeys.filter(k => checks[k].length > 0).length;
        setMsg(`⚠️ Found ${totalIssues} issue(s) across ${failedCount} check(s).`);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('DataValidation: error:', errMsg);
      setMsg('❌ Validation error: ' + errMsg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    runValidation();
  }, [runValidation]);

  // ─── Check definitions ────────────────────────────────────
  const checkDefs = [
    { key: 'missingName', label: 'Missing Student Name', icon: '👤', severity: 'high' },
    { key: 'missingGender', label: 'Missing/Invalid Gender', icon: '⚧', severity: 'high' },
    { key: 'missingDOB', label: 'Missing Date of Birth', icon: '📅', severity: 'medium' },
    { key: 'implausibleAge', label: 'Implausible Age (<3 or >25)', icon: '🔢', severity: 'medium' },
    { key: 'duplicateAdmission', label: 'Duplicate Admission No.', icon: '📋', severity: 'high' },
    { key: 'duplicateNIN', label: 'Duplicate NIN', icon: '🪪', severity: 'high' },
    { key: 'noClass', label: 'Active Student Without Class', icon: '🏫', severity: 'high' },
    { key: 'staffMissingRole', label: 'Staff Without Role', icon: '👨‍🏫', severity: 'medium' },
    { key: 'staffMissingPhone', label: 'Active Staff Without Phone', icon: '📞', severity: 'low' },
    { key: 'duplicateTSC', label: 'Duplicate TSC Number', icon: '📋', severity: 'high' },
    { key: 'orphanedMarks', label: 'Orphaned Marks Records', icon: '🔗', severity: 'medium' }
  ];

  const severityColors = {
    high: '#d32f2f',
    medium: '#e65100',
    low: '#f9ab00'
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading && !results) {
    return (
      <div className="page-container">
        <h1 className="page-title">✅ Data Validation</h1>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{
              width: '40px', height: '40px',
              border: '4px solid #e0e0e0',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#666' }}>Running validation checks...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">✅ Data Validation</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px',
          marginBottom: '20px', fontSize: '14px',
          background: (msg.indexOf('❌') >= 0) ? '#ffebee' :
            (msg.indexOf('⚠️') >= 0) ? '#fff3e0' : '#e8f5e9',
          color: (msg.indexOf('❌') >= 0) ? '#c62828' :
            (msg.indexOf('⚠️') >= 0) ? '#e65100' : '#0d904f',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {msg}
        </div>
      )}

      {/* ─── Summary Cards ─────────────────────────────────── */}
      {results && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px', marginBottom: '20px'
        }}>
          <div style={{ background: '#e8f0fe', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{results.totalStudents}</div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>Students Checked</div>
          </div>
          <div style={{ background: '#e8f0fe', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{results.totalStaff}</div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>Staff Checked</div>
          </div>
          <div style={{ background: results.totalIssues === 0 ? '#e8f5e9' : '#ffebee', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: results.totalIssues === 0 ? '#0d904f' : '#d32f2f' }}>
              {results.totalIssues}
            </div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Issues</div>
          </div>
          <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d904f' }}>{results.passedCount}</div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>Checks Passed ✅</div>
          </div>
          {results.failedCount > 0 && (
            <div style={{ background: '#ffebee', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d32f2f' }}>{results.failedCount}</div>
              <div style={{ fontSize: '11px', color: '#5f6368' }}>Checks Failed ❌</div>
            </div>
          )}
        </div>
      )}

      {/* ─── Re-run Button ──────────────────────────────────── */}
      <button onClick={runValidation} className="btn btn-primary" style={{ marginBottom: '20px' }} disabled={loading}>
        {loading ? '⏳ Running...' : '🔄 Re-run Validation'}
      </button>

      {/* ─── Check Results Grid ────────────────────────────── */}
      {results && results.checks && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {checkDefs.map(def => {
            const checkResults = results.checks[def.key] || [];
            const count = checkResults.length;
            const passed = count === 0;
            const sev = severityColors[def.severity] || '#5f6368';

            return (
              <div
                key={def.key}
                onClick={() => setActiveCheck(passed ? null : def.key)}
                style={{
                  background: passed ? '#e8f5e9' : '#ffebee',
                  border: '1px solid ' + (passed ? '#a5d6a7' : '#ef9a9a'),
                  borderRadius: '8px', padding: '15px',
                  cursor: passed ? 'default' : 'pointer',
                  borderLeft: '4px solid ' + (passed ? '#0d904f' : sev)
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: passed ? '#0d904f' : sev }}>
                    {def.icon} {def.label}
                  </span>
                  <span style={{
                    fontSize: '16px', fontWeight: 'bold',
                    color: passed ? '#0d904f' : sev
                  }}>
                    {count}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {passed ? '✅ No issues found' : '⚠️ Click to view details'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Active Check Details ───────────────────────────── */}
      {activeCheck && results && results.checks && results.checks[activeCheck] && results.checks[activeCheck].length > 0 && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              📋 {checkDefs.find(d => d.key === activeCheck) ? checkDefs.find(d => d.key === activeCheck).label : activeCheck}
              {' (' + results.checks[activeCheck].length + ' records)'}
            </span>
            <button onClick={() => setActiveCheck(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#666' }}>
              × Close
            </button>
          </div>
          <div className="card-body" style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {results.checks[activeCheck].map((r, i) => {
                  const id = (r && r.id) ? r.id : i;
                  let name = ((r && r.first_name) ? r.first_name : '') + ' ' + ((r && r.last_name) ? r.last_name : '');
                  name = name.trim() || '-';

                  let details = '-';
                  if (activeCheck === 'missingName') {
                    details = `First: "${(r && r.first_name) ? r.first_name : ''}" | Last: "${(r && r.last_name) ? r.last_name : ''}"`;
                  } else if (activeCheck === 'missingGender') {
                    details = 'Gender: ' + ((r && r.gender) ? r.gender : 'MISSING');
                  } else if (activeCheck === 'missingDOB') {
                    details = 'DOB: ' + ((r && r.date_of_birth) ? r.date_of_birth : 'MISSING');
                  } else if (activeCheck === 'implausibleAge') {
                    details = `DOB: ${(r && r.date_of_birth) ? r.date_of_birth : '-'} → Age: ${(r && r.calculated_age !== undefined) ? r.calculated_age : '?'} years`;
                  } else if (activeCheck === 'duplicateAdmission') {
                    details = 'Adm No: ' + ((r && r.admission_number) ? r.admission_number : '-');
                  } else if (activeCheck === 'duplicateNIN') {
                    details = 'NIN: ' + ((r && r.nin) ? r.nin : '-');
                  } else if (activeCheck === 'noClass') {
                    details = `Status: ${(r && r.status) ? r.status : '-'} | Class ID: MISSING`;
                  } else if (activeCheck === 'staffMissingRole') {
                    details = 'Role: ' + ((r && r.role) ? r.role : 'MISSING');
                  } else if (activeCheck === 'staffMissingPhone') {
                    details = `Phone: MISSING | Status: ${(r && r.status) ? r.status : '-'}`;
                  } else if (activeCheck === 'duplicateTSC') {
                    details = 'TSC: ' + ((r && r.tsc_number) ? r.tsc_number : '-');
                  } else if (activeCheck === 'orphanedMarks') {
                    details = `Mark ID: ${id} | Student ID: ${(r && r.student_id) ? r.student_id : 'NULL'} (not in students table)`;
                  }

                  return (
                    <tr key={id}>
                      <td style={{ color: '#999', fontSize: '12px' }}>{id}</td>
                      <td style={{ fontWeight: '600' }}>{name}</td>
                      <td style={{ fontSize: '12px', color: '#d32f2f' }}>{details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Info Note ──────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">ℹ️ About Data Validation</div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Purpose:</strong> This page checks your schools data for completeness, accuracy, and EMIS compliance.
            Run validation regularly to catch data entry errors before submitting EMIS returns.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Severity:</strong> 🔴 High = critical for EMIS (missing names, duplicates), 🟠 Medium = should fix (missing DOB), 🟡 Low = nice to have (staff phone).
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            💡 <strong>Fix:</strong> Click on any failed check to see the affected records. Then go to the relevant page (Students, Staff) to fix the data.
          </p>
        </div>
      </div>
    </div>
  );
}
