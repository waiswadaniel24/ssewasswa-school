// FileName: src/pages/Debts.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Debts & balances — outstanding fee tracking per student

import React, { useState, useEffect, useCallback, useRef } from 'react';

export default function Debts() {
  // ─── State variables with proper defaults ──────────────
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [filterClass, setFilterClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // ─── Refs ───────────────────────────────────────────────
  const mountedRef = useRef(true);
  const searchTimerRef = useRef(null);

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Load classes on mount ──────────────────────────────
  useEffect(function () {
    const loadClasses = async function () {
      if (!window.electronAPI || !window.electronAPI.queryDatabase) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      try {
        const r = await window.electronAPI.queryDatabase(
          "SELECT id, name FROM classes ORDER BY name"
        );
        if (!mountedRef.current) return;
        if (r && r.success && Array.isArray(r.data)) {
          setClasses(r.data);
        } else {
          setClasses([]);
        }
      } catch (e) {
        if (!mountedRef.current) return;
        console.error('Debts: load classes error:', (e && e.message) ? e.message : 'Unknown');
        setClasses([]);
      }
    };
    loadClasses();
  }, []);

  // ─── Load students with debt calculations ───────────────
  const loadStudents = useCallback(async function (search, classFilter) {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let query = (
        "SELECT s.id, s.first_name, s.last_name, s.admission_number, s.gender, s.class_id, " +
        "c.name as class_name, " +
        "(SELECT COALESCE(SUM(fs.amount), 0) FROM fees_structure fs WHERE fs.class_id = s.class_id) as expected, " +
        "(SELECT COALESCE(SUM(p.amount_paid), 0) FROM payments p WHERE p.student_id = s.id) as paid " +
        "FROM students s " +
        "LEFT JOIN classes c ON s.class_id = c.id " +
        "WHERE s.status = 'Active'"
      );

      const params = [];

      if (classFilter) {
        query += " AND s.class_id = ?";
        params.push(classFilter);
      }

      if (search && search.trim()) {
        query += " AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_number LIKE ?)";
        const st = '%' + search.trim() + '%';
        params.push(st, st, st);
      }

      query += " ORDER BY s.first_name LIMIT 500";

      const r = await window.electronAPI.queryDatabase(query, params);

      if (!mountedRef.current) return;

      if (r && r.success && Array.isArray(r.data)) {
        // Calculate balance for each student and filter to show only debtors
        const allStudents = r.data.map(function (s) {
          const expected = (s && typeof s.expected !== 'undefined' && s.expected !== null) ? Number(s.expected) : 0;
          const paid = (s && typeof s.paid !== 'undefined' && s.paid !== null) ? Number(s.paid) : 0;
          const balance = expected - paid;
          return {
            id: (s && s.id) ? s.id : null,
            first_name: (s && s.first_name) ? s.first_name : '',
            last_name: (s && s.last_name) ? s.last_name : '',
            admission_number: (s && s.admission_number) ? s.admission_number : '',
            gender: (s && s.gender) ? s.gender : 'M',
            class_name: (s && s.class_name) ? s.class_name : '-',
            expected: expected,
            paid: paid,
            balance: balance
          };
        });

        // Sort by balance descending (highest debt first)
        allStudents.sort(function (a, b) {
          return b.balance - a.balance;
        });

        setStudents(allStudents);
      } else {
        setStudents([]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('Debts: load students error:', errMsg);
      setMsg('❌ Error loading students: ' + errMsg);
      setStudents([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ─── Initial load ────────────────────────────────────────
  useEffect(function () {
    loadStudents('', '');
  }, [loadStudents]);

  // ─── Debounced search ────────────────────────────────────
  useEffect(function () {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(function () {
      loadStudents(searchTerm, filterClass);
    }, 300);

    return function () {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm, filterClass, loadStudents]);

  // ─── Derived values (all with null checks) ───────────────
  const debtors = students.filter(function (s) {
    return s && s.balance > 0;
  });

  const totalExpected = students.reduce(function (sum, s) {
    return sum + ((s && s.expected) ? s.expected : 0);
  }, 0);

  const totalPaid = students.reduce(function (sum, s) {
    return sum + ((s && s.paid) ? s.paid : 0);
  }, 0);

  const totalOutstanding = debtors.reduce(function (sum, s) {
    return sum + ((s && s.balance) ? s.balance : 0);
  }, 0);

  const debtorCount = debtors.length;
  const clearedCount = students.filter(function (s) {
    return s && s.balance <= 0;
  }).length;

  // ─── Format currency safely ──────────────────────────────
  const formatUGX = function (amount) {
    const num = Number(amount) || 0;
    return 'UGX ' + num.toLocaleString();
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading && students.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">📉 Debts & Balances</h1>
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
            <p style={{ color: '#666' }}>Loading debt records...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📉 Debts & Balances</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <div style={{
          padding: '10px 14px',
          marginBottom: '15px',
          borderRadius: '6px',
          background: (msg.indexOf('❌') >= 0) ? '#ffebee' : '#e8f5e9',
          color: (msg.indexOf('❌') >= 0) ? '#c62828' : '#0d904f'
        }}>
          {msg}
        </div>
      )}

      {/* ─── Summary Cards ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: '#e8f0fe', padding: '15px 20px', borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a73e8' }}>
            {students.length}
          </div>
          <div style={{ fontSize: '12px', color: '#5f6368' }}>Total Students</div>
        </div>
        <div style={{
          background: '#ffebee', padding: '15px 20px', borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d32f2f' }}>
            {debtorCount}
          </div>
          <div style={{ fontSize: '12px', color: '#5f6368' }}>With Outstanding Debt</div>
        </div>
        <div style={{
          background: '#e8f5e9', padding: '15px 20px', borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0d904f' }}>
            {clearedCount}
          </div>
          <div style={{ fontSize: '12px', color: '#5f6368' }}>Fully Cleared</div>
        </div>
        <div style={{
          background: '#fff3e0', padding: '15px 20px', borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65100' }}>
            {formatUGX(totalOutstanding)}
          </div>
          <div style={{ fontSize: '12px', color: '#5f6368' }}>Total Outstanding</div>
        </div>
      </div>

      {/* ─── Filters ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '12px', top: '50%',
                transform: 'translateY(-50%)', color: '#9aa0a6'
              }}>🔍</span>
              <input
                className="form-input"
                style={{ paddingLeft: '38px' }}
                value={searchTerm}
                onChange={function (e) { setSearchTerm(e.target.value); }}
                placeholder="Search by name or admission number..."
              />
            </div>
            <div style={{ minWidth: '180px' }}>
              <select
                className="form-input"
                value={filterClass}
                onChange={function (e) { setFilterClass(e.target.value); }}
              >
                <option value="">All Classes</option>
                {classes.map(function (c) {
                  return <option key={c.id} value={String(c.id)}>{c.name}</option>;
                })}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Debtors Table ──────────────────────────────────── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📉 Students with Outstanding Debt ({debtorCount})</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            Sorted by balance (highest first)
          </span>
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {debtorCount === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <p style={{ fontSize: '36px', marginBottom: '10px' }}>✅</p>
              <p style={{ fontWeight: '600', color: '#0d904f' }}>
                All students have cleared their fees!
              </p>
              {students.length > 0 && (
                <p style={{ fontSize: '12px', marginTop: '5px' }}>
                  {students.length} students checked, {clearedCount} fully cleared.
                </p>
              )}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Student Name</th>
                  <th>Adm No</th>
                  <th>Class</th>
                  <th>Expected</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {debtors.map(function (s, i) {
                  const firstName = (s && s.first_name) ? s.first_name : '';
                  const lastName = (s && s.last_name) ? s.last_name : '';
                  const admNo = (s && s.admission_number) ? s.admission_number : '-';
                  const className = (s && s.class_name) ? s.class_name : '-';
                  const expected = (s && s.expected) ? Number(s.expected) : 0;
                  const paid = (s && s.paid) ? Number(s.paid) : 0;
                  const balance = (s && s.balance) ? Number(s.balance) : 0;
                  const progressPct = expected > 0 ? Math.round((paid / expected) * 100) : 0;
                  const isHighDebt = balance > (expected * 0.5); // More than 50% outstanding

                  return (
                    <tr key={(s && s.id) ? s.id : i}>
                      <td style={{ color: '#999' }}>{i + 1}</td>
                      <td style={{ fontWeight: '600' }}>
                        {firstName} {lastName}
                      </td>
                      <td style={{ fontSize: '12px' }}>{admNo}</td>
                      <td style={{ fontSize: '12px' }}>{className}</td>
                      <td style={{ fontSize: '12px' }}>{formatUGX(expected)}</td>
                      <td style={{ fontSize: '12px', color: '#0d904f', fontWeight: '600' }}>
                        {formatUGX(paid)}
                      </td>
                      <td style={{
                        fontWeight: 'bold',
                        color: isHighDebt ? '#d32f2f' : '#e65100'
                      }}>
                        {formatUGX(balance)}
                      </td>
                      <td style={{ minWidth: '100px' }}>
                        <div style={{
                          width: '100%', height: '8px',
                          background: '#e0e0e0', borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: progressPct + '%',
                            height: '100%',
                            background: progressPct >= 50 ? '#0d904f' : '#e65100',
                            borderRadius: '4px',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                        <span style={{
                          fontSize: '10px',
                          color: '#999',
                          marginTop: '2px',
                          display: 'block'
                        }}>
                          {progressPct}% paid
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                  <td colSpan="4" style={{ textAlign: 'right', padding: '12px 16px' }}>
                    📊 Totals →
                  </td>
                  <td>{formatUGX(totalExpected)}</td>
                  <td style={{ color: '#0d904f' }}>{formatUGX(totalPaid)}</td>
                  <td style={{ color: '#d32f2f' }}>{formatUGX(totalOutstanding)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* ─── Info Note ──────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">ℹ️ Debt Calculation</div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Expected Fees:</strong> Sum of all fee structure amounts for the students class across all terms.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Paid:</strong> Total of all payment records for the student.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            💡 <strong>Balance:</strong> Expected minus Paid. Students with balance &gt; 0 are shown as debtors.
          </p>
        </div>
      </div>
    </div>
  );
}