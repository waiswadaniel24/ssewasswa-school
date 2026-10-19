// FileName: src/pages/features/IndividualPortal.jsx
// Ssewasswa Comforts — Individual / Personal Finance Portal (Expanded)
// Tabs: Dashboard, Budget, Budget vs Actual, Savings Goals, Expenses, Debts,
//       Net Worth, Calendar, Receipts, Investments.
// Features:
//   • Investment tracking w/ expanded types (Sacco Shares, Treasury Bond, Unit Trust,
//     Land, Vehicle, Bank FD, etc.) + CAGR annualized returns
//   • Debt snowball vs avalanche simulator + extra payment calculator
//   • Expense categorization pie chart (Food, Rent, Transport, Utilities, Health,
//     Education, Entertainment, Savings, Other)
//   • Savings goal progress (target vs current, % achieved, days remaining, daily/
//     weekly/monthly savings needed)
//   • Financial calendar — month grid view w/ colored dots for bill/salary/loan dates
//   • Net worth trend — line chart w/ monthly snapshots
//   • Receipt scanner — photo URL placeholder + log-as-expense (actually creates expense)
//   • Budget vs actual — planned vs actual per category, variance %, over/under badges
//
// Theme: dark navy #071b2f background, blue #0288d1 accent.
// All data persists to localStorage (erp_individual_* prefix).
// Audit fixes applied:
//   • useLS uses lazy initializer (no flash of default state, no effect)
//   • save(next) uses functional setState(prev => ...) — no stale closure
//   • localStorage.setItem wrapped in try/catch (Safari private mode safe)
//   • All delete buttons wrapped with window.confirm()
//   • All amount fields reject negative numbers (validation helper)
//   • fmtMoney(-x) shows "-UGX 100" instead of "USh -100"

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

// ─── Theme & Constants ───────────────────────────────────────────────────
const BG_NAVY = '#071b2f';        // page background
const BG_CARD = '#0d2a44';       // card background
const BG_CARD_2 = '#133556';    // hover / nested
const BG_INPUT = '#0a2236';     // form inputs
const ACCENT = '#0288d1';       // primary blue
const ACCENT_DARK = '#01579b';
const ACCENT_LIGHT = '#0a3d5c';
const DANGER = '#ef5350';
const DANGER_DARK = '#b71c1c';
const WARN = '#ffb74d';
const SUCCESS = '#26a69a';
const SUCCESS_DARK = '#00695c';
const TEXT = '#e3f2fd';
const TEXT_MUTED = '#90a4ae';
const BORDER = '#1a3a5c';

const KEYS = {
  income: 'erp_individual_income',
  budgetCats: 'erp_individual_budget_cats',
  recurringBills: 'erp_individual_recurring_bills',
  savings: 'erp_individual_savings',
  expenses: 'erp_individual_expenses',
  debts: 'erp_individual_debts',
  assets: 'erp_individual_assets',
  liabilities: 'erp_individual_liabilities',
  calendar: 'erp_individual_calendar',
  receipts: 'erp_individual_receipts',
  investments: 'erp_individual_investments',
  netWorthHistory: 'erp_individual_net_worth_history',
};

const EXPENSE_CATEGORIES = ['Food', 'Rent', 'Transport', 'Utilities', 'Health', 'Education', 'Entertainment', 'Savings', 'Debt Payment', 'Other'];
const ASSET_TYPES = ['Cash', 'Bank Account', 'Investment', 'Property', 'Vehicle', 'Equipment', 'Sacco Shares', 'Land', 'Other'];
const LIABILITY_TYPES = ['Loan', 'Credit Card', 'Mortgage', 'Tax Owed', 'Bills Payable', 'Sacco Loan', 'Other'];
const INVESTMENT_TYPES = [
  'Sacco Shares', 'Treasury Bond', 'Unit Trust', 'Land', 'Vehicle',
  'Bank FD', 'Stock', 'Bond', 'ETF', 'Mutual Fund', 'Crypto',
  'Real Estate', 'Pension', 'Other',
];
const EVENT_TYPES = [
  { value: 'bill', label: 'Bill Due', icon: '🧾', color: DANGER },
  { value: 'salary', label: 'Salary', icon: '💵', color: SUCCESS },
  { value: 'loan', label: 'Loan Payment', icon: '💳', color: WARN },
  { value: 'savings', label: 'Savings Deposit', icon: '🎯', color: ACCENT },
  { value: 'other', label: 'Other Reminder', icon: '🔔', color: TEXT_MUTED },
];

// Pie chart palette (for expense categorization)
const PIE_COLORS = ['#0288d1', '#26a69a', '#ffb74d', '#ef5350', '#9575cd', '#4fc3f7', '#f06292', '#7cb342', '#ff8a65', '#90a4ae'];

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'budgetVsActual', label: 'Budget vs Actual', icon: '⚖️' },
  { id: 'savings', label: 'Savings Goals', icon: '🎯' },
  { id: 'expenses', label: 'Expenses', icon: '🧾' },
  { id: 'debts', label: 'Debts', icon: '💳' },
  { id: 'networth', label: 'Net Worth', icon: '🏦' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'receipts', label: 'Receipts', icon: '📷' },
  { id: 'investments', label: 'Investments', icon: '📈' },
];

// ─── Helpers ────────────────────────────────────────────────────────────
// FIXED: handles negative correctly → "-UGX 100" instead of "USh -100"
const fmtMoney = (n) => {
  const num = Number(n || 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  return `${sign}UGX ${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};
const fmtPct = (n) => (Number(n || 0)).toFixed(1) + '%';
const uid = () => Date.now() + Math.floor(Math.random() * 1000);
const todayStr = () => new Date().toISOString().slice(0, 10);
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key) => {
  const [y, m] = (key || '').split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m) - 1] || '?'} ${y}`;
};

// Validation helpers (audit fix: reject negative numbers)
const isPosNum = (v) => {
  if (v === '' || v === null || v === undefined) return false;
  const n = Number(v);
  return !isNaN(n) && isFinite(n) && n > 0;
};
const isNonNegNum = (v) => {
  if (v === '' || v === null || v === undefined) return false;
  const n = Number(v);
  return !isNaN(n) && isFinite(n) && n >= 0;
};

const lastNMonths = (n) => {
  const arr = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = monthKey(d);
    arr.push({ key: k, label: k.slice(5) });
  }
  return arr;
};
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date(new Date().toDateString());
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};
// Years between two dates (for CAGR)
const yearsBetween = (fromStr, toStr = todayStr()) => {
  if (!fromStr) return 0;
  const from = new Date(fromStr + 'T00:00:00');
  const to = new Date(toStr + 'T00:00:00');
  if (isNaN(from) || isNaN(to)) return 0;
  return Math.max(0, (to - from) / (365.25 * 24 * 60 * 60 * 1000));
};
// Compound annual growth rate
const calcCAGR = (purchasePrice, currentValue, purchaseDate) => {
  const p = Number(purchasePrice);
  const c = Number(currentValue);
  if (!p || p <= 0 || c <= 0) return 0;
  const y = yearsBetween(purchaseDate);
  if (y < 0.01) return 0; // need at least ~4 days for a meaningful annualized figure
  return (Math.pow(c / p, 1 / y) - 1) * 100;
};

// ─── localStorage-backed state hook ─────────────────────────────────────
// AUDIT FIXES:
//   1. Lazy initializer (no flash of default state, no effect)
//   2. save() uses functional setState(prev => ...) — no stale closure
//   3. localStorage.setItem wrapped in try/catch (Safari private mode safe)
function useLS(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      return stored !== null && stored !== undefined ? stored : initial;
    } catch {
      return initial;
    }
  });
  const save = (next) => {
    setVal((prev) => {
      const v = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* Safari private mode / quota exceeded — silently ignore */
      }
      return v;
    });
  };
  return [val, save];
}

// ─── Confirm-before-delete wrapper ───────────────────────────────────────
// AUDIT FIX: All delete buttons now go through window.confirm()
const withConfirm = (fn, msg = 'Delete this item? This action cannot be undone.') => () => {
  if (window.confirm(msg)) fn();
};

// ─── Shared inline styles ────────────────────────────────────────────────
const inputStyle = { padding: 10, borderRadius: 6, border: `1px solid ${BORDER}`, background: BG_INPUT, color: TEXT, fontSize: 14, boxSizing: 'border-box', width: '100%' };
const selectStyle = { ...inputStyle, cursor: 'pointer' };
const primaryBtn = { padding: '10px 20px', background: ACCENT, color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const ghostBtn = { padding: '8px 14px', background: 'transparent', color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const dangerBtn = { background: 'none', border: 0, color: DANGER, cursor: 'pointer', fontSize: 18, padding: 4, fontWeight: 700 };
const cardStyle = { background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, marginBottom: 12, color: TEXT };
const labelStyle = { fontSize: 12, color: TEXT_MUTED, marginBottom: 4, fontWeight: 600, display: 'block' };
const formRow = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 };

const emptyState = (icon, msg) => (
  <div style={{ textAlign: 'center', padding: 48, color: TEXT_MUTED, background: BG_CARD_2, borderRadius: 8, border: `1px dashed ${BORDER}` }}>
    <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
    <p style={{ margin: 0 }}>{msg}</p>
  </div>
);

function Field({ label, children }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 140 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color = ACCENT }) {
  return (
    <div style={{ flex: '1 1 200px', minWidth: 200, padding: 16, borderRadius: 10, background: BG_CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginTop: 4, wordBreak: 'break-word' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, max, color = ACCENT, height = 8 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = value > max && max > 0;
  return (
    <div style={{ background: BG_CARD_2, borderRadius: 999, height, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
      <div style={{ width: `${pct}%`, height: '100%', background: over ? DANGER : color, borderRadius: 999, transition: 'width 0.3s' }} />
    </div>
  );
}

function BarChart({ data, height = 200, color = ACCENT }) {
  const max = Math.max(...(data || []).map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '12px 0', borderBottom: `1px solid ${BORDER}`, boxSizing: 'border-box' }}>
      {(data || []).map((d, i) => {
        const h = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', minWidth: 0 }}>
            <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 4, whiteSpace: 'nowrap' }}>{d.value > 0 ? (d.value / 1000).toFixed(0) + 'k' : ''}</div>
            <div title={fmtMoney(d.value)} style={{ width: '70%', height: `${h}%`, background: color, borderRadius: '4px 4px 0 0', minHeight: d.value > 0 ? 4 : 0, transition: 'height 0.3s' }} />
            <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 4 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// NEW: SVG donut pie chart for expense categorization
function PieChart({ data, size = 240 }) {
  const total = (data || []).reduce((s, d) => s + Number(d.value || 0), 0);
  if (total === 0) return null;
  const radius = size / 2;
  const cx = radius, cy = radius;
  const inner = radius * 0.58;
  let angle = -Math.PI / 2;
  const slices = (data || []).map((d, i) => {
    const frac = d.value / total;
    const sweep = frac * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const x3 = cx + inner * Math.cos(end);
    const y3 = cy + inner * Math.sin(end);
    const x4 = cx + inner * Math.cos(start);
    const y4 = cy + inner * Math.sin(start);
    const large = sweep > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
    return { ...d, path, frac, color: d.color || PIE_COLORS[i % PIE_COLORS.length] };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke={BG_CARD} strokeWidth={1}>
          <title>{s.name}: {fmtMoney(s.value)} ({fmtPct(s.frac * 100)})</title>
        </path>
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fill={TEXT_MUTED} fontSize={11} fontWeight={600}>TOTAL</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={TEXT} fontSize={13} fontWeight={700}>{fmtMoney(total)}</text>
    </svg>
  );
}

// NEW: SVG line chart for net worth trend
function LineChart({ data, height = 240, color = ACCENT }) {
  const w = 640;
  const h = height;
  const padding = { top: 20, right: 16, bottom: 30, left: 70 };
  const cw = w - padding.left - padding.right;
  const ch = h - padding.top - padding.bottom;
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const step = data.length > 1 ? cw / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: padding.left + i * step,
    y: padding.top + ch - ((d.value - min) / range) * ch,
    ...d,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const lastX = padding.left + (data.length - 1) * step;
  const areaD = `${pathD} L ${lastX} ${padding.top + ch} L ${padding.left} ${padding.top + ch} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => min + range * t);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="nwArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => {
        const y = padding.top + ch - ((t - min) / range) * ch;
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={padding.left + cw} y2={y} stroke={BORDER} strokeDasharray="2 3" />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" fill={TEXT_MUTED} fontSize={10}>{fmtMoney(t)}</text>
          </g>
        );
      })}
      {min < 0 && (
        <line x1={padding.left} y1={padding.top + ch - ((0 - min) / range) * ch} x2={padding.left + cw} y2={padding.top + ch - ((0 - min) / range) * ch} stroke={DANGER} strokeOpacity="0.5" strokeDasharray="3 3" />
      )}
      <path d={areaD} fill="url(#nwArea)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3.5} fill={color} stroke={BG_NAVY} strokeWidth={1}>
            <title>{p.label}: {fmtMoney(p.value)}</title>
          </circle>
          <text x={p.x} y={h - 8} textAnchor="middle" fill={TEXT_MUTED} fontSize={10}>{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// NEW: Month-grid view for financial calendar
function MonthGrid({ events, year, month, onPrev, onNext, onToday }) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const today = todayStr();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <button onClick={onPrev} style={ghostBtn}>← Prev</button>
        <h4 style={{ margin: 0, fontSize: 16, color: TEXT }}>{monthNames[month]} {year}</h4>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onToday} style={ghostBtn}>Today</button>
          <button onClick={onNext} style={ghostBtn}>Next →</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: TEXT_MUTED, fontWeight: 700, padding: '4px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} style={{ minHeight: 64, background: 'transparent' }} />;
          const ds = dateStr(d);
          const dayEvents = events.filter(e => e.date === ds);
          const isToday = ds === today;
          return (
            <div key={i} style={{
              minHeight: 64, padding: 4, borderRadius: 4,
              background: isToday ? ACCENT_LIGHT : BG_CARD_2,
              border: `1px solid ${isToday ? ACCENT : BORDER}`,
              fontSize: 11, boxSizing: 'border-box',
            }}>
              <div style={{ textAlign: 'right', color: isToday ? ACCENT : TEXT_MUTED, fontWeight: 700 }}>{d}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3, justifyContent: 'center' }}>
                {dayEvents.slice(0, 6).map(e => {
                  const evType = EVENT_TYPES.find(t => t.value === e.type) || EVENT_TYPES[EVENT_TYPES.length - 1];
                  return (
                    <span key={e.id} title={`${evType.label}: ${e.title}${e.amount > 0 ? ' — ' + fmtMoney(e.amount) : ''}`}
                      style={{ width: 8, height: 8, borderRadius: '50%', background: evType.color, display: 'inline-block', border: `1px solid ${BG_NAVY}` }} />
                  );
                })}
                {dayEvents.length > 6 && <span style={{ fontSize: 9, color: TEXT_MUTED }}>+{dayEvents.length - 6}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: TEXT_MUTED, flexWrap: 'wrap' }}>
        {EVENT_TYPES.map(t => (
          <span key={t.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: t.color }} />
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Reusable inline row components ──────────────────────────────────────
function CalendarRow({ c, toggleDone, remove, overdue }) {
  const evType = EVENT_TYPES.find(t => t.value === c.type) || EVENT_TYPES[EVENT_TYPES.length - 1];
  const days = daysUntil(c.date);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px dashed ${BORDER}`, fontSize: 13 }}>
      <input type="checkbox" checked={c.done} onChange={() => toggleDone(c.id)} style={{ transform: 'scale(1.2)', cursor: 'pointer', accentColor: ACCENT }} />
      <span style={{ fontSize: 16 }}>{evType.icon}</span>
      <div style={{ flex: 1, textDecoration: c.done ? 'line-through' : 'none', color: c.done ? TEXT_MUTED : TEXT }}>
        <div>{c.title}</div>
        <div style={{ fontSize: 11, color: TEXT_MUTED }}>{c.date} {c.amount > 0 && `• ${fmtMoney(c.amount)}`}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: overdue ? DANGER : days === 0 ? WARN : TEXT_MUTED, whiteSpace: 'nowrap' }}>
        {c.done ? 'done' : overdue ? 'overdue' : days === 0 ? 'today' : days > 0 ? `${days}d` : `${Math.abs(days)}d ago`}
      </span>
      <button onClick={withConfirm(remove, `Delete calendar event "${c.title}"?`)} style={dangerBtn} title="Delete event">×</button>
    </div>
  );
}

function AddFundsRow({ onAdd, label = 'Add Funds' }) {
  const [amount, setAmount] = useState('');
  const submit = () => {
    const n = Number(amount);
    if (!isPosNum(amount)) { alert('Enter a positive amount.'); return; }
    onAdd(n);
    setAmount('');
  };
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      <input type="number" min="0" step="any" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Amount (UGX)" style={{ ...inputStyle, padding: '6px 8px', fontSize: 13, flex: 1 }} />
      <button onClick={submit} style={{ ...primaryBtn, padding: '6px 12px', fontSize: 12 }}>{label}</button>
    </div>
  );
}

function UpdateValueRow({ onAdd, label }) {
  const [value, setValue] = useState('');
  const submit = () => {
    const n = Number(value);
    if (!isNonNegNum(value) || n < 0) { alert('Enter a valid non-negative value.'); return; }
    onAdd(n);
    setValue('');
  };
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      <input type="number" min="0" step="any" value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="New value (UGX)" style={{ ...inputStyle, padding: '6px 8px', fontSize: 13, flex: 1 }} />
      <button onClick={submit} style={{ ...ghostBtn, padding: '6px 12px', fontSize: 12 }}>{label}</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Dashboard Tab ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function DashboardTab({ state }) {
  const { income, expenses, calendar, recurringBills, totals } = state;
  const {
    balance, totalSpentThisMonth, totalSavingsCurrent, totalSavingsTarget,
    totalDebtBalance, totalDebtPrincipal, totalAssets, totalLiabilities, netWorth,
    totalInvested, totalInvestValue, investmentReturn,
  } = totals;

  const trendData = lastNMonths(6).map(m => ({
    label: m.label,
    value: expenses.filter(e => (e.date || '').slice(0, 7) === m.key).reduce((s, e) => s + Number(e.amount || 0), 0),
  }));
  const avgMonthly = trendData.reduce((s, d) => s + d.value, 0) / 6;

  const today = new Date();
  const dom = today.getDate();
  const upcomingBills = recurringBills
    .map(b => {
      const offset = Number(b.due_day) < dom ? 1 : 0;
      const d = new Date(today.getFullYear(), today.getMonth() + offset, Number(b.due_day));
      const days = Math.ceil((d - new Date(new Date().toDateString())) / (1000 * 60 * 60 * 24));
      return { ...b, nextDate: d.toISOString().slice(0, 10), days };
    })
    .filter(b => b.days <= 7)
    .sort((a, b) => a.days - b.days);

  const upcoming = [...calendar]
    .map(c => ({ ...c, days: daysUntil(c.date) }))
    .filter(c => c.days !== null && c.days >= -3 && c.days <= 30 && !c.done)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  const savingsProgress = totalSavingsTarget > 0 ? (totalSavingsCurrent / totalSavingsTarget) * 100 : 0;
  const debtProgress = totalDebtPrincipal > 0 ? ((totalDebtPrincipal - totalDebtBalance) / totalDebtPrincipal) * 100 : 0;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <StatCard icon="💵" label="Balance This Month" value={fmtMoney(balance)} sub={`Income ${fmtMoney(income)} • Spent ${fmtMoney(totalSpentThisMonth)}`} color={balance >= 0 ? ACCENT : DANGER} />
        <StatCard icon="🏦" label="Net Worth" value={fmtMoney(netWorth)} sub={`Assets ${fmtMoney(totalAssets)} − Liab. ${fmtMoney(totalLiabilities)}`} color={netWorth >= 0 ? SUCCESS : DANGER} />
        <StatCard icon="🎯" label="Total Savings" value={fmtMoney(totalSavingsCurrent)} sub={`Goal ${fmtMoney(totalSavingsTarget)} (${fmtPct(savingsProgress)})`} color={WARN} />
        <StatCard icon="💳" label="Debts Remaining" value={fmtMoney(totalDebtBalance)} sub={`Paid ${fmtPct(debtProgress)} of ${fmtMoney(totalDebtPrincipal)}`} color={DANGER} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ flex: '2 1 400px', minWidth: 320, ...cardStyle }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, color: TEXT }}>📈 Last 6 Months Spending</h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: TEXT_MUTED }}>Average: {fmtMoney(avgMonthly)} / month</p>
          <BarChart data={trendData} color={ACCENT} />
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 280, ...cardStyle }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: TEXT }}>⏰ Upcoming (next 30 days)</h3>
          {upcoming.length === 0 && upcomingBills.length === 0 ? (
            <p style={{ color: TEXT_MUTED, fontSize: 13 }}>No upcoming events. Add some in the Calendar tab.</p>
          ) : (
            <div>
              {upcomingBills.map(b => (
                <div key={`b${b.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${BORDER}`, fontSize: 13 }}>
                  <span>🔁 {b.name}</span>
                  <span style={{ color: b.days <= 2 ? DANGER : TEXT_MUTED, fontWeight: 600 }}>{fmtMoney(b.amount)} • {b.days <= 0 ? 'today' : `${b.days}d`}</span>
                </div>
              ))}
              {upcoming.map(c => {
                const evType = EVENT_TYPES.find(t => t.value === c.type) || EVENT_TYPES[EVENT_TYPES.length - 1];
                return (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${BORDER}`, fontSize: 13 }}>
                    <span>{evType.icon} {c.title}</span>
                    <span style={{ color: c.days < 0 ? DANGER : TEXT_MUTED, fontWeight: 600 }}>{c.days < 0 ? 'overdue' : c.days === 0 ? 'today' : `${c.days}d`}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: '1 1 280px', minWidth: 280, ...cardStyle }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: ACCENT }}>🎯 Savings Progress</h3>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{fmtPct(savingsProgress)}</div>
          <ProgressBar value={totalSavingsCurrent} max={totalSavingsTarget} color={WARN} height={10} />
          <p style={{ margin: '8px 0 0', fontSize: 12, color: TEXT_MUTED }}>{fmtMoney(totalSavingsCurrent)} of {fmtMoney(totalSavingsTarget)}</p>
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 280, ...cardStyle }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: ACCENT }}>💳 Debt Payoff Progress</h3>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{fmtPct(debtProgress)}</div>
          <ProgressBar value={totalDebtPrincipal - totalDebtBalance} max={totalDebtPrincipal} color={SUCCESS} height={10} />
          <p style={{ margin: '8px 0 0', fontSize: 12, color: TEXT_MUTED }}>{fmtMoney(totalDebtPrincipal - totalDebtBalance)} paid of {fmtMoney(totalDebtPrincipal)}</p>
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 280, ...cardStyle }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: ACCENT }}>📈 Investment Returns</h3>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: investmentReturn >= 0 ? SUCCESS : DANGER }}>{investmentReturn >= 0 ? '+' : ''}{fmtPct(investmentReturn)}</div>
          <p style={{ margin: 0, fontSize: 12, color: TEXT_MUTED }}>Current: {fmtMoney(totalInvestValue)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: TEXT_MUTED }}>Invested: {fmtMoney(totalInvested)} • Gain: {fmtMoney(totalInvestValue - totalInvested)}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Budget Tab ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function BudgetTab({ state }) {
  const { income, setIncome, budgetCats, setBudgetCats, recurringBills, setRecurringBills, setExpenses, expenses, totals } = state;
  const { totalSpentThisMonth } = totals;

  const [showCatForm, setShowCatForm] = useState(false);
  const [showBillForm, setShowBillForm] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', limit: '' });
  const [newBill, setNewBill] = useState({ name: '', amount: '', due_day: '1', category: 'Utilities' });

  const spentByCat = {};
  expenses.filter(e => (e.date || '').slice(0, 7) === monthKey()).forEach(e => { spentByCat[e.category] = (spentByCat[e.category] || 0) + Number(e.amount || 0); });
  const totalBudget = budgetCats.reduce((s, c) => s + Number(c.limit || 0), 0);
  const overBudgetCats = budgetCats.filter(c => (spentByCat[c.name] || 0) > c.limit);
  const billsTotal = recurringBills.reduce((s, b) => s + Number(b.amount || 0), 0);

  const addCat = () => {
    if (!newCat.name.trim() || !isPosNum(newCat.limit)) { alert('Enter a category name and a positive monthly limit.'); return; }
    setBudgetCats([{ id: uid(), name: newCat.name.trim(), limit: Number(newCat.limit) }, ...budgetCats]);
    setNewCat({ name: '', limit: '' }); setShowCatForm(false);
  };
  const addBill = () => {
    if (!newBill.name.trim() || !isPosNum(newBill.amount)) { alert('Enter a bill name and positive amount.'); return; }
    const day = Math.min(28, Math.max(1, Number(newBill.due_day) || 1));
    setRecurringBills([{ id: uid(), name: newBill.name.trim(), amount: Number(newBill.amount), due_day: day, category: newBill.category }, ...recurringBills]);
    setNewBill({ name: '', amount: '', due_day: '1', category: 'Utilities' }); setShowBillForm(false);
  };

  return (
    <div>
      <div style={{ ...cardStyle, background: ACCENT_LIGHT, borderColor: ACCENT }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, color: ACCENT }}>💵 Monthly Income</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="number" min="0" value={income || ''} onChange={e => setIncome(Math.max(0, Number(e.target.value) || 0))} placeholder="e.g. 1500000" style={{ ...inputStyle, maxWidth: 300 }} />
          <span style={{ fontSize: 13, color: TEXT_MUTED }}>Set your monthly income to calculate remaining budget.</span>
        </div>
        <div style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 8 }}>
          Budgeted: <b style={{ color: TEXT }}>{fmtMoney(totalBudget)}</b> • Spent: <b style={{ color: TEXT }}>{fmtMoney(totalSpentThisMonth)}</b> • Remaining: <b style={{ color: income - totalSpentThisMonth >= 0 ? SUCCESS : DANGER }}>{fmtMoney(income - totalSpentThisMonth)}</b>
        </div>
      </div>

      {overBudgetCats.length > 0 && (
        <div style={{ ...cardStyle, background: 'rgba(239,83,80,0.12)', borderColor: DANGER }}>
          <h3 style={{ margin: 0, fontSize: 14, color: DANGER }}>⚠️ Over Budget Alerts</h3>
          <div style={{ marginTop: 6, fontSize: 13, color: TEXT }}>
            {overBudgetCats.map(c => (
              <div key={c.id}>{c.name}: spent {fmtMoney(spentByCat[c.name])} / limit {fmtMoney(c.limit)} (over by {fmtMoney(spentByCat[c.name] - c.limit)})</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: TEXT }}>📋 Category Budgets</h3>
        <button onClick={() => setShowCatForm(!showCatForm)} style={primaryBtn}>+ Add Category</button>
      </div>

      {showCatForm && (
        <div style={{ ...cardStyle, background: BG_CARD_2 }}>
          <div style={formRow}>
            <Field label="Category Name"><input type="text" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Food" style={inputStyle} /></Field>
            <Field label="Monthly Limit (UGX)"><input type="number" min="0" value={newCat.limit} onChange={e => setNewCat({ ...newCat, limit: e.target.value })} placeholder="e.g. 400000" style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addCat} style={primaryBtn}>Save Category</button>
            <button onClick={() => setShowCatForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {budgetCats.length === 0 ? emptyState('💰', 'No budget categories yet. Add categories like Food, Rent, Transport.') : (
        <div>
          {budgetCats.map(c => {
            const spent = spentByCat[c.name] || 0;
            const over = spent > c.limit;
            return (
              <div key={c.id} style={{ ...cardStyle, borderLeft: `4px solid ${over ? DANGER : ACCENT}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                  <strong style={{ fontSize: 14, color: TEXT }}>{c.name}</strong>
                  <div style={{ fontSize: 13, color: TEXT_MUTED }}>{fmtMoney(spent)} / {fmtMoney(c.limit)} {over && <span style={{ color: DANGER, fontWeight: 700 }}>• OVER!</span>}</div>
                </div>
                <ProgressBar value={spent} max={c.limit} color={ACCENT} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: TEXT_MUTED }}>
                  <span>{fmtPct(c.limit > 0 ? (spent / c.limit) * 100 : 0)} used</span>
                  <span>Remaining: {fmtMoney(Math.max(0, c.limit - spent))}</span>
                </div>
                <button onClick={withConfirm(() => setBudgetCats(budgetCats.filter(x => x.id !== c.id)), `Delete budget category "${c.name}"?`)} style={dangerBtn} title="Delete category">×</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 24, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: TEXT }}>🔁 Recurring Bills ({fmtMoney(billsTotal)} / month)</h3>
        <button onClick={() => setShowBillForm(!showBillForm)} style={primaryBtn}>+ Add Bill</button>
      </div>

      {showBillForm && (
        <div style={{ ...cardStyle, background: BG_CARD_2 }}>
          <div style={formRow}>
            <Field label="Bill Name"><input type="text" value={newBill.name} onChange={e => setNewBill({ ...newBill, name: e.target.value })} placeholder="e.g. Electricity" style={inputStyle} /></Field>
            <Field label="Amount (UGX)"><input type="number" min="0" value={newBill.amount} onChange={e => setNewBill({ ...newBill, amount: e.target.value })} style={inputStyle} /></Field>
            <Field label="Due Day (1-28)"><input type="number" min="1" max="28" value={newBill.due_day} onChange={e => setNewBill({ ...newBill, due_day: e.target.value })} style={inputStyle} /></Field>
            <Field label="Category">
              <select value={newBill.category} onChange={e => setNewBill({ ...newBill, category: e.target.value })} style={selectStyle}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addBill} style={primaryBtn}>Save Bill</button>
            <button onClick={() => setShowBillForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {recurringBills.length === 0 ? emptyState('🔁', 'No recurring bills yet. Track rent, utilities, subscriptions.') : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {recurringBills.map(b => (
            <div key={b.id} style={{ ...cardStyle, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>Day {b.due_day} • {b.category}</div>
                </div>
                <button onClick={withConfirm(() => setRecurringBills(recurringBills.filter(x => x.id !== b.id)), `Delete bill "${b.name}"?`)} style={dangerBtn} title="Delete bill">×</button>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: ACCENT, marginTop: 6 }}>{fmtMoney(b.amount)}</div>
              <button onClick={() => {
                setExpenses([{ id: uid(), amount: b.amount, category: b.category, description: b.name, date: todayStr() }, ...expenses]);
                alert(`Logged "${b.name}" expense of ${fmtMoney(b.amount)} for today.`);
              }} style={{ ...ghostBtn, marginTop: 8, padding: '6px 10px', fontSize: 12 }}>Log this month&apos;s payment</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Budget vs Actual Tab (NEW) ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function BudgetVsActualTab({ state }) {
  const { income, budgetCats, expenses } = state;
  const mk = monthKey();
  const spentByCat = {};
  expenses.filter(e => (e.date || '').slice(0, 7) === mk).forEach(e => {
    spentByCat[e.category] = (spentByCat[e.category] || 0) + Number(e.amount || 0);
  });
  const totalBudget = budgetCats.reduce((s, c) => s + Number(c.limit || 0), 0);
  const totalSpent = Object.values(spentByCat).reduce((s, v) => s + v, 0);
  const variance = totalSpent - totalBudget;
  const variancePct = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;

  // Combine budgeted + actual categories (also catch unbudgeted spending)
  const allCats = new Set([...budgetCats.map(c => c.name), ...Object.keys(spentByCat)]);
  const rows = [...allCats].map(name => {
    const planned = budgetCats.find(c => c.name === name)?.limit || 0;
    const actual = spentByCat[name] || 0;
    const v = actual - planned;
    const vp = planned > 0 ? (v / planned) * 100 : (actual > 0 ? 100 : 0);
    let status = 'on';
    if (planned > 0 && actual > planned) status = 'over';
    else if (actual < planned) status = 'under';
    else if (planned === 0 && actual > 0) status = 'unbudgeted';
    return { name, planned, actual, variance: v, variancePct: vp, status };
  }).sort((a, b) => b.actual - a.actual);

  const overCount = rows.filter(r => r.status === 'over' || r.status === 'unbudgeted').length;
  const underCount = rows.filter(r => r.status === 'under').length;
  const onCount = rows.filter(r => r.status === 'on').length;

  const badgeStyle = (status) => ({
    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.5,
    background: status === 'over' || status === 'unbudgeted' ? 'rgba(239,83,80,0.18)' : status === 'under' ? 'rgba(38,166,154,0.18)' : 'rgba(2,136,209,0.18)',
    color: status === 'over' || status === 'unbudgeted' ? DANGER : status === 'under' ? SUCCESS : ACCENT,
  });

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <StatCard icon="📋" label="Total Budget" value={fmtMoney(totalBudget)} sub={`${budgetCats.length} categories`} color={ACCENT} />
        <StatCard icon="💸" label="Total Spent" value={fmtMoney(totalSpent)} sub={monthLabel(mk)} color={WARN} />
        <StatCard icon="⚖️" label="Variance" value={fmtMoney(variance)} sub={`${variance >= 0 ? '+' : ''}${fmtPct(variancePct)} vs budget`} color={variance >= 0 ? DANGER : SUCCESS} />
        <StatCard icon="📊" label="Income vs Spent" value={fmtMoney((income || 0) - totalSpent)} sub={`Income ${fmtMoney(income || 0)}`} color={(income || 0) - totalSpent >= 0 ? SUCCESS : DANGER} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <span style={badgeStyle('over')}>Over budget: {overCount}</span>
        <span style={badgeStyle('under')}>Under budget: {underCount}</span>
        <span style={badgeStyle('on')}>On target: {onCount}</span>
      </div>

      {rows.length === 0 ? emptyState('⚖️', 'No budget vs actual data yet. Add category budgets in the Budget tab and log expenses in the Expenses tab.') : (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: BG_CARD_2 }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: TEXT_MUTED, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Category</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: TEXT_MUTED, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Planned</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: TEXT_MUTED, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Actual</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: TEXT_MUTED, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Variance</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: TEXT_MUTED, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>%</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', color: TEXT_MUTED, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ padding: '10px 12px', color: TEXT, fontWeight: 600 }}>{r.name}</td>
                  <td style={{ padding: '10px 12px', color: TEXT_MUTED, textAlign: 'right' }}>{r.planned > 0 ? fmtMoney(r.planned) : '—'}</td>
                  <td style={{ padding: '10px 12px', color: TEXT, textAlign: 'right', fontWeight: 600 }}>{fmtMoney(r.actual)}</td>
                  <td style={{ padding: '10px 12px', color: r.variance > 0 ? DANGER : r.variance < 0 ? SUCCESS : TEXT_MUTED, textAlign: 'right' }}>
                    {r.variance > 0 ? '+' : ''}{fmtMoney(r.variance)}
                  </td>
                  <td style={{ padding: '10px 12px', color: r.variancePct > 0 ? DANGER : r.variancePct < 0 ? SUCCESS : TEXT_MUTED, textAlign: 'right', fontSize: 12 }}>
                    {r.planned > 0 ? (r.variancePct > 0 ? '+' : '') + fmtPct(r.variancePct) : (r.actual > 0 ? '∞' : '—')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={badgeStyle(r.status)}>
                      {r.status === 'over' ? 'Over' : r.status === 'under' ? 'Under' : r.status === 'unbudgeted' ? 'Unbudgeted' : 'On Target'}
                    </span>
                  </td>
                </tr>
              ))}
              <tr style={{ background: ACCENT_LIGHT, fontWeight: 700 }}>
                <td style={{ padding: '12px', color: ACCENT }}>TOTAL</td>
                <td style={{ padding: '12px', color: ACCENT, textAlign: 'right' }}>{fmtMoney(totalBudget)}</td>
                <td style={{ padding: '12px', color: ACCENT, textAlign: 'right' }}>{fmtMoney(totalSpent)}</td>
                <td style={{ padding: '12px', color: variance > 0 ? DANGER : variance < 0 ? SUCCESS : ACCENT, textAlign: 'right' }}>{variance > 0 ? '+' : ''}{fmtMoney(variance)}</td>
                <td style={{ padding: '12px', color: variance > 0 ? DANGER : variance < 0 ? SUCCESS : ACCENT, textAlign: 'right' }}>{variancePct > 0 ? '+' : ''}{fmtPct(variancePct)}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={badgeStyle(variance > 0 ? 'over' : variance < 0 ? 'under' : 'on')}>{variance > 0 ? 'Over' : variance < 0 ? 'Under' : 'On Target'}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Savings Goals Tab (Enhanced) ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function SavingsTab({ state }) {
  const { savings, setSavings, totals } = state;
  const { totalSavingsCurrent, totalSavingsTarget } = totals;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '0', deadline: '' });

  const add = () => {
    if (!form.name.trim() || !isPosNum(form.target_amount)) { alert('Enter a goal name and a positive target amount.'); return; }
    if (!isNonNegNum(form.current_amount)) { alert('Already-saved amount cannot be negative.'); return; }
    setSavings([{ id: uid(), name: form.name.trim(), target_amount: Number(form.target_amount), current_amount: Number(form.current_amount) || 0, deadline: form.deadline, created_at: todayStr() }, ...savings]);
    setForm({ name: '', target_amount: '', current_amount: '0', deadline: '' }); setShowForm(false);
  };
  const addFunds = (id, amount) => {
    if (!amount || amount <= 0) return;
    setSavings(savings.map(g => g.id === id ? { ...g, current_amount: Number(g.current_amount) + Number(amount) } : g));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: TEXT }}>🎯 Savings Goals</h3>
          <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED }}>Total saved: <b style={{ color: TEXT }}>{fmtMoney(totalSavingsCurrent)}</b> of <b style={{ color: TEXT }}>{fmtMoney(totalSavingsTarget)}</b></p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ New Goal</button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: BG_CARD_2 }}>
          <div style={formRow}>
            <Field label="Goal Name"><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Emergency Fund" style={inputStyle} /></Field>
            <Field label="Target Amount (UGX)"><input type="number" min="0" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} style={inputStyle} /></Field>
            <Field label="Already Saved (UGX)"><input type="number" min="0" value={form.current_amount} onChange={e => setForm({ ...form, current_amount: e.target.value })} style={inputStyle} /></Field>
            <Field label="Deadline"><input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={add} style={primaryBtn}>Save Goal</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {savings.length === 0 ? emptyState('🎯', 'No savings goals yet. Set your first target — emergency fund, vacation, gadget, etc.') : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {savings.map(g => {
            const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
            const remaining = Math.max(0, g.target_amount - g.current_amount);
            const dleft = daysUntil(g.deadline);
            const done = g.current_amount >= g.target_amount;
            // Savings-needed calculations
            const dailyNeeded = (dleft !== null && dleft > 0 && remaining > 0) ? remaining / dleft : 0;
            const weeklyNeeded = dailyNeeded > 0 ? dailyNeeded * 7 : 0;
            const monthlyNeeded = dailyNeeded > 0 ? dailyNeeded * 30.44 : 0;
            return (
              <div key={g.id} style={{ ...cardStyle, marginBottom: 0, borderLeft: `4px solid ${done ? SUCCESS : WARN}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>{done ? '✅ ' : ''}{g.name}</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                      {g.deadline ? `Due ${g.deadline}` : 'No deadline'}
                      {dleft !== null && !done && <span style={{ color: dleft < 0 ? DANGER : TEXT_MUTED, marginLeft: 6 }}>({dleft < 0 ? 'overdue' : `${dleft}d left`})</span>}
                    </div>
                  </div>
                  <button onClick={withConfirm(() => setSavings(savings.filter(x => x.id !== g.id)), `Delete savings goal "${g.name}"?`)} style={dangerBtn} title="Delete goal">×</button>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: ACCENT, marginTop: 8 }}>{fmtMoney(g.current_amount)}</div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 6 }}>of {fmtMoney(g.target_amount)} • {fmtPct(pct)}</div>
                <ProgressBar value={g.current_amount} max={g.target_amount} color={WARN} height={10} />
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6, marginBottom: 8 }}>{fmtMoney(remaining)} remaining</div>
                {/* NEW: savings-needed breakdown */}
                {!done && remaining > 0 && dleft !== null && dleft > 0 && (
                  <div style={{ background: BG_CARD_2, borderRadius: 6, padding: 8, marginBottom: 8, fontSize: 11, color: TEXT_MUTED }}>
                    <div style={{ fontWeight: 700, color: ACCENT, marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>To stay on track you need:</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Daily:</span><span style={{ color: TEXT, fontWeight: 600 }}>{fmtMoney(dailyNeeded)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Weekly:</span><span style={{ color: TEXT, fontWeight: 600 }}>{fmtMoney(weeklyNeeded)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Monthly:</span><span style={{ color: TEXT, fontWeight: 600 }}>{fmtMoney(monthlyNeeded)}</span></div>
                  </div>
                )}
                {!done && remaining > 0 && (dleft === null || dleft <= 0) && (
                  <div style={{ background: 'rgba(239,83,80,0.12)', borderRadius: 6, padding: 8, marginBottom: 8, fontSize: 11, color: DANGER }}>
                    ⚠️ {dleft === null ? 'Set a deadline to calculate required savings rate.' : 'Deadline passed — increase contributions to catch up.'}
                  </div>
                )}
                <AddFundsRow onAdd={(amt) => addFunds(g.id, amt)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Expenses Tab (Enhanced with Pie Chart) ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function ExpensesTab({ state }) {
  const { expenses, setExpenses, totals } = state;
  const { totalSpentThisMonth } = totals;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', category: 'Food', description: '', date: todayStr() });
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterCat, setFilterCat] = useState('all');

  const add = () => {
    if (!isPosNum(form.amount)) { alert('Enter a positive amount.'); return; }
    setExpenses([{ id: uid(), amount: Number(form.amount), category: form.category, description: form.description.trim(), date: form.date || todayStr() }, ...expenses]);
    setForm({ amount: '', category: 'Food', description: '', date: todayStr() }); setShowForm(false);
  };

  const months = [...new Set(expenses.map(e => (e.date || '').slice(0, 7)))].sort().reverse();
  let filtered = expenses;
  if (filterMonth !== 'all') filtered = filtered.filter(e => (e.date || '').slice(0, 7) === filterMonth);
  if (filterCat !== 'all') filtered = filtered.filter(e => e.category === filterCat);
  const filteredTotal = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  const trendData = lastNMonths(6).map(m => ({
    label: m.label,
    value: expenses.filter(e => (e.date || '').slice(0, 7) === m.key).reduce((s, e) => s + Number(e.amount || 0), 0),
  }));

  const byCat = {};
  filtered.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount || 0); });
  const catData = Object.entries(byCat).map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] })).sort((a, b) => b.value - a.value);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: TEXT }}>🧾 Expense Tracking</h3>
          <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED }}>This month: <b style={{ color: TEXT }}>{fmtMoney(totalSpentThisMonth)}</b> • {expenses.length} total entries</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ Add Expense</button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: BG_CARD_2 }}>
          <div style={formRow}>
            <Field label="Amount (UGX)"><input type="number" min="0" step="any" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 15000" style={inputStyle} /></Field>
            <Field label="Category">
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={selectStyle}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Date"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} /></Field>
          </div>
          <Field label="Description (optional)">
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Lunch at cafe" style={inputStyle} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={add} style={primaryBtn}>Save Expense</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {expenses.length > 0 && (
        <div style={{ ...cardStyle }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, color: TEXT }}>📊 6-Month Spending Trend</h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: TEXT_MUTED }}>Monthly totals across all categories</p>
          <BarChart data={trendData} color={ACCENT} height={180} />
        </div>
      )}

      {/* NEW: Pie chart of expenses by category */}
      {catData.length > 0 && (
        <div style={{ ...cardStyle }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: TEXT }}>🥧 Expense Categorization ({fmtMoney(filteredTotal)} filtered)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <div style={{ flex: '0 0 auto' }}>
              <PieChart data={catData} size={240} />
            </div>
            <div style={{ flex: '1 1 240px', minWidth: 240 }}>
              {catData.map(c => {
                const pct = filteredTotal > 0 ? (c.value / filteredTotal) * 100 : 0;
                return (
                  <div key={c.name} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: TEXT_MUTED, marginBottom: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: c.color }} />
                        {c.name}
                      </span>
                      <span style={{ color: TEXT }}>{fmtMoney(c.value)} • {fmtPct(pct)}</span>
                    </div>
                    <ProgressBar value={c.value} max={filteredTotal} color={c.color} height={6} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {expenses.length > 0 && (
        <div style={{ ...cardStyle, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="Filter by Month">
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selectStyle}>
              <option value="all">All months</option>
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </Field>
          <Field label="Filter by Category">
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={selectStyle}>
              <option value="all">All categories</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <div style={{ fontSize: 13, color: TEXT_MUTED }}>Showing {filtered.length} • {fmtMoney(filteredTotal)}</div>
        </div>
      )}

      {expenses.length === 0 ? emptyState('🧾', 'No expenses tracked yet. Add your first expense to see trends.') : (
        <div>
          {filtered.map(e => (
            <div key={e.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{fmtMoney(e.amount)}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED }}>{e.date} {e.description && `• ${e.description}`}</div>
              </div>
              <span style={{ background: ACCENT_LIGHT, color: ACCENT, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase' }}>{e.category}</span>
              <button onClick={withConfirm(() => setExpenses(expenses.filter(x => x.id !== e.id)), `Delete expense of ${fmtMoney(e.amount)}?`)} style={dangerBtn} title="Delete expense">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Debts Tab (Enhanced with Snowball/Avalanche Simulator) ───────────
// ═══════════════════════════════════════════════════════════════════════
// Run a month-by-month payoff simulation
function simulatePayoff(debts, method, extraPayment = 0) {
  const active = debts.filter(d => Number(d.balance) > 0).map(d => ({
    id: d.id, lender: d.lender,
    balance: Number(d.balance),
    payment: Number(d.monthly_payment) || 0,
    apr: Number(d.interest_rate) || 0,
    payoffMonth: null,
    totalInterest: 0,
  }));
  if (method === 'snowball') active.sort((a, b) => a.balance - b.balance);
  else active.sort((a, b) => b.apr - a.apr); // avalanche
  const extra = Math.max(0, Number(extraPayment) || 0);
  let month = 0;
  while (active.some(d => d.balance > 0.01) && month < 600) {
    month++;
    // 1. Accrue monthly interest
    active.forEach(d => {
      if (d.balance > 0) {
        const interest = d.balance * (d.apr / 100 / 12);
        d.totalInterest += interest;
        d.balance += interest;
      }
    });
    // 2. Pay minimums
    active.forEach(d => {
      if (d.balance > 0) {
        const pay = Math.min(d.payment, d.balance);
        d.balance -= pay;
      }
    });
    // 3. Apply extra to first priority debt with balance > 0
    let remaining = extra;
    for (let i = 0; i < active.length && remaining > 0; i++) {
      const d = active[i];
      if (d.balance > 0) {
        const pay = Math.min(remaining, d.balance);
        d.balance -= pay;
        remaining -= pay;
      }
      if (d.balance <= 0.01 && d.payoffMonth === null) d.payoffMonth = month;
    }
    // 4. Mark any newly cleared
    active.forEach(d => {
      if (d.balance <= 0.01 && d.payoffMonth === null) d.payoffMonth = month;
      if (d.balance < 0) d.balance = 0;
    });
  }
  return {
    sortedOrder: active,
    totalMonths: month,
    totalInterest: active.reduce((s, d) => s + d.totalInterest, 0),
    totalPrincipal: active.reduce((s, d) => s + Number(d.balance), 0),
  };
}

function DebtsTab({ state }) {
  const { debts, setDebts, totals } = state;
  const { totalDebtBalance, totalDebtPrincipal } = totals;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ lender: '', principal: '', interest_rate: '', monthly_payment: '', balance: '', start_date: todayStr() });
  // Snowball simulator state
  const [method, setMethod] = useState('avalanche');
  const [extra, setExtra] = useState('');

  const add = () => {
    if (!form.lender.trim() || !isPosNum(form.principal)) { alert('Enter a lender name and positive principal.'); return; }
    if (!isNonNegNum(form.interest_rate) || !isNonNegNum(form.monthly_payment)) { alert('Interest rate and monthly payment must be non-negative.'); return; }
    const principal = Number(form.principal);
    const balance = form.balance !== '' ? (isNonNegNum(form.balance) ? Number(form.balance) : principal) : principal;
    const debt = {
      id: uid(), lender: form.lender.trim(), principal,
      interest_rate: Number(form.interest_rate) || 0,
      monthly_payment: Number(form.monthly_payment) || 0,
      balance, start_date: form.start_date || todayStr(),
      created_at: todayStr(),
    };
    setDebts([debt, ...debts]);
    setForm({ lender: '', principal: '', interest_rate: '', monthly_payment: '', balance: '', start_date: todayStr() }); setShowForm(false);
  };
  const makePayment = (id, amount) => {
    if (!amount || amount <= 0) return;
    setDebts(debts.map(d => d.id === id ? { ...d, balance: Math.max(0, Number(d.balance) - Number(amount)) } : d));
  };

  // Run both simulations for comparison
  const simExtra = Number(extra) || 0;
  const withExtra = useMemo(() => simulatePayoff(debts, method, simExtra), [debts, method, simExtra]);
  const withoutExtra = useMemo(() => simulatePayoff(debts, method, 0), [debts, method]);
  const monthsSaved = withoutExtra.totalMonths - withExtra.totalMonths;
  const interestSaved = withoutExtra.totalInterest - withExtra.totalInterest;
  const totalMonthly = debts.reduce((s, d) => s + Number(d.monthly_payment || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <StatCard icon="💳" label="Total Debt Balance" value={fmtMoney(totalDebtBalance)} sub={`Of ${fmtMoney(totalDebtPrincipal)} principal`} color={DANGER} />
        <StatCard icon="📅" label="Monthly Payments" value={fmtMoney(totalMonthly)} sub={`${debts.length} active loan${debts.length === 1 ? '' : 's'}`} color={ACCENT} />
        <StatCard icon="📊" label="Paid Off" value={fmtPct(totalDebtPrincipal > 0 ? ((totalDebtPrincipal - totalDebtBalance) / totalDebtPrincipal) * 100 : 0)} sub={`${fmtMoney(totalDebtPrincipal - totalDebtBalance)} repaid`} color={SUCCESS} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: TEXT }}>💳 Debt Tracking</h3>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ Add Loan</button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: BG_CARD_2 }}>
          <div style={formRow}>
            <Field label="Lender"><input type="text" value={form.lender} onChange={e => setForm({ ...form, lender: e.target.value })} placeholder="e.g. Stanbic Bank" style={inputStyle} /></Field>
            <Field label="Principal (UGX)"><input type="number" min="0" value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} style={inputStyle} /></Field>
            <Field label="Interest Rate (%)"><input type="number" step="0.1" min="0" value={form.interest_rate} onChange={e => setForm({ ...form, interest_rate: e.target.value })} placeholder="e.g. 12.5" style={inputStyle} /></Field>
            <Field label="Monthly Payment (UGX)"><input type="number" min="0" value={form.monthly_payment} onChange={e => setForm({ ...form, monthly_payment: e.target.value })} style={inputStyle} /></Field>
            <Field label="Current Balance (UGX)"><input type="number" min="0" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} placeholder={`Defaults to principal`} style={inputStyle} /></Field>
            <Field label="Start Date"><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={add} style={primaryBtn}>Save Loan</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {/* NEW: Snowball vs Avalanche simulator */}
      {debts.length > 0 && (
        <div style={{ ...cardStyle, background: ACCENT_LIGHT, borderColor: ACCENT }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: ACCENT }}>🧮 Debt Payoff Simulator</h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: TEXT_MUTED }}>
            Pick a payoff method and add an extra monthly payment to see how much faster you become debt-free.
          </p>
          <div style={formRow}>
            <Field label="Payoff Method">
              <select value={method} onChange={e => setMethod(e.target.value)} style={selectStyle}>
                <option value="avalanche">Avalanche — Highest interest first (saves money)</option>
                <option value="snowball">Snowball — Smallest balance first (builds momentum)</option>
              </select>
            </Field>
            <Field label="Extra Monthly Payment (UGX)"><input type="number" min="0" step="any" value={extra} onChange={e => setExtra(e.target.value)} placeholder="e.g. 50000" style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <StatCard icon="📅" label="With Extra Payment" value={`${withExtra.totalMonths} mo`} sub={`Total interest ${fmtMoney(withExtra.totalInterest)}`} color={SUCCESS} />
            <StatCard icon="📅" label="Without Extra Payment" value={`${withoutExtra.totalMonths} mo`} sub={`Total interest ${fmtMoney(withoutExtra.totalInterest)}`} color={WARN} />
            <StatCard icon="⏱️" label="Time Saved" value={`${monthsSaved > 0 ? monthsSaved : 0} mo`} sub={`${(monthsSaved / 12).toFixed(1)} years faster`} color={ACCENT} />
            <StatCard icon="💰" label="Interest Saved" value={fmtMoney(interestSaved > 0 ? interestSaved : 0)} sub={`By paying extra ${fmtMoney(simExtra)}/mo`} color={SUCCESS} />
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: TEXT }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: ACCENT }}>📋 Payoff Order ({method === 'snowball' ? 'Snowball — smallest balance first' : 'Avalanche — highest interest first'}):</div>
            {withExtra.sortedOrder.map((d, i) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px dashed ${BORDER}` }}>
                <span>{i + 1}. {d.lender} ({d.apr}% APR, min {fmtMoney(d.payment)}/mo)</span>
                <span style={{ color: TEXT_MUTED }}>
                  <b style={{ color: d.payoffMonth ? SUCCESS : DANGER }}>{d.payoffMonth ? `Paid in month ${d.payoffMonth}` : 'Not yet cleared'}</b>
                  <span style={{ marginLeft: 8 }}>• Interest: {fmtMoney(d.totalInterest)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {debts.length === 0 ? emptyState('💳', 'No debts tracked yet. Add loans, credit cards, mortgages to plan payoff.') : (
        <div>
          {debts.map(d => {
            const paid = Number(d.principal) - Number(d.balance);
            const pct = d.principal > 0 ? Math.min(100, (paid / d.principal) * 100) : 0;
            const monthsLeft = d.monthly_payment > 0 ? Math.ceil(d.balance / d.monthly_payment) : null;
            const cleared = Number(d.balance) <= 0;
            return (
              <div key={d.id} style={{ ...cardStyle, borderLeft: `4px solid ${cleared ? SUCCESS : DANGER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>{cleared ? '✅ ' : ''}{d.lender}</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>Principal {fmtMoney(d.principal)} • {d.interest_rate}% APR • {fmtMoney(d.monthly_payment)}/mo • Started {d.start_date}</div>
                  </div>
                  <button onClick={withConfirm(() => setDebts(debts.filter(x => x.id !== d.id)), `Delete loan "${d.lender}"?`)} style={dangerBtn} title="Delete loan">×</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8, marginBottom: 6, color: TEXT }}>
                  <span>Bal: <b style={{ color: DANGER }}>{fmtMoney(d.balance)}</b></span>
                  <span>Paid: <b style={{ color: SUCCESS }}>{fmtMoney(paid)}</b> ({fmtPct(pct)})</span>
                </div>
                <ProgressBar value={paid} max={d.principal} color={SUCCESS} height={8} />
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>
                  {cleared ? '🎉 Loan fully paid off!' : monthsLeft !== null ? `~${monthsLeft} months to payoff at current rate` : 'Set monthly payment to estimate payoff time'}
                </div>
                {!cleared && <AddFundsRow label="Make Payment" onAdd={(amt) => makePayment(d.id, amt)} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Net Worth Tab (Enhanced with Trend Chart) ─────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function NetWorthTab({ state }) {
  const { assets, setAssets, liabilities, setLiabilities, netWorthHistory, setNetWorthHistory, totals } = state;
  const { totalAssets, totalLiabilities, netWorth } = totals;

  const [showAsset, setShowAsset] = useState(false);
  const [showLiab, setShowLiab] = useState(false);
  const [assetForm, setAssetForm] = useState({ name: '', value: '', type: 'Cash' });
  const [liabForm, setLiabForm] = useState({ name: '', value: '', type: 'Loan' });

  const addAsset = () => {
    if (!assetForm.name.trim() || !isPosNum(assetForm.value)) { alert('Enter an asset name and positive value.'); return; }
    setAssets([{ id: uid(), name: assetForm.name.trim(), value: Number(assetForm.value), type: assetForm.type }, ...assets]);
    setAssetForm({ name: '', value: '', type: 'Cash' }); setShowAsset(false);
  };
  const addLiab = () => {
    if (!liabForm.name.trim() || !isPosNum(liabForm.value)) { alert('Enter a liability name and positive value.'); return; }
    setLiabilities([{ id: uid(), name: liabForm.name.trim(), value: Number(liabForm.value), type: liabForm.type }, ...liabilities]);
    setLiabForm({ name: '', value: '', type: 'Loan' }); setShowLiab(false);
  };

  // Auto-capture monthly snapshot (only when values change)
  useEffect(() => {
    const mk = monthKey();
    setNetWorthHistory(prev => {
      const idx = prev.findIndex(s => s.month === mk);
      const snapshot = { month: mk, assets: totalAssets, liabilities: totalLiabilities, netWorth, capturedAt: new Date().toISOString() };
      if (idx === -1) return [...prev, snapshot];
      const existing = prev[idx];
      if (existing.assets === totalAssets && existing.liabilities === totalLiabilities) return prev;
      const next = [...prev];
      next[idx] = snapshot;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAssets, totalLiabilities]);

  // Trend line chart data — last 12 months (or however many snapshots we have)
  const trendData = useMemo(() => {
    const last12 = lastNMonths(12);
    return last12.map(m => {
      const snap = netWorthHistory.find(s => s.month === m.key);
      return { label: m.label, value: snap ? snap.netWorth : 0 };
    }).filter(d => d.value !== 0 || netWorthHistory.length > 0);
  }, [netWorthHistory]);

  const clearHistory = () => {
    if (!window.confirm('Clear all net worth history snapshots? This cannot be undone.')) return;
    setNetWorthHistory([]);
  };

  return (
    <div>
      <div style={{ ...cardStyle, background: ACCENT_LIGHT, borderColor: ACCENT, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 600 }}>Net Worth</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: netWorth >= 0 ? SUCCESS : DANGER }}>{fmtMoney(netWorth)}</div>
          <div style={{ fontSize: 12, color: TEXT_MUTED }}>Assets {fmtMoney(totalAssets)} − Liabilities {fmtMoney(totalLiabilities)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 16px', background: BG_CARD, borderRadius: 6, border: `1px solid ${SUCCESS}` }}>
            <div style={{ fontSize: 10, color: SUCCESS, fontWeight: 600 }}>ASSETS</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{fmtMoney(totalAssets)}</div>
          </div>
          <div style={{ padding: '8px 16px', background: BG_CARD, borderRadius: 6, border: `1px solid ${DANGER}` }}>
            <div style={{ fontSize: 10, color: DANGER, fontWeight: 600 }}>LIABILITIES</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{fmtMoney(totalLiabilities)}</div>
          </div>
        </div>
      </div>

      {/* NEW: Net worth trend line chart */}
      {netWorthHistory.length > 0 && (
        <div style={{ ...cardStyle }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 14, color: TEXT }}>📈 Net Worth Trend</h3>
              <p style={{ margin: 0, fontSize: 12, color: TEXT_MUTED }}>{netWorthHistory.length} monthly snapshot{netWorthHistory.length === 1 ? '' : 's'} • auto-captured when assets/liabilities change</p>
            </div>
            <button onClick={clearHistory} style={{ ...ghostBtn, color: DANGER, borderColor: DANGER, fontSize: 11, padding: '4px 10px' }}>Clear history</button>
          </div>
          <LineChart data={trendData} height={240} color={ACCENT} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: SUCCESS }}>📈 Assets ({fmtMoney(totalAssets)})</h3>
            <button onClick={() => setShowAsset(!showAsset)} style={{ ...primaryBtn, background: SUCCESS }}>+ Add Asset</button>
          </div>
          {showAsset && (
            <div style={{ ...cardStyle, background: BG_CARD_2 }}>
              <div style={formRow}>
                <Field label="Asset Name"><input type="text" value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="e.g. Savings Account" style={inputStyle} /></Field>
                <Field label="Value (UGX)"><input type="number" min="0" value={assetForm.value} onChange={e => setAssetForm({ ...assetForm, value: e.target.value })} style={inputStyle} /></Field>
                <Field label="Type">
                  <select value={assetForm.type} onChange={e => setAssetForm({ ...assetForm, type: e.target.value })} style={selectStyle}>
                    {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addAsset} style={{ ...primaryBtn, background: SUCCESS }}>Save Asset</button>
                <button onClick={() => setShowAsset(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}
          {assets.length === 0 ? emptyState('📈', 'No assets yet. Add cash, bank accounts, property, vehicles.') : (
            <div>
              {assets.map(a => (
                <div key={a.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${SUCCESS}` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>{a.type}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, color: SUCCESS }}>{fmtMoney(a.value)}</span>
                    <button onClick={withConfirm(() => setAssets(assets.filter(x => x.id !== a.id)), `Delete asset "${a.name}"?`)} style={dangerBtn} title="Delete asset">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: DANGER }}>📉 Liabilities ({fmtMoney(totalLiabilities)})</h3>
            <button onClick={() => setShowLiab(!showLiab)} style={{ ...primaryBtn, background: DANGER }}>+ Add Liability</button>
          </div>
          {showLiab && (
            <div style={{ ...cardStyle, background: BG_CARD_2 }}>
              <div style={formRow}>
                <Field label="Liability Name"><input type="text" value={liabForm.name} onChange={e => setLiabForm({ ...liabForm, name: e.target.value })} placeholder="e.g. Car Loan" style={inputStyle} /></Field>
                <Field label="Value (UGX)"><input type="number" min="0" value={liabForm.value} onChange={e => setLiabForm({ ...liabForm, value: e.target.value })} style={inputStyle} /></Field>
                <Field label="Type">
                  <select value={liabForm.type} onChange={e => setLiabForm({ ...liabForm, type: e.target.value })} style={selectStyle}>
                    {LIABILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addLiab} style={{ ...primaryBtn, background: DANGER }}>Save Liability</button>
                <button onClick={() => setShowLiab(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}
          {liabilities.length === 0 ? emptyState('📉', 'No liabilities yet. Add loans, credit card debt, mortgages.') : (
            <div>
              {liabilities.map(l => (
                <div key={l.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${DANGER}` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>{l.type}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, color: DANGER }}>{fmtMoney(l.value)}</span>
                    <button onClick={withConfirm(() => setLiabilities(liabilities.filter(x => x.id !== l.id)), `Delete liability "${l.name}"?`)} style={dangerBtn} title="Delete liability">×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Calendar Tab (Enhanced with Month Grid) ──────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function CalendarTab({ state }) {
  const { calendar, setCalendar } = state;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'bill', date: todayStr(), amount: '' });
  // Month grid navigation
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const add = () => {
    if (!form.title.trim() || !form.date) { alert('Enter a title and date.'); return; }
    if (form.amount !== '' && !isNonNegNum(form.amount)) { alert('Amount cannot be negative.'); return; }
    setCalendar([{ id: uid(), title: form.title.trim(), type: form.type, date: form.date, amount: Number(form.amount) || 0, done: false }, ...calendar]);
    setForm({ title: '', type: 'bill', date: todayStr(), amount: '' }); setShowForm(false);
    // Jump grid to event month
    const [y, m] = form.date.split('-').map(Number);
    setViewYear(y); setViewMonth(m - 1);
  };
  const toggleDone = (id) => setCalendar(calendar.map(c => c.id === id ? { ...c, done: !c.done } : c));
  const remove = (id) => setCalendar(calendar.filter(c => c.id !== id));

  const upcoming = [...calendar].sort((a, b) => new Date(a.date) - new Date(b.date));
  const todayStrVal = todayStr();
  const overdue = upcoming.filter(c => c.date < todayStrVal && !c.done);
  const dueSoon = upcoming.filter(c => c.date >= todayStrVal && !c.done && daysUntil(c.date) <= 14);
  const doneItems = upcoming.filter(c => c.done);

  const prevMonth = () => {
    let m = viewMonth - 1, y = viewYear;
    if (m < 0) { m = 11; y--; }
    setViewMonth(m); setViewYear(y);
  };
  const nextMonth = () => {
    let m = viewMonth + 1, y = viewYear;
    if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  };
  const goToday = () => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: TEXT }}>📅 Financial Calendar</h3>
          <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED }}>Bill due dates, salary reminders, loan payments.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ Add Event</button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: BG_CARD_2 }}>
          <div style={formRow}>
            <Field label="Title"><input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Pay Electricity Bill" style={inputStyle} /></Field>
            <Field label="Type">
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={selectStyle}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Date"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} /></Field>
            <Field label="Amount (optional)"><input type="number" min="0" step="any" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={add} style={primaryBtn}>Save Event</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {/* NEW: Month grid view */}
      <div style={{ ...cardStyle }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: TEXT }}>📆 Month View</h3>
        <MonthGrid
          events={calendar}
          year={viewYear}
          month={viewMonth}
          onPrev={prevMonth}
          onNext={nextMonth}
          onToday={goToday}
        />
      </div>

      {overdue.length > 0 && (
        <div style={{ ...cardStyle, background: 'rgba(239,83,80,0.12)', borderColor: DANGER }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: DANGER }}>⚠️ Overdue ({overdue.length})</h3>
          {overdue.map(c => <CalendarRow key={c.id} c={c} toggleDone={toggleDone} remove={remove} overdue />)}
        </div>
      )}

      {dueSoon.length > 0 && (
        <div style={{ ...cardStyle }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: ACCENT }}>⏰ Due Soon (next 14 days)</h3>
          {dueSoon.map(c => <CalendarRow key={c.id} c={c} toggleDone={toggleDone} remove={remove} />)}
        </div>
      )}

      {doneItems.length > 0 && (
        <div style={{ ...cardStyle, background: 'rgba(38,166,154,0.10)' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: SUCCESS }}>✅ Done ({doneItems.length})</h3>
          {doneItems.slice(0, 10).map(c => <CalendarRow key={c.id} c={c} toggleDone={toggleDone} remove={remove} />)}
        </div>
      )}

      {calendar.length === 0 ? emptyState('📅', 'No calendar events yet. Add bill due dates, salary reminders, loan payment dates.') : (
        <div style={{ ...cardStyle }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: TEXT }}>📋 All Events ({calendar.length})</h3>
          {upcoming.map(c => <CalendarRow key={c.id} c={c} toggleDone={toggleDone} remove={remove} />)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Receipts Tab (Improved) ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function ReceiptsTab({ state }) {
  const { receipts, setReceipts, setExpenses, expenses } = state;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ receipt_text: '', amount: '', date: todayStr(), vendor: '', category: 'Other', photo_url: '' });

  const validateForm = () => {
    if (!isPosNum(form.amount)) { alert('Enter a positive amount.'); return false; }
    if (form.receipt_text.trim() === '' && form.vendor.trim() === '') {
      alert('Enter at least a vendor name or some receipt text.'); return false;
    }
    return true;
  };

  const buildReceipt = () => ({
    id: uid(),
    receipt_text: form.receipt_text.trim(),
    amount: Number(form.amount),
    date: form.date || todayStr(),
    vendor: form.vendor.trim(),
    category: form.category,
    photo_url: form.photo_url.trim(),
    created_at: new Date().toISOString(),
  });

  const add = () => {
    if (!validateForm()) return;
    setReceipts([buildReceipt(), ...receipts]);
    setForm({ receipt_text: '', amount: '', date: todayStr(), vendor: '', category: 'Other', photo_url: '' }); setShowForm(false);
  };

  // Save the receipt AND log the corresponding expense in one click
  const saveAndLogExpense = () => {
    if (!validateForm()) return;
    const r = buildReceipt();
    setReceipts([r, ...receipts]);
    const expense = {
      id: uid(),
      amount: r.amount,
      category: r.category,
      description: r.vendor ? `Receipt: ${r.vendor}` : 'Receipt',
      date: r.date,
      receipt_id: r.id,
    };
    setExpenses([expense, ...expenses]);
    setForm({ receipt_text: '', amount: '', date: todayStr(), vendor: '', category: 'Other', photo_url: '' }); setShowForm(false);
    alert(`Saved receipt AND logged expense of ${fmtMoney(r.amount)} in "${r.category}".`);
  };

  // Log just an expense from the current form (no receipt saved)
  const logAsExpenseOnly = () => {
    if (!isPosNum(form.amount)) { alert('Enter a positive amount first.'); return; }
    setExpenses([{
      id: uid(),
      amount: Number(form.amount),
      category: form.category,
      description: form.vendor || 'Receipt',
      date: form.date || todayStr(),
    }, ...expenses]);
    alert(`Logged expense of ${fmtMoney(Number(form.amount))} in "${form.category}".`);
    setForm({ receipt_text: '', amount: '', date: todayStr(), vendor: '', category: 'Other', photo_url: '' }); setShowForm(false);
  };

  // Log an existing saved receipt as an expense
  const logExistingReceipt = (r) => {
    setExpenses([{
      id: uid(),
      amount: Number(r.amount),
      category: r.category || 'Other',
      description: r.vendor ? `Receipt: ${r.vendor}` : 'Receipt',
      date: r.date,
      receipt_id: r.id,
    }, ...expenses]);
    alert(`Logged expense of ${fmtMoney(r.amount)} from receipt "${r.vendor || 'Untitled'}".`);
  };

  const totalReceipts = receipts.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: TEXT }}>📷 Receipt Scanner</h3>
          <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED }}>{receipts.length} receipts • Total: {fmtMoney(totalReceipts)}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ Add Receipt</button>
      </div>

      <div style={{ ...cardStyle, background: ACCENT_LIGHT, borderColor: ACCENT, marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: ACCENT }}>
          <b>ℹ️ About OCR:</b> Real OCR scanning requires a backend service + image upload pipeline. For now, paste a photo URL (or paste the receipt text manually) and we&apos;ll store it. Use <b>“Save &amp; Log as Expense”</b> to record the matching expense in one click.
        </p>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: BG_CARD_2 }}>
          {/* NEW: photo URL placeholder + thumbnail preview */}
          <Field label="Receipt Photo URL (optional — paste a link to the photo of your receipt)">
            <input type="url" value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} placeholder="https://... or data:image/..." style={inputStyle} />
          </Field>
          {form.photo_url && (
            <div style={{ marginBottom: 12, textAlign: 'center' }}>
              <img src={form.photo_url} alt="Receipt preview" onError={(e) => { e.target.style.display = 'none'; }} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, border: `1px solid ${BORDER}` }} />
            </div>
          )}
          <Field label="Receipt Text (paste what's on the receipt — optional if photo URL provided)">
            <textarea value={form.receipt_text} onChange={e => setForm({ ...form, receipt_text: e.target.value })} placeholder="e.g. Stanbic Supermarket&#10;Milk x2 - 8000&#10;Bread - 5000&#10;Total: 13000" style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />
          </Field>
          <div style={formRow}>
            <Field label="Amount (UGX)"><input type="number" min="0" step="any" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputStyle} /></Field>
            <Field label="Date"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} /></Field>
            <Field label="Vendor (optional)"><input type="text" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. Stanbic Supermarket" style={inputStyle} /></Field>
            <Field label="Expense Category">
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={selectStyle}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={saveAndLogExpense} style={primaryBtn}>💾 Save &amp; Log as Expense</button>
            <button onClick={add} style={ghostBtn}>Save Receipt Only</button>
            <button onClick={logAsExpenseOnly} style={ghostBtn}>Log as Expense Only</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {receipts.length === 0 ? emptyState('📷', 'No receipts stored yet. Add your first receipt — paste a photo URL or the text manually.') : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {receipts.map(r => (
            <div key={r.id} style={{ ...cardStyle, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: ACCENT }}>{fmtMoney(r.amount)}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>{r.date} {r.vendor && `• ${r.vendor}`}</div>
                  {r.category && <span style={{ display: 'inline-block', marginTop: 4, background: ACCENT_LIGHT, color: ACCENT, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999, textTransform: 'uppercase' }}>{r.category}</span>}
                </div>
                <button onClick={withConfirm(() => setReceipts(receipts.filter(x => x.id !== r.id)), `Delete receipt${r.vendor ? ` "${r.vendor}"` : ''}?`)} style={dangerBtn} title="Delete receipt">×</button>
              </div>
              {r.photo_url && (
                <div style={{ marginBottom: 8, textAlign: 'center' }}>
                  <img src={r.photo_url} alt={`Receipt ${r.vendor || ''}`} onError={(e) => { e.target.style.display = 'none'; }} style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 6, border: `1px solid ${BORDER}` }} />
                </div>
              )}
              {r.receipt_text && (
                <pre style={{ margin: '0 0 8px', padding: 8, background: BG_CARD_2, borderRadius: 4, fontSize: 11, color: TEXT, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', maxHeight: 120, overflow: 'auto' }}>{r.receipt_text}</pre>
              )}
              <button onClick={() => logExistingReceipt(r)} style={{ ...ghostBtn, width: '100%', padding: '6px 10px', fontSize: 12 }}>📤 Log as Expense</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Investments Tab (Expanded) ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function InvestmentsTab({ state }) {
  const { investments, setInvestments, totals } = state;
  const { totalInvested, totalInvestValue, investmentReturn } = totals;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Sacco Shares', current_value: '', purchase_price: '', purchase_date: todayStr(), quantity: '', notes: '' });

  const add = () => {
    if (!form.name.trim() || !isPosNum(form.purchase_price) || !isNonNegNum(form.current_value)) {
      alert('Enter an investment name, positive purchase price, and non-negative current value.');
      return;
    }
    const newInv = {
      id: uid(),
      name: form.name.trim(),
      type: form.type,
      current_value: Number(form.current_value),
      purchase_price: Number(form.purchase_price),
      purchase_date: form.purchase_date || todayStr(),
      quantity: form.quantity ? Number(form.quantity) : null,
      notes: form.notes.trim(),
      created_at: todayStr(),
    };
    setInvestments([newInv, ...investments]);
    setForm({ name: '', type: 'Sacco Shares', current_value: '', purchase_price: '', purchase_date: todayStr(), quantity: '', notes: '' }); setShowForm(false);
  };
  const updateValue = (id, newValue) => {
    if (!isNonNegNum(newValue)) { alert('Enter a valid non-negative value.'); return; }
    setInvestments(investments.map(i => i.id === id ? { ...i, current_value: Number(newValue) } : i));
  };

  // Aggregate CAGR (weighted by purchase price)
  const overallCAGR = useMemo(() => {
    const totalP = investments.reduce((s, i) => s + Number(i.purchase_price || 0), 0);
    const totalC = investments.reduce((s, i) => s + Number(i.current_value || 0), 0);
    if (totalP <= 0 || totalC <= 0) return 0;
    // Weighted avg of years held (by purchase price)
    let weightedYears = 0;
    investments.forEach(i => {
      const y = yearsBetween(i.purchase_date);
      weightedYears += y * Number(i.purchase_price || 0);
    });
    const avgYears = weightedYears / totalP;
    if (avgYears < 0.01) return 0;
    return (Math.pow(totalC / totalP, 1 / avgYears) - 1) * 100;
  }, [investments]);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <StatCard icon="💼" label="Total Invested" value={fmtMoney(totalInvested)} sub={`${investments.length} position${investments.length === 1 ? '' : 's'}`} color={ACCENT} />
        <StatCard icon="💰" label="Current Value" value={fmtMoney(totalInvestValue)} sub="Latest valuation" color={SUCCESS} />
        <StatCard icon="📊" label="Total Return" value={`${investmentReturn >= 0 ? '+' : ''}${fmtPct(investmentReturn)}`} sub={`${investmentReturn >= 0 ? '+' : ''}${fmtMoney(totalInvestValue - totalInvested)} P/L`} color={investmentReturn >= 0 ? SUCCESS : DANGER} />
        <StatCard icon="📅" label="Annualized (CAGR)" value={`${overallCAGR >= 0 ? '+' : ''}${fmtPct(overallCAGR)}`} sub="Weighted avg compound annual growth" color={overallCAGR >= 0 ? SUCCESS : DANGER} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: TEXT }}>📈 Investment Tracking</h3>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ Add Investment</button>
      </div>

      <div style={{ ...cardStyle, background: ACCENT_LIGHT, borderColor: ACCENT, marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 12, color: ACCENT }}>
          <b>Supported investment types:</b> Sacco Shares, Treasury Bond, Unit Trust, Land, Vehicle, Bank FD, Stock, Bond, ETF, Mutual Fund, Crypto, Real Estate, Pension, Other. CAGR = annualized return based on holding period.
        </p>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: BG_CARD_2 }}>
          <div style={formRow}>
            <Field label="Investment Name"><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. STANBIC UG / Plot Kololo / Sacco #2345" style={inputStyle} /></Field>
            <Field label="Type">
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={selectStyle}>
                {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Purchase Price (UGX)"><input type="number" min="0" step="any" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} style={inputStyle} /></Field>
            <Field label="Current Value (UGX)"><input type="number" min="0" step="any" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} style={inputStyle} /></Field>
            <Field label="Purchase Date"><input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} style={inputStyle} /></Field>
            <Field label="Quantity (optional)"><input type="number" min="0" step="any" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 100 shares" style={inputStyle} /></Field>
          </div>
          <Field label="Notes (optional)">
            <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. 5-yr bond, 14% coupon, matures 2028" style={inputStyle} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={add} style={primaryBtn}>Save Investment</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {investments.length === 0 ? emptyState('📈', 'No investments tracked yet. Add Sacco shares, treasury bonds, unit trusts, land, vehicles, bank FDs, stocks, etc.') : (
        <div>
          {investments.map(i => {
            const ret = i.purchase_price > 0 ? ((i.current_value - i.purchase_price) / i.purchase_price) * 100 : 0;
            const cagr = calcCAGR(i.purchase_price, i.current_value, i.purchase_date);
            const gain = i.current_value - i.purchase_price;
            const positive = gain >= 0;
            const years = yearsBetween(i.purchase_date);
            return (
              <div key={i.id} style={{ ...cardStyle, borderLeft: `4px solid ${positive ? SUCCESS : DANGER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>{i.name}</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                      {i.type} • Bought {i.purchase_date} for {fmtMoney(i.purchase_price)}
                      {i.quantity && ` • Qty: ${i.quantity}`}
                      {years > 0 && ` • Held ${years.toFixed(2)} yr`}
                    </div>
                    {i.notes && <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>📝 {i.notes}</div>}
                  </div>
                  <button onClick={withConfirm(() => setInvestments(investments.filter(x => x.id !== i.id)), `Delete investment "${i.name}"?`)} style={dangerBtn} title="Delete investment">×</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>Current Value</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: ACCENT }}>{fmtMoney(i.current_value)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>Total Return</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: positive ? SUCCESS : DANGER }}>{positive ? '+' : ''}{fmtPct(ret)}</div>
                    <div style={{ fontSize: 11, color: positive ? SUCCESS : DANGER }}>{positive ? '+' : ''}{fmtMoney(gain)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>CAGR (annualized)</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: cagr >= 0 ? SUCCESS : DANGER }}>{cagr === 0 ? '—' : `${cagr >= 0 ? '+' : ''}${fmtPct(cagr)}`}</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>{years < 0.01 ? 'Hold longer to compute' : `Over ${years.toFixed(1)} yr`}</div>
                  </div>
                </div>
                <UpdateValueRow label="Update Current Value" onAdd={(v) => updateValue(i.id, v)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Main Individual Portal component ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
export default function IndividualPortal() {
  const { user } = useAuth();
  const [active, setActive] = useState('dashboard');

  // ─── Shared state (each backed by localStorage) ─────────────────────
  const [income, setIncome] = useLS(KEYS.income, 0);
  const [budgetCats, setBudgetCats] = useLS(KEYS.budgetCats, []);
  const [recurringBills, setRecurringBills] = useLS(KEYS.recurringBills, []);
  const [savings, setSavings] = useLS(KEYS.savings, []);
  const [expenses, setExpenses] = useLS(KEYS.expenses, []);
  const [debts, setDebts] = useLS(KEYS.debts, []);
  const [assets, setAssets] = useLS(KEYS.assets, []);
  const [liabilities, setLiabilities] = useLS(KEYS.liabilities, []);
  const [calendar, setCalendar] = useLS(KEYS.calendar, []);
  const [receipts, setReceipts] = useLS(KEYS.receipts, []);
  const [investments, setInvestments] = useLS(KEYS.investments, []);
  const [netWorthHistory, setNetWorthHistory] = useLS(KEYS.netWorthHistory, []);

  // ─── Derived totals ─────────────────────────────────────────────────
  const thisMonth = monthKey();
  const totalSpentThisMonth = useMemo(() =>
    expenses.filter(e => (e.date || '').slice(0, 7) === thisMonth).reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses, thisMonth]);
  const totalSavingsCurrent = savings.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const totalSavingsTarget = savings.reduce((s, g) => s + Number(g.target_amount || 0), 0);
  const totalDebtBalance = debts.reduce((s, d) => s + Number(d.balance || 0), 0);
  const totalDebtPrincipal = debts.reduce((s, d) => s + Number(d.principal || 0), 0);
  const totalAssets = assets.reduce((s, a) => s + Number(a.value || 0), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.value || 0), 0);
  const netWorth = totalAssets - totalLiabilities;
  const totalInvested = investments.reduce((s, i) => s + Number(i.purchase_price || 0), 0);
  const totalInvestValue = investments.reduce((s, i) => s + Number(i.current_value || 0), 0);
  const investmentReturn = totalInvested > 0 ? ((totalInvestValue - totalInvested) / totalInvested) * 100 : 0;
  const balance = Number(income || 0) - totalSpentThisMonth;

  const state = {
    income, setIncome, budgetCats, setBudgetCats, recurringBills, setRecurringBills,
    savings, setSavings, expenses, setExpenses, debts, setDebts,
    assets, setAssets, liabilities, setLiabilities, calendar, setCalendar,
    receipts, setReceipts, investments, setInvestments,
    netWorthHistory, setNetWorthHistory,
    totals: {
      thisMonth, balance, totalSpentThisMonth, totalSavingsCurrent, totalSavingsTarget,
      totalDebtBalance, totalDebtPrincipal, totalAssets, totalLiabilities, netWorth,
      totalInvested, totalInvestValue, investmentReturn,
    },
  };

  const clearAll = () => {
    if (!window.confirm('Clear ALL Individual Portal data? This cannot be undone.')) return;
    Object.values(KEYS).forEach(k => {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    });
    window.location.reload();
  };

  return (
    <div className="page-container" style={{ background: BG_NAVY, color: TEXT, minHeight: '100vh', padding: 24, boxSizing: 'border-box' }}>
      <h1 className="page-title" style={{ color: TEXT, marginBottom: 4 }}>🧑 Individual Portal</h1>
      <p style={{ color: TEXT_MUTED, fontSize: 14, marginBottom: 8 }}>
        Personal finance manager for {user?.username || 'you'} — budget, savings, debts, net worth, investments, and more.
      </p>
      <p style={{ color: TEXT_MUTED, fontSize: 12, marginBottom: 20 }}>
        All data is stored locally in this browser. Use{' '}
        <button onClick={clearAll} style={{ background: 'none', border: 0, color: DANGER, cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>Clear all data</button>
        {' '}to reset.
      </p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap', borderBottom: `1px solid ${BORDER}`, paddingBottom: 8 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: active === t.id ? ACCENT : 'transparent', color: active === t.id ? 'white' : TEXT_MUTED,
            border: `1px solid ${active === t.id ? ACCENT : BORDER}`, display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>{t.icon} <span>{t.label}</span></button>
        ))}
      </div>

      {active === 'dashboard' && <DashboardTab state={state} />}
      {active === 'budget' && <BudgetTab state={state} />}
      {active === 'budgetVsActual' && <BudgetVsActualTab state={state} />}
      {active === 'savings' && <SavingsTab state={state} />}
      {active === 'expenses' && <ExpensesTab state={state} />}
      {active === 'debts' && <DebtsTab state={state} />}
      {active === 'networth' && <NetWorthTab state={state} />}
      {active === 'calendar' && <CalendarTab state={state} />}
      {active === 'receipts' && <ReceiptsTab state={state} />}
      {active === 'investments' && <InvestmentsTab state={state} />}
    </div>
  );
}
