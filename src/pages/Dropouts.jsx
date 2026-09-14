// FileName: src/pages/Dropouts.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useRef } from 'react';

// EMIS-standard dropout reasons
const DROPOUT_REASONS = [
  'Pregnancy',
  'Lack of Fees',
  'Sickness/Illness',
  'Child Labour',
  'Transfer to Another School',
  'Early Marriage',
  'Family Relocation',
  'Lack of Interest',
  'Special Needs (No Support)',
  'Other'
];

export default function Dropouts() {
  const [classes, setClasses] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({
    student_id: '',
    dropout_date: new Date().toISOString().split('T')[0],
    dropout_reason: '',
    destination_known: false,
    destination_school: '',
    remarks: ''
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load classes on mount ─────────────────────────────────
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const r = await window.electronAPI.queryDatabase(
          "SELECT id, name FROM classes ORDER BY name"
        );
        if (!mountedRef.current) return;
        if (r && r.success) setClasses(r.data || []);
      } catch (e) {
        console.error('Dropouts: load classes error:', e.message);
      }
    };

    const loadRecords = async () => {
      try {
        const r = await window.electronAPI.queryDatabase(
          `SELECT d.id, d.student_id, d.dropout_date, d.dropout_reason,
                     d.destination_known, d.destination_school, d.remarks,
                     s.first_name, s.last_name, s.admission_number, s.gender
                     FROM dropout_records d
                     JOIN students s ON d.student_id = s.id
                     ORDER BY d.dropout_date DESC`
        );
        if (!mountedRef.current) return;
        if (r && r.success) setRecords(r.data || []);
      } catch (e) {
        console.error('Dropouts: load records error:', e.message);
      }
    };

    loadClasses();
    loadRecords();
  }, []);

  // ─── Load students when class is selected ──────────────────
  const loadStudents = async () => {
    if (!selClass) {
      setStudents([]);
      return;
    }

    setTableLoading(true);
    try {
      const r = await window.electronAPI.queryDatabase(
        "SELECT id, first_name, last_name, admission_number, gender FROM students WHERE class_id = ? AND status = 'Active' ORDER BY first_name",
        [selClass]
      );
      if (!mountedRef.current) return;
      if (r && r.success) setStudents(r.data || []);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Dropouts: load students error:', e.message);
      setMsg('❌ Error loading students: ' + e.message);
    } finally {
      if (mountedRef.current) setTableLoading(false);
    }
  };

  // ─── Handle dropout submission ─────────────────────────────
  const handleDropout = async (e) => {
    e.preventDefault();

    if (!confirm('Are you sure you want to mark this student as DROPPED OUT?\n\nThis action will:\n• Change their status from "Active" to "Dropped Out"\n• Record the dropout reason and date\n• This can be reversed by reinstating the student')) {
      return;
    }

    setLoading(true);

    try {
      // Update student status
      await window.electronAPI.queryDatabase(
        "UPDATE students SET status = 'Dropped Out', dropout_reason = ?, transfer_date = ? WHERE id = ?",
        [form.dropout_reason, form.dropout_date, form.student_id]
      );

      // Create dropout record
      await window.electronAPI.queryDatabase(
        "INSERT INTO dropout_records (student_id, dropout_date, dropout_reason, destination_known, destination_school, remarks) VALUES (?, ?, ?, ?, ?, ?)",
        [
          form.student_id,
          form.dropout_date,
          form.dropout_reason,
          form.destination_known ? 1 : 0,
          form.destination_school,
          form.remarks
        ]
      );

      if (!mountedRef.current) return;

      // Find student name for message
      const student = students.find(s => String(s.id) === String(form.student_id));
      const studentName = student ? (student.first_name + ' ' + student.last_name) : 'Student';

      setMsg('✅ ' + studentName + ' marked as dropped out');

      // Reset form
      setForm({
        student_id: '',
        dropout_date: new Date().toISOString().split('T')[0],
        dropout_reason: '',
        destination_known: false,
        destination_school: '',
        remarks: ''
      });

      // Reload students and records
      loadStudents();

      // Reload dropout records
      try {
        const r = await window.electronAPI.queryDatabase(
          `SELECT d.id, d.student_id, d.dropout_date, d.dropout_reason,
                     d.destination_known, d.destination_school, d.remarks,
                     s.first_name, s.last_name, s.admission_number, s.gender
                     FROM dropout_records d
                     JOIN students s ON d.student_id = s.id
                     ORDER BY d.dropout_date DESC`
        );
        if (mountedRef.current && r && r.success) setRecords(r.data || []);
      } catch (e) {
        console.error('Dropouts: reload records error:', e.message);
      }

    } catch (error) {
      if (!mountedRef.current) return;
      console.error('Dropouts: handle dropout error:', error.message);
      setMsg('❌ Error: ' + error.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Delete a dropout record permanently ────────────────────
  const handleDeleteRecord = async (id) => {
    if (!confirm('Permanently delete this dropout record?\n\nNote: This only removes the record. The student status will remain "Dropped Out" unless you reinstate them.')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM dropout_records WHERE id = ?", [id]
      );

      if (!mountedRef.current) return;

      // Reload records
      const r = await window.electronAPI.queryDatabase(
        `SELECT d.id, d.student_id, d.dropout_date, d.dropout_reason,
                 d.destination_known, d.destination_school, d.remarks,
                 s.first_name, s.last_name, s.admission_number, s.gender
                 FROM dropout_records d
                 JOIN students s ON d.student_id = s.id
                 ORDER BY d.dropout_date DESC`
      );
      if (mountedRef.current && r && r.success) setRecords(r.data || []);

      setMsg('🗑️ Dropout record deleted');
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error deleting record: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Reinstate a dropped-out student ────────────────────────
  const handleReinstate = async (studentId, studentName) => {
    if (!confirm('Reinstate ' + studentName + ' as Active?\n\nThis will:\n• Change status back to "Active"\n• Clear the dropout reason\n• The student will appear in active lists again')) return;

    try {
      await window.electronAPI.queryDatabase(
        "UPDATE students SET status = 'Active', dropout_reason = NULL WHERE id = ?",
        [studentId]
      );

      if (!mountedRef.current) return;

      // Reload records
      const r = await window.electronAPI.queryDatabase(
        `SELECT d.id, d.student_id, d.dropout_date, d.dropout_reason,
                 d.destination_known, d.destination_school, d.remarks,
                 s.first_name, s.last_name, s.admission_number, s.gender
                 FROM dropout_records d
                 JOIN students s ON d.student_id = s.id
                 ORDER BY d.dropout_date DESC`
      );
      if (mountedRef.current && r && r.success) setRecords(r.data || []);

      setMsg('✅ ' + studentName + ' reinstated as Active');
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error reinstating: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Get selected student for the dropout form ──────────────
  const selectedStudent = students.find(s => String(s.id) === String(form.student_id));

  // ─── Loading state ──────────────────────────────────────────
  if (tableLoading && students.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">Dropout Tracking (EMIS)</h1>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '36px', height: '36px',
              border: '3px solid #e0e0e0',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#666' }}>Loading students...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* FIXED: Title was "dropout Tracking" (lowercase 'd') */}
      <h1 className="page-title">📉 Dropout Tracking (EMIS)</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: msg.includes('❌') ? '#c62828' : (msg.includes('✅') ? '#0d904f' : '#e65100'),
          marginBottom: '15px',
          fontWeight: 'bold',
          padding: '10px 14px',
          background: msg.includes('❌') ? '#ffebee' : (msg.includes('✅') ? '#e8f5e9' : '#fff3e0'),
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Class Selection ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">📚 Select Class to View Active Students</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
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
            <button
              onClick={loadStudents}
              className="btn btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              disabled={!selClass || tableLoading}
            >
              {tableLoading ? '⏳ Loading...' : '🔄 Load Students'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Dropout Form (appears when student is selected) ── */}
      {form.student_id && selectedStudent && (
        <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid #d32f2f' }}>
          <div className="card-header" style={{ background: '#ffebee' }}>
            ⚠️ Record Dropout for: <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong>
            <span style={{ marginLeft: '10px', color: '#666', fontSize: '12px' }}>
              ({selectedStudent.admission_number || 'No Adm'})
            </span>
          </div>
          <div className="card-body">
            <form onSubmit={handleDropout}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Dropout Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.dropout_date}
                    onChange={(e) => setForm({ ...form, dropout_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <select
                    className="form-input"
                    value={form.dropout_reason}
                    onChange={(e) => setForm({ ...form, dropout_reason: e.target.value })}
                    required
                  >
                    <option value="">-- Select Reason --</option>
                    {DROPOUT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '15px 0' }}>
                <input
                  type="checkbox"
                  checked={form.destination_known}
                  onChange={(e) => setForm({ ...form, destination_known: e.target.checked })}
                  style={{ width: '20px', height: '20px' }}
                  id="destKnown"
                />
                <label htmlFor="destKnown">Destination school known?</label>
              </div>

              {form.destination_known && (
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label">Destination School Name</label>
                  <input
                    className="form-input"
                    value={form.destination_school}
                    onChange={(e) => setForm({ ...form, destination_school: e.target.value })}
                    placeholder="Name of school they transferred to"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Additional Remarks</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Any additional information..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#d32f2f' }}
                  disabled={loading}
                >
                  {loading ? '⏳ Processing...' : '⚠️ Confirm Dropout'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm({
                      student_id: '',
                      dropout_date: new Date().toISOString().split('T')[0],
                      dropout_reason: '',
                      destination_known: false,
                      destination_school: '',
                      remarks: ''
                    });
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Active Students List ────────────────────────────── */}
      {students.length > 0 && !form.student_id && (
        <div className="card">
          <div className="card-header">
            👥 Active Students in {classes.find(c => String(c.id) === String(selClass)) ? classes.find(c => String(c.id) === String(selClass)).name : ''} ({students.length})
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Name</th>
                  <th>Adm No</th>
                  <th>Gender</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: '#999' }}>{i + 1}</td>
                    <td style={{ fontWeight: '600' }}>{s.first_name} {s.last_name}</td>
                    <td>{s.admission_number || '-'}</td>
                    <td>
                      {s.gender === 'M' ? '👦 Male' : '👧 Female'}
                    </td>
                    <td>
                      <button
                        onClick={() => setForm({
                          ...form,
                          student_id: s.id,
                          dropout_date: new Date().toISOString().split('T')[0]
                        })}
                        className="btn btn-secondary"
                        style={{
                          width: 'auto',
                          marginTop: 0,
                          padding: '5px 12px',
                          background: '#d32f2f',
                          color: 'white',
                          fontSize: '12px'
                        }}
                      >
                        ⚠️ Mark Dropout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Dropout Records ─────────────────────────────────── */}
      {records.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            📋 Dropout Records ({records.length})
            <span style={{ float: 'right', fontSize: '12px', color: '#666' }}>
              Most recent first
            </span>
          </div>
          <div className="card-body" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Adm No</th>
                  <th>Gender</th>
                  <th>Reason</th>
                  <th>Destination</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const studentName = r.first_name + ' ' + r.last_name;
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {r.dropout_date || '-'}
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        {studentName}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {r.admission_number || '-'}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {r.gender === 'M' ? 'M' : 'F'}
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#ffebee',
                          color: '#d32f2f',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {r.dropout_reason || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {r.destination_known
                          ? (r.destination_school || 'Yes')
                          : 'Unknown'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleReinstate(r.student_id, studentName)}
                            style={{
                              color: '#0d904f',
                              border: '1px solid #a5d6a7',
                              background: '#e8f5e9',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              padding: '4px 10px',
                              borderRadius: '4px'
                            }}
                            title="Reinstate as Active"
                          >
                            ↩️ Reinstate
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            className="btn-danger"
                            style={{
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              padding: '4px 10px',
                              borderRadius: '4px'
                            }}
                            title="Delete Record"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Empty State ────────────────────────────────────── */}
      {records.length === 0 && students.length === 0 && !form.student_id && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ fontSize: '48px', marginBottom: '10px' }}>📋</p>
            <h3 style={{ color: '#666' }}>No Dropout Records</h3>
            <p style={{ color: '#999' }}>
              Select a class above to view students and record dropouts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}