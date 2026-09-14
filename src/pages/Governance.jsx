// FileName: src/pages/Governance.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Governance — SMC (School Management Committee), BOG, PTA members

import React, { useState, useEffect, useCallback, useRef } from 'react';

const MEMBER_TYPES = ['SMC', 'BOG', 'PTA'];

const EMPTY_FORM = {
  member_type: 'SMC',
  name: '',
  phone: '',
  position: '',
  status: 'Active'
};

export default function Governance() {
  // ─── State variables ──────────────────────────────────────
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  // ─── Refs ───────────────────────────────────────────────
  const mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Load members ────────────────────────────────────────
  const load = useCallback(async function () {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    try {
      var r = await window.electronAPI.queryDatabase(
        "SELECT id, member_type, name, phone, position, status, created_at FROM governance_members ORDER BY id DESC"
      );
      if (!mountedRef.current) return;

      if (r && r.success && Array.isArray(r.data)) {
        setMembers(r.data);
      } else {
        setMembers([]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Governance: load error:', (e && e.message) ? e.message : 'Unknown');
      setMembers([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(function () {
    load();
  }, [load]);

  // ─── Handle form submit ───────────────────────────────────
  const handleSubmit = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    if (!form.name || !form.name.trim()) {
      setMsg('⚠️ Member name is required');
      return;
    }
    if (!form.member_type) {
      setMsg('⚠️ Member type is required');
      return;
    }

    setSaving(true);
    setMsg('');

    try {
      var r = await window.electronAPI.queryDatabase(
        "INSERT INTO governance_members (member_type, name, phone, position, status) VALUES (?, ?, ?, ?, ?)",
        [
          form.member_type,
          form.name.trim(),
          form.phone || '',
          form.position || '',
          form.status || 'Active'
        ]
      );
      if (!mountedRef.current) return;

      if (r && r.success) {
        setMsg('✅ Member saved successfully!');
        setForm(EMPTY_FORM);
        load();
      } else {
        var errMsg = (r && r.error) ? r.error : 'Failed to save';
        setMsg('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      var errCatch = (e && e.message) ? e.message : 'Unknown error';
      console.error('Governance: submit error:', errCatch);
      setMsg('❌ Error: ' + errCatch);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 4000);
  };

  // ─── Delete member ────────────────────────────────────────
  const handleDelete = async function (id, name) {
    if (!confirm('Delete governance member "' + (name || 'Unknown') + '"?')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM governance_members WHERE id = ?", [id]
      );
      if (!mountedRef.current) return;
      setMsg('🗑️ Member deleted');
      load();
    } catch (e) {
      if (!mountedRef.current) return;
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error deleting: ' + errMsg);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 3000);
  };

  // ─── Derived values (all with null checks) ───────────────
  var smcCount = members.filter(function (m) { return m && m.member_type === 'SMC'; }).length;
  var bogCount = members.filter(function (m) { return m && m.member_type === 'BOG'; }).length;
  var ptaCount = members.filter(function (m) { return m && m.member_type === 'PTA'; }).length;
  var activeCount = members.filter(function (m) { return m && m.status === 'Active'; }).length;

  // ─── Filtered members ─────────────────────────────────────
  var filteredMembers = members.filter(function (m) {
    if (!m) return false;
    if (filterType && m.member_type !== filterType) return false;
    if (searchTerm && searchTerm.trim()) {
      var name = ((m.name || '') + ' ' + (m.position || '')).toLowerCase();
      return name.indexOf(searchTerm.toLowerCase().trim()) >= 0;
    }
    return true;
  });

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">🏛️ Governance (SMC/BOG/PTA)</h1>
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
            <p style={{ color: '#666' }}>Loading governance members...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🏛️ Governance (SMC/BOG/PTA)</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: (msg.indexOf('❌') >= 0) ? '#c62828' :
            (msg.indexOf('⚠️') >= 0) ? '#e65100' : '#0d904f',
          marginBottom: '15px', padding: '10px 14px',
          background: (msg.indexOf('❌') >= 0) ? '#ffebee' :
            (msg.indexOf('⚠️') >= 0) ? '#fff3e0' : '#e8f5e9',
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Summary Cards ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px', marginBottom: '20px'
      }}>
        <div style={{ background: '#e8f0fe', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>{members.length}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Members</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d904f' }}>{activeCount}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Active</div>
        </div>
        <div style={{ background: '#fff3e0', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65100' }}>{smcCount}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>SMC</div>
        </div>
        <div style={{ background: '#f3e5f5', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7b1fa2' }}>{bogCount}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>BOG</div>
        </div>
        <div style={{ background: '#e3f2fd', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1565c0' }}>{ptaCount}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>PTA</div>
        </div>
      </div>

      {/* ─── Add Member Form ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">➕ Add Governance Member</div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={form.member_type}
                  onChange={function (e) { setForm({ ...form, member_type: e.target.value }); }}>
                  {MEMBER_TYPES.map(function (t) { return <option key={t} value={t}>{t}</option>; })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name}
                  onChange={function (e) { setForm({ ...form, name: e.target.value }); }}
                  required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone}
                  onChange={function (e) { setForm({ ...form, phone: e.target.value }); }}
                  placeholder="077X XXX XXX" />
              </div>
              <div className="form-group">
                <label className="form-label">Position</label>
                <input className="form-input" value={form.position}
                  onChange={function (e) { setForm({ ...form, position: e.target.value }); }}
                  placeholder="e.g. Chairperson, Secretary" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}
              style={{ marginTop: '15px' }}>
              {saving ? '⏳ Saving...' : '💾 Save Member'}
            </button>
          </form>
        </div>
      </div>

      {/* ─── Search & Filter ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '12px', top: '50%',
                transform: 'translateY(-50%)', color: '#9aa0a6'
              }}>🔍</span>
              <input
                className="form-input"
                style={{ paddingLeft: '38px' }}
                value={searchTerm}
                onChange={function (e) { setSearchTerm(e.target.value); }}
                placeholder="Search by name or position..."
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <select className="form-input" value={filterType}
                onChange={function (e) { setFilterType(e.target.value); }}>
                <option value="">All Types</option>
                {MEMBER_TYPES.map(function (t) { return <option key={t} value={t}>{t}</option>; })}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Members Table ────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          📋 Members ({filteredMembers.length})
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {filteredMembers.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              {searchTerm || filterType ? 'No members matching your filters' : 'No governance members yet'}
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Position</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(function (m, i) {
                  var id = (m && m.id) ? m.id : i;
                  var name = (m && m.name) ? m.name : '-';
                  var memberType = (m && m.member_type) ? m.member_type : '-';
                  var position = (m && m.position) ? m.position : '-';
                  var phone = (m && m.phone) ? m.phone : '-';
                  var status = (m && m.status) ? m.status : 'Active';

                  // Type badge colors
                  var typeBg = '#f1f3f4';
                  var typeColor = '#5f6368';
                  if (memberType === 'SMC') { typeBg = '#fff3e0'; typeColor = '#e65100'; }
                  else if (memberType === 'BOG') { typeBg = '#f3e5f5'; typeColor = '#7b1fa2'; }
                  else if (memberType === 'PTA') { typeBg = '#e3f2fd'; typeColor = '#1565c0'; }

                  return (
                    <tr key={id}>
                      <td style={{ fontWeight: '600' }}>{name}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: typeBg, color: typeColor,
                          fontSize: '11px', fontWeight: '600'
                        }}>
                          {memberType}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>{position || '-'}</td>
                      <td style={{ fontSize: '12px' }}>{phone || '-'}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: status === 'Active' ? '#e8f5e9' : '#ffebee',
                          color: status === 'Active' ? '#0d904f' : '#d32f2f',
                          fontSize: '11px', fontWeight: '600'
                        }}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={function () { handleDelete(id, name); }}
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