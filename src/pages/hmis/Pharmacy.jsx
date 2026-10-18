// FileName: src/pages/hmis/Pharmacy.jsx
// Pharmacy Management

import React, { useState, useEffect, useRef } from 'react';

export default function Pharmacy() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      if (!window.electronAPI || !window.electronAPI.queryDatabase) { setLoading(false); return; }
      try {
        const r = await window.electronAPI.queryDatabase("SELECT id, drug_name, quantity, expiry_date, batch_number FROM pharmacy_stock ORDER BY drug_name LIMIT 100");
        if (mountedRef.current && r && r.success && Array.isArray(r.data)) setRecords(r.data);
      } catch (e) {}
      if (mountedRef.current) setLoading(false);
    };
    load();
    return () => { mountedRef.current = false; };
  }, []);

  if (loading) return <div className="page-container"><h1 className="page-title">💊 Pharmacy</h1><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">💊 Pharmacy</h1>
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">Records ({records.length})</div>
        <div className="card-body">
          {records.length === 0 ? <p style={{ textAlign: 'center', color: '#999' }}>No records yet</p> : (
            <table className="data-table"><thead><tr>{records[0] ? Object.keys(records[0]).map(k => <th key={k}>{k}</th>) : null}</tr></thead><tbody>
              {records.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{v || '-'}</td>)}</tr>)}
            </tbody></table>
          )}
        </div>
      </div>
    </div>
  );
}
