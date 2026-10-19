// FileName: src/pages/SAASPortal.jsx
// Ssewasswa Comforts Technologies — Long-form Landing Page
// Shows ALL 8 portals in detail (not as chips) — beautiful long-scrolling design
// with hero, vision, features, pricing, CTA for each portal.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatbot from '../components/AIChatbot.jsx';

// ═══════════════════════════════════════════════════════════════════
// PORTAL DEFINITIONS — each portal gets a full detailed section
// ═══════════════════════════════════════════════════════════════════
const PORTALS = [
  {
    id: 'school-erp',
    name: 'School ERP',
    icon: '🏫',
    tagline: 'Run your school with confidence.',
    description: 'One calm, connected workspace for school leaders, teachers, bursars, administrators and families. EMIS-compliant, UNEB-integrated, and built for Ugandan schools.',
    color: '#1a73e8',
    gradient: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)',
    bg: '#e8f0fe',
    status: 'ready',
    route: '/product-landing',
    signInSection: '/login?next=/app',
    pricing: [
      { tier: 'Ordinary', price: 'UGX 150,000', period: '/year', features: ['Student admissions + attendance', 'Staff management + payroll', 'Fees + basic finance reports', 'Exams + report cards (Primary + Secondary)', 'Library, transport, canteen, gatebook', 'Single-school license', 'Local encrypted SQLite DB', 'Email support (48hr)'] },
      { tier: 'Premium ⭐', price: 'UGX 300,000', period: '/year', features: ['ALL Ordinary features', 'EMIS compliance + reports', 'UNEB API integration', 'Multi-school management', 'Automated Document Engine', 'Health, WASH, infrastructure', 'Special needs + OVC tracking', 'Priority WhatsApp support (4hr)'], featured: true },
    ],
    features: [
      { icon: '📄', title: 'Digitize ALL Records', desc: 'No more paper registers. Every student, staff, fee, exam stored digitally + encrypted.' },
      { icon: '🏛️', title: 'Effortless EMIS Compliance', desc: 'Automatic EMIS reports for Ministry of Education. Stay compliant without extra paperwork.' },
      { icon: '💰', title: '100% Fee Transparency', desc: 'Every shilling tracked, every receipt digital. Parents see exactly what they owe + paid.' },
      { icon: '🎓', title: 'Direct UNEB Registration', desc: 'Register exam candidates from classroom to UNEB in one click. No more manual forms.' },
      { icon: '🌍', title: 'Bridge Urban-Rural Gap', desc: 'Works offline on any computer — even in villages without internet. Syncs when connection returns.' },
      { icon: '🔒', title: 'Data Privacy First', desc: 'Encrypted local database. Your school data never leaves your computer without permission.' },
      { icon: '📊', title: 'Real-Time Dashboards', desc: 'Make decisions with data, not guesswork. Live stats on enrollment, fees, attendance, performance.' },
      { icon: '💸', title: 'Affordable for All', desc: 'UGX 150k/year — less than a teacher monthly salary. Quality ERP for every Ugandan school.' },
    ],
    sectors: ['Primary', 'Secondary', 'Tertiary', 'Vocational', 'Technical', 'Nursery', 'Health Training', 'Business', 'Arts', 'Sciences', 'Theological', 'Teacher Training', 'University', 'Special Needs', 'Primary+Secondary', 'Nursery+Primary'],
    examBoards: ['UNEB', 'UBTEB', 'NCHE', 'Nurses Council', 'AHPC', 'Kyambogo'],
  },
  {
    id: 'hmis',
    name: 'HMIS',
    icon: '🏥',
    tagline: 'Run your hospital with clarity.',
    description: 'Complete health management for Ugandan facilities — from drug shops to general hospitals. OPD, IPD, lab, pharmacy, billing, maternal health, DHIS2 reporting.',
    color: '#0b8043',
    gradient: 'linear-gradient(135deg, #0b8043 0%, #064f2c 100%)',
    bg: '#e6f4ea',
    status: 'ready',
    route: '/hmis-landing',
    signInSection: '/login?next=/hmis',
    pricing: [
      { tier: 'Drug Shop', price: 'UGX 100,000', period: '/year', features: ['Patient walk-in registration', 'Pharmacy inventory + dispensing', 'Billing + receipts', 'Single-terminal license', 'Email support'] },
      { tier: 'Clinic', price: 'UGX 200,000', period: '/year', features: ['Patient + OPD + pharmacy + lab + billing', 'Triage + diagnosis + prescription', 'Single-terminal', 'Email support'], featured: true },
      { tier: 'Health Center IV', price: 'UGX 400,000', period: '/year', features: ['OPD + emergency + maternity', 'Theatre + ICU + blood bank', '30-50 bed IPD', 'Multi-terminal (10)'], featured: true },
      { tier: 'General Hospital', price: 'UGX 1,200,000', period: '/year', features: ['ALL features unlocked', 'HL7/FHIR + PACS integration', 'Multi-hospital network (5)', '24/7 priority support'], featured: true },
    ],
    features: [
      { icon: '🧑‍⚕️', title: 'Patient Registration', desc: 'Demographics + history + insurance + next-of-kin. Walk-in or scheduled. OPD numbers auto-generated.' },
      { icon: '🏥', title: 'OPD + Triage', desc: 'Triage severity scoring, vitals capture, diagnosis (ICD-10), prescription, referral tracking.' },
      { icon: '🛏️', title: 'IPD + Ward Management', desc: 'Bed allocation, admission/discharge, ward transfers, observation charts, discharge summaries.' },
      { icon: '🧪', title: 'Laboratory', desc: 'Test requests, results, tracking, normal range flags, HIV/malaria/glucose panels, culture tracking.' },
      { icon: '💊', title: 'Pharmacy', desc: 'Drug inventory with batch + expiry tracking, dispensing, stock alerts, NDA compliance reports.' },
      { icon: '💵', title: 'Billing + Insurance', desc: 'NHIS + private insurance (Jubilee, UAP, ICEA, Prudential), self-pay, waivers, itemized invoices.' },
      { icon: '🤱', title: 'Maternal + Child Health', desc: 'ANC + PNC + immunization tracking, birth registration (NIRA integration), MPDR maternal surveillance.' },
      { icon: '📊', title: 'DHIS2 Reporting', desc: 'Auto-submit reports to MoH DHIS2. Patient safety + adverse event tracking. Surgery log.' },
    ],
    facilityTypes: ['Drug Shop', 'Pharmacy', 'Clinic', 'HC II', 'HC III (Maternity)', 'HC IV (Theatre)', 'General Hospital'],
  },
  {
    id: 'business-portal',
    name: 'Business / SME',
    icon: '🏢',
    tagline: 'Run your business with precision.',
    description: 'Point of sale, sales tracking, customer database, multi-branch, expense tracking, debt payoff planner, bill reminders, loyalty points.',
    color: '#5f6368',
    gradient: 'linear-gradient(135deg, #5f6368 0%, #202124 100%)',
    bg: '#f1f3f4',
    status: 'soon',
    eta: 'Q3 2026',
    route: '/app/more/business-portal',
    features: [
      { icon: '💳', title: 'Point of Sale (POS)', desc: 'Barcode scanning, quick keys, split payments, refund + exchange handling, end-of-day Z-reports.' },
      { icon: '📈', title: 'Sales Tracking', desc: 'Real-time sales charts by product, branch, cashier, payment method, time of day, customer segment.' },
      { icon: '👥', title: 'Customer CRM', desc: 'Purchase history, loyalty tiers, birthday discounts, abandoned cart recovery, SMS re-engagement.' },
      { icon: '🏪', title: 'Multi-Branch', desc: 'Manage all branches from one dashboard. Compare performance, transfer stock, consolidate reports.' },
      { icon: '🚚', title: 'Supplier Database', desc: 'Vendor contacts, payment terms (Net 7/14/30), purchase orders, receiving, three-way matching.' },
      { icon: '💸', title: 'Expense + Debt', desc: 'Categorize expenses, track debt payoff progress, bill reminders, recurring invoice automation.' },
      { icon: '🎁', title: 'Loyalty Points', desc: 'Earn-per-purchase, tier-based rewards, redemption rules, expiry management, customer dashboard.' },
      { icon: '📑', title: 'Reports', desc: 'P&L, balance sheet, cash flow, sales tax (VAT), payroll, inventory valuation — all auto-generated.' },
    ],
  },
  {
    id: 'church-portal',
    name: 'Church / Religious Org',
    icon: '⛪',
    tagline: 'Run your ministry with peace.',
    description: 'Track tithes, record donations, manage sermon library, organize committees, log volunteer hours, plan events.',
    color: '#9c27b0',
    gradient: 'linear-gradient(135deg, #9c27b0 0%, #4a148c 100%)',
    bg: '#f3e5f5',
    status: 'soon',
    eta: 'Q3 2026',
    route: '/app/more/church-portal',
    features: [
      { icon: '💰', title: 'Tithes Tracking', desc: 'Member-by-member tithe contributions, monthly statements, annual giving receipts (tax-deductible).' },
      { icon: '🤝', title: 'Donations + Pledges', desc: 'One-time + recurring donations, pledge campaigns with progress tracking, gift-aid recovery.' },
      { icon: '🎙️', title: 'Sermon Library', desc: 'Audio/video sermon archive with transcripts, search by scripture reference, member-only access.' },
      { icon: '👥', title: 'Committee Management', desc: 'Elders, deacons, women\'s ministry, youth committee — member rosters, meeting minutes, attendance.' },
      { icon: '⏰', title: 'Volunteer Hours', desc: 'Log volunteer service by member, generate certificates, recognize top contributors annually.' },
      { icon: '📅', title: 'Event Planning', desc: 'Sunday services, midweek, conferences, retreats, weddings, funerals — RSVP, attendance, follow-up.' },
      { icon: '📞', title: 'Member Directory', desc: 'Member + family database, contact info, baptism/membership dates, pastoral care notes (private).' },
      { icon: '📊', title: 'Finance Reporting', desc: 'Annual reports, audit-ready statements, fund-based accounting (building fund, missions, etc.).' },
    ],
  },
  {
    id: 'org-portal',
    name: 'Org / NGO / CBO',
    icon: '🌍',
    tagline: 'Run your organization with impact.',
    description: 'Member registration, membership renewal, finance tracking, project management, donor reporting, volunteer coordination.',
    color: '#00796b',
    gradient: 'linear-gradient(135deg, #00796b 0%, #004d40 100%)',
    bg: '#e0f2f1',
    status: 'soon',
    eta: 'Q2 2026',
    route: '/app/more/org-portal',
    features: [
      { icon: '📋', title: 'Member Directory', desc: 'Member registration, membership cards (PDF), renewal reminders, lapsed member re-engagement.' },
      { icon: '💳', title: 'Membership Renewal', desc: 'Annual/quarterly/monthly dues via Pesapal/MoMo, auto-renewal opt-in, receipt auto-email.' },
      { icon: '💼', title: 'Project Management', desc: 'Project timeline, milestones, deliverables, beneficiary tracking, M&E indicators, impact reports.' },
      { icon: '🤝', title: 'Donor Database', desc: 'Donor contacts, giving history, restricted vs unrestricted funds, acknowledgment letters.' },
      { icon: '🧑‍🤝‍🧑', title: 'Volunteer Coordination', desc: 'Volunteer database, skill matching, event assignments, hours log, recognition program.' },
      { icon: '📅', title: 'Event Registration', desc: 'Member meetings, AGMs, training events — registration, attendance, follow-up surveys.' },
      { icon: '📑', title: 'Donor Reporting', desc: 'Auto-generate narrative + financial reports per donor, per project, per quarter, per year.' },
      { icon: '🏆', title: 'Annual Reports', desc: 'Beautiful annual report PDF with photos, stories, financial summary, board list, future plans.' },
    ],
  },
  {
    id: 'individual-portal',
    name: 'Individual / Personal',
    icon: '🧑',
    tagline: 'Run your finances with confidence.',
    description: 'Personal budgeting, savings goals, expense tracking, debt management, financial planning.',
    color: '#0288d1',
    gradient: 'linear-gradient(135deg, #0288d1 0%, #01579b 100%)',
    bg: '#e1f5fe',
    status: 'soon',
    eta: 'Q2 2026',
    route: '/app/more/individual-portal',
    features: [
      { icon: '💰', title: 'Personal Budget', desc: 'Monthly income/expense tracking, category budget limits, alerts when over budget, recurring bills.' },
      { icon: '🎯', title: 'Savings Goals', desc: 'Set savings targets (school fees, land, car), track progress, auto-deposit reminders.' },
      { icon: '📊', title: 'Expense Charts', desc: 'Visual breakdown by category, monthly trends, year-over-year comparison, top spending areas.' },
      { icon: '📉', title: 'Debt Tracking', desc: 'Track loans (salary advance, mobile money, bank), payoff planner, interest calculator.' },
      { icon: '💼', title: 'Net Worth', desc: 'Assets (land, savings, vehicles) minus liabilities (loans, debts) — track over time.' },
      { icon: '📅', title: 'Financial Calendar', desc: 'Bill due dates, salary deposit reminders, loan payment dates, rent renewal alerts.' },
      { icon: '📸', title: 'Receipt Scanner', desc: 'Snap photo of receipt → auto-extract amount + vendor + date. Searchable receipt archive.' },
      { icon: '📈', title: 'Investment Tracking', desc: 'Track stocks, unit trusts, SACCO shares, treasury bonds — current value + returns.' },
    ],
  },
  {
    id: 'parent-portal',
    name: 'Parent Portal',
    icon: '👨‍👩‍👧',
    tagline: 'Stay close to your child\'s school.',
    description: 'Parents view attendance, fees, report cards, exam results, school announcements. Communicate with teachers. Pay fees online.',
    color: '#d81b60',
    gradient: 'linear-gradient(135deg, #d81b60 0%, #880e4f 100%)',
    bg: '#fce4ec',
    status: 'soon',
    eta: 'Q1 2026 (PRIORITY)',
    route: '/app/more/parent-portal',
    features: [
      { icon: '📅', title: 'Child Attendance', desc: 'Daily/weekly attendance view, absentee alerts via SMS/email, monthly attendance report.' },
      { icon: '💳', title: 'Pay Fees Online', desc: 'Pay via Pesapal (card), MTN MoMo, Airtel Money. Receipt auto-emailed, balance updated instantly.' },
      { icon: '📄', title: 'Report Cards', desc: 'Download termly report cards (PDF), view marks by subject, view teacher comments, print for records.' },
      { icon: '📝', title: 'Exam Results', desc: 'View end-of-term/end-of-year exam results, track progress vs previous terms, view class ranking.' },
      { icon: '💬', title: 'Teacher Chat', desc: 'Message teachers directly (in-app), schedule parent-teacher meetings, view broadcast announcements.' },
      { icon: '🔔', title: 'Alerts', desc: 'SMS/email/WhatsApp alerts for: absent child, fees due, exam schedule, school closure, emergencies.' },
      { icon: '📅', title: 'School Calendar', desc: 'View term dates, exam weeks, holidays, sports days, parent meeting dates, school events.' },
      { icon: '👨‍👩‍👧', title: 'Multi-Child', desc: 'All your children in one login — switch between kids, consolidated fees view, family receipt.' },
    ],
  },
  {
    id: 'student-portal',
    name: 'Student Portal',
    icon: '🎓',
    tagline: 'Track your own academic journey.',
    description: 'Students view attendance, marks, assignments, timetable, exam results, school announcements.',
    color: '#7b1fa2',
    gradient: 'linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)',
    bg: '#f3e5f5',
    status: 'soon',
    eta: 'Q1 2026 (PRIORITY)',
    route: '/app/more/student-portal',
    features: [
      { icon: '📅', title: 'My Attendance', desc: 'View own attendance percentage, days present/absent, late arrivals, attendance warnings.' },
      { icon: '📝', title: 'My Marks', desc: 'View exam + test marks by subject, track progress vs class average, view teacher feedback.' },
      { icon: '📚', title: 'Assignments', desc: 'View homework + assignments with due dates, submit online (when enabled), track completion.' },
      { icon: '🗓️', title: 'My Timetable', desc: 'Personal class timetable, exam schedule, room assignments, teacher names per subject.' },
      { icon: '📢', title: 'Announcements', desc: 'School-wide announcements, class-specific messages, event reminders, emergency alerts.' },
      { icon: '📖', title: 'Library', desc: 'Browse library catalog, reserve books, view checkout history, due date reminders, fine status.' },
      { icon: '💳', title: 'Fees Status', desc: 'View fees balance, payment history, due dates, request statement, see if cleared for exams.' },
      { icon: '🪪', title: 'ID Card', desc: 'Download digital student ID card (with QR code), renew when expired, replace lost card.' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function SAASPortal() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('hero');
  const readyCount = PORTALS.filter(p => p.status === 'ready').length;
  const soonCount = PORTALS.filter(p => p.status === 'soon').length;

  // Smooth scroll to a portal section
  const scrollToPortal = (id) => {
    document.getElementById(`portal-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Track scroll position to highlight nav
  useEffect(() => {
    const handleScroll = () => {
      for (const p of PORTALS) {
        const el = document.getElementById(`portal-${p.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSection(p.id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* ═══ HERO SECTION ════════════════════════════════════════ */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 30% 20%, rgba(26,115,232,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(11,128,67,0.15) 0%, transparent 50%)', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '28px 24px 80px' }}>
          {/* Top nav */}
          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 60 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/ssewasswa-comforts-school-erp-mark.png" alt="Ssewasswa" style={{ width: 50, height: 50, objectFit: 'contain' }} />
              <div>
                <strong style={{ letterSpacing: '.06em', fontSize: 16 }}>SSEWASSWA COMFORTS</strong>
                <div style={{ color: '#8fb3c9', fontSize: 12 }}>Technologies — Multi-Portal SaaS Platform</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => navigate('/login?next=/app')} style={ghostBtn}>School ERP Sign in</button>
              <button onClick={() => navigate('/login?next=/hmis')} style={primaryBtn('#0b8043')}>HMIS Sign in</button>
            </div>
          </nav>

          {/* Hero content */}
          <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 60 }}>
            <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 14, textTransform: 'uppercase', marginBottom: 20 }}>
              One Platform · Eight Solutions · 70+ Features
            </div>
            <h1 style={{ fontSize: 'clamp(40px, 7vw, 72px)', lineHeight: 1.05, margin: '0 0 24px', letterSpacing: '-.04em', fontWeight: 800, background: 'linear-gradient(135deg, #61d3a5 0%, #1a73e8 50%, #0b8043 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Manage every aspect of your organization.
            </h1>
            <p style={{ color: '#b5c9d7', fontSize: 22, lineHeight: 1.6, maxWidth: 760, margin: '0 auto 32px' }}>
              Ssewasswa Comforts Technologies builds affordable, beautiful, and powerful management software
              for Ugandan education, health, business, religious, and personal finance sectors.
              From village nursery to urban university, from drug shop to general hospital.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', color: '#8fb3c9', fontSize: 14, marginBottom: 40 }}>
              <div><strong style={{ color: '#61d3a5', fontSize: 28 }}>{readyCount}</strong><br />Ready now</div>
              <div><strong style={{ color: '#f9ab00', fontSize: 28 }}>{soonCount}</strong><br />Coming soon</div>
              <div><strong style={{ color: '#fff', fontSize: 28 }}>70+</strong><br />Total features</div>
              <div><strong style={{ color: '#fff', fontSize: 28 }}>8</strong><br />Portals</div>
            </div>
            {/* Quick portal jump pills */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 24 }}>
              {PORTALS.map(p => (
                <button key={p.id} onClick={() => scrollToPortal(p.id)} style={{
                  background: activeSection === p.id ? p.color : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  border: `1px solid ${activeSection === p.id ? p.color : '#2c455a'}`,
                  borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>{p.icon} {p.name}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PORTAL SECTIONS — each portal gets a full detailed section ══ */}
      {PORTALS.map((portal, idx) => (
        <PortalSection key={portal.id} portal={portal} navigate={navigate} index={idx} />
      ))}

      {/* ═══ MARKETPLACE SECTION ══════════════════════════════════ */}
      <section style={{ background: 'linear-gradient(180deg, #071b2f 0%, #0b1f33 100%)', padding: '80px 24px', borderTop: '1px solid #2c455a' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 14, textTransform: 'uppercase', marginBottom: 16 }}>
              Beyond Software
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', margin: '0 0 16px', color: '#fff', fontWeight: 800 }}>
              Marketplace. Connections. News.
            </h2>
            <p style={{ color: '#b5c9d7', fontSize: 18, maxWidth: 720, margin: '0 auto' }}>
              Ssewasswa Comforts connects schools, hospitals, sponsors, donors, and suppliers across Uganda.
              Generate revenue beyond subscriptions — list your business, find a donor, subscribe to news.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              { icon: '📣', title: 'Advertise Your Business', desc: 'Reach 15,000+ schools + hospitals across Uganda. Three tiers from UGX 50k/month.', route: '/sponsor', color: '#1a73e8' },
              { icon: '🤝', title: 'Donor Connections', desc: 'Verified philanthropists, NGOs, foundations matched with schools/hospitals seeking support.', route: '/donors', color: '#0b8043' },
              { icon: '📰', title: 'News & Updates', desc: 'Education + health sector news via free email, paid WhatsApp/SMS. 6 categories.', route: '/news', color: '#a142f4' },
              { icon: '🏪', title: 'Business Directory', desc: 'Browse trusted suppliers: textbooks, uniforms, medical supplies, furniture, IT, sports.', route: '/business-directory', color: '#f9ab00' },
            ].map(card => (
              <div key={card.route} onClick={() => navigate(card.route)} style={{
                background: 'rgba(255,255,255,0.04)', border: `2px solid ${card.color}30`,
                borderRadius: 16, padding: 28, cursor: 'pointer', transition: 'all 0.3s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = card.color; e.currentTarget.style.background = `${card.color}10`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = card.color + '30'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>{card.icon}</div>
                <h3 style={{ margin: '0 0 10px', color: card.color, fontSize: 20, fontWeight: 700 }}>{card.title}</h3>
                <p style={{ color: '#b5c9d7', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{card.desc}</p>
                <span style={{ color: card.color, fontWeight: 700, fontSize: 14 }}>Get started →</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MORE FEATURES CALLOUT ═══════════════════════════════ */}
      <section style={{ background: '#0b1f33', padding: '60px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: 40, background: 'linear-gradient(135deg, rgba(26,115,232,0.15) 0%, rgba(11,128,67,0.1) 100%)', borderRadius: 24, border: '1px solid #2c455a' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🧰</div>
          <h3 style={{ margin: '0 0 12px', color: '#fff', fontSize: 32, fontWeight: 800 }}>70+ features, all in one platform</h3>
          <p style={{ color: '#b5c9d7', fontSize: 17, marginBottom: 28, lineHeight: 1.6 }}>
            Beyond the 8 portals, Ssewasswa Comforts includes 70+ cross-cutting features — 19 fully
            implemented and 51 coming soon. Tasks, notifications, audit logs, custom fields, surveys,
            bulk SMS, QR codes, API keys, and more.
          </p>
          <button onClick={() => navigate('/login?next=/app/more')} style={{
            background: 'linear-gradient(135deg, #1a73e8 0%, #0b8043 100%)', color: '#fff',
            border: 0, borderRadius: 999, padding: '16px 36px', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 8px 24px rgba(26,115,232,0.3)',
          }}>
            Explore All 70+ Features →
          </button>
        </div>
      </section>

      {/* ═══ FOOTER ═══════════════════════════════════════════════ */}
      <footer style={{ background: '#071b2f', color: '#8fb3c9', fontSize: 13, padding: '40px 24px', borderTop: '1px solid #2c455a' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          <div>
            <strong style={{ color: '#fff', fontSize: 15 }}>Ssewasswa Comforts Technologies™</strong><br />
            <span style={{ color: '#8fb3c9' }}>Multi-Portal SaaS Platform<br />Uganda 🇺🇬</span>
          </div>
          <div>
            <strong style={{ color: '#fff', fontSize: 13, display: 'block', marginBottom: 8 }}>CONTACT</strong>
            <div>📞 +256 789 736 737 (MTN/WhatsApp)</div>
            <div>📞 +256 752 971 118 (Airtel)</div>
            <div>✉️ support@ssewasswacomfortstechnologies.com</div>
          </div>
          <div>
            <strong style={{ color: '#fff', fontSize: 13, display: 'block', marginBottom: 8 }}>PORTALS</strong>
            {PORTALS.map(p => (
              <div key={p.id} style={{ cursor: 'pointer', marginBottom: 4 }} onClick={() => scrollToPortal(p.id)}>
                {p.icon} {p.name} {p.status === 'ready' ? '✓' : '⟳'}
              </div>
            ))}
          </div>
          <div>
            <strong style={{ color: '#fff', fontSize: 13, display: 'block', marginBottom: 8 }}>MARKETPLACE</strong>
            <div style={{ cursor: 'pointer', marginBottom: 4 }} onClick={() => navigate('/sponsor')}>📣 Advertise</div>
            <div style={{ cursor: 'pointer', marginBottom: 4 }} onClick={() => navigate('/donors')}>🤝 Donors</div>
            <div style={{ cursor: 'pointer', marginBottom: 4 }} onClick={() => navigate('/news')}>📰 News</div>
            <div style={{ cursor: 'pointer', marginBottom: 4 }} onClick={() => navigate('/business-directory')}>🏪 Directory</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 30, color: '#5f6368', fontSize: 12 }}>
          © 2026 Ssewasswa Comforts Technologies. All rights reserved. Built in Uganda 🇺🇬 for Africa.
        </div>
      </footer>

      <AIChatbot />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PORTAL SECTION — each portal gets a beautiful detailed section
// ═══════════════════════════════════════════════════════════════════
function PortalSection({ portal, navigate, index }) {
  const isReversed = index % 2 === 1;

  return (
    <section id={`portal-${portal.id}`} style={{
      background: index % 2 === 0 ? '#071b2f' : '#0b1f33',
      padding: '80px 24px',
      borderTop: '1px solid #2c455a',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative gradient blob */}
      <div style={{
        position: 'absolute', top: -100, right: -100, width: 400, height: 400,
        background: portal.gradient, opacity: 0.1, borderRadius: '50%', filter: 'blur(60px)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1180, margin: '0 auto' }}>
        {/* Portal Hero */}
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 16,
            background: portal.gradient, padding: '20px 32px',
            borderRadius: 20, marginBottom: 24,
            boxShadow: `0 10px 40px ${portal.color}40`,
          }}>
            <span style={{ fontSize: 48 }}>{portal.icon}</span>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ margin: 0, fontSize: 36, color: '#fff', fontWeight: 800 }}>{portal.name}</h2>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                {portal.status === 'ready' ? '✓ Ready now' : `⟳ Coming ${portal.eta}`}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 24, color: portal.color, fontWeight: 600, marginBottom: 16, fontStyle: 'italic' }}>
            {portal.tagline}
          </p>
          <p style={{ color: '#b5c9d7', fontSize: 17, maxWidth: 720, margin: '0 auto', lineHeight: 1.7 }}>
            {portal.description}
          </p>
        </div>

        {/* Features grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 40 }}>
          {portal.features.map((f, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${portal.color}30`,
              borderRadius: 12, padding: 20,
              transition: 'all 0.3s',
              cursor: 'default',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = portal.color; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = portal.color + '30'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>{f.icon}</span>
                <h4 style={{ margin: 0, color: portal.color, fontSize: 16, fontWeight: 700 }}>{f.title}</h4>
              </div>
              <p style={{ color: '#b5c9d7', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing tiers (only for portals with pricing) */}
        {portal.pricing && (
          <div style={{ marginBottom: 40 }}>
            <h3 style={{ textAlign: 'center', color: '#fff', fontSize: 24, marginBottom: 24, fontWeight: 700 }}>
              Pricing Tiers
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`, gap: 16 }}>
              {portal.pricing.map((tier, i) => (
                <div key={i} style={{
                  background: tier.featured ? portal.bg : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${tier.featured ? portal.color : portal.color + '30'}`,
                  borderRadius: 16, padding: 24, position: 'relative',
                  color: tier.featured ? '#071b2f' : '#fff',
                }}>
                  {tier.featured && (
                    <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: portal.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                      ★ BEST VALUE
                    </div>
                  )}
                  <h4 style={{ margin: '0 0 8px', fontSize: 18, color: tier.featured ? portal.color : '#fff' }}>{tier.tier}</h4>
                  <div style={{ fontSize: 22, fontWeight: 800, color: portal.color, marginBottom: 16 }}>
                    {tier.price}<span style={{ fontSize: 13, fontWeight: 400, color: '#8fb3c9' }}>{tier.period}</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                    {tier.features.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 6, marginBottom: 4, color: tier.featured ? '#071b2f' : '#b5c9d7' }}>
                        <span style={{ color: portal.color, fontWeight: 700 }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sectors/Boards/Facility types (only for portals that have them) */}
        {portal.sectors && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h4 style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>16 Education Sectors Supported</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {portal.sectors.map(s => (
                <span key={s} style={{ background: portal.color + '20', color: portal.color, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          </div>
        )}
        {portal.examBoards && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h4 style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>6 Ugandan Exam Boards Integrated</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {portal.examBoards.map(b => (
                <span key={b} style={{ background: portal.color + '20', color: portal.color, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{b}</span>
              ))}
            </div>
          </div>
        )}
        {portal.facilityTypes && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h4 style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>7 Health Facility Types Supported</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {portal.facilityTypes.map(t => (
                <span key={t} style={{ background: portal.color + '20', color: portal.color, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div style={{ textAlign: 'center' }}>
          {portal.status === 'ready' ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => navigate(portal.route)} style={{
                background: portal.gradient, color: '#fff', border: 0,
                borderRadius: 12, padding: '16px 32px', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', boxShadow: `0 8px 24px ${portal.color}40`,
              }}>
                Explore {portal.name} →
              </button>
              <button onClick={() => navigate(portal.signInSection)} style={{
                background: 'transparent', color: portal.color,
                border: `2px solid ${portal.color}`, borderRadius: 12,
                padding: '16px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}>
                Sign in to {portal.name}
              </button>
            </div>
          ) : (
            <button onClick={() => navigate(portal.route)} style={{
              background: 'rgba(255,255,255,0.05)', color: portal.color,
              border: `2px solid ${portal.color}40`, borderRadius: 12,
              padding: '16px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>
              Preview {portal.name} ({portal.eta}) →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLE CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const ghostBtn = {
  background: 'transparent', color: '#fff', border: '1px solid #45657b',
  borderRadius: 999, padding: '11px 18px', cursor: 'pointer', fontWeight: 500,
};

const primaryBtn = (color) => ({
  background: color, color: '#fff', border: 0,
  borderRadius: 999, padding: '11px 18px', cursor: 'pointer', fontWeight: 600,
});
