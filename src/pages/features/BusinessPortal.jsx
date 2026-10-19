// Ssewasswa Comforts — Business / SME Portal
// POS, Sales, Customers, Suppliers, Products, Expenses, Dashboard — all persisted to localStorage.
import React, { useState, useEffect, useMemo } from 'react';

const LS = {
  products: 'erp_business_products',
  sales: 'erp_business_sales',
  customers: 'erp_business_customers',
  suppliers: 'erp_business_suppliers',
  expenses: 'erp_business_expenses',
};

const fmtMoney = (n) => 'UGX ' + Number(Number(n) || 0).toLocaleString();
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();

function loadItems(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
}
function persist(key, items, setter) {
  setter(items);
  try { localStorage.setItem(key, JSON.stringify(items)); } catch (e) { /* quota or private mode */ }
}

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'pos', label: '🛒 POS' },
  { id: 'sales', label: '💰 Sales' },
  { id: 'customers', label: '👥 Customers' },
  { id: 'suppliers', label: '🚚 Suppliers' },
  { id: 'products', label: '📦 Products' },
  { id: 'expenses', label: '🧾 Expenses' },
];

const inputStyle = {
  padding: 10,
  borderRadius: 6,
  border: '1px solid #ccc',
  fontSize: 14,
  boxSizing: 'border-box',
};
const primaryBtn = {
  padding: '10px 20px', background: '#1a73e8', color: 'white', border: 0,
  borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14,
};
const successBtn = {
  padding: '10px 20px', background: '#0b8043', color: 'white', border: 0,
  borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14,
};
const dangerBtn = {
  background: 'none', border: 0, color: '#d32f2f', cursor: 'pointer',
  fontSize: 18, padding: 4, lineHeight: 1,
};
const cardStyle = {
  background: 'white', border: '1px solid #e0e0e0', borderRadius: 8, padding: 16,
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
  // ----- main collections -----
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // ----- ui state -----
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState('');

  // ----- POS state -----
  const [cart, setCart] = useState([]);
  const [posProductId, setPosProductId] = useState('');
  const [posQty, setPosQty] = useState(1);
  const [posCustomerId, setPosCustomerId] = useState('');
  const [posPayment, setPosPayment] = useState('cash');

  // ----- product form -----
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pStock, setPStock] = useState('');
  const [pCategory, setPCategory] = useState('General');

  // ----- customer form -----
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');

  // ----- supplier form -----
  const [sName, setSName] = useState('');
  const [sContact, setSContact] = useState('');
  const [sTerms, setSTerms] = useState('COD');

  // ----- expense form -----
  const [eCategory, setECategory] = useState('Rent');
  const [eAmount, setEAmount] = useState('');
  const [eDate, setEDate] = useState(todayStr());
  const [eDesc, setEDesc] = useState('');

  // ----- initial load -----
  useEffect(() => {
    setProducts(loadItems(LS.products));
    setSales(loadItems(LS.sales));
    setCustomers(loadItems(LS.customers));
    setSuppliers(loadItems(LS.suppliers));
    setExpenses(loadItems(LS.expenses));
  }, []);

  // toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // ======================= PRODUCTS =======================
  const addProduct = () => {
    if (!pName.trim() || !pPrice || Number(pPrice) < 0 || pStock === '') {
      setToast('⚠️ Enter product name, price and stock');
      return;
    }
    const item = {
      id: Date.now(),
      name: pName.trim(),
      price: Number(pPrice),
      stock: Number(pStock) || 0,
      category: pCategory.trim() || 'General',
      created_at: nowISO(),
    };
    persist(LS.products, [item, ...products], setProducts);
    setPName(''); setPPrice(''); setPStock(''); setPCategory('General');
    setToast('✅ Product added');
  };
  const deleteProduct = (id) => {
    persist(LS.products, products.filter(p => p.id !== id), setProducts);
  };

  // ======================= CUSTOMERS =======================
  const addCustomer = () => {
    if (!cName.trim()) { setToast('⚠️ Customer name is required'); return; }
    const item = {
      id: Date.now(),
      name: cName.trim(),
      phone: cPhone.trim(),
      email: cEmail.trim(),
      created_at: nowISO(),
    };
    persist(LS.customers, [item, ...customers], setCustomers);
    setCName(''); setCPhone(''); setCEmail('');
    setToast('✅ Customer added');
  };
  const deleteCustomer = (id) => {
    persist(LS.customers, customers.filter(c => c.id !== id), setCustomers);
  };
  // aggregate per-customer stats
  const customerStats = useMemo(() => {
    const map = {};
    sales.forEach(s => {
      const cid = s.customer_id;
      if (!cid) return;
      if (!map[cid]) map[cid] = { orders: 0, total: 0 };
      map[cid].orders += 1;
      map[cid].total += Number(s.total) || 0;
    });
    return map;
  }, [sales]);

  // ======================= SUPPLIERS =======================
  const addSupplier = () => {
    if (!sName.trim()) { setToast('⚠️ Supplier name is required'); return; }
    const item = {
      id: Date.now(),
      name: sName.trim(),
      contact: sContact.trim(),
      payment_terms: sTerms,
      created_at: nowISO(),
    };
    persist(LS.suppliers, [item, ...suppliers], setSuppliers);
    setSName(''); setSContact(''); setSTerms('COD');
    setToast('✅ Supplier added');
  };
  const deleteSupplier = (id) => {
    persist(LS.suppliers, suppliers.filter(s => s.id !== id), setSuppliers);
  };

  // ======================= EXPENSES =======================
  const addExpense = () => {
    if (!eAmount || Number(eAmount) <= 0) { setToast('⚠️ Enter a valid amount'); return; }
    const item = {
      id: Date.now(),
      category: eCategory,
      amount: Number(eAmount),
      date: eDate || todayStr(),
      description: eDesc.trim(),
      created_at: nowISO(),
    };
    persist(LS.expenses, [item, ...expenses], setExpenses);
    setEAmount(''); setEDesc(''); setEDate(todayStr());
    setToast('✅ Expense recorded');
  };
  const deleteExpense = (id) => {
    persist(LS.expenses, expenses.filter(e => e.id !== id), setExpenses);
  };

  // ======================= POS =======================
  const cartTotal = cart.reduce((sum, c) => sum + (Number(c.price) * c.qty), 0);
  const addToCart = () => {
    const prod = products.find(p => p.id === Number(posProductId));
    if (!prod) { setToast('⚠️ Select a product'); return; }
    const qty = Math.max(1, Number(posQty) || 1);
    if (qty > prod.stock) { setToast(`⚠️ Only ${prod.stock} in stock`); return; }
    const existing = cart.find(c => c.product_id === prod.id);
    if (existing) {
      setCart(cart.map(c => c.product_id === prod.id ? { ...c, qty: c.qty + qty } : c));
    } else {
      setCart([...cart, { product_id: prod.id, name: prod.name, price: prod.price, qty }]);
    }
    setPosProductId(''); setPosQty(1);
  };
  const updateCartQty = (pid, delta) => {
    setCart(cart.map(c => c.product_id === pid ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
  };
  const removeFromCart = (pid) => setCart(cart.filter(c => c.product_id !== pid));
  const checkout = () => {
    if (cart.length === 0) { setToast('⚠️ Cart is empty'); return; }
    const sale = {
      id: Date.now(),
      date: todayStr(),
      ts: nowISO(),
      customer_id: posCustomerId ? Number(posCustomerId) : null,
      customer_name: posCustomerId ? (customers.find(c => c.id === Number(posCustomerId))?.name || 'Walk-in') : 'Walk-in',
      items: cart.map(c => ({ ...c })),
      total: cartTotal,
      payment_method: posPayment,
    };
    // persist sale (newest first)
    persist(LS.sales, [sale, ...sales], setSales);
    // reduce product stock
    const updatedProducts = products.map(p => {
      const ci = cart.find(c => c.product_id === p.id);
      return ci ? { ...p, stock: Math.max(0, p.stock - ci.qty) } : p;
    });
    persist(LS.products, updatedProducts, setProducts);
    // reset POS
    setCart([]); setPosCustomerId(''); setPosPayment('cash');
    setToast('✅ Sale completed!');
  };
  const deleteSale = (id) => {
    persist(LS.sales, sales.filter(s => s.id !== id), setSales);
  };

  // ======================= DASHBOARD =======================
  const todaySales = useMemo(() => sales.filter(s => s.date === todayStr()), [sales]);
  const todayExpenses = useMemo(() => expenses.filter(e => e.date === todayStr()), [expenses]);
  const totalSalesToday = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalExpensesToday = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfitToday = totalSalesToday - totalExpensesToday;
  const inventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const lowStock = products.filter(p => p.stock < 5);
  const allTimeSales = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const allTimeExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // ======================= RENDER HELPERS =======================
  const renderTabs = () => (
    <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          style={{
            padding: '10px 16px', border: tab === t.id ? '1px solid #1a73e8' : '1px solid #ccc',
            background: tab === t.id ? '#1a73e8' : 'white', color: tab === t.id ? 'white' : '#333',
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
      position: 'fixed', bottom: 20, right: 20, background: '#071b2f', color: 'white',
      padding: '12px 20px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      zIndex: 1000, fontSize: 14, fontWeight: 500,
    }}>{toast}</div>
  ) : null;

  // ---- Dashboard ----
  const renderDashboard = () => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle, borderTop: '4px solid #0b8043' }}>
          <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Today&apos;s Sales</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0b8043', marginTop: 6 }}>{fmtMoney(totalSalesToday)}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{todaySales.length} transactions</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #d32f2f' }}>
          <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Today&apos;s Expenses</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#d32f2f', marginTop: 6 }}>{fmtMoney(totalExpensesToday)}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{todayExpenses.length} entries</div>
        </div>
        <div style={{ ...cardStyle, borderTop: `4px solid ${netProfitToday >= 0 ? '#1a73e8' : '#f9ab00'}` }}>
          <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Net Profit Today</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: netProfitToday >= 0 ? '#1a73e8' : '#f9ab00', marginTop: 6 }}>{fmtMoney(netProfitToday)}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Sales − Expenses</div>
        </div>
        <div style={{ ...cardStyle, borderTop: '4px solid #7c4dff' }}>
          <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Inventory Value</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#7c4dff', marginTop: 6 }}>{fmtMoney(inventoryValue)}</div>
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{products.length} products in catalog</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>📈 All-Time Summary</h3>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>Total Sales</span><strong style={{ color: '#0b8043' }}>{fmtMoney(allTimeSales)}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>Total Expenses</span><strong style={{ color: '#d32f2f' }}>{fmtMoney(allTimeExpenses)}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span>Net Balance</span><strong style={{ color: (allTimeSales - allTimeExpenses) >= 0 ? '#0b8043' : '#d32f2f' }}>{fmtMoney(allTimeSales - allTimeExpenses)}</strong>
          </div>
        </div>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>🏢 Business Snapshot</h3>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>Customers</span><strong>{customers.length}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #eee' }}>
            <span>Suppliers</span><strong>{suppliers.length}</strong>
          </div>
          <div style={{ fontSize: 13, color: '#333', display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span>Low-stock alerts</span><strong style={{ color: lowStock.length ? '#d32f2f' : '#0b8043' }}>{lowStock.length}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>🕒 Recent Sales</h3>
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
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>⚠️ Low Stock Alerts</h3>
          {lowStock.length === 0 ? (
            <div style={{ fontSize: 13, color: '#999', padding: 16, textAlign: 'center' }}>All products well stocked. 🎉</div>
          ) : lowStock.map(p => (
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

  // ---- POS ----
  const renderPOS = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>🛒 Add to Cart</h3>
        {products.length === 0 ? (
          <p style={{ fontSize: 13, color: '#999' }}>No products in inventory. Add products first in the Products tab.</p>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Product</label>
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
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Qty</label>
                <input type="number" min="1" value={posQty} onChange={e => setPosQty(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <button onClick={addToCart} style={primaryBtn}>+ Add</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Customer (optional)</label>
                <select value={posCustomerId} onChange={e => setPosCustomerId(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                  <option value="">Walk-in customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Payment</label>
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

      <div style={{ ...cardStyle, background: '#071b2f', color: 'white' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: 'white' }}>🧾 Current Cart</h3>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#9bb3c9' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
            <p style={{ margin: 0, fontSize: 13 }}>Cart is empty. Add products to begin.</p>
          </div>
        ) : (
          <>
            {cart.map(c => (
              <div key={c.product_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #1a3550' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#9bb3c9' }}>{fmtMoney(c.price)} × {c.qty}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => updateCartQty(c.product_id, -1)} style={{ background: '#1a3550', color: 'white', border: 0, borderRadius: 4, width: 24, height: 24, cursor: 'pointer' }}>−</button>
                  <span style={{ minWidth: 24, textAlign: 'center', fontSize: 13 }}>{c.qty}</span>
                  <button onClick={() => updateCartQty(c.product_id, +1)} style={{ background: '#1a3550', color: 'white', border: 0, borderRadius: 4, width: 24, height: 24, cursor: 'pointer' }}>+</button>
                </div>
                <div style={{ minWidth: 90, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{fmtMoney(c.price * c.qty)}</div>
                <button onClick={() => removeFromCart(c.product_id)} style={{ background: 'none', border: 0, color: '#ff8a8a', cursor: 'pointer', fontSize: 18, padding: 0, marginLeft: 4 }}>×</button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '2px solid #1a3550' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>TOTAL</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#5fd97a' }}>{fmtMoney(cartTotal)}</span>
            </div>
            <button onClick={checkout} style={{ ...successBtn, width: '100%', marginTop: 12, padding: 14 }}>✅ Checkout — {fmtMoney(cartTotal)}</button>
          </>
        )}
      </div>
    </div>
  );

  // ---- Sales ----
  const renderSales = () => (
    <div>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, color: '#071b2f' }}>💰 Recent Sales</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#999' }}>{sales.length} total sales • All-time total: {fmtMoney(allTimeSales)}</p>
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
                  <th style={thStyle}>Total</th>
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
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#0b8043' }}>{fmtMoney(s.total)}</td>
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

  // ---- Customers ----
  const renderCustomers = () => (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>➕ Add Customer</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Full name *" value={cName} onChange={e => setCName(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
          <input type="tel" placeholder="Phone" value={cPhone} onChange={e => setCPhone(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input type="email" placeholder="Email" value={cEmail} onChange={e => setCEmail(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 200 }} />
          <button onClick={addCustomer} style={primaryBtn}>+ Add</button>
        </div>
      </div>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>👥 Customers ({customers.length})</h3>
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
                  <th style={thStyle}>Orders</th>
                  <th style={thStyle}>Total Purchases</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const stats = customerStats[c.id] || { orders: 0, total: 0 };
                  return (
                    <tr key={c.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name}</td>
                      <td style={tdStyle}>{c.phone || '—'}</td>
                      <td style={tdStyle}>{c.email || '—'}</td>
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
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>➕ Add Supplier</h3>
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
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>🚚 Suppliers ({suppliers.length})</h3>
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

  // ---- Products ----
  const renderProducts = () => (
    <div>
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>➕ Add Product</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Product name *" value={pName} onChange={e => setPName(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 180 }} />
          <input type="text" placeholder="Category" value={pCategory} onChange={e => setPCategory(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input type="number" min="0" step="any" placeholder="Price (UGX) *" value={pPrice} onChange={e => setPPrice(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input type="number" min="0" placeholder="Stock qty *" value={pStock} onChange={e => setPStock(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
          <button onClick={addProduct} style={primaryBtn}>+ Add</button>
        </div>
      </div>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>📦 Products ({products.length})</h3>
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
                  <th style={thStyle}>Price</th>
                  <th style={thStyle}>Stock</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                    <td style={tdStyle}>{p.category}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtMoney(p.price)}</td>
                    <td style={tdStyle}>{p.stock}</td>
                    <td style={tdStyle}>
                      {p.stock === 0 ? (
                        <span style={{ background: '#fdecea', color: '#d32f2f', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>OUT OF STOCK</span>
                      ) : p.stock < 5 ? (
                        <span style={{ background: '#fff8e1', color: '#e65100', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>LOW</span>
                      ) : (
                        <span style={{ background: '#e8f5e9', color: '#0b8043', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>OK</span>
                      )}
                    </td>
                    <td style={tdStyle}><button onClick={() => deleteProduct(p.id)} style={dangerBtn}>×</button></td>
                  </tr>
                ))}
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
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>➕ Add Expense</h3>
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
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#071b2f' }}>🧾 Expenses ({expenses.length}) • Total: {fmtMoney(allTimeExpenses)}</h3>
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

  return (
    <div className="page-container">
      <h1 className="page-title">🏢 Business / SME Portal</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
        Point-of-sale, sales tracking, customers, suppliers, products & expenses — all in one place.
      </p>

      {renderTabs()}

      {tab === 'dashboard' && renderDashboard()}
      {tab === 'pos' && renderPOS()}
      {tab === 'sales' && renderSales()}
      {tab === 'customers' && renderCustomers()}
      {tab === 'suppliers' && renderSuppliers()}
      {tab === 'products' && renderProducts()}
      {tab === 'expenses' && renderExpenses()}

      {renderToast()}
    </div>
  );
}
