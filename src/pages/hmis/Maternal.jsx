// FileName: src/pages/hmis/Maternal.jsx
// Maternal Health — ANC visits, Deliveries, PNC visits
// localStorage persistence under 'hmis_maternal_*' keys

import React, { useState, useEffect } from 'react';

const C = {
  bg: '#071b2f', card: '#0d2640', cardAlt: '#0a2238', input: '#0a1f36',
  border: '#1a3a5c', green: '#0b8043', greenLight: '#0ca252',
  text: '#e6f0fa', muted: '#8da7c1', red: '#d32f2f', orange: '#e8710a',
  blue: '#1a73e8', pink: '#c2185b',
};

const DELIVERY_TYPES = ['SVD', 'C-section', 'Assisted (Vacuum/Forceps)'];
const FP_METHODS = ['None', 'Pills (COC/POP)', 'Injectable', 'Implant', 'IUD', 'Tubal Ligation', 'Condoms'];

const EMPTY_ANC = {
  mother: '', gestation_weeks: '', bp_systolic: '', bp_diastolic: '',
  weight_kg: '', fundal_height_cm: '', fetal_hr: '', notes: '',
  next_visit: new Date().toISOString().slice(0, 10), visit_date: new Date().toISOString().slice(0, 10),
};

const EMPTY_DELIVERY = {
  mother: '', delivery_date: new Date().toISOString().slice(0, 10),
  delivery_type: DELIVERY_TYPES[0], outcome: 'Live birth', birth_weight_kg: '',
  apgar_1: '', apgar_5: '', notes: '',
};

const EMPTY_PNC = {
  mother: '', visit_date: new Date().toISOString().slice(0, 10),
  bp_systolic: '', bp_diastolic: '', temp_c: '', breast_exam: '',
  perineum: '', baby_weight_kg: '', family_planning: FP_METHODS[0], notes: '',
};

const DELIVERY_OUTCOMES = ['Live birth', 'Stillbirth (fresh)', 'Stillbirth (macerated)', 'Neonatal death'];

function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Maternal() {
  const [tab, setTab] = useState('anc');
  const [anc, setAnc] = useLocalState('hmis_maternal_anc', []);
  const [deliveries, setDeliveries] = useLocalState('hmis_maternal_deliveries', []);
  const [pnc, setPnc] = useLocalState('hmis_maternal_pnc', []);
  const [ancForm, setAncForm] = useState(EMPTY_ANC);
  const [delForm, setDelForm] = useState(EMPTY_DELIVERY);
  const [pncForm, setPncForm] = useState(EMPTY_PNC);
  const [msg, setMsg] = useState('');

  const saveAnc = (e) => {
    e.preventDefault();
    if (!ancForm.mother) { setMsg('❌ Mother name is required'); return; }
    const id = 'ANC-' + Date.now().toString().slice(-8);
    setAnc([{ ...ancForm, id, created_at: todayStr() }, ...anc]);
    setAncForm({ ...EMPTY_ANC, visit_date: todayStr(), next_visit: todayStr() });
    setMsg('✅ ANC visit recorded');
  };

  const saveDel = (e) => {
    e.preventDefault();
    if (!delForm.mother) { setMsg('❌ Mother name is required'); return; }
    const id = 'DEL-' + Date.now().toString().slice(-8);
    setDeliveries([{ ...delForm, id, created_at: todayStr() }, ...deliveries]);
    setDelForm({ ...EMPTY_DELIVERY, delivery_date: todayStr() });
    setMsg('✅ Delivery recorded');
  };

  const savePnc = (e) => {
    e.preventDefault();
    if (!pncForm.mother) { setMsg('❌ Mother name is required'); return; }
    const id = 'PNC-' + Date.now().toString().slice(-8);
    setPnc([{ ...pncForm, id, created_at: todayStr() }, ...pnc]);
    setPncForm({ ...EMPTY_PNC, visit_date: todayStr() });
    setMsg('✅ PNC visit recorded');
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

  const thStyle = { textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` };
  const tdStyle = { padding: '11px 12px', fontSize: '13px', borderBottom: `1px solid ${C.border}` };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>🤰 Maternal Health</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>ANC visits · Deliveries · PNC visits</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('anc', '📋 ANC Visits', tab === 'anc')}
        {tabBtn('deliveries', '👶 Deliveries', tab === 'deliveries')}
        {tabBtn('pnc', '🤱 PNC Visits', tab === 'pnc')}
      </div>

      {tab === 'anc' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>New ANC Visit</div>
            <div style={bodyStyle}>
              <form onSubmit={saveAnc}>
                <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Mother Name *</label><input style={inputStyle} value={ancForm.mother} onChange={(e) => setAncForm({ ...ancForm, mother: e.target.value })} required /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Gestation (wks)</label><input style={inputStyle} type="number" value={ancForm.gestation_weeks} onChange={(e) => setAncForm({ ...ancForm, gestation_weeks: e.target.value })} placeholder="28" /></div>
                  <div><label style={labelStyle}>BP Sys</label><input style={inputStyle} type="number" value={ancForm.bp_systolic} onChange={(e) => setAncForm({ ...ancForm, bp_systolic: e.target.value })} placeholder="120" /></div>
                  <div><label style={labelStyle}>BP Dia</label><input style={inputStyle} type="number" value={ancForm.bp_diastolic} onChange={(e) => setAncForm({ ...ancForm, bp_diastolic: e.target.value })} placeholder="80" /></div>
                  <div><label style={labelStyle}>Weight (kg)</label><input style={inputStyle} type="number" step="0.1" value={ancForm.weight_kg} onChange={(e) => setAncForm({ ...ancForm, weight_kg: e.target.value })} placeholder="65" /></div>
                  <div><label style={labelStyle}>Fundal Ht (cm)</label><input style={inputStyle} type="number" step="0.1" value={ancForm.fundal_height_cm} onChange={(e) => setAncForm({ ...ancForm, fundal_height_cm: e.target.value })} placeholder="28" /></div>
                  <div><label style={labelStyle}>Fetal HR (bpm)</label><input style={inputStyle} type="number" value={ancForm.fetal_hr} onChange={(e) => setAncForm({ ...ancForm, fetal_hr: e.target.value })} placeholder="140" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div><label style={labelStyle}>Visit Date</label><input style={inputStyle} type="date" value={ancForm.visit_date} onChange={(e) => setAncForm({ ...ancForm, visit_date: e.target.value })} /></div>
                  <div><label style={labelStyle}>Next Visit</label><input style={inputStyle} type="date" value={ancForm.next_visit} onChange={(e) => setAncForm({ ...ancForm, next_visit: e.target.value })} /></div>
                </div>
                <div style={{ marginTop: '12px' }}><label style={labelStyle}>Notes</label><input style={inputStyle} value={ancForm.notes} onChange={(e) => setAncForm({ ...ancForm, notes: e.target.value })} placeholder="e.g. Iron+folic acid given" /></div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Save ANC Visit</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>ANC Visits ({anc.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {anc.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No ANC visits yet. Add your first ANC visit above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                    <thead><tr><th style={thStyle}>Mother</th><th style={thStyle}>Gest</th><th style={thStyle}>BP</th><th style={thStyle}>Wt</th><th style={thStyle}>Fundal</th><th style={thStyle}>FHR</th><th style={thStyle}>Visit</th><th style={thStyle}>Next</th></tr></thead>
                    <tbody>
                      {anc.map(a => (
                        <tr key={a.id}>
                          <td style={tdStyle}>{a.mother}</td>
                          <td style={tdStyle}>{a.gestation_weeks || '-'}</td>
                          <td style={tdStyle}>{a.bp_systolic || '-'}/{a.bp_diastolic || '-'}</td>
                          <td style={tdStyle}>{a.weight_kg || '-'}</td>
                          <td style={tdStyle}>{a.fundal_height_cm || '-'}</td>
                          <td style={tdStyle}>{a.fetal_hr || '-'}</td>
                          <td style={tdStyle}>{a.visit_date}</td>
                          <td style={tdStyle}>{a.next_visit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'deliveries' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>Record Delivery</div>
            <div style={bodyStyle}>
              <form onSubmit={saveDel}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Mother Name *</label><input style={inputStyle} value={delForm.mother} onChange={(e) => setDelForm({ ...delForm, mother: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Delivery Date</label><input style={inputStyle} type="date" value={delForm.delivery_date} onChange={(e) => setDelForm({ ...delForm, delivery_date: e.target.value })} /></div>
                  <div><label style={labelStyle}>Delivery Type</label>
                    <select style={inputStyle} value={delForm.delivery_type} onChange={(e) => setDelForm({ ...delForm, delivery_type: e.target.value })}>
                      {DELIVERY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Outcome</label>
                    <select style={inputStyle} value={delForm.outcome} onChange={(e) => setDelForm({ ...delForm, outcome: e.target.value })}>
                      {DELIVERY_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Birth Weight (kg)</label><input style={inputStyle} type="number" step="0.01" value={delForm.birth_weight_kg} onChange={(e) => setDelForm({ ...delForm, birth_weight_kg: e.target.value })} placeholder="3.2" /></div>
                  <div><label style={labelStyle}>APGAR (1min)</label><input style={inputStyle} type="number" value={delForm.apgar_1} onChange={(e) => setDelForm({ ...delForm, apgar_1: e.target.value })} placeholder="8" /></div>
                  <div><label style={labelStyle}>APGAR (5min)</label><input style={inputStyle} type="number" value={delForm.apgar_5} onChange={(e) => setDelForm({ ...delForm, apgar_5: e.target.value })} placeholder="9" /></div>
                </div>
                <div style={{ marginTop: '12px' }}><label style={labelStyle}>Notes</label><input style={inputStyle} value={delForm.notes} onChange={(e) => setDelForm({ ...delForm, notes: e.target.value })} placeholder="e.g. Referred to HC IV for C-section" /></div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Record Delivery</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Deliveries ({deliveries.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {deliveries.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No deliveries recorded yet. Add your first delivery above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                    <thead><tr><th style={thStyle}>Mother</th><th style={thStyle}>Date</th><th style={thStyle}>Type</th><th style={thStyle}>Outcome</th><th style={thStyle}>Weight</th><th style={thStyle}>APGAR 1/5</th></tr></thead>
                    <tbody>
                      {deliveries.map(d => {
                        const outColor = d.outcome.includes('Live') ? C.green : (d.outcome.includes('death') || d.outcome.includes('Stillbirth')) ? C.red : C.orange;
                        return (
                          <tr key={d.id}>
                            <td style={tdStyle}>{d.mother}</td>
                            <td style={tdStyle}>{d.delivery_date}</td>
                            <td style={tdStyle}>{d.delivery_type}</td>
                            <td style={tdStyle}>
                              <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${outColor}22`, color: outColor, border: `1px solid ${outColor}` }}>{d.outcome}</span>
                            </td>
                            <td style={tdStyle}>{d.birth_weight_kg ? d.birth_weight_kg + ' kg' : '-'}</td>
                            <td style={tdStyle}>{d.apgar_1 || '-'}/{d.apgar_5 || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'pnc' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>New PNC Visit</div>
            <div style={bodyStyle}>
              <form onSubmit={savePnc}>
                <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Mother Name *</label><input style={inputStyle} value={pncForm.mother} onChange={(e) => setPncForm({ ...pncForm, mother: e.target.value })} required /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>BP Sys</label><input style={inputStyle} type="number" value={pncForm.bp_systolic} onChange={(e) => setPncForm({ ...pncForm, bp_systolic: e.target.value })} /></div>
                  <div><label style={labelStyle}>BP Dia</label><input style={inputStyle} type="number" value={pncForm.bp_diastolic} onChange={(e) => setPncForm({ ...pncForm, bp_diastolic: e.target.value })} /></div>
                  <div><label style={labelStyle}>Temp (°C)</label><input style={inputStyle} type="number" step="0.1" value={pncForm.temp_c} onChange={(e) => setPncForm({ ...pncForm, temp_c: e.target.value })} /></div>
                  <div><label style={labelStyle}>Breast Exam</label><input style={inputStyle} value={pncForm.breast_exam} onChange={(e) => setPncForm({ ...pncForm, breast_exam: e.target.value })} placeholder="Normal" /></div>
                  <div><label style={labelStyle}>Perineum</label><input style={inputStyle} value={pncForm.perineum} onChange={(e) => setPncForm({ ...pncForm, perineum: e.target.value })} placeholder="Intact" /></div>
                  <div><label style={labelStyle}>Baby Wt (kg)</label><input style={inputStyle} type="number" step="0.01" value={pncForm.baby_weight_kg} onChange={(e) => setPncForm({ ...pncForm, baby_weight_kg: e.target.value })} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                  <div><label style={labelStyle}>Visit Date</label><input style={inputStyle} type="date" value={pncForm.visit_date} onChange={(e) => setPncForm({ ...pncForm, visit_date: e.target.value })} /></div>
                  <div><label style={labelStyle}>Family Planning</label>
                    <select style={inputStyle} value={pncForm.family_planning} onChange={(e) => setPncForm({ ...pncForm, family_planning: e.target.value })}>
                      {FP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}><label style={labelStyle}>Notes</label><input style={inputStyle} value={pncForm.notes} onChange={(e) => setPncForm({ ...pncForm, notes: e.target.value })} /></div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Save PNC Visit</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>PNC Visits ({pnc.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {pnc.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No PNC visits yet. Add your first PNC visit above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
                    <thead><tr><th style={thStyle}>Mother</th><th style={thStyle}>Date</th><th style={thStyle}>BP</th><th style={thStyle}>Temp</th><th style={thStyle}>Breast</th><th style={thStyle}>Perineum</th><th style={thStyle}>Baby Wt</th><th style={thStyle}>FP Method</th></tr></thead>
                    <tbody>
                      {pnc.map(p => (
                        <tr key={p.id}>
                          <td style={tdStyle}>{p.mother}</td>
                          <td style={tdStyle}>{p.visit_date}</td>
                          <td style={tdStyle}>{p.bp_systolic || '-'}/{p.bp_diastolic || '-'}</td>
                          <td style={tdStyle}>{p.temp_c || '-'}</td>
                          <td style={tdStyle}>{p.breast_exam || '-'}</td>
                          <td style={tdStyle}>{p.perineum || '-'}</td>
                          <td style={tdStyle}>{p.baby_weight_kg || '-'}</td>
                          <td style={tdStyle}>{p.family_planning}</td>
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
