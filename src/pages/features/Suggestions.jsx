// Ssewasswa Comforts — Suggestions Box
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Suggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [text, setText] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erp_suggestions') || '[]');
      setSuggestions(stored);
    } catch {}
  }, []);

  const submit = () => {
    if (!text.trim()) return;
    const newSuggestion = {
      id: Date.now(),
      text: text.trim(),
      author: anonymous ? 'Anonymous' : (user?.username || 'User'),
      created_at: new Date().toISOString(),
      upvotes: 0,
    };
    const updated = [newSuggestion, ...suggestions];
    setSuggestions(updated);
    localStorage.setItem('erp_suggestions', JSON.stringify(updated));
    setText(''); setAnonymous(false);
  };

  const upvote = (id) => {
    const updated = suggestions.map(s => s.id === id ? { ...s, upvotes: s.upvotes + 1 } : s);
    setSuggestions(updated);
    localStorage.setItem('erp_suggestions', JSON.stringify(updated));
  };

  return (
    <div className="page-container">
      <h1 className="page-title">💡 Suggestions Box</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Submit feedback, feature requests, or ideas. Upvote suggestions you agree with.</p>
      <div style={{ marginBottom: 24, padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #e0e0e0' }}>
        <textarea
          placeholder="Share your suggestion..."
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <label style={{ fontSize: 13, color: '#666', cursor: 'pointer' }}>
            <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} style={{ marginRight: 6 }} />
            Submit anonymously
          </label>
          <button onClick={submit} style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Submit →</button>
        </div>
      </div>
      {suggestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💡</div><p>No suggestions yet. Be the first!</p>
        </div>
      ) : suggestions.map(s => (
        <div key={s.id} style={{ display: 'flex', gap: 12, padding: 14, marginBottom: 8, borderRadius: 8, background: 'white', border: '1px solid #e0e0e0' }}>
          <button onClick={() => upvote(s.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f0f2f5', border: 0, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', minWidth: 50 }}>
            <span style={{ fontSize: 16 }}>▲</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a73e8' }}>{s.upvotes}</span>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{s.text}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>By {s.author} • {new Date(s.created_at).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}