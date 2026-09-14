// FileName: src/pages/Dashboard.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Main dashboard — school stats, fees, payroll, trial alerts, power warnings

import React, { useState, useEffect, useRef } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    schoolName: 'Loading...',
    totalStudents: 0,
    totalBoys: 0,
    totalGirls: 0,
    totalStaff: 0,
    totalTeachers: 0,
    feesCollected: 0,
    outstandingDebts: 0,
    payroll: 0,
    lastSync: 'Never'
  });
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);
  const [powerMode, setPowerMode] = useState('Plugged In');
  const [emailAlert, setEmailAlert] = useState(false);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      if (!window.electronAPI) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      try {
        // ─── Check backup email ─────────────────────────────
        const emailRes = await window.electronAPI.queryDatabase(
          "SELECT value FROM system_settings WHERE key = 'backup_email'"
        );
        if (!mountedRef.current) return;
        if (emailRes && emailRes.success) {
          const emailVal = (emailRes.data.length > 0) ? emailRes.data[0].value : '';
          if (!emailVal || emailVal.trim() === '') {
            setEmailAlert(true);
          }
        }

        // ─── School name ─────────────────────────────────────
        const nameRes = await window.electronAPI.queryDatabase(
          "SELECT value FROM system_settings WHERE key = 'school_name'"
        );
        if (!mountedRef.current) return;
        const schoolName = (nameRes && nameRes.success && nameRes.data.length > 0)
          ? (nameRes.data[0].value || 'School')
          : 'School';

        // ─── Fees collected ─────────────────────────────────
        const feesRes = await window.electronAPI.queryDatabase(
          "SELECT SUM(amount_paid) as total FROM payments"
        );
        if (!mountedRef.current) return;
        const collected = (feesRes && feesRes.success && feesRes.data.length > 0)
          ? (feesRes.data[0].total || 0)
          : 0;

        // ─── Payroll paid ───────────────────────────────────
        const payRes = await window.electronAPI.queryDatabase(
          "SELECT SUM(amount_paid) as total FROM payroll_payments"
        );
        if (!mountedRef.current) return;
        const payroll = (payRes && payRes.success && payRes.data.length > 0)
          ? (payRes.data[0].total || 0)
          : 0;

        // ─── Expected fees (for debt calculation) ───────────
        const expRes = await window.electronAPI.queryDatabase(
          "SELECT SUM(fs.amount) as total FROM fees_structure fs JOIN students s ON fs.class_id = s.class_id WHERE s.status = 'Active'"
        );
        if (!mountedRef.current) return;

        // FIXED: original had `[] > 0` which is always false (array compared to number)
        const expected = (expRes && expRes.success && expRes.data.length > 0)
          ? (expRes.data[0].total || 0)
          : 0;

        // Outstanding = max(0, expected - collected)
        const outstanding = Math.max(0, expected - collected);

        // ─── EMIS stats (student/staff counts) ───────────────
        let emisStats = {
          totalStudents: 0,
          totalBoys: 0,
          totalGirls: 0,
          totalStaff: 0,
          totalTeachers: 0,
          lastSync: 'Never'
        };

        try {
          const r = await window.electronAPI.emisGetDashboardStats();
          if (!mountedRef.current) return;
          if (r && r.success && r.data) {
            emisStats = r.data;
          }
        } catch (e) {
          // Fallback: query directly
          try {
            const sr = await window.electronAPI.queryDatabase(
              "SELECT COUNT(*) as c FROM students WHERE status = 'Active'"
            );
            if (mountedRef.current && sr && sr.success) {
              emisStats.totalStudents = sr.data[0].c || 0;
            }
            const stfr = await window.electronAPI.queryDatabase(
              "SELECT COUNT(*) as c FROM staff WHERE status = 'Active'"
            );
            if (mountedRef.current && stfr && stfr.success) {
              emisStats.totalStaff = stfr.data[0].c || 0;
            }
          } catch (e2) {
            // Silent fail
          }
        }

        if (!mountedRef.current) return;

        setStats({
          schoolName: schoolName,
          totalStudents: emisStats.totalStudents || 0,
          totalBoys: emisStats.totalBoys || 0,
          totalGirls: emisStats.totalGirls || 0,
          totalStaff: emisStats.totalStaff || 0,
          totalTeachers: emisStats.totalTeachers || 0,
          feesCollected: collected,
          outstandingDebts: outstanding,
          payroll: payroll,
          lastSync: emisStats.lastSync || 'Never'
        });

        // ─── License / trial check ──────────────────────────
        try {
          const lic = await window.electronAPI.checkLicense();
          if (!mountedRef.current) return;
          if (lic && !lic.success && lic.isTrial) {
            setTrialDaysLeft(lic.daysLeft);
          }
        } catch (e) {
          // Silent fail
        }

        // ─── Power mode ─────────────────────────────────────
        try {
          const pRes = await window.electronAPI.getPowerMode();
          if (!mountedRef.current) return;
          if (pRes && pRes.success && pRes.mode) {
            setPowerMode(pRes.mode);
          }
        } catch (e) {
          // Silent fail
        }

      } catch (err) {
        console.error('Dashboard: fetch error:', err.message);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // ─── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Dashboard</h1>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e0e0e0',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#666', fontSize: '14px' }}>Loading dashboard...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">{stats.schoolName} — Dashboard</h1>

      {/* ─── Marketing Banner ─────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(90deg, #1a73e8, #00c853)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '25px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h3 style={{ margin: '0 0 5px 0', fontWeight: '700', fontSize: '16px' }}>
            🚀 Upgrade to Ssewasswa Cloud ERP
          </h3>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
            Access your school data from anywhere. Auto-sync to Uganda EMIS. Get 1 month FREE!
          </p>
        </div>
        <a href="https://t.me/SsewasswaTech" target="_blank" rel="noreferrer"
          style={{
            background: 'white',
            color: '#1a73e8',
            padding: '10px 20px',
            borderRadius: '20px',
            textDecoration: 'none',
            fontWeight: '700',
            fontSize: '14px'
          }}>
          Learn More
        </a>
      </div>

      {/* ─── Data Protection Alert ────────────────────────────── */}
      {emailAlert && (
        <div style={{
          background: '#ffebee',
          color: '#c62828',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: 'bold',
          border: '1px solid #ef9a9a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span>Data Protection Alert: No backup email configured! Go to Settings → Backups to secure your data.</span>
        </div>
      )}

      {/* ─── Trial Ending Alert ───────────────────────────────── */}
      {trialDaysLeft !== null && trialDaysLeft <= 2 && (
        <div style={{
          background: '#fff3e0',
          color: '#e65100',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: 'bold',
          border: '1px solid #ffcc80',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '20px' }}>⏳</span>
          <span>Trial Ending: You have {trialDaysLeft} day(s) left. Activate your software to avoid lockout.</span>
        </div>
      )}

      {/* ─── Battery Warning ──────────────────────────────────── */}
      {powerMode === 'Battery' && (
        <div style={{
          background: '#fce4ec',
          color: '#c2185b',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>🔋</span>
          <span>You are running on battery power. Please plug in your laptop to prevent data loss.</span>
        </div>
      )}

      {/* ─── Stats Grid ───────────────────────────────────────── */}
      <div className="dashboard-grid">

        {/* Total Students */}
        <div className="card">
          <div className="card-header">📊 Total Students</div>
          <div className="card-body">
            <h2 style={{ margin: '0 0 5px 0', color: '#1a73e8', fontSize: '32px' }}>
              {stats.totalStudents}
            </h2>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
              👦 Boys: {stats.totalBoys} | 👧 Girls: {stats.totalGirls}
            </p>
          </div>
        </div>

        {/* Total Staff */}
        <div className="card">
          <div className="card-header">👨‍🏫 Total Staff</div>
          <div className="card-body">
            <h2 style={{ margin: '0 0 5px 0', color: '#0d904f', fontSize: '32px' }}>
              {stats.totalStaff}
            </h2>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
              Teachers: {stats.totalTeachers}
            </p>
          </div>
        </div>

        {/* Fees Collected */}
        <div className="card">
          <div className="card-header">💵 Fees Collected</div>
          <div className="card-body">
            <h2 style={{ margin: 0, color: '#0d904f', fontSize: '28px' }}>
              UGX {stats.feesCollected.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Outstanding Debts */}
        <div className="card">
          <div className="card-header">📉 Outstanding Debts</div>
          <div className="card-body">
            <h2 style={{ margin: 0, color: '#d32f2f', fontSize: '28px' }}>
              UGX {stats.outstandingDebts.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Payroll Paid */}
        <div className="card">
          <div className="card-header">💰 Payroll Paid</div>
          <div className="card-body">
            <h2 style={{ margin: 0, color: '#e65100', fontSize: '28px' }}>
              UGX {stats.payroll.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* EMIS Last Sync */}
        <div className="card">
          <div className="card-header">🔄 EMIS Last Sync</div>
          <div className="card-body">
            <h2 style={{ margin: 0, color: '#5f6368', fontSize: '16px' }}>
              {stats.lastSync}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}