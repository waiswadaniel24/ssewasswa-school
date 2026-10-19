// Ssewasswa Comforts — Business / SME Portal (Expanded Edition)
// Tabs: Dashboard, POS, Sales, Customers, Suppliers, Products, Expenses,
//       Loyalty Points, Bill Reminders, Debt Payoff Planner, Purchase Orders,
//       Z-Reports, Profit & Loss Report, Inventory Valuation.
// All data persisted to localStorage (keys prefixed with `erp_business_`).
import React, { useState, useEffect, useMemo } from 'react';

// ----- localStorage keys (all prefixed with erp_business_) -----
const LS = {
  products: 'erp_business_products',
  sales: 'erp_business_sales',
  customers: 'erp_business_customers',
  suppliers: 'erp_business_suppliers',
  expenses: 'erp_business_expenses',
  loyalty: 'erp_business_loyalty',          // manual loyalty ledger
  bills: 'erp_business_bills',              // recurring bills
  debts: 'erp_business_debts',              // debt payoff planner
  purchaseOrders: 'erp_business_purchase_orders',
  zReports: 'erp_business_z_reports',
};

// ----- Loyalty configuration -----
const LOYALTY_EARN_RATE = 1000;   // 1 point per 1000 UGX spent
const LOYALTY_REDEEM_RATE = 100;  // 1 point = 100 UGX discount
const LOYALTY_TIERS = [
  { name: 'Bronze',   min: 0,     color: '#a16207', bg: '#fef3c7' },
  { name: 'Silver',   min: 1000,  color: '#475569', bg: '#e2e8f0' },
  { name: 'Gold',     min: 5000,  color: '#b45309', bg: '#fef9c3' },
  { name: 'Platinum', min: 20000, color: '#6d28d9', bg: '#ede9fe' },
];
function tierForPoints(points) {
  let tier = LOYALTY_TIERS[0];
  for (const t of LOYALTY_TIERS) if (points >= t.min) tier = t;
  return tier;
}

// ----- Theme tokens -----
const NAVY = '#071b2f';
const GRAY = '#5f6368';
const NAVY_DARK_BG = '#071b2f';
const NAVY_BORDER = '#1a3550';

// ----- Format helpers -----
const fmtMoney = (n) => 'UGX ' + Number(Number(n) || 0).toLocaleString();
const fmtNum = (n) => Number(Number(n) || 0).toLocaleString();
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();
const monthStr = (d) => {
  const x = new Date(d);
  return x.toISOString().slice(0, 7);
};

// ----- localStorage helpers (always wrapped in try/catch) -----
function loadItems(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
}
function saveLS(key, items) {
  try { localStorage.setItem(key, JSON.stringify(items)); } catch (e) { /* quota or private mode */ }
}

// ----- Validation helpers (reject NaN, negative numbers, empty required fields) -----
const isNonEmptyStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isPosNum = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return false;
  const n = Number(s);
  return Number.isFinite(n) && n > 0;
};
const isNonNegNum = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return false;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0;
};

// ----- Confirmation wrapper for all destructive actions -----
function confirmDelete(msg = 'Delete this record?') {
  try { return window.confirm(msg); } catch (e) { return true; }
}

// ----- Tab definitions -----
const TABS = [
  { id: 'dashboard',     label: '📊 Dashboard' },
  { id: 'pos',           label: '🛒 POS' },
  { id: 'sales',         label: '💰 Sales' },
  { id: 'customers',     label: '👥 Customers' },
  { id: 'suppliers',     label: '🚚 Suppliers' },
  { id: 'products',      label: '📦 Products' },
  { id: 'expenses',      label: '🧾 Expenses' },
  { id: 'loyalty',       label: '🏆 Loyalty' },
  { id: 'bills',         label: '📆 Bills' },
  { id: 'debts',         label: '💳 Debts' },
  { id: 'purchaseOrders', label: '📑 POs' },
  { id: 'zreports',      label: '🧮 Z-Reports' },
  { id: 'pnl',           label: '📈 P&L' },
  { id: 'inventory',     label: '🏷️ Inventory Val.' },
];

// ----- Reusable styles -----
const inputStyle = {
  padding: 10, borderRadius: 6, border: '1px solid #ccc',
  fontSize: 14, boxSizing: 'border-box',
};
const primaryBtn = {
  padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0,
  borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14,
};
const successBtn = {
  padding: '10px 20px', background: '#0b8043', color: 'white', border: 0,
  borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14,
};
const warnBtn = {
  padding: '10px 20px', background: '#f9ab00', color: NAVY, border: 0,
  borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14,
};
const dangerBtn = {
  background: 'none', border: 0, color: '#d32f2f', cursor: 'pointer',
  fontSize: 18, padding: 4, lineHeight: 1,
};
const cardStyle = {
  background: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16,
};
const navyCard = {
  background: NAVY_DARK_BG, color: 'white', border: `1px solid ${NAVY_BORDER}`,
  borderRadius: 8, padding: 16,
};
const tableWrap = { overflowX: 'auto' };
const tableStyle = {
  width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600,
};
const thStyle = {
  textAlign: 'left', padding: '10px 12px', background: '#f5f5f5',
  borderBottom: '2px solid #e0e0e0', color: '#333', fontWeight: 700, fontSize: 12,
  textTransform: 'uppercase', letterSpacing: 0.4,
};
const tdStyle = {
  padding: '10px 12px', borderBottom: '1px solid #eee', color: '#222',
};
const emptyState = {
  textAlign: 'center', padding: 60, color: '#666', background: '#fafafa',
  borderRadius: 8,
};

export default function BusinessPortal() {
  // =================== COLLECTION STATE ===================
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loyalty, setLoyalty] = useState([]);
  const [bills, setBills] = useState([]);
  const [debts, setDebts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [zReports, setZReports] = useState([]);

  // =================== UI STATE ===================
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState('');

  // =================== POS STATE ===================
  const [cart, setCart] = useState([]);
  const [posProductId, setPosProductId] = useState('');
  const [posQty, setPosQty] = useState(1);
  const [posCustomerId, setPosCustomerId] = useState('');
  const [posPayment, setPosPayment] = useState('cash');
  const [posRedeemPoints, setPosRedeemPoints] = useState(false);

  // =================== PRODUCT FORM ===================
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pCost, setPCost] = useState('');
  const [pStock, setPStock] = useState('');
  const [pReorder, setPReorder] = useState('');
  const [pCategory, setPCategory] = useState('General');

  // =================== CUSTOMER FORM ===================
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');

  // =================== SUPPLIER FORM ===================
  const [sName, setSName] = useState('');
  const [sContact, setSContact] = useState('');
  const [sTerms, setSTerms] = useState('COD');

  // =================== EXPENSE FORM ===================
  const [eCategory, setECategory] = useState('Rent');
  const [eAmount, setEAmount] = useState('');
  const [eDate, setEDate] = useState(todayStr());
  const [eDesc, setEDesc] = useState('');

  // =================== LOYALTY ADJUSTMENT FORM ===================
  const [loyCid, setLoyCid] = useState('');
  const [loyDelta, setLoyDelta] = useState('');
  const [loyNote, setLoyNote] = useState('');

  // =================== BILL FORM ===================
  const [bName, setBName] = useState('');
  const [bAmount, setBAmount] = useState('');
  const [bDue, setBDue] = useState(todayStr());
  const [bFreq, setBFreq] = useState('monthly');
  const [bCat, setBCat] = useState('Utilities');

  // =================== DEBT FORM ===================
  const [dCreditor, setDCreditor] = useState('');
  const [dPrincipal, setDPrincipal] = useState('');
  const [dRate, setDRate] = useState('');
  const [dPayment, setDPayment] = useState('');
  const [dStart, setDStart] = useState(todayStr());
  const [debtMethod, setDebtMethod] = useState('avalanche');

  // =================== PURCHASE ORDER FORM ===================
  const [poSupplier, setPoSupplier] = useState('');
  const [poItems, setPoItems] = useState([]); // [{product_id, name, qty, unit_cost}]
  const [poProduct, setPoProduct] = useState('');
  const [poQty, setPoQty] = useState(1);
  const [poUnitCost, setPoUnitCost] = useState('');
  const [poDelivery, setPoDelivery] = useState('');

  // =================== Z-REPORT FORM ===================
  const [zDate, setZDate] = useState(todayStr());
  const [zOpening, setZOpening] = useState('');
  const [zCash, setZCash] = useState('');
  const [zCard, setZCard] = useState('');
  const [zMobile, setZMobile] = useState('');
  const [zRefunds, setZRefunds] = useState('');
  const [zClosing, setZClosing] = useState('');

  // =================== P&L FILTER ===================
  const [pnlMonth, setPnlMonth] = useState(monthStr(todayStr()));

  // =================== INITIAL LOAD ===================
  useEffect(() => {
    setProducts(loadItems(LS.products));
    setSales(loadItems(LS.sales));
    setCustomers(loadItems(LS.customers));
    setSuppliers(loadItems(LS.suppliers));
    setExpenses(loadItems(LS.expenses));
    setLoyalty(loadItems(LS.loyalty));
    setBills(loadItems(LS.bills));
    setDebts(loadItems(LS.debts));
    setPurchaseOrders(loadItems(LS.purchaseOrders));
    setZReports(loadItems(LS.zReports));
  }, []);

  // toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // ============================================================
  // PRODUCTS — now includes cost + reorder_level fields
  // ============================================================
  const addProduct = () => {
    if (!isNonEmptyStr(pName)) { setToast('⚠️ Product name is required'); return; }
    if (!isNonNegNum(pPrice)) { setToast('⚠️ Enter a valid selling price'); return; }
    if (!isNonNegNum(pCost))  { setToast('⚠️ Enter a valid cost price'); return; }
    if (!isNonNegNum(pStock)) { setToast('⚠️ Enter a valid stock quantity'); return; }
    const item = {
      id: Date.now(),
      name: pName.trim(),
      price: Number(pPrice),
      cost: Number(pCost) || 0,
      stock: Number(pStock) || 0,
      reorder_level: Number(pReorder) || 5,
      category: pCategory.trim() || 'General',
      created_at: nowISO(),
    };
    setProducts(prev => {
      const next = [item, ...prev];
      saveLS(LS.products, next);
      return next;
    });
    setPName(''); setPPrice(''); setPCost(''); setPStock(''); setPReorder(''); setPCategory('General');
    setToast('✅ Product added');
  };
  const deleteProduct = (id) => {
    if (!confirmDelete('Delete this product?')) return;
    setProducts(prev => {
      const next = prev.filter(p => p.id !== id);
      saveLS(LS.products, next);
      return next;
    });
  };

  // ============================================================
  // CUSTOMERS — points stored on the record (loyalty_points, lifetime_points)
  // ============================================================
  const addCustomer = () => {
    if (!isNonEmptyStr(cName)) { setToast('⚠️ Customer name is required'); return; }
    const item = {
      id: Date.now(),
      name: cName.trim(),
      phone: cPhone.trim(),
      email: cEmail.trim(),
      loyalty_points: 0,
      lifetime_points: 0,
      created_at: nowISO(),
    };
    setCustomers(prev => {
      const next = [item, ...prev];
      saveLS(LS.customers, next);
      return next;
    });
    setCName(''); setCPhone(''); setCEmail('');
    setToast('✅ Customer added');
  };
  const deleteCustomer = (id) => {
    if (!confirmDelete('Delete this customer and their loyalty history?')) return;
    setCustomers(prev => {
      const next = prev.filter(c => c.id !== id);
      saveLS(LS.customers, next);
      return next;
    });
  };
  const customerStats = useMemo(() => {
    const map = {};
    sales.forEach(s => {
      const cid = s.customer_id;
      if (!cid) return;
      if (!map[cid]) map[cid] = { orders: 0, total: 0, cogs: 0 };
      map[cid].orders += 1;
      map[cid].total += Number(s.total) || 0;
      map[cid].cogs += Number(s.cogs) || 0;
    });
    return map;
  }, [sales]);

  // ============================================================
  // SUPPLIERS
  // ============================================================
  const addSupplier = () => {
    if (!isNonEmptyStr(sName)) { setToast('⚠️ Supplier name is required'); return; }
    const item = {
      id: Date.now(),
      name: sName.trim(),
      contact: sContact.trim(),
      payment_terms: sTerms,
      created_at: nowISO(),
    };
    setSuppliers(prev => {
      const next = [item, ...prev];
      saveLS(LS.suppliers, next);
      return next;
    });
    setSName(''); setSContact(''); setSTerms('COD');
    setToast('✅ Supplier added');
  };
  const deleteSupplier = (id) => {
    if (!confirmDelete('Delete this supplier?')) return;
    setSuppliers(prev => {
      const next = prev.filter(s => s.id !== id);
      saveLS(LS.suppliers, next);
      return next;
    });
  };

  // ============================================================
  // EXPENSES
  // ============================================================
  const addExpense = () => {
    if (!isPosNum(eAmount)) { setToast('⚠️ Enter a valid positive amount'); return; }
    if (!isNonEmptyStr(eDate)) { setToast('⚠️ Pick an expense date'); return; }
    const item = {
      id: Date.now(),
      category: eCategory,
      amount: Number(eAmount),
      date: eDate || todayStr(),
      description: eDesc.trim(),
      created_at: nowISO(),
    };
    setExpenses(prev => {
      const next = [item, ...prev];
      saveLS(LS.expenses, next);
      return next;
    });
    setEAmount(''); setEDesc(''); setEDate(todayStr());
    setToast('✅ Expense recorded');
  };
  const deleteExpense = (id) => {
    if (!confirmDelete('Delete this expense?')) return;
    setExpenses(prev => {
      const next = prev.filter(e => e.id !== id);
      saveLS(LS.expenses, next);
      return next;
    });
  };

  // ============================================================
  // POS — cart, checkout, loyalty earn + redemption at checkout
  // ============================================================
  const selectedCustomer = customers.find(c => c.id === Number(posCustomerId)) || null;
  const customerPoints = selectedCustomer ? (Number(selectedCustomer.loyalty_points) || 0) : 0;
  const cartSubtotal = cart.reduce((sum, c) => sum + (Number(c.price) * c.qty), 0);
  const maxRedeemPts = Math.min(customerPoints, Math.floor(cartSubtotal / LOYALTY_REDEEM_RATE));
  const loyaltyDiscount = (posRedeemPoints && customerPoints > 0) ? maxRedeemPts * LOYALTY_REDEEM_RATE : 0;
  const cartTotal = Math.max(0, cartSubtotal - loyaltyDiscount);

  const addToCart = () => {
    const prod = products.find(p => p.id === Number(posProductId));
    if (!prod) { setToast('⚠️ Select a product'); return; }
    const qty = Math.max(1, Math.floor(Number(posQty)) || 1);
    if (!Number.isFinite(qty) || qty < 1) { setToast('⚠️ Invalid quantity'); return; }
    if (qty > prod.stock) { setToast(`⚠️ Only ${prod.stock} in stock`); return; }
    setCart(prev => {
      const existing = prev.find(c => c.product_id === prod.id);
      if (existing) {
        return prev.map(c => c.product_id === prod.id ? { ...c, qty: c.qty + qty } : c);
      }
      return [...prev, {
        product_id: prod.id, name: prod.name, price: prod.price,
        cost: Number(prod.cost) || 0, qty,
      }];
    });
    setPosProductId(''); setPosQty(1);
  };
  const updateCartQty = (pid, delta) => {
    setCart(prev => prev.map(c => c.product_id === pid ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
  };
  const removeFromCart = (pid) => setCart(prev => prev.filter(c => c.product_id !== pid));

  const checkout = () => {
    if (cart.length === 0) { setToast('⚠️ Cart is empty'); return; }
    if (cartTotal < 0) { setToast('⚠️ Cart total invalid'); return; }
    const cogs = cart.reduce((s, c) => s + (Number(c.cost) || 0) * c.qty, 0);
    const earnedPoints = Math.floor(cartTotal / LOYALTY_EARN_RATE);
    const redeemedPts = posRedeemPoints ? maxRedeemPts : 0;
    const sale = {
      id: Date.now(),
      date: todayStr(),
      ts: nowISO(),
      month: monthStr(todayStr()),
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      customer_name: selectedCustomer ? selectedCustomer.name : 'Walk-in',
      items: cart.map(c => ({ ...c })),
      subtotal: cartSubtotal,
      loyalty_discount: loyaltyDiscount,
      total: cartTotal,
      cogs,
      gross_profit: cartTotal - cogs,
      payment_method: posPayment,
      points_earned: earnedPoints,
      points_redeemed: redeemedPts,
    };
    setSales(prev => {
      const next = [sale, ...prev];
      saveLS(LS.sales, next);
      return next;
    });
    // reduce product stock functionally
    setProducts(prev => {
      const next = prev.map(p => {
        const ci = cart.find(c => c.product_id === p.id);
        return ci ? { ...p, stock: Math.max(0, p.stock - ci.qty) } : p;
      });
      saveLS(LS.products, next);
      return next;
    });
    // accrue loyalty points on customer
    if (selectedCustomer) {
      setCustomers(prev => {
        const next = prev.map(c => c.id === selectedCustomer.id ? {
          ...c,
          loyalty_points: Math.max(0, (Number(c.loyalty_points) || 0) + earnedPoints - redeemedPts),
          lifetime_points: (Number(c.lifetime_points) || 0) + earnedPoints,
        } : c);
        saveLS(LS.customers, next);
        return next;
      });
    }
    setCart([]); setPosCustomerId(''); setPosPayment('cash'); setPosRedeemPoints(false);
    setToast(`✅ Sale completed! Earned ${earnedPoints} pts`);
  };
  const deleteSale = (id) => {
    if (!confirmDelete('Delete this sale record? Stock will not be restored.')) return;
    setSales(prev => {
      const next = prev.filter(s => s.id !== id);
      saveLS(LS.sales, next);
      return next;
    });
  };

  // ============================================================
  // LOYALTY — manual adjustments ledger + tier overview
  // ============================================================
  const addLoyaltyAdjustment = () => {
    if (!loyCid) { setToast('⚠️ Select a customer'); return; }
    if (!isPosNum(loyDelta.replace('-', ''))) { setToast('⚠️ Enter valid points'); return; }
    const delta = Math.trunc(Number(loyDelta));
    if (!Number.isFinite(delta) || delta === 0) { setToast('⚠️ Points delta cannot be 0'); return; }
    const entry = {
      id: Date.now(),
      customer_id: Number(loyCid),
      delta,
      note: loyNote.trim() || (delta >= 0 ? 'Manual credit' : 'Manual debit'),
      created_at: nowISO(),
    };
    setLoyalty(prev => {
      const next = [entry, ...prev];
      saveLS(LS.loyalty, next);
      return next;
    });
    setCustomers(prev => {
      const next = prev.map(c => c.id === Number(loyCid) ? {
        ...c,
        loyalty_points: Math.max(0, (Number(c.loyalty_points) || 0) + delta),
        lifetime_points: (Number(c.lifetime_points) || 0) + Math.max(0, delta),
      } : c);
      saveLS(LS.customers, next);
      return next;
    });
    setLoyCid(''); setLoyDelta(''); setLoyNote('');
    setToast(`✅ ${delta >= 0 ? '+' : ''}${delta} pts applied`);
  };
  const deleteLoyalty = (id) => {
    if (!confirmDelete('Delete this loyalty ledger entry? Customer balance will not auto-revert.')) return;
    setLoyalty(prev => {
      const next = prev.filter(e => e.id !== id);
      saveLS(LS.loyalty, next);
      return next;
    });
  };

  // ============================================================
  // BILL REMINDERS — recurring bills with next-due auto-advance
  // ============================================================
  const FREQUENCY_DAYS = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365 };
  const advanceDate = (iso, freq) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + (FREQUENCY_DAYS[freq] || 30));
    return d.toISOString().slice(0, 10);
  };
  const addBill = () => {
    if (!isNonEmptyStr(bName)) { setToast('⚠️ Bill name required'); return; }
    if (!isPosNum(bAmount)) { setToast('⚠️ Enter valid amount'); return; }
    if (!isNonEmptyStr(bDue)) { setToast('⚠️ Pick a due date'); return; }
    const item = {
      id: Date.now(),
      name: bName.trim(),
      amount: Number(bAmount),
      due_date: bDue,
      frequency: bFreq,
      category: bCat,
      paid: false,
      created_at: nowISO(),
    };
    setBills(prev => {
      const next = [item, ...prev];
      saveLS(LS.bills, next);
      return next;
    });
    setBName(''); setBAmount(''); setBDue(todayStr()); setBFreq('monthly'); setBCat('Utilities');
    setToast('✅ Bill added');
  };
  const markBillPaid = (id) => {
    setBills(prev => {
      const next = prev.map(b => b.id === id ? {
        ...b,
        paid: true,
        paid_at: nowISO(),
        due_date: advanceDate(b.due_date, b.frequency),
      } : b);
      saveLS(LS.bills, next);
      return next;
    });
    setToast('✅ Bill marked paid — next occurrence scheduled');
  };
  const markBillUnpaid = (id) => {
    setBills(prev => {
      const next = prev.map(b => b.id === id ? { ...b, paid: false, paid_at: null } : b);
      saveLS(LS.bills, next);
      return next;
    });
  };
  const deleteBill = (id) => {
    if (!confirmDelete('Delete this bill?')) return;
    setBills(prev => {
      const next = prev.filter(b => b.id !== id);
      saveLS(LS.bills, next);
      return next;
    });
  };
  const billAlerts = useMemo(() => {
    const today = new Date(todayStr());
    return bills.filter(b => !b.paid && (new Date(b.due_date) - today) <= 7 * 86400000);
  }, [bills]);

  // ============================================================
  // DEBT PAYOFF PLANNER — snowball vs avalanche
  // ============================================================
  const addDebt = () => {
    if (!isNonEmptyStr(dCreditor)) { setToast('⚠️ Creditor name required'); return; }
    if (!isPosNum(dPrincipal)) { setToast('⚠️ Enter valid principal'); return; }
    if (!isNonNegNum(dRate)) { setToast('⚠️ Enter valid interest rate %'); return; }
    if (!isPosNum(dPayment)) { setToast('⚠️ Enter valid monthly payment'); return; }
    if (!isNonEmptyStr(dStart)) { setToast('⚠️ Pick a start date'); return; }
    const principal = Number(dPrincipal);
    const rate = Number(dRate);
    const payment = Number(dPayment);
    if (rate > 0 && payment <= principal * (rate / 100 / 12)) {
      setToast('⚠️ Payment too small to cover interest'); return;
    }
    const item = {
      id: Date.now(),
      creditor: dCreditor.trim(),
      principal,
      original_principal: principal,
      interest_rate: rate,
      monthly_payment: payment,
      start_date: dStart,
      created_at: nowISO(),
    };
    setDebts(prev => {
      const next = [item, ...prev];
      saveLS(LS.debts, next);
      return next;
    });
    setDCreditor(''); setDPrincipal(''); setDRate(''); setDPayment(''); setDStart(todayStr());
    setToast('✅ Debt added');
  };
  const deleteDebt = (id) => {
    if (!confirmDelete('Delete this debt record?')) return;
    setDebts(prev => {
      const next = prev.filter(d => d.id !== id);
      saveLS(LS.debts, next);
      return next;
    });
  };
  // Project amortisation payoff for a single debt
  const projectDebt = (d) => {
    const monthlyRate = d.interest_rate / 100 / 12;
    let balance = d.principal;
    let totalInterest = 0;
    let months = 0;
    const start = new Date(d.start_date);
    while (balance > 0 && months < 600) {
      const interest = balance * monthlyRate;
      const principalPortion = d.monthly_payment - interest;
      if (principalPortion <= 0) break;
      const applied = Math.min(principalPortion, balance);
      totalInterest += interest;
      balance -= applied;
      months += 1;
    }
    const payoffDate = new Date(start);
    payoffDate.setMonth(payoffDate.getMonth() + months);
    return {
      remaining: Math.max(0, balance),
      months,
      payoff_date: payoffDate.toISOString().slice(0, 10),
      total_interest: totalInterest,
    };
  };
  const debtProjections = useMemo(() => debts.map(d => ({ ...d, projection: projectDebt(d) })), [debts]);
  const debtPayoffOrder = useMemo(() => {
    const arr = [...debtProjections];
    if (debtMethod === 'snowball') {
      arr.sort((a, b) => a.principal - b.principal);
    } else {
      arr.sort((a, b) => b.interest_rate - a.interest_rate);
    }
    return arr;
  }, [debtProjections, debtMethod]);
  const totalDebtPrincipal = debts.reduce((s, d) => s + d.principal, 0);
  const totalDebtInterest = debtProjections.reduce((s, d) => s + d.projection.total_interest, 0);

  // ============================================================
  // PURCHASE ORDERS — to suppliers; receiving auto-adds stock
  // ============================================================
  const addPoLine = () => {
    const prod = products.find(p => p.id === Number(poProduct));
    if (!prod) { setToast('⚠️ Select a product'); return; }
    const qty = Math.max(1, Math.floor(Number(poQty)) || 1);
    if (!Number.isFinite(qty) || qty < 1) { setToast('⚠️ Invalid qty'); return; }
    const uc = Number(poUnitCost);
    if (!Number.isFinite(uc) || uc < 0) { setToast('⚠️ Invalid unit cost'); return; }
    setPoItems(prev => {
      const existing = prev.find(i => i.product_id === prod.id);
      if (existing) {
        return prev.map(i => i.product_id === prod.id ? { ...i, qty: i.qty + qty, unit_cost: uc } : i);
      }
      return [...prev, { product_id: prod.id, name: prod.name, qty, unit_cost: uc }];
    });
    setPoProduct(''); setPoQty(1); setPoUnitCost('');
  };
  const removePoLine = (pid) => setPoItems(prev => prev.filter(i => i.product_id !== pid));
  const poTotal = poItems.reduce((s, i) => s + i.qty * i.unit_cost, 0);

  const savePO = (status = 'Draft') => {
    if (!poSupplier) { setToast('⚠️ Select a supplier'); return; }
    if (poItems.length === 0) { setToast('⚠️ Add at least one line item'); return; }
    const supplier = suppliers.find(s => s.id === Number(poSupplier));
    const po = {
      id: Date.now(),
      po_number: 'PO-' + Date.now().toString().slice(-6),
      supplier_id: supplier ? supplier.id : null,
      supplier_name: supplier ? supplier.name : 'Unknown',
      items: poItems.map(i => ({ ...i })),
      total: poTotal,
      status,
      delivery_date: poDelivery || '',
      created_at: nowISO(),
    };
    setPurchaseOrders(prev => {
      const next = [po, ...prev];
      saveLS(LS.purchaseOrders, next);
      return next;
    });
    setPoSupplier(''); setPoItems([]); setPoDelivery('');
    setToast(`✅ PO ${po.po_number} saved as ${status}`);
  };
  const setPoStatus = (id, status) => {
    setPurchaseOrders(prev => {
      const next = prev.map(p => p.id === id ? { ...p, status } : p);
      saveLS(LS.purchaseOrders, next);
      return next;
    });
    if (status === 'Received') {
      const po = purchaseOrders.find(p => p.id === id);
      if (po) {
        setProducts(prev => {
          const next = prev.map(p => {
            const li = po.items.find(i => i.product_id === p.id);
            return li ? { ...p, stock: p.stock + li.qty } : p;
          });
          saveLS(LS.products, next);
          return next;
        });
        setToast('✅ PO received — stock updated');
      }
    } else {
      setToast(`PO marked ${status}`);
    }
  };
  const deletePO = (id) => {
    if (!confirmDelete('Delete this purchase order?')) return;
    setPurchaseOrders(prev => {
      const next = prev.filter(p => p.id !== id);
      saveLS(LS.purchaseOrders, next);
      return next;
    });
  };

  // ============================================================
  // Z-REPORTS — end-of-day cash reconciliation
  // ============================================================
  const todaySalesByMethod = useMemo(() => {
    const m = { cash: 0, card: 0, mobile: 0, credit: 0 };
    sales.filter(s => s.date === zDate).forEach(s => {
      m[s.payment_method] = (m[s.payment_method] || 0) + Number(s.total);
    });
    return m;
  }, [sales, zDate]);
  const autofillZ = () => {
    setZCash(String(Math.round(todaySalesByMethod.cash)));
    setZCard(String(Math.round(todaySalesByMethod.card)));
    setZMobile(String(Math.round(todaySalesByMethod.mobile)));
    setToast("✅ Autofilled from today's sales");
  };
  const zVariance = useMemo(() => {
    const opening = Number(zOpening) || 0;
    const cash = Number(zCash) || 0;
    const card = Number(zCard) || 0;
    const mobile = Number(zMobile) || 0;
    const refunds = Number(zRefunds) || 0;
    const closing = Number(zClosing) || 0;
    return closing - (opening + cash + card + mobile - refunds);
  }, [zOpening, zCash, zCard, zMobile, zRefunds, zClosing]);
  const saveZReport = () => {
    if (!isNonEmptyStr(zDate)) { setToast('⚠️ Pick a date'); return; }
    if (!isNonNegNum(zClosing)) { setToast('⚠️ Enter closing cash'); return; }
    const report = {
      id: Date.now(),
      date: zDate,
      opening_cash: Number(zOpening) || 0,
      cash_sales: Number(zCash) || 0,
      card_sales: Number(zCard) || 0,
      mobile_sales: Number(zMobile) || 0,
      refunds: Number(zRefunds) || 0,
      closing_cash: Number(zClosing) || 0,
      variance: zVariance,
      created_at: nowISO(),
    };
    setZReports(prev => {
      const next = [report, ...prev.filter(r => r.date !== zDate)];
      saveLS(LS.zReports, next);
      return next;
    });
    setToast(`✅ Z-Report saved — variance ${fmtMoney(zVariance)}`);
  };
  const deleteZReport = (id) => {
    if (!confirmDelete('Delete this Z-Report?')) return;
    setZReports(prev => {
      const next = prev.filter(r => r.id !== id);
      saveLS(LS.zReports, next);
      return next;
    });
  };

  // ============================================================
  // DASHBOARD METRICS — FIX: net profit subtracts COGS; inventory uses cost
  // ============================================================
  const todaySales = useMemo(() => sales.filter(s => s.date === todayStr()), [sales]);
  const todayExpenses = useMemo(() => expenses.filter(e => e.date === todayStr()), [expenses]);
  const totalSalesToday = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalCogsToday = todaySales.reduce((sum, s) => sum + (Number(s.cogs) || 0), 0);
  const grossProfitToday = totalSalesToday - totalCogsToday;
  const totalExpensesToday = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  // FIX: net profit now subtracts COGS (gross profit) AND operating expenses
  const netProfitToday = grossProfitToday - totalExpensesToday;
  // FIX: inventory value uses COST price, not selling price
  const inventoryValue = products.reduce((sum, p) => sum + ((Number(p.cost) || 0) * (Number(p.stock) || 0)), 0);
  const inventoryRetail = products.reduce((sum, p) => sum + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0);
  const productsMissingCost = products.filter(p => !Number.isFinite(Number(p.cost)) || Number(p.cost) === 0).length;
  const lowStock = products.filter(p => p.stock <= (Number(p.reorder_level) || 5));
  const allTimeSales = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const allTimeExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const allTimeCogs = sales.reduce((sum, s) => sum + (Number(s.cogs) || 0), 0);

  // ============================================================
  // P&L — monthly report (revenue by category, COGS, GP, opex, NP)
  // ============================================================
  const pnlData = useMemo(() => {
    const monthSales = sales.filter(s => (s.month || monthStr(s.date)) === pnlMonth);
    const monthExpenses = expenses.filter(e => monthStr(e.date) === pnlMonth);
    const revenue = monthSales.reduce((s, x) => s + Number(x.total), 0);
    const cogs = monthSales.reduce((s, x) => s + (Number(x.cogs) || 0), 0);
    const grossProfit = revenue - cogs;
    const opex = monthExpenses.reduce((s, x) => s + Number(x.amount), 0);
    const netProfit = grossProfit - opex;
    // revenue by product category
    const byCat = {};
    monthSales.forEach(s => {
      (s.items || []).forEach(i => {
        const prod = products.find(p => p.id === i.product_id);
        const cat = prod?.category || 'Uncategorised';
        if (!byCat[cat]) byCat[cat] = { revenue: 0, cogs: 0, qty: 0 };
        byCat[cat].revenue += Number(i.price) * i.qty;
        byCat[cat].cogs += (Number(i.cost) || 0) * i.qty;
        byCat[cat].qty += i.qty;
      });
    });
    const opexByCat = {};
    monthExpenses.forEach(e => {
      opexByCat[e.category] = (opexByCat[e.category] || 0) + Number(e.amount);
    });
    return {
      revenue, cogs, grossProfit, opex, netProfit,
      byCat: Object.entries(byCat).map(([name, v]) => ({ name, ...v })),
      opexByCat: Object.entries(opexByCat).map(([name, amount]) => ({ name, amount })),
      txCount: monthSales.length,
    };
  }, [sales, expenses, pnlMonth, products]);
  const maxCatRevenue = Math.max(1, ...pnlData.byCat.map(c => c.revenue));

  // ============================================================
  // INVENTORY VALUATION — reorder suggestions
  // ============================================================
  const reorderSuggestions = useMemo(() => products
    .filter(p => p.stock <= (Number(p.reorder_level) || 5))
    .map(p => ({
      ...p,
      suggested_reorder: Math.max(10, (Number(p.reorder_level) || 5) * 3 - p.stock),
    })), [products]);

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderTabs = () => (
    <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          style={{
            padding: '10px 16px',
            border: tab === t.id ? '1px solid #1a73e8' : '1px solid #ccc',
            background: tab === t.id ? '#1a73e8' : 'white',
            color: tab === t.id ? 'white' : '#333',
            borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const renderToast = () => toast ? (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      background: NAVY_DARK_BG, color: 'white',
      padding: '12px 20px', borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      zIndex: 1000, fontSize: 14, fontWeight: 500,
    }}>{toast}</div>
  ) : null;

  // ---- Dashboard ----
  const renderDashboard = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderTop: '4px solid #0b8043' }}>
          <div style={{ fontSize: 12, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today&apos;s Sales</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0b8043', marginTop: 6 }}>{fmtMoney(totalSalesToday)}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{todaySales.length} transactions</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #1a73e8' }}>
          <div style={{ fontSize: 12, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5 }}>Gross Profit Today</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#1a73e8', marginTop: 6 }}>{fmtMoney(grossProfitToday)}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Sales − COGS ({fmtMoney(totalCogsToday)})</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #d32f2f' }}>
          <div style={{ fontSize: 12, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today&apos;s Opex</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#d32f2f', marginTop: 6 }}>{fmtMoney(totalExpensesToday)}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{todayExpenses.length} entries</div>
        </div>
        <div style={{ ...cardStyle, borderTop: `4px solid ${netProfitToday >= 0 ? '#0b8043' : '#f9ab00'}` }}>
          <div style={{ fontSize: 12, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5 }}>Net Profit Today</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: netProfitToday >= 0 ? '#0b8043' : '#f9ab00', marginTop: 6 }}>{fmtMoney(netProfitToday)}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Gross Profit − Opex</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #7c4dff' }}>
          <div style={{ fontSize: 12, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5 }}>Inventory Value (Cost)</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#7c4dff', marginTop: 6 }}>{fmtMoney(inventoryValue)}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Retail: {fmtMoney(inventoryRetail)}</div>
        </div>
      </div>

      {productsMissingCost > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16, background: '#fff8e1', borderLeft: '4px solid #f9ab00' }}>
          <strong>⚠️ {productsMissingCost} product(s) have no cost price set.</strong>{' '}
          Visit the Products tab to add cost prices for accurate COGS / profit calculations.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>📈 All-Time Summary</h3>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>Total Sales</span><strong style={{ color: '#0b8043' }}>{fmtMoney(allTimeSales)}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>COGS</span><strong style={{ color: '#7c4dff' }}>{fmtMoney(allTimeCogs)}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>Gross Profit</span><strong style={{ color: '#1a73e8' }}>{fmtMoney(allTimeSales - allTimeCogs)}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>Total Opex</span><strong style={{ color: '#d32f2f' }}>{fmtMoney(allTimeExpenses)}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span>Net Balance</span><strong style={{ color: (allTimeSales - allTimeCogs - allTimeExpenses) >= 0 ? '#0b8043' : '#d32f2f' }}>{fmtMoney(allTimeSales - allTimeCogs - allTimeExpenses)}</strong>
          </div>
        </div>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>🏢 Business Snapshot</h3>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>Customers</span><strong>{customers.length}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>Suppliers</span><strong>{suppliers.length}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>Open Purchase Orders</span><strong>{purchaseOrders.filter(p => p.status !== 'Received').length}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>Unpaid Bills</span><strong style={{ color: bills.filter(b => !b.paid).length ? '#d32f2f' : '#0b8043' }}>{bills.filter(b => !b.paid).length}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span>Outstanding Debts</span><strong>{fmtMoney(totalDebtPrincipal)}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>🕒 Recent Sales</h3>
          {sales.length === 0 ? (
            <div style={{ fontSize: 13, color: '#999', padding: 16, textAlign: 'center' }}>No sales recorded yet.</div>
          ) : sales.slice(0, 5).map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #eee', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{s.customer_name}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{new Date(s.ts || s.date).toLocaleString()} • {s.items?.length || 0} items</div>
              </div>
              <div style={{ fontWeight: 700, color: '#0b8043' }}>{fmtMoney(s.total)}</div>
            </div>
          ))}
        </div>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>⚠️ Low Stock Alerts</h3>
          {lowStock.length === 0 ? (
            <div style={{ fontSize: 13, color: '#999', padding: 16, textAlign: 'center' }}>All products well stocked. 🎉</div>
          ) : lowStock.slice(0, 8).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #eee', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#999' }}>{p.category}</div>
              </div>
              <div style={{ fontWeight: 700, color: p.stock === 0 ? '#d32f2f' : '#f9ab00' }}>
                {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- POS (with loyalty redemption) ----
  const renderPOS = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>🛒 Add to Cart</h3>
        {products.length === 0 ? (
          <p style={{ fontSize: 13, color: '#999' }}>No products in inventory. Add products first in the Products tab.</p>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Product</label>
              <select value={posProductId} onChange={e => setPosProductId(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                <option value="">— Select product —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock === 0}>
                    {p.name} — {fmtMoney(p.price)} ({p.stock} in stock){p.stock === 0 ? ' [OUT]' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Qty</label>
                <input type="number" min="1" value={posQty} onChange={e => setPosQty(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <button onClick={addToCart} style={primaryBtn}>+ Add</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Customer (optional)</label>
                <select value={posCustomerId} onChange={e => { setPosCustomerId(e.target.value); setPosRedeemPoints(false); }} style={{ ...inputStyle, width: '100%' }}>
                  <option value="">Walk-in customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.loyalty_points || 0} pts)</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Payment</label>
                <select value={posPayment} onChange={e => setPosPayment(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="mobile">📱 Mobile Money</option>
                  <option value="credit">🧾 Credit</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={navyCard}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: 'white' }}>🧾 Current Cart</h3>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#9bb3c9' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
            <p style={{ margin: 0, fontSize: 13 }}>Cart is empty. Add products to begin.</p>
          </div>
        ) : (
          <>
            {cart.map(c => (
              <div key={c.product_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${NAVY_BORDER}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#9bb3c9' }}>{fmtMoney(c.price)} × {c.qty}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => updateCartQty(c.product_id, -1)} style={{ background: NAVY_BORDER, color: 'white', border: 0, borderRadius: 4, width: 24, height: 24, cursor: 'pointer' }}>−</button>
                  <span style={{ minWidth: 24, textAlign: 'center', fontSize: 13 }}>{c.qty}</span>
                  <button onClick={() => updateCartQty(c.product_id, +1)} style={{ background: NAVY_BORDER, color: 'white', border: 0, borderRadius: 4, width: 24, height: 24, cursor: 'pointer' }}>+</button>
                </div>
                <div style={{ minWidth: 90, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{fmtMoney(c.price * c.qty)}</div>
                <button onClick={() => removeFromCart(c.product_id)} style={{ background: 'none', border: 0, color: '#ff8a8a', cursor: 'pointer', fontSize: 18, padding: 0, marginLeft: 4 }}>×</button>
              </div>
            ))}

            <div style={{ fontSize: 12, color: '#9bb3c9', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${NAVY_BORDER}`, display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal</span><span>{fmtMoney(cartSubtotal)}</span>
            </div>

            {selectedCustomer && customerPoints > 0 && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9bb3c9', cursor: 'pointer' }}>
                  <input type="checkbox" checked={posRedeemPoints} onChange={e => setPosRedeemPoints(e.target.checked)} />
                  Redeem {maxRedeemPts} pts (−{fmtMoney(loyaltyDiscount)}) — balance: {customerPoints} pts
                </label>
              </div>
            )}
            {loyaltyDiscount > 0 && (
              <div style={{ fontSize: 12, color: '#5fd97a', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span>Loyalty discount</span><span>−{fmtMoney(loyaltyDiscount)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `2px solid ${NAVY_BORDER}` }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>TOTAL</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#5fd97a' }}>{fmtMoney(cartTotal)}</span>
            </div>
            <button onClick={checkout} style={{ ...successBtn, width: '100%', marginTop: 12, padding: 14 }}>✅ Checkout — {fmtMoney(cartTotal)}</button>
            {selectedCustomer && (
              <div style={{ fontSize: 11, color: '#9bb3c9', textAlign: 'center', marginTop: 8 }}>
                Will earn ~{Math.floor(cartTotal / LOYALTY_EARN_RATE)} pts · {tierForPoints(selectedCustomer.lifetime_points || 0).name} member
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ---- Sales ----
  const renderSales = () => (
    <div>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, color: NAVY }}>💰 Recent Sales</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#999' }}>{sales.length} total sales • All-time total: {fmtMoney(allTimeSales)} • COGS: {fmtMoney(allTimeCogs)}</p>
        {sales.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
            <p>No sales yet. Record your first sale from the POS tab.</p>
          </div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Items</th>
                  <th style={thStyle}>Payment</th>
                  <th style={thStyle}>COGS</th>
                  <th style={thStyle}>Gross Profit</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Pts</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td style={tdStyle}>{new Date(s.ts || s.date).toLocaleString()}</td>
                    <td style={tdStyle}>{s.customer_name}</td>
                    <td style={tdStyle}>{s.items?.length || 0}</td>
                    <td style={tdStyle}><span style={{ background: '#eef3fe', color: '#1a73e8', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{s.payment_method}</span></td>
                    <td style={{ ...tdStyle, color: '#7c4dff' }}>{fmtMoney(s.cogs || 0)}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#1a73e8' }}>{fmtMoney(s.gross_profit || (s.total - (s.cogs || 0)))}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#0b8043' }}>{fmtMoney(s.total)}</td>
                    <td style={tdStyle}>+{s.points_earned || 0}{s.points_redeemed ? ` / −${s.points_redeemed}` : ''}</td>
                    <td style={tdStyle}><button onClick={() => deleteSale(s.id)} style={dangerBtn}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ---- Customers (with loyalty column) ----
  const renderCustomers = () => (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>➕ Add Customer</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Full name *" value={cName} onChange={e => setCName(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
          <input type="tel" placeholder="Phone" value={cPhone} onChange={e => setCPhone(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input type="email" placeholder="Email" value={cEmail} onChange={e => setCEmail(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
          <button onClick={addCustomer} style={primaryBtn}>+ Add</button>
        </div>
      </div>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>👥 Customers ({customers.length})</h3>
        {customers.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <p>No customers yet. Add your first customer above.</p>
          </div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Tier</th>
                  <th style={thStyle}>Points</th>
                  <th style={thStyle}>Orders</th>
                  <th style={thStyle}>Total Purchases</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const stats = customerStats[c.id] || { orders: 0, total: 0 };
                  const tier = tierForPoints(c.lifetime_points || 0);
                  return (
                    <tr key={c.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name}</td>
                      <td style={tdStyle}>{c.phone || '—'}</td>
                      <td style={tdStyle}>{c.email || '—'}</td>
                      <td style={tdStyle}>
                        <span style={{ background: tier.bg, color: tier.color, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{tier.name}</span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{c.loyalty_points || 0}</td>
                      <td style={tdStyle}>{stats.orders}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#0b8043' }}>{fmtMoney(stats.total)}</td>
                      <td style={tdStyle}><button onClick={() => deleteCustomer(c.id)} style={dangerBtn}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ---- Suppliers ----
  const renderSuppliers = () => (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>➕ Add Supplier</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Supplier name *" value={sName} onChange={e => setSName(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
          <input type="text" placeholder="Contact person / phone" value={sContact} onChange={e => setSContact(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
          <select value={sTerms} onChange={e => setSTerms(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }}>
            <option value="COD">COD (Cash on Delivery)</option>
            <option value="Prepaid">Prepaid</option>
            <option value="Net 7">Net 7</option>
            <option value="Net 14">Net 14</option>
            <option value="Net 30">Net 30</option>
            <option value="Net 60">Net 60</option>
          </select>
          <button onClick={addSupplier} style={primaryBtn}>+ Add</button>
        </div>
      </div>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>🚚 Suppliers ({suppliers.length})</h3>
        {suppliers.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚚</div>
            <p>No suppliers yet. Add your first supplier above.</p>
          </div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Payment Terms</th>
                  <th style={thStyle}>Added</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{s.name}</td>
                    <td style={tdStyle}>{s.contact || '—'}</td>
                    <td style={tdStyle}><span style={{ background: '#fff3e0', color: '#e65100', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{s.payment_terms}</span></td>
                    <td style={tdStyle}>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td style={tdStyle}><button onClick={() => deleteSupplier(s.id)} style={dangerBtn}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ---- Products (with cost + reorder level) ----
  const renderProducts = () => (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>➕ Add Product</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Product name *" value={pName} onChange={e => setPName(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
          <input type="text" placeholder="Category" value={pCategory} onChange={e => setPCategory(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input type="number" min="0" step="any" placeholder="Cost (UGX) *" value={pCost} onChange={e => setPCost(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 130 }} />
          <input type="number" min="0" step="any" placeholder="Price (UGX) *" value={pPrice} onChange={e => setPPrice(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 130 }} />
          <input type="number" min="0" placeholder="Stock qty *" value={pStock} onChange={e => setPStock(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 110 }} />
          <input type="number" min="0" placeholder="Reorder lvl" value={pReorder} onChange={e => setPReorder(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 110 }} />
          <button onClick={addProduct} style={primaryBtn}>+ Add</button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#999' }}>Cost price is used for COGS, profit & inventory valuation. Reorder level defaults to 5.</p>
      </div>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>📦 Products ({products.length})</h3>
        {products.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p>No products yet. Add your first product above.</p>
          </div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Cost</th>
                  <th style={thStyle}>Price</th>
                  <th style={thStyle}>Margin</th>
                  <th style={thStyle}>Stock</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const cost = Number(p.cost) || 0;
                  const price = Number(p.price) || 0;
                  const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
                  return (
                    <tr key={p.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                      <td style={tdStyle}>{p.category}</td>
                      <td style={{ ...tdStyle, color: '#7c4dff' }}>{fmtMoney(cost)}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtMoney(price)}</td>
                      <td style={{ ...tdStyle, color: margin >= 30 ? '#0b8043' : margin > 0 ? '#f9ab00' : '#d32f2f' }}>{cost > 0 ? `${margin}%` : '—'}</td>
                      <td style={tdStyle}>{p.stock}</td>
                      <td style={tdStyle}>
                        {p.stock === 0 ? (
                          <span style={{ background: '#fdecea', color: '#d32f2f', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>OUT OF STOCK</span>
                        ) : p.stock <= (Number(p.reorder_level) || 5) ? (
                          <span style={{ background: '#fff8e1', color: '#e65100', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>LOW</span>
                        ) : (
                          <span style={{ background: '#e8f5e9', color: '#0b8043', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>OK</span>
                        )}
                      </td>
                      <td style={tdStyle}><button onClick={() => deleteProduct(p.id)} style={dangerBtn}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ---- Expenses ----
  const renderExpenses = () => (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>➕ Add Expense</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={eCategory} onChange={e => setECategory(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }}>
            <option value="Rent">🏢 Rent</option>
            <option value="Utilities">💡 Utilities</option>
            <option value="Salaries">👥 Salaries</option>
            <option value="Inventory">📦 Inventory</option>
            <option value="Transport">🚚 Transport</option>
            <option value="Marketing">📢 Marketing</option>
            <option value="Maintenance">🔧 Maintenance</option>
            <option value="Misc">📌 Misc</option>
          </select>
          <input type="number" min="0" step="any" placeholder="Amount (UGX) *" value={eAmount} onChange={e => setEAmount(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input type="date" value={eDate} onChange={e => setEDate(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input type="text" placeholder="Description (optional)" value={eDesc} onChange={e => setEDesc(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
          <button onClick={addExpense} style={primaryBtn}>+ Add</button>
        </div>
      </div>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>🧾 Expenses ({expenses.length}) • Total: {fmtMoney(allTimeExpenses)}</h3>
        {expenses.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
            <p>No expenses yet. Record your first expense above.</p>
          </div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td style={tdStyle}>{new Date(e.date).toLocaleDateString()}</td>
                    <td style={tdStyle}><span style={{ background: '#eef3fe', color: '#1a73e8', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{e.category}</span></td>
                    <td style={tdStyle}>{e.description || '—'}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#d32f2f' }}>{fmtMoney(e.amount)}</td>
                    <td style={tdStyle}><button onClick={() => deleteExpense(e.id)} style={dangerBtn}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ---- Loyalty ----
  const renderLoyalty = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {LOYALTY_TIERS.map(t => {
          const count = customers.filter(c => (c.lifetime_points || 0) >= t.min).length;
          return (
            <div key={t.name} style={{ ...cardStyle, borderTop: `4px solid ${t.color}` }}>
              <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>{t.name}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: t.color, marginTop: 4 }}>{count}</div>
              <div style={{ fontSize: 11, color: '#999' }}>{t.min}+ pts</div>
            </div>
          );
        })}
      </div>

      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>⚖️ Manual Adjustment</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={loyCid} onChange={e => setLoyCid(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }}>
            <option value="">— Select customer —</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.loyalty_points || 0} pts)</option>)}
          </select>
          <input type="number" placeholder="Δ points (e.g. 50 or -20)" value={loyDelta} onChange={e => setLoyDelta(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <input type="text" placeholder="Note (optional)" value={loyNote} onChange={e => setLoyNote(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
          <button onClick={addLoyaltyAdjustment} style={primaryBtn}>Apply</button>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#999' }}>Earn rate: 1 pt / {fmtMoney(LOYALTY_EARN_RATE)} spent · Redeem rate: 1 pt = {fmtMoney(LOYALTY_REDEEM_RATE)}</p>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>📋 Loyalty Ledger ({loyalty.length})</h3>
        {loyalty.length === 0 ? (
          <div style={emptyState}><div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div><p>No manual adjustments yet.</p></div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>When</th>
                  <th style={thStyle}>Customer</th>
                  <th style={thStyle}>Δ Pts</th>
                  <th style={thStyle}>Note</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loyalty.map(e => {
                  const c = customers.find(x => x.id === e.customer_id);
                  return (
                    <tr key={e.id}>
                      <td style={tdStyle}>{new Date(e.created_at).toLocaleString()}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{c?.name || '—'}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: e.delta >= 0 ? '#0b8043' : '#d32f2f' }}>{e.delta >= 0 ? '+' : ''}{e.delta}</td>
                      <td style={tdStyle}>{e.note}</td>
                      <td style={tdStyle}><button onClick={() => deleteLoyalty(e.id)} style={dangerBtn}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ---- Bills ----
  const renderBills = () => {
    const today = new Date(todayStr());
    return (
      <div>
        {billAlerts.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: 16, background: '#fdecea', borderLeft: '4px solid #d32f2f' }}>
            <strong>⏰ {billAlerts.length} bill(s) due within 7 days or overdue:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13 }}>
              {billAlerts.slice(0, 5).map(b => (
                <li key={b.id}>{b.name} — {fmtMoney(b.amount)} — due {b.due_date}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>➕ Add Bill</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="text" placeholder="Bill name *" value={bName} onChange={e => setBName(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
            <input type="number" min="0" step="any" placeholder="Amount (UGX) *" value={bAmount} onChange={e => setBAmount(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
            <input type="date" value={bDue} onChange={e => setBDue(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
            <select value={bFreq} onChange={e => setBFreq(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 130 }}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <select value={bCat} onChange={e => setBCat(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }}>
              <option value="Utilities">💡 Utilities</option>
              <option value="Rent">🏢 Rent</option>
              <option value="Salaries">👥 Salaries</option>
              <option value="Loan">💳 Loan</option>
              <option value="Subscription">🔔 Subscription</option>
              <option value="Tax">🧾 Tax</option>
              <option value="Other">📌 Other</option>
            </select>
            <button onClick={addBill} style={primaryBtn}>+ Add</button>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>📆 Recurring Bills ({bills.length})</h3>
          {bills.length === 0 ? (
            <div style={emptyState}><div style={{ fontSize: 48, marginBottom: 12 }}>📆</div><p>No bills tracked yet.</p></div>
          ) : (
            <div style={tableWrap}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Bill</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Due</th>
                    <th style={thStyle}>Frequency</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(b => {
                    const due = new Date(b.due_date);
                    const overdue = !b.paid && due < today;
                    const dueSoon = !b.paid && (due - today) <= 7 * 86400000 && (due - today) >= 0;
                    return (
                      <tr key={b.id}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{b.name}</td>
                        <td style={tdStyle}>{b.category}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: '#d32f2f' }}>{fmtMoney(b.amount)}</td>
                        <td style={{ ...tdStyle, color: overdue ? '#d32f2f' : dueSoon ? '#e65100' : '#333' }}>{b.due_date}</td>
                        <td style={tdStyle}><span style={{ background: '#eef3fe', color: '#1a73e8', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{b.frequency}</span></td>
                        <td style={tdStyle}>
                          {b.paid ? (
                            <span style={{ background: '#e8f5e9', color: '#0b8043', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>PAID</span>
                          ) : overdue ? (
                            <span style={{ background: '#fdecea', color: '#d32f2f', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>OVERDUE</span>
                          ) : dueSoon ? (
                            <span style={{ background: '#fff8e1', color: '#e65100', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>DUE SOON</span>
                          ) : (
                            <span style={{ background: '#f5f5f5', color: GRAY, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>PENDING</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {b.paid ? (
                            <button onClick={() => markBillUnpaid(b.id)} style={{ padding: '4px 10px', fontSize: 11, background: '#eee', color: '#333', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Undo</button>
                          ) : (
                            <button onClick={() => markBillPaid(b.id)} style={{ ...successBtn, padding: '4px 10px', fontSize: 11 }}>Mark Paid</button>
                          )}
                          <button onClick={() => deleteBill(b.id)} style={dangerBtn}>×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---- Debts ----
  const renderDebts = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ ...cardStyle, borderTop: '4px solid #d32f2f' }}>
          <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>Total Principal</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#d32f2f' }}>{fmtMoney(totalDebtPrincipal)}</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #f9ab00' }}>
          <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>Projected Interest</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f9ab00' }}>{fmtMoney(totalDebtInterest)}</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #7c4dff' }}>
          <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>Total Payback</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#7c4dff' }}>{fmtMoney(totalDebtPrincipal + totalDebtInterest)}</div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>➕ Add Debt</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Creditor *" value={dCreditor} onChange={e => setDCreditor(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
          <input type="number" min="0" step="any" placeholder="Principal (UGX) *" value={dPrincipal} onChange={e => setDPrincipal(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input type="number" min="0" step="any" placeholder="Interest % p.a. *" value={dRate} onChange={e => setDRate(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
          <input type="number" min="0" step="any" placeholder="Monthly payment *" value={dPayment} onChange={e => setDPayment(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 150 }} />
          <input type="date" value={dStart} onChange={e => setDStart(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <button onClick={addDebt} style={primaryBtn}>+ Add</button>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13, color: NAVY }}>Payoff strategy:</strong>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="radio" name="debtMethod" checked={debtMethod === 'snowball'} onChange={() => setDebtMethod('snowball')} />
          Snowball (lowest balance first)
        </label>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="radio" name="debtMethod" checked={debtMethod === 'avalanche'} onChange={() => setDebtMethod('avalanche')} />
          Avalanche (highest interest first)
        </label>
        <span style={{ fontSize: 11, color: '#999' }}>Recommended order shown below.</span>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>💳 Debts ({debts.length})</h3>
        {debts.length === 0 ? (
          <div style={emptyState}><div style={{ fontSize: 48, marginBottom: 12 }}>💳</div><p>No debts tracked yet.</p></div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Creditor</th>
                  <th style={thStyle}>Principal</th>
                  <th style={thStyle}>Rate</th>
                  <th style={thStyle}>Monthly</th>
                  <th style={thStyle}>Months</th>
                  <th style={thStyle}>Payoff Date</th>
                  <th style={thStyle}>Total Interest</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {debtPayoffOrder.map((d, idx) => (
                  <tr key={d.id}>
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{d.creditor}</td>
                    <td style={tdStyle}>{fmtMoney(d.principal)}</td>
                    <td style={tdStyle}>{d.interest_rate}%</td>
                    <td style={tdStyle}>{fmtMoney(d.monthly_payment)}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{d.projection.months}</td>
                    <td style={tdStyle}>{d.projection.payoff_date}</td>
                    <td style={{ ...tdStyle, color: '#f9ab00' }}>{fmtMoney(d.projection.total_interest)}</td>
                    <td style={tdStyle}><button onClick={() => deleteDebt(d.id)} style={dangerBtn}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ---- Purchase Orders ----
  const renderPurchaseOrders = () => (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>➕ New Purchase Order</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <select value={poSupplier} onChange={e => setPoSupplier(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }}>
            <option value="">— Select supplier —</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" placeholder="Expected delivery" value={poDelivery} onChange={e => setPoDelivery(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <select value={poProduct} onChange={e => setPoProduct(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }}>
            <option value="">— Select product —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} (stock {p.stock})</option>)}
          </select>
          <input type="number" min="1" placeholder="Qty" value={poQty} onChange={e => setPoQty(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 80 }} />
          <input type="number" min="0" step="any" placeholder="Unit cost" value={poUnitCost} onChange={e => setPoUnitCost(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 130 }} />
          <button onClick={addPoLine} style={primaryBtn}>+ Line</button>
        </div>
        {poItems.length > 0 && (
          <div style={{ background: '#fafafa', borderRadius: 6, padding: 10, marginBottom: 12 }}>
            {poItems.map(i => (
              <div key={i.product_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                <span>{i.name} × {i.qty} @ {fmtMoney(i.unit_cost)}</span>
                <span>
                  <strong>{fmtMoney(i.qty * i.unit_cost)}</strong>
                  <button onClick={() => removePoLine(i.product_id)} style={{ ...dangerBtn, marginLeft: 8 }}>×</button>
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13, padding: '8px 0 0', borderTop: '1px dashed #ccc', marginTop: 4 }}>
              <span>PO Total</span><span>{fmtMoney(poTotal)}</span>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => savePO('Draft')} style={{ ...primaryBtn, background: GRAY }}>Save Draft</button>
          <button onClick={() => savePO('Sent')} style={primaryBtn}>Mark Sent</button>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>📑 Purchase Orders ({purchaseOrders.length})</h3>
        {purchaseOrders.length === 0 ? (
          <div style={emptyState}><div style={{ fontSize: 48, marginBottom: 12 }}>📑</div><p>No POs yet.</p></div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>PO #</th>
                  <th style={thStyle}>Supplier</th>
                  <th style={thStyle}>Items</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>Delivery</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{p.po_number}</td>
                    <td style={tdStyle}>{p.supplier_name}</td>
                    <td style={tdStyle}>{p.items?.length || 0}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: NAVY }}>{fmtMoney(p.total)}</td>
                    <td style={tdStyle}>{p.delivery_date || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        background: p.status === 'Received' ? '#e8f5e9' : p.status === 'Sent' ? '#eef3fe' : '#f5f5f5',
                        color: p.status === 'Received' ? '#0b8043' : p.status === 'Sent' ? '#1a73e8' : GRAY,
                        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                      }}>{p.status}</span>
                    </td>
                    <td style={tdStyle}>
                      {p.status === 'Draft' && <button onClick={() => setPoStatus(p.id, 'Sent')} style={{ ...primaryBtn, padding: '4px 10px', fontSize: 11 }}>Send</button>}
                      {p.status === 'Sent' && <button onClick={() => setPoStatus(p.id, 'Received')} style={{ ...successBtn, padding: '4px 10px', fontSize: 11 }}>Receive</button>}
                      <button onClick={() => deletePO(p.id)} style={dangerBtn}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ---- Z-Reports ----
  const renderZReports = () => (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>🧮 End-of-Day Reconciliation</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Date</label>
            <input type="date" value={zDate} onChange={e => setZDate(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Opening Cash</label>
            <input type="number" min="0" step="any" placeholder="0" value={zOpening} onChange={e => setZOpening(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Cash Sales</label>
            <input type="number" min="0" step="any" placeholder="0" value={zCash} onChange={e => setZCash(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Card Sales</label>
            <input type="number" min="0" step="any" placeholder="0" value={zCard} onChange={e => setZCard(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Mobile Money</label>
            <input type="number" min="0" step="any" placeholder="0" value={zMobile} onChange={e => setZMobile(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Refunds</label>
            <input type="number" min="0" step="any" placeholder="0" value={zRefunds} onChange={e => setZRefunds(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: GRAY, display: 'block', marginBottom: 4 }}>Closing Cash (counted)</label>
            <input type="number" min="0" step="any" placeholder="0" value={zClosing} onChange={e => setZClosing(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={autofillZ} style={{ ...warnBtn, background: '#eee', color: '#333' }}>Autofill from sales</button>
          <button onClick={saveZReport} style={successBtn}>Save Z-Report</button>
          <span style={{ fontSize: 13, marginLeft: 'auto' }}>
            Variance:{' '}
            <strong style={{ color: Math.abs(zVariance) < 1 ? '#0b8043' : zVariance < 0 ? '#d32f2f' : '#f9ab00' }}>
              {fmtMoney(zVariance)}
            </strong>
          </span>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>🧮 Saved Z-Reports ({zReports.length})</h3>
        {zReports.length === 0 ? (
          <div style={emptyState}><div style={{ fontSize: 48, marginBottom: 12 }}>🧮</div><p>No saved Z-reports yet.</p></div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Opening</th>
                  <th style={thStyle}>Cash</th>
                  <th style={thStyle}>Card</th>
                  <th style={thStyle}>Mobile</th>
                  <th style={thStyle}>Refunds</th>
                  <th style={thStyle}>Closing</th>
                  <th style={thStyle}>Variance</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {zReports.map(r => (
                  <tr key={r.id}>
                    <td style={tdStyle}>{r.date}</td>
                    <td style={tdStyle}>{fmtMoney(r.opening_cash)}</td>
                    <td style={tdStyle}>{fmtMoney(r.cash_sales)}</td>
                    <td style={tdStyle}>{fmtMoney(r.card_sales)}</td>
                    <td style={tdStyle}>{fmtMoney(r.mobile_sales)}</td>
                    <td style={{ ...tdStyle, color: '#d32f2f' }}>{fmtMoney(r.refunds)}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtMoney(r.closing_cash)}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: Math.abs(r.variance) < 1 ? '#0b8043' : r.variance < 0 ? '#d32f2f' : '#f9ab00' }}>{fmtMoney(r.variance)}</td>
                    <td style={tdStyle}><button onClick={() => deleteZReport(r.id)} style={dangerBtn}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ---- P&L Report ----
  const renderPNL = () => {
    const max = Math.max(1, pnlData.revenue, pnlData.cogs, pnlData.opex);
    const bars = [
      { label: 'Revenue', value: pnlData.revenue, color: '#0b8043' },
      { label: 'COGS', value: pnlData.cogs, color: '#7c4dff' },
      { label: 'Gross Profit', value: pnlData.grossProfit, color: '#1a73e8' },
      { label: 'Operating Exp.', value: pnlData.opex, color: '#d32f2f' },
      { label: 'Net Profit', value: pnlData.netProfit, color: pnlData.netProfit >= 0 ? '#0b8043' : '#f9ab00' },
    ];
    return (
      <div>
        <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 13, color: NAVY, fontWeight: 600 }}>Select month:</label>
          <input type="month" value={pnlMonth} onChange={e => setPnlMonth(e.target.value)} style={inputStyle} />
          <span style={{ fontSize: 12, color: '#999' }}>{pnlData.txCount} transactions</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ ...cardStyle, borderTop: '4px solid #0b8043' }}>
            <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>Revenue</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0b8043' }}>{fmtMoney(pnlData.revenue)}</div>
          </div>
          <div style={{ ...cardStyle, borderTop: '4px solid #7c4dff' }}>
            <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>COGS</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#7c4dff' }}>{fmtMoney(pnlData.cogs)}</div>
          </div>
          <div style={{ ...cardStyle, borderTop: '4px solid #1a73e8' }}>
            <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>Gross Profit</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a73e8' }}>{fmtMoney(pnlData.grossProfit)}</div>
            <div style={{ fontSize: 10, color: '#999' }}>{pnlData.revenue > 0 ? Math.round(pnlData.grossProfit / pnlData.revenue * 100) : 0}% margin</div>
          </div>
          <div style={{ ...cardStyle, borderTop: '4px solid #d32f2f' }}>
            <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>Operating Exp.</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#d32f2f' }}>{fmtMoney(pnlData.opex)}</div>
          </div>
          <div style={{ ...cardStyle, borderTop: `4px solid ${pnlData.netProfit >= 0 ? '#0b8043' : '#f9ab00'}` }}>
            <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>Net Profit</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: pnlData.netProfit >= 0 ? '#0b8043' : '#f9ab00' }}>{fmtMoney(pnlData.netProfit)}</div>
            <div style={{ fontSize: 10, color: '#999' }}>{pnlData.revenue > 0 ? Math.round(pnlData.netProfit / pnlData.revenue * 100) : 0}% margin</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>📊 Revenue vs COGS vs Opex</h3>
            {bars.map(r => (
              <div key={r.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#333', marginBottom: 4 }}>
                  <span>{r.label}</span><strong>{fmtMoney(r.value)}</strong>
                </div>
                <div style={{ background: '#f5f5f5', borderRadius: 4, height: 14, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(2, Math.abs(r.value) / max * 100)}%`, background: r.color, height: '100%' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>🥧 Revenue by Category</h3>
            {pnlData.byCat.length === 0 ? (
              <p style={{ fontSize: 13, color: '#999' }}>No category revenue in this period.</p>
            ) : pnlData.byCat.map(c => (
              <div key={c.name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#333', marginBottom: 4 }}>
                  <span>{c.name} ({c.qty} units)</span><strong>{fmtMoney(c.revenue)}</strong>
                </div>
                <div style={{ background: '#f5f5f5', borderRadius: 4, height: 14, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(2, c.revenue / maxCatRevenue * 100)}%`, background: '#1a73e8', height: '100%' }} />
                </div>
                <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>COGS {fmtMoney(c.cogs)} · GP {fmtMoney(c.revenue - c.cogs)}</div>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>🧾 Opex Breakdown</h3>
            {pnlData.opexByCat.length === 0 ? (
              <p style={{ fontSize: 13, color: '#999' }}>No operating expenses in this period.</p>
            ) : pnlData.opexByCat.map(c => (
              <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px dashed #eee' }}>
                <span>{c.name}</span>
                <strong style={{ color: '#d32f2f' }}>{fmtMoney(c.amount)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ---- Inventory Valuation ----
  const renderInventoryValuation = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ ...cardStyle, borderTop: '4px solid #7c4dff' }}>
          <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>Stock Value (Cost)</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#7c4dff' }}>{fmtMoney(inventoryValue)}</div>
          <div style={{ fontSize: 10, color: '#999' }}>Sum of cost × stock</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #0b8043' }}>
          <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>Stock Value (Retail)</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0b8043' }}>{fmtMoney(inventoryRetail)}</div>
          <div style={{ fontSize: 10, color: '#999' }}>Sum of price × stock</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #1a73e8' }}>
          <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>Potential Gross Profit</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a73e8' }}>{fmtMoney(inventoryRetail - inventoryValue)}</div>
          <div style={{ fontSize: 10, color: '#999' }}>Retail − Cost</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #f9ab00' }}>
          <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase' }}>Low-stock SKUs</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f9ab00' }}>{lowStock.length}</div>
          <div style={{ fontSize: 10, color: '#999' }}>Need reordering</div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>🏷️ Inventory Valuation Table</h3>
        {products.length === 0 ? (
          <div style={emptyState}><div style={{ fontSize: 48, marginBottom: 12 }}>🏷️</div><p>No products yet.</p></div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Stock</th>
                  <th style={thStyle}>Cost</th>
                  <th style={thStyle}>Retail</th>
                  <th style={thStyle}>Cost Value</th>
                  <th style={thStyle}>Retail Value</th>
                  <th style={thStyle}>Potential GP</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const cost = Number(p.cost) || 0;
                  const price = Number(p.price) || 0;
                  const stock = Number(p.stock) || 0;
                  return (
                    <tr key={p.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                      <td style={tdStyle}>{p.category}</td>
                      <td style={tdStyle}>{stock}</td>
                      <td style={tdStyle}>{fmtMoney(cost)}</td>
                      <td style={tdStyle}>{fmtMoney(price)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#7c4dff' }}>{fmtMoney(cost * stock)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#0b8043' }}>{fmtMoney(price * stock)}</td>
                      <td style={{ ...tdStyle, color: '#1a73e8' }}>{fmtMoney((price - cost) * stock)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ ...thStyle, textAlign: 'right' }}>TOTALS</td>
                  <td style={{ ...thStyle, color: '#7c4dff' }}>{fmtMoney(inventoryValue)}</td>
                  <td style={{ ...thStyle, color: '#0b8043' }}>{fmtMoney(inventoryRetail)}</td>
                  <td style={{ ...thStyle, color: '#1a73e8' }}>{fmtMoney(inventoryRetail - inventoryValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: NAVY }}>🔄 Reorder Suggestions</h3>
        {reorderSuggestions.length === 0 ? (
          <div style={emptyState}><div style={{ fontSize: 48, marginBottom: 12 }}>✅</div><p>All products above reorder level.</p></div>
        ) : (
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Stock</th>
                  <th style={thStyle}>Reorder Level</th>
                  <th style={thStyle}>Suggested Qty</th>
                  <th style={thStyle}>Est. Reorder Cost</th>
                </tr>
              </thead>
              <tbody>
                {reorderSuggestions.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ ...tdStyle, color: p.stock === 0 ? '#d32f2f' : '#f9ab00', fontWeight: 700 }}>{p.stock}</td>
                    <td style={tdStyle}>{p.reorder_level || 5}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#1a73e8' }}>{p.suggested_reorder}</td>
                    <td style={{ ...tdStyle, color: '#7c4dff' }}>{fmtMoney(p.suggested_reorder * (Number(p.cost) || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="page-container">
      <h1 className="page-title">🏢 Business / SME Portal</h1>
      <p style={{ color: GRAY, fontSize: 14, marginBottom: 24 }}>
        POS, sales, customers, suppliers, products, expenses, loyalty points, bill reminders,
        debt payoff planner, purchase orders, Z-reports, P&L and inventory valuation — all in one place.
      </p>

      {renderTabs()}

      {tab === 'dashboard' && renderDashboard()}
      {tab === 'pos' && renderPOS()}
      {tab === 'sales' && renderSales()}
      {tab === 'customers' && renderCustomers()}
      {tab === 'suppliers' && renderSuppliers()}
      {tab === 'products' && renderProducts()}
      {tab === 'expenses' && renderExpenses()}
      {tab === 'loyalty' && renderLoyalty()}
      {tab === 'bills' && renderBills()}
      {tab === 'debts' && renderDebts()}
      {tab === 'purchaseOrders' && renderPurchaseOrders()}
      {tab === 'zreports' && renderZReports()}
      {tab === 'pnl' && renderPNL()}
      {tab === 'inventory' && renderInventoryValuation()}

      {renderToast()}
    </div>
  );
}
