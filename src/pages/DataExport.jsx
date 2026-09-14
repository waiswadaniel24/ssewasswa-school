// FileName: src/pages/DataExport.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Data export & import — CSV export, EMIS return JSON, bulk student import

import React, { useState, useEffect, useRef } from 'react';

// Whitelist of exportable tables — defined at MODULE level (not inside function)
const SAFE_TABLES = [
  'students', 'staff', 'classes', 'subjects', 'payments', 'attendance',
  'marks', 'canteen_items', 'expenses', 'payroll_payments', 'visitors',
  'library_books', 'discipline', 'transport_routes', 'student_requirements',
  'nursery_assessments', 'governance_members', 'health_nutrition',
  'dropout_records', 'infrastructure', 'textbooks', 'special_needs_learners',
  'ovc_data', 'school_finances_emis', 'houses', 'house_points',
  'timetable', 'academic_years', 'student_enrollment', 'meeting_minutes',
  'stored_signatures', 'parent_profiles', 'student_timeline',
  'signature_assignments', 'deduction_types', 'staff_deductions',
  'purchase_requests', 'audit_log'
];

export default function DataExport() {
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [importData, setImportData] = useState('');
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState([]);
  const [selYear, setSelYear] = useState('');

  const mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Load academic years for EMIS export ─────────────────
  useEffect(function () {
    if (!window.electronAPI || !window.electronAPI.emisGetAcademicYears) return;
    var cancelled = false;

    const loadYears = async function () {
      try {
        var r = await window.electronAPI.emisGetAcademicYears();
        if (!cancelled && mountedRef.current && r && r.success && r.data) {
          setYears(r.data);
          var current = r.data.find(function (y) {
            return y && (y.is_current === 1 || y.is_current === true);
          });
          setSelYear(current ? current.id : (r.data.length > 0 ? r.data[0].id : ''));
        }
      } catch (e) { /* ignore */ }
    };
    loadYears();
    return function () { cancelled = true; };
  }, []);

  // ─── Show timed message ────────────────────────────────────
  var showMessage = function (text, type) {
    if (!mountedRef.current) return;
    setMsg(text);
    setMsgType(type || 'info');
    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 5000);
  };

  // ─── Export single table as CSV ───────────────────────────
  const exportTable = async function (tableName) {
    if (!SAFE_TABLES.includes(tableName)) {
      showMessage('❌ Invalid table name', 'error');
      return;
    }

    if (!window.electronAPI || !window.electronAPI.queryDatabase) {
      showMessage('❌ Database not available', 'error');
      return;
    }

    setLoading(true);
    showMessage('⏳ Exporting ' + tableName + '...', 'info');

    try {
      var r = await window.electronAPI.queryDatabase("SELECT * FROM " + tableName);
      if (!mountedRef.current) return;

      if (!r || !r.success) {
        showMessage('❌ Error: ' + ((r && r.error) ? r.error : 'Unknown'), 'error');
        return;
      }

      if (!r.data || r.data.length === 0) {
        showMessage('ℹ️ No data to export in ' + tableName, 'warning');
        return;
      }

      // FIXED: null check r.data[0] before Object.keys
      if (!r.data[0]) {
        showMessage('❌ Invalid data format', 'error');
        return;
      }

      var cols = Object.keys(r.data[0]);
      var csv = cols.join(',') + '\n';

      for (var i = 0; i < r.data.length; i++) {
        var row = r.data[i];
        csv += cols.map(function (c) {
          var val = (row && row[c] !== undefined && row[c] !== null) ? row[c] : '';
          val = String(val).replace(/"/g, '""');
          return '"' + val + '"';
        }).join(',') + '\n';
      }

      var blob = new Blob([csv], { type: 'text/csv' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = tableName + '.csv';
      a.click();
      URL.revokeObjectURL(url);

      showMessage('✅ ' + tableName + ' exported! (' + r.data.length + ' rows)', 'success');
    } catch (e) {
      if (!mountedRef.current) return;
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('DataExport: export error:', errMsg);
      showMessage('❌ Export error: ' + errMsg, 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Export EMIS Return as JSON ───────────────────────────
  const exportEMISReturn = async function () {
    if (!selYear) {
      showMessage('⚠️ Please select an academic year', 'warning');
      return;
    }

    setLoading(true);
    showMessage('⏳ Compiling EMIS return...', 'info');

    try {
      // FIXED: Uses selected year instead of hardcoded (1, 1)
      var report = await window.electronAPI.invoke('emisCompileReport', selYear, 1);
      if (!mountedRef.current) return;

      if (!report || !report.success) {
        showMessage('❌ Error compiling EMIS report', 'error');
        return;
      }

      var blob = new Blob([JSON.stringify(report.data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'EMIS_Return_' + new Date().getFullYear() + '.json';
      a.click();
      URL.revokeObjectURL(url);

      showMessage('✅ EMIS return exported!', 'success');
    } catch (e) {
      if (!mountedRef.current) return;
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('DataExport: EMIS export error:', errMsg);
      showMessage('❌ EMIS export error: ' + errMsg, 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Bulk import students from CSV ───────────────────────
  const handleImport = async function () {
    if (!importData || !importData.trim()) {
      showMessage('⚠️ Please paste CSV data first', 'warning');
      return;
    }

    setLoading(true);
    showMessage('⏳ Importing students...', 'info');

    try {
      var lines = importData.trim().split('\n');
      if (lines.length < 2) {
        showMessage('⚠️ Need at least a header row and one data row', 'warning');
        return;
      }

      var count = 0;
      var errors = 0;

      for (var i = 1; i < lines.length; i++) {
        var line = lines[i];
        var vals = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        var clean = vals.map(function (v) {
          return v.replace(/^"|"$/g, '').trim();
        });

        if (clean.length >= 4) {
          try {
            await window.electronAPI.queryDatabase(
              "INSERT OR IGNORE INTO students (first_name, last_name, gender, admission_number, guardian_name, guardian_phone, class_id) VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM classes WHERE name = ? LIMIT 1))",
              [clean[0] || '', clean[1] || '', clean[2] || 'M', clean[3] || ('IMP-' + i), clean[4] || '', clean[5] || '', clean[6] || '']
            );
            count++;
          } catch (e) {
            errors++;
            console.error('Import row ' + i + ' error:', (e && e.message) ? e.message : 'Unknown');
          }
        }
      }

      if (!mountedRef.current) return;

      var msgText = '✅ ' + count + ' students imported!';
      if (errors > 0) {
        msgText += ' (' + errors + ' rows had errors)';
      }
      showMessage(msgText, 'success');
      setImportData('');
    } catch (e) {
      if (!mountedRef.current) return;
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('DataExport: import error:', errMsg);
      showMessage('❌ Import error: ' + errMsg, 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Message styles ───────────────────────────────────────
  var msgStyles = {
    info: { bg: '#e8f0fe', color: '#1a73e8', icon: 'ℹ️' },
    success: { bg: '#e8f5e9', color: '#0d904f', icon: '✅' },
    error: { bg: '#ffebee', color: '#c62828', icon: '❌' },
    warning: { bg: '#fff3e0', color: '#e65100', icon: '⚠️' }
  };
  var ms = msgStyles[msgType] || msgStyles.info;

  // ─── Tables for UI buttons (grouped by category) ──────────
  var tableGroups = [
    { label: '📊 Core Records', tables: ['students', 'staff', 'classes', 'subjects', 'attendance', 'marks'] },
    { label: '💰 Finance', tables: ['payments', 'expenses', 'payroll_payments', 'fees_structure', 'school_finances_emis'] },
    { label: '📚 Academic', tables: ['timetable', 'academic_years', 'student_enrollment', 'discipline'] },
    { label: '🏥 Health & EMIS', tables: ['health_nutrition', 'infrastructure', 'textbooks', 'special_needs_learners', 'ovc_data', 'dropout_records'] },
    { label: '🔧 Administration', tables: ['governance_members', 'meeting_minutes', 'audit_log', 'purchase_requests'] }
  ];

  // ─── Loading state ──────────────────────────────────────
  if (loading && !msg) {
    return (
      <div className="page-container">
        <h1 className="page-title">📤 Data Export & Import</h1>
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
            <p style={{ color: '#666' }}>Processing...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📤 Data Export & Import</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <div style={{
          background: ms.bg, color: ms.color,
          padding: '12px 16px', borderRadius: '8px',
          marginBottom: '20px', fontSize: '14px',
          border: '1px solid ' + ms.color + '40',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>{ms.icon}</span>
          {msg}
        </div>
      )}

      {/* ─── CSV Export ──────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">📊 Export Data (CSV)</div>
        <div className="card-body">
          <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
            Download any table as a CSV file for EMIS returns, backup, or external analysis.
          </p>

          {tableGroups.map(function (group, gi) {
            return (
              <div key={gi} style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#1a73e8', marginBottom: '10px', fontSize: '14px' }}>{group.label}</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {group.tables.map(function (t) {
                    var isSafe = SAFE_TABLES.indexOf(t) >= 0;
                    return (
                      <button
                        key={t}
                        onClick={function () { exportTable(t); }}
                        className="btn btn-secondary"
                        style={{
                          width: 'auto', marginTop: 0,
                          padding: '8px 16px', fontSize: '13px',
                          opacity: (loading || !isSafe) ? 0.5 : 1,
                          cursor: (loading || !isSafe) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={loading || !isSafe}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── EMIS Return Export ─────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">📋 Export EMIS Return (JSON)</div>
        <div className="card-body">
          <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
            Export complete EMIS return in Ministry of Education format (JSON).
          </p>
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label className="form-label">Academic Year</label>
            <select className="form-input" value={selYear}
              onChange={function (e) { setSelYear(e.target.value); }}>
              <option value="">Select Year</option>
              {years.map(function (y) { return <option key={y.id} value={y.id}>{y.year_name}</option>; })}
            </select>
          </div>
          <button onClick={exportEMISReturn} className="btn btn-primary" disabled={loading || !selYear}>
            {loading ? '⏳ Generating...' : '📋 Generate & Download EMIS Return'}
          </button>
        </div>
      </div>

      {/* ─── Bulk Import Students ──────────────────────────── */}
      <div className="card">
        <div className="card-header">📥 Bulk Import Students (CSV)</div>
        <div className="card-body">
          <p style={{ marginBottom: '10px', color: '#666', fontSize: '13px' }}>
            Format: <code style={{ background: '#f1f3f4', padding: '2px 8px', borderRadius: '4px' }}>
              FirstName, LastName, Gender, AdmNo, Guardian, Phone, ClassName
            </code>
          </p>
          <textarea
            className="form-input"
            rows="6"
            value={importData}
            onChange={function (e) { setImportData(e.target.value); }}
            placeholder={'Paste CSV data here...\n\nExample:\nJohn,Doe,M,P001,Jane Doe,0772123456,Primary 1\nMary,Smith,F,P002,Bob Smith,0782123456,Primary 2'}
            style={{ fontFamily: 'monospace', fontSize: '13px' }}
          />
          <button onClick={handleImport} className="btn btn-primary" style={{ marginTop: '10px' }} disabled={loading}>
            {loading ? '⏳ Importing...' : '📥 Import Students'}
          </button>
        </div>
      </div>

      {/* ─── Info Note ─────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">ℹ️ Export Information</div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>CSV Export:</strong> Downloads a table as a CSV file. Only whitelisted tables can be exported (security).
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>EMIS Return:</strong> Generates a JSON file with school info, enrollment, staff, and infrastructure data for the selected academic year.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            💡 <strong>Student Import:</strong> Paste CSV data (one student per line) to bulk-import students. Class name must match an existing class in the system.
          </p>
        </div>
      </div>
    </div>
  );
}