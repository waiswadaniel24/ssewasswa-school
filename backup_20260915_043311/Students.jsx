import React, { useState, useEffect, useCallback } from 'react';

var EMPTY = { first_name: '', last_name: '', other_name: '', gender: 'M', date_of_birth: '', class_id: '', student_type: 'Day', residence: '', guardian_name: '', guardian_phone: '', admission_number: '', paycode: '' };

export default function Students() {
  var [students, setStudents] = useState([]);
  var [classes, setClasses] = useState([]);
  var [showForm, setShowForm] = useState(false);
  var [searchTerm, setSearchTerm] = useState('');
  var [filterClass, setFilterClass] = useState('');
  var [msg, setMsg] = useState('');
  var [editData, setEditData] = useState(null);
  var [formData, setFormData] = useState(EMPTY);
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);

  var loadData = useCallback(async function() {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) { setLoading(false); return; }
    try {
      var cRes = await window.electronAPI.queryDatabase("SELECT id, name FROM classes ORDER BY name");
      if (cRes && cRes.success) setClasses(cRes.data || []);
      var query = "SELECT s.id, s.first_name, s.last_name, s.other_name, s.admission_number, s.gender, s.class_id, s.student_type, s.guardian_phone, s.status, s.paycode, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.status != 'Deleted'";
      var params = [];
      if (filterClass) { query += " AND s.class_id = ?"; params.push(filterClass); }
      if (searchTerm) { query += " AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ?)"; var st = '%' + searchTerm + '%'; params.push(st, st, st); }
      query += " ORDER BY s.first_name LIMIT 200";
      var sRes = await window.electronAPI.queryDatabase(query, params);
      if (sRes && sRes.success) setStudents(sRes.data || []);
    } catch (e) { setMsg('Error loading: ' + e.message); }
    setLoading(false);
  }, [searchTerm, filterClass]);

  useEffect(function() { loadData(); }, [loadData]);

  var handleSubmit = async function(e) {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim()) { setMsg('First and last name required'); return; }
    setSaving(true); setMsg('Saving...');

    var finalData = {};
    for (var k in formData) finalData[k] = formData[k];
    if (!finalData.paycode || finalData.paycode.trim() === '') {
      finalData.paycode = 'P' + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase();
    }

    try {
      var res;
      if (editData) {
        res = await window.electronAPI.queryDatabase("UPDATE students SET first_name=?, last_name=?, other_name=?, gender=?, date_of_birth=?, class_id=?, student_type=?, residence=?, guardian_name=?, guardian_phone=?, paycode=? WHERE id=?", [finalData.first_name, finalData.last_name, finalData.other_name, finalData.gender, finalData.date_of_birth, finalData.class_id || null, finalData.student_type, finalData.residence, finalData.guardian_name, finalData.guardian_phone, finalData.paycode, editData.id]);
      } else {
        res = await window.electronAPI.queryDatabase("INSERT INTO students (first_name, last_name, other_name, gender, date_of_birth, class_id, student_type, residence, guardian_name, guardian_phone, admission_number, paycode, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'Active')", [finalData.first_name, finalData.last_name, finalData.other_name, finalData.gender, finalData.date_of_birth, finalData.class_id || null, finalData.student_type, finalData.residence, finalData.guardian_name, finalData.guardian_phone, finalData.admission_number, finalData.paycode]);
      }
      if (res && res.success) {
        setMsg(editData ? 'Student updated!' : 'Student added! Paycode: ' + finalData.paycode);
        setShowForm(false); setEditData(null); setFormData(EMPTY);
        await loadData();
      } else { setMsg('Error: ' + ((res && res.error) ? res.error : 'Failed')); }
    } catch (err) { setMsg('Error: ' + err.message); }
    setSaving(false);
  };

  var handleEdit = function(s) { setEditData(s); setFormData({ first_name: s.first_name || '', last_name: s.last_name || '', other_name: s.other_name || '', gender: s.gender || 'M', date_of_birth: s.date_of_birth || '', class_id: String(s.class_id || ''), student_type: s.student_type || 'Day', residence: s.residence || '', guardian_name: s.guardian_name || '', guardian_phone: s.guardian_phone || '', admission_number: s.admission_number || '', paycode: s.paycode || '' }); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  var handleDelete = async function(id) {
    if (!confirm('Delete this student?')) return;
    await window.electronAPI.queryDatabase("UPDATE students SET status='Deleted' WHERE id=?", [id]);
    setMsg('Student removed'); loadData();
  };

  var generatePaycodes = async function() {
    if (!confirm('Generate missing paycodes?')) return;
    try { var r = await window.electronAPI.backfillPaycodes(); if (r && r.success) { setMsg('Generated ' + ((r.data && r.data.count) ? r.data.count : 0) + ' paycodes'); loadData(); } } catch (e) { setMsg('Error: ' + e.message); }
  };

  var is = { width: '100%', padding: '10px', border: '1px solid #dadce0', borderRadius: '6px', fontSize: '14px' };

  if (loading) return React.createElement('div', { className: 'page-container' }, React.createElement('h1', { className: 'page-title' }, 'Students'), React.createElement('p', null, 'Loading...'));

  return (
    <div className="page-container">
      <h1 className="page-title">Students & Admissions</h1>
      {msg && <p style={{ color: msg.indexOf('Error') >= 0 ? '#c62828' : '#0d904f', marginBottom: '15px', padding: '10px', background: msg.indexOf('Error') >= 0 ? '#ffebee' : '#e8f5e9', borderRadius: '6px' }}>{msg}</p>}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={function() { setShowForm(!showForm); setEditData(null); setFormData(EMPTY); }} className="btn btn-primary" style={{ padding: '10px 20px' }}>{showForm ? 'Cancel' : '+ Register Student'}</button>
        <button onClick={generatePaycodes} className="btn btn-secondary" style={{ padding: '10px 20px' }}>Generate Paycodes</button>
        <div style={{ flex: 1, minWidth: '200px' }}><input className="form-input" style={{ padding: '8px' }} value={searchTerm} onChange={function(e) { setSearchTerm(e.target.value); }} placeholder="Search by name or admission number..." /></div>
        <select className="form-input" style={{ maxWidth: '180px', padding: '8px' }} value={filterClass} onChange={function(e) { setFilterClass(e.target.value); }}><option value="">All Classes</option>{classes.map(function(c) { return <option key={c.id} value={c.id}>{c.name}</option>; })}</select>
      </div>
      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">{editData ? 'Edit Student' : 'Register New Student'}</div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div className="form-group"><label className="form-label">First Name *</label><input className="form-input" value={formData.first_name} onChange={function(e) { setFormData(function(p) { return { ...p, first_name: e.target.value }; }); }} required /></div>
                <div className="form-group"><label className="form-label">Last Name *</label><input className="form-input" value={formData.last_name} onChange={function(e) { setFormData(function(p) { return { ...p, last_name: e.target.value }; }); }} required /></div>
                <div className="form-group"><label className="form-label">Other Name</label><input className="form-input" value={formData.other_name} onChange={function(e) { setFormData(function(p) { return { ...p, other_name: e.target.value }; }); }} /></div>
                <div className="form-group"><label className="form-label">Gender *</label><select className="form-input" value={formData.gender} onChange={function(e) { setFormData(function(p) { return { ...p, gender: e.target.value }; }); }}><option value="M">Male</option><option value="F">Female</option></select></div>
                <div className="form-group"><label className="form-label">Date of Birth</label><input type="date" className="form-input" value={formData.date_of_birth} onChange={function(e) { setFormData(function(p) { return { ...p, date_of_birth: e.target.value }; }); }} /></div>
                <div className="form-group"><label className="form-label">Student Type</label><select className="form-input" value={formData.student_type} onChange={function(e) { setFormData(function(p) { return { ...p, student_type: e.target.value }; }); }}><option value="Day">Day</option><option value="Boarding">Boarding</option></select></div>
                <div className="form-group"><label className="form-label">Admission No</label><input className="form-input" value={formData.admission_number} onChange={function(e) { setFormData(function(p) { return { ...p, admission_number: e.target.value }; }); }} /></div>
                <div className="form-group"><label className="form-label">Class</label><select className="form-input" value={formData.class_id} onChange={function(e) { setFormData(function(p) { return { ...p, class_id: e.target.value }; }); }}><option value="">-- Select --</option>{classes.map(function(c) { return <option key={c.id} value={c.id}>{c.name}</option>; })}</select></div>
                <div className="form-group"><label className="form-label">Paycode</label><input className="form-input" value={formData.paycode} onChange={function(e) { setFormData(function(p) { return { ...p, paycode: e.target.value }; }); }} placeholder="Auto-generated if blank" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <div className="form-group"><label className="form-label">Guardian Name</label><input className="form-input" value={formData.guardian_name} onChange={function(e) { setFormData(function(p) { return { ...p, guardian_name: e.target.value }; }); }} /></div>
                <div className="form-group"><label className="form-label">Guardian Phone</label><input className="form-input" value={formData.guardian_phone} onChange={function(e) { setFormData(function(p) { return { ...p, guardian_phone: e.target.value }; }); }} /></div>
                <div className="form-group"><label className="form-label">Residence</label><input className="form-input" value={formData.residence} onChange={function(e) { setFormData(function(p) { return { ...p, residence: e.target.value }; }); }} /></div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '15px' }}>{saving ? 'Saving...' : 'Save Student'}</button>
            </form>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-header">Students ({students.length})</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Adm No</th><th>Class</th><th>Paycode</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {students.map(function(s, i) {
                var id = (s && s.id) ? s.id : i;
                return (
                  <tr key={id}>
                    <td style={{ fontWeight: '600' }}>{s.first_name} {s.last_name}</td>
                    <td>{s.admission_number || '-'}</td>
                    <td>{s.class_name || '-'}</td>
                    <td><code style={{ background: '#e8f5e9', padding: '2px 6px', borderRadius: '4px', color: '#0d904f', fontSize: '12px' }}>{s.paycode || 'N/A'}</code></td>
                    <td><span style={{ padding: '2px 8px', borderRadius: '4px', background: s.status === 'Active' ? '#e8f5e9' : '#ffebee', color: s.status === 'Active' ? '#0d904f' : '#d32f2f', fontSize: '11px' }}>{s.status}</span></td>
                    <td><button onClick={function() { handleEdit(s); }} style={{ color: '#1a73e8', border: 'none', background: 'none', cursor: 'pointer', marginRight: '8px' }}>Edit</button><button onClick={function() { handleDelete(s.id); }} style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

