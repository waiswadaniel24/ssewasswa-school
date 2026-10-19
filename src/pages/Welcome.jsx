// FileName: src/pages/Welcome.jsx
// Ssewasswa School ERP V10
// Description: Personalized post-registration welcome page.
// Greets the user by name, then shows a setup checklist with CTA to /setup.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const CHECKLIST = [
  { icon: '🏫', title: 'School name & level', desc: 'Primary / Secondary / Nursery + boys / girls / mixed + day / boarding / mixed' },
  { icon: '📍', title: 'Location', desc: 'District, county, sub-county, parish, village' },
  { icon: '👤', title: 'Owner & leadership', desc: 'Owner name + NIN, head teacher, chairperson contacts' },
  { icon: '🎨', title: 'Branding', desc: 'Logo, badge, motto, slogan, scripture, school anthem' },
  { icon: '🏛️', title: 'School type', desc: 'Private / Government / Faith-based / Community / International' },
  { icon: '📅', title: 'Academic year', desc: 'Set up terms, exam windows, holidays' },
];

export default function Welcome() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const [visited, setVisited] = useState([]);

  // If not logged in, redirect to login (so they can register/sign-in first)
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [authReady, user, navigate]);

  // Track which setup steps the user has visited (localStorage)
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem('erp_welcome_visited') || '[]');
      setVisited(Array.isArray(v) ? v : []);
    } catch { setVisited([]); }
  }, []);

  const markVisited = (key) => {
    const next = Array.from(new Set([...visited, key]));
    setVisited(next);
    try { localStorage.setItem('erp_welcome_visited', JSON.stringify(next)); } catch { /* storage unavailable */ }
  };

  if (!authReady) {
    return (
      <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', display: 'grid', placeItems: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
        <div>Loading…</div>
      </main>
    );
  }

  if (!user) return null; // redirect happening

  const firstName = (user.username || user.email || 'there').split('@')[0].split(' ')[0];
  const progress = Math.round((visited.length / CHECKLIST.length) * 100);

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #071b2f 0%, #0c273d 100%)', color: '#f7fbff', fontFamily: "'Segoe UI', sans-serif" }}>
      <section style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Top brand bar */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/ssewasswa-comforts-school-erp-mark.png" alt="Ssewasswa" style={{ filter: 'brightness(1.18) saturate(1.35) contrast(1.05) drop-shadow(0 2px 6px rgba(0,0,0,0.18))', width: 46, height: 46, objectFit: 'contain' }} />
            <div>
              <strong style={{ letterSpacing: '.06em' }}>SSEWASSWA COMFORTS</strong>
              <div style={{ color: '#8fb3c9', fontSize: 12 }}>School ERP</div>
            </div>
          </div>
          <button onClick={() => navigate('/app')} style={{ background: 'transparent', color: '#fff', border: '1px solid #45657b', borderRadius: 999, padding: '11px 18px', cursor: 'pointer' }}>
            Skip to dashboard →
          </button>
        </nav>

        {/* Welcome headline */}
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 12, textTransform: 'uppercase' }}>Email confirmed successfully</div>
          <h1 style={{ fontSize: 'clamp(38px, 6vw, 60px)', lineHeight: 1.1, margin: '16px 0 16px', letterSpacing: '-.04em' }}>
            Welcome, {firstName}! 🎉
          </h1>
          <p style={{ color: '#b5c9d7', fontSize: 18, lineHeight: 1.6, maxWidth: 620, margin: '0 auto' }}>
            Your Ssewasswa Comforts School ERP account is ready. Before you start running your school, let's set up a few essentials so report cards, certificates, and documents carry your school's identity from day one.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2c4a64', borderRadius: 14, padding: '20px 24px', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>Setup progress</strong>
            <span style={{ color: '#61d3a5', fontWeight: 700, fontSize: 14 }}>{progress}%</span>
          </div>
          <div style={{ height: 8, background: '#1a3b54', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #61d3a5, #2db98c)', transition: 'width 0.4s' }} />
          </div>
          <p style={{ fontSize: 12, color: '#8fb3c9', margin: '10px 0 0 0' }}>
            {visited.length} of {CHECKLIST.length} steps touched. You can come back to any of these from Settings later.
          </p>
        </div>

        {/* Checklist grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {CHECKLIST.map((item, i) => {
            const isDone = visited.includes(item.title);
            return (
              <div key={item.title} style={{
                background: isDone ? 'linear-gradient(145deg, #102d22, #0c2118)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isDone ? '#2a6b50' : '#2c4a64'}`,
                borderRadius: 14,
                padding: 22,
                opacity: isDone ? 1 : 0.95,
                cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = isDone ? '#3a9c78' : '#3a6c8a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = isDone ? '#2a6b50' : '#2c4a64'; }}
                onClick={() => { markVisited(item.title); navigate('/setup'); }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 15 }}>{item.title}</strong>
                      {isDone && <span style={{ fontSize: 11, color: '#61d3a5', background: 'rgba(97,211,165,0.15)', padding: '2px 8px', borderRadius: 999 }}>✓ done</span>}
                    </div>
                    <p style={{ color: '#9ab4c5', fontSize: 13, lineHeight: 1.5, margin: '6px 0 0 0' }}>{item.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary CTA */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button onClick={() => navigate('/setup')} style={{
            background: '#61d3a5', color: '#062218', border: 0, borderRadius: 12,
            padding: '18px 32px', fontWeight: 800, fontSize: 16, cursor: 'pointer',
            boxShadow: '0 12px 30px rgba(97,211,165,0.25)'
          }}>
            🚀 Start school setup
          </button>
          <p style={{ color: '#7fa0b5', fontSize: 13, marginTop: 14 }}>
            Takes about 5 minutes. You can edit any of this later from Settings → School Branding.
          </p>
        </div>
      </section>
    </main>
  );
}
