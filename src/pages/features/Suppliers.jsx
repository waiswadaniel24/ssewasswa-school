// Ssewasswa Comforts — Suppliers Directory
import React, { useState, useEffect } from 'react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Books');
  const [terms, setTerms] = useState('Net 30');

  useEffect(() => {
    try { setSuppliers(JSON.parse(localStorage.getItem('erp_suppliers') || '[]')); } catch {}
  }, []);

  const save = (updated) => { setSuppliers(updated); localStorage.setItem('erp_suppliers', JSON.stringify(updated)); };
  const add = () => {
    if (!name.trim()) return;
    save([{ id: Date.now(), name: name.trim(), contact: contact.trim(), phone: phone.trim(), category, terms, created_at: new Date().toISOString() }, ...suppliers]);
    setName(''); setContact(''); setPhone(''); setCategory('Books'); setTerms('Net 30');
  };
  const remove = (id) => save(suppliers.filter(s => s.id !== id));

  return (
    <div className="page-container">
      <h1 className="page-title">🚚 Suppliers Directory</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Vendor database with contact + payment terms.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 16 }}>
        <input type="text" placeholder="Supplier name" value={name} onChange={e => setName(e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <input type="text" placeholder="Contact person" value={contact} onChange={e => setContact(e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <input type="text" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }}>
          <option>Books</option><option>Uniforms</option><option>Furniture</option><option>Medical Supplies</option><option>Pharmaceuticals</option><option>Food</option><option>IT Equipment</option><option>Other</option>
        </select>
        <select value={terms} onChange={e => setTerms(e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }}>
          <option>Cash</option><option>Net 7</option><option>Net 14</option><option>Net 30</option><option>Net 60</option><option>Prepaid</option>
        </select>
      </div>
      <button onClick={add} style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginBottom: 24 }}>+ Add Supplier</button>
      {suppliers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚚</div><p>No suppliers yet.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
            <th style={{ padding: 10 }}>Name</th><th style={{ padding: 10 }}>Contact</th><th style={{ padding: 10 }}>Phone</th><th style={{ padding: 10 }}>Category</th><th style={{ padding: 10 }}>Terms</th><th></th>
          </tr></thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: 10, fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: 10 }}>{s.contact || '—'}</td>
                <td style={{ padding: 10 }}>{s.phone || '—'}</td>
                <td style={{ padding: 10 }}>{s.category}</td>
                <td style={{ padding: 10 }}><span style={{ background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{s.terms}</span></td>
                <td style={{ padding: 10 }}><button onClick={() => remove(s.id)} style={{ background: 'none', border: 0, color: '#d32f2f', cursor: 'pointer', fontSize: 18 }}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}