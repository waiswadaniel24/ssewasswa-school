// FileName: src/pages/BusinessDirectory.jsx
// Ssewasswa Comforts — Public Business Directory
// Shows all paid-advertising businesses. Free to browse; businesses pay to list.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatbot from '../components/AIChatbot.jsx';

const CATEGORIES = [
  'Education Supplies', 'Textbooks & Stationery', 'School Uniforms', 'School Furniture',
  'IT Equipment', 'Sports Equipment', 'Medical Supplies', 'Pharmaceuticals',
  'Lab Equipment', 'Hospital Furniture', 'Catering / Food', 'Transport',
  'Banking / Insurance', 'Construction', 'Other'
];

export default function BusinessDirectory() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [tier, setTier] = useState('All');

  useEffect(() => {
    fetch('/api/business-directory')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setBusinesses(data.businesses || []);
          setFiltered(data.businesses || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = businesses;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((b) =>
        (b.businessName || '').toLowerCase().includes(s) ||
        (b.description || '').toLowerCase().includes(s) ||
        (b.contactName || '').toLowerCase().includes(s)
      );
    }
    if (category !== 'All') result = result.filter((b) => b.category === category);
    if (tier !== 'All') result = result.filter((b) => b.tier === tier);
    setFiltered(result);
  }, [search, category, tier, businesses]);

  return (
    <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', fontFamily: "'Segoe UI', sans-serif" }}>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 60px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
          <button onClick={() => navigate('/')} style={backBtnStyle}>← Back</button>
          <button onClick={() => navigate('/sponsor')} style={primaryBtnStyle}>+ List Your Business</button>
        </nav>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 13, textTransform: 'uppercase', marginBottom: 16 }}>
            Business Directory
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 1.05, margin: '0 0 16px', letterSpacing: '-.04em' }}>
            Trusted suppliers for schools &amp; hospitals.
          </h1>
          <p style={{ color: '#b5c9d7', fontSize: 17, maxWidth: 600, margin: '0 auto' }}>
            All listed businesses are paid advertisers. Ssewasswa Comforts does not verify quality —
            always inspect goods before bulk purchase.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 32, background: 'rgba(255,255,255,0.04)', padding: 16, borderRadius: 12, border: '1px solid #2c455a' }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, description, or contact..." style={{ ...inputStyle, gridColumn: '1 / 2' }} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={tier} onChange={(e) => setTier(e.target.value)} style={inputStyle}>
            <option value="All">All Tiers</option>
            <option value="premium">Premium</option>
            <option value="growth">Growth</option>
            <option value="starter">Starter</option>
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#8fb3c9' }}>Loading directory...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: '#b5c9d7', fontSize: 17, marginBottom: 20 }}>No businesses found.</p>
            <p style={{ color: '#8fb3c9' }}>Be the first — <button onClick={() => navigate('/sponsor')} style={{ background: 'none', border: 0, color: '#1a73e8', cursor: 'pointer', textDecoration: 'underline' }}>list your business today</button>.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map((b) => {
              const isPremium = b.tier === 'premium';
              const isGrowth = b.tier === 'growth';
              return (
                <div key={b.id} style={{
                  background: '#0b1f33', borderRadius: 12, padding: 20,
                  border: `1px solid ${isPremium ? '#a142f4' : isGrowth ? '#0b8043' : '#2c455a'}`,
                  position: 'relative',
                }}>
                  {b.tier && (
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      background: isPremium ? '#a142f4' : isGrowth ? '#0b8043' : '#1a73e8',
                      color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase',
                    }}>{b.tier}</span>
                  )}
                  {b.logoUrl && <img src={b.logoUrl} alt={b.businessName} style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 12 }} onError={(e) => { e.target.style.display = 'none'; }} />}
                  <h3 style={{ margin: '0 0 4px', color: '#fff', fontSize: 18 }}>{b.businessName}</h3>
                  <div style={{ color: '#8fb3c9', fontSize: 12, marginBottom: 8 }}>{b.category}</div>
                  <p style={{ color: '#b5c9d7', fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>{b.description}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                    {b.phone && <a href={`tel:${b.phone}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>📞 {b.phone}</a>}
                    {b.email && <a href={`mailto:${b.email}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>✉️ {b.email}</a>}
                    {b.website && <a href={b.website} target="_blank" rel="noreferrer" style={{ color: '#1a73e8', textDecoration: 'none' }}>🌐 Website</a>}
                  </div>
                  {b.tier === 'growth' || b.tier === 'premium' ? (
                    <a href={`https://wa.me/${(b.phone || '256789736737').replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{
                      display: 'block', marginTop: 12, textAlign: 'center',
                      background: '#0b8043', color: '#fff', padding: '8px', borderRadius: 6, textDecoration: 'none',
                      fontSize: 13, fontWeight: 700,
                    }}>💬 WhatsApp</a>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <AIChatbot />
    </main>
  );
}

const backBtnStyle = { background: 'transparent', color: '#8fb3c9', border: '1px solid #45657b', borderRadius: 999, padding: '10px 18px', cursor: 'pointer' };
const primaryBtnStyle = { background: '#1a73e8', color: '#fff', border: 0, borderRadius: 999, padding: '10px 18px', cursor: 'pointer' };
const inputStyle = { padding: '10px 12px', borderRadius: 6, border: '1px solid #45657b', background: '#0b1f33', color: '#fff', fontSize: 14, fontFamily: 'inherit' };
