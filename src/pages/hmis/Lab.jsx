// FileName: src/pages/hmis/Lab.jsx
// Laboratory (Form 005) — new test orders, pending queue, results history
// localStorage persistence under 'hmis_lab_orders' + 'hmis_lab_results'

import React, { useState, useEffect, useMemo } from 'react';

const C = {
  bg: '#071b2f', card: '#0d2640', cardAlt: '#0a2238', input: '#0a1f36',
  border: '#1a3a5c', green: '#0b8043', greenLight: '#0ca252',
  text: '#e6f0fa', muted: '#8da7c1', red: '#d32f2f', orange: '#e8710a',
  blue: '#1a73e8', purple: '#7b1fa2',
};

const PRIORITIES = ['Routine', 'Urgent', 'STAT'];
const DOCTORS = ['Dr. Ssewanyana', 'Dr. Nakato', 'Dr. Okello', 'Dr. Achieng', 'Dr. Mugisha', 'Dr. Namuli'];

// 15-test preset library — adapted for low-resource hospital (EMHSLU)
const TEST_LIBRARY = [
  { code: 'CBC', name: 'Full Blood Count', category: 'Hematology', normal_range: 'Hb 12-16 g/dL, WBC 4-10×10⁹/L' },
  { code: 'MP', name: 'Blood Slide for Malaria Parasites', category: 'Parasitology', normal_range: 'Negative' },
  { code: 'BS-CULT', name: 'Blood Culture & Sensitivity', category: 'Microbiology', normal_range: 'No growth after 7 days' },
  { code: 'URINALYSIS', name: 'Urinalysis (Dipstick)', category: 'Chemical Pathology', normal_range: 'Negative' },
  { code: 'LFT', name: 'Liver Function Tests', category: 'Chemical Pathology', normal_range: 'ALT 7-56 U/L, AST 10-40 U/L' },
  { code: 'RFT', name: 'Renal Function Tests', category: 'Chemical Pathology', normal_range: 'Urea 2.5-7.1 mmol/L, Creat 53-106 µmol/L' },
  { code: 'RBS', name: 'Random Blood Sugar', category: 'Chemical Pathology', normal_range: '3.9-7.8 mmol/L' },
  { code: 'LIPID', name: 'Lipid Profile', category: 'Chemical Pathology', normal_range: 'Total Chol <5.0 mmol/L' },
  { code: 'WIDAL', name: 'Widal Test (Typhoid)', category: 'Serology', normal_range: 'TO/TH < 1:80' },
  { code: 'HB', name: 'Haemoglobin Estimation', category: 'Hematology', normal_range: 'M 13-17 g/dL, F 12-15 g/dL' },
  { code: 'BG', name: 'Blood Grouping (ABO + Rh)', category: 'Hematology', normal_range: 'A/B/AB/O × Rh+/−' },
  { code: 'HIV', name: 'HIV Rapid Test', category: 'Serology', normal_range: 'Non-reactive' },
  { code: 'HBsAg', name: 'Hepatitis B Surface Antigen', category: 'Serology', normal_range: 'Negative' },
  { code: 'PREG', name: 'Pregnancy Test (Urine hCG)', category: 'Serology', normal_range: 'Negative (non-pregnant)' },
  { code: 'STOOL', name: 'Stool Analysis', category: 'Microbiology', normal_range: 'No ova/cysts/parasites' },
];

const STATUSES = ['Ordered', 'Collected', 'In-Progress', 'Completed', 'Rejected'];

const EMPTY_ORDER = {
  patient_name: '', age: '', sex: 'Male', test_code: TEST_LIBRARY[0].code,
  priority: PRIORITIES[0], requesting_doctor: DOCTORS[0],
  order_date: new Date().toISOString().slice(0, 10),
  clinical_notes: '',
};

const EMPTY_RESULT = {
  order_id: '', result_value: '', normal_range: '', flag: 'Normal', units: '',
  result_date: new Date().toISOString().slice(0, 10),
  technician: '',
};

function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Lab() {
  const [tab, setTab] = useState('new');
  const [orders, setOrders] = useLocalState('hmis_lab_orders', []);
  const [results, setResults] = useLocalState('hmis_lab_results', []);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER);
  const [resultForm, setResultForm] = useState(EMPTY_RESULT);
  const [msg, setMsg] = useState('');

  const pendingOrders = useMemo(
    () => orders.filter(o => !results.find(r => r.order_id === o.id) && o.status !== 'Rejected'),
    [orders, results]
  );

  const completedTests = useMemo(() => {
    return results.map(r => {
      const order = orders.find(o => o.id === r.order_id);
      return { ...r, order };
    }).filter(r => r.order);
  }, [orders, results]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: pendingOrders.length,
    completed: results.length,
    stat: orders.filter(o => o.priority === 'STAT' && !results.find(r => r.order_id === o.id)).length,
  }), [orders, pendingOrders, results]);

  const submitOrder = (e) => {
    e.preventDefault();
    if (!orderForm.patient_name) { setMsg('❌ Patient name is required'); return; }
    if (!orderForm.test_code) { setMsg('❌ Test selection is required'); return; }
    const id = 'LAB-' + Date.now().toString().slice(-8);
    const test = TEST_LIBRARY.find(t => t.code === orderForm.test_code);
    const record = { ...orderForm, id, status: 'Ordered', test_name: test?.name || '', test_category: test?.category || '', created_at: todayStr() };
    setOrders([record, ...orders]);
    setOrderForm({ ...EMPTY_ORDER, order_date: todayStr() });
    setMsg('✅ Test order saved. Order ID: ' + id);
  };

  const submitResult = (e) => {
    e.preventDefault();
    if (!resultForm.order_id) { setMsg('❌ Select a pending order to record results for'); return; }
    if (!resultForm.result_value) { setMsg('❌ Result value is required'); return; }
    const id = 'RES-' + Date.now().toString().slice(-8);
    const record = { ...resultForm, id, created_at: todayStr() };
    setResults([record, ...results]);
    // update order status to Completed
    setOrders(orders.map(o => o.id === resultForm.order_id ? { ...o, status: 'Completed' } : o));
    setResultForm({ ...EMPTY_RESULT, result_date: todayStr() });
    setMsg('✅ Result recorded. Result ID: ' + id);
  };

  const removeOrder = (id) => {
    if (!window.confirm('Delete this lab order? This cannot be undone.')) return;
    setOrders(orders.filter(o => o.id !== id));
    setResults(results.filter(r => r.order_id !== id));
    setMsg('🗑️ Order ' + id + ' deleted');
  };

  const removeResult = (id) => {
    if (!window.confirm('Delete this result? The order will become pending again.')) return;
    const r = results.find(x => x.id === id);
    if (r && r.order_id) {
      setOrders(orders.map(o => o.id === r.order_id ? { ...o, status: 'Ordered' } : o));
    }
    setResults(results.filter(x => x.id !== id));
    setMsg('🗑️ Result ' + id + ' deleted');
  };

  const updateOrderStatus = (id, status) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
    setMsg('✅ Order status updated to ' + status);
  };

  const setTestFromLibrary = (code) => {
    setOrderForm({ ...orderForm, test_code: code });
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
  const priorityBadge = (p) => {
    const c = p === 'STAT' ? C.red : p === 'Urgent' ? C.orange : C.blue;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}` }}>{p}</span>;
  };
  const flagBadge = (f) => {
    const c = f === 'Critical' ? C.red : f === 'Abnormal' ? C.orange : C.green;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}` }}>{f || 'Normal'}</span>;
  };
  const statusBadge = (s) => {
    const c = s === 'Completed' ? C.green : s === 'Rejected' ? C.red : s === 'In-Progress' ? C.orange : s === 'Collected' ? C.blue : C.muted;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}` }}>{s || 'Ordered'}</span>;
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>🔬 Laboratory (Form 005)</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>New Test Order · Pending · Results History</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') || msg.includes('🗑️') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') || msg.includes('🗑️') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {statBox('Total Orders', stats.total, C.blue)}
        {statBox('Pending', stats.pending, C.orange)}
        {statBox('Completed', stats.completed, C.green)}
        {statBox('STAT Pending', stats.stat, C.red)}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('new', '➕ New Test Order', tab === 'new')}
        {tabBtn('pending', '⏳ Pending Tests', tab === 'pending')}
        {tabBtn('results', '📊 Results History', tab === 'results')}
      </div>

      {tab === 'new' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>New Lab Test Order</div>
            <div style={bodyStyle}>
              <form onSubmit={submitOrder}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Patient Name *</label><input style={inputStyle} value={orderForm.patient_name} onChange={(e) => setOrderForm({ ...orderForm, patient_name: e.target.value })} placeholder="Jane Nakato" required /></div>
                  <div><label style={labelStyle}>Age</label><input style={inputStyle} type="number" value={orderForm.age} onChange={(e) => setOrderForm({ ...orderForm, age: e.target.value })} placeholder="28" /></div>
                  <div><label style={labelStyle}>Sex</label>
                    <select style={inputStyle} value={orderForm.sex} onChange={(e) => setOrderForm({ ...orderForm, sex: e.target.value })}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Priority</label>
                    <select style={inputStyle} value={orderForm.priority} onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Requesting Doctor *</label>
                    <select style={inputStyle} value={orderForm.requesting_doctor} onChange={(e) => setOrderForm({ ...orderForm, requesting_doctor: e.target.value })}>
                      {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Order Date</label><input style={inputStyle} type="date" value={orderForm.order_date} onChange={(e) => setOrderForm({ ...orderForm, order_date: e.target.value })} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Test *</label>
                    <select style={inputStyle} value={orderForm.test_code} onChange={(e) => setTestFromLibrary(e.target.value)}>
                      {TEST_LIBRARY.map(t => <option key={t.code} value={t.code}>{t.code} · {t.name} ({t.category})</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Clinical Notes / Indication</label><textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={orderForm.clinical_notes} onChange={(e) => setOrderForm({ ...orderForm, clinical_notes: e.target.value })} placeholder="Fever 3 days, suspected malaria..." /></div>
                </div>
                <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>🧪 Order Test</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>15-Test Preset Library</div>
            <div style={{ ...bodyStyle, maxHeight: '480px', overflowY: 'auto' }}>
              {TEST_LIBRARY.map(t => (
                <div key={t.code} style={{ padding: '12px', marginBottom: '8px', background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ color: C.green, fontWeight: 700, fontSize: '13px' }}>{t.code} · {t.name}</div>
                      <div style={{ color: C.muted, fontSize: '11px', marginTop: '3px' }}>{t.category}</div>
                      <div style={{ color: C.muted, fontSize: '11px', marginTop: '3px' }}>Normal: {t.normal_range}</div>
                    </div>
                    <button onClick={() => { setTestFromLibrary(t.code); setTab('new'); setMsg('✅ ' + t.code + ' selected in order form'); }} style={{ padding: '6px 12px', background: 'rgba(11,128,67,0.18)', color: C.green, border: `1px solid ${C.green}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Use</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'pending' && (
        <div>
          <div style={cardStyle}>
            <div style={headerStyle}>Record Test Result</div>
            <div style={bodyStyle}>
              {pendingOrders.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '20px 10px' }}>No pending tests. All orders have results.</p>
                : <form onSubmit={submitResult}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Select Pending Order *</label>
                        <select style={inputStyle} value={resultForm.order_id} onChange={(e) => {
                          const o = orders.find(x => x.id === e.target.value);
                          const t = TEST_LIBRARY.find(x => x.code === o?.test_code);
                          setResultForm({ ...resultForm, order_id: e.target.value, normal_range: t?.normal_range || '' });
                        }} required>
                          <option value="">— select —</option>
                          {pendingOrders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.patient_name} · {o.test_code}</option>)}
                        </select>
                      </div>
                      <div><label style={labelStyle}>Result Value *</label><input style={inputStyle} value={resultForm.result_value} onChange={(e) => setResultForm({ ...resultForm, result_value: e.target.value })} placeholder="e.g. 14.5 g/dL, Negative, 6.2 mmol/L" required /></div>
                      <div><label style={labelStyle}>Units</label><input style={inputStyle} value={resultForm.units} onChange={(e) => setResultForm({ ...resultForm, units: e.target.value })} placeholder="g/dL, mmol/L, %..." /></div>
                      <div><label style={labelStyle}>Normal Range</label><input style={inputStyle} value={resultForm.normal_range} onChange={(e) => setResultForm({ ...resultForm, normal_range: e.target.value })} placeholder="12-16 g/dL" /></div>
                      <div><label style={labelStyle}>Flag</label>
                        <select style={inputStyle} value={resultForm.flag} onChange={(e) => setResultForm({ ...resultForm, flag: e.target.value })}>
                          <option>Normal</option><option>Abnormal</option><option>Critical</option>
                        </select>
                      </div>
                      <div><label style={labelStyle}>Result Date</label><input style={inputStyle} type="date" value={resultForm.result_date} onChange={(e) => setResultForm({ ...resultForm, result_date: e.target.value })} /></div>
                      <div><label style={labelStyle}>Technician</label><input style={inputStyle} value={resultForm.technician} onChange={(e) => setResultForm({ ...resultForm, technician: e.target.value })} placeholder="Lab Tech. Mukasa" /></div>
                    </div>
                    <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>📝 Save Result</button>
                  </form>}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Pending Tests ({pendingOrders.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {pendingOrders.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No pending tests. Order your first test above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
                    <thead><tr>
                      {['Order ID', 'Patient', 'Test', 'Priority', 'Status', 'Doctor', 'Date', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {pendingOrders.map(o => (
                        <tr key={o.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={tdStyle}>{o.id}</td>
                          <td style={tdStyle}>{o.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{o.age || '-'}y / {o.sex?.[0] || '-'}</div></td>
                          <td style={tdStyle}>{o.test_code}<div style={{ fontSize: '11px', color: C.muted }}>{o.test_name || ''}</div></td>
                          <td style={tdStyle}>{priorityBadge(o.priority)}</td>
                          <td style={tdStyle}>
                            <select value={o.status || 'Ordered'} onChange={(e) => updateOrderStatus(o.id, e.target.value)} style={{ padding: '4px 8px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '6px', fontSize: '12px' }}>
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td style={tdStyle}>{o.requesting_doctor || '-'}</td>
                          <td style={tdStyle}>{o.order_date}</td>
                          <td style={tdStyle}>
                            <button onClick={() => removeOrder(o.id)} style={{ background: 'rgba(211,47,47,0.18)', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'results' && (
        <div style={cardStyle}>
          <div style={headerStyle}>Results History ({completedTests.length})</div>
          <div style={{ ...bodyStyle, overflowX: 'auto' }}>
            {completedTests.length === 0
              ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No results recorded yet. Record your first result on the Pending Tests tab.</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead><tr>
                    {['Result ID', 'Patient', 'Test', 'Value', 'Normal Range', 'Flag', 'Tech', 'Date', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {completedTests.map(r => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={tdStyle}>{r.id}</td>
                        <td style={tdStyle}>{r.order?.patient_name || '-'}<div style={{ fontSize: '11px', color: C.muted }}>{r.order?.id}</div></td>
                        <td style={tdStyle}>{r.order?.test_code}<div style={{ fontSize: '11px', color: C.muted }}>{r.order?.test_name || ''}</div></td>
                        <td style={tdStyle}>{r.result_value} {r.units}</td>
                        <td style={tdStyle}>{r.normal_range || '-'}</td>
                        <td style={tdStyle}>{flagBadge(r.flag)}</td>
                        <td style={tdStyle}>{r.technician || '-'}</td>
                        <td style={tdStyle}>{r.result_date}</td>
                        <td style={tdStyle}>
                          <button onClick={() => removeResult(r.id)} style={{ background: 'rgba(211,47,47,0.18)', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </div>
        </div>
      )}
    </div>
  );
}
