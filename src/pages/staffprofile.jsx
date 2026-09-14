// FileName: src/pages/StaffProfile.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Staff profile view — personal info, payroll history, qualifications

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function StaffProfile() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [staff, setStaff] = useState(null);
    const [payroll, setPayroll] = useState([]);
    const [qualifications, setQualifications] = useState([]);
    const [photoData, setPhotoData] = useState(null);
    const [tab, setTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ─── Load staff data on mount ──────────────────────────────
    useEffect(() => {
        const fetchAll = async () => {
            if (!id) {
                setError('No staff ID provided');
                setLoading(false);
                return;
            }

            try {
                // ─── Staff record ─────────────────────────────────
                const sRes = await window.electronAPI.queryDatabase(
                    "SELECT * FROM staff WHERE id = ?", [id]
                );
                if (!mountedRef.current) return;

                if (!sRes || !sRes.success || sRes.data.length === 0) {
                    setError('Staff member not found');
                    setLoading(false);
                    return;
                }

                setStaff(sRes.data[0]);

                // ─── Photo (FIXED: uses getPhoto API, not file:// protocol) ──
                if (sRes.data[0].photo_path) {
                    try {
                        const pRes = await window.electronAPI.getPhoto(sRes.data[0].photo_path);
                        if (!mountedRef.current) return;
                        if (pRes && pRes.success && pRes.data) {
                            setPhotoData(pRes.data);
                        }
                    } catch (e) {
                        console.error('StaffProfile: photo load error:', e.message);
                    }
                }

                // ─── Payroll history ─────────────────────────────
                // FIXED: original queried 'date' column which doesn't exist
                // Table has: month, year, created_at
                try {
                    const pRes = await window.electronAPI.queryDatabase(
                        "SELECT id, amount_paid, month, year, created_at FROM payroll_payments WHERE staff_id = ? ORDER BY year DESC, month DESC",
                        [id]
                    );
                    if (!mountedRef.current) return;
                    if (pRes && pRes.success) setPayroll(pRes.data || []);
                } catch (e) {
                    console.error('StaffProfile: payroll error:', e.message);
                }

                // ─── Qualifications ────────────────────────────────
                try {
                    const qRes = await window.electronAPI.queryDatabase(
                        "SELECT * FROM teacher_qualifications WHERE staff_id = ? ORDER BY year_obtained DESC",
                        [id]
                    );
                    if (!mountedRef.current) return;
                    if (qRes && qRes.success) setQualifications(qRes.data || []);
                } catch (e) {
                    console.error('StaffProfile: qualifications error:', e.message);
                }

            } catch (e) {
                if (!mountedRef.current) return;
                console.error('StaffProfile: fetch error:', e.message);
                setError('Error loading staff profile: ' + e.message);
            } finally {
                if (mountedRef.current) setLoading(false);
            }
        };

        fetchAll();
    }, [id]);

    // ─── Loading state ──────────────────────────────────────────
    if (loading) {
        return (
            <div className="page-container">
                <button onClick={() => navigate('/staff')}
                    style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: '14px' }}>
                    ← Back to Staff
                </button>
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
                        <p style={{ color: '#666' }}>Loading staff profile...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Error state ────────────────────────────────────────────
    if (error) {
        return (
            <div className="page-container">
                <button onClick={() => navigate('/staff')}
                    style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: '14px' }}>
                    ← Back to Staff
                </button>
                <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ fontSize: '48px', marginBottom: '10px' }}>❌</p>
                        <h3 style={{ color: '#d32f2f' }}>{error}</h3>
                        <button onClick={() => navigate('/staff')} className="btn btn-primary" style={{ marginTop: '20px' }}>
                            Back to Staff List
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!staff) return null;

    // ─── Derived values ────────────────────────────────────────
    const totalPaid = payroll.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const annualSalary = (staff.salary || 0) * 12;

    // ─── Tabs ──────────────────────────────────────────────────
    const tabs = [
        { key: 'profile', label: '📋 Profile', icon: '📋' },
        { key: 'payroll', label: '💰 Payroll (' + payroll.length + ')', icon: '💰' },
        { key: 'qualifications', label: '🎓 Qualifications (' + qualifications.length + ')', icon: '🎓' }
    ];

    // ─── InfoField component (inline) ──────────────────────────
    const InfoField = ({ label, value }) => (
        <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#5f6368', textTransform: 'uppercase', marginBottom: '2px' }}>
                {label}
            </div>
            <div style={{
                fontSize: '14px', color: '#202124',
                background: '#f8f9fa', padding: '8px 12px', borderRadius: '4px'
            }}>
                {value || '-'}
            </div>
        </div>
    );

    return (
        <div className="page-container">
            {/* ─── Back Button ──────────────────────────────────── */}
            <button
                onClick={() => navigate('/staff')}
                style={{
                    marginBottom: '20px',
                    background: 'none', border: 'none',
                    color: '#1a73e8', cursor: 'pointer',
                    fontSize: '14px', fontWeight: '600'
                }}
            >
                ← Back to Staff
            </button>

            {/* ─── Profile Header ───────────────────────────────── */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-body">
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Photo (FIXED: uses getPhoto API data, not file:// protocol) */}
                        <div style={{
                            width: '100px', height: '100px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid #1a73e8',
                            background: '#e8f0fe',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                        }}>
                            {photoData ? (
                                <img src={photoData} alt="Staff"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '36px' }}>👤</span>
                            )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <h2 style={{ margin: '0 0 5px 0', color: '#1a73e8' }}>
                                {staff.first_name} {staff.other_name ? staff.other_name + ' ' : ''}{staff.last_name}
                            </h2>
                            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '14px' }}>
                                Staff ID: <b>{staff.staff_id_number || 'N/A'}</b>
                                {staff.tsc_number && <span> | TSC: <b>{staff.tsc_number}</b></span>}
                            </p>
                            <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '14px' }}>
                                Role: <b>{staff.role}</b>
                                {staff.designation && <span> | {staff.designation}</span>}
                            </p>
                            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                                Employer: <b>{(staff.employer_type || 'BOG').replace(/_/g, ' ')}</b>
                                {' | '}Status:
                                <span style={{
                                    marginLeft: '4px', padding: '2px 8px', borderRadius: '4px',
                                    background: staff.status === 'Active' ? '#e8f5e9' : '#fff3e0',
                                    color: staff.status === 'Active' ? '#0d904f' : '#e65100',
                                    fontSize: '12px', fontWeight: '600'
                                }}>
                                    {staff.status}
                                </span>
                            </p>
                        </div>

                        {/* Salary Card */}
                        <div style={{
                            background: '#e8f0fe', padding: '15px 20px', borderRadius: '8px',
                            textAlign: 'center', minWidth: '120px'
                        }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>
                                UGX {(staff.salary || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '11px', color: '#5f6368' }}>Monthly Salary</div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0d904f', marginTop: '4px' }}>
                                UGX {totalPaid.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Paid (All Time)</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Tabs ─────────────────────────────────────────── */}
            <div style={{
                display: 'flex', gap: '4px', marginBottom: '20px',
                borderBottom: '2px solid #dadce0', paddingBottom: '5px', flexWrap: 'wrap'
            }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            padding: '8px 16px', border: 'none',
                            background: tab === t.key ? '#1a73e8' : 'transparent',
                            color: tab === t.key ? 'white' : '#5f6368',
                            cursor: 'pointer', borderRadius: '4px 4px 0 0',
                            fontWeight: tab === t.key ? '600' : '400',
                            fontSize: '13px'
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── Tab: Profile ────────────────────────────────── */}
            {tab === 'profile' && (
                <div className="card">
                    <div className="card-header">📋 Personal & Employment Information</div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            <InfoField label="First Name" value={staff.first_name} />
                            <InfoField label="Last Name" value={staff.last_name} />
                            <InfoField label="Other Name" value={staff.other_name} />
                            <InfoField label="Gender" value={staff.gender === 'M' ? 'Male' : 'Female'} />
                            <InfoField label="Date of Birth" value={staff.date_of_birth} />
                            <InfoField label="NIN" value={staff.nin} />
                            <InfoField label="Phone" value={staff.phone} />
                            <InfoField label="Email" value={staff.email} />
                            <InfoField label="Role" value={staff.role} />
                            <InfoField label="Designation" value={staff.designation} />
                            <InfoField label="Employer Type" value={(staff.employer_type || '').replace(/_/g, ' ')} />
                            <InfoField label="Payroll Number" value={staff.payroll_number} />
                            <InfoField label="TSC Number" value={staff.tsc_number} />
                            <InfoField label="Appointment Date" value={staff.appointment_date} />
                            <InfoField label="Status" value={staff.status} />
                        </div>

                        <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#1a73e8' }}>🏦 Payment Details</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            <InfoField label="Bank Account" value={staff.bank_account} />
                            <InfoField label="MoMo Number" value={staff.momo_number} />
                            <InfoField label="Monthly Salary" value={'UGX ' + (staff.salary || 0).toLocaleString()} />
                            <InfoField label="Annual Salary" value={'UGX ' + annualSalary.toLocaleString()} />
                        </div>

                        <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#1a73e8' }}>🎓 Qualifications (EMIS)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            <InfoField label="Highest Qualification" value={staff.highest_qualification} />
                            <InfoField label="Professional Qualification" value={staff.professional_qualification} />
                            <InfoField label="Subjects Trained In" value={staff.subjects_trained} />
                            <InfoField label="Subjects Teaching" value={staff.subjects_teaching} />
                            <InfoField label="Years of Experience" value={staff.years_experience ? staff.years_experience + ' years' : '-'} />
                            <InfoField label="Special Needs Trained" value={staff.special_needs_trained ? 'Yes' : 'No'} />
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Tab: Payroll ────────────────────────────────── */}
            {tab === 'payroll' && (
                <div className="card">
                    <div className="card-header">💰 Payroll History ({payroll.length} payments)</div>
                    <div className="card-body">
                        {payroll.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
                                No payroll payments recorded yet
                            </p>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Year</th>
                                        <th>Amount Paid</th>
                                        <th>Recorded At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payroll.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: '600' }}>{p.month || '-'}</td>
                                            <td>{p.year || '-'}</td>
                                            <td style={{ fontWeight: 'bold', color: '#0d904f' }}>
                                                UGX {(p.amount_paid || 0).toLocaleString()}
                                            </td>
                                            <td style={{ fontSize: '12px', color: '#999' }}>
                                                {p.created_at ? String(p.created_at).slice(0, 19) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                                        <td colSpan="2">Total Paid</td>
                                        <td style={{ color: '#0d904f' }}>
                                            UGX {totalPaid.toLocaleString()}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Tab: Qualifications ─────────────────────────── */}
            {tab === 'qualifications' && (
                <div className="card">
                    <div className="card-header">🎓 Teacher Qualifications ({qualifications.length})</div>
                    <div className="card-body">
                        {qualifications.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
                                No qualifications recorded yet.
                                <br />
                                <span style={{ fontSize: '12px' }}>
                                    Add qualifications via the Teacher Qualifications page.
                                </span>
                            </p>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Qualification</th>
                                        <th>Institution</th>
                                        <th>Year</th>
                                        <th>Certificate No.</th>
                                        <th>TSC Reg. No.</th>
                                        <th>Specialization</th>
                                        <th>Teaching Subjects</th>
                                        <th>Experience</th>
                                        <th>UNEB Examiner</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {qualifications.map(q => (
                                        <tr key={q.id}>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '4px',
                                                    background: '#e8f0fe', color: '#1a73e8',
                                                    fontSize: '12px', fontWeight: '600'
                                                }}>
                                                    {q.qualification_type || '-'}
                                                </span>
                                            </td>
                                            <td>{q.institution || '-'}</td>
                                            <td>{q.year_obtained || '-'}</td>
                                            <td style={{ fontSize: '12px' }}>{q.certificate_number || '-'}</td>
                                            <td style={{ fontSize: '12px' }}>{q.tsc_registration_number || '-'}</td>
                                            <td style={{ fontSize: '12px' }}>{q.specialization || '-'}</td>
                                            <td style={{ fontSize: '12px' }}>{q.teaching_subjects || '-'}</td>
                                            <td>{q.years_experience ? q.years_experience + ' yrs' : '-'}</td>
                                            <td>
                                                {q.is_uneb_examiner ? (
                                                    <span style={{ color: '#0d904f', fontWeight: '600' }}>✅ Yes</span>
                                                ) : (
                                                    <span style={{ color: '#999' }}>No</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}