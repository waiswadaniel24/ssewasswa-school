// FileName: src/pages/hmis/Billing.jsx
// Billing + Insurance — today's revenue, invoices, outstanding balances
// localStorage persistence under 'hmis_billing_invoices'

import React, { useState, useEffect, useMemo } from 'react';

const C = {
  bg: '#071b2f', card: '#0d2640', cardAlt: '#0a2238', input: '#0a1f36',
  border: '#1a3a5c', green: '#0b8043', greenLight: '#0ca252',
  text: '#e6f0fa', muted: '#8da7c1', red: '#d32f2f', orange: '#e8710a',
  blue: '#1a73e8', purple: '#7b1fa2',
};

const PAYMENT_METHODS = ['Cash', 'NHIS', 'Private Insurance', 'Self-pay'];
const INSURANCE_PROVIDERS = ['— (self-pay) —', 'Jubilee Health', 'UAP Old Mutual', 'ICEA Lion', 'Prudential', 'AAR Healthcare', 'Sanlam', 'Liberty'];
const STATUSES = ['Paid', 'Pending', 'Waived'];

const SERVICE_PRESETS = [
  { name: 'Consultation', price: '15000' },
  { name: 'OPD Registration', price: '5000' },
  { name: 'Bed Charge (per day)', price: '30000' },
  { name: 'Lab Tests (avg)', price: '25000' },
  { name: 'X-Ray', price: '40000' },
  { name: 'Ultrasound', price: '50000' },
  { name: 'ECG', price: '35000' },
  { name: 'Minor Procedure', price: '60000' },
  { name: 'Major Procedure', price: '250000' },
  { name: 'IV Cannulation', price: '8000' },
  { name: 'Wound Dressing', price: '10000' },
  { name: 'Suture Removal', price: '5000' },
];

const EMPTY_INVOICE = {
  patient_name: '', patient_id: '',
  invoice_date: new Date().toISOString().slice(0, 10),
  payment_method: PAYMENT_METHODS[0],
  insurance_provider: INSURANCE_PROVIDERS[0],
  insurance_member_no: '',
  status: STATUSES[1],
  services: [{ name: '', price: '' }],
  drugs: [{ name: '', price: '' }],
  notes: '',
};

function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function ugx(n) {
  if (n == null || isNaN(Number(n))) return 'UGX 0';
  return 'UGX ' + Number(n).toLocaleString();
}

export default function Billing() {
  const [tab, setTab] = useState('today');
  const [invoices, setInvoices] = useLocalState('hmis_billing_invoices', []);
  const [form, setForm] = useState(EMPTY_INVOICE);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const computeTotal = (inv) => {
    const svc = (inv.services || []).reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const drg = (inv.drugs || []).reduce((sum, d) => sum + (Number(d.price) || 0), 0);
    return svc + drg;
  };

  const todaysInvoices = useMemo(
    () => invoices.filter(i => i.invoice_date === todayStr()),
    [invoices]
  );

  const revenue = useMemo(() => {
    const total = todaysInvoices.reduce((sum, i) => sum + computeTotal(i), 0);
    const paid = todaysInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + computeTotal(i), 0);
    const pending = todaysInvoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + computeTotal(i), 0);
    const waived = todaysInvoices.filter(i => i.status === 'Waived').reduce((sum, i) => sum + computeTotal(i), 0);
    return { total, paid, pending, waived, count: todaysInvoices.length };
  }, [todaysInvoices]);

  const outstanding = useMemo(
    () => invoices.filter(i => i.status === 'Pending'),
    [invoices]
  );

  const outstandingTotal = useMemo(
    () => outstanding.reduce((sum, i) => sum + computeTotal(i), 0),
    [outstanding]
  );

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (filterStatus !== 'All') list = list.filter(i => i.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        (i.patient_name || '').toLowerCase().includes(q) ||
        (i.id || '').toLowerCase().includes(q) ||
        (i.insurance_provider || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, filterStatus, search]);

  const updateLineItem = (field, idx, value, which) => {
    const list = [...form[which]];
    list[idx] = { ...list[idx], [field]: value };
    setForm({ ...form, [which]: list });
  };

  const addLine = (which) => setForm({ ...form, [which]: [...form[which], { name: '', price: '' }] });
  const removeLine = (idx, which) => setForm({ ...form, [which]: form[which].filter((_, i) => i !== idx) });

  const addServicePreset = (idx, name, price) => {
    const list = [...form.services];
    list[idx] = { name, price };
    setForm({ ...form, services: list });
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.patient_name) { setMsg('❌ Patient name is required'); return; }
    const hasItems = [...form.services, ...form.drugs].some(x => x.name && Number(x.price) > 0);
    if (!hasItems) { setMsg('❌ Add at least one service or drug line with price'); return; }
    if (form.payment_method === 'Private Insurance' && (!form.insurance_provider || form.insurance_provider === INSURANCE_PROVIDERS[0])) {
      setMsg('❌ Insurance provider is required for Private Insurance payment'); return;
    }
    const id = 'INV-' + Date.now().toString().slice(-8);
    const total = computeTotal(form);
    const record = { ...form, id, total, created_at: todayStr() };
    setInvoices([record, ...invoices]);
    setForm({ ...EMPTY_INVOICE, invoice_date: todayStr() });
    setMsg('✅ Invoice created. ID: ' + id + ' · Total: ' + ugx(total));
  };

  const removeInvoice = (id) => {
    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
    setInvoices(invoices.filter(i => i.id !== id));
    setMsg('🗑️ Invoice ' + id + ' deleted');
  };

  const markInvoiceStatus = (id, status) => {
    setInvoices(invoices.map(i => i.id === id ? { ...i, status } : i));
    setMsg('✅ Invoice ' + id + ' marked as ' + status);
  };

  const formTotal = computeTotal(form);

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
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px 20px', flex: '1 1 180px', minWidth: '180px' }}>
      <div style={{ color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>{label}</div>
      <div style={{ color, fontSize: '22px', fontWeight: 700 }}>{value}</div>
    </div>
  );
  const thStyle = { textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` };
  const tdStyle = { padding: '11px 12px', fontSize: '13px' };
  const statusBadge = (s) => {
    const c = s === 'Paid' ? C.green : s === 'Pending' ? C.orange : C.muted;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}` }}>{s}</span>;
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>💰 Billing + Insurance</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Today's Revenue · New Invoice · Invoices · Outstanding</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') || msg.includes('🗑️') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') || msg.includes('🗑️') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('today', '📊 Today\'s Revenue', tab === 'today')}
        {tabBtn('new', '➕ New Invoice', tab === 'new')}
        {tabBtn('invoices', '📋 Invoices', tab === 'invoices')}
        {tabBtn('outstanding', '⚠️ Outstanding', tab === 'outstanding')}
      </div>

      {tab === 'today' && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            {statBox('Invoices Today', revenue.count, C.blue)}
            {statBox('Total Billed', ugx(revenue.total), C.green)}
            {statBox('Paid', ugx(revenue.paid), C.green)}
            {statBox('Pending', ugx(revenue.pending), C.orange)}
            {statBox('Waived', ugx(revenue.waived), C.muted)}
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Today's Invoices ({todaysInvoices.length}) — {todayStr()}</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {todaysInvoices.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No invoices created today yet. Create your first invoice above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
                    <thead><tr>
                      {['Invoice', 'Patient', 'Method', 'Total', 'Status', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {todaysInvoices.map(i => (
                        <tr key={i.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={tdStyle}>{i.id}</td>
                          <td style={tdStyle}>{i.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{i.insurance_provider && i.insurance_provider !== '— (self-pay) —' ? i.insurance_provider : i.payment_method}</div></td>
                          <td style={tdStyle}>{i.payment_method}</td>
                          <td style={tdStyle}>{ugx(i.total)}</td>
                          <td style={tdStyle}>{statusBadge(i.status)}</td>
                          <td style={tdStyle}>
                            {i.status === 'Pending' && <button onClick={() => markInvoiceStatus(i.id, 'Paid')} style={{ background: 'rgba(11,128,67,0.18)', color: C.green, border: `1px solid ${C.green}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, marginRight: '6px' }}>Mark Paid</button>}
                            <button onClick={() => removeInvoice(i.id)} style={{ background: 'rgba(211,47,47,0.18)', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'new' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>New Invoice</div>
            <div style={bodyStyle}>
              <form onSubmit={submit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Patient Name *</label><input style={inputStyle} value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} placeholder="Jane Nakato" required /></div>
                  <div><label style={labelStyle}>Patient ID</label><input style={inputStyle} value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} placeholder="OPD-12345678" /></div>
                  <div><label style={labelStyle}>Invoice Date</label><input style={inputStyle} type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} /></div>
                  <div><label style={labelStyle}>Payment Method *</label>
                    <select style={inputStyle} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value, insurance_provider: e.target.value === 'Private Insurance' ? INSURANCE_PROVIDERS[1] : INSURANCE_PROVIDERS[0] })}>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Status</label>
                    <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {form.payment_method === 'Private Insurance' && (
                    <>
                      <div><label style={labelStyle}>Insurance Provider *</label>
                        <select style={inputStyle} value={form.insurance_provider} onChange={(e) => setForm({ ...form, insurance_provider: e.target.value })}>
                          {INSURANCE_PROVIDERS.slice(1).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div><label style={labelStyle}>Member / Policy No</label><input style={inputStyle} value={form.insurance_member_no} onChange={(e) => setForm({ ...form, insurance_member_no: e.target.value })} placeholder="JHL-2024-001234" /></div>
                    </>
                  )}
                  {form.payment_method === 'NHIS' && (
                    <div><label style={labelStyle}>NHIS Member No</label><input style={inputStyle} value={form.insurance_member_no} onChange={(e) => setForm({ ...form, insurance_member_no: e.target.value })} placeholder="NHIS-UG-0012345" /></div>
                  )}
                </div>

                <div style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Services / Procedures</label>
                    <button type="button" onClick={() => addLine('services')} style={{ padding: '5px 10px', background: 'rgba(11,128,67,0.18)', color: C.green, border: `1px solid ${C.green}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>+ Add Service</button>
                  </div>
                  {form.services.map((s, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '8px', marginBottom: '8px' }}>
                      <input style={inputStyle} value={s.name} onChange={(e) => updateLineItem('name', idx, e.target.value, 'services')} placeholder="Service name" list="svc-list" />
                      <input style={inputStyle} type="number" value={s.price} onChange={(e) => updateLineItem('price', idx, e.target.value, 'services')} placeholder="UGX" />
                      <button type="button" onClick={() => removeLine(idx, 'services')} style={{ background: 'rgba(211,47,47,0.18)', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', padding: '0 10px' }}>×</button>
                    </div>
                  ))}
                  <datalist id="svc-list">
                    {SERVICE_PRESETS.map(p => <option key={p.name} value={p.name}>{ugx(p.price)}</option>)}
                  </datalist>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Drugs / Consumables</label>
                    <button type="button" onClick={() => addLine('drugs')} style={{ padding: '5px 10px', background: 'rgba(11,128,67,0.18)', color: C.green, border: `1px solid ${C.green}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>+ Add Drug</button>
                  </div>
                  {form.drugs.map((d, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '8px', marginBottom: '8px' }}>
                      <input style={inputStyle} value={d.name} onChange={(e) => updateLineItem('name', idx, e.target.value, 'drugs')} placeholder="Drug / consumable name" />
                      <input style={inputStyle} type="number" value={d.price} onChange={(e) => updateLineItem('price', idx, e.target.value, 'drugs')} placeholder="UGX" />
                      <button type="button" onClick={() => removeLine(idx, 'drugs')} style={{ background: 'rgba(211,47,47,0.18)', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', padding: '0 10px' }}>×</button>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '16px' }}><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '50px', resize: 'vertical' }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional invoice notes..." /></div>

                <div style={{ marginTop: '16px', padding: '14px', background: C.cardAlt, border: `1px solid ${C.green}`, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: C.muted, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Invoice Total</span>
                  <span style={{ color: C.green, fontSize: '22px', fontWeight: 700 }}>{ugx(formTotal)}</span>
                </div>

                <button type="submit" style={{ ...btnStyle, marginTop: '16px', width: '100%' }}>💾 Create Invoice</button>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Service Presets</div>
            <div style={{ ...bodyStyle, maxHeight: '520px', overflowY: 'auto' }}>
              <p style={{ color: C.muted, fontSize: '12px', marginBottom: '12px' }}>Click a preset to fill into the first empty service line. Prices in UGX.</p>
              {SERVICE_PRESETS.map(p => (
                <div key={p.name} style={{ padding: '10px 12px', marginBottom: '6px', background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: C.text, fontSize: '13px', fontWeight: 600 }}>{p.name}</div>
                    <div style={{ color: C.green, fontSize: '12px' }}>{ugx(p.price)}</div>
                  </div>
                  <button onClick={() => {
                    const emptyIdx = form.services.findIndex(s => !s.name);
                    if (emptyIdx >= 0) addServicePreset(emptyIdx, p.name, p.price);
                    else {
                      const newServices = [...form.services, { name: p.name, price: p.price }];
                      setForm({ ...form, services: newServices });
                    }
                    setMsg('✅ ' + p.name + ' added to services');
                  }} style={{ padding: '5px 10px', background: 'rgba(11,128,67,0.18)', color: C.green, border: `1px solid ${C.green}`, borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div style={cardStyle}>
          <div style={headerStyle}>All Invoices ({filteredInvoices.length} of {invoices.length})</div>
          <div style={bodyStyle}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <input style={{ ...inputStyle, flex: '1 1 240px', minWidth: '200px' }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search by patient, invoice ID, or provider..." />
              <select style={{ ...inputStyle, flex: '0 0 160px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="All">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {filteredInvoices.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No invoices yet. Create your first invoice above.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '880px' }}>
                    <thead><tr>
                      {['Invoice', 'Patient', 'Date', 'Method', 'Provider', 'Total', 'Status', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filteredInvoices.map(i => (
                        <tr key={i.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={tdStyle}>{i.id}</td>
                          <td style={tdStyle}>{i.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{i.patient_id || '-'}</div></td>
                          <td style={tdStyle}>{i.invoice_date}</td>
                          <td style={tdStyle}>{i.payment_method}</td>
                          <td style={tdStyle}>{(i.insurance_provider && i.insurance_provider !== '— (self-pay) —') ? i.insurance_provider : '-'}{i.insurance_member_no && <div style={{ fontSize: '11px', color: C.muted }}>{i.insurance_member_no}</div>}</td>
                          <td style={tdStyle}>{ugx(i.total)}</td>
                          <td style={tdStyle}>{statusBadge(i.status)}</td>
                          <td style={tdStyle}>
                            {i.status === 'Pending' && <button onClick={() => markInvoiceStatus(i.id, 'Paid')} style={{ background: 'rgba(11,128,67,0.18)', color: C.green, border: `1px solid ${C.green}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, marginRight: '6px' }}>Mark Paid</button>}
                            <button onClick={() => removeInvoice(i.id)} style={{ background: 'rgba(211,47,47,0.18)', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'outstanding' && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            {statBox('Outstanding Invoices', outstanding.length, C.orange)}
            {statBox('Total Outstanding', ugx(outstandingTotal), C.red)}
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Outstanding Balances ({outstanding.length})</div>
            <div style={{ ...bodyStyle, overflowX: 'auto' }}>
              {outstanding.length === 0
                ? <p style={{ textAlign: 'center', color: C.green, padding: '30px 10px' }}>✅ No outstanding balances. All invoices are paid or waived.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
                    <thead><tr>
                      {['Invoice', 'Patient', 'Date', 'Method', 'Provider', 'Balance', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {outstanding.map(i => (
                        <tr key={i.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={tdStyle}>{i.id}</td>
                          <td style={tdStyle}>{i.patient_name}<div style={{ fontSize: '11px', color: C.muted }}>{i.patient_id || '-'}</div></td>
                          <td style={tdStyle}>{i.invoice_date}</td>
                          <td style={tdStyle}>{i.payment_method}</td>
                          <td style={tdStyle}>{(i.insurance_provider && i.insurance_provider !== '— (self-pay) —') ? i.insurance_provider : '-'}</td>
                          <td style={{ ...tdStyle, color: C.red, fontWeight: 700 }}>{ugx(i.total)}</td>
                          <td style={tdStyle}>
                            <button onClick={() => markInvoiceStatus(i.id, 'Paid')} style={{ background: 'rgba(11,128,67,0.18)', color: C.green, border: `1px solid ${C.green}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, marginRight: '6px' }}>Mark Paid</button>
                            <button onClick={() => markInvoiceStatus(i.id, 'Waived')} style={{ background: 'rgba(141,167,193,0.18)', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600, marginRight: '6px' }}>Waive</button>
                            <button onClick={() => removeInvoice(i.id)} style={{ background: 'rgba(211,47,47,0.18)', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr>
                      <td colSpan={5} style={{ ...tdStyle, textAlign: 'right', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '12px' }}>Total Outstanding →</td>
                      <td style={{ ...tdStyle, color: C.red, fontWeight: 700, fontSize: '15px' }}>{ugx(outstandingTotal)}</td>
                      <td></td>
                    </tr></tfoot>
                  </table>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
