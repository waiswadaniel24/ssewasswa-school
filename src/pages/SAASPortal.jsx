// FileName: src/pages/SAASPortal.jsx
// Ssewasswa Comforts Technologies — Multi-Portal SaaS Landing
// Shows ALL portals/products on one page: School ERP, HMIS, Business, Church,
// Org, Individual, Parent, Student, plus Marketplace + More Features.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatbot from '../components/AIChatbot.jsx';

// All portals/products in one catalog. status: 'ready' = full landing page
// available; 'soon' = coming soon page (description + ETA).
const PRODUCTS = [
  {
    id: 'school-erp',
    name: 'School ERP',
    icon: '🏫',
    tagline: 'Complete school management for Ugandan schools',
    description: '65+ modules for students, staff, academics, finance, EMIS compliance, UNEB registration. 16 education sectors + 6 exam boards.',
    priceFrom: 'UGX 150,000/year',
    color: '#1a73e8',
    bg: '#e8f0fe',
    status: 'ready',
    route: '/product-landing',
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
  },
  {
    id: 'hmis',
    name: 'HMIS',
    icon: '🏥',
    tagline: 'Health Management Information System for Ugandan hospitals',
    description: 'Patient management, OPD, IPD, lab, pharmacy, billing, maternal health, DHIS2 reporting. 6 facility types.',
    priceFrom: 'UGX 100,000/year (drug shop) → UGX 1.2M/year (hospital)',
    color: '#0b8043',
    bg: '#e6f4ea',
    status: 'ready',
    route: '/hmis-landing',
    features: [
      'Patient registration + demographics + history',
      'OPD management (triage, diagnosis, prescription)',
      'IPD/ward management (beds, admissions, discharges)',
      'Laboratory (test requests, results, tracking)',
      'Pharmacy (drug inventory, dispensing, stock alerts)',
      'Billing + insurance (NHIS, private, self-pay)',
      'Maternal + child health (Premium)',
      'DHIS2 reporting to Ministry of Health (Premium)',
      '6 facility types: Drug Shop → General Hospital',
    ],
  },
  {
    id: 'business-portal',
    name: 'Business / SME',
    icon: '🏢',
    tagline: 'POS + sales + customer CRM for small businesses',
    description: 'Point of sale, sales tracking, customer database, multi-branch, expense tracking, debt payoff planner, bill reminders, loyalty points.',
    priceFrom: 'Coming Q3 2026',
    color: '#5f6368',
    bg: '#f1f3f4',
    status: 'soon',
    route: '/app/more/business-portal',
    features: [
      'Point of Sale (POS) with barcode scanning',
      'Sales tracking + charts',
      'Customer CRM with purchase history',
      'Multi-branch management',
      'Supplier database + purchase orders',
      'Expense tracking + debt payoff planner',
      'Bill reminders + recurring invoices',
      'Loyalty points system',
    ],
  },
  {
    id: 'church-portal',
    name: 'Church / Religious Org',
    icon: '⛪',
    tagline: 'Tithes, donations, sermons library for churches',
    description: 'Track tithes, record donations, manage sermon library, organize committees, log volunteer hours, plan events.',
    priceFrom: 'Coming Q3 2026',
    color: '#9c27b0',
    bg: '#f3e5f5',
    status: 'soon',
    route: '/app/more/church-portal',
    features: [
      'Tithes tracking (member contributions)',
      'Donations + pledges',
      'Sermon library (audio/video + transcripts)',
      'Committee management',
      'Volunteer hours log',
      'Event planning (services, conferences, retreats)',
      'Member directory',
      'Finance reporting',
    ],
  },
  {
    id: 'org-portal',
    name: 'Org / NGO / CBO',
    icon: '🌍',
    tagline: 'Member directory + finance for organizations',
    description: 'Member registration, membership renewal, finance tracking, project management, donor reporting, volunteer coordination.',
    priceFrom: 'Coming Q2 2026',
    color: '#00796b',
    bg: '#e0f2f1',
    status: 'soon',
    route: '/app/more/org-portal',
    features: [
      'Member directory + registration',
      'Membership renewal tracking',
      'Organization finance (income/expenses)',
      'Project management + reporting',
      'Donor database + reporting',
      'Volunteer coordination + hours log',
      'Event registration + attendance',
      'Annual reports generation',
    ],
  },
  {
    id: 'individual-portal',
    name: 'Individual / Personal',
    icon: '🧑',
    tagline: 'Personal budget + savings goals',
    description: 'Personal budgeting, savings goals, expense tracking, debt management, financial planning.',
    priceFrom: 'Coming Q2 2026',
    color: '#0288d1',
    bg: '#e1f5fe',
    status: 'soon',
    route: '/app/more/individual-portal',
    features: [
      'Personal budget (monthly income/expenses)',
      'Savings goals with progress tracking',
      'Expense categorization + charts',
      'Debt tracking + payoff planner',
      'Net worth tracking',
      'Financial calendar (bills, due dates)',
      'Receipt scanning + storage',
      'Investment portfolio tracking',
    ],
  },
  {
    id: 'parent-portal',
    name: 'Parent Portal',
    icon: '👨‍👩‍👧',
    tagline: 'Parent access to children\'s school data',
    description: 'Parents view attendance, fees, report cards, exam results, school announcements. Communicate with teachers.',
    priceFrom: 'Coming Q1 2026 (PRIORITY)',
    color: '#d81b60',
    bg: '#fce4ec',
    status: 'soon',
    route: '/app/more/parent-portal',
    features: [
      'View child attendance',
      'Pay school fees online (Pesapal/MoMo)',
      'Download report cards + exam results',
      'View teacher communications',
      'Receive SMS/email alerts',
      'School announcements + calendar',
      'Parent-teacher meeting scheduling',
      'Multi-child support',
    ],
  },
  {
    id: 'student-portal',
    name: 'Student Portal',
    icon: '🎓',
    tagline: 'Student access to own academic data',
    description: 'Students view attendance, marks, assignments, timetable, exam results, school announcements.',
    priceFrom: 'Coming Q1 2026 (PRIORITY)',
    color: '#7b1fa2',
    bg: '#f3e5f5',
    status: 'soon',
    route: '/app/more/student-portal',
    features: [
      'View own attendance',
      'Check marks + exam results',
      'View assignments + homework',
      'Personal timetable',
      'School announcements',
      'Library book checkout history',
      'Fees balance + payment status',
      'ID card download',
    ],
  },
];

// Marketplace section (separate from product portals)
const MARKETPLACE = [
  { icon: '📣', title: 'Advertise Your Business', desc: 'Reach 15,000+ schools & hospitals. From UGX 50k/month.', route: '/sponsor', cta: 'List your business', color: '#1a73e8' },
  { icon: '🤝', title: 'Donor Connections', desc: 'Schools/hospitals seeking support connect with verified donors.', route: '/donors', cta: 'Find a donor', color: '#0b8043' },
  { icon: '📰', title: 'News & Updates', desc: 'Education + health sector news via email/WhatsApp/SMS.', route: '/news', cta: 'Subscribe to news', color: '#a142f4' },
  { icon: '🏪', title: 'Business Directory', desc: 'Browse trusted suppliers for your school/hospital.', route: '/business-directory', cta: 'Browse directory', color: '#f9ab00' },
];

export default function SAASPortal() {
  const navigate = useNavigate();
  const readyCount = PRODUCTS.filter(p => p.status === 'ready').length;
  const soonCount = PRODUCTS.filter(p => p.status === 'soon').length;

  return (
    <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', fontFamily: "'Segoe UI', sans-serif" }}>
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px 60px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/ssewasswa-comforts-school-erp-mark.png" alt="Ssewasswa" style={{ width: 46, height: 46, objectFit: 'contain' }} />
            <div>
              <strong style={{ letterSpacing: '.06em' }}>SSEWASSWA COMFORTS</strong>
              <div style={{ color: '#8fb3c9', fontSize: 12 }}>Technologies — Multi-Portal SaaS Platform</div>
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

        <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 50 }}>
          <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 13, textTransform: 'uppercase', marginBottom: 16 }}>
            One Platform. All Your Solutions.
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', lineHeight: 1.05, margin: '0 0 20px', letterSpacing: '-.04em' }}>
            Manage every aspect of your organization.
          </h1>
          <p style={{ color: '#b5c9d7', fontSize: 19, lineHeight: 1.6, maxWidth: 720, margin: '0 auto 16px' }}>
            Ssewasswa Comforts Technologies builds affordable management software for Ugandan education,
            health, business, religious, and personal finance sectors. Choose your portal below.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, color: '#8fb3c9', fontSize: 13 }}>
            <span><strong style={{ color: '#61d3a5' }}>{readyCount}</strong> ready now</span>
            <span><strong style={{ color: '#f9ab00' }}>{soonCount}</strong> coming soon</span>
            <span><strong style={{ color: '#fff' }}>70+</strong> features</span>
            <span><strong style={{ color: '#fff' }}>8</strong> portals</span>
          </div>
        </div>

        {/* Portal cards — ALL portals shown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
          {PRODUCTS.map((product) => (
            <div key={product.id} style={{
              background: 'rgba(255,255,255,0.04)',
              border: `2px solid ${product.color}40`,
              borderRadius: 16,
              padding: 28,
              cursor: 'pointer',
              transition: 'border-color 0.2s, transform 0.2s',
              position: 'relative',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = product.color; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = product.color + '40'; }}
              onClick={() => navigate(product.route)}
            >
              {product.status === 'soon' && (
                <div style={{ position: 'absolute', top: 14, right: 14, background: '#f9ab00', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>SOON</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: product.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36,
                }}>{product.icon}</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 24, color: product.color }}>{product.name}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8fb3c9' }}>{product.tagline}</p>
                </div>
              </div>

              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#b5c9d7', marginBottom: 16 }}>{product.description}</p>

              <div style={{ marginBottom: 16, fontSize: 13, color: product.color, fontWeight: 600 }}>
                {product.priceFrom}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: 13, lineHeight: 1.7 }}>
                {product.features.slice(0, 6).map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: product.color, fontWeight: 700 }}>✓</span>
                    <span style={{ color: '#9ab4c5' }}>{f}</span>
                  </li>
                ))}
                {product.features.length > 6 && <li style={{ color: '#8fb3c9', fontSize: 12, marginLeft: 20 }}>+ {product.features.length - 6} more</li>}
              </ul>

              <button onClick={(e) => { e.stopPropagation(); navigate(product.route); }} style={{
                width: '100%', padding: '12px', background: product.color, color: '#fff',
                border: '0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>
                {product.status === 'ready' ? `Explore ${product.name} →` : `Preview ${product.name} →`}
              </button>
            </div>
          ))}
        </div>

        {/* Marketplace section — separate from product portals */}
        <div style={{ marginTop: 60, paddingTop: 40, borderTop: '1px solid #2c455a' }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 13, textTransform: 'uppercase', marginBottom: 12 }}>
              Marketplace
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', margin: '0 0 12px', color: '#fff' }}>
              Connections. News. Suppliers.
            </h2>
            <p style={{ color: '#b5c9d7', fontSize: 17, maxWidth: 700, margin: '0 auto' }}>
              Beyond software — Ssewasswa Comforts connects schools, hospitals, sponsors, donors, and suppliers across Uganda.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
            {MARKETPLACE.map((card) => (
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

        {/* More Features callout */}
        <div style={{ marginTop: 50, textAlign: 'center', padding: 30, background: 'rgba(26,115,232,0.08)', borderRadius: 16, border: '1px solid #1a73e8' }}>
          <h3 style={{ margin: '0 0 8px', color: '#1a73e8', fontSize: 22 }}>🧰 Want to see everything?</h3>
          <p style={{ color: '#b5c9d7', fontSize: 15, marginBottom: 20, maxWidth: 600, margin: '0 auto 20px' }}>
            Browse our complete catalog of 70+ features — including 19 fully implemented and 51 coming soon.
            Tasks, notifications, audit logs, custom fields, surveys, bulk SMS, QR codes, API keys, and more.
          </p>
          <button onClick={() => navigate('/login?next=/app/more')} style={{ background: '#1a73e8', color: '#fff', border: 0, borderRadius: 999, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Explore All 70+ Features →
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 50, color: '#8fb3c9', fontSize: 14 }}>
          <p>Ssewasswa Comforts Technologies — Uganda 🇺🇬</p>
          <p>MTN: +256 789 736 737 | Airtel: +256 752 971 118 | support@ssewasswacomfortstechnologies.com</p>
        </div>
      </section>
      <AIChatbot />
    </main>
  );
}
