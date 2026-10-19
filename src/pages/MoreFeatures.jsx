// FileName: src/pages/MoreFeatures.jsx
// Ssewasswa Comforts — More Features Hub
// Catalog of 70+ features ported from the legacy platform. Each card routes
// to /more/<feature-id>. Fully-implemented features show ✓; others show "Coming Soon".

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export const FEATURES = [
  // ─── Communication (7 features) ──────────────────────────
  { id: 'chat', name: 'Real-time Chat', icon: '💬', category: 'Communication', desc: 'WebSocket group chat between staff, teachers, parents.', status: 'coming-soon' },
  { id: 'forums', name: 'Forums', icon: '🗣️', category: 'Communication', desc: 'Discussion boards with threads + replies.', status: 'coming-soon' },
  { id: 'bulk-sms', name: 'Bulk SMS Campaigns', icon: '📱', category: 'Communication', desc: 'Send bulk SMS via Africa\'s Talking to parents/staff.', status: 'implemented' },
  { id: 'email-templates', name: 'Email Templates', icon: '✉️', category: 'Communication', desc: 'Pre-designed email templates for common messages.', status: 'implemented' },
  { id: 'push-notifications', name: 'Push Notifications', icon: '🔔', category: 'Communication', desc: 'Web push notifications (VAPID keys).', status: 'coming-soon' },
  { id: 'notifications', name: 'Notifications Center', icon: '🔔', category: 'Communication', desc: 'In-app notification bell with read/unread state.', status: 'implemented' },
  { id: 'events', name: 'Events Calendar', icon: '📅', category: 'Communication', desc: 'Calendar events with registration + reminders.', status: 'implemented' },

  // ─── Automation (5 features) ─────────────────────────────
  { id: 'workflows', name: 'Workflows', icon: '⚙️', category: 'Automation', desc: 'Trigger-action rules (when fee paid → send receipt).', status: 'coming-soon' },
  { id: 'automations', name: 'Automations', icon: '🤖', category: 'Automation', desc: 'Scheduled job runner (daily/weekly).', status: 'coming-soon' },
  { id: 'scheduled-reports', name: 'Scheduled Reports', icon: '📤', category: 'Automation', desc: 'Auto-email weekly reports to administrators.', status: 'coming-soon' },
  { id: 'tasks', name: 'Tasks', icon: '✅', category: 'Automation', desc: 'To-do list per user. Head Teacher assigns tasks to staff.', status: 'implemented' },
  { id: 'recurring-donations', name: 'Recurring Donations', icon: '🔁', category: 'Automation', desc: 'Subscription-style donations with pause/resume.', status: 'implemented' },

  // ─── Commerce (5 features) ─────────────────────────────
  { id: 'shop', name: 'E-commerce Shop', icon: '🛒', category: 'Commerce', desc: 'Online store for uniforms, books, supplies. Cart + checkout.', status: 'coming-soon' },
  { id: 'marketplace', name: 'App Marketplace', icon: '🏪', category: 'Commerce', desc: 'Plugin/extension store.', status: 'coming-soon' },
  { id: 'loyalty', name: 'Loyalty Points', icon: '🎁', category: 'Commerce', desc: 'Reward points for attendance, on-time payments.', status: 'coming-soon' },
  { id: 'fundraising', name: 'Fundraising Campaigns', icon: '🤝', category: 'Commerce', desc: 'Crowdfunding for school infrastructure, hospital equipment.', status: 'coming-soon' },
  { id: 'suppliers', name: 'Suppliers', icon: '🚚', category: 'Commerce', desc: 'Vendor database with contact + payment terms.', status: 'implemented' },

  // ─── Analytics (4 features) ─────────────────────────────
  { id: 'report-builder', name: 'Custom Report Builder', icon: '📊', category: 'Analytics', desc: 'Drag-and-drop report builder.', status: 'coming-soon' },
  { id: 'benchmarks', name: 'Benchmarks', icon: '📈', category: 'Analytics', desc: 'Compare your metrics vs industry averages.', status: 'coming-soon' },
  { id: 'ai-insights', name: 'AI Insights', icon: '🧠', category: 'Analytics', desc: 'GPT-powered data analysis (why did attendance drop?).', status: 'coming-soon' },
  { id: 'analytics', name: 'Analytics Dashboards', icon: '📊', category: 'Analytics', desc: 'Business intelligence dashboards.', status: 'coming-soon' },

  // ─── Admin & Compliance (16 features) ───────────────────
  { id: 'api-keys', name: 'API Keys', icon: '🔑', category: 'Admin & Compliance', desc: 'Self-serve API tokens for integrations.', status: 'implemented' },
  { id: 'api-docs', name: 'API Docs', icon: '📚', category: 'Admin & Compliance', desc: 'Auto-generated REST API documentation.', status: 'implemented' },
  { id: 'audit-logs', name: 'Audit Logs', icon: '📜', category: 'Admin & Compliance', desc: 'Track all user actions for compliance + security.', status: 'implemented' },
  { id: 'login-history', name: 'Login History', icon: '🌐', category: 'Admin & Compliance', desc: 'Track every login: IP, device, time.', status: 'implemented' },
  { id: 'roles', name: 'Roles & Permissions', icon: '👥', category: 'Admin & Compliance', desc: 'Granular RBAC editor.', status: 'implemented' },
  { id: 'compliance', name: 'Compliance Checklists', icon: '✅', category: 'Admin & Compliance', desc: 'GDPR, NDA, NIRA, NSSF regulatory checklists.', status: 'coming-soon' },
  { id: 'government-reports', name: 'Government Reports', icon: '🏛️', category: 'Admin & Compliance', desc: 'Pre-built reports for MoES, MoH, URSB, NSSF.', status: 'coming-soon' },
  { id: 'trash', name: 'Trash / Soft Delete', icon: '🗑️', category: 'Admin & Compliance', desc: 'Recover accidentally deleted records.', status: 'implemented' },
  { id: 'duplicates', name: 'Duplicate Detection', icon: '⚖️', category: 'Admin & Compliance', desc: 'Find + merge duplicate entities.', status: 'coming-soon' },
  { id: 'policies', name: 'Policies CMS', icon: '📜', category: 'Admin & Compliance', desc: 'Terms, Privacy, Acceptable Use pages.', status: 'coming-soon' },
  { id: 'opt-out', name: 'GDPR Opt-out', icon: '🚫', category: 'Admin & Compliance', desc: 'Right-to-be-forgotten workflow.', status: 'coming-soon' },
  { id: 'custom-fields', name: 'Custom Fields', icon: '🧩', category: 'Admin & Compliance', desc: 'Add custom fields to any entity (students, patients, staff).', status: 'implemented' },
  { id: 'backup-restore', name: 'Backup & Restore', icon: '💾', category: 'Admin & Compliance', desc: 'One-click DB export to CSV/JSON + restore.', status: 'implemented' },
  { id: 'requisitions', name: 'Requisitions', icon: '🛍️', category: 'Admin & Compliance', desc: 'Internal purchase requests + approval workflow.', status: 'coming-soon' },
  { id: 'signing', name: 'Document Signing', icon: '✍️', category: 'Admin & Compliance', desc: 'E-signature for contracts, transfer certificates.', status: 'coming-soon' },
  { id: 'plugins', name: 'Plugins Manager', icon: '🔌', category: 'Admin & Compliance', desc: 'Installed extensions manager.', status: 'coming-soon' },

  // ─── Content & Marketing (10 features) ───────────────────
  { id: 'blog', name: 'Blog / CMS', icon: '📝', category: 'Content & Marketing', desc: 'Publish articles + news (we have /news subscriber feed).', status: 'coming-soon' },
  { id: 'public-pages', name: 'Public Pages CMS', icon: '📄', category: 'Content & Marketing', desc: 'Static page CMS (About, Mission, etc.).', status: 'coming-soon' },
  { id: 'homepage-builder', name: 'Homepage Builder', icon: '🏠', category: 'Content & Marketing', desc: 'Drag-and-drop landing page builder.', status: 'coming-soon' },
  { id: 'surveys', name: 'Surveys', icon: '📋', category: 'Content & Marketing', desc: 'Questionnaires with response collection.', status: 'implemented' },
  { id: 'suggestions', name: 'Suggestions Box', icon: '💡', category: 'Content & Marketing', desc: 'User-submitted feedback (anonymous option).', status: 'implemented' },
  { id: 'qr-codes', name: 'QR Code Generator', icon: '🔳', category: 'Content & Marketing', desc: 'Generate QR codes linking to payments, forms.', status: 'implemented' },
  { id: 'barcodes', name: 'Barcode Generator', icon: '▮', category: 'Content & Marketing', desc: 'Generate + print barcodes for inventory.', status: 'coming-soon' },
  { id: 'deep-links', name: 'Deep Links', icon: '🔗', category: 'Content & Marketing', desc: 'Short URLs for sharing (e.g. /s/abc123).', status: 'implemented' },
  { id: 'ussd', name: 'USSD Codes', icon: '📞', category: 'Content & Marketing', desc: 'Mobile dial codes (*123#) for balance check.', status: 'coming-soon' },
  { id: 'shortcuts', name: 'Quick Shortcuts', icon: '⚡', category: 'Content & Marketing', desc: 'User-pinned quick actions.', status: 'coming-soon' },

  // ─── Mobile (1 feature) ──────────────────────────────────
  { id: 'biometrics', name: 'Biometrics Login', icon: '👆', category: 'Mobile', desc: 'Fingerprint / Face ID auth (mobile + desktop).', status: 'coming-soon' },

  // ─── Other portals (4 missing portals) ──────────────────
  { id: 'business-portal', name: 'Business / SME Portal', icon: '🏢', category: 'Other Portals', desc: 'POS, sales, customer CRM, suppliers, branches.', status: 'implemented' },
  { id: 'church-portal', name: 'Church Portal', icon: '⛪', category: 'Other Portals', desc: 'Tithes, donations, sermons library, committees.', status: 'implemented' },
  { id: 'org-portal', name: 'Org / NGO Portal', icon: '🌍', category: 'Other Portals', desc: 'Member directory, registration, finance.', status: 'implemented' },
  { id: 'individual-portal', name: 'Individual Portal', icon: '🧑', category: 'Other Portals', desc: 'Personal budget, savings goals.', status: 'implemented' },

  // ─── User-specific portals ──────────────────────────────
  { id: 'parent-portal', name: 'Parent Portal', icon: '👨‍👩‍👧', category: 'User Portals', desc: 'Parent login to view children\'s attendance, fees, report cards.', status: 'implemented' },
  { id: 'student-portal', name: 'Student Portal', icon: '🎓', category: 'User Portals', desc: 'Student login to view own attendance, marks, assignments.', status: 'implemented' },

  // ─── Entertainment ──────────────────────────────────────
  { id: 'entertainment', name: 'Entertainment Hub', icon: '🎬', category: 'Other', desc: 'Video + music hosting (church sermons, school events).', status: 'coming-soon' },
  { id: 'app-store', name: 'App Store', icon: '🛍️', category: 'Other', desc: 'Browse + install Ssewasswa-built mini-apps.', status: 'coming-soon' },
];

const CATEGORIES = ['Communication', 'Automation', 'Commerce', 'Analytics', 'Admin & Compliance', 'Content & Marketing', 'Mobile', 'Other Portals', 'User Portals', 'Other'];

export default function MoreFeatures() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = FEATURES.filter(f => {
    if (filter !== 'All' && f.category !== filter) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.desc.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const implementedCount = FEATURES.filter(f => f.status === 'implemented').length;
  const comingSoonCount = FEATURES.filter(f => f.status === 'coming-soon').length;

  return (
    <div className="page-container">
      <h1 className="page-title">🧰 More Features</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
        Catalog of {FEATURES.length} features ported from our legacy platform.{' '}
        <strong style={{ color: '#0b8043' }}>{implementedCount} fully implemented</strong>,{' '}
        <strong style={{ color: '#f9ab00' }}>{comingSoonCount} coming soon</strong>.
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search features..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14, flex: 1, minWidth: 200 }}
        />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14 }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Feature cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map(f => (
          <div key={f.id} style={{
            border: `1px solid ${f.status === 'implemented' ? '#0b8043' : '#dadce0'}`,
            borderRadius: 8,
            padding: 20,
            background: f.status === 'implemented' ? '#f6fff9' : '#fafafa',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
            onClick={() => navigate(`/more/${f.id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 32 }}>{f.icon}</div>
              {f.status === 'implemented' ? (
                <span style={{ background: '#0b8043', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>✓ READY</span>
              ) : (
                <span style={{ background: '#f9ab00', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>SOON</span>
              )}
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#1a73e8' }}>{f.name}</h3>
            <div style={{ color: '#5f6368', fontSize: 11, marginBottom: 8 }}>{f.category}</div>
            <p style={{ color: '#666', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>{f.desc}</p>
            <button style={{
              width: '100%', padding: '8px',
              background: f.status === 'implemented' ? '#1a73e8' : '#fff',
              color: f.status === 'implemented' ? 'white' : '#1a73e8',
              border: `1px solid ${f.status === 'implemented' ? '#1a73e8' : '#1a73e8'}`,
              borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {f.status === 'implemented' ? 'Open →' : 'Preview →'}
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
          No features match your search.
        </div>
      )}
    </div>
  );
}
