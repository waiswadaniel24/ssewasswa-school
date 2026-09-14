// FileName: src/pages/ECD.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: ECD (Early Childhood Development) center — enrollment, milestones, capacity

import React, { useState, useEffect, useCallback, useRef } from 'react';

const AGE_GROUPS = [
  { label: '3-4 Years (Baby Class)', minAge: 3, maxAge: 4 },
  { label: '4-5 Years (Middle Class)', minAge: 4, maxAge: 5 },
  { label: '5-6 Years (Top Class)', minAge: 5, maxAge: 6 }
];


function calculateAge(dobStr) {
  if (!dobStr || typeof dobStr !== 'string') return 0;
  try {
    var dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return 0;
    var now = new Date();
    var ageMs = now.getTime() - dob.getTime();
    return Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
  } catch (e) {
    return 0;
  }
}

export default function ECD() {
  // ─── State variables ──────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selClass, setSelClass] = useState('');

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [tab, setTab] = useState('enrollment');

  // ─── Refs ───────────────────────────────────────────────
  const mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Load classes on mount ────────────────────────────────
  useEffect(function () {
    var cancelled = false;

    const loadClasses = async function () {
      if (!window.electronAPI || !window.electronAPI.queryDatabase) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      try {
        var r = await window.electronAPI.queryDatabase(
          "SELECT id, name, level FROM classes WHERE level IN ('Nursery', 'Primary') ORDER BY name"
        );
        if (!cancelled && mountedRef.current) {
          if (r && r.success && Array.isArray(r.data)) {
            setClasses(r.data);

            // Auto-select first nursery class
            var nurseryClass = r.data.find(function (c) {
              return c && c.level === 'Nursery';
            });
            if (nurseryClass) {
              setSelClass(String(nurseryClass.id));
            }
          }
        }
      } catch (e) {
        if (!cancelled) return;
        console.error('ECD: load classes error:', (e && e.message) ? e.message : 'Unknown');
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    };

    loadClasses();
    return function () { cancelled = true; };
  }, []);

  // ─── Load students when class changes ─────────────────────
  const loadStudents = useCallback(async function () {
    if (!selClass || !window.electronAPI || !window.electronAPI.queryDatabase) {
      setStudents([]);
      return;
    }

    setTableLoading(true);

    try {
      var r = await window.electronAPI.queryDatabase(
        "SELECT id, first_name, last_name, other_name, gender, date_of_birth, admission_number, guardian_name, guardian_phone FROM students WHERE class_id = ? AND status = 'Active' ORDER BY first_name",
        [selClass]
      );
      if (!mountedRef.current) return;

      if (r && r.success && Array.isArray(r.data)) {
        // Calculate age for each student
        var studentsWithAge = r.data.map(function (s) {
          var age = calculateAge((s && s.date_of_birth) ? s.date_of_birth : '');
          return {
            ...s,
            age: age,
            ageGroup: getAgeGroup(age)
          };
        });
        setStudents(studentsWithAge);
      } else {
        setStudents([]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('ECD: load students error:', (e && e.message) ? e.message : 'Unknown');
      setStudents([]);
    } finally {
      if (mountedRef.current) setTableLoading(false);
    }
  }, [selClass]);

  useEffect(function () {
    loadStudents();
  }, [loadStudents]);

  // ─── Get age group label ──────────────────────────────────
  function getAgeGroup(age) {
    var group = AGE_GROUPS.find(function (g) {
      return age >= g.minAge && age < (g.maxAge + 1);
    });
    return group ? group.label : 'Other';
  }

  // ─── Derived values (all with null checks) ───────────────
  var boysCount = students.filter(function (s) { return s && s.gender === 'M'; }).length;
  var girlsCount = students.filter(function (s) { return s && s.gender === 'F'; }).length;
  var totalStudents = students.length;

  var ageGroupStats = { /* no-op */ };
  AGE_GROUPS.forEach(function (g) {
    var count = students.filter(function (s) {
      return s && s.ageGroup === g.label;
    }).length;
    ageGroupStats[g.label] = count;
  });

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">👶 ECD Center</h1>
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
            <p style={{ color: '#666' }}>Loading ECD data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  // ─── Tabs ────────────────────────────────────────────────
  var tabs = [
    { key: 'enrollment', label: '📋 Enrollment' },
    { key: 'milestones', label: '📊 Milestones' },
    { key: 'capacity', label: '🏫 Capacity' }
  ];

  return (
    <div className="page-container">
      <h1 className="page-title">👶 ECD Center</h1>

      {/* ─── Message ────────────────────────────────────────── */}


      {/* ─── Tabs ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '5px', marginBottom: '20px',
        borderBottom: '2px solid #dadce0', paddingBottom: '5px', flexWrap: 'wrap'
      }}>
        {tabs.map(function (t) {
          return (
            <button
              key={t.key}
              onClick={function () { setTab(t.key); }}
              style={{
                padding: '10px 20px', border: 'none',
                background: tab === t.key ? '#1a73e8' : 'transparent',
                color: tab === t.key ? 'white' : '#5f6368',
                cursor: 'pointer', borderRadius: '4px 4px 0 0',
                fontWeight: 600
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: ENROLLMENT                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'enrollment' && (
        <div>
          {/* ─── Class Selection ───────────────────────────────── */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Class</label>
              <select
                className="form-input"
                value={selClass}
                onChange={function (e) { setSelClass(e.target.value); }}
              >
                <option value="">-- Select Class --</option>
                {classes.filter(function (c) { return c && c.level === 'Nursery'; }).map(function (c) {
                  return <option key={c.id} value={String(c.id)}>{c.name}</option>;
                })}
              </select>
            </div>
            <button
              onClick={loadStudents}
              className="btn btn-primary"
              style={{ width: 'auto', padding: '10px 20px' }}
              disabled={!selClass || tableLoading}
            >
              {tableLoading ? '⏳ Loading...' : '🔄 Load Students'}
            </button>
          </div>

          {/* ─── Summary Cards ─────────────────────────────────── */}
          {students.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px', marginBottom: '20px'
            }}>
              <div style={{ background: '#e8f0fe', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>{totalStudents}</div>
                <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Enrolled</div>
              </div>
              <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d904f' }}>{boysCount}</div>
                <div style={{ fontSize: '11px', color: '#5f6368' }}>👦 Boys</div>
              </div>
              <div style={{ background: '#fce4ec', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c2185b' }}>{girlsCount}</div>
                <div style={{ fontSize: '11px', color: '#5f6368' }}>👧 Girls</div>
              </div>
              {AGE_GROUPS.map(function (g, i) {
                var count = ageGroupStats[g.label] || 0;
                return (
                  <div key={i} style={{ background: '#fff3e0', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65100' }}>{count}</div>
                    <div style={{ fontSize: '10px', color: '#5f6368' }}>{g.label}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Students Table ────────────────────────────────── */}
          {students.length > 0 && (
            <div className="card">
              <div className="card-header">📋 ECD Enrollment ({students.length})</div>
              <div className="card-body" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Student Name</th>
                      <th>Adm No</th>
                      <th>Gender</th>
                      <th>DOB</th>
                      <th>Age</th>
                      <th>Age Group</th>
                      <th>Guardian</th>
                      <th>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(function (s, i) {
                      var id = (s && s.id) ? s.id : i;
                      var firstName = (s && s.first_name) ? s.first_name : '';
                      var lastName = (s && s.last_name) ? s.last_name : '';
                      var otherName = (s && s.other_name) ? s.other_name : '';
                      var admNo = (s && s.admission_number) ? s.admission_number : '-';
                      var gender = (s && s.gender) ? s.gender : 'M';
                      var dob = (s && s.date_of_birth) ? s.date_of_birth : '-';
                      var age = (s && s.age !== undefined) ? s.age : 0;
                      var ageGroup = (s && s.ageGroup) ? s.ageGroup : '-';
                      var guardian = (s && s.guardian_name) ? s.guardian_name : '-';
                      var phone = (s && s.guardian_phone) ? s.guardian_phone : '-';

                      return (
                        <tr key={id}>
                          <td style={{ color: '#999' }}>{i + 1}</td>
                          <td style={{ fontWeight: '600' }}>
                            {firstName} {otherName ? otherName + ' ' : ''}{lastName}
                          </td>
                          <td style={{ fontSize: '12px' }}>{admNo}</td>
                          <td>{gender === 'M' ? '👦' : '👧'}</td>
                          <td style={{ fontSize: '12px' }}>{dob}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px',
                              background: '#e8f0fe', color: '#1a73e8',
                              fontSize: '12px', fontWeight: '600'
                            }}>
                              {age} yrs
                            </span>
                          </td>
                          <td style={{ fontSize: '11px' }}>{ageGroup}</td>
                          <td style={{ fontSize: '12px' }}>{guardian}</td>
                          <td style={{ fontSize: '12px' }}>{phone}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Empty states ──────────────────────────────────── */}
          {students.length === 0 && selClass && !tableLoading && (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <p style={{ fontSize: '36px', marginBottom: '10px' }}>👶</p>
                No ECD students in this class
              </div>
            </div>
          )}

          {!selClass && (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <p style={{ fontSize: '36px', marginBottom: '10px' }}>📋</p>
                Select a class above to view ECD enrollment
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: MILESTONES                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'milestones' && (
        <div className="card">
          <div className="card-header">📊 Developmental Milestones Overview</div>
          <div className="card-body">
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              ECD developmental milestones are tracked through the Nursery Management page.
              Use the table below to understand the six key developmental areas for early childhood assessment.
            </p>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Development Area</th>
                  <th>Description</th>
                  <th>Key Indicators</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: '600' }}>🏃 Physical Development</td>
                  <td style={{ fontSize: '12px' }}>Gross and fine motor skills</td>
                  <td style={{ fontSize: '12px' }}>Running, jumping, holding pencil, buttoning clothes</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600' }}>🗣️ Language & Communication</td>
                  <td style={{ fontSize: '12px' }}>Verbal and non-verbal communication</td>
                  <td style={{ fontSize: '12px' }}>Speaking in sentences, listening, following instructions</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600' }}>🧠 Cognitive Development</td>
                  <td style={{ fontSize: '12px' }}>Thinking, reasoning, problem-solving</td>
                  <td style={{ fontSize: '12px' }}>Counting, sorting, matching, recognizing shapes/colors</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600' }}>❤️ Social & Emotional</td>
                  <td style={{ fontSize: '12px' }}>Interacting with others, managing emotions</td>
                  <td style={{ fontSize: '12px' }}>Sharing, taking turns, expressing feelings, playing with peers</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600' }}>🎨 Creative & Aesthetic</td>
                  <td style={{ fontSize: '12px' }}>Art, music, imagination</td>
                  <td style={{ fontSize: '12px' }}>Drawing, singing, dancing, role-play</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '600' }}>🙏 Moral & Spiritual</td>
                  <td style={{ fontSize: '12px' }}>Values, ethics, spirituality</td>
                  <td style={{ fontSize: '12px' }}>Honesty, kindness, respect, prayer/worship</td>
                </tr>
              </tbody>
            </table>

            <div style={{
              marginTop: '20px', padding: '15px', background: '#e8f0fe',
              borderRadius: '8px', border: '1px solid #aecbfa'
            }}>
              <p style={{ margin: 0, color: '#1a73e8', fontSize: '13px' }}>
                💡 <strong>Tip:</strong> To record specific milestone assessments for individual children,
                go to the <strong>Nursery Management</strong> page, select a student, and use the
                Assessments tab. Each assessment covers a learning area with a rating (Excellent, Good,
                Satisfactory, Needs Improvement, Not Yet) and comments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: CAPACITY                                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'capacity' && (
        <div className="card">
          <div className="card-header">🏫 ECD Center Capacity</div>
          <div className="card-body">
            {/* ─── Class capacity table ──────────────────────────── */}
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Level</th>
                  <th>Capacity</th>
                  <th>Enrolled</th>
                  <th>Available</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {classes.filter(function (c) { return c && c.level === 'Nursery'; }).map(function (c, i) {
                  var classId = (c && c.id) ? c.id : i;
                  var className = (c && c.name) ? c.name : '-';
                  var level = (c && c.level) ? c.level : '-';

                  // Count enrolled students in this class
                  var enrolled = students.filter(function (s) {
                    return s && String(s.class_id) === String(classId);
                  }).length;

                  var capacity = 30; // Default capacity for ECD
                  var available = Math.max(0, capacity - enrolled);
                  var utilization = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;
                  var isFull = enrolled >= capacity;
                  var isNearFull = !isFull && utilization >= 80;

                  return (
                    <tr key={classId}>
                      <td style={{ fontWeight: '600' }}>{className}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: '#e8f0fe', color: '#1a73e8',
                          fontSize: '11px'
                        }}>
                          {level}
                        </span>
                      </td>
                      <td>{capacity}</td>
                      <td style={{ fontWeight: '600' }}>{enrolled}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: isFull ? '#ffebee' : (isNearFull ? '#fff3e0' : '#e8f5e9'),
                          color: isFull ? '#d32f2f' : (isNearFull ? '#e65100' : '#0d904f'),
                          fontSize: '12px', fontWeight: '600'
                        }}>
                          {available} {isFull ? '⚠️' : (isNearFull ? '⚠️' : '✅')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '80px', height: '8px',
                            background: '#e0e0e0', borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: Math.min(100, utilization) + '%',
                              height: '100%',
                              background: isFull ? '#d32f2f' : (isNearFull ? '#e65100' : '#0d904f'),
                              borderRadius: '4px',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: isFull ? '#d32f2f' : (isNearFull ? '#e65100' : '#0d904f') }}>
                            {utilization}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {classes.filter(function (c) { return c && c.level === 'Nursery'; }).length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                      No nursery classes configured. Add classes with level Nursery in Academics.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* ─── Age distribution ──────────────────────────────── */}
            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>📊 Age Distribution</h3>
            {students.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                No students loaded. Select a class in the Enrollment tab.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {AGE_GROUPS.map(function (g, i) {
                  var count = ageGroupStats[g.label] || 0;
                  var pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;

                  return (
                    <div key={i} style={{
                      flex: 1, minWidth: '200px',
                      background: '#f8f9fa', padding: '15px',
                      borderRadius: '8px', border: '1px solid #e0e0e0'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                        {g.label}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>
                        {count} <span style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>({pct}%)</span>
                      </div>
                      <div style={{
                        marginTop: '8px', width: '100%', height: '6px',
                        background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden'
                      }}>
                        <div style={{
                          width: pct + '%', height: '100%',
                          background: '#1a73e8', borderRadius: '3px'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Info note ──────────────────────────────────────── */}
            <div style={{
              marginTop: '20px', padding: '12px 16px',
              background: '#e8f0fe', borderRadius: '8px',
              border: '1px solid #aecbfa'
            }}>
              <p style={{ margin: 0, color: '#1a73e8', fontSize: '13px' }}>
                💡 <strong>EMIS Note:</strong> ECD center capacity is reported to the Ministry of Education
                through the EMIS census. The recommended teacher-to-child ratio for ECD is 1:20 for
                3-4 year olds and 1:25 for 5-6 year olds.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
