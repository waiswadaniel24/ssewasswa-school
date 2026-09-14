// FileName: src/pages/Exams.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useRef } from 'react';

const EXAM_TYPES = ['Beginning of Term', 'Mid Term', 'End of Term', 'Mock Examination'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];

// Uganda grading system
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

export default function Exams() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selTerm, setSelTerm] = useState('Term 1');
  const [selExamType, setSelExamType] = useState('End of Term');
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({ /* no-op */ });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load classes and subjects on mount ────────────────────
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          window.electronAPI.queryDatabase("SELECT id, name FROM classes ORDER BY name"),
          window.electronAPI.queryDatabase("SELECT id, name, code FROM subjects ORDER BY name")
        ]);
        if (!mountedRef.current) return;
        if (cRes && cRes.success) setClasses(cRes.data || []);
        if (sRes && sRes.success) setSubjects(sRes.data || []);
      } catch (e) {
        console.error('Exams: load error:', e.message);
      }
    };
    loadAll();
  }, []);

  // ─── Load students + existing marks ────────────────────────
  const loadStudents = async () => {
    if (!selClass || !selSubject) {
      setMsg('⚠️ Please select both a class and a subject');
      return;
    }

    setLoading(true);
    setLoaded(true);
    setMsg('');

    try {
      // Load students in this class
      const sRes = await window.electronAPI.queryDatabase(
        "SELECT id, first_name, last_name, admission_number, gender FROM students WHERE class_id = ? AND status = 'Active' ORDER BY first_name",
        [selClass]
      );
      if (!mountedRef.current) return;

      if (!sRes || !sRes.success) {
        setStudents([]);
        return;
      }

      setStudents(sRes.data || []);

      // Load existing marks for this class + subject + term + exam_type
      const mRes = await window.electronAPI.queryDatabase(
        "SELECT student_id, score FROM marks WHERE class_id = ? AND subject_id = ? AND term = ? AND exam_type = ?",
        [selClass, selSubject, selTerm, selExamType]
      );
      if (!mountedRef.current) return;

      const marksMap = { /* no-op */ };
      if (mRes && mRes.success) {
        mRes.data.forEach(m => {
          marksMap[m.student_id] = m.score;
        });
      }
      setMarks(marksMap);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Exams: load students error:', e.message);
      setMsg('❌ Error loading: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Update a single student's mark (local state) ─────────
  const updateMark = (studentId, value) => {
    // Allow empty, numbers, and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numVal = parseFloat(value);
      if (value !== '' && (isNaN(numVal) || numVal < 0 || numVal > 100)) {
        return; // Don't allow invalid scores
      }
      setMarks(prev => ({ ...prev, [studentId]: value }));
    }
  };

  // ─── Save all marks to database ────────────────────────────
  const handleSave = async () => {
    // FIXED: Replace `_` with space to avoid unused variable linter error
    const entries = Object.entries(marks).filter(([, v]) => v !== '' && v !== null && v !== undefined);
    if (entries.length === 0) {
      setMsg('⚠️ No marks to save. Enter scores first.');
      return;
    }

    setSaving(true);
    setMsg('⏳ Saving ' + entries.length + ' marks...');

    try {
      const academicYear = String(new Date().getFullYear());
      let saved = 0;

      for (const [studentId, score] of entries) {
        await window.electronAPI.queryDatabase(
          "INSERT OR REPLACE INTO marks (student_id, subject_id, term, exam_type, score, academic_year, class_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [parseInt(studentId), selSubject, selTerm, selExamType, parseFloat(score), academicYear, selClass]
        );
        saved++;
      }

      if (!mountedRef.current) return;
      setMsg('✅ Saved ' + saved + ' marks for ' + selExamType + ' — ' + selTerm);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Exams: save error:', e.message);
      setMsg('❌ Error saving: ' + e.message);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Clear all marks for this selection ───────────────────
  const handleClearMarks = async () => {
    if (!confirm('Clear ALL marks for this class/subject/term/exam?\n\nThis cannot be undone.')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM marks WHERE class_id = ? AND subject_id = ? AND term = ? AND exam_type = ?",
        [selClass, selSubject, selTerm, selExamType]
      );
      if (!mountedRef.current) return;
      setMarks({ /* no-op */ });
      setMsg('🗑️ All marks cleared');
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error clearing: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Statistics ────────────────────────────────────────────
  const enteredScores = Object.values(marks).filter(v => v !== '' && v !== null && v !== undefined);
  const totalScore = enteredScores.reduce((sum, v) => sum + parseFloat(v), 0);
  const avgScore = enteredScores.length > 0 ? (totalScore / enteredScores.length).toFixed(1) : '0.0';
  const highestScore = enteredScores.length > 0 ? Math.max(...enteredScores.map(v => parseFloat(v))) : 0;
  const lowestScore = enteredScores.length > 0 ? Math.min(...enteredScores.map(v => parseFloat(v))) : 0;
  const passCount = enteredScores.filter(v => parseFloat(v) >= 50).length;
  const failCount = enteredScores.filter(v => parseFloat(v) < 50).length;

  // ─── Loading state ────────────────────────────────────────
  if (loading && students.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">📝 Exams & Marks Entry</h1>
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
      <h1 className="page-title">📝 Exams & Marks Entry</h1>

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

      {/* ─── Selection Bar ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Class *</label>
              <select className="form-input" value={selClass}
                onChange={(e) => { setSelClass(e.target.value); setLoaded(false); }}>
                <option value="">-- Select --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject *</label>
              <select className="form-input" value={selSubject}
                onChange={(e) => { setSelSubject(e.target.value); setLoaded(false); }}>
                <option value="">-- Select --</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.code ? ' (' + s.code + ')' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Term</label>
              <select className="form-input" value={selTerm}
                onChange={(e) => { setSelTerm(e.target.value); setLoaded(false); }}>
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Exam Type</label>
              <select className="form-input" value={selExamType}
                onChange={(e) => { setSelExamType(e.target.value); setLoaded(false); }}>
                {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              onClick={loadStudents}
              className="btn btn-primary"
              disabled={!selClass || !selSubject || loading}
            >
              {loading ? '⏳ Loading...' : '📥 Load Students'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Empty state before loading ─────────────────────── */}
      {!loaded && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p style={{ fontSize: '36px', marginBottom: '10px' }}>📝</p>
            Select a class and subject, then click &quot;Load Students&quot;to enter marks
          </div>
        </div>
      )}

      {/* ─── Marks Entry Table ──────────────────────────────── */}
      {loaded && students.length > 0 && (
        <>
          {/* ─── Statistics Bar ────────────────────────────── */}
          {enteredScores.length > 0 && (
            <div style={{
              display: 'flex', gap: '12px', marginBottom: '15px',
              flexWrap: 'wrap'
            }}>
              <div style={{
                background: '#e8f0fe', padding: '6px 14px', borderRadius: '20px',
                color: '#1a73e8', fontWeight: '600', fontSize: '13px'
              }}>
                📊 Entered: {enteredScores.length}/{students.length}
              </div>
              <div style={{
                background: '#e8f5e9', padding: '6px 14px', borderRadius: '20px',
                color: '#0d904f', fontWeight: '600', fontSize: '13px'
              }}>
                ✅ Pass (≥50): {passCount}
              </div>
              <div style={{
                background: '#ffebee', padding: '6px 14px', borderRadius: '20px',
                color: '#d32f2f', fontWeight: '600', fontSize: '13px'
              }}>
                {/* FIXED: Escaped < character to prevent JSX parsing error */}
                ❌ Fail (&lt;50): {failCount}
              </div>
              <div style={{
                background: '#f1f3f4', padding: '6px 14px', borderRadius: '20px',
                color: '#5f6368', fontWeight: '600', fontSize: '13px'
              }}>
                📈 Average: {avgScore}
              </div>
              <div style={{
                background: '#e8f5e9', padding: '6px 14px', borderRadius: '20px',
                color: '#0d904f', fontWeight: '600', fontSize: '13px'
              }}>
                ⬆️ Highest: {highestScore}
              </div>
              <div style={{
                background: '#ffebee', padding: '6px 14px', borderRadius: '20px',
                color: '#d32f2f', fontWeight: '600', fontSize: '13px'
              }}>
                ⬇️ Lowest: {lowestScore}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                📝 Marks Entry — {subjects.find(s => String(s.id) === String(selSubject)) ? subjects.find(s => String(s.id) === String(selSubject)).name : ''}
                {' (' + selExamType + ' — ' + selTerm + ')'}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleClearMarks}
                  className="btn btn-secondary"
                  style={{ padding: '5px 12px', fontSize: '12px', color: '#d32f2f', border: '1px solid #ef9a9a' }}
                >
                  🗑️ Clear All
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-primary"
                  style={{ padding: '5px 16px', fontSize: '12px' }}
                  disabled={saving || enteredScores.length === 0}
                >
                  {saving ? '⏳ Saving...' : '💾 Save All'}
                </button>
              </div>
            </div>
            <div className="card-body" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Student Name</th>
                    <th>Adm No</th>
                    <th>Gender</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Score (0-100)</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const score = marks[s.id];
                    const grade = score !== '' && score !== undefined && score !== null ? getGrade(score) : '';
                    const numScore = parseFloat(score);

                    return (
                      <tr key={s.id}>
                        <td style={{ color: '#999' }}>{i + 1}</td>
                        <td style={{ fontWeight: '600' }}>
                          {s.first_name} {s.last_name}
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          {s.admission_number || '-'}
                        </td>
                        <td>{s.gender === 'M' ? '👦' : '👧'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="text"
                            value={score !== undefined ? score : ''}
                            onChange={(e) => updateMark(s.id, e.target.value)}
                            placeholder="-"
                            style={{
                              width: '80px', padding: '5px 8px',
                              textAlign: 'center',
                              border: '1px solid ' + (
                                numScore >= 50 ? '#a5d6a7' :
                                  numScore < 50 && !isNaN(numScore) ? '#ef9a9a' :
                                    '#dadce0'
                              ),
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '600',
                              background: numScore >= 50 ? '#e8f5e9' :
                                numScore < 50 && !isNaN(numScore) ? '#ffebee' :
                                  'white',
                              color: numScore >= 50 ? '#0d904f' :
                                numScore < 50 && !isNaN(numScore) ? '#d32f2f' :
                                  '#333',
                              outline: 'none'
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {grade && grade !== '-' && (
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px',
                              background: numScore >= 50 ? '#e8f5e9' : '#ffebee',
                              color: numScore >= 50 ? '#0d904f' : '#d32f2f',
                              fontSize: '12px', fontWeight: '700'
                            }}>
                              {grade}
                            </span>
                          )}
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

      {/* ─── Empty state: no students ──────────────────────── */}
      {loaded && students.length === 0 && !loading && (
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
