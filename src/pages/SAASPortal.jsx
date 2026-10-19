// FileName: src/pages/SAASPortal.jsx
// Ssewasswa Comforts Technologies — SaaS Portal
// Homepage with product selector: School ERP vs HMIS

import React from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatbot from '../components/AIChatbot.jsx';

const PRODUCTS = [
  {
    id: 'school-erp',
    name: 'School ERP',
    icon: '🏫',
    tagline: 'Complete school management for Ugandan schools',
    description: '65+ modules for students, staff, academics, finance, EMIS compliance, UNEB registration, and more.',
    priceFrom: 'UGX 150,000/year',
    color: '#1a73e8',
    bg: '#e8f0fe',
    features: [
      'Student admissions + profiles + attendance',
      'Staff management + payroll',
      'Exams, report cards, promotion',
      'Fees collection + accounting',
      'EMIS compliance + UNEB registration (Premium)',
      '16 education sectors (Primary, Secondary, Technical, etc.)',
      '6 exam boards (UNEB, UBTEB, NCHE, etc.)',
      'Works offline on any Windows PC',
    ],
    route: '/product-landing',
    downloadUrl: 'https://github.com/waiswadaniel24/ssewasswa-school/releases/download/v10.0.0/Ssewasswa-School-ERP-V10-Setup.exe',
  },
  {
    id: 'hmis',
    name: 'HMIS',
    icon: '🏥',
    tagline: 'Health Management Information System for Ugandan hospitals',
    description: 'Patient management, OPD, IPD, lab, pharmacy, billing, maternal health, DHIS2 reporting.',
    priceFrom: 'UGX 200,000/year',
    color: '#0b8043',
    bg: '#e6f4ea',
    features: [
      'Patient registration + demographics + history',
      'OPD management (triage, diagnosis, prescription)',
      'IPD/ward management (beds, admissions, discharges)',
      'Laboratory (test requests, results, tracking)',
      'Pharmacy (drug inventory, dispensing, stock alerts)',
      'Billing + insurance (NHIS, private, self-pay)',
      'Maternal + child health (Premium)',
      'DHIS2 reporting to Ministry of Health (Premium)',
    ],
    route: '/hmis-landing',
    downloadUrl: 'https://github.com/waiswadaniel24/ssewasswa-school/releases/download/v10.0.0/Ssewasswa-School-ERP-V10-Setup.exe',
  },
];

export default function SAASPortal() {
  const navigate = useNavigate();

  return (
    <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Hero */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 60px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/ssewasswa-comforts-school-erp-mark.png" alt="Ssewasswa" style={{ width: 46, height: 46, objectFit: 'contain' }} />
            <div>
              <strong style={{ letterSpacing: '.06em' }}>SSEWASSWA COMFORTS</strong>
              <div style={{ color: '#8fb3c9', fontSize: 12 }}>Technologies — SaaS Platform</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => navigate('/login?next=/app')} style={{ background: 'transparent', color: '#fff', border: '1px solid #45657b', borderRadius: 999, padding: '11px 18px', cursor: 'pointer' }}>
              School ERP Sign in
            </button>
            <button onClick={() => navigate('/login?next=/hmis')} style={{ background: '#0b8043', color: '#fff', border: 0, borderRadius: 999, padding: '11px 18px', cursor: 'pointer', fontWeight: 600 }}>
              HMIS Sign in
            </button>
          </div>
        </nav>

        <div style={{ textAlign: 'center', paddingTop: 60, paddingBottom: 40 }}>
          <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 13, textTransform: 'uppercase', marginBottom: 16 }}>
            Choose Your Solution
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', lineHeight: 1.05, margin: '0 0 20px', letterSpacing: '-.04em' }}>
            One platform. Two industries.
          </h1>
          <p style={{ color: '#b5c9d7', fontSize: 19, lineHeight: 1.6, maxWidth: 700, margin: '0 auto 32px' }}>
            Ssewasswa Comforts Technologies builds affordable management software for Ugandan education and health sectors.
            Pick your industry below to get started.
          </p>
        </div>

        {/* Product Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, maxWidth: 900, margin: '0 auto' }}>
          {PRODUCTS.map((product) => (
            <div key={product.id} style={{
              background: 'rgba(255,255,255,0.04)',
              border: `2px solid ${product.color}40`,
              borderRadius: 16,
              padding: 32,
              cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = product.color; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = product.color + '40'; }}
              onClick={() => navigate(product.route)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: product.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36,
                }}>{product.icon}</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 28, color: product.color }}>{product.name}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#8fb3c9' }}>{product.tagline}</p>
                </div>
              </div>

              <p style={{ fontSize: 15, lineHeight: 1.6, color: '#b5c9d7', marginBottom: 20 }}>{product.description}</p>

              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: product.color }}>{product.priceFrom}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', fontSize: 14, lineHeight: 1.8 }}>
                {product.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: product.color, fontWeight: 700 }}>✓</span>
                    <span style={{ color: '#9ab4c5' }}>{f}</span>
                  </li>
                ))}
              </ul>

              <button onClick={(e) => { e.stopPropagation(); navigate(product.route); }} style={{
                width: '100%', padding: '14px', background: product.color, color: '#fff',
                border: '0', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}>
                Explore {product.name} →
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 48, color: '#8fb3c9', fontSize: 14 }}>
          <p>Ssewasswa Comforts Technologies — Uganda 🇺🇬</p>
          <p>MTN: +256 789 736 737 | Airtel: +256 752 971 118 | support@ssewasswacomfortstechnologies.com</p>
        </div>
      </section>

      {/* Marketplace section — sponsor / donor / news / directory */}
      <section style={{ background: '#0b1f33', padding: '60px 24px', borderTop: '1px solid #2c455a' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 13, textTransform: 'uppercase', marginBottom: 12 }}>
              Beyond Software
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', margin: '0 0 16px', color: '#fff' }}>
              Marketplace. Connections. News.
            </h2>
            <p style={{ color: '#b5c9d7', fontSize: 17, maxWidth: 700, margin: '0 auto' }}>
              Ssewasswa Comforts is more than ERP — we connect schools, hospitals, sponsors, donors, and suppliers across Uganda.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { icon: '📣', title: 'Advertise Your Business', desc: 'Reach 15,000+ schools & hospitals. From UGX 50k/month.', route: '/sponsor', cta: 'List your business', color: '#1a73e8' },
              { icon: '🤝', title: 'Donor Connections', desc: 'Schools/hospitals seeking support connect with verified donors.', route: '/donors', cta: 'Find a donor', color: '#0b8043' },
              { icon: '📰', title: 'News & Updates', desc: 'Education + health sector news via email/WhatsApp/SMS.', route: '/news', cta: 'Subscribe to news', color: '#a142f4' },
              { icon: '🏪', title: 'Business Directory', desc: 'Browse trusted suppliers for your school/hospital.', route: '/business-directory', cta: 'Browse directory', color: '#f9ab00' },
            ].map((card) => (
              <div key={card.route} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${card.color}40`, borderRadius: 12, padding: 24, cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = card.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = card.color + '40'; }}
                onClick={() => navigate(card.route)}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{card.icon}</div>
                <h3 style={{ margin: '0 0 8px', color: card.color, fontSize: 18 }}>{card.title}</h3>
                <p style={{ color: '#b5c9d7', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>{card.desc}</p>
                <span style={{ color: card.color, fontWeight: 700, fontSize: 13 }}>{card.cta} →</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <AIChatbot />
    </main>
  );
}
