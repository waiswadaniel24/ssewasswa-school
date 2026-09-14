// FileName: src/pages/Latrines.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Latrines & sanitation — stance counts, handwashing, condition per year

import React, { useState, useEffect, useCallback, useRef } from 'react';

const ALLOWED_COLUMNS = [
  'academic_year_id', 'stance_type', 'latrine_type',
  'number_of_stances', 'is_functional', 'has_handwashing',
  'condition_text', 'remarks'
];

const EMPTY_FORM = {
  academic_year_id: '',
  stance_type: 'Boys',
  latrine_type: 'VIP',
  number_of_stances: 0,
  is_functional: 1,
  has_handwashing: 0,
  condition_text: 'Good',
  remarks: ''
};

const STANCE_TYPES = ['Boys', 'Girls', 'Teachers'];
const LATRINE_TYPES = ['VIP', 'Pit Latrine', 'Flush', 'Ecosan', 'Urine Diverting'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];

export default function Latrines() {
  const [records, setRecords] = useState([]);
  const [years, setYears] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
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
          setForm(function (prev) {
            return { ...prev, academic_year_id: current ? current.id : r.data[0].id };
          });
        }
      } catch (e) {
        console.error('Latrines: load years error:', (e && e.message) ? e.message : 'Unknown');
      }
    };
    loadYears();
  }, []);

  // ─── Load records when academic year changes ───────────────
  const loadRecords = useCallback(async function () {
    var yearId = (form && form.academic_year_id) ? form.academic_year_id : '';
    if (!yearId || !window.electronAPI || !window.electronAPI.queryDatabase) return;

    setLoading(true);

    try {
      var r = await window.electronAPI.queryDatabase(
        "SELECT l.id, l.academic_year_id, l.stance_type, l.latrine_type, " +
        "l.number_of_stances, l.is_functional, l.has_handwashing, " +
        "l.condition_text, l.remarks, ay.year_name " +
        "FROM latrines l " +
        "JOIN academic_years ay ON l.academic_year_id = ay.id " +
        "WHERE l.academic_year_id = ? " +
        "ORDER BY l.id DESC",
        [yearId]
      );
      if (!mountedRef.current) return;
      if (r && r.success && Array.isArray(r.data)) {
        setRecords(r.data);
      } else {
        setRecords([]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Latrines: load records error:', (e && e.message) ? e.message : 'Unknown');
      setRecords([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [form]);

  useEffect(function () {
    loadRecords();
  }, [loadRecords]);

  // ─── Handle save (FIXED: no SQL injection) ─────────────────
  const handleSave = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.academic_year_id) { setMsg('⚠️ Select an academic year'); return; }
    if (!form.stance_type) { setMsg('⚠️ Stance type is required'); return; }

    setSaving(true);
    setMsg('⏳ Saving...');

    try {
      var d = { ...form };

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

      // Check if record already exists for this year + stance_type
      var exRes = await window.electronAPI.queryDatabase(
        "SELECT id FROM latrines WHERE academic_year_id = ? AND stance_type = ?",
        [form.academic_year_id, form.stance_type]
      );
      if (!mountedRef.current) return;

      if (exRes && exRes.success && exRes.data && exRes.data.length > 0 && exRes.data[0]) {
        // UPDATE — FIXED: uses ? placeholder for id
        var setClause = cols.map(function (c) { return c + ' = ?'; }).join(', ');
        var updateVals = vals.slice();
        updateVals.push(exRes.data[0].id);

        await window.electronAPI.queryDatabase(
          "UPDATE latrines SET " + setClause + " WHERE id = ?",
          updateVals
        );
      } else {
        // INSERT
        var placeholders = cols.map(function () { return '?'; }).join(', ');
        await window.electronAPI.queryDatabase(
          "INSERT INTO latrines (" + cols.join(', ') + ") VALUES (" + placeholders + ")",
          vals
        );
      }

      if (!mountedRef.current) return;
      setMsg('✅ Latrine record saved!');
      setForm(function (prev) {
        return { ...EMPTY_FORM, academic_year_id: prev.academic_year_id };
      });
      loadRecords();
    } catch (e) {
      if (!mountedRef.current) return;
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('Latrines: save error:', errMsg);
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
    setForm(function (prev) { return { ...prev, [key]: parseInt(val) || 0 }; });
  };
  var setText = function (key, val) {
    setForm(function (prev) { return { ...prev, [key]: val }; });
  };
  var vBool = function (key, checked) {
    setForm(function (prev) { return { ...prev, [key]: checked ? 1 : 0 }; });
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading && records.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">🚻 Latrines & Sanitation</h1>
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
            <p style={{ color: '#666' }}>Loading latrine records...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🚻 Latrines & Sanitation</h1>

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

      {/* ─── Add/Edit Form ──────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">➕ Add Latrine Record</div>
        <div className="card-body">
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <select className="form-input" value={(form && form.academic_year_id) ? form.academic_year_id : ''}
                  onChange={function (e) { setText('academic_year_id', e.target.value); }}>
                  <option value="">Select</option>
                  {years.map(function (y) { return <option key={y.id} value={y.id}>{y.year_name}</option>; })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Stance Type *</label>
                <select className="form-input" value={(form && form.stance_type) ? form.stance_type : 'Boys'}
                  onChange={function (e) { setText('stance_type', e.target.value); }} required>
                  {STANCE_TYPES.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Latrine Type</label>
                <select className="form-input" value={(form && form.latrine_type) ? form.latrine_type : 'VIP'}
                  onChange={function (e) { setText('latrine_type', e.target.value); }}>
                  {LATRINE_TYPES.map(function (t) { return <option key={t} value={t}>{t}</option>; })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Number of Stances</label>
                <input type="number" className="form-input"
                  value={(form && form.number_of_stances !== undefined) ? form.number_of_stances : 0}
                  onChange={function (e) { v('number_of_stances', e.target.value); }} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Condition</label>
                <select className="form-input" value={(form && form.condition_text) ? form.condition_text : 'Good'}
                  onChange={function (e) { setText('condition_text', e.target.value); }}>
                  {CONDITIONS.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input className="form-input" value={(form && form.remarks) ? form.remarks : ''}
                  onChange={function (e) { setText('remarks', e.target.value); }} />
              </div>
            </div>

            {/* ─── Checkboxes ──────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={(form && form.is_functional) ? true : false}
                  onChange={function (e) { vBool('is_functional', e.target.checked); }}
                  style={{ width: '20px', height: '20px' }} />
                <label>Functional</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={(form && form.has_handwashing) ? true : false}
                  onChange={function (e) { vBool('has_handwashing', e.target.checked); }}
                  style={{ width: '20px', height: '20px' }} />
                <label>Has Handwashing Facility</label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}
              style={{ marginTop: '15px' }}>
              {saving ? '⏳ Saving...' : '💾 Save Record'}
            </button>
          </form>
        </div>
      </div>

      {/* ─── Records Table ────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">📋 Records ({records.length})</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {records.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              No latrine records for this academic year
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Stance Type</th>
                  <th>Latrine Type</th>
                  <th>Stances</th>
                  <th>Functional</th>
                  <th>Handwashing</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody>
                {records.map(function (r, i) {
                  var id = (r && r.id) ? r.id : i;
                  var yearName = (r && r.year_name) ? r.year_name : '-';
                  var stanceType = (r && r.stance_type) ? r.stance_type : '-';
                  var latrineType = (r && r.latrine_type) ? r.latrine_type : '-';
                  var stances = (r && r.number_of_stances !== undefined && r.number_of_stances !== null) ? Number(r.number_of_stances) : 0;
                  var isFunc = (r && r.is_functional) ? true : false;
                  var hasHw = (r && r.has_handwashing) ? true : false;
                  var cond = (r && r.condition_text) ? r.condition_text : '-';

                  return (
                    <tr key={id}>
                      <td style={{ fontSize: '12px' }}>{yearName}</td>
                      <td style={{ fontWeight: '600' }}>{stanceType}</td>
                      <td style={{ fontSize: '12px' }}>{latrineType}</td>
                      <td>{stances}</td>
                      <td>{isFunc ? '✅ Yes' : '❌ No'}</td>
                      <td>{hasHw ? '✅ Yes' : '❌ No'}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: (cond === 'Good' || cond === 'Excellent') ? '#e8f5e9' :
                            (cond === 'Fair') ? '#fff3e0' : '#ffebee',
                          color: (cond === 'Good' || cond === 'Excellent') ? '#0d904f' :
                            (cond === 'Fair') ? '#e65100' : '#d32f2f',
                          fontSize: '12px', fontWeight: '600'
                        }}>
                          {cond}
                        </span>
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