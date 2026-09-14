// FileName: src/pages/Infrastructure.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Infrastructure — classrooms, water, power, ICT, furniture, condition

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Whitelist of allowed columns (prevents SQL injection via column names)
const ALLOWED_COLUMNS = [
  'academic_year_id', 'classrooms_permanent', 'classrooms_semi_permanent',
  'classrooms_temporary', 'classrooms_good', 'classrooms_fair',
  'classrooms_poor', 'classrooms_under_construction',
  'water_source', 'water_functional', 'power_source', 'power_functional',
  'has_computer_lab', 'number_of_computers', 'computers_functional',
  'has_internet', 'internet_type', 'has_library', 'library_capacity',
  'has_fence', 'fence_type', 'has_playground',
  'staff_houses', 'staff_houses_occupied',
  'desks_benches', 'desks_good', 'desks_fair', 'desks_poor',
  'overall_condition', 'remarks'
];

const EMPTY_FORM = {
  academic_year_id: '',
  classrooms_permanent: 0, classrooms_semi_permanent: 0, classrooms_temporary: 0,
  classrooms_good: 0, classrooms_fair: 0, classrooms_poor: 0, classrooms_under_construction: 0,
  water_source: '', water_functional: 1,
  power_source: '', power_functional: 1,
  has_computer_lab: 0, number_of_computers: 0, computers_functional: 0,
  has_internet: 0, internet_type: '',
  has_library: 0, library_capacity: 0,
  has_fence: 0, fence_type: '',
  has_playground: 0,
  staff_houses: 0, staff_houses_occupied: 0,
  desks_benches: 0, desks_good: 0, desks_fair: 0, desks_poor: 0,
  overall_condition: 'Fair', remarks: ''
};

const WATER_SOURCES = ['Tap Water', 'Borehole', 'Protected Well', 'Unprotected Well', 'Rainwater', 'River/Stream/Lake', 'Pond', 'Other', 'None'];
const POWER_SOURCES = ['Grid Electricity', 'Solar', 'Generator', 'Solar + Grid Hybrid', 'None'];
const INTERNET_TYPES = ['Fiber', '3G/4G/5G', 'Satellite', 'Dial-up', 'None'];
const FENCE_TYPES = ['Chain Link', 'Brick Wall', 'Concrete Wall', 'Hedge', 'Wooden Fence', 'None'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Very Poor'];

export default function Infrastructure() {
  const [years, setYears] = useState([]);
  const [selYear, setSelYear] = useState('');
  const [data, setData] = useState(EMPTY_FORM);
  const [records, setRecords] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Load academic years on mount ─────────────────────────
  useEffect(function () {
    const loadYears = async function () {
      if (!window.electronAPI || !window.electronAPI.emisGetAcademicYears) return;

      try {
        var r = await window.electronAPI.emisGetAcademicYears();
        if (!mountedRef.current) return;

        if (r && r.success && r.data && r.data.length > 0) {
          setYears(r.data);
          var current = r.data.find(function (y) {
            return y && (y.is_current === 1 || y.is_current === true);
          });
          setSelYear(current ? current.id : r.data[0].id);
        }
      } catch (e) {
        console.error('Infrastructure: load years error:', (e && e.message) ? e.message : 'Unknown');
      }
    };
    loadYears();
  }, []);

  // ─── Load records when year changes ────────────────────────
  const loadRecords = useCallback(async function () {
    if (!selYear || !window.electronAPI) return;

    setLoading(true);

    try {
      // Load existing infrastructure data
      var existing = null;
      if (window.electronAPI.emisGetInfrastructure) {
        try {
          var r = await window.electronAPI.emisGetInfrastructure(selYear);
          if (!mountedRef.current) return;
          if (r && r.success && r.data) {
            existing = r.data;
          }
        } catch (e) { /* ignore */ }
      }

      if (!mountedRef.current) return;

      if (existing) {
        // Load existing data into form
        var formData = { ...EMPTY_FORM };
        ALLOWED_COLUMNS.forEach(function (col) {
          if (existing[col] !== undefined && existing[col] !== null) {
            formData[col] = existing[col];
          }
        });
        formData.academic_year_id = selYear;
        setData(formData);
      } else {
        // Start with empty form
        setData({ ...EMPTY_FORM, academic_year_id: selYear });
      }

      // Load historical records
      try {
        var histRes = await window.electronAPI.queryDatabase(
          "SELECT i.id, i.academic_year_id, i.classrooms_permanent, i.classrooms_semi_permanent, " +
          "i.classrooms_temporary, i.water_source, i.power_source, i.number_of_computers, " +
          "i.overall_condition, ay.year_name " +
          "FROM infrastructure i " +
          "JOIN academic_years ay ON i.academic_year_id = ay.id " +
          "ORDER BY i.id DESC"
        );
        if (!mountedRef.current) return;
        if (histRes && histRes.success && Array.isArray(histRes.data)) {
          setRecords(histRes.data);
        }
      } catch (e) { /* ignore */ }

    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Infrastructure: load error:', (e && e.message) ? e.message : 'Unknown');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [selYear]);

  useEffect(function () {
    loadRecords();
  }, [loadRecords]);

  // ─── Handle save (FIXED: no SQL injection) ─────────────────
  const handleSave = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!selYear) {
      setMsg('⚠️ Please select an academic year');
      return;
    }

    setSaving(true);
    setMsg('⏳ Saving...');

    try {
      var d = { ...data, academic_year_id: selYear };

      // Build column list from whitelist
      var cols = ALLOWED_COLUMNS.filter(function (col) {
        return d[col] !== undefined && d[col] !== null;
      });
      var vals = cols.map(function (col) { return d[col]; });

      if (cols.length === 0) {
        setMsg('⚠️ No data to save');
        if (mountedRef.current) setSaving(false);
        return;
      }

      // Check if record already exists
      var exRes = await window.electronAPI.queryDatabase(
        "SELECT id FROM infrastructure WHERE academic_year_id = ? LIMIT 1",
        [selYear]
      );
      if (!mountedRef.current) return;

      if (exRes && exRes.success && exRes.data && exRes.data.length > 0 && exRes.data[0]) {
        // ─── UPDATE (FIXED: uses ? placeholder for id) ──
        var setClause = cols.map(function (c) { return c + ' = ?'; }).join(', ');
        var updateVals = vals.slice();
        updateVals.push(exRes.data[0].id);

        await window.electronAPI.queryDatabase(
          "UPDATE infrastructure SET " + setClause + " WHERE id = ?",
          updateVals
        );
      } else {
        // ─── INSERT ──────────────────────────────────────
        var placeholders = cols.map(function () { return '?'; }).join(', ');
        await window.electronAPI.queryDatabase(
          "INSERT INTO infrastructure (" + cols.join(', ') + ") VALUES (" + placeholders + ")",
          vals
        );
      }

      if (!mountedRef.current) return;
      setMsg('✅ Infrastructure data saved successfully!');
      loadRecords();
    } catch (e) {
      if (!mountedRef.current) return;
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('Infrastructure: save error:', errMsg);
      setMsg('❌ Error saving: ' + errMsg);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 4000);
  };

  // ─── Value setters ────────────────────────────────────────
  var v = function (key, val) {
    setData(function (prev) { return { ...prev, [key]: parseInt(val) || 0 }; });
  };
  var setText = function (key, val) {
    setData(function (prev) { return { ...prev, [key]: val }; });
  };
  var vBool = function (key, checked) {
    setData(function (prev) { return { ...prev, [key]: checked ? 1 : 0 }; });
  };

  // ─── Derived values ───────────────────────────────────────
  var totalClassrooms = (data.classrooms_permanent || 0) + (data.classrooms_semi_permanent || 0) + (data.classrooms_temporary || 0);
  var totalDesks = data.desks_benches || 0;
  var goodDesks = data.desks_good || 0;
  var deskCondition = totalDesks > 0 ? Math.round((goodDesks / totalDesks) * 100) : 0;

  // ─── Input generators ─────────────────────────────────────
  var ig = function (key, label) {
    var value = (data && data[key] !== undefined && data[key] !== null) ? data[key] : 0;
    return (
      <div className="form-group" key={key}>
        <label className="form-label">{label}</label>
        <input
          type="number"
          className="form-input"
          value={value}
          onChange={function (e) { v(key, e.target.value); }}
        />
      </div>
    );
  };

  var sel = function (key, label, opts) {
    var value = (data && data[key] !== undefined && data[key] !== null) ? data[key] : '';
    return (
      <div className="form-group" key={key}>
        <label className="form-label">{label}</label>
        <select
          className="form-input"
          value={value}
          onChange={function (e) { setText(key, e.target.value); }}
        >
          <option value="">Select...</option>
          {opts.map(function (o) { return <option key={o} value={o}>{o}</option>; })}
        </select>
      </div>
    );
  };

  var cb = function (key, label) {
    var checked = (data && data[key]) ? true : false;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }} key={key}>
        <input
          type="checkbox"
          checked={checked}
          onChange={function (e) { vBool(key, e.target.checked); }}
          style={{ width: '20px', height: '20px' }}
        />
        <label>{label}</label>
      </div>
    );
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">🏗️ Infrastructure</h1>
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
            <p style={{ color: '#666' }}>Loading infrastructure data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🏗️ Infrastructure</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: (msg.indexOf('❌') >= 0) ? '#c62828' :
            (msg.indexOf('⚠️') >= 0) ? '#e65100' :
              (msg.indexOf('⏳') >= 0) ? '#1a73e8' : '#0d904f',
          marginBottom: '15px', padding: '10px 14px',
          background: (msg.indexOf('❌') >= 0) ? '#ffebee' :
            (msg.indexOf('⚠️') >= 0) ? '#fff3e0' :
              (msg.indexOf('⏳') >= 0) ? '#e8f0fe' : '#e8f5e9',
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Year Selection ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Academic Year</label>
          <select className="form-input" value={selYear}
            onChange={function (e) { setSelYear(e.target.value); }}>
            {years.map(function (y) { return <option key={y.id} value={y.id}>{y.year_name}</option>; })}
          </select>
        </div>
        <button onClick={loadRecords} className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }} disabled={!selYear || loading}>
          {loading ? '⏳' : '🔄 Load / Refresh'}
        </button>
      </div>

      {/* ─── Form ───────────────────────────────────────────── */}
      <form onSubmit={handleSave}>
        {/* ── Classrooms ─────────────────────────────────── */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">🏫 Classrooms</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
              {ig('classrooms_permanent', 'Permanent Classrooms')}
              {ig('classrooms_semi_permanent', 'Semi-permanent')}
              {ig('classrooms_temporary', 'Temporary Classrooms')}
              {ig('classrooms_good', 'Good Condition')}
              {ig('classrooms_fair', 'Fair Condition')}
              {ig('classrooms_poor', 'Poor Condition')}
              {ig('classrooms_under_construction', 'Under Construction')}
            </div>
            <div style={{ marginTop: '15px', padding: '10px', background: '#e8f0fe', borderRadius: '4px', fontWeight: 'bold' }}>
              Total Classrooms: {totalClassrooms}
            </div>
          </div>
        </div>

        {/* ── Utilities ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          <div className="card">
            <div className="card-header">💧 Water</div>
            <div className="card-body">
              {sel('water_source', 'Water Source', WATER_SOURCES)}
              {cb('water_functional', 'Water Functional')}
            </div>
          </div>
          <div className="card">
            <div className="card-header">⚡ Power</div>
            <div className="card-body">
              {sel('power_source', 'Power Source', POWER_SOURCES)}
              {cb('power_functional', 'Power Functional')}
            </div>
          </div>
          <div className="card">
            <div className="card-header">🖥️ ICT</div>
            <div className="card-body">
              {cb('has_computer_lab', 'Computer Lab')}
              {ig('number_of_computers', 'Number of Computers')}
              {ig('computers_functional', 'Functional Computers')}
              {cb('has_internet', 'Internet Available')}
              {sel('internet_type', 'Internet Type', INTERNET_TYPES)}
            </div>
          </div>
        </div>

        {/* ── Facilities ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '15px' }}>
          {cb('has_library', 'Has Library')}
          {ig('library_capacity', 'Library Capacity')}
          {cb('has_fence', 'Has Fence')}
          {sel('fence_type', 'Fence Type', FENCE_TYPES)}
          {cb('has_playground', 'Has Playground')}
          {ig('staff_houses', 'Staff Houses')}
          {ig('staff_houses_occupied', 'Occupied Staff Houses')}
        </div>

        {/* ── Furniture ──────────────────────────────────── */}
        <div className="card" style={{ marginBottom: '20px', marginTop: '15px' }}>
          <div className="card-header">🪑 Furniture (Desks/Benches)</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
              {ig('desks_benches', 'Total Desks/Benches')}
              {ig('desks_good', 'Good Condition')}
              {ig('desks_fair', 'Fair Condition')}
              {ig('desks_poor', 'Poor Condition')}
            </div>
            <div style={{
              marginTop: '15px', padding: '10px',
              background: deskCondition >= 70 ? '#e8f5e9' : (deskCondition >= 40 ? '#fff3e0' : '#ffebee'),
              borderRadius: '4px', fontWeight: 'bold'
            }}>
              Desk Condition: {deskCondition}% good ({deskCondition >= 70 ? '✅ Good' : (deskCondition >= 40 ? '⚠️ Fair' : '❌ Poor')})
            </div>
          </div>
        </div>

        {/* ── Overall Condition ───────────────────────────── */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">📊 Overall Condition</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
              {sel('overall_condition', 'Overall Condition', CONDITIONS)}
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={(data && data.remarks) ? data.remarks : ''}
                  onChange={function (e) { setText('remarks', e.target.value); }}
                />
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}
          style={{ fontSize: '16px', padding: '12px 24px', marginBottom: '20px' }}>
          {saving ? '⏳ Saving...' : '💾 Save Infrastructure Data'}
        </button>
      </form>

      {/* ─── Historical Records ─────────────────────────────── */}
      {records.length > 0 && (
        <div className="card">
          <div className="card-header">📋 Historical Records ({records.length})</div>
          <div className="card-body" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Classrooms</th>
                  <th>Water</th>
                  <th>Power</th>
                  <th>Computers</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody>
                {records.map(function (r, i) {
                  var id = (r && r.id) ? r.id : i;
                  var yearName = (r && r.year_name) ? r.year_name : '-';
                  var perm = (r && r.classrooms_permanent) ? Number(r.classrooms_permanent) : 0;
                  var semi = (r && r.classrooms_semi_permanent) ? Number(r.classrooms_semi_permanent) : 0;
                  var temp = (r && r.classrooms_temporary) ? Number(r.classrooms_temporary) : 0;
                  var tc = perm + semi + temp;
                  var water = (r && r.water_source) ? r.water_source : '-';
                  var power = (r && r.power_source) ? r.power_source : '-';
                  var comps = (r && r.number_of_computers) ? Number(r.number_of_computers) : 0;
                  var cond = (r && r.overall_condition) ? r.overall_condition : '-';

                  return (
                    <tr key={id}>
                      <td style={{ fontWeight: 'bold' }}>{yearName}</td>
                      <td>{tc}</td>
                      <td style={{ fontSize: '12px' }}>{water}</td>
                      <td style={{ fontSize: '12px' }}>{power}</td>
                      <td>{comps}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: (cond === 'Good' || cond === 'Excellent') ? '#e8f5e9' : '#fff3e0',
                          color: (cond === 'Good' || cond === 'Excellent') ? '#0d904f' : '#e65100'
                        }}>
                          {cond}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}