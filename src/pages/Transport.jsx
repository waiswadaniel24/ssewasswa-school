// FileName: src/pages/Transport.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Transport management — routes, drivers, vehicles, fees

import React, { useState, useEffect, useCallback, useRef } from 'react';

const EMPTY_FORM = {
  id: null, name: '', driver: '', phone: '',
  vehicle: '', capacity: 30, fee: 0
};

export default function Transport() {
  // ─── State variables with proper defaults ──────────────
  const [routes, setRoutes] = useState([]);
  const [routeForm, setRouteForm] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  // ─── Refs ───────────────────────────────────────────────
  const mountedRef = useRef(true);
  const searchTimerRef = useRef(null);

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Fetch routes (with optional search) ─────────────────
  const fetchData = useCallback(async function (search) {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let query = "SELECT id, name, driver, phone, vehicle, capacity, fee FROM transport_routes";
      const params = [];

      if (search && search.trim()) {
        query += " WHERE name LIKE ? OR driver LIKE ? OR vehicle LIKE ? OR phone LIKE ?";
        const st = '%' + search.trim() + '%';
        params.push(st, st, st, st);
      }

      query += " ORDER BY name";

      const r = await window.electronAPI.queryDatabase(query, params);

      if (!mountedRef.current) return;

      if (r && r.success && Array.isArray(r.data)) {
        setRoutes(r.data);
      } else {
        setRoutes([]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('Transport: fetch error:', errMsg);
      setMsg('❌ Error loading routes: ' + errMsg);
      setRoutes([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ─── Initial load ────────────────────────────────────────
  useEffect(function () {
    fetchData('');
  }, [fetchData]);

  // ─── Debounced search ────────────────────────────────────
  useEffect(function () {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(function () {
      fetchData(searchTerm);
    }, 300);
    return function () {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm, fetchData]);

  // ─── Handle form submit (add or edit) ─────────────────────
  const handleSaveRoute = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    // Validate
    if (!routeForm.name || !routeForm.name.trim()) {
      setMsg('⚠️ Route name is required');
      return;
    }

    setSaving(true);
    setMsg('');

    try {
      const capacity = parseInt(routeForm.capacity) || 30;
      const fee = parseFloat(routeForm.fee) || 0;

      let result;

      if (routeForm.id) {
        // Update
        result = await window.electronAPI.queryDatabase(
          "UPDATE transport_routes SET name = ?, driver = ?, phone = ?, vehicle = ?, capacity = ?, fee = ? WHERE id = ?",
          [
            routeForm.name.trim(),
            routeForm.driver || '',
            routeForm.phone || '',
            routeForm.vehicle || '',
            capacity,
            fee,
            routeForm.id
          ]
        );
      } else {
        // Insert
        result = await window.electronAPI.queryDatabase(
          "INSERT INTO transport_routes (name, driver, phone, vehicle, capacity, fee) VALUES (?, ?, ?, ?, ?, ?)",
          [
            routeForm.name.trim(),
            routeForm.driver || '',
            routeForm.phone || '',
            routeForm.vehicle || '',
            capacity,
            fee
          ]
        );
      }

      if (!mountedRef.current) return;

      if (result && result.success) {
        setMsg(routeForm.id ? '✅ Route updated!' : '✅ Route added!');
        setRouteForm(EMPTY_FORM);
        setShowForm(false);
        fetchData(searchTerm);
      } else {
        const errMsg = (result && result.error) ? result.error : 'Failed to save';
        setMsg('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 3000);
  };

  // ─── Delete route ─────────────────────────────────────────
  const handleDelete = async function (id, name) {
    if (!confirm('Delete route "' + (name || 'Unknown') + '"?\n\nStudents assigned to this route may need to be reassigned.')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM transport_routes WHERE id = ?", [id]
      );

      if (!mountedRef.current) return;
      setMsg('🗑️ Route deleted');
      fetchData(searchTerm);
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error deleting: ' + errMsg);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 3000);
  };

  // ─── Edit route (populate form) ──────────────────────────
  const handleEdit = function (route) {
    if (!route) return;
    setRouteForm({
      id: route.id || null,
      name: route.name || '',
      driver: route.driver || '',
      phone: route.phone || '',
      vehicle: route.vehicle || '',
      capacity: route.capacity || 30,
      fee: route.fee || 0
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Derived values (all with null checks) ───────────────
  const totalCapacity = routes.reduce(function (sum, r) {
    const cap = (r && r.capacity) ? Number(r.capacity) : 0;
    return sum + (isNaN(cap) ? 0 : cap);
  }, 0);

  const totalFees = routes.reduce(function (sum, r) {
    const fee = (r && r.fee) ? Number(r.fee) : 0;
    return sum + (isNaN(fee) ? 0 : fee);
  }, 0);

  // ─── Format currency safely ───────────────────────────────
  const formatUGX = function (amount) {
    const num = Number(amount) || 0;
    return 'UGX ' + num.toLocaleString();
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading && routes.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">🚌 Transport Management</h1>
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
            <p style={{ color: '#666' }}>Loading transport routes...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🚌 Transport Management</h1>

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
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>{routes.length}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Routes</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d904f' }}>{totalCapacity}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Capacity</div>
        </div>
        <div style={{ background: '#fff3e0', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#e65100' }}>{formatUGX(totalFees)}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Term Fees</div>
        </div>
      </div>

      {/* ─── Search + Add Button ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)', color: '#9aa0a6'
          }}>🔍</span>
          <input
            className="form-input"
            style={{ paddingLeft: '38px' }}
            value={searchTerm}
            onChange={function (e) { setSearchTerm(e.target.value); }}
            placeholder="Search by route name, driver, vehicle, or phone..."
          />
        </div>
        <button
          onClick={function () {
            setShowForm(!showForm);
            setRouteForm(EMPTY_FORM);
          }}
          className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showForm ? '❌ Cancel' : '➕ Add Route'}
        </button>
      </div>

      {/* ─── Add/Edit Form ──────────────────────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            {routeForm.id ? '✏️ Edit Route' : '➕ Add New Route'}
          </div>
          <div className="card-body">
            <form onSubmit={handleSaveRoute}>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div className="form-group">
                    <label className="form-label">Route Name *</label>
                    <input
                      className="form-input"
                      value={routeForm.name}
                      onChange={function (e) { setRouteForm({ ...routeForm, name: e.target.value }); }}
                      placeholder="e.g. Kampala - Wakiso"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Driver</label>
                    <input
                      className="form-input"
                      value={routeForm.driver}
                      onChange={function (e) { setRouteForm({ ...routeForm, driver: e.target.value }); }}
                      placeholder="Driver name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Driver Phone</label>
                    <input
                      className="form-input"
                      value={routeForm.phone}
                      onChange={function (e) { setRouteForm({ ...routeForm, phone: e.target.value }); }}
                      placeholder="077X XXX XXX"
                    />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div className="form-group">
                    <label className="form-label">Vehicle</label>
                    <input
                      className="form-input"
                      value={routeForm.vehicle}
                      onChange={function (e) { setRouteForm({ ...routeForm, vehicle: e.target.value }); }}
                      placeholder="Number plate (e.g. UAB 123X)"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Capacity</label>
                      <input
                        type="number"
                        className="form-input"
                        value={routeForm.capacity}
                        onChange={function (e) { setRouteForm({ ...routeForm, capacity: parseInt(e.target.value) || 30 }); }}
                        min="1"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Term Fee (UGX)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={routeForm.fee}
                        onChange={function (e) { setRouteForm({ ...routeForm, fee: parseFloat(e.target.value) || 0 }); }}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save Route'}
                </button>
                <button
                  type="button"
                  onClick={function () { setShowForm(false); setRouteForm(EMPTY_FORM); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Routes Table ────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">🚌 Routes ({routes.length})</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {routes.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              {searchTerm ? 'No routes matching your search' : 'No routes configured. Click "Add Route" to create one.'}
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Driver</th>
                  <th>Phone</th>
                  <th>Vehicle</th>
                  <th>Capacity</th>
                  <th>Term Fee</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {routes.map(function (r, i) {
                  const id = (r && r.id) ? r.id : i;
                  const name = (r && r.name) ? r.name : '-';
                  const driver = (r && r.driver) ? r.driver : '-';
                  const phone = (r && r.phone) ? r.phone : '-';
                  const vehicle = (r && r.vehicle) ? r.vehicle : '-';
                  const capacity = (r && r.capacity !== undefined && r.capacity !== null) ? Number(r.capacity) : 0;
                  const fee = (r && r.fee !== undefined && r.fee !== null) ? Number(r.fee) : 0;

                  return (
                    <tr key={id}>
                      <td style={{ fontWeight: '600' }}>{name}</td>
                      <td style={{ fontSize: '12px' }}>{driver}</td>
                      <td style={{ fontSize: '12px' }}>{phone}</td>
                      <td>
                        <span style={{
                          padding: '2px 6px', borderRadius: '4px',
                          background: '#e8f0fe', color: '#1a73e8',
                          fontSize: '11px', fontWeight: '600'
                        }}>
                          {vehicle}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: '#e8f5e9', color: '#0d904f',
                          fontSize: '12px', fontWeight: '600'
                        }}>
                          {capacity} seats
                        </span>
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#e65100' }}>
                        {formatUGX(fee)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={function () { handleEdit(r); }}
                            style={{ color: '#1a73e8', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={function () { handleDelete(id, name); }}
                            style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
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
          )}
        </div>
      </div>
    </div>
  );
}