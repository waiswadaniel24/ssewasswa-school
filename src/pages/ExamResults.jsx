// FileName: src/pages/ExamResults.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: View exam results — student × subject score matrix with totals, averages, grades, rankings

import React, { useState, useEffect, useRef } from 'react';

const EXAM_TYPES = ['Beginning of Term', 'Mid Term', 'End of Term', 'Mock Examination'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];

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

function getGradeColor(grade) {
  if (grade.startsWith('D')) return { bg: '#e8f5e9', color: '#0d904f' };
  if (grade.startsWith('C')) return { bg: '#e8f0fe', color: '#1a73e8' };
  if (grade.startsWith('P')) return { bg: '#fff3e0', color: '#e65100' };
  return { bg: '#ffebee', color: '#d32f2f' };
}

export default function ExamResults() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [selTerm, setSelTerm] = useState('Term 1');
  const [selExamType, setSelExamType] = useState('End of Term');
  const [results, setResults] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
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
        console.error('ExamResults: load error:', e.message);
      }
    };
    loadAll();
  }, []);

  // ─── Load results (students + their marks per subject) ─────
  const loadResults = async () => {
    if (!selClass) {
      setMsg('⚠️ Please select a class');
      return;
    }

    setLoading(true);
    setLoaded(true);
    setMsg('');

    try {
      // Load students
      const sRes = await window.electronAPI.queryDatabase(
        "SELECT id, first_name, last_name, admission_number, gender FROM students WHERE class_id = ? AND status = 'Active' ORDER BY first_name",
        [selClass]
      );
      if (!mountedRef.current) return;

      if (!sRes || !sRes.success || sRes.data.length === 0) {
        setResults([]);
        setMsg('No active students in this class');
        return;
      }

      const studentList = sRes.data;

      // Load all marks for this class + term + exam_type
      const mRes = await window.electronAPI.queryDatabase(
        "SELECT student_id, subject_id, score FROM marks WHERE class_id = ? AND term = ? AND exam_type = ?",
        [selClass, selTerm, selExamType]
      );
      if (!mountedRef.current) return;

      // Build results: for each student, map subject_id → score
      const marksMap = { /* no-op */ };
      if (mRes && mRes.success) {
        mRes.data.forEach(m => {
          if (!marksMap[m.student_id]) marksMap[m.student_id] = { /* no-op */ };
          marksMap[m.student_id][m.subject_id] = m.score;
        });
      }

      // Calculate totals and averages for each student
      const resultsWithStats = studentList.map(s => {
        const studentMarks = marksMap[s.id] || { /* no-op */ };
        const scores = subjects.map(sub => {
          const score = studentMarks[sub.id];
          return score !== undefined ? parseFloat(score) : null;
        });

        const validScores = scores.filter(v => v !== null);
        const total = validScores.reduce((sum, v) => sum + v, 0);
        const avg = validScores.length > 0 ? (total / validScores.length) : 0;
        const grade = getGrade(avg);

        return {
          ...s,
          marks: studentMarks,
          scores: scores,
          total: total,
          avg: avg,
          grade: grade,
          subjectsCount: validScores.length
        };
      });

      // Sort by total DESC for ranking
      resultsWithStats.sort((a, b) => b.total - a.total);

      // Assign ranks
      resultsWithStats.forEach((r, i) => {
        r.rank = i + 1;
      });

      if (!mountedRef.current) return;
      setResults(resultsWithStats);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('ExamResults: load error:', e.message);
      setMsg('❌ Error loading results: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Print results ────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ─── Loading state ────────────────────────────────────────
  if (loading && results.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">📊 Exam Results</h1>
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
            <p style={{ color: '#666' }}>Loading results...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // ─── Class summary stats ──────────────────────────────────
  const classAvg = results.length > 0
    ? (results.reduce((sum, r) => sum + r.avg, 0) / results.length).toFixed(1)
    : '0.0';
  const passCount = results.filter(r => r.avg >= 50).length;
  const failCount = results.filter(r => r.avg < 50 && r.subjectsCount > 0).length;

  return (
    <div className="page-container">
      <h1 className="page-title">📊 Exam Results</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: msg.includes('❌') ? '#c62828' : (msg.includes('⚠️') ? '#e65100' : '#0d904f'),
          marginBottom: '15px', padding: '10px 14px',
          background: msg.includes('❌') ? '#ffebee' : (msg.includes('⚠️') ? '#fff3e0' : '#e8f5e9'),
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Selection Bar ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Class *</label>
              <select className="form-input" value={selClass}
                onChange={(e) => { setSelClass(e.target.value); setLoaded(false); }}>
                <option value="">-- Select --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <button
              onClick={loadResults}
              className="btn btn-primary"
              disabled={!selClass || loading}
            >
              {loading ? '⏳' : '📊 View Results'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Empty state before loading ─────────────────────── */}
      {!loaded && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p style={{ fontSize: '36px', marginBottom: '10px' }}>📊</p>
            Select a class and click &quot;View Results&quot; to see exam scores
          </div>
        </div>
      )}

      {/* ─── Results Summary ────────────────────────────────── */}
      {loaded && results.length > 0 && (
        <>
          <div style={{
            display: 'flex', gap: '12px', marginBottom: '15px',
            flexWrap: 'wrap', alignItems: 'center'
          }}>
            <div style={{
              background: '#e8f0fe', padding: '6px 14px', borderRadius: '20px',
              color: '#1a73e8', fontWeight: '600', fontSize: '13px'
            }}>
              👥 Students: {results.length}
            </div>
            <div style={{
              background: '#e8f5e9', padding: '6px 14px', borderRadius: '20px',
              color: '#0d904f', fontWeight: '600', fontSize: '13px'
            }}>
              📈 Class Average: {classAvg}
            </div>
            <div style={{
              background: '#e8f5e9', padding: '6px 14px', borderRadius: '20px',
              color: '#0d904f', fontWeight: '600', fontSize: '13px'
            }}>
              ✅ Pass (≥50): {passCount}
            </div>
            {failCount > 0 && (
              <div style={{
                background: '#ffebee', padding: '6px 14px', borderRadius: '20px',
                color: '#d32f2f', fontWeight: '600', fontSize: '13px'
              }}>
                ❌ Fail (&lt;50): {failCount}
              </div>
            )}
            <button
              onClick={handlePrint}
              className="btn btn-secondary"
              style={{ marginLeft: 'auto', padding: '6px 16px', fontSize: '13px' }}
            >
              🖨️ Print
            </button>
          </div>

          {/* ─── Results Table ──────────────────────────────── */}
          <div className="card">
            <div className="card-body" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: subjects.length * 80 + 300 + 'px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th>Student Name</th>
                    {subjects.map(sub => (
                      <th key={sub.id} style={{
                        textAlign: 'center',
                        fontSize: '10px',
                        minWidth: '70px',
                        whiteSpace: 'nowrap'
                      }} title={sub.name}>
                        {sub.code || sub.name.substring(0, 6)}
                      </th>
                    ))}
                    <th style={{ textAlign: 'center', background: '#f8f9fa' }}>Total</th>
                    <th style={{ textAlign: 'center', background: '#f8f9fa' }}>Avg</th>
                    <th style={{ textAlign: 'center', background: '#f8f9fa' }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.id} style={{
                      background: i % 2 === 0 ? 'transparent' : '#f8faff'
                    }}>
                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#1a73e8' }}>
                        {r.rank}
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        {r.first_name} {r.last_name}
                      </td>
                      {subjects.map(sub => {
                        const score = r.marks[sub.id];
                        const hasScore = score !== undefined && score !== null;
                        const numScore = parseFloat(score);
                        const grade = hasScore ? getGrade(score) : '';
                        const gc = hasScore ? getGradeColor(grade) : null;

                        return (
                          <td key={sub.id} style={{ textAlign: 'center' }}>
                            {hasScore ? (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 6px', borderRadius: '4px',
                                background: gc.bg, color: gc.color,
                                fontSize: '11px', fontWeight: '600',
                                minWidth: '32px'
                              }}>
                                {numScore}
                              </span>
                            ) : (
                              <span style={{ color: '#ccc', fontSize: '11px' }}>—</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{
                        textAlign: 'center', fontWeight: '700',
                        background: '#f8f9fa',
                        color: '#1a73e8'
                      }}>
                        {r.total}
                      </td>
                      <td style={{
                        textAlign: 'center', fontWeight: '700',
                        background: '#f8f9fa',
                        color: '#1a73e8'
                      }}>
                        {r.avg.toFixed(1)}
                      </td>
                      <td style={{
                        textAlign: 'center', background: '#f8f9fa'
                      }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: getGradeColor(r.grade).bg,
                          color: getGradeColor(r.grade).color,
                          fontSize: '11px', fontWeight: '700'
                        }}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* ─── Class Average Row ──────────────────────── */}
                <tfoot>
                  <tr style={{ background: '#e8f0fe', fontWeight: '700' }}>
                    <td colSpan="2" style={{ textAlign: 'right', padding: '10px 16px' }}>
                      📊 Class Average →
                    </td>
                    {subjects.map(sub => {
                      // Calculate average for this subject
                      const scores = results
                        .map(r => r.marks[sub.id])
                        .filter(v => v !== undefined && v !== null)
                        .map(v => parseFloat(v));
                      const avg = scores.length > 0
                        ? (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1)
                        : '-';
                      return (
                        <td key={sub.id} style={{ textAlign: 'center', color: '#1a73e8' }}>
                          {avg}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', color: '#1a73e8' }}>
                      {results.reduce((s, r) => s + r.total, 0)}
                    </td>
                    <td style={{ textAlign: 'center', color: '#1a73e8' }}>
                      {classAvg}
                    </td>
                    <td style={{ textAlign: 'center', color: '#1a73e8' }}>
                      {getGrade(parseFloat(classAvg))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ─── Legend ──────────────────────────────────────── */}
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: '#f8f9fa', borderRadius: '6px',
            fontSize: '12px', color: '#666',
            display: 'flex', gap: '16px', flexWrap: 'wrap'
          }}>
            <span style={{ color: '#0d904f' }}>D1-D2 = Distinction (75-100)</span>
            <span style={{ color: '#1a73e8' }}>C3-C6 = Credit (55-74)</span>
            <span style={{ color: '#e65100' }}>P7-P8 = Pass (45-54)</span>
            <span style={{ color: '#d32f2f' }}>F9 = Fail (below 45)</span>
          </div>
        </>
      )}

      {/* ─── Empty state: no results ──────────────────────── */}
      {loaded && results.length === 0 && !loading && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p style={{ fontSize: '36px', marginBottom: '10px' }}>📭</p>
            No results found for this class/term/exam type.
            <br />
            <span style={{ fontSize: '12px' }}>
              Make sure marks have been entered via the Exams page.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
