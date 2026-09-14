// FileName: src/pages/EMISReport.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: EMIS report compilation — school census data for Ministry of Education

import React, { useState, useEffect, useCallback, useRef } from 'react';

export default function EMISReport() {
  const [years, setYears] = useState([]);
  const [selYear, setSelYear] = useState('');
  const [selTerm, setSelTerm] = useState(1);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [loading, setLoading] = useState(false);
  const [syncLog, setSyncLog] = useState([]);
  const [reportData, setReportData] = useState(null);

  const mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Load academic years on mount ─────────────────────────
  useEffect(function () {
    var cancelled = false;

    const loadYears = async function () {
      if (!window.electronAPI || !window.electronAPI.emisGetAcademicYears) return;

      try {
        var r = await window.electronAPI.emisGetAcademicYears();
        if (!cancelled && mountedRef.current && r && r.success && r.data) {
          setYears(r.data);
          var current = r.data.find(function (y) {
            return y && (y.is_current === 1 || y.is_current === true);
          });
          setSelYear(current ? current.id : (r.data.length > 0 ? r.data[0].id : ''));
        }
      } catch (e) {
        if (!cancelled) return;
        console.error('EMISReport: load years error:', (e && e.message) ? e.message : 'Unknown');
      }
    };

    loadYears();
    return function () { cancelled = true; };
  }, []);

  // ─── Load sync log ────────────────────────────────────────
  const loadSyncLog = useCallback(async function () {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) return;

    try {
      var r = await window.electronAPI.queryDatabase(
        "SELECT id, sync_type, sync_direction, status, records_pushed, " +
        "records_pulled, error_message, started_at, completed_at " +
        "FROM emis_sync_log ORDER BY id DESC LIMIT 20"
      );
      if (!mountedRef.current) return;
      if (r && r.success && Array.isArray(r.data)) {
        setSyncLog(r.data);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('EMISReport: load sync log error:', (e && e.message) ? e.message : 'Unknown');
    }
  }, []);

  useEffect(function () {
    loadSyncLog();
  }, [loadSyncLog]);

  // ─── Show timed message ────────────────────────────────────
  var showMessage = function (text, type) {
    if (!mountedRef.current) return;
    setMsg(text);
    setMsgType(type || 'info');
    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 5000);
  };

  // ─── Compile EMIS report ──────────────────────────────────
  const handleCompile = async function () {
    if (!selYear) {
      showMessage('⚠️ Please select an academic year', 'warning');
      return;
    }

    setLoading(true);
    showMessage('⏳ Compiling EMIS report...', 'info');
    setReportData(null);

    try {
      // Query school info
      var schoolInfo = { /* no-op */ };
      try {
        var sRes = await window.electronAPI.queryDatabase("SELECT * FROM school_registration WHERE id = 1");
        if (sRes && sRes.success && sRes.data && sRes.data.length > 0 && sRes.data[0]) {
          schoolInfo = sRes.data[0];
        }
      } catch (e) { /* ignore */ }

      // Query enrollment by class
      var enrollment = [];
      try {
        var eRes = await window.electronAPI.queryDatabase(
          "SELECT c.name as class_name, " +
          "COUNT(CASE WHEN s.gender = 'M' THEN 1 END) as boys, " +
          "COUNT(CASE WHEN s.gender = 'F' THEN 1 END) as girls, " +
          "COUNT(*) as total " +
          "FROM students s LEFT JOIN classes c ON s.class_id = c.id " +
          "WHERE s.status = 'Active' " +
          "GROUP BY c.name ORDER BY c.name"
        );
        if (eRes && eRes.success && Array.isArray(eRes.data)) {
          enrollment = eRes.data.map(function (row) {
            return {
              class_name: (row && row.class_name) ? row.class_name : 'Unknown',
              boys: (row && row.boys !== undefined) ? Number(row.boys) : 0,
              girls: (row && row.girls !== undefined) ? Number(row.girls) : 0,
              total: (row && row.total !== undefined) ? Number(row.total) : 0
            };
          });
        }
      } catch (e) { /* ignore */ }

      // Query staff summary
      var staff = [];
      try {
        var stRes = await window.electronAPI.queryDatabase(
          "SELECT role, employer_type, highest_qualification, gender, COUNT(*) as count " +
          "FROM staff WHERE status = 'Active' " +
          "GROUP BY role, employer_type, highest_qualification, gender"
        );
        if (stRes && stRes.success && Array.isArray(stRes.data)) {
          staff = stRes.data.map(function (row) {
            return {
              role: (row && row.role) ? row.role : '-',
              employer_type: (row && row.employer_type) ? row.employer_type : '-',
              qualification: (row && row.highest_qualification) ? row.highest_qualification : '-',
              gender: (row && row.gender) ? row.gender : '-',
              count: (row && row.count !== undefined) ? Number(row.count) : 0
            };
          });
        }
      } catch (e) { /* ignore */ }

      // Query infrastructure
      var infrastructure = { /* no-op */ };
      try {
        var iRes = await window.electronAPI.queryDatabase(
          "SELECT * FROM infrastructure WHERE academic_year_id = ? LIMIT 1", [selYear]
        );
        if (iRes && iRes.success && iRes.data && iRes.data.length > 0 && iRes.data[0]) {
          infrastructure = iRes.data[0];
        }
      } catch (e) { /* ignore */ }

      // Query dropout summary
      var dropouts = [];
      try {
        var dRes = await window.electronAPI.queryDatabase(
          "SELECT dropout_reason, COUNT(*) as count FROM dropout_records GROUP BY dropout_reason ORDER BY count DESC"
        );
        if (dRes && dRes.success && Array.isArray(dRes.data)) {
          dropouts = dRes.data.map(function (row) {
            return {
              reason: (row && row.dropout_reason) ? row.dropout_reason : 'Unknown',
              count: (row && row.count !== undefined) ? Number(row.count) : 0
            };
          });
        }
      } catch (e) { /* ignore */ }

      if (!mountedRef.current) return;

      var report = {
        generated_at: new Date().toISOString(),
        academic_year_id: selYear,
        term: selTerm,
        school_info: schoolInfo,
        enrollment: enrollment,
        staff: staff,
        infrastructure: infrastructure,
        dropouts: dropouts
      };

      setReportData(report);
      showMessage('✅ EMIS report compiled! Review the data below.', 'success');
    } catch (e) {
      if (!mountedRef.current) return;
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('EMISReport: compile error:', errMsg);
      showMessage('❌ Error compiling report: ' + errMsg, 'error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Download report as JSON ──────────────────────────────
  const handleDownload = function () {
    if (!reportData) {
      showMessage('⚠️ Compile a report first', 'warning');
      return;
    }

    try {
      var blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'EMIS_Report_' + selYear + '_Term' + selTerm + '_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      showMessage('📄 EMIS report downloaded!', 'success');
    } catch (e) {
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Download error: ' + errMsg, 'error');
    }
  };

  // ─── Push to UNEB/EMIS API (if configured) ───────────────
  const handlePush = async function () {
    if (!reportData) {
      showMessage('⚠️ Compile a report first', 'warning');
      return;
    }
    if (!window.electronAPI || !window.electronAPI.unebPushEMIS) {
      showMessage('❌ EMIS push not available. Configure API keys in EMIS Config.', 'error');
      return;
    }

    if (!confirm('Push EMIS data to the national system?\n\nThis requires API keys to be configured in EMIS Config.')) return;

    setLoading(true);
    showMessage('⏳ Pushing EMIS data...', 'info');

    try {
      var r = await window.electronAPI.unebPushEMIS(selYear, selTerm);
      if (!mountedRef.current) return;

      if (r && r.success) {
        showMessage('✅ EMIS data pushed successfully!', 'success');
        loadSyncLog();
      } else {
        var errMsg = (r && r.error) ? r.error : 'Push failed';
        showMessage('❌ ' + errMsg, 'error');
      }
    } catch (e) {
      if (!mountedRef.current) return;
      var errCatch = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Push error: ' + errCatch, 'error');
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

  // ─── Derived values from report ──────────────────────────
  var totalStudents = 0, totalBoys = 0, totalGirls = 0;
  if (reportData && Array.isArray(reportData.enrollment)) {
    reportData.enrollment.forEach(function (e) {
      if (e) {
        totalStudents += (e.total || 0);
        totalBoys += (e.boys || 0);
        totalGirls += (e.girls || 0);
      }
    });
  }

  var totalStaff = 0;
  if (reportData && Array.isArray(reportData.staff)) {
    reportData.staff.forEach(function (s) {
      if (s) totalStaff += (s.count || 0);
    });
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📊 EMIS Report</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <div style={{
          background: ms.bg, color: ms.color,
          padding: '12px 16px', borderRadius: '8px',
          marginBottom: '20px', fontSize: '14px',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>{ms.icon}</span>
          {msg}
        </div>
      )}

      {/* ─── Selection Bar ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">⚙️ EMIS Report Configuration</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label className="form-label">Academic Year *</label>
              <select className="form-input" value={selYear}
                onChange={function (e) { setSelYear(e.target.value); }}>
                <option value="">-- Select --</option>
                {years.map(function (y) { return <option key={y.id} value={y.id}>{y.year_name}</option>; })}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: '150px', marginBottom: 0 }}>
              <label className="form-label">Term</label>
              <select className="form-input" value={selTerm}
                onChange={function (e) { setSelTerm(parseInt(e.target.value)); }}>
                <option value={1}>Term 1</option>
                <option value={2}>Term 2</option>
                <option value={3}>Term 3</option>
              </select>
            </div>
            <button onClick={handleCompile} className="btn btn-primary" disabled={loading || !selYear}>
              {loading ? '⏳ Compiling...' : '📊 Compile Report'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Report Summary ────────────────────────────────── */}
      {reportData && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#e8f0fe', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{totalStudents}</div>
              <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Students</div>
            </div>
            <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d904f' }}>{totalBoys}</div>
              <div style={{ fontSize: '11px', color: '#5f6368' }}>👦 Boys</div>
            </div>
            <div style={{ background: '#fce4ec', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c2185b' }}>{totalGirls}</div>
              <div style={{ fontSize: '11px', color: '#5f6368' }}>👧 Girls</div>
            </div>
            <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>{totalStaff}</div>
              <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Staff</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={handleDownload} className="btn btn-primary">
              📄 Download JSON
            </button>
            <button onClick={handlePush} className="btn btn-secondary" disabled={loading}>
              📤 Push to EMIS API
            </button>
          </div>

          {/* Enrollment by Class */}
          {reportData.enrollment && reportData.enrollment.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">📋 Enrollment by Class</div>
              <div className="card-body" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Boys</th>
                      <th>Girls</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.enrollment.map(function (e, i) {
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: '600' }}>{(e && e.class_name) ? e.class_name : '-'}</td>
                          <td style={{ color: '#1a73e8' }}>{(e && e.boys) ? e.boys : 0}</td>
                          <td style={{ color: '#c2185b' }}>{(e && e.girls) ? e.girls : 0}</td>
                          <td style={{ fontWeight: 'bold' }}>{(e && e.total) ? e.total : 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                      <td>Total</td>
                      <td>{totalBoys}</td>
                      <td>{totalGirls}</td>
                      <td>{totalStudents}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Staff Summary */}
          {reportData.staff && reportData.staff.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">👨‍🏫 Staff Summary</div>
              <div className="card-body" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Employer</th>
                      <th>Qualification</th>
                      <th>Gender</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.staff.map(function (s, i) {
                      return (
                        <tr key={i}>
                          <td>{(s && s.role) ? s.role : '-'}</td>
                          <td style={{ fontSize: '12px' }}>{(s && s.employer_type) ? s.employer_type.replace(/_/g, ' ') : '-'}</td>
                          <td style={{ fontSize: '12px' }}>{(s && s.qualification) ? s.qualification : '-'}</td>
                          <td>{(s && s.gender === 'M') ? '👦' : '👧'}</td>
                          <td style={{ fontWeight: 'bold' }}>{(s && s.count) ? s.count : 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dropout Summary */}
          {reportData.dropouts && reportData.dropouts.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">📉 Dropout Summary</div>
              <div className="card-body" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reason</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.dropouts.map(function (d, i) {
                      return (
                        <tr key={i}>
                          <td>{(d && d.reason) ? d.reason : '-'}</td>
                          <td style={{ fontWeight: 'bold', color: '#d32f2f' }}>{(d && d.count) ? d.count : 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Sync Log ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">🔄 EMIS Sync History ({syncLog.length})</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {syncLog.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              No sync operations recorded yet
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Direction</th>
                  <th>Status</th>
                  <th>Records</th>
                  <th>Started</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {syncLog.map(function (s, i) {
                  var id = (s && s.id) ? s.id : i;
                  var type = (s && s.sync_type) ? s.sync_type : '-';
                  var dir = (s && s.sync_direction) ? s.sync_direction : '-';
                  var status = (s && s.status) ? s.status : '-';
                  var pushed = (s && s.records_pushed !== undefined) ? Number(s.records_pushed) : 0;
                  var pulled = (s && s.records_pulled !== undefined) ? Number(s.records_pulled) : 0;
                  var started = (s && s.started_at) ? String(s.started_at).slice(0, 19) : '-';
                  var completed = (s && s.completed_at) ? String(s.completed_at).slice(0, 19) : '-';

                  return (
                    <tr key={id}>
                      <td style={{ fontSize: '12px' }}>{type}</td>
                      <td style={{ fontSize: '12px' }}>{dir}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: status === 'Success' ? '#e8f5e9' : '#ffebee',
                          color: status === 'Success' ? '#0d904f' : '#d32f2f',
                          fontSize: '11px', fontWeight: '600'
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {pushed > 0 ? '↑' + pushed : ''} {pulled > 0 ? '↓' + pulled : ''}
                      </td>
                      <td style={{ fontSize: '11px' }}>{started}</td>
                      <td style={{ fontSize: '11px' }}>{completed}</td>
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
