// FileName: src/pages/Timetable.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useRef } from 'react';

export default function Timetable() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [slots, setSlots] = useState({ /* no-op */ });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const mountedRef = useRef(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [
    '08:00-08:40', '08:40-09:20', '09:20-10:00', '10:00-10:40',
    '10:40-11:20', '11:20-12:00', '12:00-13:30', '13:30-14:10',
    '14:10-14:50', '14:50-15:30', '15:30-16:10'
  ];

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load classes, subjects, staff on mount ────────────────
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [cRes, sRes, stRes] = await Promise.all([
          window.electronAPI.queryDatabase("SELECT id, name FROM classes ORDER BY name"),
          window.electronAPI.queryDatabase("SELECT id, name FROM subjects ORDER BY name"),
          window.electronAPI.queryDatabase("SELECT id, first_name, last_name FROM staff WHERE status = 'Active' ORDER BY first_name")
        ]);

        if (!mountedRef.current) return;

        if (cRes && cRes.success) setClasses(cRes.data || []);
        if (sRes && sRes.success) setSubjects(sRes.data || []);
        if (stRes && stRes.success) setStaff(stRes.data || []);
      } catch (e) {
        if (!mountedRef.current) return;
        console.error('Timetable: load error:', e.message);
        setMsg('❌ Error loading data: ' + e.message);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    loadAll();
  }, []);

  // ─── Load existing timetable entries when class is selected ─
  const loadTimetable = async () => {
    if (!selClass) {
      setSlots({ /* no-op */ });
      return;
    }

    try {
      const r = await window.electronAPI.queryDatabase(
        "SELECT day, period, subject_id, teacher_id FROM timetable WHERE class_id = ?",
        [selClass]
      );
      if (!mountedRef.current) return;

      const loaded = { /* no-op */ };
      if (r && r.success) {
        r.data.forEach(row => {
          const key = row.day + '|' + row.period;
          loaded[key] = {
            subject: row.subject_id || '',
            teacher: row.teacher_id || ''
          };
        });
      }
      setSlots(loaded);
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Timetable: load timetable error:', e.message);
    }
  };

  // ─── Load timetable when class changes ─────────────────────
  useEffect(() => {
    loadTimetable();
  }, [selClass]);

  // ─── Update a slot (local state) ──────────────────────────
  const updateSlot = (day, period, field, value) => {
    const key = day + '|' + period;
    setSlots(prev => ({
      ...prev,
      [key]: { ...(prev[key] || { /* no-op */ }), [field]: value }
    }));
  };

  // ─── Save timetable to database ───────────────────────────
  const handleSave = async () => {
    if (!selClass) {
      setMsg('⚠️ Please select a class first');
      return;
    }

    const entries = Object.entries(slots);
    if (entries.length === 0) {
      setMsg('⚠️ No slots filled. Add subjects before saving.');
      return;
    }

    // Filter out empty slots (both subject and teacher empty)
    // FIXED: Replaced `_` with empty space to avoid "unused var" linter error
    const filled = entries.filter(([, val]) => val.subject || val.teacher);

    if (filled.length === 0) {
      setMsg('⚠️ No subjects or teachers assigned. Fill at least one slot.');
      return;
    }

    setSaving(true);
    setMsg('⏳ Saving ' + filled.length + ' slots...');

    try {
      for (const [key, val] of filled) {
        const [day, period] = key.split('|');
        await window.electronAPI.queryDatabase(
          "INSERT OR REPLACE INTO timetable (class_id, day, period, subject_id, teacher_id) VALUES (?, ?, ?, ?, ?)",
          [
            selClass,
            day,
            period,
            val.subject || null,
            val.teacher || null
          ]
        );
      }

      if (!mountedRef.current) return;
      setMsg('✅ Timetable saved! ' + filled.length + ' slots for ' + (classes.find(c => String(c.id) === String(selClass)) ? classes.find(c => String(c.id) === String(selClass)).name : '') + '.');
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Timetable: save error:', e.message);
      setMsg('❌ Error saving: ' + e.message);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 4000);
  };

  // ─── Clear all slots for this class ───────────────────────
  const handleClear = async () => {
    if (!selClass) return;
    if (!confirm('Clear entire timetable for this class?\n\nThis will delete ALL timetable entries for this class.')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM timetable WHERE class_id = ?", [selClass]
      );
      if (!mountedRef.current) return;
      setSlots({ /* no-op */ });
      setMsg('🗑️ Timetable cleared');
    } catch (e) {
      if (!mountedRef.current) return;
      setMsg('❌ Error clearing: ' + e.message);
    }

    setTimeout(() => { if (mountedRef.current) setMsg(''); }, 3000);
  };

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">📅 Timetable</h1>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{
              // FIXED: Missing closing quote on '40px'
              width: '40px', height: '40px',
              border: '4px solid #e0e0e0',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#666' }}>Loading timetable data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📅 Timetable</h1>

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

      {/* ─── Class Selector ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, maxWidth: '300px', marginBottom: 0 }}>
          <label className="form-label">Class</label>
          <select
            className="form-input"
            value={selClass}
            onChange={(e) => setSelClass(e.target.value)}
          >
            <option value="">-- Select Class --</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {selClass && (
          <button
            onClick={handleClear}
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '10px 16px', color: '#d32f2f', border: '1px solid #ef9a9a' }}
          >
            🗑️ Clear All
          </button>
        )}
      </div>

      {/* ─── Timetable Grid ──────────────────────────────────── */}
      {selClass && (
        <div className="card">
          <div className="card-body" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '80px', textAlign: 'left' }}>Day</th>
                  {periods.map(p => (
                    <th key={p} style={{ fontSize: '10px', minWidth: '110px', textAlign: 'center' }}>
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day}>
                    <td style={{
                      fontWeight: 'bold',
                      background: '#f8f9fa',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}>
                      {day}
                    </td>
                    {periods.map(period => {
                      const key = day + '|' + period;
                      const slot = slots[key] || { /* no-op */ };
                      return (
                        <td key={key} style={{ padding: '4px', verticalAlign: 'top' }}>
                          {/* Subject select */}
                          <select
                            value={slot.subject || ''}
                            onChange={(e) => updateSlot(day, period, 'subject', e.target.value)}
                            style={{
                              width: '100%',
                              fontSize: '10px',
                              padding: '3px 4px',
                              border: '1px solid ' + (slot.subject ? '#1a73e8' : '#dadce0'),
                              borderRadius: '4px',
                              background: slot.subject ? '#e8f0fe' : 'white',
                              color: '#333',
                              marginBottom: '2px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">—</option>
                            {subjects.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          {/* Teacher select */}
                          <select
                            value={slot.teacher || ''}
                            onChange={(e) => updateSlot(day, period, 'teacher', e.target.value)}
                            style={{
                              width: '100%',
                              fontSize: '10px',
                              padding: '3px 4px',
                              border: '1px solid ' + (slot.teacher ? '#0d904f' : '#dadce0'),
                              borderRadius: '4px',
                              background: slot.teacher ? '#e8f5e9' : 'white',
                              color: '#333',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">—</option>
                            {staff.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.first_name} {t.last_name}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Save Button ─────────────────────────────────────── */}
      {selClass && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '15px' }}>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '15px' }}
            disabled={saving}
          >
            {saving ? '⏳ Saving...' : '💾 Save Timetable'}
          </button>
        </div>
      )}

      {/* ─── Legend ──────────────────────────────────────────── */}
      {selClass && (
        <div style={{
          marginTop: '15px', padding: '12px 16px',
          background: '#f8f9fa', borderRadius: '8px',
          fontSize: '12px', color: '#666',
          display: 'flex', gap: '20px', flexWrap: 'wrap'
        }}>
          <span>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#e8f0fe', border: '1px solid #1a73e8', borderRadius: '2px', marginRight: '4px' }}></span>
            Subject assigned
          </span>
          <span>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#e8f5e9', border: '1px solid #0d904f', borderRadius: '2px', marginRight: '4px' }}></span>
            Teacher assigned
          </span>
          <span>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'white', border: '1px solid #dadce0', borderRadius: '2px', marginRight: '4px' }}></span>
            Empty slot
          </span>
        </div>
      )}

      {/* ─── Empty state ────────────────────────────────────── */}
      {!selClass && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p style={{ fontSize: '36px', marginBottom: '10px' }}>📅</p>
            Select a class above to view or edit its timetable
          </div>
        </div>
      )}
    </div>
  );
}
