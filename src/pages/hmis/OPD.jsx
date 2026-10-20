// FileName: src/pages/hmis/OPD.jsx
// Outpatient Department (Form 003) — new visits, today's queue, full visit history
// localStorage persistence under 'hmis_opd_visits'

import React, { useState, useEffect, useMemo } from 'react';

const C = {
  bg: '#071b2f', card: '#0d2640', cardAlt: '#0a2238', input: '#0a1f36',
  border: '#1a3a5c', green: '#0b8043', greenLight: '#0ca252',
  text: '#e6f0fa', muted: '#8da7c1', red: '#d32f2f', orange: '#e8710a',
  blue: '#1a73e8',
};

const SEXES = ['Male', 'Female', 'Other'];
const DOCTORS = ['Dr. Ssewanyana', 'Dr. Nakato', 'Dr. Okello', 'Dr. Achieng', 'Dr. Mugisha', 'Dr. Namuli'];

const COMMON_DX = [
  { code: 'A00', label: 'Cholera' },
  { code: 'B54', label: 'Malaria, unspecified' },
  { code: 'J00', label: 'Acute nasopharyngitis (common cold)' },
  { code: 'J11.1', label: 'Influenza' },
  { code: 'J45.9', label: 'Asthma, unspecified' },
  { code: 'K29.7', label: 'Gastritis' },
  { code: 'K35.80', label: 'Acute appendicitis' },
  { code: 'N39.0', label: 'Urinary tract infection' },
  { code: 'R51', label: 'Headache' },
  { code: 'S93.5', label: 'Sprain of ankle' },
];

const EMPTY_VISIT = {
  patient_name: '', age: '', sex: SEXES[0], phone: '',
  complaint: '', diagnosis_code: '', diagnosis_label: '',
  prescription: '', doctor: DOCTORS[0],
  visit_date: new Date().toISOString().slice(0, 10),
  visit_time: new Date().toTimeString().slice(0, 5),
  bp_systolic: '', bp_diastolic: '', temp_c: '', weight_kg: '',
};

function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function OPD() {
  const [tab, setTab] = useState('new');
  const [visits, setVisits] = useLocalState('hmis_opd_visits', []);
  const [form, setForm] = useState(EMPTY_VISIT);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');

  const todaysVisits = useMemo(
    () => visits.filter(v => v.visit_date === todayStr()),
    [visits]
  );

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return visits;
    const q = search.toLowerCase();
    return visits.filter(v =>
      (v.patient_name || '').toLowerCase().includes(q) ||
      (v.complaint || '').toLowerCase().includes(q) ||
      (v.diagnosis_label || '').toLowerCase().includes(q) ||
      (v.diagnosis_code || '').toLowerCase().includes(q) ||
      (v.doctor || '').toLowerCase().includes(q) ||
      (v.id || '').toLowerCase().includes(q)
    );
  }, [visits, search]);

  const stats = useMemo(() => ({
    total: visits.length,
    today: todaysVisits.length,
    maleToday: todaysVisits.filter(v => v.sex === 'Male').length,
    femaleToday: todaysVisits.filter(v => v.sex === 'Female').length,
  }), [visits, todaysVisits]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.patient_name) { setMsg('❌ Patient name is required'); return; }
    if (!form.complaint) { setMsg('❌ Presenting complaint is required'); return; }
    if (!form.age || isNaN(Number(form.age))) { setMsg('❌ Valid age is required'); return; }
    const id = 'OPD-' + Date.now().toString().slice(-8);
    const record = { ...form, id, created_at: todayStr() };
    setVisits([record, ...visits]);
    setForm({ ...EMPTY_VISIT, visit_date: todayStr(), visit_time: new Date().toTimeString().slice(0, 5) });
    setMsg('✅ Visit saved. Visit ID: ' + id);
  };

  const removeVisit = (id) => {
    if (!window.confirm('Delete this OPD visit record? This cannot be undone.')) return;
    setVisits(visits.filter(v => v.id !== id));
    setMsg('🗑️ Visit ' + id + ' deleted');
  };

  const applyDx = (code) => {
    const match = COMMON_DX.find(d => d.code === code);
    if (match) setForm({ ...form, diagnosis_code: match.code, diagnosis_label: match.label });
  };

  const inputStyle = { width: '100%', padding: '11px 14px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' };
  const btnStyle = { padding: '11px 22px', background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,128,67,0.3)' };
  const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', marginBottom: '20px' };
  const headerStyle = { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: '15px' };
  const bodyStyle = { padding: '20px' };
  const tabBtn = (id, label, active) => (
    <button key={id} onClick={() => { setTab(id); setMsg(''); }} style={{
      padding: '10px 18px', background: active ? `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)` : 'transparent',
      color: active ? '#fff' : C.muted, border: `1px solid ${active ? C.green : C.border}`, borderRadius: '8px',
      fontWeight: 600, fontSize: '13px', cursor: 'pointer', marginBottom: '6px',
    }}>{label}</button>
  );
  const statBox = (label, value, color = C.green) => (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px 20px', flex: '1 1 140px', minWidth: '140px' }}>
      <div style={{ color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{label}</div>
      <div style={{ color, fontSize: '26px', fontWeight: 700 }}>{value}</div>
    </div>
  );
  const thStyle = { textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` };
  const tdStyle = { padding: '11px 12px', fontSize: '13px' };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>🏥 OPD — Outpatient Department (Form 003)</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>New Visit · Today's Queue · Visit History</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') || msg.includes('🗑️') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') || msg.includes('🗑️') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {statBox('Total Visits', stats.total, C.blue)}
        {statBox('Today', stats.today, C.green)}
        {statBox('Male (today)', stats.maleToday, C.blue)}
        {statBox('Female (today)', stats.femaleToday, C.green)}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('new', '➕ New Visit', tab === 'new')}
        {tabBtn('today', '📋 Today\'s Visits', tab === 'today')}
        {tabBtn('history', '📜 Visit History', tab === 'history')}
      </div>

      {tab === 'new' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>New OPD Visit</div>
            <div style={bodyStyle}>
              <form onSubmit={submit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Patient Name *</label><input style={inputStyle} value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} placeholder="John Doe" required /></div>
                  <div><label style={labelStyle}>Age *</label><input style={inputStyle} type="number" min="0" max="130" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="35" required /></div>
                  <div><label style={labelStyle}>Sex *</label>
                    <select style={inputStyle} value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                      {SEXES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+256 7XX XXX XXX" /></div>
                  <div><label style={labelStyle}>Attending Doctor *</label>
                    <select style={inputStyle} value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })}>
                      {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Visit Date</label><input style={inputStyle} type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} /></div>
                  <div><label style={labelStyle}>Visit Time</label><input style={inputStyle} type="time" value={form.visit_time} onChange={(e) => setForm({ ...form, visit_time: e.target.value })} /></div>
                </div>
                <div style={{ marginTop: '14px' }}><label style={labelStyle}>Presenting Complaint *</label><textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} placeholder="Fever 3 days, headache, body pains..." required /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div><label style={labelStyle}>BP (sys)</label><input style={inputStyle} type="number" value={form.bp_systolic} onChange={(e) => setForm({ ...form, bp_systolic: e.target.value })} placeholder="120" /></div>
                  <div><label style={labelStyle}>BP (dia)</label><input style={inputStyle} type="number" value={form.bp_diastolic} onChange={(e) => setForm({ ...form, bp_diastolic: e.target.value })} placeholder="80" /></div>
                  <div><label style={labelStyle}>Temp °C</label><input style={inputStyle} type="number" step="0.1" value={form.temp_c} onChange={(e) => setForm({ ...form, temp_c: e.target.value })} placeholder="37.0" /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Weight (kg)</label><input style={inputStyle} type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} placeholder="65" /></div>
                </div>
                <div style={{ marginTop: '14px' }}><label style={labelStyle}>ICD-10 Diagnosis (quick-pick)</label>
                  <select style={inputStyle} value="" onChange={(e) => e.target.value && applyDx(e.target.value)}>
                    <option value="">— choose from common diagnoses —</option>
                    {COMMON_DX.map(d => <option key={d.code} value={d.code}>{d.code} · {d.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '14px', marginTop: '14px' }}>
                  <div><label style={labelStyle}>ICD-10 Code</label><input style={inputStyle} value={form.diagnosis_code} onChange={(e) => setForm({ ...form, diagnosis_code: e.target.value })} placeholder="B54" /></div>
                  <div><label style={labelStyle}>Diagnosis Label</label><input style={inputStyle} value={form.diagnosis_label} onChange={(e) => setForm({ ...form, diagnosis_label: e.target.value })} placeholder="Malaria, unspecified" /></div>
                </div>
                <div style={{ marginTop: '14px' }}><label style={labelStyle}>Prescription / Treatment Plan</label><textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.prescription} onChange={(e) => setForm({ ...form, prescription: e.target.value })} placeholder="Artemether-Lumefantrine 80/480, 1 tab BD x 6 doses; Paracetamol 1g TDS x 3 days" /></div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Save Visit</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Quick Reference</div>
            <div style={bodyStyle}>
              <p style={{ color: C.muted, fontSize: '13px', lineHeight: 1.6 }}>
                Form 003 is the standard Ugandan OPD visit register. Each visit generates a unique <strong style={{ color: C.green }}>OPD-XXXXXXXX</strong> identifier.
              </p>
              <ul style={{ color: C.muted, fontSize: '13px', lineHeight: 1.8, paddingLeft: '20px' }}>
                <li>Capture complaint, vitals, and ICD-10 diagnosis.</li>
                <li>Prescription field should include drug + dose + frequency + duration.</li>
                <li>Today's visits show on the queue tab for clinician follow-up.</li>
                <li>History tab is searchable by name, complaint, diagnosis, or ID.</li>
              </ul>
              <div style={{ marginTop: '12px', padding: '12px', background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: C.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px', marginBottom: '6px' }}>Today's Queue</div>
                <div style={{ color: C.text, fontSize: '15px' }}>{stats.today} visit(s) registered today</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'today' && (
        <div style={cardStyle}>
          <div style={headerStyle}>Today's Visits ({todaysVisits.length}) — {todayStr()}</div>
          <div style={{ ...bodyStyle, overflowX: 'auto' }}>
            {todaysVisits.length === 0
              ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No visits registered today yet. Add your first visit above.</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                  <thead><tr>
                    {['Patient', 'Age/Sex', 'Complaint', 'Diagnosis', 'Doctor', 'Time', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {todaysVisits.map(v => (
                      <tr key={v.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={tdStyle}>{v.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{v.id}</div></td>
                        <td style={tdStyle}>{v.age || '-'}/{v.sex?.[0] || '-'}</td>
                        <td style={tdStyle}>{v.complaint || '-'}</td>
                        <td style={tdStyle}>{v.diagnosis_code ? `${v.diagnosis_code} · ${v.diagnosis_label || ''}` : '-'}{v.bp_systolic && <div style={{ fontSize: '11px', color: C.muted }}>BP {v.bp_systolic}/{v.bp_diastolic}</div>}</td>
                        <td style={tdStyle}>{v.doctor || '-'}</td>
                        <td style={tdStyle}>{v.visit_time || '-'}</td>
                        <td style={tdStyle}>
                          <button onClick={() => removeVisit(v.id)} style={{ background: 'rgba(211,47,47,0.18)', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div style={cardStyle}>
          <div style={headerStyle}>Visit History ({filteredHistory.length} of {visits.length})</div>
          <div style={bodyStyle}>
            <input style={{ ...inputStyle, marginBottom: '16px' }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search by patient, complaint, diagnosis, doctor, or ID..." />
            <div style={{ overflowX: 'auto' }}>
              {filteredHistory.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No visits recorded yet. Add your first visit above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
                    <thead><tr>
                      {['Patient', 'Age/Sex', 'Complaint', 'Diagnosis', 'Doctor', 'Date', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filteredHistory.map(v => (
                        <tr key={v.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={tdStyle}>{v.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{v.id}</div></td>
                          <td style={tdStyle}>{v.age || '-'}/{v.sex?.[0] || '-'}</td>
                          <td style={tdStyle}>{v.complaint || '-'}</td>
                          <td style={tdStyle}>{v.diagnosis_code ? `${v.diagnosis_code} · ${v.diagnosis_label || ''}` : '-'}</td>
                          <td style={tdStyle}>{v.doctor || '-'}</td>
                          <td style={tdStyle}>{v.visit_date}<div style={{ fontSize: '11px', color: C.muted }}>{v.visit_time || ''}</div></td>
                          <td style={tdStyle}>
                            <button onClick={() => removeVisit(v.id)} style={{ background: 'rgba(211,47,47,0.18)', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
