// FileName: src/pages/hmis/Malaria.jsx
// National Malaria Control Programme (NMCP) — case tracking, LLIN & IPTp distribution
// localStorage persistence under 'hmis_malaria_records' (cases) and 'hmis_malaria_llin' (net batches)

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
  yellow: '#f5b50a',
  purple: '#8e24aa',
};

const AGE_GROUPS = ['Under 5', '5-14 years', 'Over 14', 'Pregnant woman'];
const CASE_TYPES = ['Simple', 'Severe'];
const TEST_TYPES = ['RDT', 'Microscopy', 'Clinical diagnosis'];
const TEST_RESULTS = ['Positive', 'Negative', 'Not done'];
const SPECIES = ['P. falciparum', 'P. vivax', 'P. malariae', 'P. ovale', 'Mixed'];
const TREATMENTS = ['ACT 6-dose', 'ACT 4-dose', 'Quinine', 'Artesunate injectable', 'Other'];
const WEIGHT_BANDS = ['5-14kg', '15-24kg', '25-34kg', '35-49kg', '>50kg'];
const IPTP_DOSES = ['N/A', '1', '2', '3', '4'];
const OUTCOMES = ['Pending', 'Recovered', 'Died', 'Referred'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EMPTY_CASE = {
  patient_name: '',
  age_group: AGE_GROUPS[0],
  case_type: CASE_TYPES[0],
  test_type: TEST_TYPES[0],
  test_result: TEST_RESULTS[0],
  parasite_species: SPECIES[0],
  treatment: TREATMENTS[0],
  weight_band: WEIGHT_BANDS[0],
  llin_distributed: 'No',
  iptp_dose: 'N/A',
  outcome: 'Pending',
  date_reported: new Date().toISOString().slice(0, 10),
};

const EMPTY_LLIN = {
  date: new Date().toISOString().slice(0, 10),
  count: '',
  location: '',
  officer: '',
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

function monthKey(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function last12MonthKeys() {
  const keys = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }
  return keys;
}

function statusOf(r) {
  if (r.test_result === 'Positive') return 'Confirmed';
  if (r.test_result === 'Negative') return 'Negative';
  return 'Clinical';
}

export default function Malaria() {
  const [tab, setTab] = useState('dashboard');
  const [records, setRecords] = useLocalState('hmis_malaria_records', []);
  const [llins, setLlins] = useLocalState('hmis_malaria_llin', []);
  const [form, setForm] = useState(EMPTY_CASE);
  const [llinForm, setLlinForm] = useState(EMPTY_LLIN);
  const [msg, setMsg] = useState('');
  const [filters, setFilters] = useState({ age_group: '', case_type: '', month: '' });

  // ---- KPIs ----
  const totalCases = records.length;
  const severeCases = records.filter(r => r.case_type === 'Severe').length;
  const simpleCases = records.filter(r => r.case_type === 'Simple').length;
  const deaths = records.filter(r => r.outcome === 'Died').length;
  const positive = records.filter(r => r.test_result === 'Positive').length;
  const negative = records.filter(r => r.test_result === 'Negative').length;
  const tested = positive + negative;
  const positivityRate = tested ? Math.round((positive / tested) * 1000) / 10 : 0;

  // ---- 12-month seasonality ----
  const monthKeys = last12MonthKeys();
  const monthCounts = monthKeys.map(k => {
    const m = Number(k.split('-')[1]);
    return {
      key: k,
      label: MONTHS[m - 1] + " '" + k.split('-')[0].slice(-2),
      count: records.filter(r => monthKey(r.date_reported) === k).length,
    };
  });
  const maxMonth = Math.max(1, ...monthCounts.map(m => m.count));

  // ---- age group distribution ----
  const ageDist = AGE_GROUPS.map(g => ({
    label: g,
    count: records.filter(r => r.age_group === g).length,
    color: g === 'Under 5' ? C.red : g === '5-14 years' ? C.orange : g === 'Over 14' ? C.blue : C.purple,
  }));
  const maxAge = Math.max(1, ...ageDist.map(a => a.count));

  // ---- LLIN distributions by month (from cases marked Yes + standalone batches) ----
  const llinByMonth = monthKeys.map(k => {
    const m = Number(k.split('-')[1]);
    const fromCases = records.filter(r => r.llin_distributed === 'Yes' && monthKey(r.date_reported) === k).length;
    const fromBatches = llins.filter(l => monthKey(l.date) === k).reduce((s, l) => s + (Number(l.count) || 0), 0);
    return { key: k, label: MONTHS[m - 1] + " '" + k.split('-')[0].slice(-2), count: fromCases + fromBatches };
  });
  const maxLlin = Math.max(1, ...llinByMonth.map(m => m.count));
  const totalLlin = llinByMonth.reduce((s, m) => s + m.count, 0);
  const llinCasesMarked = records.filter(r => r.llin_distributed === 'Yes').length;

  // ---- IPTp doses by dose number (pregnant women only) ----
  const pregnant = records.filter(r => r.age_group === 'Pregnant woman');
  const iptpDoses = [1, 2, 3, 4].map(n => ({
    dose: n,
    count: pregnant.filter(r => r.iptp_dose === String(n)).length,
  }));
  const maxIptp = Math.max(1, ...iptpDoses.map(d => d.count));
  const totalIptp = iptpDoses.reduce((s, d) => s + d.count, 0);

  // ---- filtered cases list ----
  const filteredCases = records.filter(r => {
    if (filters.age_group && r.age_group !== filters.age_group) return false;
    if (filters.case_type && r.case_type !== filters.case_type) return false;
    if (filters.month && monthKey(r.date_reported) !== filters.month) return false;
    return true;
  });

  // ---- handlers ----
  const saveCase = (e) => {
    e.preventDefault();
    if (!form.patient_name) { setMsg('❌ Patient name is required'); return; }
    const id = 'MAL-' + Date.now().toString().slice(-8);
    const record = { ...form, id, created_at: todayStr() };
    setRecords([record, ...records]);
    setForm({ ...EMPTY_CASE, date_reported: todayStr() });
    setMsg('✅ Malaria case recorded. ID: ' + id);
  };

  const addLlin = (e) => {
    e.preventDefault();
    if (!llinForm.count || !llinForm.date) { setMsg('❌ Date and nets count are required'); return; }
    const id = 'LLN-' + Date.now().toString().slice(-8);
    setLlins([{ ...llinForm, count: Number(llinForm.count), id }, ...llins]);
    setLlinForm({ ...EMPTY_LLIN, date: todayStr() });
    setMsg('✅ LLIN batch recorded. ID: ' + id);
  };

  const removeCase = (id) => {
    setRecords(records.filter(r => r.id !== id));
    setMsg('🗑️ Case ' + id + ' removed');
  };

  const removeLlin = (id) => {
    setLlins(llins.filter(l => l.id !== id));
    setMsg('🗑️ LLIN batch removed');
  };

  // ---- styles ----
  const inputStyle = { width: '100%', padding: '11px 14px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' };
  const btnStyle = { padding: '11px 22px', background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,128,67,0.3)' };
  const btnGhost = { padding: '8px 14px', background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '8px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' };
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

  const kpiCard = (label, value, sub, accent) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `4px solid ${accent}`, borderRadius: '12px', padding: '18px 20px' }}>
      <div style={{ color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ color: accent, fontSize: '30px', fontWeight: 700, marginTop: '6px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize: '12px', marginTop: '6px' }}>{sub}</div>}
    </div>
  );

  const bar = (value, max, accent, height = 24) => (
    <div style={{ position: 'relative', height: `${height}px`, background: C.input, borderRadius: '6px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(value === 0 ? 0 : 4, (value / max) * 100)}%`, background: `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)`, borderRadius: '6px', transition: 'width .4s ease' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '12px', fontWeight: 700, color: C.text, zIndex: 2 }}>{value}</div>
    </div>
  );

  const statusBadge = (r) => {
    const s = statusOf(r);
    const col = s === 'Confirmed' ? C.green : s === 'Negative' ? C.muted : C.orange;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${col}22`, color: col, border: `1px solid ${col}` }}>{s}</span>;
  };

  const outcomeBadge = (o) => {
    const col = o === 'Died' ? C.red : o === 'Recovered' ? C.green : o === 'Referred' ? C.blue : C.muted;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${col}22`, color: col, border: `1px solid ${col}` }}>{o}</span>;
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>🦟 National Malaria Control Programme (NMCP)</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Case Surveillance · LLIN Distribution · IPTp Tracking · Seasonality Monitoring</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : msg.includes('🗑️') ? 'rgba(232,113,10,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : msg.includes('🗑️') ? C.orange : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('dashboard', '📊 Dashboard', tab === 'dashboard')}
        {tabBtn('record', '➕ Record Case', tab === 'record')}
        {tabBtn('cases', '📋 Cases List', tab === 'cases')}
        {tabBtn('llin', '🛡️ LLIN & IPTp', tab === 'llin')}
      </div>

      {/* ============ DASHBOARD ============ */}
      {tab === 'dashboard' && (
        <div>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {kpiCard('Total Cases', totalCases, 'all reported', C.green)}
            {kpiCard('Severe', severeCases, totalCases ? Math.round(severeCases / totalCases * 100) + '% of total' : '0% of total', C.red)}
            {kpiCard('Simple', simpleCases, totalCases ? Math.round(simpleCases / totalCases * 100) + '% of total' : '0% of total', C.blue)}
            {kpiCard('Deaths', deaths, totalCases ? Math.round(deaths / totalCases * 1000) / 10 + '% CFR' : '0% CFR', C.orange)}
            {kpiCard('Test Positivity', positivityRate + '%', `${positive}/${tested} tested`, C.yellow)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {/* 12-month seasonality */}
            <div style={cardStyle}>
              <div style={headerStyle}>📅 12-Month Seasonality (Cases per Month)</div>
              <div style={bodyStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '180px', padding: '0 4px' }}>
                  {monthCounts.map(m => {
                    const h = (m.count / maxMonth) * 100;
                    return (
                      <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: '10px', color: C.muted, fontWeight: 600 }}>{m.count || ''}</div>
                        <div style={{ width: '100%', height: `${Math.max(m.count === 0 ? 2 : 4, h)}%`, background: m.count > 0 ? `linear-gradient(180deg, ${C.greenLight} 0%, ${C.green} 100%)` : C.border, borderRadius: '4px 4px 0 0', minHeight: '2px', transition: 'height .4s ease', border: m.count > 0 ? `1px solid ${C.green}` : 'none' }} />
                        <div style={{ fontSize: '10px', color: C.muted, whiteSpace: 'nowrap' }}>{m.label}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: '14px', fontSize: '12px', color: C.muted }}>Peak: {monthCounts.reduce((a, b) => b.count > a.count ? b : a, monthCounts[0]).label} · 12-month total: {monthCounts.reduce((s, m) => s + m.count, 0)}</div>
              </div>
            </div>

            {/* age group distribution */}
            <div style={cardStyle}>
              <div style={headerStyle}>👥 Age Group Distribution</div>
              <div style={bodyStyle}>
                <div style={{ display: 'grid', gap: '14px' }}>
                  {ageDist.map(a => (
                    <div key={a.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>{a.label}</span>
                        <span style={{ fontSize: '13px', color: a.color, fontWeight: 700 }}>{a.count}</span>
                      </div>
                      {bar(a.count, maxAge, a.color)}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '14px', fontSize: '12px', color: C.muted }}>Total: {totalCases} · Under-5 share: {totalCases ? Math.round(ageDist[0].count / totalCases * 100) + '%' : '0%'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ RECORD CASE ============ */}
      {tab === 'record' && (
        <div style={cardStyle}>
          <div style={headerStyle}>➕ Record Malaria Case</div>
          <div style={bodyStyle}>
            <form onSubmit={saveCase}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Patient Name *</label><input style={inputStyle} value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} placeholder="e.g. Nakato Sarah" required /></div>

                <div>
                  <label style={labelStyle}>Age Group *</label>
                  <select style={inputStyle} value={form.age_group} onChange={(e) => setForm({ ...form, age_group: e.target.value })}>
                    {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Case Type *</label>
                  <select style={inputStyle} value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })}>
                    {CASE_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Test Type *</label>
                  <select style={inputStyle} value={form.test_type} onChange={(e) => setForm({ ...form, test_type: e.target.value })}>
                    {TEST_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Test Result *</label>
                  <select style={inputStyle} value={form.test_result} onChange={(e) => setForm({ ...form, test_result: e.target.value })}>
                    {TEST_RESULTS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Parasite Species</label>
                  <select style={inputStyle} value={form.parasite_species} onChange={(e) => setForm({ ...form, parasite_species: e.target.value })}>
                    {SPECIES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Treatment Given</label>
                  <select style={inputStyle} value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })}>
                    {TREATMENTS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Weight Band (for dosing)</label>
                  <select style={inputStyle} value={form.weight_band} onChange={(e) => setForm({ ...form, weight_band: e.target.value })}>
                    {WEIGHT_BANDS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>LLIN Distributed *</label>
                  <select style={inputStyle} value={form.llin_distributed} onChange={(e) => setForm({ ...form, llin_distributed: e.target.value })}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>IPTp Dose {form.age_group === 'Pregnant woman' ? '*' : '(pregnant women only)'}</label>
                  <select style={inputStyle} value={form.iptp_dose} onChange={(e) => setForm({ ...form, iptp_dose: e.target.value })} disabled={form.age_group !== 'Pregnant woman'}>
                    {IPTP_DOSES.map(g => <option key={g} value={g}>{g === 'N/A' ? 'N/A' : 'Dose ' + g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Outcome</label>
                  <select style={inputStyle} value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })}>
                    {OUTCOMES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Date Reported *</label>
                  <input style={inputStyle} type="date" value={form.date_reported} onChange={(e) => setForm({ ...form, date_reported: e.target.value })} required />
                </div>
              </div>

              <div style={{ marginTop: '18px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="submit" style={btnStyle}>💾 Save Case</button>
                <button type="button" style={btnGhost} onClick={() => { setForm({ ...EMPTY_CASE, date_reported: todayStr() }); setMsg(''); }}>Clear</button>
                {form.age_group === 'Pregnant woman' && form.iptp_dose === 'N/A' && (
                  <span style={{ fontSize: '12px', color: C.orange }}>⚠ IPTp dose will default to N/A — set dose 1–4 if SP administered</span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ CASES LIST ============ */}
      {tab === 'cases' && (
        <div style={cardStyle}>
          <div style={headerStyle}>📋 Cases List ({filteredCases.length} of {records.length})</div>
          <div style={bodyStyle}>
            {/* filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={labelStyle}>Age Group</label>
                <select style={inputStyle} value={filters.age_group} onChange={(e) => setFilters({ ...filters, age_group: e.target.value })}>
                  <option value="">All</option>
                  {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Case Type</label>
                <select style={inputStyle} value={filters.case_type} onChange={(e) => setFilters({ ...filters, case_type: e.target.value })}>
                  <option value="">All</option>
                  {CASE_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Month</label>
                <select style={inputStyle} value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })}>
                  <option value="">All months</option>
                  {monthKeys.map(k => {
                    const m = Number(k.split('-')[1]);
                    return <option key={k} value={k}>{MONTHS[m - 1] + " '" + k.split('-')[0].slice(-2)}</option>;
                  })}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="button" style={btnGhost} onClick={() => setFilters({ age_group: '', case_type: '', month: '' })}>Reset</button>
              </div>
            </div>

            {filteredCases.length === 0
              ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No cases match the current filters.</p>
              : <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
                    <thead><tr>{['Patient', 'Age Group', 'Type', 'Test', 'Species', 'Treatment', 'LLIN', 'IPTp', 'Status', 'Outcome', 'Date', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {filteredCases.map(r => (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{r.id}</div></td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.age_group}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: r.case_type === 'Severe' ? 'rgba(211,47,47,0.18)' : 'rgba(26,115,232,0.18)', color: r.case_type === 'Severe' ? C.red : C.blue, border: `1px solid ${r.case_type === 'Severe' ? C.red : C.blue}` }}>{r.case_type}</span>
                          </td>
                          <td style={{ padding: '11px 12px', fontSize: '12px' }}>{r.test_type}<div style={{ fontSize: '11px', color: C.muted }}>{r.test_result}</div></td>
                          <td style={{ padding: '11px 12px', fontSize: '12px', color: C.muted }}>{r.parasite_species}</td>
                          <td style={{ padding: '11px 12px', fontSize: '12px' }}>{r.treatment}<div style={{ fontSize: '11px', color: C.muted }}>{r.weight_band}</div></td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, background: r.llin_distributed === 'Yes' ? 'rgba(11,128,67,0.18)' : 'rgba(141,167,193,0.12)', color: r.llin_distributed === 'Yes' ? C.green : C.muted }}>{r.llin_distributed}</span>
                          </td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.iptp_dose === 'N/A' ? '—' : 'D' + r.iptp_dose}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{statusBadge(r)}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{outcomeBadge(r.outcome)}</td>
                          <td style={{ padding: '11px 12px', fontSize: '12px' }}>{r.date_reported}</td>
                          <td style={{ padding: '11px 12px' }}>
                            <button onClick={() => removeCase(r.id)} style={{ background: 'transparent', border: `1px solid ${C.red}`, color: C.red, borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>}
          </div>
        </div>
      )}

      {/* ============ LLIN & IPTp ============ */}
      {tab === 'llin' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {kpiCard('Nets Distributed (12mo)', totalLlin, `${llins.length} batch(es) + ${llinCasesMarked} case-issued`, C.green)}
            {kpiCard('IPTp Doses Given', totalIptp, `${pregnant.length} pregnant women enrolled`, C.purple)}
            {kpiCard('Pregnant Women', pregnant.length, 'IPTp eligible', C.blue)}
            {kpiCard('Cases w/ LLIN', llinCasesMarked, totalCases ? Math.round(llinCasesMarked / totalCases * 100) + '% coverage' : '0%', C.orange)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* LLIN monthly chart */}
            <div style={cardStyle}>
              <div style={headerStyle}>🛡️ Nets Distributed — 12-Month Trend</div>
              <div style={bodyStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '180px', padding: '0 4px' }}>
                  {llinByMonth.map(m => {
                    const h = (m.count / maxLlin) * 100;
                    return (
                      <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: '10px', color: C.muted, fontWeight: 600 }}>{m.count || ''}</div>
                        <div style={{ width: '100%', height: `${Math.max(m.count === 0 ? 2 : 4, h)}%`, background: m.count > 0 ? `linear-gradient(180deg, ${C.greenLight} 0%, ${C.green} 100%)` : C.border, borderRadius: '4px 4px 0 0', minHeight: '2px', border: m.count > 0 ? `1px solid ${C.green}` : 'none' }} />
                        <div style={{ fontSize: '10px', color: C.muted, whiteSpace: 'nowrap' }}>{m.label}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: '14px', fontSize: '12px', color: C.muted }}>Peak: {llinByMonth.reduce((a, b) => b.count > a.count ? b : a, llinByMonth[0]).label} · Total nets: {totalLlin}</div>
              </div>
            </div>

            {/* IPTp doses by dose number */}
            <div style={cardStyle}>
              <div style={headerStyle}>💊 IPTp Doses — by Dose Number</div>
              <div style={bodyStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px', height: '180px', padding: '0 12px', justifyContent: 'space-around' }}>
                  {iptpDoses.map(d => {
                    const h = (d.count / maxIptp) * 100;
                    return (
                      <div key={d.dose} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end', flex: 1 }}>
                        <div style={{ fontSize: '12px', color: C.purple, fontWeight: 700 }}>{d.count}</div>
                        <div style={{ width: '60%', height: `${Math.max(d.count === 0 ? 2 : 4, h)}%`, background: d.count > 0 ? `linear-gradient(180deg, #a040c0 0%, ${C.purple} 100%)` : C.border, borderRadius: '6px 6px 0 0', minHeight: '2px', border: d.count > 0 ? `1px solid ${C.purple}` : 'none' }} />
                        <div style={{ fontSize: '12px', color: C.text, fontWeight: 600 }}>IPTp{d.dose}</div>
                        <div style={{ fontSize: '10px', color: C.muted }}>Dose {d.dose}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: '14px', fontSize: '12px', color: C.muted }}>Target: 4 doses per pregnancy · Coverage: {pregnant.length ? Math.round(totalIptp / (pregnant.length * 4) * 100) + '%' : '0%'} of full schedule</div>
              </div>
            </div>
          </div>

          {/* LLIN batch form + list */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            <div style={cardStyle}>
              <div style={headerStyle}>➕ Record LLIN Distribution Batch</div>
              <div style={bodyStyle}>
                <form onSubmit={addLlin}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div><label style={labelStyle}>Date *</label><input style={inputStyle} type="date" value={llinForm.date} onChange={(e) => setLlinForm({ ...llinForm, date: e.target.value })} required /></div>
                    <div><label style={labelStyle}>Nets Distributed *</label><input style={inputStyle} type="number" min="1" value={llinForm.count} onChange={(e) => setLlinForm({ ...llinForm, count: e.target.value })} placeholder="e.g. 50" required /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Distribution Site / Village</label><input style={inputStyle} value={llinForm.location} onChange={(e) => setLlinForm({ ...llinForm, location: e.target.value })} placeholder="e.g. Kawempe HC III" /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Officer in Charge</label><input style={inputStyle} value={llinForm.officer} onChange={(e) => setLlinForm({ ...llinForm, officer: e.target.value })} placeholder="e.g. Sr. Namaganda" /></div>
                  </div>
                  <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Record Batch</button>
                </form>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={headerStyle}>📋 LLIN Batches ({llins.length})</div>
              <div style={{ ...bodyStyle, overflowX: 'auto' }}>
                {llins.length === 0
                  ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No batch distributions recorded yet. Add one above to track community LLIN campaigns.</p>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '460px' }}>
                      <thead><tr>{['Date', 'Nets', 'Site', 'Officer', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {llins.map(l => (
                          <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{l.date}<div style={{ fontSize: '11px', color: C.muted }}>{l.id}</div></td>
                            <td style={{ padding: '11px 12px', fontSize: '13px', color: C.green, fontWeight: 700 }}>{l.count}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{l.location || '—'}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{l.officer || '—'}</td>
                            <td style={{ padding: '11px 12px' }}>
                              <button onClick={() => removeLlin(l.id)} style={{ background: 'transparent', border: `1px solid ${C.red}`, color: C.red, borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
