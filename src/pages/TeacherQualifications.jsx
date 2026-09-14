// FileName: src/pages/TeacherQualifications.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Teacher qualifications management — EMIS-compliant qualification records

import React, { useState, useEffect, useRef } from 'react';

const QUALIFICATION_TYPES = ['Certificate', 'Diploma', 'Degree', 'Masters', 'PhD', 'Grade_III_TC', 'Dip_In_Ed', 'B.Ed', 'PGDE', 'Other'];

export default function TeacherQualifications() {
  const [staff, setStaff] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [form, setForm] = useState({
    staff_id: '', qualification_type: '', institution: '',
    year_obtained: '', certificate_number: '', tsc_registration_number: '',
    specialization: '', is_uneb_examiner: false, teaching_subjects: '', years_experience: 0
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Fetch teaching staff ──────────────────────────────────
  const fetchStaff = async () => {
    try {
      const r = await window.electronAPI.queryDatabase(
        "SELECT id, first_name, last_name, role FROM staff WHERE status = 'Active' AND role LIKE '%Teacher%' ORDER BY first_name"
      );
      if (!mountedRef.current) return;
      if (r && r.success) setStaff(r.data || []);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('TeacherQualifications: fetch staff error:', e.message);
    }
  };

  // ─── Fetch all qualifications ─────────────────────────────
  const fetchQualifications = async () => {
    try {
      const r = await window.electronAPI.queryDatabase(
        "SELECT tq.*, s.first_name, s.last_name, s.role FROM teacher_qualifications tq JOIN staff s ON tq.staff_id = s.id ORDER BY s.first_name"
      );
      if (!mountedRef.current) return;
      if (r && r.success) setQualifications(r.data || []);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('TeacherQualifications: fetch qualifications error:', e.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchQualifications();
  }, []);

  // ─── Handle form submit ───────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    if (!form.staff_id) {
      setMsg('⚠️ Please select a teacher');
      return;
    }
    if (!form.qualification_type) {
      setMsg('⚠️ Please select a qualification type');
      return;
    }
    if (!form.institution.trim()) {
      setMsg('⚠️ Institution is required');
      return;
    }

    setSaving(true);
    setMsg('');

    try {
      const r = await window.electronAPI.queryDatabase(
        "INSERT INTO teacher_qualifications (staff_id, qualification_type, institution, year_obtained, certificate_number, tsc_registration_number, specialization, is_uneb_examiner, teaching_subjects, years_experience) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [
          form.staff_id, form.qualification_type, form.institution,
          form.year_obtained ? parseInt(form.year_obtained) : null,
          form.certificate_number, form.tsc_registration_number,
          form.specialization,
          form.is_uneb_examiner ? 1 : 0,
          form.teaching_subjects,
          form.years_experience ? parseInt(form.years_experience) : 0
        ]
      );

      if (!mountedRef.current) return;

      if (r && r.success) {
        setMsg('✅ Qualification added successfully!');
        setForm({
          staff_id: '', qualification_type: '', institution: '',
          year_obtained: '', certificate_number: '', tsc_registration_number: '',
          specialization: '', is_uneb_examiner: false, teaching_subjects: '', years_experience: 0
        });
        fetchQualifications();
      } else {
        setMsg('❌ ' + ((r && r.error) || 'Error adding qualification'));
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('TeacherQualifications: submit error:', e.message);
      setMsg('❌ Error: ' + e.message);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Delete qualification ─────────────────────────────────
  const handleDelete = async (id, teacherName) => {
    if (!confirm('Delete this qualification record for ' + teacherName + '?')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM teacher_qualifications WHERE id = ?", [id]
      );
      if (!mountedRef.current) return;
      setMsg('🗑️ Qualification deleted');
      fetchQualifications();
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error deleting: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Filtered qualifications (search by teacher name) ────
  const filteredQualifications = qualifications.filter(q => {
    if (!searchTerm.trim()) return true;
    const fullName = ((q.first_name || '') + ' ' + (q.last_name || '')).toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) ||
      (q.qualification_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.institution || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.tsc_registration_number || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Teacher Qualifications (EMIS)</h1>
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
            <p style={{ color: '#666' }}>Loading qualifications...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🎓 Teacher Qualifications (EMIS)</h1>

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

      {/* ─── Add Qualification Form ─────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">➕ Add Qualification</div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Teacher *</label>
                <select
                  className="form-input"
                  value={form.staff_id}
                  onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                  required
                >
                  <option value="">-- Select Teacher --</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Qualification Type *</label>
                <select
                  className="form-input"
                  value={form.qualification_type}
                  onChange={(e) => setForm({ ...form, qualification_type: e.target.value })}
                  required
                >
                  <option value="">-- Select --</option>
                  {QUALIFICATION_TYPES.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Institution *</label>
                <input
                  className="form-input"
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                  placeholder="e.g. Makerere University"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Year Obtained</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.year_obtained}
                  onChange={(e) => setForm({ ...form, year_obtained: e.target.value })}
                  placeholder="e.g. 2020"
                  min="1950"
                  max={new Date().getFullYear()}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Certificate Number</label>
                <input
                  className="form-input"
                  value={form.certificate_number}
                  onChange={(e) => setForm({ ...form, certificate_number: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">TSC Registration No.</label>
                <input
                  className="form-input"
                  value={form.tsc_registration_number}
                  onChange={(e) => setForm({ ...form, tsc_registration_number: e.target.value })}
                  placeholder="Teacher Service Commission"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input
                  className="form-input"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  placeholder="e.g. Mathematics Education"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Teaching Subjects</label>
                <input
                  className="form-input"
                  value={form.teaching_subjects}
                  onChange={(e) => setForm({ ...form, teaching_subjects: e.target.value })}
                  placeholder="e.g. Math, Physics"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Years of Experience</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.years_experience}
                  onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
                  min="0"
                  max="60"
                />
              </div>
            </div>

            {/* UNEB Examiner Checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', marginTop: '10px' }}>
              <input
                type="checkbox"
                checked={form.is_uneb_examiner}
                onChange={(e) => setForm({ ...form, is_uneb_examiner: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
              <span>🏛️ UNEB Examiner</span>
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: 'auto', padding: '10px 30px' }}
              disabled={saving}
            >
              {saving ? '⏳ Saving...' : '➕ Add Qualification'}
            </button>
          </form>
        </div>
      </div>

      {/* ─── Search ─────────────────────────────────────────── */}
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
              placeholder="Search by teacher name, qualification, institution, or TSC number..."
            />
          </div>
        </div>
      </div>

      {/* ─── Qualifications Table ────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          📋 Qualifications Records ({filteredQualifications.length})
        </div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {filteredQualifications.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '30px' }}>
              {searchTerm ? 'No qualifications matching your search' : 'No qualifications recorded yet'}
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Qualification</th>
                  <th>Institution</th>
                  <th>Year</th>
                  <th>TSC No.</th>
                  <th>Subjects</th>
                  <th>Experience</th>
                  <th>UNEB</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQualifications.map((q) => {
                  const teacherName = (q.first_name || '') + ' ' + (q.last_name || '');
                  return (
                    <tr key={q.id}>
                      <td style={{ fontWeight: '600' }}>{teacherName}</td>
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
                      <td style={{ fontSize: '12px' }}>{q.tsc_registration_number || '-'}</td>
                      <td style={{ fontSize: '12px' }}>{q.teaching_subjects || '-'}</td>
                      <td>{q.years_experience ? q.years_experience + ' yrs' : '-'}</td>
                      <td>
                        {q.is_uneb_examiner ? (
                          <span style={{ color: '#0d904f', fontWeight: '600' }}>✅</span>
                        ) : (
                          <span style={{ color: '#999' }}>—</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(q.id, teacherName)}
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
            </table>
          )}
        </div>
      </div>
    </div>
  );
}