// FileName: src/pages/News.jsx
// Ssewasswa Comforts — News & Updates Subscription Page
// Users subscribe to receive news about: education sector, health sector, donors,
// sponsor opportunities, government policies (EMIS/DHIS2 updates), training events.
// Subscription is free for email; paid for WhatsApp + SMS delivery.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatbot from '../components/AIChatbot.jsx';

const NEWS_CATEGORIES = [
  { id: 'education', label: 'Education sector news', icon: '🎓', desc: 'UNEB results, term dates, MoES policies, school management tips' },
  { id: 'health', label: 'Health sector news', icon: '🏥', desc: 'MoH updates, DHIS2 changes, disease outbreaks, training events' },
  { id: 'sponsors', label: 'Sponsor opportunities', icon: '🤝', desc: 'New sponsors + donor opportunities in your area' },
  { id: 'product', label: 'Product updates', icon: '📦', desc: 'Ssewasswa ERP + HMIS new features, version releases' },
  { id: 'training', label: 'Training & webinars', icon: '📚', desc: 'Free online training sessions, workshops, conferences' },
  { id: 'tenders', label: 'Tender opportunities', icon: '📑', desc: 'Government + NGO tenders relevant to schools/hospitals' },
];

const SUBSCRIPTION_TIERS = [
  { id: 'email', name: 'Email Newsletter', price: 0, priceLabel: 'FREE', period: '', features: ['Weekly digest via email', '1 email every Monday morning', 'Unsubscribe anytime'] },
  { id: 'whatsapp', name: 'WhatsApp Alerts', price: 30000, priceLabel: 'UGX 30,000', period: '/year', features: ['Real-time news alerts on WhatsApp', 'Up to 3 alerts per week', 'Private Ssewasswa Comforts WhatsApp channel', 'Reply directly to ask questions'] },
  { id: 'sms', name: 'SMS Alerts', price: 60000, priceLabel: 'UGX 60,000', period: '/year', features: ['SMS to your phone (works without internet)', 'Up to 5 alerts per week', 'Best for rural areas with poor network', 'Available on MTN + Airtel'] },
];

export default function News() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    categories: ['education'],
    tier: 'email',
    institutionName: '',
    role: 'Head Teacher',
  });
  const [recentNews, setRecentNews] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((data) => { if (data.success) setRecentNews(data.news || []); })
      .catch(() => {});
  }, []);

  const toggleCategory = (id) => {
    setFormData((prev) => {
      const categories = prev.categories.includes(id)
        ? prev.categories.filter((c) => c !== id)
        : [...prev.categories, id];
      return { ...prev, categories };
    });
  };

  const handleSubscribe = async () => {
    if (!formData.email && formData.tier !== 'sms') {
      alert('Please enter your email');
      return;
    }
    if ((formData.tier === 'whatsapp' || formData.tier === 'sms') && !formData.phone) {
      alert('Please enter your phone number for WhatsApp/SMS alerts');
      return;
    }
    // Free email = direct registration. Paid = Pesapal.
    if (formData.tier === 'email') {
      try {
        const res = await fetch('/api/news-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (data.success) {
          setSubmitted(true);
        } else {
          alert(data.error || 'Could not subscribe. Please try again.');
        }
      } catch (err) {
        alert('Network error. Please try again.');
      }
      return;
    }
    // Paid — initiate Pesapal
    const tier = SUBSCRIPTION_TIERS.find((t) => t.id === formData.tier);
    try {
      const res = await fetch('/api/pesapal-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: tier.price,
          email: formData.email,
          reference: `NEWS-${Date.now()}`,
          description: `News subscription: ${tier.name}`,
          tier: `news-${tier.id}`,
          customerName: formData.name,
          phoneNumber: formData.phone,
          metadata: { type: 'news_subscription', ...formData, tier: tier.id },
        }),
      });
      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert('Could not start payment. WhatsApp +256 789 736 737 to pay manually.');
      }
    } catch (err) {
      alert('Network error. WhatsApp +256 789 736 737.');
    }
  };

  if (submitted) {
    return (
      <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif", padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 500 }}>
          <div style={{ fontSize: 80, marginBottom: 20 }}>✓</div>
          <h1 style={{ fontSize: 32, marginBottom: 16 }}>You're subscribed!</h1>
          <p style={{ color: '#b5c9d7', fontSize: 17, lineHeight: 1.6, marginBottom: 30 }}>
            We will send you weekly news digest to <strong style={{ color: '#fff' }}>{formData.email}</strong> covering:
            {formData.categories.map((c) => NEWS_CATEGORIES.find((n) => n.id === c)?.label).join(', ')}.
          </p>
          <button onClick={() => navigate('/')} style={{ background: '#1a73e8', color: '#fff', border: 0, borderRadius: 8, padding: '12px 24px', fontSize: 16, cursor: 'pointer' }}>Back to Home</button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', fontFamily: "'Segoe UI', sans-serif" }}>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 60px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <button onClick={() => navigate('/')} style={backBtnStyle}>← Back</button>
          <button onClick={() => navigate('/login')} style={primaryBtnStyle}>Sign in</button>
        </nav>

        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 13, textTransform: 'uppercase', marginBottom: 16 }}>
            News &amp; Updates
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', lineHeight: 1.05, margin: '0 0 20px', letterSpacing: '-.04em' }}>
            Stay informed. Make better decisions.
          </h1>
          <p style={{ color: '#b5c9d7', fontSize: 19, lineHeight: 1.6, maxWidth: 700, margin: '0 auto' }}>
            Get news on Ugandan education + health sectors, donor opportunities, product updates, training events, and government tenders —
            delivered to your email, WhatsApp, or SMS.
          </p>
        </div>

        {/* Recent news teaser */}
        {recentNews.length > 0 && (
          <div style={{ marginBottom: 50 }}>
            <h2 style={{ textAlign: 'center', fontSize: 24, marginBottom: 24 }}>Recent Updates</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {recentNews.slice(0, 3).map((n) => (
                <div key={n.id} style={{ background: '#0b1f33', borderRadius: 12, padding: 20, border: '1px solid #2c455a' }}>
                  <div style={{ color: '#61d3a5', fontSize: 11, textTransform: 'uppercase', marginBottom: 8 }}>{n.category}</div>
                  <h4 style={{ margin: '0 0 8px', color: '#fff' }}>{n.title}</h4>
                  <p style={{ color: '#b5c9d7', fontSize: 13, lineHeight: 1.5 }}>{n.summary}</p>
                  <div style={{ color: '#8fb3c9', fontSize: 11, marginTop: 10 }}>{new Date(n.publishedAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subscription form */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 32, maxWidth: 700, margin: '0 auto 40px', border: '1px solid #2c455a' }}>
          <h2 style={{ marginTop: 0, marginBottom: 20, color: '#fff' }}>Subscribe</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <label style={labelStyle}>Your Name
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} placeholder="Jane Mukasa" />
            </label>
            <label style={labelStyle}>Email
              <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={inputStyle} placeholder="jane@school.ac.ug" />
            </label>
            <label style={labelStyle}>Phone
              <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} placeholder="07xx xxx xxx" />
            </label>
            <label style={labelStyle}>Institution (optional)
              <input value={formData.institutionName} onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })} style={inputStyle} placeholder="St. Mary's Primary School" />
            </label>
            <label style={labelStyle}>Your Role
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} style={inputStyle}>
                <option>Head Teacher</option><option>Deputy Head Teacher</option><option>Bursar</option>
                <option>Hospital Administrator</option><option>Medical Officer</option>
                <option>Donor / Sponsor</option><option>Other</option>
              </select>
            </label>
          </div>

          <fieldset style={{ border: '1px solid #2c455a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <legend style={{ color: '#b5c9d7', fontSize: 13, padding: '0 8px' }}>What news do you want?</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              {NEWS_CATEGORIES.map((cat) => (
                <label key={cat.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#b5c9d7', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.categories.includes(cat.id)} onChange={() => toggleCategory(cat.id)} style={{ marginTop: 3 }} />
                  <span><strong style={{ color: '#fff' }}>{cat.icon} {cat.label}</strong><br /><span style={{ fontSize: 11, color: '#8fb3c9' }}>{cat.desc}</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset style={{ border: '1px solid #2c455a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <legend style={{ color: '#b5c9d7', fontSize: 13, padding: '0 8px' }}>Delivery method</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
              {SUBSCRIPTION_TIERS.map((tier) => (
                <label key={tier.id} style={{
                  background: formData.tier === tier.id ? '#1a73e8' : 'transparent',
                  color: formData.tier === tier.id ? '#fff' : '#b5c9d7',
                  border: `1px solid ${formData.tier === tier.id ? '#1a73e8' : '#45657b'}`,
                  borderRadius: 8, padding: 12, cursor: 'pointer', fontSize: 13,
                }}>
                  <input type="radio" name="tier" checked={formData.tier === tier.id} onChange={() => setFormData({ ...formData, tier: tier.id })} style={{ display: 'none' }} />
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{tier.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{tier.priceLabel}<span style={{ fontSize: 12, fontWeight: 400 }}>{tier.period}</span></div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', fontSize: 11, lineHeight: 1.4 }}>
                    {tier.features.map((f) => <li key={f} style={{ marginBottom: 4 }}>✓ {f}</li>)}
                  </ul>
                </label>
              ))}
            </div>
          </fieldset>

          <button onClick={handleSubscribe} style={{ width: '100%', padding: '14px', background: '#0b8043', color: '#fff', border: 0, borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {formData.tier === 'email' ? 'Subscribe (Free)' : `Subscribe & Pay ${SUBSCRIPTION_TIERS.find((t) => t.id === formData.tier)?.priceLabel}`}
          </button>
        </div>

        <div style={{ textAlign: 'center', color: '#8fb3c9', fontSize: 14 }}>
          <p>Questions? WhatsApp <strong>+256 789 736 737</strong></p>
        </div>
      </section>
      <AIChatbot />
    </main>
  );
}

const backBtnStyle = { background: 'transparent', color: '#8fb3c9', border: '1px solid #45657b', borderRadius: 999, padding: '10px 18px', cursor: 'pointer' };
const primaryBtnStyle = { background: '#1a73e8', color: '#fff', border: 0, borderRadius: 999, padding: '10px 18px', cursor: 'pointer' };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#b5c9d7', fontWeight: 600 };
const inputStyle = { padding: '10px 12px', borderRadius: 6, border: '1px solid #45657b', background: '#0b1f33', color: '#fff', fontSize: 14, fontFamily: 'inherit' };
