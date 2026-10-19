// FileName: src/pages/hmis/Mortuary.jsx
// Mortuary Management — body intake register and active body tracking
// localStorage persistence under 'hmis_mortuary_records'

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
  yellow: '#ffc107',
};

const SEXES = ['Male', 'Female', 'Unknown'];
const CAUSES = ['Natural', 'Accident', 'Suicide', 'Homicide', 'Unknown'];
const PLACES = ['In-patient', 'OPD', 'Home', 'Brought in dead'];
const FEE_STATUSES = ['Paid', 'Pending', 'Waived'];
const PM_OPTIONS = ['No', 'Yes'];

const EMPTY_REC = {
  deceased_name: '', sex: SEXES[0], age: '',
  date_of_death: new Date().toISOString().slice(0, 10), time_of_death: '',
  cause_of_death: CAUSES[0], cause_details: '', place_of_death: PLACES[0],
  next_of_kin_name: '', next_of_kin_phone: '',
  body_location: '', admitting_staff: '',
  fee: '', fee_status: FEE_STATUSES[1],
  release_date: '', released_to: '',
  post_mortem: PM_OPTIONS[0], post_mortem_notes: '',
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

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const then = new Date(dateStr + 'T00:00:00');
  if (isNaN(then.getTime())) return 0;
  const diff = Date.now() - then.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export default function Mortuary() {
  const [tab, setTab] = useState('register');
  const [records, setRecords] = useLocalState('hmis_mortuary_records', []);
  const [form, setForm] = useState(EMPTY_REC);
  const [msg, setMsg] = useState('');
  const [releasingId, setReleasingId] = useState(null);
  const [releaseForm, setReleaseForm] = useState({ release_date: todayStr(), released_to: '' });

  const activeBodies = records.filter(r => !r.release_date);

  const field = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const intake = (e) => {
    e.preventDefault();
    if (!form.deceased_name) { setMsg('❌ Deceased name is required'); return; }
    if (!form.date_of_death) { setMsg('❌ Date of death is required'); return; }
    if (!form.body_location) { setMsg('❌ Body location (cold room shelf) is required'); return; }
    const id = 'MOR-' + Date.now().toString().slice(-8);
    const record = { ...form, id, created_at: todayStr(), age: form.age === '' ? '' : Number(form.age), fee: form.fee === '' ? '' : Number(form.fee) };
    setRecords([record, ...records]);
    setForm({ ...EMPTY_REC, date_of_death: todayStr() });
    setMsg('✅ Body registered. ID: ' + id);
  };

  const submitRelease = (e) => {
    e.preventDefault();
    if (!releaseForm.released_to) { setMsg('❌ Released-to name is required'); return; }
    setRecords(records.map(r => r.id === releasingId
      ? { ...r, release_date: releaseForm.release_date, released_to: releaseForm.released_to }
      : r));
    setMsg('✅ Body released');
    setReleasingId(null);
    setReleaseForm({ release_date: todayStr(), released_to: '' });
  };

  const cancelRelease = () => {
    setReleasingId(null);
    setReleaseForm({ release_date: todayStr(), released_to: '' });
  };

  const inputStyle = { width: '100%', padding: '11px 14px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' };
  const btnStyle = { padding: '11px 22px', background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,128,67,0.3)' };
  const btnGhostStyle = { padding: '9px 16px', background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' };
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

  const badgeFor = (days) => {
    let color;
    if (days < 7) color = C.green;
    else if (days <= 14) color = C.yellow;
    else color = C.red;
    const label = days < 7 ? `${days}d` : days <= 14 ? `${days}d` : `${days}d`;
    return (
      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
        background: `${color}22`, color, border: `1px solid ${color}` }}>
        {days < 1 ? 'Today' : label}
      </span>
    );
  };

  const causeBadge = (cause) => {
    const color = cause === 'Natural' ? C.green
      : cause === 'Accident' ? C.orange
      : cause === 'Homicide' ? C.red
      : cause === 'Suicide' ? C.red
      : C.muted;
    return (
      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
        background: `${color}22`, color, border: `1px solid ${color}` }}>{cause}</span>
    );
  };

  const feeBadge = (status) => {
    const color = status === 'Paid' ? C.green : status === 'Pending' ? C.orange : C.blue;
    return (
      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
        background: `${color}22`, color, border: `1px solid ${color}` }}>{status}</span>
    );
  };

  const fmtUGX = (n) => n === '' || n === undefined || n === null ? '-' : 'UGX ' + Number(n).toLocaleString('en-UG');

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>🪦 Mortuary</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Body Intake Register · Active Bodies · Releases</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('register', '📋 Body Register', tab === 'register')}
        {tabBtn('active', '🧊 Active Bodies', tab === 'active')}
      </div>

      {tab === 'register' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>Body Intake Form</div>
            <div style={bodyStyle}>
              <form onSubmit={intake}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>Deceased Name *</label><input style={inputStyle} value={form.deceased_name} onChange={field('deceased_name')} placeholder="Full name" required /></div>
                  <div><label style={labelStyle}>Sex</label>
                    <select style={inputStyle} value={form.sex} onChange={field('sex')}>
                      {SEXES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Age (years)</label><input style={inputStyle} type="number" min="0" value={form.age} onChange={field('age')} placeholder="0-120" /></div>
                  <div><label style={labelStyle}>Date of Death *</label><input style={inputStyle} type="date" value={form.date_of_death} onChange={field('date_of_death')} required /></div>
                  <div><label style={labelStyle}>Time of Death</label><input style={inputStyle} type="time" value={form.time_of_death} onChange={field('time_of_death')} /></div>
                  <div><label style={labelStyle}>Place of Death</label>
                    <select style={inputStyle} value={form.place_of_death} onChange={field('place_of_death')}>
                      {PLACES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Cause of Death</label>
                    <select style={inputStyle} value={form.cause_of_death} onChange={field('cause_of_death')}>
                      {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Body Location (Cold Room Shelf #)</label><input style={inputStyle} value={form.body_location} onChange={field('body_location')} placeholder="Shelf 03" required /></div>
                  <div><label style={labelStyle}>Next of Kin Name</label><input style={inputStyle} value={form.next_of_kin_name} onChange={field('next_of_kin_name')} placeholder="Kin name" /></div>
                  <div><label style={labelStyle}>Next of Kin Phone</label><input style={inputStyle} type="tel" value={form.next_of_kin_phone} onChange={field('next_of_kin_phone')} placeholder="+256 7xx xxx xxx" /></div>
                  <div><label style={labelStyle}>Admitting Staff</label><input style={inputStyle} value={form.admitting_staff} onChange={field('admitting_staff')} placeholder="Mr. Ssemambo" /></div>
                  <div><label style={labelStyle}>Fee (UGX)</label><input style={inputStyle} type="number" min="0" value={form.fee} onChange={field('fee')} placeholder="100000" /></div>
                  <div><label style={labelStyle}>Fee Status</label>
                    <select style={inputStyle} value={form.fee_status} onChange={field('fee_status')}>
                      {FEE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Post-mortem</label>
                    <select style={inputStyle} value={form.post_mortem} onChange={field('post_mortem')}>
                      {PM_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Cause Details</label><input style={inputStyle} value={form.cause_details} onChange={field('cause_details')} placeholder="Brief description of cause / circumstances" /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Post-mortem Notes</label><input style={inputStyle} value={form.post_mortem_notes} onChange={field('post_mortem_notes')} placeholder="Pathologist findings / PM number" /></div>
                </div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Register Body</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Register ({records.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {records.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No bodies registered yet. Use the form to record your first intake.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                    <thead><tr>{['ID', 'Deceased', 'Sex/Age', 'DOD', 'Cause', 'Place', 'Location', 'Fee', 'Released'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.id}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.deceased_name}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.sex}/{r.age === '' ? '?' : r.age}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.date_of_death}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{causeBadge(r.cause_of_death)}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.place_of_death}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.body_location}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                            <div>{fmtUGX(r.fee)}</div>
                            <div style={{ marginTop: '4px' }}>{feeBadge(r.fee_status)}</div>
                          </td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                            {r.release_date
                              ? <span style={{ color: C.green }}>{r.release_date}<div style={{ fontSize: '11px', color: C.muted }}>to {r.released_to}</div></span>
                              : <span style={{ color: C.orange, fontSize: '12px' }}>Held</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'active' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 20px', minWidth: '160px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', color: C.muted, fontWeight: 700 }}>Active Bodies</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: C.text, marginTop: '4px' }}>{activeBodies.length}</div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.green}`, borderRadius: '10px', padding: '14px 20px', minWidth: '160px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', color: C.muted, fontWeight: 700 }}>&lt; 7 days</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: C.green, marginTop: '4px' }}>{activeBodies.filter(r => daysSince(r.created_at) < 7).length}</div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.yellow}`, borderRadius: '10px', padding: '14px 20px', minWidth: '160px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', color: C.muted, fontWeight: 700 }}>7-14 days</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: C.yellow, marginTop: '4px' }}>{activeBodies.filter(r => { const d = daysSince(r.created_at); return d >= 7 && d <= 14; }).length}</div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.red}`, borderRadius: '10px', padding: '14px 20px', minWidth: '160px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px', color: C.muted, fontWeight: 700 }}>&gt; 14 days</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: C.red, marginTop: '4px' }}>{activeBodies.filter(r => daysSince(r.created_at) > 14).length}</div>
            </div>
          </div>

          {releasingId && (
            <div style={{ ...cardStyle, borderColor: C.green, boxShadow: '0 0 0 1px ' + C.green }}>
              <div style={headerStyle}>Release Body · {records.find(r => r.id === releasingId)?.deceased_name}</div>
              <div style={bodyStyle}>
                <form onSubmit={submitRelease}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div><label style={labelStyle}>Release Date *</label><input style={inputStyle} type="date" value={releaseForm.release_date} onChange={(e) => setReleaseForm({ ...releaseForm, release_date: e.target.value })} required /></div>
                    <div><label style={labelStyle}>Released To *</label><input style={inputStyle} value={releaseForm.released_to} onChange={(e) => setReleaseForm({ ...releaseForm, released_to: e.target.value })} placeholder="Family member / funeral home" required /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button type="submit" style={btnStyle}>📤 Release Body</button>
                    <button type="button" style={btnGhostStyle} onClick={cancelRelease}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div style={cardStyle}>
            <div style={headerStyle}>Bodies Currently in Mortuary ({activeBodies.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {activeBodies.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No active bodies. All registered bodies have been released.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
                    <thead><tr>{['ID', 'Deceased', 'Sex/Age', 'DOD', 'Cause', 'Location', 'Next of Kin', 'Days Held', 'Fee', 'Action'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {activeBodies.map(r => {
                        const days = daysSince(r.created_at);
                        return (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.id}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.deceased_name}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.sex}/{r.age === '' ? '?' : r.age}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.date_of_death}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{causeBadge(r.cause_of_death)}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{r.body_location}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                              {r.next_of_kin_name || '-'}
                              {r.next_of_kin_phone && <div style={{ fontSize: '11px', color: C.muted }}>{r.next_of_kin_phone}</div>}
                            </td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{badgeFor(days)}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                              <div>{fmtUGX(r.fee)}</div>
                              <div style={{ marginTop: '4px' }}>{feeBadge(r.fee_status)}</div>
                            </td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                              <button type="button" onClick={() => { setReleasingId(r.id); setReleaseForm({ release_date: todayStr(), released_to: '' }); setMsg(''); }} style={{
                                padding: '7px 14px', background: 'transparent', color: C.green, border: `1px solid ${C.green}`, borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                              }}>📤 Release</button>
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
    </div>
  );
}
