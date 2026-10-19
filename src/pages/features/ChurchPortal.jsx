// Ssewasswa Comforts — Church / Religious Org Portal
// Replaces the FeatureComingSoon placeholder for the church-portal route.
// Covers: tithes, donations, sermons, committees, volunteer hours,
// member directory, events, and a top-level dashboard summary.
// Data persists to localStorage per section (same pattern as Tasks.jsx / Surveys.jsx).
import React, { useState, useEffect, useMemo } from 'react';

// ─── Theme (purple — matches SAASPortal church-portal color) ───────────
const PURPLE = '#9c27b0';
const PURPLE_DARK = '#4a148c';
const PURPLE_LIGHT = '#f3e5f5';
const TEXT = '#202124';
const TEXT_SEC = '#5f6368';
const BORDER = '#e0e0e0';
const MUTED = '#9aa0a6';

// ─── Tab catalog ────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', icon: '📊', name: 'Dashboard' },
  { id: 'tithes', icon: '💰', name: 'Tithes' },
  { id: 'donations', icon: '🤝', name: 'Donations' },
  { id: 'sermons', icon: '🎙️', name: 'Sermons' },
  { id: 'committees', icon: '👥', name: 'Committees' },
  { id: 'volunteers', icon: '⏰', name: 'Volunteers' },
  { id: 'members', icon: '📞', name: 'Members' },
  { id: 'events', icon: '📅', name: 'Events' },
];

// ─── localStorage keys (namespaced under erp_church_*) ──────────────────
const STORAGE = {
  tithes: 'erp_church_tithes',
  donations: 'erp_church_donations',
  sermons: 'erp_church_sermons',
  committees: 'erp_church_committees',
  volunteers: 'erp_church_volunteers',
  members: 'erp_church_members',
  events: 'erp_church_events',
};

// ─── Helpers ────────────────────────────────────────────────────────────
const uid = () => Date.now() + Math.floor(Math.random() * 100000);
const todayISO = () => new Date().toISOString().slice(0, 10);
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

// ─── Shared inline style fragments ─────────────────────────────────────
const inputStyle = {
  width: '100%',
  padding: 10,
  borderRadius: 6,
  border: `1px solid ${BORDER}`,
  fontSize: 14,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};
const labelStyle = { fontSize: 12, fontWeight: 600, color: TEXT_SEC, marginBottom: 4, display: 'block' };
const btnPrimary = { padding: '10px 20px', background: PURPLE, color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const btnDanger = { background: 'none', border: 0, color: '#d32f2f', cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 };
const cardStyle = { padding: 16, borderRadius: 8, background: 'white', border: `1px solid ${BORDER}`, marginBottom: 8 };
const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 };
const pill = (bg, fg) => ({ background: bg, color: fg, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.3 });

// ─── Small presentational helpers ──────────────────────────────────────
function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, color: TEXT_SEC, background: PURPLE_LIGHT, borderRadius: 8, border: `1px dashed ${PURPLE}` }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: 14, margin: 0 }}>{text}</p>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto', display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div style={{ flex: '1 1 220px', minWidth: 220, padding: 18, borderRadius: 10, background: 'white', border: `1px solid ${BORDER}`, borderTop: `4px solid ${PURPLE}` }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: PURPLE_DARK, margin: '6px 0 2px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED }}>{sub}</div>}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────
export default function ChurchPortal() {
  const [active, setActive] = useState('dashboard');

  // Data slices (one per section).
  const [tithes, setTithes] = useState([]);
  const [donations, setDonations] = useState([]);
  const [sermons, setSermons] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);

  // Form state objects — one per section.
  const emptyTithe = { member: '', amount: '', date: todayISO() };
  const emptyDonation = { donor: '', amount: '', purpose: '', date: todayISO() };
  const emptySermon = { title: '', preacher: '', date: todayISO(), scripture_ref: '', summary: '', audio_url: '' };
  const emptyCommittee = { name: '', chair: '', members_count: '', meeting_frequency: 'monthly' };
  const emptyVolunteer = { member: '', hours: '', activity: '', date: todayISO() };
  const emptyMember = { name: '', phone: '', email: '', baptism_date: '', membership_status: 'active' };
  const emptyEvent = { title: '', date: todayISO(), type: 'service', attendance_count: '' };

  const [titheForm, setTitheForm] = useState(emptyTithe);
  const [donationForm, setDonationForm] = useState(emptyDonation);
  const [sermonForm, setSermonForm] = useState(emptySermon);
  const [committeeForm, setCommitteeForm] = useState(emptyCommittee);
  const [volunteerForm, setVolunteerForm] = useState(emptyVolunteer);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [eventForm, setEventForm] = useState(emptyEvent);

  // ─── Load everything from localStorage on mount ───────────────────────
  useEffect(() => {
    try {
      setTithes(JSON.parse(localStorage.getItem(STORAGE.tithes) || '[]'));
      setDonations(JSON.parse(localStorage.getItem(STORAGE.donations) || '[]'));
      setSermons(JSON.parse(localStorage.getItem(STORAGE.sermons) || '[]'));
      setCommittees(JSON.parse(localStorage.getItem(STORAGE.committees) || '[]'));
      setVolunteers(JSON.parse(localStorage.getItem(STORAGE.volunteers) || '[]'));
      setMembers(JSON.parse(localStorage.getItem(STORAGE.members) || '[]'));
      setEvents(JSON.parse(localStorage.getItem(STORAGE.events) || '[]'));
    } catch { /* ignore malformed localStorage */ }
  }, []);

  // ─── Generic persistence (state + localStorage write) ────────────────
  const saveTithes = (u) => { setTithes(u); localStorage.setItem(STORAGE.tithes, JSON.stringify(u)); };
  const saveDonations = (u) => { setDonations(u); localStorage.setItem(STORAGE.donations, JSON.stringify(u)); };
  const saveSermons = (u) => { setSermons(u); localStorage.setItem(STORAGE.sermons, JSON.stringify(u)); };
  const saveCommittees = (u) => { setCommittees(u); localStorage.setItem(STORAGE.committees, JSON.stringify(u)); };
  const saveVolunteers = (u) => { setVolunteers(u); localStorage.setItem(STORAGE.volunteers, JSON.stringify(u)); };
  const saveMembers = (u) => { setMembers(u); localStorage.setItem(STORAGE.members, JSON.stringify(u)); };
  const saveEvents = (u) => { setEvents(u); localStorage.setItem(STORAGE.events, JSON.stringify(u)); };

  // ─── Dashboard aggregates ────────────────────────────────────────────
  const tmKey = thisMonthKey();
  const tithesThisMonth = tithes.filter((t) => monthKey(t.date) === tmKey).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const donationsThisMonth = donations.filter((d) => monthKey(d.date) === tmKey).reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const donationsTotal = donations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const volunteerHoursTotal = volunteers.reduce((s, v) => s + (Number(v.hours) || 0), 0);

  // ─── Tithes ──────────────────────────────────────────────────────────
  const addTithe = () => {
    if (!titheForm.member.trim() || !titheForm.amount || !titheForm.date) return;
    saveTithes([{ id: uid(), member: titheForm.member.trim(), amount: Number(titheForm.amount), date: titheForm.date, created_at: new Date().toISOString() }, ...tithes]);
    setTitheForm(emptyTithe);
  };
  const tithesByMonth = useMemo(() => {
    const m = {};
    tithes.forEach((t) => { const k = monthKey(t.date); if (!k) return; m[k] = (m[k] || 0) + (Number(t.amount) || 0); });
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [tithes]);

  // ─── Donations ───────────────────────────────────────────────────────
  const addDonation = () => {
    if (!donationForm.donor.trim() || !donationForm.amount || !donationForm.date) return;
    saveDonations([{ id: uid(), donor: donationForm.donor.trim(), amount: Number(donationForm.amount), purpose: donationForm.purpose.trim() || 'General', date: donationForm.date, created_at: new Date().toISOString() }, ...donations]);
    setDonationForm(emptyDonation);
  };

  // ─── Sermons ─────────────────────────────────────────────────────────
  const addSermon = () => {
    if (!sermonForm.title.trim() || !sermonForm.preacher.trim() || !sermonForm.date) return;
    saveSermons([{ id: uid(), ...sermonForm, title: sermonForm.title.trim(), preacher: sermonForm.preacher.trim(), created_at: new Date().toISOString() }, ...sermons]);
    setSermonForm(emptySermon);
  };

  // ─── Committees ───────────────────────────────────────────────────────
  const addCommittee = () => {
    if (!committeeForm.name.trim() || !committeeForm.chair.trim()) return;
    saveCommittees([{ id: uid(), name: committeeForm.name.trim(), chair: committeeForm.chair.trim(), members_count: Number(committeeForm.members_count) || 0, meeting_frequency: committeeForm.meeting_frequency, created_at: new Date().toISOString() }, ...committees]);
    setCommitteeForm(emptyCommittee);
  };
  const freqLabel = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' };

  // ─── Volunteer hours ─────────────────────────────────────────────────
  const addVolunteer = () => {
    if (!volunteerForm.member.trim() || !volunteerForm.hours || !volunteerForm.activity.trim() || !volunteerForm.date) return;
    saveVolunteers([{ id: uid(), member: volunteerForm.member.trim(), hours: Number(volunteerForm.hours), activity: volunteerForm.activity.trim(), date: volunteerForm.date, created_at: new Date().toISOString() }, ...volunteers]);
    setVolunteerForm(emptyVolunteer);
  };
  const volunteerTotals = useMemo(() => {
    const m = {};
    volunteers.forEach((v) => { const k = v.member?.trim() || 'Unknown'; m[k] = (m[k] || 0) + (Number(v.hours) || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [volunteers]);

  // ─── Members ──────────────────────────────────────────────────────────
  const addMember = () => {
    if (!memberForm.name.trim() || !memberForm.phone.trim()) return;
    saveMembers([{ id: uid(), ...memberForm, name: memberForm.name.trim(), created_at: new Date().toISOString() }, ...members]);
    setMemberForm(emptyMember);
  };
  const statusColor = { active: ['#0b8043', '#fff', '#e6f4ea'], visitor: ['#f9ab00', '#fff', '#fef7e0'], inactive: ['#5f6368', '#fff', '#f1f3f4'] };

  // ─── Events ───────────────────────────────────────────────────────────
  const addEvent = () => {
    if (!eventForm.title.trim() || !eventForm.date) return;
    saveEvents([{ id: uid(), title: eventForm.title.trim(), date: eventForm.date, type: eventForm.type, attendance_count: Number(eventForm.attendance_count) || 0, created_at: new Date().toISOString() }, ...events]);
    setEventForm(emptyEvent);
  };
  const eventTypeIcon = { service: '⛪', conference: '🎤', retreat: '🌄', wedding: '💍', funeral: '🕊️', outreach: '🤲', youth: '🎵', other: '📌' };
  const upcomingEvents = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [...events].filter((e) => new Date(e.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events]);

  // ─── Render helpers ───────────────────────────────────────────────────
  const setField = (setter) => (k, v) => setter((prev) => ({ ...prev, [k]: v }));
  const rowDelete = (list, save, id) => save(list.filter((x) => x.id !== id));

  return (
    <div className="page-container">
      <h1 className="page-title" style={{ color: PURPLE }}>⛪ Church / Religious Org Portal</h1>
      <p style={{ color: TEXT_SEC, fontSize: 14, marginBottom: 20 }}>
        Track tithes, donations, sermons, committees, volunteer hours, members and events — all stored locally in your browser.
      </p>

      {/* Tab strip — wraps on mobile */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, padding: 6, background: '#fafafa', borderRadius: 8, border: `1px solid ${BORDER}` }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              padding: '8px 12px', borderRadius: 6, border: 0, cursor: 'pointer',
              background: active === t.id ? PURPLE : 'transparent',
              color: active === t.id ? 'white' : TEXT_SEC,
              fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span>{t.icon}</span>
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      {/* ─── Dashboard ─────────────────────────────────────────────────── */}
      {active === 'dashboard' && (
        <div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <StatCard icon="💰" label="Tithes this month" value={fmtMoney(tithesThisMonth)} sub={`${tithes.filter((t) => monthKey(t.date) === tmKey).length} contributions`} />
            <StatCard icon="🤝" label="Donations this month" value={fmtMoney(donationsThisMonth)} sub={`${donations.filter((d) => monthKey(d.date) === tmKey).length} donations`} />
            <StatCard icon="📞" label="Total members" value={members.length} sub={`${members.filter((m) => m.membership_status === 'active').length} active`} />
            <StatCard icon="⏰" label="Volunteer hours" value={`${volunteerHoursTotal}h`} sub={`${volunteers.length} entries logged`} />
            <StatCard icon="📚" label="Sermons archived" value={sermons.length} sub={`${committees.length} committees`} />
            <StatCard icon="📅" label="Upcoming events" value={upcomingEvents.length} sub={`of ${events.length} total`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: PURPLE_DARK }}>Tithes — Monthly Totals</h3>
              {tithesByMonth.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No tithe records yet.</p>
              ) : tithesByMonth.slice(0, 6).map(([k, total]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ color: TEXT }}>{monthLabel(k)}</span>
                  <span style={{ fontWeight: 600, color: PURPLE_DARK }}>{fmtMoney(total)}</span>
                </div>
              ))}
            </div>

            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: PURPLE_DARK }}>Top Volunteers</h3>
              {volunteerTotals.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No volunteer hours logged.</p>
              ) : volunteerTotals.slice(0, 6).map(([name, hrs]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ color: TEXT }}>{name}</span>
                  <span style={{ fontWeight: 600, color: PURPLE_DARK }}>{hrs}h</span>
                </div>
              ))}
            </div>

            <div style={{ ...cardStyle, marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, color: PURPLE_DARK }}>Recent Donations</h3>
              {donations.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>No donations yet.</p>
              ) : donations.slice(0, 6).map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ color: TEXT }}>{d.donor} <span style={{ color: MUTED }}>· {d.purpose}</span></span>
                  <span style={{ fontWeight: 600, color: PURPLE_DARK }}>{fmtMoney(d.amount)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8, paddingTop: 8, borderTop: `2px solid ${PURPLE}`, fontWeight: 700, color: PURPLE_DARK }}>
                <span>Running total</span><span>{fmtMoney(donationsTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tithes ────────────────────────────────────────────────────── */}
      {active === 'tithes' && (
        <div>
          <div style={{ padding: 16, background: PURPLE_LIGHT, borderRadius: 8, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
            <div style={formGrid}>
              <Field label="Member name *">
                <input type="text" placeholder="e.g. John Mukasa" value={titheForm.member} onChange={(e) => setField(setTitheForm)('member', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Amount (UGX) *">
                <input type="number" min="0" placeholder="50000" value={titheForm.amount} onChange={(e) => setField(setTitheForm)('amount', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Date *">
                <input type="date" value={titheForm.date} onChange={(e) => setField(setTitheForm)('date', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={addTithe} style={btnPrimary}>+ Add Tithe</button>
            </div>
          </div>

          {tithesByMonth.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {tithesByMonth.map(([k, total]) => (
                <span key={k} style={{ ...pill(PURPLE, 'white'), fontSize: 11, padding: '5px 10px' }}>{monthLabel(k)}: {fmtMoney(total)}</span>
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
                <div style={{ fontSize: 11, color: MUTED }}>{fmtDate(t.date)} • Logged {new Date(t.created_at).toLocaleDateString()}</div>
              </div>
              <span style={{ fontWeight: 700, color: PURPLE_DARK, fontSize: 15 }}>{fmtMoney(t.amount)}</span>
              <button onClick={() => rowDelete(tithes, saveTithes, t.id)} style={btnDanger} aria-label="Delete tithe">×</button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Donations ─────────────────────────────────────────────────── */}
      {active === 'donations' && (
        <div>
          <div style={{ padding: 16, background: PURPLE_LIGHT, borderRadius: 8, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
            <div style={formGrid}>
              <Field label="Donor name *">
                <input type="text" placeholder="e.g. Grace Family" value={donationForm.donor} onChange={(e) => setField(setDonationForm)('donor', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Amount (UGX) *">
                <input type="number" min="0" placeholder="100000" value={donationForm.amount} onChange={(e) => setField(setDonationForm)('amount', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Purpose">
                <input type="text" placeholder="Building fund / Missions / General" value={donationForm.purpose} onChange={(e) => setField(setDonationForm)('purpose', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Date *">
                <input type="date" value={donationForm.date} onChange={(e) => setField(setDonationForm)('date', e.target.value)} style={inputStyle} />
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

          {donations.length === 0 ? (
            <EmptyState icon="🤝" text="No donations recorded yet. Add the first donation above." />
          ) : donations.map((d) => (
            <div key={d.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 26 }}>🤝</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: TEXT }}>{d.donor}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{fmtDate(d.date)} • Purpose: <span style={{ color: PURPLE_DARK, fontWeight: 600 }}>{d.purpose}</span></div>
              </div>
              <span style={{ fontWeight: 700, color: PURPLE_DARK, fontSize: 15 }}>{fmtMoney(d.amount)}</span>
              <button onClick={() => rowDelete(donations, saveDonations, d.id)} style={btnDanger} aria-label="Delete donation">×</button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Sermons ────────────────────────────────────────────────────── */}
      {active === 'sermons' && (
        <div>
          <div style={{ padding: 16, background: PURPLE_LIGHT, borderRadius: 8, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
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
              <Field label="Audio URL (optional)">
                <input type="url" placeholder="https://..." value={sermonForm.audio_url} onChange={(e) => setField(setSermonForm)('audio_url', e.target.value)} style={inputStyle} />
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
                    <a href={s.audio_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: PURPLE, fontWeight: 600, textDecoration: 'none' }}>
                      ▶ Listen to audio
                    </a>
                  )}
                </div>
                <button onClick={() => rowDelete(sermons, saveSermons, s.id)} style={btnDanger} aria-label="Delete sermon">×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Committees ────────────────────────────────────────────────── */}
      {active === 'committees' && (
        <div>
          <div style={{ padding: 16, background: PURPLE_LIGHT, borderRadius: 8, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
            <div style={formGrid}>
              <Field label="Committee name *" full>
                <input type="text" placeholder="e.g. Elders' Council" value={committeeForm.name} onChange={(e) => setField(setCommitteeForm)('name', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Chairperson *">
                <input type="text" placeholder="e.g. Samuel Kato" value={committeeForm.chair} onChange={(e) => setField(setCommitteeForm)('chair', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Members count">
                <input type="number" min="0" placeholder="8" value={committeeForm.members_count} onChange={(e) => setField(setCommitteeForm)('members_count', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Meeting frequency">
                <select value={committeeForm.meeting_frequency} onChange={(e) => setField(setCommitteeForm)('meeting_frequency', e.target.value)} style={inputStyle}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={addCommittee} style={btnPrimary}>+ Add Committee</button>
            </div>
          </div>

          {committees.length === 0 ? (
            <EmptyState icon="👥" text="No committees yet. Create your first committee above." />
          ) : committees.map((c) => (
            <div key={c.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 26 }}>👥</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: TEXT }}>{c.name}</div>
                <div style={{ fontSize: 11, color: MUTED }}>
                  Chair: <span style={{ color: PURPLE_DARK, fontWeight: 600 }}>{c.chair}</span> • {c.members_count} members • Meets {freqLabel[c.meeting_frequency]}
                </div>
              </div>
              <span style={{ ...pill(PURPLE_LIGHT, PURPLE_DARK), fontSize: 11, padding: '5px 10px' }}>{freqLabel[c.meeting_frequency]}</span>
              <button onClick={() => rowDelete(committees, saveCommittees, c.id)} style={btnDanger} aria-label="Delete committee">×</button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Volunteer hours ───────────────────────────────────────────── */}
      {active === 'volunteers' && (
        <div>
          <div style={{ padding: 16, background: PURPLE_LIGHT, borderRadius: 8, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
            <div style={formGrid}>
              <Field label="Member name *">
                <input type="text" placeholder="e.g. Mary Atim" value={volunteerForm.member} onChange={(e) => setField(setVolunteerForm)('member', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Hours *">
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
            <div style={{ ...cardStyle, background: '#fafafa' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 13, color: PURPLE_DARK }}>Totals per member</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {volunteerTotals.map(([name, hrs]) => (
                  <span key={name} style={{ ...pill(PURPLE_LIGHT, PURPLE_DARK), fontSize: 12, padding: '5px 10px' }}>{name}: {hrs}h</span>
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
              <span style={{ fontWeight: 700, color: PURPLE_DARK, fontSize: 15 }}>{v.hours}h</span>
              <button onClick={() => rowDelete(volunteers, saveVolunteers, v.id)} style={btnDanger} aria-label="Delete volunteer entry">×</button>
            </div>
          ))}
        </div>
      )}

      {/* ─── Members ────────────────────────────────────────────────────── */}
      {active === 'members' && (
        <div>
          <div style={{ padding: 16, background: PURPLE_LIGHT, borderRadius: 8, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
            <div style={formGrid}>
              <Field label="Full name *" full>
                <input type="text" placeholder="e.g. Esther Nabukenya" value={memberForm.name} onChange={(e) => setField(setMemberForm)('name', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Phone *">
                <input type="tel" placeholder="+256 7xx xxx xxx" value={memberForm.phone} onChange={(e) => setField(setMemberForm)('phone', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Email">
                <input type="email" placeholder="name@church.org" value={memberForm.email} onChange={(e) => setField(setMemberForm)('email', e.target.value)} style={inputStyle} />
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

          {members.length === 0 ? (
            <EmptyState icon="📞" text="Member directory is empty. Add your first member above." />
          ) : members.map((m) => {
            const [fg, bg] = statusColor[m.membership_status] || statusColor.active;
            return (
              <div key={m.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 26 }}>📞</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: TEXT }}>
                    {m.name} <span style={{ ...pill(bg, fg), fontSize: 10 }}>{m.membership_status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                    {m.phone}{m.email ? ` • ${m.email}` : ''}{m.baptism_date ? ` • Baptised ${fmtDate(m.baptism_date)}` : ''}
                  </div>
                </div>
                <button onClick={() => rowDelete(members, saveMembers, m.id)} style={btnDanger} aria-label="Delete member">×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Events ────────────────────────────────────────────────────── */}
      {active === 'events' && (
        <div>
          <div style={{ padding: 16, background: PURPLE_LIGHT, borderRadius: 8, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
            <div style={formGrid}>
              <Field label="Event title *" full>
                <input type="text" placeholder="e.g. Sunday Worship Service" value={eventForm.title} onChange={(e) => setField(setEventForm)('title', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Date *">
                <input type="date" value={eventForm.date} onChange={(e) => setField(setEventForm)('date', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Type">
                <select value={eventForm.type} onChange={(e) => setField(setEventForm)('type', e.target.value)} style={inputStyle}>
                  <option value="service">⛪ Service</option>
                  <option value="conference">🎤 Conference</option>
                  <option value="retreat">🌄 Retreat</option>
                  <option value="wedding">💍 Wedding</option>
                  <option value="funeral">🕊️ Funeral</option>
                  <option value="outreach">🤲 Outreach</option>
                  <option value="youth">🎵 Youth</option>
                  <option value="other">📌 Other</option>
                </select>
              </Field>
              <Field label="Expected attendance">
                <input type="number" min="0" placeholder="120" value={eventForm.attendance_count} onChange={(e) => setField(setEventForm)('attendance_count', e.target.value)} style={inputStyle} />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={addEvent} style={btnPrimary}>+ Add Event</button>
            </div>
          </div>

          {upcomingEvents.length > 0 && (
            <h3 style={{ margin: '0 0 10px', fontSize: 13, color: PURPLE_DARK, textTransform: 'uppercase', letterSpacing: 0.4 }}>Upcoming events</h3>
          )}
          {upcomingEvents.length === 0 && events.length === 0 ? (
            <EmptyState icon="📅" text="No events scheduled. Add your first event above." />
          ) : (
            <>
              {upcomingEvents.map((ev) => (
                <div key={ev.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, borderLeft: `4px solid ${PURPLE}` }}>
                  <div style={{ fontSize: 26 }}>{eventTypeIcon[ev.type] || '📌'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: TEXT }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>
                      {new Date(ev.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      {ev.attendance_count ? ` • Expected ${ev.attendance_count}` : ''}
                    </div>
                  </div>
                  <button onClick={() => rowDelete(events, saveEvents, ev.id)} style={btnDanger} aria-label="Delete event">×</button>
                </div>
              ))}
              {events.length > upcomingEvents.length && (
                <p style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>
                  {events.length - upcomingEvents.length} past event(s) not shown.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <p style={{ fontSize: 11, color: MUTED, marginTop: 24, textAlign: 'center' }}>
        ⛪ Ssewasswa Comforts — Church Portal · data persists locally in your browser
      </p>
    </div>
  );
}
