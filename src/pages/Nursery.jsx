// FileName: src/pages/Nursery.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Nursery management — learning areas, assessments, reporting

import React, { useState, useEffect, useCallback, useRef } from 'react';

const NURSERY_AREAS = [
    'Language & Literacy Development',
    'Mathematical Thinking (Number Work)',
    'Environmental Knowledge (Discovery)',
    'Creative Arts & Expression',
    'Music & Movement',
    'Physical Development & Health',
    'Personal, Social & Emotional Development',
    'Religious & Moral Education',
    'Life Skills & Independent Living'
];

const ASSESSMENT_RATINGS = ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement', 'Not Yet'];

export default function Nursery() {
    // ─── State variables with proper defaults ──────────────
    const [tab, setTab] = useState('students');
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [selClass, setSelClass] = useState('');
    const [selStudent, setSelStudent] = useState('');
    const [assessmentForm, setAssessmentForm] = useState({
        area: '', term: 'Term 1', rating: 'Satisfactory', comments: ''
    });
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // ─── Refs ───────────────────────────────────────────────
    const mountedRef = useRef(true);

    // ─── Cleanup on unmount ─────────────────────────────────
    useEffect(function () {
        mountedRef.current = true;
        return function () { mountedRef.current = false; };
    }, []);

    // ─── Load nursery classes on mount ──────────────────────
    useEffect(function () {
        var cancelled = false;

        const loadClasses = async function () {
            if (!window.electronAPI || !window.electronAPI.queryDatabase) {
                if (mountedRef.current) setInitialLoading(false);
                return;
            }

            try {
                var r = await window.electronAPI.queryDatabase(
                    "SELECT id, name, level FROM classes WHERE level IN ('Nursery', 'Primary') ORDER BY name"
                );
                if (!cancelled && mountedRef.current) {
                    if (r && r.success && Array.isArray(r.data)) {
                        setClasses(r.data);
                    }
                }
            } catch (e) {
                if (!cancelled) return;
                console.error('Nursery: load classes error:', (e && e.message) ? e.message : 'Unknown');
            } finally {
                if (!cancelled && mountedRef.current) setInitialLoading(false);
            }
        };

        loadClasses();
        return function () { cancelled = true; };
    }, []);

    // ─── Load students when class is selected ─────────────────
    const loadStudents = useCallback(async function () {
        if (!selClass) {
            setStudents([]);
            return;
        }

        if (!window.electronAPI || !window.electronAPI.queryDatabase) return;

        setLoading(true);

        try {
            var r = await window.electronAPI.queryDatabase(
                "SELECT id, first_name, last_name, other_name, admission_number, gender, date_of_birth, class_id FROM students WHERE class_id = ? AND status = 'Active' ORDER BY first_name",
                [selClass]
            );
            if (!mountedRef.current) return;

            if (r && r.success && Array.isArray(r.data)) {
                setStudents(r.data);
            } else {
                setStudents([]);
            }
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('Nursery: load students error:', (e && e.message) ? e.message : 'Unknown');
            setStudents([]);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [selClass]);

    useEffect(function () {
        loadStudents();
    }, [loadStudents]);

    // ─── Load assessments when student is selected ────────────
    const loadAssessments = useCallback(async function () {
        if (!selStudent) {
            setAssessments([]);
            return;
        }

        if (!window.electronAPI || !window.electronAPI.queryDatabase) return;

        try {
            var r = await window.electronAPI.queryDatabase(
                "SELECT id, student_id, area, term, rating, comments, created_at FROM nursery_assessments WHERE student_id = ? ORDER BY term DESC, created_at DESC",
                [selStudent]
            );
            if (!mountedRef.current) return;
            if (r && r.success && Array.isArray(r.data)) {
                setAssessments(r.data);
            } else {
                setAssessments([]);
            }
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('Nursery: load assessments error:', (e && e.message) ? e.message : 'Unknown');
            setAssessments([]);
        }
    }, [selStudent]);

    useEffect(function () {
        loadAssessments();
    }, [loadAssessments]);

    // ─── Save assessment ──────────────────────────────────────
    const handleSaveAssessment = async function (e) {
        if (e && e.preventDefault) e.preventDefault();

        if (!selStudent) {
            setMsg('⚠️ Please select a student first');
            return;
        }
        if (!assessmentForm.area) {
            setMsg('⚠️ Please select a learning area');
            return;
        }

        setSaving(true);
        setMsg('');

        try {
            var r = await window.electronAPI.queryDatabase(
                "INSERT INTO nursery_assessments (student_id, area, term, rating, comments) VALUES (?, ?, ?, ?, ?)",
                [
                    parseInt(selStudent),
                    assessmentForm.area,
                    assessmentForm.term,
                    assessmentForm.rating,
                    assessmentForm.comments || ''
                ]
            );

            if (!mountedRef.current) return;

            if (r && r.success) {
                setMsg('✅ Assessment saved successfully!');
                setAssessmentForm({
                    area: '', term: 'Term 1', rating: 'Satisfactory', comments: ''
                });
                loadAssessments();
            } else {
                var errMsg = (r && r.error) ? r.error : 'Failed to save';
                setMsg('❌ ' + errMsg);
            }
        } catch (e) {
            if (!mountedRef.current) return;
            var errCatch = (e && e.message) ? e.message : 'Unknown error';
            console.error('Nursery: save assessment error:', errCatch);
            setMsg('❌ Error: ' + errCatch);
        } finally {
            if (mountedRef.current) setSaving(false);
        }

        setTimeout(function () {
            if (mountedRef.current) setMsg('');
        }, 4000);
    };

    // ─── Delete assessment ─────────────────────────────────────
    const handleDelete = async function (id) {
        if (!confirm('Delete this assessment record?')) return;

        try {
            await window.electronAPI.queryDatabase(
                "DELETE FROM nursery_assessments WHERE id = ?", [id]
            );
            if (!mountedRef.current) return;
            setMsg('🗑️ Assessment deleted');
            loadAssessments();
        } catch (e) {
            if (!mountedRef.current) return;
            setMsg('❌ Error: ' + ((e && e.message) ? e.message : 'Unknown'));
        }

        setTimeout(function () {
            if (mountedRef.current) setMsg('');
        }, 3000);
    };

    // ─── Get student name safely ──────────────────────────────
    const getStudentName = useCallback(function (id) {
        if (!id) return 'Select Student';
        var s = students.find(function (st) {
            return st && String(st.id) === String(id);
        });
        if (!s) return 'Unknown Student';
        return ((s.first_name || '') + ' ' + (s.last_name || '')).trim();
    }, [students]);

    // ─── Tab definitions ──────────────────────────────────────
    var tabs = [
        { key: 'students', label: 'Students' },
        { key: 'assessments', label: 'Assessments' },
        { key: 'reporting', label: 'Reporting' }
    ];

    // ─── Assessment rating colors ─────────────────────────────
    var ratingColors = {
        'Excellent': { bg: '#e8f5e9', color: '#0d904f' },
        'Good': { bg: '#e8f5e9', color: '#0d904f' },
        'Satisfactory': { bg: '#fff3e0', color: '#e65100' },
        'Needs Improvement': { bg: '#ffebee', color: '#d32f2f' },
        'Not Yet': { bg: '#ffcdd2', color: '#c62828' }
    };

    // ─── Derived values for reporting ──────────────────────────
    var boysCount = students.filter(function (s) { return s && s.gender === 'M'; }).length;
    var girlsCount = students.filter(function (s) { return s && s.gender === 'F'; }).length;

    // ─── Loading state ──────────────────────────────────────
    if (initialLoading) {
        return (
            <div className="page-container">
                <h1 className="page-title">🧒 Nursery Management</h1>
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
                        <p style={{ color: '#666' }}>Loading nursery data...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 className="page-title">🧒 Nursery Management</h1>

            {/* ─── Message ────────────────────────────────────────── */}
            {msg && (
                <p style={{
                    color: (msg.indexOf('❌') >= 0) ? '#c62828' :
                        (msg.indexOf('⚠️') >= 0) ? '#e65100' :
                            (msg.indexOf('⏳') >= 0) ? '#1a73e8' : '#0d904f',
                    marginBottom: '15px', padding: '10px 14px',
                    background: (msg.indexOf('❌') >= 0) ? '#ffebee' :
                        (msg.indexOf('⚠️') >= 0) ? '#fff3e0' :
                            (msg.indexOf('⏳') >= 0) ? '#e8f0fe' : '#e8f5e9',
                    borderRadius: '6px', fontWeight: 'bold'
                }}>
                    {msg}
                </p>
            )}

            {/* ─── Tabs ───────────────────────────────────────────── */}
            <div style={{
                display: 'flex', gap: '5px', marginBottom: '20px',
                borderBottom: '2px solid #dadce0', paddingBottom: '5px', flexWrap: 'wrap'
            }}>
                {tabs.map(function (t) {
                    return (
                        <button
                            key={t.key}
                            onClick={function () { setTab(t.key); }}
                            style={{
                                padding: '10px 20px', border: 'none',
                                background: tab === t.key ? '#1a73e8' : 'transparent',
                                color: tab === t.key ? 'white' : '#5f6368',
                                cursor: 'pointer', borderRadius: '4px 4px 0 0',
                                fontWeight: 600, textTransform: 'capitalize'
                            }}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* TAB: STUDENTS                                          */}
            {/* ═══════════════════════════════════════════════════════ */}
            {tab === 'students' && (
                <div>
                    {/* ─── Class Selection ───────────────────────────────── */}
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label className="form-label">Class / Section</label>
                            <select
                                className="form-input"
                                value={selClass}
                                onChange={function (e) { setSelClass(e.target.value); }}
                            >
                                <option value="">Select Class</option>
                                {classes.filter(function (c) { return c && c.level === 'Nursery'; }).map(function (c) {
                                    return <option key={c.id} value={String(c.id)}>{c.name}</option>;
                                })}
                            </select>
                        </div>
                        <button
                            onClick={loadStudents}
                            className="btn btn-primary"
                            style={{ width: 'auto', padding: '10px 20px', marginTop: '25px' }}
                            disabled={!selClass || loading}
                        >
                            {loading ? '⏳ Loading...' : '🔄 Load Students'}
                        </button>
                    </div>

                    {/* ─── Students Table ────────────────────────────────── */}
                    {students.length > 0 && (
                        <div className="card">
                            <div className="card-header">🧒 Nursery Students ({students.length})</div>
                            <div className="card-body" style={{ padding: 0 }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Adm No</th>
                                            <th>Gender</th>
                                            <th>DOB</th>
                                            <th>Guardian</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(function (s, i) {
                                            var id = (s && s.id) ? s.id : i;
                                            var firstName = (s && s.first_name) ? s.first_name : '';
                                            var lastName = (s && s.last_name) ? s.last_name : '';
                                            var admNo = (s && s.admission_number) ? s.admission_number : '-';
                                            var gender = (s && s.gender) ? s.gender : 'M';
                                            var dob = (s && s.date_of_birth) ? s.date_of_birth : '-';

                                            return (
                                                <tr key={id}>
                                                    <td style={{ fontWeight: '600' }}>{firstName} {lastName}</td>
                                                    <td style={{ fontSize: '12px' }}>{admNo}</td>
                                                    <td>{gender === 'M' ? '👦 Male' : '👧 Female'}</td>
                                                    <td style={{ fontSize: '12px' }}>{dob}</td>
                                                    <td style={{ fontSize: '12px' }}>-</td>
                                                    <td>
                                                        <button
                                                            onClick={function () {
                                                                setSelStudent(String(id));
                                                                setTab('assessments');
                                                            }}
                                                            className="btn btn-primary"
                                                            style={{ padding: '5px 12px', width: 'auto', fontSize: '12px', marginTop: 0 }}
                                                        >
                                                            📝 Assess
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ─── Empty state ──────────────────────────────────── */}
                    {students.length === 0 && selClass && !loading && (
                        <div className="card">
                            <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                <p style={{ fontSize: '36px', marginBottom: '10px' }}>🧒</p>
                                No nursery students in this class
                            </div>
                        </div>
                    )}

                    {/* ─── No class selected ─────────────────────────────── */}
                    {!selClass && (
                        <div className="card">
                            <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                <p style={{ fontSize: '36px', marginBottom: '10px' }}>📋</p>
                                Select a class above to view nursery students
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* TAB: ASSESSMENTS                                        */}
            {/* ═══════════════════════════════════════════════════════ */}
            {tab === 'assessments' && (
                <div style={{ display: 'flex', gap: '20px' }}>
                    {/* ─── Assessment Form ────────────────────────────────── */}
                    <div style={{ flex: 1 }} className="card">
                        <div className="card-header">
                            {selStudent ? '📝 Assess: ' + getStudentName(selStudent) : '📝 Select Student First'}
                        </div>
                        <div className="card-body">
                            {!selStudent ? (
                                <div className="form-group">
                                    <label className="form-label">Select Student</label>
                                    <select
                                        className="form-input"
                                        value={selStudent}
                                        onChange={function (e) { setSelStudent(e.target.value); }}
                                    >
                                        <option value="">Choose student...</option>
                                        {students.map(function (s) {
                                            return (
                                                <option key={s.id} value={String(s.id)}>
                                                    {(s.first_name || '')} {(s.last_name || '')} ({s.admission_number || 'No Adm'})
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {students.length === 0 && (
                                        <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                                            Go to the Students tab and load a class first.
                                        </p>
                                    )}
                                </div>
                            ) : null}

                            <form onSubmit={handleSaveAssessment}>
                                <div className="form-group">
                                    <label className="form-label">Learning Area *</label>
                                    <select
                                        className="form-input"
                                        value={assessmentForm.area}
                                        onChange={function (e) { setAssessmentForm({ ...assessmentForm, area: e.target.value }); }}
                                        required
                                        disabled={!selStudent}
                                    >
                                        <option value="">Select Area</option>
                                        {NURSERY_AREAS.map(function (a) {
                                            return <option key={a} value={a}>{a}</option>;
                                        })}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Term</label>
                                    <select
                                        className="form-input"
                                        value={assessmentForm.term}
                                        onChange={function (e) { setAssessmentForm({ ...assessmentForm, term: e.target.value }); }}
                                        disabled={!selStudent}
                                    >
                                        <option>Term 1</option>
                                        <option>Term 2</option>
                                        <option>Term 3</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Rating *</label>
                                    <select
                                        className="form-input"
                                        value={assessmentForm.rating}
                                        onChange={function (e) { setAssessmentForm({ ...assessmentForm, rating: e.target.value }); }}
                                        disabled={!selStudent}
                                    >
                                        {ASSESSMENT_RATINGS.map(function (r) {
                                            return <option key={r} value={r}>{r}</option>;
                                        })}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Comments</label>
                                    <textarea
                                        className="form-input"
                                        rows="3"
                                        value={assessmentForm.comments}
                                        onChange={function (e) { setAssessmentForm({ ...assessmentForm, comments: e.target.value }); }}
                                        placeholder="Observations, strengths, areas for improvement..."
                                        disabled={!selStudent}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={!selStudent || saving}
                                >
                                    {saving ? '⏳ Saving...' : '💾 Save Assessment'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* ─── Assessment History ────────────────────────────── */}
                    <div style={{ flex: 2 }} className="card">
                        <div className="card-header">
                            📋 Assessment History {assessments.length > 0 ? '(' + assessments.length + ')' : ''}
                        </div>
                        <div className="card-body">
                            {assessments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                                    <p style={{ fontSize: '36px', marginBottom: '10px' }}>📋</p>
                                    <p style={{ fontWeight: '600' }}>No Assessments Yet</p>
                                    <p style={{ fontSize: '12px' }}>Select a student and add assessments</p>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Area</th>
                                            <th>Term</th>
                                            <th>Rating</th>
                                            <th>Comments</th>
                                            <th>Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assessments.map(function (a, i) {
                                            var id = (a && a.id) ? a.id : i;
                                            var area = (a && a.area) ? a.area : '-';
                                            var term = (a && a.term) ? a.term : '-';
                                            var rating = (a && a.rating) ? a.rating : '-';
                                            var comments = (a && a.comments) ? a.comments : '-';
                                            var date = (a && a.created_at) ? String(a.created_at).slice(0, 19) : '-';

                                            var rc = ratingColors[rating] || { bg: '#f1f3f4', color: '#5f6368' };

                                            return (
                                                <tr key={id}>
                                                    <td style={{ fontWeight: '600' }}>{area}</td>
                                                    <td style={{ fontSize: '12px' }}>{term}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '3px 10px', borderRadius: '12px',
                                                            fontSize: '12px', fontWeight: '600',
                                                            background: rc.bg, color: rc.color
                                                        }}>
                                                            {rating}
                                                        </span>
                                                    </td>
                                                    <td style={{ maxWidth: '200px', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={comments}>
                                                        {comments}
                                                    </td>
                                                    <td style={{ fontSize: '11px' }}>{date}</td>
                                                    <td>
                                                        <button
                                                            onClick={function () { handleDelete(id); }}
                                                            style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* TAB: REPORTING                                         */}
            {/* ═══════════════════════════════════════════════════════ */}
            {tab === 'reporting' && (
                <div className="card">
                    <div className="card-header">📊 Nursery Reporting</div>
                    <div className="card-body">
                        {/* ─── Summary Cards ────────────────────────────────── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '10px', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1565c0' }}>{students.length}</div>
                                <div style={{ fontSize: '12px', color: '#5f6368' }}>Total Students</div>
                            </div>
                            <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '10px', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0d904f' }}>{boysCount}</div>
                                <div style={{ fontSize: '12px', color: '#5f6368' }}>Boys</div>
                            </div>
                            <div style={{ padding: '20px', background: '#fce4ec', borderRadius: '10px', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#c2185b' }}>{girlsCount}</div>
                                <div style={{ fontSize: '12px', color: '#5f6368' }}>Girls</div>
                            </div>
                            <div style={{ padding: '20px', background: '#fff3e0', borderRadius: '10px', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f57c00' }}>{assessments.length}</div>
                                <div style={{ fontSize: '12px', color: '#5f6368' }}>Assessments</div>
                            </div>
                        </div>

                        {/* ─── Learning Area Summary ────────────────────────── */}
                        <h3 style={{ marginBottom: '15px' }}>📊 Learning Area Summary</h3>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Learning Area</th>
                                    <th>Excellent</th>
                                    <th>Good</th>
                                    <th>Satisfactory</th>
                                    <th>Needs Improvement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {NURSERY_AREAS.map(function (area) {
                                    var areaAssessments = assessments.filter(function (a) {
                                        return a && a.area === area;
                                    });

                                    var excellent = areaAssessments.filter(function (a) { return a.rating === 'Excellent'; }).length;
                                    var good = areaAssessments.filter(function (a) { return a.rating === 'Good'; }).length;
                                    var satisfactory = areaAssessments.filter(function (a) { return a.rating === 'Satisfactory'; }).length;
                                    var needsImprovement = areaAssessments.filter(function (a) {
                                        return a.rating === 'Needs Improvement' || a.rating === 'Not Yet';
                                    }).length;

                                    return (
                                        <tr key={area}>
                                            <td>{area}</td>
                                            <td style={{ background: '#e8f5e9', textAlign: 'center' }}>{excellent}</td>
                                            <td style={{ background: '#e8f5e9', textAlign: 'center' }}>{good}</td>
                                            <td style={{ background: '#fff3e0', textAlign: 'center' }}>{satisfactory}</td>
                                            <td style={{ background: '#ffebee', textAlign: 'center' }}>{needsImprovement}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}