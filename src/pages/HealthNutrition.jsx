// FileName: src/pages/HealthNutrition.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Health & Nutrition — feeding program, first aid, deworming, life skills

import React, { useState, useEffect, useCallback, useRef } from 'react';

const ALLOWED_COLUMNS = [
  'academic_year_id', 'has_feeding_program', 'feeding_type', 'feeding_funding',
  'beneficiaries', 'has_first_aid', 'has_school_nurse',
  'deworming_done', 'hiv_life_skills', 'mental_health_support', 'remarks'
];

const EMPTY_FORM = {
  academic_year_id: '',
  has_feeding_program: 0, feeding_type: '', feeding_funding: '',
  beneficiaries: 0, has_first_aid: 0, has_school_nurse: 0,
  deworming_done: 0, hiv_life_skills: 0, mental_health_support: 0, remarks: ''
};

const FEEDING_TYPES = ['None', 'Cooked Meal', 'Porridge', 'Snack'];
const FUNDING_SOURCES = ['Parents', 'Government', 'Donor', 'School', 'Mixed'];

export default function HealthNutrition() {
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
        console.error('HealthNutrition: load years error:', (e && e.message) ? e.message : 'Unknown');
      }
    };
    loadYears();
  }, []);

  // ─── Load existing data when year changes ─────────────────
  const loadData = useCallback(async function () {
    if (!selYear || !window.electronAPI || !window.electronAPI.queryDatabase) return;

    setLoading(true);

    try {
      var exRes = await window.electronAPI.queryDatabase(
        "SELECT id FROM health_nutrition WHERE academic_year_id = ?", [selYear]
      );
      if (!mountedRef.current) return;

      if (exRes && exRes.success && exRes.data && exRes.data.length > 0 && exRes.data[0]) {
        var detailRes = await window.electronAPI.queryDatabase(
          "SELECT id, academic_year_id, has_feeding_program, feeding_type, feeding_funding, " +
          "beneficiaries, has_first_aid, has_school_nurse, deworming_done, " +
          "hiv_life_skills, mental_health_support, remarks " +
          "FROM health_nutrition WHERE id = ?",
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
        setData({ ...EMPTY_FORM, academic_year_id: selYear });
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('HealthNutrition: load error:', (e && e.message) ? e.message : 'Unknown');
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

      var cols = ALLOWED_COLUMNS.filter(function (col) {
        return d[col] !== undefined && d[col] !== null;
      });
      var vals = cols.map(function (col) { return d[col]; });

      if (cols.length === 0) {
        setMsg('⚠️ No data to save');
        if (mountedRef.current) setSaving(false);
        return;
      }

      var exRes = await window.electronAPI.queryDatabase(
        "SELECT id FROM health_nutrition WHERE academic_year_id = ?", [selYear]
      );
      if (!mountedRef.current) return;

      if (exRes && exRes.success && exRes.data && exRes.data.length > 0 && exRes.data[0]) {
        // UPDATE — FIXED: parameterized id
        var setClause = cols.map(function (c) { return c + ' = ?'; }).join(', ');
        var updateVals = vals.slice();
        updateVals.push(exRes.data[0].id);

        await window.electronAPI.queryDatabase(
          "UPDATE health_nutrition SET " + setClause + " WHERE id = ?",
          updateVals
        );
      } else {
        // INSERT
        var placeholders = cols.map(function () { return '?'; }).join(', ');
        await window.electronAPI.queryDatabase(
          "INSERT INTO health_nutrition (" + cols.join(', ') + ") VALUES (" + placeholders + ")",
          vals
        );
      }

      if (!mountedRef.current) return;
      setMsg('✅ Health & nutrition data saved!');
    } catch (e) {
      if (!mountedRef.current) return;
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('HealthNutrition: save error:', errMsg);
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
        <h1 className="page-title">🍎 Health & Nutrition</h1>
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
            <p style={{ color: '#666' }}>Loading health data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🍎 Health & Nutrition</h1>

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
          {selField('feeding_type', 'Feeding Type', FEEDING_TYPES)}
          {selField('feeding_funding', 'Funding Source', FUNDING_SOURCES)}
          {ig('beneficiaries', 'Beneficiaries (count)')}
        </div>

        {/* ─── Checkboxes ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '15px' }}>
          {cb('has_feeding_program', 'Has Feeding Program')}
          {cb('has_first_aid', 'First Aid Kit Available')}
          {cb('has_school_nurse', 'School Nurse Available')}
          {cb('deworming_done', 'Deworming Done This Year')}
          {cb('hiv_life_skills', 'HIV/AIDS Life Skills Taught')}
          {cb('mental_health_support', 'Mental Health Support')}
        </div>

        {/* ─── Remarks ─────────────────────────────────────── */}
        <div className="form-group" style={{ marginTop: '15px' }}>
          <label className="form-label">Remarks</label>
          <textarea
            className="form-input"
            rows="2"
            value={(data && data.remarks) ? data.remarks : ''}
            onChange={function (e) { setText('remarks', e.target.value); }}
            placeholder="Additional health and nutrition notes..."
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}
          style={{ marginTop: '15px', fontSize: '16px', padding: '12px 24px' }}>
          {saving ? '⏳ Saving...' : '💾 Save'}
        </button>
      </form>
    </div>
  );
}