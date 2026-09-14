// FileName: src/pages/Academics.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Academic configuration — manage classes, subjects, UNEB codes

import React, { useState, useEffect, useRef } from 'react';

export default function Academics() {
  const [tab, setTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classForm, setClassForm] = useState({ id: null, name: '', level: 'Primary', stream: 'A', capacity: 50 });
  const [subjForm, setSubjForm] = useState({ id: null, name: '', code: '', uneb_code: '', category: 'Core', level: 'Primary' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Fetch classes and subjects ─────────────────────────────
  const fetchData = async () => {
    try {
      const [cR, sR] = await Promise.all([
        window.electronAPI.queryDatabase("SELECT * FROM classes ORDER BY name"),
        window.electronAPI.queryDatabase("SELECT * FROM subjects ORDER BY name")
      ]);
      if (!mountedRef.current) return;
      if (cR && cR.success) setClasses(cR.data || []);
      if (sR && sR.success) setSubjects(sR.data || []);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Academics: fetch error:', e.message);
      setMsg('❌ Error loading data: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── Handle class submit ──────────────────────────────────
  const handleClassSubmit = async (e) => {
    e.preventDefault();
    if (!classForm.name.trim()) {
      setMsg('⚠️ Class name is required');
      return;
    }

    setMsg('');

    try {
      if (classForm.id) {
        await window.electronAPI.queryDatabase(
          "UPDATE classes SET name = ?, level = ?, stream = ?, capacity = ? WHERE id = ?",
          [classForm.name, classForm.level, classForm.stream, classForm.capacity, classForm.id]
        );
        if (!mountedRef.current) return;
        setMsg('✅ Class updated!');
      } else {
        await window.electronAPI.queryDatabase(
          "INSERT INTO classes (name, level, stream, capacity) VALUES (?, ?, ?, ?)",
          [classForm.name, classForm.level, classForm.stream, classForm.capacity]
        );
        if (!mountedRef.current) return;
        setMsg('✅ Class added!');
      }
      setClassForm({ id: null, name: '', level: 'Primary', stream: 'A', capacity: 50 });
      fetchData();
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Handle subject submit ────────────────────────────────
  const handleSubjSubmit = async (e) => {
    e.preventDefault();
    if (!subjForm.name.trim()) {
      setMsg('⚠️ Subject name is required');
      return;
    }

    setMsg('');

    try {
      if (subjForm.id) {
        await window.electronAPI.queryDatabase(
          "UPDATE subjects SET name = ?, code = ?, uneb_code = ?, category = ?, level = ? WHERE id = ?",
          [subjForm.name, subjForm.code, subjForm.uneb_code, subjForm.category, subjForm.level, subjForm.id]
        );
        if (!mountedRef.current) return;
        setMsg('✅ Subject updated!');
      } else {
        await window.electronAPI.queryDatabase(
          "INSERT INTO subjects (name, code, uneb_code, category, level) VALUES (?, ?, ?, ?, ?)",
          [subjForm.name, subjForm.code, subjForm.uneb_code, subjForm.category, subjForm.level]
        );
        if (!mountedRef.current) return;
        setMsg('✅ Subject added!');
      }
      setSubjForm({ id: null, name: '', code: '', uneb_code: '', category: 'Core', level: 'Primary' });
      fetchData();
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Delete class ─────────────────────────────────────────
  const handleDeleteClass = async (c) => {
    if (!confirm('Delete class "' + c.name + '"?\n\nStudents in this class will need to be reassigned.')) return;

    try {
      await window.electronAPI.queryDatabase("DELETE FROM classes WHERE id = ?", [c.id]);
      if (!mountedRef.current) return;
      setMsg('🗑️ Class deleted');
      fetchData();
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Delete subject ───────────────────────────────────────
  const handleDeleteSubject = async (s) => {
    if (!confirm('Delete subject "' + s.name + '"?\n\nMarks and timetable entries for this subject may be affected.')) return;

    try {
      await window.electronAPI.queryDatabase("DELETE FROM subjects WHERE id = ?", [s.id]);
      if (!mountedRef.current) return;
      setMsg('🗑️ Subject deleted');
      fetchData();
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Level options ────────────────────────────────────────
  const levelOptions = ['Nursery', 'Primary', 'O_Level', 'A_Level', 'Tertiary', 'University'];

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Academics Configuration</h1>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{
              width: '40px', height: '40px',
              border: '4px solid #e0e0e0',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#666' }}>Loading academic data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📚 Academics Configuration</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: msg.includes('❌') ? '#c62828' : (msg.includes('⚠️') ? '#e65100' : '#0d904f'),
          marginBottom: '15px', padding: '10px 14px',
          background: msg.includes('❌') ? '#ffebee' : (msg.includes('⚠️') ? '#fff3e0' : '#e8f5e9'),
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Tabs ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '5px', marginBottom: '20px',
        borderBottom: '2px solid #dadce0', paddingBottom: '5px'
      }}>
        <button
          onClick={() => setTab('classes')}
          style={{
            padding: '8px 16px', border: 'none',
            background: tab === 'classes' ? '#1a73e8' : 'transparent',
            color: tab === 'classes' ? 'white' : '#5f6368',
            cursor: 'pointer', borderRadius: '4px',
            fontWeight: 600
          }}
        >
          🏫 Classes
        </button>
        <button
          onClick={() => setTab('subjects')}
          style={{
            padding: '8px 16px', border: 'none',
            background: tab === 'subjects' ? '#1a73e8' : 'transparent',
            color: tab === 'subjects' ? 'white' : '#5f6368',
            cursor: 'pointer', borderRadius: '4px',
            fontWeight: 600
          }}
        >
          📖 Subjects & UNEB Codes
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* TAB: CLASSES                                              */}
      {/* ═════════════════════════════════════════════════════════ */}

      {tab === 'classes' && (
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* ─── Class Form ────────────────────────────────────── */}
          <div style={{ flex: 1 }} className="card">
            <div className="card-header">{classForm.id ? '✏️ Edit Class' : '➕ Add Class'}</div>
            <div className="card-body">
              <form onSubmit={handleClassSubmit}>
                <div className="form-group">
                  <label className="form-label">Class Name *</label>
                  <input
                    className="form-input"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                    placeholder="e.g. Primary 1, Senior 1"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Level</label>
                  <select
                    className="form-input"
                    value={classForm.level}
                    onChange={(e) => setClassForm({ ...classForm, level: e.target.value })}
                  >
                    {levelOptions.map(l => <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Stream</label>
                  <input
                    className="form-input"
                    value={classForm.stream}
                    onChange={(e) => setClassForm({ ...classForm, stream: e.target.value })}
                    placeholder="e.g. A, B, C"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity</label>
                  <input
                    type="number"
                    className="form-input"
                    value={classForm.capacity}
                    onChange={(e) => setClassForm({ ...classForm, capacity: parseInt(e.target.value) || 50 })}
                    min="1"
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary">
                    {classForm.id ? '💾 Update' : '➕ Add'}
                  </button>
                  {classForm.id && (
                    <button
                      type="button"
                      onClick={() => setClassForm({ id: null, name: '', level: 'Primary', stream: 'A', capacity: 50 })}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* ─── Classes Table ────────────────────────────────── */}
          <div style={{ flex: 2 }} className="card">
            <div className="card-header">🏫 Classes ({classes.length})</div>
            <div className="card-body" style={{ overflowX: 'auto' }}>
              {classes.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No classes found</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Level</th>
                      <th>Stream</th>
                      <th>Capacity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: '600' }}>{c.name}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px',
                            background: '#e8f0fe', color: '#1a73e8',
                            fontSize: '12px'
                          }}>
                            {(c.level || '-').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>{c.stream || 'A'}</td>
                        <td>{c.capacity || 50}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => setClassForm(c)}
                              style={{ color: '#1a73e8', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClass(c)}
                              style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* TAB: SUBJECTS                                             */}
      {/* ═════════════════════════════════════════════════════════ */}

      {tab === 'subjects' && (
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* ─── Subject Form ──────────────────────────────────── */}
          <div style={{ flex: 1 }} className="card">
            <div className="card-header">{subjForm.id ? '✏️ Edit Subject' : '➕ Add Subject'}</div>
            <div className="card-body">
              <form onSubmit={handleSubjSubmit}>
                <div className="form-group">
                  <label className="form-label">Subject Name *</label>
                  <input
                    className="form-input"
                    value={subjForm.name}
                    onChange={(e) => setSubjForm({ ...subjForm, name: e.target.value })}
                    placeholder="e.g. Mathematics, English"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject Code</label>
                  <input
                    className="form-input"
                    value={subjForm.code}
                    onChange={(e) => setSubjForm({ ...subjForm, code: e.target.value })}
                    placeholder="e.g. MTH"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">UNEB Code</label>
                  <input
                    className="form-input"
                    value={subjForm.uneb_code}
                    onChange={(e) => setSubjForm({ ...subjForm, uneb_code: e.target.value })}
                    placeholder="e.g. 545 (for Mathematics)"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={subjForm.category}
                    onChange={(e) => setSubjForm({ ...subjForm, category: e.target.value })}
                  >
                    <option value="Core">Core</option>
                    <option value="Optional">Optional</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Level</label>
                  <select
                    className="form-input"
                    value={subjForm.level}
                    onChange={(e) => setSubjForm({ ...subjForm, level: e.target.value })}
                  >
                    {levelOptions.map(l => <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary">
                    {subjForm.id ? '💾 Update' : '➕ Add'}
                  </button>
                  {subjForm.id && (
                    <button
                      type="button"
                      onClick={() => setSubjForm({ id: null, name: '', code: '', uneb_code: '', category: 'Core', level: 'Primary' })}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* ─── Subjects Table ────────────────────────────────── */}
          <div style={{ flex: 2 }} className="card">
            <div className="card-header">📖 Subjects ({subjects.length})</div>
            <div className="card-body" style={{ overflowX: 'auto' }}>
              {subjects.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>No subjects found</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>UNEB</th>
                      <th>Category</th>
                      <th>Level</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: '600' }}>{s.name}</td>
                        <td>
                          <code style={{ background: '#f1f3f4', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                            {s.code || '-'}
                          </code>
                        </td>
                        <td>
                          <code style={{ background: '#e8f0fe', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#1a73e8' }}>
                            {s.uneb_code || '-'}
                          </code>
                        </td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px',
                            background: s.category === 'Core' ? '#e8f5e9' : '#fff3e0',
                            color: s.category === 'Core' ? '#0d904f' : '#e65100',
                            fontSize: '12px'
                          }}>
                            {s.category}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>{(s.level || '-').replace(/_/g, ' ')}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => setSubjForm(s)}
                              style={{ color: '#1a73e8', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSubject(s)}
                              style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}