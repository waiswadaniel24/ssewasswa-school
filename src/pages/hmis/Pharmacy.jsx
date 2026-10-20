// FileName: src/pages/hmis/Pharmacy.jsx
// Pharmacy (EMHSLU) — stock overview, inventory, dispense, dispensing history
// localStorage persistence under 'hmis_pharmacy_stock' + 'hmis_pharmacy_dispensing'

import React, { useState, useEffect, useMemo } from 'react';

const C = {
  bg: '#071b2f', card: '#0d2640', cardAlt: '#0a2238', input: '#0a1f36',
  border: '#1a3a5c', green: '#0b8043', greenLight: '#0ca252',
  text: '#e6f0fa', muted: '#8da7c1', red: '#d32f2f', orange: '#e8710a',
  blue: '#1a73e8',
};

const UNITS = ['Tablet', 'Capsule', 'Bottle', 'Vial', 'Ampoule', 'Sachet', 'Tube', 'Pack'];

// 20-drug quick-pick list — Uganda EMHSLU essential medicines
const DRUG_QUICKPICK = [
  'Artemether+Lumefantrine 80/480', 'Amoxicillin 250mg', 'Co-trimoxazole 480mg', 'Metformin 500mg',
  'Omeprazole 20mg', 'Paracetamol 500mg', 'ORS Sachets', 'Ceftriaxone 1g Vial',
  'Azithromycin 500mg', 'Doxycycline 100mg', 'Furosemide 40mg', 'Atenolol 50mg',
  'Nifedipine 20mg SR', 'Insulin Regular 100IU', 'Diazepam 5mg', 'Phenytoin 100mg',
  'Quinine 300mg', 'Folic Acid 5mg', 'Ferrous Sulphate 200mg', 'Zinc Sulphate 20mg',
];

const EMPTY_DRUG = {
  drug_name: '', generic_name: '', batch_number: '', expiry_date: '',
  quantity: '', unit: UNITS[0], reorder_level: '', unit_price: '',
};

const EMPTY_DISPENSE = {
  drug_id: '', patient_name: '', quantity: '', clinician: '',
  dispense_date: new Date().toISOString().slice(0, 10),
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

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr); const now = new Date();
  return Math.floor((d - now) / (1000 * 60 * 60 * 24));
}

function ugx(n) {
  if (n === '' || n == null || isNaN(Number(n))) return '-';
  return 'UGX ' + Number(n).toLocaleString();
}

export default function Pharmacy() {
  const [tab, setTab] = useState('overview');
  const [stock, setStock] = useLocalState('hmis_pharmacy_stock', []);
  const [dispensing, setDispensing] = useLocalState('hmis_pharmacy_dispensing', []);
  const [drugForm, setDrugForm] = useState(EMPTY_DRUG);
  const [dispenseForm, setDispenseForm] = useState(EMPTY_DISPENSE);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const today = todayStr();
    const outOfStock = stock.filter(s => Number(s.quantity) <= 0).length;
    const belowReorder = stock.filter(s => {
      const q = Number(s.quantity); const r = Number(s.reorder_level);
      return r > 0 && q > 0 && q <= r;
    }).length;
    const expiringSoon = stock.filter(s => {
      const days = daysUntil(s.expiry_date);
      return days != null && days >= 0 && days <= 90;
    }).length;
    const expired = stock.filter(s => {
      const days = daysUntil(s.expiry_date);
      return days != null && days < 0;
    }).length;
    const dispensedToday = dispensing.filter(d => d.dispense_date === today).length;
    return { total: stock.length, outOfStock, belowReorder, expiringSoon, expired, dispensedToday };
  }, [stock, dispensing]);

  const filteredStock = useMemo(() => {
    if (!search.trim()) return stock;
    const q = search.toLowerCase();
    return stock.filter(s =>
      (s.drug_name || '').toLowerCase().includes(q) ||
      (s.generic_name || '').toLowerCase().includes(q) ||
      (s.batch_number || '').toLowerCase().includes(q)
    );
  }, [stock, search]);

  const saveDrug = (e) => {
    e.preventDefault();
    if (!drugForm.drug_name) { setMsg('❌ Drug name is required'); return; }
    if (drugForm.quantity === '' || isNaN(Number(drugForm.quantity))) { setMsg('❌ Valid quantity is required'); return; }
    if (!drugForm.expiry_date) { setMsg('❌ Expiry date is required'); return; }
    if (editingId) {
      setStock(stock.map(s => s.id === editingId ? { ...drugForm, id: editingId } : s));
      setMsg('✅ Drug updated');
      setEditingId(null);
    } else {
      const id = 'DRG-' + Date.now().toString().slice(-8);
      setStock([{ ...drugForm, id }, ...stock]);
      setMsg('✅ Drug added. ID: ' + id);
    }
    setDrugForm({ ...EMPTY_DRUG });
  };

  const editDrug = (id) => {
    const d = stock.find(s => s.id === id);
    if (!d) return;
    setDrugForm({ ...d });
    setEditingId(id);
    setTab('inventory');
    setMsg('✏️ Editing ' + d.drug_name);
  };

  const removeDrug = (id) => {
    if (!window.confirm('Delete this drug from inventory? This cannot be undone.')) return;
    setStock(stock.filter(s => s.id !== id));
    if (editingId === id) { setEditingId(null); setDrugForm({ ...EMPTY_DRUG }); }
    setMsg('🗑️ Drug removed from inventory');
  };

  const dispense = (e) => {
    e.preventDefault();
    if (!dispenseForm.drug_id) { setMsg('❌ Select a drug to dispense'); return; }
    if (!dispenseForm.patient_name) { setMsg('❌ Patient name is required'); return; }
    if (dispenseForm.quantity === '' || isNaN(Number(dispenseForm.quantity)) || Number(dispenseForm.quantity) <= 0) {
      setMsg('❌ Valid dispense quantity is required'); return;
    }
    const drug = stock.find(s => s.id === dispenseForm.drug_id);
    if (!drug) { setMsg('❌ Drug not found'); return; }
    if (Number(dispenseForm.quantity) > Number(drug.quantity)) {
      setMsg('❌ Insufficient stock. Available: ' + drug.quantity);
      return;
    }
    const id = 'DSP-' + Date.now().toString().slice(-8);
    const record = {
      ...dispenseForm, id, drug_name: drug.drug_name, batch: drug.batch_number,
      unit_price: drug.unit_price,
      total_cost: (Number(drug.unit_price || 0) * Number(dispenseForm.quantity)).toString(),
      created_at: todayStr(),
    };
    setDispensing([record, ...dispensing]);
    // decrement stock
    setStock(stock.map(s => s.id === drug.id ? { ...s, quantity: (Number(s.quantity) - Number(dispenseForm.quantity)).toString() } : s));
    setDispenseForm({ ...EMPTY_DISPENSE, dispense_date: todayStr() });
    setMsg('✅ Dispensed ' + record.quantity + ' ' + drug.unit + ' of ' + drug.drug_name + '. ID: ' + id);
  };

  const removeDispense = (id) => {
    if (!window.confirm('Delete this dispensing record? Stock will NOT be restored.')) return;
    setDispensing(dispensing.filter(d => d.id !== id));
    setMsg('🗑️ Dispensing record ' + id + ' deleted');
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

  const qtyBadge = (q, reorder) => {
    const num = Number(q); const r = Number(reorder);
    let c;
    if (num <= 0) c = C.red;
    else if (r > 0 && num <= r) c = C.orange;
    else c = C.green;
    return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}` }}>{q}</span>;
  };

  const expiryBadge = (dateStr) => {
    const days = daysUntil(dateStr);
    if (days == null) return <span style={{ color: C.muted, fontSize: '11px' }}>-</span>;
    let c, label;
    if (days < 0) { c = C.red; label = 'EXPIRED'; }
    else if (days <= 30) { c = C.red; label = `${days}d left`; }
    else if (days <= 90) { c = C.orange; label = `${days}d left`; }
    else { c = C.green; label = new Date(dateStr).toISOString().slice(0, 10); }
    return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${c}22`, color: c, border: `1px solid ${c}` }}>{label}</span>;
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>💊 Pharmacy (EMHSLU)</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Stock Overview · Inventory · Dispense · History</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') || msg.includes('🗑️') || msg.includes('✏️') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') || msg.includes('🗑️') || msg.includes('✏️') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('overview', '📊 Stock Overview', tab === 'overview')}
        {tabBtn('inventory', '📦 Inventory', tab === 'inventory')}
        {tabBtn('dispense', '📤 Dispense', tab === 'dispense')}
        {tabBtn('history', '📜 Dispensing History', tab === 'history')}
      </div>

      {tab === 'overview' && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            {statBox('Total Items', stats.total, C.blue)}
            {statBox('Out of Stock', stats.outOfStock, C.red)}
            {statBox('Below Reorder', stats.belowReorder, C.orange)}
            {statBox('Expiring ≤90d', stats.expiringSoon, C.orange)}
            {statBox('Expired', stats.expired, C.red)}
            {statBox('Dispensed Today', stats.dispensedToday, C.green)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={cardStyle}>
              <div style={headerStyle}>⚠️ Alerts</div>
              <div style={bodyStyle}>
                {stats.outOfStock === 0 && stats.belowReorder === 0 && stats.expiringSoon === 0 && stats.expired === 0
                  ? <p style={{ textAlign: 'center', color: C.green, padding: '20px 10px' }}>✅ All stock healthy. No alerts.</p>
                  : <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {stats.outOfStock > 0 && <li style={{ padding: '8px 0', color: C.red, fontSize: '13px' }}>🔴 {stats.outOfStock} drug(s) out of stock</li>}
                      {stats.belowReorder > 0 && <li style={{ padding: '8px 0', color: C.orange, fontSize: '13px' }}>🟠 {stats.belowReorder} drug(s) below reorder level</li>}
                      {stats.expiringSoon > 0 && <li style={{ padding: '8px 0', color: C.orange, fontSize: '13px' }}>🟠 {stats.expiringSoon} drug(s) expiring within 90 days</li>}
                      {stats.expired > 0 && <li style={{ padding: '8px 0', color: C.red, fontSize: '13px' }}>🔴 {stats.expired} drug(s) have expired — quarantine immediately</li>}
                    </ul>}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={headerStyle}>🚀 Quick-Pick (20 EMHSLU Drugs)</div>
              <div style={{ ...bodyStyle, maxHeight: '320px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DRUG_QUICKPICK.map(d => (
                    <button key={d} onClick={() => {
                      setDrugForm({ ...EMPTY_DRUG, drug_name: d });
                      setEditingId(null);
                      setTab('inventory');
                      setMsg('✅ ' + d + ' loaded — fill batch/expiry and save');
                    }} style={{ padding: '6px 12px', background: C.cardAlt, color: C.text, border: `1px solid ${C.border}`, borderRadius: '16px', fontSize: '12px', cursor: 'pointer' }}>{d}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>{editingId ? '✏️ Edit Drug' : '➕ Add New Drug'}</div>
            <div style={bodyStyle}>
              <form onSubmit={saveDrug}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Drug (Brand) Name *</label><input style={inputStyle} value={drugForm.drug_name} onChange={(e) => setDrugForm({ ...drugForm, drug_name: e.target.value })} placeholder="Paracetamol 500mg" required /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Generic Name</label><input style={inputStyle} value={drugForm.generic_name} onChange={(e) => setDrugForm({ ...drugForm, generic_name: e.target.value })} placeholder="Acetaminophen" /></div>
                  <div><label style={labelStyle}>Batch No *</label><input style={inputStyle} value={drugForm.batch_number} onChange={(e) => setDrugForm({ ...drugForm, batch_number: e.target.value })} placeholder="BN-2024-015" /></div>
                  <div><label style={labelStyle}>Expiry Date *</label><input style={inputStyle} type="date" value={drugForm.expiry_date} onChange={(e) => setDrugForm({ ...drugForm, expiry_date: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Quantity *</label><input style={inputStyle} type="number" min="0" value={drugForm.quantity} onChange={(e) => setDrugForm({ ...drugForm, quantity: e.target.value })} placeholder="500" required /></div>
                  <div><label style={labelStyle}>Unit</label>
                    <select style={inputStyle} value={drugForm.unit} onChange={(e) => setDrugForm({ ...drugForm, unit: e.target.value })}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Reorder Level</label><input style={inputStyle} type="number" min="0" value={drugForm.reorder_level} onChange={(e) => setDrugForm({ ...drugForm, reorder_level: e.target.value })} placeholder="50" /></div>
                  <div><label style={labelStyle}>Unit Price (UGX)</label><input style={inputStyle} type="number" min="0" value={drugForm.unit_price} onChange={(e) => setDrugForm({ ...drugForm, unit_price: e.target.value })} placeholder="500" /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                  <button type="submit" style={btnStyle}>{editingId ? '💾 Update Drug' : '➕ Add Drug'}</button>
                  {editingId && <button type="button" onClick={() => { setEditingId(null); setDrugForm({ ...EMPTY_DRUG }); setMsg(''); }} style={{ ...btnStyle, background: 'rgba(141,167,193,0.18)', boxShadow: 'none', border: `1px solid ${C.border}`, color: C.muted }}>Cancel</button>}
                </div>
              </form>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Inventory ({filteredStock.length} of {stock.length})</div>
            <div style={bodyStyle}>
              <input style={{ ...inputStyle, marginBottom: '14px' }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search by drug, generic, or batch..." />
              <div style={{ overflowX: 'auto' }}>
                {filteredStock.length === 0
                  ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No drugs in inventory yet. Add your first drug above.</p>
                  : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                      <thead><tr>
                        {['Drug', 'Batch', 'Qty', 'Unit', 'Expiry', 'Price', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {filteredStock.map(s => (
                          <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                            <td style={tdStyle}>{s.drug_name}<div style={{ fontSize: '11px', color: C.muted }}>{s.generic_name || '-'}</div></td>
                            <td style={tdStyle}>{s.batch_number || '-'}</td>
                            <td style={tdStyle}>{qtyBadge(s.quantity, s.reorder_level)}</td>
                            <td style={tdStyle}>{s.unit}</td>
                            <td style={tdStyle}>{expiryBadge(s.expiry_date)}</td>
                            <td style={tdStyle}>{ugx(s.unit_price)}</td>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button onClick={() => editDrug(s.id)} style={{ background: 'rgba(26,115,232,0.18)', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                                <button onClick={() => removeDrug(s.id)} style={{ background: 'rgba(211,47,47,0.18)', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                              </div>
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

      {tab === 'dispense' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={headerStyle}>📤 Dispense Drug</div>
            <div style={bodyStyle}>
              {stock.length === 0
                ? <p style={{ textAlign: 'center', color: C.muted, padding: '20px 10px' }}>No drugs in inventory. Add drugs on the Inventory tab first.</p>
                : <form onSubmit={dispense}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                      <div><label style={labelStyle}>Select Drug (only in-stock shown) *</label>
                        <select style={inputStyle} value={dispenseForm.drug_id} onChange={(e) => setDispenseForm({ ...dispenseForm, drug_id: e.target.value })} required>
                          <option value="">— select drug —</option>
                          {stock.filter(s => Number(s.quantity) > 0).map(s => <option key={s.id} value={s.id}>{s.drug_name} · Batch {s.batch_number} · {s.quantity} {s.unit}</option>)}
                        </select>
                      </div>
                      <div><label style={labelStyle}>Patient Name *</label><input style={inputStyle} value={dispenseForm.patient_name} onChange={(e) => setDispenseForm({ ...dispenseForm, patient_name: e.target.value })} placeholder="John Doe / OPD-12345678" required /></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div><label style={labelStyle}>Quantity *</label><input style={inputStyle} type="number" min="1" value={dispenseForm.quantity} onChange={(e) => setDispenseForm({ ...dispenseForm, quantity: e.target.value })} placeholder="10" required /></div>
                        <div><label style={labelStyle}>Dispense Date</label><input style={inputStyle} type="date" value={dispenseForm.dispense_date} onChange={(e) => setDispenseForm({ ...dispenseForm, dispense_date: e.target.value })} /></div>
                      </div>
                      <div><label style={labelStyle}>Prescribing Clinician</label><input style={inputStyle} value={dispenseForm.clinician} onChange={(e) => setDispenseForm({ ...dispenseForm, clinician: e.target.value })} placeholder="Dr. Ssewanyana" /></div>
                      <div><label style={labelStyle}>Dosage Notes</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={dispenseForm.notes} onChange={(e) => setDispenseForm({ ...dispenseForm, notes: e.target.value })} placeholder="1 tab BD x 5 days" /></div>
                    </div>
                    <button type="submit" style={{ ...btnStyle, marginTop: '16px' }}>📤 Dispense & Decrement Stock</button>
                  </form>}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={headerStyle}>Low-Stock Watchlist</div>
            <div style={{ ...bodyStyle, maxHeight: '480px', overflowY: 'auto' }}>
              {stock.filter(s => Number(s.quantity) <= (Number(s.reorder_level) || 10)).length === 0
                ? <p style={{ textAlign: 'center', color: C.green, padding: '20px 10px' }}>✅ No drugs at or below reorder level.</p>
                : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Drug', 'Qty', 'Reorder', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                    <tbody>
                      {stock.filter(s => Number(s.quantity) <= (Number(s.reorder_level) || 10)).map(s => (
                        <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={tdStyle}>{s.drug_name}</td>
                          <td style={tdStyle}>{qtyBadge(s.quantity, s.reorder_level)}</td>
                          <td style={tdStyle}>{s.reorder_level || '10'}</td>
                          <td style={tdStyle}>{Number(s.quantity) <= 0 ? 'OUT OF STOCK' : 'REORDER NOW'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div style={cardStyle}>
          <div style={headerStyle}>Dispensing History ({dispensing.length})</div>
          <div style={{ ...bodyStyle, overflowX: 'auto' }}>
            {dispensing.length === 0
              ? <p style={{ textAlign: 'center', color: C.muted, padding: '30px 10px' }}>No dispensing records yet. Dispense your first drug on the Dispense tab.</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
                  <thead><tr>
                    {['ID', 'Patient', 'Drug', 'Batch', 'Qty', 'Cost', 'Clinician', 'Date', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {dispensing.map(d => (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={tdStyle}>{d.id}</td>
                        <td style={tdStyle}>{d.patient_name}</td>
                        <td style={tdStyle}>{d.drug_name || '-'}</td>
                        <td style={tdStyle}>{d.batch || '-'}</td>
                        <td style={tdStyle}>{d.quantity}</td>
                        <td style={tdStyle}>{ugx(d.total_cost)}</td>
                        <td style={tdStyle}>{d.clinician || '-'}</td>
                        <td style={tdStyle}>{d.dispense_date}</td>
                        <td style={tdStyle}>
                          <button onClick={() => removeDispense(d.id)} style={{ background: 'rgba(211,47,47,0.18)', color: C.red, border: `1px solid ${C.red}`, borderRadius: '6px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
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
