// FileName: src/pages/Donors.jsx
// Ssewasswa Comforts — Donor Connection Page
// Connects donors (philanthropists, NGOs, foundations) with Ugandan schools + hospitals
// that need support. Subscription-based for institutions; free for verified donors.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatbot from '../components/AIChatbot.jsx';

const INSTITUTION_TIERS = [
  {
    id: 'standard',
    name: 'Standard Listing',
    price: 50000,
    priceLabel: 'UGX 50,000',
    period: '/year',
    features: [
      'List your institution (school or hospital) as "seeking support"',
      'Display needs: scholarships, infrastructure, equipment, medical supplies',
      'Receive contact from verified donors via our platform',
      'Upload 3 photos + 1-minute video pitch',
      'Listed in our Donor Marketplace for 12 months',
    ],
  },
  {
    id: 'featured',
    name: 'Featured Listing',
    price: 150000,
    priceLabel: 'UGX 150,000',
    period: '/year',
    badge: 'Most Effective',
    features: [
      'All Standard features',
      'Top placement in Donor Marketplace',
      'Featured in our monthly donor newsletter (15k+ donors)',
      'Priority matching with large donors (NGOs, foundations)',
      'AI-generated donor pitch letter (custom)',
      'Verification badge (Ssewasswa seals you as legitimate)',
    ],
  },
];

const DONOR_INTEREST_AREAS = [
  'Scholarships (orphans, girls, special needs)',
  'School infrastructure (classrooms, latrines, water)',
  'ICT lab + computers',
  'Library books',
  'Sports equipment',
  'School feeding program',
  'Hospital infrastructure (maternity ward, theatre)',
  'Medical equipment (ultrasound, lab)',
  'Ambulance / transport',
  'Health worker training',
  'Water + sanitation (WASH)',
  'Solar power',
  'Other (specify in description)',
];

export default function Donors() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('institution'); // 'institution' | 'donor'
  const [selectedTier, setSelectedTier] = useState(null);
  const [institutionForm, setInstitutionForm] = useState({
    institutionName: '',
    type: 'School',
    contactName: '',
    email: '',
    phone: '',
    location: '',
    needs: [],
    description: '',
  });
  const [donorForm, setDonorForm] = useState({
    donorName: '',
    organization: '',
    email: '',
    phone: '',
    country: 'Uganda',
    interestAreas: [],
    capacity: '',
    verified: false,
  });
  const [donorList, setDonorList] = useState([]);
  const [institutionList, setInstitutionList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Fetch public lists
  useEffect(() => {
    setLoadingList(true);
    fetch('/api/donor-marketplace')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setDonorList(data.donors || []);
          setInstitutionList(data.institutions || []);
        }
      })
      .catch(() => { /* API not deployed yet — show empty */ })
      .finally(() => setLoadingList(false));
  }, []);

  const toggleInstitutionNeed = (need) => {
    setInstitutionForm((prev) => {
      const needs = prev.needs.includes(need)
        ? prev.needs.filter((n) => n !== need)
        : [...prev.needs, need];
      return { ...prev, needs };
    });
  };

  const toggleDonorInterest = (area) => {
    setDonorForm((prev) => {
      const interestAreas = prev.interestAreas.includes(area)
        ? prev.interestAreas.filter((a) => a !== area)
        : [...prev.interestAreas, area];
      return { ...prev, interestAreas };
    });
  };

  const handleInstitutionSubscribe = async () => {
    if (!institutionForm.institutionName || !institutionForm.email || !selectedTier) {
      alert('Please fill in institution name, email, and select a tier');
      return;
    }
    try {
      const res = await fetch('/api/pesapal-initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedTier.price,
          email: institutionForm.email,
          reference: `DONOR-INST-${Date.now()}`,
          description: `Donor listing: ${selectedTier.name} - ${institutionForm.institutionName}`,
          tier: `donor-${selectedTier.id}`,
          customerName: institutionForm.contactName || institutionForm.institutionName,
          phoneNumber: institutionForm.phone,
          metadata: { type: 'donor_institution_listing', ...institutionForm, tier: selectedTier.id },
        }),
      });
      const data = await res.json();
      if (data.success && data.redirectUrl) window.location.href = data.redirectUrl;
      else alert('Could not start payment. Please WhatsApp +256 789 736 737 to pay manually.');
    } catch (err) {
      alert('Network error. Please WhatsApp +256 789 736 737.');
    }
  };

  const handleDonorRegister = async () => {
    if (!donorForm.donorName || !donorForm.email) {
      alert('Please fill in your name and email');
      return;
    }
    try {
      const res = await fetch('/api/donor-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donorForm),
      });
      const data = await res.json();
      if (data.success) {
        alert('Thank you! You are now registered as a donor. We will connect you with institutions matching your interests.');
        setDonorForm({ donorName: '', organization: '', email: '', phone: '', country: 'Uganda', interestAreas: [], capacity: '', verified: false });
      } else {
        alert(data.error || 'Could not register. Please try again.');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', fontFamily: "'Segoe UI', sans-serif" }}>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 60px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <button onClick={() => navigate('/')} style={backBtnStyle}>← Back</button>
          <button onClick={() => navigate('/login')} style={primaryBtnStyle}>Sign in</button>
        </nav>

        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 13, textTransform: 'uppercase', marginBottom: 16 }}>
            Donor Connection Marketplace
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', lineHeight: 1.05, margin: '0 0 20px', letterSpacing: '-.04em' }}>
            Connect with verified donors &amp; sponsors.
          </h1>
          <p style={{ color: '#b5c9d7', fontSize: 19, lineHeight: 1.6, maxWidth: 700, margin: '0 auto' }}>
            Are you a school or hospital seeking support? Or a donor looking to make a verified, high-impact
            contribution in Uganda? Ssewasswa Comforts Technologies matches both sides — with verification
            on every connection so fraud is impossible.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
          <button onClick={() => setTab('institution')} style={tab === 'institution' ? tabActive : tabIdle}>I am a School / Hospital</button>
          <button onClick={() => setTab('donor')} style={tab === 'donor' ? tabActive : tabIdle}>I am a Donor</button>
        </div>

        {tab === 'institution' ? (
          <>
            {/* Tier cards for institutions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 800, margin: '0 auto 40px' }}>
              {INSTITUTION_TIERS.map((tier) => {
                const isSelected = selectedTier?.id === tier.id;
                return (
                  <div key={tier.id} style={{
                    background: isSelected ? '#e8f0fe' : 'rgba(255,255,255,0.04)',
                    color: isSelected ? '#071b2f' : '#fff',
                    border: `2px solid ${isSelected ? '#1a73e8' : '#2c455a'}`,
                    borderRadius: 16, padding: 24, cursor: 'pointer',
                  }} onClick={() => setSelectedTier(tier)}>
                    {tier.badge && <div style={{ display: 'inline-block', background: '#0b8043', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, marginBottom: 10 }}>{tier.badge}</div>}
                    <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>{tier.name}</h3>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#1a73e8', marginBottom: 16 }}>{tier.priceLabel}<span style={{ fontSize: 13, fontWeight: 400, color: '#8fb3c9' }}>{tier.period}</span></div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, lineHeight: 1.7 }}>
                      {tier.features.map((f) => <li key={f} style={{ display: 'flex', gap: 6, marginBottom: 4 }}><span style={{ color: '#0b8043', fontWeight: 700 }}>✓</span><span>{f}</span></li>)}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Institution form */}
            {selectedTier && (
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 28, maxWidth: 700, margin: '0 auto 40px', border: '1px solid #2c455a' }}>
                <h2 style={{ marginTop: 0, marginBottom: 20, color: '#fff' }}>Institution Details</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <label style={labelStyle}>Institution Name *
                    <input value={institutionForm.institutionName} onChange={(e) => setInstitutionForm({ ...institutionForm, institutionName: e.target.value })} style={inputStyle} placeholder="St. Mary's Primary School" />
                  </label>
                  <label style={labelStyle}>Type
                    <select value={institutionForm.type} onChange={(e) => setInstitutionForm({ ...institutionForm, type: e.target.value })} style={inputStyle}>
                      <option>School</option><option>Hospital / Health Center</option><option>NGO / CBO</option>
                    </select>
                  </label>
                  <label style={labelStyle}>Contact Name
                    <input value={institutionForm.contactName} onChange={(e) => setInstitutionForm({ ...institutionForm, contactName: e.target.value })} style={inputStyle} placeholder="Head teacher / Director" />
                  </label>
                  <label style={labelStyle}>Email *
                    <input value={institutionForm.email} onChange={(e) => setInstitutionForm({ ...institutionForm, email: e.target.value })} style={inputStyle} placeholder="school@example.com" />
                  </label>
                  <label style={labelStyle}>Phone
                    <input value={institutionForm.phone} onChange={(e) => setInstitutionForm({ ...institutionForm, phone: e.target.value })} style={inputStyle} placeholder="07xx xxx xxx" />
                  </label>
                  <label style={labelStyle}>Location (District)
                    <input value={institutionForm.location} onChange={(e) => setInstitutionForm({ ...institutionForm, location: e.target.value })} style={inputStyle} placeholder="e.g. Mukono District" />
                  </label>
                </div>
                <fieldset style={{ marginTop: 20, border: '1px solid #2c455a', borderRadius: 8, padding: 16 }}>
                  <legend style={{ color: '#b5c9d7', fontSize: 13, padding: '0 8px' }}>What do you need? (Select all that apply)</legend>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                    {DONOR_INTEREST_AREAS.map((need) => (
                      <label key={need} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#b5c9d7', fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={institutionForm.needs.includes(need)} onChange={() => toggleInstitutionNeed(need)} style={{ marginTop: 3 }} />
                        {need}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label style={{ ...labelStyle, marginTop: 16, display: 'block' }}>Describe your needs (max 200 words)
                  <textarea value={institutionForm.description} onChange={(e) => setInstitutionForm({ ...institutionForm, description: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Tell donors about your situation, current challenges, and how their support will be used." />
                </label>
                <button onClick={handleInstitutionSubscribe} style={{ marginTop: 20, width: '100%', padding: '14px', background: '#1a73e8', color: '#fff', border: 0, borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Subscribe to {selectedTier.name} — {selectedTier.priceLabel}{selectedTier.period}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Donor registration form (free) */
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 28, maxWidth: 700, margin: '0 auto 40px', border: '1px solid #2c455a' }}>
            <h2 style={{ marginTop: 0, color: '#fff' }}>Donor Registration (Free)</h2>
            <p style={{ color: '#b5c9d7', marginBottom: 20 }}>Registering as a donor is free. You only pay when you choose to support an institution — and Ssewasswa Comforts verifies every institution before matching.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label style={labelStyle}>Your Name *
                <input value={donorForm.donorName} onChange={(e) => setDonorForm({ ...donorForm, donorName: e.target.value })} style={inputStyle} placeholder="John Smith" />
              </label>
              <label style={labelStyle}>Organization (optional)
                <input value={donorForm.organization} onChange={(e) => setDonorForm({ ...donorForm, organization: e.target.value })} style={inputStyle} placeholder="Foundation / NGO / Self" />
              </label>
              <label style={labelStyle}>Email *
                <input value={donorForm.email} onChange={(e) => setDonorForm({ ...donorForm, email: e.target.value })} style={inputStyle} placeholder="john@example.com" />
              </label>
              <label style={labelStyle}>Phone
                <input value={donorForm.phone} onChange={(e) => setDonorForm({ ...donorForm, phone: e.target.value })} style={inputStyle} placeholder="+256 7xx xxx xxx" />
              </label>
              <label style={labelStyle}>Country
                <input value={donorForm.country} onChange={(e) => setDonorForm({ ...donorForm, country: e.target.value })} style={inputStyle} />
              </label>
              <label style={labelStyle}>Capacity (UGX, optional)
                <input value={donorForm.capacity} onChange={(e) => setDonorForm({ ...donorForm, capacity: e.target.value })} style={inputStyle} placeholder="e.g. 5,000,000 UGX/year" />
              </label>
            </div>
            <fieldset style={{ marginTop: 20, border: '1px solid #2c455a', borderRadius: 8, padding: 16 }}>
              <legend style={{ color: '#b5c9d7', fontSize: 13, padding: '0 8px' }}>Your interest areas</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                {DONOR_INTEREST_AREAS.map((area) => (
                  <label key={area} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#b5c9d7', fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={donorForm.interestAreas.includes(area)} onChange={() => toggleDonorInterest(area)} style={{ marginTop: 3 }} />
                    {area}
                  </label>
                ))}
              </div>
            </fieldset>
            <button onClick={handleDonorRegister} style={{ marginTop: 20, width: '100%', padding: '14px', background: '#0b8043', color: '#fff', border: 0, borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Register as Donor (Free)
            </button>
          </div>
        )}

        {/* Live lists */}
        <div style={{ marginTop: 60 }}>
          <h2 style={{ textAlign: 'center', color: '#fff', fontSize: 28, marginBottom: 30 }}>
            {loadingList ? 'Loading marketplace...' : 'Featured Institutions Seeking Support'}
          </h2>
          {institutionList.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#8fb3c9' }}>Be the first to list your institution.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {institutionList.map((inst) => (
                <div key={inst.id} style={{ background: '#0b1f33', borderRadius: 12, padding: 20, border: '1px solid #2c455a' }}>
                  <h4 style={{ margin: '0 0 4px', color: '#fff' }}>{inst.institutionName}</h4>
                  <div style={{ color: '#8fb3c9', fontSize: 13, marginBottom: 10 }}>{inst.type} • {inst.location}</div>
                  <p style={{ color: '#b5c9d7', fontSize: 13, lineHeight: 1.5 }}>{inst.description?.slice(0, 100)}...</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {(inst.needs || []).slice(0, 3).map((n) => (
                      <span key={n} style={{ background: '#1a73e8', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>{n}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', color: '#8fb3c9', fontSize: 14, marginTop: 40 }}>
          <p>Questions? WhatsApp <strong>+256 789 736 737</strong> or email <strong>support@ssewasswacomfortstechnologies.com</strong></p>
        </div>
      </section>
      <AIChatbot />
    </main>
  );
}

const backBtnStyle = { background: 'transparent', color: '#8fb3c9', border: '1px solid #45657b', borderRadius: 999, padding: '10px 18px', cursor: 'pointer' };
const primaryBtnStyle = { background: '#1a73e8', color: '#fff', border: 0, borderRadius: 999, padding: '10px 18px', cursor: 'pointer' };
const tabActive = { background: '#1a73e8', color: '#fff', border: 0, borderRadius: 999, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 };
const tabIdle = { background: 'transparent', color: '#b5c9d7', border: '1px solid #45657b', borderRadius: 999, padding: '10px 20px', cursor: 'pointer' };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#b5c9d7', fontWeight: 600 };
const inputStyle = { padding: '10px 12px', borderRadius: 6, border: '1px solid #45657b', background: '#0b1f33', color: '#fff', fontSize: 14, fontFamily: 'inherit' };
