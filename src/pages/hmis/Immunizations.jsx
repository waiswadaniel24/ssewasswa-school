// FileName: src/pages/hmis/Immunizations.jsx
// EPI Immunization Tracking — vaccines given, lot tracking, monthly bar chart
// localStorage persistence under 'hmis_immunizations'

import React, { useState, useEffect, useMemo } from 'react';

const C = {
  bg: '#071b2f', card: '#0d2640', input: '#0a1f36',
  border: '#1a3a5c', green: '#0b8043', greenLight: '#0ca252',
  text: '#e6f0fa', muted: '#8da7c1', red: '#d32f2f', orange: '#e8710a',
  blue: '#1a73e8',
};

const VACCINES = [
  'BCG', 'OPV0', 'OPV1', 'OPV2', 'OPV3',
  'DPT1', 'DPT2', 'DPT3',
  'HepB0', 'HepB1', 'HepB2', 'HepB3',
  'Measles1', 'Measles2',
  'HPV1', 'HPV2', 'HPV3',
  'Rotavirus1', 'Rotavirus2', 'Rotavirus3',
  'Yellow Fever', 'Vitamin A',
];

const EMPTY = {
  patient: '', vaccine: VACCINES[0],
  date_given: new Date().toISOString().slice(0, 10),
  lot_number: '',
};

function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function monthKey(d) { return d ? d.slice(0, 7) : ''; }
function monthLabel(key) {
  if (!key || key.length < 7) return key || '';
  const [y, m] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[parseInt(m, 10) - 1] + ' ' + y;
}

export default function Immunizations() {
  const [records, setRecords] = useLocalState('hmis_immunizations', []);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState('');

  const save = (e) => {
    e.preventDefault();
    if (!form.patient || !form.vaccine || !form.date_given) { setMsg('❌ Patient, vaccine, and date are required'); return; }
    const id = 'IMM-' + Date.now().toString().slice(-8);
    setRecords([{ ...form, id, created_at: new Date().toISOString().slice(0, 10) }, ...records]);
    setForm({ ...EMPTY, date_given: new Date().toISOString().slice(0, 10) });
    setMsg('✅ Immunization recorded');
  };

  // Per-month bar chart data
  const monthlyData = useMemo(() => {
    const map = {};
    records.forEach(r => { const k = monthKey(r.date_given); map[k] = (map[k] || 0) + 1; });
    const keys = Object.keys(map).sort();
    return keys.map(k => ({ key: k, label: monthLabel(k), count: map[k] }));
  }, [records]);

  const maxCount = Math.max(1, ...monthlyData.map(d => d.count));

  // Vaccine breakdown counts
  const vaccineCounts = useMemo(() => {
    const map = {};
    records.forEach(r => { map[r.vaccine] = (map[r.vaccine] || 0) + 1; });
    return VACCINES.map(v => ({ vaccine: v, count: map[v] || 0 }));
  }, [records]);
  const maxVaccineCount = Math.max(1, ...vaccineCounts.map(v => v.count));

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
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>💉 EPI Immunizations</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Track vaccines given · Lot tracking · Monthly coverage</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={cardStyle}>
          <div style={headerStyle}>Record Immunization</div>
          <div style={bodyStyle}>
            <form onSubmit={save}>
              <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Child / Patient *</label><input style={inputStyle} value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} placeholder="Baby of Mother Name" required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Vaccine *</label>
                  <select style={inputStyle} value={form.vaccine} onChange={(e) => setForm({ ...form, vaccine: e.target.value })}>
                    {VACCINES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Date Given *</label><input style={inputStyle} type="date" value={form.date_given} onChange={(e) => setForm({ ...form, date_given: e.target.value })} required /></div>
              </div>
              <div style={{ marginTop: '12px' }}><label style={labelStyle}>Lot Number</label><input style={inputStyle} value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} placeholder="VVM-checked vial lot" /></div>
              <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Record Immunization</button>
            </form>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}>Immunization Records ({records.length})</div>
          <div style={{ ...bodyStyle, overflowX: 'auto' }}>
            {records.length === 0
              ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No immunizations recorded yet. Add your first immunization above.</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                  <thead><tr><th style={thStyle}>Patient</th><th style={thStyle}>Vaccine</th><th style={thStyle}>Date</th><th style={thStyle}>Lot #</th></tr></thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id}>
                        <td style={tdStyle}>{r.patient}</td>
                        <td style={tdStyle}><span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(11,128,67,0.18)', color: C.green, border: `1px solid ${C.green}` }}>{r.vaccine}</span></td>
                        <td style={tdStyle}>{r.date_given}</td>
                        <td style={tdStyle}>{r.lot_number || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={headerStyle}>Vaccines Given Per Month</div>
        <div style={bodyStyle}>
          {monthlyData.length === 0
            ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No data yet. Record immunizations to see monthly trends.</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {monthlyData.map(m => (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '90px', fontSize: '12px', color: C.muted, fontWeight: 600 }}>{m.label}</div>
                    <div style={{ flex: '1 1 200px', minWidth: '160px', height: '24px', background: C.input, borderRadius: '6px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      <div style={{ width: (m.count / maxCount * 100) + '%', height: '100%', background: `linear-gradient(90deg, ${C.green} 0%, ${C.greenLight} 100%)`, borderRadius: '6px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ minWidth: '40px', fontSize: '13px', color: C.text, fontWeight: 700 }}>{m.count}</div>
                  </div>
                ))}
              </div>}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={headerStyle}>Vaccine Breakdown</div>
        <div style={bodyStyle}>
          {records.length === 0
            ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No data yet.</p>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {vaccineCounts.map(v => (
                  <div key={v.vaccine} style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '13px', color: C.text, fontWeight: 600, marginBottom: '6px' }}>{v.vaccine}</div>
                    <div style={{ height: '8px', background: C.bg, borderRadius: '4px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      <div style={{ width: (v.count / maxVaccineCount * 100) + '%', height: '100%', background: C.green }} />
                    </div>
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>{v.count} given</div>
                  </div>
                ))}
              </div>}
        </div>
      </div>
    </div>
  );
}
