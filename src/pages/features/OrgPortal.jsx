// Ssewasswa Comforts Technologies — Org / NGO / CBO Portal
// Comprehensive portal for organizations (NGOs, CBOs, community groups):
// member directory, renewal tracking, projects, donors, finance, volunteers, events, reports.
// Persistence: localStorage (single bucket key `erp_org_portal`).
import React, { useState, useEffect, useMemo } from 'react';

// ---------- Design tokens (teal accent per portal spec) ----------
const TEAL = '#00796b';
const TEAL_DARK = '#004d40';
const TEAL_BG = '#e0f2f1';
const TEAL_BORDER = '#80cbc4';
const INK = '#1f2d2b';
const MUTE = '#607c78';
const BORDER = '#d4e0dd';
const DANGER = '#c62828';
const WARN = '#ef6c00';
const GOOD = '#2e7d32';
const SURFACE = '#ffffff';
const PAGE_BG = '#f4f8f7';

const STORAGE_KEY = 'erp_org_portal';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'members', label: 'Members', icon: '👥' },
  { id: 'renewals', label: 'Renewals', icon: '🔄' },
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'donors', label: 'Donors', icon: '🤝' },
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'volunteers', label: 'Volunteers', icon: '🙋' },
  { id: 'events', label: 'Events', icon: '📅' },
  { id: 'reports', label: 'Reports', icon: '📈' },
];

const DEFAULT_STATE = {
  members: [],
  renewals: [],
  projects: [],
  donors: [],
  transactions: [],
  volunteers: [],
  events: [],
};

// ---------- Helpers ----------
const uid = () => Date.now() + Math.floor(Math.random() * 10000);
const fmtMoney = (n) => 'UGX ' + (Number(n) || 0).toLocaleString();
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');
const todayStr = () => new Date().toISOString().slice(0, 10);
const yearOf = (d) => (d ? new Date(d).getFullYear() : null);
const thisYear = () => new Date().getFullYear();
const daysUntil = (d) => {
  if (!d) return null;
  const ms = new Date(d) - new Date(todayStr());
  return Math.ceil(ms / 86400000);
};
const isOverdue = (d) => daysUntil(d) !== null && daysUntil(d) < 0;
const parseList = (str) => (str || '').split(',').map((s) => s.trim()).filter(Boolean);
const addYears = (dStr, n) => {
  if (!dStr) return '';
  const d = new Date(dStr);
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
};

// ---------- Reusable UI bits ----------
const inputStyle = {
  width: '100%',
  padding: 10,
  borderRadius: 6,
  border: `1px solid ${BORDER}`,
  fontSize: 14,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: MUTE,
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: MUTE, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 18px',
        background: disabled ? TEAL_BORDER : TEAL,
        color: 'white',
        border: 0,
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, color = TEAL }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '7px 12px',
        background: 'white',
        color,
        border: `1px solid ${color}`,
        borderRadius: 6,
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      {children}
    </button>
  );
}

function Badge({ children, color = TEAL, bg = TEAL_BG }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {children}
    </span>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: MUTE, background: TEAL_BG, borderRadius: 8, border: `1px dashed ${TEAL_BORDER}` }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <p style={{ margin: 0 }}>{message}</p>
    </div>
  );
}

function Card({ children, padding = 16 }) {
  return (
    <div style={{ padding, background: SURFACE, borderRadius: 8, border: `1px solid ${BORDER}` }}>{children}</div>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div
      style={{
        flex: '1 1 200px',
        minWidth: 200,
        padding: 18,
        borderRadius: 10,
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderLeft: `4px solid ${accent || TEAL}`,
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: MUTE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: INK, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>{children}</div>;
}

function Col({ children, flex = 1, min = 180 }) {
  return <div style={{ flex: `${flex} 1 ${min}px`, minWidth: min }}>{children}</div>;
}

function RemoveBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 0, color: DANGER, cursor: 'pointer', fontSize: 18, padding: 4 }}
      title="Delete"
    >
      ×
    </button>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, color: TEAL_DARK }}>{title}</h2>
        {subtitle && <p style={{ margin: 0, fontSize: 13, color: MUTE }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------- Main component ----------
export default function OrgPortal() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored) setState({ ...DEFAULT_STATE, ...stored });
    } catch {}
  }, []);

  const update = (key, value) => {
    const next = { ...state, [key]: value };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const add = (key, item) => update(key, [{ id: uid(), created_at: new Date().toISOString(), ...item }, ...state[key]]);
  const remove = (key, id) => update(key, state[key].filter((x) => x.id !== id));
  const patch = (key, id, fields) => update(key, state[key].map((x) => (x.id === id ? { ...x, ...fields } : x)));

  // ---------- Derived metrics ----------
  const totals = useMemo(() => {
    const income = state.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expenses = state.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const incomeThisYear = state.transactions
      .filter((t) => t.type === 'income' && yearOf(t.date) === thisYear())
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expensesThisYear = state.transactions
      .filter((t) => t.type === 'expense' && yearOf(t.date) === thisYear())
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const activeProjects = state.projects.filter((p) => p.status === 'active').length;
    const totalGiven = state.donors.reduce((s, d) => s + (Number(d.total_given) || 0), 0);
    const volunteerHours = state.volunteers.reduce((s, v) => s + (Number(v.hours_logged) || 0), 0);
    return {
      members: state.members.length,
      income,
      expenses,
      balance: income - expenses,
      incomeThisYear,
      expensesThisYear,
      activeProjects,
      totalProjects: state.projects.length,
      donors: state.donors.length,
      totalGiven,
      volunteers: state.volunteers.length,
      volunteerHours,
      transactions: state.transactions.length,
      events: state.events.length,
    };
  }, [state]);

  return (
    <div className="page-container" style={{ background: PAGE_BG, minHeight: '100vh' }}>
      <h1 className="page-title" style={{ color: TEAL_DARK }}>
        🌍 Org / NGO / CBO Portal
      </h1>
      <p style={{ color: MUTE, fontSize: 14, marginBottom: 20 }}>
        Manage members, donors, projects, finance, volunteers and events for your organization. All data is stored locally in your browser.
      </p>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 20,
          flexWrap: 'wrap',
          padding: 6,
          background: SURFACE,
          borderRadius: 10,
          border: `1px solid ${BORDER}`,
        }}
      >
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '9px 14px',
                background: active ? TEAL : 'transparent',
                color: active ? 'white' : MUTE,
                border: 0,
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ marginRight: 6 }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && <DashboardTab totals={totals} state={state} setActiveTab={setActiveTab} />}
      {activeTab === 'members' && (
        <MembersTab members={state.members} onAdd={(i) => add('members', i)} onRemove={(id) => remove('members', id)} onPatch={(id, f) => patch('members', id, f)} />
      )}
      {activeTab === 'renewals' && (
        <RenewalsTab
          members={state.members}
          renewals={state.renewals}
          onAdd={(i) => add('renewals', i)}
          onPatch={(id, f) => patch('renewals', id, f)}
          onRemove={(id) => remove('renewals', id)}
        />
      )}
      {activeTab === 'projects' && (
        <ProjectsTab projects={state.projects} onAdd={(i) => add('projects', i)} onRemove={(id) => remove('projects', id)} onPatch={(id, f) => patch('projects', id, f)} />
      )}
      {activeTab === 'donors' && (
        <DonorsTab donors={state.donors} onAdd={(i) => add('donors', i)} onRemove={(id) => remove('donors', id)} onPatch={(id, f) => patch('donors', id, f)} />
      )}
      {activeTab === 'finance' && <FinanceTab transactions={state.transactions} onAdd={(i) => add('transactions', i)} onRemove={(id) => remove('transactions', id)} totals={totals} />}
      {activeTab === 'volunteers' && (
        <VolunteersTab volunteers={state.volunteers} onAdd={(i) => add('volunteers', i)} onRemove={(id) => remove('volunteers', id)} onPatch={(id, f) => patch('volunteers', id, f)} />
      )}
      {activeTab === 'events' && <EventsTab events={state.events} onAdd={(i) => add('events', i)} onRemove={(id) => remove('events', id)} />}
      {activeTab === 'reports' && <ReportsTab state={state} totals={totals} />}
    </div>
  );
}

// ============================================================
// 1. DASHBOARD
// ============================================================
function DashboardTab({ totals, state, setActiveTab }) {
  const upcomingRenewals = state.renewals
    .filter((r) => r.status !== 'renewed')
    .map((r) => ({ ...r, days: daysUntil(r.due_date) }))
    .sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999))
    .slice(0, 5);

  const memberName = (mid) => {
    const m = state.members.find((x) => x.membership_id === mid || x.id === mid);
    return m ? m.name : mid;
  };

  return (
    <div>
      <Row>
        <StatCard label="Total Members" value={totals.members} icon="👥" />
        <StatCard label="Income (This Year)" value={fmtMoney(totals.incomeThisYear)} icon="💰" accent={GOOD} />
        <StatCard label="Expenses (This Year)" value={fmtMoney(totals.expensesThisYear)} icon="📉" accent={DANGER} />
        <StatCard label="Active Projects" value={totals.activeProjects} icon="📁" accent={WARN} />
      </Row>
      <Row>
        <StatCard label="Total Donors" value={totals.donors} icon="🤝" />
        <StatCard label="Total Received (Donors)" value={fmtMoney(totals.totalGiven)} icon="🎁" accent={GOOD} />
        <StatCard label="Volunteers" value={totals.volunteers} icon="🙋" />
        <StatCard label="Volunteer Hours" value={totals.volunteerHours} icon="⏱️" accent={TEAL} />
      </Row>
      <Row>
        <StatCard label="Net Balance" value={fmtMoney(totals.balance)} icon="🏦" accent={TEAL} />
        <StatCard label="Transactions" value={totals.transactions} icon="🧾" accent={TEAL} />
        <StatCard label="Events" value={totals.events} icon="📅" accent={TEAL} />
      </Row>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
        <div style={{ flex: '2 1 400px', minWidth: 320 }}>
          <Card>
            <SectionHeader title="Upcoming Renewals" subtitle="Memberships due soon" action={<GhostButton onClick={() => setActiveTab('renewals')}>View all →</GhostButton>} />
            {upcomingRenewals.length === 0 ? (
              <p style={{ color: MUTE, fontSize: 13, margin: 0 }}>No pending renewals.</p>
            ) : (
              upcomingRenewals.map((r) => {
                const overdue = isOverdue(r.due_date);
                return (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{memberName(r.member_id)}</div>
                      <div style={{ fontSize: 11, color: MUTE }}>Due {fmtDate(r.due_date)}</div>
                    </div>
                    <Badge color={overdue ? DANGER : r.days <= 14 ? WARN : GOOD} bg={overdue ? '#fdecea' : r.days <= 14 ? '#fff3e0' : TEAL_BG}>
                      {overdue ? `${Math.abs(r.days)} days overdue` : `${r.days} days left`}
                    </Badge>
                  </div>
                );
              })
            )}
          </Card>
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 280 }}>
          <Card>
            <SectionHeader title="Quick Actions" subtitle="Jump to a section" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {TABS.filter((t) => t.id !== 'dashboard' && t.id !== 'reports').map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '12px 8px',
                    background: TEAL_BG,
                    color: TEAL_DARK,
                    border: `1px solid ${TEAL_BORDER}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontSize: 20 }}>{t.icon}</div>
                  {t.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 2. MEMBERS
// ============================================================
function MembersTab({ members, onAdd, onRemove, onPatch }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', membership_id: '', join_date: todayStr(), status: 'active' });
  const [err, setErr] = useState('');

  const reset = () => {
    setForm({ name: '', phone: '', email: '', membership_id: '', join_date: todayStr(), status: 'active' });
    setErr('');
    setShowForm(false);
  };

  const submit = () => {
    if (!form.name.trim()) return setErr('Name is required.');
    if (!form.membership_id.trim()) return setErr('Membership ID is required.');
    if (members.some((m) => m.membership_id.toLowerCase() === form.membership_id.trim().toLowerCase())) {
      return setErr('Membership ID already exists.');
    }
    onAdd({ ...form, name: form.name.trim(), membership_id: form.membership_id.trim() });
    reset();
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  const statusBadge = (s) => {
    const map = { active: GOOD, lapsed: WARN, pending: TEAL, suspended: DANGER };
    return <Badge color={map[s] || MUTE} bg={s === 'active' ? '#e8f5e9' : s === 'lapsed' ? '#fff3e0' : s === 'suspended' ? '#fdecea' : TEAL_BG}>{s}</Badge>;
  };

  return (
    <div>
      <SectionHeader
        title="Member Directory"
        subtitle={`${members.length} member${members.length === 1 ? '' : 's'} registered`}
        action={<PrimaryButton onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Member'}</PrimaryButton>}
      />

      {showForm && (
        <Card padding={20} >
          {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
          <Row>
            <Col min={220}><Field label="Full Name *"><input style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jane Mukasa" /></Field></Col>
            <Col min={160}><Field label="Membership ID *"><input style={inputStyle} value={form.membership_id} onChange={(e) => set('membership_id', e.target.value)} placeholder="MEM-001" /></Field></Col>
            <Col min={160}><Field label="Phone"><input style={inputStyle} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+256..." /></Field></Col>
          </Row>
          <Row>
            <Col min={220}><Field label="Email"><input style={inputStyle} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@org.org" /></Field></Col>
            <Col min={160}><Field label="Join Date"><input style={inputStyle} type="date" value={form.join_date} onChange={(e) => set('join_date', e.target.value)} /></Field></Col>
            <Col min={160}>
              <Field label="Status">
                <select style={inputStyle} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="lapsed">Lapsed</option>
                  <option value="suspended">Suspended</option>
                </select>
              </Field>
            </Col>
          </Row>
          <div style={{ display: 'flex', gap: 8 }}>
            <PrimaryButton onClick={submit}>Save Member</PrimaryButton>
            <GhostButton onClick={reset}>Clear</GhostButton>
          </div>
        </Card>
      )}

      <div style={{ marginTop: 16 }}>
        {members.length === 0 ? (
          <EmptyState icon="👥" message="No members yet. Add your first member to start the directory." />
        ) : (
          members.map((m) => (
            <Card key={m.id} padding={14}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: TEAL, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, color: INK }}>{m.name} <span style={{ fontSize: 11, color: MUTE, fontWeight: 500 }}>#{m.membership_id}</span></div>
                  <div style={{ fontSize: 12, color: MUTE }}>{m.phone || '—'} • {m.email || '—'} • Joined {fmtDate(m.join_date)}</div>
                </div>
                <select
                  value={m.status}
                  onChange={(e) => onPatch(m.id, { status: e.target.value })}
                  style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 12, background: SURFACE }}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="lapsed">Lapsed</option>
                  <option value="suspended">Suspended</option>
                </select>
                {statusBadge(m.status)}
                <RemoveBtn onClick={() => onRemove(m.id)} />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// 3. RENEWALS
// ============================================================
function RenewalsTab({ members, renewals, onAdd, onPatch, onRemove }) {
  const [form, setForm] = useState({ member_id: '', due_date: '' });
  const [err, setErr] = useState('');

  const memberName = (mid) => {
    const m = members.find((x) => x.membership_id === mid || x.id === mid);
    return m ? m.name : mid;
  };

  const submit = () => {
    if (!form.member_id) return setErr('Select a member.');
    if (!form.due_date) return setErr('Pick a renewal due date.');
    onAdd({ member_id: form.member_id, due_date: form.due_date, status: 'pending', last_reminder: null, reminders_sent: 0 });
    setForm({ member_id: '', due_date: '' });
    setErr('');
  };

  const sendReminder = (r) => onPatch(r.id, { last_reminder: new Date().toISOString(), reminders_sent: (r.reminders_sent || 0) + 1 });
  const renew = (r) => {
    onPatch(r.id, { status: 'renewed' });
    onAdd({ member_id: r.member_id, due_date: addYears(r.due_date, 1), status: 'pending', last_reminder: null, reminders_sent: 0 });
  };

  const sorted = [...renewals].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  return (
    <div>
      <SectionHeader title="Membership Renewals" subtitle="Track due dates, send reminders, mark as renewed" />

      <Card padding={20} style={{ marginBottom: 16 }}>
        {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
        <Row>
          <Col flex={2} min={260}>
            <Field label="Member">
              <select style={inputStyle} value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })}>
                <option value="">— Select member —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.membership_id}>{m.name} (#{m.membership_id})</option>
                ))}
              </select>
            </Field>
          </Col>
          <Col>
            <Field label="Due Date"><input style={inputStyle} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          </Col>
        </Row>
        <PrimaryButton onClick={submit} disabled={members.length === 0}>+ Track Renewal</PrimaryButton>
        {members.length === 0 && <span style={{ marginLeft: 10, color: MUTE, fontSize: 12 }}>Add members first.</span>}
      </Card>

      {sorted.length === 0 ? (
        <EmptyState icon="🔄" message="No renewals being tracked yet. Add a renewal above." />
      ) : (
        sorted.map((r) => {
          const days = daysUntil(r.due_date);
          const overdue = r.status !== 'renewed' && isOverdue(r.due_date);
          const dueSoon = r.status !== 'renewed' && days !== null && days >= 0 && days <= 30;
          return (
            <Card key={r.id} padding={14}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700 }}>{memberName(r.member_id)}</div>
                  <div style={{ fontSize: 12, color: MUTE }}>
                    Due: {fmtDate(r.due_date)} • Reminders sent: {r.reminders_sent || 0}{r.last_reminder ? ` (last: ${fmtDateTime(r.last_reminder)})` : ''}
                  </div>
                </div>
                {r.status === 'renewed' ? (
                  <Badge color={GOOD} bg="#e8f5e9">Renewed</Badge>
                ) : overdue ? (
                  <Badge color={DANGER} bg="#fdecea">{Math.abs(days)} days overdue</Badge>
                ) : dueSoon ? (
                  <Badge color={WARN} bg="#fff3e0">{days} days left</Badge>
                ) : (
                  <Badge color={TEAL} bg={TEAL_BG}>{days} days left</Badge>
                )}
                {r.status !== 'renewed' && (
                  <>
                    <GhostButton onClick={() => sendReminder(r)}>📩 Remind</GhostButton>
                    <GhostButton color={GOOD} onClick={() => renew(r)}>✓ Renew</GhostButton>
                  </>
                )}
                <RemoveBtn onClick={() => onRemove(r.id)} />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ============================================================
// 4. PROJECTS
// ============================================================
function ProjectsTab({ projects, onAdd, onRemove, onPatch }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', start_date: todayStr(), end_date: '', budget: '', status: 'planned', beneficiaries_count: '' });
  const [err, setErr] = useState('');

  const submit = () => {
    if (!form.name.trim()) return setErr('Project name is required.');
    if (!form.start_date) return setErr('Start date is required.');
    onAdd({
      ...form,
      name: form.name.trim(),
      budget: Number(form.budget) || 0,
      beneficiaries_count: Number(form.beneficiaries_count) || 0,
    });
    setForm({ name: '', description: '', start_date: todayStr(), end_date: '', budget: '', status: 'planned', beneficiaries_count: '' });
    setErr('');
    setShowForm(false);
  };
  const set = (k, v) => setForm({ ...form, [k]: v });

  const progress = (p) => {
    if (p.status === 'completed') return 100;
    if (!p.start_date) return 0;
    const start = new Date(p.start_date);
    const end = p.end_date ? new Date(p.end_date) : null;
    if (!end) return p.status === 'active' ? 25 : 0;
    const total = end - start;
    const elapsed = new Date() - start;
    if (elapsed <= 0) return 0;
    if (elapsed >= total) return p.status === 'active' ? 95 : 100;
    return Math.round((elapsed / total) * 100);
  };

  const statusColor = { planned: MUTE, active: WARN, paused: '#5f6368', completed: GOOD };

  return (
    <div>
      <SectionHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length === 1 ? '' : 's'} tracked`}
        action={<PrimaryButton onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Project'}</PrimaryButton>}
      />

      {showForm && (
        <Card padding={20} style={{ marginBottom: 16 }}>
          {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
          <Row>
            <Col flex={2} min={240}><Field label="Project Name *"><input style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Clean Water Initiative" /></Field></Col>
            <Col><Field label="Status"><select style={inputStyle} value={form.status} onChange={(e) => set('status', e.target.value)}><option value="planned">Planned</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></Field></Col>
          </Row>
          <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 70 }} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief description of project scope and goals..." /></Field>
          <Row>
            <Col><Field label="Start Date"><input style={inputStyle} type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} /></Field></Col>
            <Col><Field label="End Date"><input style={inputStyle} type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} /></Field></Col>
            <Col><Field label="Budget (UGX)"><input style={inputStyle} type="number" min="0" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="5000000" /></Field></Col>
            <Col><Field label="Beneficiaries"><input style={inputStyle} type="number" min="0" value={form.beneficiaries_count} onChange={(e) => set('beneficiaries_count', e.target.value)} placeholder="200" /></Field></Col>
          </Row>
          <PrimaryButton onClick={submit}>Save Project</PrimaryButton>
        </Card>
      )}

      {projects.length === 0 ? (
        <EmptyState icon="📁" message="No projects yet. Add your first project to track progress." />
      ) : (
        projects.map((p) => {
          const pct = progress(p);
          return (
            <Card key={p.id} padding={14} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontWeight: 700, color: INK, fontSize: 15 }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: 13, color: MUTE, marginTop: 4 }}>{p.description}</div>}
                </div>
                <Badge color={statusColor[p.status] || MUTE} bg={p.status === 'completed' ? '#e8f5e9' : p.status === 'active' ? '#fff3e0' : '#f0f0f0'}>{p.status}</Badge>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 10, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: TEAL, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 11, color: MUTE, marginTop: 4 }}>{pct}% complete</div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: MUTE, flexWrap: 'wrap' }}>
                <span>📅 {fmtDate(p.start_date)} → {fmtDate(p.end_date)}</span>
                <span>💰 {fmtMoney(p.budget)}</span>
                <span>👥 {p.beneficiaries_count || 0} beneficiaries</span>
                <select
                  value={p.status}
                  onChange={(e) => onPatch(p.id, { status: e.target.value })}
                  style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${BORDER}`, fontSize: 12, background: SURFACE }}
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
                <RemoveBtn onClick={() => onRemove(p.id)} />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ============================================================
// 5. DONORS
// ============================================================
function DonorsTab({ donors, onAdd, onRemove, onPatch }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', organization: '', email: '', phone: '', capacity: '', interest_areas: '', total_given: '' });
  const [err, setErr] = useState('');

  const submit = () => {
    if (!form.name.trim()) return setErr('Donor name is required.');
    onAdd({
      name: form.name.trim(),
      organization: form.organization.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      capacity: Number(form.capacity) || 0,
      interest_areas: parseList(form.interest_areas),
      total_given: Number(form.total_given) || 0,
    });
    setForm({ name: '', organization: '', email: '', phone: '', capacity: '', interest_areas: '', total_given: '' });
    setErr('');
    setShowForm(false);
  };
  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div>
      <SectionHeader
        title="Donor Database"
        subtitle={`${donors.length} donor${donors.length === 1 ? '' : 's'} • ${fmtMoney(donors.reduce((s, d) => s + (Number(d.total_given) || 0), 0))} total received`}
        action={<PrimaryButton onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Donor'}</PrimaryButton>}
      />

      {showForm && (
        <Card padding={20} style={{ marginBottom: 16 }}>
          {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
          <Row>
            <Col min={200}><Field label="Donor Name *"><input style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="USAID" /></Field></Col>
            <Col min={200}><Field label="Organization"><input style={inputStyle} value={form.organization} onChange={(e) => set('organization', e.target.value)} placeholder="Agency / Foundation" /></Field></Col>
          </Row>
          <Row>
            <Col min={200}><Field label="Email"><input style={inputStyle} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field></Col>
            <Col min={160}><Field label="Phone"><input style={inputStyle} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field></Col>
          </Row>
          <Row>
            <Col><Field label="Annual Capacity (UGX)"><input style={inputStyle} type="number" min="0" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="100000000" /></Field></Col>
            <Col><Field label="Total Given (UGX)"><input style={inputStyle} type="number" min="0" value={form.total_given} onChange={(e) => set('total_given', e.target.value)} placeholder="25000000" /></Field></Col>
          </Row>
          <Field label="Interest Areas" hint="Comma-separated, e.g. education, health, water">
            <input style={inputStyle} value={form.interest_areas} onChange={(e) => set('interest_areas', e.target.value)} placeholder="education, health, water" />
          </Field>
          <PrimaryButton onClick={submit}>Save Donor</PrimaryButton>
        </Card>
      )}

      {donors.length === 0 ? (
        <EmptyState icon="🤝" message="No donors yet. Add your first donor to the database." />
      ) : (
        donors.map((d) => (
          <Card key={d.id} padding={14} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, color: INK }}>{d.name}</div>
                <div style={{ fontSize: 12, color: MUTE }}>{d.organization || '—'} • {d.email || '—'} • {d.phone || '—'}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(d.interest_areas || []).map((a) => <Badge key={a} color={TEAL} bg={TEAL_BG}>{a}</Badge>)}
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 140 }}>
                <div style={{ fontSize: 11, color: MUTE }}>Capacity</div>
                <div style={{ fontWeight: 700, color: TEAL_DARK }}>{fmtMoney(d.capacity)}</div>
                <div style={{ fontSize: 11, color: MUTE, marginTop: 4 }}>Given</div>
                <div style={{ fontWeight: 700, color: GOOD }}>{fmtMoney(d.total_given)}</div>
              </div>
              <RemoveBtn onClick={() => onRemove(d.id)} />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ============================================================
// 6. FINANCE
// ============================================================
function FinanceTab({ transactions, onAdd, onRemove, totals }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'income', category: '', amount: '', date: todayStr(), description: '' });
  const [err, setErr] = useState('');

  const submit = () => {
    if (!form.category.trim()) return setErr('Category is required.');
    if (!form.amount || Number(form.amount) <= 0) return setErr('Amount must be greater than 0.');
    if (!form.date) return setErr('Date is required.');
    onAdd({ ...form, category: form.category.trim(), amount: Number(form.amount) });
    setForm({ type: 'income', category: '', amount: '', date: todayStr(), description: '' });
    setErr('');
    setShowForm(false);
  };
  const set = (k, v) => setForm({ ...form, [k]: v });

  // Running balance: sort ascending by date, accumulate.
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
  let running = 0;
  const withBalance = sorted.map((t) => {
    running += (t.type === 'income' ? 1 : -1) * (Number(t.amount) || 0);
    return { ...t, balance: running };
  }).reverse();

  return (
    <div>
      <SectionHeader
        title="Finance Ledger"
        subtitle={`Income: ${fmtMoney(totals.income)} • Expenses: ${fmtMoney(totals.expenses)} • Net: ${fmtMoney(totals.balance)}`}
        action={<PrimaryButton onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Transaction'}</PrimaryButton>}
      />

      <Row>
        <StatCard label="Total Income" value={fmtMoney(totals.income)} icon="📈" accent={GOOD} />
        <StatCard label="Total Expenses" value={fmtMoney(totals.expenses)} icon="📉" accent={DANGER} />
        <StatCard label="Net Balance" value={fmtMoney(totals.balance)} icon="🏦" accent={TEAL} />
      </Row>

      {showForm && (
        <Card padding={20} style={{ marginBottom: 16 }}>
          {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
          <Row>
            <Col min={140}>
              <Field label="Type">
                <select style={inputStyle} value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </Field>
            </Col>
            <Col flex={2} min={200}><Field label="Category *"><input style={inputStyle} value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Donation / Salary / Rent" /></Field></Col>
            <Col min={160}><Field label="Amount (UGX) *"><input style={inputStyle} type="number" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="100000" /></Field></Col>
            <Col min={160}><Field label="Date"><input style={inputStyle} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field></Col>
          </Row>
          <Field label="Description"><input style={inputStyle} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional note" /></Field>
          <PrimaryButton onClick={submit}>Save Transaction</PrimaryButton>
        </Card>
      )}

      {withBalance.length === 0 ? (
        <EmptyState icon="💰" message="No transactions yet. Add income or expenses to see the running balance." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: SURFACE, borderRadius: 8, overflow: 'hidden', fontSize: 13 }}>
            <thead>
              <tr style={{ background: TEAL_BG, color: TEAL_DARK, textAlign: 'left' }}>
                <th style={cellTh}>Date</th>
                <th style={cellTh}>Type</th>
                <th style={cellTh}>Category</th>
                <th style={cellTh}>Description</th>
                <th style={{ ...cellTh, textAlign: 'right' }}>Amount</th>
                <th style={{ ...cellTh, textAlign: 'right' }}>Balance</th>
                <th style={cellTh}></th>
              </tr>
            </thead>
            <tbody>
              {withBalance.map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={cellTd}>{fmtDate(t.date)}</td>
                  <td style={cellTd}><Badge color={t.type === 'income' ? GOOD : DANGER} bg={t.type === 'income' ? '#e8f5e9' : '#fdecea'}>{t.type}</Badge></td>
                  <td style={cellTd}>{t.category}</td>
                  <td style={{ ...cellTd, color: MUTE }}>{t.description || '—'}</td>
                  <td style={{ ...cellTd, textAlign: 'right', fontWeight: 700, color: t.type === 'income' ? GOOD : DANGER }}>{t.type === 'income' ? '+' : '−'}{fmtMoney(t.amount)}</td>
                  <td style={{ ...cellTd, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(t.balance)}</td>
                  <td style={cellTd}><RemoveBtn onClick={() => onRemove(t.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
const cellTh = { padding: '10px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 };
const cellTd = { padding: '10px 12px', color: INK };

// ============================================================
// 7. VOLUNTEERS
// ============================================================
function VolunteersTab({ volunteers, onAdd, onRemove, onPatch }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', skills: '', availability: '', hours_logged: '' });
  const [err, setErr] = useState('');

  const submit = () => {
    if (!form.name.trim()) return setErr('Volunteer name is required.');
    onAdd({
      name: form.name.trim(),
      skills: parseList(form.skills),
      availability: form.availability.trim(),
      hours_logged: Number(form.hours_logged) || 0,
    });
    setForm({ name: '', skills: '', availability: '', hours_logged: '' });
    setErr('');
    setShowForm(false);
  };
  const set = (k, v) => setForm({ ...form, [k]: v });

  const logHours = (v, delta) => onPatch(v.id, { hours_logged: Math.max(0, (Number(v.hours_logged) || 0) + delta) });

  return (
    <div>
      <SectionHeader
        title="Volunteer Coordination"
        subtitle={`${volunteers.length} volunteer${volunteers.length === 1 ? '' : 's'} • ${volunteers.reduce((s, v) => s + (Number(v.hours_logged) || 0), 0)} hours logged`}
        action={<PrimaryButton onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Volunteer'}</PrimaryButton>}
      />

      {showForm && (
        <Card padding={20} style={{ marginBottom: 16 }}>
          {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
          <Row>
            <Col flex={2} min={220}><Field label="Name *"><input style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Sarah Namaganda" /></Field></Col>
            <Col min={160}><Field label="Availability"><input style={inputStyle} value={form.availability} onChange={(e) => set('availability', e.target.value)} placeholder="Weekends, evenings" /></Field></Col>
            <Col min={140}><Field label="Hours Logged"><input style={inputStyle} type="number" min="0" value={form.hours_logged} onChange={(e) => set('hours_logged', e.target.value)} placeholder="0" /></Field></Col>
          </Row>
          <Field label="Skills" hint="Comma-separated, e.g. teaching, first aid, IT">
            <input style={inputStyle} value={form.skills} onChange={(e) => set('skills', e.target.value)} placeholder="teaching, first aid, IT" />
          </Field>
          <PrimaryButton onClick={submit}>Save Volunteer</PrimaryButton>
        </Card>
      )}

      {volunteers.length === 0 ? (
        <EmptyState icon="🙋" message="No volunteers yet. Add your first volunteer to coordinate them." />
      ) : (
        volunteers.map((v) => (
          <Card key={v.id} padding={14} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: TEAL, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {v.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700 }}>{v.name}</div>
                <div style={{ fontSize: 12, color: MUTE }}>Available: {v.availability || '—'}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(v.skills || []).map((s) => <Badge key={s} color={TEAL} bg={TEAL_BG}>{s}</Badge>)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: MUTE }}>Hours</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: TEAL_DARK }}>{v.hours_logged || 0}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <button onClick={() => logHours(v, -1)} style={smallBtn}>−</button>
                  <button onClick={() => logHours(v, 1)} style={smallBtn}>+</button>
                </div>
              </div>
              <RemoveBtn onClick={() => onRemove(v.id)} />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
const smallBtn = { width: 24, height: 24, borderRadius: 4, border: `1px solid ${TEAL_BORDER}`, background: TEAL_BG, color: TEAL_DARK, cursor: 'pointer', fontWeight: 700, fontSize: 13 };

// ============================================================
// 8. EVENTS
// ============================================================
function EventsTab({ events, onAdd, onRemove }) {
  const [form, setForm] = useState({ title: '', date: todayStr(), type: 'meeting', location: '', attendees: '' });
  const [err, setErr] = useState('');
  const [showForm, setShowForm] = useState(false);

  const submit = () => {
    if (!form.title.trim()) return setErr('Event title is required.');
    if (!form.date) return setErr('Date is required.');
    onAdd({ ...form, title: form.title.trim(), attendees: Number(form.attendees) || 0 });
    setForm({ title: '', date: todayStr(), type: 'meeting', location: '', attendees: '' });
    setErr('');
    setShowForm(false);
  };
  const set = (k, v) => setForm({ ...form, [k]: v });

  const typeIcon = { meeting: '👥', fundraiser: '💸', workshop: '🛠️', campaign: '📣', training: '🎓', other: '📌' };
  const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div>
      <SectionHeader
        title="Events"
        subtitle={`${events.length} event${events.length === 1 ? '' : 's'} scheduled`}
        action={<PrimaryButton onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Event'}</PrimaryButton>}
      />

      {showForm && (
        <Card padding={20} style={{ marginBottom: 16 }}>
          {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
          <Row>
            <Col flex={2} min={220}><Field label="Event Title *"><input style={inputStyle} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Annual General Meeting" /></Field></Col>
            <Col min={160}><Field label="Date"><input style={inputStyle} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field></Col>
          </Row>
          <Row>
            <Col min={160}>
              <Field label="Type">
                <select style={inputStyle} value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="meeting">👥 Meeting</option>
                  <option value="fundraiser">💸 Fundraiser</option>
                  <option value="workshop">🛠️ Workshop</option>
                  <option value="campaign">📣 Campaign</option>
                  <option value="training">🎓 Training</option>
                  <option value="other">📌 Other</option>
                </select>
              </Field>
            </Col>
            <Col flex={2} min={220}><Field label="Location"><input style={inputStyle} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Community Hall, Kampala" /></Field></Col>
            <Col min={140}><Field label="Attendees"><input style={inputStyle} type="number" min="0" value={form.attendees} onChange={(e) => set('attendees', e.target.value)} placeholder="50" /></Field></Col>
          </Row>
          <PrimaryButton onClick={submit}>Save Event</PrimaryButton>
        </Card>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon="📅" message="No events scheduled. Add your first event above." />
      ) : (
        sorted.map((ev) => {
          const past = daysUntil(ev.date) !== null && daysUntil(ev.date) < 0;
          return (
            <Card key={ev.id} padding={14} style={{ marginBottom: 8, opacity: past ? 0.7 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 28 }}>{typeIcon[ev.type] || '📌'}</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700 }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: MUTE }}>
                    {new Date(ev.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} • {ev.location || 'No location'} • {ev.attendees || 0} attendees
                  </div>
                </div>
                {past ? <Badge color={MUTE} bg="#f0f0f0">Past</Badge> : <Badge color={TEAL} bg={TEAL_BG}>Upcoming</Badge>}
                <RemoveBtn onClick={() => onRemove(ev.id)} />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ============================================================
// 9. REPORTS
// ============================================================
function ReportsTab({ state, totals }) {
  const [year, setYear] = useState(thisYear());
  const [generated, setGenerated] = useState(null);

  const generate = () => {
    const y = Number(year);
    const yrTxns = state.transactions.filter((t) => yearOf(t.date) === y);
    const income = yrTxns.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expenses = yrTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const membersAtYear = state.members.filter((m) => yearOf(m.join_date) <= y).length;
    const newMembers = state.members.filter((m) => yearOf(m.join_date) === y).length;
    const activeProjects = state.projects.filter((p) => p.status === 'active').length;
    const completedProjects = state.projects.filter((p) => p.status === 'completed').length;
    const totalBeneficiaries = state.projects.reduce((s, p) => s + (Number(p.beneficiaries_count) || 0), 0);
    const totalBudget = state.projects.reduce((s, p) => s + (Number(p.budget) || 0), 0);
    const events = state.events.filter((e) => yearOf(e.date) === y);
    const totalAttendees = events.reduce((s, e) => s + (Number(e.attendees) || 0), 0);
    const topDonors = [...state.donors].sort((a, b) => (Number(b.total_given) || 0) - (Number(a.total_given) || 0)).slice(0, 5);
    const topCategories = (() => {
      const byCat = {};
      yrTxns.forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + (Number(t.amount) || 0) * (t.type === 'income' ? 1 : -1); });
      return Object.entries(byCat).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5);
    })();

    setGenerated({
      year: y,
      generatedAt: new Date().toISOString(),
      membersAtYear, newMembers, totalMembers: totals.members,
      income, expenses, net: income - expenses,
      activeProjects, completedProjects, totalProjects: totals.totalProjects,
      totalBeneficiaries, totalBudget,
      donors: totals.donors, totalGiven: totals.totalGiven,
      volunteers: totals.volunteers, volunteerHours: totals.volunteerHours,
      events: events.length, totalAttendees,
      topDonors, topCategories,
    });
  };

  return (
    <div>
      <SectionHeader title="Annual Reports" subtitle="Generate a summary report for any year" />

      <Card padding={20} style={{ marginBottom: 16 }}>
        <Row>
          <Col min={160}>
            <Field label="Report Year">
              <input style={inputStyle} type="number" value={year} min="2000" max="2100" onChange={(e) => setYear(e.target.value)} />
            </Field>
          </Col>
        </Row>
        <PrimaryButton onClick={generate}>📈 Generate Report</PrimaryButton>
      </Card>

      {generated && (
        <Card padding={20}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', color: TEAL_DARK }}>Annual Report — {generated.year}</h3>
              <div style={{ fontSize: 12, color: MUTE }}>Generated {fmtDateTime(generated.generatedAt)}</div>
            </div>
            <Badge color={TEAL} bg={TEAL_BG}>Official Summary</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <ReportStat label="Members (year-end)" value={generated.membersAtYear} />
            <ReportStat label="New Members" value={generated.newMembers} />
            <ReportStat label="Active Projects" value={generated.activeProjects} />
            <ReportStat label="Completed Projects" value={generated.completedProjects} />
            <ReportStat label="Beneficiaries Reached" value={generated.totalBeneficiaries} />
            <ReportStat label="Events Held" value={generated.events} />
            <ReportStat label="Total Attendees" value={generated.totalAttendees} />
            <ReportStat label="Donors" value={generated.donors} />
            <ReportStat label="Volunteers" value={generated.volunteers} />
            <ReportStat label="Volunteer Hours" value={generated.volunteerHours} />
          </div>

          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ padding: 14, background: '#e8f5e9', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: GOOD, fontWeight: 700, textTransform: 'uppercase' }}>Total Income</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: GOOD }}>{fmtMoney(generated.income)}</div>
            </div>
            <div style={{ padding: 14, background: '#fdecea', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: DANGER, fontWeight: 700, textTransform: 'uppercase' }}>Total Expenses</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: DANGER }}>{fmtMoney(generated.expenses)}</div>
            </div>
            <div style={{ padding: 14, background: TEAL_BG, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: TEAL_DARK, fontWeight: 700, textTransform: 'uppercase' }}>Net Surplus / Deficit</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: generated.net >= 0 ? GOOD : DANGER }}>{fmtMoney(generated.net)}</div>
            </div>
            <div style={{ padding: 14, background: '#fff3e0', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: WARN, fontWeight: 700, textTransform: 'uppercase' }}>Project Budget (Total)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: WARN }}>{fmtMoney(generated.totalBudget)}</div>
            </div>
          </div>

          {generated.topDonors.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 8px', color: TEAL_DARK, fontSize: 14 }}>🏆 Top Donors</h4>
              {generated.topDonors.map((d, i) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                  <span>{i + 1}. {d.name} <span style={{ color: MUTE }}>({d.organization || 'n/a'})</span></span>
                  <span style={{ fontWeight: 700, color: GOOD }}>{fmtMoney(d.total_given)}</span>
                </div>
              ))}
            </div>
          )}

          {generated.topCategories.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 8px', color: TEAL_DARK, fontSize: 14 }}>💼 Top Finance Categories</h4>
              {generated.topCategories.map(([cat, amt]) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                  <span>{cat}</span>
                  <span style={{ fontWeight: 700, color: amt >= 0 ? GOOD : DANGER }}>{fmtMoney(amt)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 11, color: MUTE }}>
            This report is generated from locally-stored organization data. Export or print this page for your records.
          </div>
        </Card>
      )}
    </div>
  );
}

function ReportStat({ label, value }) {
  return (
    <div style={{ padding: 12, background: PAGE_BG, borderRadius: 8, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 10, color: MUTE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: INK, marginTop: 2 }}>{value}</div>
    </div>
  );
}
