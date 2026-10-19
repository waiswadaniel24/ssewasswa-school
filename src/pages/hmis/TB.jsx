// FileName: src/pages/hmis/TB.jsx
// Tuberculosis (TB) Disease Program — Ugandan DOTS protocol
// localStorage persistence under 'hmis_tb_records'

import React, { useState, useEffect, useMemo } from 'react';

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
  yellow: '#f5b50a',
  purple: '#7b1fa2',
};

const SEX_OPTS = ['Male', 'Female'];
const SITE_OPTS = ['Pulmonary', 'Extra-pulmonary'];
const EPTB_SUBTYPES = ['Pleural', 'Lymph node', 'Spinal', 'Miliary', 'Abdominal'];
const CLASS_OPTS = ['Smear positive', 'Smear negative', 'EPTB'];
const SENS_OPTS = ['Sensitive', 'MDR', 'XDR'];
const PHASE_OPTS = ['Intensive', 'Continuation'];
const REGIMEN_OPTS = ['RHZE', 'RH', 'Bedaquoline'];
const SMEAR_OPTS = ['Positive', 'Negative', 'Not done'];
const XPERT_OPTS = ['Detected MTB', 'Not detected', 'Rif resistant'];
const HIV_OPTS = ['Positive', 'Negative'];
const YESNO_OPTS = ['Yes', 'No'];
const OUTCOMES = ['Cured', 'Treatment completed', 'Treatment failure', 'Died', 'Defaulted', 'Lost to follow-up'];

const EMPTY_CASE = {
  tb_unit_no: '',
  patient_name: '',
  age: '',
  sex: SEX_OPTS[0],
  disease_site: SITE_OPTS[0],
  eptb_subtype: EPTB_SUBTYPES[0],
  classification: CLASS_OPTS[0],
  drug_sensitivity: SENS_OPTS[0],
  treatment_phase: PHASE_OPTS[0],
  regimen: REGIMEN_OPTS[0],
  smear_result: SMEAR_OPTS[0],
  genexpert_result: XPERT_OPTS[0],
  hiv_status: HIV_OPTS[0],
  on_art: YESNO_OPTS[0],
  dots_supporter_name: '',
  dots_supporter_phone: '',
  treatment_start_date: new Date().toISOString().slice(0, 10),
  last_visit_date: new Date().toISOString().slice(0, 10),
  outcome: '',
  outcome_date: '',
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

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

function monthKey(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function monthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[(m - 1) % 12] + ' ' + String(y).slice(-2);
}

// SVG donut/pie chart for two segments
function Donut({ segments, size = 200, thickness = 50 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={C.border} strokeWidth={thickness} />
      {segments.map((seg, i) => {
        const fraction = seg.value / total;
        const dash = fraction * circumference;
        const circle = (
          <circle key={i} cx={cx} cy={cy} r={radius} fill="none" stroke={seg.color}
            strokeWidth={thickness} strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />
        );
        offset += dash;
        return circle;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill={C.text} fontSize="22" fontWeight="700">{total}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill={C.muted} fontSize="11" fontWeight="600">TOTAL</text>
    </svg>
  );
}

export default function TB() {
  const [tab, setTab] = useState('dashboard');
  const [records, setRecords] = useLocalState('hmis_tb_records', []);
  const [form, setForm] = useState(EMPTY_CASE);
  const [outcomeForm, setOutcomeForm] = useState({ case_id: '', outcome: OUTCOMES[0], outcome_date: todayStr(), last_visit_date: '' });
  const [msg, setMsg] = useState('');

  // -------- Derived data ----------
  const kpis = useMemo(() => {
    const onTreatment = records.filter(r => !r.outcome);
    const completed = records.filter(r => r.outcome === 'Cured' || r.outcome === 'Treatment completed');
    const defaulted = records.filter(r => r.outcome === 'Defaulted');
    const died = records.filter(r => r.outcome === 'Died');
    return {
      total: records.length,
      onTreatment: onTreatment.length,
      completed: completed.length,
      defaulted: defaulted.length,
      died: died.length,
    };
  }, [records]);

  // 6-month case chart (last 6 months by treatment_start_date)
  const monthlyData = useMemo(() => {
    const buckets = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      buckets[k] = 0;
    }
    records.forEach(r => {
      const k = monthKey(r.treatment_start_date);
      if (k in buckets) buckets[k]++;
    });
    return Object.entries(buckets).map(([k, v]) => ({ key: k, label: monthLabel(k), value: v }));
  }, [records]);

  // Disease site split for pie
  const siteData = useMemo(() => {
    const pulmonary = records.filter(r => r.disease_site === 'Pulmonary').length;
    const extrapulmonary = records.filter(r => r.disease_site === 'Extra-pulmonary').length;
    return [
      { label: 'Pulmonary', value: pulmonary, color: C.green },
      { label: 'Extra-pulmonary', value: extrapulmonary, color: C.orange },
    ];
  }, [records]);

  // Defaulted / LTFU list — outcome marked OR >2 months since last visit
  const defaultsList = useMemo(() => {
    const cutoff = monthsAgo(2);
    return records.filter(r => {
      const markedDefault = r.outcome === 'Defaulted' || r.outcome === 'Lost to follow-up';
      const overdue = !r.outcome && r.last_visit_date && r.last_visit_date < cutoff;
      return markedDefault || overdue;
    }).map(r => ({
      ...r,
      _reason: r.outcome ? `Marked: ${r.outcome}` : `Overdue (>2 mo since ${r.last_visit_date})`,
    }));
  }, [records]);

  // -------- Actions ----------
  const registerCase = (e) => {
    e.preventDefault();
    if (!form.tb_unit_no || !form.patient_name) { setMsg('❌ TB Unit Number and Patient Name are required'); return; }
    if (records.some(r => r.tb_unit_no.toLowerCase() === form.tb_unit_no.toLowerCase())) {
      setMsg('❌ TB Unit Number already exists — must be unique');
      return;
    }
    const id = 'TB-' + Date.now().toString().slice(-8);
    const record = { ...form, id, created_at: todayStr() };
    setRecords([record, ...records]);
    setForm({ ...EMPTY_CASE, treatment_start_date: todayStr(), last_visit_date: todayStr() });
    setMsg('✅ Case registered. ID: ' + id);
  };

  const recordOutcome = (e) => {
    e.preventDefault();
    if (!outcomeForm.case_id) { setMsg('❌ Select a case'); return; }
    if (!outcomeForm.outcome) { setMsg('❌ Outcome is required'); return; }
    const updated = records.map(r => r.id === outcomeForm.case_id
      ? { ...r, outcome: outcomeForm.outcome, outcome_date: outcomeForm.outcome_date,
          last_visit_date: outcomeForm.last_visit_date || todayStr() }
      : r);
    setRecords(updated);
    setOutcomeForm({ case_id: '', outcome: OUTCOMES[0], outcome_date: todayStr(), last_visit_date: todayStr() });
    setMsg('✅ Outcome recorded');
  };

  const markReentry = (id) => {
    setRecords(records.map(r => r.id === id
      ? { ...r, outcome: '', outcome_date: '', last_visit_date: todayStr() }
      : r));
    setMsg('✅ Patient returned to active treatment');
  };

  const deleteCase = (id) => {
    setRecords(records.filter(r => r.id !== id));
    setMsg('🗑️ Case removed');
  };

  // -------- Shared styles ----------
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

  const kpiCard = (label, value, color, icon) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>{label}</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: C.text }}>{value}</div>
        </div>
        <div style={{ fontSize: '26px' }}>{icon}</div>
      </div>
    </div>
  );

  const activeForOutcome = records.filter(r => !r.outcome);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>🫁 Tuberculosis Program (DOTS)</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Ugandan Directly Observed Treatment, Short-course · Case Registration · Outcomes · LTFU Tracking</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') || msg.includes('🗑️') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') || msg.includes('🗑️') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('dashboard', '📊 Dashboard', tab === 'dashboard')}
        {tabBtn('register', '📝 Register Case', tab === 'register')}
        {tabBtn('outcomes', '🎯 Treatment Outcomes', tab === 'outcomes')}
        {tabBtn('ltfu', '⚠️ Defaults / LTFU', tab === 'ltfu')}
      </div>

      {/* ============ DASHBOARD ============ */}
      {tab === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {kpiCard('Total Cases', kpis.total, C.green, '📋')}
            {kpiCard('On Treatment', kpis.onTreatment, C.blue, '💉')}
            {kpiCard('Completed', kpis.completed, C.greenLight, '✅')}
            {kpiCard('Defaulted', kpis.defaulted, C.orange, '⚠️')}
            {kpiCard('Died', kpis.died, C.red, '⚰️')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* 6-month bar chart */}
            <div style={cardStyle}>
              <div style={headerStyle}>📅 New TB Cases — Last 6 Months</div>
              <div style={{ ...bodyStyle }}>
                {monthlyData.every(d => d.value === 0)
                  ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No cases registered yet.</p>
                  : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', height: '220px', padding: '10px 4px 0', borderBottom: `1px solid ${C.border}` }}>
                      {monthlyData.map(d => {
                        const max = Math.max(...monthlyData.map(x => x.value), 1);
                        const h = Math.round((d.value / max) * 180) + 8;
                        return (
                          <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: C.text }}>{d.value}</div>
                            <div style={{ width: '100%', maxWidth: '46px', height: h + 'px', background: `linear-gradient(180deg, ${C.greenLight} 0%, ${C.green} 100%)`, borderRadius: '6px 6px 0 0', transition: 'height 0.3s ease' }} />
                            <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600 }}>{d.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            </div>

            {/* Disease site pie */}
            <div style={cardStyle}>
              <div style={headerStyle}>🥧 Disease Site Distribution</div>
              <div style={{ ...bodyStyle, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
                <Donut segments={siteData} size={200} thickness={50} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {siteData.map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: s.color }} />
                      <div>
                        <div style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>{s.label}</div>
                        <div style={{ fontSize: '12px', color: C.muted }}>{s.value} case{s.value === 1 ? '' : 's'}</div>
                      </div>
                    </div>
                  ))}
                  {records.length === 0 && <p style={{ color: C.muted, fontSize: '13px' }}>No data yet.</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Recent cases */}
          <div style={cardStyle}>
            <div style={headerStyle}>🧾 Recent Registrations ({records.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {records.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No cases registered yet. Go to <b>Register Case</b> to add your first patient.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
                    <thead><tr>{['TB Unit #', 'Patient', 'Age/Sex', 'Site', 'Class', 'Sensitivity', 'Phase', 'Outcome', 'Start'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {records.slice(0, 10).map(r => {
                        const outColor = r.outcome === 'Died' ? C.red
                          : (r.outcome === 'Cured' || r.outcome === 'Treatment completed') ? C.green
                          : (r.outcome === 'Defaulted' || r.outcome === 'Lost to follow-up') ? C.orange
                          : r.outcome === 'Treatment failure' ? C.red : C.blue;
                        const siteLabel = r.disease_site === 'Extra-pulmonary' ? `EPTB (${r.eptb_subtype})` : 'Pulmonary';
                        return (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.tb_unit_no}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.patient_name}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.age}/{r.sex.charAt(0)}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{siteLabel}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.classification}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                background: r.drug_sensitivity === 'Sensitive' ? 'rgba(11,128,67,0.2)' : r.drug_sensitivity === 'MDR' ? 'rgba(232,113,10,0.2)' : 'rgba(211,47,47,0.2)',
                                color: r.drug_sensitivity === 'Sensitive' ? C.green : r.drug_sensitivity === 'MDR' ? C.orange : C.red,
                                border: `1px solid ${r.drug_sensitivity === 'Sensitive' ? C.green : r.drug_sensitivity === 'MDR' ? C.orange : C.red}` }}>{r.drug_sensitivity}</span>
                            </td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.treatment_phase}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                              {r.outcome
                                ? <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${outColor}22`, color: outColor, border: `1px solid ${outColor}` }}>{r.outcome}</span>
                                : <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(26,115,232,0.18)', color: C.blue, border: `1px solid ${C.blue}` }}>On treatment</span>}
                            </td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.treatment_start_date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {/* ============ REGISTER CASE ============ */}
      {tab === 'register' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>📝 Register New TB Case (DOTS)</div>
            <div style={bodyStyle}>
              <form onSubmit={registerCase}>
                {/* Patient identification */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '4px 0 14px' }}>Patient Identification</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>TB Unit Number *</label><input style={inputStyle} value={form.tb_unit_no} onChange={(e) => setForm({ ...form, tb_unit_no: e.target.value })} placeholder="TB-2025-0123" required /></div>
                  <div><label style={labelStyle}>Patient Name *</label><input style={inputStyle} value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} placeholder="e.g. Okello John" required /></div>
                  <div><label style={labelStyle}>Age (years)</label><input style={inputStyle} type="number" min="0" max="120" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="32" /></div>
                  <div><label style={labelStyle}>Sex</label>
                    <select style={inputStyle} value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                      {SEX_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                {/* Disease classification */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '20px 0 14px' }}>Disease Classification</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>Disease Site</label>
                    <select style={inputStyle} value={form.disease_site} onChange={(e) => setForm({ ...form, disease_site: e.target.value })}>
                      {SITE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>EPTB Subtype {form.disease_site === 'Extra-pulmonary' ? '*' : ''}</label>
                    <select style={inputStyle} value={form.eptb_subtype} disabled={form.disease_site !== 'Extra-pulmonary'} onChange={(e) => setForm({ ...form, eptb_subtype: e.target.value })}>
                      {EPTB_SUBTYPES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Classification</label>
                    <select style={inputStyle} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })}>
                      {CLASS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Drug Sensitivity</label>
                    <select style={inputStyle} value={form.drug_sensitivity} onChange={(e) => setForm({ ...form, drug_sensitivity: e.target.value })}>
                      {SENS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                {/* Treatment */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '20px 0 14px' }}>Treatment Plan</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>Treatment Phase</label>
                    <select style={inputStyle} value={form.treatment_phase} onChange={(e) => setForm({ ...form, treatment_phase: e.target.value })}>
                      {PHASE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Regimen</label>
                    <select style={inputStyle} value={form.regimen} onChange={(e) => setForm({ ...form, regimen: e.target.value })}>
                      {REGIMEN_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Treatment Start Date</label><input style={inputStyle} type="date" value={form.treatment_start_date} onChange={(e) => setForm({ ...form, treatment_start_date: e.target.value })} /></div>
                </div>

                {/* Diagnostics */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '20px 0 14px' }}>Laboratory Diagnostics</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>Smear Result</label>
                    <select style={inputStyle} value={form.smear_result} onChange={(e) => setForm({ ...form, smear_result: e.target.value })}>
                      {SMEAR_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>GeneXpert Result</label>
                    <select style={inputStyle} value={form.genexpert_result} onChange={(e) => setForm({ ...form, genexpert_result: e.target.value })}>
                      {XPERT_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                {/* HIV / ART */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '20px 0 14px' }}>HIV Status</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>HIV Status</label>
                    <select style={inputStyle} value={form.hiv_status} onChange={(e) => setForm({ ...form, hiv_status: e.target.value })}>
                      {HIV_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>On ART</label>
                    <select style={inputStyle} value={form.on_art} onChange={(e) => setForm({ ...form, on_art: e.target.value })}>
                      {YESNO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                {/* DOTS supporter */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '20px 0 14px' }}>DOTS Supporter</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>Supporter Name</label><input style={inputStyle} value={form.dots_supporter_name} onChange={(e) => setForm({ ...form, dots_supporter_name: e.target.value })} placeholder="e.g. Namatovu Sarah" /></div>
                  <div><label style={labelStyle}>Supporter Phone</label><input style={inputStyle} value={form.dots_supporter_phone} onChange={(e) => setForm({ ...form, dots_supporter_phone: e.target.value })} placeholder="07XX XXX XXX" /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Last Visit Date</label><input style={inputStyle} type="date" value={form.last_visit_date} onChange={(e) => setForm({ ...form, last_visit_date: e.target.value })} /></div>
                </div>

                <button type="submit" style={{ ...btnStyle, marginTop: '22px', width: '100%' }}>💾 Register TB Case</button>
              </form>
            </div>
          </div>

          {/* Live preview */}
          <div style={cardStyle}>
            <div style={headerStyle}>🔍 Case Preview</div>
            <div style={bodyStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '14px', background: C.cardAlt, borderRadius: '8px', border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '12px', color: C.muted, fontWeight: 600, textTransform: 'uppercase' }}>TB Unit #</div>
                  <div style={{ fontSize: '18px', color: C.green, fontWeight: 700, marginTop: '4px' }}>{form.tb_unit_no || '—'}</div>
                </div>
                <PreviewRow label="Patient" value={`${form.patient_name || '—'} · ${form.age || '?'} ${form.sex.charAt(0)}`} />
                <PreviewRow label="Disease site" value={form.disease_site === 'Extra-pulmonary' ? `Extra-pulmonary (${form.eptb_subtype})` : form.disease_site} />
                <PreviewRow label="Classification" value={form.classification} />
                <PreviewRow label="Sensitivity" value={form.drug_sensitivity} badge={form.drug_sensitivity} />
                <PreviewRow label="Phase / Regimen" value={`${form.treatment_phase} · ${form.regimen}`} />
                <PreviewRow label="Smear" value={form.smear_result} />
                <PreviewRow label="GeneXpert" value={form.genexpert_result} />
                <PreviewRow label="HIV / ART" value={`${form.hiv_status} · ART: ${form.on_art}`} />
                <PreviewRow label="DOTS supporter" value={form.dots_supporter_name ? `${form.dots_supporter_name} (${form.dots_supporter_phone || 'no phone'})` : '—'} />
                <PreviewRow label="Start date" value={form.treatment_start_date} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ TREATMENT OUTCOMES ============ */}
      {tab === 'outcomes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>🎯 Record Treatment Outcome</div>
            <div style={bodyStyle}>
              {activeForOutcome.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '20px 10px' }}>No active cases awaiting outcome.</p>
                : <form onSubmit={recordOutcome}>
                    <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Select Case *</label>
                      <select style={inputStyle} value={outcomeForm.case_id} onChange={(e) => {
                        const sel = records.find(r => r.id === e.target.value);
                        setOutcomeForm({ ...outcomeForm, case_id: e.target.value, last_visit_date: sel ? sel.last_visit_date : todayStr() });
                      }} required>
                        <option value="">— select —</option>
                        {activeForOutcome.map(r => <option key={r.id} value={r.id}>{r.tb_unit_no} · {r.patient_name} · started {r.treatment_start_date}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div><label style={labelStyle}>Outcome *</label>
                        <select style={inputStyle} value={outcomeForm.outcome} onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome: e.target.value })}>
                          {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div><label style={labelStyle}>Outcome Date</label><input style={inputStyle} type="date" value={outcomeForm.outcome_date} onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome_date: e.target.value })} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Last Visit / Follow-up Date</label><input style={inputStyle} type="date" value={outcomeForm.last_visit_date} onChange={(e) => setOutcomeForm({ ...outcomeForm, last_visit_date: e.target.value })} /></div>
                    </div>
                    <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>✅ Save Outcome</button>
                  </form>}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>📋 Outcome History ({records.filter(r => r.outcome).length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {records.filter(r => r.outcome).length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No outcomes recorded yet.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead><tr>{['TB #', 'Patient', 'Outcome', 'Date', 'Started', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {records.filter(r => r.outcome).map(r => {
                        const outColor = r.outcome === 'Died' || r.outcome === 'Treatment failure' ? C.red
                          : (r.outcome === 'Cured' || r.outcome === 'Treatment completed') ? C.green
                          : (r.outcome === 'Defaulted' || r.outcome === 'Lost to follow-up') ? C.orange : C.blue;
                        return (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.tb_unit_no}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.patient_name}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${outColor}22`, color: outColor, border: `1px solid ${outColor}` }}>{r.outcome}</span>
                            </td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.outcome_date || '-'}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.treatment_start_date}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                              <button onClick={() => markReentry(r.id)} style={{ padding: '5px 10px', background: 'transparent', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>↩ Re-enter care</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {/* ============ DEFAULTS / LTFU ============ */}
      {tab === 'ltfu' && (
        <div style={cardStyle}>
          <div style={headerStyle}>⚠️ Defaulted & Lost to Follow-up ({defaultsList.length})</div>
          <div style={{ ...bodyStyle, overflowX: 'auto' }}>
            <p style={{ fontSize: '13px', color: C.muted, marginBottom: '16px' }}>Patients marked <b>Defaulted</b> or <b>Lost to follow-up</b>, plus active cases with <b>&gt;2 months</b> since the last visit date.</p>
            {defaultsList.length === 0
              ? <p style={{ textAlign: 'center', color: C.green, padding: '40px 10px', fontSize: '14px', fontWeight: 600 }}>✅ No defaulters or patients lost to follow-up. All cases up to date.</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                  <thead><tr>{['TB #', 'Patient', 'Phone', 'Supporter', 'Last Visit', 'Days Since', 'Reason', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {defaultsList.map(r => {
                      const daysSince = r.last_visit_date
                        ? Math.floor((new Date() - new Date(r.last_visit_date)) / (1000 * 60 * 60 * 24))
                        : null;
                      const overdue = !r.outcome && daysSince !== null && daysSince > 60;
                      return (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.tb_unit_no}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{r.age}/{r.sex.charAt(0)} · {r.disease_site === 'Extra-pulmonary' ? `EPTB (${r.eptb_subtype})` : 'Pulmonary'}</div></td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.dots_supporter_phone || '-'}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.dots_supporter_name || '-'}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.last_visit_date || '-'}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                            {daysSince !== null
                              ? <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: overdue ? 'rgba(232,113,10,0.2)' : 'rgba(141,167,193,0.12)', color: overdue ? C.orange : C.muted, border: `1px solid ${overdue ? C.orange : C.border}` }}>{daysSince} d</span>
                              : '-'}
                          </td>
                          <td style={{ padding: '11px 12px', fontSize: '12px', color: overdue ? C.orange : C.muted }}>{r._reason}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            <button onClick={() => markReentry(r.id)} style={{ padding: '5px 10px', background: 'transparent', color: C.green, border: `1px solid ${C.green}`, borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', marginRight: '6px' }}>↩ Trace & re-enter</button>
                            <button onClick={() => deleteCase(r.id)} style={{ padding: '5px 10px', background: 'transparent', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>🗑 Remove</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewRow({ label, value, badge }) {
  const C = { text: '#e6f0fa', muted: '#8da7c1', border: '#1a3a5c', cardAlt: '#0a2238', green: '#0b8043', orange: '#e8710a', red: '#d32f2f' };
  const badgeColor = badge === 'Sensitive' ? C.green : badge === 'MDR' ? C.orange : badge === 'XDR' ? C.red : null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: C.cardAlt, borderRadius: '8px', border: `1px solid ${C.border}` }}>
      <span style={{ fontSize: '11px', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
      {badge && badgeColor
        ? <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}` }}>{value}</span>
        : <span style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>{value}</span>}
    </div>
  );
}
