// Ssewasswa Comforts — API Keys
import React, { useState, useEffect } from 'react';

export default function APIKeys() {
  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    try { setKeys(JSON.parse(localStorage.getItem('erp_api_keys') || '[]')); } catch {}
  }, []);

  const generateKey = () => {
    if (!name.trim()) return;
    const key = 'ssew_sk_' + Array.from({length: 32}, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
    const newKey = { id: Date.now(), name: name.trim(), key, created_at: new Date().toISOString(), last_used: null, status: 'active' };
    const updated = [newKey, ...keys];
    setKeys(updated);
    localStorage.setItem('erp_api_keys', JSON.stringify(updated));
    setName('');
  };

  const revoke = (id) => {
    if (!confirm('Revoke this API key? Existing integrations will stop working immediately.')) return;
    const updated = keys.map(k => k.id === id ? { ...k, status: 'revoked' } : k);
    setKeys(updated);
    localStorage.setItem('erp_api_keys', JSON.stringify(updated));
  };

  return (
    <div className="page-container">
      <h1 className="page-title">🔑 API Keys</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Self-serve API tokens for integrations. Use the key in the Authorization header: <code style={{ background: '#f0f2f5', padding: '2px 6px', borderRadius: 4 }}>Bearer YOUR_KEY</code></p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input type="text" placeholder="Key name (e.g. Webhook Integration)" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <button onClick={generateKey} style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ Generate</button>
      </div>
      {keys.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div><p>No API keys yet.</p>
        </div>
      ) : keys.map(k => (
        <div key={k.id} style={{ padding: 14, marginBottom: 8, borderRadius: 8, background: 'white', border: `1px solid ${k.status === 'active' ? '#0b8043' : '#d32f2f'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{k.name} <span style={{ background: k.status === 'active' ? '#0b8043' : '#d32f2f', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, marginLeft: 8 }}>{k.status.toUpperCase()}</span></div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Created {new Date(k.created_at).toLocaleDateString()} • Last used: {k.last_used ? new Date(k.last_used).toLocaleString() : 'Never'}</div>
            </div>
            {k.status === 'active' && <button onClick={() => revoke(k.id)} style={{ padding: '6px 12px', background: 'none', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>Revoke</button>}
          </div>
          {k.status === 'active' && <code style={{ display: 'block', marginTop: 8, padding: 8, background: '#f8f9fa', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{k.key}</code>}
        </div>
      ))}
    </div>
  );
}