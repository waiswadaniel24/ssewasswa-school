import React, { useState, useEffect, useCallback } from 'react';

var ROLES = [{ value: 'Super Admin', label: 'Super Admin', color: '#1a73e8' }, { value: 'Admin', label: 'Admin', color: '#0d904f' }, { value: 'Bursar', label: 'Bursar', color: '#e65100' }, { value: 'Teacher', label: 'Teacher', color: '#7b1fa2' }, { value: 'Staff', label: 'Staff', color: '#5f6368' }, { value: 'Viewer', label: 'Viewer', color: '#c2185b' }];

export default function Users() {
  var [users, setUsers] = useState([]);
  var [showForm, setShowForm] = useState(false);
  var [formData, setFormData] = useState({ username: '', password: '', role: 'Staff' });
  var [msg, setMsg] = useState('');
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);

  var fetchUsers = useCallback(async function() {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) { setLoading(false); return; }
    try {
      var r = await window.electronAPI.queryDatabase("SELECT id, username, role, created_at, last_login FROM users ORDER BY id");
      if (r && r.success) setUsers(r.data || []);
    } catch (e) { setUsers([]); }
    setLoading(false);
  }, []);

  useEffect(function() { fetchUsers(); }, [fetchUsers]);

  var handleAdd = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    setMsg('');
    if (!formData.username.trim()) { setMsg('Username required'); return; }
    if (!formData.password || formData.password.length < 8) { setMsg('Password must be 8+ chars'); return; }
    if (!/[A-Za-z]/.test(formData.password) || !/\d/.test(formData.password)) { setMsg('Password needs letters AND numbers'); return; }
    setSaving(true);
    try {
      var res = await window.electronAPI.addUser(formData);
      if (res && res.success) {
        setMsg('User added: ' + formData.username);
        setShowForm(false); setFormData({ username: '', password: '', role: 'Staff' });
        fetchUsers();
      } else { setMsg('Error: ' + ((res && res.error) ? res.error : 'Failed')); }
    } catch (err) { setMsg('Error: ' + err.message); }
    setSaving(false);
  };

  var handleDelete = async function(id, username, role) {
    if (role === 'Super Admin') { setMsg('Cannot delete Super Admin'); return; }
    if (!confirm('Delete ' + username + '?')) return;
    await window.electronAPI.queryDatabase("DELETE FROM users WHERE id=?", [id]);
    setMsg('Deleted: ' + username); fetchUsers();
  };

  if (loading) return React.createElement('div', { className: 'page-container' }, React.createElement('h1', { className: 'page-title' }, 'User Management'), React.createElement('p', null, 'Loading...'));

  return (
    <div className="page-container">
      <h1 className="page-title">User Management</h1>
      {msg && <p style={{ color: msg.indexOf('Error') >= 0 ? '#c62828' : msg.indexOf('Cannot') >= 0 ? '#c62828' : '#0d904f', marginBottom: '15px', padding: '10px 14px', background: msg.indexOf('Error') >= 0 || msg.indexOf('Cannot') >= 0 ? '#ffebee' : '#e8f5e9', borderRadius: '6px' }}>{msg}</p>}
      <button onClick={function() { setShowForm(!showForm); }} className="btn btn-primary" style={{ width: 'auto', marginBottom: '20px', padding: '10px 20px' }}>{showForm ? 'Cancel' : '+ Add User'}</button>
      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">Add New User</div>
          <div className="card-body">
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="form-group"><label className="form-label">Username *</label><input className="form-input" value={formData.username} onChange={function(e) { setFormData(function(p) { return { ...p, username: e.target.value }; }); }} required /></div>
              <div className="form-group"><label className="form-label">Password *</label><input type="password" className="form-input" value={formData.password} onChange={function(e) { setFormData(function(p) { return { ...p, password: e.target.value }; }); }} required /></div>
              <div className="form-group"><label className="form-label">Role</label><select className="form-input" value={formData.role} onChange={function(e) { setFormData(function(p) { return { ...p, role: e.target.value }; }); }}>{ROLES.map(function(r) { return <option key={r.value} value={r.value}>{r.label}</option>; })}</select></div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '25px' }} disabled={saving}>{saving ? 'Saving...' : 'Add User'}</button>
            </form>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-header">System Users ({users.length})</div>
        <div className="card-body">
          <table className="data-table">
            <thead><tr><th>Username</th><th>Role</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(function(u, i) {
                var id = (u && u.id) ? u.id : i;
                var username = (u && u.username) ? u.username : '-';
                var role = (u && u.role) ? u.role : 'Staff';
                var lastLogin = (u && u.last_login) ? String(u.last_login).slice(0, 19) : 'Never';
                var isSuper = role === 'Super Admin';
                var roleStyle = ROLES.find(function(r) { return r.value === role; }) || { color: '#5f6368' };
                return (
                  <tr key={id}>
                    <td style={{ fontWeight: '600' }}>{username}</td>
                    <td><span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', background: isSuper ? '#e8f0fe' : '#f1f3f4', color: roleStyle.color }}>{role}</span></td>
                    <td style={{ fontSize: '12px', color: '#999' }}>{lastLogin}</td>
                    <td>{!isSuper ? <button onClick={function() { handleDelete(id, username, role); }} style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Delete</button> : <span style={{ fontSize: '12px', color: '#999' }}>Protected</span>}</td>
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
