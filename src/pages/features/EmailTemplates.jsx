// Ssewasswa Comforts — Email Templates
import React, { useState, useEffect } from 'react';

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erp_email_templates') || '[]');
      setTemplates(stored);
    } catch {}
  }, []);

  const save = (updated) => { setTemplates(updated); localStorage.setItem('erp_email_templates', JSON.stringify(updated)); };

  const add = () => {
    if (!name.trim() || !subject.trim() || !body.trim()) return;
    save([{ id: Date.now(), name: name.trim(), subject: subject.trim(), body: body.trim(), created_at: new Date().toISOString() }, ...templates]);
    setName(''); setSubject(''); setBody('');
  };

  const copy = (t) => {
    navigator.clipboard.writeText(`Subject: ${t.subject}\n\n${t.body}`);
    alert('Template copied to clipboard!');
  };

  const remove = (id) => save(templates.filter(t => t.id !== id));

  return (
    <div className="page-container">
      <h1 className="page-title">✉️ Email Templates</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Pre-designed email templates for common messages (welcome, payment confirmation, exam results).</p>
      <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #e0e0e0', marginBottom: 24 }}>
        <input type="text" placeholder="Template name (e.g. Welcome Email)" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
        <input type="text" placeholder="Subject (use {student_name} for personalization)" value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }} />
        <textarea placeholder="Email body. Use {student_name}, {class}, {amount}, {date} for personalization." value={body} onChange={e => setBody(e.target.value)} rows={5} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
        <button onClick={add} style={{ marginTop: 8, padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ Save Template</button>
      </div>
      {templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✉️</div><p>No templates yet.</p>
        </div>
      ) : templates.map(t => (
        <div key={t.id} style={{ padding: 16, marginBottom: 8, borderRadius: 8, background: 'white', border: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#1a73e8' }}>{t.name}</h3>
            <div>
              <button onClick={() => copy(t)} style={{ padding: '4px 10px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 6 }}>📋 Copy</button>
              <button onClick={() => remove(t.id)} style={{ padding: '4px 10px', background: 'none', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>×</button>
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}><strong>Subject:</strong> {t.subject}</div>
          <pre style={{ fontSize: 12, color: '#333', background: '#f8f9fa', padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap', margin: 0 }}>{t.body}</pre>
        </div>
      ))}
    </div>
  );
}