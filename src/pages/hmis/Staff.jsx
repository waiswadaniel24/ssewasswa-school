// FileName: src/pages/hmis/Staff.jsx
// Facility Staff Management — cadres, contact, roles, status
// localStorage persistence under 'hmis_staff'

import React, { useState, useEffect } from 'react';

const C = {
  bg: '#071b2f', card: '#0d2640', input: '#0a1f36',
  border: '#1a3a5c', green: '#0b8043', greenLight: '#0ca252',
  text: '#e6f0fa', muted: '#8da7c1', red: '#d32f2f', orange: '#e8710a',
  blue: '#1a73e8', purple: '#7b1fa2', teal: '#00838f',
};

const CADRES = [
  'Doctor', 'Clinical Officer', 'RN', 'EN', 'Midwife',
  'Lab Tech', 'Pharmacy Tech', 'Records Officer', 'HMIO', 'Facility In-charge',
];

const ROLES = ['Clinical', 'Nursing', 'Lab', 'Pharmacy', 'Records', 'Administration', 'Support'];
const STATUSES = ['Active', 'On Leave', 'Suspended', 'Inactive'];

const EMPTY = {
  name: '', cadre: CADRES[0], phone: '', email: '',
  role: ROLES[0], status: 'Active',
};

// Cadre badge colors
const CADRE_COLORS = {
  'Doctor': C.blue,
  'Clinical Officer': C.green,
  'RN': C.teal,
  'EN': C.teal,
  'Midwife': '#c2185b',
  'Lab Tech': C.purple,
  'Pharmacy Tech': C.orange,
  'Records Officer': '#5c6bc0',
  'HMIO': '#1565c0',
  'Facility In-charge': C.red,
};

function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Staff() {
  const [records, setRecords] = useLocalState('hmis_staff', []);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [cadreFilter, setCadreFilter] = useState('All');

  const save = (e) => {
    e.preventDefault();
    if (!form.name || !form.cadre) { setMsg('❌ Name and cadre are required'); return; }
    const id = 'STF-' + Date.now().toString().slice(-8);
    setRecords([{ ...form, id, created_at: todayStr() }, ...records]);
    setForm({ ...EMPTY });
    setMsg('✅ Staff member added: ' + form.name);
  };

  const updateStatus = (id, status) => setRecords(records.map(r => r.id === id ? { ...r, status } : r));

  const filtered = records.filter(r =>
    (cadreFilter === 'All' || r.cadre === cadreFilter) &&
    (!search || (r.name + ' ' + r.phone + ' ' + r.email + ' ' + r.role).toLowerCase().includes(search.toLowerCase()))
  );

  // Cadre summary
  const cadreCounts = CADRES.map(c => ({ cadre: c, count: records.filter(r => r.cadre === c).length }));

  const inputStyle = { width: '100%', padding: '11px 14px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' };
  const btnStyle = { padding: '11px 22px', background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,128,67,0.3)' };
  const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', marginBottom: '20px' };
  const headerStyle = { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: '15px' };
  const bodyStyle = { padding: '20px' };
  const thStyle = { textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` };
  const tdStyle = { padding: '11px 12px', fontSize: '13px', borderBottom: `1px solid ${C.border}` };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>👤 HMIS Staff Management</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Facility staff directory · Cadres · Roles</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      {/* Cadre summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {cadreCounts.map(c => {
          const color = CADRE_COLORS[c.cadre] || C.blue;
          return (
            <div key={c.cadre} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}>{c.cadre}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color }}>{c.count}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={cardStyle}>
          <div style={headerStyle}>Add Staff Member</div>
          <div style={bodyStyle}>
            <form onSubmit={save}>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Full Name *</label><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Ssewanyana" required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Cadre *</label>
                  <select style={inputStyle} value={form.cadre} onChange={(e) => setForm({ ...form, cadre: e.target.value })}>
                    {CADRES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Role</label>
                  <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07XX XXX XXX" /></div>
                <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@hmis.go.ug" /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>➕ Add Staff</button>
            </form>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span>Staff Directory ({filtered.length})</span>
          </div>
          <div style={bodyStyle}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <input style={{ ...inputStyle, flex: '1 1 200px', minWidth: '160px' }} placeholder="🔍 Search by name, phone, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select value={cadreFilter} onChange={(e) => setCadreFilter(e.target.value)} style={{ ...inputStyle, flex: '0 0 160px' }}>
                <option value="All">All Cadres</option>
                {CADRES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {filtered.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No staff added yet. Add your first staff member above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                    <thead><tr><th style={thStyle}>Name</th><th style={thStyle}>Cadre</th><th style={thStyle}>Role</th><th style={thStyle}>Phone</th><th style={thStyle}>Email</th><th style={thStyle}>Status</th></tr></thead>
                    <tbody>
                      {filtered.map(r => {
                        const cc = CADRE_COLORS[r.cadre] || C.blue;
                        const sc = r.status === 'Active' ? C.green : r.status === 'On Leave' ? C.orange : r.status === 'Suspended' ? C.red : C.muted;
                        return (
                          <tr key={r.id}>
                            <td style={tdStyle}>{r.name}</td>
                            <td style={tdStyle}>
                              <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${cc}22`, color: cc, border: `1px solid ${cc}` }}>{r.cadre}</span>
                            </td>
                            <td style={tdStyle}>{r.role}</td>
                            <td style={tdStyle}>{r.phone || '-'}</td>
                            <td style={tdStyle}>{r.email || '-'}</td>
                            <td style={tdStyle}>
                              <select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)} style={{ padding: '4px 8px', background: `${sc}22`, color: sc, border: `1px solid ${sc}`, borderRadius: '12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                {STATUSES.map(s => <option key={s} value={s} style={{ color: '#000' }}>{s}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
