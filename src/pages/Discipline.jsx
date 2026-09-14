// FileName: src/pages/Discipline.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useRef, useCallback } from 'react';

const DISCIPLINE_TYPES = [
  'Lateness',
  'Truancy / Absenteeism',
  'Bullying',
  'Fighting',
  'Disrespect / Insubordination',
  'Theft',
  'Vandalism',
  'Examination Malpractice',
  'Dress Code Violation',
  'Substance Abuse',
  'Phone / Gadget Misuse',
  'Other'
];

const ACTIONS_TAKEN = [
  'Verbal Warning',
  'Written Warning',
  'Counseling',
  'Parent Called',
  'Suspension (1-3 days)',
  'Suspension (1+ week)',
  'Community Service',
  'Expulsion',
  'Other'
];

export default function Discipline() {
  const [classes, setClasses] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    student_id: '',
    type: '',
    offence: '',
    action: '',
    date: new Date().toISOString().split('T')[0],
    teacher: ''
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load classes and records on mount ─────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [cRes, recRes] = await Promise.all([
          window.electronAPI.queryDatabase("SELECT id, name FROM classes ORDER BY name"),
          window.electronAPI.queryDatabase(
            `SELECT d.id, d.student_id, d.type, d.offence, d.action, d.date, d.teacher,
                         s.first_name, s.last_name, s.admission_number, s.gender,
                         c.name as class_name
                         FROM discipline d
                         LEFT JOIN students s ON d.student_id = s.id
                         LEFT JOIN classes c ON s.class_id = c.id
                         ORDER BY d.date DESC LIMIT 200`
          )
        ]);

        if (!mountedRef.current) return;

        if (cRes && cRes.success) setClasses(cRes.data || []);
        if (recRes && recRes.success) setRecords(recRes.data || []);
      } catch (e) {
        console.error('Discipline: load initial error:', e.message);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // ─── Load students when class is selected ─────────────────
  const fetchStudents = useCallback(async () => {
    if (!selClass) {
      setStudents([]);
      return;
    }
    try {
      const r = await window.electronAPI.queryDatabase(
        "SELECT id, first_name, last_name, admission_number, gender FROM students WHERE class_id = ? AND status = 'Active' ORDER BY first_name",
        [selClass]
      );
      if (!mountedRef.current) return;
      if (r && r.success) setStudents(r.data || []);
    } catch (e) {
      console.error('Discipline: load students error:', e.message);
    }
  }, [selClass]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ─── Handle form submit ───────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.student_id) {
      setMsg('⚠️ Please select a student');
      return;
    }
    if (!formData.type) {
      setMsg('⚠️ Please select the discipline type');
      return;
    }
    if (!formData.offence.trim()) {
      setMsg('⚠️ Please describe the offence');
      return;
    }
    if (!formData.action) {
      setMsg('⚠️ Please select the action taken');
      return;
    }

    setSaving(true);
    setMsg('');

    try {
      const r = await window.electronAPI.queryDatabase(
        "INSERT INTO discipline (student_id, type, offence, action, date, teacher) VALUES (?, ?, ?, ?, ?, ?)",
        [
          formData.student_id,
          formData.type,
          formData.offence.trim(),
          formData.action,
          formData.date,
          formData.teacher || ''
        ]
      );

      if (!mountedRef.current) return;

      if (r && r.success) {
        // Find student name for message
        const student = students.find(s => String(s.id) === String(formData.student_id));
        const studentName = student ? (student.first_name + ' ' + student.last_name) : 'Student';
        setMsg('✅ Discipline record added for ' + studentName);

        // Reset form
        setFormData({
          student_id: '',
          type: '',
          offence: '',
          action: '',
          date: new Date().toISOString().split('T')[0],
          teacher: ''
        });
        setShowForm(false);

        // Reload records
        const recRes = await window.electronAPI.queryDatabase(
          `SELECT d.id, d.student_id, d.type, d.offence, d.action, d.date, d.teacher,
                     s.first_name, s.last_name, s.admission_number, s.gender,
                     c.name as class_name
                     FROM discipline d
                     LEFT JOIN students s ON d.student_id = s.id
                     LEFT JOIN classes c ON s.class_id = c.id
                     ORDER BY d.date DESC LIMIT 200`
        );
        if (mountedRef.current && recRes && recRes.success) {
          setRecords(recRes.data || []);
        }
      } else {
        setMsg('❌ ' + ((r && r.error) || 'Error adding record'));
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Discipline: submit error:', e.message);
      setMsg('❌ Error: ' + e.message);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Delete discipline record ─────────────────────────────
  const handleDelete = async (id, studentName) => {
    if (!confirm('Delete this discipline record for ' + studentName + '?')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM discipline WHERE id = ?", [id]
      );
      if (!mountedRef.current) return;
      setMsg('🗑️ Record deleted');
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error deleting: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Filtered records (search by student name or type) ───
  const filteredRecords = records.filter(r => {
    if (!searchTerm.trim()) return true;
    const fullName = ((r.first_name || '') + ' ' + (r.last_name || '')).toLowerCase();
    const st = searchTerm.toLowerCase();
    return fullName.includes(st) ||
      (r.type || '').toLowerCase().includes(st) ||
      (r.offence || '').toLowerCase().includes(st) ||
      (r.admission_number || '').toLowerCase().includes(st);
  });

  // ─── Type badge color ─────────────────────────────────────
  const getTypeColor = (type) => {
    const colors = {
      'Lateness': '#e65100',
      'Truancy / Absenteeism': '#e65100',
      'Bullying': '#d32f2f',
      'Fighting': '#d32f2f',
      'Disrespect / Insubordination': '#7b1fa2',
      'Theft': '#d32f2f',
      'Vandalism': '#f57c00',
      'Examination Malpractice': '#c62828',
      'Dress Code Violation': '#5f6368',
      'Substance Abuse': '#c62828',
      'Phone / Gadget Misuse': '#5f6368',
      'Other': '#5f6368'
    };
    return colors[type] || '#5f6368';
  };

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">⚠️ Discipline Management</h1>
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
            <p style={{ color: '#666' }}>Loading discipline records...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">⚠️ Discipline Management</h1>

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

      {/* ─── Header ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px'
      }}>
        <div>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            {records.length} total records
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showForm ? '❌ Cancel' : '➕ Record Incident'}
        </button>
      </div>

      {/* ─── Add Form ──────────────────────────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: '20px', border: '2px solid #fff3e0' }}>
          <div className="card-header" style={{ background: '#fff3e0' }}>
            ⚠️ Record Discipline Incident
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              {/* ── Class + Student Selection ───────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Class</label>
                  <select
                    className="form-input"
                    value={selClass}
                    onChange={(e) => setSelClass(e.target.value)}
                  >
                    <option value="">-- Select Class --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Student *</label>
                  <select
                    className="form-input"
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    required
                    disabled={!selClass}
                  >
                    <option value="">-- Select Student --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.admission_number || 'No Adm'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Type + Action + Date ────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Discipline Type *</label>
                  <select
                    className="form-input"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="">-- Select --</option>
                    {DISCIPLINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Action Taken *</label>
                  <select
                    className="form-input"
                    value={formData.action}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                    required
                  >
                    <option value="">-- Select --</option>
                    {ACTIONS_TAKEN.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* ── Offence Description ────────────────── */}
              <div className="form-group">
                <label className="form-label">Offence Description *</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.offence}
                  onChange={(e) => setFormData({ ...formData, offence: e.target.value })}
                  placeholder="Describe what happened in detail..."
                  required
                />
              </div>

              {/* ── Teacher / Reporter ──────────────────── */}
              <div className="form-group">
                <label className="form-label">Reported By (Teacher)</label>
                <input
                  className="form-input"
                  value={formData.teacher}
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                  placeholder="Name of teacher who reported the incident"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? '⏳ Saving...' : '⚠️ Record Incident'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Search ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '12px', top: '50%',
              transform: 'translateY(-50%)', color: '#9aa0a6'
            }}>🔍</span>
            <input
              className="form-input"
              style={{ paddingLeft: '38px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, admission number, type, or offence..."
            />
          </div>
        </div>
      </div>

      {/* ─── Discipline Records Table ────────────────────────── */}
      <div className="card">
        <div className="card-header">
          📋 Discipline Records ({filteredRecords.length})
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {filteredRecords.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
              {searchTerm ? 'No records matching your search' : 'No discipline records. Click "Record Incident" to add one.'}
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Adm No</th>
                  <th>Class</th>
                  <th>Type</th>
                  <th>Offence</th>
                  <th>Action</th>
                  <th>Teacher</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(r => {
                  const typeColor = getTypeColor(r.type);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {r.date || '-'}
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        {r.first_name || ''} {r.last_name || ''}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {r.admission_number || '-'}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {r.class_name || '-'}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: typeColor + '20',
                          color: typeColor,
                          fontSize: '11px', fontWeight: '600'
                        }}>
                          {r.type || '-'}
                        </span>
                      </td>
                      <td style={{
                        fontSize: '12px', maxWidth: '200px',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={r.offence}>
                        {r.offence || '-'}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {r.action || '-'}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {r.teacher || '-'}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(r.id, (r.first_name || '') + ' ' + (r.last_name || ''))}
                          style={{
                            color: '#d32f2f', border: 'none',
                            background: 'none', cursor: 'pointer',
                            fontSize: '12px', fontWeight: '600'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}