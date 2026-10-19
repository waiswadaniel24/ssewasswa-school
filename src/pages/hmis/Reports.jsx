// FileName: src/pages/hmis/Reports.jsx
// HMIS Monthly Reports — Form 105 aggregates, KPIs, DHIS2 submission tracking, CSV export
// localStorage persistence under 'hmis_reports'

import React, { useState, useEffect, useMemo } from 'react';

const C = {
  bg: '#071b2f', card: '#0d2640', input: '#0a1f36',
  border: '#1a3a5c', green: '#0b8043', greenLight: '#0ca252',
  text: '#e6f0fa', muted: '#8da7c1', red: '#d32f2f', orange: '#e8710a',
  blue: '#1a73e8', purple: '#7b1fa2',
};

const EMPTY_KPI = {
  month: new Date().toISOString().slice(0, 7),
  opd_under5: '', opd_over5: '', ipd_admissions: '',
  maternal_deaths: '', neonatal_deaths: '', stillbirths: '',
  csections: '', blood_transfusions: '',
};

const EMPTY_SUB = {
  month: new Date().toISOString().slice(0, 7),
  status: 'Pending', submission_date: new Date().toISOString().slice(0, 10),
};

const STATUSES = ['Pending', 'Submitted', 'Verified'];

const DEFAULTS = { kpis: [], submissions: [], manual_totals: { opd_visits: 0, lab_tests: 0, revenue: 0 } };

function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? { ...initial, ...JSON.parse(raw) } : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function readLS(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function monthLabel(m) {
  if (!m || m.length < 7) return m || '';
  const [y, mo] = m.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[parseInt(mo, 10) - 1] + ' ' + y;
}

export default function Reports() {
  const [data, setData] = useLocalState('hmis_reports', DEFAULTS);
  const [kpiForm, setKpiForm] = useState(EMPTY_KPI);
  const [subForm, setSubForm] = useState(EMPTY_SUB);
  const [msg, setMsg] = useState('');

  // Aggregates from sibling modules' localStorage
  const aggregates = useMemo(() => {
    const admissions = readLS('hmis_ipd_admissions');
    const deliveries = readLS('hmis_maternal_deliveries');
    const immunizations = readLS('hmis_immunizations');
    const notifiable = readLS('hmis_notifiable');
    const staff = readLS('hmis_staff');
    return {
      ipd_admissions: admissions.length,
      deliveries: deliveries.length,
      immunizations: immunizations.length,
      notifiable_cases: notifiable.length,
      staff: staff.length,
      opd_visits: data.manual_totals?.opd_visits || 0,
      lab_tests: data.manual_totals?.lab_tests || 0,
      revenue: data.manual_totals?.revenue || 0,
    };
  }, [data]);

  const saveKpi = (e) => {
    e.preventDefault();
    if (!kpiForm.month) { setMsg('❌ Month is required'); return; }
    const existing = data.kpis.filter(k => k.month !== kpiForm.month);
    const newKpis = [{ ...kpiForm, id: 'KPI-' + kpiForm.month, updated_at: new Date().toISOString().slice(0, 10) }, ...existing].sort((a, b) => b.month.localeCompare(a.month));
    setData({ ...data, kpis: newKpis });
    setKpiForm({ ...EMPTY_KPI, month: new Date().toISOString().slice(0, 7) });
    setMsg('✅ KPIs saved for ' + monthLabel(kpiForm.month));
  };

  const saveSub = (e) => {
    e.preventDefault();
    if (!subForm.month) { setMsg('❌ Month is required'); return; }
    const existing = data.submissions.filter(s => s.month !== subForm.month);
    const newSubs = [{ ...subForm, id: 'SUB-' + subForm.month, created_at: new Date().toISOString().slice(0, 10) }, ...existing].sort((a, b) => b.month.localeCompare(a.month));
    setData({ ...data, submissions: newSubs });
    setSubForm({ ...EMPTY_SUB, month: new Date().toISOString().slice(0, 7), submission_date: new Date().toISOString().slice(0, 10) });
    setMsg('✅ DHIS2 submission tracked for ' + monthLabel(subForm.month));
  };

  const setManualTotal = (key, val) => {
    setData({ ...data, manual_totals: { ...data.manual_totals, [key]: val } });
  };

  const exportCsv = () => {
    const rows = [];
    rows.push('SECTION,Month,Metric,Value');
    // Aggregates
    rows.push(`AGGREGATE,ALL,IPD_Admissions,${aggregates.ipd_admissions}`);
    rows.push(`AGGREGATE,ALL,Deliveries,${aggregates.deliveries}`);
    rows.push(`AGGREGATE,ALL,Immunizations,${aggregates.immunizations}`);
    rows.push(`AGGREGATE,ALL,Notifiable_Cases,${aggregates.notifiable_cases}`);
    rows.push(`AGGREGATE,ALL,Staff,${aggregates.staff}`);
    rows.push(`AGGREGATE,ALL,OPD_Visits_Manual,${aggregates.opd_visits}`);
    rows.push(`AGGREGATE,ALL,Lab_Tests_Manual,${aggregates.lab_tests}`);
    rows.push(`AGGREGATE,ALL,Revenue_Manual,${aggregates.revenue}`);
    // Monthly KPIs
    data.kpis.forEach(k => {
      Object.entries(k).forEach(([m, v]) => {
        if (m !== 'id' && m !== 'updated_at' && v !== '' && v !== undefined && v !== null) {
          rows.push(`KPI,${k.month},${m},${v}`);
        }
      });
    });
    // DHIS2 submissions
    data.submissions.forEach(s => {
      rows.push(`DHIS2,${s.month},Status,${s.status}`);
      rows.push(`DHIS2,${s.month},Submission_Date,${s.submission_date}`);
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hmis_form105_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMsg('✅ CSV exported (' + rows.length + ' rows)');
  };

  const inputStyle = { width: '100%', padding: '11px 14px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' };
  const btnStyle = { padding: '11px 22px', background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,128,67,0.3)' };
  const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', marginBottom: '20px' };
  const headerStyle = { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: '15px' };
  const bodyStyle = { padding: '20px' };
  const thStyle = { textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` };
  const tdStyle = { padding: '11px 12px', fontSize: '13px', borderBottom: `1px solid ${C.border}` };

  const cards = [
    { label: 'OPD Visits', value: aggregates.opd_visits, icon: '🏥', color: C.blue },
    { label: 'IPD Admissions', value: aggregates.ipd_admissions, icon: '🛏️', color: C.orange },
    { label: 'Deliveries', value: aggregates.deliveries, icon: '👶', color: '#c2185b' },
    { label: 'Immunizations', value: aggregates.immunizations, icon: '💉', color: C.green },
    { label: 'Lab Tests', value: aggregates.lab_tests, icon: '🔬', color: C.purple },
    { label: 'Revenue (UGX)', value: (aggregates.revenue || 0).toLocaleString(), icon: '💰', color: C.green },
  ];

  const statusColor = (s) => s === 'Verified' ? C.green : s === 'Submitted' ? C.blue : C.orange;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '6px' }}>
        <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700 }}>📊 HMIS Monthly Reports</h1>
        <button onClick={exportCsv} style={btnStyle}>📥 Export CSV</button>
      </div>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Form 105 · Monthly KPIs · DHIS2 submission tracking</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      {/* Dashboard cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>{c.icon}</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Manual totals editor for OPD visits / lab tests / revenue (which aren't in localStorage elsewhere) */}
      <div style={cardStyle}>
        <div style={headerStyle}>Aggregate Totals (Manual Entry)</div>
        <div style={bodyStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div><label style={labelStyle}>OPD Visits (Total)</label><input style={inputStyle} type="number" value={data.manual_totals?.opd_visits || 0} onChange={(e) => setManualTotal('opd_visits', parseInt(e.target.value || '0', 10))} /></div>
            <div><label style={labelStyle}>Lab Tests (Total)</label><input style={inputStyle} type="number" value={data.manual_totals?.lab_tests || 0} onChange={(e) => setManualTotal('lab_tests', parseInt(e.target.value || '0', 10))} /></div>
            <div><label style={labelStyle}>Revenue UGX (Total)</label><input style={inputStyle} type="number" value={data.manual_totals?.revenue || 0} onChange={(e) => setManualTotal('revenue', parseInt(e.target.value || '0', 10))} /></div>
          </div>
          <p style={{ fontSize: '12px', color: C.muted, marginTop: '12px' }}>Note: IPD admissions, deliveries, immunizations, notifiable cases, and staff counts are auto-aggregated from their respective HMIS pages.</p>
        </div>
      </div>

      {/* Monthly KPI Form + Table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={cardStyle}>
          <div style={headerStyle}>Monthly KPI Entry (Form 105)</div>
          <div style={bodyStyle}>
            <form onSubmit={saveKpi}>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Month *</label><input style={inputStyle} type="month" value={kpiForm.month} onChange={(e) => setKpiForm({ ...kpiForm, month: e.target.value })} required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>OPD &lt;5yr</label><input style={inputStyle} type="number" value={kpiForm.opd_under5} onChange={(e) => setKpiForm({ ...kpiForm, opd_under5: e.target.value })} /></div>
                <div><label style={labelStyle}>OPD &gt;5yr</label><input style={inputStyle} type="number" value={kpiForm.opd_over5} onChange={(e) => setKpiForm({ ...kpiForm, opd_over5: e.target.value })} /></div>
                <div><label style={labelStyle}>IPD Admissions</label><input style={inputStyle} type="number" value={kpiForm.ipd_admissions} onChange={(e) => setKpiForm({ ...kpiForm, ipd_admissions: e.target.value })} /></div>
                <div><label style={labelStyle}>Maternal Deaths</label><input style={inputStyle} type="number" value={kpiForm.maternal_deaths} onChange={(e) => setKpiForm({ ...kpiForm, maternal_deaths: e.target.value })} /></div>
                <div><label style={labelStyle}>Neonatal Deaths</label><input style={inputStyle} type="number" value={kpiForm.neonatal_deaths} onChange={(e) => setKpiForm({ ...kpiForm, neonatal_deaths: e.target.value })} /></div>
                <div><label style={labelStyle}>Stillbirths</label><input style={inputStyle} type="number" value={kpiForm.stillbirths} onChange={(e) => setKpiForm({ ...kpiForm, stillbirths: e.target.value })} /></div>
                <div><label style={labelStyle}>C-Sections</label><input style={inputStyle} type="number" value={kpiForm.csections} onChange={(e) => setKpiForm({ ...kpiForm, csections: e.target.value })} /></div>
                <div><label style={labelStyle}>Blood Transfusions</label><input style={inputStyle} type="number" value={kpiForm.blood_transfusions} onChange={(e) => setKpiForm({ ...kpiForm, blood_transfusions: e.target.value })} /></div>
              </div>
              <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Save KPIs</button>
            </form>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}>Monthly KPI Table ({data.kpis.length})</div>
          <div style={{ ...bodyStyle, overflowX: 'auto' }}>
            {data.kpis.length === 0
              ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No KPIs recorded yet. Add your first monthly KPI entry above.</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                  <thead><tr>
                    {['Month', 'OPD<5', 'OPD>5', 'IPD', 'Mat Dths', 'Neo Dths', 'Still', 'C-Sec', 'Blood'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.kpis.map(k => (
                      <tr key={k.id}>
                        <td style={tdStyle}><strong>{monthLabel(k.month)}</strong></td>
                        <td style={tdStyle}>{k.opd_under5 || 0}</td>
                        <td style={tdStyle}>{k.opd_over5 || 0}</td>
                        <td style={tdStyle}>{k.ipd_admissions || 0}</td>
                        <td style={tdStyle}>{k.maternal_deaths || 0}</td>
                        <td style={tdStyle}>{k.neonatal_deaths || 0}</td>
                        <td style={tdStyle}>{k.stillbirths || 0}</td>
                        <td style={tdStyle}>{k.csections || 0}</td>
                        <td style={tdStyle}>{k.blood_transfusions || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </div>
        </div>
      </div>

      {/* DHIS2 Submission Tracking */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={cardStyle}>
          <div style={headerStyle}>Track DHIS2 Submission</div>
          <div style={bodyStyle}>
            <form onSubmit={saveSub}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div><label style={labelStyle}>Month *</label><input style={inputStyle} type="month" value={subForm.month} onChange={(e) => setSubForm({ ...subForm, month: e.target.value })} required /></div>
                <div><label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={subForm.status} onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Submission Date</label><input style={inputStyle} type="date" value={subForm.submission_date} onChange={(e) => setSubForm({ ...subForm, submission_date: e.target.value })} /></div>
              </div>
              <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>📡 Track Submission</button>
            </form>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}>DHIS2 Submissions ({data.submissions.length})</div>
          <div style={{ ...bodyStyle, overflowX: 'auto' }}>
            {data.submissions.length === 0
              ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No DHIS2 submissions tracked yet. Add your first submission above.</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '420px' }}>
                  <thead><tr><th style={thStyle}>Month</th><th style={thStyle}>Status</th><th style={thStyle}>Submission Date</th></tr></thead>
                  <tbody>
                    {data.submissions.map(s => {
                      const sc = statusColor(s.status);
                      return (
                        <tr key={s.id}>
                          <td style={tdStyle}><strong>{monthLabel(s.month)}</strong></td>
                          <td style={tdStyle}>
                            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${sc}22`, color: sc, border: `1px solid ${sc}` }}>{s.status}</span>
                          </td>
                          <td style={tdStyle}>{s.submission_date}</td>
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
