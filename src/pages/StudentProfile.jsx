// FileName: src/pages/StudentProfile.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Student profile view — personal info, guardian, academics, payments, attendance, documents

import React, { useState, useEffect, useRef } from 'react';
import PhotoUpload from '../components/PhotoUpload';
import DocumentUpload from '../components/DocumentUpload';

export default function StudentProfile() {
  const [studentId, setStudentId] = useState(null);
  const [student, setStudent] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tab, setTab] = useState('profile');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Get student ID from URL hash (#/student/123) ─────────
  useEffect(() => {
    const match = window.location.pathname.match(/\/student\/(\d+)/);
    if (match) {
      setStudentId(parseInt(match[1]));
    } else {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ─── Load student data when ID is available ────────────────
  useEffect(() => {
    if (!studentId) return;

    const loadStudent = async () => {
      setLoading(true);

      try {
        // ─── Student record ─────────────────────────────
        const sRes = await window.electronAPI.queryDatabase(
          "SELECT * FROM students WHERE id = ?", [studentId]
        );
        if (!mountedRef.current) return;

        if (!sRes || !sRes.success || sRes.data.length === 0) {
          setLoading(false);
          return;
        }

        setStudent(sRes.data[0]);

        // ─── Class info ─────────────────────────────────
        if (sRes.data[0].class_id) {
          try {
            const cRes = await window.electronAPI.queryDatabase(
              "SELECT * FROM classes WHERE id = ?", [sRes.data[0].class_id]
            );
            if (!mountedRef.current) return;
            if (cRes && cRes.success && cRes.data.length > 0) {
              setClassInfo(cRes.data[0]);
            }
          } catch (e) {
            console.error('StudentProfile: class info error:', e.message);
          }
        }

        // ─── Payments (last 20) ────────────────────────
        try {
          const pRes = await window.electronAPI.queryDatabase(
            "SELECT id, amount_paid, payment_for, date, method, reference FROM payments WHERE student_id = ? ORDER BY date DESC LIMIT 20",
            [studentId]
          );
          if (!mountedRef.current) return;
          if (pRes && pRes.success) setPayments(pRes.data || []);
        } catch (e) {
          console.error('StudentProfile: payments error:', e.message);
        }

        // ─── Attendance (last 30 days) ──────────────────
        try {
          const aRes = await window.electronAPI.queryDatabase(
            "SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 30",
            [studentId]
          );
          if (!mountedRef.current) return;
          if (aRes && aRes.success) setAttendance(aRes.data || []);
        } catch (e) {
          console.error('StudentProfile: attendance error:', e.message);
        }

        // ─── Documents ───────────────────────────────────
        try {
          const dRes = await window.electronAPI.getStudentDocuments(studentId);
          if (!mountedRef.current) return;
          if (dRes && dRes.success) setDocuments(dRes.data || []);
        } catch (e) {
          console.error('StudentProfile: documents error:', e.message);
        }

      } catch (e) {
        if (!mountedRef.current) return;
        console.error('StudentProfile: load error:', e.message);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    loadStudent();
  }, [studentId]);

  // ─── Handle photo saved ────────────────────────────────────
  const handlePhotoSaved = (filename) => {
    setStudent(prev => prev ? { ...prev, photo_path: filename } : null);
  };

  // ─── Refresh documents ─────────────────────────────────────
  const refreshDocuments = async () => {
    try {
      const dRes = await window.electronAPI.getStudentDocuments(studentId);
      if (!mountedRef.current) return;
      if (dRes && dRes.success) setDocuments(dRes.data || []);
    } catch (e) {
      console.error('StudentProfile: refresh docs error:', e.message);
    }
  };

  // ─── Generate paycode (FIXED: uses backfillPaycodes, not generatePaycodes) ──
  const handleGeneratePaycode = async () => {
    try {
      // FIXED: preload.js exposes 'backfillPaycodes' not 'generatePaycodes'
      const result = await window.electronAPI.backfillPaycodes();
      if (!mountedRef.current) return;

      if (result && result.success) {
        const count = (result.data && result.data.count) || 0;
        setMsg(count > 0 ? '✅ Generated ' + count + ' paycode(s)' : 'ℹ️ All students already have paycodes');

        // Reload student to show the new paycode
        const sRes = await window.electronAPI.queryDatabase(
          "SELECT paycode FROM students WHERE id = ?", [studentId]
        );
        if (!mountedRef.current) return;
        if (sRes && sRes.success && sRes.data.length > 0) {
          setStudent(prev => prev ? { ...prev, paycode: sRes.data[0].paycode } : null);
        }
      } else {
        setMsg('❌ ' + ((result && result.error) || 'Failed to generate paycode'));
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error: ' + e.message);
    }

    // Clear message after 4 seconds
    setTimeout(() => {
      if (mountedRef.current) setMsg('');
    }, 4000);
  };

  // ─── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Student Profile</h1>
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
            <p style={{ color: '#666' }}>Loading student profile...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // ─── No student selected ────────────────────────────────────
  if (!student) {
    return (
      <div className="page-container">
        <h1 className="page-title">Student Profile</h1>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ fontSize: '48px', marginBottom: '10px' }}>👤</p>
            <p style={{ color: '#666' }}>No student selected. Click a student name to view their profile.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Derived values ────────────────────────────────────────
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  const presentDays = attendance.filter(a => a.status === 'Present').length;
  const absentDays = attendance.filter(a => a.status === 'Absent').length;
  const attendanceRate = attendance.length > 0
    ? ((presentDays / attendance.length) * 100).toFixed(1)
    : '0.0';

  // ─── Tab definitions ──────────────────────────────────────
  const tabs = [
    { key: 'profile', label: 'Profile', icon: '📋' },
    { key: 'guardian', label: 'Guardian', icon: '👨‍👩‍👧' },
    { key: 'academics', label: 'Academics', icon: '📚' },
    { key: 'payments', label: 'Payments', icon: '💵' },
    { key: 'attendance', label: 'Attendance', icon: '✅' },
    { key: 'documents', label: 'Documents', icon: '📎' }
  ];

  return (
    <div className="page-container">
      <h1 className="page-title">Student Profile</h1>
      {msg && (
        <div style={{
          color: msg.includes('❌') ? '#c62828' : (msg.includes('✅') ? '#0d904f' : '#1a73e8'),
          marginBottom: '15px', fontSize: '13px',
          padding: '8px 12px',
          background: msg.includes('❌') ? '#ffebee' : (msg.includes('✅') ? '#e8f5e9' : '#e8f0fe'),
          borderRadius: '6px'
        }}>
          {msg}
        </div>
      )}

      {/* ─── Profile Header Card ─────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Photo */}
            <PhotoUpload
              currentPhoto={student.photo_path}
              category="student"
              id={student.id}
              onPhotoSaved={handlePhotoSaved}
            />

            {/* Info */}
            <div style={{ flex: 1, minWidth: '250px' }}>
              <h2 style={{ margin: '0 0 5px 0', color: '#1a73e8', fontSize: '22px' }}>
                {student.first_name} {student.other_name ? student.other_name + ' ' : ''}{student.last_name}
              </h2>
              <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>
                Admission #: <b>{student.admission_number || 'N/A'}</b>
                {' | '}Paycode: <b>{student.paycode || 'Not Generated'}</b>
              </p>

              {/* Generate Paycode button */}
              {!student.paycode && (
                <button
                  onClick={handleGeneratePaycode}
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '6px 16px', fontSize: '13px', marginBottom: '15px' }}
                >
                  🔑 Generate Paycode
                </button>
              )}

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#e8f0fe', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>
                    {classInfo ? classInfo.name : '-'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5f6368' }}>Class</div>
                </div>
                <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0d904f' }}>
                    UGX {totalPaid.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Paid</div>
                </div>
                <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f57c00' }}>
                    {attendanceRate}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#5f6368' }}>Attendance</div>
                </div>
                <div style={{
                  background: student.status === 'Active' ? '#e8f5e9' : '#ffebee',
                  padding: '12px', borderRadius: '8px', textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '16px', fontWeight: 'bold',
                    color: student.status === 'Active' ? '#0d904f' : '#d32f2f'
                  }}>
                    {student.status}
                  </div>
                  <div style={{ fontSize: '11px', color: '#5f6368' }}>Status</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '20px',
        borderBottom: '2px solid #dadce0', paddingBottom: '5px', flexWrap: 'wrap'
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: tab === t.key ? '#1a73e8' : 'transparent',
              color: tab === t.key ? 'white' : '#5f6368',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              fontWeight: tab === t.key ? '600' : '400',
              fontSize: '13px',
              textTransform: 'capitalize'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Profile ────────────────────────────────── */}
      {tab === 'profile' && (
        <div className="card">
          <div className="card-header">📋 Personal Information</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              <InfoField label="First Name" value={student.first_name} />
              <InfoField label="Last Name" value={student.last_name} />
              <InfoField label="Other Name" value={student.other_name} />
              <InfoField label="Gender" value={student.gender === 'M' ? 'Male' : 'Female'} />
              <InfoField label="Date of Birth" value={student.date_of_birth} />
              <InfoField label="NIN" value={student.nin} />
              <InfoField label="EMIS Student ID" value={student.emis_student_id} />
              <InfoField label="Admission Date" value={student.admission_date} />
              <InfoField label="Student Type" value={student.student_type} />
              <InfoField label="Residence" value={student.residence} />
              <InfoField label="Previous School" value={student.previous_school} />
              <InfoField label="Dropout Reason" value={student.dropout_reason} highlight={!!student.dropout_reason} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Guardian ───────────────────────────────── */}
      {tab === 'guardian' && (
        <div className="card">
          <div className="card-header">👨‍👩‍👧 Guardian Information</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              <InfoField label="Guardian Name" value={student.guardian_name} />
              <InfoField label="Phone 1" value={student.guardian_phone} />
              <InfoField label="Phone 2" value={student.guardian_phone2} />
              <InfoField label="Email" value={student.guardian_email} />
              <InfoField label="Occupation" value={student.guardian_occupation} />
              <InfoField label="Guardian NIN" value={student.guardian_nin} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Academics ──────────────────────────────── */}
      {tab === 'academics' && (
        <div className="card">
          <div className="card-header">📚 Academic Performance</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <InfoField label="Current Class" value={classInfo ? classInfo.name : '-'} />
              <InfoField label="Stream" value={classInfo ? classInfo.stream : '-'} />
              <InfoField label="Level" value={classInfo ? classInfo.level : '-'} />
              <InfoField label="Boarding Requirements" value={student.boarding_reqs} />
            </div>
            <h4 style={{ marginBottom: '10px', color: '#333' }}>Recent Marks</h4>
            <MarksSummary studentId={studentId} />
          </div>
        </div>
      )}

      {/* ─── Tab: Payments ───────────────────────────────── */}
      {tab === 'payments' && (
        <div className="card">
          <div className="card-header">💵 Payment History ({payments.length} records)</div>
          <div className="card-body">
            {payments.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No payments recorded</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Payment For</th><th>Method</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>{p.date}</td>
                      <td>{p.payment_for || 'School Fees'}</td>
                      <td>{p.method || 'Cash'}</td>
                      <td style={{ fontWeight: 'bold', color: '#0d904f' }}>
                        UGX {(p.amount_paid || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                    <td colSpan="3">Total</td>
                    <td style={{ color: '#0d904f' }}>UGX {totalPaid.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Attendance ──────────────────────────────── */}
      {tab === 'attendance' && (
        <div className="card">
          <div className="card-header">✅ Attendance (Last 30 days)</div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d904f' }}>{presentDays}</div>
                <div style={{ fontSize: '12px' }}>Present</div>
              </div>
              <div style={{ padding: '15px', background: '#ffebee', borderRadius: '8px', textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d32f2f' }}>{absentDays}</div>
                <div style={{ fontSize: '12px' }}>Absent</div>
              </div>
              <div style={{ padding: '15px', background: '#e8f0fe', borderRadius: '8px', textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{attendanceRate}%</div>
                <div style={{ fontSize: '12px' }}>Rate</div>
              </div>
            </div>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {attendance.map((a, i) => (
                  <tr key={i}>
                    <td>{a.date}</td>
                    <td>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '4px',
                        background: a.status === 'Present' ? '#e8f5e9' : '#ffebee',
                        color: a.status === 'Present' ? '#0d904f' : '#d32f2f',
                        fontWeight: '600'
                      }}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Tab: Documents ──────────────────────────────── */}
      {tab === 'documents' && (
        <DocumentUpload
          studentId={studentId}
          documents={documents}
          onRefresh={refreshDocuments}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// InfoField — displays a label + value in a styled box
// ═══════════════════════════════════════════════════════════

function InfoField({ label, value, highlight }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{
        fontSize: '11px',
        fontWeight: '600',
        color: '#5f6368',
        textTransform: 'uppercase',
        marginBottom: '2px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '14px',
        color: highlight ? '#d32f2f' : '#202124',
        fontWeight: highlight ? '600' : '400',
        background: highlight ? '#ffebee' : '#f8f9fa',
        padding: '8px 12px',
        borderRadius: '4px'
      }}>
        {value || '-'}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MarksSummary — fetches and displays recent marks for a student
// ═══════════════════════════════════════════════════════════

function MarksSummary({ studentId }) {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchMarks = async () => {
      try {
        const r = await window.electronAPI.queryDatabase(
          "SELECT m.*, s.name as subject_name FROM marks m JOIN subjects s ON m.subject_id = s.id WHERE m.student_id = ? ORDER BY m.term DESC, m.subject_id LIMIT 20",
          [studentId]
        );
        if (!cancelled && r && r.success) {
          setMarks(r.data || []);
        }
      } catch (e) {
        console.error('MarksSummary: error:', e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMarks();
    return () => { cancelled = true; };
  }, [studentId]);

  if (loading) {
    return <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Loading marks...</p>;
  }

  if (marks.length === 0) {
    return <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No marks recorded yet</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Subject</th>
          <th>Term</th>
          <th>Exam Type</th>
          <th>Score</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>
        {marks.map((m, i) => (
          <tr key={i}>
            <td>{m.subject_name}</td>
            <td>{m.term}</td>
            <td>{m.exam_type || '-'}</td>
            <td style={{ fontWeight: 'bold' }}>{m.score}</td>
            <td>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                background: m.score >= 50 ? '#e8f5e9' : '#ffebee',
                color: m.score >= 50 ? '#0d904f' : '#d32f2f',
                fontWeight: '600'
              }}>
                {getGrade(m.score)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ═══════════════════════════════════════════════════════════
// getGrade — Uganda education grading system
// ═══════════════════════════════════════════════════════════

function getGrade(score) {
  const n = parseFloat(score);
  if (isNaN(n)) return '-';
  if (n >= 80) return 'D1';
  if (n >= 75) return 'D2';
  if (n >= 70) return 'C3';
  if (n >= 65) return 'C4';
  if (n >= 60) return 'C5';
  if (n >= 55) return 'C6';
  if (n >= 50) return 'P7';
  if (n >= 45) return 'P8';
  return 'F9';
}
