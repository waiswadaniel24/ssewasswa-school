// Ssewasswa Comforts — Parent Portal (Expanded)
// Parents look up their children by phone number, then view attendance, fees,
// PDF report cards (jsPDF), real Pesapal / MoMo payments, two-way teacher
// messaging with mock auto-reply, alerts preferences, school calendar, and a
// consolidated multi-child dashboard. Sample/seed data is auto-loaded on first
// visit so the page is never empty. All data is persisted to localStorage with
// the `erp_parent_` prefix.
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';

// ── Theme (Dark navy #071b2f + Pink #d81b60) ────────────────────────────────
const NAVY = '#071b2f';
const NAVY_LIGHT = '#0f2f4a';
const NAVY_DARK = '#04101f';
const PINK = '#d81b60';
const PINK_DARK = '#a0133e';
const PINK_LIGHT = '#fce4ec';
const PINK_FAINT = '#fff5f9';
const INK = '#1f1f1f';
const SUB = '#5f6368';
const LINE = '#e6e6e6';
const BG = '#fafafa';

// ── localStorage keys (prefix `erp_parent_`) ────────────────────────────────
const KEYS = {
  children: 'erp_parent_children_v1',
  announcements: 'erp_parent_announcements_v1',
  calendar: 'erp_parent_calendar_v1',
  messages: 'erp_parent_messages_v1',
  preferences: 'erp_parent_preferences_v1',
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
// Wrap every localStorage.setItem in try/catch so quota / private-mode errors
// never crash the page.
const persist = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.warn('[ParentPortal] persist failed for', key, e); }
};
const setRaw = (key, value) => {
  try { localStorage.setItem(key, value); }
  catch (e) { console.warn('[ParentPortal] setRaw failed for', key, e); }
};

// Normalize a Ugandan phone number to a canonical +256XXXXXXXXX form so that
// '+256 789 736 737', '256789736737', '0789736737', '0789 736 737' all match.
// Audit fix: previously only stripped non-digits/+ — now unifies prefixes.
const normalizePhone = (p) => {
  if (!p) return '';
  let s = String(p).toLowerCase().replace(/[^0-9+]/g, ''); // strip spaces, dashes, etc.
  if (s.startsWith('+')) s = s.slice(1);                     // strip leading +
  if (s.startsWith('256')) s = s.slice(3);                  // strip country code 256
  else if (s.startsWith('0')) s = s.slice(1);               // strip leading 0 trunk
  // Now s should be a 9-digit local number (e.g. 789736737)
  if (!s) return '';
  return '+256' + s;
};
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

// Convert grade to numeric points (for "overall position" / aggregate calc).
const gradePoints = (g) => ({ A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 }[g] || 6);

// ── Seed data ────────────────────────────────────────────────────────────────
// A single parent phone is linked to 3 children (siblings). Pre-populated so the
// demo is never empty. The lookup phone below matches all three.
const PARENT_PHONE = '+256 789 736 737';
const SCHOOL_NAME = 'Ssewasswa Comforts School';

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
  { id: 'CAL1',  date: '2025-02-03', title: 'Term 1 Begins',                 type: 'term' },
  { id: 'CAL2',  date: '2025-03-14', title: 'Inter-House Sports Day',        type: 'sports' },
  { id: 'CAL3',  date: '2025-04-04', title: "Parents' Day",                  type: 'meeting' },
  { id: 'CAL4',  date: '2025-04-18', title: 'Good Friday (Public Holiday)',  type: 'holiday' },
  { id: 'CAL5',  date: '2025-04-21', title: 'Easter Monday (Public Holiday)', type: 'holiday' },
  { id: 'CAL6',  date: '2025-04-22', title: 'Mid-Term Exams Begin',          type: 'exam' },
  { id: 'CAL7',  date: '2025-04-29', title: 'Mid-Term Exams End',            type: 'exam' },
  { id: 'CAL8',  date: '2025-05-02', title: 'Mid-Term Break Begins',        type: 'holiday' },
  { id: 'CAL9',  date: '2025-05-10', title: 'Athletics Finals',             type: 'sports' },
  { id: 'CAL10', date: '2025-05-12', title: 'School Resumes',                type: 'term' },
  { id: 'CAL11', date: '2025-05-30', title: 'Career Day',                    type: 'meeting' },
  { id: 'CAL12', date: '2025-06-20', title: 'Swimming Gala',                type: 'sports' },
  { id: 'CAL13', date: '2025-06-27', title: 'Term 1 Closes',                type: 'term' },
];

const CAL_TYPE_META = {
  term:    { icon: '🏫', color: '#1a73e8', label: 'Term' },
  exam:    { icon: '📝', color: '#d32f2f', label: 'Exam' },
  holiday: { icon: '🌴', color: '#0b8043', label: 'Holiday' },
  meeting: { icon: '🤝', color: PINK,     label: 'Meeting' },
  sports:  { icon: '⚽', color: '#6a1b9a', label: 'Sports' },
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

// Default alerts-preferences seed.
const SEED_PREFERENCES = {
  channels: { sms: true, email: true, whatsapp: false },
  topics: { attendance: true, fees: true, marks: true, announcements: true, calendar: true },
  phone: PARENT_PHONE,
  email: '',
  savedAt: null,
};

const ALERT_TOPICS = [
  { id: 'attendance',   label: 'Attendance alerts (absence, lateness)' },
  { id: 'fees',         label: 'Fees reminders & receipts' },
  { id: 'marks',        label: 'New marks / exam results published' },
  { id: 'announcements', label: 'School announcements' },
  { id: 'calendar',     label: 'Calendar events & reminders' },
];

const ALERT_CHANNELS = [
  { id: 'sms',      label: 'SMS',       icon: '💬' },
  { id: 'email',    label: 'Email',     icon: '📧' },
  { id: 'whatsapp', label: 'WhatsApp',  icon: '🟢' },
];

// ── Main component ───────────────────────────────────────────────────────────
export default function ParentPortal() {
  const [children, setChildren] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [messages, setMessages] = useState([]);
  const [preferences, setPreferences] = useState(SEED_PREFERENCES);

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
  const [msgSending, setMsgSending] = useState(false);

  // payment state
  const [payingChildId, setPayingChildId] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState(null); // { childId, html }

  // preferences form state (local working copy until saved)
  const [prefsDraft, setPrefsDraft] = useState(SEED_PREFERENCES);
  const [prefsSavedAt, setPrefsSavedAt] = useState(null);

  // calendar state (lifted to top level so hooks aren't called conditionally)
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Used to ensure the 5-second mock reply setTimeout can read latest messages
  // without a stale closure.
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // seed sample data once
  useEffect(() => {
    const seeded = load(KEYS.seeded, null);
    if (!seeded) {
      persist(KEYS.children, SEED_CHILDREN);
      persist(KEYS.announcements, SEED_ANNOUNCEMENTS);
      persist(KEYS.calendar, SEED_CALENDAR);
      persist(KEYS.messages, []);
      persist(KEYS.preferences, SEED_PREFERENCES);
      setRaw(KEYS.seeded, '1');
    }
    setChildren(load(KEYS.children, []));
    setAnnouncements(load(KEYS.announcements, []));
    setCalendar(load(KEYS.calendar, []));
    setMessages(load(KEYS.messages, []));
    const prefs = load(KEYS.preferences, SEED_PREFERENCES);
    setPreferences(prefs);
    setPrefsDraft(prefs);
  }, []);

  // ESC key handler + scroll lock when child detail modal is open (audit fix)
  useEffect(() => {
    if (!selectedChildId) return;
    const handler = (e) => {
      if (e.key === 'Escape') setSelectedChildId(null);
    };
    window.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [selectedChildId]);

  // persist helpers
  const saveMessages = useCallback((next) => { setMessages(next); persist(KEYS.messages, next); }, []);
  const savePreferences = useCallback((next) => { setPreferences(next); persist(KEYS.preferences, next); }, []);

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
    if (!norm) { setPhoneErr('That phone number looks invalid.'); return; }
    if (norm.length < 12) { setPhoneErr('That phone number looks too short.'); return; }
    if (!/^\+256\d{9}$/.test(norm)) { setPhoneErr('Phone must be a valid Ugandan number (+256XXXXXXXXX).'); return; }
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

  // ── Real payment integration (Pesapal → manual MoMo fallback) ───────────────
  const showManualMoMoNotice = (child) => {
    setPaymentNotice({
      childId: child.id,
      html: (
        <div style={{ fontSize: 13, color: INK, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 800, color: PINK_DARK, marginBottom: 8 }}>
            📱 Manual Mobile Money — {child.name}
          </div>
          <div>Outstanding balance: <strong>{ugx(child.fees.balance)}</strong></div>
          <div style={{ marginTop: 8 }}>
            Please send the exact amount to one of:
          </div>
          <ul style={{ margin: '6px 0 6px 18px', padding: 0 }}>
            <li><strong>MTN MoMo</strong> — 0789 736 737 (Ssewasswa Comforts)</li>
            <li><strong>Airtel Money</strong> — 0752 971 118 (Ssewasswa Comforts)</li>
          </ul>
          <div>Reference: <code style={{ background: PINK_FAINT, color: PINK_DARK, padding: '2px 6px', borderRadius: 4 }}>FEES-{child.id}</code></div>
          <div style={{ marginTop: 8, fontSize: 12, color: SUB }}>
            After paying, send the transaction ID + screenshot to WhatsApp +256 752 971 118
            to have your balance updated. Receipts are issued at the Bursar&rsquo;s office.
          </div>
        </div>
      ),
    });
  };

  const handlePayNow = async (child) => {
    if (!child.fees.balance || child.fees.balance <= 0) {
      setPaymentNotice({ childId: child.id, html: <div style={{ color: '#0b8043', fontWeight: 700 }}>✅ No outstanding balance for {child.name}.</div> });
      return;
    }

    // Confirm with parent — give them the choice between Pesapal and manual MoMo.
    const wantsPesapal = window.confirm(
      `You are about to pay ${ugx(child.fees.balance)} for ${child.name}.\n\n` +
      `Click OK to be redirected to Pesapal (card / mobile money / bank).\n` +
      `Click Cancel to view manual MoMo instructions instead.`
    );

    if (!wantsPesapal) {
      showManualMoMoNotice(child);
      return;
    }

    setPayingChildId(child.id);
    setPaymentNotice(null);
    const reference = 'FEES-' + child.id + '-' + Date.now();
    const email = preferences.email || (lookupPhone ? 'parent@ssewasswa.sc.ug' : '');

    try {
      const res = await fetch('/api/pesapal-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: child.fees.balance,
          email: email || 'parent@ssewasswa.sc.ug',
          reference,
          customer_name: child.name + ' (Parent)',
          childId: child.id,
        }),
      });

      // Gracefully handle non-JSON / network errors
      let data = null;
      try { data = await res.json(); } catch { data = null; }

      // Look for a redirect URL under any of the common field names.
      const redirect = data && (data.redirect_url || data.redirect || data.url || (data.status === 'ok' && data.longurl));
      if (redirect) {
        window.location.href = redirect;
        return;
      }

      // Server explicitly returned manual fallback (e.g. missing Pesapal creds)
      if (data && data.status === 'manual') {
        showManualMoMoNotice(child);
        return;
      }

      // Anything else — show manual MoMo instructions.
      showManualMoMoNotice(child);
    } catch (err) {
      console.warn('[ParentPortal] Pesapal initiation failed, falling back to manual MoMo', err);
      showManualMoMoNotice(child);
    } finally {
      setPayingChildId(null);
    }
  };

  // ── Message form (with 5-second mock teacher auto-reply) ───────────────────
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
      reply: null, // populated by mock auto-reply below
    };
    const next = [msg, ...messages];
    saveMessages(next);
    setMsgSubject(''); setMsgBody(''); setMsgErr('');
    setMsgSending(true);
    // optimistic UI: "sent" badge
    setTimeout(() => setMsgSending(false), 800);

    // ── MOCK TEACHER AUTO-REPLY (5s delayed) ────────────────────────────────
    // Stored alongside the parent's message in localStorage 'erp_parent_messages_v1'
    // so the conversation persists across reloads.
    setTimeout(() => {
      const childRef = child ? child.name : 'your child';
      const replies = [
        `Thank you for your message regarding ${childRef}. I'll review and respond fully within 48 hours.`,
        `Noted — I'll discuss this with ${childRef} during the next class. Please feel free to reach out anytime.`,
        `Acknowledged with thanks. I'll send an update by end of week. Kind regards, ${msgTeacher}.`,
        `Thank you. Let's work together to support ${childRef}'s progress. Looking forward to our continued partnership.`,
      ];
      const reply = {
        date: new Date().toISOString(),
        body: replies[Math.floor(Math.random() * replies.length)],
        teacher: msgTeacher,
      };
      // Use the ref so we never race with stale state.
      const current = messagesRef.current;
      const updated = current.map((m) => m.id === msg.id ? { ...m, reply, status: 'replied' } : m);
      saveMessages(updated);
    }, 5000);
  };

  // Delete a message with confirmation (audit fix).
  const deleteMessage = (id) => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;
    saveMessages(messages.filter((m) => m.id !== id));
  };

  // ── PDF report card (jsPDF) ────────────────────────────────────────────────
  const downloadReportCard = (child) => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();   // 210
      const margin = 15;
      let y = 0;

      // ── Navy header band ────────────────────────────────────────────────────
      doc.setFillColor(7, 27, 47); // #071b2f
      doc.rect(0, 0, pageW, 34, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(SCHOOL_NAME.toUpperCase(), pageW / 2, 14, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('P.O. Box 2002, Kampala, Uganda  •  +256 789 736 737  •  info@ssewasswa.sc.ug', pageW / 2, 21, { align: 'center' });
      doc.setTextColor(216, 27, 96); // #d81b60
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PROGRESS REPORT CARD', pageW / 2, 28, { align: 'center' });

      y = 44;
      doc.setTextColor(20, 20, 20);

      // ── Student / term info ───────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('STUDENT DETAILS', margin, y);
      y += 2;
      doc.setDrawColor(216, 27, 96);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 5;

      const rows = [
        ['Student Name:', child.name,                 'Class:',    child.className],
        ['Student ID:',  child.id,                    'Stream:',   child.stream || '—'],
        ['Gender:',      child.gender === 'F' ? 'Female' : 'Male', 'Date of Birth:', fmtDate(child.dob)],
        ['Term:',        'Term 1, 2025',              'Examination:', 'Term 1 Opener'],
      ];
      doc.setFontSize(10);
      rows.forEach((r) => {
        doc.setFont('helvetica', 'bold');
        doc.text(r[0], margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(r[1], margin + 32, y);
        doc.setFont('helvetica', 'bold');
        doc.text(r[2], pageW / 2, y);
        doc.setFont('helvetica', 'normal');
        doc.text(r[3], pageW / 2 + 22, y);
        y += 6;
      });

      y += 4;
      // ── Marks table ────────────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SUBJECTS & MARKS', margin, y);
      y += 2;
      doc.setDrawColor(216, 27, 96);
      doc.line(margin, y, pageW - margin, y);
      y += 5;

      // Table header
      const colX = { subject: margin, score: margin + 90, grade: margin + 130, remark: margin + 150 };
      doc.setFillColor(7, 27, 47);
      doc.rect(margin, y - 4, pageW - margin * 2, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Subject', colX.subject, y + 1);
      doc.text('Score', colX.score, y + 1);
      doc.text('Grade', colX.grade, y + 1);
      doc.text('Remark', colX.remark, y + 1);
      y += 8;

      const remarkFor = (g) => ({ A: 'Excellent', B: 'Very Good', C: 'Good', D: 'Fair', E: 'Needs Effort', F: 'Below Average' }[g] || '—');

      if (child.marks.length === 0) {
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'italic');
        doc.text('No marks published yet.', margin, y + 1);
        y += 8;
      } else {
        child.marks.forEach((m, i) => {
          if (i % 2 === 0) {
            doc.setFillColor(250, 245, 249);
            doc.rect(margin, y - 4, pageW - margin * 2, 7, 'F');
          }
          doc.setTextColor(20, 20, 20);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.text(m.subject, colX.subject, y + 1);
          doc.text(`${m.score} / ${m.max}`, colX.score, y + 1);
          doc.setTextColor(...({ A: [11, 128, 67], B: [26, 115, 232], C: [249, 171, 0], D: [255, 109, 0], E: [211, 47, 47], F: [211, 47, 47] }[m.grade] || [120, 120, 120]));
          doc.setFont('helvetica', 'bold');
          doc.text(m.grade, colX.grade, y + 1);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(remarkFor(m.grade), colX.remark, y + 1);
          y += 7;
        });
      }

      // ── Aggregate + overall position ──────────────────────────────────────
      y += 4;
      const total = child.marks.reduce((s, m) => s + m.score, 0);
      const maxTotal = child.marks.reduce((s, m) => s + m.max, 0);
      const avg = maxTotal ? Math.round((total / maxTotal) * 1000) / 10 : 0;
      const agg = child.marks.length ? Math.round(child.marks.reduce((s, m) => s + gradePoints(m.grade), 0) / child.marks.length) : 0;
      const overallGrade = agg <= 1 ? 'A' : agg === 2 ? 'B' : agg === 3 ? 'C' : agg === 4 ? 'D' : agg === 5 ? 'E' : 'F';
      // Mock overall position out of class size.
      const classSize = 38;
      const position = overallGrade === 'A' ? Math.floor(Math.random() * 3) + 1
        : overallGrade === 'B' ? Math.floor(Math.random() * 8) + 4
        : overallGrade === 'C' ? Math.floor(Math.random() * 12) + 12
        : Math.floor(Math.random() * 8) + 24;

      doc.setFillColor(252, 228, 236); // PINK_LIGHT
      doc.rect(margin, y - 2, pageW - margin * 2, 22, 'F');
      doc.setTextColor(216, 27, 96);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('SUMMARY', margin + 3, y + 3);
      doc.setFontSize(9);
      doc.text(`Total: ${total} / ${maxTotal}`, margin + 3, y + 9);
      doc.text(`Average: ${avg}%`, margin + 3, y + 14);
      doc.text(`Overall Grade: ${overallGrade}`, margin + 70, y + 9);
      doc.text(`Overall Position: ${position} / ${classSize}`, margin + 70, y + 14);
      y += 26;

      // ── Teacher comments ──────────────────────────────────────────────────
      doc.setTextColor(20, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TEACHER COMMENTS', margin, y);
      y += 2;
      doc.setDrawColor(216, 27, 96);
      doc.line(margin, y, pageW - margin, y);
      y += 6;
      doc.setFontSize(9);
      if (child.comments.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('No comments recorded.', margin, y + 1);
        y += 8;
      } else {
        child.comments.forEach((cm) => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(216, 27, 96);
          doc.text(`${cm.teacher} — ${fmtDate(cm.date)}`, margin, y + 1);
          y += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40);
          const lines = doc.splitTextToSize(cm.comment, pageW - margin * 2);
          doc.text(lines, margin, y + 1);
          y += lines.length * 4 + 3;
        });
      }

      y += 4;
      // ── Attendance summary line ───────────────────────────────────────────
      const a = child.attendance || { present: 0, absent: 0, total: 0 };
      const pct = a.total ? Math.round((a.present / a.total) * 1000) / 10 : 0;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(7, 27, 47);
      doc.text(`Attendance: ${a.present}/${a.total} days present (${pct}%)`, margin, y + 1);
      y += 8;

      // ── Signatures row ─────────────────────────────────────────────────────
      y = Math.max(y, 240);
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.3);
      doc.line(margin, y, margin + 70, y);
      doc.line(pageW - margin - 70, y, pageW - margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text('Class Teacher', margin, y + 4);
      doc.text('Head Teacher', pageW - margin - 70, y + 4);

      // ── Footer (page 1) ───────────────────────────────────────────────────
      doc.setFillColor(7, 27, 47);
      doc.rect(0, 287, pageW, 10, 'F');
      doc.setTextColor(216, 27, 96);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Ssewasswa Comforts School ERP — Progress Report', margin, 293);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated ${fmtDateTime(new Date().toISOString())}`, pageW - margin, 293, { align: 'right' });

      doc.save(`ReportCard-${child.name.replace(/\s+/g, '_')}-${child.id}.pdf`);
    } catch (err) {
      console.error('[ParentPortal] PDF generation failed', err);
      alert('Sorry — could not generate the PDF report card. ' + (err && err.message ? err.message : ''));
    }
  };

  // ── Preferences save ────────────────────────────────────────────────────────
  const handlePrefsChange = (patch) => setPrefsDraft((p) => ({ ...p, ...patch }));
  const savePrefs = (e) => {
    e?.preventDefault?.();
    const next = { ...prefsDraft, savedAt: new Date().toISOString() };
    savePreferences(next);
    setPrefsSavedAt(next.savedAt);
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
  const btnNavy = {
    padding: '10px 18px', background: NAVY, color: '#fff', border: 0,
    borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  };
  const btnDanger = {
    padding: '6px 10px', background: '#fff', color: '#d32f2f',
    border: `1px solid #d32f2f`, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 11,
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

  // ── Child detail modal (with role="dialog" aria-modal="true" + ESC handler) ─
  const renderChildDetail = () => {
    if (!selectedChild) return null;
    const c = selectedChild;
    const a = c.attendance || { present: 0, absent: 0, total: 0 };
    const pct = a.total ? Math.round((a.present / a.total) * 1000) / 10 : 0;
    const attColor = pct >= 90 ? '#0b8043' : pct >= 75 ? '#f9ab00' : '#d32f2f';
    const isPaying = payingChildId === c.id;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${c.name} details`}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(4,16,31,0.65)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          overflowY: 'auto', padding: '24px 12px',
        }} onClick={() => setSelectedChildId(null)}>
        <div
          style={{
            background: '#fff', borderRadius: 14, maxWidth: 820, width: '100%',
            margin: '0 auto', boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          }} onClick={(e) => e.stopPropagation()}>
          {/* header */}
          <div style={{
            padding: '20px 24px', background: `linear-gradient(135deg, ${NAVY} 0%, ${PINK_DARK} 100%)`,
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
              style={{ ...btnGhost, color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
              aria-label="Close detail">✕ Close</button>
          </div>

          {/* body */}
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Payment notice (Pesapal redirect result / manual MoMo instructions) */}
            {paymentNotice && paymentNotice.childId === c.id && (
              <div style={{ ...card, background: PINK_FAINT, border: `1px solid ${PINK_LIGHT}` }}>
                {paymentNotice.html}
                <div style={{ textAlign: 'right', marginTop: 10 }}>
                  <button onClick={() => setPaymentNotice(null)} style={btnGhost}>Dismiss</button>
                </div>
              </div>
            )}

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

            {/* Fees + Real payment integration */}
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
                <button onClick={() => handlePayNow(c)} style={btnPrimary} disabled={isPaying}>
                  {isPaying ? '⏳ Redirecting…' : '💳 Pay Now'}
                </button>
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

            {/* Marks + Download report card (PDF) */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14, color: PINK, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>📊 Recent Marks / Exam Results</h3>
                <button onClick={() => downloadReportCard(c)} style={btnNavy}>
                  📄 Download PDF Report Card
                </button>
              </div>
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
      padding: 24, borderRadius: 12, background: `linear-gradient(135deg, ${NAVY} 0%, ${PINK_DARK} 100%)`,
      border: 0, color: '#fff',
    }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontSize: 40 }}>👨‍👩‍👧</div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#fff' }}>Find your children</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
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
          style={{ ...input, flex: 1, minWidth: 240, background: '#fff' }}
          aria-label="Parent phone number"
        />
        <button type="submit" style={btnPrimary}>🔍 Look Up</button>
        {lookedUp && (
          <button type="button" onClick={resetLookup}
            style={{ ...btnGhost, background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}>Reset</button>
        )}
      </form>
      {phoneErr && (
        <div style={{ marginTop: 8, color: '#ffd2dc', fontSize: 12, fontWeight: 600 }}>⚠ {phoneErr}</div>
      )}
      <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
        💡 Demo tip — try{' '}
        <button onClick={() => setPhone(PARENT_PHONE)}
          style={{ background: 'none', border: 0, color: PINK_LIGHT, fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
          {PARENT_PHONE}
        </button>{' '}
        to see 3 sample children.
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
              onClick={() => { setSelectedChildId(c.id); setPaymentNotice(null); }}
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

  // ── Multi-child dashboard (consolidated table) ──────────────────────────────
  const renderDashboard = () => {
    if (!lookedUp) return <Empty icon="📊" text="Look up by phone above to see your consolidated dashboard." />;
    if (foundChildren.length === 0) return <Empty icon="🔍" text="No children found for this phone number." />;
    if (foundChildren.length === 1) return <Empty icon="ℹ️" text="You have one child linked — open their card for full details. The dashboard view becomes useful when multiple children are linked." />;

    // Aggregate metrics
    const totalFees = foundChildren.reduce((s, c) => s + (c.fees.balance || 0), 0);
    const avgAttendance = foundChildren.length
      ? Math.round(foundChildren.reduce((s, c) => {
          const a = c.attendance || {};
          return s + (a.total ? (a.present / a.total) * 100 : 0);
        }, 0) / foundChildren.length * 10) / 10
      : 0;

    return (
      <div>
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ ...card, background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)`, color: '#fff', border: 0 }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Children Linked</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{foundChildren.length}</div>
          </div>
          <div style={{ ...card, background: PINK_FAINT, border: `1px solid ${PINK_LIGHT}` }}>
            <div style={{ fontSize: 11, color: PINK_DARK }}>Total Fees Outstanding</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: totalFees > 0 ? '#d32f2f' : '#0b8043' }}>{ugx(totalFees)}</div>
          </div>
          <div style={{ ...card, background: '#e6f4ea', border: '1px solid #c6e6d0' }}>
            <div style={{ fontSize: 11, color: '#0b8043' }}>Avg. Attendance</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: avgAttendance >= 90 ? '#0b8043' : avgAttendance >= 75 ? '#f9ab00' : '#d32f2f' }}>{avgAttendance}%</div>
          </div>
          <div style={{ ...card }}>
            <div style={{ fontSize: 11, color: SUB }}>Term</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY }}>Term 1, 2025</div>
          </div>
        </div>

        {/* Consolidated table */}
        <div style={{ overflowX: 'auto', border: `1px solid ${LINE}`, borderRadius: 10, background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ background: NAVY, color: '#fff' }}>
                <th style={{ textAlign: 'left', padding: '12px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>Child</th>
                <th style={{ textAlign: 'left', padding: '12px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>Class</th>
                <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>Attendance</th>
                <th style={{ textAlign: 'right', padding: '12px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>Fees Balance</th>
                <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>Latest Mark</th>
                <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>Subjects</th>
                <th style={{ textAlign: 'right', padding: '12px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {foundChildren.map((c, i) => {
                const a = c.attendance || {};
                const pct = a.total ? Math.round((a.present / a.total) * 1000) / 10 : 0;
                const last = c.marks[c.marks.length - 1];
                return (
                  <tr key={c.id} style={{ background: i % 2 ? BG : '#fff', borderTop: `1px solid ${LINE}` }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar child={c} size={32} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: SUB }}>{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: SUB }}>{c.className}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: pct >= 90 ? '#0b8043' : pct >= 75 ? '#f9ab00' : '#d32f2f' }}>{pct}%</span>
                      <div style={{ fontSize: 10, color: SUB }}>{a.present}/{a.total} days</div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: c.fees.balance > 0 ? '#d32f2f' : '#0b8043' }}>
                      {ugx(c.fees.balance)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {last ? (
                        <div>
                          <span style={{ fontWeight: 700, color: gradeColor(last.grade) }}>{last.grade}</span>
                          <span style={{ color: SUB, marginLeft: 4, fontSize: 11 }}>{last.score}/{last.max}</span>
                          <div style={{ fontSize: 10, color: SUB }}>{last.subject}</div>
                        </div>
                      ) : <span style={{ color: SUB }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: SUB }}>{c.marks.length}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button onClick={() => { setSelectedChildId(c.id); setPaymentNotice(null); }} style={btnGhost}>View →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

  // ── Calendar (month grid with event dots) ──────────────────────────────────
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
          <h3 style={{ margin: 0, fontSize: 16, color: NAVY }}>
            {calMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCalMonth(new Date())} style={btnGhost}>Today</button>
            <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} style={btnGhost}>Next →</button>
          </div>
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

        {/* month grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
          {weekdays.map((w) => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff', padding: '6px 0', background: NAVY, borderRadius: 4 }}>{w}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={'e' + i} style={{ background: BG, borderRadius: 6, minHeight: 56 }} />;
            const evs = monthEvents[d] || [];
            const isToday = (function () {
              const t = new Date();
              return year === t.getFullYear() && month === t.getMonth() && d === t.getDate();
            })();
            // Collect event "dots" — one colored dot per event type present
            const dots = [...new Set(evs.map((e) => e.type))];
            return (
              <div key={d} style={{
                minHeight: 56, padding: 4, borderRadius: 6, fontSize: 11,
                background: evs.length ? PINK_FAINT : '#fff',
                border: `1px solid ${evs.length ? PINK_LIGHT : LINE}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <div style={{ fontWeight: 700, color: isToday ? '#fff' : INK, background: isToday ? PINK : 'transparent', width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d}</div>
                  {dots.length > 0 && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {dots.map((t) => {
                        const m = CAL_TYPE_META[t] || CAL_TYPE_META.term;
                        return <span key={t} title={m.label} style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, display: 'inline-block' }} />;
                      })}
                    </div>
                  )}
                </div>
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

  // ── Messaging (two-way with mock teacher auto-reply) ──────────────────────
  const renderMessaging = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form onSubmit={sendMessage} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 14, color: PINK, fontWeight: 800 }}>✉️ Send a message to a teacher</h3>
        <p style={{ margin: 0, fontSize: 11, color: SUB }}>
          Messages are stored locally and visible to your child&rsquo;s teacher on the school&rsquo;s side. Replies appear inline — usually within seconds in this demo.
        </p>
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
          {msgSending && <span style={{ fontSize: 11, color: SUB }}>⏳ Sending…</span>}
          <button type="submit" style={btnPrimary} disabled={msgSending}>📨 Send Message</button>
        </div>
      </form>

      <div>
        <h4 style={{ margin: '0 0 10px', fontSize: 13, color: PINK, textTransform: 'uppercase', letterSpacing: 0.4 }}>Sent Messages &amp; Replies</h4>
        {messages.length === 0 ? (
          <Empty icon="📭" text="No messages sent yet. Use the form above to write to a teacher." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ ...card, borderLeft: `4px solid ${PINK}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4, alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: 13 }}>{m.subject}</strong>
                    <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>
                      To: {m.teacher} • Re: {m.childName} ({m.className})
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: SUB }}>{fmtDateTime(m.date)}</span>
                    <span style={{
                      background: m.reply ? '#e6f4ea' : '#fff5f9',
                      color: m.reply ? '#0b8043' : PINK_DARK,
                      padding: '2px 8px', borderRadius: 999, fontWeight: 700, fontSize: 10,
                      border: `1px solid ${m.reply ? '#c6e6d0' : PINK_LIGHT}`,
                    }}>
                      {m.reply ? '✓ Replied' : '⏳ Awaiting reply'}
                    </span>
                    <button
                      onClick={() => deleteMessage(m.id)}
                      style={btnDanger}
                      aria-label={`Delete message: ${m.subject}`}
                      title="Delete message"
                    >🗑 Delete</button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: INK, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: BG, padding: 10, borderRadius: 6, marginBottom: m.reply ? 8 : 0 }}>
                  {m.body}
                </div>
                {m.reply && (
                  <div style={{
                    marginLeft: 16, marginTop: 6, padding: 10, borderRadius: 6,
                    background: `linear-gradient(135deg, ${PINK_FAINT} 0%, #fff 100%)`,
                    border: `1px solid ${PINK_LIGHT}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                      <strong style={{ fontSize: 12, color: PINK_DARK }}>💬 {m.reply.teacher}</strong>
                      <span style={{ fontSize: 10, color: SUB }}>{fmtDateTime(m.reply.date)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: INK, lineHeight: 1.5 }}>{m.reply.body}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Alerts preferences ──────────────────────────────────────────────────────
  const renderAlertsPreferences = () => {
    const toggleChannel = (id) => setPrefsDraft((p) => ({ ...p, channels: { ...p.channels, [id]: !p.channels[id] } }));
    const toggleTopic = (id) => setPrefsDraft((p) => ({ ...p, topics: { ...p.topics, [id]: !p.topics[id] } }));

    return (
      <form onSubmit={savePrefs} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Channels */}
        <div style={{ ...card }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, color: PINK, fontWeight: 800 }}>🔔 Notification Channels</h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: SUB }}>Choose how the school should reach you.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {ALERT_CHANNELS.map((ch) => (
              <label key={ch.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                border: `1px solid ${prefsDraft.channels[ch.id] ? PINK : LINE}`,
                borderRadius: 8, cursor: 'pointer', flex: 1, minWidth: 140,
                background: prefsDraft.channels[ch.id] ? PINK_FAINT : '#fff',
              }}>
                <input
                  type="checkbox"
                  checked={!!prefsDraft.channels[ch.id]}
                  onChange={() => toggleChannel(ch.id)}
                  style={{ width: 18, height: 18, accentColor: PINK, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 20 }}>{ch.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{ch.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Topics */}
        <div style={{ ...card }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, color: PINK, fontWeight: 800 }}>📋 Alert Topics</h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: SUB }}>Pick the kinds of alerts you want to receive.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8 }}>
            {ALERT_TOPICS.map((t) => (
              <label key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                border: `1px solid ${prefsDraft.topics[t.id] ? PINK : LINE}`,
                borderRadius: 6, cursor: 'pointer',
                background: prefsDraft.topics[t.id] ? PINK_FAINT : '#fff',
              }}>
                <input
                  type="checkbox"
                  checked={!!prefsDraft.topics[t.id]}
                  onChange={() => toggleTopic(t.id)}
                  style={{ width: 16, height: 16, accentColor: PINK, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: INK }}>{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Contact details */}
        <div style={{ ...card }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, color: PINK, fontWeight: 800 }}>📞 Contact Details</h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: SUB }}>Where should we send alerts? Keep these up to date.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: 200, fontSize: 12, color: SUB }}>
              Phone (for SMS / WhatsApp)
              <input
                type="tel"
                value={prefsDraft.phone || ''}
                onChange={(e) => handlePrefsChange({ phone: e.target.value })}
                placeholder="+256 789 736 737"
                style={{ ...input, marginTop: 4, width: '100%' }}
              />
            </label>
            <label style={{ flex: 1, minWidth: 200, fontSize: 12, color: SUB }}>
              Email (for email alerts)
              <input
                type="email"
                value={prefsDraft.email || ''}
                onChange={(e) => handlePrefsChange({ email: e.target.value })}
                placeholder="parent@example.com"
                style={{ ...input, marginTop: 4, width: '100%' }}
              />
            </label>
          </div>
        </div>

        {/* Save + status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 11, color: SUB }}>
            {prefsSavedAt
              ? `✅ Last saved ${fmtDateTime(prefsSavedAt)}`
              : (preferences.savedAt ? `Last saved ${fmtDateTime(preferences.savedAt)}` : 'Not saved yet — click below to save.')}
          </div>
          <button type="submit" style={btnPrimary}>💾 Save Preferences</button>
        </div>
      </form>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'children', label: 'My Children', icon: '👧' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'announcements', label: 'Announcements', icon: '📢' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'messages', label: 'Message Teacher', icon: '✉️' },
    { id: 'alerts', label: 'Alerts', icon: '🔔' },
  ];

  const repliedCount = messages.filter((m) => m.reply).length;

  return (
    <div className="page-container">
      <style>{`
        @media (max-width: 600px) {
          .pp-tabs { flex-direction: column !important; }
          .pp-tabs button { width: 100% !important; }
        }
        .pp-tabs button:focus-visible,
        .pp-tabbtn:focus-visible { outline: 2px solid ${PINK}; outline-offset: 2px; }
      `}</style>

      {/* Navy hero header */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DARK} 100%)`,
        color: '#fff', padding: '24px 28px', borderRadius: 14, marginBottom: 16,
        border: `1px solid ${NAVY_DARK}`,
      }}>
        <h1 className="page-title" style={{ margin: 0, color: '#fff', fontSize: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            background: PINK, width: 44, height: 44, borderRadius: 10,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>👨‍👩‍👧</span>
          Parent Portal
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '8px 0 0' }}>
          Look up your children, view attendance & fees, download PDF report cards, pay via Pesapal or MoMo,
          track the term calendar, message teachers, and manage alert preferences — all in one place.
        </p>
      </div>

      {/* Lookup (always at top) */}
      {renderLookup()}

      {/* Tab nav */}
      <div className="pp-tabs" style={{ display: 'flex', gap: 8, margin: '20px 0 16px', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabBtn(t.id)} className="pp-tabbtn">
            <span>{t.icon}</span><span>{t.label}</span>
            {t.id === 'messages' && messages.length > 0 && (
              <span style={{
                background: activeTab === 'messages' ? '#fff' : PINK, color: activeTab === 'messages' ? PINK : '#fff',
                borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 800,
              }}>{messages.length}</span>
            )}
            {t.id === 'messages' && repliedCount > 0 && (
              <span style={{
                background: '#0b8043', color: '#fff', borderRadius: 999, padding: '1px 6px', fontSize: 10, fontWeight: 800,
              }} title={`${repliedCount} replied`}>💬{repliedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {activeTab === 'children' && (
        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: NAVY }}>
            {lookedUp ? `Children linked to ${lookupPhone} (${foundChildren.length})` : 'Children'}
          </h2>
          {renderChildrenGrid()}
        </div>
      )}
      {activeTab === 'dashboard' && (
        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: NAVY }}>📊 Multi-Child Dashboard</h2>
          {renderDashboard()}
        </div>
      )}
      {activeTab === 'announcements' && renderAnnouncements()}
      {activeTab === 'calendar' && renderCalendar()}
      {activeTab === 'messages' && renderMessaging()}
      {activeTab === 'alerts' && renderAlertsPreferences()}

      {/* Child detail modal */}
      {selectedChild && renderChildDetail()}

      {/* Footer note */}
      <div style={{
        marginTop: 28, padding: 14, background: PINK_FAINT, borderRadius: 8, fontSize: 11, color: PINK_DARK, lineHeight: 1.6,
      }}>
        🔒 Your data is stored locally in this browser for demo purposes. In production, the Parent Portal is backed by Supabase with row-level security — parents can only view children linked to their verified phone number. Payments are processed securely via Pesapal.
      </div>
    </div>
  );
}
