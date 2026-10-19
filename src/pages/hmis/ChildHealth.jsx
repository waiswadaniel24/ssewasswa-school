// FileName: src/pages/hmis/ChildHealth.jsx
// Under-5 Child Wellness Visits — Growth Monitoring, IMCI Assessment, Schedule tracker
// localStorage persistence under 'hmis_child_wellness' and 'hmis_child_imci'

import React, { useState, useEffect } from 'react';

const C = {
  bg: '#071b2f',
  card: '#0d2640',
  cardAlt: '#0a2238',
  input: '#0a1f36',
  border: '#1a3a5c',
  green: '#0b8043',
  greenLight: '#0ca252',
  text: '#e6f0fa',
  muted: '#8da7c1',
  red: '#d32f2f',
  orange: '#e8710a',
  blue: '#1a73e8',
  pink: '#e91e63',
  yellow: '#f5c518',
};

const DANGER_SIGNS = [
  { id: 'unable_drink', label: 'Unable to drink/breastfeed' },
  { id: 'vomits_all', label: 'Vomits everything' },
  { id: 'convulsions', label: 'Convulsions' },
  { id: 'lethargic', label: 'Lethargic / unconscious' },
  { id: 'fast_breathing', label: 'Fast breathing' },
  { id: 'chest_indrawing', label: 'Chest indrawing' },
  { id: 'stridor', label: 'Stridor' },
  { id: 'severe_wasting', label: 'Severe wasting' },
];

const CLASSIFICATIONS = [
  { id: 'severe', label: 'Severe', color: 'Pink', action: 'Urgent referral', css: C.red },
  { id: 'moderate', label: 'Moderate', color: 'Yellow', action: 'Outpatient', css: C.yellow },
  { id: 'simple', label: 'Simple', color: 'Green', action: 'Home care', css: C.green },
];

const EMPTY_VISIT = {
  child_name: '', age_months: '', weight_kg: '', height_cm: '', muac_mm: '',
  vit_a: 'No', deworming: 'No', visit_date: '',
};

const EMPTY_IMCI = {
  child_name: '', age_months: '', complaint: '',
  danger_signs: {}, classification: '', treatment: '', follow_up_date: '',
};

function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

// Nutritional status from MUAC (mm). <115 SAM, 115-125 MAM, >125 Normal.
function muacStatus(muac_mm) {
  const v = parseFloat(muac_mm);
  if (isNaN(v) || muac_mm === '') return { label: '—', full: 'Enter MUAC', color: C.muted, level: 'none' };
  if (v < 115) return { label: 'SAM', full: 'Severe Acute Malnutrition', color: C.red, level: 'sam' };
  if (v <= 125) return { label: 'MAM', full: 'Moderate Acute Malnutrition', color: C.orange, level: 'mam' };
  return { label: 'Normal', full: 'Normal', color: C.green, level: 'normal' };
}

function monthsBetween(aStr, bStr) {
  const da = new Date(aStr), db = new Date(bStr);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return Infinity;
  let m = (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth());
  if (db.getDate() < da.getDate()) m -= 1;
  return m;
}

function dayDiff(aStr, bStr) {
  const da = new Date(aStr), db = new Date(bStr);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

export default function ChildHealth() {
  const [tab, setTab] = useState('growth');
  const [visits, setVisits] = useLocalState('hmis_child_wellness', []);
  const [imci, setImci] = useLocalState('hmis_child_imci', []);
  const [visitForm, setVisitForm] = useState({ ...EMPTY_VISIT, visit_date: todayStr() });
  const [imciForm, setImciForm] = useState({ ...EMPTY_IMCI });
  const [chartChild, setChartChild] = useState('');
  const [msg, setMsg] = useState('');

  const liveStatus = muacStatus(visitForm.muac_mm);

  // ---- Growth Monitoring ----
  const addVisit = (e) => {
    e.preventDefault();
    if (!visitForm.child_name || !visitForm.age_months) { setMsg('❌ Child name and age (months) are required'); return; }
    if (visitForm.weight_kg && isNaN(parseFloat(visitForm.weight_kg))) { setMsg('❌ Weight must be a number'); return; }
    if (visitForm.height_cm && isNaN(parseFloat(visitForm.height_cm))) { setMsg('❌ Height must be a number'); return; }
    if (visitForm.muac_mm && isNaN(parseFloat(visitForm.muac_mm))) { setMsg('❌ MUAC must be a number'); return; }
    const id = 'CHW-' + Date.now().toString().slice(-8);
    const status = muacStatus(visitForm.muac_mm);
    const record = {
      ...visitForm,
      age_months: parseInt(visitForm.age_months) || 0,
      weight_kg: visitForm.weight_kg,
      height_cm: visitForm.height_cm,
      muac_mm: visitForm.muac_mm,
      status: status.label,
      id, created_at: todayStr(),
    };
    setVisits([record, ...visits]);
    setChartChild(visitForm.child_name);
    setVisitForm({ ...EMPTY_VISIT, visit_date: todayStr() });
    setMsg('✅ Wellness visit recorded. ID: ' + id);
  };

  const deleteVisit = (id) => {
    setVisits(visits.filter(v => v.id !== id));
    setMsg('🗑️ Visit deleted');
  };

  // Trend: weight change vs. previous (earlier-dated) visit for same child
  const visitsSorted = [...visits].sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date) || (b.id < a.id ? -1 : 1));
  const trendFor = (v) => {
    const prior = visits
      .filter(x => x.child_name === v.child_name && new Date(x.visit_date) < new Date(v.visit_date))
      .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0];
    if (!prior || !v.weight_kg || !prior.weight_kg) return null;
    const diff = parseFloat(v.weight_kg) - parseFloat(prior.weight_kg);
    return diff;
  };

  // ---- IMCI ----
  const addImci = (e) => {
    e.preventDefault();
    if (!imciForm.child_name || !imciForm.complaint) { setMsg('❌ Child name and presenting complaint are required'); return; }
    if (!imciForm.classification) { setMsg('❌ Select IMCI classification'); return; }
    const id = 'IMC-' + Date.now().toString().slice(-8);
    const dangerArr = DANGER_SIGNS.filter(d => imciForm.danger_signs[d.id]).map(d => d.id);
    const cls = CLASSIFICATIONS.find(c => c.id === imciForm.classification);
    const record = {
      ...imciForm,
      age_months: parseInt(imciForm.age_months) || 0,
      danger_signs: dangerArr,
      classification_label: cls ? `${cls.label} (${cls.color})` : imciForm.classification,
      id, created_at: todayStr(),
    };
    setImci([record, ...imci]);
    setImciForm({ ...EMPTY_IMCI });
    setMsg('✅ IMCI assessment recorded. ID: ' + id);
  };

  const deleteImci = (id) => {
    setImci(imci.filter(r => r.id !== id));
    setMsg('🗑️ IMCI record deleted');
  };

  const toggleDanger = (signId) => setImciForm({
    ...imciForm,
    danger_signs: { ...imciForm.danger_signs, [signId]: !imciForm.danger_signs[signId] },
  });

  const selectedClass = CLASSIFICATIONS.find(c => c.id === imciForm.classification);

  // ---- Schedule: aggregate children from wellness visits ----
  const childrenMap = {};
  visits.forEach(v => {
    if (!v.child_name) return;
    const cur = childrenMap[v.child_name];
    if (!cur || new Date(v.visit_date) > new Date(cur.visit_date)) {
      childrenMap[v.child_name] = v;
    }
  });

  const today = todayStr();
  const schedule = Object.entries(childrenMap).map(([name, latest]) => {
    const childVisits = visits
      .filter(v => v.child_name === name)
      .sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date));
    const lastVitA = [...childVisits].reverse().find(v => v.vit_a === 'Yes');
    const lastDeworm = [...childVisits].reverse().find(v => v.deworming === 'Yes');
    const ageMo = parseInt(latest.age_months) || 0;
    const vitADue = !lastVitA || monthsBetween(lastVitA.visit_date, today) >= 6;
    const dewormEligible = ageMo >= 12;
    const dewormDue = dewormEligible && (!lastDeworm || monthsBetween(lastDeworm.visit_date, today) >= 6);
    return {
      name,
      age_months: ageMo,
      lastVisit: latest.visit_date,
      lastVitA: lastVitA ? lastVitA.visit_date : null,
      lastDeworm: lastDeworm ? lastDeworm.visit_date : null,
      vitADue,
      dewormEligible,
      dewormDue,
    };
  }).sort((a, b) => (a.vitADue || a.dewormDue ? 0 : 1) - (b.vitADue || b.dewormDue ? 0 : 1) || a.name.localeCompare(b.name));

  const dueVitACount = schedule.filter(c => c.vitADue).length;
  const dueDewormCount = schedule.filter(c => c.dewormDue).length;

  // ---- Weight chart ----
  const childNames = [...new Set(visits.map(v => v.child_name).filter(Boolean))];
  const chartData = chartChild
    ? visits.filter(v => v.child_name === chartChild).sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date))
    : [];
  const maxW = chartData.length ? Math.max(...chartData.map(v => parseFloat(v.weight_kg) || 0), 1) : 1;

  // ---- Styles ----
  const inputStyle = { width: '100%', padding: '11px 14px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' };
  const btnStyle = { padding: '11px 22px', background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,128,67,0.3)' };
  const ghostBtn = { padding: '7px 14px', background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' };
  const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', marginBottom: '20px' };
  const headerStyle = { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: '15px' };
  const bodyStyle = { padding: '20px' };
  const thStyle = { textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` };
  const tdStyle = { padding: '11px 12px', fontSize: '13px' };

  const tabBtn = (id, label, active) => (
    <button key={id} onClick={() => { setTab(id); setMsg(''); }} style={{
      padding: '10px 18px', background: active ? `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)` : 'transparent',
      color: active ? '#fff' : C.muted, border: `1px solid ${active ? C.green : C.border}`, borderRadius: '8px',
      fontWeight: 600, fontSize: '13px', cursor: 'pointer', marginBottom: '6px',
    }}>{label}</button>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>👶 Child Health (Under-5)</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Growth Monitoring · IMCI Assessment · Vitamin A & Deworming Schedule</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : msg.includes('🗑️') ? 'rgba(26,58,92,0.4)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : msg.includes('🗑️') ? C.border : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('growth', '📊 Growth Monitoring', tab === 'growth')}
        {tabBtn('imci', '🩺 IMCI Assessment', tab === 'imci')}
        {tabBtn('schedule', '📅 Schedule', tab === 'schedule')}
      </div>

      {tab === 'growth' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={cardStyle}>
              <div style={headerStyle}>New Wellness Visit</div>
              <div style={bodyStyle}>
                <form onSubmit={addVisit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Child Name *</label><input style={inputStyle} value={visitForm.child_name} onChange={(e) => setVisitForm({ ...visitForm, child_name: e.target.value })} placeholder="e.g. Baby Nakato" required /></div>
                    <div><label style={labelStyle}>Age (months) *</label><input style={inputStyle} type="number" min="0" max="60" value={visitForm.age_months} onChange={(e) => setVisitForm({ ...visitForm, age_months: e.target.value })} placeholder="18" required /></div>
                    <div><label style={labelStyle}>Visit Date</label><input style={inputStyle} type="date" value={visitForm.visit_date} onChange={(e) => setVisitForm({ ...visitForm, visit_date: e.target.value })} /></div>
                    <div><label style={labelStyle}>Weight (kg)</label><input style={inputStyle} type="number" step="0.1" min="0" value={visitForm.weight_kg} onChange={(e) => setVisitForm({ ...visitForm, weight_kg: e.target.value })} placeholder="9.5" /></div>
                    <div><label style={labelStyle}>Height (cm)</label><input style={inputStyle} type="number" step="0.1" min="0" value={visitForm.height_cm} onChange={(e) => setVisitForm({ ...visitForm, height_cm: e.target.value })} placeholder="75.0" /></div>
                    <div><label style={labelStyle}>MUAC (mm)</label><input style={inputStyle} type="number" step="1" min="0" value={visitForm.muac_mm} onChange={(e) => setVisitForm({ ...visitForm, muac_mm: e.target.value })} placeholder="125" />
                      <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: `${liveStatus.color}1a`, border: `1px solid ${liveStatus.color}`, color: liveStatus.color, fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                        {liveStatus.label === '—' ? 'MUAC status will appear here' : `Status: ${liveStatus.label} — ${liveStatus.full}`}
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Vitamin A Given</label>
                      <select style={inputStyle} value={visitForm.vit_a} onChange={(e) => setVisitForm({ ...visitForm, vit_a: e.target.value })}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Deworming Given</label>
                      <select style={inputStyle} value={visitForm.deworming} onChange={(e) => setVisitForm({ ...visitForm, deworming: e.target.value })}>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Save Visit</button>
                </form>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={headerStyle}>Weight Trend Chart</div>
              <div style={bodyStyle}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={labelStyle}>Select Child</label>
                  <select style={inputStyle} value={chartChild} onChange={(e) => setChartChild(e.target.value)}>
                    <option value="">— select child —</option>
                    {childNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {!chartChild
                  ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px', fontSize: '13px' }}>Select a child to view their weight trend.</p>
                  : chartData.length === 0
                    ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px', fontSize: '13px' }}>No visits recorded for {chartChild}.</p>
                    : (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '180px', padding: '10px 4px', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
                          {chartData.map(v => {
                            const w = parseFloat(v.weight_kg) || 0;
                            const h = Math.max(4, (w / maxW) * 150);
                            return (
                              <div key={v.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '34px' }}>
                                <div style={{ fontSize: '10px', color: C.green, fontWeight: 700, marginBottom: '4px' }}>{w || '-'}</div>
                                <div style={{ width: '22px', height: `${h}px`, background: `linear-gradient(180deg, ${C.greenLight} 0%, ${C.green} 100%)`, borderRadius: '4px 4px 0 0', boxShadow: '0 2px 4px rgba(11,128,67,0.3)' }} title={`${v.weight_kg} kg on ${v.visit_date}`} />
                                <div style={{ fontSize: '9px', color: C.muted, marginTop: '4px', textAlign: 'center' }}>{v.visit_date.slice(5)}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '11px', color: C.muted, textAlign: 'center' }}>Weight (kg) over visits · {chartData.length} visit(s)</div>
                      </div>
                    )}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Wellness Visits ({visits.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {visits.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No wellness visits yet. Record your first visit above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '880px' }}>
                    <thead><tr>
                      {['Date', 'Child', 'Age (mo)', 'Weight (kg)', 'Trend', 'Height (cm)', 'MUAC (mm)', 'Status', 'Vit A', 'Deworm', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {visitsSorted.map(v => {
                        const st = muacStatus(v.muac_mm);
                        const trend = trendFor(v);
                        return (
                          <tr key={v.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={tdStyle}>{v.visit_date}<div style={{ fontSize: '11px', color: C.muted }}>{v.id}</div></td>
                            <td style={tdStyle}>{v.child_name}</td>
                            <td style={tdStyle}>{v.age_months}</td>
                            <td style={tdStyle}>{v.weight_kg || '-'}</td>
                            <td style={tdStyle}>
                              {trend === null ? <span style={{ color: C.muted }}>—</span>
                                : trend > 0 ? <span style={{ color: C.green }}>▲ {trend.toFixed(1)}kg</span>
                                : trend < 0 ? <span style={{ color: C.red }}>▼ {Math.abs(trend).toFixed(1)}kg</span>
                                : <span style={{ color: C.muted }}>● 0.0kg</span>}
                            </td>
                            <td style={tdStyle}>{v.height_cm || '-'}</td>
                            <td style={tdStyle}>{v.muac_mm || '-'}</td>
                            <td style={tdStyle}>
                              <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${st.color}22`, color: st.color, border: `1px solid ${st.color}` }}>{v.status || st.label}</span>
                            </td>
                            <td style={tdStyle}>
                              <span style={{ color: v.vit_a === 'Yes' ? C.green : C.muted, fontWeight: v.vit_a === 'Yes' ? 700 : 400 }}>{v.vit_a}</span>
                            </td>
                            <td style={tdStyle}>
                              <span style={{ color: v.deworming === 'Yes' ? C.green : C.muted, fontWeight: v.deworming === 'Yes' ? 700 : 400 }}>{v.deworming}</span>
                            </td>
                            <td style={tdStyle}><button style={ghostBtn} onClick={() => deleteVisit(v.id)}>Delete</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'imci' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={cardStyle}>
              <div style={headerStyle}>New IMCI Assessment</div>
              <div style={bodyStyle}>
                <form onSubmit={addImci}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Child Name *</label><input style={inputStyle} value={imciForm.child_name} onChange={(e) => setImciForm({ ...imciForm, child_name: e.target.value })} placeholder="e.g. Baby Ssempijja" required /></div>
                    <div><label style={labelStyle}>Age (months)</label><input style={inputStyle} type="number" min="0" max="60" value={imciForm.age_months} onChange={(e) => setImciForm({ ...imciForm, age_months: e.target.value })} placeholder="24" /></div>
                    <div><label style={labelStyle}>Assessment Date</label><input style={inputStyle} type="date" value={imciForm.assess_date || todayStr()} onChange={(e) => setImciForm({ ...imciForm, assess_date: e.target.value })} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Presenting Complaint *</label><input style={inputStyle} value={imciForm.complaint} onChange={(e) => setImciForm({ ...imciForm, complaint: e.target.value })} placeholder="e.g. Cough × 3 days, fever, difficulty breathing" required /></div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <label style={labelStyle}>General Danger Signs (check all present)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                      {DANGER_SIGNS.map(s => {
                        const checked = !!imciForm.danger_signs[s.id];
                        return (
                          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: checked ? `${C.red}1a` : C.input, border: `1px solid ${checked ? C.red : C.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: checked ? C.text : C.muted }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleDanger(s.id)} style={{ accentColor: C.red, width: '16px', height: '16px' }} />
                            <span style={{ fontWeight: checked ? 600 : 400 }}>{s.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <label style={labelStyle}>Classification *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                      {CLASSIFICATIONS.map(c => {
                        const active = imciForm.classification === c.id;
                        return (
                          <button type="button" key={c.id} onClick={() => setImciForm({ ...imciForm, classification: c.id })} style={{
                            padding: '12px 8px', background: active ? `${c.css}22` : C.input, color: active ? c.css : C.muted,
                            border: `1px solid ${active ? c.css : C.border}`, borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', textAlign: 'center',
                          }}>
                            <div style={{ fontSize: '16px', fontWeight: 800 }}>{c.color}</div>
                            <div style={{ marginTop: '4px' }}>{c.label}</div>
                            <div style={{ fontSize: '10px', fontWeight: 400, marginTop: '2px', opacity: 0.85 }}>{c.action}</div>
                          </button>
                        );
                      })}
                    </div>
                    {selectedClass && (
                      <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: `${selectedClass.css}14`, border: `1px solid ${selectedClass.css}`, color: selectedClass.css, fontSize: '12px', fontWeight: 600 }}>
                        Selected: {selectedClass.label} ({selectedClass.color}) → {selectedClass.action}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px' }}>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Treatment Given</label><input style={inputStyle} value={imciForm.treatment} onChange={(e) => setImciForm({ ...imciForm, treatment: e.target.value })} placeholder="e.g. ORS, Amoxicillin DT × 5 days, Paracetamol" /></div>
                    <div><label style={labelStyle}>Follow-up Date</label><input style={inputStyle} type="date" value={imciForm.follow_up_date} onChange={(e) => setImciForm({ ...imciForm, follow_up_date: e.target.value })} /></div>
                  </div>

                  <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Save IMCI Assessment</button>
                </form>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={headerStyle}>IMCI Color Guide</div>
              <div style={bodyStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {CLASSIFICATIONS.map(c => (
                    <div key={c.id} style={{ padding: '14px', borderRadius: '8px', background: `${c.css}14`, border: `1px solid ${c.css}`, borderLeft: `6px solid ${c.css}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: c.css, display: 'inline-block' }} />
                        <strong style={{ color: c.css, fontSize: '14px' }}>{c.label}</strong>
                        <span style={{ color: C.muted, fontSize: '12px' }}>({c.color})</span>
                      </div>
                      <div style={{ color: C.text, fontSize: '13px', marginTop: '6px' }}>{c.action}</div>
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: '16px', fontSize: '12px', color: C.muted, lineHeight: 1.6 }}>
                  Assess every sick child 0–5 years using the IMCI colour triage. Any general danger sign OR a pink classification requires <strong style={{ color: C.red }}>urgent referral</strong> to a higher-level facility.
                </p>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>IMCI Assessment History ({imci.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {imci.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No IMCI assessments yet. Record your first assessment above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                    <thead><tr>
                      {['Date', 'Child', 'Age', 'Complaint', 'Danger Signs', 'Classification', 'Treatment', 'Follow-up', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {[...imci].sort((a, b) => new Date(b.assess_date || b.created_at) - new Date(a.assess_date || a.created_at)).map(r => {
                        const cls = CLASSIFICATIONS.find(c => c.id === r.classification) || { css: C.muted, label: r.classification || '-', color: '', action: '' };
                        const signCount = (r.danger_signs || []).length;
                        return (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={tdStyle}>{r.assess_date || r.created_at}<div style={{ fontSize: '11px', color: C.muted }}>{r.id}</div></td>
                            <td style={tdStyle}>{r.child_name}</td>
                            <td style={tdStyle}>{r.age_months || '-'} mo</td>
                            <td style={{ ...tdStyle, maxWidth: '180px' }}>{r.complaint}</td>
                            <td style={tdStyle}>
                              {signCount === 0 ? <span style={{ color: C.green, fontWeight: 600 }}>None</span>
                                : <span style={{ color: C.red, fontWeight: 700 }}>{signCount} sign(s)</span>}
                              {signCount > 0 && (
                                <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                                  {(r.danger_signs || []).map(id => DANGER_SIGNS.find(s => s.id === id)?.label.split(' ')[0]).join(', ')}
                                </div>
                              )}
                            </td>
                            <td style={tdStyle}>
                              <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${cls.css}22`, color: cls.css, border: `1px solid ${cls.css}` }}>
                                {cls.label} · {cls.color}
                              </span>
                              <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{cls.action}</div>
                            </td>
                            <td style={{ ...tdStyle, maxWidth: '160px' }}>{r.treatment || '-'}</td>
                            <td style={tdStyle}>{r.follow_up_date || '-'}</td>
                            <td style={tdStyle}><button style={ghostBtn} onClick={() => deleteImci(r.id)}>Delete</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'schedule' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ ...cardStyle, marginBottom: 0, padding: '18px 20px', borderLeft: `4px solid ${C.green}` }}>
              <div style={{ fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Children Tracked</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: C.text, marginTop: '4px' }}>{schedule.length}</div>
            </div>
            <div style={{ ...cardStyle, marginBottom: 0, padding: '18px 20px', borderLeft: `4px solid ${C.orange}` }}>
              <div style={{ fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Vitamin A Due</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: C.orange, marginTop: '4px' }}>{dueVitACount}</div>
            </div>
            <div style={{ ...cardStyle, marginBottom: 0, padding: '18px 20px', borderLeft: `4px solid ${C.red}` }}>
              <div style={{ fontSize: '11px', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Deworming Due</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: C.red, marginTop: '4px' }}>{dueDewormCount}</div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Vitamin A & Deworming Schedule</div>
            <div style={bodyStyle}>
              <p style={{ fontSize: '12px', color: C.muted, marginBottom: '16px' }}>
                <strong style={{ color: C.green }}>Vitamin A</strong>: every 6 months (starting from 6 months of age).
                <strong style={{ color: C.green, marginLeft: '12px' }}>Deworming</strong>: every 6 months for children above 1 year ({'>'}12 months).
              </p>
              {schedule.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No children tracked yet. Record wellness visits on the Growth Monitoring tab.</p>
                : <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
                      <thead><tr>
                        {['Child', 'Age (mo)', 'Last Visit', 'Last Vit A', 'Vit A Status', 'Last Deworm', 'Deworm Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {schedule.map(c => {
                          const vitADays = c.lastVitA ? dayDiff(c.lastVitA, today) : null;
                          const dewormDays = c.lastDeworm ? dayDiff(c.lastDeworm, today) : null;
                          return (
                            <tr key={c.name} style={{ borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name}</td>
                              <td style={tdStyle}>{c.age_months}</td>
                              <td style={tdStyle}>{c.lastVisit}</td>
                              <td style={tdStyle}>{c.lastVitA || <span style={{ color: C.muted }}>— never</span>}</td>
                              <td style={tdStyle}>
                                {c.vitADue
                                  ? <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${C.orange}22`, color: C.orange, border: `1px solid ${C.orange}` }}>DUE NOW</span>
                                  : <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}` }}>Up to date {vitADays !== null && <span style={{ fontWeight: 400, color: C.muted }}>· {vitADays}d ago</span>}</span>}
                              </td>
                              <td style={tdStyle}>{c.lastDeworm || <span style={{ color: C.muted }}>— never</span>}</td>
                              <td style={tdStyle}>
                                {!c.dewormEligible
                                  ? <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${C.border}22`, color: C.muted, border: `1px solid ${C.border}` }}>Not eligible (&lt;12 mo)</span>
                                  : c.dewormDue
                                    ? <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}` }}>DUE NOW</span>
                                    : <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}` }}>Up to date {dewormDays !== null && <span style={{ fontWeight: 400, color: C.muted }}>· {dewormDays}d ago</span>}</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
