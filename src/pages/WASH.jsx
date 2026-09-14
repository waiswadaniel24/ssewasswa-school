// FileName: src/pages/WASH.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: WASH — Water, Sanitation, Hygiene, deworming data per academic year

import React, { useState, useEffect, useCallback, useRef } from 'react';

const ALLOWED_COLUMNS = [
  'academic_year_id', 'water_source_type', 'water_treatment',
  'drinking_water_available', 'handwashing_stations', 'handwashing_with_soap',
  'menstrual_hygiene', 'waste_disposal', 'school_cleanliness',
  'deworming_done', 'last_deworming', 'remarks'
];

const EMPTY_FORM = {
  academic_year_id: '',
  water_source_type: '', water_treatment: 'None',
  drinking_water_available: 0, handwashing_stations: 0,
  handwashing_with_soap: 0, menstrual_hygiene: 0,
  waste_disposal: '', school_cleanliness: 'Good',
  deworming_done: 0, last_deworming: '', remarks: ''
};

const WATER_SOURCES = ['Tap Water', 'Borehole', 'Protected Well', 'Unprotected Well', 'Rainwater', 'None'];
const WATER_TREATMENTS = ['None', 'Boiling', 'Chlorination', 'Filtration', 'UV Treatment'];
const WASTE_DISPOSALS = ['Pit Latrine', 'Skip/Truck', 'Burning', 'Composting', 'Open Dump', 'Other'];
const CLEANLINESS_LEVELS = ['Excellent', 'Good', 'Fair', 'Poor'];

export default function WASH() {
  const [years, setYears] = useState([]);
  const [selYear, setSelYear] = useState('');
  const [data, setData] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Load academic years ──────────────────────────────────
  useEffect(function () {
    const loadYears = async function () {
      if (!window.electronAPI || !window.electronAPI.emisGetAcademicYears) return;
      try {
        var r = await window.electronAPI.emisGetAcademicYears();
        if (!mountedRef.current) return;
        if (r && r.success && r.data && r.data.length > 0) {
          setYears(r.data);
          var current = r.data.find(function (y) { return y && (y.is_current === 1 || y.is_current === true); });
          setSelYear(current ? current.id : r.data[0].id);
        }
      } catch (e) {
        console.error('WASH: load years error:', (e && e.message) ? e.message : 'Unknown');
      }
    };
    loadYears();
  }, []);

  // ─── Load existing data when year changes ─────────────────
  const loadData = useCallback(async function () {
    if (!selYear || !window.electronAPI || !window.electronAPI.queryDatabase) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Check if record exists
      var exRes = await window.electronAPI.queryDatabase(
        "SELECT id FROM wash_data WHERE academic_year_id = ?", [selYear]
      );
      if (!mountedRef.current) return;

      if (exRes && exRes.success && exRes.data && exRes.data.length > 0 && exRes.data[0]) {
        // Load existing record
        var detailRes = await window.electronAPI.queryDatabase(
          "SELECT id, academic_year_id, water_source_type, water_treatment, drinking_water_available, " +
          "handwashing_stations, handwashing_with_soap, menstrual_hygiene, waste_disposal, " +
          "school_cleanliness, deworming_done, last_deworming, remarks " +
          "FROM wash_data WHERE id = ?",
          [exRes.data[0].id]
        );
        if (!mountedRef.current) return;

        if (detailRes && detailRes.success && detailRes.data && detailRes.data.length > 0 && detailRes.data[0]) {
          var existing = detailRes.data[0];
          var formData = { ...EMPTY_FORM };
          ALLOWED_COLUMNS.forEach(function (col) {
            if (existing[col] !== undefined && existing[col] !== null) {
              formData[col] = existing[col];
            }
          });
          formData.academic_year_id = selYear;
          setData(formData);
        }
      } else {
        // No existing record — start empty
        setData({ ...EMPTY_FORM, academic_year_id: selYear });
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('WASH: load error:', (e && e.message) ? e.message : 'Unknown');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [selYear]);

  useEffect(function () {
    loadData();
  }, [loadData]);

  // ─── Handle save ──────────────────────────────────────────
  const handleSave = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!selYear) { setMsg('⚠️ Please select an academic year'); return; }

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

      // Check if record exists
      var exRes = await window.electronAPI.queryDatabase(
        "SELECT id FROM wash_data WHERE academic_year_id = ?", [selYear]
      );
      if (!mountedRef.current) return;

      if (exRes && exRes.success && exRes.data && exRes.data.length > 0 && exRes.data[0]) {
        // UPDATE — FIXED: uses ? placeholder for id
        var setClause = cols.map(function (c) { return c + ' = ?'; }).join(', ');
        var updateVals = vals.slice();
        updateVals.push(exRes.data[0].id);

        await window.electronAPI.queryDatabase(
          "UPDATE wash_data SET " + setClause + " WHERE id = ?",
          updateVals
        );
      } else {
        // INSERT
        var placeholders = cols.map(function () { return '?'; }).join(', ');
        await window.electronAPI.queryDatabase(
          "INSERT INTO wash_data (" + cols.join(', ') + ") VALUES (" + placeholders + ")",
          vals
        );
      }

      if (!mountedRef.current) return;
      setMsg('✅ WASH data saved successfully!');
    } catch (e) {
      if (!mountedRef.current) return;
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('WASH: save error:', errMsg);
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

  // ─── Input generators ─────────────────────────────────────
  var ig = function (key, label) {
    var value = (data && data[key] !== undefined && data[key] !== null) ? data[key] : 0;
    return (
      <div className="form-group" key={key}>
        <label className="form-label">{label}</label>
        <input type="number" className="form-input" value={value}
          onChange={function (e) { v(key, e.target.value); }} min="0" />
      </div>
    );
  };

  var selField = function (key, label, opts) {
    var value = (data && data[key] !== undefined && data[key] !== null) ? data[key] : '';
    return (
      <div className="form-group" key={key}>
        <label className="form-label">{label}</label>
        <select className="form-input" value={value}
          onChange={function (e) { setText(key, e.target.value); }}>
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
        <input type="checkbox" checked={checked}
          onChange={function (e) { vBool(key, e.target.checked); }}
          style={{ width: '20px', height: '20px' }} />
        <label>{label}</label>
      </div>
    );
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">🚰 WASH & Sanitation</h1>
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
            <p style={{ color: '#666' }}>Loading WASH data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🚰 WASH & Sanitation</h1>

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
            <option value="">Select</option>
            {years.map(function (y) { return <option key={y.id} value={y.id}>{y.year_name}</option>; })}
          </select>
        </div>
        <button onClick={loadData} className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }} disabled={!selYear || loading}>
          {loading ? '⏳' : '🔄 Load'}
        </button>
      </div>

      {/* ─── Form ───────────────────────────────────────────── */}
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          {selField('water_source_type', 'Water Source', WATER_SOURCES)}
          {selField('water_treatment', 'Water Treatment', WATER_TREATMENTS)}
          {selField('waste_disposal', 'Waste Disposal', WASTE_DISPOSALS)}
          {ig('handwashing_stations', 'Handwashing Stations')}
          {selField('school_cleanliness', 'Cleanliness Level', CLEANLINESS_LEVELS)}
          {selField('last_deworming', 'Last Deworming Date', [])}
        </div>

        {/* Fix: last_deworming should be a date input */}
        <div className="form-group" style={{ marginTop: '15px' }}>
          <label className="form-label">Last Deworming Date</label>
          <input
            type="date"
            className="form-input"
            value={(data && data.last_deworming) ? data.last_deworming : ''}
            onChange={function (e) { setText('last_deworming', e.target.value); }}
            style={{ maxWidth: '250px' }}
          />
        </div>

        {/* ─── Checkboxes ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '15px' }}>
          {cb('drinking_water_available', 'Drinking Water Available')}
          {cb('handwashing_with_soap', 'Handwashing With Soap')}
          {cb('menstrual_hygiene', 'Menstrual Hygiene Facilities')}
          {cb('deworming_done', 'Deworming Done This Year')}
        </div>

        {/* ─── Remarks ─────────────────────────────────────── */}
        <div className="form-group" style={{ marginTop: '15px' }}>
          <label className="form-label">Remarks</label>
          <textarea
            className="form-input"
            rows="2"
            value={(data && data.remarks) ? data.remarks : ''}
            onChange={function (e) { setText('remarks', e.target.value); }}
            placeholder="Additional notes about WASH status..."
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}
          style={{ marginTop: '15px', fontSize: '16px', padding: '12px 24px' }}>
          {saving ? '⏳ Saving...' : '💾 Save WASH Data'}
        </button>
      </form>
    </div>
  );
}