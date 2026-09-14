// FileName: src/pages/ReportCards.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useRef } from 'react';
import { SchoolDocument } from '../utils/DocumentEngine.js';

const EXAM_TYPES = ['Beginning of Term', 'Mid Term', 'End of Term', 'Mock Examination'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export default function ReportCards() {
  const [classes, setClasses] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [selTerm, setSelTerm] = useState('Term 1');
  const [selExamType, setSelExamType] = useState('End of Term');
  const [students, setStudents] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [selStudent, setSelStudent] = useState(null);

  // Comment form state
  const [conductType, setConductType] = useState('Satisfactory');
  const [teacherComment, setTeacherComment] = useState('');
  const [headComment, setHeadComment] = useState('');

  // School branding data for SchoolDocument
  const [schoolData, setSchoolData] = useState({ /* no-op */ });
  const [signatures, setSignatures] = useState({ /* no-op */ });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load classes and school branding on mount ──
  useEffect(() => {
    const loadAll = async () => {
      try {
        // FIXED: Removed 'subjects' fetch as it was unused (subject_name is fetched directly in generateReportCard)
        const cRes = await window.electronAPI.queryDatabase("SELECT id, name, level FROM classes ORDER BY name");
        if (!mountedRef.current) return;
        if (cRes && cRes.success) setClasses(cRes.data || []);

        // Load school branding (motto, slogan, scripture, logo, badge)
        const stRes = await window.electronAPI.queryDatabase(
          "SELECT key, value FROM system_settings WHERE key IN ('school_name','school_motto','school_slogan','school_scripture','school_logo','school_badge')"
        );
        if (!mountedRef.current) return;

        const branding = { /* no-op */ };
        if (stRes && stRes.success && stRes.data) {
          stRes.data.forEach(row => {
            if (row.key) branding[row.key] = row.value;
          });
        }

        // Load logo and badge images
        if (branding.school_logo) {
          try {
            const lp = await window.electronAPI.getPhoto(branding.school_logo);
            if (lp && lp.success && lp.data) branding.logo = lp.data;
          } catch (e) { /* ignore */ }
        }
        if (branding.school_badge) {
          try {
            const bp = await window.electronAPI.getPhoto(branding.school_badge);
            if (bp && bp.success && bp.data) branding.badge = bp.data;
          } catch (e) { /* ignore */ }
        }

        if (!mountedRef.current) return;
        setSchoolData(branding);

        // Load signatures for report cards
        try {
          const sig = await window.electronAPI.getDocSignatures('report_card');
          if (!mountedRef.current) return;
          if (sig && sig.success) setSignatures(sig.data || { /* no-op */ });
        } catch (e) { /* signatures optional */ }
      } catch (e) {
        console.error('ReportCards: load error:', e.message);
      }
    };
    loadAll();
  }, []);

  // ─── Load students when class is selected ──────────────────
  const loadStudents = async () => {
    if (!selClass) return;

    setLoading(true);

    try {
      const sRes = await window.electronAPI.queryDatabase(
        "SELECT id, first_name, last_name, other_name, admission_number, gender, date_of_birth, admission_date, class_id, student_type FROM students WHERE class_id = ? AND status = 'Active' ORDER BY first_name",
        [selClass]
      );
      if (!mountedRef.current) return;
      if (sRes && sRes.success) setStudents(sRes.data || []);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('ReportCards: load students error:', e.message);
      setMsg('❌ Error loading students: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Generate report card for one student ──────────────────
  const generateReportCard = async (student) => {
    try {
      // Load marks for this student (includes exam_type filter)
      const mRes = await window.electronAPI.queryDatabase(
        "SELECT m.subject_id, m.score, s.name as subject_name FROM marks m JOIN subjects s ON m.subject_id = s.id WHERE m.student_id = ? AND m.term = ? AND m.exam_type = ?",
        [student.id, selTerm, selExamType]
      );

      // Build grades array
      const grades = [];
      if (mRes && mRes.success) {
        mRes.data.forEach(m => {
          grades.push({
            subject_name: m.subject_name,
            score: m.score,
            grade: getGrade(m.score),
            remarks: getRemark(m.score)
          });
        });
      }

      // Get class name
      const cls = classes.find(c => String(c.id) === String(student.class_id));
      const className = cls ? cls.name : '';

      // Determine boundary based on student level
      const boundary = cls ? (cls.level === 'Nursery' ? 'nursery' :
        (cls.level === 'Secondary' || cls.level === 'O_Level' || cls.level === 'A_Level') ? 'secondary' : 'primary') : 'primary';

      // Generate PDF using SchoolDocument
      const doc = new SchoolDocument(schoolData);
      doc.reportCard({
        student: student,
        cls: className,
        term: selTerm,
        year: String(new Date().getFullYear()),
        grades: grades,
        comments: {
          teacher: teacherComment || '',
          head: headComment || ''
        },
        teacherSig: signatures.bottom_left ? signatures.bottom_left.signature_image : null,
        headSig: signatures.bottom_right ? signatures.bottom_right.signature_image : null,
        boundary: boundary
      });

      if (!mountedRef.current) return;
      return true;
    } catch (e) {
      console.error('ReportCards: generate error for student', student.id, e.message);
      return false;
    }
  };

  // ─── Generate report card for selected student ─────────────
  const handleGenerateOne = async () => {
    if (!selStudent) {
      setMsg('⚠️ Please select a student first');
      return;
    }

    setGenerating(true);
    setMsg('⏳ Generating report card...');

    const success = await generateReportCard(selStudent);

    if (!mountedRef.current) return;
    setGenerating(false);

    if (success) {
      setMsg('📄 Report card downloaded for ' + selStudent.first_name + ' ' + selStudent.last_name);
    } else {
      setMsg('❌ Error generating report card');
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Generate report cards for ALL students ────────────────
  const handleGenerateAll = async () => {
    if (students.length === 0) {
      setMsg('⚠️ No students to generate for. Load students first.');
      return;
    }

    if (!confirm('Generate ' + students.length + ' report cards?\n\nEach will be downloaded as a separate PDF. Your browser may ask for permission to download multiple files.')) {
      return;
    }

    setGeneratingAll(true);
    setMsg('⏳ Generating ' + students.length + ' report cards...');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      setMsg('⏳ Generating ' + (i + 1) + ' of ' + students.length + ': ' + s.first_name + ' ' + s.last_name);

      const success = await generateReportCard(s);
      if (success) successCount++;
      else failCount++;

      // Delay between downloads to prevent browser blocking
      if (i < students.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    if (!mountedRef.current) return;
    setGeneratingAll(false);
    setMsg('✅ Generated ' + successCount + ' report cards' + (failCount > 0 ? ' (' + failCount + ' failed)' : ''));
    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 5000);
  };

  // ─── Grade calculation ─────────────────────────────────────
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

  // ─── Remark based on score ─────────────────────────────────
  function getRemark(score) {
    const n = parseFloat(score);
    if (isNaN(n)) return '';
    if (n >= 80) return 'Excellent';
    if (n >= 70) return 'Very Good';
    if (n >= 60) return 'Good';
    if (n >= 50) return 'Fair';
    if (n >= 45) return 'Pass';
    return 'Needs Improvement';
  }

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">📄 Report Cards</h1>
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
      <h1 className="page-title">📄 Report Cards</h1>

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Class *</label>
              <select className="form-input" value={selClass} onChange={(e) => setSelClass(e.target.value)}>
                <option value="">-- Select --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Term</label>
              <select className="form-input" value={selTerm} onChange={(e) => setSelTerm(e.target.value)}>
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Exam Type</label>
              <select className="form-input" value={selExamType} onChange={(e) => setSelExamType(e.target.value)}>
                {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={loadStudents} className="btn btn-primary" disabled={!selClass || loading}>
              {loading ? '⏳' : '📥 Load Students'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Student List (when no student selected) ────────── */}
      {students.length > 0 && !selStudent && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📋 Students ({students.length})</span>
            <button
              onClick={handleGenerateAll}
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '6px 16px', fontSize: '13px' }}
              disabled={generatingAll}
            >
              {generatingAll ? '⏳ Generating...' : '📄 Generate All PDFs'}
            </button>
          </div>
          <div className="card-body" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Adm No</th>
                  <th>Student Name</th>
                  <th>Gender</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: '#999' }}>{i + 1}</td>
                    <td>{s.admission_number || '-'}</td>
                    <td style={{ fontWeight: '600' }}>{s.first_name} {s.last_name}</td>
                    <td>{s.gender === 'M' ? '👦' : '👧'}</td>
                    <td>
                      <button
                        onClick={() => setSelStudent(s)}
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '6px 16px', fontSize: '13px' }}
                      >
                        ✏️ Customize & Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Comment Form (when student is selected) ───────── */}
      {selStudent && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              📄 Report Card for {selStudent.first_name} {selStudent.last_name}
            </span>
            <button
              onClick={() => setSelStudent(null)}
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '6px 16px', fontSize: '13px' }}
            >
              ← Back to List
            </button>
          </div>
          <div className="card-body">
            {/* ── Student Info ──────────────────────────── */}
            <div style={{
              background: '#e8f0fe', padding: '12px 16px', borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <strong>{selStudent.first_name} {selStudent.other_name ? selStudent.other_name + ' ' : ''}{selStudent.last_name}</strong>
              <span style={{ marginLeft: '12px', color: '#666', fontSize: '13px' }}>
                Adm: {selStudent.admission_number || 'N/A'} |
                Gender: {selStudent.gender === 'M' ? 'Male' : 'Female'} |
                Type: {selStudent.student_type || 'Day'}
              </span>
            </div>

            {/* ── Comment Fields ──────────────────────── */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '15px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                <label className="form-label">Conduct</label>
                <select className="form-input" value={conductType} onChange={(e) => setConductType(e.target.value)}>
                  <option value="Satisfactory">✅ Satisfactory</option>
                  <option value="Good">🌟 Good</option>
                  <option value="Fair">⚠️ Fair</option>
                  <option value="Poor">❌ Poor</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 2, minWidth: '300px' }}>
                <label className="form-label">Class Teacher Comment</label>
                <input
                  className="form-input"
                  value={teacherComment}
                  onChange={(e) => setTeacherComment(e.target.value)}
                  placeholder="Type teacher's comment here..."
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Head Teacher Comment</label>
              <input
                className="form-input"
                value={headComment}
                onChange={(e) => setHeadComment(e.target.value)}
                placeholder="Type head teacher's comment here..."
              />
            </div>

            {/* ── Info Note ────────────────────────────── */}
            <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
              📝 The report card will include: school header with logo/motto/scripture,
              student details, marks for {selTerm} ({selExamType}), totals, grades,
              conduct, comments, and assigned signatures.
            </p>

            {/* ── Download Button ──────────────────────── */}
            <button
              onClick={handleGenerateOne}
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontSize: '15px' }}
              disabled={generating}
            >
              {generating ? '⏳ Generating...' : '📄 Download Report Card PDF'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Empty state ─────────────────────────────────────── */}
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
