// FileName: src/pages/GenerateDocs.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Generate & print documents — report cards, letters, certificates, ID cards

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SchoolDocument } from '../utils/DocumentEngine.js';

export default function GenerateDocs() {
  const [tab, setTab] = useState('report');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [students, setStudents] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [school, setSchool] = useState({ /* no-op */ });
  const [signatures, setSignatures] = useState({ /* no-op */ });
  const [letterTo, setLetterTo] = useState('');
  const [letterSubject, setLetterSubject] = useState('');
  const [letterBody, setLetterBody] = useState('');
  const [certTitle, setCertTitle] = useState('Certificate of Achievement');
  const [certRecipient, setCertRecipient] = useState('');
  const [certBody, setCertBody] = useState('');

  const mountedRef = useRef(true);
  const msgTimerRef = useRef(null);

  useEffect(function () {
    mountedRef.current = true;
    return function () {
      mountedRef.current = false;
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, []);

  const showMessage = useCallback(function (text) {
    if (!mountedRef.current) return;
    setMsg(text);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 4000);
  }, []);

  // ─── Load all data ─────────────────────────────────────────
  const loadAll = useCallback(async function () {
    if (!window.electronAPI) {
      showMessage('❌ Electron API not available');
      setLoading(false);
      return;
    }

    try {
      // Load school registration
      var sRes = null;
      try {
        sRes = await window.electronAPI.queryDatabase("SELECT * FROM school_registration WHERE id = 1");
      } catch (e) { /* ignore */ }

      if (!mountedRef.current) return;

      var schoolData = (sRes && sRes.success && sRes.data && sRes.data[0]) ? { ...sRes.data[0] } : { /* no-op */ };

      // Load branding (motto, slogan, scripture)
      try {
        var stRes = await window.electronAPI.queryDatabase(
          "SELECT key, value FROM system_settings WHERE key IN ('school_motto','school_slogan','school_scripture','school_logo','school_badge')"
        );
        if (!mountedRef.current) return;

        if (stRes && stRes.success && stRes.data) {
          stRes.data.forEach(function (row) {
            if (row && row.key === 'school_motto') schoolData.motto = row.value;
            if (row && row.key === 'school_slogan') schoolData.slogan = row.value;
            if (row && row.key === 'school_scripture') schoolData.scripture = row.value;
          });
        }
      } catch (e) { /* ignore */ }

      // Load logo
      if (schoolData.school_logo) {
        try {
          var lp = await window.electronAPI.getPhoto(schoolData.school_logo);
          if (!mountedRef.current) return;
          if (lp && lp.success && lp.data) schoolData.logo = lp.data;
        } catch (e) { /* ignore */ }
      }

      // Load badge
      if (schoolData.school_badge) {
        try {
          var bp = await window.electronAPI.getPhoto(schoolData.school_badge);
          if (!mountedRef.current) return;
          if (bp && bp.success && bp.data) schoolData.badge = bp.data;
        } catch (e) { /* ignore */ }
      }

      if (!mountedRef.current) return;
      setSchool(schoolData);



      // Load students
      try {
        var srRes = await window.electronAPI.queryDatabase(
          "SELECT s.id, s.first_name, s.last_name, s.other_name, s.admission_number, s.gender, s.student_type, s.class_id, s.photo_path, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.status = 'Active' ORDER BY s.first_name"
        );
        if (!mountedRef.current) return;
        if (srRes && srRes.success) setStudents(srRes.data || []);
      } catch (e) { /* ignore */ }

      // Load signatures
      try {
        var sig = await window.electronAPI.getDocSignatures('report_card');
        if (!mountedRef.current) return;
        if (sig && sig.success) setSignatures(sig.data || { /* no-op */ });
      } catch (e) { /* signatures optional */ }

    } catch (err) {
      if (!mountedRef.current) return;
      console.error('GenerateDocs: load error:', (err && err.message) ? err.message : 'Unknown');
      showMessage('❌ Error loading data: ' + ((err && err.message) ? err.message : 'Unknown'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [showMessage]);

  useEffect(function () { loadAll(); }, [loadAll]);

  // ─── Get selected student ──────────────────────────────────
  const getSelectedStudent = useCallback(function () {
    if (!selectedStudent) return null;
    var found = students.find(function (s) {
      return s && String(s.id) === String(selectedStudent);
    });
    return found || null;
  }, [selectedStudent, students]);

  // ─── Generate report card ──────────────────────────────────
  const generateReportCard = async function () {
    var st = getSelectedStudent();
    if (!st) {
      showMessage('⚠️ Please select a student first');
      return;
    }

    setGenerating(true);

    try {
      // Load marks for this student
      var grades = [];
      try {
        var mRes = await window.electronAPI.queryDatabase(
          "SELECT m.score, s.name as subject_name, s.code FROM marks m JOIN subjects s ON m.subject_id = s.id WHERE m.student_id = ? AND m.term = ?",
          [st.id, term]
        );
        if (mRes && mRes.success && mRes.data) {
          grades = mRes.data.map(function (m) {
            var score = (m && m.score !== undefined && m.score !== null) ? m.score : 0;
            return {
              subject_name: (m && m.subject_name) ? m.subject_name : 'Unknown',
              score: score,
              remarks: ''
            };
          });
        }
      } catch (e) { /* marks optional */ }

      var doc = new SchoolDocument(school);
      doc.reportCard({
        student: st,
        cls: st.class_name || '',
        term: term,
        year: year,
        grades: grades,
        comments: { teacher: '', head: '' },
        teacherSig: (signatures.bottom_left && signatures.bottom_left.signature_image) ? signatures.bottom_left.signature_image : null,
        headSig: (signatures.bottom_right && signatures.bottom_right.signature_image) ? signatures.bottom_right.signature_image : null,
        boundary: 'primary'
      });

      showMessage('📄 Report card downloaded!');
    } catch (e) {
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  // ─── Generate letter ────────────────────────────────────────
  const generateLetter = async function () {
    if (!letterTo || !letterTo.trim()) {
      showMessage('⚠️ Please enter the recipient address');
      return;
    }

    setGenerating(true);

    try {
      var doc = new SchoolDocument(school);
      doc.letter({
        to: letterTo,
        subject: letterSubject || '',
        body: letterBody ? letterBody.split('\n') : [''],
        ref: 'REF/' + Date.now(),
        signatures: [
          { label: 'Head Teacher', name: (signatures.bottom_left && signatures.bottom_left.person_name) ? signatures.bottom_left.person_name : '', title: 'Signature' }
        ],
        boundary: 'letter'
      });
      showMessage('📄 Letter downloaded!');
    } catch (e) {
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  // ─── Generate certificate ──────────────────────────────────
  const generateCertificate = async function () {
    if (!certRecipient || !certRecipient.trim()) {
      showMessage('⚠️ Please enter the recipient name');
      return;
    }

    setGenerating(true);

    try {
      var doc = new SchoolDocument(school);
      doc.certificate({
        title: certTitle || 'CERTIFICATE OF ACHIEVEMENT',
        recipient: certRecipient,
        body: certBody ? certBody.split('\n') : ['This certificate is awarded in recognition of outstanding achievement.'],
        signatures: [
          { label: 'Head Teacher', name: (signatures.bottom_left && signatures.bottom_left.person_name) ? signatures.bottom_left.person_name : '', title: 'Signature' },
          { label: 'Chairperson', name: (signatures.bottom_right && signatures.bottom_right.person_name) ? signatures.bottom_right.person_name : '', title: 'Signature' }
        ],
        boundary: 'certificate'
      });
      showMessage('🏆 Certificate downloaded!');
    } catch (e) {
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  // ─── Generate ID card ──────────────────────────────────────
  const generateIDCard = async function (type) {
    if (type !== 'student') {
      showMessage('ℹ️ Only student ID cards are supported in this view. Use the ID Cards page for staff.');
      return;
    }

    var st = getSelectedStudent();
    if (!st) {
      showMessage('⚠️ Please select a student first');
      return;
    }

    setGenerating(true);

    try {
      // Load student photo
      var studentPhoto = null;
      if (st.photo_path) {
        try {
          var pp = await window.electronAPI.getPhoto(st.photo_path);
          if (pp && pp.success && pp.data) studentPhoto = pp.data;
        } catch (e) { /* ignore */ }
      }

      var doc = new SchoolDocument(school);
      doc.idCard({
        person: st,
        type: 'student',
        photo: studentPhoto,
        boundary: 'primary'
      });
      showMessage('🪪 ID card downloaded!');
    } catch (e) {
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  // ─── Tabs config ────────────────────────────────────────────
  var tabs = [
        { key: 'report', label: 'Report Card', icon: '📄' },
        { key: 'reqs', label: 'Req & Fees Form', icon: '📋' },
        { key: 'curr', label: 'Curriculum', icon: '📚' },
    { key: 'letter', label: 'Official Letter', icon: '✉️' },
    { key: 'cert', label: 'Certificate', icon: '🏆' },
    { key: 'idcard', label: 'ID Card', icon: '🪪' }
  ];

  var selectedStudentData = getSelectedStudent();

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">🖨️ Generate & Print Documents</h1>
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
            <p style={{ color: '#666' }}>Loading documents data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Generate &amp; Print Documents</h1>

      {/* --- Tab: Requirements & Fees Form --- */}
            {tab === 'reqs' && (
                <div style={{ maxWidth: '700px' }}>
                    <div className="card">
                        <div className="card-header">📋 School Requirements & Fees Form</div>
                        <div className="card-body">
                            <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                                Automatically generates a printable PDF containing the school's requirement list and fee structure for parents.
                            </p>
                            <button 
                                className="btn btn-primary" 
                                onClick={async function() {
                                    if (!window.electronAPI || !window.electronAPI.queryDatabase) return;
                                    try {
                                        var rRes = await window.electronAPI.queryDatabase("SELECT value FROM system_settings WHERE key = 'school_requirements'");
                                        var reqs = (rRes.success && rRes.data.length > 0) ? JSON.parse(rRes.data[0].value) : [];
                                        
                                        var fRes = await window.electronAPI.queryDatabase("SELECT c.name as class_name, fs.term, fs.amount FROM fees_structure fs JOIN classes c ON fs.class_id = c.id");
                                        var fees = (fRes.success) ? fRes.data : [];
                                        
                                        var { jsPDF } = window.jspdf;
                                        var doc = new jsPDF();
                                        doc.setFontSize(18);
                                        doc.text("Requirements & Fees Structure", 105, 20, { align: 'center' });
                                        
                                        var y = 35;
                                        doc.setFontSize(14);
                                        doc.text("Requirements Checklist:", 14, y);
                                        y += 8;
                                        doc.setFontSize(11);
                                        reqs.forEach(function(r, i) {
                                            if (y > 250) { doc.addPage(); y = 20; }
                                            doc.text(i+1 + ". " + r.name + " (" + r.section + ")", 16, y);
                                            doc.rect(150, y-4, 5, 5);
                                            y += 8;
                                        });

                                        y += 10;
                                        if (y > 250) { doc.addPage(); y = 20; }
                                        doc.setFontSize(14);
                                        doc.text("Fees Structure:", 14, y);
                                        y += 8;
                                        doc.setFontSize(11);
                                        doc.text("Class", 16, y); doc.text("Term 1", 80, y); doc.text("Term 2", 120, y); doc.text("Term 3", 160, y);
                                        y += 6;
                                        fees.forEach(function(f) {
                                            if (y > 270) { doc.addPage(); y = 20; }
                                            doc.text(f.class_name || '-', 16, y);
                                            doc.text(String(f.amount || 0), 80, y);
                                            y += 6;
                                        });

                                        doc.save('Requirements_and_Fees.pdf');
                                        showMessage('📄 Requirements & Fees Form downloaded!');
                                    } catch(e) { showMessage('Error: ' + e.message); }
                                }}
                            >
                                📄 Download Requirements & Fees PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Tab: Curriculum Template ──────────────────── */}
            {tab === 'curr' && (
                <div style={{ maxWidth: '700px' }}>
                    <div className="card">
                        <div className="card-header">📚 Curriculum / Syllabus Template</div>
                        <div className="card-body">
                            <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                                Generates a blank printable PDF template for teachers to fill in the termly curriculum/scheme of work.
                            </p>
                            <button 
                                className="btn btn-primary" 
                                onClick={function() {
                                    var { jsPDF } = window.jspdf;
                                    var doc = new jsPDF();
                                    doc.setFontSize(18);
                                    doc.text("Termly Curriculum / Scheme of Work", 105, 20, { align: 'center' });
                                    
                                    doc.setFontSize(11);
                                    doc.text("Class: ______________________", 14, 40);
                                    doc.text("Term: ______________________", 120, 40);
                                    doc.text("Subject: _____________________", 14, 50);
                                    doc.text("Teacher: _____________________", 120, 50);
                                    
                                    doc.setFontSize(12);
                                    doc.text("Week | Topic / Subtopic | Objectives | Activities | Materials", 14, 65);
                                    
                                    for (var i = 1; i<=13; i++) {
                                        doc.text(String(i), 16, 70 + (i*15));
                                        doc.line(22, 71 + (i*15), 196, 71 + (i*15)); // line for writing
                                    }
                                    
                                    doc.save('Curriculum_Template.pdf');
                                    showMessage('📚 Curriculum Template downloaded!');
                                }}
                            >
                                📚 Download Curriculum Template PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}


      {/* // FileName: src/pages/GenerateDocs.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Generate & print documents — report cards, letters, certificates, ID cards

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SchoolDocument } from '../utils/DocumentEngine.js';

export default function GenerateDocs() {
  const [tab, setTab] = useState('report');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [students, setStudents] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [school, setSchool] = useState({ /* no-op */ });
  const [signatures, setSignatures] = useState({ /* no-op */ });
  const [letterTo, setLetterTo] = useState('');
  const [letterSubject, setLetterSubject] = useState('');
  const [letterBody, setLetterBody] = useState('');
  const [certTitle, setCertTitle] = useState('Certificate of Achievement');
  const [certRecipient, setCertRecipient] = useState('');
  const [certBody, setCertBody] = useState('');

  const mountedRef = useRef(true);
  const msgTimerRef = useRef(null);

  useEffect(function () {
    mountedRef.current = true;
    return function () {
      mountedRef.current = false;
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, []);

  const showMessage = useCallback(function (text) {
    if (!mountedRef.current) return;
    setMsg(text);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 4000);
  }, []);

  // ─── Load all data ─────────────────────────────────────────
  const loadAll = useCallback(async function () {
    if (!window.electronAPI) {
      showMessage('❌ Electron API not available');
      setLoading(false);
      return;
    }

    try {
      // Load school registration
      var sRes = null;
      try {
        sRes = await window.electronAPI.queryDatabase("SELECT * FROM school_registration WHERE id = 1");
      } catch (e) { /* ignore */ }

      if (!mountedRef.current) return;

      var schoolData = (sRes && sRes.success && sRes.data && sRes.data[0]) ? { ...sRes.data[0] } : { /* no-op */ };

      // Load branding (motto, slogan, scripture)
      try {
        var stRes = await window.electronAPI.queryDatabase(
          "SELECT key, value FROM system_settings WHERE key IN ('school_motto','school_slogan','school_scripture','school_logo','school_badge')"
        );
        if (!mountedRef.current) return;

        if (stRes && stRes.success && stRes.data) {
          stRes.data.forEach(function (row) {
            if (row && row.key === 'school_motto') schoolData.motto = row.value;
            if (row && row.key === 'school_slogan') schoolData.slogan = row.value;
            if (row && row.key === 'school_scripture') schoolData.scripture = row.value;
          });
        }
      } catch (e) { /* ignore */ }

      // Load logo
      if (schoolData.school_logo) {
        try {
          var lp = await window.electronAPI.getPhoto(schoolData.school_logo);
          if (!mountedRef.current) return;
          if (lp && lp.success && lp.data) schoolData.logo = lp.data;
        } catch (e) { /* ignore */ }
      }

      // Load badge
      if (schoolData.school_badge) {
        try {
          var bp = await window.electronAPI.getPhoto(schoolData.school_badge);
          if (!mountedRef.current) return;
          if (bp && bp.success && bp.data) schoolData.badge = bp.data;
        } catch (e) { /* ignore */ }
      }

      if (!mountedRef.current) return;
      setSchool(schoolData);



      // Load students
      try {
        var srRes = await window.electronAPI.queryDatabase(
          "SELECT s.id, s.first_name, s.last_name, s.other_name, s.admission_number, s.gender, s.student_type, s.class_id, s.photo_path, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.status = 'Active' ORDER BY s.first_name"
        );
        if (!mountedRef.current) return;
        if (srRes && srRes.success) setStudents(srRes.data || []);
      } catch (e) { /* ignore */ }

      // Load signatures
      try {
        var sig = await window.electronAPI.getDocSignatures('report_card');
        if (!mountedRef.current) return;
        if (sig && sig.success) setSignatures(sig.data || { /* no-op */ });
      } catch (e) { /* signatures optional */ }

    } catch (err) {
      if (!mountedRef.current) return;
      console.error('GenerateDocs: load error:', (err && err.message) ? err.message : 'Unknown');
      showMessage('❌ Error loading data: ' + ((err && err.message) ? err.message : 'Unknown'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [showMessage]);

  useEffect(function () { loadAll(); }, [loadAll]);

  // ─── Get selected student ──────────────────────────────────
  const getSelectedStudent = useCallback(function () {
    if (!selectedStudent) return null;
    var found = students.find(function (s) {
      return s && String(s.id) === String(selectedStudent);
    });
    return found || null;
  }, [selectedStudent, students]);

  // ─── Generate report card ──────────────────────────────────
  const generateReportCard = async function () {
    var st = getSelectedStudent();
    if (!st) {
      showMessage('⚠️ Please select a student first');
      return;
    }

    setGenerating(true);

    try {
      // Load marks for this student
      var grades = [];
      try {
        var mRes = await window.electronAPI.queryDatabase(
          "SELECT m.score, s.name as subject_name, s.code FROM marks m JOIN subjects s ON m.subject_id = s.id WHERE m.student_id = ? AND m.term = ?",
          [st.id, term]
        );
        if (mRes && mRes.success && mRes.data) {
          grades = mRes.data.map(function (m) {
            var score = (m && m.score !== undefined && m.score !== null) ? m.score : 0;
            return {
              subject_name: (m && m.subject_name) ? m.subject_name : 'Unknown',
              score: score,
              remarks: ''
            };
          });
        }
      } catch (e) { /* marks optional */ }

      var doc = new SchoolDocument(school);
      doc.reportCard({
        student: st,
        cls: st.class_name || '',
        term: term,
        year: year,
        grades: grades,
        comments: { teacher: '', head: '' },
        teacherSig: (signatures.bottom_left && signatures.bottom_left.signature_image) ? signatures.bottom_left.signature_image : null,
        headSig: (signatures.bottom_right && signatures.bottom_right.signature_image) ? signatures.bottom_right.signature_image : null,
        boundary: 'primary'
      });

      showMessage('📄 Report card downloaded!');
    } catch (e) {
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  // ─── Generate letter ────────────────────────────────────────
  const generateLetter = async function () {
    if (!letterTo || !letterTo.trim()) {
      showMessage('⚠️ Please enter the recipient address');
      return;
    }

    setGenerating(true);

    try {
      var doc = new SchoolDocument(school);
      doc.letter({
        to: letterTo,
        subject: letterSubject || '',
        body: letterBody ? letterBody.split('\n') : [''],
        ref: 'REF/' + Date.now(),
        signatures: [
          { label: 'Head Teacher', name: (signatures.bottom_left && signatures.bottom_left.person_name) ? signatures.bottom_left.person_name : '', title: 'Signature' }
        ],
        boundary: 'letter'
      });
      showMessage('📄 Letter downloaded!');
    } catch (e) {
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  // ─── Generate certificate ──────────────────────────────────
  const generateCertificate = async function () {
    if (!certRecipient || !certRecipient.trim()) {
      showMessage('⚠️ Please enter the recipient name');
      return;
    }

    setGenerating(true);

    try {
      var doc = new SchoolDocument(school);
      doc.certificate({
        title: certTitle || 'CERTIFICATE OF ACHIEVEMENT',
        recipient: certRecipient,
        body: certBody ? certBody.split('\n') : ['This certificate is awarded in recognition of outstanding achievement.'],
        signatures: [
          { label: 'Head Teacher', name: (signatures.bottom_left && signatures.bottom_left.person_name) ? signatures.bottom_left.person_name : '', title: 'Signature' },
          { label: 'Chairperson', name: (signatures.bottom_right && signatures.bottom_right.person_name) ? signatures.bottom_right.person_name : '', title: 'Signature' }
        ],
        boundary: 'certificate'
      });
      showMessage('🏆 Certificate downloaded!');
    } catch (e) {
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  // ─── Generate ID card ──────────────────────────────────────
  const generateIDCard = async function (type) {
    if (type !== 'student') {
      showMessage('ℹ️ Only student ID cards are supported in this view. Use the ID Cards page for staff.');
      return;
    }

    var st = getSelectedStudent();
    if (!st) {
      showMessage('⚠️ Please select a student first');
      return;
    }

    setGenerating(true);

    try {
      // Load student photo
      var studentPhoto = null;
      if (st.photo_path) {
        try {
          var pp = await window.electronAPI.getPhoto(st.photo_path);
          if (pp && pp.success && pp.data) studentPhoto = pp.data;
        } catch (e) { /* ignore */ }
      }

      var doc = new SchoolDocument(school);
      doc.idCard({
        person: st,
        type: 'student',
        photo: studentPhoto,
        boundary: 'primary'
      });
      showMessage('🪪 ID card downloaded!');
    } catch (e) {
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  // ─── Tabs config ────────────────────────────────────────────
  var tabs = [
        { key: 'report', label: 'Report Card', icon: '📄' },
        { key: 'reqs', label: 'Req & Fees Form', icon: '📋' },
        { key: 'curr', label: 'Curriculum', icon: '📚' },
    { key: 'letter', label: 'Official Letter', icon: '✉️' },
    { key: 'cert', label: 'Certificate', icon: '🏆' },
    { key: 'idcard', label: 'ID Card', icon: '🪪' }
  ];

  var selectedStudentData = getSelectedStudent();

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">🖨️ Generate & Print Documents</h1>
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
            <p style={{ color: '#666' }}>Loading documents data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Generate &amp; Print Documents</h1>

      {/* --- Tab: Requirements & Fees Form --- */}
            {tab === 'reqs' && (
                <div style={{ maxWidth: '700px' }}>
                    <div className="card">
                        <div className="card-header">📋 School Requirements & Fees Form</div>
                        <div className="card-body">
                            <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                                Automatically generates a printable PDF containing the school's requirement list and fee structure for parents.
                            </p>
                            <button 
                                className="btn btn-primary" 
                                onClick={async function() {
                                    if (!window.electronAPI || !window.electronAPI.queryDatabase) return;
                                    try {
                                        var rRes = await window.electronAPI.queryDatabase("SELECT value FROM system_settings WHERE key = 'school_requirements'");
                                        var reqs = (rRes.success && rRes.data.length > 0) ? JSON.parse(rRes.data[0].value) : [];
                                        
                                        var fRes = await window.electronAPI.queryDatabase("SELECT c.name as class_name, fs.term, fs.amount FROM fees_structure fs JOIN classes c ON fs.class_id = c.id");
                                        var fees = (fRes.success) ? fRes.data : [];
                                        
                                        var { jsPDF } = window.jspdf;
                                        var doc = new jsPDF();
                                        doc.setFontSize(18);
                                        doc.text("Requirements & Fees Structure", 105, 20, { align: 'center' });
                                        
                                        var y = 35;
                                        doc.setFontSize(14);
                                        doc.text("Requirements Checklist:", 14, y);
                                        y += 8;
                                        doc.setFontSize(11);
                                        reqs.forEach(function(r, i) {
                                            if (y > 250) { doc.addPage(); y = 20; }
                                            doc.text(i+1 + ". " + r.name + " (" + r.section + ")", 16, y);
                                            doc.rect(150, y-4, 5, 5);
                                            y += 8;
                                        });

                                        y += 10;
                                        if (y > 250) { doc.addPage(); y = 20; }
                                        doc.setFontSize(14);
                                        doc.text("Fees Structure:", 14, y);
                                        y += 8;
                                        doc.setFontSize(11);
                                        doc.text("Class", 16, y); doc.text("Term 1", 80, y); doc.text("Term 2", 120, y); doc.text("Term 3", 160, y);
                                        y += 6;
                                        fees.forEach(function(f) {
                                            if (y > 270) { doc.addPage(); y = 20; }
                                            doc.text(f.class_name || '-', 16, y);
                                            doc.text(String(f.amount || 0), 80, y);
                                            y += 6;
                                        });

                                        doc.save('Requirements_and_Fees.pdf');
                                        showMessage('📄 Requirements & Fees Form downloaded!');
                                    } catch(e) { showMessage('Error: ' + e.message); }
                                }}
                            >
                                📄 Download Requirements & Fees PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Tab: Curriculum Template ──────────────────── */}
            {tab === 'curr' && (
                <div style={{ maxWidth: '700px' }}>
                    <div className="card">
                        <div className="card-header">📚 Curriculum / Syllabus Template</div>
                        <div className="card-body">
                            <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                                Generates a blank printable PDF template for teachers to fill in the termly curriculum/scheme of work.
                            </p>
                            <button 
                                className="btn btn-primary" 
                                onClick={function() {
                                    var { jsPDF } = window.jspdf;
                                    var doc = new jsPDF();
                                    doc.setFontSize(18);
                                    doc.text("Termly Curriculum / Scheme of Work", 105, 20, { align: 'center' });
                                    
                                    doc.setFontSize(11);
                                    doc.text("Class: ______________________", 14, 40);
                                    doc.text("Term: ______________________", 120, 40);
                                    doc.text("Subject: _____________________", 14, 50);
                                    doc.text("Teacher: _____________________", 120, 50);
                                    
                                    doc.setFontSize(12);
                                    doc.text("Week | Topic / Subtopic | Objectives | Activities | Materials", 14, 65);
                                    
                                    for (var i = 1; i<=13; i++) {
                                        doc.text(String(i), 16, 70 + (i*15));
                                        doc.line(22, 71 + (i*15), 196, 71 + (i*15)); // line for writing
                                    }
                                    
                                    doc.save('Curriculum_Template.pdf');
                                    showMessage('📚 Curriculum Template downloaded!');
                                }}
                            >
                                📚 Download Curriculum Template PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}


  return (
    <div className="page-container">
      <h1 className="page-title">🖨️ Generate & Print Documents</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <div style={{
          color: (msg.indexOf('Error') >= 0 || msg.indexOf('❌') >= 0) ? '#d93025' :
            (msg.indexOf('⚠️') >= 0) ? '#e65100' :
              (msg.indexOf('ℹ️') >= 0) ? '#1a73e8' : '#0d652d',
          marginBottom: '15px', fontSize: '14px',
          padding: '8px 12px',
          background: (msg.indexOf('Error') >= 0 || msg.indexOf('❌') >= 0) ? '#fce8e6' :
            (msg.indexOf('⚠️') >= 0) ? '#fff3e0' :
              (msg.indexOf('ℹ️') >= 0) ? '#e8f0fe' : '#e6f4ea',
          borderRadius: '6px'
        }}>
          {msg}
        </div>
      )}

      {/* ─── School branding info bar ──────────────────────── */}
      {school.school_name && (
        <div style={{
          background: '#e8f0fe', padding: '12px 20px', borderRadius: '8px',
          marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px'
        }}>
          {school.logo && <img src={school.logo} style={{ height: '30px' }} alt="Logo" />}
          {school.badge && <img src={school.badge} style={{ height: '30px' }} alt="Badge" />}
          <div>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>{school.school_name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {school.motto && <span>{school.motto}</span>}
              {school.scripture && <span> | {school.scripture}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tabs ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
        {tabs.map(function (t) {
          return (
            <button
              key={t.key}
              onClick={function () { setTab(t.key); }}
              style={{
                padding: '10px 20px', border: 'none',
                background: tab === t.key ? '#1a73e8' : 'transparent',
                color: tab === t.key ? 'white' : '#666',
                cursor: 'pointer', fontWeight: tab === t.key ? 600 : 400,
                fontSize: '13px',
                borderBottom: tab === t.key ? '2px solid #1a73e8' : '2px solid transparent',
                marginBottom: -2
              }}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── Tab: Report Card ──────────────────────────────── */}
      {tab === 'report' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
          <div className="card">
            <div className="card-header">📄 Report Card Options</div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Select Student</label>
                <select className="form-input" value={selectedStudent}
                  onChange={function (e) { setSelectedStudent(e.target.value); }}>
                  <option value="">-- Choose --</option>
                  {students.map(function (s) {
                    return (
                      <option key={s.id} value={String(s.id)}>
                        {(s.first_name || '')} {(s.last_name || '')} ({s.admission_number || s.class_name || ''})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Term</label>
                <select className="form-input" value={term}
                  onChange={function (e) { setTerm(e.target.value); }}>
                  <option>Term 1</option>
                  <option>Term 2</option>
                  <option>Term 3</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <input className="form-input" value={year}
                  onChange={function (e) { setYear(e.target.value); }} />
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
                onClick={generateReportCard}
                disabled={generating || !selectedStudent}
              >
                {generating ? '⏳ Generating...' : '📄 Download Report Card PDF'}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-header">👁️ Preview</div>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              {selectedStudentData ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e0e0e0', margin: '0 auto 10px' }} />
                  <h3>{selectedStudentData.first_name} {selectedStudentData.last_name}</h3>
                  <p style={{ color: '#666' }}>
                    {selectedStudentData.class_name || '-'} | {term} | {year}
                  </p>
                  <p style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>
                    Click Download to generate a PDF with school header, logo, motto, scripture, and assigned signatures.
                  </p>
                </div>
              ) : (
                <p style={{ color: '#999' }}>Select a student to preview</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Letter ───────────────────────────────────── */}
      {tab === 'letter' && (
        <div style={{ maxWidth: '700px' }}>
          <div className="card">
            <div className="card-header">✉️ Official Letter</div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">To (address)</label>
                <textarea className="form-input" rows="3" value={letterTo}
                  onChange={function (e) { setLetterTo(e.target.value); }}
                  placeholder={"The Head Teacher\nSt. Mary's School\nP.O. Box 123"} />
              </div>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" value={letterSubject}
                  onChange={function (e) { setLetterSubject(e.target.value); }}
                  placeholder="RE: Request for Transfer Certificate" />
              </div>
              <div className="form-group">
                <label className="form-label">Body (one paragraph per line)</label>
                <textarea className="form-input" rows="8" value={letterBody}
                  onChange={function (e) { setLetterBody(e.target.value); }}
                  placeholder="I write to request..." style={{ fontFamily: 'monospace', fontSize: '13px' }} />
              </div>
              <button className="btn btn-primary" onClick={generateLetter} disabled={generating}>
                {generating ? '⏳ Generating...' : '📄 Download Letter PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Certificate ──────────────────────────────── */}
      {tab === 'cert' && (
        <div style={{ maxWidth: '700px' }}>
          <div className="card">
            <div className="card-header">🏆 Certificate</div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Certificate Title</label>
                <input className="form-input" value={certTitle}
                  onChange={function (e) { setCertTitle(e.target.value); }}
                  placeholder="Certificate of Achievement" />
              </div>
              <div className="form-group">
                <label className="form-label">Recipient Name</label>
                <input className="form-input" value={certRecipient}
                  onChange={function (e) { setCertRecipient(e.target.value); }}
                  placeholder="John Doe" />
              </div>
              <div className="form-group">
                <label className="form-label">Body Text (one line per paragraph)</label>
                <textarea className="form-input" rows="4" value={certBody}
                  onChange={function (e) { setCertBody(e.target.value); }}
                  placeholder="For outstanding academic performance during the year" />
              </div>
              <button className="btn btn-primary" onClick={generateCertificate} disabled={generating}>
                {generating ? '⏳ Generating...' : '🏆 Download Certificate PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: ID Card ───────────────────────────────────── */}
      {tab === 'idcard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
          <div className="card">
            <div className="card-header">🪪 ID Card</div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Select Student</label>
                <select className="form-input" value={selectedStudent}
                  onChange={function (e) { setSelectedStudent(e.target.value); }}>
                  <option value="">-- Choose --</option>
                  {students.map(function (s) {
                    return <option key={s.id} value={String(s.id)}>{(s.first_name || '')} {(s.last_name || '')}</option>;
                  })}
                </select>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
                onClick={function () { generateIDCard('student'); }}
                disabled={generating || !selectedStudent}
              >
                {generating ? '⏳ Generating...' : '🪪 Download ID Card PDF'}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-header">👁️ Preview</div>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <p style={{ color: '#999' }}>ID cards are generated as landscape PDF cards with school header, student photo, details, and QR code placeholder.</p>
            </div>
          </div>
        </div>
      )}            {/* ─── Tab: Requirements & Fees Form ──────────────── */}
            {tab === 'reqs' && (
                <div style={{ maxWidth: '700px' }}>
                    <div className="card">
                        <div className="card-header">📋 School Requirements & Fees Form</div>
                        <div className="card-body">
                            <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                                Automatically generates a printable PDF containing the school's requirement list and fee structure for parents.
                            </p>
                            <button 
                                className="btn btn-primary" 
                                onClick={async function() {
                                    if (!window.electronAPI || !window.electronAPI.queryDatabase) return;
                                    try {
                                        var rRes = await window.electronAPI.queryDatabase("SELECT value FROM system_settings WHERE key = 'school_requirements'");
                                        var reqs = (rRes.success && rRes.data.length > 0) ? JSON.parse(rRes.data[0].value) : [];
                                        
                                        var fRes = await window.electronAPI.queryDatabase("SELECT c.name as class_name, fs.term, fs.amount FROM fees_structure fs JOIN classes c ON fs.class_id = c.id");
                                        var fees = (fRes.success) ? fRes.data : [];
                                        
                                        var { jsPDF } = window.jspdf;
                                        var doc = new jsPDF();
                                        doc.setFontSize(18);
                                        doc.text("Requirements & Fees Structure", 105, 20, { align: 'center' });
                                        
                                        var y = 35;
                                        doc.setFontSize(14);
                                        doc.text("Requirements Checklist:", 14, y);
                                        y += 8;
                                        doc.setFontSize(11);
                                        reqs.forEach(function(r, i) {
                                            if (y > 250) { doc.addPage(); y = 20; }
                                            doc.text(i+1 + ". " + r.name + " (" + r.section + ")", 16, y);
                                            doc.rect(150, y-4, 5, 5);
                                            y += 8;
                                        });

                                        y += 10;
                                        if (y > 250) { doc.addPage(); y = 20; }
                                        doc.setFontSize(14);
                                        doc.text("Fees Structure:", 14, y);
                                        y += 8;
                                        doc.setFontSize(11);
                                        doc.text("Class", 16, y); doc.text("Term 1", 80, y); doc.text("Term 2", 120, y); doc.text("Term 3", 160, y);
                                        y += 6;
                                        fees.forEach(function(f) {
                                            if (y > 270) { doc.addPage(); y = 20; }
                                            doc.text(f.class_name || '-', 16, y);
                                            doc.text(String(f.amount || 0), 80, y);
                                            y += 6;
                                        });

                                        doc.save('Requirements_and_Fees.pdf');
                                        showMessage('📄 Requirements & Fees Form downloaded!');
                                    } catch(e) { showMessage('Error: ' + e.message); }
                                }}
                            >
                                📄 Download Requirements & Fees PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Tab: Curriculum Template ──────────────────── */}
            {tab === 'curr' && (
                <div style={{ maxWidth: '700px' }}>
                    <div className="card">
                        <div className="card-header">📚 Curriculum / Syllabus Template</div>
                        <div className="card-body">
                            <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                                Generates a blank printable PDF template for teachers to fill in the termly curriculum/scheme of work.
                            </p>
                            <button 
                                className="btn btn-primary" 
                                onClick={function() {
                                    var { jsPDF } = window.jspdf;
                                    var doc = new jsPDF();
                                    doc.setFontSize(18);
                                    doc.text("Termly Curriculum / Scheme of Work", 105, 20, { align: 'center' });
                                    
                                    doc.setFontSize(11);
                                    doc.text("Class: ______________________", 14, 40);
                                    doc.text("Term: ______________________", 120, 40);
                                    doc.text("Subject: _____________________", 14, 50);
                                    doc.text("Teacher: _____________________", 120, 50);
                                    
                                    doc.setFontSize(12);
                                    doc.text("Week | Topic / Subtopic | Objectives | Activities | Materials", 14, 65);
                                    
                                    for (var i = 1; i<=13; i++) {
                                        doc.text(String(i), 16, 70 + (i*15));
                                        doc.line(22, 71 + (i*15), 196, 71 + (i*15)); // line for writing
                                    }
                                    
                                    doc.save('Curriculum_Template.pdf');
                                    showMessage('📚 Curriculum Template downloaded!');
                                }}
                            >
                                📚 Download Curriculum Template PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

    </div>
  );
}
