// Ssewasswa Comforts — Notifications Center
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erp_notifications') || '[]');
      setNotifications(stored);
    } catch {}
  }, []);

  const markRead = (id) => setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications(notifications.map(n => ({ ...n, read: true })));
  const clearAll = () => { setNotifications([]); localStorage.setItem('erp_notifications', '[]'); };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="page-container">
      <h1 className="page-title">🔔 Notifications</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p style={{ color: '#666', fontSize: 14, margin: 0 }}>{unreadCount} unread of {notifications.length} total</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={markAllRead} style={{ padding: '8px 16px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer' }}>Mark all read</button>
          <button onClick={clearAll} style={{ padding: '8px 16px', background: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 6, cursor: 'pointer' }}>Clear all</button>
        </div>
      </div>
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔕</div><p>No notifications yet.</p>
        </div>
      ) : notifications.map(n => (
        <div key={n.id} style={{ display: 'flex', gap: 12, padding: 14, marginBottom: 8, borderRadius: 8, background: n.read ? 'white' : '#e8f0fe', border: `1px solid ${n.read ? '#e0e0e0' : '#1a73e8'}`, cursor: 'pointer' }} onClick={() => markRead(n.id)}>
          <div style={{ fontSize: 24 }}>{n.icon || 'ℹ️'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: n.read ? 400 : 700, color: n.read ? '#666' : '#1a73e8' }}>{n.title}</div>
            <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>{n.message}</div>
            <div style={{ color: '#999', fontSize: 11, marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
          </div>
          {!n.read && <div style={{ width: 8, height: 8, background: '#1a73e8', borderRadius: '50%', marginTop: 8 }} />}
        </div>
      ))}
    </div>
  );
}