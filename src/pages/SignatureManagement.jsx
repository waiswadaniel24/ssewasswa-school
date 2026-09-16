import React, { useState, useEffect } from 'react';
import SignatureCapture from '../components/SignatureCapture.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const DOC_TYPES = [
    { value: 'report_card', label: 'Report Cards', roles: ['Super Admin', 'Admin', 'Teacher'] },
    { value: 'certificate', label: 'Certificates', roles: ['Super Admin', 'Admin'] },
    { value: 'official_letter', label: 'Official Letters', roles: ['Super Admin', 'Admin'] },
    { value: 'meeting_minutes', label: 'Meeting Minutes', roles: ['Super Admin', 'Admin'] },
    { value: 'transfer_certificate', label: 'Transfer Certificate', roles: ['Super Admin', 'Admin'] },
    { value: 'receipt', label: 'Payment Receipts', roles: ['Super Admin', 'Admin', 'Bursar'] },
    { value: 'payroll', label: 'Payroll Documents', roles: ['Super Admin', 'Admin', 'Bursar'] },
    { value: 'purchase_order', label: 'Purchase Orders', roles: ['Super Admin', 'Admin', 'Bursar'] },
    { value: 'id_card_staff', label: 'Staff ID Cards', roles: ['Super Admin', 'Admin'] },
    { value: 'id_card_student', label: 'Student ID Cards', roles: ['Super Admin', 'Admin'] },
    { value: 'financial_report', label: 'Financial Reports', roles: ['Super Admin', 'Admin', 'Bursar'] }
];

const POSITIONS = [
    { value: 'bottom_left', label: 'Bottom Left' },
    { value: 'bottom_center', label: 'Bottom Center' },
    { value: 'bottom_right', label: 'Bottom Right' },
    { value: 'top_right', label: 'Top Right (Stamp)' }
];

export default function SignatureManagement() {
    const auth = useAuth();
    const user = auth && auth.user ? auth.user : null;
    const userRole = user && user.role ? user.role : 'Viewer';
    const [msg, setMsg] = useState('');
    const [tab, setTab] = useState('capture'); // capture | assign | view
    const [mySignature, setMySignature] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [allAssignments, setAllAssignments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState('report_card');
    const [selectedPos, setSelectedPos] = useState('bottom_left');
    const [staffList, setStaffList] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState('');

    // Load my signature on mount
    useEffect(() => {
        if (user) {
            window.electronAPI.getSignature(user.id, 'Staff').then(r => {
                if (r.success && r.data) setMySignature(r.data.signature_image);
            });
            loadStaff();
        }
    }, [user]);

    useEffect(() => { if (selectedDoc) loadAssignments(); }, [selectedDoc]);

    const loadStaff = async () => {
        const r = await window.electronAPI.queryDatabase("SELECT id, first_name, last_name, role FROM users WHERE role != 'Viewer' ORDER BY role, first_name");
        if (r.success) setStaffList(r.data);
        // Default to current user
        if (user) {
            const me = r.data.find(s => s.id === user.id);
            if (me) setSelectedStaff(String(me.id));
        }
    };

    const loadAssignments = async () => {
        const r = await window.electronAPI.getSignatureAssignments(selectedDoc);
        if (r.success) setAssignments(r.data);
    };

    const handleSaveSignature = async (imageData) => {
        if (!user) { setMsg('Please sign in again before saving a signature'); return; }
        setMySignature(imageData);
        const r = await window.electronAPI.saveSignature({
            person_id: user.id,
            person_type: 'Staff',
            person_name: `${user.role} - ${user.username}`,
            signature_image: imageData
        });
        setMsg(r.success ? 'Signature saved!' : 'Error: ' + r.error);
    };

    const handleAssign = async () => {
        if (!selectedStaff) { setMsg('Select a person'); return; }
        const staff = staffList.find(s => String(s.id) === selectedStaff);
        if (!staff) return;

        // Check if this user can assign to this doc type
        const docConfig = DOC_TYPES.find(d => d.value === selectedDoc);
        if (!user) { setMsg('Please sign in again before assigning signatures'); return; }
        if (docConfig && !docConfig.roles.includes(userRole) && userRole !== 'Super Admin') {
            // Only allow assigning YOURSELF, or Super Admin can assign anyone
            if (String(staff.id) !== String(user.id)) {
                setMsg(`Only ${docConfig.roles.join('/')} can assign signatures to ${docConfig.label}`);
                return;
            }
        }

        const r = await window.electronAPI.setSignatureAssignment({
            user_id: parseInt(selectedStaff),
            person_name: `${staff.first_name} ${staff.last_name}`,
            person_role: staff.role,
            doc_type: selectedDoc,
            signature_position: selectedPos
        });
        if (r.success) { setMsg('Assignment saved!'); loadAssignments(); }
        else setMsg('Error: ' + r.error);
    };

    const handleRemove = async (id) => {
        await window.electronAPI.removeSignatureAssignment(id);
        loadAssignments();
    };

    const handleLoadAll = async () => {
        const r = await window.electronAPI.getSignatureAssignments(null);
        if (r.success) setAllAssignments(r.data);
        setTab('view');
    };

    return (
        <div className="page-container">
            <h1 className="page-title">Signature Management</h1>
            {msg && <p style={{ color: msg.includes('Error') ? 'red' : 'green', marginBottom: 15, fontSize: 14 }}>{msg}</p>}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e0e0e0' }}>
                {[
                    { key: 'capture', label: '1. Capture Signature' },
                    { key: 'assign', label: '2. Assign to Documents' },
                    { key: 'view', label: '3. View All Assignments' }
                ].map(t => (
                    <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'view') handleLoadAll(); }}
                        style={{ padding: '10px 20px', border: 'none', background: tab === t.key ? '#1a73e8' : 'transparent', color: tab === t.key ? 'white' : '#666', cursor: 'pointer', fontWeight: tab === t.key ? 600 : 400, fontSize: 13, borderBottom: tab === t.key ? '2px solid #1a73e8' : '2px solid transparent', marginBottom: -2 }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* TAB 1: Capture Signature */}
            {tab === 'capture' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
                    <div className="card">
                        <div className="card-header">Your Signature</div>
                        <div className="card-body">
                            <p style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>
                                Draw your signature below. This will be stored securely and placed on documents you assign it to.
                            </p>
                            <SignatureCapture onSave={handleSaveSignature} width={380} height={150} />
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">Preview</div>
                        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                            {mySignature ? (
                                <>
                                    <img src={mySignature} alt="Your signature" style={{ maxWidth: 250, border: '1px solid #e0e0e0', borderRadius: 8, padding: 10 }} />
                                    <p style={{ marginTop: 15, fontSize: 13, color: '#0d904f' }}>✓ Signature saved and ready to assign</p>
                                </>
                            ) : (
                                <p style={{ color: '#999', fontSize: 14 }}>No signature captured yet</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Assign to Documents */}
            {tab === 'assign' && (
                <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 24 }}>
                    <div className="card">
                        <div className="card-header">Assign Signature</div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Person</label>
                                <select className="form-input" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                                    <option value="">-- Select --</option>
                                    {staffList.filter(s => s.role !== 'Viewer').map(s => (
                                        <option key={s.id} value={String(s.id)}>{s.first_name} {s.last_name} ({s.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Document Type</label>
                                <select className="form-input" value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)}>
                                    {DOC_TYPES.filter(d => d.roles.includes(userRole) || userRole === 'Super Admin').map(d => (
                                        <option key={d.value} value={d.value}>{d.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Position on Document</label>
                                <select className="form-input" value={selectedPos} onChange={e => setSelectedPos(e.target.value)}>
                                    {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={handleAssign}>Assign to This Document</button>
                            <p style={{ fontSize: 11, color: '#999', marginTop: 10 }}>
                                Only {userRole} can assign to visible document types. Super Admin can assign anyone to anything.
                            </p>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">Current Assignments for {DOC_TYPES.find(d => d.value === selectedDoc)?.label}</div>
                        <div className="card-body">
                            {assignments.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: 30 }}>No signatures assigned to this document type</p>}
                            {assignments.map(a => (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    {a.signature_image ? (
                                        <img src={a.signature_image} alt="" style={{ height: 40, border: '1px solid #e0e0e0', borderRadius: 4 }} />
                                    ) : (
                                        <div style={{ width: 80, height: 40, border: '1px dashed #ccc', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#999' }}>No sig</div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.person_name}</div>
                                        <div style={{ fontSize: 12, color: '#666' }}>{a.person_role} • Position: {a.signature_position}</div>
                                    </div>
                                    <button onClick={() => handleRemove(a.id)} style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }}>Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: View All */}
            {tab === 'view' && (
                <div className="card">
                    <div className="card-header">All Signature Assignments ({allAssignments.length})</div>
                    <div className="card-body" style={{ overflowX: 'auto' }}>
                        {allAssignments.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: 30 }}>No assignments yet</p>}
                        <table className="data-table">
                            <thead><tr><th>Signature</th><th>Person</th><th>Role</th><th>Document Type</th><th>Position</th><th>Status</th></tr></thead>
                            <tbody>
                                {allAssignments.map(a => (
                                    <tr key={a.id}>
                                        <td>{a.signature_image ? <img src={a.signature_image} alt="" style={{ height: 30 }} /> : '—'}</td>
                                        <td>{a.person_name}</td>
                                        <td>{a.person_role}</td>
                                        <td><span style={{ padding: '2px 8px', borderRadius: 4, background: '#e8f0fe', fontSize: 12 }}>{a.doc_type}</span></td>
                                        <td>{a.signature_position}</td>
                                        <td><span style={{ color: a.enabled ? '#0d904f' : '#999' }}>{a.enabled ? 'Active' : 'Disabled'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
