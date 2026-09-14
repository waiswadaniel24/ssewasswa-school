// FileName: src/pages/Textbooks.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Textbooks & learning materials — inventory tracking per subject/class/year

import React, { useState, useEffect, useCallback, useRef } from 'react';

const EMPTY_FORM = {
  id: null, subject_id: '', class_id: '',
  textbook_title: '', books_received: 0, books_available: 0, source: 'MoES'
};

const SOURCES = ['MoES', 'UNICEF', 'Parents', 'School', 'Donor', 'Other'];

export default function Textbooks() {
  const [textbooks, setTextbooks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [selYear, setSelYear] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Load reference data on mount ─────────────────────────
  useEffect(function () {
    var cancelled = false;

    const loadInitial = async function () {
      if (!window.electronAPI || !window.electronAPI.queryDatabase) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      try {
        // Load academic years
        try {
          var yrRes = await window.electronAPI.emisGetAcademicYears();
          if (!cancelled && mountedRef.current && yrRes && yrRes.success && yrRes.data) {
            setYears(yrRes.data);
            var current = yrRes.data.find(function (y) { return y && (y.is_current === 1 || y.is_current === true); });
            setSelYear(current ? current.id : (yrRes.data.length > 0 ? yrRes.data[0].id : ''));
          }
        } catch (e) { /* ignore */ }

        // Load classes
        try {
          var cRes = await window.electronAPI.queryDatabase("SELECT id, name FROM classes ORDER BY name");
          if (!cancelled && mountedRef.current && cRes && cRes.success) {
            setClasses(cRes.data || []);
          }
        } catch (e) { /* ignore */ }

        // Load subjects
        try {
          var sRes = await window.electronAPI.queryDatabase("SELECT id, name FROM subjects ORDER BY name");
          if (!cancelled && mountedRef.current && sRes && sRes.success) {
            setSubjects(sRes.data || []);
          }
        } catch (e) { /* ignore */ }

      } catch (e) {
        if (!cancelled) return;
        console.error('Textbooks: load initial error:', (e && e.message) ? e.message : 'Unknown');
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    };

    loadInitial();
    return function () { cancelled = true; };
  }, []);

  // ─── Load textbooks when year changes ────────────────────
  const loadTextbooks = useCallback(async function () {
    if (!selYear || !window.electronAPI) return;

    try {
      if (window.electronAPI.emisGetTextbooks) {
        var r = await window.electronAPI.emisGetTextbooks(selYear);
        if (!mountedRef.current) return;
        if (r && r.success) {
          setTextbooks(r.data || []);
        } else {
          setTextbooks([]);
        }
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Textbooks: load error:', (e && e.message) ? e.message : 'Unknown');
      setTextbooks([]);
    }
  }, [selYear]);

  useEffect(function () {
    loadTextbooks();
  }, [loadTextbooks]);

  // ─── Handle save (FIXED: doesn't mutate formData) ─────────
  const handleSave = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    if (!selYear) { setMsg('⚠️ Please select an academic year'); return; }
    if (!formData.subject_id) { setMsg('⚠️ Please select a subject'); return; }
    if (!formData.class_id) { setMsg('⚠️ Please select a class'); return; }

    setSaving(true);
    setMsg('');

    try {
      // FIXED: Create a copy with academic_year_id instead of mutating formData directly
      var dataToSave = { ...formData, academic_year_id: selYear };
      var intVal = function (v) { return parseInt(v) || 0; };

      var r = await window.electronAPI.emisSaveTextbook({
        id: dataToSave.id || null,
        subject_id: dataToSave.subject_id,
        class_id: dataToSave.class_id,
        academic_year_id: dataToSave.academic_year_id,
        textbook_title: dataToSave.textbook_title || '',
        books_received: intVal(dataToSave.books_received),
        books_available: intVal(dataToSave.books_available),
        source: dataToSave.source || 'MoES'
      });

      if (!mountedRef.current) return;

      if (r && r.success) {
        setMsg(formData.id ? '✅ Textbook updated!' : '✅ Textbook added!');
        setFormData(EMPTY_FORM);
        loadTextbooks();
      } else {
        var errMsg = (r && r.error) ? r.error : 'Failed to save';
        setMsg('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      var errCatch = (e && e.message) ? e.message : 'Unknown error';
      console.error('Textbooks: save error:', errCatch);
      setMsg('❌ Error: ' + errCatch);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 4000);
  };

  // ─── Delete textbook ──────────────────────────────────────
  const handleDelete = async function (id, title) {
    if (!confirm('Delete textbook record "' + (title || 'Unknown') + '"?')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM textbooks WHERE id = ?", [id]
      );
      if (!mountedRef.current) return;
      setMsg('🗑️ Textbook deleted');
      loadTextbooks();
    } catch (e) {
      if (!mountedRef.current) return;
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error deleting: ' + errMsg);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 3000);
  };

  // ─── Edit textbook ───────────────────────────────────────
  const handleEdit = function (t) {
    if (!t) return;
    setFormData({
      id: t.id || null,
      subject_id: t.subject_id || '',
      class_id: t.class_id || '',
      textbook_title: t.textbook_title || '',
      books_received: t.books_received || 0,
      books_available: t.books_available || 0,
      source: t.source || 'MoES'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Derived values ───────────────────────────────────────
  var totalReceived = textbooks.reduce(function (sum, t) {
    var v = (t && t.books_received) ? Number(t.books_received) : 0;
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  var totalAvailable = textbooks.reduce(function (sum, t) {
    var v = (t && t.books_available) ? Number(t.books_available) : 0;
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  var totalBorrowed = totalReceived - totalAvailable;

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">📚 Textbooks & Learning Materials</h1>
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
            <p style={{ color: '#666' }}>Loading textbook data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📚 Textbooks & Learning Materials</h1>

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

      {/* ─── Year Selection ─────────────────────────────────── */}
      <div className="form-group" style={{ maxWidth: '300px', marginBottom: '15px' }}>
        <label className="form-label">Academic Year</label>
        <select className="form-input" value={selYear}
          onChange={function (e) { setSelYear(e.target.value); }}>
          <option value="">Select</option>
          {years.map(function (y) { return <option key={y.id} value={y.id}>{y.year_name}</option>; })}
        </select>
      </div>

      {/* ─── Summary Cards ─────────────────────────────────── */}
      {textbooks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: '#e8f0fe', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>{textbooks.length}</div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>Book Titles</div>
          </div>
          <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d904f' }}>{totalReceived}</div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>Books Received</div>
          </div>
          <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d904f' }}>{totalAvailable}</div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>Available</div>
          </div>
          {totalBorrowed > 0 && (
            <div style={{ background: '#fff3e0', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65100' }}>{totalBorrowed}</div>
              <div style={{ fontSize: '11px', color: '#5f6368' }}>Borrowed Out</div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* ─── Add/Edit Form ─────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: '300px' }} className="card">
          <div className="card-header">{formData.id ? '✏️ Edit Textbook' : '➕ Add Textbook'}</div>
          <div className="card-body">
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-input" value={formData.subject_id}
                  onChange={function (e) { setFormData({ ...formData, subject_id: e.target.value }); }} required>
                  <option value="">Select</option>
                  {subjects.map(function (s) { return <option key={s.id} value={s.id}>{s.name}</option>; })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Class</label>
                <select className="form-input" value={formData.class_id}
                  onChange={function (e) { setFormData({ ...formData, class_id: e.target.value }); }} required>
                  <option value="">Select</option>
                  {classes.map(function (c) { return <option key={c.id} value={c.id}>{c.name}</option>; })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={formData.textbook_title}
                  onChange={function (e) { setFormData({ ...formData, textbook_title: e.target.value }); }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Received</label>
                  <input type="number" className="form-input" value={formData.books_received}
                    onChange={function (e) { setFormData({ ...formData, books_received: parseInt(e.target.value) || 0 }); }} min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Available</label>
                  <input type="number" className="form-input" value={formData.books_available}
                    onChange={function (e) { setFormData({ ...formData, books_available: parseInt(e.target.value) || 0 }); }} min="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select className="form-input" value={formData.source}
                  onChange={function (e) { setFormData({ ...formData, source: e.target.value }); }}>
                  {SOURCES.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳' : '💾 Save'}
                </button>
                {formData.id && (
                  <button type="button" onClick={function () { setFormData(EMPTY_FORM); }} className="btn btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ─── Inventory Table ─────────────────────────────────── */}
        <div style={{ flex: 2, minWidth: '400px' }} className="card">
          <div className="card-header">📦 Inventory ({textbooks.length})</div>
          <div className="card-body" style={{ overflowX: 'auto' }}>
            {textbooks.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                No textbooks recorded for this year
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Title</th>
                    <th>Available</th>
                    <th>Received</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {textbooks.map(function (t, i) {
                    var id = (t && t.id) ? t.id : i;
                    var subj = (t && t.subject_name) ? t.subject_name : '-';
                    var cls = (t && t.class_name) ? t.class_name : '-';
                    var title = (t && t.textbook_title) ? t.textbook_title : '-';
                    var avail = (t && t.books_available !== undefined && t.books_available !== null) ? Number(t.books_available) : 0;
                    var recv = (t && t.books_received !== undefined && t.books_received !== null) ? Number(t.books_received) : 0;
                    var src = (t && t.source) ? t.source : '-';

                    var isLow = avail <= 5 && avail > 0;
                    var isOut = avail === 0;

                    return (
                      <tr key={id}>
                        <td>{subj}</td>
                        <td style={{ fontSize: '12px' }}>{cls}</td>
                        <td style={{ fontSize: '12px' }}>{title}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px',
                            background: isOut ? '#ffebee' : (isLow ? '#fff3e0' : '#e8f5e9'),
                            color: isOut ? '#d32f2f' : (isLow ? '#e65100' : '#0d904f'),
                            fontSize: '12px', fontWeight: '600'
                          }}>
                            {avail} {isOut ? '⚠️' : (isLow ? '⚠️' : '✅')}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>{recv}</td>
                        <td style={{ fontSize: '12px' }}>{src}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={function () { handleEdit(t); }}
                              style={{ color: '#1a73e8', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                              ✏️ Edit
                            </button>
                            <button onClick={function () { handleDelete(id, title); }}
                              style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                              🗑️
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
    </div>
  );
}