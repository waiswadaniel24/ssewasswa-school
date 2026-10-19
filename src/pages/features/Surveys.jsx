// Ssewasswa Comforts — Surveys
import React, { useState, useEffect } from 'react';

export default function Surveys() {
  const [surveys, setSurveys] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuestions, setNewQuestions] = useState([{ text: '', type: 'text' }]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erp_surveys') || '[]');
      setSurveys(stored);
    } catch {}
  }, []);

  const save = (updated) => { setSurveys(updated); localStorage.setItem('erp_surveys', JSON.stringify(updated)); };

  const createSurvey = () => {
    if (!newTitle.trim() || newQuestions.some(q => !q.text.trim())) return;
    const survey = {
      id: Date.now(),
      title: newTitle,
      questions: newQuestions.filter(q => q.text.trim()),
      created_at: new Date().toISOString(),
      responses: [],
    };
    save([survey, ...surveys]);
    setNewTitle(''); setNewQuestions([{ text: '', type: 'text' }]); setShowCreate(false);
  };

  const addQuestion = () => setNewQuestions([...newQuestions, { text: '', type: 'text' }]);
  const updateQ = (i, field, value) => setNewQuestions(newQuestions.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  const removeQ = (i) => setNewQuestions(newQuestions.filter((_, idx) => idx !== i));

  return (
    <div className="page-container">
      <h1 className="page-title">📋 Surveys</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Collect feedback from parents, students, patients, staff.</p>
      <button onClick={() => setShowCreate(!showCreate)} style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginBottom: 16 }}>+ New Survey</button>

      {showCreate && (
        <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #e0e0e0', marginBottom: 24 }}>
          <input type="text" placeholder="Survey title (e.g. Parent Satisfaction Survey)" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }} />
          {newQuestions.map((q, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="text" placeholder={`Question ${i+1}`} value={q.text} onChange={e => updateQ(i, 'text', e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
              <select value={q.type} onChange={e => updateQ(i, 'type', e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc' }}>
                <option value="text">Text</option><option value="rating">Rating 1-5</option><option value="yesno">Yes/No</option>
              </select>
              <button onClick={() => removeQ(i)} style={{ background: 'none', border: 0, color: '#d32f2f', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={addQuestion} style={{ padding: '8px 16px', background: '#fff', color: '#1a73e8', border: '1px solid #1a73e8', borderRadius: 6, cursor: 'pointer' }}>+ Add Question</button>
            <button onClick={createSurvey} style={{ padding: '8px 16px', background: '#0b8043', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Create Survey</button>
          </div>
        </div>
      )}

      {surveys.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div><p>No surveys yet. Create your first survey above.</p>
        </div>
      ) : surveys.map(s => (
        <div key={s.id} style={{ padding: 16, marginBottom: 8, borderRadius: 8, background: 'white', border: '1px solid #e0e0e0' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#1a73e8' }}>{s.title}</h3>
          <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>{s.questions.length} questions • {s.responses?.length || 0} responses • Created {new Date(s.created_at).toLocaleDateString()}</div>
          <div style={{ fontSize: 13, color: '#666' }}>{s.questions.map(q => q.text).join(' • ')}</div>
        </div>
      ))}
    </div>
  );
}