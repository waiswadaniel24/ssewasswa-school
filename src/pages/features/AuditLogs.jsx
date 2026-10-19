// Ssewasswa Comforts — Audit Logs (track all user actions)
import React, { useState, useEffect } from 'react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erp_audit_logs') || '[]');
      setLogs(stored.reverse());
    } catch {}
  }, []);

  const clearLogs = () => { setLogs([]); localStorage.setItem('erp_audit_logs', '[]'); };

  return (
    <div className="page-container">
      <h1 className="page-title">📜 Audit Logs</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Tracks user actions for compliance and security. Read-only.</p>
      <div style={{ marginBottom: 16 }}>
        <button onClick={clearLogs} style={{ padding: '8px 16px', background: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 6, cursor: 'pointer' }}>Clear logs</button>
      </div>
      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div><p>No audit log entries yet.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Time</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>User</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Action</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Entity</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Details</th>
          </tr></thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: 8 }}>{new Date(log.timestamp).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{log.user || '—'}</td>
                <td style={{ padding: 8, fontWeight: 600 }}>{log.action}</td>
                <td style={{ padding: 8 }}>{log.entity || '—'}</td>
                <td style={{ padding: 8, color: '#666' }}>{log.details || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}