// Ssewasswa Comforts — Events Calendar
import React, { useState, useEffect } from 'react';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('meeting');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erp_events') || '[]');
      setEvents(stored);
    } catch {}
  }, []);

  const addEvent = () => {
    if (!title.trim() || !date) return;
    const ev = { id: Date.now(), title: title.trim(), date, type, created_at: new Date().toISOString() };
    const updated = [...events, ev].sort((a, b) => new Date(a.date) - new Date(b.date));
    setEvents(updated);
    localStorage.setItem('erp_events', JSON.stringify(updated));
    setTitle(''); setDate(''); setType('meeting');
  };

  const deleteEvent = (id) => {
    const updated = events.filter(e => e.id !== id);
    setEvents(updated);
    localStorage.setItem('erp_events', JSON.stringify(updated));
  };

  const typeIcon = { meeting: '👥', exam: '📝', holiday: '🎉', sports: '⚽', trip: '🚌', deadline: '⏰', other: '📌' };

  return (
    <div className="page-container">
      <h1 className="page-title">📅 Events Calendar</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>School events, exam dates, parent meetings, holidays.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Event title" value={title} onChange={e => setTitle(e.target.value)} style={{ flex: 1, minWidth: 200, padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <select value={type} onChange={e => setType(e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc' }}>
          <option value="meeting">👥 Meeting</option><option value="exam">📝 Exam</option><option value="holiday">🎉 Holiday</option>
          <option value="sports">⚽ Sports</option><option value="trip">🚌 Trip</option><option value="deadline">⏰ Deadline</option><option value="other">📌 Other</option>
        </select>
        <button onClick={addEvent} style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
      </div>
      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div><p>No events scheduled.</p>
        </div>
      ) : events.map(ev => (
        <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, borderRadius: 8, background: 'white', border: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: 28 }}>{typeIcon[ev.type] || '📌'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{ev.title}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{new Date(ev.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <button onClick={() => deleteEvent(ev.id)} style={{ background: 'none', border: 0, color: '#d32f2f', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      ))}
    </div>
  );
}