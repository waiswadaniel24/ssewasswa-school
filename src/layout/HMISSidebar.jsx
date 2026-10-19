// FileName: src/layout/HMISSidebar.jsx
// Ssewasswa Comforts HMIS — Sidebar with HMIS-specific menu items
// Shows: Dashboard, Patients, OPD, Lab, Pharmacy, Billing (NOT School ERP items)
// All links navigate to /hmis/* paths (NOT /app/* — that was the bug)

import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { HEALTH_FACILITY_TYPES } from '../config/healthFacilityTypes.js';
import {
  LuLayoutDashboard, LuUserPlus, LuStethoscope, LuFlaskConical,
  LuPill, LuReceipt,
} from 'react-icons/lu';

// Icon map for HMIS menu items
const HMIS_ICON_MAP = {
  '📊': LuLayoutDashboard,
  '🧑‍⚕️': LuUserPlus,
  '🏥': LuStethoscope,
  '🧪': LuFlaskConical,
  '💊': LuPill,
  '💵': LuReceipt,
};

function HMISMenuIcon({ icon, size = 16 }) {
  const IconComp = HMIS_ICON_MAP[icon];
  if (IconComp) return <IconComp size={size} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }} />;
  return <span style={{ fontSize: size + 2 }}>{icon}</span>;
}

// ─── HMIS MENU (separate from School ERP menu) ──────────────
// Each item maps to a /hmis/* route (defined in router.jsx).
// Items can be filtered by facility type — e.g. a Drug Shop doesn't show
// OPD/Lab items, only Pharmacy + Billing.
const HMIS_MENU = [
  // MAIN
  { path: '/', name: 'Dashboard', icon: '📊', section: 'main', facilityTypes: 'all' },

  // CLINICAL SERVICES
  { path: '/patients', name: 'Patients', icon: '🧑‍⚕️', section: 'clinical', facilityTypes: 'all' },
  { path: '/opd', name: 'OPD / Outpatient', icon: '🏥', section: 'clinical', facilityTypes: ['Clinic', 'HC2', 'HC3', 'HC4', 'GeneralHospital'] },
  { path: '/ipd', name: 'IPD / Wards', icon: '🛏️', section: 'clinical', facilityTypes: ['HC3', 'HC4', 'GeneralHospital'] },
  { path: '/lab', name: 'Laboratory', icon: '🧪', section: 'clinical', facilityTypes: ['Pharmacy', 'Clinic', 'HC3', 'HC4', 'GeneralHospital'] },
  { path: '/pharmacy', name: 'Pharmacy', icon: '💊', section: 'clinical', facilityTypes: 'all' },
  { path: '/billing', name: 'Billing', icon: '💵', section: 'clinical', facilityTypes: 'all' },

  // MATERNAL & CHILD HEALTH
  { path: '/maternal', name: 'Maternal Health', icon: '🤱', section: 'maternal', facilityTypes: ['HC3', 'HC4', 'GeneralHospital'] },
  { path: '/immunizations', name: 'Immunizations (EPI)', icon: '💉', section: 'maternal', facilityTypes: ['Clinic', 'HC2', 'HC3', 'HC4', 'GeneralHospital'] },

  // DISEASE PROGRAMS
  { path: '/notifiable', name: 'Notifiable Diseases', icon: '⚠️', section: 'disease', facilityTypes: ['Clinic', 'HC2', 'HC3', 'HC4', 'GeneralHospital'] },

  // SUPPORT SERVICES
  { path: '/staff', name: 'Staff Management', icon: '👥', section: 'support', facilityTypes: 'all' },
  { path: '/reports', name: 'Reports (Form 105)', icon: '📈', section: 'support', facilityTypes: 'all' },
];

const SECTION_NAMES = {
  main: 'Main',
  clinical: 'Clinical',
  finance: 'Finance',
};

const SECTION_ICONS = {
  main: '📋',
  clinical: '🩺',
  finance: '💰',
};

export default function HMISSidebar({ isDark }) {
  const { schoolLevel, setSchoolLevel } = useAuth();
  // For HMIS, schoolLevel actually stores the facility type key (e.g. 'HC3')
  // (we reuse the same localStorage slot for simplicity)
  const facilityType = schoolLevel || 'Clinic';
  const facilityConfig = HEALTH_FACILITY_TYPES[facilityType] || HEALTH_FACILITY_TYPES.Clinic;
  const [searchQuery, setSearchQuery] = useState('');

  // Filter menu items by facility type
  const filteredItems = HMIS_MENU.filter((item) => {
    if (item.facilityTypes === 'all') return true;
    return item.facilityTypes.includes(facilityType);
  });

  // Group by section
  const grouped = filteredItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const navLinkStyle = ({ isActive }) => ({
    display: 'block',
    padding: '10px 20px',
    color: isActive
      ? (isDark ? '#8ab4f8' : '#1a73e8')
      : (isDark ? '#aaa' : '#5f6368'),
    background: isActive
      ? (isDark ? 'rgba(26, 115, 232, 0.15)' : '#e8f0fe')
      : 'transparent',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: isActive ? '600' : '400',
    borderLeft: isActive ? '3px solid #0b8043' : '3px solid transparent',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  });

  // HMIS paths live under /hmis (NOT /app — that was the bug)
  const toHmisPath = (p) => {
    if (!p) return '/hmis';
    if (p === '/') return '/hmis';
    if (p.startsWith('/')) return '/hmis' + p;
    return '/hmis/' + p;
  };

  return (
    <aside className="app-sidebar" style={{
      width: '240px',
      minWidth: '240px',
      background: isDark ? '#1e1e1e' : 'white',
      borderRight: `1px solid ${isDark ? '#333' : '#dadce0'}`,
      height: '100%',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Facility type badge */}
      <div style={{
        padding: '14px 20px',
        background: isDark ? '#0b8043' : '#0b8043',
        color: '#fff',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {facilityConfig.label}
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid ' + (isDark ? '#333' : '#e8eaed') }}>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: `1px solid ${isDark ? '#444' : '#dadce0'}`,
            borderRadius: '4px',
            background: isDark ? '#1e1e1e' : '#fff',
            color: isDark ? '#fff' : '#000',
            fontSize: '12px',
          }}
        />
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: '10px' }}>
        {/* Dashboard always visible */}
        <NavLink to="/hmis" end style={navLinkStyle}>
          <HMISMenuIcon icon="📊" size={16} /> Dashboard
        </NavLink>

        {/* Render grouped sections */}
        {Object.entries(grouped).map(([section, items]) => {
          // Skip 'main' section — Dashboard already shown above
          if (section === 'main') return null;

          const filteredSectionItems = items.filter((item) =>
            !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          if (filteredSectionItems.length === 0) return null;

          return (
            <div key={section}>
              <p style={{
                padding: '12px 20px',
                fontSize: '10px',
                fontWeight: '700',
                color: '#0b8043',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: '15px 0 5px 0',
                borderBottom: `1px solid ${isDark ? '#333' : '#e8eaed'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>{SECTION_ICONS[section] || '📁'} {SECTION_NAMES[section] || section}</span>
                <span style={{ fontSize: '10px', fontWeight: '400', color: isDark ? '#666' : '#999' }}>
                  {filteredSectionItems.length}
                </span>
              </p>
              {filteredSectionItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={toHmisPath(item.path)}
                  style={navLinkStyle}
                >
                  <HMISMenuIcon icon={item.icon} size={14} /> {item.name}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '10px 20px',
        borderTop: `1px solid ${isDark ? '#333' : '#e8eaed'}`,
        fontSize: '11px',
        color: isDark ? '#666' : '#999',
        flexShrink: 0,
      }}>
        v10.1 • HMIS
      </div>
    </aside>
  );
}
