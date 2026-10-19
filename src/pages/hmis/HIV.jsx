// FileName: src/pages/hmis/HIV.jsx
// HIV/AIDS Disease Program — ART enrollment, PMTCT/EID, appointments, lost-to-follow-up
// localStorage persistence under 'hmis_hiv_*' keys

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
  teal: '#0a9ead',
};

const REGIMENS = ['TLD', 'ABC-3TC-DTG', 'TDF-3TC-EFV', 'AZT-3TC-NVP'];
const WHO_STAGES = ['1', '2', '3', '4'];
const SEXES = ['Male', 'Female'];
const YES_NO = ['Yes', 'No'];
const PCR_RESULTS = ['Positive', 'Negative', 'Pending'];
const INFANT_PROPH = ['NVP', 'AZT', 'None'];
const BF_STATUSES = ['Exclusive BF', 'Mixed', 'Replacement', 'Stopped'];
const TEST_AGES = ['6 weeks', '9 months', '18 months'];
const APPT_STATUS = ['Scheduled', 'Kept', 'Missed', 'Rescheduled'];

const EMPTY_ART = {
  art_number: '', patient_name: '', age: '', sex: SEXES[0],
  cd4: '', viral_load: '', who_stage: WHO_STAGES[0], regimen: REGIMENS[0],
  tb_status: 'No', ipt_status: 'No',
  next_appointment: '', enrolled_date: new Date().toISOString().slice(0, 10),
};

const EMPTY_PMTCT = {
  mother_art: '', infant_name: '', dob: '',
  pcr_result: PCR_RESULTS[2], prophylaxis: INFANT_PROPH[0],
  bf_status: BF_STATUSES[0], test_age: TEST_AGES[0],
};

const EMPTY_APPT = {
  art_number: '', patient_name: '',
  appointment_date: new Date().toISOString().slice(0, 10),
  status: 'Scheduled', notes: '',
};

function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; /* storage read failure */ }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage write failure */ }
  }, [key, val]);
  return [val, setVal];
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function monthKey(d) { return (d || '').slice(0, 7); }
function dateDiffDays(a, b) {
  if (!a) return 0;
  const da = new Date(a); const db = b ? new Date(b) : new Date();
  return Math.round((da - db) / 86400000);
}
function monthShort(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en', { month: 'short' });
}

export default function HIV() {
  const [tab, setTab] = useState('dashboard');
  const [enrollments, setEnrollments] = useLocalState('hmis_hiv_records', []);
  const [pmtct, setPmtct] = useLocalState('hmis_hiv_pmtct', []);
  const [appointments, setAppointments] = useLocalState('hmis_hiv_appointments', []);
  const [artForm, setArtForm] = useState(EMPTY_ART);
  const [pmtctForm, setPmtctForm] = useState(EMPTY_PMTCT);
  const [apptForm, setApptForm] = useState(EMPTY_APPT);
  const [msg, setMsg] = useState('');

  const today = todayStr();
  const currentMonth = today.slice(0, 7);

  // KPIs
  const totalEnrolled = enrollments.length;
  const onART = enrollments.filter(e => e.regimen).length;
  const activeThisMonth = enrollments.filter(e =>
    monthKey(e.enrolled_date) === currentMonth ||
    monthKey(e.next_appointment) === currentMonth
  ).length;
  const ltfuCount = enrollments.filter(e =>
    e.next_appointment && dateDiffDays(e.next_appointment, today) < -30
  ).length;

  // Chart: last 6 months
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: monthShort(key) });
  }
  const monthCounts = months.map(m => enrollments.filter(e => monthKey(e.enrolled_date) === m.key).length);
  const maxCount = Math.max(1, ...monthCounts);

  // Upcoming appointments: Scheduled + date >= today
  const upcoming = appointments
    .filter(a => a.status === 'Scheduled' && dateDiffDays(a.appointment_date, today) >= 0)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

  // LTFU: status !== Kept AND date < today - 30 days
  const ltfuAppts = appointments
    .filter(a => a.status !== 'Kept' && dateDiffDays(a.appointment_date, today) < -30)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));

  const enroll = (e) => {
    e.preventDefault();
    if (!artForm.art_number || !artForm.patient_name) { setMsg('❌ ART Number and Patient name are required'); return; }
    if (enrollments.find(r => r.art_number.toLowerCase() === artForm.art_number.toLowerCase())) {
      setMsg('❌ ART Number already exists — must be unique'); return;
    }
    const id = 'ART-' + Date.now().toString().slice(-8);
    const record = { ...artForm, id, created_at: today };
    setEnrollments([record, ...enrollments]);
    // Auto-create appointment if next_appointment is set
    if (artForm.next_appointment) {
      const exists = appointments.find(a =>
        a.art_number === artForm.art_number && a.appointment_date === artForm.next_appointment
      );
      if (!exists) {
        const apptId = 'APPT-' + Date.now().toString().slice(-8);
        setAppointments([{
          id: apptId, art_number: artForm.art_number, patient_name: artForm.patient_name,
          appointment_date: artForm.next_appointment, status: 'Scheduled',
          notes: 'Auto-scheduled from enrollment', created_at: today,
        }, ...appointments]);
      }
    }
    setArtForm({ ...EMPTY_ART, enrolled_date: today });
    setMsg('✅ Patient enrolled on ART. ART#: ' + artForm.art_number);
  };

  const addPmtct = (e) => {
    e.preventDefault();
    if (!pmtctForm.mother_art || !pmtctForm.infant_name) { setMsg('❌ Mother ART# and Infant name are required'); return; }
    const id = 'EID-' + Date.now().toString().slice(-8);
    setPmtct([{ ...pmtctForm, id, created_at: today }, ...pmtct]);
    setPmtctForm({ ...EMPTY_PMTCT });
    setMsg('✅ Mother-infant pair added. ID: ' + id);
  };

  const addAppt = (e) => {
    e.preventDefault();
    if (!apptForm.art_number || !apptForm.patient_name || !apptForm.appointment_date) {
      setMsg('❌ ART#, Patient name, and Appointment date are required'); return;
    }
    const id = 'APPT-' + Date.now().toString().slice(-8);
    setAppointments([{ ...apptForm, id, created_at: today }, ...appointments]);
    setApptForm({ ...EMPTY_APPT, appointment_date: today });
    setMsg('✅ Appointment scheduled. ID: ' + id);
  };

  const updateApptStatus = (id, status) => {
    setAppointments(appointments.map(a => (a.id === id ? { ...a, status } : a)));
  };

  const removeEnrollment = (id) => {
    if (!window.confirm('Remove this enrollment record?')) return;
    setEnrollments(enrollments.filter(e => e.id !== id));
    setMsg('✅ Enrollment removed');
  };
  const removePmtct = (id) => {
    if (!window.confirm('Remove this PMTCT record?')) return;
    setPmtct(pmtct.filter(p => p.id !== id));
    setMsg('✅ PMTCT record removed');
  };
  const removeAppt = (id) => {
    setAppointments(appointments.filter(a => a.id !== id));
    setMsg('✅ Appointment removed');
  };

  // Shared styles
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

  const kpi = (icon, value, label, accent) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', borderTop: `3px solid ${accent}` }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '32px', fontWeight: 700, color: C.text, lineHeight: '1' }}>{value}</div>
      <div style={{ fontSize: '11px', color: C.muted, marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>{label}</div>
    </div>
  );

  const th = { textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` };
  const td = { padding: '11px 12px', fontSize: '13px' };
  const delBtn = (onClick) => (
    <button onClick={onClick} style={{ background: 'transparent', border: `1px solid ${C.red}`, color: C.red, borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
  );
  const pill = (text, color) => (
    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}` }}>{text}</span>
  );
  const inlineSelect = (value, onChange) => (
    <select value={value} onChange={onChange} style={{ background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '4px 8px', fontSize: '12px' }}>
      {APPT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>🧬 HIV/AIDS Program</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>ART Enrollment · PMTCT/EID · Appointments · Lost to Follow-up</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('dashboard', '📊 Dashboard', tab === 'dashboard')}
        {tabBtn('enrollments', '💊 Enrollments', tab === 'enrollments')}
        {tabBtn('pmtct', '👶 PMTCT/EID', tab === 'pmtct')}
        {tabBtn('appointments', '📅 Appointments', tab === 'appointments')}
      </div>

      {tab === 'dashboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {kpi('👥', totalEnrolled, 'Total Enrolled', C.blue)}
            {kpi('💊', onART, 'On ART', C.green)}
            {kpi('🟢', activeThisMonth, 'Active This Month', C.teal)}
            {kpi('⚠️', ltfuCount, 'Lost to Follow-up', C.red)}
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>📈 Monthly ART Enrollments (Last 6 Months)</div>
            <div style={bodyStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '220px', padding: '0 8px' }}>
                {months.map((m, i) => (
                  <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '12px', color: C.text, fontWeight: 600, marginBottom: '6px' }}>{monthCounts[i]}</div>
                    {monthCounts[i] > 0 ? (
                      <div style={{
                        width: '100%', maxWidth: '48px',
                        height: `${(monthCounts[i] / maxCount) * 160}px`,
                        minHeight: '8px',
                        background: `linear-gradient(180deg, ${C.greenLight}, ${C.green})`,
                        borderRadius: '4px 4px 0 0',
                      }} />
                    ) : (
                      <div style={{ width: '100%', maxWidth: '48px', height: '2px', background: C.border, borderRadius: '2px' }} />
                    )}
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '8px', textTransform: 'uppercase' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={cardStyle}>
              <div style={headerStyle}>💊 Regimen Distribution</div>
              <div style={bodyStyle}>
                {totalEnrolled === 0
                  ? <p style={{ textAlign: 'center', color: C.muted, padding: '20px 10px' }}>No enrollments yet.</p>
                  : REGIMENS.map(r => {
                    const cnt = enrollments.filter(e => e.regimen === r).length;
                    const pct = Math.round((cnt / totalEnrolled) * 100);
                    return (
                      <div key={r} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                          <span style={{ color: C.text }}>{r}</span>
                          <span style={{ color: C.muted }}>{cnt} ({pct}%)</span>
                        </div>
                        <div style={{ height: '8px', background: C.input, borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${C.green}, ${C.greenLight})` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={headerStyle}>🩺 WHO Stage Distribution</div>
              <div style={bodyStyle}>
                {totalEnrolled === 0
                  ? <p style={{ textAlign: 'center', color: C.muted, padding: '20px 10px' }}>No enrollments yet.</p>
                  : WHO_STAGES.map(s => {
                    const cnt = enrollments.filter(e => e.who_stage === s).length;
                    const pct = Math.round((cnt / totalEnrolled) * 100);
                    const stageColor = s === '1' ? C.green : s === '2' ? C.teal : s === '3' ? C.orange : C.red;
                    return (
                      <div key={s} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                          <span style={{ color: C.text }}>Stage {s}</span>
                          <span style={{ color: C.muted }}>{cnt} ({pct}%)</span>
                        </div>
                        <div style={{ height: '8px', background: C.input, borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: stageColor }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'enrollments' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>Enroll Patient on ART</div>
            <div style={bodyStyle}>
              <form onSubmit={enroll}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>ART Number *</label><input style={inputStyle} value={artForm.art_number} onChange={(e) => setArtForm({ ...artForm, art_number: e.target.value })} placeholder="ART-00001/2024" required /></div>
                  <div><label style={labelStyle}>Patient Name *</label><input style={inputStyle} value={artForm.patient_name} onChange={(e) => setArtForm({ ...artForm, patient_name: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Age *</label><input style={inputStyle} type="number" min="0" max="120" value={artForm.age} onChange={(e) => setArtForm({ ...artForm, age: e.target.value })} placeholder="32" required /></div>
                  <div><label style={labelStyle}>Sex</label>
                    <select style={inputStyle} value={artForm.sex} onChange={(e) => setArtForm({ ...artForm, sex: e.target.value })}>
                      {SEXES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>CD4 Count (cells/µL)</label><input style={inputStyle} type="number" min="0" value={artForm.cd4} onChange={(e) => setArtForm({ ...artForm, cd4: e.target.value })} placeholder="450" /></div>
                  <div><label style={labelStyle}>Viral Load (copies/mL)</label><input style={inputStyle} type="number" min="0" value={artForm.viral_load} onChange={(e) => setArtForm({ ...artForm, viral_load: e.target.value })} placeholder="<50 = undetectable" /></div>
                  <div><label style={labelStyle}>WHO Stage</label>
                    <select style={inputStyle} value={artForm.who_stage} onChange={(e) => setArtForm({ ...artForm, who_stage: e.target.value })}>
                      {WHO_STAGES.map(s => <option key={s} value={s}>Stage {s}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>ART Regimen</label>
                    <select style={inputStyle} value={artForm.regimen} onChange={(e) => setArtForm({ ...artForm, regimen: e.target.value })}>
                      {REGIMENS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>TB Status</label>
                    <select style={inputStyle} value={artForm.tb_status} onChange={(e) => setArtForm({ ...artForm, tb_status: e.target.value })}>
                      {YES_NO.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>IPT Status</label>
                    <select style={inputStyle} value={artForm.ipt_status} onChange={(e) => setArtForm({ ...artForm, ipt_status: e.target.value })}>
                      {YES_NO.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Next Appointment</label><input style={inputStyle} type="date" value={artForm.next_appointment} onChange={(e) => setArtForm({ ...artForm, next_appointment: e.target.value })} /></div>
                  <div><label style={labelStyle}>Enrolled Date</label><input style={inputStyle} type="date" value={artForm.enrolled_date} onChange={(e) => setArtForm({ ...artForm, enrolled_date: e.target.value })} /></div>
                </div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Enroll on ART</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>ART Enrollments ({enrollments.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {enrollments.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No ART enrollments yet. Enroll your first patient above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                    <thead><tr>{['ART#', 'Patient', 'CD4', 'VL', 'WHO', 'Regimen', 'TB', 'IPT', 'Next Appt', 'Enrolled', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {enrollments.map(e => {
                        const isLtfu = e.next_appointment && dateDiffDays(e.next_appointment, today) < -30;
                        return (
                          <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ ...td, color: C.green, fontWeight: 600 }}>{e.art_number}</td>
                            <td style={td}>{e.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{e.age}y · {e.sex}</div></td>
                            <td style={td}>{e.cd4 || '-'}</td>
                            <td style={td}>{e.viral_load || '-'}</td>
                            <td style={td}>{e.who_stage}</td>
                            <td style={td}>{e.regimen}</td>
                            <td style={td}>{pill(e.tb_status, e.tb_status === 'Yes' ? C.red : C.green)}</td>
                            <td style={td}>{e.ipt_status}</td>
                            <td style={td}>
                              {e.next_appointment || '-'}
                              {isLtfu && <div style={{ fontSize: '10px', color: C.red, fontWeight: 600 }}>LTFU</div>}
                            </td>
                            <td style={td}>{e.enrolled_date}</td>
                            <td style={td}>{delBtn(() => removeEnrollment(e.id))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'pmtct' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>Register Mother-Infant Pair (PMTCT/EID)</div>
            <div style={bodyStyle}>
              <form onSubmit={addPmtct}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>Mother ART# *</label><input style={inputStyle} value={pmtctForm.mother_art} onChange={(e) => setPmtctForm({ ...pmtctForm, mother_art: e.target.value })} placeholder="ART-00001/2024" required /></div>
                  <div><label style={labelStyle}>Infant Name *</label><input style={inputStyle} value={pmtctForm.infant_name} onChange={(e) => setPmtctForm({ ...pmtctForm, infant_name: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Date of Birth</label><input style={inputStyle} type="date" value={pmtctForm.dob} onChange={(e) => setPmtctForm({ ...pmtctForm, dob: e.target.value })} /></div>
                  <div><label style={labelStyle}>DNA-PCR Result</label>
                    <select style={inputStyle} value={pmtctForm.pcr_result} onChange={(e) => setPmtctForm({ ...pmtctForm, pcr_result: e.target.value })}>
                      {PCR_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Infant Prophylaxis</label>
                    <select style={inputStyle} value={pmtctForm.prophylaxis} onChange={(e) => setPmtctForm({ ...pmtctForm, prophylaxis: e.target.value })}>
                      {INFANT_PROPH.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Breastfeeding Status</label>
                    <select style={inputStyle} value={pmtctForm.bf_status} onChange={(e) => setPmtctForm({ ...pmtctForm, bf_status: e.target.value })}>
                      {BF_STATUSES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Test Age</label>
                    <select style={inputStyle} value={pmtctForm.test_age} onChange={(e) => setPmtctForm({ ...pmtctForm, test_age: e.target.value })}>
                      {TEST_AGES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Register Pair</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Mother-Infant Pairs ({pmtct.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {pmtct.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No PMTCT/EID records yet. Register your first pair above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                    <thead><tr>{['Mother ART#', 'Infant', 'DOB', 'PCR', 'Prophylaxis', 'Breastfeeding', 'Test Age', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {pmtct.map(p => {
                        const pcrColor = p.pcr_result === 'Positive' ? C.red : p.pcr_result === 'Negative' ? C.green : C.orange;
                        return (
                          <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ ...td, color: C.green, fontWeight: 600 }}>{p.mother_art}</td>
                            <td style={td}>{p.infant_name}</td>
                            <td style={td}>{p.dob || '-'}</td>
                            <td style={td}>{pill(p.pcr_result, pcrColor)}</td>
                            <td style={td}>{p.prophylaxis}</td>
                            <td style={td}>{p.bf_status}</td>
                            <td style={td}>{p.test_age}</td>
                            <td style={td}>{delBtn(() => removePmtct(p.id))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'appointments' && (
        <div>
          <div style={cardStyle}>
            <div style={headerStyle}>📅 Schedule Appointment</div>
            <div style={bodyStyle}>
              <form onSubmit={addAppt}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div><label style={labelStyle}>ART# *</label><input style={inputStyle} value={apptForm.art_number} onChange={(e) => setApptForm({ ...apptForm, art_number: e.target.value })} placeholder="ART-00001/2024" required /></div>
                  <div><label style={labelStyle}>Patient Name *</label><input style={inputStyle} value={apptForm.patient_name} onChange={(e) => setApptForm({ ...apptForm, patient_name: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Appointment Date *</label><input style={inputStyle} type="date" value={apptForm.appointment_date} onChange={(e) => setApptForm({ ...apptForm, appointment_date: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Status</label>
                    <select style={inputStyle} value={apptForm.status} onChange={(e) => setApptForm({ ...apptForm, status: e.target.value })}>
                      {APPT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Notes</label><input style={inputStyle} value={apptForm.notes} onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })} placeholder="e.g. CD4 monitoring, drug refill" /></div>
                </div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>📅 Schedule Appointment</button>
              </form>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={cardStyle}>
              <div style={headerStyle}>📅 Upcoming Appointments ({upcoming.length})</div>
              <div style={{ ...bodyStyle, overflowX: 'auto' }}>
                {upcoming.length === 0
                  ? <p style={{ textAlign: 'center', color: C.muted, padding: '20px 10px' }}>No upcoming appointments.</p>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                      <thead><tr>{['ART#', 'Patient', 'Date', 'In', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {upcoming.map(a => {
                          const days = dateDiffDays(a.appointment_date, today);
                          return (
                            <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ ...td, color: C.green, fontWeight: 600 }}>{a.art_number}</td>
                              <td style={td}>{a.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{a.notes}</div></td>
                              <td style={td}>{a.appointment_date}</td>
                              <td style={td}>{days === 0 ? 'Today' : `${days}d`}</td>
                              <td style={td}>{inlineSelect(a.status, (e) => updateApptStatus(a.id, e.target.value))}</td>
                              <td style={td}>{delBtn(() => removeAppt(a.id))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={headerStyle}>⚠️ Lost to Follow-up ({ltfuAppts.length})</div>
              <div style={bodyStyle}>
                <p style={{ fontSize: '12px', color: C.muted, marginBottom: '14px' }}>Patients who missed appointment by more than 30 days.</p>
                {ltfuAppts.length === 0
                  ? <p style={{ textAlign: 'center', color: C.green, padding: '20px 10px' }}>✅ No patients lost to follow-up.</p>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                      <thead><tr>{['ART#', 'Patient', 'Missed Appt', 'Overdue', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {ltfuAppts.map(a => {
                          const overdue = -dateDiffDays(a.appointment_date, today);
                          return (
                            <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                              <td style={{ ...td, color: C.red, fontWeight: 600 }}>{a.art_number}</td>
                              <td style={td}>{a.patient_name}</td>
                              <td style={td}>{a.appointment_date}</td>
                              <td style={td}>{pill(`${overdue}d`, C.red)}</td>
                              <td style={td}>{inlineSelect(a.status, (e) => updateApptStatus(a.id, e.target.value))}</td>
                              <td style={td}>{delBtn(() => removeAppt(a.id))}</td>
                            </tr>
                          );
                        })}
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
