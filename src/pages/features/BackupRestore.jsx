// Ssewasswa Comforts — Backup & Restore
import React, { useState } from 'react';

export default function BackupRestore() {
  const [backups, setBackups] = useState([]);
  const [restoring, setRestoring] = useState(false);

  const createBackup = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const data = {};
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('erp_')) data[key] = localStorage.getItem(key);
    }
    const backup = {
      id: Date.now(),
      name: `backup_${timestamp}.json`,
      timestamp: new Date().toISOString(),
      size: JSON.stringify(data).length,
      data,
    };
    const updated = [backup, ...backups].slice(0, 20);
    setBackups(updated);
    localStorage.setItem('erp_backups_list', JSON.stringify(updated.map(b => ({ id: b.id, name: b.name, timestamp: b.timestamp, size: b.size }))));
  };

  const downloadBackup = (b) => {
    const blob = new Blob([JSON.stringify(b.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = b.name; a.click();
    URL.revokeObjectURL(url);
  };

  const restoreBackup = (b) => {
    if (!confirm(`Restore backup ${b.name}? This will OVERWRITE all current data.`)) return;
    setRestoring(true);
    Object.keys(b.data).forEach(k => localStorage.setItem(k, b.data[k]));
    setTimeout(() => { setRestoring(false); alert('Restore complete! Reload the page to see restored data.'); }, 1000);
  };

  const deleteBackup = (id) => {
    const updated = backups.filter(b => b.id !== id);
    setBackups(updated);
    localStorage.setItem('erp_backups_list', JSON.stringify(updated.map(b => ({ id: b.id, name: b.name, timestamp: b.timestamp, size: b.size }))));
  };

  return (
    <div className="page-container">
      <h1 className="page-title">💾 Backup & Restore</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>One-click backup of all data to JSON. Download for safekeeping, restore when needed.</p>
      <button onClick={createBackup} style={{ padding: '12px 24px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginBottom: 24 }}>💾 Create Backup Now</button>
      {restoring && <div style={{ padding: 14, background: '#e8f0fe', color: '#1a73e8', borderRadius: 6, marginBottom: 16 }}>⏳ Restoring...</div>}
      {backups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💾</div><p>No backups yet. Click "Create Backup Now" to make your first backup.</p>
        </div>
      ) : backups.map(b => (
        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, borderRadius: 8, background: 'white', border: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: 24 }}>💾</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{b.name}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{new Date(b.timestamp).toLocaleString()} • {(b.size / 1024).toFixed(1)} KB</div>
          </div>
          <button onClick={() => downloadBackup(b)} style={{ padding: '6px 12px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>⬇ Download</button>
          <button onClick={() => restoreBackup(b)} style={{ padding: '6px 12px', background: '#0b8043', color: 'white', border: 0, borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>↺ Restore</button>
          <button onClick={() => deleteBackup(b.id)} style={{ padding: '6px 12px', background: 'none', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>×</button>
        </div>
      ))}
    </div>
  );
}