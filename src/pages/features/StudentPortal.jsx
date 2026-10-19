// Ssewasswa Comforts — Student Portal
// Students look up their profile by admission number and view
// attendance, marks, assignments, timetable, announcements,
// library, fees and ID card — all client-side with localStorage.

import React, { useState, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'erp_student_portal_v1';
const PURPLE = '#7b1fa2';
const PURPLE_LIGHT = '#f3e5f5';
const PURPLE_DARK = '#4a148c';

// ---------- Sample seed student ----------
function seedStudent() {
  return {
    admissionNo: 'SCT-2026-001',
    name: 'Ssewasswa Junior',
    class: 'S4 Science',
    stream: 'PCM',
    gender: 'Male',
    dob: '2008-04-15',
    house: 'Eagle',
    bloodGroup: 'O+',
    address: 'Plot 12, Kampala Road, Kampala, Uganda',
    photo: null,
    parentName: 'Mr. Comforts Ssewasswa',
    parentPhone: '+256 789 736 737',
    parentEmail: 'parent@ssewasswacomfortstechnologies.com',
    parentRelation: 'Father',
    attendance: {
      totalDays: 220,
      present: 198,
      absent: 14,
      late: 8,
      monthly: [
        { month: 'Jan', present: 22, total: 23 },
        { month: 'Feb', present: 19, total: 20 },
        { month: 'Mar', present: 18, total: 20 },
        { month: 'Apr', present: 16, total: 18 },
        { month: 'May', present: 21, total: 22 },
        { month: 'Jun', present: 20, total: 22 },
        { month: 'Jul', present: 22, total: 22 },
        { month: 'Aug', present: 20, total: 22 },
        { month: 'Sep', present: 20, total: 22 },
        { month: 'Oct', present: 20, total: 22 },
        { month: 'Nov', present: 0, total: 7 },
      ],
    },
    marks: [
      { subject: 'Mathematics', mark: 87, average: 72, grade: 'A', teacher: 'Mr. Okello', feedback: 'Strong improvement in calculus — keep practicing integration.' },
      { subject: 'Physics', mark: 79, average: 68, grade: 'B+', teacher: 'Ms. Nakato', feedback: 'Solid grasp of mechanics; revise electricity problems.' },
      { subject: 'Chemistry', mark: 74, average: 70, grade: 'B', teacher: 'Mr. Byaruhanga', feedback: 'Improve organic chemistry reaction recall.' },
      { subject: 'Biology', mark: 82, average: 69, grade: 'A-', teacher: 'Mrs. Akello', feedback: 'Excellent on genetics — focus on plant physiology.' },
      { subject: 'English', mark: 76, average: 71, grade: 'B', teacher: 'Ms. Namuli', feedback: 'Good essays; work on grammar precision.' },
      { subject: 'Geography', mark: 71, average: 67, grade: 'B', teacher: 'Mr. Tumusiime', feedback: 'Strengthen map-work skills.' },
      { subject: 'Cre / R.E.', mark: 80, average: 73, grade: 'A-', teacher: 'Pastor Kintu', feedback: 'Thoughtful reflections — well done.' },
    ],
    assignments: [
      { id: 1, subject: 'Mathematics', title: 'Calculus Worksheet 4 — Integration by parts', dueDate: '2026-11-20', status: 'pending' },
      { id: 2, subject: 'Physics', title: 'Lab Report: Ohm\'s Law experiment', dueDate: '2026-11-18', status: 'pending' },
      { id: 3, subject: 'Chemistry', title: 'Organic chemistry — naming alkanes', dueDate: '2026-11-22', status: 'pending' },
      { id: 4, subject: 'English', title: 'Essay: Climate change in Uganda (800 words)', dueDate: '2026-11-25', status: 'pending' },
      { id: 5, subject: 'Biology', title: 'Genetics problem set — Punnett squares', dueDate: '2026-11-15', status: 'done' },
      { id: 6, subject: 'Geography', title: 'Map reading exercise — contour lines', dueDate: '2026-11-12', status: 'done' },
    ],
    timetable: [
      // Mon
      { period: 1, day: 'Mon', subject: 'Mathematics', teacher: 'Mr. Okello', room: 'R12' },
      { period: 2, day: 'Mon', subject: 'Physics', teacher: 'Ms. Nakato', room: 'Lab A' },
      { period: 3, day: 'Mon', subject: 'Chemistry', teacher: 'Mr. Byaruhanga', room: 'Lab B' },
      { period: 4, day: 'Mon', subject: 'English', teacher: 'Ms. Namuli', room: 'R7' },
      { period: 5, day: 'Mon', subject: 'Geography', teacher: 'Mr. Tumusiime', room: 'R5' },
      // Tue
      { period: 1, day: 'Tue', subject: 'Biology', teacher: 'Mrs. Akello', room: 'Lab C' },
      { period: 2, day: 'Tue', subject: 'Mathematics', teacher: 'Mr. Okello', room: 'R12' },
      { period: 3, day: 'Tue', subject: 'Cre / R.E.', teacher: 'Pastor Kintu', room: 'R3' },
      { period: 4, day: 'Tue', subject: 'Physics', teacher: 'Ms. Nakato', room: 'Lab A' },
      { period: 5, day: 'Tue', subject: 'Chemistry', teacher: 'Mr. Byaruhanga', room: 'Lab B' },
      // Wed
      { period: 1, day: 'Wed', subject: 'English', teacher: 'Ms. Namuli', room: 'R7' },
      { period: 2, day: 'Wed', subject: 'Mathematics', teacher: 'Mr. Okello', room: 'R12' },
      { period: 3, day: 'Wed', subject: 'Geography', teacher: 'Mr. Tumusiime', room: 'R5' },
      { period: 4, day: 'Wed', subject: 'Biology', teacher: 'Mrs. Akello', room: 'Lab C' },
      { period: 5, day: 'Wed', subject: 'Physics', teacher: 'Ms. Nakato', room: 'Lab A' },
      // Thu
      { period: 1, day: 'Thu', subject: 'Chemistry', teacher: 'Mr. Byaruhanga', room: 'Lab B' },
      { period: 2, day: 'Thu', subject: 'Mathematics', teacher: 'Mr. Okello', room: 'R12' },
      { period: 3, day: 'Thu', subject: 'English', teacher: 'Ms. Namuli', room: 'R7' },
      { period: 4, day: 'Thu', subject: 'Cre / R.E.', teacher: 'Pastor Kintu', room: 'R3' },
      { period: 5, day: 'Thu', subject: 'Biology', teacher: 'Mrs. Akello', room: 'Lab C' },
      // Fri
      { period: 1, day: 'Fri', subject: 'Physics', teacher: 'Ms. Nakato', room: 'Lab A' },
      { period: 2, day: 'Fri', subject: 'Geography', teacher: 'Mr. Tumusiime', room: 'R5' },
      { period: 3, day: 'Fri', subject: 'Mathematics', teacher: 'Mr. Okello', room: 'R12' },
      { period: 4, day: 'Fri', subject: 'Chemistry', teacher: 'Mr. Byaruhanga', room: 'Lab B' },
      { period: 5, day: 'Fri', subject: 'English', teacher: 'Ms. Namuli', room: 'R7' },
    ],
    announcements: [
      { id: 1, title: 'End of Term 3 Examinations begin 25th November', body: 'All S4 students should report to the examination hall by 8:00 AM sharp. Bring your admission slip, two pens, pencil, mathematical set and calculator.', date: '2026-11-05', author: 'Head Teacher', priority: 'high' },
      { id: 2, title: 'Parent–Teacher Conference — 18th November', body: 'Parents are invited to discuss student progress. Meetings run from 9:00 AM to 1:00 PM in the main hall.', date: '2026-11-03', author: 'Deputy Head', priority: 'medium' },
      { id: 3, title: 'Library books due before break', body: 'All borrowed library books must be returned by 22nd November. Outstanding fines must be cleared to receive report cards.', date: '2026-11-01', author: 'Librarian', priority: 'medium' },
      { id: 4, title: 'Sports Day rescheduled to 19th November', body: 'Inter-house sports day has been moved from the 17th to the 19th. House captains confirm team lists with Mr. Ssemwanga.', date: '2026-10-28', author: 'Sports Master', priority: 'low' },
    ],
    library: [
      { id: 1, book: 'Things Fall Apart — Chinua Achebe', checkout: '2026-10-10', due: '2026-10-24', status: 'returned', fine: 0 },
      { id: 2, book: 'Mathematics for Senior 4 — MK Publishers', checkout: '2026-10-20', due: '2026-11-03', status: 'returned', fine: 0 },
      { id: 3, book: 'The River Between — Ngugi wa Thiong\'o', checkout: '2026-11-01', due: '2026-11-15', status: 'overdue', fine: 2000 },
      { id: 4, book: 'Comprehensive Biology — Oxford', checkout: '2026-11-05', due: '2026-11-19', status: 'borrowed', fine: 0 },
    ],
    fees: {
      balance: 250000,
      totalDue: 1850000,
      paid: 1600000,
      currency: 'UGX',
      lastPayment: { date: '2026-09-30', amount: 600000, method: 'Bank deposit — Stanbic' },
      dueDate: '2026-12-15',
      installments: [
        { id: 1, label: 'Term 3 Tuition', amount: 1500000, due: '2026-09-15', status: 'paid' },
        { id: 2, label: 'Lab & Library Fee', amount: 200000, due: '2026-10-15', status: 'paid' },
        { id: 3, label: 'Examination Fee', amount: 100000, due: '2026-11-15', status: 'paid' },
        { id: 4, label: 'Boarding (optional)', amount: 50000, due: '2026-12-15', status: 'pending' },
      ],
    },
  };
}

// ---------- Storage helpers ----------
function loadStudents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {}
  const seed = [seedStudent()];
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

function saveStudents(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

// ---------- Small UI helpers ----------
function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}
function fmtMoney(n, currency = 'UGX') {
  if (typeof n !== 'number') return '—';
  return `${currency} ${n.toLocaleString()}`;
}
function gradeColor(grade) {
  if (!grade) return '#999';
  if (grade.startsWith('A')) return '#0b8043';
  if (grade.startsWith('B')) return '#1a73e8';
  if (grade.startsWith('C')) return '#f9ab00';
  return '#d32f2f';
}

// ---------- Tabs definition ----------
const TABS = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'attendance', label: 'Attendance', icon: '📅' },
  { id: 'marks', label: 'Marks', icon: '📊' },
  { id: 'assignments', label: 'Assignments', icon: '📝' },
  { id: 'timetable', label: 'Timetable', icon: '🗓️' },
  { id: 'announcements', label: 'Announcements', icon: '📢' },
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'fees', label: 'Fees', icon: '💳' },
  { id: 'id', label: 'ID Card', icon: '🪪' },
];

// ---------- Lookup screen ----------
function LookupScreen({ onFound, students }) {
  const [admissionNo, setAdmissionNo] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const trimmed = admissionNo.trim();
    if (!trimmed) { setError('Please enter your admission number.'); return; }
    const match = students.find(s => s.admissionNo.toLowerCase() === trimmed.toLowerCase());
    if (!match) { setError(`No student found for admission # "${trimmed}". Try SCT-2026-001.`); return; }
    setError('');
    onFound(match);
  };

  return (
    <div className="page-container" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 className="page-title" style={{ color: PURPLE }}>🎓 Student Portal</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
        Enter your admission number to view your profile, attendance, marks, timetable and more.
      </p>
      <form onSubmit={submit} style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid #e0e0e0' }}>
        <label style={{ display: 'block', fontSize: 13, color: '#444', marginBottom: 6, fontWeight: 600 }}>Admission Number</label>
        <input
          type="text"
          value={admissionNo}
          onChange={e => setAdmissionNo(e.target.value)}
          placeholder="e.g. SCT-2026-001"
          autoFocus
          style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${error ? '#d32f2f' : '#ccc'}`, fontSize: 15, boxSizing: 'border-box' }}
        />
        {error && <div style={{ color: '#d32f2f', fontSize: 12, marginTop: 6 }}>{error}</div>}
        <button type="submit" style={{ marginTop: 16, width: '100%', padding: '12px 20px', background: PURPLE, color: 'white', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
          Look up my profile →
        </button>
        <div style={{ marginTop: 16, padding: 12, background: PURPLE_LIGHT, borderRadius: 8, fontSize: 12, color: PURPLE_DARK }}>
          <strong>💡 Demo tip:</strong> use admission number <code style={{ background: 'white', padding: '2px 6px', borderRadius: 4 }}>SCT-2026-001</code> to view the seeded sample student.
        </div>
      </form>
    </div>
  );
}

// ---------- Profile tab ----------
function ProfileTab({ student }) {
  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
      <div style={{ width: 140, color: '#777' }}>{label}</div>
      <div style={{ flex: 1, color: '#202124', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ width: 140, height: 160, borderRadius: 12, background: PURPLE_LIGHT, border: `2px dashed ${PURPLE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: PURPLE, fontSize: 14, textAlign: 'center', padding: 8 }}>
          {student.photo
            ? <img src={student.photo} alt="student" style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }} />
            : <div>📷<br />Photo<br />placeholder</div>}
        </div>
        <div style={{ flex: 1, minWidth: 250 }}>
          <h2 style={{ margin: '0 0 4px', color: PURPLE_DARK, fontSize: 22 }}>{student.name}</h2>
          <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>{student.class} • {student.stream} • {student.gender}</div>
          <Row label="Admission #" value={student.admissionNo} />
          <Row label="Date of birth" value={fmtDate(student.dob)} />
          <Row label="House" value={student.house} />
          <Row label="Blood group" value={student.bloodGroup} />
        </div>
      </div>
      <div style={{ background: PURPLE_LIGHT, padding: 16, borderRadius: 10 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14, color: PURPLE_DARK }}>👨‍👩‍👦 Parent / Guardian Contact</h3>
        <Row label="Name" value={student.parentName} />
        <Row label="Relationship" value={student.parentRelation} />
        <Row label="Phone" value={student.parentPhone} />
        <Row label="Email" value={student.parentEmail} />
        <Row label="Home address" value={student.address} />
      </div>
    </div>
  );
}

// ---------- Attendance tab ----------
function AttendanceTab({ student }) {
  const a = student.attendance || {};
  const pct = a.totalDays ? Math.round((a.present / a.totalDays) * 100) : 0;
  const maxPresent = Math.max(1, ...(a.monthly || []).map(m => m.total || 1));
  const statCards = [
    { label: 'Days Present', value: a.present ?? 0, color: '#0b8043', bg: '#e6f4ea' },
    { label: 'Days Absent', value: a.absent ?? 0, color: '#d32f2f', bg: '#fce8e6' },
    { label: 'Late Arrivals', value: a.late ?? 0, color: '#f9ab00', bg: '#fef7e0' },
    { label: 'Attendance %', value: pct + '%', color: PURPLE, bg: PURPLE_LIGHT },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {statCards.map(c => (
          <div key={c.label} style={{ padding: 16, borderRadius: 10, background: c.bg, border: `1px solid ${c.color}33` }}>
            <div style={{ fontSize: 11, color: c.color, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>{c.label}</div>
            <div style={{ fontSize: 26, color: c.color, fontWeight: 800, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: 16, background: 'white', borderRadius: 10, border: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#444' }}>📊 Monthly Attendance (present / total days)</h3>
        {!a.monthly || a.monthly.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>No attendance history.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, overflowX: 'auto', paddingBottom: 8 }}>
            {a.monthly.map(m => {
              const ratio = m.total ? m.present / m.total : 0;
              const h = Math.max(4, ratio * 150);
              const c = ratio >= 0.9 ? '#0b8043' : ratio >= 0.75 ? '#f9ab00' : '#d32f2f';
              return (
                <div key={m.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>{m.present}/{m.total}</div>
                  <div style={{ width: 24, height: h, background: c, borderRadius: '4px 4px 0 0', transition: 'height .2s' }} title={`${m.present} of ${m.total}`} />
                  <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>{m.month}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: 11, color: '#999', marginTop: 12 }}>
          Max possible days in chart: {maxPresent}. Green ≥ 90% • Yellow ≥ 75% • Red &lt; 75%.
        </div>
      </div>
    </div>
  );
}

// ---------- Marks tab ----------
function MarksTab({ student }) {
  const marks = student.marks || [];
  const avg = marks.length ? Math.round(marks.reduce((s, m) => s + m.mark, 0) / marks.length) : 0;
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ padding: 12, borderRadius: 10, background: PURPLE_LIGHT, border: `1px solid ${PURPLE}33` }}>
          <div style={{ fontSize: 11, color: PURPLE, fontWeight: 700 }}>YOUR AVERAGE</div>
          <div style={{ fontSize: 22, color: PURPLE_DARK, fontWeight: 800 }}>{avg}%</div>
        </div>
        <div style={{ padding: 12, borderRadius: 10, background: '#e8f0fe', border: '1px solid #1a73e833' }}>
          <div style={{ fontSize: 11, color: '#1a73e8', fontWeight: 700 }}>CLASS AVERAGE</div>
          <div style={{ fontSize: 22, color: '#1a73e8', fontWeight: 800 }}>
            {marks.length ? Math.round(marks.reduce((s, m) => s + m.average, 0) / marks.length) : 0}%
          </div>
        </div>
      </div>
      {marks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999', background: '#fafafa', borderRadius: 8 }}>
          No exam results published yet.
        </div>
      ) : marks.map((m, i) => {
        const diff = m.mark - m.average;
        return (
          <div key={i} style={{ padding: 14, marginBottom: 10, background: 'white', borderRadius: 10, border: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ background: gradeColor(m.grade), color: 'white', padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13, minWidth: 36, textAlign: 'center' }}>{m.grade}</span>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#202124' }}>{m.subject}</div>
                <div style={{ fontSize: 11, color: '#999' }}>Teacher: {m.teacher}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: PURPLE_DARK }}>{m.mark}%</div>
                <div style={{ fontSize: 11, color: '#999' }}>class avg: {m.average}%</div>
              </div>
              <div style={{ fontSize: 12, color: diff >= 0 ? '#0b8043' : '#d32f2f', fontWeight: 700, minWidth: 60, textAlign: 'right' }}>
                {diff >= 0 ? '+' : ''}{diff} vs avg
              </div>
            </div>
            {/* progress bar */}
            <div style={{ height: 6, background: '#eee', borderRadius: 4, marginTop: 10, overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: `${m.mark}%`, height: '100%', background: PURPLE }} />
              <div style={{ position: 'absolute', top: 0, left: `${m.average}%`, width: 2, height: '100%', background: '#1a73e8' }} title="Class average" />
            </div>
            {m.feedback && (
              <div style={{ marginTop: 8, padding: 10, background: '#fafafa', borderRadius: 6, fontSize: 12, color: '#555', fontStyle: 'italic' }}>
                💬 {m.feedback}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Assignments tab ----------
function AssignmentsTab({ student, onToggle }) {
  const list = student.assignments || [];
  const pending = list.filter(a => a.status !== 'done');
  const done = list.filter(a => a.status === 'done');
  const today = new Date();
  const Card = ({ a }) => {
    const due = new Date(a.dueDate);
    const overdue = a.status !== 'done' && due < today;
    return (
      <div style={{ padding: 12, marginBottom: 8, borderRadius: 8, background: a.status === 'done' ? '#f6fff9' : 'white', border: `1px solid ${a.status === 'done' ? '#0b8043' : overdue ? '#d32f2f' : '#e0e0e0'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <input type="checkbox" checked={a.status === 'done'} onChange={() => onToggle(a.id)} style={{ transform: 'scale(1.3)', cursor: 'pointer' }} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 600, color: '#202124', fontSize: 14, textDecoration: a.status === 'done' ? 'line-through' : 'none' }}>{a.title}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{a.subject} • Due {fmtDate(a.dueDate)} {overdue && <span style={{ color: '#d32f2f', fontWeight: 700 }}>• OVERDUE</span>}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: a.status === 'done' ? '#0b8043' : overdue ? '#d32f2f' : '#f9ab00', color: 'white', textTransform: 'uppercase' }}>
            {a.status === 'done' ? 'Done' : overdue ? 'Overdue' : 'Pending'}
          </span>
        </div>
      </div>
    );
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 12, borderRadius: 10, background: '#fef7e0', border: '1px solid #f9ab0033' }}>
          <div style={{ fontSize: 11, color: '#f9ab00', fontWeight: 700 }}>PENDING</div>
          <div style={{ fontSize: 22, color: '#f9ab00', fontWeight: 800 }}>{pending.length}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 10, background: '#e6f4ea', border: '1px solid #0b804333' }}>
          <div style={{ fontSize: 11, color: '#0b8043', fontWeight: 700 }}>COMPLETED</div>
          <div style={{ fontSize: 22, color: '#0b8043', fontWeight: 800 }}>{done.length}</div>
        </div>
      </div>
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999', background: '#fafafa', borderRadius: 8 }}>
          📝 No assignments yet.
        </div>
      ) : (
        <div>
          {pending.length > 0 && <h4 style={{ fontSize: 12, color: '#777', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>To do</h4>}
          {pending.map(a => <Card key={a.id} a={a} />)}
          {done.length > 0 && <h4 style={{ fontSize: 12, color: '#777', textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>Completed</h4>}
          {done.map(a => <Card key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}

// ---------- Timetable tab ----------
function TimetableTab({ student }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const periods = [1, 2, 3, 4, 5];
  const findCell = (day, period) => (student.timetable || []).find(t => t.day === day && t.period === period);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ padding: 10, background: PURPLE, color: 'white', textAlign: 'left', borderRadius: '6px 0 0 0' }}>Period</th>
            {days.map(d => <th key={d} style={{ padding: 10, background: PURPLE, color: 'white', textAlign: 'left' }}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {periods.map((p, idx) => (
            <tr key={p}>
              <td style={{ padding: 10, background: PURPLE_LIGHT, color: PURPLE_DARK, fontWeight: 700, borderBottom: '1px solid #e0e0e0' }}>
                {p}<br /><span style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>{['08:00–08:40', '08:40–09:20', '09:35–10:15', '10:15–10:55', '11:10–11:50'][idx]}</span>
              </td>
              {days.map(d => {
                const cell = findCell(d, p);
                return (
                  <td key={d} style={{ padding: 8, borderBottom: '1px solid #f0f0f0', borderLeft: '1px solid #f0f0f0', verticalAlign: 'top' }}>
                    {cell ? (
                      <div>
                        <div style={{ fontWeight: 600, color: PURPLE_DARK, fontSize: 12 }}>{cell.subject}</div>
                        <div style={{ fontSize: 10, color: '#999' }}>{cell.teacher}</div>
                        <div style={{ fontSize: 10, color: '#1a73e8' }}>📍 {cell.room}</div>
                      </div>
                    ) : (
                      <div style={{ color: '#ccc' }}>—</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Announcements tab ----------
function AnnouncementsTab({ student }) {
  const list = [...(student.announcements || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const pColor = { high: '#d32f2f', medium: '#f9ab00', low: '#0b8043' };
  return (
    <div>
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999', background: '#fafafa', borderRadius: 8 }}>
          📢 No announcements.
        </div>
      ) : list.map(a => (
        <div key={a.id} style={{ padding: 14, marginBottom: 10, background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', borderLeft: `4px solid ${pColor[a.priority] || '#999'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, color: '#202124' }}>{a.title}</h3>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: pColor[a.priority] || '#999', color: 'white', textTransform: 'uppercase' }}>{a.priority}</span>
          </div>
          <p style={{ margin: '6px 0 8px', fontSize: 13, color: '#555', lineHeight: 1.5 }}>{a.body}</p>
          <div style={{ fontSize: 11, color: '#999' }}>— {a.author} • {fmtDate(a.date)}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- Library tab ----------
function LibraryTab({ student }) {
  const list = student.library || [];
  const totalFine = list.reduce((s, b) => s + (b.fine || 0), 0);
  const statusBadge = (s) => {
    const map = { returned: ['#0b8043', '#e6f4ea'], borrowed: ['#1a73e8', '#e8f0fe'], overdue: ['#d32f2f', '#fce8e6'] };
    const [c, bg] = map[s] || ['#999', '#f5f5f5'];
    return <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: bg, color: c, textTransform: 'uppercase' }}>{s}</span>;
  };
  return (
    <div>
      <div style={{ padding: 12, borderRadius: 10, background: totalFine > 0 ? '#fce8e6' : '#e6f4ea', border: `1px solid ${totalFine > 0 ? '#d32f2f33' : '#0b804333'}`, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: totalFine > 0 ? '#d32f2f' : '#0b8043', textTransform: 'uppercase' }}>Outstanding fines</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: totalFine > 0 ? '#d32f2f' : '#0b8043' }}>{fmtMoney(totalFine)}</div>
      </div>
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999', background: '#fafafa', borderRadius: 8 }}>📚 No library history.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 540 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 10, borderBottom: '2px solid ' + PURPLE, color: '#555' }}>Book</th>
                <th style={{ textAlign: 'left', padding: 10, borderBottom: '2px solid ' + PURPLE, color: '#555' }}>Checked out</th>
                <th style={{ textAlign: 'left', padding: 10, borderBottom: '2px solid ' + PURPLE, color: '#555' }}>Due</th>
                <th style={{ textAlign: 'left', padding: 10, borderBottom: '2px solid ' + PURPLE, color: '#555' }}>Status</th>
                <th style={{ textAlign: 'right', padding: 10, borderBottom: '2px solid ' + PURPLE, color: '#555' }}>Fine</th>
              </tr>
            </thead>
            <tbody>
              {list.map(b => (
                <tr key={b.id}>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{b.book}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0', color: '#666' }}>{fmtDate(b.checkout)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0', color: '#666' }}>{fmtDate(b.due)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0' }}>{statusBadge(b.status)}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #f0f0f0', textAlign: 'right', color: (b.fine || 0) > 0 ? '#d32f2f' : '#999', fontWeight: (b.fine || 0) > 0 ? 700 : 400 }}>
                    {(b.fine || 0) > 0 ? fmtMoney(b.fine) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Fees tab ----------
function FeesTab({ student }) {
  const f = student.fees || {};
  const c = f.currency || 'UGX';
  const paidPct = f.totalDue ? Math.round((f.paid / f.totalDue) * 100) : 0;
  const requestStatement = () => alert(`Statement request received.\n\nA PDF statement for ${student.name} (${student.admissionNo}) will be emailed to ${student.parentEmail || 'your registered email'} within 24 hours.`);
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 14, borderRadius: 10, background: f.balance > 0 ? '#fce8e6' : '#e6f4ea', border: `1px solid ${f.balance > 0 ? '#d32f2f33' : '#0b804333'}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: f.balance > 0 ? '#d32f2f' : '#0b8043', textTransform: 'uppercase' }}>Balance due</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: f.balance > 0 ? '#d32f2f' : '#0b8043' }}>{fmtMoney(f.balance, c)}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 10, background: PURPLE_LIGHT, border: `1px solid ${PURPLE}33` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: 'uppercase' }}>Last payment</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: PURPLE_DARK }}>{fmtMoney(f.lastPayment?.amount, c)}</div>
          <div style={{ fontSize: 11, color: '#777' }}>{fmtDate(f.lastPayment?.date)} • {f.lastPayment?.method}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 10, background: '#fef7e0', border: '1px solid #f9ab0033' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f9ab00', textTransform: 'uppercase' }}>Next due date</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#f9ab00' }}>{fmtDate(f.dueDate)}</div>
        </div>
      </div>
      <div style={{ padding: 16, background: 'white', borderRadius: 10, border: '1px solid #e0e0e0', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: '#777' }}>Payment progress</span>
          <span style={{ fontWeight: 700, color: PURPLE_DARK }}>{fmtMoney(f.paid, c)} / {fmtMoney(f.totalDue, c)} ({paidPct}%)</span>
        </div>
        <div style={{ height: 10, background: '#eee', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: `${paidPct}%`, height: '100%', background: PURPLE }} />
        </div>
      </div>
      <h3 style={{ fontSize: 14, color: '#444', margin: '0 0 10px' }}>Installments</h3>
      {(f.installments || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#999', background: '#fafafa', borderRadius: 8 }}>No fee installments on record.</div>
      ) : (
        <div>
          {f.installments.map(ins => (
            <div key={ins.id} style={{ display: 'flex', gap: 12, padding: 10, marginBottom: 6, borderRadius: 8, background: 'white', border: '1px solid #e0e0e0', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#202124' }}>{ins.label}</div>
                <div style={{ fontSize: 11, color: '#999' }}>Due {fmtDate(ins.due)}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: PURPLE_DARK }}>{fmtMoney(ins.amount, c)}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: ins.status === 'paid' ? '#0b8043' : '#f9ab00', color: 'white', textTransform: 'uppercase' }}>{ins.status}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={requestStatement} style={{ marginTop: 16, padding: '10px 20px', background: PURPLE, color: 'white', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
        📄 Request statement
      </button>
    </div>
  );
}

// ---------- ID card tab ----------
function IdCardTab({ student }) {
  const download = () => {
    alert(`🪪 ID Card download\n\nGenerating digital ID card for:\n${student.name}\nAdmission #: ${student.admissionNo}\nClass: ${student.class}\n\nIn production this would render a PDF using jsPDF + the school logo. (Mock action.)`);
  };
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ width: 320, padding: 16, borderRadius: 14, background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})`, color: 'white', boxShadow: '0 8px 24px rgba(123,31,162,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, opacity: 0.85 }}>
          <span>SSEWASSWA COMFORTS</span>
          <span>STUDENT ID</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 70, height: 80, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📷</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{student.name}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{student.class} • {student.stream}</div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 12, lineHeight: 1.7 }}>
          <div><strong>Adm #:</strong> {student.admissionNo}</div>
          <div><strong>House:</strong> {student.house}</div>
          <div><strong>Blood:</strong> {student.bloodGroup}</div>
          <div><strong>DOB:</strong> {fmtDate(student.dob)}</div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.3)', fontSize: 11, opacity: 0.85 }}>
          Parent: {student.parentName} • {student.parentPhone}
        </div>
        <div style={{ marginTop: 8, fontSize: 10, opacity: 0.7 }}>Valid until 31 Dec 2026 • Principal: ____________</div>
      </div>
      <div style={{ flex: 1, minWidth: 240 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, color: PURPLE_DARK }}>Download your ID card</h3>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 16 }}>
          Download a printable PDF of your student ID card. Carry it at all times while on school grounds;
          it is required for library access, cafeteria purchases and exam entry.
        </p>
        <button onClick={download} style={{ padding: '12px 24px', background: PURPLE, color: 'white', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
          ⬇️ Download ID card (PDF)
        </button>
        <div style={{ marginTop: 16, padding: 12, background: PURPLE_LIGHT, borderRadius: 8, fontSize: 12, color: PURPLE_DARK }}>
          ℹ️ If your card is lost, contact the front office for a replacement (UGX 5,000 fee applies).
        </div>
      </div>
    </div>
  );
}

// ---------- Main component ----------
export default function StudentPortal() {
  const [students, setStudents] = useState([]);
  const [current, setCurrent] = useState(null);
  const [tab, setTab] = useState('profile');

  useEffect(() => { setStudents(loadStudents()); }, []);

  const persist = (updated) => {
    setStudents(updated);
    saveStudents(updated);
  };

  const handleFound = (s) => { setCurrent(s); setTab('profile'); };

  const handleLogout = () => { setCurrent(null); };

  const toggleAssignment = (id) => {
    if (!current) return;
    const updatedStudents = students.map(s => {
      if (s.admissionNo !== current.admissionNo) return s;
      const assignments = s.assignments.map(a => a.id === id ? { ...a, status: a.status === 'done' ? 'pending' : 'done' } : a);
      return { ...s, assignments };
    });
    persist(updatedStudents);
    const fresh = updatedStudents.find(s => s.admissionNo === current.admissionNo);
    setCurrent(fresh);
  };

  // ---------- Render ----------
  if (!current) {
    return <LookupScreen students={students} onFound={handleFound} />;
  }

  return (
    <div className="page-container">
      {/* Top header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ color: PURPLE, marginBottom: 4 }}>🎓 Student Portal</h1>
          <div style={{ fontSize: 13, color: '#666' }}>
            Welcome, <strong>{current.name}</strong> • {current.class} • Adm #{current.admissionNo}
          </div>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 16px', background: 'white', color: PURPLE, border: `1px solid ${PURPLE}`, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          ⏏ Switch student
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: `2px solid ${PURPLE_LIGHT}`, marginBottom: 20, paddingBottom: 0 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 14px',
                background: active ? PURPLE : 'transparent',
                color: active ? 'white' : '#666',
                border: 0,
                borderBottom: active ? `3px solid ${PURPLE_DARK}` : '3px solid transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap',
                borderRadius: '6px 6px 0 0',
                marginBottom: -2,
              }}
            >
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>

      {/* Active tab body */}
      <div style={{ background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e0e0e0', minHeight: 320 }}>
        {tab === 'profile' && <ProfileTab student={current} />}
        {tab === 'attendance' && <AttendanceTab student={current} />}
        {tab === 'marks' && <MarksTab student={current} />}
        {tab === 'assignments' && <AssignmentsTab student={current} onToggle={toggleAssignment} />}
        {tab === 'timetable' && <TimetableTab student={current} />}
        {tab === 'announcements' && <AnnouncementsTab student={current} />}
        {tab === 'library' && <LibraryTab student={current} />}
        {tab === 'fees' && <FeesTab student={current} />}
        {tab === 'id' && <IdCardTab student={current} />}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: '#999', textAlign: 'center' }}>
        Ssewasswa Comforts Technologies • Student Portal v1 • Data stored locally in your browser.
      </div>
    </div>
  );
}
