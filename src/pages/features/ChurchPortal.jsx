// Ssewasswa Comforts — Church / Religious Org Portal (Expanded)
// Replaces the FeatureComingSoon placeholder for the church-portal route.
//
// Coverage (10 tabs):
//   • Dashboard          — KPI cards + monthly aggregates + quick charts
//   • Tithes             — per-contribution log with running monthly totals
//   • Statements         — per-member tithe statement with running total + print
//   • Pledges            — pledge campaigns with target, deadline, contributions, progress bar
//   • Donations          — fund-tagged donations (General / Building / Missions / Youth)
//   • Sermons            — sermon library with inline HTML5 audio player (play/pause/seek)
//   • Committees         — committee list + roster detail (members, minutes, attendance)
//   • Volunteers         — volunteer hour log + printable certificate generator
//   • Members            — searchable member directory with family grouping
//   • Events             — event calendar with RSVP tracking (expected vs actual)
//   • Finance            — annual income/expense summary with fund-based pie chart
//
// Theme: dark navy #071b2f + purple #9c27b0 (matches SAASPortal church-portal gradient).
// Persistence: localStorage per section (prefix erp_church_).
// Audit fixes applied:
//   ✓ `date: todayISO()` parens fixed
//   ✓ window.confirm() on EVERY delete button
//   ✓ All 10 saveX() localStorage.setItem calls wrapped in try/catch
//   ✓ status pills re-mapped to explicit {fg,bg} objects (no more index bug)
//   ✓ Form validation: rejects negative/zero amounts, validates phone format
import React, { useState, useEffect, useMemo, useRef } from 'react';

// ─── Theme (dark navy + purple) ─────────────────────────────────────────
const BG_PAGE = '#071b2f';        // dark navy
const BG_CARD = '#0c2640';        // slightly lighter navy for cards
const BG_INPUT = '#0a1f3a';       // input field background
const BG_HOVER = '#103055';       // hover state
const BORDER_DARK = '#1d3a5c';    // subtle navy border
const BORDER = '#2c455a';         // standard navy border
const TEXT = '#f7fbff';           // near-white text
const TEXT_SEC = '#8fb3c9';      // secondary cool-grey text
const MUTED = '#5d7a92';          // muted text
const PURPLE = '#9c27b0';         // brand purple
const PURPLE_DARK = '#4a148c';     // deep purple
const PURPLE_LIGHT = 'rgba(156, 39, 176, 0.12)';  // purple tint for soft fills
const PURPLE_BORDER = 'rgba(156, 39, 176, 0.35)'; // purple-tinted border
const RED = '#d32f2f';
const RED_FG = '#ff8a80';

// Status pill colour map — explicit {fg, bg} objects (fixes the index-destructuring bug).
const STATUS_COLORS = {
  active:   { fg: '#5fd178', bg: 'rgba(11, 128, 67, 0.25)',   label: 'Active' },
  visitor:  { fg: '#ffcc66', bg: 'rgba(249, 171, 0, 0.22)',    label: 'Visitor' },
  inactive: { fg: '#a0b4c5', bg: 'rgba(95, 99, 104, 0.28)',   label: 'Inactive' },
};

// Fund colour map for pie chart + pill chips.
const FUNDS = {
  general:  { label: 'General Fund',  color: '#9c27b0' },
  building: { label: 'Building Fund', color: '#00bcd4' },
  missions: { label: 'Missions Fund', color: '#ffc107' },
  youth:    { label: 'Youth Fund',    color: '#4caf50' },
  other:    { label: 'Other',         color: '#7e8aa0' },
};
const FUND_KEYS = Object.keys(FUNDS);

// ─── Tab catalog (10 tabs) ───────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',  icon: '📊', name: 'Dashboard' },
  { id: 'tithes',     icon: '💰', name: 'Tithes' },
  { id: 'statements', icon: '🧾', name: 'Statements' },
  { id: 'pledges',    icon: '🎯', name: 'Pledges' },
  { id: 'donations',  icon: '🤝', name: 'Donations' },
  { id: 'sermons',    icon: '🎙️', name: 'Sermons' },
  { id: 'committees', icon: '👥', name: 'Committees' },
  { id: 'volunteers', icon: '⏰', name: 'Volunteers' },
  { id: 'members',    icon: '📞', name: 'Members' },
  { id: 'events',     icon: '📅', name: 'Events' },
  { id: 'finance',    icon: '📈', name: 'Finance' },
];

// ─── localStorage keys (prefix erp_church_*) ───────────────────────────
const STORAGE = {
  tithes:      'erp_church_tithes',
  donations:   'erp_church_donations',
  sermons:     'erp_church_sermons',
  committees:  'erp_church_committees',
  volunteers:  'erp_church_volunteers',
  members:     'erp_church_members',
  events:      'erp_church_events',
  pledges:     'erp_church_pledges',
  expenses:    'erp_church_expenses',
  rsvps:       'erp_church_rsvps',
};

// ─── Helpers ─────────────────────────────────────────────────────────────
const uid = () => Date.now() + Math.floor(Math.random() * 100000);
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();
const fmtMoney = (n) => `UGX ${(Number(n) || 0).toLocaleString()}`;
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const monthKey = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (k) => {
  if (!k) return '';
  const [y, m] = k.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};
const thisMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const thisYear = () => new Date().getFullYear();
const yearOf = (iso) => (iso ? new Date(iso).getFullYear() : null);
const fmtTime = (s) => {
  if (!s || isNaN(Number(s))) return '0:00';
  const m = Math.floor(Number(s) / 60);
  const sec = Math.floor(Number(s) % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

// Form validation helpers (audit-fix: reject negative amounts, validate phone).
const validateAmount = (n) => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0;
};
const validatePhone = (phone) => {
  const s = String(phone || '').trim();
  if (!s) return false;
  // Allow +, digits, spaces, dashes, parentheses. Require 7–15 digits.
  const digits = s.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 && /^\+?[\d\s()-]+$/.test(s);
};

// Print helper — opens a new window with formatted HTML and triggers print.
const printHTML = (title, bodyHTML) => {
  const w = window.open('', '_blank', 'width=820,height=920');
  if (!w) {
    window.alert('Please allow pop-ups to print this document.');
    return;
  }
  const css = `
    body { font-family: Georgia, 'Times New Roman', serif; padding: 48px; color: #1a1a1a; max-width: 720px; margin: 0 auto; }
    h1 { color: ${PURPLE_DARK}; margin: 0 0 4px; font-size: 26px; }
    h2 { color: ${PURPLE}; margin: 24px 0 6px; font-size: 18px; border-bottom: 2px solid ${PURPLE_LIGHT}; padding-bottom: 4px; }
    .meta { color: #555; font-size: 13px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
    th { background: ${PURPLE_LIGHT}; color: ${PURPLE_DARK}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; }
    .total { font-weight: 700; background: ${PURPLE_LIGHT}; }
    .right { text-align: right; }
    .cert { text-align: center; border: 4px double ${PURPLE}; padding: 32px; margin: 16px 0 24px; }
    .cert h1 { font-size: 32px; margin-bottom: 8px; }
    .cert .name { font-size: 24px; color: ${PURPLE_DARK}; margin: 16px 0; border-bottom: 1px solid ${PURPLE}; display: inline-block; padding: 0 24px 8px; }
    .cert .hours { font-size: 16px; color: #333; margin-top: 8px; }
    .cert .sig { margin-top: 40px; font-size: 13px; color: #555; }
    .seal { font-size: 60px; }
    @media print { body { padding: 24px; } }
  `;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${bodyHTML}<script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));</script></body></html>`);
  w.document.close();
};

// ─── Inline style fragments ─────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  padding: 10,
  borderRadius: 6,
  border: `1px solid ${BORDER}`,
  background: BG_INPUT,
  color: TEXT,
  fontSize: 14,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
};
const labelStyle = { fontSize: 12, fontWeight: 600, color: TEXT_SEC, marginBottom: 4, display: 'block' };
const btnPrimary = {
  padding: '10px 20px', background: PURPLE, color: 'white', border: 0, borderRadius: 6,
  cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
};
const btnGhost = {
  padding: '8px 14px', background: 'transparent', color: PURPLE, border: `1px solid ${PURPLE_BORDER}`,
  borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
};
const btnDanger = {
  background: 'none', border: 0, color: RED_FG, cursor: 'pointer',
  fontSize: 18, padding: 4, lineHeight: 1, borderRadius: 4,
};
const cardStyle = {
  padding: 16, borderRadius: 8, background: BG_CARD, border: `1px solid ${BORDER}`, marginBottom: 8,
};
const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 };
const pill = (bg, fg) => ({
  background: bg, color: fg, fontSize: 10, fontWeight: 700, padding: '3px 8px',
  borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.3, display: 'inline-block',
});
const formPanel = {
  padding: 16, background: PURPLE_LIGHT, borderRadius: 8, border: `1px solid ${PURPLE_BORDER}`, marginBottom: 20,
};
const tableWrap = { overflowX: 'auto' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 540 };
const thStyle = {
  textAlign: 'left', padding: '10px 12px', background: 'rgba(156, 39, 176, 0.18)',
  borderBottom: `2px solid ${PURPLE_BORDER}`, color: TEXT, fontWeight: 700, fontSize: 11,
  textTransform: 'uppercase', letterSpacing: 0.4,
};
const tdStyle = { padding: '10px 12px', borderBottom: `1px solid ${BORDER_DARK}`, color: TEXT };

// ─── Small presentational helpers ───────────────────────────────────────
function EmptyState({ icon, text }) {
  return (
    <div style={{
      textAlign: 'center', padding: 48, color: TEXT_SEC, background: BG_CARD,
      borderRadius: 8, border: `1px dashed ${PURPLE_BORDER}`,
    }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: 14, margin: 0 }}>{text}</p>
    </div>
  );
}

function Field({ label, children, full, hint }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto', display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{hint}</span>}
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div style={{
      flex: '1 1 220px', minWidth: 220, padding: 18, borderRadius: 10,
      background: BG_CARD, border: `1px solid ${BORDER}`, borderTop: `4px solid ${PURPLE}`,
    }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '6px 0 2px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, total, color = PURPLE }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: TEXT_SEC, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: TEXT }}>{fmtMoney(value)} of {fmtMoney(total)}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div style={{ height: 10, background: BORDER_DARK, borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

// PieChart — pure CSS conic-gradient donut, no external deps.
function PieChart({ data, size = 200 }) {
  // data: [{ label, value, color }]
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  if (total === 0) return <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No data to chart.</p>;
  let acc = 0;
  const stops = data
    .filter((d) => Number(d.value) > 0)
    .map((d) => {
      const pct = (Number(d.value) / total) * 100;
      const start = acc;
      acc += pct;
      return `${d.color} ${start}% ${acc}%`;
    });
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `conic-gradient(${stops.join(', ')})`,
      position: 'relative', margin: '0 auto',
      boxShadow: `0 0 0 6px ${BG_CARD}`,
    }}>
      <div style={{
        position: 'absolute', inset: '25%', borderRadius: '50%', background: BG_CARD,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>Total</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{fmtMoney(total)}</div>
      </div>
    </div>
  );
}

// AudioPlayer — inline HTML5 audio with custom play/pause + seek bar.
function AudioPlayer({ src, title }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime || 0);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => setPlaying(false);
    const onErr = () => { setErr(true); setPlaying(false); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    a.addEventListener('error', onErr);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('error', onErr);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
    };
  }, []);

  useEffect(() => { setErr(false); setPlaying(false); setTime(0); setDuration(0); }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || err) return;
    if (playing) { a.pause(); } else { a.play().catch(() => setErr(true)); }
  };
  const seek = (e) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = (Number(e.target.value) / 100) * duration;
    setTime(a.currentTime);
  };
  const pct = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <div style={{
      marginTop: 10, padding: '10px 12px', borderRadius: 8,
      background: 'rgba(156, 39, 176, 0.08)', border: `1px solid ${PURPLE_BORDER}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        disabled={err}
        style={{
          width: 36, height: 36, borderRadius: '50%', border: 0, cursor: err ? 'not-allowed' : 'pointer',
          background: PURPLE, color: 'white', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: err ? 0.4 : 1,
        }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>
          {err ? '⚠ Audio unavailable' : (title || 'Sermon audio')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: MUTED, fontFamily: 'monospace', minWidth: 36 }}>{fmtTime(time)}</span>
          <input
            type="range" min="0" max="100" step="0.1" value={pct}
            onChange={seek}
            style={{ flex: 1, accentColor: PURPLE, cursor: 'pointer' }}
            disabled={err}
            aria-label="Seek"
          />
          <span style={{ fontSize: 10, color: MUTED, fontFamily: 'monospace', minWidth: 36, textAlign: 'right' }}>{fmtTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────
export default function ChurchPortal() {
  const [active, setActive] = useState('dashboard');

  // ─── Data slices (one per collection) ────────────────────────────────
  const [tithes, setTithes] = useState([]);
  const [donations, setDonations] = useState([]);
  const [sermons, setSermons] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [pledges, setPledges] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rsvps, setRsvps] = useState([]);

  // ─── Form state (audit-fix: emptyEvent uses todayISO() not todayISO) ─
  const emptyTithe = { member: '', amount: '', date: todayISO(), fund: 'general' };
  const emptyDonation = { donor: '', amount: '', purpose: 'general', date: todayISO(), note: '' };
  const emptySermon = { title: '', preacher: '', date: todayISO(), scripture_ref: '', summary: '', audio_url: '' };
  const emptyCommittee = { name: '', chair: '', members_count: '', meeting_frequency: 'monthly' };
  const emptyVolunteer = { member: '', hours: '', activity: '', date: todayISO() };
  const emptyMember = { name: '', phone: '', email: '', family: '', baptism_date: '', membership_status: 'active' };
  const emptyEvent = { title: '', date: todayISO(), type: 'service', attendance_count: '', expected_count: '' };
  const emptyPledge = { name: '', target_amount: '', deadline: '', description: '' };
  const emptyExpense = { description: '', amount: '', category: 'utilities', date: todayISO() };

  const [titheForm, setTitheForm] = useState(emptyTithe);
  const [donationForm, setDonationForm] = useState(emptyDonation);
  const [sermonForm, setSermonForm] = useState(emptySermon);
  const [committeeForm, setCommitteeForm] = useState(emptyCommittee);
  const [volunteerForm, setVolunteerForm] = useState(emptyVolunteer);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [pledgeForm, setPledgeForm] = useState(emptyPledge);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);

  // ─── UI state (per-tab sub-views) ───────────────────────────────────
  const [selectedCommitteeId, setSelectedCommitteeId] = useState(null);
  const [committeeTab, setCommitteeTab] = useState('roster'); // roster | minutes | attendance
  const [stmtMemberId, setStmtMemberId] = useState('');
  const [stmtMonth, setStmtMonth] = useState('');   // '' = all months
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('all');
  const [financeYear, setFinanceYear] = useState(thisYear());
  const [pledgeContribution, setPledgeContribution] = useState({}); // { [pledgeId]: { donor, amount, date } }
  const [committeeMinuteForm, setCommitteeMinuteForm] = useState({ date: todayISO(), notes: '' });
  const [committeeAttendanceForm, setCommitteeAttendanceForm] = useState({ date: todayISO(), present_count: '', notes: '' });
  const [rsvpForm, setRsvpForm] = useState({}); // { [eventId]: { member, status, note } }

  // ─── Load everything from localStorage on mount ─────────────────────
  useEffect(() => {
    try {
      setTithes(JSON.parse(localStorage.getItem(STORAGE.tithes) || '[]'));
      setDonations(JSON.parse(localStorage.getItem(STORAGE.donations) || '[]'));
      setSermons(JSON.parse(localStorage.getItem(STORAGE.sermons) || '[]'));
      setCommittees(JSON.parse(localStorage.getItem(STORAGE.committees) || '[]'));
      setVolunteers(JSON.parse(localStorage.getItem(STORAGE.volunteers) || '[]'));
      setMembers(JSON.parse(localStorage.getItem(STORAGE.members) || '[]'));
      setEvents(JSON.parse(localStorage.getItem(STORAGE.events) || '[]'));
      setPledges(JSON.parse(localStorage.getItem(STORAGE.pledges) || '[]'));
      setExpenses(JSON.parse(localStorage.getItem(STORAGE.expenses) || '[]'));
      setRsvps(JSON.parse(localStorage.getItem(STORAGE.rsvps) || '[]'));
    } catch { /* ignore malformed localStorage */ }
  }, []);

  // ─── Generic persistence helpers (audit-fix: try/catch on EVERY saveX) ─
  const saveTithes = (u) => {
    setTithes(u);
    try { localStorage.setItem(STORAGE.tithes, JSON.stringify(u)); } catch (e) { console.warn('localStorage write failed (tithes):', e.message); }
  };
  const saveDonations = (u) => {
    setDonations(u);
    try { localStorage.setItem(STORAGE.donations, JSON.stringify(u)); } catch (e) { console.warn('localStorage write failed (donations):', e.message); }
  };
  const saveSermons = (u) => {
    setSermons(u);
    try { localStorage.setItem(STORAGE.sermons, JSON.stringify(u)); } catch (e) { console.warn('localStorage write failed (sermons):', e.message); }
  };
  const saveCommittees = (u) => {
    setCommittees(u);
    try { localStorage.setItem(STORAGE.committees, JSON.stringify(u)); } catch (e) { console.warn('localStorage write failed (committees):', e.message); }
  };
  const saveVolunteers = (u) => {
    setVolunteers(u);
    try { localStorage.setItem(STORAGE.volunteers, JSON.stringify(u)); } catch (e) { console.warn('localStorage write failed (volunteers):', e.message); }
  };
  const saveMembers = (u) => {
    setMembers(u);
    try { localStorage.setItem(STORAGE.members, JSON.stringify(u)); } catch (e) { console.warn('localStorage write failed (members):', e.message); }
  };
  const saveEvents = (u) => {
    setEvents(u);
    try { localStorage.setItem(STORAGE.events, JSON.stringify(u)); } catch (e) { console.warn('localStorage write failed (events):', e.message); }
  };
  const savePledges = (u) => {
    setPledges(u);
    try { localStorage.setItem(STORAGE.pledges, JSON.stringify(u)); } catch (e) { console.warn('localStorage write failed (pledges):', e.message); }
  };
  const saveExpenses = (u) => {
    setExpenses(u);
    try { localStorage.setItem(STORAGE.expenses, JSON.stringify(u)); } catch (e) { console.warn('localStorage write failed (expenses):', e.message); }
  };
  const saveRsvps = (u) => {
    setRsvps(u);
    try { localStorage.setItem(STORAGE.rsvps, JSON.stringify(u)); } catch (e) { console.warn('localStorage write failed (rsvps):', e.message); }
  };

  // ─── Audit-fix: window.confirm() wrapper for ALL delete buttons ─────
  const confirmDelete = (list, save, id, what = 'this item') => {
    if (!window.confirm(`Are you sure you want to delete ${what}? This cannot be undone.`)) return;
    save(list.filter((x) => x.id !== id));
  };
  const setField = (setter) => (k, v) => setter((prev) => ({ ...prev, [k]: v }));

  // ─── Dashboard aggregates ─────────────────────────────────────────────
  const tmKey = thisMonthKey();
  const tithesThisMonth = tithes.filter((t) => monthKey(t.date) === tmKey).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const donationsThisMonth = donations.filter((d) => monthKey(d.date) === tmKey).reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const donationsTotal = donations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const volunteerHoursTotal = volunteers.reduce((s, v) => s + (Number(v.hours) || 0), 0);
  const tithesTotal = tithes.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const expensesTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const activeMembers = members.filter((m) => m.membership_status === 'active').length;

  const tithesByMonth = useMemo(() => {
    const m = {};
    tithes.forEach((t) => { const k = monthKey(t.date); if (!k) return; m[k] = (m[k] || 0) + (Number(t.amount) || 0); });
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [tithes]);

  const volunteerTotals = useMemo(() => {
    const m = {};
    volunteers.forEach((v) => { const k = v.member?.trim() || 'Unknown'; m[k] = (m[k] || 0) + (Number(v.hours) || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [volunteers]);

  const fundBreakdown = useMemo(() => {
    const m = {};
    donations.forEach((d) => {
      const k = d.purpose && FUNDS[d.purpose] ? d.purpose : 'other';
      m[k] = (m[k] || 0) + (Number(d.amount) || 0);
    });
    return FUND_KEYS.filter((k) => m[k]).map((k) => ({ label: FUNDS[k].label, value: m[k], color: FUNDS[k].color }));
  }, [donations]);

  // ─── Tithes ──────────────────────────────────────────────────────────
  const addTithe = () => {
    if (!titheForm.member.trim()) { window.alert('Member name is required.'); return; }
    if (!validateAmount(titheForm.amount)) { window.alert('Please enter a positive amount.'); return; }
    if (!titheForm.date) { window.alert('Date is required.'); return; }
    saveTithes([{
      id: uid(), member: titheForm.member.trim(), amount: Number(titheForm.amount),
      date: titheForm.date, fund: titheForm.fund || 'general', created_at: nowISO(),
    }, ...tithes]);
    setTitheForm({ ...emptyTithe, member: titheForm.member });
  };

  // ─── Donations ───────────────────────────────────────────────────────
  const addDonation = () => {
    if (!donationForm.donor.trim()) { window.alert('Donor name is required.'); return; }
    if (!validateAmount(donationForm.amount)) { window.alert('Please enter a positive amount.'); return; }
    if (!donationForm.date) { window.alert('Date is required.'); return; }
    saveDonations([{
      id: uid(), donor: donationForm.donor.trim(), amount: Number(donationForm.amount),
      purpose: donationForm.purpose || 'general', date: donationForm.date,
      note: donationForm.note.trim(), created_at: nowISO(),
    }, ...donations]);
    setDonationForm(emptyDonation);
  };

  // ─── Sermons ─────────────────────────────────────────────────────────
  const addSermon = () => {
    if (!sermonForm.title.trim()) { window.alert('Title is required.'); return; }
    if (!sermonForm.preacher.trim()) { window.alert('Preacher is required.'); return; }
    if (!sermonForm.date) { window.alert('Date is required.'); return; }
    saveSermons([{
      id: uid(), ...sermonForm, title: sermonForm.title.trim(), preacher: sermonForm.preacher.trim(),
      created_at: nowISO(),
    }, ...sermons]);
    setSermonForm(emptySermon);
  };

  // ─── Committees ───────────────────────────────────────────────────────
  const addCommittee = () => {
    if (!committeeForm.name.trim()) { window.alert('Committee name is required.'); return; }
    if (!committeeForm.chair.trim()) { window.alert('Chairperson is required.'); return; }
    saveCommittees([{
      id: uid(), name: committeeForm.name.trim(), chair: committeeForm.chair.trim(),
      members_count: Number(committeeForm.members_count) || 0,
      meeting_frequency: committeeForm.meeting_frequency || 'monthly',
      roster: [], minutes: [], attendance: [], created_at: nowISO(),
    }, ...committees]);
    setCommitteeForm(emptyCommittee);
  };
  const freqLabel = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' };

  const selectedCommittee = committees.find((c) => c.id === selectedCommitteeId) || null;
  const updateCommittee = (id, patch) => saveCommittees(committees.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const addCommitteeMember = (committeeId, memberId) => {
    if (!memberId) return;
    const c = committees.find((x) => x.id === committeeId);
    if (!c) return;
    if ((c.roster || []).includes(memberId)) { window.alert('This member is already on the committee.'); return; }
    updateCommittee(committeeId, { roster: [...(c.roster || []), memberId] });
  };
  const removeCommitteeMember = (committeeId, memberId) => {
    if (!window.confirm('Remove this member from the committee?')) return;
    const c = committees.find((x) => x.id === committeeId);
    if (!c) return;
    updateCommittee(committeeId, { roster: (c.roster || []).filter((id) => id !== memberId) });
  };
  const addCommitteeMinute = (committeeId) => {
    if (!committeeMinuteForm.notes.trim()) { window.alert('Minutes notes cannot be empty.'); return; }
    if (!committeeMinuteForm.date) { window.alert('Date is required.'); return; }
    const c = committees.find((x) => x.id === committeeId);
    if (!c) return;
    const entry = { id: uid(), date: committeeMinuteForm.date, notes: committeeMinuteForm.notes.trim(), recorded_at: nowISO() };
    updateCommittee(committeeId, { minutes: [entry, ...(c.minutes || [])] });
    setCommitteeMinuteForm({ date: todayISO(), notes: '' });
  };
  const deleteCommitteeMinute = (committeeId, minuteId) => {
    if (!window.confirm('Delete this meeting minute entry?')) return;
    const c = committees.find((x) => x.id === committeeId);
    if (!c) return;
    updateCommittee(committeeId, { minutes: (c.minutes || []).filter((m) => m.id !== minuteId) });
  };
  const addCommitteeAttendance = (committeeId) => {
    const present = Number(committeeAttendanceForm.present_count);
    if (!Number.isFinite(present) || present < 0) { window.alert('Enter a valid present count (≥ 0).'); return; }
    if (!committeeAttendanceForm.date) { window.alert('Date is required.'); return; }
    const c = committees.find((x) => x.id === committeeId);
    if (!c) return;
    const entry = {
      id: uid(), date: committeeAttendanceForm.date, present_count: present,
      notes: committeeAttendanceForm.notes.trim(), recorded_at: nowISO(),
    };
    updateCommittee(committeeId, { attendance: [entry, ...(c.attendance || [])] });
    setCommitteeAttendanceForm({ date: todayISO(), present_count: '', notes: '' });
  };
  const deleteCommitteeAttendance = (committeeId, attId) => {
    if (!window.confirm('Delete this attendance record?')) return;
    const c = committees.find((x) => x.id === committeeId);
    if (!c) return;
    updateCommittee(committeeId, { attendance: (c.attendance || []).filter((a) => a.id !== attId) });
  };

  // ─── Volunteer hours ─────────────────────────────────────────────────
  const addVolunteer = () => {
    if (!volunteerForm.member.trim()) { window.alert('Member name is required.'); return; }
    if (!volunteerForm.activity.trim()) { window.alert('Activity is required.'); return; }
    if (!validateAmount(volunteerForm.hours)) { window.alert('Please enter positive hours.'); return; }
    if (!volunteerForm.date) { window.alert('Date is required.'); return; }
    saveVolunteers([{
      id: uid(), member: volunteerForm.member.trim(), hours: Number(volunteerForm.hours),
      activity: volunteerForm.activity.trim(), date: volunteerForm.date, created_at: nowISO(),
    }, ...volunteers]);
    setVolunteerForm({ ...emptyVolunteer, member: volunteerForm.member });
  };

  // ─── Members ──────────────────────────────────────────────────────────
  const addMember = () => {
    if (!memberForm.name.trim()) { window.alert('Member name is required.'); return; }
    if (!validatePhone(memberForm.phone)) { window.alert('Please enter a valid phone number (7–15 digits, +/digits/spaces/-/() allowed).'); return; }
    if (memberForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberForm.email)) { window.alert('Please enter a valid email address.'); return; }
    saveMembers([{
      id: uid(), ...memberForm, name: memberForm.name.trim(), family: memberForm.family.trim(),
      created_at: nowISO(),
    }, ...members]);
    setMemberForm(emptyMember);
  };

  const memberFamilyGroups = useMemo(() => {
    const groups = {};
    members.forEach((m) => {
      const key = (m.family || '').trim() || '— No family set —';
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return members.filter((m) => {
      if (memberStatusFilter !== 'all' && m.membership_status !== memberStatusFilter) return false;
      if (!q) return true;
      return (
        m.name?.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        (m.family || '').toLowerCase().includes(q)
      );
    });
  }, [members, memberSearch, memberStatusFilter]);

  // ─── Events ───────────────────────────────────────────────────────────
  const addEvent = () => {
    if (!eventForm.title.trim()) { window.alert('Event title is required.'); return; }
    if (!eventForm.date) { window.alert('Date is required.'); return; }
    saveEvents([{
      id: uid(), title: eventForm.title.trim(), date: eventForm.date, type: eventForm.type,
      attendance_count: Number(eventForm.attendance_count) || 0,
      expected_count: Number(eventForm.expected_count) || 0,
      created_at: nowISO(),
    }, ...events]);
    setEventForm(emptyEvent);
  };
  const eventTypeIcon = { service: '⛪', conference: '🎤', retreat: '🌄', wedding: '💍', funeral: '🕊️', outreach: '🤲', youth: '🎵', other: '📌' };
  const eventTypeLabel = { service: 'Service', conference: 'Conference', retreat: 'Retreat', wedding: 'Wedding', funeral: 'Funeral', outreach: 'Outreach', youth: 'Youth', other: 'Other' };
  const upcomingEvents = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [...events].filter((e) => new Date(e.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events]);
  const pastEvents = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [...events].filter((e) => new Date(e.date) < today).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [events]);

  // ─── RSVPs ────────────────────────────────────────────────────────────
  const rsvpsForEvent = (eventId) => rsvps.filter((r) => r.event_id === eventId);
  const rsvpCounts = (eventId) => {
    const list = rsvpsForEvent(eventId);
    return {
      yes: list.filter((r) => r.status === 'yes').length,
      no: list.filter((r) => r.status === 'no').length,
      maybe: list.filter((r) => r.status === 'maybe').length,
      total: list.length,
    };
  };
  const addRsvp = (eventId) => {
    const draft = rsvpForm[eventId] || { member: '', status: 'yes', note: '' };
    if (!draft.member.trim()) { window.alert('Member name is required.'); return; }
    saveRsvps([{
      id: uid(), event_id: eventId, member: draft.member.trim(),
      status: draft.status || 'yes', note: draft.note.trim(), created_at: nowISO(),
    }, ...rsvps]);
    setRsvpForm((prev) => ({ ...prev, [eventId]: { member: '', status: 'yes', note: '' } }));
  };
  const setRsvpField = (eventId, k, v) => setRsvpForm((prev) => ({
    ...prev,
    [eventId]: { ...(prev[eventId] || { member: '', status: 'yes', note: '' }), [k]: v },
  }));

  // ─── Pledges ──────────────────────────────────────────────────────────
  const addPledge = () => {
    if (!pledgeForm.name.trim()) { window.alert('Pledge campaign name is required.'); return; }
    if (!validateAmount(pledgeForm.target_amount)) { window.alert('Please enter a positive target amount.'); return; }
    if (!pledgeForm.deadline) { window.alert('Deadline is required.'); return; }
    savePledges([{
      id: uid(), name: pledgeForm.name.trim(), target_amount: Number(pledgeForm.target_amount),
      deadline: pledgeForm.deadline, description: pledgeForm.description.trim(),
      contributions: [], created_at: nowISO(),
    }, ...pledges]);
    setPledgeForm(emptyPledge);
  };
  const pledgeTotal = (p) => (p.contributions || []).reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const pledgeProgress = (p) => {
    const t = pledgeTotal(p);
    return p.target_amount > 0 ? Math.min(100, Math.round((t / p.target_amount) * 100)) : 0;
  };
  const addPledgeContribution = (pledgeId) => {
    const draft = pledgeContribution[pledgeId] || { donor: '', amount: '', date: todayISO() };
    if (!draft.donor.trim()) { window.alert('Donor name is required.'); return; }
    if (!validateAmount(draft.amount)) { window.alert('Please enter a positive amount.'); return; }
    if (!draft.date) { window.alert('Date is required.'); return; }
    const updated = pledges.map((p) => p.id === pledgeId
      ? { ...p, contributions: [{ id: uid(), donor: draft.donor.trim(), amount: Number(draft.amount), date: draft.date, created_at: nowISO() }, ...(p.contributions || [])] }
      : p);
    savePledges(updated);
    setPledgeContribution((prev) => ({ ...prev, [pledgeId]: { donor: '', amount: '', date: todayISO() } }));
  };
  const setPledgeContributionField = (pledgeId, k, v) => setPledgeContribution((prev) => ({
    ...prev,
    [pledgeId]: { ...(prev[pledgeId] || { donor: '', amount: '', date: todayISO() }), [k]: v },
  }));
  const deletePledgeContribution = (pledgeId, contributionId) => {
    if (!window.confirm('Delete this contribution?')) return;
    const updated = pledges.map((p) => p.id === pledgeId
      ? { ...p, contributions: (p.contributions || []).filter((c) => c.id !== contributionId) }
      : p);
    savePledges(updated);
  };

  // ─── Expenses ────────────────────────────────────────────────────────
  const addExpense = () => {
    if (!expenseForm.description.trim()) { window.alert('Description is required.'); return; }
    if (!validateAmount(expenseForm.amount)) { window.alert('Please enter a positive amount.'); return; }
    if (!expenseForm.date) { window.alert('Date is required.'); return; }
    saveExpenses([{
      id: uid(), description: expenseForm.description.trim(), amount: Number(expenseForm.amount),
      category: expenseForm.category || 'utilities', date: expenseForm.date, created_at: nowISO(),
    }, ...expenses]);
    setExpenseForm(emptyExpense);
  };
  const expenseCategories = {
    utilities: { label: 'Utilities', color: '#00bcd4' },
    salaries: { label: 'Salaries', color: '#9c27b0' },
    maintenance: { label: 'Maintenance', color: '#ffc107' },
    missions: { label: 'Missions', color: '#4caf50' },
    youth: { label: 'Youth', color: '#ff7043' },
    other: { label: 'Other', color: '#7e8aa0' },
  };

  // ─── Per-Member Tithe Statements ────────────────────────────────────
  const tithesForMember = useMemo(() => {
    if (!stmtMemberId) return [];
    return tithes
      .filter((t) => t.member === stmtMemberId)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [tithes, stmtMemberId]);

  const stmtRows = useMemo(() => {
    let running = 0;
    return tithesForMember
      .filter((t) => !stmtMonth || monthKey(t.date) === stmtMonth)
      .map((t) => { running += Number(t.amount) || 0; return { ...t, running }; });
  }, [tithesForMember, stmtMonth]);

  const stmtTotal = stmtRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const stmtMember = members.find((m) => m.id === stmtMemberId) || null;

  const printTitheStatement = () => {
    if (!stmtMember || stmtRows.length === 0) { window.alert('Select a member with tithe records first.'); return; }
    const rows = stmtRows.map((r) => `<tr><td>${fmtDate(r.date)}</td><td class="right">${fmtMoney(r.amount)}</td><td class="right total">${fmtMoney(r.running)}</td></tr>`).join('');
    const period = stmtMonth ? monthLabel(stmtMonth) : 'All recorded months';
    const body = `
      <h1>⛪ Tithe Statement</h1>
      <div class="meta">
        Member: <strong>${stmtMember.name}</strong>${stmtMember.phone ? ` • ${stmtMember.phone}` : ''}<br>
        Period: ${period}<br>
        Generated: ${new Date().toLocaleString()}
      </div>
      <table>
        <thead><tr><th>Date</th><th class="right">Amount</th><th class="right">Running Total</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td class="total">Total</td><td class="right total">${fmtMoney(stmtTotal)}</td><td class="right total">${fmtMoney(stmtTotal)}</td></tr></tfoot>
      </table>
      <p style="margin-top:32px;font-size:12px;color:#666">This statement was generated by the Ssewasswa Comforts Church Portal and is for personal record only.</p>
    `;
    printHTML('Tithe Statement', body);
  };

  // ─── Volunteer certificate generator ────────────────────────────────
  const printCertificate = (name, hours) => {
    const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const body = `
      <div class="cert">
        <div class="seal">🏅</div>
        <h1>Certificate of Appreciation</h1>
        <div style="color:#555;font-size:13px;letter-spacing:0.4px;text-transform:uppercase">Presented to</div>
        <div class="name">${name}</div>
        <div class="hours">In recognition of <strong>${hours} volunteer hours</strong> faithfully rendered<br>in service to the church and community.</div>
        <div class="sig">
          ____________________________<br>
          Senior Pastor &nbsp;·&nbsp; ${today}
        </div>
      </div>
    `;
    printHTML('Volunteer Certificate', body);
  };

  // ─── Annual finance report data ─────────────────────────────────────
  const financeData = useMemo(() => {
    const y = Number(financeYear);
    const yTithes = tithes.filter((t) => yearOf(t.date) === y);
    const yDonations = donations.filter((d) => yearOf(d.date) === y);
    const yExpenses = expenses.filter((e) => yearOf(e.date) === y);
    const titheTotal = yTithes.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const donationTotal = yDonations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const expenseTotal = yExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const incomeTotal = titheTotal + donationTotal;

    const fundsMap = {};
    yDonations.forEach((d) => {
      const k = d.purpose && FUNDS[d.purpose] ? d.purpose : 'other';
      fundsMap[k] = (fundsMap[k] || 0) + (Number(d.amount) || 0);
    });
    const fundRows = FUND_KEYS.filter((k) => fundsMap[k]).map((k) => ({
      key: k, label: FUNDS[k].label, color: FUNDS[k].color, value: fundsMap[k],
    }));

    const expenseMap = {};
    yExpenses.forEach((e) => {
      const k = e.category && expenseCategories[e.category] ? e.category : 'other';
      expenseMap[k] = (expenseMap[k] || 0) + (Number(e.amount) || 0);
    });
    const expenseRows = Object.keys(expenseCategories).filter((k) => expenseMap[k]).map((k) => ({
      key: k, label: expenseCategories[k].label, color: expenseCategories[k].color, value: expenseMap[k],
    }));

    const netIncome = incomeTotal - expenseTotal;

    return {
      y, yTithes, yDonations, yExpenses,
      titheTotal, donationTotal, expenseTotal, incomeTotal,
      fundRows, expenseRows, netIncome,
    };
  }, [tithes, donations, expenses, financeYear]);

  const availableYears = useMemo(() => {
    const set = new Set();
    tithes.forEach((t) => set.add(yearOf(t.date)));
    donations.forEach((d) => set.add(yearOf(d.date)));
    expenses.forEach((e) => set.add(yearOf(e.date)));
    set.add(thisYear());
    return Array.from(set).filter(Boolean).sort((a, b) => b - a);
  }, [tithes, donations, expenses]);

  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="page-container" style={{ minHeight: '100vh', background: BG_PAGE, paddingBottom: 24 }}>
      <h1 className="page-title" style={{ color: TEXT }}>⛪ Church / Religious Org Portal</h1>
      <p style={{ color: TEXT_SEC, fontSize: 14, marginBottom: 20 }}>
        Track tithes, pledges, donations, sermons, committees, volunteer hours, members and events — with per-member statements,
        annual finance reports and printable certificates. Data persists locally in your browser.
      </p>

      {/* ─── Tab strip ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, padding: 6,
        background: BG_CARD, borderRadius: 8, border: `1px solid ${BORDER}`,
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActive(t.id);
              if (t.id !== 'committees') setSelectedCommitteeId(null);
            }}
            style={{
              padding: '8px 12px', borderRadius: 6, border: 0, cursor: 'pointer',
              background: active === t.id ? PURPLE : 'transparent',
              color: active === t.id ? 'white' : TEXT_SEC,
              fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'inherit',
            }}
          >
            <span>{t.icon}</span>
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      {/* ─── Dashboard ───────────────────────────────────────────────── */}
      {active === 'dashboard' && (
        <div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <StatCard icon="💰" label="Tithes this month" value={fmtMoney(tithesThisMonth)} sub={`${tithes.filter((t) => monthKey(t.date) === tmKey).length} contributions`} />
            <StatCard icon="🤝" label="Donations this month" value={fmtMoney(donationsThisMonth)} sub={`${donations.filter((d) => monthKey(d.date) === tmKey).length} donations`} />
            <StatCard icon="📞" label="Total members" value={members.length} sub={`${activeMembers} active`} />
            <StatCard icon="⏰" label="Volunteer hours" value={`${volunteerHoursTotal}h`} sub={`${volunteers.length} entries logged`} />
            <StatCard icon="📚" label="Sermons archived" value={sermons.length} sub={`${committees.length} committees`} />
            <StatCard icon="📅" label="Upcoming events" value={upcomingEvents.length} sub={`of ${events.length} total`} />
            <StatCard icon="🎯" label="Active pledges" value={pledges.length} sub={`${pledges.reduce((s, p) => s + pledgeProgress(p), 0)}% avg progress`} />
            <StatCard icon="💸" label="Net cash (all time)" value={fmtMoney(tithesTotal + donationsTotal - expensesTotal)} sub={`Income ${fmtMoney(tithesTotal + donationsTotal)} − Expenses ${fmtMoney(expensesTotal)}`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: TEXT }}>Tithes — Monthly Totals</h3>
              {tithesByMonth.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No tithe records yet.</p>
              ) : tithesByMonth.slice(0, 6).map(([k, total]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${BORDER_DARK}` }}>
                  <span style={{ color: TEXT }}>{monthLabel(k)}</span>
                  <span style={{ fontWeight: 600, color: PURPLE }}>{fmtMoney(total)}</span>
                </div>
              ))}
            </div>

            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: TEXT }}>Top Volunteers</h3>
              {volunteerTotals.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No volunteer hours logged.</p>
              ) : volunteerTotals.slice(0, 6).map(([name, hrs]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${BORDER_DARK}` }}>
                  <span style={{ color: TEXT }}>{name}</span>
                  <span style={{ fontWeight: 600, color: PURPLE }}>{hrs}h</span>
                </div>
              ))}
            </div>

            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: TEXT }}>Donations by Fund</h3>
              {fundBreakdown.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No donations yet.</p>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <PieChart data={fundBreakdown} size={170} />
                </div>
              )}
              {fundBreakdown.map((f) => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: f.color, display: 'inline-block' }} />
                  <span style={{ flex: 1, color: TEXT }}>{f.label}</span>
                  <span style={{ fontWeight: 600, color: PURPLE }}>{fmtMoney(f.value)}</span>
                </div>
              ))}
            </div>

            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: TEXT }}>Active Pledge Campaigns</h3>
              {pledges.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No pledges created yet.</p>
              ) : pledges.slice(0, 4).map((p) => (
                <div key={p.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: TEXT, marginBottom: 4 }}>
                    <span>{p.name}</span>
                    <span style={{ color: MUTED, fontSize: 11 }}>due {fmtDate(p.deadline)}</span>
                  </div>
                  <ProgressBar value={pledgeTotal(p)} total={p.target_amount} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tithes ───────────────────────────────────────────────────── */}
      {active === 'tithes' && (
        <div>
          <div style={formPanel}>
            <div style={formGrid}>
              <Field label="Member name *">
                <input type="text" list="member-suggestions" placeholder="e.g. John Mukasa" value={titheForm.member} onChange={(e) => setField(setTitheForm)('member', e.target.value)} style={inputStyle} />
                <datalist id="member-suggestions">{members.map((m) => <option key={m.id} value={m.name} />)}</datalist>
              </Field>
              <Field label="Amount (UGX) *" hint="Must be greater than zero">
                <input type="number" min="0" step="1" placeholder="50000" value={titheForm.amount} onChange={(e) => setField(setTitheForm)('amount', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Date *">
                <input type="date" value={titheForm.date} onChange={(e) => setField(setTitheForm)('date', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Fund">
                <select value={titheForm.fund} onChange={(e) => setField(setTitheForm)('fund', e.target.value)} style={inputStyle}>
                  {FUND_KEYS.map((k) => <option key={k} value={k}>{FUNDS[k].label}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={addTithe} style={btnPrimary}>+ Add Tithe</button>
            </div>
          </div>

          {tithesByMonth.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {tithesByMonth.map(([k, total]) => (
                <span key={k} style={{ ...pill(PURPLE_LIGHT, TEXT), fontSize: 11, padding: '5px 10px' }}>{monthLabel(k)}: {fmtMoney(total)}</span>
              ))}
            </div>
          )}

          {tithes.length === 0 ? (
            <EmptyState icon="💰" text="No tithe records yet. Add the first contribution above." />
          ) : tithes.map((t) => (
            <div key={t.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 26 }}>💰</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: TEXT }}>{t.member}</div>
                <div style={{ fontSize: 11, color: MUTED }}>
                  {fmtDate(t.date)} • Fund: <span style={{ color: FUNDS[t.fund]?.color || TEXT, fontWeight: 600 }}>{FUNDS[t.fund]?.label || 'General'}</span> • Logged {new Date(t.created_at).toLocaleDateString()}
                </div>
              </div>
              <span style={{ fontWeight: 700, color: PURPLE, fontSize: 15 }}>{fmtMoney(t.amount)}</span>
              <button onClick={() => confirmDelete(tithes, saveTithes, t.id, 'this tithe record')} style={btnDanger} aria-label="Delete tithe">×</button>
            </div>
          ))}

          <p style={{ fontSize: 12, color: MUTED, marginTop: 16 }}>
            Need a per-member tithe statement? Visit the <button onClick={() => setActive('statements')} style={{ background: 'none', border: 0, color: PURPLE, cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }}>Statements</button> tab.
          </p>
        </div>
      )}

      {/* ─── Statements ──────────────────────────────────────────────── */}
      {active === 'statements' && (
        <div>
          <div style={formPanel}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: TEXT }}>🧾 Per-Member Tithe Statement</h3>
            <div style={formGrid}>
              <Field label="Select member *" full>
                <select value={stmtMemberId} onChange={(e) => setStmtMemberId(e.target.value)} style={inputStyle}>
                  <option value="">— Choose a member —</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.family ? ` (${m.family})` : ''}</option>)}
                </select>
              </Field>
              <Field label="Filter by month" hint="Leave on 'All' for full history">
                <select value={stmtMonth} onChange={(e) => setStmtMonth(e.target.value)} style={inputStyle}>
                  <option value="">All recorded months</option>
                  {tithesForMember
                    .map((t) => monthKey(t.date))
                    .filter((v, i, a) => v && a.indexOf(v) === i)
                    .sort()
                    .reverse()
                    .map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={printTitheStatement} disabled={!stmtMemberId || stmtRows.length === 0} style={{ ...btnPrimary, opacity: (!stmtMemberId || stmtRows.length === 0) ? 0.5 : 1, cursor: (!stmtMemberId || stmtRows.length === 0) ? 'not-allowed' : 'pointer' }}>🖨 Print statement</button>
              {stmtMemberId && (
                <button onClick={() => { setStmtMemberId(''); setStmtMonth(''); }} style={btnGhost}>Clear</button>
              )}
            </div>
          </div>

          {!stmtMemberId ? (
            <EmptyState icon="🧾" text="Select a member above to generate their tithe statement." />
          ) : stmtRows.length === 0 ? (
            <EmptyState icon="🧾" text={`${stmtMember?.name || 'This member'} has no tithe records${stmtMonth ? ` for ${monthLabel(stmtMonth)}` : ''}.`} />
          ) : (
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 15 }}>{stmtMember?.name}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{stmtMember?.phone}{stmtMember?.email ? ` • ${stmtMember.email}` : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: MUTED }}>Statement total</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: PURPLE }}>{fmtMoney(stmtTotal)}</div>
                </div>
              </div>
              <div style={tableWrap}>
                <table style={tableStyle}>
                  <thead><tr><th style={thStyle}>Date</th><th style={thStyle}>Amount</th><th style={thStyle}>Running Total</th></tr></thead>
                  <tbody>
                    {stmtRows.map((r) => (
                      <tr key={r.id}>
                        <td style={tdStyle}>{fmtDate(r.date)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtMoney(r.amount)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: PURPLE }}>{fmtMoney(r.running)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>Total</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(stmtTotal)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: PURPLE }}>{fmtMoney(stmtTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Pledges ─────────────────────────────────────────────────── */}
      {active === 'pledges' && (
        <div>
          <div style={formPanel}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: TEXT }}>🎯 New Pledge Campaign</h3>
            <div style={formGrid}>
              <Field label="Campaign name *" full>
                <input type="text" placeholder="e.g. Sanctuary Roof Renovation" value={pledgeForm.name} onChange={(e) => setField(setPledgeForm)('name', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Target amount (UGX) *" hint="Must be greater than zero">
                <input type="number" min="0" step="1" placeholder="50000000" value={pledgeForm.target_amount} onChange={(e) => setField(setPledgeForm)('target_amount', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Deadline *">
                <input type="date" value={pledgeForm.deadline} onChange={(e) => setField(setPledgeForm)('deadline', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Description" full>
                <textarea rows={2} placeholder="Brief description of the campaign purpose..." value={pledgeForm.description} onChange={(e) => setField(setPledgeForm)('description', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={addPledge} style={btnPrimary}>+ Create Pledge</button>
            </div>
          </div>

          {pledges.length === 0 ? (
            <EmptyState icon="🎯" text="No pledge campaigns yet. Create your first campaign above." />
          ) : pledges.map((p) => {
            const total = pledgeTotal(p);
            const draft = pledgeContribution[p.id] || { donor: '', amount: '', date: todayISO() };
            const daysLeft = Math.ceil((new Date(p.deadline) - new Date()) / 86400000);
            const overdue = daysLeft < 0 && total < p.target_amount;
            return (
              <div key={p.id} style={{ ...cardStyle, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: TEXT, fontSize: 15 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>
                      Deadline: {fmtDate(p.deadline)} • {daysLeft >= 0 ? `${daysLeft} days left` : <span style={{ color: RED_FG }}>overdue by ${Math.abs(daysLeft)} days</span>}
                    </div>
                    {p.description && <p style={{ fontSize: 12, color: TEXT_SEC, margin: '6px 0 0' }}>{p.description}</p>}
                  </div>
                  <button onClick={() => confirmDelete(pledges, savePledges, p.id, `the '${p.name}' campaign`)} style={btnDanger} aria-label="Delete pledge">×</button>
                </div>

                <div style={{ margin: '8px 0 12px' }}>
                  <ProgressBar value={total} total={p.target_amount} />
                </div>

                <div style={{ borderTop: `1px solid ${BORDER_DARK}`, paddingTop: 10, marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Log contribution</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                    <Field label="Donor"><input type="text" placeholder="Donor name" value={draft.donor} onChange={(e) => setPledgeContributionField(p.id, 'donor', e.target.value)} style={inputStyle} /></Field>
                    <Field label="Amount"><input type="number" min="0" step="1" placeholder="50000" value={draft.amount} onChange={(e) => setPledgeContributionField(p.id, 'amount', e.target.value)} style={inputStyle} /></Field>
                    <Field label="Date"><input type="date" value={draft.date} onChange={(e) => setPledgeContributionField(p.id, 'date', e.target.value)} style={inputStyle} /></Field>
                    <button onClick={() => addPledgeContribution(p.id)} style={{ ...btnPrimary, padding: '8px 14px', alignSelf: 'end' }}>+ Add</button>
                  </div>
                </div>

                {p.contributions && p.contributions.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Recent contributions ({p.contributions.length})</div>
                    {p.contributions.slice(0, 5).map((c) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: `1px solid ${BORDER_DARK}` }}>
                        <span style={{ color: TEXT }}>{c.donor} <span style={{ color: MUTED }}>· {fmtDate(c.date)}</span></span>
                        <span style={{ fontWeight: 600, color: PURPLE }}>{fmtMoney(c.amount)}</span>
                        <button onClick={() => deletePledgeContribution(p.id, c.id)} style={btnDanger} aria-label="Delete contribution">×</button>
                      </div>
                    ))}
                  </div>
                )}
                {overdue && (
                  <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(211, 47, 47, 0.18)', border: `1px solid ${RED}`, borderRadius: 6, fontSize: 12, color: RED_FG }}>
                    ⚠ This campaign is overdue and short of target by {fmtMoney(p.target_amount - total)}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Donations ──────────────────────────────────────────────── */}
      {active === 'donations' && (
        <div>
          <div style={formPanel}>
            <div style={formGrid}>
              <Field label="Donor name *">
                <input type="text" list="member-suggestions" placeholder="e.g. Grace Family" value={donationForm.donor} onChange={(e) => setField(setDonationForm)('donor', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Amount (UGX) *" hint="Must be greater than zero">
                <input type="number" min="0" step="1" placeholder="100000" value={donationForm.amount} onChange={(e) => setField(setDonationForm)('amount', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Fund / Purpose">
                <select value={donationForm.purpose} onChange={(e) => setField(setDonationForm)('purpose', e.target.value)} style={inputStyle}>
                  {FUND_KEYS.map((k) => <option key={k} value={k}>{FUNDS[k].label}</option>)}
                </select>
              </Field>
              <Field label="Date *">
                <input type="date" value={donationForm.date} onChange={(e) => setField(setDonationForm)('date', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Note (optional)" full>
                <input type="text" placeholder="e.g. in memory of..." value={donationForm.note} onChange={(e) => setField(setDonationForm)('note', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={addDonation} style={btnPrimary}>+ Add Donation</button>
            </div>
          </div>

          {donations.length > 0 && (
            <div style={{ ...cardStyle, background: PURPLE, color: 'white', border: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Running total ({donations.length} donations)</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{fmtMoney(donationsTotal)}</span>
            </div>
          )}

          {fundBreakdown.length > 0 && (
            <div style={{ ...cardStyle, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <PieChart data={fundBreakdown} size={140} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>By Fund</div>
                {fundBreakdown.map((f) => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '3px 0' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: f.color, display: 'inline-block' }} />
                    <span style={{ flex: 1, color: TEXT }}>{f.label}</span>
                    <span style={{ fontWeight: 600, color: TEXT }}>{fmtMoney(f.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {donations.length === 0 ? (
            <EmptyState icon="🤝" text="No donations recorded yet. Add the first donation above." />
          ) : donations.map((d) => (
            <div key={d.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 26 }}>🤝</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: TEXT }}>{d.donor}</div>
                <div style={{ fontSize: 11, color: MUTED }}>
                  {fmtDate(d.date)} • Fund: <span style={{ color: FUNDS[d.purpose]?.color || TEXT, fontWeight: 600 }}>{FUNDS[d.purpose]?.label || 'Other'}</span>
                  {d.note ? ` • ${d.note}` : ''}
                </div>
              </div>
              <span style={{ fontWeight: 700, color: PURPLE, fontSize: 15 }}>{fmtMoney(d.amount)}</span>
              <button onClick={() => confirmDelete(donations, saveDonations, d.id, 'this donation')} style={btnDanger} aria-label="Delete donation">×</button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Sermons ──────────────────────────────────────────────── */}
      {active === 'sermons' && (
        <div>
          <div style={formPanel}>
            <div style={formGrid}>
              <Field label="Title *" full>
                <input type="text" placeholder="Sermon title" value={sermonForm.title} onChange={(e) => setField(setSermonForm)('title', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Preacher *">
                <input type="text" placeholder="e.g. Pastor David" value={sermonForm.preacher} onChange={(e) => setField(setSermonForm)('preacher', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Date *">
                <input type="date" value={sermonForm.date} onChange={(e) => setField(setSermonForm)('date', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Scripture reference">
                <input type="text" placeholder="e.g. John 3:16-18" value={sermonForm.scripture_ref} onChange={(e) => setField(setSermonForm)('scripture_ref', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Audio URL (optional)" hint="MP3 / WAV / OGG — used by the inline player">
                <input type="url" placeholder="https://...sermon.mp3" value={sermonForm.audio_url} onChange={(e) => setField(setSermonForm)('audio_url', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Summary" full>
                <textarea rows={3} placeholder="Short summary of the message..." value={sermonForm.summary} onChange={(e) => setField(setSermonForm)('summary', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={addSermon} style={btnPrimary}>+ Add Sermon</button>
            </div>
          </div>

          {sermons.length === 0 ? (
            <EmptyState icon="🎙️" text="Sermon library is empty. Add the first sermon above." />
          ) : sermons.map((s) => (
            <div key={s.id} style={{ ...cardStyle }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ fontSize: 26 }}>🎙️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: TEXT, fontSize: 15 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                    {s.preacher} • {fmtDate(s.date)}{s.scripture_ref ? ` • 📖 ${s.scripture_ref}` : ''}
                  </div>
                  {s.summary && <p style={{ fontSize: 13, color: TEXT_SEC, margin: '8px 0 0' }}>{s.summary}</p>}
                  {s.audio_url && (
                    <AudioPlayer src={s.audio_url} title={`${s.title} — ${s.preacher}`} />
                  )}
                </div>
                <button onClick={() => confirmDelete(sermons, saveSermons, s.id, 'this sermon')} style={btnDanger} aria-label="Delete sermon">×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Committees ───────────────────────────────────────────── */}
      {active === 'committees' && (
        <div>
          {!selectedCommittee && (
            <div style={formPanel}>
              <div style={formGrid}>
                <Field label="Committee name *" full>
                  <input type="text" placeholder="e.g. Elders' Council" value={committeeForm.name} onChange={(e) => setField(setCommitteeForm)('name', e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Chairperson *">
                  <input type="text" placeholder="e.g. Samuel Kato" value={committeeForm.chair} onChange={(e) => setField(setCommitteeForm)('chair', e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Members count" hint="Expected headcount (roster populated below)">
                  <input type="number" min="0" placeholder="8" value={committeeForm.members_count} onChange={(e) => setField(setCommitteeForm)('members_count', e.target.value)} style={inputStyle} />
                </Field>
                <Field label="Meeting frequency">
                  <select value={committeeForm.meeting_frequency} onChange={(e) => setField(setCommitteeForm)('meeting_frequency', e.target.value)} style={inputStyle}>
                    {Object.entries(freqLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <button onClick={addCommittee} style={btnPrimary}>+ Add Committee</button>
              </div>
            </div>
          )}

          {!selectedCommittee && (
            committees.length === 0 ? (
              <EmptyState icon="👥" text="No committees yet. Create your first committee above." />
            ) : committees.map((c) => (
              <div key={c.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setSelectedCommitteeId(c.id)}>
                <div style={{ fontSize: 26 }}>👥</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: TEXT }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>
                    Chair: <span style={{ color: PURPLE, fontWeight: 600 }}>{c.chair}</span> • {(c.roster || []).length}/{c.members_count || 0} roster members • Meets {freqLabel[c.meeting_frequency]}
                  </div>
                </div>
                <span style={{ ...pill(PURPLE_LIGHT, TEXT), fontSize: 11, padding: '5px 10px' }}>{freqLabel[c.meeting_frequency]}</span>
                <span style={{ color: TEXT_SEC, fontSize: 18, padding: '0 4px' }}>›</span>
                <button onClick={(e) => { e.stopPropagation(); confirmDelete(committees, saveCommittees, c.id, `the '${c.name}' committee`); }} style={btnDanger} aria-label="Delete committee">×</button>
              </div>
            ))
          )}

          {selectedCommittee && (
            <div>
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => { setSelectedCommitteeId(null); setCommitteeTab('roster'); }} style={btnGhost}>← Back to list</button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 16 }}>{selectedCommittee.name}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>
                    Chair: <span style={{ color: PURPLE, fontWeight: 600 }}>{selectedCommittee.chair}</span> • Meets {freqLabel[selectedCommittee.meeting_frequency]}
                  </div>
                </div>
                <span style={{ ...pill(PURPLE_LIGHT, TEXT), fontSize: 11, padding: '5px 10px' }}>{(selectedCommittee.roster || []).length} members</span>
              </div>

              {/* Committee sub-tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {[
                  { id: 'roster', label: '👥 Roster' },
                  { id: 'minutes', label: '📝 Meeting Minutes' },
                  { id: 'attendance', label: '✅ Attendance' },
                ].map((t) => (
                  <button key={t.id} onClick={() => setCommitteeTab(t.id)} style={{
                    padding: '8px 14px', borderRadius: 6, border: 0, cursor: 'pointer', fontFamily: 'inherit',
                    background: committeeTab === t.id ? PURPLE : 'transparent',
                    color: committeeTab === t.id ? 'white' : TEXT_SEC,
                    fontWeight: 600, fontSize: 13,
                  }}>{t.label}</button>
                ))}
              </div>

              {/* ─ Roster ─ */}
              {committeeTab === 'roster' && (
                <div>
                  <div style={cardStyle}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Add member to roster</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                      <div style={{ flex: 1 }}>
                        <select id="" onChange={(e) => { if (e.target.value) { addCommitteeMember(selectedCommittee.id, e.target.value); e.target.value = ''; } }} style={inputStyle} defaultValue="">
                          <option value="">— Select a member from the directory —</option>
                          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.family ? ` (${m.family})` : ''}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {(selectedCommittee.roster || []).length === 0 ? (
                    <EmptyState icon="👥" text="No members on this committee's roster yet." />
                  ) : (
                    <div style={tableWrap}>
                      <table style={tableStyle}>
                        <thead><tr><th style={thStyle}>Name</th><th style={thStyle}>Phone</th><th style={thStyle}>Email</th><th style={thStyle}>Status</th><th style={thStyle}></th></tr></thead>
                        <tbody>
                          {selectedCommittee.roster.map((mid) => {
                            const m = members.find((x) => x.id === mid) || { name: '(unknown)', phone: '—', email: '', membership_status: 'inactive' };
                            const sc = STATUS_COLORS[m.membership_status] || STATUS_COLORS.inactive;
                            return (
                              <tr key={mid}>
                                <td style={tdStyle}>{m.name}</td>
                                <td style={tdStyle}>{m.phone}</td>
                                <td style={tdStyle}>{m.email || '—'}</td>
                                <td style={tdStyle}><span style={pill(sc.bg, sc.fg)}>{sc.label}</span></td>
                                <td style={tdStyle}><button onClick={() => removeCommitteeMember(selectedCommittee.id, mid)} style={btnDanger} aria-label="Remove from roster">×</button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ─ Minutes ─ */}
              {committeeTab === 'minutes' && (
                <div>
                  <div style={cardStyle}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Record meeting minutes</div>
                    <div style={formGrid}>
                      <Field label="Meeting date *">
                        <input type="date" value={committeeMinuteForm.date} onChange={(e) => setCommitteeMinuteForm((p) => ({ ...p, date: e.target.value }))} style={inputStyle} />
                      </Field>
                      <Field label="Notes *" full>
                        <textarea rows={3} placeholder="Key decisions, action items, attendees..." value={committeeMinuteForm.notes} onChange={(e) => setCommitteeMinuteForm((p) => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
                      </Field>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button onClick={() => addCommitteeMinute(selectedCommittee.id)} style={btnPrimary}>+ Add Minutes</button>
                    </div>
                  </div>

                  {(selectedCommittee.minutes || []).length === 0 ? (
                    <EmptyState icon="📝" text="No meeting minutes recorded for this committee." />
                  ) : (selectedCommittee.minutes || []).map((mn) => (
                    <div key={mn.id} style={{ ...cardStyle, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ fontSize: 22 }}>📝</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: TEXT, fontSize: 13 }}>{fmtDate(mn.date)}</div>
                        <p style={{ fontSize: 13, color: TEXT_SEC, margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{mn.notes}</p>
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>Recorded {new Date(mn.recorded_at).toLocaleString()}</div>
                      </div>
                      <button onClick={() => deleteCommitteeMinute(selectedCommittee.id, mn.id)} style={btnDanger} aria-label="Delete minutes">×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* ─ Attendance ─ */}
              {committeeTab === 'attendance' && (
                <div>
                  <div style={cardStyle}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Log attendance</div>
                    <div style={formGrid}>
                      <Field label="Meeting date *">
                        <input type="date" value={committeeAttendanceForm.date} onChange={(e) => setCommitteeAttendanceForm((p) => ({ ...p, date: e.target.value }))} style={inputStyle} />
                      </Field>
                      <Field label="Present count *" hint="Non-negative number">
                        <input type="number" min="0" placeholder={`${(selectedCommittee.roster || []).length}`} value={committeeAttendanceForm.present_count} onChange={(e) => setCommitteeAttendanceForm((p) => ({ ...p, present_count: e.target.value }))} style={inputStyle} />
                      </Field>
                      <Field label="Notes" full>
                        <input type="text" placeholder="Excused absences, follow-ups..." value={committeeAttendanceForm.notes} onChange={(e) => setCommitteeAttendanceForm((p) => ({ ...p, notes: e.target.value }))} style={inputStyle} />
                      </Field>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button onClick={() => addCommitteeAttendance(selectedCommittee.id)} style={btnPrimary}>+ Record Attendance</button>
                    </div>
                  </div>

                  {(selectedCommittee.attendance || []).length === 0 ? (
                    <EmptyState icon="✅" text="No attendance records for this committee yet." />
                  ) : (
                    <div style={tableWrap}>
                      <table style={tableStyle}>
                        <thead><tr><th style={thStyle}>Date</th><th style={thStyle}>Present</th><th style={thStyle}>Notes</th><th style={thStyle}></th></tr></thead>
                        <tbody>
                          {(selectedCommittee.attendance || []).map((a) => (
                            <tr key={a.id}>
                              <td style={tdStyle}>{fmtDate(a.date)}</td>
                              <td style={tdStyle}><span style={{ ...pill('rgba(11, 128, 67, 0.25)', STATUS_COLORS.active.fg), fontSize: 11 }}>{a.present_count} present</span></td>
                              <td style={tdStyle}>{a.notes || '—'}</td>
                              <td style={tdStyle}><button onClick={() => deleteCommitteeAttendance(selectedCommittee.id, a.id)} style={btnDanger} aria-label="Delete attendance">×</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Volunteers ───────────────────────────────────────────── */}
      {active === 'volunteers' && (
        <div>
          <div style={formPanel}>
            <div style={formGrid}>
              <Field label="Member name *">
                <input type="text" list="member-suggestions" placeholder="e.g. Mary Atim" value={volunteerForm.member} onChange={(e) => setField(setVolunteerForm)('member', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Hours *" hint="Must be greater than zero">
                <input type="number" min="0" step="0.5" placeholder="3" value={volunteerForm.hours} onChange={(e) => setField(setVolunteerForm)('hours', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Activity *">
                <input type="text" placeholder="e.g. Sunday school teaching" value={volunteerForm.activity} onChange={(e) => setField(setVolunteerForm)('activity', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Date *">
                <input type="date" value={volunteerForm.date} onChange={(e) => setField(setVolunteerForm)('date', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={addVolunteer} style={btnPrimary}>+ Log Volunteer Hours</button>
            </div>
          </div>

          {volunteerTotals.length > 0 && (
            <div style={{ ...cardStyle, background: BG_HOVER }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, color: PURPLE }}>Totals per member · Top volunteers eligible for certificates</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {volunteerTotals.map(([name, hrs]) => (
                  <button key={name} onClick={() => printCertificate(name, hrs)} style={{ ...pill(PURPLE_LIGHT, TEXT), fontSize: 12, padding: '6px 12px', cursor: 'pointer', border: `1px solid ${PURPLE_BORDER}` }} title="Generate printable certificate">
                    🏅 {name}: {hrs}h
                  </button>
                ))}
              </div>
            </div>
          )}

          {volunteers.length === 0 ? (
            <EmptyState icon="⏰" text="No volunteer hours logged yet. Log the first entry above." />
          ) : volunteers.map((v) => (
            <div key={v.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 26 }}>⏰</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: TEXT }}>{v.member}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{v.activity} • {fmtDate(v.date)}</div>
              </div>
              <button onClick={() => printCertificate(v.member, v.hours)} style={btnGhost} title="Print certificate">🖨 Certificate</button>
              <span style={{ fontWeight: 700, color: PURPLE, fontSize: 15 }}>{v.hours}h</span>
              <button onClick={() => confirmDelete(volunteers, saveVolunteers, v.id, 'this volunteer entry')} style={btnDanger} aria-label="Delete volunteer entry">×</button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Members ──────────────────────────────────────────────── */}
      {active === 'members' && (
        <div>
          <div style={formPanel}>
            <div style={formGrid}>
              <Field label="Full name *" full>
                <input type="text" placeholder="e.g. Esther Nabukenya" value={memberForm.name} onChange={(e) => setField(setMemberForm)('name', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Phone *" hint="7–15 digits, +/digits/spaces/-/() allowed">
                <input type="tel" placeholder="+256 7xx xxx xxx" value={memberForm.phone} onChange={(e) => setField(setMemberForm)('phone', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Email">
                <input type="email" placeholder="name@church.org" value={memberForm.email} onChange={(e) => setField(setMemberForm)('email', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Family / Surname" hint="Used for family grouping in the directory">
                <input type="text" placeholder="e.g. Mukasa family" value={memberForm.family} onChange={(e) => setField(setMemberForm)('family', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Baptism date">
                <input type="date" value={memberForm.baptism_date} onChange={(e) => setField(setMemberForm)('baptism_date', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Membership status">
                <select value={memberForm.membership_status} onChange={(e) => setField(setMemberForm)('membership_status', e.target.value)} style={inputStyle}>
                  <option value="active">Active</option>
                  <option value="visitor">Visitor</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={addMember} style={btnPrimary}>+ Add Member</button>
            </div>
          </div>

          {/* Search + filter bar */}
          {members.length > 0 && (
            <div style={{ ...cardStyle, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              <input type="text" placeholder="🔍 Search name, phone, email or family..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
              <select value={memberStatusFilter} onChange={(e) => setMemberStatusFilter(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 140 }}>
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="visitor">Visitors only</option>
                <option value="inactive">Inactive only</option>
              </select>
              <span style={{ fontSize: 12, color: MUTED }}>{filteredMembers.length} of {members.length}</span>
            </div>
          )}

          {members.length === 0 ? (
            <EmptyState icon="📞" text="Member directory is empty. Add your first member above." />
          ) : filteredMembers.length === 0 ? (
            <EmptyState icon="🔍" text="No members match your search." />
          ) : memberFamilyGroups.length === 0 || memberSearch || memberStatusFilter !== 'all' ? (
            // Flat list when filtering or searching
            filteredMembers.map((m) => {
              const sc = STATUS_COLORS[m.membership_status] || STATUS_COLORS.inactive;
              return (
                <div key={m.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 26 }}>📞</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: TEXT }}>
                      {m.name} <span style={pill(sc.bg, sc.fg)}>{sc.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                      {m.phone}{m.email ? ` • ${m.email}` : ''}{m.family ? ` • ${m.family}` : ''}{m.baptism_date ? ` • Baptised ${fmtDate(m.baptism_date)}` : ''}
                    </div>
                  </div>
                  <button onClick={() => confirmDelete(members, saveMembers, m.id, `the member '${m.name}'`)} style={btnDanger} aria-label="Delete member">×</button>
                </div>
              );
            })
          ) : (
            // Family-grouped view (default, no search/filter)
            memberFamilyGroups.map(([family, list]) => (
              <div key={family} style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 6px' }}>
                  👨‍👩‍👧 {family} <span style={{ color: MUTED, fontWeight: 400 }}>({list.length})</span>
                </h3>
                {list.map((m) => {
                  const sc = STATUS_COLORS[m.membership_status] || STATUS_COLORS.inactive;
                  return (
                    <div key={m.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 22 }}>📞</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: TEXT }}>
                          {m.name} <span style={pill(sc.bg, sc.fg)}>{sc.label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                          {m.phone}{m.email ? ` • ${m.email}` : ''}{m.baptism_date ? ` • Baptised ${fmtDate(m.baptism_date)}` : ''}
                        </div>
                      </div>
                      <button onClick={() => confirmDelete(members, saveMembers, m.id, `the member '${m.name}'`)} style={btnDanger} aria-label="Delete member">×</button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── Events ────────────────────────────────────────────────── */}
      {active === 'events' && (
        <div>
          <div style={formPanel}>
            <div style={formGrid}>
              <Field label="Event title *" full>
                <input type="text" placeholder="e.g. Sunday Worship Service" value={eventForm.title} onChange={(e) => setField(setEventForm)('title', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Date *">
                <input type="date" value={eventForm.date} onChange={(e) => setField(setEventForm)('date', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Type">
                <select value={eventForm.type} onChange={(e) => setField(setEventForm)('type', e.target.value)} style={inputStyle}>
                  {Object.entries(eventTypeLabel).map(([k, v]) => <option key={k} value={k}>{eventTypeIcon[k]} {v}</option>)}
                </select>
              </Field>
              <Field label="Expected attendance" hint="Non-negative number">
                <input type="number" min="0" placeholder="120" value={eventForm.expected_count} onChange={(e) => setField(setEventForm)('expected_count', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Actual attendance" hint="Fill in after the event">
                <input type="number" min="0" placeholder="115" value={eventForm.attendance_count} onChange={(e) => setField(setEventForm)('attendance_count', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={addEvent} style={btnPrimary}>+ Add Event</button>
            </div>
          </div>

          {upcomingEvents.length > 0 && (
            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: PURPLE, textTransform: 'uppercase', letterSpacing: 0.4 }}>Upcoming events</h3>
          )}
          {upcomingEvents.length === 0 && events.length === 0 ? (
            <EmptyState icon="📅" text="No events scheduled. Add your first event above." />
          ) : (
            <>
              {upcomingEvents.map((ev) => {
                const counts = rsvpCounts(ev.id);
                const expected = Number(ev.expected_count) || 0;
                const draft = rsvpForm[ev.id] || { member: '', status: 'yes', note: '' };
                return (
                  <div key={ev.id} style={{ ...cardStyle, borderLeft: `4px solid ${PURPLE}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ fontSize: 26 }}>{eventTypeIcon[ev.type] || '📌'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: TEXT }}>{ev.title}</div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>
                          {new Date(ev.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          {expected ? ` • Expected ${expected}` : ''}
                          {ev.attendance_count ? ` • Actual ${ev.attendance_count}` : ''}
                        </div>
                        {/* RSVP summary chips */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={pill('rgba(11, 128, 67, 0.25)', STATUS_COLORS.active.fg)}>✓ {counts.yes} yes</span>
                          <span style={pill('rgba(249, 171, 0, 0.22)', STATUS_COLORS.visitor.fg)}>~ {counts.maybe} maybe</span>
                          <span style={pill('rgba(95, 99, 104, 0.28)', STATUS_COLORS.inactive.fg)}>✗ {counts.no} no</span>
                          <span style={pill(PURPLE_LIGHT, TEXT)}>{counts.total} total RSVPs</span>
                        </div>

                        {/* Add RSVP form */}
                        <div style={{ borderTop: `1px solid ${BORDER_DARK}`, paddingTop: 8, display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 6, alignItems: 'end' }}>
                          <Field label="Member name"><input type="text" list="member-suggestions" placeholder="Member" value={draft.member} onChange={(e) => setRsvpField(ev.id, 'member', e.target.value)} style={inputStyle} /></Field>
                          <Field label="Status">
                            <select value={draft.status} onChange={(e) => setRsvpField(ev.id, 'status', e.target.value)} style={inputStyle}>
                              <option value="yes">Yes</option>
                              <option value="no">No</option>
                              <option value="maybe">Maybe</option>
                            </select>
                          </Field>
                          <Field label="Follow-up note"><input type="text" placeholder="e.g. needs transport" value={draft.note} onChange={(e) => setRsvpField(ev.id, 'note', e.target.value)} style={inputStyle} /></Field>
                          <button onClick={() => addRsvp(ev.id)} style={{ ...btnPrimary, padding: '8px 14px', alignSelf: 'end' }}>+ Add RSVP</button>
                        </div>

                        {/* RSVP list (only those with notes or marked no/maybe) */}
                        {rsvpsForEvent(ev.id).length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            {rsvpsForEvent(ev.id).slice(0, 6).map((r) => {
                              const sc = r.status === 'yes' ? STATUS_COLORS.active : (r.status === 'maybe' ? STATUS_COLORS.visitor : STATUS_COLORS.inactive);
                              return (
                                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 0', borderBottom: `1px solid ${BORDER_DARK}` }}>
                                  <span style={pill(sc.bg, sc.fg)}>{r.status}</span>
                                  <span style={{ color: TEXT }}>{r.member}</span>
                                  {r.note && <span style={{ color: MUTED }}>· {r.note}</span>}
                                  <button onClick={() => confirmDelete(rsvps, saveRsvps, r.id, `RSVP for ${r.member}`)} style={btnDanger} aria-label="Delete RSVP">×</button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Expected vs actual helper */}
                        {expected > 0 && (
                          <div style={{ marginTop: 8, fontSize: 11, color: MUTED }}>
                            Expected: <span style={{ color: TEXT, fontWeight: 600 }}>{expected}</span> · Confirmed yes: <span style={{ color: STATUS_COLORS.active.fg, fontWeight: 600 }}>{counts.yes}</span> · Gap: <span style={{ color: expected - counts.yes > 0 ? RED_FG : STATUS_COLORS.active.fg, fontWeight: 600 }}>{expected - counts.yes}</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => {
                        if (!window.confirm(`Delete '${ev.title}'? This also removes ${rsvpsForEvent(ev.id).length} RSVP(s).`)) return;
                        saveEvents(events.filter((x) => x.id !== ev.id));
                        saveRsvps(rsvps.filter((r) => r.event_id !== ev.id));
                      }} style={btnDanger} aria-label="Delete event">×</button>
                    </div>
                  </div>
                );
              })}

              {pastEvents.length > 0 && (
                <>
                  <h3 style={{ margin: '16px 0 10px', fontSize: 13, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: 0.4 }}>Past events</h3>
                  {pastEvents.slice(0, 8).map((ev) => {
                    const counts = rsvpCounts(ev.id);
                    return (
                      <div key={ev.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.85 }}>
                        <div style={{ fontSize: 22 }}>{eventTypeIcon[ev.type] || '📌'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: TEXT }}>{ev.title}</div>
                          <div style={{ fontSize: 11, color: MUTED }}>
                            {fmtDate(ev.date)} • Expected {ev.expected_count || '—'} · Actual {ev.attendance_count || '—'} · {counts.total} RSVPs
                          </div>
                        </div>
                        <button onClick={() => {
                          if (!window.confirm(`Delete '${ev.title}'?`)) return;
                          saveEvents(events.filter((x) => x.id !== ev.id));
                          saveRsvps(rsvps.filter((r) => r.event_id !== ev.id));
                        }} style={btnDanger} aria-label="Delete event">×</button>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Finance ──────────────────────────────────────────────── */}
      {active === 'finance' && (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: TEXT_SEC }}>Year:</label>
            <select value={financeYear} onChange={(e) => setFinanceYear(Number(e.target.value))} style={{ ...inputStyle, width: 'auto' }}>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => setFinanceYear(thisYear())} style={btnGhost}>Reset to current year</button>
          </div>

          {/* Top-level stat cards */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <StatCard icon="💰" label={`Tithes ${financeData.y}`} value={fmtMoney(financeData.titheTotal)} sub={`${financeData.yTithes.length} contributions`} />
            <StatCard icon="🤝" label={`Donations ${financeData.y}`} value={fmtMoney(financeData.donationTotal)} sub={`${financeData.yDonations.length} donations`} />
            <StatCard icon="💸" label={`Expenses ${financeData.y}`} value={fmtMoney(financeData.expenseTotal)} sub={`${financeData.yExpenses.length} entries`} />
            <StatCard
              icon={financeData.netIncome >= 0 ? '📈' : '📉'}
              label={`Net income ${financeData.y}`}
              value={fmtMoney(financeData.netIncome)}
              sub={financeData.netIncome >= 0 ? 'Surplus' : 'Deficit'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Income by fund */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, color: TEXT }}>Income — by fund</h3>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <PieChart data={financeData.fundRows} size={170} />
              </div>
              {financeData.fundRows.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No donation income recorded for {financeData.y}.</p>
              ) : (
                financeData.fundRows.map((f) => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0', borderBottom: `1px solid ${BORDER_DARK}` }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: f.color, display: 'inline-block' }} />
                    <span style={{ flex: 1, color: TEXT }}>{f.label}</span>
                    <span style={{ fontWeight: 600, color: TEXT }}>{fmtMoney(f.value)}</span>
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `2px solid ${PURPLE}`, fontWeight: 700, color: PURPLE }}>
                <span>Total income</span><span>{fmtMoney(financeData.incomeTotal)}</span>
              </div>
            </div>

            {/* Expenses by category */}
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, color: TEXT }}>Expenses — by category</h3>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <PieChart data={financeData.expenseRows} size={170} />
              </div>
              {financeData.expenseRows.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No expenses recorded for {financeData.y}.</p>
              ) : (
                financeData.expenseRows.map((f) => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0', borderBottom: `1px solid ${BORDER_DARK}` }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: f.color, display: 'inline-block' }} />
                    <span style={{ flex: 1, color: TEXT }}>{f.label}</span>
                    <span style={{ fontWeight: 600, color: TEXT }}>{fmtMoney(f.value)}</span>
                  </div>
                ))
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `2px solid ${RED}`, fontWeight: 700, color: RED_FG }}>
                <span>Total expenses</span><span>{fmtMoney(financeData.expenseTotal)}</span>
              </div>
            </div>
          </div>

          {/* Quick expense entry */}
          <div style={{ ...formPanel, marginTop: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, color: TEXT }}>💸 Log Church Expense</h3>
            <div style={formGrid}>
              <Field label="Description *" full>
                <input type="text" placeholder="e.g. Electricity bill — October" value={expenseForm.description} onChange={(e) => setField(setExpenseForm)('description', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Amount (UGX) *" hint="Must be greater than zero">
                <input type="number" min="0" step="1" placeholder="250000" value={expenseForm.amount} onChange={(e) => setField(setExpenseForm)('amount', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Category">
                <select value={expenseForm.category} onChange={(e) => setField(setExpenseForm)('category', e.target.value)} style={inputStyle}>
                  {Object.entries(expenseCategories).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="Date *">
                <input type="date" value={expenseForm.date} onChange={(e) => setField(setExpenseForm)('date', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={addExpense} style={btnPrimary}>+ Log Expense</button>
            </div>
          </div>

          {/* Recent expenses list */}
          {expenses.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 13, color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 8px' }}>Recent expenses</h3>
              <div style={tableWrap}>
                <table style={tableStyle}>
                  <thead><tr><th style={thStyle}>Date</th><th style={thStyle}>Description</th><th style={thStyle}>Category</th><th style={thStyle}>Amount</th><th style={thStyle}></th></tr></thead>
                  <tbody>
                    {expenses.filter((e) => yearOf(e.date) === financeData.y).slice(0, 12).map((e) => {
                      const cat = expenseCategories[e.category] || expenseCategories.other;
                      return (
                        <tr key={e.id}>
                          <td style={tdStyle}>{fmtDate(e.date)}</td>
                          <td style={tdStyle}>{e.description}</td>
                          <td style={tdStyle}><span style={pill(cat.color + '33', cat.color)}>{cat.label}</span></td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: RED_FG }}>{fmtMoney(e.amount)}</td>
                          <td style={tdStyle}><button onClick={() => confirmDelete(expenses, saveExpenses, e.id, 'this expense')} style={btnDanger} aria-label="Delete expense">×</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Print annual report */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              onClick={() => {
                const fundRows = financeData.fundRows.map((f) => `<tr><td>${f.label}</td><td class="right">${fmtMoney(f.value)}</td></tr>`).join('');
                const expRows = financeData.expenseRows.map((f) => `<tr><td>${f.label}</td><td class="right">${fmtMoney(f.value)}</td></tr>`).join('');
                const body = `
                  <h1>⛪ Annual Finance Report — ${financeData.y}</h1>
                  <div class="meta">Generated ${new Date().toLocaleString()}</div>
                  <h2>Summary</h2>
                  <table>
                    <tr><td>Total tithes</td><td class="right">${fmtMoney(financeData.titheTotal)}</td></tr>
                    <tr><td>Total donations</td><td class="right">${fmtMoney(financeData.donationTotal)}</td></tr>
                    <tr class="total"><td>Total income</td><td class="right">${fmtMoney(financeData.incomeTotal)}</td></tr>
                    <tr><td>Total expenses</td><td class="right">${fmtMoney(financeData.expenseTotal)}</td></tr>
                    <tr class="total"><td>Net ${financeData.netIncome >= 0 ? 'surplus' : 'deficit'}</td><td class="right">${fmtMoney(financeData.netIncome)}</td></tr>
                  </table>
                  <h2>Income by Fund</h2>
                  <table><thead><tr><th>Fund</th><th class="right">Amount</th></tr></thead><tbody>${fundRows || '<tr><td colspan=2>No donation income recorded.</td></tr>'}</tbody></table>
                  <h2>Expenses by Category</h2>
                  <table><thead><tr><th>Category</th><th class="right">Amount</th></tr></thead><tbody>${expRows || '<tr><td colspan=2>No expenses recorded.</td></tr>'}</tbody></table>
                `;
                printHTML(`Annual Finance Report ${financeData.y}`, body);
              }}
              style={{ ...btnPrimary, padding: '12px 24px' }}
            >🖨 Print annual report</button>
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: MUTED, marginTop: 24, textAlign: 'center' }}>
        ⛪ Ssewasswa Comforts — Church Portal · data persists locally in your browser · {tithes.length + donations.length + sermons.length + committees.length + volunteers.length + members.length + events.length + pledges.length + expenses.length + rsvps.length} records stored
      </p>
    </div>
  );
}
