// Ssewasswa Comforts — Deep Links (short URL generator)
import React, { useState, useEffect } from 'react';

export default function DeepLinks() {
  const [links, setLinks] = useState([]);
  const [url, setUrl] = useState('');
  const [custom, setCustom] = useState('');

  useEffect(() => {
    try { setLinks(JSON.parse(localStorage.getItem('erp_deep_links') || '[]')); } catch {}
  }, []);

  const create = () => {
    if (!url.trim()) return;
    const code = custom.trim() || Math.random().toString(36).slice(2, 8);
    const newLink = { id: Date.now(), code, url: url.trim(), created_at: new Date().toISOString(), clicks: 0 };
    const updated = [newLink, ...links];
    setLinks(updated);
    localStorage.setItem('erp_deep_links', JSON.stringify(updated));
    setUrl(''); setCustom('');
  };

  const remove = (id) => {
    const updated = links.filter(l => l.id !== id);
    setLinks(updated);
    localStorage.setItem('erp_deep_links', JSON.stringify(updated));
  };

  const copyLink = (code) => {
    const shortUrl = `${window.location.origin}/s/${code}`;
    navigator.clipboard.writeText(shortUrl);
    alert('Copied: ' + shortUrl);
  };

  return (
    <div className="page-container">
      <h1 className="page-title">🔗 Deep Links</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Create short URLs for sharing. e.g. <code style={{ background: '#f0f2f5', padding: '2px 6px', borderRadius: 4 }}>https://ssewasswa-school.pages.dev/s/abc123</code></p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <input type="text" placeholder="URL to shorten (e.g. https://ssewasswa-school.pages.dev/product-landing?ref=card)" value={url} onChange={e => setUrl(e.target.value)} style={{ flex: 1, minWidth: 250, padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <input type="text" placeholder="custom code (optional)" value={custom} onChange={e => setCustom(e.target.value)} style={{ width: 150, padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <button onClick={create} style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Create</button>
      </div>
      {links.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div><p>No deep links yet.</p>
        </div>
      ) : links.map(l => (
        <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, borderRadius: 8, background: 'white', border: '1px solid #e0e0e0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>/s/{l.code}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>→ {l.url.slice(0, 60)}{l.url.length > 60 ? '...' : ''}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{l.clicks} clicks • Created {new Date(l.created_at).toLocaleDateString()}</div>
          </div>
          <button onClick={() => copyLink(l.code)} style={{ padding: '6px 12px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>📋 Copy</button>
          <button onClick={() => remove(l.id)} style={{ padding: '6px 12px', background: 'none', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>×</button>
        </div>
      ))}
    </div>
  );
}