import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

var EMPTY_FORM = {
    school_name: '', emis_number: '', school_level: 'Primary',
    school_type: 'Private', district_name: '', phone: '', email: ''
};

export default function SchoolManagement() {
    var auth = useAuth();
    var [schools, setSchools] = useState([]);
    var [form, setForm] = useState(EMPTY_FORM);
    var [msg, setMsg] = useState('');
    var [loading, setLoading] = useState(true);
    var [saving, setSaving] = useState(false);
    var mountedRef = useRef(true);

    useEffect(function() {
        mountedRef.current = true;
        return function() { mountedRef.current = false; };
    }, []);

    var showMessage = function(text) {
        if (!mountedRef.current) return;
        setMsg(text);
        setTimeout(function() { if (mountedRef.current) setMsg(''); }, 4000);
    };

    var loadSchools = useCallback(async function() {
        if (!window.electronAPI || !window.electronAPI.queryDatabase) { if (mountedRef.current) setLoading(false); return; }
        try {
            var r = await window.electronAPI.queryDatabase(
                "SELECT id, school_name, emis_number, school_level, school_type, district_name, phone, email, is_active, created_at FROM schools ORDER BY school_name"
            );
            if (!mountedRef.current) return;
            if (r && r.success && Array.isArray(r.data)) { setSchools(r.data); }
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('SchoolManagement load error: ' + e.message);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    useEffect(function() { loadSchools(); }, [loadSchools]);

    var handleSave = async function(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (!form.school_name || !form.school_name.trim()) { showMessage('School name required'); return; }
        setSaving(true); showMessage('Saving...');
        try {
            var r = await window.electronAPI.queryDatabase(
                "INSERT INTO schools (school_name, emis_number, school_level, school_type, district_name, phone, email, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
                [form.school_name.trim(), form.emis_number || '', form.school_level || 'Primary', form.school_type || 'Private', form.district_name || '', form.phone || '', form.email || '']
            );
            if (!mountedRef.current) return;
            if (r && r.success) { showMessage('School added!'); setForm(EMPTY_FORM); loadSchools(); }
            else { showMessage('Error: ' + ((r && r.error) ? r.error : 'Failed')); }
        } catch (err) {
            if (!mountedRef.current) return;
            showMessage('Error: ' + err.message);
        } finally {
            if (mountedRef.current) setSaving(false);
        }
    };

    var handleSwitch = function(schoolId, schoolName) {
        if (!confirm('Switch to ' + schoolName + '?')) return;
        window.electronAPI.queryDatabase("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('current_school_id', ?)", [String(schoolId)]).then(function() { auth.switchSchool(schoolId); });
    };

    var handleDeactivate = async function(id, name) {
        if (id === 1) { showMessage('Cannot deactivate default school'); return; }
        if (!confirm('Deactivate ' + name + '?')) return;
        try { await window.electronAPI.queryDatabase("UPDATE schools SET is_active = 0 WHERE id = ?", [id]); if (!mountedRef.current) return; showMessage('Deactivated'); loadSchools(); }
        catch (e) { if (!mountedRef.current) return; showMessage('Error: ' + e.message); }
    };

    if (loading) {
        return React.createElement('div', { className: 'page-container' }, React.createElement('h1', { className: 'page-title' }, 'School Management'),
            React.createElement('div', { className: 'card' }, React.createElement('div', { className: 'card-body', style: { textAlign: 'center', padding: '40px' } }, 'Loading...')));
    }

    return (
        <div className="page-container">
            <h1 className="page-title">School Management</h1>
            {msg && <p style={{ marginBottom: '15px', padding: '10px', background: msg.indexOf('Error') >= 0 ? '#ffebee' : '#e8f5e9', borderRadius: '6px', color: msg.indexOf('Error') >= 0 ? '#c62828' : '#0d904f' }}>{msg}</p>}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">Add New School</div>
                <div className="card-body">
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                            <div className="form-group"><label className="form-label">School Name *</label><input className="form-input" value={form.school_name} onChange={function(e) { setForm({ ...form, school_name: e.target.value }); }} required autoFocus /></div>
                            <div className="form-group"><label className="form-label">EMIS Number</label><input className="form-input" value={form.emis_number} onChange={function(e) { setForm({ ...form, emis_number: e.target.value }); }} /></div>
                            <div className="form-group"><label className="form-label">Level</label><select className="form-input" value={form.school_level} onChange={function(e) { setForm({ ...form, school_level: e.target.value }); }}><option value="Nursery">Nursery</option><option value="Primary">Primary</option><option value="Secondary">Secondary</option><option value="Tertiary">Tertiary</option></select></div>
                            <div className="form-group"><label className="form-label">Type</label><select className="form-input" value={form.school_type} onChange={function(e) { setForm({ ...form, school_type: e.target.value }); }}><option value="Private">Private</option><option value="Government">Government</option></select></div>
                            <div className="form-group"><label className="form-label">District</label><input className="form-input" value={form.district_name} onChange={function(e) { setForm({ ...form, district_name: e.target.value }); }} /></div>
                            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={function(e) { setForm({ ...form, phone: e.target.value }); }} /></div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add School'}</button>
                    </form>
                </div>
            </div>
            <div className="card">
                <div className="card-header">Schools ({schools.length})</div>
                <div className="card-body" style={{ overflowX: 'auto' }}>
                    {schools.length === 0 ? <p style={{ textAlign: 'center', color: '#999' }}>No schools</p> : (
                        <table className="data-table"><thead><tr><th>Name</th><th>EMIS</th><th>Level</th><th>Type</th><th>District</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                            {schools.map(function(s, i) {
                                var id = (s && s.id) ? s.id : i;
                                var name = (s && s.school_name) ? s.school_name : '-';
                                var isCurrent = id === auth.currentSchoolId;
                                return (
                                    <tr key={id} style={{ background: isCurrent ? '#e8f0fe' : 'transparent' }}>
                                        <td style={{ fontWeight: '600' }}>{name} {isCurrent && '(Current)'}</td>
                                        <td style={{ fontSize: '12px' }}>{(s && s.emis_number) ? s.emis_number : '-'}</td>
                                        <td style={{ fontSize: '12px' }}>{(s && s.school_level) ? s.school_level : '-'}</td>
                                        <td style={{ fontSize: '12px' }}>{(s && s.school_type) ? s.school_type : '-'}</td>
                                        <td style={{ fontSize: '12px' }}>{(s && s.district_name) ? s.district_name : '-'}</td>
                                        <td><span style={{ padding: '2px 8px', borderRadius: '4px', background: (s && s.is_active) ? '#e8f5e9' : '#ffebee', color: (s && s.is_active) ? '#0d904f' : '#d32f2f', fontSize: '11px' }}>{(s && s.is_active) ? 'Active' : 'Inactive'}</span></td>
                                        <td>
                                            {!isCurrent && (s && s.is_active) && <button onClick={function() { handleSwitch(id, name); }} style={{ color: 'white', border: 'none', background: '#1a73e8', cursor: 'pointer', fontSize: '12px', padding: '4px 10px', borderRadius: '4px' }}>Switch</button>}
                                            {isCurrent && <span style={{ fontSize: '12px', color: '#1a73e8' }}>Current</span>}
                                            {!isCurrent && id !== 1 && <button onClick={function() { handleDeactivate(id, name); }} style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', marginLeft: '8px' }}>Deactivate</button>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody></table>
                    )}
                </div>
            </div>
        </div>
    );
}
