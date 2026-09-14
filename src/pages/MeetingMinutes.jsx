// FileName: src/pages/MeetingMinutes.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SchoolDocument } from '../utils/DocumentEngine.js';

const MEETING_TYPES = [
    'Staff Meeting', 'Board Meeting', 'PTA Meeting',
    'Academic Committee', 'Finance Committee', 'Disciplinary',
    'SMC/BOG Meeting', 'Other'
];

const EMPTY_FORM = {
    meeting_type: 'Staff Meeting',
    date: new Date().toISOString().slice(0, 10),
    time: '09:00',
    venue: '',
    chairperson: '',
    secretary: '',
    attendees: [],
    agenda: [],
    minutes: [],
    action_items: []
};

// Safely parse JSON string, return default on error
function safeJsonParse(str, defaultValue) {
    if (!str || typeof str !== 'string') return defaultValue;
    try {
        const parsed = JSON.parse(str);
        return (Array.isArray(parsed)) ? parsed : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

export default function MeetingMinutes() {
    // ─── State variables ──────────────────────────────────────
    const [meetings, setMeetings] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    // Sub-form inputs
    const [attendeeInput, setAttendeeInput] = useState({ name: '', role: '' });
    const [agendaInput, setAgendaInput] = useState('');
    const [minuteInput, setMinuteInput] = useState({ topic: '', discussion: '', resolution: '' });
    const [actionInput, setActionInput] = useState({ action: '', responsible: '', deadline: '' });

    // School branding for PDF
    const [schoolData, setSchoolData] = useState({ /* no-op */ });

    // ─── Refs ───────────────────────────────────────────────
    const mountedRef = useRef(true);

    // ─── Cleanup on unmount ─────────────────────────────────
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ─── Fetch meetings ──────────────────────────────────────
    const fetchMeetings = useCallback(async () => {
        if (!window.electronAPI || !window.electronAPI.getMeetings) {
            if (mountedRef.current) setLoading(false);
            return;
        }

        try {
            const r = await window.electronAPI.getMeetings();
            if (!mountedRef.current) return;
            if (r && r.success && Array.isArray(r.data)) {
                setMeetings(r.data);
            } else {
                setMeetings([]);
            }
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('MeetingMinutes: fetch error:', (e && e.message) ? e.message : 'Unknown');
            setMeetings([]);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    // ─── Load school branding on mount ────────────────────────
    useEffect(() => {
        const loadBranding = async () => {
            if (!window.electronAPI || !window.electronAPI.queryDatabase) return;

            try {
                const stRes = await window.electronAPI.queryDatabase(
                    "SELECT key, value FROM system_settings WHERE key IN ('school_name','school_motto','school_slogan','school_scripture','school_logo','school_badge')"
                );
                if (!mountedRef.current) return;

                const branding = { /* no-op */ };
                if (stRes && stRes.success && stRes.data) {
                    stRes.data.forEach((row) => {
                        if (row && row.key) branding[row.key] = row.value;
                    });
                }

                // Load logo
                if (branding.school_logo) {
                    try {
                        const lp = await window.electronAPI.getPhoto(branding.school_logo);
                        if (mountedRef.current && lp && lp.success && lp.data) {
                            branding.logo = lp.data;
                        }
                    } catch (e) { /* ignore logo error */ }
                }

                // Load badge
                if (branding.school_badge) {
                    try {
                        const bp = await window.electronAPI.getPhoto(branding.school_badge);
                        if (mountedRef.current && bp && bp.success && bp.data) {
                            branding.badge = bp.data;
                        }
                    } catch (e) { /* ignore badge error */ }
                }

                if (mountedRef.current) setSchoolData(branding);
            } catch (e) {
                if (!mountedRef.current) return;
                console.error('MeetingMinutes: branding error:', (e && e.message) ? e.message : 'Unknown');
            }
        };

        loadBranding();
        fetchMeetings();
    }, [fetchMeetings]);

    // ─── Sub-form: Add attendee ───────────────────────────────
    const addAttendee = () => {
        if (!attendeeInput.name || !attendeeInput.name.trim()) return;
        setForm(prev => {
            return { ...prev, attendees: [...(prev.attendees || []), { name: attendeeInput.name.trim(), role: attendeeInput.role || '' }] };
        });
        setAttendeeInput({ name: '', role: '' });
    };

    // ─── Sub-form: Remove attendee ───────────────────────────
    const removeAttendee = (index) => {
        setForm(prev => {
            const arr = (prev.attendees || []).slice();
            arr.splice(index, 1);
            return { ...prev, attendees: arr };
        });
    };

    // ─── Sub-form: Add agenda item ────────────────────────────
    const addAgenda = () => {
        if (!agendaInput || !agendaInput.trim()) return;
        setForm(prev => {
            return { ...prev, agenda: [...(prev.agenda || []), agendaInput.trim()] };
        });
        setAgendaInput('');
    };

    // ─── Sub-form: Remove agenda item ────────────────────────
    const removeAgenda = (index) => {
        setForm(prev => {
            const arr = (prev.agenda || []).slice();
            arr.splice(index, 1);
            return { ...prev, agenda: arr };
        });
    };

    // ─── Sub-form: Add minute item ────────────────────────────
    const addMinute = () => {
        if (!minuteInput.topic || !minuteInput.topic.trim()) return;
        setForm(prev => {
            return {
                ...prev, minutes: [...(prev.minutes || []), {
                    topic: minuteInput.topic.trim(),
                    discussion: minuteInput.discussion || '',
                    resolution: minuteInput.resolution || ''
                }]
            };
        });
        setMinuteInput({ topic: '', discussion: '', resolution: '' });
    };

    // ─── Sub-form: Remove minute item ────────────────────────
    const removeMinute = (index) => {
        setForm(prev => {
            const arr = (prev.minutes || []).slice();
            arr.splice(index, 1);
            return { ...prev, minutes: arr };
        });
    };

    // ─── Sub-form: Add action item ───────────────────────────
    const addAction = () => {
        if (!actionInput.action || !actionInput.action.trim()) return;
        setForm(prev => {
            return {
                ...prev, action_items: [...(prev.action_items || []), {
                    action: actionInput.action.trim(),
                    responsible: actionInput.responsible || '',
                    deadline: actionInput.deadline || ''
                }]
            };
        });
        setActionInput({ action: '', responsible: '', deadline: '' });
    };

    // ─── Sub-form: Remove action item ─────────────────────────
    const removeAction = (index) => {
        setForm(prev => {
            const arr = (prev.action_items || []).slice();
            arr.splice(index, 1);
            return { ...prev, action_items: arr };
        });
    };

    // ─── Save meeting ─────────────────────────────────────────
    const handleSave = async () => {
        if (!form.venue || !form.venue.trim()) {
            setMsg('⚠️ Venue is required');
            return;
        }
        if (!form.chairperson || !form.chairperson.trim()) {
            setMsg('⚠️ Chairperson is required');
            return;
        }

        setSaving(true);
        setMsg('');

        try {
            const r = await window.electronAPI.saveMeeting(form);
            if (!mountedRef.current) return;

            if (r && r.success) {
                setMsg('✅ Meeting saved successfully!');
                setShowForm(false);
                setForm(EMPTY_FORM);
                fetchMeetings();
            } else {
                const errMsg = (r && r.error) ? r.error : 'Failed to save';
                setMsg('❌ ' + errMsg);
            }
        } catch (e) {
            if (!mountedRef.current) return;
            const errCatch = (e && e.message) ? e.message : 'Unknown error';
            setMsg('❌ Error: ' + errCatch);
        } finally {
            if (mountedRef.current) setSaving(false);
        }

        setTimeout(() => {
            if (mountedRef.current) setMsg('');
        }, 4000);
    };

    // ─── Delete meeting ───────────────────────────────────────
    const handleDelete = async (id) => {
        if (!confirm('Delete this meeting record? This cannot be undone.')) return;

        try {
            await window.electronAPI.deleteMeeting(id);
            if (!mountedRef.current) return;
            setMsg('🗑️ Meeting deleted');
            fetchMeetings();
        } catch (e) {
            if (!mountedRef.current) return;
            setMsg('❌ Error: ' + ((e && e.message) ? e.message : 'Unknown'));
        }

        setTimeout(() => {
            if (mountedRef.current) setMsg('');
        }, 3000);
    };

    // ─── Print meeting minutes as PDF ──────────────────────────
    const handlePrint = (m) => {
        if (!m) return;

        // Safely parse JSON fields
        const attendees = safeJsonParse(m.attendees, []);
        const agenda = safeJsonParse(m.agenda, []);
        const items = safeJsonParse(m.minutes, []);
        const actions = safeJsonParse(m.action_items, []);

        try {
            const doc = new SchoolDocument(schoolData);
            doc.minutes({
                meeting: {
                    type: m.meeting_type || 'Meeting',
                    date: m.date || '',
                    time: m.time || '',
                    venue: m.venue || '',
                    chairperson: m.chairperson || '',
                    secretary: m.secretary || ''
                },
                attendees: attendees,
                agenda: agenda,
                items: items,
                actions: actions,
                signatures: [
                    { label: 'Chairperson', name: m.chairperson || '', title: 'Signature & Date' },
                    { label: 'Secretary', name: m.secretary || '', title: 'Signature & Date' }
                ]
            });

            if (mountedRef.current) {
                setMsg('📄 Meeting minutes PDF downloaded');
                setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
            }
        } catch (e) {
            if (!mountedRef.current) return;
            const errMsg = (e && e.message) ? e.message : 'Unknown error';
            console.error('MeetingMinutes: print error:', errMsg);
            setMsg('❌ PDF error: ' + errMsg);
            setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
        }
    };

    // ─── Loading state ──────────────────────────────────────
    if (loading) {
        return (
            <div className="page-container">
                <h1 className="page-title">📝 Meeting Minutes</h1>
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
                        <p style={{ color: '#666' }}>Loading meetings...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 className="page-title">📝 Meeting Minutes</h1>

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
                    borderRadius: '6px'
                }}>
                    {msg}
                </p>
            )}

            <button
                className="btn btn-primary"
                onClick={() => { setShowForm(!showForm); if (!showForm) setForm(EMPTY_FORM); }}
                style={{ marginBottom: '20px' }}
            >
                {showForm ? '❌ Cancel' : '➕ New Meeting'}
            </button>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* MEETING FORM                                              */}
            {/* ═══════════════════════════════════════════════════════ */}
            {showForm && (
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">📝 Record Meeting</div>
                    <div className="card-body">

                        {/* ── Meeting Details ─────────────────────────────── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                            <div className="form-group">
                                <label className="form-label">Meeting Type</label>
                                <select className="form-input" value={form.meeting_type}
                                    onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}>
                                    {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input type="date" className="form-input" value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Time</label>
                                <input type="time" className="form-input" value={form.time}
                                    onChange={(e) => setForm({ ...form, time: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Venue *</label>
                                <input className="form-input" value={form.venue}
                                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                                    placeholder="e.g. Staff room" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Chairperson *</label>
                                <input className="form-input" value={form.chairperson}
                                    onChange={(e) => setForm({ ...form, chairperson: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Secretary</label>
                                <input className="form-input" value={form.secretary}
                                    onChange={(e) => setForm({ ...form, secretary: e.target.value })} />
                            </div>
                        </div>

                        {/* ── Attendees ───────────────────────────────────── */}
                        <div style={{ marginTop: '15px' }}>
                            <label className="form-label">Attendees ({(form.attendees || []).length})</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input className="form-input" style={{ flex: 2 }}
                                    value={attendeeInput.name}
                                    onChange={(e) => setAttendeeInput({ ...attendeeInput, name: e.target.value })}
                                    placeholder="Name"
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAttendee(); } }} />
                                <input className="form-input" style={{ flex: 1 }}
                                    value={attendeeInput.role}
                                    onChange={(e) => setAttendeeInput({ ...attendeeInput, role: e.target.value })}
                                    placeholder="Role" />
                                <button className="btn btn-secondary" onClick={addAttendee}>Add</button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(form.attendees || []).map((a, i) => (
                                    <span key={i} style={{
                                        background: '#e8f0fe', padding: '4px 10px',
                                        borderRadius: '12px', fontSize: '12px',
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}>
                                        {(a.name || '')}{(a.role) ? ' (' + a.role + ')' : ''}
                                        <span style={{ cursor: 'pointer', color: '#d32f2f' }}
                                            onClick={() => removeAttendee(i)}>×</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* ── Agenda ─────────────────────────────────────── */}
                        <div style={{ marginTop: '15px' }}>
                            <label className="form-label">Agenda ({(form.agenda || []).length})</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input className="form-input" value={agendaInput}
                                    onChange={(e) => setAgendaInput(e.target.value)}
                                    placeholder="Agenda item"
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAgenda(); } }} />
                                <button className="btn btn-secondary" onClick={addAgenda}>Add</button>
                            </div>
                            {(form.agenda || []).map((a, i) => (
                                <div key={i} style={{ fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    {i + 1}. {a}
                                    <span style={{ cursor: 'pointer', color: '#d32f2f', marginLeft: '10px' }}
                                        onClick={() => removeAgenda(i)}>remove</span>
                                </div>
                            ))}
                        </div>

                        {/* ── Minutes / Discussion ───────────────────────── */}
                        <div style={{ marginTop: '15px' }}>
                            <label className="form-label">Discussion Points ({(form.minutes || []).length})</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '8px', marginBottom: '8px' }}>
                                <input className="form-input" value={minuteInput.topic}
                                    onChange={(e) => setMinuteInput({ ...minuteInput, topic: e.target.value })}
                                    placeholder="Topic" />
                                <input className="form-input" value={minuteInput.discussion}
                                    onChange={(e) => setMinuteInput({ ...minuteInput, discussion: e.target.value })}
                                    placeholder="Discussion summary" />
                                <input className="form-input" value={minuteInput.resolution}
                                    onChange={(e) => setMinuteInput({ ...minuteInput, resolution: e.target.value })}
                                    placeholder="Resolution" />
                            </div>
                            <button className="btn btn-secondary" style={{ marginTop: '8px' }} onClick={addMinute}>Add Discussion Point</button>
                            {(form.minutes || []).map((m, i) => (
                                <div key={i} style={{ background: '#f8f9fa', padding: '10px', marginTop: '8px', borderRadius: '6px', fontSize: '13px' }}>
                                    <strong>{i + 1}. {(m.topic || '')}</strong>
                                    {(m.discussion) ? <p style={{ margin: '4px 0 0', color: '#555' }}>{m.discussion}</p> : null}
                                    {(m.resolution) ? <p style={{ margin: '4px 0 0', color: '#0d47a1', fontStyle: 'italic' }}>Resolution: {m.resolution}</p> : null}
                                    <span style={{ cursor: 'pointer', color: '#d32f2f', fontSize: '12px' }}
                                        onClick={() => removeMinute(i)}>remove</span>
                                </div>
                            ))}
                        </div>

                        {/* ── Action Items ─────────────────────────────────── */}
                        <div style={{ marginTop: '15px' }}>
                            <label className="form-label">Action Items ({(form.action_items || []).length})</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                                <input className="form-input" value={actionInput.action}
                                    onChange={(e) => setActionInput({ ...actionInput, action: e.target.value })}
                                    placeholder="Action" />
                                <input className="form-input" value={actionInput.responsible}
                                    onChange={(e) => setActionInput({ ...actionInput, responsible: e.target.value })}
                                    placeholder="Responsible" />
                                <input type="date" className="form-input" value={actionInput.deadline}
                                    onChange={(e) => setActionInput({ ...actionInput, deadline: e.target.value })} />
                            </div>
                            <button className="btn btn-secondary" style={{ marginTop: '8px' }} onClick={addAction}>Add Action</button>

                            {/* FIXED: Added missing UI list for action items to map 'removeAction' */}
                            {(form.action_items || []).map((a, i) => (
                                <div key={i} style={{ background: '#f8f9fa', padding: '10px', marginTop: '8px', borderRadius: '6px', fontSize: '13px' }}>
                                    <strong>{i + 1}. {a.action}</strong>
                                    {a.responsible ? <span style={{ color: '#555', marginLeft: '8px' }}>(Responsible: {a.responsible})</span> : null}
                                    {a.deadline ? <span style={{ color: '#555', marginLeft: '8px' }}>(Deadline: {a.deadline})</span> : null}
                                    <span style={{ cursor: 'pointer', color: '#d32f2f', fontSize: '12px', marginLeft: '10px' }}
                                        onClick={() => removeAction(i)}>remove</span>
                                </div>
                            ))}
                        </div>

                        {/* ── Save Button ─────────────────────────────────── */}
                        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={handleSave} disabled={saving}>
                            {saving ? '⏳ Saving...' : '💾 Save Meeting'}
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* MEETINGS LIST                                            */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="card">
                <div className="card-header">📋 Meeting Records ({meetings.length})</div>
                <div className="card-body" style={{ overflowX: 'auto' }}>
                    {meetings.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
                            No meetings recorded yet
                        </p>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Date</th>
                                    <th>Venue</th>
                                    <th>Chairperson</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {meetings.map((m, i) => {
                                    const id = (m && m.id) ? m.id : i;
                                    const type = (m && m.meeting_type) ? m.meeting_type : '-';
                                    const date = (m && m.date) ? m.date : '-';
                                    const venue = (m && m.venue) ? m.venue : '-';
                                    const chair = (m && m.chairperson) ? m.chairperson : '-';
                                    const status = (m && m.status) ? m.status : 'Draft';

                                    return (
                                        <tr key={id}>
                                            <td>{type}</td>
                                            <td style={{ fontSize: '12px' }}>{date}</td>
                                            <td style={{ fontSize: '12px' }}>{venue}</td>
                                            <td style={{ fontSize: '12px' }}>{chair}</td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '4px',
                                                    background: status === 'Draft' ? '#fff3e0' : '#e8f5e9',
                                                    color: status === 'Draft' ? '#e65100' : '#0d904f',
                                                    fontSize: '12px'
                                                }}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }}
                                                        onClick={() => handlePrint(m)}
                                                    >
                                                        🖨️ Print PDF
                                                    </button>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '4px 10px', fontSize: '12px', color: '#d32f2f' }}
                                                        onClick={() => handleDelete(id)}
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
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
    );
}
