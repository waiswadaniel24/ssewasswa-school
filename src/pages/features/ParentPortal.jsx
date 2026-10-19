// Ssewasswa Comforts — Parent Portal
// Parents look up their children by phone number, then view attendance, fees,
// report cards, teacher comments, school announcements, calendar, and message
// teachers. Sample/seed data is auto-loaded on first visit so the page is
// never empty. All data is persisted to localStorage.
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ── Theme ───────────────────────────────────────────────────────────────────
const PINK = '#d81b60';
const PINK_DARK = '#a0133e';
const PINK_LIGHT = '#fce4ec';
const PINK_FAINT = '#fff5f9';
const INK = '#1f1f1f';
const SUB = '#5f6368';
const LINE = '#e6e6e6';
const BG = '#fafafa';

// ── localStorage keys ────────────────────────────────────────────────────────
const KEYS = {
  children: 'erp_parent_children_v1',
  announcements: 'erp_parent_announcements_v1',
  calendar: 'erp_parent_calendar_v1',
  messages: 'erp_parent_messages_v1',
  seeded: 'erp_parent_seeded_v1',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const persist = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};
const normalizePhone = (p) => (p || '').toLowerCase().replace(/[^0-9+]/g, '');
const samePhone = (a, b) => normalizePhone(a) === normalizePhone(b);
const ugx = (n) =>
  'UGX ' + Number(n || 0).toLocaleString('en-UG');
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
};
const fmtDateTime = (iso) => {
  try { return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};
const gradeColor = (g) => ({
  A: '#0b8043', B: '#1a73e8', C: '#f9ab00', D: '#ff6d00', E: '#d32f2f', F: '#d32f2f',
}[g] || SUB);

// ── Seed data ────────────────────────────────────────────────────────────────
// A single parent phone is linked to 3 children (siblings). Pre-populated so the
// demo is never empty. The lookup phone below matches all three.
const PARENT_PHONE = '+256 789 736 737';

const SEED_CHILDREN = [
  {
    id: 'CH-1001',
    name: 'Atusinguzi Daphne',
    className: 'P.5 East',
    stream: 'East',
    phone: PARENT_PHONE,
    dob: '2014-03-12',
    gender: 'F',
    color: '#e91e63',
    attendance: { present: 88, absent: 7, total: 95 },
    fees: {
      balance: 250000,
      termly: 750000,
      currency: 'UGX',
      history: [
        { id: 'P1', date: '2025-01-15', amount: 500000, method: 'Cash', ref: 'RCPT-08812', note: 'Term 1 part-payment' },
        { id: 'P2', date: '2025-02-28', amount: 250000, method: 'MTN MoMo', ref: 'MM-553201', note: 'Term 1 balance top-up' },
      ],
    },
    marks: [
      { id: 'M1', subject: 'English', score: 78, max: 100, grade: 'B', exam: 'Term 1 Opener' },
      { id: 'M2', subject: 'Mathematics', score: 85, max: 100, grade: 'A', exam: 'Term 1 Opener' },
      { id: 'M3', subject: 'Science', score: 72, max: 100, grade: 'B', exam: 'Term 1 Opener' },
      { id: 'M4', subject: 'Social Studies', score: 88, max: 100, grade: 'A', exam: 'Term 1 Opener' },
      { id: 'M5', subject: 'Reading', score: 80, max: 100, grade: 'B', exam: 'Term 1 Opener' },
    ],
    comments: [
      { id: 'C1', date: '2025-03-01', teacher: 'Mr. Ssewasswa', comment: 'Great improvement in Mathematics. Keep up the daily revision.' },
      { id: 'C2', date: '2025-02-14', teacher: 'Mrs. Nakato', comment: 'Participates well in class discussions. Encourage reading at home.' },
    ],
    events: [
      { id: 'E1', date: '2025-04-04', title: "Parents' Day", time: '10:00', venue: 'Main Hall' },
      { id: 'E2', date: '2025-04-22', title: 'Mid-Term Exams Begin', time: '08:00', venue: 'Examination Room' },
      { id: 'E3', date: '2025-05-02', title: 'Class Trip — Entebbe Zoo', time: '09:00', venue: 'Entebbe' },
    ],
  },
  {
    id: 'CH-1002',
    name: 'Atwine Brian',
    className: 'P.3 West',
    stream: 'West',
    phone: PARENT_PHONE,
    dob: '2016-07-22',
    gender: 'M',
    color: '#1565c0',
    attendance: { present: 92, absent: 3, total: 95 },
    fees: {
      balance: 0,
      termly: 650000,
      currency: 'UGX',
      history: [
        { id: 'P3', date: '2025-01-10', amount: 650000, method: 'Airtel Money', ref: 'AM-770412', note: 'Term 1 full fees' },
      ],
    },
    marks: [
      { id: 'M6', subject: 'English', score: 91, max: 100, grade: 'A', exam: 'Term 1 Opener' },
      { id: 'M7', subject: 'Mathematics', score: 95, max: 100, grade: 'A', exam: 'Term 1 Opener' },
      { id: 'M8', subject: 'Religious Ed.', score: 88, max: 100, grade: 'A', exam: 'Term 1 Opener' },
      { id: 'M9', subject: 'Reading', score: 84, max: 100, grade: 'B', exam: 'Term 1 Opener' },
    ],
    comments: [
      { id: 'C3', date: '2025-03-04', teacher: 'Ms. Akello', comment: 'Top of the class this term. Excellent attitude.' },
    ],
    events: [
      { id: 'E4', date: '2025-04-15', title: 'Spelling Bee', time: '11:00', venue: 'Library' },
      { id: 'E5', date: '2025-04-22', title: 'Mid-Term Exams Begin', time: '08:00', venue: 'Examination Room' },
    ],
  },
  {
    id: 'CH-1003',
    name: 'Atuhuraire Sarah',
    className: 'S.2 North',
    stream: 'North',
    phone: PARENT_PHONE,
    dob: '2010-11-05',
    gender: 'F',
    color: '#6a1b9a',
    attendance: { present: 81, absent: 14, total: 95 },
    fees: {
      balance: 480000,
      termly: 950000,
      currency: 'UGX',
      history: [
        { id: 'P4', date: '2025-01-20', amount: 470000, method: 'Cash', ref: 'RCPT-08955', note: 'Term 1 part-payment' },
      ],
    },
    marks: [
      { id: 'M10', subject: 'Biology', score: 67, max: 100, grade: 'C', exam: 'Term 1 Opener' },
      { id: 'M11', subject: 'Chemistry', score: 54, max: 100, grade: 'D', exam: 'Term 1 Opener' },
      { id: 'M12', subject: 'Mathematics', score: 48, max: 100, grade: 'E', exam: 'Term 1 Opener' },
      { id: 'M13', subject: 'English', score: 75, max: 100, grade: 'B', exam: 'Term 1 Opener' },
      { id: 'M14', subject: 'Geography', score: 82, max: 100, grade: 'A', exam: 'Term 1 Opener' },
    ],
    comments: [
      { id: 'C4', date: '2025-03-06', teacher: 'Mr. Okello', comment: 'Needs extra support in Mathematics and Chemistry. Consider weekend revision.' },
      { id: 'C5', date: '2025-02-20', teacher: 'Ms. Namutebi', comment: 'Excellent Geography project — well done!' },
    ],
    events: [
      { id: 'E6', date: '2025-04-22', title: 'Mid-Term Exams Begin', time: '08:00', venue: 'Examination Room' },
      { id: 'E7', date: '2025-05-09', title: 'Science Fair', time: '09:00', venue: 'Science Lab' },
      { id: 'E8', date: '2025-05-30', title: 'Career Day', time: '10:00', venue: 'Main Hall' },
    ],
  },
];

const SEED_ANNOUNCEMENTS = [
  { id: 'A1', date: '2025-03-20', title: 'Term 1 Mid-Term Schedule Released', body: 'The mid-term examination timetable for Term 1 has been published. Parents are encouraged to review the schedule on the calendar tab and ensure children arrive by 7:45 AM on exam days.', author: 'Head Teacher', priority: 'high' },
  { id: 'A2', date: '2025-03-15', title: "Parents' Day — 4th April 2025", body: "All parents are warmly invited to the annual Parents' Day on 4th April 2025 starting at 10:00 AM in the Main Hall. Refreshments will be served.", author: 'Administration', priority: 'medium' },
  { id: 'A3', date: '2025-03-10', title: 'School Bus Route Updates', body: 'From Monday 17th March, the morning bus Route B (Kira — Ntinda) will depart 10 minutes earlier. Please adjust pickup times accordingly.', author: 'Transport Office', priority: 'low' },
  { id: 'A4', date: '2025-03-02', title: 'Fees Payment Reminder', body: 'Term 1 fees balances are now due. Pay via MTN MoMo, Airtel Money, or at the Bursar\'s office. Receipts are issued instantly.', author: 'Bursar', priority: 'high' },
];

const SEED_CALENDAR = [
  { id: 'CAL1', date: '2025-02-03', title: 'Term 1 Begins', type: 'term' },
  { id: 'CAL2', date: '2025-04-04', title: "Parents' Day", type: 'meeting' },
  { id: 'CAL3', date: '2025-04-18', title: 'Good Friday (Public Holiday)', type: 'holiday' },
  { id: 'CAL4', date: '2025-04-21', title: 'Easter Monday (Public Holiday)', type: 'holiday' },
  { id: 'CAL5', date: '2025-04-22', title: 'Mid-Term Exams Begin', type: 'exam' },
  { id: 'CAL6', date: '2025-04-29', title: 'Mid-Term Exams End', type: 'exam' },
  { id: 'CAL7', date: '2025-05-02', title: 'Mid-Term Break Begins', type: 'holiday' },
  { id: 'CAL8', date: '2025-05-12', title: 'School Resumes', type: 'term' },
  { id: 'CAL9', date: '2025-05-30', title: 'Career Day', type: 'meeting' },
  { id: 'CAL10', date: '2025-06-27', title: 'Term 1 Closes', type: 'term' },
];

const CAL_TYPE_META = {
  term:    { icon: '🏫', color: '#1a73e8', label: 'Term' },
  exam:    { icon: '📝', color: '#d32f2f', label: 'Exam' },
  holiday: { icon: '🌴', color: '#0b8043', label: 'Holiday' },
  meeting: { icon: '🤝', color: PINK,     label: 'Meeting' },
};

const TEACHERS = [
  'Mr. Ssewasswa (Class Teacher, P.5 East)',
  'Mrs. Nakato (English, P.5 East)',
  'Ms. Akello (P.3 West)',
  'Mr. Okello (Science, S.2 North)',
  'Ms. Namutebi (Geography, S.2 North)',
  'Head Teacher',
  'Bursar',
];

// ── Main component ───────────────────────────────────────────────────────────
export default function ParentPortal() {
  const [children, setChildren] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [messages, setMessages] = useState([]);

  const [phone, setPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [lookedUp, setLookedUp] = useState(false);
  const [lookupPhone, setLookupPhone] = useState(''); // the phone used for last successful lookup

  const [selectedChildId, setSelectedChildId] = useState(null);
  const [activeTab, setActiveTab] = useState('children');

  // message form state
  const [msgChildId, setMsgChildId] = useState('');
  const [msgTeacher, setMsgTeacher] = useState(TEACHERS[0]);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgErr, setMsgErr] = useState('');

  // calendar state (lifted to top level so hooks aren't called conditionally)
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // seed sample data once
  useEffect(() => {
    const seeded = localStorage.getItem(KEYS.seeded);
    if (!seeded) {
      persist(KEYS.children, SEED_CHILDREN);
      persist(KEYS.announcements, SEED_ANNOUNCEMENTS);
      persist(KEYS.calendar, SEED_CALENDAR);
      persist(KEYS.messages, []);
      localStorage.setItem(KEYS.seeded, '1');
    }
    setChildren(load(KEYS.children, []));
    setAnnouncements(load(KEYS.announcements, []));
    setCalendar(load(KEYS.calendar, []));
    setMessages(load(KEYS.messages, []));
  }, []);

  // persist helpers
  const saveMessages = useCallback((next) => { setMessages(next); persist(KEYS.messages, next); }, []);

  // ── Lookup ──────────────────────────────────────────────────────────────────
  const foundChildren = useMemo(() => {
    if (!lookedUp || !lookupPhone) return [];
    return children.filter((c) => samePhone(c.phone, lookupPhone));
  }, [children, lookedUp, lookupPhone]);

  const handleLookup = (e) => {
    e?.preventDefault?.();
    const trimmed = phone.trim();
    if (!trimmed) { setPhoneErr('Please enter your phone number.'); return; }
    const norm = normalizePhone(trimmed);
    if (norm.length < 9) { setPhoneErr('That phone number looks too short.'); return; }
    if (!/^\+?[0-9]{7,}$/.test(norm.replace(/^\+/, ''))) { setPhoneErr('Phone may only contain digits and a leading +.'); return; }
    setPhoneErr('');
    setLookupPhone(trimmed);
    setLookedUp(true);
    setActiveTab('children');
  };

  const resetLookup = () => {
    setLookedUp(false);
    setLookupPhone('');
    setPhone('');
    setSelectedChildId(null);
    setPhoneErr('');
  };

  // ── Child detail helpers ─────────────────────────────────────────────────────
  const selectedChild = children.find((c) => c.id === selectedChildId) || null;

  const handlePayNow = (child) => {
    alert(
      `💳 Mock payment for ${child.name}\n\n` +
      `Outstanding balance: ${ugx(child.fees.balance)}\n\n` +
      `In production this would launch Pesapal / MTN MoMo / Airtel Money checkout and update the balance on success.`
    );
  };

  // ── Message form ─────────────────────────────────────────────────────────────
  const sendMessage = (e) => {
    e?.preventDefault?.();
    if (!msgChildId) { setMsgErr('Please select a child.'); return; }
    if (!msgSubject.trim()) { setMsgErr('Please add a subject.'); return; }
    if (msgBody.trim().length < 10) { setMsgErr('Message body must be at least 10 characters.'); return; }
    const child = children.find((c) => c.id === msgChildId);
    const msg = {
      id: 'MSG-' + Date.now(),
      date: new Date().toISOString(),
      childId: msgChildId,
      childName: child ? child.name : '',
      className: child ? child.className : '',
      teacher: msgTeacher,
      subject: msgSubject.trim(),
      body: msgBody.trim(),
      status: 'sent',
      reply: null,
    };
    saveMessages([msg, ...messages]);
    setMsgSubject(''); setMsgBody(''); setMsgErr('');
    alert(`✅ Message sent to ${msgTeacher}.`);
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const btnPrimary = {
    padding: '12px 22px', background: PINK, color: '#fff', border: 0,
    borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14,
    boxShadow: '0 2px 6px rgba(216,27,96,0.25)',
  };
  const btnGhost = {
    padding: '10px 16px', background: '#fff', color: PINK,
    border: `1px solid ${PINK}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
  };
  const input = {
    flex: 1, minWidth: 220, padding: 12, borderRadius: 8,
    border: `1px solid ${LINE}`, fontSize: 15, boxSizing: 'border-box', outline: 'none',
  };
  const card = {
    padding: 16, borderRadius: 10, background: '#fff',
    border: `1px solid ${LINE}`,
  };
  const tabBtn = (id) => ({
    flex: 1, minWidth: 110, padding: '12px 10px', cursor: 'pointer',
    fontSize: 13, fontWeight: 700, borderRadius: 8,
    background: activeTab === id ? PINK : '#fff',
    color: activeTab === id ? '#fff' : SUB,
    border: `1px solid ${activeTab === id ? PINK : LINE}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  });

  // ── Avatar (initial-based photo placeholder) ────────────────────────────────
  const Avatar = ({ child, size = 56 }) => {
    const initials = child.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, ${child.color} 0%, ${PINK} 100%)`,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: size * 0.36, flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      }}>{initials}</div>
    );
  };

  const Empty = ({ icon, text }) => (
    <div style={{ textAlign: 'center', padding: 48, color: SUB, background: BG, borderRadius: 10 }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 14 }}>{text}</p>
    </div>
  );

  // ── Child detail modal ──────────────────────────────────────────────────────
  const renderChildDetail = () => {
    if (!selectedChild) return null;
    const c = selectedChild;
    const a = c.attendance || { present: 0, absent: 0, total: 0 };
    const pct = a.total ? Math.round((a.present / a.total) * 1000) / 10 : 0;
    const attColor = pct >= 90 ? '#0b8043' : pct >= 75 ? '#f9ab00' : '#d32f2f';

    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto', padding: '24px 12px',
      }} onClick={() => setSelectedChildId(null)}>
        <div style={{
          background: '#fff', borderRadius: 14, maxWidth: 820, width: '100%',
          margin: '0 auto', boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }} onClick={(e) => e.stopPropagation()}>
          {/* header */}
          <div style={{
            padding: '20px 24px', background: `linear-gradient(135deg, ${PINK} 0%, ${PINK_DARK} 100%)`,
            color: '#fff', borderRadius: '14px 14px 0 0',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <Avatar child={c} size={64} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{c.name}</div>
              <div style={{ fontSize: 13, opacity: 0.92 }}>
                {c.className} • {c.gender === 'F' ? '♀ Female' : '♂ Male'} • DOB {fmtDate(c.dob)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>ID: {c.id}</div>
            </div>
            <button onClick={() => setSelectedChildId(null)}
              style={btnGhost}
              aria-label="Close detail">✕ Close</button>
          </div>

          {/* body */}
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Attendance */}
            <section>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: PINK, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>📅 Attendance Summary</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ ...card, flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#0b8043' }}>{a.present}</div>
                  <div style={{ fontSize: 11, color: SUB }}>Days Present</div>
                </div>
                <div style={{ ...card, flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#d32f2f' }}>{a.absent}</div>
                  <div style={{ fontSize: 11, color: SUB }}>Days Absent</div>
                </div>
                <div style={{ ...card, flex: 1, minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: attColor }}>{pct}%</div>
                  <div style={{ fontSize: 11, color: SUB }}>Attendance Rate</div>
                </div>
              </div>
              <div style={{
                marginTop: 10, height: 10, borderRadius: 999, background: '#eee', overflow: 'hidden',
              }}>
                <div style={{ width: `${pct}%`, height: '100%', background: attColor, transition: 'width .4s' }} />
              </div>
            </section>

            {/* Fees */}
            <section>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: PINK, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>💳 Fees & Payments</h3>
              <div style={{ ...card, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 11, color: SUB }}>Outstanding Balance</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: c.fees.balance > 0 ? '#d32f2f' : '#0b8043' }}>
                    {ugx(c.fees.balance)}
                  </div>
                  <div style={{ fontSize: 11, color: SUB }}>
                    Termly fee: {ugx(c.fees.termly)} • Paid: {ugx(c.fees.termly - c.fees.balance)}
                  </div>
                </div>
                <button onClick={() => handlePayNow(c)} style={btnPrimary}>💳 Pay Now</button>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: SUB, marginBottom: 6 }}>Payment History</div>
                {c.fees.history.length === 0 ? (
                  <Empty icon="🧾" text="No payments recorded yet." />
                ) : (
                  <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, overflow: 'hidden' }}>
                    {c.fees.history.map((p, i) => (
                      <div key={p.id} style={{
                        display: 'flex', gap: 10, padding: '10px 12px', flexWrap: 'wrap', alignItems: 'center',
                        background: i % 2 ? BG : '#fff', fontSize: 13,
                      }}>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontWeight: 700 }}>{ugx(p.amount)}</div>
                          <div style={{ fontSize: 11, color: SUB }}>{p.note || '—'}</div>
                        </div>
                        <div style={{ minWidth: 110 }}>
                          <div>{p.method}</div>
                          <div style={{ fontSize: 11, color: SUB }}>{fmtDate(p.date)} • {p.ref}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Marks */}
            <section>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: PINK, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>📊 Recent Marks / Exam Results</h3>
              {c.marks.length === 0 ? (
                <Empty icon="📈" text="No marks published yet." />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  {c.marks.map((m) => (
                    <div key={m.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, background: gradeColor(m.grade) + '20',
                        color: gradeColor(m.grade), fontWeight: 800, fontSize: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{m.grade}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{m.subject}</div>
                        <div style={{ fontSize: 11, color: SUB }}>{m.score} / {m.max} • {m.exam}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Teacher comments */}
            <section>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: PINK, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>💬 Teacher Comments</h3>
              {c.comments.length === 0 ? (
                <Empty icon="💬" text="No comments yet." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {c.comments.map((cm) => (
                    <div key={cm.id} style={{ ...card, borderLeft: `4px solid ${PINK}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <strong style={{ fontSize: 13 }}>{cm.teacher}</strong>
                        <span style={{ fontSize: 11, color: SUB }}>{fmtDate(cm.date)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: INK, lineHeight: 1.5 }}>{cm.comment}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Upcoming events */}
            <section>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: PINK, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>📌 Upcoming Events ({c.className})</h3>
              {c.events.length === 0 ? (
                <Empty icon="📭" text="No upcoming events for this class." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {c.events.map((ev) => (
                    <div key={ev.id} style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{
                        width: 46, textAlign: 'center', flexShrink: 0,
                      }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: PINK }}>
                          {new Date(ev.date).getDate()}
                        </div>
                        <div style={{ fontSize: 10, color: SUB, textTransform: 'uppercase' }}>
                          {new Date(ev.date).toLocaleDateString('en-GB', { month: 'short' })}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{ev.title}</div>
                        <div style={{ fontSize: 11, color: SUB }}>🕐 {ev.time} • 📍 {ev.venue}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    );
  };

  // ── Lookup section ──────────────────────────────────────────────────────────
  const renderLookup = () => (
    <div style={{
      padding: 24, borderRadius: 12, background: `linear-gradient(135deg, ${PINK_LIGHT} 0%, #fff 100%)`,
      border: `1px solid ${PINK_LIGHT}`,
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontSize: 40 }}>👨‍👩‍👧</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: PINK_DARK }}>Find your children</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: SUB }}>
            Enter the phone number registered with the school. We&rsquo;ll show every child linked to it.
          </p>
        </div>
      </div>
      <form onSubmit={handleLookup} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <input
          type="tel"
          placeholder="e.g. +256 789 736 737"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ ...input, flex: 1, minWidth: 240 }}
          aria-label="Parent phone number"
        />
        <button type="submit" style={btnPrimary}>🔍 Look Up</button>
        {lookedUp && (
          <button type="button" onClick={resetLookup} style={btnGhost}>Reset</button>
        )}
      </form>
      {phoneErr && (
        <div style={{ marginTop: 8, color: '#d32f2f', fontSize: 12, fontWeight: 600 }}>⚠ {phoneErr}</div>
      )}
      <div style={{ marginTop: 10, fontSize: 11, color: SUB }}>
        💡 Demo tip — try <button onClick={() => setPhone(PARENT_PHONE)} style={{ background: 'none', border: 0, color: PINK, fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>{PARENT_PHONE}</button> to see 3 sample children.
      </div>
    </div>
  );

  // ── Children grid ───────────────────────────────────────────────────────────
  const renderChildrenGrid = () => {
    if (!lookedUp) {
      return <Empty icon="🔢" text="Look up by phone above to see your children." />;
    }
    if (foundChildren.length === 0) {
      return (
        <Empty icon="🔍" text={`No children found for "${lookupPhone}". Check the number and try again, or contact the school office to update your records.`} />
      );
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {foundChildren.map((c) => {
          const pct = c.attendance.total ? Math.round((c.attendance.present / c.attendance.total) * 1000) / 10 : 0;
          return (
            <div key={c.id} style={{
              ...card, cursor: 'pointer', padding: 18,
              border: `1px solid ${LINE}`, transition: 'all .15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = PINK; e.currentTarget.style.boxShadow = `0 4px 14px ${PINK}33`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = LINE; e.currentTarget.style.boxShadow = 'none'; }}
              onClick={() => setSelectedChildId(c.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar child={c} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: INK }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: SUB }}>{c.className}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: SUB }}>Attendance</span>
                <strong style={{ color: pct >= 90 ? '#0b8043' : pct >= 75 ? '#f9ab00' : '#d32f2f' }}>{pct}%</strong>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: '#eee', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: PINK }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: SUB }}>Fees balance</span>
                <strong style={{ color: c.fees.balance > 0 ? '#d32f2f' : '#0b8043' }}>{ugx(c.fees.balance)}</strong>
              </div>
              <div style={{
                marginTop: 12, padding: '8px 12px', background: PINK_FAINT, color: PINK,
                borderRadius: 6, textAlign: 'center', fontSize: 12, fontWeight: 700,
              }}>View details →</div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Announcements ──────────────────────────────────────────────────────────
  const renderAnnouncements = () => {
    if (announcements.length === 0) return <Empty icon="📢" text="No school announcements yet." />;
    const sorted = [...announcements].sort((a, b) => (a.date < b.date ? 1 : -1));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((an) => {
          const meta = an.priority === 'high' ? { bg: '#fdecea', color: '#d32f2f', label: '🔥 High' }
            : an.priority === 'medium' ? { bg: '#fef7e0', color: '#f9ab00', label: '📌 Medium' }
            : { bg: '#e6f4ea', color: '#0b8043', label: 'Low' };
          return (
            <div key={an.id} style={{ ...card, borderLeft: `4px solid ${PINK}` }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 15, color: INK }}>{an.title}</h3>
                <span style={{ background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>{meta.label}</span>
              </div>
              <div style={{ fontSize: 11, color: SUB, marginBottom: 8 }}>{fmtDate(an.date)} • by {an.author}</div>
              <p style={{ margin: 0, fontSize: 13, color: INK, lineHeight: 1.6 }}>{an.body}</p>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Calendar ────────────────────────────────────────────────────────────────
  const renderCalendar = () => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Mon-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const monthEvents = calendar
      .filter((e) => {
        const ed = new Date(e.date);
        return ed.getFullYear() === year && ed.getMonth() === month;
      })
      .reduce((acc, e) => {
        const day = new Date(e.date).getDate();
        (acc[day] = acc[day] || []).push(e);
        return acc;
      }, {});
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const upcoming = [...calendar]
      .filter((e) => new Date(e.date) >= new Date(todayISO()))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} style={btnGhost}>← Prev</button>
          <h3 style={{ margin: 0, fontSize: 16, color: PINK_DARK }}>
            {calMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} style={btnGhost}>Next →</button>
        </div>

        {/* legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, fontSize: 11, color: SUB }}>
          {Object.entries(CAL_TYPE_META).map(([k, m]) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: m.color, display: 'inline-block' }} />
              {m.label}
            </span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
          {weekdays.map((w) => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: SUB, padding: '6px 0' }}>{w}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={'e' + i} style={{ background: BG, borderRadius: 6 }} />;
            const evs = monthEvents[d] || [];
            const isToday = (function () {
              const t = new Date();
              return year === t.getFullYear() && month === t.getMonth() && d === t.getDate();
            })();
            return (
              <div key={d} style={{
                minHeight: 56, padding: 4, borderRadius: 6, fontSize: 11,
                background: evs.length ? PINK_FAINT : '#fff',
                border: `1px solid ${evs.length ? PINK_LIGHT : LINE}`,
              }}>
                <div style={{ fontWeight: 700, color: isToday ? '#fff' : INK, background: isToday ? PINK : 'transparent', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 0 4px' }}>{d}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {evs.slice(0, 2).map((e) => {
                    const m = CAL_TYPE_META[e.type] || CAL_TYPE_META.term;
                    return (
                      <div key={e.id} title={e.title} style={{
                        fontSize: 9, color: m.color, fontWeight: 700,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{m.icon} {e.title}</div>
                    );
                  })}
                  {evs.length > 2 && <div style={{ fontSize: 9, color: SUB }}>+{evs.length - 2} more</div>}
                </div>
              </div>
            );
          })}
        </div>

        <h4 style={{ margin: '0 0 10px', fontSize: 13, color: PINK, textTransform: 'uppercase', letterSpacing: 0.4 }}>Upcoming</h4>
        {upcoming.length === 0 ? (
          <Empty icon="📭" text="No upcoming calendar events." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcoming.map((e) => {
              const m = CAL_TYPE_META[e.type] || CAL_TYPE_META.term;
              return (
                <div key={e.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, background: m.color + '18',
                    color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                  }}>{m.icon}</div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: SUB }}>{fmtDate(e.date)} • {m.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── Messaging ───────────────────────────────────────────────────────────────
  const renderMessaging = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form onSubmit={sendMessage} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 14, color: PINK, fontWeight: 800 }}>✉️ Send a message to a teacher</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 200, fontSize: 12, color: SUB }}>
            Child
            <select value={msgChildId} onChange={(e) => setMsgChildId(e.target.value)} style={{ ...input, marginTop: 4, width: '100%' }}>
              <option value="">— Select child —</option>
              {foundChildren.length > 0
                ? foundChildren.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.className})</option>)
                : children.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.className})</option>)}
            </select>
          </label>
          <label style={{ flex: 1, minWidth: 200, fontSize: 12, color: SUB }}>
            Recipient
            <select value={msgTeacher} onChange={(e) => setMsgTeacher(e.target.value)} style={{ ...input, marginTop: 4, width: '100%' }}>
              {TEACHERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <label style={{ fontSize: 12, color: SUB }}>
          Subject
          <input type="text" value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} placeholder="e.g. Homework query for week 8" style={{ ...input, marginTop: 4, width: '100%' }} />
        </label>
        <label style={{ fontSize: 12, color: SUB }}>
          Message
          <textarea value={msgBody} onChange={(e) => setMsgBody(e.target.value)} rows={4} placeholder="Write your message… (min 10 characters)" style={{ ...input, marginTop: 4, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
        </label>
        {msgErr && <div style={{ color: '#d32f2f', fontSize: 12, fontWeight: 600 }}>⚠ {msgErr}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" style={btnPrimary}>📨 Send Message</button>
        </div>
      </form>

      <div>
        <h4 style={{ margin: '0 0 10px', fontSize: 13, color: PINK, textTransform: 'uppercase', letterSpacing: 0.4 }}>Sent Messages</h4>
        {messages.length === 0 ? (
          <Empty icon="📭" text="No messages sent yet. Use the form above to write to a teacher." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ ...card, borderLeft: `4px solid ${PINK}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13 }}>{m.subject}</strong>
                  <span style={{ fontSize: 11, color: SUB }}>{fmtDateTime(m.date)}</span>
                </div>
                <div style={{ fontSize: 11, color: SUB, marginBottom: 6 }}>
                  To: {m.teacher} • Re: {m.childName} ({m.className})
                </div>
                <div style={{ fontSize: 13, color: INK, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                <div style={{ marginTop: 6, fontSize: 11 }}>
                  <span style={{ background: '#e6f4ea', color: '#0b8043', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>✓ {m.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'children', label: 'My Children', icon: '👧' },
    { id: 'announcements', label: 'Announcements', icon: '📢' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'messages', label: 'Message Teacher', icon: '✉️' },
  ];

  return (
    <div className="page-container">
      <style>{`
        @media (max-width: 600px) {
          .pp-tabs { flex-direction: column !important; }
          .pp-tabs button { width: 100% !important; }
        }
      `}</style>

      <h1 className="page-title" style={{ color: PINK_DARK }}>👨‍👩‍👧 Parent Portal</h1>
      <p style={{ color: SUB, fontSize: 14, marginBottom: 20 }}>
        Look up your children, view attendance & fees, read school announcements, track the term calendar, and message teachers — all in one place.
      </p>

      {/* Lookup (always at top) */}
      {renderLookup()}

      {/* Tab nav */}
      <div className="pp-tabs" style={{ display: 'flex', gap: 8, margin: '20px 0 16px', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabBtn(t.id)}>
            <span>{t.icon}</span><span>{t.label}</span>
            {t.id === 'messages' && messages.length > 0 && (
              <span style={{
                background: activeTab === 'messages' ? '#fff' : PINK, color: activeTab === 'messages' ? PINK : '#fff',
                borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 800,
              }}>{messages.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {activeTab === 'children' && (
        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: INK }}>
            {lookedUp ? `Children linked to ${lookupPhone} (${foundChildren.length})` : 'Children'}
          </h2>
          {renderChildrenGrid()}
        </div>
      )}
      {activeTab === 'announcements' && renderAnnouncements()}
      {activeTab === 'calendar' && renderCalendar()}
      {activeTab === 'messages' && renderMessaging()}

      {/* Child detail modal */}
      {selectedChild && renderChildDetail()}

      {/* Footer note */}
      <div style={{
        marginTop: 28, padding: 14, background: PINK_FAINT, borderRadius: 8, fontSize: 11, color: PINK_DARK, lineHeight: 1.6,
      }}>
        🔒 Your data is stored locally in this browser for demo purposes. In production, the Parent Portal is backed by Supabase with row-level security — parents can only view children linked to their verified phone number.
      </div>
    </div>
  );
}
