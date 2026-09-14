// FileName: src/pages/Attendance.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Daily attendance — mark present/absent/late per student per class per date

import React, { useState, useEffect, useRef } from 'react';

export default function Attendance() {
  const [classes, setClasses] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [selDate, setSelDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({ /* no-op */ });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
        if (!mountedRef.current) return;
        console.error('Attendance: load classes error:', e.message);
      }
    };
    loadClasses();
  }, []);

  // ─── Load students + existing attendance ──────────────────
  const loadStudents = async () => {
    if (!selClass) return;

    setLoading(true);
    setMsg('');

    try {
      // Load students
      const r = await window.electronAPI.queryDatabase(
        "SELECT id, first_name, last_name, admission_number, gender FROM students WHERE class_id = ? AND status = 'Active' ORDER BY first_name",
        [selClass]
      );
      if (!mountedRef.current) return;

      if (!r || !r.success) {
        setStudents([]);
        return;
      }

      setStudents(r.data || []);

      // Load existing attendance for this class + date
      const aRes = await window.electronAPI.queryDatabase(
        "SELECT student_id, status FROM attendance WHERE class_id = ? AND date = ?",
        [selClass, selDate]
      );
      if (!mountedRef.current) return;

      const aMap = { /* no-op */ };
      if (aRes && aRes.success) {
        aRes.data.forEach(a => { aMap[a.student_id] = a.status; });
      }
      setAttendance(aMap);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Attendance: load students error:', e.message);
      setMsg('❌ Error loading students: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Set individual status (local state only — saved on "Save All") ─
  const setStatus = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  // ─── Mark all students with a status (local state) ─────────
  const markAll = (status) => {
    const all = { /* no-op */ };
    students.forEach(s => { all[s.id] = status; });
    setAttendance(all);
    setMsg('📋 All students marked as ' + status + '. Click "Save All" to persist.');
    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Save all attendance records to database ─────────────
  const saveAll = async () => {
    const entries = Object.entries(attendance);
    if (entries.length === 0) {
      setMsg('⚠️ No attendance to save');
      return;
    }

    setSaving(true);
    setMsg('⏳ Saving ' + entries.length + ' records...');

    try {
      let saved = 0;
      for (const [sid, status] of entries) {
        await window.electronAPI.queryDatabase(
          "INSERT OR REPLACE INTO attendance (student_id, class_id, date, status) VALUES (?, ?, ?, ?)",
          [parseInt(sid), selClass, selDate, status]
        );
        saved++;
      }

      if (!mountedRef.current) return;
      setMsg('✅ Saved ' + saved + ' attendance records for ' + selDate);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Attendance: save error:', e.message);
      setMsg('❌ Error saving: ' + e.message);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Attendance summary ────────────────────────────────────
  const presentCount = Object.values(attendance).filter(s => s === 'Present').length;
  const absentCount = Object.values(attendance).filter(s => s === 'Absent').length;
  const lateCount = Object.values(attendance).filter(s => s === 'Late').length;
  const unmarkedCount = students.length - presentCount - absentCount - lateCount;

  // ─── Loading state ────────────────────────────────────────
  if (loading && students.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">✅ Daily Attendance</h1>
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
      <h1 className="page-title">✅ Daily Attendance</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: msg.includes('❌') ? '#c62828' : (msg.includes('⚠️') ? '#e65100' : (msg.includes('⏳') ? '#1a73e8' : '#0d904f')),
          marginBottom: '15px', padding: '10px 14px',
          background: msg.includes('❌') ? '#ffebee' : (msg.includes('⚠️') ? '#fff3e0' : (msg.includes('⏳') ? '#e8f0fe' : '#e8f5e9')),
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Controls: Class + Date + Load ─────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
          <label className="form-label">Class</label>
          <select
            className="form-input"
            value={selClass}
            onChange={(e) => setSelClass(e.target.value)}
          >
            <option value="">-- Select Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: '160px', marginBottom: 0 }}>
          <label className="form-label">Date</label>
          <input
            type="date"
            className="form-input"
            value={selDate}
            onChange={(e) => setSelDate(e.target.value)}
          />
        </div>
        <button
          onClick={loadStudents}
          className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
          disabled={!selClass || loading}
        >
          {loading ? '⏳ Loading...' : '🔄 Load Students'}
        </button>
      </div>

      {/* ─── Attendance Summary + Quick Actions ─────────────── */}
      {students.length > 0 && (
        <>
          <div style={{
            display: 'flex', gap: '12px', marginBottom: '15px',
            flexWrap: 'wrap', alignItems: 'center'
          }}>
            {/* Summary badges */}
            <div style={{
              background: '#e8f5e9', padding: '6px 14px', borderRadius: '20px',
              color: '#0d904f', fontWeight: '600', fontSize: '13px'
            }}>
              ✅ Present: {presentCount}
            </div>
            <div style={{
              background: '#ffebee', padding: '6px 14px', borderRadius: '20px',
              color: '#d32f2f', fontWeight: '600', fontSize: '13px'
            }}>
              ❌ Absent: {absentCount}
            </div>
            <div style={{
              background: '#fff3e0', padding: '6px 14px', borderRadius: '20px',
              color: '#e65100', fontWeight: '600', fontSize: '13px'
            }}>
              ⏰ Late: {lateCount}
            </div>
            {unmarkedCount > 0 && (
              <div style={{
                background: '#f1f3f4', padding: '6px 14px', borderRadius: '20px',
                color: '#5f6368', fontWeight: '600', fontSize: '13px'
              }}>
                ❓ Unmarked: {unmarkedCount}
              </div>
            )}

            {/* Quick action buttons */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              <button
                onClick={() => markAll('Present')}
                className="btn btn-secondary"
                style={{ padding: '5px 12px', fontSize: '12px', background: '#e8f5e9', color: '#0d904f', border: '1px solid #a5d6a7' }}
              >
                ✅ All Present
              </button>
              <button
                onClick={() => markAll('Absent')}
                className="btn btn-secondary"
                style={{ padding: '5px 12px', fontSize: '12px', background: '#ffebee', color: '#d32f2f', border: '1px solid #ef9a9a' }}
              >
                ❌ All Absent
              </button>
              <button
                onClick={saveAll}
                className="btn btn-primary"
                style={{ padding: '5px 16px', fontSize: '12px' }}
                disabled={saving || Object.keys(attendance).length === 0}
              >
                {saving ? '⏳ Saving...' : '💾 Save All'}
              </button>
            </div>
          </div>

          {/* ─── Attendance Table ─────────────────────────── */}
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Student Name</th>
                    <th>Adm No</th>
                    <th>Gender</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const status = attendance[s.id] || '';
                    return (
                      <tr key={s.id} style={{
                        background: status === 'Present' ? 'rgba(232, 245, 233, 0.3)' :
                          status === 'Absent' ? 'rgba(255, 235, 238, 0.3)' :
                            status === 'Late' ? 'rgba(255, 243, 224, 0.3)' : 'transparent'
                      }}>
                        <td style={{ color: '#999' }}>{i + 1}</td>
                        <td style={{ fontWeight: '600' }}>
                          {s.first_name} {s.last_name}
                        </td>
                        <td style={{ fontSize: '12px' }}>{s.admission_number || '-'}</td>
                        <td>{s.gender === 'M' ? '👦' : '👧'}</td>
                        <td>
                          <select
                            value={status}
                            onChange={(e) => {
                              if (e.target.value) setStatus(s.id, e.target.value);
                            }}
                            style={{
                              padding: '5px 10px',
                              minWidth: '130px',
                              border: '1px solid ' + (
                                status === 'Present' ? '#a5d6a7' :
                                  status === 'Absent' ? '#ef9a9a' :
                                    status === 'Late' ? '#ffcc80' : '#dadce0'
                              ),
                              borderRadius: '6px',
                              background: status === 'Present' ? '#e8f5e9' :
                                status === 'Absent' ? '#ffebee' :
                                  status === 'Late' ? '#fff3e0' : 'white',
                              color: status === 'Present' ? '#0d904f' :
                                status === 'Absent' ? '#d32f2f' :
                                  status === 'Late' ? '#e65100' : '#5f6368',
                              fontWeight: '600',
                              fontSize: '13px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">-- Mark --</option>
                            <option value="Present">✅ Present</option>
                            <option value="Absent">❌ Absent</option>
                            <option value="Late">⏰ Late</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── Empty state ──────────────────────────────────────── */}
      {students.length === 0 && selClass && !loading && (
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
