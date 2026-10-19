// FileName: src/pages/Sponsor.jsx
// Ssewasswa Comforts — Business Advertising Subscription Page
// Businesses pay to advertise their products/services on our platform.
// Three tiers: Starter, Growth, Premium.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatbot from '../components/AIChatbot.jsx';

const AD_TIERS = [
  {
    id: 'starter',
    name: 'Starter Ad',
    price: 50000,
    priceLabel: 'UGX 50,000',
    period: '/month',
    color: '#1a73e8',
    bg: '#e8f0fe',
    badge: null,
    features: [
      'Listed in Business Directory (1 category)',
      'Logo + business name + phone + 50-word description',
      'Visible to all Ssewasswa Comforts users (schools + hospitals)',
      'Basic analytics (views count)',
      'Renewed monthly',
    ],
  },
  {
    id: 'growth',
    name: 'Growth Ad',
    price: 150000,
    priceLabel: 'UGX 150,000',
    period: '/month',
    color: '#0b8043',
    bg: '#e6f4ea',
    badge: 'Most Popular',
    features: [
      'All Starter features',
      'Listed in 3 categories',
      'Banner image (1080×250) on homepage + directory',
      'Featured placement (top of category)',
      'Detailed analytics (views, clicks, demographics)',
      'WhatsApp click-to-chat button',
    ],
  },
  {
    id: 'premium',
    name: 'Premium Ad',
    price: 350000,
    priceLabel: 'UGX 350,000',
    period: '/month',
    color: '#a142f4',
    bg: '#f3e8fd',
    badge: 'Best Value',
    features: [
      'All Growth features',
      'Listed in unlimited categories',
      'Top banner rotation (high-traffic pages)',
      'Featured in AI chatbot recommendations',
      'Promoted in email newsletter (15k+ subscribers)',
      'Custom landing page on our platform',
      'Monthly performance report (PDF)',
    ],
  },
];

const PAYMENT_METHODS = [
  { id: 'momo', name: 'MTN MoMo', holder: 'Kusuya Grace', number: '0789 736 737' },
  { id: 'airtel', name: 'Airtel Money', holder: 'Waiswa Moses', number: '0752 971 118' },
  { id: 'pesapal', name: 'Online Card', holder: 'Visa/Mastercard via Pesapal', number: 'Secure' },
];

export default function Sponsor() {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    category: 'Education Supplies',
    description: '',
    website: '',
    logoUrl: '',
  });

  const handleSubscribe = async () => {
    if (!formData.businessName || !formData.email || !selectedTier) {
      alert('Please fill in business name, email, and select a tier');
      return;
    }
    // Initiate Pesapal payment via the serverless API
    try {
      const res = await fetch('/api/pesapal-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedTier.price,
          email: formData.email,
          reference: `SPONSOR-${Date.now()}`,
          description: `Business Ad: ${selectedTier.name} - ${formData.businessName}`,
          tier: `sponsor-${selectedTier.id}`,
          customerName: formData.contactName || formData.businessName,
          phoneNumber: formData.phone,
          metadata: { type: 'sponsor_subscription', ...formData, tier: selectedTier.id },
        }),
      });
      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.fallback) {
        // Pesapal unavailable — show manual MoMo instructions
        setShowPayment(true);
      } else {
        alert('Could not start payment. Please try again or contact us.');
      }
    } catch (err) {
      // Network error — show manual payment options
      setShowPayment(true);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', fontFamily: "'Segoe UI', sans-serif" }}>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 60px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <button onClick={() => navigate('/')} style={backBtnStyle}>← Back</button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/business-directory')} style={ghostBtnStyle}>Browse Directory</button>
            <button onClick={() => navigate('/login')} style={primaryBtnStyle}>Sign in</button>
          </div>
        </nav>

        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 13, textTransform: 'uppercase', marginBottom: 16 }}>
            Advertise Your Business
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', lineHeight: 1.05, margin: '0 0 20px', letterSpacing: '-.04em' }}>
            Reach 15,000+ schools &amp; hospitals across Uganda.
          </h1>
          <p style={{ color: '#b5c9d7', fontSize: 19, lineHeight: 1.6, maxWidth: 700, margin: '0 auto' }}>
            Ssewasswa Comforts Technologies is the leading SaaS platform for Ugandan education and health sectors.
            Advertise your products — textbooks, uniforms, medical supplies, equipment, furniture, services — directly
            to the decision-makers who buy them.
          </p>
        </div>

        {/* Ad Tier Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, maxWidth: 1000, margin: '0 auto 60px' }}>
          {AD_TIERS.map((tier) => {
            const isSelected = selectedTier?.id === tier.id;
            return (
              <div key={tier.id} style={{
                background: isSelected ? tier.bg : 'rgba(255,255,255,0.04)',
                border: `2px solid ${isSelected ? tier.color : tier.color + '40'}`,
                borderRadius: 16,
                padding: 28,
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: isSelected ? '#071b2f' : '#f7fbff',
              }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = tier.color; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = tier.color + '40'; }}
                onClick={() => setSelectedTier(tier)}
              >
                {tier.badge && (
                  <div style={{
                    display: 'inline-block', background: tier.color, color: '#fff',
                    fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                    marginBottom: 12, letterSpacing: '.05em',
                  }}>{tier.badge}</div>
                )}
                <h3 style={{ margin: '0 0 4px', fontSize: 22, color: isSelected ? tier.color : '#fff' }}>{tier.name}</h3>
                <div style={{ fontSize: 28, fontWeight: 800, color: isSelected ? tier.color : tier.color, marginBottom: 20 }}>
                  {tier.priceLabel}<span style={{ fontSize: 14, fontWeight: 400, color: isSelected ? '#5f6368' : '#8fb3c9' }}>{tier.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 14, lineHeight: 1.8 }}>
                  {tier.features.map((f) => (
                    <li key={f} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: tier.color, fontWeight: 700 }}>✓</span>
                      <span style={{ color: isSelected ? '#3c4043' : '#b5c9d7' }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button style={{
                  marginTop: 20, width: '100%', padding: '12px',
                  background: isSelected ? tier.color : 'transparent',
                  color: isSelected ? '#fff' : tier.color,
                  border: `1px solid ${tier.color}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>{isSelected ? '✓ Selected' : 'Select'}</button>
              </div>
            );
          })}
        </div>

        {/* Business registration form */}
        {selectedTier && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 32, maxWidth: 700, margin: '0 auto 40px', border: '1px solid #2c455a' }}>
            <h2 style={{ marginTop: 0, marginBottom: 20, color: '#fff' }}>Business Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label style={labelStyle}>
                Business Name *
                <input value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} style={inputStyle} placeholder="e.g. Greenfield Bookshop Ltd" />
              </label>
              <label style={labelStyle}>
                Contact Name
                <input value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} style={inputStyle} placeholder="e.g. Jane Mukasa" />
              </label>
              <label style={labelStyle}>
                Email *
                <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={inputStyle} placeholder="jane@greenfield.co.ug" />
              </label>
              <label style={labelStyle}>
                Phone
                <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} placeholder="07xx xxx xxx" />
              </label>
              <label style={labelStyle}>
                Category
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={inputStyle}>
                  <option>Education Supplies</option>
                  <option>Textbooks &amp; Stationery</option>
                  <option>School Uniforms</option>
                  <option>School Furniture</option>
                  <option>IT Equipment</option>
                  <option>Sports Equipment</option>
                  <option>Medical Supplies</option>
                  <option>Pharmaceuticals</option>
                  <option>Lab Equipment</option>
                  <option>Hospital Furniture</option>
                  <option>Catering / Food</option>
                  <option>Transport</option>
                  <option>Banking / Insurance</option>
                  <option>Construction</option>
                  <option>Other</option>
                </select>
              </label>
              <label style={labelStyle}>
                Website (optional)
                <input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} style={inputStyle} placeholder="https://" />
              </label>
              <label style={{ ...labelStyle, gridColumn: '1 / 3' }}>
                Business Description (max 50 words)
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Briefly describe what you sell and why schools/hospitals should buy from you." />
              </label>
              <label style={{ ...labelStyle, gridColumn: '1 / 3' }}>
                Logo URL (optional)
                <input value={formData.logoUrl} onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })} style={inputStyle} placeholder="https://your-logo-url.png" />
              </label>
            </div>
            <button onClick={handleSubscribe} style={{ marginTop: 24, width: '100%', padding: '16px', background: '#1a73e8', color: '#fff', border: 0, borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              Subscribe to {selectedTier.name} — {selectedTier.priceLabel}{selectedTier.period}
            </button>
          </div>
        )}

        {/* Manual payment fallback */}
        {showPayment && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 28, maxWidth: 700, margin: '0 auto 40px' }}>
            <h3 style={{ marginTop: 0, color: '#fff' }}>Manual Payment Options</h3>
            <p style={{ color: '#b5c9d7' }}>Send {selectedTier?.priceLabel} to any of these numbers, then WhatsApp the payment confirmation to <strong>+256 789 736 737</strong> with your business name. We will activate your ad within 24 hours.</p>
            {PAYMENT_METHODS.map((m) => (
              <div key={m.id} style={{ background: '#0b1f33', padding: 16, borderRadius: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700 }}>{m.name}</div>
                  <div style={{ color: '#b5c9d7', fontSize: 13 }}>{m.holder}</div>
                </div>
                <div style={{ color: '#fff', fontWeight: 700 }}>{m.number}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', color: '#8fb3c9', fontSize: 14, marginTop: 40 }}>
          <p>Questions? WhatsApp <strong>+256 789 736 737</strong> or email <strong>support@ssewasswacomfortstechnologies.com</strong></p>
        </div>
      </section>
      <AIChatbot />
    </main>
  );
}

const backBtnStyle = { background: 'transparent', color: '#8fb3c9', border: '1px solid #45657b', borderRadius: 999, padding: '10px 18px', cursor: 'pointer' };
const ghostBtnStyle = { background: 'transparent', color: '#fff', border: '1px solid #45657b', borderRadius: 999, padding: '10px 18px', cursor: 'pointer' };
const primaryBtnStyle = { background: '#1a73e8', color: '#fff', border: 0, borderRadius: 999, padding: '10px 18px', cursor: 'pointer' };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#b5c9d7', fontWeight: 600 };
const inputStyle = { padding: '10px 12px', borderRadius: 6, border: '1px solid #45657b', background: '#0b1f33', color: '#fff', fontSize: 14, fontFamily: 'inherit' };
