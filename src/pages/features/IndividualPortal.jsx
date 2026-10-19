// FileName: src/pages/features/IndividualPortal.jsx
// Ssewasswa Comforts — Individual / Personal Finance Portal
// Personal budget, savings goals, expense tracking, debt planner, net worth,
// financial calendar, receipt scanner placeholder, and investment tracking.
// All data persists to localStorage (same pattern as Tasks.jsx / Surveys.jsx).

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

// ─── Constants ───────────────────────────────────────────────────────────
const ACCENT = '#0288d1';
const ACCENT_LIGHT = '#e1f5fe';
const DANGER = '#d32f2f';
const WARN = '#f9ab00';
const SUCCESS = '#0b8043';

const KEYS = {
  income: 'erp_ind_income',
  budgetCats: 'erp_ind_budget_cats',
  recurringBills: 'erp_ind_recurring_bills',
  savings: 'erp_ind_savings',
  expenses: 'erp_ind_expenses',
  debts: 'erp_ind_debts',
  assets: 'erp_ind_assets',
  liabilities: 'erp_ind_liabilities',
  calendar: 'erp_ind_calendar',
  receipts: 'erp_ind_receipts',
  investments: 'erp_ind_investments',
};

const EXPENSE_CATEGORIES = ['Food', 'Rent', 'Transport', 'Utilities', 'Health', 'Education', 'Entertainment', 'Savings', 'Debt Payment', 'Other'];
const ASSET_TYPES = ['Cash', 'Bank Account', 'Investment', 'Property', 'Vehicle', 'Equipment', 'Other'];
const LIABILITY_TYPES = ['Loan', 'Credit Card', 'Mortgage', 'Tax Owed', 'Bills Payable', 'Other'];
const INVESTMENT_TYPES = ['Stock', 'Bond', 'ETF', 'Mutual Fund', 'Crypto', 'Real Estate', 'Pension', 'Other'];
const EVENT_TYPES = [
  { value: 'bill', label: 'Bill Due', icon: '🧾' },
  { value: 'salary', label: 'Salary', icon: '💵' },
  { value: 'loan', label: 'Loan Payment', icon: '💳' },
  { value: 'savings', label: 'Savings Deposit', icon: '🎯' },
  { value: 'other', label: 'Other Reminder', icon: '🔔' },
];

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'savings', label: 'Savings Goals', icon: '🎯' },
  { id: 'expenses', label: 'Expenses', icon: '🧾' },
  { id: 'debts', label: 'Debts', icon: '💳' },
  { id: 'networth', label: 'Net Worth', icon: '🏦' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'receipts', label: 'Receipts', icon: '📷' },
  { id: 'investments', label: 'Investments', icon: '📈' },
];

// ─── Helpers ────────────────────────────────────────────────────────────
const fmtMoney = (n) => 'USh ' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtPct = (n) => (Number(n || 0)).toFixed(1) + '%';
const uid = () => Date.now() + Math.floor(Math.random() * 1000);
const todayStr = () => new Date().toISOString().slice(0, 10);
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (key) => {
  const [y, m] = (key || '').split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m) - 1] || '?'} ${y}`;
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

// ─── localStorage-backed state hook ─────────────────────────────────────
function useLS(key, initial) {
  const [val, setVal] = useState(initial);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      if (stored !== null) setVal(stored);
    } catch { /* ignore */ }
  }, [key]);
  const save = (next) => {
    const v = typeof next === 'function' ? next(val) : next;
    setVal(v);
    localStorage.setItem(key, JSON.stringify(v));
  };
  return [val, save];
}

// ─── Shared inline styles ────────────────────────────────────────────────
const inputStyle = { padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box', width: '100%' };
const selectStyle = { ...inputStyle, cursor: 'pointer' };
const primaryBtn = { padding: '10px 20px', background: ACCENT, color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const ghostBtn = { padding: '8px 14px', background: 'white', color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const dangerBtn = { background: 'none', border: 0, color: DANGER, cursor: 'pointer', fontSize: 18, padding: 4, fontWeight: 700 };
const cardStyle = { background: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, marginBottom: 12 };
const labelStyle = { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: 600, display: 'block' };
const formRow = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 };

const emptyState = (icon, msg) => (
  <div style={{ textAlign: 'center', padding: 48, color: '#666', background: '#fafafa', borderRadius: 8 }}>
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
    <div style={{ flex: '1 1 200px', minWidth: 200, padding: 16, borderRadius: 10, background: 'white', border: `1px solid #e0e0e0`, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#202124', marginTop: 4, wordBreak: 'break-word' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, max, color = ACCENT, height = 8 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = value > max && max > 0;
  return (
    <div style={{ background: '#f1f3f4', borderRadius: 999, height, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: over ? DANGER : color, borderRadius: 999, transition: 'width 0.3s' }} />
    </div>
  );
}

function BarChart({ data, height = 200, color = ACCENT }) {
  const max = Math.max(...(data || []).map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '12px 0', borderBottom: '1px solid #e0e0e0', boxSizing: 'border-box' }}>
      {(data || []).map((d, i) => {
        const h = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 4, whiteSpace: 'nowrap' }}>{d.value > 0 ? (d.value / 1000).toFixed(0) + 'k' : ''}</div>
            <div title={fmtMoney(d.value)} style={{ width: '70%', height: `${h}%`, background: color, borderRadius: '4px 4px 0 0', minHeight: d.value > 0 ? 4 : 0, transition: 'height 0.3s' }} />
            <div style={{ fontSize: 10, color: '#999', marginTop: 4 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Reusable inline row components ──────────────────────────────────────
function CalendarRow({ c, toggleDone, remove, overdue }) {
  const evType = EVENT_TYPES.find(t => t.value === c.type) || EVENT_TYPES[EVENT_TYPES.length - 1];
  const days = daysUntil(c.date);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px dashed #eee', fontSize: 13 }}>
      <input type="checkbox" checked={c.done} onChange={() => toggleDone(c.id)} style={{ transform: 'scale(1.2)', cursor: 'pointer' }} />
      <span style={{ fontSize: 16 }}>{evType.icon}</span>
      <div style={{ flex: 1, textDecoration: c.done ? 'line-through' : 'none', color: c.done ? '#999' : '#202124' }}>
        <div>{c.title}</div>
        <div style={{ fontSize: 11, color: '#999' }}>{c.date} {c.amount > 0 && `• ${fmtMoney(c.amount)}`}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: overdue ? DANGER : days === 0 ? WARN : '#666', whiteSpace: 'nowrap' }}>
        {c.done ? 'done' : overdue ? 'overdue' : days === 0 ? 'today' : days > 0 ? `${days}d` : `${Math.abs(days)}d ago`}
      </span>
      <button onClick={() => remove(c.id)} style={dangerBtn}>×</button>
    </div>
  );
}

function AddFundsRow({ onAdd, label = 'Add Funds' }) {
  const [amount, setAmount] = useState('');
  const submit = () => {
    const n = Number(amount);
    if (!n || n <= 0) return;
    onAdd(n);
    setAmount('');
  };
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Amount" style={{ ...inputStyle, padding: '6px 8px', fontSize: 13, flex: 1 }} />
      <button onClick={submit} style={{ ...primaryBtn, padding: '6px 12px', fontSize: 12 }}>{label}</button>
    </div>
  );
}

function UpdateValueRow({ onAdd, label }) {
  const [value, setValue] = useState('');
  const submit = () => {
    const n = Number(value);
    if (!n || n < 0) return;
    onAdd(n);
    setValue('');
  };
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      <input type="number" min="0" value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="New value" style={{ ...inputStyle, padding: '6px 8px', fontSize: 13, flex: 1 }} />
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
          <h3 style={{ margin: '0 0 4px', fontSize: 15, color: '#202124' }}>📈 Last 6 Months Spending</h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#666' }}>Average: {fmtMoney(avgMonthly)} / month</p>
          <BarChart data={trendData} color={ACCENT} />
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 280, ...cardStyle }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#202124' }}>⏰ Upcoming (next 30 days)</h3>
          {upcoming.length === 0 && upcomingBills.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13 }}>No upcoming events. Add some in the Calendar tab.</p>
          ) : (
            <div>
              {upcomingBills.map(b => (
                <div key={`b${b.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee', fontSize: 13 }}>
                  <span>🔁 {b.name}</span>
                  <span style={{ color: b.days <= 2 ? DANGER : '#666', fontWeight: 600 }}>{fmtMoney(b.amount)} • {b.days <= 0 ? 'today' : `${b.days}d`}</span>
                </div>
              ))}
              {upcoming.map(c => {
                const evType = EVENT_TYPES.find(t => t.value === c.type) || EVENT_TYPES[EVENT_TYPES.length - 1];
                return (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee', fontSize: 13 }}>
                    <span>{evType.icon} {c.title}</span>
                    <span style={{ color: c.days < 0 ? DANGER : '#666', fontWeight: 600 }}>{c.days < 0 ? 'overdue' : c.days === 0 ? 'today' : `${c.days}d`}</span>
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
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#666' }}>{fmtMoney(totalSavingsCurrent)} of {fmtMoney(totalSavingsTarget)}</p>
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 280, ...cardStyle }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: ACCENT }}>💳 Debt Payoff Progress</h3>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{fmtPct(debtProgress)}</div>
          <ProgressBar value={totalDebtPrincipal - totalDebtBalance} max={totalDebtPrincipal} color={SUCCESS} height={10} />
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#666' }}>{fmtMoney(totalDebtPrincipal - totalDebtBalance)} paid of {fmtMoney(totalDebtPrincipal)}</p>
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 280, ...cardStyle }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: ACCENT }}>📈 Investment Returns</h3>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: investmentReturn >= 0 ? SUCCESS : DANGER }}>{investmentReturn >= 0 ? '+' : ''}{fmtPct(investmentReturn)}</div>
          <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Current: {fmtMoney(totalInvestValue)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>Invested: {fmtMoney(totalInvested)} • Gain: {fmtMoney(totalInvestValue - totalInvested)}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Budget Tab ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function BudgetTab({ state }) {
  const { income, setIncome, budgetCats, setBudgetCats, recurringBills, setRecurringBills, setExpenses, totals } = state;
  const { totalSpentThisMonth } = totals;

  const [showCatForm, setShowCatForm] = useState(false);
  const [showBillForm, setShowBillForm] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', limit: '' });
  const [newBill, setNewBill] = useState({ name: '', amount: '', due_day: '1', category: 'Utilities' });

  const spentByCat = {};
  state.expenses.filter(e => (e.date || '').slice(0, 7) === monthKey()).forEach(e => { spentByCat[e.category] = (spentByCat[e.category] || 0) + Number(e.amount || 0); });
  const totalBudget = budgetCats.reduce((s, c) => s + Number(c.limit || 0), 0);
  const overBudgetCats = budgetCats.filter(c => (spentByCat[c.name] || 0) > c.limit);
  const billsTotal = recurringBills.reduce((s, b) => s + Number(b.amount || 0), 0);

  const addCat = () => {
    if (!newCat.name.trim() || !newCat.limit) return;
    setBudgetCats([{ id: uid(), name: newCat.name.trim(), limit: Number(newCat.limit) }, ...budgetCats]);
    setNewCat({ name: '', limit: '' }); setShowCatForm(false);
  };
  const addBill = () => {
    if (!newBill.name.trim() || !newBill.amount) return;
    const day = Math.min(28, Math.max(1, Number(newBill.due_day) || 1));
    setRecurringBills([{ id: uid(), name: newBill.name.trim(), amount: Number(newBill.amount), due_day: day, category: newBill.category }, ...recurringBills]);
    setNewBill({ name: '', amount: '', due_day: '1', category: 'Utilities' }); setShowBillForm(false);
  };

  return (
    <div>
      <div style={{ ...cardStyle, background: ACCENT_LIGHT, borderColor: ACCENT }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, color: ACCENT }}>💵 Monthly Income</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="number" min="0" value={income || ''} onChange={e => setIncome(Number(e.target.value) || 0)} placeholder="e.g. 1500000" style={{ ...inputStyle, maxWidth: 300 }} />
          <span style={{ fontSize: 13, color: '#666' }}>Set your monthly income to calculate remaining budget.</span>
        </div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
          Budgeted: <b>{fmtMoney(totalBudget)}</b> • Spent: <b>{fmtMoney(totalSpentThisMonth)}</b> • Remaining: <b style={{ color: income - totalSpentThisMonth >= 0 ? SUCCESS : DANGER }}>{fmtMoney(income - totalSpentThisMonth)}</b>
        </div>
      </div>

      {overBudgetCats.length > 0 && (
        <div style={{ ...cardStyle, background: '#ffebee', borderColor: DANGER }}>
          <h3 style={{ margin: 0, fontSize: 14, color: DANGER }}>⚠️ Over Budget Alerts</h3>
          <div style={{ marginTop: 6, fontSize: 13, color: '#333' }}>
            {overBudgetCats.map(c => (
              <div key={c.id}>{c.name}: spent {fmtMoney(spentByCat[c.name])} / limit {fmtMoney(c.limit)} (over by {fmtMoney(spentByCat[c.name] - c.limit)})</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#202124' }}>📋 Category Budgets</h3>
        <button onClick={() => setShowCatForm(!showCatForm)} style={primaryBtn}>+ Add Category</button>
      </div>

      {showCatForm && (
        <div style={{ ...cardStyle, background: '#fafafa' }}>
          <div style={formRow}>
            <Field label="Category Name"><input type="text" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} placeholder="e.g. Food" style={inputStyle} /></Field>
            <Field label="Monthly Limit (USh)"><input type="number" min="0" value={newCat.limit} onChange={e => setNewCat({ ...newCat, limit: e.target.value })} placeholder="e.g. 400000" style={inputStyle} /></Field>
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
                  <strong style={{ fontSize: 14 }}>{c.name}</strong>
                  <div style={{ fontSize: 13, color: '#666' }}>{fmtMoney(spent)} / {fmtMoney(c.limit)} {over && <span style={{ color: DANGER, fontWeight: 700 }}>• OVER!</span>}</div>
                </div>
                <ProgressBar value={spent} max={c.limit} color={ACCENT} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#999' }}>
                  <span>{fmtPct(c.limit > 0 ? (spent / c.limit) * 100 : 0)} used</span>
                  <span>Remaining: {fmtMoney(Math.max(0, c.limit - spent))}</span>
                </div>
                <button onClick={() => setBudgetCats(budgetCats.filter(x => x.id !== c.id))} style={dangerBtn}>×</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 24, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#202124' }}>🔁 Recurring Bills ({fmtMoney(billsTotal)} / month)</h3>
        <button onClick={() => setShowBillForm(!showBillForm)} style={primaryBtn}>+ Add Bill</button>
      </div>

      {showBillForm && (
        <div style={{ ...cardStyle, background: '#fafafa' }}>
          <div style={formRow}>
            <Field label="Bill Name"><input type="text" value={newBill.name} onChange={e => setNewBill({ ...newBill, name: e.target.value })} placeholder="e.g. Electricity" style={inputStyle} /></Field>
            <Field label="Amount (USh)"><input type="number" min="0" value={newBill.amount} onChange={e => setNewBill({ ...newBill, amount: e.target.value })} style={inputStyle} /></Field>
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
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>Day {b.due_day} • {b.category}</div>
                </div>
                <button onClick={() => setRecurringBills(recurringBills.filter(x => x.id !== b.id))} style={dangerBtn}>×</button>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: ACCENT, marginTop: 6 }}>{fmtMoney(b.amount)}</div>
              <button onClick={() => {
                setExpenses([{ id: uid(), amount: b.amount, category: b.category, description: b.name, date: todayStr() }, ...state.expenses]);
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
// ─── Savings Goals Tab ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function SavingsTab({ state }) {
  const { savings, setSavings, totals } = state;
  const { totalSavingsCurrent, totalSavingsTarget } = totals;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '0', deadline: '' });

  const add = () => {
    if (!form.name.trim() || !form.target_amount) return;
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
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#202124' }}>🎯 Savings Goals</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Total saved: <b>{fmtMoney(totalSavingsCurrent)}</b> of <b>{fmtMoney(totalSavingsTarget)}</b></p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ New Goal</button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: '#fafafa' }}>
          <div style={formRow}>
            <Field label="Goal Name"><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Emergency Fund" style={inputStyle} /></Field>
            <Field label="Target Amount (USh)"><input type="number" min="0" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} style={inputStyle} /></Field>
            <Field label="Already Saved (USh)"><input type="number" min="0" value={form.current_amount} onChange={e => setForm({ ...form, current_amount: e.target.value })} style={inputStyle} /></Field>
            <Field label="Deadline"><input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={add} style={primaryBtn}>Save Goal</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {savings.length === 0 ? emptyState('🎯', 'No savings goals yet. Set your first target — emergency fund, vacation, gadget, etc.') : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {savings.map(g => {
            const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
            const remaining = Math.max(0, g.target_amount - g.current_amount);
            const dleft = daysUntil(g.deadline);
            const done = g.current_amount >= g.target_amount;
            return (
              <div key={g.id} style={{ ...cardStyle, marginBottom: 0, borderLeft: `4px solid ${done ? SUCCESS : WARN}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{done ? '✅ ' : ''}{g.name}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      {g.deadline ? `Due ${g.deadline}` : 'No deadline'}
                      {dleft !== null && !done && <span style={{ color: dleft < 0 ? DANGER : '#666', marginLeft: 6 }}>({dleft < 0 ? 'overdue' : `${dleft}d left`})</span>}
                    </div>
                  </div>
                  <button onClick={() => setSavings(savings.filter(x => x.id !== g.id))} style={dangerBtn}>×</button>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: ACCENT, marginTop: 8 }}>{fmtMoney(g.current_amount)}</div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>of {fmtMoney(g.target_amount)} • {fmtPct(pct)}</div>
                <ProgressBar value={g.current_amount} max={g.target_amount} color={WARN} height={10} />
                <div style={{ fontSize: 11, color: '#999', marginTop: 6, marginBottom: 8 }}>{fmtMoney(remaining)} remaining</div>
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
// ─── Expenses Tab ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function ExpensesTab({ state }) {
  const { expenses, setExpenses, totals } = state;
  const { totalSpentThisMonth } = totals;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', category: 'Food', description: '', date: todayStr() });
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterCat, setFilterCat] = useState('all');

  const add = () => {
    if (!form.amount || Number(form.amount) <= 0) return;
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
  const catData = Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#202124' }}>🧾 Expense Tracking</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#666' }}>This month: <b>{fmtMoney(totalSpentThisMonth)}</b> • {expenses.length} total entries</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ Add Expense</button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: '#fafafa' }}>
          <div style={formRow}>
            <Field label="Amount (USh)"><input type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 15000" style={inputStyle} /></Field>
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
          <h3 style={{ margin: '0 0 4px', fontSize: 14, color: '#202124' }}>📊 6-Month Spending Trend</h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#666' }}>Monthly totals across all categories</p>
          <BarChart data={trendData} color={ACCENT} height={180} />
        </div>
      )}

      {catData.length > 0 && (
        <div style={{ ...cardStyle }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#202124' }}>📂 Category Breakdown ({fmtMoney(filteredTotal)} filtered)</h3>
          {catData.map(c => {
            const pct = filteredTotal > 0 ? (c.value / filteredTotal) * 100 : 0;
            return (
              <div key={c.name} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }}>
                  <span>{c.name}</span><span>{fmtMoney(c.value)} • {fmtPct(pct)}</span>
                </div>
                <ProgressBar value={c.value} max={filteredTotal} color={ACCENT} height={6} />
              </div>
            );
          })}
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
          <div style={{ fontSize: 13, color: '#666' }}>Showing {filtered.length} • {fmtMoney(filteredTotal)}</div>
        </div>
      )}

      {expenses.length === 0 ? emptyState('🧾', 'No expenses tracked yet. Add your first expense to see trends.') : (
        <div>
          {filtered.map(e => (
            <div key={e.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{fmtMoney(e.amount)}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{e.date} {e.description && `• ${e.description}`}</div>
              </div>
              <span style={{ background: ACCENT_LIGHT, color: ACCENT, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase' }}>{e.category}</span>
              <button onClick={() => setExpenses(expenses.filter(x => x.id !== e.id))} style={dangerBtn}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Debts Tab ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function DebtsTab({ state }) {
  const { debts, setDebts, totals } = state;
  const { totalDebtBalance, totalDebtPrincipal } = totals;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ lender: '', principal: '', interest_rate: '', monthly_payment: '', balance: '', start_date: todayStr() });

  const add = () => {
    if (!form.lender.trim() || !form.principal) return;
    const principal = Number(form.principal);
    const balance = form.balance !== '' ? Number(form.balance) : principal;
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

  const sortedDebts = [...debts].sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0));
  const totalMonthly = debts.reduce((s, d) => s + Number(d.monthly_payment || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <StatCard icon="💳" label="Total Debt Balance" value={fmtMoney(totalDebtBalance)} sub={`Of ${fmtMoney(totalDebtPrincipal)} principal`} color={DANGER} />
        <StatCard icon="📅" label="Monthly Payments" value={fmtMoney(totalMonthly)} sub={`${debts.length} active loan${debts.length === 1 ? '' : 's'}`} color={ACCENT} />
        <StatCard icon="📊" label="Paid Off" value={fmtPct(totalDebtPrincipal > 0 ? ((totalDebtPrincipal - totalDebtBalance) / totalDebtPrincipal) * 100 : 0)} sub={`${fmtMoney(totalDebtPrincipal - totalDebtBalance)} repaid`} color={SUCCESS} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#202124' }}>💳 Debt Tracking</h3>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ Add Loan</button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: '#fafafa' }}>
          <div style={formRow}>
            <Field label="Lender"><input type="text" value={form.lender} onChange={e => setForm({ ...form, lender: e.target.value })} placeholder="e.g. Stanbic Bank" style={inputStyle} /></Field>
            <Field label="Principal (USh)"><input type="number" min="0" value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} style={inputStyle} /></Field>
            <Field label="Interest Rate (%)"><input type="number" step="0.1" min="0" value={form.interest_rate} onChange={e => setForm({ ...form, interest_rate: e.target.value })} placeholder="e.g. 12.5" style={inputStyle} /></Field>
            <Field label="Monthly Payment (USh)"><input type="number" min="0" value={form.monthly_payment} onChange={e => setForm({ ...form, monthly_payment: e.target.value })} style={inputStyle} /></Field>
            <Field label="Current Balance (USh)"><input type="number" min="0" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} placeholder={`Defaults to principal`} style={inputStyle} /></Field>
            <Field label="Start Date"><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={add} style={primaryBtn}>Save Loan</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {debts.length > 0 && (
        <div style={{ ...cardStyle, background: ACCENT_LIGHT, borderColor: ACCENT }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: ACCENT }}>🧮 Debt Payoff Planner (Avalanche Method)</h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#666' }}>Sorted by highest interest rate first — pay minimums on all, then attack the top one.</p>
          <div style={{ fontSize: 13 }}>
            {sortedDebts.map((d, i) => {
              const monthsLeft = d.monthly_payment > 0 ? Math.ceil(d.balance / d.monthly_payment) : null;
              return (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #cfe9f7' }}>
                  <span>{i + 1}. {d.lender} ({d.interest_rate}% APR)</span>
                  <span><b>{fmtMoney(d.balance)}</b> {monthsLeft !== null && `• ${monthsLeft}mo left`}</span>
                </div>
              );
            })}
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
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{cleared ? '✅ ' : ''}{d.lender}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>Principal {fmtMoney(d.principal)} • {d.interest_rate}% APR • {fmtMoney(d.monthly_payment)}/mo • Started {d.start_date}</div>
                  </div>
                  <button onClick={() => setDebts(debts.filter(x => x.id !== d.id))} style={dangerBtn}>×</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8, marginBottom: 6 }}>
                  <span>Bal: <b style={{ color: DANGER }}>{fmtMoney(d.balance)}</b></span>
                  <span>Paid: <b style={{ color: SUCCESS }}>{fmtMoney(paid)}</b> ({fmtPct(pct)})</span>
                </div>
                <ProgressBar value={paid} max={d.principal} color={SUCCESS} height={8} />
                <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
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
// ─── Net Worth Tab ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function NetWorthTab({ state }) {
  const { assets, setAssets, liabilities, setLiabilities, totals } = state;
  const { totalAssets, totalLiabilities, netWorth } = totals;

  const [showAsset, setShowAsset] = useState(false);
  const [showLiab, setShowLiab] = useState(false);
  const [assetForm, setAssetForm] = useState({ name: '', value: '', type: 'Cash' });
  const [liabForm, setLiabForm] = useState({ name: '', value: '', type: 'Loan' });

  const addAsset = () => {
    if (!assetForm.name.trim() || !assetForm.value) return;
    setAssets([{ id: uid(), name: assetForm.name.trim(), value: Number(assetForm.value), type: assetForm.type }, ...assets]);
    setAssetForm({ name: '', value: '', type: 'Cash' }); setShowAsset(false);
  };
  const addLiab = () => {
    if (!liabForm.name.trim() || !liabForm.value) return;
    setLiabilities([{ id: uid(), name: liabForm.name.trim(), value: Number(liabForm.value), type: liabForm.type }, ...liabilities]);
    setLiabForm({ name: '', value: '', type: 'Loan' }); setShowLiab(false);
  };

  return (
    <div>
      <div style={{ ...cardStyle, background: ACCENT_LIGHT, borderColor: ACCENT, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Net Worth</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: netWorth >= 0 ? SUCCESS : DANGER }}>{fmtMoney(netWorth)}</div>
          <div style={{ fontSize: 12, color: '#666' }}>Assets {fmtMoney(totalAssets)} − Liabilities {fmtMoney(totalLiabilities)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 16px', background: 'white', borderRadius: 6, border: `1px solid ${SUCCESS}` }}>
            <div style={{ fontSize: 10, color: SUCCESS, fontWeight: 600 }}>ASSETS</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtMoney(totalAssets)}</div>
          </div>
          <div style={{ padding: '8px 16px', background: 'white', borderRadius: 6, border: `1px solid ${DANGER}` }}>
            <div style={{ fontSize: 10, color: DANGER, fontWeight: 600 }}>LIABILITIES</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtMoney(totalLiabilities)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: SUCCESS }}>📈 Assets ({fmtMoney(totalAssets)})</h3>
            <button onClick={() => setShowAsset(!showAsset)} style={{ ...primaryBtn, background: SUCCESS }}>+ Add Asset</button>
          </div>
          {showAsset && (
            <div style={{ ...cardStyle, background: '#fafafa' }}>
              <div style={formRow}>
                <Field label="Asset Name"><input type="text" value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="e.g. Savings Account" style={inputStyle} /></Field>
                <Field label="Value (USh)"><input type="number" min="0" value={assetForm.value} onChange={e => setAssetForm({ ...assetForm, value: e.target.value })} style={inputStyle} /></Field>
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
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{a.type}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, color: SUCCESS }}>{fmtMoney(a.value)}</span>
                    <button onClick={() => setAssets(assets.filter(x => x.id !== a.id))} style={dangerBtn}>×</button>
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
            <div style={{ ...cardStyle, background: '#fafafa' }}>
              <div style={formRow}>
                <Field label="Liability Name"><input type="text" value={liabForm.name} onChange={e => setLiabForm({ ...liabForm, name: e.target.value })} placeholder="e.g. Car Loan" style={inputStyle} /></Field>
                <Field label="Value (USh)"><input type="number" min="0" value={liabForm.value} onChange={e => setLiabForm({ ...liabForm, value: e.target.value })} style={inputStyle} /></Field>
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
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{l.type}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, color: DANGER }}>{fmtMoney(l.value)}</span>
                    <button onClick={() => setLiabilities(liabilities.filter(x => x.id !== l.id))} style={dangerBtn}>×</button>
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
// ─── Calendar Tab ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function CalendarTab({ state }) {
  const { calendar, setCalendar } = state;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'bill', date: todayStr(), amount: '' });

  const add = () => {
    if (!form.title.trim() || !form.date) return;
    setCalendar([{ id: uid(), title: form.title.trim(), type: form.type, date: form.date, amount: Number(form.amount) || 0, done: false }, ...calendar]);
    setForm({ title: '', type: 'bill', date: todayStr(), amount: '' }); setShowForm(false);
  };
  const toggleDone = (id) => setCalendar(calendar.map(c => c.id === id ? { ...c, done: !c.done } : c));
  const remove = (id) => setCalendar(calendar.filter(c => c.id !== id));

  const upcoming = [...calendar].sort((a, b) => new Date(a.date) - new Date(b.date));
  const today = todayStr();
  const overdue = upcoming.filter(c => c.date < today && !c.done);
  const dueSoon = upcoming.filter(c => c.date >= today && !c.done && daysUntil(c.date) <= 14);
  const doneItems = upcoming.filter(c => c.done);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#202124' }}>📅 Financial Calendar</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Bill due dates, salary reminders, loan payments.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ Add Event</button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: '#fafafa' }}>
          <div style={formRow}>
            <Field label="Title"><input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Pay Electricity Bill" style={inputStyle} /></Field>
            <Field label="Type">
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={selectStyle}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Date"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} /></Field>
            <Field label="Amount (optional)"><input type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={add} style={primaryBtn}>Save Event</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {overdue.length > 0 && (
        <div style={{ ...cardStyle, background: '#ffebee', borderColor: DANGER }}>
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
        <div style={{ ...cardStyle, background: '#f6fff9' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: SUCCESS }}>✅ Done ({doneItems.length})</h3>
          {doneItems.slice(0, 10).map(c => <CalendarRow key={c.id} c={c} toggleDone={toggleDone} remove={remove} />)}
        </div>
      )}

      {calendar.length === 0 ? emptyState('📅', 'No calendar events yet. Add bill due dates, salary reminders, loan payment dates.') : (
        <div style={{ ...cardStyle }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#202124' }}>📋 All Events ({calendar.length})</h3>
          {upcoming.map(c => <CalendarRow key={c.id} c={c} toggleDone={toggleDone} remove={remove} />)}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Receipts Tab ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function ReceiptsTab({ state }) {
  const { receipts, setReceipts, setExpenses, expenses } = state;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ receipt_text: '', amount: '', date: todayStr(), vendor: '' });

  const add = () => {
    if (!form.receipt_text.trim() || !form.amount) return;
    setReceipts([{ id: uid(), receipt_text: form.receipt_text.trim(), amount: Number(form.amount), date: form.date || todayStr(), vendor: form.vendor.trim(), created_at: new Date().toISOString() }, ...receipts]);
    setForm({ receipt_text: '', amount: '', date: todayStr(), vendor: '' }); setShowForm(false);
  };

  const totalReceipts = receipts.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#202124' }}>📷 Receipt Scanner</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{receipts.length} receipts • Total: {fmtMoney(totalReceipts)}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ Add Receipt</button>
      </div>

      <div style={{ ...cardStyle, background: ACCENT_LIGHT, borderColor: ACCENT, marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: ACCENT }}>
          <b>ℹ️ About OCR:</b> Real OCR scanning requires a backend service + image upload pipeline. This is a manual placeholder — paste the receipt text and we&apos;ll store it for your records. Auto-OCR coming in a future release.
        </p>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: '#fafafa' }}>
          <Field label="Receipt Text (paste what's on the receipt)">
            <textarea value={form.receipt_text} onChange={e => setForm({ ...form, receipt_text: e.target.value })} placeholder="e.g. Stanbic Supermarket&#10;Milk x2 - 8000&#10;Bread - 5000&#10;Total: 13000" style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />
          </Field>
          <div style={formRow}>
            <Field label="Amount (USh)"><input type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputStyle} /></Field>
            <Field label="Date"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} /></Field>
            <Field label="Vendor (optional)"><input type="text" value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. Stanbic Supermarket" style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={add} style={primaryBtn}>Save Receipt</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
            <button onClick={() => {
              if (!form.amount) { alert('Enter an amount first to log as expense.'); return; }
              setExpenses([{ id: uid(), amount: Number(form.amount), category: 'Other', description: form.vendor || 'Receipt', date: form.date || todayStr() }, ...expenses]);
              alert('Expense logged. (Receipt still needs to be saved separately.)');
            }} style={ghostBtn}>Log as Expense</button>
          </div>
        </div>
      )}

      {receipts.length === 0 ? emptyState('📷', 'No receipts stored yet. Add your first receipt — paste the text manually.') : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {receipts.map(r => (
            <div key={r.id} style={{ ...cardStyle, marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: ACCENT }}>{fmtMoney(r.amount)}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{r.date} {r.vendor && `• ${r.vendor}`}</div>
                </div>
                <button onClick={() => setReceipts(receipts.filter(x => x.id !== r.id))} style={dangerBtn}>×</button>
              </div>
              <pre style={{ margin: 0, padding: 8, background: '#fafafa', borderRadius: 4, fontSize: 11, color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, Menlo, Consolas, monospace', maxHeight: 120, overflow: 'auto' }}>{r.receipt_text}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── Investments Tab ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════
function InvestmentsTab({ state }) {
  const { investments, setInvestments, totals } = state;
  const { totalInvested, totalInvestValue, investmentReturn } = totals;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Stock', current_value: '', purchase_price: '', purchase_date: todayStr() });

  const add = () => {
    if (!form.name.trim() || !form.purchase_price || !form.current_value) return;
    setInvestments([{ id: uid(), name: form.name.trim(), type: form.type, current_value: Number(form.current_value), purchase_price: Number(form.purchase_price), purchase_date: form.purchase_date || todayStr() }, ...investments]);
    setForm({ name: '', type: 'Stock', current_value: '', purchase_price: '', purchase_date: todayStr() }); setShowForm(false);
  };
  const updateValue = (id, newValue) => {
    if (!newValue || newValue < 0) return;
    setInvestments(investments.map(i => i.id === id ? { ...i, current_value: Number(newValue) } : i));
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <StatCard icon="💼" label="Total Invested" value={fmtMoney(totalInvested)} sub={`${investments.length} position${investments.length === 1 ? '' : 's'}`} color={ACCENT} />
        <StatCard icon="💰" label="Current Value" value={fmtMoney(totalInvestValue)} sub="Latest valuation" color={SUCCESS} />
        <StatCard icon="📊" label="Total Return" value={`${investmentReturn >= 0 ? '+' : ''}${fmtPct(investmentReturn)}`} sub={`${investmentReturn >= 0 ? '+' : ''}${fmtMoney(totalInvestValue - totalInvested)} P/L`} color={investmentReturn >= 0 ? SUCCESS : DANGER} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#202124' }}>📈 Investment Tracking</h3>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtn}>+ Add Investment</button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, background: '#fafafa' }}>
          <div style={formRow}>
            <Field label="Investment Name"><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. STANBIC UG" style={inputStyle} /></Field>
            <Field label="Type">
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={selectStyle}>
                {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Purchase Price (USh)"><input type="number" min="0" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: e.target.value })} style={inputStyle} /></Field>
            <Field label="Current Value (USh)"><input type="number" min="0" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} style={inputStyle} /></Field>
            <Field label="Purchase Date"><input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={add} style={primaryBtn}>Save Investment</button>
            <button onClick={() => setShowForm(false)} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      )}

      {investments.length === 0 ? emptyState('📈', 'No investments tracked yet. Add stocks, bonds, ETFs, crypto, real estate.') : (
        <div>
          {investments.map(i => {
            const ret = i.purchase_price > 0 ? ((i.current_value - i.purchase_price) / i.purchase_price) * 100 : 0;
            const gain = i.current_value - i.purchase_price;
            const positive = gain >= 0;
            return (
              <div key={i.id} style={{ ...cardStyle, borderLeft: `4px solid ${positive ? SUCCESS : DANGER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{i.name}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{i.type} • Bought {i.purchase_date} for {fmtMoney(i.purchase_price)}</div>
                  </div>
                  <button onClick={() => setInvestments(investments.filter(x => x.id !== i.id))} style={dangerBtn}>×</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#999' }}>Current Value</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: ACCENT }}>{fmtMoney(i.current_value)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#999' }}>Return</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: positive ? SUCCESS : DANGER }}>{positive ? '+' : ''}{fmtPct(ret)}</div>
                    <div style={{ fontSize: 11, color: positive ? SUCCESS : DANGER }}>{positive ? '+' : ''}{fmtMoney(gain)}</div>
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
    totals: {
      thisMonth, balance, totalSpentThisMonth, totalSavingsCurrent, totalSavingsTarget,
      totalDebtBalance, totalDebtPrincipal, totalAssets, totalLiabilities, netWorth,
      totalInvested, totalInvestValue, investmentReturn,
    },
  };

  const clearAll = () => {
    if (!confirm('Clear ALL Individual Portal data? This cannot be undone.')) return;
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div className="page-container">
      <h1 className="page-title">🧑 Individual Portal</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
        Personal finance manager for {user?.username || 'you'} — budget, savings, debts, net worth, and investments.
      </p>
      <p style={{ color: '#999', fontSize: 12, marginBottom: 20 }}>
        All data is stored locally in this browser. Use{' '}
        <button onClick={clearAll} style={{ background: 'none', border: 0, color: DANGER, cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>Clear all data</button>
        {' '}to reset.
      </p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap', borderBottom: '1px solid #e0e0e0', paddingBottom: 8 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)} style={{
            padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: active === t.id ? ACCENT : 'white', color: active === t.id ? 'white' : '#5f6368',
            border: `1px solid ${active === t.id ? ACCENT : '#e0e0e0'}`, display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>{t.icon} <span>{t.label}</span></button>
        ))}
      </div>

      {active === 'dashboard' && <DashboardTab state={state} />}
      {active === 'budget' && <BudgetTab state={state} />}
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
