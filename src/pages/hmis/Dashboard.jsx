// FileName: src/pages/hmis/Dashboard.jsx
// Ssewasswa HMIS Dashboard — hospital stats

import React, { useState, useEffect, useRef } from 'react';

export default function HMISDashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0, totalOPD: 0, totalIPD: 0, totalLab: 0,
    totalRevenue: 0, totalDebts: 0, bedOccupancy: 0, totalBeds: 0,
  });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const loadStats = async () => {
      if (!window.electronAPI || !window.electronAPI.queryDatabase) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      try {
        const queries = [
          { key: 'totalPatients', sql: "SELECT COUNT(*) as count FROM hmis_patients" },
          { key: 'totalOPD', sql: "SELECT COUNT(*) as count FROM hmis_opd_visits WHERE date(date) = date('now')" },
          { key: 'totalIPD', sql: "SELECT COUNT(*) as count FROM hmis_ipd_admissions WHERE discharge_date IS NULL" },
          { key: 'totalLab', sql: "SELECT COUNT(*) as count FROM hmis_lab_orders WHERE result_date IS NULL" },
          { key: 'totalRevenue', sql: "SELECT COALESCE(SUM(amount), 0) as total FROM hmis_billing_invoices WHERE status = 'Paid'" },
          { key: 'totalDebts', sql: "SELECT COALESCE(SUM(amount), 0) as total FROM hmis_billing_invoices WHERE status = 'Pending'" },
          { key: 'totalBeds', sql: "SELECT COUNT(*) as count FROM beds" },
          { key: 'bedOccupancy', sql: "SELECT COUNT(*) as count FROM hmis_ipd_admissions WHERE discharge_date IS NULL" },
        ];
        const results = {};
        for (const q of queries) {
          try {
            const r = await window.electronAPI.queryDatabase(q.sql);
            if (r && r.success && r.data && r.data[0]) {
              results[q.key] = r.data[0].count || r.data[0].total || 0;
            }
          } catch (e) { results[q.key] = 0; }
        }
        if (mountedRef.current) { setStats(results); setLoading(false); }
      } catch (e) {
        if (mountedRef.current) setLoading(false);
      }
    };
    loadStats();
    return () => { mountedRef.current = false; };
  }, []);

  if (loading) {
    return <div className="page-container"><h1 className="page-title">HMIS Dashboard</h1><p>Loading...</p></div>;
  }

  const occupancyRate = stats.totalBeds > 0 ? Math.round((stats.bedOccupancy / stats.totalBeds) * 100) : 0;

  const cards = [
    { label: 'Total Patients', value: stats.totalPatients, icon: '👥', color: '#1a73e8' },
    { label: 'OPD Today', value: stats.totalOPD, icon: '🏥', color: '#0b8043' },
    { label: 'IPD Admissions', value: stats.totalIPD, icon: '🛏️', color: '#e8710a' },
    { label: 'Pending Lab Tests', value: stats.totalLab, icon: '🔬', color: '#9c27b0' },
    { label: 'Revenue (Paid)', value: `UGX ${(stats.totalRevenue || 0).toLocaleString()}`, icon: '💰', color: '#0b8043' },
    { label: 'Outstanding Debts', value: `UGX ${(stats.totalDebts || 0).toLocaleString()}`, icon: '📉', color: '#d32f2f' },
    { label: 'Bed Occupancy', value: `${occupancyRate}% (${stats.bedOccupancy}/${stats.totalBeds})`, icon: '📊', color: '#5c6bc0' },
  ];

  return (
    <div className="page-container">
      <h1 className="page-title">🏥 HMIS Dashboard</h1>
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {cards.map((card) => (
          <div key={card.label} className="card">
            <div className="card-body" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{card.icon}</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
