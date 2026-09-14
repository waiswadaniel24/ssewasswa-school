import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function PurchaseAuthorization() {
    const { user } = useAuth();
    const [tab, setTab] = useState('requests');
    const [msg, setMsg] = useState('');
    const [requests, setRequests] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ item_description: '', quantity: 1, estimated_cost: 0, vendor: '', urgency: 'Normal' });
    const [rejectId, setRejectId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => { loadRequests(); }, []);

    const loadRequests = async () => {
        const r = await window.electronAPI.getPurchaseRequests();
        if (r.success) setRequests(r.data);
    };

    const handleSubmit = async () => {
        if (!form.item_description.trim() || !form.estimated_cost) { setMsg('Item and cost are required'); return; }
        const r = await window.electronAPI.createPurchaseRequest({
            ...form,
            quantity: parseInt(form.quantity) || 1,
            estimated_cost: parseFloat(form.estimated_cost) || 0,
            requested_by: user.id,
            requested_by_name: `${user.role} - ${user.username}`
        });
        if (r.success) { setMsg('Request submitted'); setShowForm(false); setForm({ item_description: '', quantity: 1, estimated_cost: 0, vendor: '', urgency: 'Normal' }); loadRequests(); }
        else setMsg('Error: ' + r.error);
    };

    const handleAuthorize = async (id, status) => {
        if (status === 'Rejected' && !rejectReason.trim()) { setMsg('Give a rejection reason'); return; }
        const r = await window.electronAPI.authorizePurchase(id, status, {
            authorized_by: user.id,
            authorized_by_name: `${user.role} - ${user.username}`,
            rejection_reason: rejectReason
        });
        if (r.success) { setMsg(`Request ${status.toLowerCase()}`); setRejectId(null); setRejectReason(''); loadRequests(); }
        else setMsg('Error: ' + r.error);
    };

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
    const stats = { total: requests.length, pending: requests.filter(r => r.status === 'Pending').length, approved: requests.filter(r => r.status === 'Approved').length, rejected: requests.filter(r => r.status === 'Rejected').length };

    return (
        <div className="page-container">
            <h1 className="page-title">Purchase Authorization</h1>
            {msg && <p style={{ color: msg.includes('Error') || msg.includes('eject') ? 'red' : 'green', marginBottom: 15, fontSize: 14 }}>{msg}</p>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Total Requests', value: stats.total, color: '#1a73e8', bg: '#e8f0fe' },
                    { label: 'Pending', value: stats.pending, color: '#e65100', bg: '#fff3e0' },
                    { label: 'Approved', value: stats.approved, color: '#2e7d32', bg: '#e8f5e9' },
                    { label: 'Rejected', value: stats.rejected, color: '#d32f2f', bg: '#fce4ec' }
                ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '18px 20px' }}>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Purchase Request'}</button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {['all', 'Pending', 'Approved', 'Rejected'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            style={{ padding: '6px 14px', border: `1px solid ${filter === f ? '#1a73e8' : '#dadce0'}`, borderRadius: 20, background: filter === f ? '#1a73e8' : '#fff', color: filter === f ? 'white' : '#666', cursor: 'pointer', fontSize: 12 }}>
                            {f === 'all' ? `All (${stats.total})` : `${f} (${stats[f.toLowerCase()]})`}
                        </button>
                    ))}
                </div>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header">New Purchase Request</div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                            <div className="form-group"><label className="form-label">Item Description *</label><input className="form-input" value={form.item_description} onChange={e => setForm({ ...form, item_description: e.target.value })} placeholder="e.g. 20 reams of A4 paper" /></div>
                            <div className="form-group"><label className="form-label">Quantity *</label><input type="number" className="form-input" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} min="1" /></div>
                            <div className="form-group"><label className="form-label">Estimated Cost (UGX) *</label><input type="number" className="form-input" value={form.estimated_cost} onChange={e => setForm({ ...form, estimated_cost: e.target.value })} /></div>
                            <div className="form-group"><label className="form-label">Vendor / Supplier</label><input className="form-input" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="Optional" /></div>
                            <div className="form-group"><label className="form-label">Urgency</label>
                                <select className="form-input" value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })}>
                                    <option>Normal</option><option>Urgent</option><option>Critical</option>
                                </select>
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={handleSubmit}>Submit Request</button>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-body" style={{ overflowX: 'auto' }}>
                    {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: 30 }}>No purchase requests</p>}
                    <table className="data-table">
                        <thead><tr><th>Item</th><th>Qty</th><th>Cost</th><th>Vendor</th><th>Urgency</th><th>Requested By</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.id}>
                                    <td><strong>{r.item_description}</strong></td>
                                    <td>{r.quantity}</td>
                                    <td>UGX {Number(r.estimated_cost).toLocaleString()}</td>
                                    <td>{r.vendor || '—'}</td>
                                    <td><span style={{ padding: '2px 8px', borderRadius: 4, background: r.urgency === 'Critical' ? '#fce4ec' : r.urgency === 'Urgent' ? '#fff3e0' : '#f5f5f5', color: r.urgency === 'Critical' ? '#d32f2f' : r.urgency === 'Urgent' ? '#e65100' : '#666', fontSize: 11 }}>{r.urgency}</span></td>
                                    <td style={{ fontSize: 12 }}>{r.requested_by_name}</td>
                                    <td style={{ fontSize: 12 }}>{r.created_at ? r.created_at.slice(0, 10) : ''}</td>
                                    <td>
                                        <span style={{ padding: '3px 10px', borderRadius: 4, background: r.status === 'Approved' ? '#e8f5e9' : r.status === 'Rejected' ? '#fce4ec' : '#fff3e0', color: r.status === 'Approved' ? '#2e7d32' : r.status === 'Rejected' ? '#d32f2f' : '#e65100', fontSize: 12, fontWeight: 600 }}>{r.status}</span>
                                        {r.status === 'Rejected' && r.rejection_reason && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>Reason: {r.rejection_reason}</div>}
                                        {r.status !== 'Pending' && r.authorized_by_name && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>By: {r.authorized_by_name}</div>}
                                    </td>
                                    <td>
                                        {r.status === 'Pending' && (user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'Bursar') && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {rejectId === r.id ? (
                                                    <>
                                                        <input className="form-input" style={{ width: 140, fontSize: 11, padding: '4px 8px' }} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason" />
                                                        <button onClick={() => handleAuthorize(r.id, 'Rejected')} style={{ padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 4, background: '#d32f2f', color: 'white', cursor: 'pointer' }}>Confirm</button>
                                                        <button onClick={() => setRejectId(null)} style={{ padding: '4px 10px', fontSize: 11, border: '1px solid #dadce0', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>Cancel</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => handleAuthorize(r.id, 'Approved')} style={{ padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 4, background: '#2e7d32', color: 'white', cursor: 'pointer' }}>Approve</button>
                                                        <button onClick={() => setRejectId(r.id)} style={{ padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 4, background: '#d32f2f', color: 'white', cursor: 'pointer' }}>Reject</button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}



