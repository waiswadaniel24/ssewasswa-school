// FileName: src/pages/features/FeatureComingSoon.jsx
// Ssewasswa Comforts — Generic "Coming Soon" page for features being migrated
// from the legacy platform. Tells the user what the feature will do + ETA.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FEATURES } from '../MoreFeatures.jsx';

const ETA = {
  'chat': 'Q1 2026 — will use Supabase Realtime',
  'forums': 'Q1 2026 — under design review',
  'push-notifications': 'Q2 2026 — VAPID keys + service worker integration',
  'workflows': 'Q2 2026 — trigger-action rules engine',
  'automations': 'Q2 2026 — Vercel Cron Jobs integration',
  'scheduled-reports': 'Q1 2026 — pg_cron on Supabase',
  'shop': 'Q3 2026 — full e-commerce module',
  'marketplace': 'Q3 2026 — plugin/extension store',
  'loyalty': 'Q3 2026 — reward point system',
  'fundraising': 'Q2 2026 — crowdfunding campaigns',
  'report-builder': 'Q3 2026 — drag-and-drop report designer',
  'benchmarks': 'Q3 2026 — industry data partnership required',
  'ai-insights': 'Q2 2026 — GPT-powered analysis',
  'analytics': 'Q2 2026 — BI dashboards',
  'compliance': 'Q1 2026 — regulatory checklists',
  'government-reports': 'Q1 2026 — MoES/MoH/URSB integration',
  'duplicates': 'Q1 2026 — fuzzy matching engine',
  'policies': 'Q1 2026 — CMS for Terms/Privacy',
  'opt-out': 'Q1 2026 — GDPR right-to-be-forgotten',
  'requisitions': 'Q2 2026 — purchase request workflow',
  'signing': 'Q2 2026 — e-signature integration',
  'plugins': 'Q3 2026 — extension manager',
  'blog': 'Q1 2026 — full CMS (we have /news as subscriber feed)',
  'public-pages': 'Q1 2026 — static page CMS',
  'homepage-builder': 'Q3 2026 — drag-and-drop builder',
  'barcodes': 'Q2 2026 — generate + print barcodes',
  'ussd': 'Q3 2026 — mobile dial codes',
  'shortcuts': 'Q1 2026 — user-pinned quick actions',
  'biometrics': 'Q3 2026 — WebAuthn + fingerprint',
  'business-portal': 'Q3 2026 — full SME suite',
  'church-portal': 'Q3 2026 — tithes + sermons',
  'org-portal': 'Q2 2026 — NGO member directory',
  'individual-portal': 'Q2 2026 — personal budget',
  'parent-portal': 'Q1 2026 — PRIORITY (parents view children)',
  'student-portal': 'Q1 2026 — PRIORITY (students view own data)',
  'entertainment': 'Q4 2026 — media hosting',
  'app-store': 'Q4 2026 — mini-app store',
};

export default function FeatureComingSoon({ featureId }) {
  const navigate = useNavigate();
  const feature = FEATURES.find(f => f.id === featureId);

  if (!feature) {
    return (
      <div className="page-container">
        <h1 className="page-title">Feature not found</h1>
        <p>The feature "{featureId}" doesn't exist. <button onClick={() => navigate('/more')} style={{ background: 'none', border: 0, color: '#1a73e8', cursor: 'pointer', textDecoration: 'underline' }}>← Back to More Features</button></p>
      </div>
    );
  }

  const eta = ETA[featureId] || 'Coming soon — under development';

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fafafa', borderRadius: 12, border: '1px solid #e0e0e0' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>{feature.icon}</div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>{feature.name}</h1>
        <div style={{ color: '#5f6368', fontSize: 13, marginBottom: 20 }}>{feature.category}</div>
        <p style={{ color: '#666', fontSize: 16, lineHeight: 1.6, maxWidth: 500, margin: '0 auto 32px' }}>{feature.desc}</p>

        <div style={{ display: 'inline-block', padding: '8px 20px', background: '#fef7e0', color: '#f9ab00', borderRadius: 999, fontWeight: 700, fontSize: 13, marginBottom: 24 }}>
          ⏳ {eta}
        </div>

        <div style={{ padding: 16, background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', marginBottom: 24, textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#1a73e8' }}>💡 What this feature will do</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#666', lineHeight: 1.6 }}>
            This feature is being migrated from our legacy platform. The legacy implementation has been
            audited and the design is being adapted to our new architecture (React SPA + Electron +
            Cloudflare + Vercel + Supabase). Once ready, it will be available here with full functionality.
          </p>
        </div>

        <div style={{ padding: 16, background: '#e8f0fe', borderRadius: 8, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#1a73e8' }}>📣 Want this faster?</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#1a73e8' }}>
            Email <a href="mailto:support@ssewasswacomfortstechnologies.com" style={{ color: '#1a73e8', fontWeight: 600 }}>support@ssewasswacomfortstechnologies.com</a> or
            WhatsApp <a href="https://wa.me/256789736737" target="_blank" rel="noreferrer" style={{ color: '#1a73e8', fontWeight: 600 }}>+256 789 736 737</a> to prioritize this feature.
          </p>
        </div>

        <button onClick={() => navigate('/more')} style={{ padding: '12px 24px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>← Back to More Features</button>
      </div>
    </div>
  );
}
