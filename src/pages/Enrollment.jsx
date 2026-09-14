// FileName: src/pages/Enrollment.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Student enrollment — per class/year/term enrollment tracking for EMIS

import React, { useState, useEffect, useCallback, useRef } from 'react';



export default function Enrollment() {
  // ─── State variables ──────────────────────────────────────
  const [years, setYears] = useState([]);
  const [selYear, setSelYear] = useState('');
  const [selTerm, setSelTerm] = useState(1);

  const [enrollmentData, setEnrollmentData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Load academic years and classes on mount ────────────
  useEffect(function () {
    var cancelled = false;

    const loadInitial = async function () {
      if (!window.electronAPI || !window.electronAPI.queryDatabase) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      try {
        // Load years
        try {
          if (window.electronAPI.emisGetAcademicYears) {
            var yrRes = await window.electronAPI.emisGetAcademicYears();
            if (!cancelled && mountedRef.current && yrRes && yrRes.success && yrRes.data) {
              setYears(yrRes.data);
              var current = yrRes.data.find(function (y) {
                return y && (y.is_current === 1 || y.is_current === true);
              });
              setSelYear(current ? current.id : (yrRes.data.length > 0 ? yrRes.data[0].id : ''));
            }
          }
        } catch (e) { /* ignore */ }

        // Load classes


      } catch (e) {
        if (!cancelled) return;
        console.error('Enrollment: load initial error:', (e && e.message) ? e.message : 'Unknown');
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    };

    loadInitial();
    return function () { cancelled = true; };
  }, []);

  // ─── Load enrollment data when year/term changes ──────────
  const loadEnrollment = useCallback(async function () {
    if (!selYear || !window.electronAPI || !window.electronAPI.queryDatabase) {
      setEnrollmentData([]);
      return;
    }

    setTableLoading(true);

    try {
      // Query enrollment by class for the selected year and term
      var r = await window.electronAPI.queryDatabase(
        "SELECT c.id as class_id, c.name as class_name, c.level, " +
        "COUNT(CASE WHEN s.gender = 'M' THEN 1 END) as boys, " +
        "COUNT(CASE WHEN s.gender = 'F' THEN 1 END) as girls, " +
        "COUNT(*) as total " +
        "FROM students s " +
        "LEFT JOIN classes c ON s.class_id = c.id " +
        "WHERE s.status = 'Active' " +
        "GROUP BY c.id, c.name, c.level " +
        "ORDER BY c.name",
        []
      );

      if (!mountedRef.current) return;

      if (r && r.success && Array.isArray(r.data)) {
        setEnrollmentData(r.data);
      } else {
        setEnrollmentData([]);
      }

      // Also check student_enrollment table for this year/term
      var enrolledRes = null;
      try {
        enrolledRes = await window.electronAPI.queryDatabase(
          "SELECT se.class_id, se.enrollment_status, COUNT(*) as count " +
          "FROM student_enrollment se " +
          "WHERE se.academic_year_id = ? AND se.term = ? " +
          "GROUP BY se.class_id, se.enrollment_status",
          [selYear, selTerm]
        );
      } catch (e) { /* enrollment table might be empty */ }

      if (!mountedRef.current) return;

      // Merge enrollment status data into the class data
      if (enrolledRes && enrolledRes.success && Array.isArray(enrolledRes.data) && enrolledRes.data.length > 0) {
        var statusMap = { /* no-op */ };
        enrolledRes.data.forEach(function (row) {
          if (!row || !row.class_id) return;
          var key = row.class_id + '_' + row.enrollment_status;
          statusMap[key] = (row.count !== undefined && row.count !== null) ? Number(row.count) : 0;
        });

        var mergedData = enrollmentData.map(function (item) {
          if (!item || !item.class_id) return item;
          var classId = item.class_id;
          return {
            ...item,
            enrolled_count: statusMap[classId + '_Enrolled'] || 0,
            promoted_count: statusMap[classId + '_Promoted'] || 0,
            transferred_count: statusMap[classId + '_Transferred'] || 0,
            completed_count: statusMap[classId + '_Completed'] || 0
          };
        });

        if (mountedRef.current) setEnrollmentData(mergedData);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Enrollment: load error:', (e && e.message) ? e.message : 'Unknown');
      setEnrollmentData([]);
    } finally {
      if (mountedRef.current) setTableLoading(false);
    }
  }, [selYear, selTerm]);

  useEffect(function () {
    loadEnrollment();
  }, [loadEnrollment]);

  // ─── Derived values (all with null checks) ───────────────
  var totalBoys = enrollmentData.reduce(function (sum, e) {
    var v = (e && e.boys !== undefined && e.boys !== null) ? Number(e.boys) : 0;
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  var totalGirls = enrollmentData.reduce(function (sum, e) {
    var v = (e && e.girls !== undefined && e.girls !== null) ? Number(e.girls) : 0;
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  var totalStudents = enrollmentData.reduce(function (sum, e) {
    var v = (e && e.total !== undefined && e.total !== null) ? Number(e.total) : 0;
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  var gpi = totalBoys > 0 ? (totalGirls / totalBoys).toFixed(2) : 'N/A';

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">📝 Enrollment (EMIS)</h1>
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
            <p style={{ color: '#666' }}>Loading enrollment data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📝 Enrollment (EMIS)</h1>

      {/* ─── Message ────────────────────────────────────────── */}


      {/* ─── Selection Bar ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: 1, minWidth: '180px', marginBottom: 0 }}>
          <label className="form-label">Academic Year</label>
          <select className="form-input" value={selYear}
            onChange={function (e) { setSelYear(e.target.value); }}>
            <option value="">Select Year</option>
            {years.map(function (y) { return <option key={y.id} value={y.id}>{y.year_name}</option>; })}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: '120px', marginBottom: 0 }}>
          <label className="form-label">Term</label>
          <select className="form-input" value={selTerm}
            onChange={function (e) { setSelTerm(parseInt(e.target.value)); }}>
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>
        </div>
        <button onClick={loadEnrollment} className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }} disabled={!selYear || tableLoading}>
          {tableLoading ? '⏳ Loading...' : '🔄 Load Data'}
        </button>
      </div>

      {/* ─── Summary Cards ─────────────────────────────────── */}
      {enrollmentData.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px', marginBottom: '20px'
        }}>
          <div style={{ background: '#e8f0fe', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{totalStudents}</div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Enrolled</div>
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
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>{gpi}</div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>Gender Parity Index</div>
          </div>
          <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1565c0' }}>{enrollmentData.length}</div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>Classes with Students</div>
          </div>
        </div>
      )}

      {/* ─── Enrollment by Class Table ──────────────────────── */}
      <div className="card">
        <div className="card-header">📋 Enrollment by Class ({enrollmentData.length} classes)</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {enrollmentData.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              {!selYear ? 'Select an academic year and click "Load Data"' : 'No enrollment data found for this period'}
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class Name</th>
                  <th>Level</th>
                  <th>Boys</th>
                  <th>Girls</th>
                  <th>Total</th>
                  <th>Boys %</th>
                  <th>Girls %</th>
                </tr>
              </thead>
              <tbody>
                {enrollmentData.map(function (e, i) {
                  var classId = (e && e.class_id) ? e.class_id : i;
                  var className = (e && e.class_name) ? e.class_name : '-';
                  var level = (e && e.level) ? e.level : '-';
                  var boys = (e && e.boys !== undefined && e.boys !== null) ? Number(e.boys) : 0;
                  var girls = (e && e.girls !== undefined && e.girls !== null) ? Number(e.girls) : 0;
                  var total = (e && e.total !== undefined && e.total !== null) ? Number(e.total) : 0;
                  var boysPct = total > 0 ? ((boys / total) * 100).toFixed(0) + '%' : '-';
                  var girlsPct = total > 0 ? ((girls / total) * 100).toFixed(0) + '%' : '-';

                  return (
                    <tr key={classId}>
                      <td style={{ fontWeight: '600' }}>{className}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: '#e8f0fe', color: '#1a73e8',
                          fontSize: '11px'
                        }}>
                          {level}
                        </span>
                      </td>
                      <td style={{ color: '#1a73e8', fontWeight: '600' }}>{boys}</td>
                      <td style={{ color: '#c2185b', fontWeight: '600' }}>{girls}</td>
                      <td style={{ fontWeight: 'bold' }}>{total}</td>
                      <td style={{ fontSize: '12px' }}>{boysPct}</td>
                      <td style={{ fontSize: '12px' }}>{girlsPct}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                  <td colSpan="2">📊 Total</td>
                  <td style={{ color: '#1a73e8' }}>{totalBoys}</td>
                  <td style={{ color: '#c2185b' }}>{totalGirls}</td>
                  <td>{totalStudents}</td>
                  <td>{totalStudents > 0 ? ((totalBoys / totalStudents) * 100).toFixed(0) + '%' : '-'}</td>
                  <td>{totalStudents > 0 ? ((totalGirls / totalStudents) * 100).toFixed(0) + '%' : '-'}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* ─── Level Breakdown ─────────────────────────────────── */}
      {enrollmentData.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">📊 Enrollment by Level</div>
          <div className="card-body">
            {['Nursery', 'Primary', 'O_Level', 'A_Level'].map(function (level) {
              var levelData = enrollmentData.filter(function (e) {
                return e && e.level === level;
              });
              var levelBoys = levelData.reduce(function (sum, e) {
                return sum + ((e && e.boys) ? Number(e.boys) : 0);
              }, 0);
              var levelGirls = levelData.reduce(function (sum, e) {
                return sum + ((e && e.girls) ? Number(e.girls) : 0);
              }, 0);
              var levelTotal = levelBoys + levelGirls;
              var levelPct = totalStudents > 0 ? ((levelTotal / totalStudents) * 100).toFixed(1) : 0;

              if (levelTotal === 0) return null;

              return (
                <div key={level} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                    <span style={{ fontWeight: '600' }}>{level.replace(/_/g, ' ')}</span>
                    <span style={{ color: '#666' }}>
                      {levelTotal} students ({levelPct}%) | 👦 {levelBoys} | 👧 {levelGirls}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: Math.min(100, levelPct) + '%',
                      height: '100%',
                      background: level === 'Nursery' ? '#ff9800' :
                        level === 'Primary' ? '#1a73e8' :
                          level === 'O_Level' ? '#0d904f' : '#7b1fa2',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Info Note ──────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">ℹ️ About Enrollment Tracking</div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Active Enrollment:</strong> Shows all currently active students grouped by class. This is the real-time enrollment snapshot.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Enrollment History:</strong> The student_enrollment table tracks historical enrollment (promotions, transfers, etc.) per academic year and term.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            💡 <strong>EMIS Census:</strong> Use this data for the annual EMIS census return. The Gender Parity Index (GPI) should be between 0.9 and 1.1.
          </p>
        </div>
      </div>
    </div>
  );
}
