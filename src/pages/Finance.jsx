// FileName: src/pages/Finance.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Finance & fees — fee structure, quick pay, payment recording, receipts

import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const PAYMENT_METHODS = ['Cash', 'MTN MoMo', 'Airtel Money', 'Bank', 'Cheque'];

export default function Finance() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeMatrix, setFeeMatrix] = useState({ /* no-op */ });
  const [payments, setPayments] = useState([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [selTerm, setSelTerm] = useState('Term 1');
  const [payData, setPayData] = useState({ student_id: '', amount_paid: '', method: 'Cash', reference: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quickPay, setQuickPay] = useState('');
  const [quickStudent, setQuickStudent] = useState(null);

  const mountedRef = useRef(true);
  const quickPayTimerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Fetch all data on mount ───────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      // FIXED: Uses backfillPaycodes() instead of invoke('backfill-paycodes')
      if (window.electronAPI.backfillPaycodes) {
        try {
          const r = await window.electronAPI.backfillPaycodes();
          if (r && r.success && r.data && r.data.count > 0) {
            console.log('Generated ' + r.data.count + ' paycodes');
          }
        } catch (e) { /* ignore paycode errors */ }
      }

      // Load classes
      const cRes = await window.electronAPI.queryDatabase("SELECT id, name FROM classes ORDER BY name ASC");
      if (!mountedRef.current) return;

      if (cRes && cRes.success) {
        setClasses(cRes.data || []);
        // Initialize fee matrix
        const initM = { /* no-op */ };
        cRes.data.forEach(c => {
          initM[c.id] = { 'Term 1': '', 'Term 2': '', 'Term 3': '' };
        });

        // Load existing fee structures
        const fRes = await window.electronAPI.queryDatabase(
          "SELECT class_id, term, amount FROM fees_structure"
        );
        if (!mountedRef.current) return;

        if (fRes && fRes.success) {
          fRes.data.forEach(f => {
            if (initM[f.class_id]) initM[f.class_id][f.term] = f.amount;
          });
        }
        setFeeMatrix(initM);
      }

      // Load students (for payment dropdown)
      const sRes = await window.electronAPI.queryDatabase(
        "SELECT id, first_name, last_name, admission_number, class_id FROM students WHERE status = 'Active' ORDER BY first_name"
      );
      if (!mountedRef.current) return;
      if (sRes && sRes.success) setStudents(sRes.data || []);

      // Load recent payments
      const pRes = await window.electronAPI.queryDatabase(
        "SELECT p.id, p.student_id, p.amount_paid, p.date, p.method, p.reference, s.first_name, s.last_name, s.admission_number FROM payments p JOIN students s ON p.student_id = s.id ORDER BY p.id DESC LIMIT 30"
      );
      if (!mountedRef.current) return;
      if (pRes && pRes.success) setPayments(pRes.data || []);

      // Load total collected
      const tRes = await window.electronAPI.queryDatabase(
        "SELECT SUM(amount_paid) as total FROM payments"
      );
      if (!mountedRef.current) return;
      if (tRes && tRes.success && tRes.data.length > 0) {
        setTotalCollected(tRes.data[0].total || 0);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Finance: fetch error:', e.message);
      setMsg('❌ Error loading data: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // FIXED: useEffect uses [] dependency, not [msg] (which caused infinite reloads)
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Handle fee matrix change ─────────────────────────────
  const handleMatrixChange = (classId, term, value) => {
    setFeeMatrix(prev => ({
      ...prev,
      [classId]: { ...prev[classId], [term]: value }
    }));
  };

  // ─── Save all fees ────────────────────────────────────────
  const handleSaveFees = async () => {
    setSaving(true);
    setMsg('⏳ Saving fees...');

    try {
      for (const cId of Object.keys(feeMatrix)) {
        for (const t of TERMS) {
          const amt = feeMatrix[cId][t];
          if (amt !== '' && amt !== undefined && amt !== null) {
            const chk = await window.electronAPI.queryDatabase(
              "SELECT id FROM fees_structure WHERE class_id = ? AND term = ?",
              [cId, t]
            );
            if (!mountedRef.current) return;

            if (chk && chk.success && chk.data.length > 0) {
              await window.electronAPI.queryDatabase(
                "UPDATE fees_structure SET amount = ? WHERE id = ?",
                [parseFloat(amt), chk.data[0].id]
              );
            } else {
              await window.electronAPI.queryDatabase(
                "INSERT INTO fees_structure (class_id, term, amount) VALUES (?, ?, ?)",
                [cId, t, parseFloat(amt)]
              );
            }
          }
        }
      }

      if (!mountedRef.current) return;
      setMsg('✅ Fee structure saved!');
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Finance: save fees error:', e.message);
      setMsg('❌ Error saving: ' + e.message);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Quick Pay search (debounced) ─────────────────────────
  const handleQuickPaySearch = (e) => {
    const code = e.target.value.toUpperCase();
    setQuickPay(code);
    setQuickStudent(null);

    if (quickPayTimerRef.current) clearTimeout(quickPayTimerRef.current);

    if (code.length >= 6) {
      quickPayTimerRef.current = setTimeout(async () => {
        try {
          const res = await window.electronAPI.queryDatabase(
            "SELECT id, first_name, last_name, admission_number, class_id FROM students WHERE paycode = ?",
            [code]
          );
          if (!mountedRef.current) return;

          if (res && res.success && res.data.length > 0) {
            const s = res.data[0];
            // Get expected fee for their class + selected term
            const fRes = await window.electronAPI.queryDatabase(
              "SELECT amount FROM fees_structure WHERE class_id = ? AND term = ?",
              [s.class_id, selTerm]
            );
            if (!mountedRef.current) return;

            const expected = (fRes && fRes.success && fRes.data.length > 0) ? fRes.data[0].amount : 0;

            // Get total paid
            const pRes = await window.electronAPI.queryDatabase(
              "SELECT SUM(amount_paid) as total FROM payments WHERE student_id = ?",
              [s.id]
            );
            if (!mountedRef.current) return;

            const paid = (pRes && pRes.success && pRes.data.length > 0) ? (pRes.data[0].total || 0) : 0;
            setQuickStudent({ ...s, balance: expected - paid, expected, paid });
          }
        } catch (e) {
          if (!mountedRef.current) return;
          console.error('Finance: quick pay search error:', e.message);
        }
      }, 300);
    }
  };

  // ─── Record payment ───────────────────────────────────────
  const handleRecordPayment = async (e) => {
    e.preventDefault();

    const amount = parseFloat(payData.amount_paid);
    if (!payData.student_id) {
      setMsg('⚠️ Please select a student');
      return;
    }
    if (!amount || amount <= 0) {
      setMsg('⚠️ Please enter a valid amount');
      return;
    }

    setSaving(true);
    setMsg('⏳ Recording payment...');

    try {
      const stu = students.find(s => String(s.id) === String(payData.student_id));
      if (!stu) {
        setMsg('❌ Student not found');
        setSaving(false);
        return;
      }

      const res = await window.electronAPI.queryDatabase(
        "INSERT INTO payments (student_id, amount_paid, date, term, method, reference) VALUES (?, ?, ?, ?, ?, ?)",
        [
          payData.student_id,
          amount,
          new Date().toLocaleDateString(),
          selTerm,
          payData.method,
          payData.reference || ''
        ]
      );

      if (!mountedRef.current) return;

      if (res && res.success) {
        setMsg('✅ Payment of UGX ' + amount.toLocaleString() + ' recorded!');

        // Print receipt using jsPDF (FIXED: not window.open which may be blocked)
        printReceipt(res.lastInsertRowid, stu, amount);

        // Reset form
        setPayData({ student_id: '', amount_paid: '', method: 'Cash', reference: '' });
        setQuickStudent(null);
        setQuickPay('');

        // Reload data
        fetchData();
      } else {
        setMsg('❌ ' + ((res && res.error) || 'Error recording payment'));
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Finance: record payment error:', e.message);
      setMsg('❌ Error: ' + e.message);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Print receipt using jsPDF (FIXED: not window.open) ───
  const printReceipt = (receiptNo, stu, amount) => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: [80, 120] });

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(26, 115, 232);
      doc.text('SSEWASSWA SCHOOL', 40, 12, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Payment Receipt', 40, 18, { align: 'center' });

      // Separator
      doc.setDrawColor(26, 115, 232);
      doc.setLineWidth(0.5);
      doc.line(5, 22, 75, 22);

      // Details
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      let y = 30;

      doc.setFont('helvetica', 'bold');
      doc.text('Receipt #:', 5, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(receiptNo || ''), 30, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.text('Student:', 5, y);
      doc.setFont('helvetica', 'normal');
      doc.text(stu.first_name + ' ' + stu.last_name, 30, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.text('Adm No:', 5, y);
      doc.setFont('helvetica', 'normal');
      doc.text(stu.admission_number || '-', 30, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.text('Date:', 5, y);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleString(), 30, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.text('Term:', 5, y);
      doc.setFont('helvetica', 'normal');
      doc.text(selTerm, 30, y);
      y += 6;

      doc.setFont('helvetica', 'bold');
      doc.text('Method:', 5, y);
      doc.setFont('helvetica', 'normal');
      doc.text(payData.method, 30, y);
      y += 6;

      if (payData.reference) {
        doc.setFont('helvetica', 'bold');
        doc.text('Ref:', 5, y);
        doc.setFont('helvetica', 'normal');
        doc.text(payData.reference, 30, y);
        y += 6;
      }

      // Separator
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(5, y, 75, y);
      y += 8;

      // Amount
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(13, 144, 79);
      doc.text('AMOUNT PAID:', 5, y);
      doc.text('UGX ' + amount.toLocaleString(), 75, y, { align: 'right' });
      y += 10;

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for your payment!', 40, y + 5, { align: 'center' });
      doc.text('Ssewasswa School ERP V10', 40, y + 10, { align: 'center' });

      doc.save('Receipt_' + (stu.admission_number || stu.first_name) + '_' + Date.now() + '.pdf');
    } catch (e) {
      console.error('Finance: receipt error:', e.message);
    }
  };

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">💵 Finance & Fees</h1>
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
            <p style={{ color: '#666' }}>Loading finance data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">💵 Finance & Fees</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: msg.includes('❌') ? '#c62828' : (msg.includes('⚠️') ? '#e65100' : (msg.includes('⏳') ? '#1a73e8' : '#0d904f')),
          marginBottom: '15px', padding: '10px 14px',
          background: msg.includes('❌') ? '#ffebee' : (msg.includes('⚠️') ? '#fff3e0' : (msg.includes('⏳') ? '#e8f0fe' : '#e8f5e9')),
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Total Collected ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header" style={{ background: '#e8f5e9' }}>
          💰 Total Collections: UGX {totalCollected.toLocaleString()}
        </div>
      </div>

      {/* ─── Quick Pay (Paycode Search) ─────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">⚡ Quick Pay (Enter Paycode)</div>
        <div className="card-body">
          <input
            className="form-input"
            value={quickPay}
            onChange={handleQuickPaySearch}
            placeholder="e.g., P5X9A1 (6+ characters)"
            style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '16px', letterSpacing: '1px' }}
          />
          {quickStudent && (
            <div style={{
              marginTop: '15px',
              border: '2px solid ' + (quickStudent.balance > 0 ? '#ffcc80' : '#a5d6a7'),
              padding: '15px',
              borderRadius: '8px',
              background: quickStudent.balance > 0 ? '#fff8e1' : '#e8f5e9'
            }}>
              <h3 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '16px' }}>
                {quickStudent.first_name} {quickStudent.last_name}
                <span style={{ marginLeft: '8px', fontSize: '13px', color: '#666' }}>
                  ({quickStudent.admission_number || 'No Adm'})
                </span>
              </h3>
              <div style={{ display: 'flex', gap: '20px', fontSize: '13px', marginBottom: '10px' }}>
                <span>Expected: <strong>UGX {(quickStudent.expected || 0).toLocaleString()}</strong></span>
                <span>Paid: <strong style={{ color: '#0d904f' }}>UGX {(quickStudent.paid || 0).toLocaleString()}</strong></span>
                <span>Balance: <strong style={{ color: quickStudent.balance > 0 ? '#d32f2f' : '#0d904f' }}>
                  UGX {(quickStudent.balance || 0).toLocaleString()}
                </strong></span>
              </div>
              <button
                onClick={() => setPayData({ ...payData, student_id: String(quickStudent.id), amount_paid: String(Math.max(0, quickStudent.balance)) })}
                className="btn btn-primary"
                style={{ marginTop: '5px' }}
              >
                ✅ Select for Payment Below
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Fee Structure ──────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">📋 Fee Structure (per class per term)</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Term 1</th>
                <th>Term 2</th>
                <th>Term 3</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: '600' }}>{c.name}</td>
                  <td>
                    <input
                      type="number"
                      className="form-input"
                      style={{ padding: '5px', minWidth: '100px' }}
                      value={feeMatrix[c.id] ? (feeMatrix[c.id]['Term 1'] || '') : ''}
                      onChange={(e) => handleMatrixChange(c.id, 'Term 1', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-input"
                      style={{ padding: '5px', minWidth: '100px' }}
                      value={feeMatrix[c.id] ? (feeMatrix[c.id]['Term 2'] || '') : ''}
                      onChange={(e) => handleMatrixChange(c.id, 'Term 2', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-input"
                      style={{ padding: '5px', minWidth: '100px' }}
                      value={feeMatrix[c.id] ? (feeMatrix[c.id]['Term 3'] || '') : ''}
                      onChange={(e) => handleMatrixChange(c.id, 'Term 3', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={handleSaveFees}
            className="btn btn-primary"
            style={{ marginTop: '15px' }}
            disabled={saving}
          >
            {saving ? '⏳ Saving...' : '💾 Save All Fees'}
          </button>
        </div>
      </div>

      {/* ─── Record Payment ──────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">💳 Record Payment</div>
        <div className="card-body">
          <form onSubmit={handleRecordPayment}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2, marginBottom: 0, minWidth: '250px' }}>
                <label className="form-label">Student *</label>
                <select
                  className="form-input"
                  value={payData.student_id}
                  onChange={(e) => setPayData({ ...payData, student_id: e.target.value })}
                  required
                >
                  <option value="">-- Select Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.admission_number || 'No Adm'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: '120px' }}>
                <label className="form-label">Amount (UGX) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={payData.amount_paid}
                  onChange={(e) => setPayData({ ...payData, amount_paid: e.target.value })}
                  placeholder="e.g. 500000"
                  required
                  min="1"
                />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: '120px' }}>
                <label className="form-label">Term</label>
                <select
                  className="form-input"
                  value={selTerm}
                  onChange={(e) => setSelTerm(e.target.value)}
                >
                  {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: '120px' }}>
                <label className="form-label">Method</label>
                <select
                  className="form-input"
                  value={payData.method}
                  onChange={(e) => setPayData({ ...payData, method: e.target.value })}
                >
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: '120px' }}>
                <label className="form-label">Reference</label>
                <input
                  className="form-input"
                  value={payData.reference}
                  onChange={(e) => setPayData({ ...payData, reference: e.target.value })}
                  placeholder="TxRef (optional)"
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: '15px' }}
              disabled={saving}
            >
              {saving ? '⏳ Recording...' : '💳 Record & Print Receipt'}
            </button>
          </form>
        </div>
      </div>

      {/* ─── Recent Payments ─────────────────────────────────── */}
      <div className="card">
        <div className="card-header">📋 Recent Payments (Last 30)</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {payments.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No payments recorded yet</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Term</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: '#999' }}>{p.id}</td>
                    <td style={{ fontWeight: '600' }}>
                      {p.first_name} {p.last_name}
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: '#999' }}>
                        ({p.admission_number || ''})
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#0d904f' }}>
                      UGX {(p.amount_paid || 0).toLocaleString()}
                    </td>
                    <td style={{ fontSize: '12px' }}>{p.method || 'Cash'}</td>
                    <td style={{ fontSize: '12px' }}>{p.term || '-'}</td>
                    <td style={{ fontSize: '12px' }}>{p.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
