// FileName: src/pages/hmis/Theatre.jsx
// Surgical Theatre Scheduling — for Ugandan HMIS
// localStorage persistence under 'hmis_theatre_cases'

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
};

const THEATRES = ['Theatre 1', 'Theatre 2'];
const PROC_TYPES = ['Major', 'Minor'];
const ASA_CLASSES = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const ANESTHESIA_TYPES = ['Spinal', 'General', 'Epidural', 'Local', 'Regional'];
const STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const OUTCOMES = ['Success', 'Complication', 'Death'];

const EMPTY_CASE = {
  patient_name: '',
  surgery_date: new Date().toISOString().slice(0, 10),
  theatre: THEATRES[0],
  procedure_type: PROC_TYPES[0],
  procedure_name: '',
  surgeon: '',
  anesthetist: '',
  asa: ASA_CLASSES[0],
  anesthesia_type: ANESTHESIA_TYPES[0],
  consent: false,
  npo: false,
  blood: false,
  instruments: false,
  status: 'Scheduled',
};

const EMPTY_OUTCOME = {
  case_id: '',
  outcome: OUTCOMES[0],
  post_op_notes: '',
  complications: '',
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

export default function Theatre() {
  const [tab, setTab] = useState('schedule');
  const [cases, setCases] = useLocalState('hmis_theatre_cases', []);
  const [form, setForm] = useState(EMPTY_CASE);
  const [outForm, setOutForm] = useState(EMPTY_OUTCOME);
  const [msg, setMsg] = useState('');

  const today = todayStr();
  const todaysCases = cases.filter(c => c.surgery_date === today);
  const pastCases = cases.filter(c => c.surgery_date < today || c.status === 'Completed' || c.status === 'Cancelled');
  const eligibleForOutcome = cases.filter(c => c.status === 'Completed' || c.surgery_date <= today);

  const schedule = (e) => {
    e.preventDefault();
    if (!form.patient_name || !form.procedure_name || !form.surgeon) {
      setMsg('❌ Patient name, procedure name, and surgeon are required');
      return;
    }
    const id = 'SUR-' + Date.now().toString().slice(-8);
    const record = { ...form, id, created_at: today };
    setCases([record, ...cases]);
    setForm({ ...EMPTY_CASE, surgery_date: today });
    setMsg('✅ Surgery scheduled. ID: ' + id);
  };

  const updateStatus = (id, status) => {
    setCases(cases.map(c => (c.id === id ? { ...c, status } : c)));
    setMsg('✅ Status updated to ' + status);
  };

  const selectOutcomeCase = (caseId) => {
    const c = cases.find(x => x.id === caseId);
    if (c) {
      setOutForm({
        case_id: caseId,
        outcome: c.outcome || OUTCOMES[0],
        post_op_notes: c.post_op_notes || '',
        complications: c.complications || '',
      });
    } else {
      setOutForm({ ...EMPTY_OUTCOME });
    }
  };

  const recordOutcome = (e) => {
    e.preventDefault();
    if (!outForm.case_id) { setMsg('❌ Select a case to record outcome'); return; }
    setCases(cases.map(c => (c.id === outForm.case_id
      ? {
          ...c,
          outcome: outForm.outcome,
          post_op_notes: outForm.post_op_notes,
          complications: outForm.complications,
          status: c.status === 'Cancelled' ? c.status : 'Completed',
        }
      : c)));
    setOutForm({ ...EMPTY_OUTCOME });
    setMsg('✅ Outcome recorded');
  };

  const inputStyle = { width: '100%', padding: '11px 14px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' };
  const btnStyle = { padding: '11px 22px', background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,128,67,0.3)' };
  const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', marginBottom: '20px' };
  const headerStyle = { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: '15px' };
  const bodyStyle = { padding: '20px' };
  const checkStyle = { width: '18px', height: '18px', accentColor: C.green, cursor: 'pointer' };
  const tabBtn = (id, label, active) => (
    <button key={id} onClick={() => { setTab(id); setMsg(''); }} style={{
      padding: '10px 18px', background: active ? `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)` : 'transparent',
      color: active ? '#fff' : C.muted, border: `1px solid ${active ? C.green : C.border}`, borderRadius: '8px',
      fontWeight: 600, fontSize: '13px', cursor: 'pointer', marginBottom: '6px',
    }}>{label}</button>
  );

  const statusBadge = (status) => {
    const map = {
      Scheduled: C.blue,
      'In Progress': C.orange,
      Completed: C.green,
      Cancelled: C.red,
    };
    const c = map[status] || C.muted;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}` }}>{status}</span>;
  };

  const outcomeBadge = (outcome) => {
    if (!outcome) return <span style={{ color: C.muted, fontSize: '12px' }}>—</span>;
    const map = { Success: C.green, Complication: C.orange, Death: C.red };
    const c = map[outcome] || C.muted;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}` }}>{outcome}</span>;
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>🏥 Surgical Theatre</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Scheduling · Today's Cases · History</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('schedule', '📅 Schedule', tab === 'schedule')}
        {tabBtn('today', "🕑 Today's Cases", tab === 'today')}
        {tabBtn('history', '📚 History', tab === 'history')}
      </div>

      {tab === 'schedule' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>Schedule New Surgery</div>
            <div style={bodyStyle}>
              <form onSubmit={schedule}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Patient Name *</label><input style={inputStyle} value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} placeholder="e.g. John Mukasa" required /></div>
                  <div><label style={labelStyle}>Surgery Date *</label><input style={inputStyle} type="date" value={form.surgery_date} onChange={(e) => setForm({ ...form, surgery_date: e.target.value })} /></div>
                  <div><label style={labelStyle}>Theatre *</label>
                    <select style={inputStyle} value={form.theatre} onChange={(e) => setForm({ ...form, theatre: e.target.value })}>
                      {THEATRES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Procedure Type *</label>
                    <select style={inputStyle} value={form.procedure_type} onChange={(e) => setForm({ ...form, procedure_type: e.target.value })}>
                      {PROC_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Procedure Name *</label><input style={inputStyle} value={form.procedure_name} onChange={(e) => setForm({ ...form, procedure_name: e.target.value })} placeholder="e.g. Appendectomy" required /></div>
                  <div><label style={labelStyle}>Surgeon *</label><input style={inputStyle} value={form.surgeon} onChange={(e) => setForm({ ...form, surgeon: e.target.value })} placeholder="Dr. Ssewanyana" required /></div>
                  <div><label style={labelStyle}>Anesthetist</label><input style={inputStyle} value={form.anesthetist} onChange={(e) => setForm({ ...form, anesthetist: e.target.value })} placeholder="Dr. Nakato" /></div>
                  <div><label style={labelStyle}>ASA Classification</label>
                    <select style={inputStyle} value={form.asa} onChange={(e) => setForm({ ...form, asa: e.target.value })}>
                      {ASA_CLASSES.map(a => <option key={a} value={a}>ASA {a}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Anesthesia Type</label>
                    <select style={inputStyle} value={form.anesthesia_type} onChange={(e) => setForm({ ...form, anesthesia_type: e.target.value })}>
                      {ANESTHESIA_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '14px' }}>
                  <label style={labelStyle}>Pre-Op Checklist</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                    {[['consent', 'Consent Signed'], ['npo', 'NPO Confirmed'], ['blood', 'Blood Available'], ['instruments', 'Instruments Ready']].map(([key, lbl]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: C.input, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '13px', color: C.text, cursor: 'pointer' }}>
                        <input type="checkbox" style={checkStyle} checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: '14px' }}><label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Schedule Surgery</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>All Scheduled Cases ({cases.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {cases.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No surgeries scheduled yet. Schedule your first case above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead><tr>{['Patient', 'Date', 'Theatre', 'Procedure', 'Surgeon', 'ASA', 'Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {cases.map(c => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{c.id}</div></td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.surgery_date}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.theatre}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}><div>{c.procedure_name}</div><div style={{ fontSize: '11px', color: C.muted }}>{c.procedure_type}</div></td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.surgeon}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>ASA {c.asa}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{statusBadge(c.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'today' && (
        <div style={cardStyle}>
          <div style={headerStyle}>Today's Cases — {today} ({todaysCases.length})</div>
          <div style={{ ...bodyStyle, overflowX: 'auto' }}>
            {todaysCases.length === 0
              ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No surgeries scheduled for today ({today}).</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead><tr>{['Patient', 'Theatre', 'Procedure', 'Type', 'Surgeon', 'Anesthetist', 'ASA', 'Anesthesia', 'Status', 'Update'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {todaysCases.map(c => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{c.id}</div></td>
                        <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.theatre}</td>
                        <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.procedure_name}</td>
                        <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.procedure_type}</td>
                        <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.surgeon}</td>
                        <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.anesthetist || '-'}</td>
                        <td style={{ padding: '11px 12px', fontSize: '13px' }}>ASA {c.asa}</td>
                        <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.anesthesia_type}</td>
                        <td style={{ padding: '11px 12px', fontSize: '13px' }}>{statusBadge(c.status)}</td>
                        <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                          <select value={c.status} onChange={(e) => updateStatus(c.id, e.target.value)} style={{ padding: '6px 10px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>Record Outcome / Post-Op</div>
            <div style={bodyStyle}>
              {eligibleForOutcome.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '20px 10px' }}>No eligible cases. Complete or schedule surgeries first.</p>
                : <form onSubmit={recordOutcome}>
                    <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Select Case *</label>
                      <select style={inputStyle} value={outForm.case_id} onChange={(e) => selectOutcomeCase(e.target.value)} required>
                        <option value="">— select —</option>
                        {eligibleForOutcome.map(c => <option key={c.id} value={c.id}>{c.id} · {c.patient_name} · {c.procedure_name}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Outcome *</label>
                      <select style={inputStyle} value={outForm.outcome} onChange={(e) => setOutForm({ ...outForm, outcome: e.target.value })}>
                        {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Complications</label><input style={inputStyle} value={outForm.complications} onChange={(e) => setOutForm({ ...outForm, complications: e.target.value })} placeholder="e.g. Bleeding, Infection" /></div>
                    <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Post-Op Notes</label><textarea style={{ ...inputStyle, minHeight: '90px', resize: 'vertical', fontFamily: 'inherit' }} value={outForm.post_op_notes} onChange={(e) => setOutForm({ ...outForm, post_op_notes: e.target.value })} placeholder="Recovery notes, observations, follow-up plan..." /></div>
                    <button type="submit" style={btnStyle}>💾 Save Outcome</button>
                  </form>}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Surgical History ({pastCases.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {pastCases.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No past surgeries recorded yet.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                    <thead><tr>{['Patient', 'Date', 'Procedure', 'Surgeon', 'Outcome', 'Complications', 'Post-Op Notes'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {pastCases.map(c => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{c.id}</div></td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.surgery_date}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.procedure_name}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.surgeon}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{outcomeBadge(c.outcome)}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{c.complications || '-'}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px', maxWidth: '260px' }}>{c.post_op_notes || '-'}</td>
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
