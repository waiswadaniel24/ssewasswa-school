// FileName: src/pages/KPIDashboard.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: KPI Dashboard — PTR, PCR, dropout rate, GPI, pass rate per MoES standards

import React, { useState, useEffect, useRef } from 'react';

export default function KPIDashboard() {
  // ─── State variables with proper defaults ──────────────
  const [kpis, setKpis] = useState({
    ptr: 'N/A', pcr: 'N/A', dropoutRate: '0%',
    totalStudents: 0, totalBoys: 0, totalGirls: 0,
    totalTeachers: 0, totalStaff: 0, totalClassrooms: 0,
    passingRate: 'N/A', averageMarks: '0.0',
    dropoutCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Calculate KPIs on mount ──────────────────────────────
  useEffect(function () {
    var cancelled = false;

    const calc = async function () {
      if (!window.electronAPI || !window.electronAPI.queryDatabase) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      try {
        // ─── Student stats ──────────────────────────────
        var sRes = null;
        try {
          sRes = await window.electronAPI.queryDatabase(
            "SELECT COUNT(*) as c, COUNT(CASE WHEN gender = 'M' THEN 1 END) as boys, COUNT(CASE WHEN gender = 'F' THEN 1 END) as girls FROM students WHERE status = 'Active'"
          );
        } catch (e) { /* ignore */ }

        var totalStudents = 0, totalBoys = 0, totalGirls = 0;
        if (sRes && sRes.success && sRes.data && sRes.data.length > 0 && sRes.data[0]) {
          totalStudents = (sRes.data[0].c !== undefined && sRes.data[0].c !== null) ? Number(sRes.data[0].c) : 0;
          totalBoys = (sRes.data[0].boys !== undefined && sRes.data[0].boys !== null) ? Number(sRes.data[0].boys) : 0;
          totalGirls = (sRes.data[0].girls !== undefined && sRes.data[0].girls !== null) ? Number(sRes.data[0].girls) : 0;
        }

        // ─── Teacher stats ───────────────────────────────
        var tRes = null;
        try {
          tRes = await window.electronAPI.queryDatabase(
            "SELECT COUNT(*) as c FROM staff WHERE status = 'Active' AND role LIKE '%Teacher%'"
          );
        } catch (e) { /* ignore */ }

        var totalTeachers = 0;
        if (tRes && tRes.success && tRes.data && tRes.data.length > 0 && tRes.data[0]) {
          totalTeachers = (tRes.data[0].c !== undefined && tRes.data[0].c !== null) ? Number(tRes.data[0].c) : 0;
        }

        // ─── All staff stats ─────────────────────────────
        var stRes = null;
        try {
          stRes = await window.electronAPI.queryDatabase(
            "SELECT COUNT(*) as c FROM staff WHERE status = 'Active'"
          );
        } catch (e) { /* ignore */ }

        var totalStaff = 0;
        if (stRes && stRes.success && stRes.data && stRes.data.length > 0 && stRes.data[0]) {
          totalStaff = (stRes.data[0].c !== undefined && stRes.data[0].c !== null) ? Number(stRes.data[0].c) : 0;
        }

        // ─── Dropout count ───────────────────────────────
        var dRes = null;
        try {
          dRes = await window.electronAPI.queryDatabase(
            "SELECT COUNT(*) as c FROM students WHERE status = 'Dropped Out'"
          );
        } catch (e) { /* ignore */ }

        var dropouts = 0;
        if (dRes && dRes.success && dRes.data && dRes.data.length > 0 && dRes.data[0]) {
          dropouts = (dRes.data[0].c !== undefined && dRes.data[0].c !== null) ? Number(dRes.data[0].c) : 0;
        }

        // ─── Classroom count ─────────────────────────────
        var cRes = null;
        try {
          cRes = await window.electronAPI.queryDatabase(
            "SELECT classrooms_permanent + classrooms_semi_permanent + classrooms_temporary as c FROM infrastructure ORDER BY id DESC LIMIT 1"
          );
        } catch (e) { /* ignore */ }

        var classrooms = 0;
        if (cRes && cRes.success && cRes.data && cRes.data.length > 0 && cRes.data[0]) {
          var cVal = cRes.data[0].c;
          classrooms = (cVal !== undefined && cVal !== null && !isNaN(Number(cVal))) ? Number(cVal) : 0;
        }
        if (classrooms === 0) classrooms = 1; // Avoid division by zero

        // ─── Average marks & pass rate ──────────────────
        var mRes = null;
        try {
          mRes = await window.electronAPI.queryDatabase(
            "SELECT AVG(score) as avg_score, COUNT(CASE WHEN score >= 50 THEN 1 END) as passing, COUNT(*) as total FROM marks"
          );
        } catch (e) { /* ignore */ }

        var avgScore = 0, passing = 0, totalMarks = 0;
        if (mRes && mRes.success && mRes.data && mRes.data.length > 0 && mRes.data[0]) {
          var avgVal = mRes.data[0].avg_score;
          avgScore = (avgVal !== undefined && avgVal !== null && !isNaN(Number(avgVal))) ? Number(avgVal) : 0;
          passing = (mRes.data[0].passing !== undefined && mRes.data[0].passing !== null) ? Number(mRes.data[0].passing) : 0;
          totalMarks = (mRes.data[0].total !== undefined && mRes.data[0].total !== null) ? Number(mRes.data[0].total) : 0;
        }

        // ─── Calculate KPIs ─────────────────────────────
        var ptr = totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : 'N/A';
        var pcr = classrooms > 0 ? (totalStudents / classrooms).toFixed(1) : 'N/A';
        var dropoutRate = (totalStudents + dropouts) > 0
          ? ((dropouts / (totalStudents + dropouts)) * 100).toFixed(1) + '%'
          : '0%';
        var passingRate = totalMarks > 0 ? ((passing / totalMarks) * 100).toFixed(1) + '%' : 'N/A';

        if (!cancelled && mountedRef.current) {
          setKpis({
            ptr: ptr,
            pcr: pcr,
            dropoutRate: dropoutRate,
            totalStudents: totalStudents,
            totalBoys: totalBoys,
            totalGirls: totalGirls,
            totalTeachers: totalTeachers,
            totalStaff: totalStaff,
            totalClassrooms: classrooms,
            passingRate: passingRate,
            averageMarks: avgScore.toFixed(1),
            dropoutCount: dropouts
          });
        }
      } catch (error) {
        if (!cancelled) return;
        console.error('KPI calculation error:', (error && error.message) ? error.message : 'Unknown');
        if (!cancelled && mountedRef.current) {
          setMsg('❌ Error calculating KPIs: ' + ((error && error.message) ? error.message : 'Unknown'));
        }
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    };

    calc();
    return function () { cancelled = true; };
  }, []);

  // ─── KPI status functions ──────────────────────────────────
  var getKPIStatus = function (title, value) {
    var numValue = parseFloat(value);
    if (isNaN(numValue)) return 'neutral';

    if (title.indexOf('PTR') >= 0) {
      return numValue <= 40 ? 'good' : (numValue <= 55 ? 'fair' : 'poor');
    }
    if (title.indexOf('PCR') >= 0) {
      return numValue <= 45 ? 'good' : (numValue <= 60 ? 'fair' : 'poor');
    }
    if (title.indexOf('Dropout') >= 0) {
      return numValue <= 5 ? 'good' : (numValue <= 10 ? 'fair' : 'poor');
    }
    return 'neutral';
  };

  var getStatusColor = function (status) {
    switch (status) {
      case 'good': return '#0d904f';
      case 'fair': return '#f9ab00';
      case 'poor': return '#d93025';
      default: return '#1a73e8';
    }
  };

  // ─── GPI calculation (safe) ───────────────────────────────
  var gpi = 'N/A';
  var gpiStatus = 'neutral';
  if (kpis.totalBoys > 0 && kpis.totalGirls > 0) {
    var gpiVal = kpis.totalGirls / kpis.totalBoys;
    gpi = gpiVal.toFixed(2);
    gpiStatus = (gpiVal >= 0.9 && gpiVal <= 1.1) ? 'good' : 'fair';
  } else if (kpis.totalBoys === 0 && kpis.totalGirls === 0) {
    gpi = 'N/A';
    gpiStatus = 'neutral';
  } else if (kpis.totalBoys > 0 && kpis.totalGirls === 0) {
    gpi = '0.00';
    gpiStatus = 'poor';
  } else if (kpis.totalGirls > 0 && kpis.totalBoys === 0) {
    gpi = '∞';
    gpiStatus = 'poor';
  }

  // ─── KPI cards config ──────────────────────────────────────
  var cards = [
    { title: 'Total Students', value: kpis.totalStudents, icon: '👨\u200d🎓', color: '#1a73e8', subtitle: '👦 Boys: ' + kpis.totalBoys + ' | 👧 Girls: ' + kpis.totalGirls },
    { title: 'Total Teachers', value: kpis.totalTeachers, icon: '👨\u200d🏫', color: '#0d904f', subtitle: 'Total Staff: ' + kpis.totalStaff },
    { title: 'Total Classrooms', value: kpis.totalClassrooms, icon: '🏫', color: '#f9ab00' },
    { title: 'Pupil-Teacher Ratio (PTR)', value: kpis.ptr, icon: '📊', color: getStatusColor(getKPIStatus('PTR', kpis.ptr)), subtitle: 'MoES Target: ≤40:1' },
    { title: 'Pupil-Classroom Ratio (PCR)', value: kpis.pcr, icon: '📊', color: getStatusColor(getKPIStatus('PCR', kpis.pcr)), subtitle: 'MoES Target: ≤45:1' },
    { title: 'Dropout Rate', value: kpis.dropoutRate, icon: '📉', color: getStatusColor(getKPIStatus('Dropout', kpis.dropoutRate)), subtitle: 'MoES Target: <5% | ' + kpis.dropoutCount + ' dropped out' },
    { title: 'Pass Rate (Marks ≥50)', value: kpis.passingRate, icon: '✅', color: '#7c4dff' },
    { title: 'Average Score', value: kpis.averageMarks, icon: '📈', color: '#e91e63' }
  ];

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px',
            border: '4px solid #e0e0e0',
            borderTopColor: '#1a73e8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px'
          }} />
          <h2 style={{ color: '#666' }}>Calculating KPIs...</h2>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📊 KPI Dashboard (Key Performance Indicators)</h1>

      {msg && (
        <div style={{
          color: '#d93025', marginBottom: '15px', padding: '10px 14px',
          background: '#fce8e6', borderRadius: '6px'
        }}>
          {msg}
        </div>
      )}

      {/* ─── MoES Standards Banner ────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px', background: '#e8f0fe' }}>
        <div className="card-body" style={{ padding: '15px' }}>
          <p style={{ margin: 0, color: '#1a73e8', fontSize: '14px' }}>
            <strong>💡 MoES Standards:</strong> PTR should be ≤40:1 for Primary, ≤25:1 for Secondary. PCR should be ≤45:1. Dropout rate should be below 5%.
          </p>
        </div>
      </div>

      {/* ─── KPI Cards Grid ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {cards.map(function (card, i) {
          var status = getKPIStatus(card.title, card.value);
          var borderColor = getStatusColor(status);

          return (
            <div
              key={i}
              className="card"
              style={{ borderLeft: '5px solid ' + borderColor }}
            >
              <div className="card-body" style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '36px' }}>{card.icon}</span>
                <h3 style={{ margin: '10px 0 5px 0', color: '#333', fontSize: '14px' }}>{card.title}</h3>
                <h2 style={{ margin: '0', color: card.color, fontSize: '32px' }}>{card.value}</h2>
                {card.subtitle && <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '12px' }}>{card.subtitle}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Gender Parity Index ──────────────────────────────── */}
      <div className="card">
        <div className="card-header">⚖️ Gender Parity Index (GPI)</div>
        <div className="card-body">
          {kpis.totalBoys > 0 || kpis.totalGirls > 0 ? (
            <div>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>
                <strong>GPI:</strong> {gpi}
                <span style={{ marginLeft: '10px', color: getStatusColor(gpiStatus) }}>
                  {gpiStatus === 'good' ? '✅ Gender Parity Achieved' :
                    gpiStatus === 'fair' ? '⚠️ Gender Imbalance' :
                      gpiStatus === 'poor' ? '❌ Severe Gender Imbalance' : ''}
                </span>
              </p>
              <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                <div>
                  <span style={{ color: '#1a73e8', fontWeight: '600' }}>👦 Boys: {kpis.totalBoys}</span>
                  <div style={{
                    width: '200px', height: '10px',
                    background: '#e0e0e0', borderRadius: '5px',
                    marginTop: '5px', overflow: 'hidden'
                  }}>
                    <div style={{
                      width: ((kpis.totalBoys / (kpis.totalBoys + kpis.totalGirls)) * 100) + '%',
                      height: '100%', background: '#1a73e8', borderRadius: '5px'
                    }} />
                  </div>
                </div>
                <div>
                  <span style={{ color: '#e91e63', fontWeight: '600' }}>👧 Girls: {kpis.totalGirls}</span>
                  <div style={{
                    width: '200px', height: '10px',
                    background: '#e0e0e0', borderRadius: '5px',
                    marginTop: '5px', overflow: 'hidden'
                  }}>
                    <div style={{
                      width: ((kpis.totalGirls / (kpis.totalBoys + kpis.totalGirls)) * 100) + '%',
                      height: '100%', background: '#e91e63', borderRadius: '5px'
                    }} />
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '15px' }}>
                GPI = Girls ÷ Boys. Ideal range: 0.9 – 1.1 (gender parity achieved).
                GPI &lt; 0.9 = fewer girls enrolled. GPI &gt; 1.1 = fewer boys enrolled.
              </p>
            </div>
          ) : (
            <p style={{ color: '#999' }}>No student data available</p>
          )}
        </div>
      </div>

      {/* ─── KPI Legend ──────────────────────────────────────── */}
      <div style={{
        marginTop: '20px', padding: '12px 16px',
        background: '#f8f9fa', borderRadius: '8px',
        fontSize: '12px', color: '#666',
        display: 'flex', gap: '20px', flexWrap: 'wrap'
      }}>
        <span style={{ color: '#0d904f' }}>🟢 Good (meets MoES standard)</span>
        <span style={{ color: '#f9ab00' }}>🟡 Fair (close to standard)</span>
        <span style={{ color: '#d93025' }}>🔴 Poor (needs improvement)</span>
      </div>
    </div>
  );
}