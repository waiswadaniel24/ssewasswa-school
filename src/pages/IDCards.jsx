// FileName: src/pages/IDCards.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useRef } from 'react';
import { SchoolDocument } from '../utils/DocumentEngine.js';

export default function IDCards() {
  // ─── State variables ──────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [msg, setMsg] = useState('');
  const [schoolData, setSchoolData] = useState({ /* no-op */ });

  // ─── Refs ───────────────────────────────────────────────
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load data on mount ────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      try {
        // Load school branding
        const branding = { /* no-op */ };
        try {
          const stRes = await window.electronAPI.queryDatabase(
            "SELECT key, value FROM system_settings WHERE key IN ('school_name','school_motto','school_slogan','school_scripture','school_logo','school_badge')"
          );
          if (mountedRef.current && stRes && stRes.success && stRes.data) {
            stRes.data.forEach((row) => {
              if (row && row.key) branding[row.key] = row.value;
            });
          }
        } catch (e) { /* ignore branding query error */ }

        // Load logo
        if (branding.school_logo) {
          try {
            const lp = await window.electronAPI.getPhoto(branding.school_logo);
            if (mountedRef.current && lp && lp.success && lp.data) branding.logo = lp.data;
          } catch (e) { /* ignore logo load error */ }
        }

        // Load badge
        if (branding.school_badge) {
          try {
            const bp = await window.electronAPI.getPhoto(branding.school_badge);
            if (mountedRef.current && bp && bp.success && bp.data) branding.badge = bp.data;
          } catch (e) { /* ignore badge load error */ }
        }

        if (mountedRef.current) {
          setSchoolData(branding);
        }

        // Load students
        try {
          const sRes = await window.electronAPI.queryDatabase(
            "SELECT s.id, s.first_name, s.last_name, s.admission_number, s.gender, s.photo_path, c.name as class_name FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.status = 'Active' ORDER BY s.first_name"
          );
          if (mountedRef.current && sRes && sRes.success) setStudents(sRes.data || []);
        } catch (e) { /* ignore students load error */ }

        // Load staff
        try {
          const staffRes = await window.electronAPI.queryDatabase(
            "SELECT id, first_name, last_name, staff_id_number, role, phone, photo_path FROM staff WHERE status = 'Active' ORDER BY first_name"
          );
          if (mountedRef.current && staffRes && staffRes.success) setStaff(staffRes.data || []);
        } catch (e) { /* ignore staff load error */ }

      } catch (e) {
        if (mountedRef.current) {
          console.error('IDCards: load error:', (e && e.message) ? e.message : 'Unknown');
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    loadAll();
  }, []);

  // ─── Generate single ID card ──────────────────────────────
  const generateID = async (person, type) => {
    if (!person) return false;

    try {
      // Load photo if exists
      let photo = null;
      if (person.photo_path) {
        try {
          const pp = await window.electronAPI.getPhoto(person.photo_path);
          if (pp && pp.success && pp.data) photo = pp.data;
        } catch (e) { /* ignore photo load error */ }
      }

      // Use SchoolDocument for consistent branding
      const doc = new SchoolDocument(schoolData);
      doc.idCard({
        person: person,
        type: type,
        photo: photo,
        boundary: type === 'staff' ? 'secondary' : 'primary'
      });

      return true;
    } catch (e) {
      console.error('IDCards: generate error:', (e && e.message) ? e.message : 'Unknown');
      return false;
    }
  };

  // ─── Batch print all ───────────────────────────────────────
  const handleBatchPrint = async () => {
    const people = (activeTab === 'students') ? students : staff;
    const type = (activeTab === 'students') ? 'student' : 'staff';

    if (people.length === 0) {
      setMsg(`⚠️ No ${activeTab === 'students' ? 'students' : 'staff'} to generate IDs for`);
      return;
    }

    if (!confirm(`Generate ${people.length} ID cards? Each will be downloaded as a separate PDF.`)) return;

    setGeneratingAll(true);
    setMsg(`⏳ Generating ${people.length} ID cards...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      if (!p) continue;

      setMsg(`⏳ Generating ${i + 1} of ${people.length}: ${((p.first_name || '') + ' ' + (p.last_name || ''))}`);

      const success = await generateID(p, type);
      if (success) successCount++;
      else failCount++;

      // Delay between downloads to prevent browser blocking
      if (i < people.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    if (!mountedRef.current) return;

    setGeneratingAll(false);
    setMsg(`✅ Generated ${successCount} ID cards${failCount > 0 ? ` (${failCount} failed)` : ''}`);
    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 5000);
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">🪪 ID Cards</h1>
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
            <p style={{ color: '#666' }}>Loading ID card data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🪪 ID Cards</h1>

      {msg && (
        <p style={{
          color: (msg.indexOf('❌') >= 0) ? '#c62828' :
            (msg.indexOf('⚠️') >= 0) ? '#e65100' :
              (msg.indexOf('⏳') >= 0) ? '#1a73e8' : '#0d904f',
          marginBottom: '15px', padding: '10px 14px',
          background: (msg.indexOf('❌') >= 0) ? '#ffebee' :
            (msg.indexOf('⚠️') >= 0) ? '#fff3e0' :
              (msg.indexOf('⏳') >= 0) ? '#e8f0fe' : '#e8f5e9',
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Tabs + Batch Print ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #1a73e8', paddingBottom: '5px' }}>
        <button
          onClick={() => setActiveTab('students')}
          style={{
            padding: '8px 16px', border: 'none',
            background: activeTab === 'students' ? '#1a73e8' : 'transparent',
            color: activeTab === 'students' ? 'white' : '#5f6368',
            cursor: 'pointer', borderRadius: '4px', fontWeight: '600'
          }}
        >
          🎓 Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '8px 16px', border: 'none',
            background: activeTab === 'staff' ? '#1a73e8' : 'transparent',
            color: activeTab === 'staff' ? 'white' : '#5f6368',
            cursor: 'pointer', borderRadius: '4px', fontWeight: '600'
          }}
        >
          👨‍🏫 Staff ({staff.length})
        </button>
        <button
          onClick={handleBatchPrint}
          className="btn btn-secondary"
          style={{ marginLeft: 'auto', padding: '8px 20px' }}
          disabled={generatingAll || (activeTab === 'students' ? students.length : staff.length) === 0}
        >
          {generatingAll ? '⏳ Generating...' : '🖨️ Batch Print All'}
        </button>
      </div>

      {/* ─── Students Table ──────────────────────────────────── */}
      {activeTab === 'students' && (
        <div className="card">
          <div className="card-body" style={{ overflowX: 'auto' }}>
            {students.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No active students found</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Adm No</th><th>Class</th><th>ID Card</th></tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const id = (s && s.id) ? s.id : i;
                    const name = ((s && s.first_name) ? s.first_name : '') + ' ' + ((s && s.last_name) ? s.last_name : '');
                    const adm = (s && s.admission_number) ? s.admission_number : '-';
                    const cls = (s && s.class_name) ? s.class_name : '-';

                    return (
                      <tr key={id}>
                        <td style={{ fontWeight: '600' }}>{name}</td>
                        <td style={{ fontSize: '12px' }}>{adm}</td>
                        <td style={{ fontSize: '12px' }}>{cls}</td>
                        <td>
                          <button
                            onClick={() => generateID(s, 'student')}
                            className="btn btn-primary"
                            style={{ padding: '5px 12px', fontSize: '12px' }}
                            disabled={generatingAll}
                          >
                            🖨️ Print ID
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
      )}

      {/* ─── Staff Table ────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div className="card">
          <div className="card-body" style={{ overflowX: 'auto' }}>
            {staff.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No active staff found</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Staff ID</th><th>Role</th><th>ID Card</th></tr>
                </thead>
                <tbody>
                  {staff.map((s, i) => {
                    const id = (s && s.id) ? s.id : i;
                    const name = ((s && s.first_name) ? s.first_name : '') + ' ' + ((s && s.last_name) ? s.last_name : '');
                    const sid = (s && s.staff_id_number) ? s.staff_id_number : '-';
                    const role = (s && s.role) ? s.role : '-';

                    return (
                      <tr key={id}>
                        <td style={{ fontWeight: '600' }}>{name}</td>
                        <td style={{ fontSize: '12px' }}>{sid}</td>
                        <td style={{ fontSize: '12px' }}>{role}</td>
                        <td>
                          <button
                            onClick={() => generateID(s, 'staff')}
                            className="btn btn-primary"
                            style={{ padding: '5px 12px', fontSize: '12px' }}
                            disabled={generatingAll}
                          >
                            🖨️ Print ID
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
      )}
    </div>
  );
}
