// FileName: src/pages/MilitaryGrades.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useRef } from 'react';

// A-Level subject combinations for Ugandan military schools
// FIXED: Removed duplicate subject codes within each combination
const COMBINATIONS = [
    { name: 'PCMB/PCME', subjects: ['545', '516', '535', '517'] },     // Physics, Math, Chemistry, Biology
    { name: 'PCME/MEGA', subjects: ['545', '516', '527', '517'] },     // Physics, Math, Geography, Biology
    { name: 'MEG/MEGA', subjects: ['545', '516', '527', '517'] },     // Math, Economics, Geography, Biology
    { name: 'HEG/HEA', subjects: ['517', '516', '527', '515'] },     // History, Economics, Geography, Agriculture
    { name: 'HEA/HED', subjects: ['517', '516', '527', '515'] },     // (same as above, alias)
    { name: 'PCA/PCME', subjects: ['535', '525', '545', '516'] },     // Physics, Chemistry, Math, Economics
    { name: 'MEA/MEGA', subjects: ['545', '516', '527', '517'] },     // Math, Economics, Agriculture, Geography
    { name: 'MUS/HEA', subjects: ['847', '565'] }                    // Music, Christian Religious Ed
];

// Known Ugandan military schools for quick setup
const MILITARY_SCHOOLS = [
    'Nkoma Senior Secondary School',
    "St. Mary's College Kisubi",
    'Mengo Senior Secondary School',
    'Kibuli Secondary School',
    'Buddo Secondary School',
    'Kampala Parents School',
    "St. Leo's College Kitende",
    'Ndejje University School',
    'Namilyango College',
    'Kampala Secondary School'
];

export default function MilitaryGrades() {
    const [tab, setTab] = useState('config');
    const [configs, setConfigs] = useState([]);
    const [config, setConfig] = useState({
        id: null, school_name: '', is_military: false, military_school: '', combination: 'PCMB/PCME'
    });
    const [students, setStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [protectedStudents, setProtectedStudents] = useState([]);
    const [protectedSubjectsMap, setProtectedSubjectsMap] = useState({ /* no-op */ });
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ─── Load configs on mount ─────────────────────────────────
    useEffect(() => {
        loadConfigs();
    }, []);

    // ─── Load protected students when tab changes ─────────────
    useEffect(() => {
        if (tab === 'protected') {
            fetchProtectedStudents();
        }
    }, [tab]);

    // ─── Load all military grade configs ──────────────────────
    const loadConfigs = async () => {
        try {
            const r = await window.electronAPI.queryDatabase(
                "SELECT * FROM military_grade_config ORDER BY id DESC"
            );
            if (!mountedRef.current) return;
            if (r && r.success) {
                setConfigs(r.data || []);
                // Set current config as the active one
                const current = (r.data || []).find(c => c.is_current === 1 || c.is_current === true);
                if (current) setConfig(current);
            }
        } catch (e) {
            console.error('MilitaryGrades: load configs error:', e.message);
        }
    };

    // ─── Save configuration ────────────────────────────────────
    const handleSaveConfig = async (e) => {
        e.preventDefault();

        // Validate
        if (!config.school_name.trim()) {
            setMsg('⚠️ School name is required');
            setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
            return;
        }

        setLoading(true);
        setMsg('Saving...');

        try {
            let result;
            if (config.id) {
                result = await window.electronAPI.queryDatabase(
                    "UPDATE military_grade_config SET school_name = ?, is_military = ?, military_school = ?, combination = ? WHERE id = ?",
                    [config.school_name, config.is_military ? 1 : 0, config.military_school, config.combination, config.id]
                );
            } else {
                // Set all existing configs to non-current, then insert new as current
                await window.electronAPI.queryDatabase("UPDATE military_grade_config SET is_current = 0");
                result = await window.electronAPI.queryDatabase(
                    "INSERT INTO military_grade_config (school_name, is_military, military_school, combination, is_current) VALUES (?, ?, ?, ?, 1)",
                    [config.school_name, config.is_military ? 1 : 0, config.military_school, config.combination]
                );
            }

            if (!mountedRef.current) return;

            if (result && result.success) {
                setMsg('✅ Configuration saved successfully!');
                loadConfigs();
            } else {
                setMsg('❌ ' + ((result && result.error) || 'Failed to save'));
            }
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('MilitaryGrades: save config error:', e.message);
            setMsg('❌ Error: ' + e.message);
        } finally {
            if (mountedRef.current) setLoading(false);
        }

        setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
    };

    // ─── Load all active students ──────────────────────────────
    const loadStudents = async () => {
        setListLoading(true);
        try {
            const r = await window.electronAPI.queryDatabase(
                "SELECT id, first_name, last_name, admission_number, gender FROM students WHERE status = 'Active' ORDER BY first_name"
            );
            if (!mountedRef.current) return;
            if (r && r.success) setStudents(r.data || []);
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('MilitaryGrades: load students error:', e.message);
            setMsg('❌ Error loading students: ' + e.message);
        } finally {
            if (mountedRef.current) setListLoading(false);
        }
    };

    // ─── Toggle student selection ─────────────────────────────
    const toggleStudent = (id) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // ─── Protect grades for selected students ──────────────────
    const handleProtectGrades = async () => {
        if (selectedStudents.length === 0) {
            setMsg('⚠️ Select at least one student first');
            setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
            return;
        }

        const combObj = COMBINATIONS.find(c => c.name === config.combination);
        if (!combObj) {
            setMsg('❌ No valid combination selected');
            return;
        }

        // FIXED: Remove duplicate subject codes (some combinations had duplicates)
        const uniqueSubjects = [...new Set(combObj.subjects)];

        if (!confirm('Protect grades for ' + selectedStudents.length + ' student(s)?\n\nCombination: ' + config.combination + '\nSubjects: ' + uniqueSubjects.length + ' unique codes')) {
            return;
        }

        setMsg('⏳ Protecting grades...');
        setLoading(true);

        try {
            let count = 0;
            for (const studentId of selectedStudents) {
                for (const code of uniqueSubjects) {
                    await window.electronAPI.queryDatabase(
                        "UPDATE marks SET is_military_protected = 1 WHERE student_id = ? AND subject_id = (SELECT id FROM subjects WHERE code = ?)",
                        [studentId, code]
                    );
                }
                count++;
            }

            if (!mountedRef.current) return;
            setMsg('✅ Protected ' + count + ' student(s) with ' + uniqueSubjects.length + ' subjects each');
            setSelectedStudents([]);
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('MilitaryGrades: protect error:', e.message);
            setMsg('❌ Error protecting grades: ' + e.message);
        } finally {
            if (mountedRef.current) setLoading(false);
        }

        setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
    };

    // ─── Fetch all protected students (optimized: single query) ──
    const fetchProtectedStudents = async () => {
        setListLoading(true);
        try {
            // Get students who have any protected marks
            const r = await window.electronAPI.queryDatabase(
                `SELECT s.id, s.first_name, s.last_name, s.admission_number, c.name as class_name
                 FROM students s
                 LEFT JOIN classes c ON s.class_id = c.id
                 WHERE EXISTS (
                     SELECT 1 FROM marks m WHERE m.student_id = s.id AND m.is_military_protected = 1
                 )
                 ORDER BY s.first_name`
            );

            if (!mountedRef.current) return;

            if (r && r.success) {
                const studentList = r.data || [];
                setProtectedStudents(studentList);

                // Fetch protected subjects for each student
                const map = { /* no-op */ };
                for (const student of studentList) {
                    try {
                        const subRes = await window.electronAPI.queryDatabase(
                            `SELECT sub.name FROM marks m
                             JOIN subjects sub ON m.subject_id = sub.id
                             WHERE m.student_id = ? AND m.is_military_protected = 1`,
                            [student.id]
                        );
                        if (subRes && subRes.success) {
                            map[student.id] = subRes.data.map(s => s.name);
                        }
                    } catch (e) {
                        console.error('MilitaryGrades: subject fetch error for student', student.id, e.message);
                    }
                }

                if (mountedRef.current) setProtectedSubjectsMap(map);
            }
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('MilitaryGrades: fetch protected error:', e.message);
            setMsg('❌ Error loading protected students: ' + e.message);
        } finally {
            if (mountedRef.current) setListLoading(false);
        }
    };

    // ─── Unprotect grades for one student ──────────────────────
    const handleUnprotectOne = async (studentId, studentName) => {
        const combObj = COMBINATIONS.find(c => c.name === config.combination);
        if (!combObj) {
            setMsg('❌ No valid combination selected in config');
            return;
        }

        const uniqueSubjects = [...new Set(combObj.subjects)];

        if (!confirm('Remove grade protection for ' + studentName + '?\n\nThis will unprotect ' + uniqueSubjects.length + ' subjects.')) {
            return;
        }

        setMsg('⏳ Unprotecting...');
        setLoading(true);

        try {
            for (const code of uniqueSubjects) {
                await window.electronAPI.queryDatabase(
                    "UPDATE marks SET is_military_protected = 0 WHERE student_id = ? AND subject_id = (SELECT id FROM subjects WHERE code = ?)",
                    [studentId, code]
                );
            }

            if (!mountedRef.current) return;
            setMsg('✅ Grade protection removed for ' + studentName);
            fetchProtectedStudents();
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('MilitaryGrades: unprotect error:', e.message);
            setMsg('❌ Error unprotecting: ' + e.message);
        } finally {
            if (mountedRef.current) setLoading(false);
        }

        setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
    };

    // ─── Loading state ──────────────────────────────────────────
    if (listLoading && tab !== 'config') {
        return (
            <div className="page-container">
                <h1 className="page-title">🎖️ Grade Protection Configuration</h1>
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
                        <p style={{ color: '#666' }}>Loading...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 className="page-title">🎖️ Grade Protection Configuration</h1>

            {/* ─── Message ────────────────────────────────────────── */}
            {msg && (
                <p style={{
                    color: msg.includes('❌') ? '#c62828' : (msg.includes('✅') ? '#0d904f' : (msg.includes('⚠️') ? '#e65100' : '#1a73e8')),
                    marginBottom: '15px',
                    fontWeight: 'bold',
                    padding: '10px 14px',
                    background: msg.includes('❌') ? '#ffebee' : (msg.includes('✅') ? '#e8f5e9' : (msg.includes('⚠️') ? '#fff3e0' : '#e8f0fe')),
                    borderRadius: '6px'
                }}>
                    {msg}
                </p>
            )}

            {/* ─── Tabs ───────────────────────────────────────────── */}
            <div style={{
                display: 'flex', gap: '5px', marginBottom: '20px',
                borderBottom: '2px solid #dadce0', paddingBottom: '5px'
            }}>
                {['config', 'protect', 'protected'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{
                            padding: '10px 20px', border: 'none',
                            background: tab === t ? '#1a73e8' : 'transparent',
                            color: tab === t ? 'white' : '#5f6368',
                            cursor: 'pointer', borderRadius: '4px 4px 0 0',
                            fontWeight: '600', textTransform: 'uppercase'
                        }}
                    >
                        {t === 'config' ? '⚙️ Config' : t === 'protect' ? '🛡️ Protect' : '📋 Protected'}
                    </button>
                ))}
            </div>

            {/* ─── Tab: Config ─────────────────────────────────────── */}
            {tab === 'config' && (
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {/* Config Form */}
                    <div style={{ flex: 1, minWidth: '350px' }} className="card">
                        <div className="card-header">{config.id ? '✏️ Edit' : '➕ New'} Configuration</div>
                        <div className="card-body">
                            <form onSubmit={handleSaveConfig}>
                                <div className="form-group">
                                    <label className="form-label">School Name *</label>
                                    <input
                                        className="form-input"
                                        value={config.school_name || ''}
                                        onChange={(e) => setConfig({ ...config, school_name: e.target.value })}
                                        placeholder="e.g. Namilyango College"
                                        required
                                    />
                                </div>

                                <div style={{
                                    padding: '15px',
                                    background: '#fff3e0',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    border: '2px solid #f9ab00'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="checkbox"
                                            checked={config.is_military === 1 || config.is_military === true}
                                            onChange={(e) => setConfig({ ...config, is_military: e.target.checked })}
                                            style={{ width: '20px', height: '20px' }}
                                            id="isMilitary"
                                        />
                                        <label htmlFor="isMilitary">Yes, this is a military/cadet school</label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Military School Name (If different)</label>
                                    <input
                                        className="form-input"
                                        value={config.military_school || ''}
                                        onChange={(e) => setConfig({ ...config, military_school: e.target.value })}
                                        placeholder="e.g. Nkoma SSS"
                                        disabled={!config.is_military}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">A-Level Combination *</label>
                                    <select
                                        className="form-input"
                                        value={config.combination || 'PCMB/PCME'}
                                        onChange={(e) => setConfig({ ...config, combination: e.target.value })}
                                        required
                                        disabled={!config.is_military}
                                    >
                                        {COMBINATIONS.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? '⏳ Saving...' : '💾 Save Config'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Quick Setup */}
                    <div style={{ flex: 1, minWidth: '350px' }} className="card">
                        <div className="card-header">🏫 Quick Setup (Uganda Military Schools)</div>
                        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <p style={{ width: '100%', color: '#666', fontSize: '13px', margin: '0 0 10px 0' }}>
                                Click a school name to auto-fill the config:
                            </p>
                            {MILITARY_SCHOOLS.map(school => (
                                <button
                                    key={school}
                                    type="button"
                                    onClick={() => setConfig({
                                        ...config,
                                        school_name: school,
                                        is_military: true,
                                        military_school: school
                                    })}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                    {school}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Saved Configurations */}
                    <div style={{ flex: '100%', minWidth: '350px' }} className="card">
                        <div className="card-header">📂 Saved Configurations</div>
                        <div className="card-body" style={{ padding: 0 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>School Name</th>
                                        <th>Military?</th>
                                        <th>Combination</th>
                                        <th>Current?</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {configs.length > 0 ? configs.map(c => (
                                        <tr key={c.id}>
                                            <td>{c.school_name}</td>
                                            <td>{c.is_military ? '✅ Yes' : '❌ No'}</td>
                                            <td>{c.combination}</td>
                                            <td>{c.is_current ? '⭐ Yes' : 'No'}</td>
                                            <td>
                                                <button
                                                    onClick={() => setConfig(c)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '4px 10px', fontSize: '12px' }}
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                                                No configurations saved yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Tab: Protect ────────────────────────────────────── */}
            {tab === 'protect' && (
                <div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <button
                            onClick={loadStudents}
                            className="btn btn-primary"
                            style={{ width: 'auto' }}
                        >
                            📥 Load All Active Students
                        </button>
                        <button
                            onClick={handleProtectGrades}
                            className="btn btn-primary"
                            style={{ width: 'auto', background: '#d32f2f' }}
                            disabled={loading || selectedStudents.length === 0}
                        >
                            🛡️ Protect Selected ({selectedStudents.length})
                        </button>
                    </div>

                    {students.length > 0 && (
                        <div className="card">
                            <div className="card-body" style={{ padding: 0 }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudents.length === students.length && students.length > 0}
                                                    onChange={(e) => setSelectedStudents(e.target.checked ? students.map(s => s.id) : [])}
                                                    style={{ width: '20px', height: '20px' }}
                                                />
                                            </th>
                                            <th>Adm No</th>
                                            <th>Student Name</th>
                                            <th>Gender</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(s => (
                                            <tr
                                                key={s.id}
                                                style={{
                                                    background: selectedStudents.includes(s.id) ? '#e8f0fe' : 'transparent'
                                                }}
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudents.includes(s.id)}
                                                        onChange={() => toggleStudent(s.id)}
                                                        style={{ width: '20px', height: '20px' }}
                                                    />
                                                </td>
                                                <td>{s.admission_number || '-'}</td>
                                                <td>{s.first_name} {s.last_name}</td>
                                                <td>{s.gender === 'M' ? '👦 M' : '👧 F'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Tab: Protected ──────────────────────────────────── */}
            {tab === 'protected' && (
                <div className="card">
                    <div className="card-header">🛡️ Currently Protected Students ({protectedStudents.length})</div>
                    <div className="card-body" style={{ padding: 0 }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Adm No</th>
                                    <th>Student Name</th>
                                    <th>Class</th>
                                    <th>Protected Subjects</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {protectedStudents.map(s => (
                                    <tr key={s.id}>
                                        <td>{s.admission_number}</td>
                                        <td>{s.first_name} {s.last_name}</td>
                                        <td>{s.class_name || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {(protectedSubjectsMap[s.id] || []).map((name, i) => (
                                                    <span key={i} style={{
                                                        padding: '2px 8px',
                                                        background: '#ffebee',
                                                        color: '#d32f2f',
                                                        borderRadius: '4px',
                                                        fontSize: '11px'
                                                    }}>
                                                        {name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleUnprotectOne(s.id, s.first_name + ' ' + s.last_name)}
                                                disabled={loading}
                                                style={{
                                                    color: '#d32f2f', border: '1px solid #ef9a9a',
                                                    background: 'white', cursor: 'pointer',
                                                    fontWeight: '600', fontSize: '12px',
                                                    padding: '4px 10px', borderRadius: '4px',
                                                    opacity: loading ? 0.5 : 1
                                                }}
                                            >
                                                🔓 Unprotect
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {protectedStudents.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                                            No students are currently protected.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
