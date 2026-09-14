// FileName: src/pages/UNEBRegistration.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useRef } from 'react';

const EXAM_TYPES = [
  { value: 'PLE', label: 'PLE (Primary Leaving Examination)' },
  { value: 'UCE', label: 'UCE (O-Level / Uganda Certificate of Education)' },
  { value: 'UACE', label: 'UACE (A-Level / Uganda Advanced Certificate of Education)' }
];

export default function UNEBRegistration() {
  const [years, setYears] = useState([]);
  const [selYear, setSelYear] = useState('');
  const [examType, setExamType] = useState('PLE');
  const [candidates, setCandidates] = useState([]);
  const [students, setStudents] = useState([]);
  const [debtorIds, setDebtorIds] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load academic years on mount ──────────────────────────
  useEffect(() => {
    const loadYears = async () => {
      try {
        const r = await window.electronAPI.emisGetAcademicYears();
        if (!mountedRef.current) return;
        if (r && r.success && r.data && r.data.length > 0) {
          setYears(r.data);
          const current = r.data.find(y => y.is_current === 1 || y.is_current === true);
          setSelYear(current ? current.id : r.data[0].id);
        }
      } catch (e) {
        console.error('UNEBRegistration: load years error:', e.message);
      }
    };
    loadYears();
  }, []);

  // ─── Load candidates + students + debts when year/exam changes ─
  useEffect(() => {
    if (!selYear) return;

    const loadAll = async () => {
      setLoading(true);

      try {
        await Promise.all([
          fetchCandidates(),
          fetchStudentsAndDebts()
        ]);
      } catch (e) {
        if (!mountedRef.current) return;
        console.error('UNEBRegistration: load all error:', e.message);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    loadAll();
  }, [selYear, examType]);

  // ─── Fetch registered candidates ──────────────────────────
  const fetchCandidates = async () => {
    if (!selYear) return;

    try {
      const r = await window.electronAPI.queryDatabase(
        `SELECT uc.id, uc.student_id, uc.candidate_number, uc.registration_status,
                        uc.submitted_to_uneb, uc.fees_paid,
                        s.first_name, s.last_name, s.admission_number, s.gender,
                        c.name as class_name
                 FROM uneb_candidates uc
                 JOIN students s ON uc.student_id = s.id
                 LEFT JOIN classes c ON s.class_id = c.id
                 WHERE uc.exam_type = ? AND uc.academic_year_id = ?
                 ORDER BY s.first_name`,
        [examType, selYear]
      );
      if (!mountedRef.current) return;
      if (r && r.success) {
        setCandidates(r.data || []);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('UNEBRegistration: fetch candidates error:', e.message);
    }
  };

  // ─── Fetch students + calculate debtors ──
  const fetchStudentsAndDebts = async () => {
    try {
      const sRes = await window.electronAPI.queryDatabase(
        "SELECT id, first_name, last_name, admission_number, class_id, gender FROM students WHERE status = 'Active' ORDER BY first_name"
      );
      if (!mountedRef.current) return;

      if (!sRes || !sRes.success) {
        setStudents([]);
        setDebtorIds([]);
        return;
      }

      const studentList = sRes.data || [];
      setStudents(studentList);

      const fRes = await window.electronAPI.queryDatabase(
        "SELECT class_id, amount FROM fees_structure"
      );
      if (!mountedRef.current) return;

      const feeMap = { /* no-op */ };
      if (fRes && fRes.success) {
        fRes.data.forEach(f => {
          if (!feeMap[f.class_id]) feeMap[f.class_id] = f.amount;
        });
      }

      const pRes = await window.electronAPI.queryDatabase(
        "SELECT student_id, SUM(amount_paid) as total FROM payments GROUP BY student_id"
      );
      if (!mountedRef.current) return;

      const payMap = { /* no-op */ };
      if (pRes && pRes.success) {
        pRes.data.forEach(p => {
          payMap[p.student_id] = p.total || 0;
        });
      }

      const debts = [];
      studentList.forEach(s => {
        const expected = feeMap[s.class_id] || 0;
        const paid = payMap[s.id] || 0;
        if (expected - paid > 0) {
          debts.push(s.id);
        }
      });

      if (!mountedRef.current) return;
      setDebtorIds(debts);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('UNEBRegistration: fetch students error:', e.message);
    }
  };

  // ─── Add candidate ──
  const addCandidate = async (student) => {
    const studentName = student.first_name + ' ' + student.last_name;

    const existing = candidates.find(c => String(c.student_id) === String(student.id));
    if (existing) {
      setMsg('ℹ️ ' + studentName + ' is already registered for ' + examType);
      return;
    }

    if (debtorIds.includes(student.id)) {
      setMsg('❌ Cannot register: ' + studentName + ' has outstanding school fees!');
      return;
    }

    if (!confirm('Register ' + studentName + ' for ' + examType + ' examination?')) return;

    setMsg('⏳ Registering ' + studentName + '...');

    try {
      const r = await window.electronAPI.queryDatabase(
        "INSERT INTO uneb_candidates (student_id, exam_type, academic_year_id, center_number, registration_status, submitted_to_uneb, fees_paid) VALUES (?, ?, ?, ?, 'Pending', 0, 0)",
        [
          student.id,
          examType,
          selYear,
          ''
        ]
      );

      if (!mountedRef.current) return;

      if (r && r.success) {
        setMsg('✅ ' + studentName + ' registered for ' + examType + '!');
        fetchCandidates();
      } else {
        setMsg('❌ ' + ((r && r.error) || 'Registration failed'));
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('UNEBRegistration: add candidate error:', e.message);
      setMsg('❌ Error: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Remove candidate ──────────────────────────────────────
  const handleRemove = async (candidateId, studentName) => {
    if (!confirm('Remove ' + studentName + ' from ' + examType + ' registration?')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM uneb_candidates WHERE id = ?", [candidateId]
      );
      if (!mountedRef.current) return;
      setMsg('🗑️ ' + studentName + ' removed from registration');
      fetchCandidates();
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error removing: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Stats ────────────────────────────────────────────────
  const pendingCount = candidates.filter(c => c.registration_status === 'Pending').length;
  const submittedCount = candidates.filter(c => c.submitted_to_uneb === 1 || c.submitted_to_uneb === true).length;
  const eligibleCount = students.filter(s => !debtorIds.includes(s.id)).length;

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">🏛️ UNEB Candidate Registration</h1>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '36px', height: '36px',
              border: '3px solid #e0e0e0',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#666' }}>Loading UNEB data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🏛️ UNEB Candidate Registration</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: msg.includes('❌') ? '#c62828' : (msg.includes('⚠️') ? '#e65100' : (msg.includes('ℹ️') ? '#1a73e8' : '#0d904f')),
          marginBottom: '15px', padding: '10px 14px',
          background: msg.includes('❌') ? '#ffebee' : (msg.includes('⚠️') ? '#fff3e0' : (msg.includes('ℹ️') ? '#e8f0fe' : '#e8f5e9')),
          borderRadius: '6px', fontWeight: 'bold'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Selection Bar ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Exam Type</label>
          <select className="form-input" value={examType} onChange={(e) => setExamType(e.target.value)}>
            {EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Academic Year</label>
          <select className="form-input" value={selYear} onChange={(e) => setSelYear(e.target.value)}>
            {years.map(y => <option key={y.id} value={y.id}>{y.year_name}</option>)}
          </select>
        </div>
      </div>

      {/* ─── Stats Bar ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap'
      }}>
        <div style={{
          background: '#e8f0fe', padding: '8px 16px', borderRadius: '8px',
          color: '#1a73e8', fontWeight: 'bold', fontSize: '13px'
        }}>
          📋 Registered: {candidates.length}
        </div>
        <div style={{
          background: '#fff3e0', padding: '8px 16px', borderRadius: '8px',
          color: '#e65100', fontWeight: 'bold', fontSize: '13px'
        }}>
          ⏳ Pending: {pendingCount}
        </div>
        {submittedCount > 0 && (
          <div style={{
            background: '#e8f5e9', padding: '8px 16px', borderRadius: '8px',
            color: '#0d904f', fontWeight: 'bold', fontSize: '13px'
          }}>
            ✅ Submitted: {submittedCount}
          </div>
        )}
        <div style={{
          background: '#f1f3f4', padding: '8px 16px', borderRadius: '8px',
          color: '#5f6368', fontWeight: 'bold', fontSize: '13px'
        }}>
          👥 Eligible: {eligibleCount} / {students.length}
        </div>
        {debtorIds.length > 0 && (
          <div style={{
            background: '#ffebee', padding: '8px 16px', borderRadius: '8px',
            color: '#d32f2f', fontWeight: 'bold', fontSize: '13px'
          }}>
            💰 Debtors: {debtorIds.length}
          </div>
        )}
      </div>

      {/* ─── Registered Candidates Table ────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">📋 Registered Candidates ({candidates.length})</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {candidates.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              No candidates registered yet for {examType}.
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Adm No</th>
                  <th>Class</th>
                  <th>Gender</th>
                  <th>Candidate No.</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ color: '#999' }}>{i + 1}</td>
                    <td style={{ fontWeight: '600' }}>
                      {c.first_name} {c.last_name}
                    </td>
                    <td style={{ fontSize: '12px' }}>{c.admission_number || '-'}</td>
                    <td style={{ fontSize: '12px' }}>{c.class_name || '-'}</td>
                    <td>{c.gender === 'M' ? '👦' : '👧'}</td>
                    <td style={{ fontSize: '12px' }}>{c.candidate_number || 'Pending'}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px',
                        background: c.registration_status === 'Submitted' ? '#e8f5e9' : '#fff3e0',
                        color: c.registration_status === 'Submitted' ? '#0d904f' : '#e65100',
                        fontSize: '11px', fontWeight: '600'
                      }}>
                        {c.registration_status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {c.submitted_to_uneb ? '✅ Yes' : '❌ No'}
                    </td>
                    <td>
                      <button
                        onClick={() => handleRemove(c.id, c.first_name + ' ' + c.last_name)}
                        style={{
                          color: '#d32f2f', border: 'none',
                          background: 'none', cursor: 'pointer',
                          fontSize: '12px', fontWeight: '600'
                        }}
                      >
                        🗑️ Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Quick Add (Active Students) ────────────────────── */}
      <div className="card">
        <div className="card-header">
          ➕ Quick Add — Active Students ({students.length})
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {students.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              No active students found
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Adm No</th>
                  <th>Fee Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const isDebtor = debtorIds.includes(s.id);
                  const alreadyRegistered = candidates.some(c => String(c.student_id) === String(s.id));
                  const studentName = s.first_name + ' ' + s.last_name;

                  return (
                    <tr key={s.id} style={{
                      background: alreadyRegistered ? '#f8faff' : (isDebtor ? '#fff8f8' : 'transparent')
                    }}>
                      <td style={{ fontWeight: '600' }}>{studentName}</td>
                      <td style={{ fontSize: '12px' }}>{s.admission_number || '-'}</td>
                      <td>
                        <span style={{
                          color: isDebtor ? '#d32f2f' : '#0d904f',
                          fontWeight: 'bold', fontSize: '12px'
                        }}>
                          {isDebtor ? '❌ OWES FEES' : '✅ CLEARED'}
                        </span>
                      </td>
                      <td>
                        {alreadyRegistered ? (
                          <span style={{
                            color: '#1a73e8', fontWeight: '600', fontSize: '12px',
                            padding: '4px 10px',
                            background: '#e8f0fe', borderRadius: '4px'
                          }}>
                            ✅ Registered
                          </span>
                        ) : (
                          <button
                            onClick={() => addCandidate(s)}
                            disabled={isDebtor}
                            className="btn btn-primary"
                            style={{
                              padding: '5px 12px',
                              width: 'auto', marginTop: 0,
                              fontSize: '12px',
                              opacity: isDebtor ? 0.5 : 1,
                              cursor: isDebtor ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isDebtor ? '🚫 Blocked' : '➕ Register'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Info Note ──────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">ℹ️ UNEB Registration Information</div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Debtor Check:</strong> Students with outstanding school fees are automatically blocked from UNEB registration. Clear their fees first.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Exam Types:</strong> PLE (Primary 7), UCE (Senior 4 / O-Level), UACE (Senior 6 / A-Level).
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            💡 <strong>Submission:</strong> After registering candidates locally, use the EMIS Config page to submit to UNEB via API (requires API keys).
          </p>
        </div>
      </div>
    </div>
  );
}
