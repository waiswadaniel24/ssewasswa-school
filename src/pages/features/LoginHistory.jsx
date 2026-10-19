// Ssewasswa Comforts — Login History
import React, { useState, useEffect } from 'react';

export default function LoginHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erp_login_history') || '[]');
      setHistory(stored);
    } catch {}
  }, []);

  return (
    <div className="page-container">
      <h1 className="page-title">🌐 Login History</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Track every login attempt: user, IP, device, time, success/failure.</p>
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌐</div><p>No login history yet.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Time</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>User</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>IP</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Device</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Status</th>
          </tr></thead>
          <tbody>
            {history.slice().reverse().map((h, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: 8 }}>{new Date(h.timestamp).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{h.user}</td>
                <td style={{ padding: 8, fontFamily: 'monospace' }}>{h.ip}</td>
                <td style={{ padding: 8 }}>{h.device}</td>
                <td style={{ padding: 8 }}><span style={{ background: h.success ? '#0b8043' : '#d32f2f', color: 'white', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{h.success ? 'SUCCESS' : 'FAILED'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}