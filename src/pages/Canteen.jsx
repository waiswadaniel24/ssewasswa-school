// FileName: src/pages/Canteen.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Canteen (tuck shop) — item management, sales, credit tracking

import React, { useState, useEffect, useCallback, useRef } from 'react';

export default function Canteen() {
  // ─── State variables with proper defaults ──────────────
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [students, setStudents] = useState([]);
  const [selStudent, setSelStudent] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);

  // Item form
  const [itemForm, setItemForm] = useState({
    id: null, name: '', price: 0, quantity: 0
  });

  // ─── Refs ───────────────────────────────────────────────
  const mountedRef = useRef(true);

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Fetch all data ──────────────────────────────────────
  const fetchData = useCallback(async function () {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    try {
      // Load items, sales, and students in parallel
      const [iRes, sRes, stuRes] = await Promise.all([
        window.electronAPI.queryDatabase(
          "SELECT id, name, price, quantity FROM canteen_items ORDER BY name"
        ),
        window.electronAPI.queryDatabase(
          "SELECT cs.id, cs.student_id, cs.total_amount, cs.is_credit, cs.created_at, " +
          "s.first_name, s.last_name, s.admission_number " +
          "FROM canteen_sales cs " +
          "LEFT JOIN students s ON cs.student_id = s.id " +
          "ORDER BY cs.id DESC LIMIT 50"
        ),
        window.electronAPI.queryDatabase(
          "SELECT id, first_name, last_name, admission_number FROM students WHERE status = 'Active' ORDER BY first_name LIMIT 500"
        )
      ]);

      if (!mountedRef.current) return;

      if (iRes && iRes.success && Array.isArray(iRes.data)) {
        setItems(iRes.data);
      } else {
        setItems([]);
      }

      if (sRes && sRes.success && Array.isArray(sRes.data)) {
        setSales(sRes.data);
      } else {
        setSales([]);
      }

      if (stuRes && stuRes.success && Array.isArray(stuRes.data)) {
        setStudents(stuRes.data);
      } else {
        setStudents([]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('Canteen: fetch error:', errMsg);
      setMsg('❌ Error loading data: ' + errMsg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ─── Initial load ────────────────────────────────────────
  useEffect(function () {
    fetchData();
  }, [fetchData]);

  // ─── Handle item form submit ─────────────────────────────
  const handleItemSubmit = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    // Validate
    if (!itemForm.name || !itemForm.name.trim()) {
      setMsg('⚠️ Item name is required');
      return;
    }

    const price = parseFloat(itemForm.price) || 0;
    const quantity = parseInt(itemForm.quantity) || 0;

    if (price < 0) {
      setMsg('⚠️ Price cannot be negative');
      return;
    }

    setSaving(true);
    setMsg('');

    try {
      let result;

      if (itemForm.id) {
        // Update
        result = await window.electronAPI.queryDatabase(
          "UPDATE canteen_items SET name = ?, price = ?, quantity = ? WHERE id = ?",
          [itemForm.name.trim(), price, quantity, itemForm.id]
        );
      } else {
        // Insert
        result = await window.electronAPI.queryDatabase(
          "INSERT INTO canteen_items (name, price, quantity) VALUES (?, ?, ?)",
          [itemForm.name.trim(), price, quantity]
        );
      }

      if (!mountedRef.current) return;

      if (result && result.success) {
        setMsg(itemForm.id ? '✅ Item updated!' : '✅ Item added!');
        setShowItemForm(false);
        setItemForm({ id: null, name: '', price: 0, quantity: 0 });
        fetchData();
      } else {
        const errMsg = (result && result.error) ? result.error : 'Failed to save item';
        setMsg('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 3000);
  };

  // ─── Delete item ─────────────────────────────────────────
  const handleDeleteItem = async function (id, name) {
    if (!confirm('Delete item "' + (name || 'Unknown') + '" from inventory?')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM canteen_items WHERE id = ?", [id]
      );

      if (!mountedRef.current) return;
      setMsg('🗑️ Item deleted');
      fetchData();
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error deleting: ' + ((e && e.message) ? e.message : 'Unknown'));
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 3000);
  };

  // ─── Edit item (populate form) ────────────────────────────
  const handleEditItem = function (item) {
    if (!item) return;
    setItemForm({
      id: item.id || null,
      name: item.name || '',
      price: item.price || 0,
      quantity: item.quantity || 0
    });
    setShowItemForm(true);
  };

  // ─── Record sale ─────────────────────────────────────────
  const handleSale = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    if (!selStudent) {
      setMsg('⚠️ Please select a student');
      return;
    }

    const amount = parseFloat(saleAmount);
    if (!saleAmount || isNaN(amount) || amount <= 0) {
      setMsg('⚠️ Please enter a valid amount');
      return;
    }

    setSaving(true);
    setMsg('');

    try {
      const result = await window.electronAPI.queryDatabase(
        "INSERT INTO canteen_sales (student_id, total_amount, is_credit) VALUES (?, ?, ?)",
        [selStudent, amount, isCredit ? 1 : 0]
      );

      if (!mountedRef.current) return;

      if (result && result.success) {
        const student = students.find(function (s) {
          return s && String(s.id) === String(selStudent);
        });
        const studentName = student
          ? ((student.first_name || '') + ' ' + (student.last_name || ''))
          : 'Student';

        setMsg('✅ Sale recorded: UGX ' + amount.toLocaleString() +
          (isCredit ? ' (CREDIT)' : ' (PAID)') + ' for ' + studentName);

        setSelStudent('');
        setSaleAmount('');
        setIsCredit(false);
        fetchData();
      } else {
        const errMsg = (result && result.error) ? result.error : 'Failed to record sale';
        setMsg('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 4000);
  };

  // ─── Derived values (all with null checks) ───────────────
  const totalSales = sales.reduce(function (sum, s) {
    const amount = (s && s.total_amount) ? Number(s.total_amount) : 0;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const creditSales = sales.filter(function (s) {
    return s && (s.is_credit === 1 || s.is_credit === true);
  });

  const totalCredit = creditSales.reduce(function (sum, s) {
    const amount = (s && s.total_amount) ? Number(s.total_amount) : 0;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const lowStockItems = items.filter(function (item) {
    return item && (item.quantity !== undefined && item.quantity !== null) && Number(item.quantity) <= 5;
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
        <h1 className="page-title">🏪 Canteen (Tuck Shop)</h1>
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
            <p style={{ color: '#666' }}>Loading canteen data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🏪 Canteen (Tuck Shop)</h1>

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

      {/* ─── Summary Cards ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '12px', marginBottom: '20px'
      }}>
        <div style={{
          background: '#e8f5e9', padding: '12px 16px', borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d904f' }}>
            {formatUGX(totalSales)}
          </div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Sales</div>
        </div>
        <div style={{
          background: '#fff3e0', padding: '12px 16px', borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65100' }}>
            {formatUGX(totalCredit)}
          </div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Outstanding Credit</div>
        </div>
        <div style={{
          background: '#e8f0fe', padding: '12px 16px', borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>
            {items.length}
          </div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Items in Stock</div>
        </div>
        {lowStockItems.length > 0 && (
          <div style={{
            background: '#ffebee', padding: '12px 16px', borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>
              {lowStockItems.length}
            </div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>⚠️ Low Stock Items</div>
          </div>
        )}
      </div>

      {/* ─── Low Stock Alert ────────────────────────────────── */}
      {lowStockItems.length > 0 && (
        <div style={{
          background: '#ffebee', border: '1px solid #ef9a9a',
          padding: '10px 14px', borderRadius: '6px', marginBottom: '15px',
          fontSize: '13px', color: '#c62828'
        }}>
          ⚠️ <strong>Low Stock Alert:</strong> {lowStockItems.map(function (i) { return (i.name || 'Unknown'); }).join(', ')} — restock soon!
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* ═══════════════════════════════════════════════════ */}
        {/* LEFT: Item Management + Sale Form                   */}
        {/* ═══════════════════════════════════════════════════ */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          {/* ─── Add/Edit Item Form ─────────────────────────── */}
          {showItemForm && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">
                {itemForm.id ? '✏️ Edit Item' : '➕ Add Item'}
              </div>
              <div className="card-body">
                <form onSubmit={handleItemSubmit}>
                  <div className="form-group">
                    <label className="form-label">Item Name *</label>
                    <input
                      className="form-input"
                      value={itemForm.name}
                      onChange={function (e) { setItemForm({ ...itemForm, name: e.target.value }); }}
                      placeholder="e.g. Bread, Soda, Biscuits"
                      required
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Price (UGX)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={itemForm.price}
                        onChange={function (e) { setItemForm({ ...itemForm, price: parseFloat(e.target.value) || 0 }); }}
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        className="form-input"
                        value={itemForm.quantity}
                        onChange={function (e) { setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 0 }); }}
                        min="0"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? '⏳' : '💾 Save'}
                    </button>
                    <button
                      type="button"
                      onClick={function () {
                        setShowItemForm(false);
                        setItemForm({ id: null, name: '', price: 0, quantity: 0 });
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ─── Items Table ────────────────────────────────── */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📦 Inventory ({items.length})</span>
              <button
                onClick={function () {
                  setShowItemForm(!showItemForm);
                  setItemForm({ id: null, name: '', price: 0, quantity: 0 });
                }}
                className="btn btn-primary"
                style={{ width: 'auto', padding: '5px 12px', fontSize: '12px' }}
              >
                {showItemForm ? '❌ Cancel' : '➕ Add Item'}
              </button>
            </div>
            <div className="card-body" style={{ overflowX: 'auto' }}>
              {items.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  No items in inventory
                </p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(function (item, i) {
                      const id = (item && item.id) ? item.id : i;
                      const name = (item && item.name) ? item.name : '-';
                      const price = (item && item.price) ? Number(item.price) : 0;
                      const qty = (item && item.quantity !== undefined && item.quantity !== null) ? Number(item.quantity) : 0;
                      const isLow = qty <= 5;

                      return (
                        <tr key={id}>
                          <td style={{ fontWeight: '600' }}>{name}</td>
                          <td style={{ color: '#0d904f', fontWeight: '600' }}>
                            {formatUGX(price)}
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px',
                              background: isLow ? '#ffebee' : '#e8f5e9',
                              color: isLow ? '#d32f2f' : '#0d904f',
                              fontSize: '12px', fontWeight: '600'
                            }}>
                              {qty} {isLow ? '⚠️' : ''}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={function () { handleEditItem(item); }}
                                style={{ color: '#1a73e8', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={function () { handleDeleteItem(id, name); }}
                                style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* RIGHT: Record Sale + Sales History                   */}
        {/* ═══════════════════════════════════════════════════ */}
        <div style={{ flex: 1.5, minWidth: '350px' }}>
          {/* ─── Record Sale Form ───────────────────────────── */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">💳 Record Sale</div>
            <div className="card-body">
              <form onSubmit={handleSale}>
                <div className="form-group">
                  <label className="form-label">Student</label>
                  <select
                    className="form-input"
                    value={selStudent}
                    onChange={function (e) { setSelStudent(e.target.value); }}
                  >
                    <option value="">-- Select Student --</option>
                    {students.map(function (s) {
                      return (
                        <option key={s.id} value={String(s.id)}>
                          {(s.first_name || '')} {(s.last_name || '')} ({s.admission_number || 'No Adm'})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (UGX) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={saleAmount}
                    onChange={function (e) { setSaleAmount(e.target.value); }}
                    placeholder="e.g. 2000"
                    required
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isCredit}
                      onChange={function (e) { setIsCredit(e.target.checked); }}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <span>Mark as Credit (student will pay later)</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !selStudent}
                >
                  {saving ? '⏳ Recording...' : '💳 Record Sale'}
                </button>
              </form>
            </div>
          </div>

          {/* ─── Sales History ─────────────────────────────── */}
          <div className="card">
            <div className="card-header">📋 Recent Sales ({sales.length})</div>
            <div className="card-body" style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
              {sales.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                  No sales recorded yet
                </p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Amount</th>
                      <th>Type</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(function (sale, i) {
                      const id = (sale && sale.id) ? sale.id : i;
                      const firstName = (sale && sale.first_name) ? sale.first_name : '';
                      const lastName = (sale && sale.last_name) ? sale.last_name : '';
                      const admNo = (sale && sale.admission_number) ? sale.admission_number : '';
                      const studentName = (firstName + ' ' + lastName).trim() || 'Walk-in Customer';
                      const amount = (sale && sale.total_amount) ? Number(sale.total_amount) : 0;
                      const credit = (sale && (sale.is_credit === 1 || sale.is_credit === true));
                      const dateStr = (sale && sale.created_at) ? String(sale.created_at).slice(0, 19) : '-';

                      return (
                        <tr key={id}>
                          <td style={{ color: '#999' }}>{id}</td>
                          <td style={{ fontWeight: '600' }}>
                            {studentName}
                            {admNo && (
                              <span style={{ marginLeft: '4px', fontSize: '11px', color: '#999' }}>
                                ({admNo})
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 'bold', color: '#0d904f' }}>
                            {formatUGX(amount)}
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px',
                              background: credit ? '#fff3e0' : '#e8f5e9',
                              color: credit ? '#e65100' : '#0d904f',
                              fontSize: '11px', fontWeight: '600'
                            }}>
                              {credit ? '⏳ CREDIT' : '✅ PAID'}
                            </span>
                          </td>
                          <td style={{ fontSize: '11px', color: '#999' }}>{dateStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}