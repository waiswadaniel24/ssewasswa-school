// FileName: src/pages/Promotion.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Student promotion, demotion, completion tracking, and transfer certificate generation

import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';

export default function Promotion() {
  const [classes, setClasses] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [students, setStudents] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load classes on mount ─────────────────────────────────
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const r = await window.electronAPI.queryDatabase(
          "SELECT id, name FROM classes ORDER BY name"
        );
        if (!mountedRef.current) return;
        if (r && r.success) setClasses(r.data || []);
      } catch (e) {
        console.error('Promotion: load classes error:', e.message);
      }
    };
    loadClasses();
  }, []);

  // ─── Load students when class is selected ──────────────────
  const loadStudents = async () => {
    if (!selClass) return;
    setTableLoading(true);
    try {
      const r = await window.electronAPI.queryDatabase(
        "SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.class_id = ? AND s.status = 'Active' ORDER BY s.first_name",
        [selClass]
      );
      if (!mountedRef.current) return;
      if (r && r.success) setStudents(r.data || []);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Promotion: load students error:', e.message);
      setMsg('❌ Error loading students: ' + e.message);
    } finally {
      if (mountedRef.current) setTableLoading(false);
    }
  };

  // ─── Helper: Create enrollment record ──────────────────────
  const createEnrollmentRecord = async (studentId, toClassId, status) => {
    try {
      const yr = await window.electronAPI.queryDatabase(
        "SELECT id FROM academic_years WHERE is_current = 1"
      );
      if (yr && yr.success && yr.data.length > 0) {
        await window.electronAPI.queryDatabase(
          "INSERT INTO student_enrollment (student_id, class_id, academic_year_id, term, enrollment_status, enrollment_date) VALUES (?, ?, ?, ?, ?, ?)",
          [studentId, toClassId, yr.data[0].id, 1, status, new Date().toISOString().split('T')[0]]
        );
      }
    } catch (e) {
      console.error('Promotion: enrollment record error:', e.message);
    }
  };

  // ─── Promote student ───────────────────────────────────────
  const promote = async (studentId, studentName, toClassId, toClassName) => {
    if (!confirm('Promote ' + studentName + ' to ' + toClassName + '?')) return;

    setLoading(true);
    try {
      await window.electronAPI.queryDatabase(
        "UPDATE students SET class_id = ? WHERE id = ?",
        [toClassId, studentId]
      );
      // Create enrollment record
      await createEnrollmentRecord(studentId, toClassId, 'Promoted');

      if (!mountedRef.current) return;
      setMsg('✅ ' + studentName + ' promoted to ' + toClassName);
      loadStudents();
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error promoting: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Demote student (FIXED: now creates enrollment record) ─
  const demote = async (studentId, studentName, toClassId, toClassName) => {
    if (!confirm('Demote ' + studentName + ' to ' + toClassName + '?')) return;

    setLoading(true);
    try {
      await window.electronAPI.queryDatabase(
        "UPDATE students SET class_id = ? WHERE id = ?",
        [toClassId, studentId]
      );
      // FIXED: Now creates enrollment record (was missing in original)
      await createEnrollmentRecord(studentId, toClassId, 'Demoted');

      if (!mountedRef.current) return;
      setMsg('📉 ' + studentName + ' demoted to ' + toClassName);
      loadStudents();
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error demoting: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Mark student as completed ──────────────────────────────
  const markCompleted = async (studentId, studentName) => {
    if (!confirm('Mark ' + studentName + ' as Completed?\n\nThis means the student has finished their education at this school.')) return;

    setLoading(true);
    try {
      await window.electronAPI.queryDatabase(
        "UPDATE students SET status = 'Completed' WHERE id = ?",
        [studentId]
      );
      // Create enrollment record for completion
      await createEnrollmentRecord(studentId, selClass, 'Completed');

      if (!mountedRef.current) return;
      setMsg('🎓 ' + studentName + ' marked as completed');
      loadStudents();
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Generate Transfer Certificate PDF ─────────────────────
  const generateTC = async (student) => {
    const studentName = student.first_name + ' ' + student.last_name;

    try {
      // Fetch total fees paid
      const r = await window.electronAPI.queryDatabase(
        "SELECT SUM(amount_paid) as total FROM payments WHERE student_id = ?",
        [student.id]
      );
      const feesPaid = (r && r.success && r.data.length > 0) ? (r.data[0].total || 0) : 0;

      // Fetch school name + motto
      const sRes = await window.electronAPI.queryDatabase(
        "SELECT value FROM system_settings WHERE key = 'school_name'"
      );
      const schoolName = (sRes && sRes.success && sRes.data.length > 0) ? (sRes.data[0].value || 'School') : 'School';

      const mRes = await window.electronAPI.queryDatabase(
        "SELECT value FROM system_settings WHERE key = 'school_motto'"
      );
      const motto = (mRes && mRes.success && mRes.data.length > 0) ? (mRes.data[0].value || '') : '';

      const doc = new jsPDF();
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 115, 232);
      doc.text(schoolName.toUpperCase(), 105, y, { align: 'center' });
      y += 8;

      if (motto) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('"' + motto + '"', 105, y, { align: 'center' });
        y += 8;
      }

      // Decorative line
      doc.setDrawColor(26, 115, 232);
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);
      doc.setLineWidth(0.2);
      doc.line(20, y + 1.5, 190, y + 1.5);
      y += 10;

      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('TRANSFER CERTIFICATE', 105, y, { align: 'center' });
      y += 12;

      // Body
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('This is to certify that', 14, y);
      y += 8;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 115, 232);
      doc.text(studentName, 105, y, { align: 'center' });
      y += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('was a bona fide student of this school.', 14, y);
      y += 10;

      // Details table
      const details = [
        ['Admission No:', student.admission_number || '-'],
        ['Class:', student.class_name || '-'],
        ['Date of Admission:', student.admission_date || '-'],
        ['Date of Leaving:', new Date().toLocaleDateString()],
        ['Total Fees Paid:', 'UGX ' + feesPaid.toLocaleString()],
        ['Conduct:', 'Satisfactory']
      ];

      doc.setFontSize(11);
      details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(label, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(value, 60, y);
        y += 6;
      });

      y += 15;

      // Signature section
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(20, y, 80, y);  // Head teacher line
      doc.line(120, y, 180, y);  // Date line

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('Head Teacher', 50, y + 6, { align: 'center' });
      doc.text('Date: ' + new Date().toLocaleDateString(), 150, y + 6, { align: 'center' });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text('This certificate is issued upon request and is valid only with the school stamp.', 105, 285, { align: 'center' });
      doc.text('Generated by Ssewasswa School ERP V10', 105, 290, { align: 'center' });

      doc.save(student.first_name + '_Transfer_Certificate.pdf');

      if (!mountedRef.current) return;
      setMsg('📄 Transfer certificate downloaded for ' + studentName);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Promotion: TC error:', e.message);
      setMsg('❌ Error generating TC: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Loading state for student table ───────────────────────
  if (tableLoading && students.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">Promotion & Transfer Certificate</h1>
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
            <p style={{ color: '#666' }}>Loading students...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📈 Promotion & Transfer Certificate</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '6px',
          marginBottom: '15px',
          fontSize: '14px',
          background: msg.includes('❌') ? '#ffebee' : '#e8f5e9',
          color: msg.includes('❌') ? '#c62828' : '#0d904f',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {msg}
        </div>
      )}

      {/* ─── Class Selector ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Select Class</label>
          <select
            className="form-input"
            value={selClass}
            onChange={(e) => setSelClass(e.target.value)}
          >
            <option value="">-- Select Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button
          onClick={loadStudents}
          className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
          disabled={!selClass || loading}
        >
          {tableLoading ? '⏳ Loading...' : '🔄 Load Students'}
        </button>
      </div>

      {/* ─── Students Table ──────────────────────────────────── */}
      {students.length > 0 && (
        <div className="card">
          <div className="card-header">
            📋 Students in {classes.find(c => String(c.id) === String(selClass)) ? classes.find(c => String(c.id) === String(selClass)).name : ''} ({students.length})
          </div>
          <div className="card-body" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Adm No</th>
                  <th>Current Class</th>
                  <th>Promote To</th>
                  <th>Demote To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const studentName = s.first_name + ' ' + s.last_name;
                  // Classes available for promotion/demotion (exclude current class)
                  const otherClasses = classes.filter(c => String(c.id) !== String(s.class_id));
                  const currentIdx = classes.findIndex(c => String(c.id) === String(s.class_id));

                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: '600' }}>{studentName}</td>
                      <td>{s.admission_number || '-'}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: '#e8f0fe', color: '#1a73e8',
                          fontSize: '12px', fontWeight: '600'
                        }}>
                          {s.class_name || '-'}
                        </span>
                      </td>
                      <td>
                        {/* Promote: classes AFTER current (higher index) */}
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              const targetClass = classes.find(c => String(c.id) === e.target.value);
                              promote(s.id, studentName, e.target.value, targetClass ? targetClass.name : '');
                              e.target.value = '';
                            }
                          }}
                          style={{ padding: '4px', fontSize: '12px', border: '1px solid #dadce0', borderRadius: '4px' }}
                          defaultValue=""
                        >
                          <option value="">-</option>
                          {otherClasses.filter((c) => {
                            const ci = classes.findIndex(x => String(x.id) === String(c.id));
                            return ci > currentIdx;
                          }).map(c => <option key={c.id} value={c.id}>⬆️ {c.name}</option>)}
                        </select>
                      </td>
                      <td>
                        {/* Demote: classes BEFORE current (lower index) */}
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              const targetClass = classes.find(c => String(c.id) === e.target.value);
                              demote(s.id, studentName, e.target.value, targetClass ? targetClass.name : '');
                              e.target.value = '';
                            }
                          }}
                          style={{ padding: '4px', fontSize: '12px', border: '1px solid #dadce0', borderRadius: '4px' }}
                          defaultValue=""
                        >
                          <option value="">-</option>
                          {otherClasses.filter((c) => {
                            const ci = classes.findIndex(x => String(x.id) === String(c.id));
                            return ci < currentIdx;
                          }).map(c => <option key={c.id} value={c.id}>⬇️ {c.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => generateTC(s)}
                            style={{
                              color: '#e91e63', border: 'none',
                              background: 'none', cursor: 'pointer',
                              marginRight: '6px', fontWeight: 'bold',
                              fontSize: '13px'
                            }}
                            title="Generate Transfer Certificate"
                          >
                            📄 TC
                          </button>
                          <button
                            onClick={() => markCompleted(s.id, studentName)}
                            disabled={loading}
                            style={{
                              color: '#0d904f', border: 'none',
                              background: 'none', cursor: 'pointer',
                              fontWeight: 'bold', fontSize: '13px',
                              opacity: loading ? 0.5 : 1
                            }}
                            title="Mark as Completed"
                          >
                            🎓 Complete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Empty state ────────────────────────────────────── */}
      {students.length === 0 && selClass && !tableLoading && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p style={{ fontSize: '36px', marginBottom: '10px' }}>📭</p>
            No active students in this class
          </div>
        </div>
      )}
    </div>
  );
}