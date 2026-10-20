// FileName: src/pages/hmis/Patients.jsx
// Patient Registration + Search

import React, { useState, useEffect, useRef } from 'react';

const EMPTY_FORM = {
  first_name: '', last_name: '', other_name: '', gender: 'M',
  date_of_birth: '', phone: '', address: '', next_of_kin: '',
  next_of_kin_phone: '', blood_group: '', allergies: '',
  emergency_contact: '', nhis_number: '',
};

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadPatients = async () => {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) { setLoading(false); return; }
    try {
      const r = await window.electronAPI.queryDatabase(
        "SELECT id, first_name, last_name, other_name, gender, date_of_birth, phone, nhis_number FROM hmis_patients ORDER BY id DESC LIMIT 100"
      );
      if (mountedRef.current && r && r.success && Array.isArray(r.data)) setPatients(r.data);
    } catch (e) { console.error('Load error:', e.message); }
    if (mountedRef.current) setLoading(false);
  };

  useEffect(() => { loadPatients(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    if (!window.electronAPI || !window.electronAPI.queryDatabase) { setMsg('Desktop mode required'); setSaving(false); return; }
    try {
      const opd_number = 'OPD-' + Date.now().toString().slice(-8);
      const r = await window.electronAPI.queryDatabase(
        "INSERT INTO hmis_patients (first_name, last_name, other_name, gender, date_of_birth, phone, address, next_of_kin, next_of_kin_phone, blood_group, allergies, emergency_contact, nhis_number, opd_number, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? ,datetime('now'))",
        [form.first_name, form.last_name, form.other_name || '', form.gender, form.date_of_birth, form.phone, form.address, form.next_of_kin, form.next_of_kin_phone, form.blood_group, form.allergies, form.emergency_contact, form.nhis_number, opd_number]
      );
      if (mountedRef.current) {
        if (r && r.success) { setMsg('✅ Patient registered! OPD: ' + opd_number); setForm(EMPTY_FORM); setShowForm(false); loadPatients(); }
        else { setMsg('❌ ' + (r?.error || 'Failed')); }
      }
    } catch (e) { if (mountedRef.current) setMsg('❌ ' + e.message); }
    if (mountedRef.current) setSaving(false);
  };

  const filtered = patients.filter(p => !search || (p.first_name + ' ' + p.last_name + ' ' + (p.other_name || '') + ' ' + (p.phone || '') + ' ' + (p.nhis_number || '')).toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="page-container"><h1 className="page-title">Patient Registration</h1><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">👥 Patient Registration</h1>
      {msg && <div style={{ padding: '10px', background: msg.includes('✅') ? '#e8f5e9' : '#ffebee', borderRadius: '8px', marginBottom: '15px', color: msg.includes('✅') ? '#2e7d32' : '#c62828' }}>{msg}</div>}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input className="form-input" placeholder="🔍 Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? '← Back to List' : '+ Register New Patient'}</button>
      </div>
      {showForm ? (
        <form onSubmit={handleSave} className="card">
          <div className="card-header">New Patient Registration</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div className="form-group"><label className="form-label">First Name *</label><input className="form-input" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Last Name *</label><input className="form-input" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Other Name</label><input className="form-input" value={form.other_name} onChange={(e) => setForm({...form, other_name: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Gender</label><select className="form-input" value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})}><option value="M">Male</option><option value="F">Female</option></select></div>
              <div className="form-group"><label className="form-label">Date of Birth</label><input className="form-input" type="date" value={form.date_of_birth} onChange={(e) => setForm({...form, date_of_birth: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="07XX XXX XXX" /></div>
              <div className="form-group"><label className="form-label">Blood Group</label><select className="form-input" value={form.blood_group} onChange={(e) => setForm({...form, blood_group: e.target.value})}><option value="">Unknown</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option></select></div>
              <div className="form-group"><label className="form-label">NHIS Number</label><input className="form-input" value={form.nhis_number} onChange={(e) => setForm({...form, nhis_number: e.target.value})} placeholder="National Health Insurance" /></div>
              <div className="form-group"><label className="form-label">Allergies</label><input className="form-input" value={form.allergies} onChange={(e) => setForm({...form, allergies: e.target.value})} placeholder="e.g. Penicillin" /></div>
            </div>
            <div className="form-group" style={{ marginTop: '15px' }}><label className="form-label">Address</label><input className="form-input" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div className="form-group"><label className="form-label">Next of Kin</label><input className="form-input" value={form.next_of_kin} onChange={(e) => setForm({...form, next_of_kin: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Next of Kin Phone</label><input className="form-input" value={form.next_of_kin_phone} onChange={(e) => setForm({...form, next_of_kin_phone: e.target.value})} /></div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '15px' }}>{saving ? 'Saving...' : '💾 Register Patient'}</button>
          </div>
        </form>
      ) : (
        <div className="card">
          <div className="card-header">Patients ({filtered.length})</div>
          <div className="card-body">
            {filtered.length === 0 ? <p style={{ textAlign: 'center', color: '#999' }}>No patients registered yet</p> : (
              <table className="data-table"><thead><tr><th>OPD #</th><th>Name</th><th>Gender</th><th>DOB</th><th>Phone</th><th>NHIS</th></tr></thead><tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.opd_number || p.id}</td>
                    <td>{p.first_name} {p.last_name} {p.other_name || ''}</td>
                    <td>{p.gender === 'M' ? 'Male' : 'Female'}</td>
                    <td>{p.date_of_birth || '-'}</td>
                    <td>{p.phone || '-'}</td>
                    <td>{p.nhis_number || '-'}</td>
                  </tr>
                ))}
              </tbody></table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
