// FileName: src/pages/Staff.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useRef } from 'react';

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState(null);

  const emptyForm = {
    id: null, first_name: '', last_name: '', other_name: '', gender: 'M',
    date_of_birth: '', role: 'Teacher', designation: '', employer_type: 'BOG',
    payroll_number: '', nin: '', tsc_number: '', highest_qualification: '',
    professional_qualification: '', subjects_trained: '', subjects_teaching: '',
    phone: '', email: '', appointment_date: '', status: 'Active',
    salary: 0, bank_account: '', momo_number: ''
  };

  const [formData, setFormData] = useState(emptyForm);

  const mountedRef = useRef(true);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Fetch staff list (with optional search) ──────────────
  const fetchData = async (search) => {
    try {
      let query = "SELECT id, first_name, last_name, other_name, gender, role, designation, employer_type, salary, highest_qualification, phone, status, tsc_number, staff_id_number FROM staff WHERE status != 'Deleted'";
      const params = [];

      if (search && search.trim()) {
        query += " AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR staff_id_number LIKE ? OR tsc_number LIKE ?)";
        const st = '%' + search.trim() + '%';
        params.push(st, st, st, st, st);
      }

      query += " ORDER BY first_name ASC LIMIT 200";

      const r = await window.electronAPI.queryDatabase(query, params);
      if (!mountedRef.current) return;
      if (r && r.success) {
        setStaffList(r.data || []);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Staff: fetch error:', e.message);
      setMsg('❌ Error loading staff: ' + e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ─── Initial load ──────────────────────────────────────────
  useEffect(() => {
    fetchData('');
  }, []);

  // ─── Debounced search ─────────────────────────────────────
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchData(searchTerm);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm]);

  // ─── Handle form submit (insert or update) ────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setMsg('⚠️ First Name and Last Name are required');
      return;
    }
    if (!formData.role) {
      setMsg('⚠️ Role is required');
      return;
    }

    setSaving(true);
    setMsg('');

    try {
      const d = formData;
      let result;

      if (d.id) {
        // ─── UPDATE ───────────────────────────────────────
        result = await window.electronAPI.queryDatabase(
          "UPDATE staff SET first_name=?, last_name=?, other_name=?, gender=?, date_of_birth=?, role=?, designation=?, employer_type=?, payroll_number=?, nin=?, tsc_number=?, highest_qualification=?, professional_qualification=?, subjects_trained=?, subjects_teaching=?, phone=?, email=?, appointment_date=?, status=?, salary=?, bank_account=?, momo_number=? WHERE id=?",
          [
            d.first_name, d.last_name, d.other_name, d.gender, d.date_of_birth,
            d.role, d.designation, d.employer_type, d.payroll_number, d.nin,
            d.tsc_number, d.highest_qualification, d.professional_qualification,
            d.subjects_trained, d.subjects_teaching, d.phone, d.email,
            d.appointment_date, d.status, d.salary, d.bank_account, d.momo_number,
            d.id
          ]
        );
      } else {
        // ─── INSERT ───────────────────────────────────────
        // Generate staff ID if not provided
        const sid = d.tsc_number || d.payroll_number || ('STF-' + Date.now());
        result = await window.electronAPI.queryDatabase(
          "INSERT INTO staff (first_name, last_name, other_name, gender, date_of_birth, role, designation, employer_type, payroll_number, nin, tsc_number, staff_id_number, highest_qualification, professional_qualification, subjects_trained, subjects_teaching, phone, email, appointment_date, status, salary, bank_account, momo_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            d.first_name, d.last_name, d.other_name, d.gender, d.date_of_birth,
            d.role, d.designation, d.employer_type, d.payroll_number, d.nin,
            d.tsc_number, sid, d.highest_qualification, d.professional_qualification,
            d.subjects_trained, d.subjects_teaching, d.phone, d.email,
            d.appointment_date, d.status, d.salary, d.bank_account, d.momo_number
          ]
        );
      }

      if (!mountedRef.current) return;

      if (result && result.success) {
        setMsg(editData ? '✅ Staff updated successfully!' : '✅ Staff added successfully!');
        setShowForm(false);
        setEditData(null);
        setFormData(emptyForm);
        fetchData(searchTerm);
      } else {
        setMsg('❌ ' + ((result && result.error) || 'Error saving staff'));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Staff: save error:', err.message);
      setMsg('❌ Error: ' + err.message);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Edit staff (populate form) ────────────────────────────
  const handleEdit = (staff) => {
    // Fetch full record (list query only selected key fields)
    const loadFullRecord = async () => {
      try {
        const r = await window.electronAPI.queryDatabase(
          "SELECT * FROM staff WHERE id = ?", [staff.id]
        );
        if (!mountedRef.current) return;
        if (r && r.success && r.data.length > 0) {
          setFormData(r.data[0]);
          setEditData(r.data[0]);
          setShowForm(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (e) {
        console.error('Staff: load full record error:', e.message);
      }
    };
    loadFullRecord();
  };

  // ─── Delete staff (soft delete — set status to 'Deleted') ──
  const handleDelete = async (staff) => {
    const name = staff.first_name + ' ' + staff.last_name;
    if (!confirm('Delete ' + name + '?\n\nThis will mark the staff as "Deleted" (soft delete). The record is preserved for payroll history and audit but hidden from active lists.')) {
      return;
    }

    try {
      await window.electronAPI.queryDatabase(
        "UPDATE staff SET status = 'Deleted' WHERE id = ?", [staff.id]
      );
      if (!mountedRef.current) return;
      setMsg('🗑️ ' + name + ' removed');
      fetchData(searchTerm);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Staff: delete error:', e.message);
      setMsg('❌ Error deleting: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Open new staff form ───────────────────────────────────
  const openNewForm = () => {
    setEditData(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  // ─── Derived values ────────────────────────────────────────
  const teacherCount = staffList.filter(s => s.role === 'Teacher').length;
  const govtCount = staffList.filter(s => s.employer_type === 'Government_Payroll').length;
  const activeCount = staffList.filter(s => s.status === 'Active').length;

  // ─── Loading state ────────────────────────────────────────
  if (loading && staffList.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">Staff & HR</h1>
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
            <p style={{ color: '#666' }}>Loading staff...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // ─── Role options ──────────────────────────────────────────
  const roleOptions = ['Teacher', 'Head Teacher', 'Deputy Head', 'Bursar', 'Secretary', 'Librarian', 'Cleaner', 'Security', 'Cook', 'Other'];
  const employerOptions = ['Government_Payroll', 'BOG', 'PTA', 'Other', 'Volunteer'];
  const qualificationOptions = ['', 'PLE', 'UCE', 'UACE', 'Grade_III_TC', 'Diploma', 'Degree', 'Masters'];
  const profQualOptions = ['', 'Grade_III_TC', 'Dip_In_Ed', 'B.Ed', 'PGDE'];

  return (
    <div className="page-container">
      <h1 className="page-title">👨‍🏫 Staff & HR</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: msg.includes('❌') ? '#c62828' : (msg.includes('⚠️') ? '#e65100' : '#0d904f'),
          marginBottom: '15px', padding: '10px 14px',
          background: msg.includes('❌') ? '#ffebee' : (msg.includes('⚠️') ? '#fff3e0' : '#e8f5e9'),
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Stats Bar ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ background: '#e8f0fe', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold' }}>
          👥 Total: {staffList.length}
        </div>
        <div style={{ background: '#e8f0fe', padding: '8px 16px', borderRadius: '6px' }}>
          🍎 Teachers: {teacherCount}
        </div>
        <div style={{ background: '#e8f0fe', padding: '8px 16px', borderRadius: '6px' }}>
          🏛️ Gov&apos;t: {govtCount}
        </div>
        {staffList.length > activeCount && (
          <div style={{ background: '#fff3e0', padding: '8px 16px', borderRadius: '6px' }}>
            Inactive: {staffList.length - activeCount}
          </div>
        )}

        {showForm ? (
          <button
            onClick={() => setShowForm(false)}
            className="btn btn-secondary"
            style={{ marginLeft: 'auto', padding: '10px 20px' }}
          >
            ❌ Cancel
          </button>
        ) : (
          <button
            onClick={openNewForm}
            className="btn btn-primary"
            style={{ marginLeft: 'auto', padding: '10px 20px' }}
          >
            ➕ Add Staff
          </button>
        )}
      </div>

      {/* ─── Search ────────────────────────────────────────── */}
      {!showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-body" style={{ padding: '12px 16px' }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '12px', top: '50%',
                transform: 'translateY(-50%)', color: '#9aa0a6'
              }}>🔍</span>
              <input
                className="form-input"
                style={{ paddingLeft: '38px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, TSC number, or staff ID..."
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Add/Edit Form ─────────────────────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            {editData ? '✏️ Edit Staff' : '➕ Add New Staff'}
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>

              {/* ── Personal ──────────────────────────── */}
              <h4 style={{ marginBottom: '10px', color: '#1a73e8' }}>👤 Personal Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input className="form-input" value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input className="form-input" value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Other Name</label>
                  <input className="form-input" value={formData.other_name}
                    onChange={(e) => setFormData({ ...formData, other_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-input" value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className="form-input" value={formData.date_of_birth || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">NIN</label>
                  <input className="form-input" value={formData.nin || ''}
                    onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
                    placeholder="National ID Number" />
                </div>
              </div>

              {/* ── Employment & Salary ────────────────── */}
              <h4 style={{ margin: '20px 0 10px', color: '#1a73e8' }}>💼 Employment & Salary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className="form-input" value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })} required>
                    {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Employer *</label>
                  <select className="form-input" value={formData.employer_type}
                    onChange={(e) => setFormData({ ...formData, employer_type: e.target.value })} required>
                    {employerOptions.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Salary (UGX)</label>
                  <input type="number" className="form-input" value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payroll No</label>
                  <input className="form-input" value={formData.payroll_number || ''}
                    onChange={(e) => setFormData({ ...formData, payroll_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">TSC No</label>
                  <input className="form-input" value={formData.tsc_number || ''}
                    onChange={(e) => setFormData({ ...formData, tsc_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Appointed</label>
                  <input type="date" className="form-input" value={formData.appointment_date || ''}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} />
                </div>
              </div>

              {/* ── Payment Details ──────────────────────── */}
              <h4 style={{ margin: '20px 0 10px', color: '#1a73e8' }}>🏦 Payment Details (For Bulk Disbursement)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Phone (MoMo)</label>
                  <input className="form-input" value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0772 123 456" />
                </div>
                <div className="form-group">
                  <label className="form-label">MoMo Number</label>
                  <input className="form-input" value={formData.momo_number || ''}
                    onChange={(e) => setFormData({ ...formData, momo_number: e.target.value })}
                    placeholder="Same as phone if MTN/Airtel" />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank Account</label>
                  <input className="form-input" value={formData.bank_account || ''}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    placeholder="Account Number" />
                </div>
              </div>

              {/* ── Qualifications (EMIS) ────────────────── */}
              <h4 style={{ margin: '20px 0 10px', color: '#1a73e8' }}>🎓 Qualifications (EMIS Required)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Highest Qualification</label>
                  <select className="form-input" value={formData.highest_qualification || ''}
                    onChange={(e) => setFormData({ ...formData, highest_qualification: e.target.value })}>
                    {qualificationOptions.map(q => <option key={q} value={q}>{q || '-- Select --'}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Professional Qualification</label>
                  <select className="form-input" value={formData.professional_qualification || ''}
                    onChange={(e) => setFormData({ ...formData, professional_qualification: e.target.value })}>
                    {profQualOptions.map(q => <option key={q} value={q}>{q || '-- Select --'}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Trained In</label>
                  <input className="form-input" value={formData.subjects_trained || ''}
                    onChange={(e) => setFormData({ ...formData, subjects_trained: e.target.value })}
                    placeholder="e.g. Math, Physics" />
                </div>
                <div className="form-group">
                  <label className="form-label">Teaching Subjects</label>
                  <input className="form-input" value={formData.subjects_teaching || ''}
                    onChange={(e) => setFormData({ ...formData, subjects_teaching: e.target.value })}
                    placeholder="e.g. Math, Chemistry" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* ── Buttons ─────────────────────────────── */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving...' : (editData ? '💾 Update Staff' : '✅ Add Staff')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditData(null); setFormData(emptyForm); }} className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Staff Table ──────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">📋 Staff Records ({staffList.length})</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {staffList.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
              {searchTerm ? 'No staff matching your search' : 'No staff found. Click "Add Staff" to register.'}
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>M/F</th>
                  <th>Role</th>
                  <th>Employer</th>
                  <th>Salary</th>
                  <th>Qualification</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '600' }}>
                      {s.first_name} {s.last_name}
                    </td>
                    <td>{s.gender || '-'}</td>
                    <td>{s.role}</td>
                    <td style={{ fontSize: '12px' }}>{(s.employer_type || '-').replace(/_/g, ' ')}</td>
                    <td style={{ color: '#0d904f', fontWeight: '600' }}>
                      UGX {(s.salary || 0).toLocaleString()}
                    </td>
                    <td style={{ fontSize: '12px' }}>{s.highest_qualification || '-'}</td>
                    <td style={{ fontSize: '12px' }}>{s.phone || '-'}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px',
                        background: s.status === 'Active' ? '#e8f5e9' : '#fff3e0',
                        color: s.status === 'Active' ? '#0d904f' : '#e65100',
                        fontSize: '11px', fontWeight: '600'
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleEdit(s)}
                          style={{ color: '#1a73e8', border: 'none', background: 'none', cursor: 'pointer', marginRight: '8px', fontSize: '12px', fontWeight: '600' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
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