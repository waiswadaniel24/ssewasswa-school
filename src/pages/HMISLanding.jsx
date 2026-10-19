// FileName: src/pages/HMISLanding.jsx
// Ssewasswa Comforts HMIS — Health Management Information System
// Marketing + subscription + download landing page

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatbot from '../components/AIChatbot.jsx';

const HMIS_PLANS = [
  {
    id: 'ordinary',
    tier: 'ORD',
    name: 'Ordinary Access',
    price: 200000,
    priceLabel: 'UGX 200,000',
    period: '/year',
    color: '#1a73e8',
    features: [
      'Patient registration + demographics',
      'OPD management (triage, diagnosis, prescription)',
      'IPD/ward management (beds, admissions, discharges)',
      'Laboratory (test requests, results)',
      'Pharmacy (drug inventory, dispensing)',
      'Billing + insurance claims',
      'Single facility license (HWID-bound)',
      'Email support (48-hour response)',
    ],
  },
  {
    id: 'premium',
    tier: 'PREM',
    name: 'Premium Access ⭐',
    price: 400000,
    priceLabel: 'UGX 400,000',
    period: '/year',
    color: '#0b8043',
    badge: 'Best Value',
    features: [
      'ALL Ordinary features included',
      'Maternal health (antenatal, delivery, postnatal)',
      'Child health + immunization tracking',
      'HIV/TB/Malaria program management',
      'Surgical theatre scheduling + notes',
      'DHIS2 reporting to Ministry of Health',
      'Mortuary management',
      'Priority WhatsApp support (4-hour response)',
      'Free updates for 1 year',
    ],
  },
];

const HMIS_CONTACTS = [
  { label: 'WhatsApp / MTN', value: '+256 789 736 737', href: 'https://wa.me/256789736737', person: 'Ssewasswa Comforts Tech' },
  { label: 'Call / Airtel', value: '+256 752 971 118', href: 'tel:+256752971118', person: 'Ssewasswa Comforts Tech' },
  { label: 'Email', value: 'support@ssewasswacomfortstechnologies.com', href: 'mailto:support@ssewasswacomfortstechnologies.com', person: 'Support Team' },
];

export default function HMISLanding() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentStep, setPaymentStep] = useState('plans');

  return (
    <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', fontFamily: "'Segoe UI', sans-serif" }}>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 60px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/ssewasswa-comforts-school-erp-mark.png" alt="Ssewasswa" style={{ width: 46, height: 46, objectFit: 'contain' }} />
            <div>
              <strong style={{ letterSpacing: '.06em' }}>SSEWASSWA HMIS</strong>
              <div style={{ color: '#8fb3c9', fontSize: 12 }}>Health Management Information System</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/')} style={{ background: 'transparent', color: '#8fb3c9', border: '1px solid #45657b', borderRadius: 999, padding: '11px 18px', cursor: 'pointer' }}>← Back to Products</button>
            <button onClick={() => navigate('/login?next=/hmis')} style={{ background: 'transparent', color: '#fff', border: '1px solid #45657b', borderRadius: 999, padding: '11px 18px', cursor: 'pointer' }}>Sign in</button>
          </div>
        </nav>

        <div style={{ textAlign: 'center', paddingTop: 60, paddingBottom: 40 }}>
          <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 13, textTransform: 'uppercase', marginBottom: 16 }}>🏥 Health Management Information System</div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', lineHeight: 1.05, margin: '0 0 20px', letterSpacing: '-.04em' }}>Run your hospital with confidence.</h1>
          <p style={{ color: '#b5c9d7', fontSize: 19, lineHeight: 1.6, maxWidth: 700, margin: '0 auto 32px' }}>
            Complete hospital management for Ugandan health facilities. Patient records, OPD, IPD, lab, pharmacy, billing, maternal health, DHIS2 reporting.
            Works offline on any Windows PC.
          </p>
        </div>

        {/* Vision section */}
        <div style={{ background: 'rgba(97,211,165,0.08)', border: '1px solid #2a6b50', borderRadius: 16, padding: 32, marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
          <h3 style={{ color: '#61d3a5', fontSize: 18, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Our Vision</h3>
          <p style={{ fontSize: 20, lineHeight: 1.6, color: '#f7fbff', maxWidth: 700, margin: '0 auto' }}>
            To digitize every health facility in Uganda — from village clinics to regional hospitals — with affordable, offline-capable HMIS that works even without internet.
          </p>
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 880, margin: '0 auto' }}>
          {HMIS_PLANS.map((plan) => (
            <div key={plan.id} style={{ background: '#fff', border: `2px solid ${plan.badge ? plan.color : '#dce7ed'}`, borderRadius: 16, padding: 28, position: 'relative', boxShadow: '0 8px 30px rgba(0,0,0,.06)', color: '#102a3c' }}>
              {plan.badge && <div style={{ position: 'absolute', top: -14, right: 20, background: plan.color, color: '#fff', padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{plan.badge}</div>}
              <h3 style={{ margin: '0 0 8px', color: plan.color, fontSize: 22 }}>{plan.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: plan.color }}>{plan.priceLabel}</span>
                <span style={{ fontSize: 14, color: '#587080' }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', fontSize: 14, lineHeight: 1.7 }}>
                {plan.features.map((f) => <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}><span style={{ color: plan.color, fontWeight: 700 }}>✓</span><span style={{ color: '#374753' }}>{f}</span></li>)}
              </ul>
              <button onClick={() => { setSelectedPlan(plan); setPaymentStep('methods'); }} style={{ width: '100%', background: plan.color, color: '#fff', border: 0, borderRadius: 10, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Subscribe to {plan.name.replace(' ⭐', '')}</button>
            </div>
          ))}
        </div>

        {/* Payment section */}
        {selectedPlan && (
          <div style={{ background: '#0c273d', border: '1px solid #2c4a64', borderRadius: 14, padding: 24, marginTop: 24, maxWidth: 880, margin: '24px auto 0' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 20, margin: '0 0 8px' }}>{selectedPlan.name} — {selectedPlan.priceLabel}{selectedPlan.period}</h3>
              <button onClick={() => { setSelectedPlan(null); setPaymentStep('plans'); }} style={{ background: 'transparent', color: '#8fb3c9', border: '1px solid #2c4a64', borderRadius: 999, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>← Choose different plan</button>
            </div>
            <div style={{ padding: 16, background: 'rgba(97,211,165,0.08)', border: '1px solid #2a6b50', borderRadius: 10, fontSize: 13, color: '#b5c9d7', lineHeight: 1.6 }}>
              <strong style={{ color: '#61d3a5' }}>How to pay:</strong>
              <ol style={{ margin: '6px 0 0 18px' }}>
                <li>Pay {selectedPlan.priceLabel} via MTN MoMo to 0789 736 737 OR Airtel to 0752 971 118</li>
                <li>Send payment screenshot + your HWID via WhatsApp to +256 789 736 737</li>
                <li>Receive your license key via email automatically</li>
                <li>Download the HMIS desktop app + activate with your license key</li>
              </ol>
            </div>
          </div>
        )}

        {/* Download section */}
        <section style={{ background: '#f5f8fa', color: '#102a3c', padding: '64px 24px', marginTop: 64, borderRadius: 16 }}>
          <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ color: '#16865e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 12 }}>Free download</div>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', letterSpacing: '-.04em', margin: '14px 0 16px' }}>Get the Ssewasswa HMIS desktop app</h2>
            <p style={{ color: '#587080', fontSize: 17, lineHeight: 1.6, maxWidth: 700, margin: '0 auto 32px' }}>Install on Windows 7+ (64-bit). Full offline access, encrypted local database, hardware-bound license activation.</p>
            <a href="https://github.com/waiswadaniel24/ssewasswa-school/releases/download/v10.0.0/Ssewasswa-School-ERP-V10-Setup.exe" target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#0b8043', color: '#fff', border: 0, borderRadius: 12, padding: '18px 32px', fontWeight: 800, fontSize: 17, cursor: 'pointer', textDecoration: 'none', boxShadow: '0 8px 24px rgba(11,128,67,0.3)' }}>
              ⬇️ Download for Windows
            </a>
          </div>
        </section>

        {/* Contact section */}
        <section style={{ background: '#f5f8fa', color: '#102a3c', padding: '64px 24px', marginTop: 32, borderRadius: 16 }}>
          <div style={{ maxWidth: 880, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ color: '#16865e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 12 }}>Get in touch</div>
              <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', letterSpacing: '-.04em', margin: '14px 0' }}>Talk to a real human</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {HMIS_CONTACTS.map((c) => (
                <a key={c.label} href={c.href} style={{ background: '#fff', border: '1px solid #dce7ed', borderRadius: 14, padding: 22, textDecoration: 'none', color: '#102a3c' }}>
                  <div style={{ color: '#16865e', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: '#0b8043' }}>{c.value}</div>
                  <div style={{ fontSize: 13, color: '#587080' }}>{c.person}</div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </section>
      <AIChatbot />
    </main>
  );
}
