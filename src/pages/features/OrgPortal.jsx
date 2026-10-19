// Ssewasswa Comforts Technologies — Org / NGO / CBO Portal (Expanded)
// Comprehensive portal for organizations (NGOs, CBOs, community groups):
// member directory, renewals, projects, donors, finance, volunteers, events,
// reports — PLUS: membership cards (PDF), project Gantt timeline, M&E indicators,
// donor giving history, acknowledgment letters, restricted/unrestricted funds,
// volunteer skill matching, and quarterly impact reports.
// Theme: dark navy #071b2f + teal #00796b.
// Persistence: localStorage (single bucket key `erp_org_portal`).
import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';

// ---------- Design tokens (dark navy + teal accent per portal spec) ----------
const NAVY = '#071b2f';        // dark navy — primary brand
const NAVY_LIGHT = '#0d2a44';
const NAVY_DARK = '#04101f';
const TEAL = '#00796b';         // teal — accent
const TEAL_DARK = '#004d40';
const TEAL_BG = '#e0f2f1';
const TEAL_BORDER = '#80cbc4';
const INK = '#1f2d2b';
const MUTE = '#607c78';
const BORDER = '#d4e0dd';
const DANGER = '#c62828';
const WARN = '#ef6c00';
const GOOD = '#2e7d32';
const INFO = '#1565c0';
const SURFACE = '#ffffff';
const PAGE_BG = '#f4f8f7';
const FUNDS = {
  restricted: { label: 'Restricted', color: '#6a1b9a', bg: '#f3e5f5' },
  temporarily_restricted: { label: 'Temp. Restricted', color: '#ef6c00', bg: '#fff3e0' },
  unrestricted: { label: 'Unrestricted', color: '#2e7d32', bg: '#e8f5e9' },
};

const STORAGE_KEY = 'erp_org_portal';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', group: 'Overview' },
  { id: 'members', label: 'Members', icon: '👥', group: 'People' },
  { id: 'membership_cards', label: 'Mbr Cards', icon: '💳', group: 'People' },
  { id: 'renewals', label: 'Renewals', icon: '🔄', group: 'People' },
  { id: 'projects', label: 'Projects', icon: '📁', group: 'Programs' },
  { id: 'timeline', label: 'Timeline', icon: '📅', group: 'Programs' },
  { id: 'indicators', label: 'M&E', icon: '🎯', group: 'Programs' },
  { id: 'impact', label: 'Impact', icon: '📈', group: 'Programs' },
  { id: 'donors', label: 'Donors', icon: '🤝', group: 'Funding' },
  { id: 'donor_history', label: 'Giving History', icon: '🧾', group: 'Funding' },
  { id: 'acknowledgment', label: 'Thank-Yous', icon: '✉️', group: 'Funding' },
  { id: 'finance', label: 'Finance', icon: '💰', group: 'Funding' },
  { id: 'funds', label: 'Funds Split', icon: '⚖️', group: 'Funding' },
  { id: 'volunteers', label: 'Volunteers', icon: '🙋', group: 'People' },
  { id: 'skill_match', label: 'Skill Match', icon: '🧩', group: 'People' },
  { id: 'events', label: 'Events', icon: '🗓️', group: 'Programs' },
  { id: 'reports', label: 'Reports', icon: '📊', group: 'Overview' },
];

const DEFAULT_ORG_SETTINGS = {
  name: 'Ssewasswa Comforts Technologies',
  short_name: 'SCT',
  address: 'Kampala, Uganda',
  tagline: 'Serving Communities, Transforming Lives',
  signatory: 'Executive Director',
  phone: '+256 700 000 000',
  email: 'info@ssewasswa.org',
};

const DEFAULT_STATE = {
  members: [],
  renewals: [],
  projects: [],
  donors: [],
  transactions: [],          // general finance ledger entries (income/expense with fund_type)
  donations: [],              // per-donor giving history (donor_id, project_id, amount, date, receipt_no, fund_type)
  volunteers: [],
  events: [],
  milestones: [],            // project_id, name, due_date, completed, completed_date
  indicators: [],            // project_id, name, baseline, target, actual, unit
  impact_quarters: [],       // { year, quarter, beneficiaries, outcomes, lessons, narrative, savedAt }
  org_settings: DEFAULT_ORG_SETTINGS,
};

// ---------- Helpers ----------
const uid = () => Date.now() + Math.floor(Math.random() * 10000);
const fmtMoney = (n) => 'UGX ' + (Number(n) || 0).toLocaleString();
const fmtMoneyShort = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e9) return 'UGX ' + (v / 1e9).toFixed(1) + 'B';
  if (Math.abs(v) >= 1e6) return 'UGX ' + (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return 'UGX ' + (v / 1e3).toFixed(1) + 'K';
  return 'UGX ' + v.toLocaleString();
};
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
const parseList = (str) => (str || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const parseListKeepCase = (str) => (str || '').split(',').map((s) => s.trim()).filter(Boolean);
const addYears = (dStr, n) => {
  if (!dStr) return '';
  const d = new Date(dStr);
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
};
const addMonths = (dStr, n) => {
  if (!dStr) return '';
  const d = new Date(dStr);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const quarterOf = (dStr) => {
  if (!dStr) return null;
  const m = new Date(dStr).getMonth();
  return 'Q' + (Math.floor(m / 3) + 1);
};
const pctAchieved = (baseline, target, actual) => {
  const b = Number(baseline) || 0;
  const t = Number(target) || 0;
  const a = Number(actual) || 0;
  if (t === b) return a >= t ? 100 : 0;
  const v = ((a - b) / (t - b)) * 100;
  return clamp(v, 0, 100);
};
const safeWriteStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    // Quota exceeded, private mode, or serialization error — fail silently but warn.
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[OrgPortal] localStorage write failed:', e?.message || e);
    }
    return false;
  }
};
const downloadTextFile = (filename, text) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const printHtml = (title, bodyHtml) => {
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; color: #1f2d2b; margin: 40px; line-height: 1.6; }
      h1, h2 { color: #071b2f; }
      .letterhead { border-bottom: 3px solid #00796b; padding-bottom: 12px; margin-bottom: 24px; }
      .letterhead h1 { margin: 0 0 4px; font-size: 22px; }
      .letterhead p { margin: 0; color: #607c78; font-size: 13px; }
      .meta { color: #607c78; font-size: 13px; margin-bottom: 16px; }
      .sign { margin-top: 48px; }
      .sign .line { border-top: 1px solid #1f2d2b; width: 240px; margin-top: 36px; padding-top: 4px; }
      @media print { .no-print { display: none; } }
    </style></head><body>${bodyHtml}
    <p class="no-print" style="margin-top:32px;text-align:center;"><button onclick="window.print()" style="padding:10px 18px;background:#00796b;color:white;border:0;border-radius:6px;font-weight:700;cursor:pointer;">Print</button></p>
    </body></html>`);
  w.document.close();
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

function PrimaryButton({ children, onClick, disabled, type }) {
  return (
    <button
      type={type || 'button'}
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

function GhostButton({ children, onClick, color = TEAL, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 12px',
        background: 'white',
        color,
        border: `1px solid ${color}`,
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
        fontSize: 12,
        opacity: disabled ? 0.5 : 1,
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

// FIX: Card now merges passed `style` prop into hardcoded style (audit bug fix).
function Card({ children, padding = 16, style }) {
  return (
    <div
      style={{
        padding,
        background: SURFACE,
        borderRadius: 8,
        border: `1px solid ${BORDER}`,
        ...(style || {}),
      }}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, icon, accent, sub }) {
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
      {sub && <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>{children}</div>;
}

function Col({ children, flex = 1, min = 180 }) {
  return <div style={{ flex: `${flex} 1 ${min}px`, minWidth: min }}>{children}</div>;
}

// FIX: RemoveBtn now ALWAYS shows a window.confirm() before deleting (audit bug fix).
function RemoveBtn({ onClick, label = 'item' }) {
  return (
    <button
      onClick={(e) => {
        e?.stopPropagation?.();
        const ok = window.confirm(`Delete this ${label}? This action cannot be undone.`);
        if (ok && onClick) onClick();
      }}
      style={{ background: 'none', border: 0, color: DANGER, cursor: 'pointer', fontSize: 18, padding: 4 }}
      title={`Delete ${label}`}
    >
      ×
    </button>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, color: NAVY }}>{title}</h2>
        {subtitle && <p style={{ margin: 0, fontSize: 13, color: MUTE }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ProgressBar({ value, color = TEAL, height = 10, label }) {
  const v = clamp(value, 0, 100);
  return (
    <div>
      <div style={{ height, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
      </div>
      {label !== undefined && <div style={{ fontSize: 11, color: MUTE, marginTop: 4 }}>{label}</div>}
    </div>
  );
}

// ---------- Membership Card PDF generator (jsPDF) ----------
function generateMembershipCardPdf(member, expiryDate, orgSettings) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 53.98] }); // ISO 7810 ID-1 (credit-card size)
  const s = orgSettings || DEFAULT_ORG_SETTINGS;
  // Navy background
  doc.setFillColor(7, 27, 47);
  doc.rect(0, 0, 85.6, 53.98, 'F');
  // Top teal stripe
  doc.setFillColor(0, 121, 107);
  doc.rect(0, 0, 85.6, 4, 'F');
  // Bottom teal stripe
  doc.setFillColor(0, 121, 107);
  doc.rect(0, 49.98, 85.6, 4, 'F');
  // Org logo circle with initials
  doc.setFillColor(0, 121, 107);
  doc.circle(11, 14, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text((s.short_name || 'ORG').slice(0, 4), 11, 15.4, { align: 'center' });
  // Org name
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text((s.name || 'Our Organization').slice(0, 40), 19, 12);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 210);
  doc.text((s.tagline || 'Membership Card').slice(0, 60), 19, 16);
  // Divider
  doc.setDrawColor(0, 121, 107);
  doc.setLineWidth(0.3);
  doc.line(5, 20, 80.6, 20);
  // MEMBER label
  doc.setFontSize(6);
  doc.setTextColor(180, 200, 210);
  doc.text('MEMBER', 5, 25);
  // Member name
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text((member.name || '—').slice(0, 32), 5, 31);
  // Membership ID
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(180, 200, 210);
  doc.text('MEMBERSHIP ID', 5, 38);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(String(member.membership_id || '—'), 5, 43);
  // Valid thru
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(180, 200, 210);
  doc.text('VALID THRU', 62, 38);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(fmtDate(expiryDate), 62, 43);
  // Footer note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(180, 200, 210);
  doc.text(`Issued: ${fmtDate(todayStr())} • ${s.address || ''}`.slice(0, 80), 5, 47.5);
  // Save
  const filename = `membership-card-${String(member.membership_id || member.id || 'member').replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
}

// ---------- Acknowledgment letter text generator ----------
function buildAcknowledgmentLetter({ donor, donation, project, orgSettings, signatory }) {
  const s = orgSettings || DEFAULT_ORG_SETTINGS;
  const lines = [];
  lines.push(s.name || 'Our Organization');
  if (s.address) lines.push(s.address);
  if (s.phone || s.email) lines.push(`${s.phone || ''}${s.phone && s.email ? '  •  ' : ''}${s.email || ''}`);
  lines.push('');
  lines.push(fmtDate(todayStr()));
  lines.push('');
  lines.push(`${donor.name}${donor.organization ? ` (${donor.organization})` : ''}`);
  lines.push('');
  lines.push(`Dear ${donor.name},`);
  lines.push('');
  lines.push(
    `On behalf of ${s.name || 'our organization'} and the communities we serve, I wish to express our most sincere gratitude for your generous ` +
      `contribution of ${fmtMoney(donation.amount)}${donation.date ? ` on ${fmtDate(donation.date)}` : ''}` +
      `${project ? ` in support of the "${project.name}" project` : ''}` +
      `${donation.receipt_no ? `. Receipt No. ${donation.receipt_no}` : ''}.`
  );
  lines.push('');
  lines.push(
    `Your generosity makes it possible for us to continue delivering vital programs and deepening our impact. ` +
      `We are committed to using every contribution with integrity, transparency, and maximum benefit to our beneficiaries.`
  );
  lines.push('');
  lines.push(
    `We look forward to sharing periodic updates with you as the work progresses. Please do not hesitate to reach out ` +
      `should you wish to learn more or visit the project site.`
  );
  lines.push('');
  lines.push('With deepest appreciation,');
  lines.push('');
  lines.push('');
  lines.push(signatory || s.signatory || 'Executive Director');
  lines.push(s.name || '');
  return lines.join('\n');
}

// ---------- Main component ----------
export default function OrgPortal() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load persisted state once on mount.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored) {
        setState({
          ...DEFAULT_STATE,
          ...stored,
          org_settings: { ...DEFAULT_ORG_SETTINGS, ...(stored.org_settings || {}) },
        });
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[OrgPortal] localStorage read failed:', e?.message || e);
      }
    }
  }, []);

  // Persist on every change (try/catch via safeWriteStorage). Replaces inline setItem.
  useEffect(() => {
    safeWriteStorage(state);
  }, [state]);

  // FIX: All mutators now use functional setState updaters — eliminates stale-closure bugs
  // when several updates are queued in a single handler (e.g. renew(), bulk patches).
  const update = (key, updater) =>
    setState((prev) => {
      const prevList = prev[key];
      const nextValue = typeof updater === 'function' ? updater(prevList) : updater;
      return { ...prev, [key]: nextValue };
    });

  const updateSettings = (patch) =>
    setState((prev) => ({ ...prev, org_settings: { ...prev.org_settings, ...patch } }));

  const add = (key, item) =>
    update(key, (list) => [{ id: uid(), created_at: new Date().toISOString(), ...item }, ...(list || [])]);

  const remove = (key, id) =>
    update(key, (list) => (list || []).filter((x) => x.id !== id));

  const patch = (key, id, fields) =>
    update(key, (list) => (list || []).map((x) => (x.id === id ? { ...x, ...fields } : x)));

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
    const donationsTotal = state.donations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
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
      donationsTotal,
      volunteers: state.volunteers.length,
      volunteerHours,
      transactions: state.transactions.length,
      events: state.events.length,
      milestones: state.milestones.length,
      indicators: state.indicators.length,
      impactReports: state.impact_quarters.length,
    };
  }, [state]);

  return (
    <div className="page-container" style={{ background: PAGE_BG, minHeight: '100vh' }}>
      {/* Navy brand banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)`,
          color: 'white',
          padding: '20px 24px',
          borderRadius: 10,
          marginBottom: 16,
          borderLeft: `6px solid ${TEAL}`,
          boxShadow: '0 2px 8px rgba(7,27,47,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: TEAL,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: 1,
              flexShrink: 0,
            }}
          >
            {(state.org_settings.short_name || 'ORG').slice(0, 4)}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: 22, color: 'white' }}>
              {state.org_settings.name || 'Org / NGO / CBO Portal'}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#a8c4d6' }}>
              {state.org_settings.tagline || 'Manage members, donors, projects, finance, volunteers and events for your organization.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar (navy background, teal active) */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          flexWrap: 'wrap',
          padding: 6,
          background: NAVY,
          borderRadius: 10,
        }}
      >
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '8px 12px',
                background: active ? TEAL : 'transparent',
                color: active ? 'white' : '#a8c4d6',
                border: 0,
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
              title={t.label}
            >
              <span style={{ marginRight: 5 }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && <DashboardTab totals={totals} state={state} setActiveTab={setActiveTab} />}

      {activeTab === 'members' && (
        <MembersTab
          members={state.members}
          onAdd={(i) => add('members', i)}
          onRemove={(id) => remove('members', id)}
          onPatch={(id, f) => patch('members', id, f)}
        />
      )}

      {activeTab === 'membership_cards' && (
        <MembershipCardsTab members={state.members} renewals={state.renewals} orgSettings={state.org_settings} onPatchSettings={updateSettings} />
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
        <ProjectsTab
          projects={state.projects}
          onAdd={(i) => add('projects', i)}
          onRemove={(id) => remove('projects', id)}
          onPatch={(id, f) => patch('projects', id, f)}
        />
      )}

      {activeTab === 'timeline' && (
        <TimelineTab
          projects={state.projects}
          milestones={state.milestones}
          onAddMilestone={(i) => add('milestones', i)}
          onRemoveMilestone={(id) => remove('milestones', id)}
          onPatchMilestone={(id, f) => patch('milestones', id, f)}
        />
      )}

      {activeTab === 'indicators' && (
        <IndicatorsTab
          projects={state.projects}
          indicators={state.indicators}
          onAdd={(i) => add('indicators', i)}
          onRemove={(id) => remove('indicators', id)}
          onPatch={(id, f) => patch('indicators', id, f)}
        />
      )}

      {activeTab === 'impact' && (
        <ImpactTab
          state={state}
          impactReports={state.impact_quarters}
          onAdd={(i) => add('impact_quarters', i)}
          onRemove={(id) => remove('impact_quarters', id)}
        />
      )}

      {activeTab === 'donors' && (
        <DonorsTab donors={state.donors} onAdd={(i) => add('donors', i)} onRemove={(id) => remove('donors', id)} onPatch={(id, f) => patch('donors', id, f)} />
      )}

      {activeTab === 'donor_history' && (
        <DonorHistoryTab
          donors={state.donors}
          donations={state.donations}
          projects={state.projects}
          onAddDonation={(i) => add('donations', i)}
          onRemoveDonation={(id) => remove('donations', id)}
        />
      )}

      {activeTab === 'acknowledgment' && (
        <AcknowledgmentTab
          donors={state.donors}
          donations={state.donations}
          projects={state.projects}
          orgSettings={state.org_settings}
        />
      )}

      {activeTab === 'finance' && (
        <FinanceTab
          transactions={state.transactions}
          onAdd={(i) => add('transactions', i)}
          onRemove={(id) => remove('transactions', id)}
          totals={totals}
        />
      )}

      {activeTab === 'funds' && <FundsTab transactions={state.transactions} />}

      {activeTab === 'volunteers' && (
        <VolunteersTab volunteers={state.volunteers} onAdd={(i) => add('volunteers', i)} onRemove={(id) => remove('volunteers', id)} onPatch={(id, f) => patch('volunteers', id, f)} />
      )}

      {activeTab === 'skill_match' && (
        <SkillMatchTab
          volunteers={state.volunteers}
          projects={state.projects}
          onPatchProject={(id, f) => patch('projects', id, f)}
        />
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

  const fundBreakdown = useMemo(() => {
    const out = { restricted: 0, temporarily_restricted: 0, unrestricted: 0 };
    state.transactions.filter((t) => t.type === 'income').forEach((t) => {
      out[t.fund_type || 'unrestricted'] = (out[t.fund_type || 'unrestricted'] || 0) + (Number(t.amount) || 0);
    });
    return out;
  }, [state.transactions]);

  return (
    <div>
      <Row>
        <StatCard label="Total Members" value={totals.members} icon="👥" accent={TEAL} />
        <StatCard label="Income (This Year)" value={fmtMoney(totals.incomeThisYear)} icon="💰" accent={GOOD} />
        <StatCard label="Expenses (This Year)" value={fmtMoney(totals.expensesThisYear)} icon="📉" accent={DANGER} />
        <StatCard label="Active Projects" value={totals.activeProjects} icon="📁" accent={WARN} />
      </Row>
      <Row>
        <StatCard label="Total Donors" value={totals.donors} icon="🤝" />
        <StatCard label="Total Received (Donors)" value={fmtMoney(totals.totalGiven + totals.donationsTotal)} icon="🎁" accent={GOOD} />
        <StatCard label="Volunteers" value={totals.volunteers} icon="🙋" />
        <StatCard label="Volunteer Hours" value={totals.volunteerHours} icon="⏱️" accent={TEAL} />
      </Row>
      <Row>
        <StatCard label="Net Balance" value={fmtMoney(totals.balance)} icon="🏦" accent={NAVY} />
        <StatCard label="Transactions" value={totals.transactions} icon="🧾" accent={TEAL} />
        <StatCard label="Events" value={totals.events} icon="📅" accent={TEAL} />
        <StatCard label="M&E Indicators" value={totals.indicators} icon="🎯" accent={INFO} />
        <StatCard label="Impact Reports" value={totals.impactReports} icon="📈" accent={NAVY} />
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
                    <Badge color={overdue ? DANGER : r.days <= 14 ? WARN : GOOD} bg={overdue ? '#fdecea' : r.days <= 14 ? '#fff3e0' : '#e8f5e9'}>
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
              {TABS.filter((t) => !['dashboard', 'reports'].includes(t.id)).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '10px 6px',
                    background: TEAL_BG,
                    color: TEAL_DARK,
                    border: `1px solid ${TEAL_BORDER}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                >
                  <div style={{ fontSize: 18 }}>{t.icon}</div>
                  {t.label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Card>
          <SectionHeader title="Fund Balances Snapshot" subtitle="Restricted vs. Unrestricted income" action={<GhostButton onClick={() => setActiveTab('funds')}>Details →</GhostButton>} />
          <Row>
            <StatCard label="Restricted" value={fmtMoneyShort(fundBreakdown.restricted)} icon="🔒" accent="#6a1b9a" />
            <StatCard label="Temp. Restricted" value={fmtMoneyShort(fundBreakdown.temporarily_restricted)} icon="🔐" accent={WARN} />
            <StatCard label="Unrestricted" value={fmtMoneyShort(fundBreakdown.unrestricted)} icon="🔓" accent={GOOD} />
          </Row>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// 2. MEMBERS  (with search/filter — audit fix)
// ============================================================
function MembersTab({ members, onAdd, onRemove, onPatch }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', membership_id: '', join_date: todayStr(), status: 'active' });
  const [err, setErr] = useState('');
  // NEW: search + status filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  // NEW: filtered + searchable member list (audit fix)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (m.name || '').toLowerCase().includes(q) ||
        (m.membership_id || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q)
      );
    });
  }, [members, search, statusFilter]);

  return (
    <div>
      <SectionHeader
        title="Member Directory"
        subtitle={`${members.length} member${members.length === 1 ? '' : 's'} registered`}
        action={<PrimaryButton onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Member'}</PrimaryButton>}
      />

      {showForm && (
        <Card padding={20} style={{ marginBottom: 16 }}>
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

      {/* Search & filter controls (audit fix) */}
      {members.length > 0 && (
        <Card padding={12} style={{ marginBottom: 12 }}>
          <Row>
            <Col flex={3} min={220}>
              <Field label="Search members">
                <input style={inputStyle} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, email, phone…" />
              </Field>
            </Col>
            <Col min={160}>
              <Field label="Filter by status">
                <select style={inputStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="lapsed">Lapsed</option>
                  <option value="suspended">Suspended</option>
                </select>
              </Field>
            </Col>
          </Row>
          <div style={{ fontSize: 12, color: MUTE }}>Showing {filtered.length} of {members.length} member(s).</div>
        </Card>
      )}

      <div style={{ marginTop: 16 }}>
        {members.length === 0 ? (
          <EmptyState icon="👥" message="No members yet. Add your first member to start the directory." />
        ) : filtered.length === 0 ? (
          <EmptyState icon="🔍" message="No members match your search. Try a different query." />
        ) : (
          filtered.map((m) => (
            <Card key={m.id} padding={14} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: NAVY, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
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
                <RemoveBtn onClick={() => onRemove(m.id)} label="member" />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// 3. RENEWALS  (stale-closure bug fixed via functional updaters)
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

  // FIX: renew() previously had a stale-closure bug because onPatch + onAdd were
  // both computed against the same captured `state`. Now both flow through
  // functional setState updaters in the parent, so they chain cleanly.
  const renew = (r) => {
    onPatch(r.id, { status: 'renewed', renewed_at: new Date().toISOString() });
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
            <Card key={r.id} padding={14} style={{ marginBottom: 8 }}>
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
                <RemoveBtn onClick={() => onRemove(r.id)} label="renewal record" />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ============================================================
// 4. PROJECTS  (end-date validation fixed)
// ============================================================
function ProjectsTab({ projects, onAdd, onRemove, onPatch }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', start_date: todayStr(), end_date: '', budget: '', status: 'planned', beneficiaries_count: '', required_skills: '' });
  const [err, setErr] = useState('');

  const submit = () => {
    if (!form.name.trim()) return setErr('Project name is required.');
    if (!form.start_date) return setErr('Start date is required.');
    // FIX: end date must be after start date
    if (form.end_date && new Date(form.end_date) <= new Date(form.start_date)) {
      return setErr('End date must be AFTER the start date.');
    }
    onAdd({
      ...form,
      name: form.name.trim(),
      budget: Number(form.budget) || 0,
      beneficiaries_count: Number(form.beneficiaries_count) || 0,
      required_skills: parseList(form.required_skills),
    });
    setForm({ name: '', description: '', start_date: todayStr(), end_date: '', budget: '', status: 'planned', beneficiaries_count: '', required_skills: '' });
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
            <Col><Field label="Start Date *"><input style={inputStyle} type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} /></Field></Col>
            <Col><Field label="End Date" hint="Must be after start date"><input style={inputStyle} type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} /></Field></Col>
            <Col><Field label="Budget (UGX)"><input style={inputStyle} type="number" min="0" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="5000000" /></Field></Col>
            <Col><Field label="Beneficiaries"><input style={inputStyle} type="number" min="0" value={form.beneficiaries_count} onChange={(e) => set('beneficiaries_count', e.target.value)} placeholder="200" /></Field></Col>
          </Row>
          <Field label="Required Skills" hint="Comma-separated, e.g. teaching, first aid, IT — used by Skill Matching tab">
            <input style={inputStyle} value={form.required_skills} onChange={(e) => set('required_skills', e.target.value)} placeholder="teaching, first aid, IT" />
          </Field>
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
                <ProgressBar value={pct} color={TEAL} label={`${pct}% complete`} />
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: MUTE, flexWrap: 'wrap', alignItems: 'center' }}>
                <span>📅 {fmtDate(p.start_date)} → {fmtDate(p.end_date)}</span>
                <span>💰 {fmtMoney(p.budget)}</span>
                <span>👥 {p.beneficiaries_count || 0} beneficiaries</span>
                {p.required_skills && p.required_skills.length > 0 && (
                  <span>🧩 {p.required_skills.length} skill(s) required</span>
                )}
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
                <RemoveBtn onClick={() => onRemove(p.id)} label="project" />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ============================================================
// 4b. PROJECT TIMELINE (Gantt-style)
// ============================================================
function TimelineTab({ projects, milestones, onAddMilestone, onRemoveMilestone, onPatchMilestone }) {
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ project_id: '', name: '', due_date: todayStr() });
  const [err, setErr] = useState('');

  const datedProjects = projects.filter((p) => p.start_date);
  const allDates = datedProjects.flatMap((p) => [p.start_date, p.end_date]).filter(Boolean);

  const range = useMemo(() => {
    if (allDates.length === 0) return null;
    const min = new Date(Math.min(...allDates.map((d) => new Date(d).getTime())));
    const max = new Date(Math.max(...allDates.map((d) => new Date(d).getTime())));
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 7);
    if (max <= min) {
      min.setMonth(min.getMonth() - 1);
      max.setMonth(max.getMonth() + 1);
    }
    // Build month markers
    const months = [];
    const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
    while (cursor <= max) {
      months.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return { min, max, total: max - min, months };
  }, [allDates.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const barGeom = (p) => {
    if (!range || !p.start_date) return null;
    const start = new Date(p.start_date);
    const end = p.end_date ? new Date(p.end_date) : new Date();
    const leftPct = ((start - range.min) / range.total) * 100;
    const widthPct = ((end - start) / range.total) * 100;
    return { left: clamp(leftPct, 0, 100), width: clamp(widthPct, 1.5, 100 - clamp(leftPct, 0, 100)) };
  };

  const milestoneGeom = (m) => {
    if (!range || !m.due_date) return null;
    const d = new Date(m.due_date);
    return clamp(((d - range.min) / range.total) * 100, 0, 100);
  };

  const statusColor = { planned: '#90a4ae', active: WARN, paused: '#5f6368', completed: GOOD };
  const progressPct = (p) => {
    if (p.status === 'completed') return 100;
    if (!p.start_date || !p.end_date) return 0;
    const start = new Date(p.start_date);
    const end = new Date(p.end_date);
    const total = end - start;
    const elapsed = new Date() - start;
    if (elapsed <= 0) return 0;
    if (elapsed >= total) return 95;
    return clamp((elapsed / total) * 100, 0, 100);
  };

  const submitMilestone = () => {
    if (!milestoneForm.project_id) return setErr('Pick a project.');
    if (!milestoneForm.name.trim()) return setErr('Milestone name is required.');
    if (!milestoneForm.due_date) return setErr('Due date is required.');
    onAddMilestone({ project_id: milestoneForm.project_id, name: milestoneForm.name.trim(), due_date: milestoneForm.due_date, completed: false, completed_date: null });
    setMilestoneForm({ project_id: '', name: '', due_date: todayStr() });
    setErr('');
    setShowMilestoneForm(false);
  };

  const projectName = (pid) => {
    const p = projects.find((x) => x.id === pid);
    return p ? p.name : '—';
  };

  return (
    <div>
      <SectionHeader
        title="Project Timeline"
        subtitle="Gantt-style overview of project schedules and milestones"
        action={<PrimaryButton onClick={() => setShowMilestoneForm(!showMilestoneForm)}>{showMilestoneForm ? 'Cancel' : '+ Add Milestone'}</PrimaryButton>}
      />

      {showMilestoneForm && (
        <Card padding={20} style={{ marginBottom: 16 }}>
          {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
          <Row>
            <Col flex={2} min={240}>
              <Field label="Project">
                <select style={inputStyle} value={milestoneForm.project_id} onChange={(e) => setMilestoneForm({ ...milestoneForm, project_id: e.target.value })}>
                  <option value="">— Select project —</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            </Col>
            <Col flex={2} min={220}><Field label="Milestone name"><input style={inputStyle} value={milestoneForm.name} onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })} placeholder="Baseline survey complete" /></Field></Col>
            <Col min={160}><Field label="Due date"><input style={inputStyle} type="date" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })} /></Field></Col>
          </Row>
          <PrimaryButton onClick={submitMilestone} disabled={projects.length === 0}>Save Milestone</PrimaryButton>
        </Card>
      )}

      {!range ? (
        <EmptyState icon="📅" message="No projects with start dates yet. Add projects first to see the Gantt timeline." />
      ) : (
        <Card padding={16}>
          {/* Month axis */}
          <div style={{ position: 'relative', height: 24, marginBottom: 6, marginLeft: 180, borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}` }}>
            {range.months.map((m, i) => {
              const pct = ((m - range.min) / range.total) * 100;
              return (
                <div key={i} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, borderLeft: `1px dashed ${BORDER}`, fontSize: 10, color: MUTE, paddingLeft: 4, whiteSpace: 'nowrap' }}>
                  {m.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                </div>
              );
            })}
          </div>

          {/* Today marker label */}
          <div style={{ marginLeft: 180, fontSize: 10, color: TEAL_DARK, marginBottom: 8, fontWeight: 700 }}>⏱ Today: {fmtDate(todayStr())}</div>

          {/* Project rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {datedProjects.length === 0 && (
              <p style={{ color: MUTE, fontSize: 13 }}>No projects with start dates yet.</p>
            )}
            {datedProjects.map((p) => {
              const geom = barGeom(p) || { left: 0, width: 0 };
              const prog = progressPct(p);
              const color = statusColor[p.status] || '#90a4ae';
              const pMilestones = milestones.filter((m) => m.project_id === p.id);
              return (
                <div key={p.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 180, flexShrink: 0, fontSize: 12, fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>
                      {p.name}
                    </div>
                    <div style={{ position: 'relative', flex: 1, height: 22, background: '#f0f4f3', borderRadius: 4, border: `1px solid ${BORDER}` }}>
                      {/* Today line */}
                      {(() => {
                        const todayPct = ((new Date() - range.min) / range.total) * 100;
                        if (todayPct < 0 || todayPct > 100) return null;
                        return <div style={{ position: 'absolute', left: `${todayPct}%`, top: -8, bottom: -8, borderLeft: `2px dotted ${TEAL_DARK}`, zIndex: 2 }} />;
                      })()}
                      {/* Project bar */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${geom.left}%`,
                          width: `${geom.width}%`,
                          top: 2,
                          bottom: 2,
                          background: color,
                          borderRadius: 3,
                          overflow: 'hidden',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                        title={`${p.name}\n${fmtDate(p.start_date)} → ${fmtDate(p.end_date)}\n${prog}% complete`}
                      >
                        <div style={{ width: `${prog}%`, height: '100%', background: 'rgba(255,255,255,0.35)' }} />
                      </div>
                      {/* Milestone diamonds */}
                      {pMilestones.map((m) => {
                        const mp = milestoneGeom(m);
                        if (mp === null) return null;
                        return (
                          <div
                            key={m.id}
                            title={`${m.name} — ${fmtDate(m.due_date)}${m.completed ? ' (done)' : ''}`}
                            style={{
                              position: 'absolute',
                              left: `${mp}%`,
                              top: -4,
                              width: 12,
                              height: 12,
                              transform: 'translateX(-50%) rotate(45deg)',
                              background: m.completed ? GOOD : NAVY,
                              border: '1px solid white',
                              boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
                              zIndex: 3,
                              cursor: 'help',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  {/* Milestones list for this project */}
                  {pMilestones.length > 0 && (
                    <div style={{ marginLeft: 188, marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {pMilestones.map((m) => (
                        <span key={m.id} style={{ fontSize: 10, color: MUTE, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <input type="checkbox" checked={!!m.completed} onChange={(e) => onPatchMilestone(m.id, { completed: e.target.checked, completed_date: e.target.checked ? todayStr() : null })} />
                          {m.name} ({fmtDate(m.due_date)})
                          <button onClick={() => onRemoveMilestone(m.id)} style={{ background: 'none', border: 0, color: DANGER, cursor: 'pointer', fontSize: 14, padding: '0 2px' }} title="Delete milestone">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, fontSize: 11, color: MUTE, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>◆ Milestone (navy = pending, green = done)</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 14, height: 8, background: statusColor.planned, borderRadius: 2, display: 'inline-block' }} /> Planned
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 14, height: 8, background: statusColor.active, borderRadius: 2, display: 'inline-block' }} /> Active
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 14, height: 8, background: statusColor.completed, borderRadius: 2, display: 'inline-block' }} /> Completed
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 0, height: 12, borderLeft: `2px dotted ${TEAL_DARK}`, display: 'inline-block' }} /> Today
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// 4c. M&E INDICATORS
// ============================================================
function IndicatorsTab({ projects, indicators, onAdd, onRemove, onPatch }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ project_id: '', name: '', baseline: '', target: '', actual: '', unit: '' });
  const [filterProject, setFilterProject] = useState('all');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!form.project_id) return setErr('Pick a project.');
    if (!form.name.trim()) return setErr('Indicator name is required.');
    if (form.target === '' || Number(form.target) === '') return setErr('Target is required.');
    onAdd({
      project_id: form.project_id,
      name: form.name.trim(),
      baseline: Number(form.baseline) || 0,
      target: Number(form.target) || 0,
      actual: Number(form.actual) || 0,
      unit: form.unit.trim(),
    });
    setForm({ project_id: '', name: '', baseline: '', target: '', actual: '', unit: '' });
    setErr('');
    setShowForm(false);
  };
  const set = (k, v) => setForm({ ...form, [k]: v });

  const projectName = (pid) => {
    const p = projects.find((x) => x.id === pid);
    return p ? p.name : '—';
  };

  const filtered = filterProject === 'all' ? indicators : indicators.filter((i) => i.project_id === filterProject);

  return (
    <div>
      <SectionHeader
        title="M&E Indicators"
        subtitle="Monitoring & Evaluation: baseline, target, actual & % achieved per project"
        action={<PrimaryButton onClick={() => setShowForm(!showForm)} disabled={projects.length === 0}>{showForm ? 'Cancel' : '+ Add Indicator'}</PrimaryButton>}
      />

      {projects.length === 0 ? (
        <EmptyState icon="🎯" message="Add at least one project before defining M&E indicators." />
      ) : (
        <>
          {showForm && (
            <Card padding={20} style={{ marginBottom: 16 }}>
              {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
              <Row>
                <Col flex={2} min={240}>
                  <Field label="Project">
                    <select style={inputStyle} value={form.project_id} onChange={(e) => set('project_id', e.target.value)}>
                      <option value="">— Select project —</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                </Col>
                <Col flex={2} min={220}><Field label="Indicator Name *"><input style={inputStyle} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="# households with safe water access" /></Field></Col>
                <Col min={140}><Field label="Unit"><input style={inputStyle} value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="households" /></Field></Col>
              </Row>
              <Row>
                <Col min={140}><Field label="Baseline"><input style={inputStyle} type="number" value={form.baseline} onChange={(e) => set('baseline', e.target.value)} placeholder="0" /></Field></Col>
                <Col min={140}><Field label="Target *"><input style={inputStyle} type="number" value={form.target} onChange={(e) => set('target', e.target.value)} placeholder="200" /></Field></Col>
                <Col min={140}><Field label="Actual"><input style={inputStyle} type="number" value={form.actual} onChange={(e) => set('actual', e.target.value)} placeholder="150" /></Field></Col>
              </Row>
              <PrimaryButton onClick={submit}>Save Indicator</PrimaryButton>
            </Card>
          )}

          <Card padding={12} style={{ marginBottom: 12 }}>
            <Field label="Filter by project">
              <select style={inputStyle} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
                <option value="all">All projects ({indicators.length} indicators)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState icon="🎯" message="No indicators yet. Add one above to track progress against targets." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: SURFACE, borderRadius: 8, overflow: 'hidden', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: TEAL_BG, color: TEAL_DARK, textAlign: 'left' }}>
                    <th style={cellTh}>Indicator</th>
                    <th style={cellTh}>Project</th>
                    <th style={{ ...cellTh, textAlign: 'right' }}>Baseline</th>
                    <th style={{ ...cellTh, textAlign: 'right' }}>Target</th>
                    <th style={{ ...cellTh, textAlign: 'right' }}>Actual</th>
                    <th style={cellTh}>% Achieved</th>
                    <th style={cellTh}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ind) => {
                    const pct = pctAchieved(ind.baseline, ind.target, ind.actual);
                    const barColor = pct >= 100 ? GOOD : pct >= 75 ? TEAL : pct >= 50 ? WARN : DANGER;
                    return (
                      <tr key={ind.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={cellTd}>
                          <div style={{ fontWeight: 700 }}>{ind.name}</div>
                          {ind.unit && <div style={{ fontSize: 11, color: MUTE }}>unit: {ind.unit}</div>}
                        </td>
                        <td style={{ ...cellTd, color: MUTE, fontSize: 12 }}>{projectName(ind.project_id)}</td>
                        <td style={{ ...cellTd, textAlign: 'right' }}>{ind.baseline}</td>
                        <td style={{ ...cellTd, textAlign: 'right', fontWeight: 700 }}>{ind.target}</td>
                        <td style={{ ...cellTd, textAlign: 'right' }}>
                          <input
                            type="number"
                            value={ind.actual}
                            onChange={(e) => onPatch(ind.id, { actual: Number(e.target.value) || 0 })}
                            style={{ width: 80, padding: 4, border: `1px solid ${BORDER}`, borderRadius: 4, textAlign: 'right', fontSize: 13 }}
                          />
                        </td>
                        <td style={{ ...cellTd, minWidth: 140 }}>
                          <ProgressBar value={pct} color={barColor} height={8} label={`${pct.toFixed(0)}% achieved`} />
                        </td>
                        <td style={cellTd}><RemoveBtn onClick={() => onRemove(ind.id)} label="indicator" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// 4d. IMPACT REPORT (quarterly)
// ============================================================
function ImpactTab({ state, impactReports, onAdd, onRemove }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    year: thisYear(),
    quarter: 'Q1',
    beneficiaries: '',
    outcomes: '',
    lessons: '',
    narrative: '',
  });
  const [err, setErr] = useState('');

  // Auto-suggest beneficiaries & outcomes from projects/indicators active in this quarter
  const suggest = () => {
    const y = Number(form.year);
    const q = form.quarter;
    const qStartMonth = (Number(q.slice(1)) - 1) * 3;
    const qStart = new Date(y, qStartMonth, 1);
    const qEnd = new Date(y, qStartMonth + 3, 0);
    const projectsInQ = state.projects.filter((p) => {
      if (!p.start_date) return false;
      const s = new Date(p.start_date);
      const e = p.end_date ? new Date(p.end_date) : new Date();
      return s <= qEnd && e >= qStart;
    });
    const beneficiaries = projectsInQ.reduce((s, p) => s + (Number(p.beneficiaries_count) || 0), 0);
    const outcomes = state.indicators
      .filter((i) => projectsInQ.some((p) => p.id === i.project_id))
      .reduce((s, i) => s + (Number(i.actual) || 0), 0);
    setForm({
      ...form,
      beneficiaries: String(beneficiaries),
      outcomes: String(outcomes),
      narrative: `This ${q} ${y} report covers ${projectsInQ.length} active project(s).`,
    });
  };

  const submit = () => {
    if (!form.year || Number(form.year) < 2000) return setErr('Enter a valid year.');
    if (!form.quarter) return setErr('Pick a quarter.');
    if (impactReports.some((r) => r.year === Number(form.year) && r.quarter === form.quarter)) {
      return setErr(`A report already exists for ${form.quarter} ${form.year}.`);
    }
    onAdd({
      year: Number(form.year),
      quarter: form.quarter,
      beneficiaries: Number(form.beneficiaries) || 0,
      outcomes: Number(form.outcomes) || 0,
      lessons: form.lessons.trim(),
      narrative: form.narrative.trim(),
      savedAt: new Date().toISOString(),
    });
    setForm({ year: thisYear(), quarter: 'Q1', beneficiaries: '', outcomes: '', lessons: '', narrative: '' });
    setErr('');
    setShowForm(false);
  };
  const set = (k, v) => setForm({ ...form, [k]: v });

  const printReport = (r) => {
    const body = `
      <div class="letterhead">
        <h1>${state.org_settings.name || 'Our Organization'}</h1>
        <p>Quarterly Impact Report — ${r.quarter} ${r.year}</p>
      </div>
      <div class="meta">Prepared: ${fmtDate(r.savedAt ? r.savedAt.slice(0, 10) : null)}</div>
      <h2>Beneficiaries Reached</h2>
      <p style="font-size:28px;font-weight:800;color:#00796b;">${r.beneficiaries.toLocaleString()}</p>
      <h2>Outcomes Achieved</h2>
      <p style="font-size:24px;font-weight:700;color:#071b2f;">${r.outcomes.toLocaleString()}</p>
      ${r.narrative ? `<h2>Narrative</h2><p>${r.narrative}</p>` : ''}
      ${r.lessons ? `<h2>Lessons Learned</h2><p>${r.lessons}</p>` : ''}
      <div class="sign">
        <p>Submitted by:</p>
        <div class="line">${state.org_settings.signatory || 'Executive Director'}</div>
      </div>
    `;
    printHtml(`Impact Report ${r.quarter} ${r.year}`, body);
  };

  const sorted = [...impactReports].sort((a, b) => b.year - a.year || b.quarter.localeCompare(a.quarter));

  return (
    <div>
      <SectionHeader
        title="Impact Reports"
        subtitle="Quarterly beneficiary, outcome & lessons-learned summaries"
        action={<PrimaryButton onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Report'}</PrimaryButton>}
      />

      {showForm && (
        <Card padding={20} style={{ marginBottom: 16 }}>
          {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
          <Row>
            <Col min={140}><Field label="Year"><input style={inputStyle} type="number" min="2000" max="2100" value={form.year} onChange={(e) => set('year', e.target.value)} /></Field></Col>
            <Col min={140}>
              <Field label="Quarter">
                <select style={inputStyle} value={form.quarter} onChange={(e) => set('quarter', e.target.value)}>
                  <option value="Q1">Q1 (Jan–Mar)</option>
                  <option value="Q2">Q2 (Apr–Jun)</option>
                  <option value="Q3">Q3 (Jul–Sep)</option>
                  <option value="Q4">Q4 (Oct–Dec)</option>
                </select>
              </Field>
            </Col>
            <Col min={160}><Field label="Beneficiaries Reached"><input style={inputStyle} type="number" min="0" value={form.beneficiaries} onChange={(e) => set('beneficiaries', e.target.value)} placeholder="0" /></Field></Col>
            <Col min={160}><Field label="Outcomes Achieved (count)"><input style={inputStyle} type="number" min="0" value={form.outcomes} onChange={(e) => set('outcomes', e.target.value)} placeholder="0" /></Field></Col>
          </Row>
          <Field label="Narrative" hint="Brief summary of activities & results this quarter">
            <textarea style={{ ...inputStyle, minHeight: 70 }} value={form.narrative} onChange={(e) => set('narrative', e.target.value)} placeholder="This quarter we completed the baseline survey for the Clean Water Initiative and trained 24 community health workers…" />
          </Field>
          <Field label="Lessons Learned" hint="What worked, what didn't, what to change next quarter">
            <textarea style={{ ...inputStyle, minHeight: 70 }} value={form.lessons} onChange={(e) => set('lessons', e.target.value)} placeholder="1. Mobile data collection accelerated fieldwork. 2. Heavy rains in May delayed construction. 3. Need stronger partner coordination." />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <PrimaryButton onClick={submit}>Save Impact Report</PrimaryButton>
            <GhostButton onClick={suggest}>💡 Auto-fill suggestions</GhostButton>
          </div>
        </Card>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon="📈" message="No impact reports yet. Create your first quarterly report above." />
      ) : (
        sorted.map((r) => (
          <Card key={r.id} padding={16} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 800, color: NAVY, fontSize: 16 }}>
                  {r.quarter} {r.year}
                  <Badge color={TEAL} bg={TEAL_BG}>{r.savedAt ? `Saved ${fmtDate(r.savedAt.slice(0, 10))}` : ''}</Badge>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 10, color: MUTE, textTransform: 'uppercase', fontWeight: 700 }}>Beneficiaries</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: GOOD }}>{r.beneficiaries.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: MUTE, textTransform: 'uppercase', fontWeight: 700 }}>Outcomes</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: TEAL_DARK }}>{r.outcomes.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <GhostButton onClick={() => printReport(r)}>🖨 Print</GhostButton>
                <RemoveBtn onClick={() => onRemove(r.id)} label="impact report" />
              </div>
            </div>
            {r.narrative && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}`, fontSize: 13, color: INK }}>
                <strong style={{ color: NAVY }}>Narrative:</strong> {r.narrative}
              </div>
            )}
            {r.lessons && (
              <div style={{ marginTop: 8, fontSize: 13, color: INK, whiteSpace: 'pre-wrap' }}>
                <strong style={{ color: NAVY }}>Lessons Learned:</strong>
                <br />
                {r.lessons}
              </div>
            )}
          </Card>
        ))
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
      interest_areas: parseListKeepCase(form.interest_areas),
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
              <RemoveBtn onClick={() => onRemove(d.id)} label="donor" />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// ============================================================
// 5b. DONOR GIVING HISTORY
// ============================================================
function DonorHistoryTab({ donors, donations, projects, onAddDonation, onRemoveDonation }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ donor_id: '', project_id: '', amount: '', date: todayStr(), receipt_no: '', fund_type: 'unrestricted', description: '' });
  const [selectedDonor, setSelectedDonor] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!form.donor_id) return setErr('Pick a donor.');
    if (!form.amount || Number(form.amount) <= 0) return setErr('Amount must be > 0.');
    if (!form.date) return setErr('Date is required.');
    onAddDonation({
      donor_id: form.donor_id,
      project_id: form.project_id || null,
      amount: Number(form.amount),
      date: form.date,
      receipt_no: form.receipt_no.trim() || `RC-${uid().toString().slice(-6)}`,
      fund_type: form.fund_type,
      description: form.description.trim(),
    });
    setForm({ donor_id: '', project_id: '', amount: '', date: todayStr(), receipt_no: '', fund_type: 'unrestricted', description: '' });
    setErr('');
    setShowForm(false);
  };
  const set = (k, v) => setForm({ ...form, [k]: v });

  const donorName = (did) => {
    const d = donors.find((x) => x.id === did);
    return d ? d.name : '—';
  };
  const projectName = (pid) => {
    if (!pid) return '—';
    const p = projects.find((x) => x.id === pid);
    return p ? p.name : '—';
  };

  const filtered = selectedDonor ? donations.filter((d) => d.donor_id === selectedDonor) : donations;
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = sorted.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  // Running balance per donation (chronological)
  const chrono = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
  let run = 0;
  const runMap = new Map();
  chrono.forEach((d) => { run += Number(d.amount) || 0; runMap.set(d.id, run); });

  return (
    <div>
      <SectionHeader
        title="Donor Giving History"
        subtitle="Per-donor transaction ledger with receipt numbers"
        action={<PrimaryButton onClick={() => setShowForm(!showForm)} disabled={donors.length === 0}>{showForm ? 'Cancel' : '+ Record Donation'}</PrimaryButton>}
      />

      {donors.length === 0 ? (
        <EmptyState icon="🧾" message="Add donors first to record giving history." />
      ) : (
        <>
          <Card padding={12} style={{ marginBottom: 12 }}>
            <Field label="Filter by donor">
              <select style={inputStyle} value={selectedDonor} onChange={(e) => setSelectedDonor(e.target.value)}>
                <option value="">All donors ({donations.length} donations, {fmtMoney(donations.reduce((s, d) => s + (Number(d.amount) || 0), 0))})</option>
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
            {selectedDonor && (
              <div style={{ fontSize: 13, color: TEAL_DARK, fontWeight: 700 }}>
                Showing {sorted.length} donation(s) for {donorName(selectedDonor)} — Total: {fmtMoney(total)}
              </div>
            )}
          </Card>

          {showForm && (
            <Card padding={20} style={{ marginBottom: 16 }}>
              {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
              <Row>
                <Col flex={2} min={200}>
                  <Field label="Donor *">
                    <select style={inputStyle} value={form.donor_id} onChange={(e) => set('donor_id', e.target.value)}>
                      <option value="">— Select donor —</option>
                      {donors.map((d) => <option key={d.id} value={d.id}>{d.name}{d.organization ? ` (${d.organization})` : ''}</option>)}
                    </select>
                  </Field>
                </Col>
                <Col flex={2} min={200}>
                  <Field label="Project (optional)">
                    <select style={inputStyle} value={form.project_id} onChange={(e) => set('project_id', e.target.value)}>
                      <option value="">— No specific project —</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                </Col>
                <Col min={140}><Field label="Amount (UGX) *"><input style={inputStyle} type="number" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="500000" /></Field></Col>
              </Row>
              <Row>
                <Col min={140}><Field label="Date"><input style={inputStyle} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field></Col>
                <Col min={160}><Field label="Receipt #"><input style={inputStyle} value={form.receipt_no} onChange={(e) => set('receipt_no', e.target.value)} placeholder="RC-000123" /></Field></Col>
                <Col min={180}>
                  <Field label="Fund type">
                    <select style={inputStyle} value={form.fund_type} onChange={(e) => set('fund_type', e.target.value)}>
                      <option value="unrestricted">Unrestricted</option>
                      <option value="temporarily_restricted">Temporarily Restricted</option>
                      <option value="restricted">Restricted</option>
                    </select>
                  </Field>
                </Col>
              </Row>
              <Field label="Description (optional)"><input style={inputStyle} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Annual pledge installment" /></Field>
              <PrimaryButton onClick={submit}>Save Donation</PrimaryButton>
            </Card>
          )}

          {sorted.length === 0 ? (
            <EmptyState icon="🧾" message="No donations recorded yet. Click 'Record Donation' to begin." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: SURFACE, borderRadius: 8, overflow: 'hidden', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: TEAL_BG, color: TEAL_DARK, textAlign: 'left' }}>
                    <th style={cellTh}>Date</th>
                    {!selectedDonor && <th style={cellTh}>Donor</th>}
                    <th style={cellTh}>Project</th>
                    <th style={cellTh}>Receipt #</th>
                    <th style={cellTh}>Fund</th>
                    <th style={{ ...cellTh, textAlign: 'right' }}>Amount</th>
                    <th style={{ ...cellTh, textAlign: 'right' }}>Running</th>
                    <th style={cellTh}></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((d) => {
                    const fund = FUNDS[d.fund_type] || FUNDS.unrestricted;
                    return (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={cellTd}>{fmtDate(d.date)}</td>
                        {!selectedDonor && <td style={cellTd}>{donorName(d.donor_id)}</td>}
                        <td style={{ ...cellTd, color: MUTE, fontSize: 12 }}>{projectName(d.project_id)}</td>
                        <td style={{ ...cellTd, fontFamily: 'monospace', fontSize: 12 }}>{d.receipt_no || '—'}</td>
                        <td style={cellTd}><Badge color={fund.color} bg={fund.bg}>{fund.label}</Badge></td>
                        <td style={{ ...cellTd, textAlign: 'right', fontWeight: 700, color: GOOD }}>{fmtMoney(d.amount)}</td>
                        <td style={{ ...cellTd, textAlign: 'right', fontWeight: 700, color: NAVY }}>{fmtMoney(runMap.get(d.id) || 0)}</td>
                        <td style={cellTd}><RemoveBtn onClick={() => onRemoveDonation(d.id)} label="donation" /></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f0f4f3', fontWeight: 800 }}>
                    <td colSpan={!selectedDonor ? 5 : 4} style={{ ...cellTd, textAlign: 'right' }}>TOTAL</td>
                    <td style={{ ...cellTd, textAlign: 'right', color: GOOD }}>{fmtMoney(total)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// 5c. ACKNOWLEDGMENT LETTERS
// ============================================================
function AcknowledgmentTab({ donors, donations, projects, orgSettings }) {
  const [donorId, setDonorId] = useState('');
  const [donationId, setDonationId] = useState('');
  const [signatory, setSignatory] = useState(orgSettings.signatory || 'Executive Director');
  const [letterText, setLetterText] = useState('');
  const [copied, setCopied] = useState(false);

  const donor = donors.find((d) => d.id === donorId);
  const donorDonations = useMemo(() => (donor ? donations.filter((d) => d.donor_id === donorId) : []), [donor, donations, donorId]);
  const donation = donations.find((d) => d.id === donationId);
  const project = donation ? projects.find((p) => p.id === donation.project_id) : null;

  const generate = () => {
    if (!donor || !donation) return;
    const text = buildAcknowledgmentLetter({ donor, donation, project, orgSettings, signatory });
    setLetterText(text);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(letterText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = letterText;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
      document.body.removeChild(ta);
    }
  };

  const printLetter = () => {
    if (!donor) return;
    const s = orgSettings || DEFAULT_ORG_SETTINGS;
    const donationLine = donation
      ? `${fmtMoney(donation.amount)}${donation.date ? ` on ${fmtDate(donation.date)}` : ''}${project ? ` in support of the &ldquo;${project.name}&rdquo; project` : ''}${donation.receipt_no ? `. Receipt No. ${donation.receipt_no}` : ''}.`
      : 'your continued partnership and generosity.';
    const body = `
      <div class="letterhead">
        <h1>${s.name}</h1>
        <p>${s.address || ''}${s.phone ? '  •  ' + s.phone : ''}${s.email ? '  •  ' + s.email : ''}</p>
      </div>
      <div class="meta">${fmtDate(todayStr())}</div>
      <p>${donor.name}${donor.organization ? ` (${donor.organization})` : ''}</p>
      <p>Dear ${donor.name},</p>
      <p>On behalf of ${s.name} and the communities we serve, I wish to express our most sincere gratitude for your generous contribution of ${donationLine}</p>
      <p>Your generosity makes it possible for us to continue delivering vital programs and deepening our impact. We are committed to using every contribution with integrity, transparency, and maximum benefit to our beneficiaries.</p>
      <p>We look forward to sharing periodic updates with you as the work progresses. Please do not hesitate to reach out should you wish to learn more or visit the project site.</p>
      <p>With deepest appreciation,</p>
      <div class="sign">
        <div class="line">${signatory || s.signatory}</div>
        <p>${s.name}</p>
      </div>
    `;
    printHtml(`Thank-You Letter — ${donor.name}`, body);
  };

  const downloadLetter = () => {
    if (!letterText) return;
    downloadTextFile(`thank-you-letter-${(donor.name || 'donor').replace(/\s+/g, '-')}.txt`, letterText);
  };

  return (
    <div>
      <SectionHeader title="Acknowledgment Letters" subtitle="Generate printable thank-you letters for donors" />

      {donors.length === 0 ? (
        <EmptyState icon="✉️" message="Add donors first to generate acknowledgment letters." />
      ) : (
        <>
          <Card padding={20} style={{ marginBottom: 16 }}>
            <Row>
              <Col flex={2} min={220}>
                <Field label="Select Donor">
                  <select style={inputStyle} value={donorId} onChange={(e) => { setDonorId(e.target.value); setDonationId(''); setLetterText(''); }}>
                    <option value="">— Select donor —</option>
                    {donors.map((d) => <option key={d.id} value={d.id}>{d.name}{d.organization ? ` (${d.organization})` : ''}</option>)}
                  </select>
                </Field>
              </Col>
              <Col flex={2} min={220}>
                <Field label="Select Donation">
                  <select style={inputStyle} value={donationId} onChange={(e) => { setDonationId(e.target.value); setLetterText(''); }} disabled={!donor}>
                    <option value="">— Select a donation —</option>
                    {donorDonations.map((d) => (
                      <option key={d.id} value={d.id}>{fmtDate(d.date)} — {fmtMoney(d.amount)} ({d.receipt_no || 'no receipt'})</option>
                    ))}
                  </select>
                </Field>
              </Col>
              <Col min={200}>
                <Field label="Signatory">
                  <input style={inputStyle} value={signatory} onChange={(e) => setSignatory(e.target.value)} placeholder="Executive Director" />
                </Field>
              </Col>
            </Row>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <PrimaryButton onClick={generate} disabled={!donor || !donation}>✍ Generate Letter</PrimaryButton>
              <GhostButton onClick={printLetter} disabled={!donor}>🖨 Print</GhostButton>
              <GhostButton onClick={downloadLetter} disabled={!letterText}>⬇ Download .txt</GhostButton>
              <GhostButton onClick={copyToClipboard} disabled={!letterText}>{copied ? '✓ Copied!' : '📋 Copy'}</GhostButton>
            </div>
            {donor && donorDonations.length === 0 && (
              <div style={{ marginTop: 12, color: WARN, fontSize: 13 }}>⚠ This donor has no recorded donations. Record donations in the Giving History tab first.</div>
            )}
          </Card>

          {letterText && (
            <Card padding={24}>
              <div style={{ fontSize: 13, color: MUTE, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>Preview</div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 14, lineHeight: 1.7, color: INK, margin: 0 }}>
{letterText}
              </pre>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// 6. FINANCE  (with fund_type field)
// ============================================================
function FinanceTab({ transactions, onAdd, onRemove, totals }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'income', category: '', amount: '', date: todayStr(), description: '', fund_type: 'unrestricted' });
  const [err, setErr] = useState('');

  const submit = () => {
    if (!form.category.trim()) return setErr('Category is required.');
    if (!form.amount || Number(form.amount) <= 0) return setErr('Amount must be greater than 0.');
    if (!form.date) return setErr('Date is required.');
    onAdd({ ...form, category: form.category.trim(), amount: Number(form.amount) });
    setForm({ type: 'income', category: '', amount: '', date: todayStr(), description: '', fund_type: 'unrestricted' });
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
            <Col min={180}>
              <Field label="Fund type" hint="See Funds Split tab">
                <select style={inputStyle} value={form.fund_type} onChange={(e) => set('fund_type', e.target.value)}>
                  <option value="unrestricted">Unrestricted</option>
                  <option value="temporarily_restricted">Temporarily Restricted</option>
                  <option value="restricted">Restricted</option>
                </select>
              </Field>
            </Col>
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
                <th style={cellTh}>Fund</th>
                <th style={cellTh}>Description</th>
                <th style={{ ...cellTh, textAlign: 'right' }}>Amount</th>
                <th style={{ ...cellTh, textAlign: 'right' }}>Balance</th>
                <th style={cellTh}></th>
              </tr>
            </thead>
            <tbody>
              {withBalance.map((t) => {
                const fund = FUNDS[t.fund_type] || FUNDS.unrestricted;
                return (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={cellTd}>{fmtDate(t.date)}</td>
                    <td style={cellTd}><Badge color={t.type === 'income' ? GOOD : DANGER} bg={t.type === 'income' ? '#e8f5e9' : '#fdecea'}>{t.type}</Badge></td>
                    <td style={cellTd}>{t.category}</td>
                    <td style={cellTd}><Badge color={fund.color} bg={fund.bg}>{fund.label}</Badge></td>
                    <td style={{ ...cellTd, color: MUTE }}>{t.description || '—'}</td>
                    <td style={{ ...cellTd, textAlign: 'right', fontWeight: 700, color: t.type === 'income' ? GOOD : DANGER }}>{t.type === 'income' ? '+' : '−'}{fmtMoney(t.amount)}</td>
                    <td style={{ ...cellTd, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(t.balance)}</td>
                    <td style={cellTd}><RemoveBtn onClick={() => onRemove(t.id)} label="transaction" /></td>
                  </tr>
                );
              })}
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
// 6b. RESTRICTED vs UNRESTRICTED FUNDS
// ============================================================
function FundsTab({ transactions }) {
  const fundsData = useMemo(() => {
    const types = ['restricted', 'temporarily_restricted', 'unrestricted'];
    const out = {};
    types.forEach((ft) => {
      const txns = transactions.filter((t) => (t.fund_type || 'unrestricted') === ft);
      const income = txns.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const expenses = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      out[ft] = { income, expenses, balance: income - expenses, count: txns.length };
    });
    return out;
  }, [transactions]);

  // Chronological running balance per fund
  const runByFund = useMemo(() => {
    const map = { restricted: [], temporarily_restricted: [], unrestricted: [] };
    const chrono = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
    const run = { restricted: 0, temporarily_restricted: 0, unrestricted: 0 };
    chrono.forEach((t) => {
      const ft = t.fund_type || 'unrestricted';
      run[ft] += (t.type === 'income' ? 1 : -1) * (Number(t.amount) || 0);
      map[ft].push({ ...t, balance: run[ft] });
    });
    // reverse for display (most recent first)
    Object.keys(map).forEach((k) => { map[k] = map[k].reverse(); });
    return map;
  }, [transactions]);

  const totalBalance = Object.values(fundsData).reduce((s, d) => s + d.balance, 0);
  const totalIncome = Object.values(fundsData).reduce((s, d) => s + d.income, 0);
  const totalExpenses = Object.values(fundsData).reduce((s, d) => s + d.expenses, 0);

  const [activeFund, setActiveFund] = useState('restricted');

  return (
    <div>
      <SectionHeader
        title="Restricted vs. Unrestricted Funds"
        subtitle="Income, expenses and running balance by fund type"
      />

      <Row>
        <StatCard label="Total Income" value={fmtMoney(totalIncome)} icon="📈" accent={GOOD} />
        <StatCard label="Total Expenses" value={fmtMoney(totalExpenses)} icon="📉" accent={DANGER} />
        <StatCard label="Total Balance" value={fmtMoney(totalBalance)} icon="⚖️" accent={NAVY} />
      </Row>

      <Row>
        {Object.keys(FUNDS).map((ft) => {
          const meta = FUNDS[ft];
          const data = fundsData[ft] || { income: 0, expenses: 0, balance: 0, count: 0 };
          const active = activeFund === ft;
          return (
            <div
              key={ft}
              onClick={() => setActiveFund(ft)}
              style={{
                flex: '1 1 280px',
                minWidth: 280,
                padding: 16,
                borderRadius: 10,
                background: SURFACE,
                border: `2px solid ${active ? meta.color : BORDER}`,
                cursor: 'pointer',
                boxShadow: active ? `0 2px 12px rgba(0,0,0,0.08)` : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
                <span style={{ fontSize: 11, color: MUTE }}>{data.count} txns</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: data.balance >= 0 ? meta.color : DANGER }}>{fmtMoney(data.balance)}</div>
              <div style={{ fontSize: 12, color: MUTE, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>Income: <strong style={{ color: GOOD }}>{fmtMoneyShort(data.income)}</strong></span>
                <span>Expenses: <strong style={{ color: DANGER }}>{fmtMoneyShort(data.expenses)}</strong></span>
              </div>
              <div style={{ marginTop: 8 }}>
                <ProgressBar
                  value={data.income > 0 ? (data.balance / data.income) * 100 : 0}
                  color={meta.color}
                  height={6}
                  label={data.income > 0 ? `${((data.balance / data.income) * 100).toFixed(0)}% of income retained` : 'no income yet'}
                />
              </div>
            </div>
          );
        })}
      </Row>

      <Card padding={16}>
        <SectionHeader title={`${FUNDS[activeFund].label} — Transaction History`} subtitle="Running balance for selected fund" />
        {runByFund[activeFund].length === 0 ? (
          <EmptyState icon="⚖️" message={`No ${FUNDS[activeFund].label.toLowerCase()} transactions yet. Tag transactions with this fund type in the Finance tab.`} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: FUNDS[activeFund].bg, color: FUNDS[activeFund].color, textAlign: 'left' }}>
                  <th style={cellTh}>Date</th>
                  <th style={cellTh}>Type</th>
                  <th style={cellTh}>Category</th>
                  <th style={cellTh}>Description</th>
                  <th style={{ ...cellTh, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...cellTh, textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {runByFund[activeFund].map((t) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={cellTd}>{fmtDate(t.date)}</td>
                    <td style={cellTd}><Badge color={t.type === 'income' ? GOOD : DANGER} bg={t.type === 'income' ? '#e8f5e9' : '#fdecea'}>{t.type}</Badge></td>
                    <td style={cellTd}>{t.category}</td>
                    <td style={{ ...cellTd, color: MUTE }}>{t.description || '—'}</td>
                    <td style={{ ...cellTd, textAlign: 'right', fontWeight: 700, color: t.type === 'income' ? GOOD : DANGER }}>{t.type === 'income' ? '+' : '−'}{fmtMoney(t.amount)}</td>
                    <td style={{ ...cellTd, textAlign: 'right', fontWeight: 700, color: NAVY }}>{fmtMoney(t.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

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
      skills: parseListKeepCase(form.skills),
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
          <Field label="Skills" hint="Comma-separated, e.g. teaching, first aid, IT — used by Skill Matching tab">
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
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: NAVY, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
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
              <RemoveBtn onClick={() => onRemove(v.id)} label="volunteer" />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
const smallBtn = { width: 24, height: 24, borderRadius: 4, border: `1px solid ${TEAL_BORDER}`, background: TEAL_BG, color: TEAL_DARK, cursor: 'pointer', fontWeight: 700, fontSize: 13 };

// ============================================================
// 7b. VOLUNTEER SKILL MATCHING
// ============================================================
function SkillMatchTab({ volunteers, projects, onPatchProject }) {
  const [selectedProject, setSelectedProject] = useState('');

  const project = projects.find((p) => p.id === selectedProject);
  const requiredSkills = (project?.required_skills || []).map((s) => s.toLowerCase());
  const requiredSet = new Set(requiredSkills);

  // For each volunteer compute match score against selected project
  const matches = useMemo(() => {
    if (!project) return [];
    return volunteers.map((v) => {
      const vSkills = (v.skills || []).map((s) => s.toLowerCase());
      const matched = vSkills.filter((s) => requiredSet.has(s));
      const missing = requiredSkills.filter((s) => !vSkills.includes(s));
      const extra = vSkills.filter((s) => !requiredSet.has(s));
      const score = requiredSkills.length === 0 ? 0 : (matched.length / requiredSkills.length) * 100;
      return { volunteer: v, matched, missing, extra, score };
    }).sort((a, b) => b.score - a.score || (b.matched.length - a.matched.length));
  }, [volunteers, project, selectedProject]); // eslint-disable-line react-hooks/exhaustive-deps

  const addRequiredSkill = (skill) => {
    if (!project || !skill.trim()) return;
    const current = project.required_skills || [];
    const next = [...new Set([...current, skill.trim()])];
    onPatchProject(project.id, { required_skills: next });
  };
  const removeRequiredSkill = (skill) => {
    if (!project) return;
    const next = (project.required_skills || []).filter((s) => s.toLowerCase() !== skill.toLowerCase());
    onPatchProject(project.id, { required_skills: next });
  };

  const [skillInput, setSkillInput] = useState('');

  return (
    <div>
      <SectionHeader
        title="Volunteer Skill Matching"
        subtitle="Match volunteer skills against project skill requirements"
      />

      {projects.length === 0 ? (
        <EmptyState icon="🧩" message="Add projects with required skills (in Projects tab) to enable matching." />
      ) : volunteers.length === 0 ? (
        <EmptyState icon="🧩" message="Add volunteers with skills to see matches." />
      ) : (
        <>
          <Card padding={12} style={{ marginBottom: 12 }}>
            <Field label="Select Project">
              <select style={inputStyle} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="">— Select a project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({(p.required_skills || []).length} skill(s) required)</option>
                ))}
              </select>
            </Field>
          </Card>

          {!project ? (
            <EmptyState icon="👆" message="Pick a project above to see matching volunteers." />
          ) : (
            <>
              <Card padding={16} style={{ marginBottom: 12 }}>
                <SectionHeader title="Required Skills" subtitle={`Skills needed for "${project.name}"`} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {(project.required_skills || []).length === 0 ? (
                    <span style={{ color: MUTE, fontSize: 13 }}>No required skills defined yet. Add some below.</span>
                  ) : (
                    (project.required_skills || []).map((s) => (
                      <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: TEAL_BG, color: TEAL_DARK, borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                        {s}
                        <button onClick={() => removeRequiredSkill(s)} style={{ background: 'none', border: 0, color: DANGER, cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: 14 }}>×</button>
                      </span>
                    ))
                  )}
                </div>
                <Row>
                  <Col flex={3} min={200}>
                    <Field label="Add skill">
                      <input
                        style={inputStyle}
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRequiredSkill(skillInput); setSkillInput(''); } }}
                        placeholder="e.g. teaching, first aid, IT"
                      />
                    </Field>
                  </Col>
                  <Col min={120} style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <PrimaryButton onClick={() => { addRequiredSkill(skillInput); setSkillInput(''); }}>+ Add</PrimaryButton>
                  </Col>
                </Row>
              </Card>

              <Card padding={16}>
                <SectionHeader title="Matching Volunteers" subtitle={`${matches.length} volunteer(s) ranked by skill overlap`} />
                {matches.length === 0 ? (
                  <p style={{ color: MUTE, fontSize: 13, margin: 0 }}>No volunteers registered.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {matches.map(({ volunteer: v, matched, missing, extra, score }) => {
                      const color = score >= 75 ? GOOD : score >= 50 ? WARN : score > 0 ? '#fb8c00' : MUTE;
                      return (
                        <div key={v.id} style={{ padding: 14, borderRadius: 8, border: `1px solid ${BORDER}`, background: score >= 75 ? '#f1f8e9' : SURFACE }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: NAVY, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                {v.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: INK }}>{v.name}</div>
                                <div style={{ fontSize: 11, color: MUTE }}>Available: {v.availability || '—'}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 11, color: MUTE, textTransform: 'uppercase', fontWeight: 700 }}>Match</div>
                              <div style={{ fontSize: 22, fontWeight: 800, color }}>{score.toFixed(0)}%</div>
                            </div>
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <ProgressBar value={score} color={color} height={8} />
                          </div>
                          <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                            {matched.length > 0 && (
                              <div>
                                <div style={{ color: GOOD, fontWeight: 700, marginBottom: 4 }}>✓ Matched ({matched.length})</div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {matched.map((s) => <Badge key={s} color={GOOD} bg="#e8f5e9">{s}</Badge>)}
                                </div>
                              </div>
                            )}
                            {missing.length > 0 && (
                              <div>
                                <div style={{ color: DANGER, fontWeight: 700, marginBottom: 4 }}>✗ Missing ({missing.length})</div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {missing.map((s) => <Badge key={s} color={DANGER} bg="#fdecea">{s}</Badge>)}
                                </div>
                              </div>
                            )}
                            {extra.length > 0 && (
                              <div>
                                <div style={{ color: MUTE, fontWeight: 700, marginBottom: 4 }}>+ Extra skills</div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {extra.map((s) => <Badge key={s} color={MUTE} bg="#f0f0f0">{s}</Badge>)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

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
                <RemoveBtn onClick={() => onRemove(ev.id)} label="event" />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ============================================================
// 9. MEMBERSHIP CARDS (PDF)
// ============================================================
function MembershipCardsTab({ members, renewals, orgSettings, onPatchSettings }) {
  const [memberId, setMemberId] = useState('');
  const [expiryDate, setExpiryDate] = useState(addYears(todayStr(), 1));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [err, setErr] = useState('');

  const member = members.find((m) => m.id === memberId || m.membership_id === memberId);

  // When a member is selected, auto-pick the latest renewal's due_date as default expiry
  useEffect(() => {
    if (!member) return;
    const latest = renewals
      .filter((r) => r.member_id === member.membership_id || r.member_id === member.id)
      .sort((a, b) => new Date(b.due_date) - new Date(a.due_date))[0];
    if (latest && latest.due_date) setExpiryDate(latest.due_date);
  }, [memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const generatePdf = () => {
    if (!member) return setErr('Pick a member first.');
    try {
      generateMembershipCardPdf(member, expiryDate, orgSettings);
    } catch (e) {
      setErr('PDF generation failed: ' + (e?.message || e));
    }
  };

  const printCard = () => {
    if (!member) return setErr('Pick a member first.');
    const s = orgSettings || DEFAULT_ORG_SETTINGS;
    const w = window.open('', '_blank', 'width=520,height=360');
    if (!w) return;
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Membership Card — ${member.name}</title>
      <style>
        @page { size: 85.6mm 53.98mm; margin: 0; }
        body { margin: 0; font-family: -apple-system, 'Segoe UI', sans-serif; }
        .card { width: 85.6mm; height: 53.98mm; background: linear-gradient(135deg, #071b2f 0%, #0d2a44 100%); color: white; position: relative; border-radius: 4mm; overflow: hidden; box-sizing: border-box; padding: 4mm; }
        .stripe { position: absolute; left: 0; right: 0; height: 2mm; background: #00796b; }
        .top { top: 0; } .bottom { bottom: 0; }
        .logo { width: 10mm; height: 10mm; background: #00796b; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 10px; vertical-align: middle; margin-right: 3mm; }
        .org { display: inline-block; vertical-align: middle; }
        .org .name { font-size: 11px; font-weight: 800; }
        .org .tag { font-size: 7px; color: #b8c8d6; }
        .row1 { margin-top: 4mm; border-top: 0.3mm solid #00796b; padding-top: 3mm; }
        .label { font-size: 6px; color: #b8c8d6; text-transform: uppercase; letter-spacing: 1px; }
        .val { font-size: 12px; font-weight: 800; }
        .name { font-size: 14px; font-weight: 800; }
        .grid { display: flex; justify-content: space-between; margin-top: 4mm; }
        .footer { position: absolute; bottom: 4mm; left: 4mm; right: 4mm; font-size: 6px; color: #b8c8d6; }
        button { margin: 16px auto; display: block; padding: 10px 18px; background: #00796b; color: white; border: 0; border-radius: 6px; font-weight: 700; cursor: pointer; }
      </style></head><body>
      <div class="card">
        <div class="stripe top"></div>
        <div class="stripe bottom"></div>
        <div><span class="logo">${(s.short_name || 'ORG').slice(0, 4)}</span><span class="org"><div class="name">${s.name || ''}</div><div class="tag">${s.tagline || 'Membership Card'}</div></span></div>
        <div class="row1">
          <div class="label">Member</div>
          <div class="name">${member.name}</div>
        </div>
        <div class="grid">
          <div><div class="label">Membership ID</div><div class="val">${member.membership_id}</div></div>
          <div><div class="label">Valid Thru</div><div class="val">${fmtDate(expiryDate)}</div></div>
        </div>
        <div class="footer">Issued: ${fmtDate(todayStr())} • ${s.address || ''}</div>
      </div>
      <button onclick="window.print()">Print Card</button>
      </body></html>`);
    w.document.close();
  };

  return (
    <div>
      <SectionHeader
        title="Membership Cards"
        subtitle="Generate printable PDF membership cards (credit-card size)"
        action={<GhostButton onClick={() => setSettingsOpen(!settingsOpen)}>⚙ Org Settings</GhostButton>}
      />

      {settingsOpen && (
        <Card padding={20} style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', color: NAVY, fontSize: 14 }}>Organization Card Settings</h3>
          <Row>
            <Col min={220}><Field label="Organization Name"><input style={inputStyle} value={orgSettings.name} onChange={(e) => onPatchSettings({ name: e.target.value })} /></Field></Col>
            <Col min={120}><Field label="Short Name (logo)"><input style={inputStyle} value={orgSettings.short_name} onChange={(e) => onPatchSettings({ short_name: e.target.value })} placeholder="SCT" maxLength={4} /></Field></Col>
          </Row>
          <Row>
            <Col min={220}><Field label="Address"><input style={inputStyle} value={orgSettings.address} onChange={(e) => onPatchSettings({ address: e.target.value })} /></Field></Col>
            <Col min={160}><Field label="Signatory"><input style={inputStyle} value={orgSettings.signatory} onChange={(e) => onPatchSettings({ signatory: e.target.value })} /></Field></Col>
          </Row>
          <Field label="Tagline"><input style={inputStyle} value={orgSettings.tagline} onChange={(e) => onPatchSettings({ tagline: e.target.value })} /></Field>
        </Card>
      )}

      {members.length === 0 ? (
        <EmptyState icon="💳" message="Add members first to generate membership cards." />
      ) : (
        <>
          <Card padding={20} style={{ marginBottom: 16 }}>
            {err && <div style={{ color: DANGER, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>⚠ {err}</div>}
            <Row>
              <Col flex={2} min={240}>
                <Field label="Member">
                  <select style={inputStyle} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                    <option value="">— Select member —</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name} (#{m.membership_id})</option>)}
                  </select>
                </Field>
              </Col>
              <Col min={180}>
                <Field label="Expiry Date" hint="Defaults to latest renewal due date or +1 year">
                  <input style={inputStyle} type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </Field>
              </Col>
            </Row>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <PrimaryButton onClick={generatePdf} disabled={!member}>📄 Generate PDF</PrimaryButton>
              <GhostButton onClick={printCard} disabled={!member}>🖨 Print HTML</GhostButton>
            </div>
          </Card>

          {/* Live preview */}
          {member && (
            <Card padding={24}>
              <div style={{ fontSize: 11, color: MUTE, marginBottom: 12, fontWeight: 700, textTransform: 'uppercase' }}>Live Preview</div>
              <div
                style={{
                  width: '100%',
                  maxWidth: 480,
                  aspectRatio: '1.586 / 1', // ISO 7810 ID-1
                  background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)`,
                  color: 'white',
                  borderRadius: 12,
                  padding: 20,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(7,27,47,0.25)',
                  margin: '0 auto',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: TEAL }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: TEAL }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: TEAL, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11 }}>
                    {(orgSettings.short_name || 'ORG').slice(0, 4)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{orgSettings.name}</div>
                    <div style={{ fontSize: 9, color: '#a8c4d6' }}>{orgSettings.tagline}</div>
                  </div>
                </div>
                <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${TEAL}` }}>
                  <div style={{ fontSize: 9, color: '#a8c4d6', textTransform: 'uppercase', letterSpacing: 1 }}>Member</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{member.name}</div>
                </div>
                <div style={{ position: 'absolute', bottom: 30, left: 20, right: 20, display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#a8c4d6', textTransform: 'uppercase', letterSpacing: 1 }}>Membership ID</div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{member.membership_id}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: '#a8c4d6', textTransform: 'uppercase', letterSpacing: 1 }}>Valid Thru</div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{fmtDate(expiryDate)}</div>
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: 14, left: 20, right: 20, fontSize: 8, color: '#a8c4d6' }}>
                  Issued: {fmtDate(todayStr())} • {orgSettings.address}
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// 10. REPORTS (annual)
// ============================================================
function ReportsTab({ state, totals }) {
  const [year, setYear] = useState(thisYear());
  const [generated, setGenerated] = useState(null);

  const generate = () => {
    const y = Number(year);
    const yrTxns = state.transactions.filter((t) => yearOf(t.date) === y);
    const yrDonations = state.donations.filter((d) => yearOf(d.date) === y);
    const income = yrTxns.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expenses = yrTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const donationIncome = yrDonations.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const membersAtYear = state.members.filter((m) => yearOf(m.join_date) <= y).length;
    const newMembers = state.members.filter((m) => yearOf(m.join_date) === y).length;
    const activeProjects = state.projects.filter((p) => p.status === 'active').length;
    const completedProjects = state.projects.filter((p) => p.status === 'completed' && (yearOf(p.end_date) === y || !p.end_date)).length;
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
    const indicatorAverages = state.indicators.length > 0
      ? state.indicators.map((i) => pctAchieved(i.baseline, i.target, i.actual)).reduce((s, v) => s + v, 0) / state.indicators.length
      : 0;
    const quarterReports = state.impact_quarters.filter((r) => r.year === y);

    setGenerated({
      year: y,
      generatedAt: new Date().toISOString(),
      membersAtYear, newMembers, totalMembers: totals.members,
      income, expenses, donationIncome, net: income - expenses + donationIncome,
      activeProjects, completedProjects, totalProjects: totals.totalProjects,
      totalBeneficiaries, totalBudget,
      donors: totals.donors, totalGiven: totals.totalGiven,
      volunteers: totals.volunteers, volunteerHours: totals.volunteerHours,
      events: events.length, totalAttendees,
      topDonors, topCategories,
      indicatorAverages,
      quarterReports,
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
              <h3 style={{ margin: '0 0 4px', color: NAVY }}>Annual Report — {generated.year}</h3>
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
            <ReportStat label="M&E Avg %" value={`${generated.indicatorAverages.toFixed(0)}%`} />
            <ReportStat label="Impact Reports" value={generated.quarterReports.length} />
          </div>

          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ padding: 14, background: '#e8f5e9', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: GOOD, fontWeight: 700, textTransform: 'uppercase' }}>Total Income</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: GOOD }}>{fmtMoney(generated.income)}</div>
            </div>
            <div style={{ padding: 14, background: '#e8f5e9', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: GOOD, fontWeight: 700, textTransform: 'uppercase' }}>Donation Income</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: GOOD }}>{fmtMoney(generated.donationIncome)}</div>
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

          {generated.quarterReports.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 8px', color: NAVY, fontSize: 14 }}>📈 Quarterly Impact Reports</h4>
              {generated.quarterReports.sort((a, b) => a.quarter.localeCompare(b.quarter)).map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                  <span><strong>{r.quarter}</strong> — {r.beneficiaries.toLocaleString()} beneficiaries, {r.outcomes.toLocaleString()} outcomes</span>
                  <span style={{ color: MUTE, fontSize: 11 }}>{fmtDate(r.savedAt ? r.savedAt.slice(0, 10) : null)}</span>
                </div>
              ))}
            </div>
          )}

          {generated.topDonors.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 8px', color: NAVY, fontSize: 14 }}>🏆 Top Donors</h4>
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
              <h4 style={{ margin: '0 0 8px', color: NAVY, fontSize: 14 }}>💼 Top Finance Categories</h4>
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
