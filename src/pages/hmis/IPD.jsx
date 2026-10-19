// FileName: src/pages/hmis/IPD.jsx
// Inpatient Department Management — admissions, bed management, discharges
// localStorage persistence under 'hmis_ipd_*' keys

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

const WARDS = ['Male General', 'Female General', 'Maternity', 'Pediatric', 'Surgical', 'ICU', 'Private'];
const OUTCOMES = ['Improved', 'Recovered', 'Died', 'Transferred', 'Referred'];

const EMPTY_ADM = {
  patient_id: '', patient_name: '', ward: WARDS[0], bed: '',
  diagnosis: '', clinician: '', admission_date: new Date().toISOString().slice(0, 10),
};

const EMPTY_BED = {
  ward: WARDS[0], bed: '', status: 'Available', patient: '',
};

const EMPTY_DIS = {
  admission_id: '', discharge_diagnosis: '', outcome: OUTCOMES[0],
  discharge_date: new Date().toISOString().slice(0, 10),
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

export default function IPD() {
  const [tab, setTab] = useState('admissions');
  const [admissions, setAdmissions] = useLocalState('hmis_ipd_admissions', []);
  const [beds, setBeds] = useLocalState('hmis_ipd_beds', []);
  const [discharges, setDischarges] = useLocalState('hmis_ipd_discharges', []);
  const [admForm, setAdmForm] = useState(EMPTY_ADM);
  const [bedForm, setBedForm] = useState(EMPTY_BED);
  const [disForm, setDisForm] = useState(EMPTY_DIS);
  const [msg, setMsg] = useState('');

  const activeAdmissions = admissions.filter(a => !discharges.find(d => d.admission_id === a.id));

  const admit = (e) => {
    e.preventDefault();
    if (!admForm.patient_name || !admForm.ward || !admForm.bed) { setMsg('❌ Patient name, ward, and bed are required'); return; }
    const id = 'ADM-' + Date.now().toString().slice(-8);
    const record = { ...admForm, id, created_at: todayStr() };
    setAdmissions([record, ...admissions]);
    // mark bed occupied
    setBeds(beds.map(b => (b.ward === admForm.ward && b.bed === admForm.bed)
      ? { ...b, status: 'Occupied', patient: admForm.patient_name }
      : b));
    setAdmForm({ ...EMPTY_ADM, admission_date: todayStr() });
    setMsg('✅ Patient admitted. ID: ' + id);
  };

  const addBed = (e) => {
    e.preventDefault();
    if (!bedForm.bed || !bedForm.ward) { setMsg('❌ Ward and bed number are required'); return; }
    if (beds.find(b => b.ward === bedForm.ward && b.bed === bedForm.bed)) { setMsg('❌ Bed already exists'); return; }
    const id = 'BED-' + Date.now().toString().slice(-8);
    setBeds([{ ...bedForm, id }, ...beds]);
    setBedForm({ ...EMPTY_BED });
    setMsg('✅ Bed added');
  };

  const discharge = (e) => {
    e.preventDefault();
    if (!disForm.admission_id) { setMsg('❌ Select an admission to discharge'); return; }
    if (!disForm.discharge_diagnosis) { setMsg('❌ Discharge diagnosis is required'); return; }
    const record = { ...disForm, id: 'DIS-' + Date.now().toString().slice(-8), created_at: todayStr() };
    setDischarges([record, ...discharges]);
    // free bed
    const adm = admissions.find(a => a.id === disForm.admission_id);
    if (adm) {
      setBeds(beds.map(b => (b.ward === adm.ward && b.bed === adm.bed)
        ? { ...b, status: 'Available', patient: '' } : b));
    }
    setDisForm({ ...EMPTY_DIS, discharge_date: todayStr() });
    setMsg('✅ Patient discharged');
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

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>🛏️ Inpatient Department (IPD)</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Admissions · Bed Management · Discharges</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('admissions', '📋 Admissions', tab === 'admissions')}
        {tabBtn('beds', '🛏️ Bed Management', tab === 'beds')}
        {tabBtn('discharges', '📤 Discharges', tab === 'discharges')}
      </div>

      {tab === 'admissions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>Admit New Patient</div>
            <div style={bodyStyle}>
              <form onSubmit={admit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>Patient ID / OPD #</label><input style={inputStyle} value={admForm.patient_id} onChange={(e) => setAdmForm({ ...admForm, patient_id: e.target.value })} placeholder="OPD-12345678" /></div>
                  <div><label style={labelStyle}>Patient Name *</label><input style={inputStyle} value={admForm.patient_name} onChange={(e) => setAdmForm({ ...admForm, patient_name: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Ward *</label>
                    <select style={inputStyle} value={admForm.ward} onChange={(e) => setAdmForm({ ...admForm, ward: e.target.value })}>
                      {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Bed No *</label><input style={inputStyle} value={admForm.bed} onChange={(e) => setAdmForm({ ...admForm, bed: e.target.value })} placeholder="B-12" required /></div>
                  <div><label style={labelStyle}>Admitting Clinician</label><input style={inputStyle} value={admForm.clinician} onChange={(e) => setAdmForm({ ...admForm, clinician: e.target.value })} placeholder="Dr. Ssewanyana" /></div>
                  <div><label style={labelStyle}>Admission Date</label><input style={inputStyle} type="date" value={admForm.admission_date} onChange={(e) => setAdmForm({ ...admForm, admission_date: e.target.value })} /></div>
                </div>
                <div style={{ marginTop: '14px' }}><label style={labelStyle}>Admitting Diagnosis</label><input style={inputStyle} value={admForm.diagnosis} onChange={(e) => setAdmForm({ ...admForm, diagnosis: e.target.value })} placeholder="e.g. Severe Malaria" /></div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>💾 Admit Patient</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Active Admissions ({activeAdmissions.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {activeAdmissions.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No active admissions yet. Admit your first patient above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                    <thead><tr>{['Patient', 'Ward', 'Bed', 'Diagnosis', 'Clinician', 'Admitted'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {activeAdmissions.map(a => (
                        <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{a.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{a.id}</div></td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{a.ward}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{a.bed}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{a.diagnosis || '-'}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{a.clinician || '-'}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{a.admission_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'beds' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>Add New Bed</div>
            <div style={bodyStyle}>
              <form onSubmit={addBed}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label style={labelStyle}>Ward *</label>
                    <select style={inputStyle} value={bedForm.ward} onChange={(e) => setBedForm({ ...bedForm, ward: e.target.value })}>
                      {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Bed Number *</label><input style={inputStyle} value={bedForm.bed} onChange={(e) => setBedForm({ ...bedForm, bed: e.target.value })} placeholder="B-12" required /></div>
                </div>
                <div style={{ marginTop: '14px' }}><label style={labelStyle}>Initial Status</label>
                  <select style={inputStyle} value={bedForm.status} onChange={(e) => setBedForm({ ...bedForm, status: e.target.value })}>
                    <option value="Available">Available</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>➕ Add Bed</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Bed List ({beds.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {beds.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No beds added yet. Add your first bed above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                    <thead><tr>{['Ward', 'Bed', 'Status', 'Assigned Patient'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {beds.map(b => (
                        <tr key={b.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{b.ward}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{b.bed}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                              background: b.status === 'Available' ? 'rgba(11,128,67,0.2)' : b.status === 'Occupied' ? 'rgba(232,113,10,0.2)' : 'rgba(211,47,47,0.2)',
                              color: b.status === 'Available' ? C.green : b.status === 'Occupied' ? C.orange : C.red,
                              border: `1px solid ${b.status === 'Available' ? C.green : b.status === 'Occupied' ? C.orange : C.red}` }}>{b.status}</span>
                          </td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{b.patient || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'discharges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>Discharge Patient</div>
            <div style={bodyStyle}>
              {activeAdmissions.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '20px 10px' }}>No active admissions to discharge.</p>
                : <form onSubmit={discharge}>
                    <div style={{ marginBottom: '14px' }}><label style={labelStyle}>Select Admission *</label>
                      <select style={inputStyle} value={disForm.admission_id} onChange={(e) => setDisForm({ ...disForm, admission_id: e.target.value })} required>
                        <option value="">— select —</option>
                        {activeAdmissions.map(a => <option key={a.id} value={a.id}>{a.id} · {a.patient_name} · {a.ward}/{a.bed}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div><label style={labelStyle}>Discharge Diagnosis *</label><input style={inputStyle} value={disForm.discharge_diagnosis} onChange={(e) => setDisForm({ ...disForm, discharge_diagnosis: e.target.value })} placeholder="e.g. Recovered from malaria" required /></div>
                      <div><label style={labelStyle}>Outcome</label>
                        <select style={inputStyle} value={disForm.outcome} onChange={(e) => setDisForm({ ...disForm, outcome: e.target.value })}>
                          {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Discharge Date</label><input style={inputStyle} type="date" value={disForm.discharge_date} onChange={(e) => setDisForm({ ...disForm, discharge_date: e.target.value })} /></div>
                    </div>
                    <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>📤 Discharge Patient</button>
                  </form>}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Discharge History ({discharges.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {discharges.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No discharges recorded yet. Discharge your first patient above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                    <thead><tr>{['Admission', 'Dx', 'Outcome', 'Date'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {discharges.map(d => {
                        const adm = admissions.find(a => a.id === d.admission_id);
                        const outColor = d.outcome === 'Died' ? C.red : (d.outcome === 'Improved' || d.outcome === 'Recovered') ? C.green : C.blue;
                        return (
                          <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{adm ? adm.patient_name : d.admission_id}<div style={{ fontSize: '11px', color: C.muted }}>{d.admission_id}</div></td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{d.discharge_diagnosis}</td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${outColor}22`, color: outColor, border: `1px solid ${outColor}` }}>{d.outcome}</span>
                            </td>
                            <td style={{ padding: '11px 12px', fontSize: '13px' }}>{d.discharge_date}</td>
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
