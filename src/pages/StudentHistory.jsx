// FileName: src/pages/StudentHistory.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Student history — timeline events and parent/guardian profile management

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function StudentHistory() {
    const auth = useAuth();
    const [students, setStudents] = useState([]);
    const [selected, setSelected] = useState('');
    const [timeline, setTimeline] = useState([]);
    const [parents, setParents] = useState([]);
    const [tab, setTab] = useState('timeline');
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [saving, setSaving] = useState(false);
    const [addForm, setAddForm] = useState({ event_type: 'General', description: '' });
    const [parentForm, setParentForm] = useState({
        parent_name: '', relationship: '', phone: '', phone2: '',
        email: '', occupation: '', residence: ''
    });

    const mountedRef = useRef(true);
    const msgTimerRef = useRef(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
        };
    }, []);

    // ─── Show timed message (auto-clears after 4 seconds) ──────
    const showMessage = useCallback((text) => {
        if (!mountedRef.current) return;
        setMsg(text);
        if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
        msgTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setMsg('');
        }, 4000);
    }, []);

    // ─── Load students list on mount ───────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function loadStudents() {
            try {
                const res = await window.electronAPI.queryDatabase(
                    "SELECT id, first_name, last_name, admission_number, class_id FROM students WHERE status = 'Active' ORDER BY first_name"
                );
                if (!cancelled && mountedRef.current && res && res.success) {
                    setStudents(res.data || []);
                }
            } catch (err) {
                console.error('StudentHistory: load students error:', err.message);
                if (!cancelled && mountedRef.current) {
                    showMessage('❌ Error loading students');
                }
            } finally {
                if (!cancelled && mountedRef.current) {
                    setLoading(false);
                }
            }
        }

        loadStudents();
        return () => { cancelled = true; };
    }, [showMessage]);

    // ─── Load timeline + parents when student is selected ──────
    useEffect(() => {
        if (!selected) {
            setTimeline([]);
            setParents([]);
            return;
        }

        const studentId = parseInt(selected);
        if (isNaN(studentId)) return;

        let cancelled = false;

        async function loadStudentData() {
            try {
                const [timelineRes, parentsRes] = await Promise.all([
                    window.electronAPI.getStudentTimeline(studentId),
                    window.electronAPI.getParents(studentId)
                ]);

                if (cancelled || !mountedRef.current) return;

                if (timelineRes && timelineRes.success) setTimeline(timelineRes.data || []);
                if (parentsRes && parentsRes.success) setParents(parentsRes.data || []);
            } catch (err) {
                console.error('StudentHistory: load student data error:', err.message);
                if (!cancelled && mountedRef.current) {
                    showMessage('❌ Error loading student data');
                }
            }
        }

        loadStudentData();
        return () => { cancelled = true; };
    }, [selected, showMessage]);

    // ─── Get selected student object ────────────────────────────
    const getStudent = useCallback(() => {
        if (!selected) return null;
        return students.find(s => String(s.id) === selected) || null;
    }, [selected, students]);

    // ─── Add timeline event ────────────────────────────────────
    const handleAddEvent = async () => {
        if (!selected) {
            showMessage('Please select a student first');
            return;
        }
        if (!addForm.description.trim()) {
            showMessage('Please enter a description');
            return;
        }

        setSaving(true);
        try {
            const studentId = parseInt(selected);
            const r = await window.electronAPI.addTimelineEvent({
                student_id: studentId,
                event_type: addForm.event_type,
                event_date: new Date().toISOString().slice(0, 10),
                description: addForm.description.trim(),
                recorded_by: auth.user ? auth.user.id : null
            });

            if (!mountedRef.current) return;

            if (r && r.success) {
                // Reload timeline
                const tr = await window.electronAPI.getStudentTimeline(studentId);
                if (mountedRef.current && tr && tr.success) setTimeline(tr.data || []);
                setAddForm({ event_type: 'General', description: '' });
                setTab('timeline');
                showMessage('✅ Event recorded successfully');
            } else {
                showMessage('❌ ' + ((r && r.error) || 'Failed to save event'));
            }
        } catch (err) {
            console.error('StudentHistory: add event error:', err.message);
            if (mountedRef.current) showMessage('❌ Error: ' + err.message);
        } finally {
            if (mountedRef.current) setSaving(false);
        }
    };

    // ─── Save parent/guardian ──────────────────────────────────
    const handleSaveParent = async () => {
        if (!selected) {
            showMessage('Please select a student first');
            return;
        }
        if (!parentForm.parent_name.trim()) {
            showMessage('Please enter parent/guardian name');
            return;
        }
        if (!parentForm.relationship) {
            showMessage('Please select relationship');
            return;
        }

        setSaving(true);
        try {
            const studentId = parseInt(selected);
            const r = await window.electronAPI.saveParent({
                ...parentForm,
                student_id: studentId
            });

            if (!mountedRef.current) return;

            if (r && r.success) {
                // Reload parents
                const pr = await window.electronAPI.getParents(studentId);
                if (mountedRef.current && pr && pr.success) setParents(pr.data || []);
                setParentForm({
                    parent_name: '', relationship: '', phone: '', phone2: '',
                    email: '', occupation: '', residence: ''
                });
                showMessage('✅ Parent/guardian saved successfully');
            } else {
                showMessage('❌ ' + ((r && r.error) || 'Failed to save parent'));
            }
        } catch (err) {
            console.error('StudentHistory: save parent error:', err.message);
            if (mountedRef.current) showMessage('❌ Error: ' + err.message);
        } finally {
            if (mountedRef.current) setSaving(false);
        }
    };

    // ─── Delete parent/guardian ───────────────────────────────
    const handleDeleteParent = async (id) => {
        if (!confirm('Remove this parent/guardian from the student record?')) return;

        try {
            const r = await window.electronAPI.deleteParent(id);

            if (!mountedRef.current) return;

            if (r && r.success) {
                const studentId = parseInt(selected);
                if (!isNaN(studentId)) {
                    const pr = await window.electronAPI.getParents(studentId);
                    if (mountedRef.current && pr && pr.success) setParents(pr.data || []);
                }
                showMessage('✅ Parent/guardian removed');
            } else {
                showMessage('❌ Error removing parent/guardian');
            }
        } catch (err) {
            console.error('StudentHistory: delete parent error:', err.message);
            if (mountedRef.current) showMessage('❌ Error: ' + err.message);
        }
    };

    // ─── Event type colors (keys must match <option> values exactly) ──
    const typeColors = {
        'General': '#546e7a',
        'Admission': '#1a73e8',
        'Enrollment': '#0d904f',
        'Grade Change': '#7b1fa2',
        'Discipline': '#d32f2f',
        'Achievement': '#f57c00',
        'Transfer': '#00838f',
        'Medical': '#c62828',
        'Attendance': '#2e7d32',
        'Fee Payment': '#1565c0',
        'Promotion': '#2e7d32',
        'Certificate': '#f57c00'
    };

    const selectedStudent = getStudent();

    // ─── Loading state ──────────────────────────────────────────
    if (loading) {
        return (
            <div className="page-container">
                <h1 className="page-title">Student History & Parents</h1>
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

    // ─── Tab definitions ──────────────────────────────────────
    const tabs = [
        { key: 'timeline', label: 'Timeline' },
        { key: 'parents', label: 'Parent Profiles' },
        { key: 'add', label: '+ Add Event' }
    ];

    // ─── Relationship options ──────────────────────────────────
    const relationships = ['Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Sibling', 'Other'];

    // ─── Event type options (must match typeColors keys) ──────
    const eventTypes = Object.keys(typeColors);

    return (
        <div className="page-container">
            <h1 className="page-title">Student History & Parents</h1>

            {/* ─── Message ────────────────────────────────────────── */}
            {msg && (
                <div style={{
                    color: msg.indexOf('❌') >= 0 || msg.indexOf('Error') >= 0 ? '#d93025' : '#0d652d',
                    marginBottom: '15px', fontSize: '13px',
                    padding: '8px 12px',
                    background: msg.indexOf('❌') >= 0 || msg.indexOf('Error') >= 0 ? '#fce8e6' : '#e6f4ea',
                    borderRadius: '6px',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    {msg}
                </div>
            )}

            {/* ─── Student Selector ────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="form-label">Select Student</label>
                    <select
                        className="form-input"
                        style={{ minWidth: '300px' }}
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                    >
                        <option value="">-- Choose student --</option>
                        {students.map(s => (
                            <option key={s.id} value={String(s.id)}>
                                {s.first_name} {s.last_name} ({s.admission_number || 'No Adm'})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ─── Selected Student Info Bar ──────────────────────── */}
            {selectedStudent && (
                <div style={{
                    background: '#e8f0fe',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    display: 'flex',
                    gap: '24px',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    <strong style={{ fontSize: '15px' }}>
                        {selectedStudent.first_name} {selectedStudent.last_name}
                    </strong>
                    <span style={{ color: '#666', fontSize: '13px' }}>
                        ADM: {selectedStudent.admission_number || 'N/A'}
                    </span>
                    <span style={{ color: '#666', fontSize: '13px' }}>
                        📅 Timeline events: <strong>{timeline.length}</strong>
                    </span>
                    <span style={{ color: '#666', fontSize: '13px' }}>
                        👨‍👩‍👧 Parents: <strong>{parents.length}</strong>
                    </span>
                </div>
            )}

            {/* ─── Empty state when no student selected ───────────── */}
            {!selected && (
                <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        <p style={{ fontSize: '36px', margin: '0 0 10px 0' }}>👆</p>
                        Select a student above to view their history and parent information
                    </div>
                </div>
            )}

            {/* ─── Tabs ───────────────────────────────────────────── */}
            {selected && (
                <div style={{
                    display: 'flex', gap: 0, marginBottom: '20px',
                    borderBottom: '2px solid #e0e0e0'
                }}>
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{
                                padding: '10px 20px',
                                border: 'none',
                                background: tab === t.key ? '#1a73e8' : 'transparent',
                                color: tab === t.key ? 'white' : '#666',
                                cursor: 'pointer',
                                fontWeight: tab === t.key ? 600 : 400,
                                fontSize: '13px',
                                borderBottom: tab === t.key ? '2px solid #1a73e8' : '2px solid transparent',
                                marginBottom: -2
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            )}

            {/* ─── Tab: Timeline ─────────────────────────────────── */}
            {selected && tab === 'timeline' && (
                <div className="card">
                    <div className="card-header">📅 Timeline ({timeline.length} events)</div>
                    <div className="card-body">
                        {timeline.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
                                No events recorded yet. Switch to &quot;+ Add Event&quot; tab to record one.
                            </p>
                        )}
                        {timeline.map(ev => {
                            const color = typeColors[ev.event_type] || '#546e7a';
                            return (
                                <div key={ev.id} style={{
                                    display: 'flex', gap: '16px',
                                    padding: '12px 0',
                                    borderBottom: '1px solid #f0f0f0'
                                }}>
                                    {/* Color bar */}
                                    <div style={{
                                        width: '4px',
                                        borderRadius: '2px',
                                        background: color,
                                        minHeight: '50px',
                                        flexShrink: 0
                                    }} />
                                    {/* Content */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '4px'
                                        }}>
                                            <span style={{ fontWeight: '600', fontSize: '13px', color }}>
                                                {ev.event_type}
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#999' }}>
                                                {ev.event_date ? String(ev.event_date).slice(0, 10) : ''}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '13px', color: '#333', margin: 0 }}>
                                            {ev.description}
                                        </p>
                                        {ev.recorded_by_name && (
                                            <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0 0' }}>
                                                📝 Recorded by: {ev.recorded_by_name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── Tab: Parents ──────────────────────────────────── */}
            {selected && tab === 'parents' && (
                <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
                    {/* ─── Add Parent Form ───────────────────────────── */}
                    <div className="card">
                        <div className="card-header">➕ Add Parent/Guardian</div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input
                                    className="form-input"
                                    value={parentForm.parent_name}
                                    onChange={(e) => setParentForm({ ...parentForm, parent_name: e.target.value })}
                                    placeholder="e.g. Mr. John Okello"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Relationship *</label>
                                <select
                                    className="form-input"
                                    value={parentForm.relationship}
                                    onChange={(e) => setParentForm({ ...parentForm, relationship: e.target.value })}
                                >
                                    <option value="">-- Select --</option>
                                    {relationships.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone 1</label>
                                <input
                                    className="form-input"
                                    value={parentForm.phone}
                                    onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                                    placeholder="077X XXX XXX"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone 2</label>
                                <input
                                    className="form-input"
                                    value={parentForm.phone2}
                                    onChange={(e) => setParentForm({ ...parentForm, phone2: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    className="form-input"
                                    value={parentForm.email}
                                    onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Occupation</label>
                                <input
                                    className="form-input"
                                    value={parentForm.occupation}
                                    onChange={(e) => setParentForm({ ...parentForm, occupation: e.target.value })}
                                    placeholder="e.g. Teacher, Businesswoman"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Residence</label>
                                <input
                                    className="form-input"
                                    value={parentForm.residence}
                                    onChange={(e) => setParentForm({ ...parentForm, residence: e.target.value })}
                                    placeholder="e.g. Nansana, Wakiso"
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: '10px' }}
                                onClick={handleSaveParent}
                                disabled={saving}
                            >
                                {saving ? '⏳ Saving...' : '💾 Save Parent'}
                            </button>
                        </div>
                    </div>

                    {/* ─── Parents Table ─────────────────────────────── */}
                    <div className="card">
                        <div className="card-header">Registered Parents ({parents.length})</div>
                        <div className="card-body" style={{ overflowX: 'auto' }}>
                            {parents.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
                                    No parents registered for this student
                                </p>
                            )}
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Relationship</th>
                                        <th>Phone</th>
                                        <th>Occupation</th>
                                        <th>Residence</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parents.map(p => (
                                        <tr key={p.id}>
                                            <td><strong>{p.parent_name}</strong></td>
                                            <td>{p.relationship}</td>
                                            <td>
                                                {p.phone || '—'}
                                                {p.phone2 && <span style={{ color: '#999' }}> / {p.phone2}</span>}
                                            </td>
                                            <td>{p.occupation || '—'}</td>
                                            <td>{p.residence || '—'}</td>
                                            <td>
                                                <button
                                                    onClick={() => handleDeleteParent(p.id)}
                                                    style={{
                                                        color: '#d32f2f', border: 'none',
                                                        background: 'none', cursor: 'pointer',
                                                        fontSize: '13px', fontWeight: '600'
                                                    }}
                                                >
                                                    🗑️ Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Tab: Add Event ────────────────────────────────── */}
            {selected && tab === 'add' && (
                <div className="card" style={{ maxWidth: '600px' }}>
                    <div className="card-header">📝 Record Timeline Event</div>
                    <div className="card-body">
                        <div className="form-group">
                            <label className="form-label">Event Type</label>
                            <select
                                className="form-input"
                                value={addForm.event_type}
                                onChange={(e) => setAddForm({ ...addForm, event_type: e.target.value })}
                            >
                                {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description *</label>
                            <textarea
                                className="form-input"
                                rows="4"
                                value={addForm.description}
                                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                                placeholder="Describe what happened..."
                            />
                        </div>
                        <p style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
                            📅 Date: {new Date().toISOString().slice(0, 10)} (today, automatic)
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={handleAddEvent}
                            disabled={saving}
                        >
                            {saving ? '⏳ Saving...' : '📝 Record Event'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}