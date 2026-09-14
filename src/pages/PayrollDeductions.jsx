// FileName: src/pages/PayrollDeductions.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Payroll deductions — deduction types, individual deductions, payroll processing

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function PayrollDeductions() {
    const { user } = useAuth();
    const [tab, setTab] = useState('types');
    const [msg, setMsg] = useState('');
    const [types, setTypes] = useState([]);
    const [staff, setStaff] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState('');
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [indivDeds, setIndivDeds] = useState([]);
    const [showAddType, setShowAddType] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [typeForm, setTypeForm] = useState({
        name: '', description: '', is_percentage: false,
        amount: 0, is_mandatory: false, applies_to: 'all'
    });
    const [dedForm, setDedForm] = useState({ deduction_type_id: '', amount: 0, reason: '' });

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ─── Load deduction types ──────────────────────────────────
    const loadTypes = useCallback(async () => {
        try {
            const r = await window.electronAPI.getDeductionTypes();
            if (!mountedRef.current) return;
            if (r && r.success) setTypes(r.data || []);
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('PayrollDeductions: load types error:', e.message);
        }
    }, []);

    // ─── Load active staff ─────────────────────────────────────
    const loadStaff = useCallback(async () => {
        try {
            const r = await window.electronAPI.queryDatabase(
                "SELECT id, first_name, last_name, role, salary FROM staff WHERE status = 'Active' ORDER BY first_name"
            );
            if (!mountedRef.current) return;
            if (r && r.success) setStaff(r.data || []);
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('PayrollDeductions: load staff error:', e.message);
        }
    }, []);

    // ─── Load individual deductions for selected staff/month ──
    const loadIndivDeductions = useCallback(async () => {
        if (!selectedStaff) {
            setIndivDeds([]);
            return;
        }

        try {
            const [yr, mn] = month.split('-');
            const r = await window.electronAPI.getStaffDeductions(
                parseInt(selectedStaff), mn, yr
            );
            if (!mountedRef.current) return;
            if (r && r.success) setIndivDeds(r.data || []);
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('PayrollDeductions: load indiv deductions error:', e.message);
        }
    }, [selectedStaff, month]);

    // ─── Initial load ──────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            await Promise.all([loadTypes(), loadStaff()]);
            if (mountedRef.current) setLoading(false);
        };
        init();
    }, [loadTypes, loadStaff]);

    // ─── Load individual deductions when staff/month changes ──
    useEffect(() => {
        loadIndivDeductions();
    }, [loadIndivDeductions]);

    // ─── Save deduction type ──────────────────────────────────
    const handleSaveType = async () => {
        if (!typeForm.name.trim()) {
            setMsg('⚠️ Deduction type name is required');
            return;
        }

        setMsg('Saving...');

        try {
            const r = await window.electronAPI.saveDeductionType(typeForm);
            if (!mountedRef.current) return;

            if (r && r.success) {
                setMsg('✅ Deduction type saved');
                setShowAddType(false);
                setTypeForm({
                    name: '', description: '', is_percentage: false,
                    amount: 0, is_mandatory: false, applies_to: 'all'
                });
                loadTypes();
            } else {
                setMsg('❌ ' + ((r && r.error) || 'Failed to save'));
            }
        } catch (e) {
            if (!mountedRef.current) return;
            setMsg('❌ Error: ' + e.message);
        }

        setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
    };

    // ─── Delete deduction type ────────────────────────────────
    const handleDeleteType = async (id, name) => {
        if (!confirm('Delete deduction type "' + name + '"?\n\nAll individual deductions of this type will also be deleted.')) return;

        try {
            await window.electronAPI.queryDatabase(
                "DELETE FROM deduction_types WHERE id = ?", [id]
            );
            if (!mountedRef.current) return;
            setMsg('🗑️ Deduction type deleted');
            loadTypes();
        } catch (e) {
            if (!mountedRef.current) return;
            setMsg('❌ Error: ' + e.message);
        }

        setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
    };

    // ─── Add individual deduction ─────────────────────────────
    const handleAddIndivDed = async () => {
        if (!selectedStaff) { setMsg('⚠️ Select a staff member first'); return; }
        if (!dedForm.deduction_type_id) { setMsg('⚠️ Select a deduction type'); return; }
        if (!dedForm.amount || parseFloat(dedForm.amount) <= 0) {
            setMsg('⚠️ Enter a valid amount');
            return;
        }

        try {
            const [yr, mn] = month.split('-');
            const r = await window.electronAPI.saveStaffDeduction({
                staff_id: parseInt(selectedStaff),
                deduction_type_id: parseInt(dedForm.deduction_type_id),
                month: mn,
                year: yr,
                amount: parseFloat(dedForm.amount),
                reason: dedForm.reason,
                approved_by: user ? user.id : null,
                status: 'Approved'
            });

            if (!mountedRef.current) return;

            if (r && r.success) {
                setMsg('✅ Deduction added');
                setDedForm({ deduction_type_id: '', amount: 0, reason: '' });
                loadIndivDeductions();
            } else {
                setMsg('❌ ' + ((r && r.error) || 'Failed to add deduction'));
            }
        } catch (e) {
            if (!mountedRef.current) return;
            setMsg('❌ Error: ' + e.message);
        }

        setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
    };

    // ─── Delete individual deduction ──────────────────────────
    const handleDeleteIndiv = async (id) => {
        if (!confirm('Remove this deduction?')) return;

        try {
            await window.electronAPI.queryDatabase(
                "DELETE FROM staff_deductions WHERE id = ?", [id]
            );
            if (!mountedRef.current) return;
            setMsg('🗑️ Deduction removed');
            loadIndivDeductions();
        } catch (e) {
            if (!mountedRef.current) return;
            setMsg('❌ Error: ' + e.message);
        }

        setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
    };

    // ─── Process payroll with deductions ─────────────────────
    const handleProcessPayroll = async () => {
        const [yr, mn] = month.split('-');
        const pendingCount = staff.length;
        const mandatoryCount = types.filter(t => t.is_mandatory).length;

        if (!confirm(
            'Process payroll for ' + mn + '/' + yr + '?\n\n' +
            'This will:\n' +
            '• Calculate mandatory deductions for all ' + pendingCount + ' active staff\n' +
            '• Add individual deductions for this month\n' +
            '• Compute Net Pay = Gross - All Deductions\n' +
            '• Create payroll_payments records\n\n' +
            'Mandatory deduction types: ' + mandatoryCount
        )) return;

        setProcessing(true);
        setMsg('⏳ Processing payroll...');

        try {
            const r = await window.electronAPI.processPayrollWithDeductions({
                month: mn,
                year: yr,
                processedBy: user ? user.id : null
            });

            if (!mountedRef.current) return;

            if (r && r.success) {
                const processed = (r.data && r.data.processed) || 0;
                setMsg('✅ Payroll processed: ' + processed + ' staff members paid');
            } else {
                setMsg('❌ ' + ((r && r.error) || 'Processing failed'));
            }
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('PayrollDeductions: process error:', e.message);
            setMsg('❌ Error: ' + e.message);
        } finally {
            if (mountedRef.current) setProcessing(false);
        }

        setTimeout(() => { if (mountedRef.current) setMsg(''); }, 5000);
    };

    // ─── Pay slip preview (with applies_to filtering) ─────────
    const getPreview = () => {
        if (!selectedStaff) return null;
        const s = staff.find(x => x.id === parseInt(selectedStaff));
        if (!s) return null;

        const gross = s.salary || 0;
        let mandatoryTotal = 0;

        // FIXED: Filter by applies_to (teaching vs non-teaching)
        types.filter(t => t.is_mandatory).forEach(t => {
            // Check if this deduction applies to this staff member
            const isTeacher = s.role && s.role.toLowerCase().includes('teacher');
            const applies = t.applies_to === 'all' ||
                (t.applies_to === 'teaching' && isTeacher) ||
                (t.applies_to === 'non-teaching' && !isTeacher);

            if (applies) {
                mandatoryTotal += t.is_percentage
                    ? gross * (t.amount / 100)
                    : t.amount;
            }
        });

        let indivTotal = 0;
        indivDeds.forEach(d => { indivTotal += d.amount || 0; });

        const totalDeductions = mandatoryTotal + indivTotal;
        const netPay = Math.max(0, gross - totalDeductions);

        return {
            name: s.first_name + ' ' + s.last_name,
            role: s.role,
            gross,
            mandatory: mandatoryTotal,
            individual: indivTotal,
            total: totalDeductions,
            net: netPay
        };
    };

    const preview = getPreview();

    // ─── Loading state ────────────────────────────────────────
    if (loading) {
        return (
            <div className="page-container">
                <h1 className="page-title">Payroll & Deductions</h1>
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
                        <p style={{ color: '#666' }}>Loading deductions...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Tab definitions ──────────────────────────────────────
    const tabs = [
        { key: 'types', label: '📋 Deduction Types' },
        { key: 'individual', label: '👤 Individual Deductions' },
        { key: 'process', label: '⚙️ Process Payroll' }
    ];

    return (
        <div className="page-container">
            <h1 className="page-title">💰 Payroll & Deductions</h1>

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

            {/* ─── Tabs ───────────────────────────────────────────── */}
            <div style={{
                display: 'flex', gap: 0, marginBottom: '20px',
                borderBottom: '2px solid #e0e0e0'
            }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            padding: '10px 20px', border: 'none',
                            background: tab === t.key ? '#1a73e8' : 'transparent',
                            color: tab === t.key ? 'white' : '#666',
                            cursor: 'pointer',
                            fontWeight: tab === t.key ? 600 : 400,
                            fontSize: '13px',
                            borderBottom: tab === t.key ? '2px solid #1a73e8' : '2px solid transparent',
                            marginBottom: -2
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ═════════════════════════════════════════════════════════ */}
            {/* TAB 1: Deduction Types                                  */}
            {/* ═════════════════════════════════════════════════════════ */}

            {tab === 'types' && (
                <div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddType(!showAddType)}
                        style={{ marginBottom: '16px' }}
                    >
                        {showAddType ? '❌ Cancel' : '➕ Add Deduction Type'}
                    </button>

                    {showAddType && (
                        <div className="card" style={{ marginBottom: '16px' }}>
                            <div className="card-header">➕ New Deduction Type</div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Name *</label>
                                        <input
                                            className="form-input"
                                            value={typeForm.name}
                                            onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                                            placeholder="e.g. NSSF, PAYE, Loan Repayment"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Applies To</label>
                                        <select
                                            className="form-input"
                                            value={typeForm.applies_to}
                                            onChange={(e) => setTypeForm({ ...typeForm, applies_to: e.target.value })}
                                        >
                                            <option value="all">All Staff</option>
                                            <option value="teaching">Teaching Staff Only</option>
                                            <option value="non-teaching">Non-Teaching Staff Only</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Amount</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={typeForm.amount}
                                            onChange={(e) => setTypeForm({ ...typeForm, amount: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', paddingBottom: '4px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={typeForm.is_percentage}
                                                onChange={(e) => setTypeForm({ ...typeForm, is_percentage: e.target.checked })}
                                            />
                                            Percentage (%)
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={typeForm.is_mandatory}
                                                onChange={(e) => setTypeForm({ ...typeForm, is_mandatory: e.target.checked })}
                                            />
                                            Mandatory
                                        </label>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <input
                                        className="form-input"
                                        value={typeForm.description}
                                        onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                                        placeholder="Optional description"
                                    />
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveType}
                                >
                                    💾 Save Type
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="card-body" style={{ overflowX: 'auto' }}>
                            {types.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
                                    No deduction types defined. Add NSSF, PAYE, and other deductions above.
                                </p>
                            )}
                            {types.length > 0 && (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                            <th>Mandatory</th>
                                            <th>Applies To</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {types.map(t => (
                                            <tr key={t.id}>
                                                <td>
                                                    <strong>{t.name}</strong>
                                                    {t.description && (
                                                        <div style={{ fontSize: '11px', color: '#999' }}>{t.description}</div>
                                                    )}
                                                </td>
                                                <td>{t.is_percentage ? '📊 Percentage' : '💵 Fixed'}</td>
                                                <td>
                                                    {t.is_percentage
                                                        ? t.amount + '%'
                                                        : 'UGX ' + Number(t.amount || 0).toLocaleString()}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '4px',
                                                        background: t.is_mandatory ? '#e8f5e9' : '#fff3e0',
                                                        color: t.is_mandatory ? '#0d904f' : '#e65100',
                                                        fontSize: '12px'
                                                    }}>
                                                        {t.is_mandatory ? '✅ Yes' : 'No'}
                                                    </span>
                                                </td>
                                                <td style={{ textTransform: 'capitalize' }}>{t.applies_to}</td>
                                                <td>
                                                    <button
                                                        onClick={() => handleDeleteType(t.id, t.name)}
                                                        style={{
                                                            color: '#d32f2f', border: 'none',
                                                            background: 'none', cursor: 'pointer',
                                                            fontSize: '13px', fontWeight: '600'
                                                        }}
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════ */}
            {/* TAB 2: Individual Deductions                             */}
            {/* ═════════════════════════════════════════════════════════ */}

            {tab === 'individual' && (
                <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
                    {/* ─── Add Individual Deduction Form ────────────────── */}
                    <div className="card">
                        <div className="card-header">➕ Add Individual Deduction</div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Staff Member *</label>
                                <select
                                    className="form-input"
                                    value={selectedStaff}
                                    onChange={(e) => setSelectedStaff(e.target.value)}
                                >
                                    <option value="">-- Select --</option>
                                    {staff.map(s => (
                                        <option key={s.id} value={String(s.id)}>
                                            {s.first_name} {s.last_name} ({s.role}) — UGX {Number(s.salary || 0).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Month *</label>
                                <input
                                    type="month"
                                    className="form-input"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Deduction Type *</label>
                                <select
                                    className="form-input"
                                    value={dedForm.deduction_type_id}
                                    onChange={(e) => setDedForm({ ...dedForm, deduction_type_id: e.target.value })}
                                >
                                    <option value="">-- Select --</option>
                                    {types.map(t => (
                                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amount (UGX) *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={dedForm.amount}
                                    onChange={(e) => setDedForm({ ...dedForm, amount: e.target.value })}
                                    placeholder="e.g. 50000"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reason</label>
                                <input
                                    className="form-input"
                                    value={dedForm.reason}
                                    onChange={(e) => setDedForm({ ...dedForm, reason: e.target.value })}
                                    placeholder="e.g. Salary advance repayment"
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                                onClick={handleAddIndivDed}
                            >
                                ➕ Add Deduction
                            </button>
                        </div>
                    </div>

                    {/* ─── Preview + Deductions Table ───────────────────── */}
                    <div>
                        {/* Pay Slip Preview */}
                        {preview && (
                            <div className="card" style={{ marginBottom: '16px' }}>
                                <div className="card-header">📄 Pay Slip Preview — {preview.name}</div>
                                <div className="card-body">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                                        <div>💼 Gross Salary: <strong>UGX {Number(preview.gross).toLocaleString()}</strong></div>
                                        <div>👔 Role: {preview.role}</div>
                                        <div style={{ color: '#d32f2f' }}>
                                            📉 Mandatory Deductions: <strong>UGX {Number(preview.mandatory).toLocaleString()}</strong>
                                        </div>
                                        <div style={{ color: '#d32f2f' }}>
                                            📉 Individual Deductions: <strong>UGX {Number(preview.individual).toLocaleString()}</strong>
                                        </div>
                                        <div style={{ color: '#d32f2f' }}>
                                            📉 Total Deductions: <strong>UGX {Number(preview.total).toLocaleString()}</strong>
                                        </div>
                                        <div style={{ color: '#0d904f', fontSize: '16px', fontWeight: 'bold' }}>
                                            💰 Net Pay: <strong>UGX {Number(preview.net).toLocaleString()}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Individual Deductions Table */}
                        <div className="card">
                            <div className="card-header">
                                📋 Deductions for {selectedStaff ? month : '— Select staff —'}
                            </div>
                            <div className="card-body" style={{ overflowX: 'auto' }}>
                                {indivDeds.length === 0 && (
                                    <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
                                        No individual deductions for this period
                                    </p>
                                )}
                                {indivDeds.length > 0 && (
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Deduction</th>
                                                <th>Amount</th>
                                                <th>Reason</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {indivDeds.map(d => (
                                                <tr key={d.id}>
                                                    <td>{d.deduction_name || ('Type #' + d.deduction_type_id)}</td>
                                                    <td style={{ fontWeight: 'bold', color: '#d32f2f' }}>
                                                        UGX {Number(d.amount).toLocaleString()}
                                                    </td>
                                                    <td style={{ fontSize: '12px' }}>{d.reason || '—'}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '4px',
                                                            background: d.status === 'Approved' ? '#e8f5e9' : '#fff3e0',
                                                            color: d.status === 'Approved' ? '#0d904f' : '#e65100',
                                                            fontSize: '12px'
                                                        }}>
                                                            {d.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => handleDeleteIndiv(d.id)}
                                                            style={{
                                                                color: '#d32f2f', border: 'none',
                                                                background: 'none', cursor: 'pointer',
                                                                fontSize: '12px', fontWeight: '600'
                                                            }}
                                                        >
                                                            🗑️ Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═════════════════════════════════════════════════════════ */}
            {/* TAB 3: Process Payroll                                   */}
            {/* ═════════════════════════════════════════════════════════ */}

            {tab === 'process' && (
                <div style={{ maxWidth: '600px' }}>
                    <div className="card">
                        <div className="card-header">⚙️ Process Monthly Payroll</div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Month *</label>
                                <input
                                    type="month"
                                    className="form-input"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    style={{ maxWidth: '250px' }}
                                />
                            </div>

                            <div style={{
                                background: '#fff3e0', padding: '15px', borderRadius: '8px',
                                marginBottom: '20px', border: '1px solid #ffcc80'
                            }}>
                                <p style={{ fontWeight: '600', color: '#e65100', marginBottom: '8px' }}>
                                    ⚠️ What this does:
                                </p>
                                <ul style={{ fontSize: '13px', color: '#555', paddingLeft: '20px', margin: 0 }}>
                                    <li>Gets ALL active staff members ({staff.length})</li>
                                    <li>Calculates mandatory deductions ({types.filter(t => t.is_mandatory).length} types)</li>
                                    <li>Adds individual deductions for this month</li>
                                    <li>Computes Net Pay = Gross - All Deductions</li>
                                    <li>Creates payroll_payments records</li>
                                </ul>
                            </div>

                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                                👥 Active staff: <strong>{staff.length}</strong>
                                {' | '}
                                📉 Mandatory deduction types: <strong>{types.filter(t => t.is_mandatory).length}</strong>
                            </p>

                            <button
                                className="btn btn-primary"
                                onClick={handleProcessPayroll}
                                disabled={processing}
                                style={{ fontSize: '16px', padding: '12px 24px' }}
                            >
                                {processing ? '⏳ Processing...' : '⚙️ Process Payroll for ' + month}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}