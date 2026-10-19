// Ssewasswa Comforts — Recurring Donations
import React, { useState, useEffect } from 'react';

export default function RecurringDonations() {
  const [donations, setDonations] = useState([]);
  const [donor, setDonor] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erp_recurring_donations') || '[]');
      setDonations(stored);
    } catch {}
  }, []);

  const save = (updated) => { setDonations(updated); localStorage.setItem('erp_recurring_donations', JSON.stringify(updated)); };

  const add = () => {
    if (!donor.trim() || !amount) return;
    const d = { id: Date.now(), donor: donor.trim(), amount: Number(amount), frequency, status: 'active', created_at: new Date().toISOString() };
    save([d, ...donations]);
    setDonor(''); setAmount(''); setFrequency('monthly');
  };

  const toggleStatus = (id) => save(donations.map(d => d.id === id ? { ...d, status: d.status === 'active' ? 'paused' : 'active' } : d));
  const cancel = (id) => save(donations.map(d => d.id === id ? { ...d, status: 'cancelled' } : d));

  return (
    <div className="page-container">
      <h1 className="page-title">🔁 Recurring Donations</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Subscription-style donations with pause/resume/cancel.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Donor name" value={donor} onChange={e => setDonor(e.target.value)} style={{ flex: 1, minWidth: 200, padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <input type="number" placeholder="Amount UGX" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: 150, padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <select value={frequency} onChange={e => setFrequency(e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc' }}>
          <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option>
        </select>
        <button onClick={add} style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
      </div>
      {donations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔁</div><p>No recurring donations yet.</p>
        </div>
      ) : donations.map(d => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, borderRadius: 8, background: 'white', border: `1px solid ${d.status === 'active' ? '#0b8043' : d.status === 'paused' ? '#f9ab00' : '#d32f2f'}` }}>
          <div style={{ fontSize: 28 }}>💸</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{d.donor}</div>
            <div style={{ fontSize: 12, color: '#666' }}>UGX {d.amount.toLocaleString()} / {d.frequency} • Started {new Date(d.created_at).toLocaleDateString()}</div>
          </div>
          <span style={{ background: d.status === 'active' ? '#0b8043' : d.status === 'paused' ? '#f9ab00' : '#d32f2f', color: 'white', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase' }}>{d.status}</span>
          {d.status !== 'cancelled' && <button onClick={() => toggleStatus(d.id)} style={{ padding: '6px 12px', background: '#fff', color: '#1a73e8', border: '1px solid #1a73e8', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>{d.status === 'active' ? 'Pause' : 'Resume'}</button>}
          {d.status !== 'cancelled' && <button onClick={() => cancel(d.id)} style={{ padding: '6px 12px', background: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>Cancel</button>}
        </div>
      ))}
    </div>
  );
}