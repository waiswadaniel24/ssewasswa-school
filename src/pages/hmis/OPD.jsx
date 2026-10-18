// FileName: src/pages/hmis/OPD.jsx
// OPD Management — triage, consultation, diagnosis, prescription

import React, { useState, useEffect, useRef } from 'react';

export default function OPD() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      if (!window.electronAPI || !window.electronAPI.queryDatabase) { setLoading(false); return; }
      try {
        const r = await window.electronAPI.queryDatabase(
          "SELECT v.id, v.patient_id, p.first_name, p.last_name, v.complaint, v.diagnosis, v.prescription, v.doctor_name, v.visit_date FROM opd_visits v LEFT JOIN patients p ON v.patient_id = p.id ORDER BY v.id DESC LIMIT 50"
        );
        if (mountedRef.current && r && r.success && Array.isArray(r.data)) setVisits(r.data);
      } catch (e) {}
      if (mountedRef.current) setLoading(false);
    };
    load();
    return () => { mountedRef.current = false; };
  }, []);

  if (loading) return <div className="page-container"><h1 className="page-title">OPD Management</h1><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">🏥 OPD Management</h1>
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">Today's Visits ({visits.length})</div>
        <div className="card-body">
          {visits.length === 0 ? <p style={{ textAlign: 'center', color: '#999' }}>No OPD visits today</p> : (
            <table className="data-table"><thead><tr><th>Patient</th><th>Complaint</th><th>Diagnosis</th><th>Prescription</th><th>Doctor</th><th>Time</th></tr></thead><tbody>
              {visits.map((v) => (
                <tr key={v.id}>
                  <td>{v.first_name} {v.last_name}</td>
                  <td>{v.complaint || '-'}</td>
                  <td>{v.diagnosis || '-'}</td>
                  <td>{v.prescription || '-'}</td>
                  <td>{v.doctor_name || '-'}</td>
                  <td>{v.visit_date || '-'}</td>
                </tr>
              ))}
            </tbody></table>
          )}
        </div>
      </div>
    </div>
  );
}
