// FileName: src/pages/SpecialNeeds.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Special needs & OVC — disability tracking, support, orphan/vulnerable records

import React, { useState, useEffect, useCallback, useRef } from 'react';

const DISABILITIES = [
  'Visual - Blind', 'Visual - Low Vision',
  'Hearing - Deaf', 'Hearing - Hard of Hearing',
  'Physical Disability', 'Intellectual Disability',
  'Autism Spectrum', 'Multiple Disabilities',
  'Learning Disability', 'Albinism',
  'Speech/Language', 'Other'
];

const SEVERITY = ['Mild', 'Moderate', 'Severe', 'Profound'];

const OVC_CATEGORIES = [
  'Double Orphan', 'Single Orphan', 'Vulnerable',
  'Refugee', 'Internally Displaced', 'Child Mother'
];

const SUPPORT_TYPES = [
  'Assistive Devices', 'Sign Language', 'Resource Room',
  'Individual Education Plan (IEP)', 'Parent Support Group',
  'Government Support', 'NGO Support', 'Faith-based Support', 'Other'
];

export default function SpecialNeeds() {
  // ─── State variables ──────────────────────────────────────
  const [tab, setTab] = useState('sn');
  const [snRecords, setSnRecords] = useState([]);
  const [ovcRecords, setOvcRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [snForm, setSnForm] = useState({
    student_id: '', disability_type: '', severity: 'Mild',
    assistive_device: '', receiving_support: false,
    support_type: '', remarks: ''
  });

  const [ovcForm, setOvcForm] = useState({
    student_id: '', ovc_category: 'Single Orphan',
    is_receiving_support: false, support_type: '', support_source: ''
  });

  const mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Fetch all data ────────────────────────────────────────
  const fetchData = useCallback(async function () {
    if (!window.electronAPI) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    try {
      // Load special needs records
      var snRes = null;
      try {
        snRes = await window.electronAPI.emisGetSpecialNeeds();
      } catch (e) { /* ignore */ }
      if (!mountedRef.current) return;
      if (snRes && snRes.success) {
        setSnRecords(snRes.data || []);
      }

      // Load OVC records
      var ovcRes = null;
      try {
        ovcRes = await window.electronAPI.emisGetOVC();
      } catch (e) { /* ignore */ }
      if (!mountedRef.current) return;
      if (ovcRes && ovcRes.success) {
        setOvcRecords(ovcRes.data || []);
      }

      // Load active students
      try {
        var sRes = await window.electronAPI.queryDatabase(
          "SELECT id, first_name, last_name, admission_number FROM students WHERE status = 'Active' ORDER BY first_name"
        );
        if (!mountedRef.current) return;
        if (sRes && sRes.success) {
          setStudents(sRes.data || []);
        }
      } catch (e) { /* ignore */ }

    } catch (e) {
      if (!mountedRef.current) return;
      console.error('SpecialNeeds: fetch error:', (e && e.message) ? e.message : 'Unknown');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(function () {
    fetchData();
  }, [fetchData]);

  // ─── Save special needs record ───────────────────────────
  const handleSnSubmit = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    setMsg('');

    if (!snForm.student_id) {
      setMsg('⚠️ Please select a student');
      return;
    }
    if (!snForm.disability_type) {
      setMsg('⚠️ Please select a disability type');
      return;
    }

    setSaving(true);

    try {
      var r = await window.electronAPI.emisSaveSpecialNeed(snForm);
      if (!mountedRef.current) return;

      if (r && r.success) {
        setMsg('✅ Special need recorded!');
        setSnForm({
          student_id: '', disability_type: '', severity: 'Mild',
          assistive_device: '', receiving_support: false,
          support_type: '', remarks: ''
        });
        fetchData();
      } else {
        var errMsg = (r && r.error) ? r.error : 'Failed to save';
        setMsg('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      var errCatch = (e && e.message) ? e.message : 'Unknown error';
      console.error('SpecialNeeds: SN submit error:', errCatch);
      setMsg('❌ Error: ' + errCatch);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 4000);
  };

  // ─── Save OVC record ──────────────────────────────────────
  const handleOvcSubmit = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    setMsg('');

    if (!ovcForm.student_id) {
      setMsg('⚠️ Please select a student');
      return;
    }
    if (!ovcForm.ovc_category) {
      setMsg('⚠️ Please select an OVC category');
      return;
    }

    setSaving(true);

    try {
      var r = await window.electronAPI.emisSaveOVC(ovcForm);
      if (!mountedRef.current) return;

      if (r && r.success) {
        setMsg('✅ OVC data recorded!');
        setOvcForm({
          student_id: '', ovc_category: 'Single Orphan',
          is_receiving_support: false, support_type: '', support_source: ''
        });
        fetchData();
      } else {
        var errMsg = (r && r.error) ? r.error : 'Failed to save';
        setMsg('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      var errCatch = (e && e.message) ? e.message : 'Unknown error';
      console.error('SpecialNeeds: OVC submit error:', errCatch);
      setMsg('❌ Error: ' + errCatch);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 4000);
  };

  // ─── Delete record ────────────────────────────────────────
  const deleteRecord = async function (type, id, studentName) {
    if (!confirm('Delete this ' + (type === 'sn' ? 'special needs' : 'OVC') + ' record for ' + (studentName || 'Unknown') + '?')) return;

    // Use parameterized queries (not template literal for table name)
    try {
      if (type === 'sn') {
        await window.electronAPI.queryDatabase(
          "DELETE FROM special_needs_learners WHERE id = ?", [id]
        );
      } else {
        await window.electronAPI.queryDatabase(
          "DELETE FROM ovc_data WHERE id = ?", [id]
        );
      }

      if (!mountedRef.current) return;
      setMsg('🗑️ Record deleted');
      fetchData();
    } catch (e) {
      if (!mountedRef.current) return;
      var errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error deleting: ' + errMsg);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 3000);
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">♿ Special Needs & OVC</h1>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '36px', height: '36px',
              border: '3px solid #e0e0e0',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#666' }}>Loading records...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">♿ Special Needs & OVC (Orphans & Vulnerable Children)</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: (msg.indexOf('❌') >= 0) ? '#c62828' :
            (msg.indexOf('⚠️') >= 0) ? '#e65100' : '#0d904f',
          marginBottom: '15px', padding: '10px 14px',
          background: (msg.indexOf('❌') >= 0) ? '#ffebee' :
            (msg.indexOf('⚠️') >= 0) ? '#fff3e0' : '#e8f5e9',
          borderRadius: '6px', fontWeight: 'bold'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Tabs ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #dadce0', paddingBottom: '5px' }}>
        <button
          onClick={function () { setTab('sn'); }}
          style={{
            padding: '10px 20px', border: 'none',
            background: tab === 'sn' ? '#1a73e8' : 'transparent',
            color: tab === 'sn' ? 'white' : '#5f6368',
            cursor: 'pointer', borderRadius: '4px', fontWeight: '600'
          }}
        >
          ♿ Special Needs ({snRecords.length})
        </button>
        <button
          onClick={function () { setTab('ovc'); }}
          style={{
            padding: '10px 20px', border: 'none',
            background: tab === 'ovc' ? '#1a73e8' : 'transparent',
            color: tab === 'ovc' ? 'white' : '#5f6368',
            cursor: 'pointer', borderRadius: '4px', fontWeight: '600'
          }}
        >
          👨‍👩‍👧 OVC Data ({ovcRecords.length})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: SPECIAL NEEDS                                     */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'sn' && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* ─── Form ───────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: '350px' }} className="card">
            <div className="card-header">➕ Record Special Need</div>
            <div className="card-body">
              <form onSubmit={handleSnSubmit}>
                <div className="form-group">
                  <label className="form-label">Student *</label>
                  <select className="form-input" value={snForm.student_id}
                    onChange={function (e) { setSnForm({ ...snForm, student_id: e.target.value }); }}
                    required>
                    <option value="">Select Student</option>
                    {students.map(function (s) {
                      return (
                        <option key={s.id} value={s.id}>
                          {(s.first_name || '')} {(s.last_name || '')} ({s.admission_number || 'No Adm'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Disability Type *</label>
                  <select className="form-input" value={snForm.disability_type}
                    onChange={function (e) { setSnForm({ ...snForm, disability_type: e.target.value }); }}
                    required>
                    <option value="">Select Disability</option>
                    {DISABILITIES.map(function (d) { return <option key={d} value={d}>{d}</option>; })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Severity</label>
                  <select className="form-input" value={snForm.severity}
                    onChange={function (e) { setSnForm({ ...snForm, severity: e.target.value }); }}>
                    {SEVERITY.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assistive Device</label>
                  <input className="form-input" value={snForm.assistive_device}
                    onChange={function (e) { setSnForm({ ...snForm, assistive_device: e.target.value }); }}
                    placeholder="e.g. Wheelchair, Braille, Hearing Aid" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <input type="checkbox" checked={snForm.receiving_support}
                    onChange={function (e) { setSnForm({ ...snForm, receiving_support: e.target.checked }); }}
                    style={{ width: '20px', height: '20px' }} />
                  <label>Currently Receiving Support</label>
                </div>

                {snForm.receiving_support && (
                  <div className="form-group">
                    <label className="form-label">Support Type</label>
                    <select className="form-input" value={snForm.support_type}
                      onChange={function (e) { setSnForm({ ...snForm, support_type: e.target.value }); }}>
                      <option value="">Select</option>
                      {SUPPORT_TYPES.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea className="form-input" rows="2" value={snForm.remarks}
                    onChange={function (e) { setSnForm({ ...snForm, remarks: e.target.value }); }} />
                </div>

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save Record'}
                </button>
              </form>
            </div>
          </div>

          {/* ─── Records Table ───────────────────────────────── */}
          <div style={{ flex: 2, minWidth: '400px' }} className="card">
            <div className="card-header">📋 Special Needs Records ({snRecords.length})</div>
            <div className="card-body" style={{ overflowX: 'auto' }}>
              {snRecords.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No records yet</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Disability</th>
                      <th>Severity</th>
                      <th>Support</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snRecords.map(function (r, i) {
                      var id = (r && r.id) ? r.id : i;
                      var firstName = (r && r.first_name) ? r.first_name : '';
                      var lastName = (r && r.last_name) ? r.last_name : '';
                      var studentName = (firstName + ' ' + lastName).trim() || 'Unknown';
                      var disability = (r && r.disability_type) ? r.disability_type : '-';
                      var severity = (r && r.severity) ? r.severity : 'Mild';

                      var sevBg = severity === 'Mild' ? '#e8f5e9' : (severity === 'Moderate' ? '#fff3e0' : '#ffebee');
                      var sevColor = severity === 'Mild' ? '#0d904f' : (severity === 'Moderate' ? '#e65100' : '#d32f2f');

                      var support = (r && r.receiving_support) ? ('✅ ' + (r.support_type || 'Yes')) : '❌ No';

                      return (
                        <tr key={id}>
                          <td>{studentName}</td>
                          <td>{disability}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px',
                              background: sevBg, color: sevColor,
                              fontSize: '12px', fontWeight: '600'
                            }}>{severity}</span>
                          </td>
                          <td style={{ fontSize: '12px' }}>{support}</td>
                          <td>
                            <button onClick={function () { deleteRecord('sn', id, studentName); }}
                              style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
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
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: OVC DATA                                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'ovc' && (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* ─── Form ───────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: '350px' }} className="card">
            <div className="card-header">➕ Record OVC Data</div>
            <div className="card-body">
              <form onSubmit={handleOvcSubmit}>
                <div className="form-group">
                  <label className="form-label">Student *</label>
                  <select className="form-input" value={ovcForm.student_id}
                    onChange={function (e) { setOvcForm({ ...ovcForm, student_id: e.target.value }); }}
                    required>
                    <option value="">Select Student</option>
                    {students.map(function (s) {
                      return (
                        <option key={s.id} value={s.id}>
                          {(s.first_name || '')} {(s.last_name || '')} ({s.admission_number || 'No Adm'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">OVC Category *</label>
                  <select className="form-input" value={ovcForm.ovc_category}
                    onChange={function (e) { setOvcForm({ ...ovcForm, ovc_category: e.target.value }); }}
                    required>
                    {OVC_CATEGORIES.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <input type="checkbox" checked={ovcForm.is_receiving_support}
                    onChange={function (e) { setOvcForm({ ...ovcForm, is_receiving_support: e.target.checked }); }}
                    style={{ width: '20px', height: '20px' }} />
                  <label>Currently Receiving Support</label>
                </div>

                {ovcForm.is_receiving_support && (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Support Type</label>
                      <input className="form-input" value={ovcForm.support_type}
                        onChange={function (e) { setOvcForm({ ...ovcForm, support_type: e.target.value }); }}
                        placeholder="e.g. Bursary, Food, Uniform" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Support Source</label>
                      <input className="form-input" value={ovcForm.support_source}
                        onChange={function (e) { setOvcForm({ ...ovcForm, support_source: e.target.value }); }}
                        placeholder="e.g. UNICEF, Government, Church" />
                    </div>
                  </div>
                )}

                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save OVC Record'}
                </button>
              </form>
            </div>
          </div>

          {/* ─── Records Table ───────────────────────────────── */}
          <div style={{ flex: 2, minWidth: '400px' }} className="card">
            <div className="card-header">📋 OVC Records ({ovcRecords.length})</div>
            <div className="card-body" style={{ overflowX: 'auto' }}>
              {ovcRecords.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No OVC records yet</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Category</th>
                      <th>Support</th>
                      <th>Source</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ovcRecords.map(function (r, i) {
                      var id = (r && r.id) ? r.id : i;
                      var firstName = (r && r.first_name) ? r.first_name : '';
                      var lastName = (r && r.last_name) ? r.last_name : '';
                      var studentName = (firstName + ' ' + lastName).trim() || 'Unknown';
                      var category = (r && r.ovc_category) ? r.ovc_category : '-';
                      var support = (r && r.is_receiving_support) ? '✅ Yes' : '❌ No';
                      var source = (r && r.support_source) ? r.support_source : '-';

                      return (
                        <tr key={id}>
                          <td>{studentName}</td>
                          <td>{category}</td>
                          <td style={{ fontSize: '12px' }}>{support}</td>
                          <td style={{ fontSize: '12px' }}>{source}</td>
                          <td>
                            <button onClick={function () { deleteRecord('ovc', id, studentName); }}
                              style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
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
      )}
    </div>
  );
}