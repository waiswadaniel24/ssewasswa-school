// FileName: src/pages/BroadSheet.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

// ═══ UNEB AGGREGATE CALCULATOR ═══
function getUNEBAggregate(scores) {
  const sorted = scores.filter(s => s !== null && !isNaN(s)).sort((a, b) => a - b);
  if (sorted.length < 8) return 'N/A';
  const best8 = sorted.slice(0, 8);
  let totalPoints = 0;
  for (const score of best8) {
    if (score >= 80) totalPoints += 1;
    else if (score >= 75) totalPoints += 2;
    else if (score >= 70) totalPoints += 3;
    else if (score >= 65) totalPoints += 4;
    else if (score >= 60) totalPoints += 5;
    else if (score >= 55) totalPoints += 6;
    else if (score >= 50) totalPoints += 7;
    else if (score >= 45) totalPoints += 8;
    else totalPoints += 9;
  }
  let division = 'U';
  if (totalPoints <= 32) division = 'Div 1';
  else if (totalPoints <= 45) division = 'Div 2';
  else if (totalPoints <= 58) division = 'Div 3';
  else if (totalPoints <= 68) division = 'Div 4';
  return totalPoints + ' (' + division + ')';
}

export default function BroadSheet() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [selTerm, setSelTerm] = useState('Term 1');
  const [selExamType, setSelExamType] = useState('End of Term');
  const [rows, setRows] = useState([]);
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
    const fetchInitial = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          window.electronAPI.queryDatabase("SELECT id, name FROM classes ORDER BY name"),
          window.electronAPI.queryDatabase("SELECT id, name, code FROM subjects ORDER BY name")
        ]);
        if (!mountedRef.current) return;
        if (cRes && cRes.success) setClasses(cRes.data || []);
        if (sRes && sRes.success) setSubjects(sRes.data || []);
      } catch (e) {
        console.error('BroadSheet: fetch initial error:', e.message);
      }
    };
    fetchInitial();
  }, []);

  // ─── Generate broad sheet (FIXED: single JOIN query, not N×M) ──
  const generate = async () => {
    if (!selClass) {
      setMsg('⚠️ Please select a class');
      return;
    }

    setLoading(true);
    setMsg('');

    try {
      const res = await window.electronAPI.queryDatabase(
        `SELECT s.id, s.first_name, s.last_name, s.admission_number, s.gender,
                        m.subject_id, m.score
                 FROM students s
                 LEFT JOIN marks m ON s.id = m.student_id
                     AND m.term = ?
                     AND m.class_id = ?
                     AND m.exam_type = ?
                 WHERE s.class_id = ? AND s.status = 'Active'
                 ORDER BY s.first_name`,
        [selTerm, selClass, selExamType, selClass]
      );

      if (!mountedRef.current) return;

      if (!res || !res.success) {
        setRows([]);
        setMsg('❌ Error loading data');
        return;
      }

      // Pivot: group by student, map subject_id → score
      const studentMap = { /* no-op */ };
      const studentOrder = [];

      res.data.forEach(row => {
        if (!studentMap[row.id]) {
          studentMap[row.id] = {
            id: row.id,
            name: row.first_name + ' ' + row.last_name,
            admission_number: row.admission_number,
            gender: row.gender,
            marks: { /* no-op */ }
          };
          studentOrder.push(row.id);
        }

        if (row.subject_id !== null && row.score !== null) {
          studentMap[row.id].marks[row.subject_id] = parseFloat(row.score);
        }
      });

      // Calculate totals and averages
      const tableRows = studentOrder.map(id => {
        const s = studentMap[id];
        const scores = subjects.map(sub => s.marks[sub.id] !== undefined ? s.marks[sub.id] : null);
        const validScores = scores.filter(v => v !== null);
        const total = validScores.reduce((sum, v) => sum + v, 0);
        const avg = validScores.length > 0 ? (total / validScores.length) : 0;
        const grade = getGrade(avg);

        return {
          ...s,
          scores: scores,
          total: total,
          avg: avg,
          grade: grade,
          subjectsCount: validScores.length
        };
      });

      // Sort by total DESC for ranking
      tableRows.sort((a, b) => b.total - a.total);
      tableRows.forEach((r, i) => { r.rank = i + 1; });

      if (!mountedRef.current) return;
      setRows(tableRows);
      setLoaded(true);

      if (tableRows.length === 0) {
        setMsg('ℹ️ No students found in this class');
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('BroadSheet: generate error:', e.message);
      setMsg('❌ Error: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Print PDF with school header ──────────────────────────
  const printPDF = async () => {
    if (rows.length === 0) {
      setMsg('⚠️ No data to export. Generate the broad sheet first.');
      return;
    }

    try {
      // Fetch school name for the header
      let schoolName = 'School';
      try {
        const sRes = await window.electronAPI.queryDatabase(
          "SELECT value FROM system_settings WHERE key = 'school_name'"
        );
        if (sRes && sRes.success && sRes.data.length > 0) {
          schoolName = sRes.data[0].value || 'School';
        }
      } catch (e) { /* ignore */ }

      const className = classes.find(c => String(c.id) === String(selClass));
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 115, 232);
      doc.text(schoolName.toUpperCase(), 148, 14, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('CLASS BROAD SHEET', 148, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(
        'Class: ' + (className ? className.name : '') +
        '  |  Term: ' + selTerm +
        '  |  Exam: ' + selExamType +
        '  |  Date: ' + new Date().toLocaleDateString(),
        148, 26, { align: 'center' }
      );

      // Table
      const head = [['Rank', 'Name', 'Adm', 'M/F', ...subjects.map(s => s.code || s.name.substring(0, 6)), 'Total', 'Avg', 'Grade']];

      const body = rows.map(r => [
        String(r.rank),
        r.name,
        r.admission_number || '-',
        r.gender || '-',
        ...subjects.map(sub => {
          const score = r.marks[sub.id];
          return score !== undefined ? String(score) : '-';
        }),
        String(r.total),
        r.avg.toFixed(1),
        r.grade
      ]);

      doc.autoTable({
        head: head,
        body: body,
        startY: 30,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [26, 115, 232], textColor: 255, fontSize: 7, halign: 'center' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { cellWidth: 40 },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', cellWidth: 10 }
        },
        alternateRowStyles: { fillColor: [248, 249, 250] }
      });

      // Footer with class average
      const finalY = doc.lastAutoTable.finalY;
      const avgTotal = rows.reduce((s, r) => s + r.total, 0);
      const classAvg = rows.length > 0 ? (avgTotal / rows.length).toFixed(1) : '0.0';

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Class Average: ' + classAvg + '  |  Students: ' + rows.length + '  |  Pass: ' + rows.filter(r => r.avg >= 50).length + '  |  Fail: ' + rows.filter(r => r.avg < 50).length, 14, finalY + 8);

      doc.save('BroadSheet_' + (className ? className.name.replace(/\s/g, '_') : 'class') + '_' + selTerm.replace(/\s/g, '_') + '.pdf');

      if (!mountedRef.current) return;
      setMsg('📄 Broad sheet PDF downloaded');
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('BroadSheet: PDF error:', e.message);
      setMsg('❌ PDF error: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Loading state ────────────────────────────────────────
  if (loading && rows.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">📋 Broad Sheet & Ranking</h1>
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
            <p style={{ color: '#666' }}>Generating broad sheet...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📋 Broad Sheet & Ranking</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: msg.includes('❌') ? '#c62828' : (msg.includes('⚠️') ? '#e65100' : (msg.includes('ℹ️') ? '#1a73e8' : '#0d904f')),
          marginBottom: '15px', padding: '10px 14px',
          background: msg.includes('❌') ? '#ffebee' : (msg.includes('⚠️') ? '#fff3e0' : (msg.includes('ℹ️') ? '#e8f0fe' : '#e8f5e9')),
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Selection Bar ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '12px', alignItems: 'flex-end' }}>
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
              onClick={generate}
              className="btn btn-primary"
              disabled={!selClass || loading}
            >
              {loading ? '⏳' : '📊 Generate'}
            </button>
            <button
              onClick={printPDF}
              className="btn btn-secondary"
              disabled={rows.length === 0}
            >
              🖨️ Print PDF
            </button>
          </div>
        </div>
      </div>

      {/* ─── Empty state before generating ─────────────────── */}
      {!loaded && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p style={{ fontSize: '36px', marginBottom: '10px' }}>📋</p>
            Select a class and click &quot;Generate&quot; to view the broad sheet
          </div>
        </div>
      )}

      {/* ─── Results Table ──────────────────────────────────── */}
      {loaded && rows.length > 0 && (
        <>
          {/* ─── Summary ────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap'
          }}>
            <div style={{
              background: '#e8f0fe', padding: '6px 14px', borderRadius: '20px',
              color: '#1a73e8', fontWeight: '600', fontSize: '13px'
            }}>
              👥 Students: {rows.length}
            </div>
            <div style={{
              background: '#e8f5e9', padding: '6px 14px', borderRadius: '20px',
              color: '#0d904f', fontWeight: '600', fontSize: '13px'
            }}>
              ✅ Pass: {rows.filter(r => r.avg >= 50).length}
            </div>
            <div style={{
              background: '#ffebee', padding: '6px 14px', borderRadius: '20px',
              color: '#d32f2f', fontWeight: '600', fontSize: '13px'
            }}>
              ❌ Fail: {rows.filter(r => r.avg < 50 && r.subjectsCount > 0).length}
            </div>
            <div style={{
              background: '#f1f3f4', padding: '6px 14px', borderRadius: '20px',
              color: '#5f6368', fontWeight: '600', fontSize: '13px'
            }}>
              📈 Class Avg: {(rows.reduce((s, r) => s + r.avg, 0) / rows.length).toFixed(1)}
            </div>
          </div>

          <div className="card">
            <div className="card-body" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: subjects.length * 70 + 350 + 'px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>Rank</th>
                    <th>Student Name</th>
                    <th>Adm No</th>
                    <th style={{ width: '30px', textAlign: 'center' }}>M/F</th>
                    {subjects.map(sub => (
                      <th key={sub.id} style={{
                        textAlign: 'center', fontSize: '10px',
                        minWidth: '60px', whiteSpace: 'nowrap'
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
                  {rows.map((r, i) => (
                    <tr key={r.id} style={{
                      background: i % 2 === 0 ? 'transparent' : '#f8faff'
                    }}>
                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#1a73e8' }}>
                        {r.rank}
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        {r.name}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {r.admission_number || '-'}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '12px' }}>
                        {r.gender || '-'}
                      </td>
                      {subjects.map(sub => {
                        const score = r.marks[sub.id];
                        const hasScore = score !== undefined;
                        const numScore = parseFloat(score);
                        const isPass = hasScore && numScore >= 50;

                        return (
                          <td key={sub.id} style={{ textAlign: 'center' }}>
                            {hasScore ? (
                              <span style={{
                                padding: '2px 6px', borderRadius: '4px',
                                background: isPass ? '#e8f5e9' : '#ffebee',
                                color: isPass ? '#0d904f' : '#d32f2f',
                                fontSize: '11px', fontWeight: '600'
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
                        background: '#f8f9fa', color: '#1a73e8'
                      }}>
                        {r.total}
                      </td>
                      <td style={{
                        textAlign: 'center', fontWeight: '700',
                        background: '#f8f9fa', color: '#1a73e8'
                      }}>
                        {r.avg.toFixed(1)}
                      </td>
                      <td style={{ textAlign: 'center', background: '#f8f9fa' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: r.avg >= 50 ? '#e8f5e9' : '#ffebee',
                          color: r.avg >= 50 ? '#0d904f' : '#d32f2f',
                          fontSize: '11px', fontWeight: '700'
                        }}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── Empty state: no data ──────────────────────────── */}
      {loaded && rows.length === 0 && !loading && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p style={{ fontSize: '36px', marginBottom: '10px' }}>📭</p>
            No students or marks found for this class/term/exam type.
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
