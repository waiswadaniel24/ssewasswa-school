// Ssewasswa Comforts — Roles & Permissions
import React, { useState } from 'react';

const ROLE_DEFINITIONS = [
  { name: 'Viewer', permissions: ['view_dashboard'], desc: 'Read-only access' },
  { name: 'Staff', permissions: ['view_dashboard', 'manage_students', 'view_attendance'], desc: 'Basic staff member' },
  { name: 'Teacher', permissions: ['view_dashboard', 'manage_students', 'manage_attendance', 'manage_marks', 'view_timetable'], desc: 'Classroom teacher' },
  { name: 'Bursar', permissions: ['view_dashboard', 'manage_fees', 'manage_payments', 'view_accounting', 'view_debts'], desc: 'Finance officer' },
  { name: 'Admin', permissions: ['all_school_modules', 'manage_users', 'manage_settings', 'view_reports'], desc: 'School administrator' },
  { name: 'Super Admin', permissions: ['all_modules', 'manage_users', 'manage_settings', 'manage_subscription', 'view_audit_logs'], desc: 'Full system access' },
  { name: 'Developer', permissions: ['all_modules', 'dev_tools', 'license_generation', 'system_config'], desc: 'Developer/master account' },
];

export default function Roles() {
  return (
    <div className="page-container">
      <h1 className="page-title">👥 Roles & Permissions</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Granular role-based access control. Each role has predefined permissions.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {ROLE_DEFINITIONS.map(r => (
          <div key={r.name} style={{ padding: 20, borderRadius: 8, background: 'white', border: '1px solid #e0e0e0' }}>
            <h3 style={{ margin: '0 0 4px', color: '#1a73e8', fontSize: 16 }}>{r.name}</h3>
            <p style={{ color: '#666', fontSize: 12, margin: '0 0 12px' }}>{r.desc}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {r.permissions.map(p => <span key={p} style={{ background: '#e8f0fe', color: '#1a73e8', fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>{p}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}