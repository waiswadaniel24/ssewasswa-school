// FileName: src/pages/Accounting.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Accounting & expenses — P&L tracking with visual bar chart

import React, { useState, useEffect, useCallback, useRef } from 'react';

const EXPENSE_CATEGORIES = [
  'Salaries & Wages',
  'Utilities (Water/Electricity)',
  'Maintenance & Repairs',
  'Office Supplies',
  'Transport & Fuel',
  'Food & Catering',
  'Cleaning & Sanitation',
  'Security',
  'Co-curricular Activities',
  'Examination Fees',
  'Construction & Development',
  'Bank Charges',
  'Other'
];

export default function Accounting() {
  // ─── State variables with proper defaults ──────────────
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Salaries & Wages',
    date: new Date().toISOString().split('T')[0]
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  // ─── Refs ───────────────────────────────────────────────
  const mountedRef = useRef(true);

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Fetch expense entries ────────────────────────────────
  const fetchData = useCallback(async function () {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    try {
      const res = await window.electronAPI.queryDatabase(
        "SELECT id, description, amount, category, date, created_at FROM expenses ORDER BY id DESC LIMIT 100"
      );

      if (!mountedRef.current) return;

      if (res && res.success && Array.isArray(res.data)) {
        setEntries(res.data);
      } else {
        setEntries([]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('Accounting: fetch error:', errMsg);
      setMsg('❌ Error loading expenses: ' + errMsg);
      setEntries([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ─── Initial load ────────────────────────────────────────
  useEffect(function () {
    fetchData();
  }, [fetchData]);

  // ─── Handle form submit ───────────────────────────────────
  const handleSubmit = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    // Validate
    if (!formData.description.trim()) {
      setMsg('⚠️ Description is required');
      return;
    }

    const parsedAmount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setMsg('⚠️ Please enter a valid amount greater than 0');
      return;
    }

    if (!formData.category) {
      setMsg('⚠️ Please select a category');
      return;
    }

    setSaving(true);
    setMsg('');

    try {
      const res = await window.electronAPI.queryDatabase(
        "INSERT INTO expenses (description, amount, category, date) VALUES (?, ?, ?, ?)",
        [
          formData.description.trim(),
          parsedAmount,
          formData.category,
          formData.date || new Date().toISOString().split('T')[0]
        ]
      );

      if (!mountedRef.current) return;

      if (res && res.success) {
        setMsg('✅ Expense recorded: UGX ' + parsedAmount.toLocaleString() + ' for ' + formData.category);
        setFormData({
          description: '',
          amount: '',
          category: 'Salaries & Wages',
          date: new Date().toISOString().split('T')[0]
        });
        fetchData();
      } else {
        const errMsg = (res && res.error) ? res.error : 'Failed to record expense';
        setMsg('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('Accounting: submit error:', errMsg);
      setMsg('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 4000);
  };

  // ─── Delete expense ───────────────────────────────────────
  const handleDelete = async function (id, description) {
    if (!confirm('Delete expense "' + (description || 'Unknown') + '"?')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM expenses WHERE id = ?", [id]
      );

      if (!mountedRef.current) return;

      setMsg('🗑️ Expense deleted');
      fetchData();
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error deleting: ' + errMsg);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 3000);
  };

  // ─── Derived values (all with null checks) ───────────────
  const filteredEntries = (filterCategory)
    ? entries.filter(function (e) { return e && e.category === filterCategory; })
    : entries;

  const totalExpenses = filteredEntries.reduce(function (sum, e) {
    const amount = (e && e.amount) ? Number(e.amount) : 0;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const maxAmount = filteredEntries.reduce(function (max, e) {
    const amount = (e && e.amount) ? Number(e.amount) : 0;
    return Math.max(max, isNaN(amount) ? 0 : amount);
  }, 1); // Start at 1 to avoid division by zero

  // ─── Category totals ──────────────────────────────────────
  const categoryTotals = { /* no-op */ };
  entries.forEach(function (e) {
    if (!e || !e.category) return;
    const amount = (e.amount) ? Number(e.amount) : 0;
    if (!categoryTotals[e.category]) categoryTotals[e.category] = 0;
    categoryTotals[e.category] += isNaN(amount) ? 0 : amount;
  });

  // ─── Format currency safely ───────────────────────────────
  const formatUGX = function (amount) {
    const num = Number(amount) || 0;
    return 'UGX ' + num.toLocaleString();
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">📊 Accounting & Expenses (P&L)</h1>
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
            <p style={{ color: '#666' }}>Loading expenses...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📊 Accounting & Expenses (P&L)</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: (msg.indexOf('❌') >= 0) ? '#c62828' :
            (msg.indexOf('⚠️') >= 0) ? '#e65100' : '#0d904f',
          marginBottom: '15px', padding: '10px 14px',
          background: (msg.indexOf('❌') >= 0) ? '#ffebee' :
            (msg.indexOf('⚠️') >= 0) ? '#fff3e0' : '#e8f5e9',
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* ═══════════════════════════════════════════════════ */}
        {/* LEFT: Log Expense Form                               */}
        {/* ═══════════════════════════════════════════════════ */}
        <div style={{ flex: 1, minWidth: '300px' }} className="card">
          <div className="card-header">📝 Log Expense</div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <input
                  className="form-input"
                  value={formData.description}
                  onChange={function (e) { setFormData({ ...formData, description: e.target.value }); }}
                  placeholder="e.g. 20 reams of A4 paper"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-input"
                  value={formData.category}
                  onChange={function (e) { setFormData({ ...formData, category: e.target.value }); }}
                >
                  {EXPENSE_CATEGORIES.map(function (c) {
                    return <option key={c} value={c}>{c}</option>;
                  })}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (UGX) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.amount}
                  onChange={function (e) { setFormData({ ...formData, amount: e.target.value }); }}
                  placeholder="e.g. 50000"
                  required
                  min="1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={function (e) { setFormData({ ...formData, date: e.target.value }); }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? '⏳ Saving...' : '💾 Record Expense'}
              </button>
            </form>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* RIGHT: Visual Chart + Total                          */}
        {/* ═══════════════════════════════════════════════════ */}
        <div style={{ flex: 2, minWidth: '300px' }} className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📊 Expense Breakdown</span>
            <select
              value={filterCategory}
              onChange={function (e) { setFilterCategory(e.target.value); }}
              style={{
                padding: '4px 10px', fontSize: '12px',
                border: '1px solid #dadce0', borderRadius: '4px'
              }}
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map(function (c) {
                return <option key={c} value={c}>{c}</option>;
              })}
            </select>
          </div>
          <div className="card-body">
            {/* Total */}
            <div style={{
              padding: '12px 16px', background: '#e8f0fe',
              borderRadius: '8px', marginBottom: '20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: '14px', color: '#5f6368' }}>
                💰 Total Expenses {filterCategory ? '(' + filterCategory + ')' : ''}:
              </span>
              <strong style={{ fontSize: '20px', color: '#1a73e8' }}>
                {formatUGX(totalExpenses)}
              </strong>
            </div>

            {/* Category breakdown bars */}
            {Object.keys(categoryTotals).length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                No expenses recorded yet
              </p>
            ) : (
              <div>
                {Object.entries(categoryTotals)
                  .sort(function (a, b) { return b[1] - a[1]; })
                  .map(function (entry) {
                    const catName = entry[0];
                    const catTotal = entry[1];
                    const pct = Math.round((catTotal / totalExpenses) * 100);
                    const barWidth = Math.max(2, Math.round((catTotal / maxAmount) * 100));

                    return (
                      <div key={catName} style={{ marginBottom: '12px' }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          marginBottom: '4px', fontSize: '12px'
                        }}>
                          <span style={{ fontWeight: '600', color: '#333' }}>
                            {catName}
                          </span>
                          <span style={{ color: '#666' }}>
                            {formatUGX(catTotal)} ({pct}%)
                          </span>
                        </div>
                        <div style={{
                          width: '100%', height: '10px',
                          background: '#f1f3f4', borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: barWidth + '%',
                            height: '100%',
                            background: '#1a73e8',
                            borderRadius: '4px',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Recent Expenses Table ────────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">📋 Recent Expenses ({filteredEntries.length})</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {filteredEntries.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              {filterCategory ? 'No expenses in this category' : 'No expenses recorded yet'}
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(function (e, i) {
                  const id = (e && e.id) ? e.id : i;
                  const date = (e && e.date) ? e.date : '-';
                  const desc = (e && e.description) ? e.description : '-';
                  const cat = (e && e.category) ? e.category : '-';
                  const amount = (e && e.amount) ? Number(e.amount) : 0;

                  // Category color
                  let catBg = '#f1f3f4';
                  let catColor = '#5f6368';
                  if (cat.indexOf('Salaries') >= 0) { catBg = '#e8f0fe'; catColor = '#1a73e8'; }
                  else if (cat.indexOf('Utilities') >= 0) { catBg = '#fff3e0'; catColor = '#e65100'; }
                  else if (cat.indexOf('Maintenance') >= 0) { catBg = '#ffebee'; catColor = '#d32f2f'; }
                  else if (cat.indexOf('Food') >= 0) { catBg = '#e8f5e9'; catColor = '#0d904f'; }
                  else if (cat.indexOf('Transport') >= 0) { catBg = '#e3f2fd'; catColor = '#1565c0'; }

                  return (
                    <tr key={id}>
                      <td style={{ color: '#999' }}>{id}</td>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{date}</td>
                      <td style={{ fontWeight: '600' }}>{desc}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: catBg, color: catColor,
                          fontSize: '11px', fontWeight: '600'
                        }}>
                          {cat}
                        </span>
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#d32f2f' }}>
                        {formatUGX(amount)}
                      </td>
                      <td>
                        <button
                          onClick={function () { handleDelete(id, desc); }}
                          style={{
                            color: '#d32f2f', border: 'none',
                            background: 'none', cursor: 'pointer',
                            fontSize: '12px', fontWeight: '600'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                  <td colSpan="4" style={{ textAlign: 'right', padding: '12px 16px' }}>
                    Total →
                  </td>
                  <td style={{ color: '#d32f2f' }}>
                    {formatUGX(totalExpenses)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
