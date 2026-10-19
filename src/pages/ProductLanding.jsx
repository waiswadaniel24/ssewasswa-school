// FileName: src/pages/ProductLanding.jsx
// Ssewasswa Comforts School ERP V10 — marketing + subscription landing page
// Detailed subscription tiers, payment options, contact info, "Subscribe Now" CTA

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AIChatbot from '../components/AIChatbot.jsx';

const PLANS = [
  {
    id: 'ordinary',
    tier: 'ORD',
    name: 'Ordinary Access',
    price: 150000,
    priceLabel: 'UGX 150,000',
    period: '/year',
    color: '#1a73e8',
    bg: '#e8f0fe',
    badge: null,
    tagline: 'Everything a growing school needs to start running smoothly.',
    features: [
      'Student admissions, profiles, attendance & parent-ready records',
      'Staff management (teachers + support staff) with role-based access',
      'Fees collection, receipts, balances and basic finance reports',
      'Exams, marks & printable report cards (Primary + Secondary)',
      'Library, transport, canteen & gatebook modules',
      'Single-school license (bound to one computer)',
      'Local SQLite database (encrypted at rest)',
      'Email support (response within 48 hours)',
    ],
    notIncluded: [
      'EMIS compliance & reports',
      'UNEB API integration',
      'Multi-school management',
      'Automated Document Engine',
    ],
  },
  {
    id: 'premium',
    tier: 'PREM',
    name: 'Premium Access ⭐',
    price: 300000,
    priceLabel: 'UGX 300,000',
    period: '/year',
    color: '#0b8043',
    bg: '#e6f4ea',
    badge: 'Best Value',
    tagline: 'For schools that need full EMIS compliance, UNEB integration & multi-school management.',
    features: [
      'ALL Ordinary features included',
      'EMIS compliance & automated reports',
      'UNEB API integration (register candidates, fetch results)',
      'Multi-school management (manage all your schools from one app)',
      'Automated Document Engine (bulk report cards, ID cards, certificates)',
      'Health, WASH, latrines & infrastructure modules',
      'Special needs & OVC (Orphans & Vulnerable Children) tracking',
      'Priority WhatsApp + call support (response within 4 hours)',
      'Free desktop app updates for 1 year',
    ],
    notIncluded: [],
  },
];

const PAYMENT_METHODS = [
  {
    id: 'momo',
    name: 'MTN Mobile Money',
    icon: '📱',
    color: '#ffcc00',
    bg: '#333',
    holder: 'Kusuya Grace',
    number: '0752 971 118',
    display: '+256 752 971 118',
  },
  {
    id: 'airtel',
    name: 'Airtel Money',
    icon: '📱',
    color: '#e31e24',
    bg: '#fff',
    holder: 'Waiswa Moses',
    number: '0789 736 737',
    display: '+256 789 738 420',
  },
  {
    id: 'pesapal',
    name: 'Online Card / Pesapal',
    icon: '💳',
    color: '#1a73e8',
    bg: '#e8f0fe',
    holder: 'Secure online payment',
    number: 'Visa, Mastercard, Visa Mobile',
    display: 'Pay online via Pesapal',
  },
];

const CONTACTS = [
  { label: 'WhatsApp / MTN', value: '+256 789 736 737', href: 'https://wa.me/256789736737', person: 'Ssewasswa Comforts Tech' },
  { label: 'Call / Airtel', value: '+256 752 971 118', href: 'tel:+256752971118', person: 'Ssewasswa Comforts Tech' },
  { label: 'Email', value: 'support@ssewasswacomfortstechnologies.com', href: 'mailto:support@ssewasswacomfortstechnologies.com', person: 'Support Team' },
];

// Download info for the desktop app installer
const DOWNLOAD_INFO = {
  url: "https://github.com/waiswadaniel24/ssewasswa-school/releases/download/v10.0.0/Ssewasswa-School-ERP-V10-Setup.exe",
  releaseNotes: "https://github.com/waiswadaniel24/ssewasswa-school/releases/tag/v10.0.0",
  version: "v10.0.0",
  fileSize: "130 MB",
  platform: "Windows 7+ (64-bit)"
};


export default function ProductLanding() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentStep, setPaymentStep] = useState('plans'); // 'plans' | 'methods' | 'momo' | 'processing'
  const [hwid, setHwid] = useState('');
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [pesapalRedirect, setPesapalRedirect] = useState(null);
  const [manualInstructions, setManualInstructions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate a browser-based HWID for unauthenticated visitors
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.getHwid) {
      window.electronAPI.getHwid().then((res) => {
        if (res && res.success && res.hwid) setHwid(res.hwid);
      }).catch(() => generateWebHwid());
    } else {
      generateWebHwid();
    }
  }, []);

  const generateWebHwid = () => {
    if (hwid) return;
    let fp = 'WEB-';
    try {
      fp += navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      fp += '-' + (navigator.hardwareConcurrency || 'unk');
      fp += '-' + (screen.width || '0') + 'x' + (screen.height || '0');
      fp += '-' + (navigator.language || 'en');
    } catch (e) {
      fp += 'unknown-' + Date.now();
    }
    setHwid(fp);
  };

  useEffect(() => {
    if (!authReady) return;
    if (user?.isDeveloper) navigate('/app/dev', { replace: true });
    if (user?.email) setEmail(user.email);
    if (user?.username) setCustomerName(user.username);
  }, [authReady, user, navigate]);

  const handleSubscribe = async (plan) => {
    setSelectedPlan(plan);
    setPaymentStep('methods');
    // Generate unique payment reference code for auto-matching
    try {
      const refRes = await fetch('/api/create-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: plan.tier, email: email || (user && user.email) || '', customer_name: customerName || (user && user.username) || '' })
      });
      const refData = await refRes.json();
      if (refData.success) {
        setPaymentRef(refData.reference);
      }
    } catch (e) { /* reference generation failed — customer can still pay manually */ }
    setError('');
    setManualInstructions(null);
    setPesapalRedirect(null);
    // Scroll to payment section
    setTimeout(() => {
      const el = document.getElementById('payment-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handlePesapalPay = async () => {
    if (!email || !hwid) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pesapal-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedPlan.tier,
          hwid, email, customer_name: customerName
        })
      });
      const data = await res.json();
      if (data.status === 'pesapal' && data.redirect_url) {
        setPesapalRedirect(data.redirect_url);
        // Auto-redirect to Pesapal payment page
        window.location.href = data.redirect_url;
      } else if (data.status === 'manual') {
        setManualInstructions(data);
        setPaymentStep('manual');
      } else {
        setError(data.error || 'Could not initiate payment. Please try manual payment instead.');
      }
    } catch (err) {
      setError('Network error: ' + err.message + '. Please use manual MoMo payment instead.');
      setPaymentStep('manual');
    } finally {
      setLoading(false);
    }
  };

  const formatUGX = (n) => 'UGX ' + Number(n).toLocaleString();

  return (
    <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* ─── Top nav ─── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 60px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/ssewasswa-comforts-school-erp-mark.png" alt="Ssewasswa Comforts" style={{ filter: 'brightness(1.18) saturate(1.35) contrast(1.05) drop-shadow(0 2px 6px rgba(0,0,0,0.18))', width: 46, height: 46, objectFit: 'contain' }} />
            <div>
              <strong style={{ letterSpacing: '.06em' }}>SSEWASSWA COMFORTS</strong>
              <div style={{ color: '#8fb3c9', fontSize: 12 }}>School ERP V10 — Uganda</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/')} style={{ background: 'transparent', color: '#8fb3c9', border: '1px solid #45657b', borderRadius: 999, padding: '11px 18px', cursor: 'pointer' }}>
              ← All Products
            </button>
            <button onClick={() => navigate('/login?next=/app')} style={{ background: '#1a73e8', color: '#fff', border: 0, borderRadius: 999, padding: '11px 18px', cursor: 'pointer', fontWeight: 600 }}>
              Sign in
            </button>
          </div>
        </nav>

        {/* ─── Hero ─── */}
        <div style={{ textAlign: 'center', paddingTop: 60, paddingBottom: 40 }}>
          <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 13, textTransform: 'uppercase', marginBottom: 16 }}>
            A product of Ssewasswa Comforts Technologies
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', lineHeight: 1.05, margin: '0 0 20px', letterSpacing: '-.04em' }}>
            Run your school with confidence.
          </h1>
          <p style={{ color: '#b5c9d7', fontSize: 19, lineHeight: 1.6, maxWidth: 700, margin: '0 auto 32px' }}>
            One calm, connected workspace for school leaders, teachers, bursars, administrators and families.
            EMIS-compliant, UNEB-integrated, and built for Ugandan schools.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => { const el = document.getElementById('plans'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} style={{ background: '#61d3a5', color: '#062218', border: 0, borderRadius: 10, padding: '15px 28px', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
              View subscription plans
            </button>
            <a href={DOWNLOAD_INFO.url} target="_blank" rel="noreferrer" style={{ background: 'transparent', color: '#61d3a5', border: '1px solid #61d3a5', borderRadius: 10, padding: '15px 22px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⬇️</span> Download Desktop App <span style={{ fontSize: 11, opacity: 0.7 }}>(Windows, 130 MB)</span>
          </a>
          <button onClick={() => navigate('/login')} style={{ background: '#13334c', color: '#fff', border: '1px solid #315570', borderRadius: 10, padding: '15px 28px', fontWeight: 700, cursor: 'pointer' }}>
              Already have an account?
            </button>
          </div>
        </div>
      </section>

      {/* ─── PLANS section ─── */}
      {/* ─── VISION & GOALS section ─── */}
      <section style={{ background: '#071b2f', color: '#f7fbff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 12, textTransform: 'uppercase', marginBottom: 16 }}>Our Vision & Mission</div>
            <h2 style={{ fontSize: 'clamp(30px, 5vw, 46px)', letterSpacing: '-.04em', margin: '0 0 20px' }}>
              Empowering Ugandan education with technology that serves.
            </h2>
            <p style={{ color: '#b5c9d7', fontSize: 19, lineHeight: 1.7, maxWidth: 760, margin: '0 auto' }}>
              We build technology that serves Ugandan education — simple enough for a village headteacher,
              powerful enough for a city secondary school, affordable enough for every school.
            </p>
          </div>

          {/* Vision statement */}
          <div style={{ background: 'rgba(97,211,165,0.08)', border: '1px solid #2a6b50', borderRadius: 16, padding: 32, marginBottom: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
            <h3 style={{ color: '#61d3a5', fontSize: 18, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Our Vision</h3>
            <p style={{ fontSize: 20, lineHeight: 1.6, color: '#f7fbff', maxWidth: 700, margin: '0 auto' }}>
              To be Uganda's most trusted school management platform — empowering every school,
              from village nursery to urban university, with affordable digital tools that work
              even without internet.
            </p>
          </div>

          {/* Goals grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { icon: '📄', title: 'Digitize ALL Records', desc: 'No more paper registers, no more lost files. Every student, staff, fee, exam — stored digitally and encrypted.' },
              { icon: '🏛️', title: 'Effortless EMIS Compliance', desc: 'Automatic EMIS reports for the Ministry of Education. Stay compliant without extra paperwork.' },
              { icon: '💰', title: '100% Fee Transparency', desc: 'Every shilling tracked, every receipt digital. Parents see exactly what they owe and what they paid.' },
              { icon: '🎓', title: 'Direct UNEB Registration', desc: 'Register exam candidates from the classroom to UNEB in one click. No more manual forms.' },
              { icon: '🌍', title: 'Bridge Urban-Rural Gap', desc: 'Works offline on any computer — even in villages without internet. Syncs when connection returns.' },
              { icon: '🔒', title: 'Data Privacy First', desc: 'Encrypted local database. Your school data never leaves your computer without your permission.' },
              { icon: '📊', title: 'Real-Time Dashboards', desc: 'Make decisions with data, not guesswork. Live stats on enrollment, fees, attendance, performance.' },
              { icon: '💸', title: 'Affordable for All', desc: 'UGX 150k/year — less than a teacher monthly salary. Quality ERP for every Ugandan school.' },
            ].map((goal) => (
              <div key={goal.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2c4a64', borderRadius: 14, padding: 22 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{goal.icon}</div>
                <h4 style={{ margin: '0 0 8px', fontSize: 16, color: '#61d3a5' }}>{goal.title}</h4>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#9ab4c5' }}>{goal.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" style={{ background: '#f5f8fa', color: '#102a3c', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ color: '#16865e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 12 }}>Subscription Plans</div>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', letterSpacing: '-.04em', margin: '14px 0' }}>Choose your access tier</h2>
            <p style={{ color: '#587080', fontSize: 17, lineHeight: 1.6, maxWidth: 600, margin: '0 auto' }}>
              Both tiers include the full desktop app, free updates during your subscription, and offline support.
              No hidden fees, no per-student pricing — one flat annual price per school.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 880, margin: '0 auto' }}>
            {PLANS.map((plan) => (
              <div key={plan.id} style={{
                background: '#fff',
                border: `2px solid ${plan.badge ? plan.color : '#dce7ed'}`,
                borderRadius: 16,
                padding: 28,
                position: 'relative',
                boxShadow: '0 8px 30px rgba(0,0,0,.06)',
              }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -14, right: 20, background: plan.color, color: '#fff', padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '.05em' }}>
                    {plan.badge}
                  </div>
                )}
                <h3 style={{ margin: '0 0 8px', color: plan.color, fontSize: 22 }}>{plan.name}</h3>
                <p style={{ color: '#587080', fontSize: 14, lineHeight: 1.5, margin: '0 0 20px', minHeight: 40 }}>{plan.tagline}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: plan.color }}>{plan.priceLabel}</span>
                  <span style={{ fontSize: 14, color: '#587080' }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', fontSize: 14, lineHeight: 1.7 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: plan.color, fontWeight: 700 }}>✓</span>
                      <span style={{ color: '#374753' }}>{f}</span>
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6, opacity: 0.5 }}>
                      <span style={{ color: '#999' }}>✗</span>
                      <span style={{ color: '#999', textDecoration: 'line-through' }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan)}
                  style={{
                    width: '100%',
                    background: plan.color,
                    color: '#fff',
                    border: 0,
                    borderRadius: 10,
                    padding: '14px',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  Subscribe to {plan.name.replace(' ⭐', '')}
                </button>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', color: '#587080', fontSize: 13, marginTop: 32 }}>
            All plans include a 5-day free trial. Cancel anytime within the trial for a full refund.
          </p>
        </div>
      </section>

      {/* ─── PAYMENT section ─── */}
      <section id="payment-section" style={{ background: '#071b2f', color: '#f7fbff', padding: '64px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          {!selectedPlan ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 30, margin: '0 0 12px' }}>Payment details</h2>
              <p style={{ color: '#8fb3c9', fontSize: 16, lineHeight: 1.6, maxWidth: 600, margin: '0 auto' }}>
                Pick a plan above to start the subscription process. You'll see payment options here.
              </p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 12, textTransform: 'uppercase' }}>Subscription</div>
                <h2 style={{ fontSize: 30, margin: '12px 0' }}>{selectedPlan.name} — {formatUGX(selectedPlan.price)}{selectedPlan.period}</h2>
                <button onClick={() => { setSelectedPlan(null); setPaymentStep('plans'); }} style={{ background: 'transparent', color: '#8fb3c9', border: '1px solid #2c4a64', borderRadius: 999, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
                  ← Choose a different plan
                </button>
              </div>

              {/* Customer info form */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2c4a64', borderRadius: 14, padding: 24, marginBottom: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 17 }}>Your details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#8fb3c9', marginBottom: 6 }}>Full name</label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. John Mukasa" style={{ width: '100%', padding: 12, background: '#0c273d', border: '1px solid #2c4a64', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#8fb3c9', marginBottom: 6 }}>Email (license key will be sent here)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={{ width: '100%', padding: 12, background: '#0c273d', border: '1px solid #2c4a64', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: '#7fa0b5' }}>
                  Your hardware ID (HWID): <code style={{ background: '#0c273d', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace' }}>{hwid || '(generating…)'}</code>
                  <span style={{ marginLeft: 8 }}>— your license will be bound to this device</span>
                </div>
              </div>

              {/* Payment method selection */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #2c4a64', borderRadius: 14, padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 17 }}>Choose a payment method</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {PAYMENT_METHODS.map((m) => (
                    <button key={m.id} onClick={() => m.id === 'pesapal' ? handlePesapalPay() : null}
                      style={{
                        background: m.id === 'pesapal' ? '#0c273d' : 'transparent',
                        border: '1px solid #2c4a64',
                        borderRadius: 12,
                        padding: 16,
                        cursor: m.id === 'pesapal' ? 'pointer' : 'default',
                        textAlign: 'left',
                        color: '#fff',
                        fontSize: 14,
                        opacity: m.id === 'pesapal' ? 1 : 0.7,
                      }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{m.icon}</div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.name}</div>
                      {m.id !== 'pesapal' ? (
                        <div style={{ fontSize: 12, color: '#b5c9d7' }}>
                          Pay to: <strong style={{ color: '#fff' }}>{m.holder}</strong>
                          <br />
                          Number: <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{m.number}</strong>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#b5c9d7' }}>Visa, Mastercard, Mobile Money via Pesapal</div>
                      )}
                    </button>
                  ))}
                </div>

                {loading && (
                  <div style={{ padding: 16, background: '#0c273d', borderRadius: 8, color: '#61d3a5', fontSize: 14 }}>
                    ⏳ Initiating Pesapal payment…
                  </div>
                )}

                {error && (
                  <div style={{ padding: 12, background: '#4a1e1e', border: '1px solid #7a3030', borderRadius: 8, color: '#ffb3b3', fontSize: 14, marginBottom: 12 }}>
                    ⚠️ {error}
                  </div>
                )}

                {pesapalRedirect && (
                  <div style={{ padding: 16, background: '#0c273d', borderRadius: 8, fontSize: 14 }}>
                    <p style={{ margin: '0 0 8px' }}>Redirecting to Pesapal…</p>
                    <a href={pesapalRedirect} style={{ color: '#61d3a5' }}>Click here if not redirected</a>
                  </div>
                )}

                {manualInstructions && (
                  <div style={{ padding: 16, background: '#0c273d', borderRadius: 8, fontSize: 14 }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 700, color: '#61d3a5' }}>Manual payment instructions</p>
                    <p style={{ margin: '0 0 12px' }}>{manualInstructions.instructions}</p>
                    <p style={{ margin: 0 }}>
                      <a href={`https://wa.me/256752971118?text=${encodeURIComponent('I want to subscribe to ' + selectedPlan.name + ' (' + formatUGX(selectedPlan.price) + '). My HWID is: ' + hwid + '. My email is: ' + email)}`}
                         target="_blank" rel="noreferrer" style={{ color: '#61d3a5', fontWeight: 700 }}>
                        → Send payment confirmation + HWID via WhatsApp
                      </a>
                    </p>
                  </div>
                )}

                <div style={{ marginTop: 20, padding: 14, background: 'rgba(97,211,165,0.08)', border: '1px solid #2a6b50', borderRadius: 10, fontSize: 13, color: '#b5c9d7', lineHeight: 1.6 }}>
                  <strong style={{ color: '#61d3a5' }}>How it works:</strong>
                  <ol style={{ margin: '6px 0 0 18px', padding: 0 }}>
                    <li>Pay {formatUGX(selectedPlan.price)} via any method above.</li>
                    <li>Send your payment screenshot + HWID via WhatsApp to <strong>+256 752 971 118</strong> (or email).</li>
                    <li>We'll generate a license key bound to your HWID + email it to you.</li>
                    <li>Download the desktop app, open the Activation page, paste your key → done!</li>
                  </ol>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── CONTACT section ─── */}
      <section style={{ background: '#f5f8fa', color: '#102a3c', padding: '64px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ color: '#16865e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 12 }}>Get in touch</div>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', letterSpacing: '-.04em', margin: '14px 0' }}>Talk to a real human</h2>
            <p style={{ color: '#587080', fontSize: 17, lineHeight: 1.6, maxWidth: 600, margin: '0 auto' }}>
              Have questions before subscribing? Want a demo? Need technical support? Reach us directly — we typically reply within 4 hours during business hours.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, maxWidth: 880, margin: '0 auto' }}>
            {CONTACTS.map((c) => (
              <a key={c.label} href={c.href} style={{
                background: '#fff',
                border: '1px solid #dce7ed',
                borderRadius: 14,
                padding: 22,
                textDecoration: 'none',
                color: '#102a3c',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#1a73e8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#dce7ed'; }}>
                <div style={{ color: '#16865e', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: '#1a73e8' }}>{c.value}</div>
                <div style={{ fontSize: 13, color: '#587080' }}>{c.person}</div>
              </a>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <a href="https://wa.me/256752971118" target="_blank" rel="noreferrer" style={{ background: '#25d366', color: '#fff', border: 0, borderRadius: 10, padding: '15px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
              💬 Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      {/* ─── DOWNLOAD section ─── */}
      <section style={{ background: '#f5f8fa', color: '#102a3c', padding: '64px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ color: '#16865e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 12, marginBottom: 12 }}>Free download</div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', letterSpacing: '-.04em', margin: '0 0 16px' }}>Get the Ssewasswa School ERP desktop app</h2>
          <p style={{ color: '#587080', fontSize: 17, lineHeight: 1.6, maxWidth: 700, margin: '0 auto 32px' }}>
            Install on Windows 7+ (64-bit). The desktop app gives you full offline access, encrypted local database, hardware-bound license activation, and all 65+ ERP modules — including EMIS compliance and UNEB integration (Premium tier).
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <a href={DOWNLOAD_INFO.url} target="_blank" rel="noreferrer" style={{ background: '#1a73e8', color: '#fff', border: 0, borderRadius: 12, padding: '18px 32px', fontWeight: 800, fontSize: 17, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(26,115,232,0.3)' }}>
              <span style={{ fontSize: 22 }}>⬇️</span>
              <div style={{ textAlign: 'left' }}>
                <div>Download for Windows</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{DOWNLOAD_INFO.fileSize} · {DOWNLOAD_INFO.version}</div>
              </div>
            </a>
            <a href={DOWNLOAD_INFO.releaseNotes} target="_blank" rel="noreferrer" style={{ background: 'transparent', color: '#1a73e8', border: '1px solid #1a73e8', borderRadius: 12, padding: '18px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              View release notes
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, maxWidth: 880, margin: '40px auto 0' }}>
            <div style={{ background: '#fff', border: '1px solid #dce7ed', borderRadius: 12, padding: 18, textAlign: 'left' }}>
              <div style={{ color: '#16865e', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', marginBottom: 6 }}>✅ Step 1</div>
              <strong>Download the .exe</strong>
              <p style={{ fontSize: 13, color: '#587080', margin: '6px 0 0', lineHeight: 1.5 }}>{DOWNLOAD_INFO.fileSize} Windows installer.</p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #dce7ed', borderRadius: 12, padding: 18, textAlign: 'left' }}>
              <div style={{ color: '#16865e', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', marginBottom: 6 }}>📦 Step 2</div>
              <strong>Install on Windows</strong>
              <p style={{ fontSize: 13, color: '#587080', margin: '6px 0 0', lineHeight: 1.5 }}>"Ssewasswa School ERP V10 Setup.exe" — double-click to install.</p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #dce7ed', borderRadius: 12, padding: 18, textAlign: 'left' }}>
              <div style={{ color: '#16865e', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', marginBottom: 6 }}>🔑 Step 3</div>
              <strong>Activate license</strong>
              <p style={{ fontSize: 13, color: '#587080', margin: '6px 0 0', lineHeight: 1.5 }}>"Subscribe" above to get your key, then paste on Activation page.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Other Products section — cross-promote other 7 portals ─── */}
      {/* Ensures visitors to /product-landing discover HMIS, Business, Church,
          Org, Individual, Parent, Student portals too. */}
      <section style={{ background: '#0b1f33', padding: '60px 24px', borderTop: '1px solid #2c455a' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 13, textTransform: 'uppercase', marginBottom: 12 }}>
              Looking for other Ssewasswa products?
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', margin: '0 0 12px', color: '#fff' }}>
              One platform. Many solutions.
            </h2>
            <p style={{ color: '#b5c9d7', fontSize: 17, maxWidth: 700, margin: '0 auto' }}>
              Beyond School ERP, Ssewasswa Comforts Technologies builds software for hospitals, businesses,
              churches, NGOs, and individuals across Uganda. All 8 portals are now LIVE — explore them below.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { icon: '🏥', name: 'HMIS', desc: 'Hospital management — patients, OPD, lab, pharmacy, billing.', route: '/hmis-landing', color: '#0b8043', status: 'Ready' },
              { icon: '🏢', name: 'Business', desc: 'POS, sales, customer CRM, multi-branch, loyalty.', route: '/app/more/business-portal', color: '#5f6368', status: 'Ready' },
              { icon: '⛪', name: 'Church', desc: 'Tithes, donations, sermons, committees.', route: '/app/more/church-portal', color: '#9c27b0', status: 'Ready' },
              { icon: '🌍', name: 'Org / NGO', desc: 'Member directory, finance, donor reporting.', route: '/app/more/org-portal', color: '#00796b', status: 'Ready' },
              { icon: '🧑', name: 'Individual', desc: 'Personal budget, savings goals, debt tracking.', route: '/app/more/individual-portal', color: '#0288d1', status: 'Ready' },
              { icon: '👨‍👩‍👧', name: 'Parent Portal', desc: 'Parents view children\'s data, pay fees online.', route: '/app/more/parent-portal', color: '#d81b60', status: 'Ready' },
              { icon: '🎓', name: 'Student Portal', desc: 'Students view attendance, marks, timetable.', route: '/app/more/student-portal', color: '#7b1fa2', status: 'Ready' },
              { icon: '🧰', name: 'More Features', desc: '70+ features — Tasks, Notifications, Audit Logs, Surveys, etc.', route: '/app/more', color: '#f9ab00', status: '19 Ready' },
            ].map(p => (
              <div key={p.route} style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${p.color}40`,
                borderRadius: 12,
                padding: 20,
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = p.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = p.color + '40'; }}
                onClick={() => navigate(p.route)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 32 }}>{p.icon}</div>
                  <span style={{
                    background: '#0b8043',
                    color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  }}>{p.status}</span>
                </div>
                <h3 style={{ margin: '0 0 8px', color: p.color, fontSize: 16 }}>{p.name}</h3>
                <p style={{ color: '#b5c9d7', fontSize: 12, lineHeight: 1.5, margin: '0 0 12px' }}>{p.desc}</p>
                <span style={{ color: p.color, fontWeight: 700, fontSize: 12 }}>Explore →</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button onClick={() => navigate('/')} style={{
              background: '#1a73e8', color: '#fff', border: 0, borderRadius: 999,
              padding: '14px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>← View All Products on Homepage</button>
          </div>
        </div>
      </section>

      <footer style={{ background: '#071b2f', color: '#8fb3c9', fontSize: 13, padding: '32px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <strong style={{ color: '#fff' }}>Ssewasswa Comforts Technologies™</strong><br />
            School ERP V10 — Uganda
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>+256 789 736 737 (MTN)</div>
            <div>+256 752 971 118 (Airtel)</div>
            <div>support@ssewasswacomfortstechnologies.com</div>
          </div>
        </div>
      </footer>
          <AIChatbot />
    </main>
  );
}
