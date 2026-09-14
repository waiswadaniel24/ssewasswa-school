// FileName: src/pages/Payroll.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Staff payroll — monthly payment tracking, bulk disbursement, balance calculation

import React, { useState, useEffect, useRef } from 'react';

export default function Payroll() {
  const [staff, setStaff] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null); // staff ID currently being paid
  const [bulkPaying, setBulkPaying] = useState(false);
  const [payAmounts, setPayAmounts] = useState({ /* no-op */ }); // { staffId: amount }

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Fetch staff with total paid for the selected month ──
  const fetchStaff = async () => {
    // FIXED: Split YYYY-MM into separate month and year for the query
    const [yr, mn] = month.split('-');

    try {
      const res = await window.electronAPI.queryDatabase(
        `SELECT s.id, s.first_name, s.last_name, s.role, s.salary, s.phone, s.momo_number, s.bank_account,
                 (SELECT COALESCE(SUM(p.amount_paid), 0) FROM payroll_payments p WHERE p.staff_id = s.id AND p.month = ? AND p.year = ?) as total_paid
                 FROM staff s
                 WHERE s.status = 'Active'
                 ORDER BY s.first_name`,
        [mn, yr]
      );
      if (!mountedRef.current) return;
      if (res && res.success) {
        setStaff(res.data || []);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Payroll: fetch staff error:', e.message);
      setMsg('❌ Error loading staff: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [month]);

  // ─── Pay individual staff member ──────────────────────────
  // FIXED: Uses separate payAmounts state instead of mutating staff object
  // FIXED: Splits month into month + year for the INSERT
  const handlePay = async (staffId, staffName) => {
    const amount = parseFloat(payAmounts[staffId]);
    if (!amount || amount <= 0) {
      setMsg('⚠️ Enter a valid amount for ' + staffName);
      return;
    }

    setPaying(staffId);
    setMsg('');

    try {
      // FIXED: Split month into separate month and year columns
      const [yr, mn] = month.split('-');

      const res = await window.electronAPI.queryDatabase(
        "INSERT INTO payroll_payments (staff_id, amount_paid, month, year) VALUES (?, ?, ?, ?)",
        [staffId, amount, mn, yr]
      );

      if (!mountedRef.current) return;

      if (res && res.success) {
        setMsg('✅ Paid UGX ' + amount.toLocaleString() + ' to ' + staffName);
        // Clear the input for this staff member
        setPayAmounts(prev => { const next = { ...prev }; delete next[staffId]; return next; });
        fetchStaff();
      } else {
        setMsg('❌ ' + ((res && res.error) || 'Payment failed'));
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Payroll: pay error:', e.message);
      setMsg('❌ Error: ' + e.message);
    } finally {
      if (mountedRef.current) setPaying(null);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Bulk pay all pending balances ────────────────────────
  const handleBulkPay = async () => {
    const pendingCount = staff.filter(s => (s.salary || 0) - (s.total_paid || 0) > 0).length;

    if (pendingCount === 0) {
      setMsg('ℹ️ All staff are fully paid for ' + formatMonth(month));
      return;
    }

    if (!confirm(
      'Disburse pending salary to all staff for ' + formatMonth(month) + '?\n\n' +
      pendingCount + ' staff member(s) will be paid their remaining balance.\n' +
      'This will create payroll payment records for each.'
    )) return;

    setBulkPaying(true);
    setMsg('⏳ Processing bulk disbursement...');

    try {
      // FIXED: Split month into separate month and year
      const [yr, mn] = month.split('-');
      let count = 0;
      let totalDisbursed = 0;

      for (const s of staff) {
        const balance = (s.salary || 0) - (s.total_paid || 0);
        if (balance > 0) {
          // Insert payment record
          const res = await window.electronAPI.queryDatabase(
            "INSERT INTO payroll_payments (staff_id, amount_paid, month, year) VALUES (?, ?, ?, ?)",
            [s.id, balance, mn, yr]
          );
          if (res && res.success) {
            count++;
            totalDisbursed += balance;
          }
        }
      }

      if (!mountedRef.current) return;
      setMsg('✅ Bulk disbursement complete! Paid ' + count + ' staff members, total UGX ' + totalDisbursed.toLocaleString());
      fetchStaff();
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Payroll: bulk pay error:', e.message);
      setMsg('❌ Error: ' + e.message);
    } finally {
      if (mountedRef.current) setBulkPaying(false);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 5000);
  };

  // ─── Format month for display (YYYY-MM → "Month Year") ────
  const formatMonth = (ym) => {
    const [yr, mn] = ym.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const idx = parseInt(mn) - 1;
    return (monthNames[idx] || mn) + ' ' + yr;
  };

  // ─── Loading state ────────────────────────────────────────
  if (loading && staff.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">Staff Payroll</h1>
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
            <p style={{ color: '#666' }}>Loading payroll...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">💰 Staff Payroll</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: msg.includes('❌') ? '#c62828' : (msg.includes('⚠️') ? '#e65100' : (msg.includes('ℹ️') ? '#1a73e8' : '#0d904f')),
          marginBottom: '15px', padding: '10px 14px',
          background: msg.includes('❌') ? '#ffebee' : (msg.includes('⚠️') ? '#fff3e0' : (msg.includes('ℹ️') ? '#e8f0fe' : '#e8f5e9')),
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Controls ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="form-group" style={{ maxWidth: '220px', margin: 0 }}>
          <label className="form-label">Select Month</label>
          <input
            type="month"
            className="form-input"
            value={month}
            onChange={(e) => { setMonth(e.target.value); setLoading(true); }}
          />
        </div>
        <button
          onClick={handleBulkPay}
          className="btn btn-primary"
          style={{ padding: '10px 24px' }}
          disabled={bulkPaying || staff.length === 0}
        >
          {bulkPaying ? '⏳ Processing...' : '💸 Bulk Pay All Pending'}
        </button>
      </div>

      {/* ─── Month Summary ─────────────────────────────────── */}
      <div style={{
        background: '#e8f0fe', padding: '12px 20px', borderRadius: '8px',
        marginBottom: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap'
      }}>
        <span style={{ fontWeight: '600', color: '#1a73e8' }}>
          📅 {formatMonth(month)}
        </span>
        <span style={{ color: '#5f6368' }}>
          👥 Active Staff: <strong>{staff.length}</strong>
        </span>
        <span style={{ color: '#5f6368' }}>
          💰 Total Salary: <strong>UGX {staff.reduce((s, st) => s + (st.salary || 0), 0).toLocaleString()}</strong>
        </span>
        <span style={{ color: '#0d904f' }}>
          ✅ Total Paid: <strong>UGX {staff.reduce((s, st) => s + (st.total_paid || 0), 0).toLocaleString()}</strong>
        </span>
      </div>

      {/* ─── Payroll Table ──────────────────────────────────── */}
      <div className="card">
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {staff.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
              No active staff found
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Salary (UGX)</th>
                  <th>Paid (UGX)</th>
                  <th>Balance (UGX)</th>
                  <th>Pay Action</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => {
                  const salary = s.salary || 0;
                  const paid = s.total_paid || 0;
                  const balance = salary - paid;
                  const isFullyPaid = balance <= 0;

                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: '600' }}>
                        {s.first_name} {s.last_name}
                      </td>
                      <td style={{ fontSize: '13px' }}>{s.role}</td>
                      <td>{salary.toLocaleString()}</td>
                      <td style={{ color: '#0d904f', fontWeight: 'bold' }}>
                        {paid.toLocaleString()}
                      </td>
                      <td style={{
                        color: isFullyPaid ? '#0d904f' : '#d32f2f',
                        fontWeight: 'bold'
                      }}>
                        {isFullyPaid ? '0' : balance.toLocaleString()}
                      </td>
                      <td>
                        {isFullyPaid ? (
                          <span style={{
                            color: '#0d904f', fontWeight: 'bold',
                            padding: '4px 10px',
                            background: '#e8f5e9', borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            ✅ FULLY PAID
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                              type="number"
                              className="form-input"
                              style={{ padding: '5px', maxWidth: '120px', fontSize: '13px' }}
                              placeholder={String(balance)}
                              value={payAmounts[s.id] || ''}
                              onChange={(e) => setPayAmounts(prev => ({
                                ...prev,
                                [s.id]: e.target.value
                              }))}
                              disabled={paying === s.id}
                            />
                            <button
                              onClick={() => handlePay(s.id, s.first_name + ' ' + s.last_name)}
                              className="btn btn-primary"
                              style={{
                                padding: '5px 12px',
                                width: 'auto',
                                marginTop: 0,
                                fontSize: '12px',
                                opacity: paying === s.id ? 0.6 : 1,
                                cursor: paying === s.id ? 'wait' : 'pointer'
                              }}
                              disabled={paying === s.id}
                            >
                              {paying === s.id ? '⏳' : '💰 Pay'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Help Text ──────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">ℹ️ Payroll Information</div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Individual Pay:</strong> Enter an amount in the &quot;Pay Action&quot;column and click &quot;Pay&quot; to record a payment for that staff member.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Bulk Pay:</strong> Click &quot;Bulk Pay All Pending&quot; to disburse the remaining balance to all staff who have not been fully paid for the selected month.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            💡 <strong>Deductions:</strong> Use the &quot;Deductions&quot; page to configure NSSF, PAYE, and other mandatory/individual deductions before processing payroll.
          </p>
        </div>
      </div>
    </div>
  );
}
