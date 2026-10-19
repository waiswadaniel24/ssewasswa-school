// Ssewasswa Comforts — Custom Fields (extend any entity)
import React, { useState, useEffect } from 'react';

export default function CustomFields() {
  const [fields, setFields] = useState([]);
  const [entity, setEntity] = useState('students');
  const [name, setName] = useState('');
  const [type, setType] = useState('text');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('erp_custom_fields') || '[]');
      setFields(stored);
    } catch {}
  }, []);

  const addField = () => {
    if (!name.trim()) return;
    const newField = { id: Date.now(), entity, name: name.trim(), type, created_at: new Date().toISOString() };
    const updated = [...fields, newField];
    setFields(updated);
    localStorage.setItem('erp_custom_fields', JSON.stringify(updated));
    setName(''); setType('text');
  };

  const deleteField = (id) => {
    const updated = fields.filter(f => f.id !== id);
    setFields(updated);
    localStorage.setItem('erp_custom_fields', JSON.stringify(updated));
  };

  const entityOptions = ['students', 'staff', 'patients', 'schools', 'users', 'parents'];
  const typeOptions = ['text', 'number', 'date', 'select', 'checkbox', 'textarea'];

  return (
    <div className="page-container">
      <h1 className="page-title">🧩 Custom Fields</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Add custom fields to any entity. Useful for school-specific data like "Religion", "Blood Group", "Previous School".</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={entity} onChange={e => setEntity(e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }}>
          {entityOptions.map(o => <option key={o}>{o}</option>)}
        </select>
        <input type="text" placeholder="Field name (e.g. Blood Group)" value={name} onChange={e => setName(e.target.value)} style={{ flex: 1, minWidth: 200, padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }} />
        <select value={type} onChange={e => setType(e.target.value)} style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }}>
          {typeOptions.map(o => <option key={o}>{o}</option>)}
        </select>
        <button onClick={addField} style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>+ Add Field</button>
      </div>
      {fields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666', background: '#fafafa', borderRadius: 8 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🧩</div><p>No custom fields defined yet.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead><tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Entity</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Field Name</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Type</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Created</th>
            <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Actions</th>
          </tr></thead>
          <tbody>
            {fields.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: 10 }}>{f.entity}</td>
                <td style={{ padding: 10, fontWeight: 600 }}>{f.name}</td>
                <td style={{ padding: 10 }}><code style={{ background: '#f0f2f5', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{f.type}</code></td>
                <td style={{ padding: 10, color: '#999' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                <td style={{ padding: 10 }}><button onClick={() => deleteField(f.id)} style={{ background: 'none', border: 0, color: '#d32f2f', cursor: 'pointer', fontSize: 18 }}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}