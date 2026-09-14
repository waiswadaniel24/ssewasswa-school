// FileName: src/pages/GateBook.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Digital gate / visitor book — sign in, sign out, visitor history

import React, { useState, useEffect, useCallback, useRef } from 'react';

const EMPTY_FORM = {
  id: null, name: '', phone: '', purpose: '', person_to_see: '',
  time_in: '', time_out: '', date: ''
};

// Format time consistently (HH:MM)
function getCurrentTime() {
  var now = new Date();
  var h = String(now.getHours()).padStart(2, '0');
  var m = String(now.getMinutes()).padStart(2, '0');
  return h + ':' + m;
}

// Format date consistently (YYYY-MM-DD)
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

export default function GateBook() {
  // ─── State variables with proper defaults ──────────────
  const [visitors, setVisitors] = useState([]);
  const [formData, setFormData] = useState({
    ...EMPTY_FORM,
    time_in: getCurrentTime(),
    date: getCurrentDate()
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ─── Refs ───────────────────────────────────────────────
  const mountedRef = useRef(true);
  const searchTimerRef = useRef(null);

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Fetch visitors ──────────────────────────────────────
  const fetchVisitors = useCallback(async function (search) {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let query = "SELECT id, name, phone, purpose, person_to_see, time_in, time_out, date FROM visitors";
      const params = [];

      if (search && search.trim()) {
        query += " WHERE name LIKE ? OR purpose LIKE ? OR person_to_see LIKE ? OR phone LIKE ?";
        const st = '%' + search.trim() + '%';
        params.push(st, st, st, st);
      }

      query += " ORDER BY id DESC LIMIT 50";

      const r = await window.electronAPI.queryDatabase(query, params);

      if (!mountedRef.current) return;

      if (r && r.success && Array.isArray(r.data)) {
        setVisitors(r.data);
      } else {
        setVisitors([]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('GateBook: fetch error:', errMsg);
      setMsg('❌ Error loading visitors: ' + errMsg);
      setVisitors([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ─── Initial load ────────────────────────────────────────
  useEffect(function () {
    fetchVisitors('');
  }, [fetchVisitors]);

  // ─── Debounced search ────────────────────────────────────
  useEffect(function () {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(function () {
      fetchVisitors(searchTerm);
    }, 300);
    return function () {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm, fetchVisitors]);

  // ─── Handle form submit (sign in or sign out) ────────────
  const handleSubmit = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    setMsg('');

    if (formData.id) {
      // ─── SIGN OUT mode ──────────────────────────────
      setSaving(true);

      try {
        const result = await window.electronAPI.queryDatabase(
          "UPDATE visitors SET time_out = ? WHERE id = ?",
          [getCurrentTime(), formData.id]
        );

        if (!mountedRef.current) return;

        if (result && result.success) {
          setMsg('✅ ' + (formData.name || 'Visitor') + ' signed out at ' + getCurrentTime());
          setFormData({ ...EMPTY_FORM, time_in: getCurrentTime(), date: getCurrentDate() });
          fetchVisitors(searchTerm);
        } else {
          const errMsg = (result && result.error) ? result.error : 'Failed to sign out';
          setMsg('❌ ' + errMsg);
        }
      } catch (e) {
        if (!mountedRef.current) return;
        const errMsg = (e && e.message) ? e.message : 'Unknown error';
        setMsg('❌ Error signing out: ' + errMsg);
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    } else {
      // ─── SIGN IN mode (new visitor) ────────────────
      if (!formData.name || !formData.name.trim()) {
        setMsg('⚠️ Visitor name is required');
        return;
      }
      if (!formData.person_to_see || !formData.person_to_see.trim()) {
        setMsg('⚠️ "Person to see" is required');
        return;
      }

      setSaving(true);

      try {
        const result = await window.electronAPI.queryDatabase(
          "INSERT INTO visitors (name, phone, purpose, person_to_see, time_in, date) VALUES (?, ?, ?, ?, ?, ?)",
          [
            formData.name.trim(),
            formData.phone || '',
            formData.purpose || '',
            formData.person_to_see.trim(),
            formData.time_in || getCurrentTime(),
            formData.date || getCurrentDate()
          ]
        );

        if (!mountedRef.current) return;

        if (result && result.success) {
          setMsg('✅ ' + formData.name.trim() + ' signed in at ' + (formData.time_in || getCurrentTime()));
          setFormData({ ...EMPTY_FORM, time_in: getCurrentTime(), date: getCurrentDate() });
          fetchVisitors(searchTerm);
        } else {
          const errMsg = (result && result.error) ? result.error : 'Failed to log visitor';
          setMsg('❌ ' + errMsg);
        }
      } catch (e) {
        if (!mountedRef.current) return;
        const errMsg = (e && e.message) ? e.message : 'Unknown error';
        setMsg('❌ Error: ' + errMsg);
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 4000);
  };

  // ─── Sign out visitor (populate form for sign-out confirmation) ──
  const handleSignOut = function (v) {
    if (!v) return;
    setFormData({
      id: v.id || null,
      name: v.name || '',
      phone: v.phone || '',
      purpose: v.purpose || '',
      person_to_see: v.person_to_see || '',
      time_in: v.time_in || '',
      time_out: getCurrentTime(),
      date: v.date || getCurrentDate()
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Cancel sign-out (reset to sign-in mode) ──────────────
  const handleCancelSignOut = function () {
    setFormData({ ...EMPTY_FORM, time_in: getCurrentTime(), date: getCurrentDate() });
  };

  // ─── Delete visitor record ───────────────────────────────
  const handleDelete = async function (id, name) {
    if (!confirm('Delete visitor record for "' + (name || 'Unknown') + '"?')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM visitors WHERE id = ?", [id]
      );

      if (!mountedRef.current) return;
      setMsg('🗑️ Visitor record deleted');
      fetchVisitors(searchTerm);
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error deleting: ' + errMsg);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 3000);
  };

  // ─── Derived values (all with null checks) ───────────────
  var todayDate = getCurrentDate();
  var todayVisitors = visitors.filter(function (v) {
    return v && v.date === todayDate;
  });
  var activeInside = visitors.filter(function (v) {
    return v && (!v.time_out || v.time_out === '' || v.time_out === null);
  });
  var signedOut = visitors.filter(function (v) {
    return v && v.time_out && v.time_out !== '' && v.time_out !== null;
  });

  // ─── Loading state ──────────────────────────────────────
  if (loading && visitors.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">📋 Digital Gate / Visitor Book</h1>
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
            <p style={{ color: '#666' }}>Loading visitors...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // Determine if form is in sign-out mode
  var isSignOutMode = formData.id !== null && formData.id !== undefined;

  return (
    <div className="page-container">
      <h1 className="page-title">📋 Digital Gate / Visitor Book</h1>

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
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '12px', marginBottom: '20px'
      }}>
        <div style={{ background: '#e8f0fe', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>{todayVisitors.length}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Todays Visitors</div>
        </div>
        <div style={{ background: '#fff3e0', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65100' }}>{activeInside.length}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>🟢 Still Inside</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d904f' }}>{signedOut.length}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>✅ Signed Out</div>
        </div>
      </div>

      {/* ─── Sign In / Sign Out Form ─────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px', border: isSignOutMode ? '2px solid #fff3e0' : '2px solid #e8f0fe' }}>
        <div className="card-header" style={{ background: isSignOutMode ? '#fff3e0' : '#e8f0fe' }}>
          {isSignOutMode
            ? '🚪 Sign Out: ' + (formData.name || 'Visitor')
            : '✍️ Log New Visitor'}
          {isSignOutMode && (
            <button
              onClick={handleCancelSignOut}
              style={{
                float: 'right', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '14px', color: '#666'
              }}
            >
              × Cancel Sign-Out
            </button>
          )}
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {!isSignOutMode && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    className="form-input"
                    value={formData.name}
                    onChange={function (e) { setFormData({ ...formData, name: e.target.value }); }}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={formData.phone}
                    onChange={function (e) { setFormData({ ...formData, phone: e.target.value }); }}
                    placeholder="077X XXX XXX"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">To See *</label>
                  <input
                    className="form-input"
                    value={formData.person_to_see}
                    onChange={function (e) { setFormData({ ...formData, person_to_see: e.target.value }); }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Purpose</label>
                  <input
                    className="form-input"
                    value={formData.purpose}
                    onChange={function (e) { setFormData({ ...formData, purpose: e.target.value }); }}
                  />
                </div>
              </div>
            )}

            {isSignOutMode && (
              <div style={{ background: '#f8f9fa', padding: '12px 16px', borderRadius: '6px', marginBottom: '15px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                  <strong>Visitor:</strong> {formData.name || 'Unknown'}
                </p>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#666' }}>
                  📞 Phone: {formData.phone || '-'} | 🎯 Purpose: {formData.purpose || '-'}
                </p>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#666' }}>
                  👤 To See: {formData.person_to_see || '-'}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                  ⏰ Time In: {formData.time_in || '-'} | 📅 Date: {formData.date || '-'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: isSignOutMode ? '0' : '15px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={isSignOutMode ? { background: '#e65100' } : { /* no-op */ }}
              >
                {saving ? '⏳ Processing...' :
                  isSignOutMode ? '🚪 Confirm Sign Out' : '✍️ Log Entry'}
              </button>
              {isSignOutMode && (
                <button
                  type="button"
                  onClick={handleCancelSignOut}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

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
              onChange={function (e) { setSearchTerm(e.target.value); }}
              placeholder="Search by name, purpose, person to see, or phone..."
            />
          </div>
        </div>
      </div>

      {/* ─── Recent Visitors Table ──────────────────────────── */}
      <div className="card">
        <div className="card-header">📋 Recent Visitors ({visitors.length})</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {visitors.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              {searchTerm ? 'No visitors matching your search' : 'No visitors logged yet'}
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>To See</th>
                  <th>Purpose</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map(function (v, i) {
                  var id = (v && v.id) ? v.id : i;
                  var date = (v && v.date) ? v.date : '-';
                  var name = (v && v.name) ? v.name : '-';
                  var phone = (v && v.phone) ? v.phone : '-';
                  var toSee = (v && v.person_to_see) ? v.person_to_see : '-';
                  var purpose = (v && v.purpose) ? v.purpose : '-';
                  var timeIn = (v && v.time_in) ? v.time_in : '-';
                  var timeOut = (v && v.time_out) ? v.time_out : '';
                  var isActive = !timeOut || timeOut === '';

                  return (
                    <tr key={id} style={{
                      background: isActive ? '#fff8e1' : 'transparent'
                    }}>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{date}</td>
                      <td style={{ fontWeight: '600' }}>{name}</td>
                      <td style={{ fontSize: '12px' }}>{phone}</td>
                      <td style={{ fontSize: '12px' }}>{toSee}</td>
                      <td style={{ fontSize: '12px' }}>{purpose}</td>
                      <td style={{ fontSize: '12px' }}>{timeIn}</td>
                      <td style={{
                        color: timeOut ? '#0d904f' : '#d32f2f',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {timeOut || '🟢 ACTIVE'}
                      </td>
                      <td>
                        {isActive && (
                          <button
                            onClick={function () { handleSignOut(v); }}
                            style={{
                              color: '#e65100', border: '1px solid #ffcc80',
                              background: '#fff3e0',
                              cursor: 'pointer', fontSize: '12px',
                              fontWeight: '600', padding: '3px 10px',
                              borderRadius: '4px'
                            }}
                          >
                            🚪 Sign Out
                          </button>
                        )}
                        {!isActive && (
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
                        )}
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
