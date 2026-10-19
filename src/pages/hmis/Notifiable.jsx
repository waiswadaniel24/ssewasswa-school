// FileName: src/pages/hmis/Notifiable.jsx
// Notifiable Disease Surveillance — Form 018 reporting
// localStorage persistence under 'hmis_notifiable'

import React, { useState, useEffect } from 'react';

const C = {
  bg: '#071b2f', card: '#0d2640', input: '#0a1f36',
  border: '#1a3a5c', green: '#0b8043', greenLight: '#0ca252',
  text: '#e6f0fa', muted: '#8da7c1', red: '#d32f2f', orange: '#e8710a',
  blue: '#1a73e8', purple: '#7b1fa2',
};

// 24 HMIS priority notifiable diseases (Uganda IDSR list)
const DISEASES = [
  'AFP (Acute Flaccid Paralysis)',
  'Cholera',
  'Dysentery',
  'Guinea Worm',
  'Hepatitis B',
  'Hepatitis E',
  'HIV / AIDS',
  'H1N1 (Influenza A)',
  'Severe Malaria',
  'Measles',
  'Meningococcal Meningitis',
  'Neonatal Tetanus',
  'Severe Pneumonia',
  'Polio',
  'Rabies',
  'Rift Valley Fever',
  'Rubella',
  'SARS',
  'Smallpox',
  'Tetanus',
  'Tuberculosis (TB)',
  'Typhoid',
  'Yellow Fever',
  'Ebola / Marburg (VHF)',
];

const DISTRICTS = ['Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Mbarara', 'Gulu', 'Lira', 'Soroti', 'Masaka', 'Hoima', 'Other'];

const EMPTY = {
  disease: DISEASES[0], patient: '', age: '', sex: 'M',
  district: DISTRICTS[0], onset_date: new Date().toISOString().slice(0, 10),
  report_date: new Date().toISOString().slice(0, 10),
  status: 'Suspected', notes: '',
};

const STATUSES = ['Suspected', 'Probable', 'Confirmed', 'Discarded'];

function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Notifiable() {
  const [records, setRecords] = useLocalState('hmis_notifiable', []);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('All');

  const save = (e) => {
    e.preventDefault();
    if (!form.patient || !form.disease) { setMsg('❌ Patient and disease are required'); return; }
    const id = 'NOTIF-' + Date.now().toString().slice(-8);
    setRecords([{ ...form, id, created_at: todayStr() }, ...records]);
    setForm({ ...EMPTY, onset_date: todayStr(), report_date: todayStr() });
    setMsg('✅ Case reported (Form 018): ' + form.disease);
  };

  const updateStatus = (id, status) => {
    setRecords(records.map(r => r.id === id ? { ...r, status } : r));
  };

  const filtered = filter === 'All' ? records : records.filter(r => r.disease === filter);

  const statusColor = (s) => s === 'Confirmed' ? C.red : s === 'Probable' ? C.orange : s === 'Discarded' ? C.muted : C.blue;

  const inputStyle = { width: '100%', padding: '11px 14px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' };
  const btnStyle = { padding: '11px 22px', background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,128,67,0.3)' };
  const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', marginBottom: '20px' };
  const headerStyle = { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: '15px' };
  const bodyStyle = { padding: '20px' };
  const thStyle = { textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` };
  const tdStyle = { padding: '11px 12px', fontSize: '13px', borderBottom: `1px solid ${C.border}` };

  // Summary counts
  const summary = records.reduce((acc, r) => {
    acc[r.disease] = (acc[r.disease] || 0) + 1;
    return acc;
  }, {});
  const topDiseases = Object.entries(summary).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>⚠️ Notifiable Disease Surveillance</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Form 018 · 24 priority diseases (IDSR)</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      {topDiseases.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          {topDiseases.map(([d, n]) => (
            <div key={d} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px 14px', fontSize: '12px' }}>
              <span style={{ color: C.muted }}>{d.split(' (')[0]}: </span>
              <span style={{ color: C.green, fontWeight: 700 }}>{n}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={cardStyle}>
          <div style={headerStyle}>Report Case (Form 018)</div>
          <div style={bodyStyle}>
            <form onSubmit={save}>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Disease *</label>
                <select style={inputStyle} value={form.disease} onChange={(e) => setForm({ ...form, disease: e.target.value })}>
                  {DISEASES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Patient *</label><input style={inputStyle} value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} required /></div>
                <div><label style={labelStyle}>Age</label><input style={inputStyle} type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="5" /></div>
                <div><label style={labelStyle}>Sex</label>
                  <select style={inputStyle} value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                    <option value="M">M</option><option value="F">F</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <div><label style={labelStyle}>District</label>
                  <select style={inputStyle} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Onset Date</label><input style={inputStyle} type="date" value={form.onset_date} onChange={(e) => setForm({ ...form, onset_date: e.target.value })} /></div>
                <div><label style={labelStyle}>Report Date</label><input style={inputStyle} type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} /></div>
              </div>
              <div style={{ marginTop: '12px' }}><label style={labelStyle}>Notes</label><input style={inputStyle} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Sample sent to UVRI" /></div>
              <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>📋 Report Case</button>
            </form>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{...headerStyle, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px'}}>
            <span>Reported Cases ({filtered.length})</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '6px 10px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '12px' }}>
              <option value="All">All Diseases</option>
              {DISEASES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ ...bodyStyle, overflowX: 'auto' }}>
            {filtered.length === 0
              ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No cases reported yet. Add your first case above.</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                  <thead><tr><th style={thStyle}>Disease</th><th style={thStyle}>Patient</th><th style={thStyle}>Age/Sex</th><th style={thStyle}>District</th><th style={thStyle}>Onset</th><th style={thStyle}>Reported</th><th style={thStyle}>Status</th></tr></thead>
                  <tbody>
                    {filtered.map(r => {
                      const sc = statusColor(r.status);
                      return (
                        <tr key={r.id}>
                          <td style={tdStyle}>{r.disease}</td>
                          <td style={tdStyle}>{r.patient}</td>
                          <td style={tdStyle}>{r.age || '-'}/{r.sex}</td>
                          <td style={tdStyle}>{r.district}</td>
                          <td style={tdStyle}>{r.onset_date}</td>
                          <td style={tdStyle}>{r.report_date}</td>
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
  );
}
