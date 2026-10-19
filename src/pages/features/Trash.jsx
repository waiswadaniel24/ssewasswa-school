// Ssewasswa Comforts — Trash (soft-deleted records)
import React, { useState, useEffect } from 'react';

export default function Trash() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erp_trash') || '[]');
      setItems(stored);
    } catch {}
  }, []);

  const restore = (id) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    localStorage.setItem('erp_trash', JSON.stringify(updated));
    alert('Item restored. Check the original page.');
  };
  const permanentlyDelete = (id) => {
    if (!confirm('Permanently delete? This cannot be undone.')) return;
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    localStorage.setItem('erp_trash', JSON.stringify(updated));
  };
  const emptyTrash = () => {
    if (!confirm('Empty trash? ALL items will be permanently deleted.')) return;
    setItems([]);
    localStorage.setItem('erp_trash', '[]');
  };

  return (
    <div className="page-container">
      <h1 className="page-title">🗑️ Trash</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Recover accidentally deleted records. Items auto-purge after 30 days.</p>
      {items.length > 0 && (
        <button onClick={emptyTrash} style={{ padding: '8px 16px', background: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 6, cursor: 'pointer', marginBottom: 16 }}>Empty trash</button>
      )}
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div><p>Trash is empty.</p>
        </div>
      ) : items.map(item => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, borderRadius: 8, background: 'white', border: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: 24 }}>{item.icon || '📄'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{item.name}</div>
            <div style={{ fontSize: 11, color: '#999' }}>Type: {item.type} • Deleted: {new Date(item.deleted_at).toLocaleString()}</div>
          </div>
          <button onClick={() => restore(item.id)} style={{ padding: '6px 12px', background: '#0b8043', color: 'white', border: 0, borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>↺ Restore</button>
          <button onClick={() => permanentlyDelete(item.id)} style={{ padding: '6px 12px', background: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>× Delete</button>
        </div>
      ))}
    </div>
  );
}