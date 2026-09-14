// FileName: src/pages/Payments.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Mobile money & payments — MTN MoMo, Airtel Money, Cash, Bank

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Payment method definitions
const PAYMENT_METHODS = [
    { key: 'cash', name: 'Cash', icon: '💵', color: '#2e7d32', bg: '#e8f5e9' },
    { key: 'mtn', name: 'MTN MoMo', icon: '📱', color: '#e65100', bg: '#fff3e0' },
    { key: 'airtel', name: 'Airtel Money', icon: '📱', color: '#c62828', bg: '#ffebee' },
    { key: 'bank', name: 'Bank Transfer', icon: '🏦', color: '#1565c0', bg: '#e3f2fd' }
];

// Validate Ugandan phone number format
function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.replace(/\s+/g, '').replace(/^\+/, '');
    // Accept: 2567XXXXXXXX, 07XXXXXXXX, 7XXXXXXXX
    return /^(256)?7\d{8}$/.test(cleaned) || /^07\d{8}$/.test(cleaned) || /^7\d{8}$/.test(cleaned);
}

export default function Payments() {
    // ─── All state variables with proper defaults ────────────
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState('');
    const [narration, setNarration] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [transactions, setTransactions] = useState([]);

    // ─── Refs ─────────────────────────────────────────────────
    const mountedRef = useRef(true);

    // ─── Cleanup on unmount ───────────────────────────────────
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ─── Generate a unique transaction reference ──────────────
    const generateReference = useCallback(() => {
        return 'TXN-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    }, []);

    // ─── Fetch students list ──────────────────────────────────
    const fetchStudents = useCallback(async () => {
        if (!window.electronAPI || !window.electronAPI.queryDatabase) {
            if (mountedRef.current) setInitialLoading(false);
            return;
        }

        try {
            const res = await window.electronAPI.queryDatabase(
                "SELECT id, first_name, last_name, admission_number FROM students WHERE status = 'Active' ORDER BY first_name"
            );

            if (!mountedRef.current) return;

            if (res && res.success && Array.isArray(res.data)) {
                setStudents(res.data);
            } else {
                setStudents([]);
            }
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('Payments: fetch students error:', e ? e.message : 'Unknown');
            setStudents([]);
        }
    }, []);

    // ─── Fetch recent transactions ────────────────────────────
    const fetchTransactions = useCallback(async () => {
        if (!window.electronAPI || !window.electronAPI.queryDatabase) {
            return;
        }

        try {
            const res = await window.electronAPI.queryDatabase(
                "SELECT p.id, p.student_id, p.amount_paid, p.date, p.method, p.reference, " +
                "s.first_name, s.last_name, s.admission_number " +
                "FROM payments p " +
                "LEFT JOIN students s ON p.student_id = s.id " +
                "ORDER BY p.id DESC LIMIT 50"
            );

            if (!mountedRef.current) return;

            if (res && res.success && Array.isArray(res.data)) {
                setTransactions(res.data);
            } else {
                setTransactions([]);
            }
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('Payments: fetch transactions error:', e ? e.message : 'Unknown');
            setTransactions([]);
        }
    }, []);

    // ─── Initial load ─────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            await Promise.all([fetchStudents(), fetchTransactions()]);
            if (mountedRef.current) {
                setReference(generateReference());
                setInitialLoading(false);
            }
        };
        init();
    }, [fetchStudents, fetchTransactions, generateReference]);

    // ─── Handle student selection ─────────────────────────────
    const handleStudentSelect = useCallback((studentId) => {
        if (!studentId) {
            setSelectedStudent(null);
            return;
        }

        // Use String comparison to avoid type mismatch
        const student = students.find(function (s) {
            return s && String(s.id) === String(studentId);
        });

        if (student) {
            setSelectedStudent(student);
        } else {
            setSelectedStudent(null);
        }

        // Generate new reference for each payment
        setReference(generateReference());
    }, [students, generateReference]);

    // ─── Reset form ───────────────────────────────────────────
    const resetForm = useCallback(() => {
        setSelectedStudent(null);
        setPhone('');
        setAmount('');
        setNarration('');
        setReference(generateReference());
        setPaymentMethod('cash');
    }, [generateReference]);

    // ─── Handle payment initiation ────────────────────────────
    const handleInitiatePayment = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        // ─── Validate inputs ────────────────────────────────
        if (!selectedStudent) {
            setMsg('⚠️ Please select a student first');
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            setMsg('⚠️ Please enter a valid amount');
            return;
        }

        if ((paymentMethod === 'mtn' || paymentMethod === 'airtel') && !isValidPhone(phone)) {
            setMsg('⚠️ Please enter a valid Ugandan phone number (e.g., 0772 123 456)');
            return;
        }

        if (!window.electronAPI) {
            setMsg('❌ Electron API not available');
            return;
        }

        setLoading(true);
        setMsg('');

        // Build student name safely
        const studentName = (selectedStudent.first_name || '') + ' ' + (selectedStudent.last_name || '');

        try {
            let result = null;

            // ─── Cash payment ───────────────────────────────
            if (paymentMethod === 'cash') {
                try {
                    result = await window.electronAPI.queryDatabase(
                        "INSERT INTO payments (student_id, amount_paid, method, reference, date) VALUES (?, ?, 'Cash', ?, ?)",
                        [
                            selectedStudent.id,
                            parsedAmount,
                            reference || generateReference(),
                            new Date().toLocaleDateString()
                        ]
                    );
                } catch (dbErr) {
                    result = { success: false, error: dbErr ? dbErr.message : 'Database error' };
                }

                if (!mountedRef.current) return;

                if (result && result.success) {
                    setMsg('✅ Cash payment of UGX ' + parsedAmount.toLocaleString() + ' recorded for ' + studentName);
                    resetForm();
                    fetchTransactions();
                } else {
                    const errorMsg = (result && result.error) ? result.error : 'Failed to record payment';
                    setMsg('❌ ' + errorMsg);
                }

                if (mountedRef.current) setLoading(false);
                return;
            }

            // ─── MTN MoMo payment ───────────────────────────
            if (paymentMethod === 'mtn') {
                if (!window.electronAPI.initiateMTN) {
                    setMsg('❌ MTN MoMo payment method not available');
                    if (mountedRef.current) setLoading(false);
                    return;
                }

                try {
                    result = await window.electronAPI.initiateMTN({
                        phone: phone,
                        amount: parsedAmount,
                        narration: narration || 'Fee payment for ' + studentName,
                        reference: reference || generateReference()
                    });
                } catch (mtnErr) {
                    result = { success: false, error: mtnErr ? mtnErr.message : 'MTN API error' };
                }
            }

            // ─── Airtel Money payment ───────────────────────
            else if (paymentMethod === 'airtel') {
                if (!window.electronAPI.initiateAirtel) {
                    setMsg('❌ Airtel Money payment method not available');
                    if (mountedRef.current) setLoading(false);
                    return;
                }

                try {
                    result = await window.electronAPI.initiateAirtel({
                        phone: phone,
                        amount: parsedAmount,
                        narration: narration || 'Fee payment for ' + studentName,
                        reference: reference || generateReference()
                    });
                } catch (airtelErr) {
                    result = { success: false, error: airtelErr ? airtelErr.message : 'Airtel API error' };
                }
            }

            // ─── Bank transfer ──────────────────────────────
            else if (paymentMethod === 'bank') {
                if (!window.electronAPI.createBankPayment) {
                    setMsg('❌ Bank payment method not available');
                    if (mountedRef.current) setLoading(false);
                    return;
                }

                try {
                    result = await window.electronAPI.createBankPayment({
                        bankName: '',
                        accountNumber: '',
                        accountName: '',
                        amount: parsedAmount,
                        studentName: studentName,
                        reference: reference || generateReference(),
                        narration: narration || 'Fee payment for ' + studentName
                    });
                } catch (bankErr) {
                    result = { success: false, error: bankErr ? bankErr.message : 'Bank API error' };
                }
            }

            // ─── Unknown method ─────────────────────────────
            else {
                setMsg('❌ Unknown payment method: ' + paymentMethod);
                if (mountedRef.current) setLoading(false);
                return;
            }

            if (!mountedRef.current) return;

            // ─── Handle result ──────────────────────────────
            if (result && result.success) {
                const txnRef = (result.transactionRef) ? result.transactionRef : (reference || '');
                setMsg('✅ Payment initiated! Reference: ' + txnRef);
                resetForm();
                fetchTransactions();
            } else {
                const errorMsg = (result && result.error) ? result.error : 'Payment failed';
                setMsg('❌ ' + errorMsg);
            }

        } catch (err) {
            if (!mountedRef.current) return;
            const errMsg = (err && err.message) ? err.message : 'Unknown error';
            console.error('Payments: initiation error:', errMsg);
            setMsg('❌ Error: ' + errMsg);
        } finally {
            if (mountedRef.current) setLoading(false);
        }

        // Auto-clear message after 5 seconds
        setTimeout(function () {
            if (mountedRef.current) setMsg('');
        }, 5000);
    };

    // ─── Determine if message is an error ─────────────────────
    const isError = (function () {
        if (!msg || typeof msg !== 'string') return false;
        return msg.indexOf('Error') >= 0 ||
            msg.indexOf('❌') >= 0 ||
            msg.indexOf('failed') >= 0 ||
            msg.indexOf('⚠️') >= 0 ||
            msg.indexOf('Please') >= 0;
    })();

    // ─── Loading state ────────────────────────────────────────
    if (initialLoading) {
        return (
            <div className="page-container">
                <h1 className="page-title">📱 Mobile Money & Payments</h1>
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
                        <p style={{ color: '#666' }}>Loading payment data...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 className="page-title">📱 Mobile Money & Payments</h1>

            {/* ─── Message ────────────────────────────────────────── */}
            {msg && (
                <div style={{
                    padding: '12px 15px',
                    marginBottom: '20px',
                    borderRadius: '6px',
                    background: isError ? '#ffebee' : '#e8f5e9',
                    color: isError ? '#c62828' : '#2e7d32',
                    border: '1px solid ' + (isError ? '#ef9a9a' : '#a5d6a7'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {isError ? '⚠️' : '✅'} {msg}
                </div>
            )}

            {/* ─── Payment Form + Transactions Grid ─────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                {/* ═══════════════════════════════════════════════════ */}
                {/* LEFT: Payment Form                                  */}
                {/* ═══════════════════════════════════════════════════ */}
                <div className="card">
                    <div className="card-header">💳 Initiate Payment</div>
                    <div className="card-body">
                        <form onSubmit={handleInitiatePayment}>

                            {/* ── Student Selection ─────────────────────── */}
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label">Student *</label>
                                <select
                                    className="form-input"
                                    value={selectedStudent ? String(selectedStudent.id) : ''}
                                    onChange={function (e) { handleStudentSelect(e.target.value); }}
                                    required
                                >
                                    <option value="">-- Select Student --</option>
                                    {students.map(function (s) {
                                        return (
                                            <option key={s.id} value={String(s.id)}>
                                                {(s.first_name || '')} {(s.last_name || '')}
                                                ({s.admission_number || 'No Adm'})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* ── Payment Method Selection ───────────────── */}
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label">Payment Method *</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                                    {PAYMENT_METHODS.map(function (m) {
                                        return (
                                            <button
                                                key={m.key}
                                                type="button"
                                                onClick={function () { setPaymentMethod(m.key); }}
                                                style={{
                                                    padding: '15px 10px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    border: paymentMethod === m.key
                                                        ? '2px solid ' + m.color
                                                        : '1px solid #ddd',
                                                    background: paymentMethod === m.key ? m.bg : '#fff',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ fontSize: '24px' }}>{m.icon}</div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    marginTop: '5px',
                                                    color: m.color,
                                                    fontWeight: 'bold'
                                                }}>
                                                    {m.name}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Phone Number (for MTN/Airtel) ───────────── */}
                            {(paymentMethod === 'mtn' || paymentMethod === 'airtel') && (
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label className="form-label">
                                        Phone Number *
                                        <span style={{ fontSize: '11px', color: '#666' }}> (e.g., 0772 123 456)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={phone}
                                        onChange={function (e) { setPhone(e.target.value); }}
                                        placeholder={paymentMethod === 'mtn' ? '077X XXX XXX' : '075X XXX XXX'}
                                        required
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>
                            )}

                            {/* ── Amount ─────────────────────────────────── */}
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label">Amount (UGX) *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={amount}
                                    onChange={function (e) { setAmount(e.target.value); }}
                                    placeholder="Enter amount"
                                    required
                                    min="1"
                                    style={{ fontSize: '18px', fontWeight: 'bold' }}
                                />
                            </div>

                            {/* ── Reference ──────────────────────────────── */}
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label">Reference</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={reference}
                                    onChange={function (e) { setReference(e.target.value); }}
                                    readOnly
                                    style={{ background: '#f8f9fa', fontFamily: 'monospace' }}
                                />
                            </div>

                            {/* ── Narration ──────────────────────────────── */}
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label">Narration</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={narration}
                                    onChange={function (e) { setNarration(e.target.value); }}
                                    placeholder="Optional description"
                                />
                            </div>

                            {/* ── Selected Student Info ──────────────────── */}
                            {selectedStudent && (
                                <div style={{
                                    padding: '10px',
                                    background: '#f5f5f5',
                                    borderRadius: '6px',
                                    marginBottom: '15px',
                                    fontSize: '13px'
                                }}>
                                    <strong>Student:</strong> {(selectedStudent.first_name || '')} {(selectedStudent.last_name || '')}
                                    <br />
                                    <strong>Admission:</strong> {selectedStudent.admission_number || 'N/A'}
                                </div>
                            )}

                            {/* ── Submit Button ──────────────────────────── */}
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading || !selectedStudent}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '16px',
                                    opacity: (loading || !selectedStudent) ? 0.6 : 1,
                                    cursor: (loading || !selectedStudent) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? '⏳ Processing...' :
                                    paymentMethod === 'cash' ? '💵 Record Cash Payment' :
                                        paymentMethod === 'mtn' ? '📱 Send MTN MoMo Request' :
                                            paymentMethod === 'airtel' ? '📱 Send Airtel Money Request' :
                                                '🏦 Generate Bank Reference'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════ */}
                {/* RIGHT: Recent Transactions                          */}
                {/* ═══════════════════════════════════════════════════ */}
                <div className="card">
                    <div className="card-header">📋 Recent Transactions</div>
                    <div className="card-body">
                        {transactions.length === 0 ? (
                            <p style={{ color: '#666', textAlign: 'center', padding: '30px' }}>
                                No transactions yet
                            </p>
                        ) : (
                            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Ref</th>
                                            <th>Student</th>
                                            <th>Method</th>
                                            <th>Amount</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map(function (t, i) {
                                            // Safely build student name
                                            const firstName = (t && t.first_name) ? t.first_name : '';
                                            const lastName = (t && t.last_name) ? t.last_name : '';
                                            const studentName = (firstName + ' ' + lastName).trim() || 'Unknown';
                                            const method = (t && t.method) ? t.method : 'Cash';
                                            const refNum = (t && t.reference) ? t.reference : (t && t.id ? String(t.id) : '-');
                                            const amountPaid = (t && t.amount_paid) ? Number(t.amount_paid) : 0;
                                            const dateStr = (t && t.date) ? t.date : '-';

                                            // Determine method colors
                                            let methodBg = '#e8f5e9';
                                            let methodColor = '#2e7d32';
                                            if (method === 'MTN' || method === 'MTN MoMo') {
                                                methodBg = '#fff3e0';
                                                methodColor = '#e65100';
                                            } else if (method === 'Airtel' || method === 'Airtel Money') {
                                                methodBg = '#ffebee';
                                                methodColor = '#c62828';
                                            } else if (method === 'Bank' || method === 'Bank Transfer') {
                                                methodBg = '#e3f2fd';
                                                methodColor = '#1565c0';
                                            }

                                            return (
                                                <tr key={(t && t.id) ? t.id : i}>
                                                    <td style={{ fontSize: '11px' }}>{refNum}</td>
                                                    <td>{studentName}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '3px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            background: methodBg,
                                                            color: methodColor
                                                        }}>
                                                            {method}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 'bold' }}>
                                                        UGX {amountPaid.toLocaleString()}
                                                    </td>
                                                    <td style={{ fontSize: '12px' }}>{dateStr}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Setup Notice ─────────────────────────────────────── */}
            <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-header">⚙️ Payment API Setup</div>
                <div className="card-body">
                    <p style={{ color: '#666', marginBottom: '10px', fontSize: '13px' }}>
                        Configure API credentials in <strong>Settings → Payment APIs</strong>:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ padding: '10px', background: '#fff3e0', borderRadius: '6px' }}>
                            <strong style={{ color: '#e65100' }}>📱 MTN MoMo</strong>
                            <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: '#666' }}>
                                <li>API Key (Ocp-Apim-Subscription-Key)</li>
                                <li>User ID</li>
                                <li>Callback URL</li>
                            </ul>
                        </div>
                        <div style={{ padding: '10px', background: '#ffebee', borderRadius: '6px' }}>
                            <strong style={{ color: '#c62828' }}>📱 Airtel Money</strong>
                            <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: '#666' }}>
                                <li>Client ID</li>
                                <li>Client Secret</li>
                                <li>PIN</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}