// Ssewasswa Comforts — Tasks (to-do list per user)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erp_tasks') || '[]');
      setTasks(stored);
    } catch {}
  }, []);

  const saveTasks = (updated) => { setTasks(updated); localStorage.setItem('erp_tasks', JSON.stringify(updated)); };
  const addTask = () => {
    if (!newTask.trim()) return;
    saveTasks([{ id: Date.now(), title: newTask, priority, completed: false, created_at: new Date().toISOString(), assigned_to: user?.username || 'me' }, ...tasks]);
    setNewTask(''); setPriority('medium');
  };
  const toggleTask = (id) => saveTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id) => saveTasks(tasks.filter(t => t.id !== id));
  const priorityColor = { high: '#d32f2f', medium: '#f9ab00', low: '#0b8043' };

  return (
    <div className="page-container">
      <h1 className="page-title">✅ Tasks</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Personal to-do list. Add, complete, and prioritize tasks.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <input type="text" placeholder="Add a new task..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} style={{ flex: 1, minWidth: 250, padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <select value={priority} onChange={e => setPriority(e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc' }}>
          <option value="high">🔴 High</option><option value="medium">🟡 Medium</option><option value="low">🟢 Low</option>
        </select>
        <button onClick={addTask} style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
      </div>
      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div><p>No tasks yet. Add your first task above.</p>
        </div>
      ) : tasks.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, borderRadius: 8, background: t.completed ? '#f6fff9' : 'white', border: `1px solid ${t.completed ? '#0b8043' : '#e0e0e0'}` }}>
          <input type="checkbox" checked={t.completed} onChange={() => toggleTask(t.id)} style={{ transform: 'scale(1.3)', cursor: 'pointer' }} />
          <div style={{ flex: 1 }}>
            <div style={{ textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? '#666' : '#000', fontWeight: 500 }}>{t.title}</div>
            <div style={{ fontSize: 11, color: '#999' }}>Assigned to: {t.assigned_to} • {new Date(t.created_at).toLocaleString()}</div>
          </div>
          <span style={{ background: priorityColor[t.priority], color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase' }}>{t.priority}</span>
          <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 0, color: '#d32f2f', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
        </div>
      ))}
    </div>
  );
}