// FileName: src/layout/Sidebar.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Left navigation sidebar with role-based and school-level-based menu filtering

import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LuLayoutDashboard, LuGraduationCap, LuUsers, LuUser, LuWallet,
  LuBookOpen, LuCalendarCheck, LuCalendarDays, LuFileText,
  LuSettings, LuInfo, LuShoppingCart, LuTruck, LuPrinter,
  LuActivity, LuClipboardList, LuBuilding, LuReceipt, LuCreditCard,
  LuLibrary, LuBaby, LuAward, LuTrendingUp, LuTrendingDown,
  LuMegaphone, LuShieldAlert, LuIdCard,
} from 'react-icons/lu';

// ═══════════════════════════════════════════════════════════
// ICON MAP — maps emoji strings in MENU_ITEMS to professional Lucide icons
// ═══════════════════════════════════════════════════════════
const ICON_MAP = {
  '📊': LuLayoutDashboard,
  '🎓': LuGraduationCap,
  '👤': LuUser,
  '📋': LuClipboardList,
  '⬆️': LuTrendingUp,
  '📉': LuTrendingDown,
  '🎖️': LuAward,
  '👨‍🏫': LuUsers,
  '💰': LuWallet,
  '📚': LuBookOpen,
  '✅': LuCalendarCheck,
  '📅': LuCalendarDays,
  '📆': LuCalendarDays,
  '⚠️': LuShieldAlert,
  '📝': LuFileText,
  '📄': LuFileText,
  '🪪': LuIdCard,
  '🏛️': LuBuilding,
  '💵': LuWallet,
  '📱': LuReceipt,
  '🏦': LuCreditCard,
  '🏪': LuShoppingCart,
  '📖': LuLibrary,
  '🚌': LuTruck,
  '📢': LuMegaphone,
  '✍️': LuFileText,
  '🖨️': LuPrinter,
  '🧒': LuBaby,
  '📈': LuActivity,
  '⚙️': LuSettings,
  '👥': LuUsers,
  'ℹ️': LuInfo,
  '🧰': LuSettings,
};

// Helper: render the right icon for a menu item
function MenuIcon({ icon, size = 16 }) {
  const IconComp = ICON_MAP[icon];
  if (IconComp) {
    return <IconComp size={size} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }} />;
  }
  // Fallback: render the emoji string as-is
  return <span style={{ fontSize: size + 2 }}>{icon}</span>;
}

// ═══════════════════════════════════════════════════════════
// MENU DEFINITIONS — all routes in the system
// ═══════════════════════════════════════════════════════════

const MENU = [
  // MAIN
  { path: '/', name: 'Dashboard', icon: '📊', section: 'main' },

  // STUDENTS
  { path: '/students', name: 'Students', icon: '🎓', section: 'students' },
  { path: '/student/:id', name: 'Profile', icon: '👤', section: 'students', hidden: true },
  { path: '/student-history', name: 'History', icon: '📋', section: 'students' },
  { path: '/requirements', name: 'Requirements', icon: '📋', section: 'students' },
  { path: '/promotion', name: 'Promotion', icon: '⬆️', section: 'students' },
  { path: '/dropouts', name: 'Dropouts', icon: '📉', section: 'students' },
  { path: '/military-grades', name: 'Military Grades', icon: '🎖️', section: 'students' },

  // STAFF
  { path: '/staff', name: 'Staff & HR', icon: '👨‍🏫', section: 'staff' },
  { path: '/staff/:id', name: 'Staff Profile', icon: '👤', section: 'staff', hidden: true },
  { path: '/teacher-qualifications', name: 'Qualifications', icon: '📜', section: 'staff' },
  { path: '/payroll', name: 'Payroll', icon: '💰', section: 'staff' },
  { path: '/deductions', name: 'Deductions', icon: '📉', section: 'staff' },

  // ACADEMICS
  { path: '/academics', name: 'Academics', icon: '📚', section: 'academics' },
  { path: '/attendance', name: 'Attendance', icon: '✅', section: 'academics' },
  { path: '/timetable', name: 'Timetable', icon: '📅', section: 'academics' },
  { path: '/calendar', name: 'Calendar', icon: '📆', section: 'academics' },
  { path: '/discipline', name: 'Discipline', icon: '⚠️', section: 'academics' },

  // EXAMS
  { path: '/exams', name: 'Exams', icon: '📝', section: 'exams' },
  { path: '/exam-results', name: 'Results', icon: '📊', section: 'exams' },
  { path: '/broad-sheet', name: 'Broad Sheet', icon: '📋', section: 'exams' },
  { path: '/report-cards', name: 'Report Cards', icon: '📄', section: 'exams' },
  { path: '/id-cards', name: 'ID Cards', icon: '🪪', section: 'exams' },

  // UNEB + ALL EXAM BOARDS (6 total)
  { path: '/uneb-exams', name: 'UNEB Reg.', icon: '🏛️', section: 'uneb', unebOnly: true },
  { path: '/ubteb-exams', name: 'UBTEB Reg.', icon: '🏢', section: 'uneb' },
  { path: '/nche-accreditation', name: 'NCHE Accred.', icon: '🎓', section: 'uneb' },
  { path: '/nurses-council-exams', name: 'Nurses Council', icon: '🏥', section: 'uneb' },
  { path: '/ahpc-exams', name: 'AHPC Exams', icon: '💊', section: 'uneb' },
  { path: '/kyambogo-teacher-ed', name: 'Kyambogo T.Ed.', icon: '👨‍🏫', section: 'uneb' },

  // FINANCE
  { path: '/finance', name: 'Fees', icon: '💵', section: 'finance' },
  { path: '/payments', name: 'Mobile Money', icon: '📱', section: 'finance' },
  { path: '/debts', name: 'Debts', icon: '📉', section: 'finance' },
  { path: '/school-finances', name: 'School Finances', icon: '🏦', section: 'finance', emisOnly: true },
  { path: '/accounting', name: 'Accounting', icon: '📊', section: 'finance' },
  { path: '/canteen', name: 'Canteen', icon: '🏪', section: 'finance' },
  { path: '/purchases', name: 'Purchases', icon: '🛒', section: 'finance' },

  // SERVICES
  { path: '/library', name: 'Library', icon: '📖', section: 'services' },
  { path: '/transport', name: 'Transport', icon: '🚌', section: 'services' },
  { path: '/gatebook', name: 'Gate Book', icon: '📋', section: 'services' },
  { path: '/broadcast', name: 'Broadcast', icon: '📢', section: 'services' },
  { path: '/extracurricular', name: 'Activities', icon: '⚽', section: 'services', secondaryOnly: true },
  { path: '/meeting-minutes', name: 'Meetings', icon: '📝', section: 'services' },
  { path: '/signatures', name: 'Signatures', icon: '✍️', section: 'services' },
  { path: '/generate-docs', name: 'Documents', icon: '🖨️', section: 'services' },

  // EARLY CHILDHOOD
  { path: '/nursery', name: 'Nursery', icon: '🧒', section: 'early_childhood' },
  { path: '/ecd', name: 'ECD', icon: '👶', section: 'early_childhood', emisOnly: true },

  // EMIS COMPLIANCE
  { path: '/kpi-dashboard', name: 'KPI Dashboard', icon: '📈', section: 'emis', emisOnly: true },
  { path: '/data-validation', name: 'Validation', icon: '✅', section: 'emis', emisOnly: true },
  { path: '/data-export', name: 'Export', icon: '📤', section: 'emis', emisOnly: true },
  { path: '/infrastructure', name: 'Infrastructure', icon: '🏗️', section: 'emis', emisOnly: true },
  { path: '/wash', name: 'WASH', icon: '🚰', section: 'emis', emisOnly: true },
  { path: '/latrines', name: 'Latrines', icon: '🚻', section: 'emis', emisOnly: true },
  { path: '/governance', name: 'Governance', icon: '🏛️', section: 'emis', emisOnly: true },
  { path: '/health-nutrition', name: 'Health', icon: '🍎', section: 'emis', emisOnly: true },
  { path: '/special-needs', name: 'Special Needs', icon: '♿', section: 'emis', emisOnly: true },
  { path: '/textbooks', name: 'Textbooks', icon: '📚', section: 'emis', emisOnly: true },
  { path: '/emis-report', name: 'EMIS Report', icon: '📊', section: 'emis', emisOnly: true },
  { path: '/emis-config', name: 'EMIS Config', icon: '⚙️', section: 'emis', emisOnly: true },
  { path: '/enrollment', name: 'Enrollment', icon: '📝', section: 'emis', emisOnly: true },

  // ADMIN
  { path: '/users', name: 'Users', icon: '👥', section: 'admin' },
  { path: '/settings', name: 'Settings', icon: '⚙️', section: 'admin' },
  { path: '/manuals', name: 'Manuals', icon: '📖', section: 'admin' },
  { path: '/copyright', name: 'Copyright', icon: '©️', section: 'admin' },
  { path: '/terms', name: 'Terms', icon: '📜', section: 'admin' },
  { path: '/about', name: 'About', icon: 'ℹ️', section: 'admin' }
];

// ═══════════════════════════════════════════════════════════
// ROLE PERMISSIONS — which sections each role can see
// ═══════════════════════════════════════════════════════════

const ROLES = {
  'Viewer': ['main', 'more'],
  'Staff': ['main', 'students', 'services', 'more'],
  'Teacher': ['main', 'students', 'academics', 'exams', 'more'],
  'Bursar': ['main', 'finance', 'more'],
  'Admin': ['main', 'students', 'staff', 'academics', 'exams', 'finance', 'services', 'early_childhood', 'emis', 'admin', 'more'],
  'Super Admin': ['main', 'students', 'staff', 'academics', 'exams', 'uneb', 'finance', 'services', 'early_childhood', 'emis', 'admin', 'more'],
  // Developer role: full access to everything (same as Super Admin + uneb section).
  // Without this entry, developers fell back to ROLES['Staff'] = ['main', 'students', 'services']
  // → only 3 sections visible (Dashboard, Students, Services). That's why devs couldn't
  // see Staff/Academics/Exams/Finance/EMIS/Administration sections in the sidebar.
  'Developer': ['main', 'students', 'staff', 'academics', 'exams', 'uneb', 'finance', 'services', 'early_childhood', 'emis', 'admin', 'more']
};

// ═══════════════════════════════════════════════════════════
// SECTION DISPLAY NAMES + ICONS
// ═══════════════════════════════════════════════════════════

const SECTION_NAMES = {
  'main': 'Main',
  'students': 'Students',
  'staff': 'Staff & HR',
  'academics': 'Academics',
  'exams': 'Examinations',
  'uneb': 'UNEB',
  'finance': 'Finance',
  'services': 'Services',
  'early_childhood': 'Early Childhood',
  'emis': 'EMIS Compliance',
  'admin': 'Administration',
  'more': 'More Features'
};

const SECTION_ICONS = {
  'main': '🏠',
  'students': '🎓',
  'staff': '👨‍🏫',
  'academics': '📚',
  'exams': '📝',
  'uneb': '🏛️',
  'finance': '💰',
  'services': '🔧',
  'early_childhood': '🧒',
  'emis': '📊',
  'admin': '⚙️',
  'more': '🧰'
};

// ═══════════════════════════════════════════════════════════
// LEVEL CONFIG — FIXED: all keys use CONSISTENT camelCase
// showUNEB (NOT showUNEb), showExtracurricular (NOT showExtrurricular)
// ═══════════════════════════════════════════════════════════

const LEVEL_CONFIG = {
  'Nursery': {
    showUNEB: false,
    showEMIS: false,
    showNursery: true,
    showSecondary: false,
    showExtracurricular: false
  },
  'Primary': {
    showUNEB: true,
    showEMIS: true,
    showNursery: false,
    showSecondary: false,
    showExtracurricular: false
  },
  'Nursery_Primary': {
    showUNEB: true,
    showEMIS: true,
    showNursery: true,
    showSecondary: false,
    showExtracurricular: false
  },
  'Secondary': {
    showUNEB: true,
    showEMIS: true,
    showNursery: false,
    showSecondary: true,
    showExtracurricular: true
  },
  'Primary_Secondary': {
    showUNEB: true,
    showEMIS: true,
    showNursery: true,
    showSecondary: true,
    showExtracurricular: true
  },
  'Tertiary': {
    showUNEB: false,
    showEMIS: false,
    showNursery: false,
    showSecondary: false,
    showExtracurricular: false
  },
  'University': {
    showUNEB: false,
    showEMIS: false,
    showNursery: false,
    showSecondary: false,
    showExtracurricular: false  // FIXED: was showExtrurricular (typo)
  }
};

// ═══════════════════════════════════════════════════════════
// SIDEBAR COMPONENT
// ═══════════════════════════════════════════════════════════

export default function Sidebar({ searchQuery = '', isDark }) {
  const { user } = useAuth();
  const [schoolLevel, setSchoolLevel] = useState('Primary');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // FIXED: renamed from 'fetch' to 'loadLevel' (was shadowing global fetch API)
    const loadLevel = async () => {
      try {
        if (!window.electronAPI) return;
        const r = await window.electronAPI.queryDatabase(
          "SELECT value FROM system_settings WHERE key = 'school_level'"
        );
        if (!mountedRef.current) return;
        if (r && r.success && r.data && r.data.length > 0 && r.data[0].value) {
          setSchoolLevel(r.data[0].value);
        }
      } catch (e) {
        if (!mountedRef.current) return;
        console.error('Sidebar: failed to load school level:', e.message);
      }
    };

    loadLevel();

    return () => { mountedRef.current = false; };
  }, []);

  // ─── Get config for current school level ───────────────
  const config = LEVEL_CONFIG[schoolLevel] || LEVEL_CONFIG['Primary'];
    var [licenseTier, setLicenseTier] = React.useState('premium');

    React.useEffect(function() {
        if (window.electronAPI && window.electronAPI.getLicenseTier) {
            window.electronAPI.getLicenseTier().then(function(r) {
                if (r && r.success) setLicenseTier(r.tier);
            });
        }
    }, []);

    // Sections visible only to Premium licenses
    var premiumSections = ['emis', 'uneb'];
  const role = user?.role || 'Staff';
  const allowedSections = ROLES[role] || ROLES['Staff'];

  // ─── Filter menu items ─────────────────────────────────
  // FIXED: removed incorrect 'config.emisOnly' check
  // (config doesn't have emisOnly — it has showEMIS)
  const filteredMenu = MENU.filter(item => {
    // Hidden items (dynamic routes like /student/:id) never show in sidebar
    if (item.hidden) return false;

    // Check role permission
    if (!allowedSections.includes(item.section)) return false;
        if (licenseTier !== 'premium' && premiumSections.indexOf(item.section) >= 0) return false;

    // EMIS-only items: only show if school level has EMIS enabled
    if (item.emisOnly && !config.showEMIS) return false;

    // UNEB-only items: only show if school level has UNEB enabled
    if (item.unebOnly && !config.showUNEB) return false;

    // Secondary-only items (extracurricular): only for secondary schools
    if (item.secondaryOnly && !config.showSecondary) return false;

    // Search filter
    if (searchQuery) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  // ─── Group items by section ─────────────────────────────
  const grouped = { /* no-op */ };
  filteredMenu.forEach(item => {
    if (!grouped[item.section]) grouped[item.section] = [];
    grouped[item.section].push(item);
  });

  // ─── NavLink style function ─────────────────────────────
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
    borderLeft: isActive ? '3px solid #1a73e8' : '3px solid transparent',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  });

  // ─── Path prefixer — sidebar items live under /app/ on web + desktop ──
  // MENU_ITEMS paths look like '/students', '/staff', etc. (bare).
  // But the router nests School ERP routes under '/app/*'. Without this
  // prefixer, clicking a sidebar item navigates to '/staff' which hits the
  // catch-all '*' → redirects to '/' → SAASPortal on web, /app on desktop.
  // That's why users were "stuck on the dashboard" — every click bounced back.
  const toAppPath = (p) => {
    if (!p) return '/app';
    if (p === '/') return '/app';
    if (p.startsWith('/')) return '/app' + p;
    return '/app/' + p;
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
      flexShrink: 0  // Prevent sidebar from shrinking
    }}>
      {/* ─── School Level Badge ─────────────────────── */}
      <div style={{
        padding: '12px 20px',
        background: isDark ? '#0d47a1' : '#1a73e8',
        color: 'white',
        fontSize: '11px',
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        flexShrink: 0
      }}>
        {schoolLevel.replace(/_/g, ' & ')}
      </div>

      {/* ─── Navigation ──────────────────────────────── */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: '10px' }}>

        {/* Dashboard always visible */}
        <NavLink to="/app" end style={navLinkStyle}>
          <MenuIcon icon="📊" size={16} /> Dashboard
        </NavLink>

        {/* Render grouped sections */}
        {Object.entries(grouped).map(([section, items]) => {
          // Skip 'main' section — Dashboard is already shown above
          if (section === 'main') return null;

          return (
            <div key={section}>
              {/* Section header */}
              <p style={{
                padding: '12px 20px',
                fontSize: '10px',
                fontWeight: '700',
                color: isDark ? '#8ab4f8' : '#1a73e8',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: '15px 0 5px 0',
                borderBottom: `1px solid ${isDark ? '#333' : '#e8eaed'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>
                  {SECTION_ICONS[section] || '📁'} {SECTION_NAMES[section] || section}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '400',
                  color: isDark ? '#666' : '#999'
                }}>
                  {items.length}
                </span>
              </p>

              {/* Section items */}
              {items.map(item => (
                <NavLink
                  key={item.path}
                  to={toAppPath(item.path)}
                  style={navLinkStyle}
                >
                  <MenuIcon icon={item.icon} size={14} /> {item.name}
                </NavLink>
              ))}
            </div>
          );
        })}

        {/* Empty state when search yields no results */}
        {filteredMenu.length === 0 && (
          <p style={{
            padding: '20px',
            fontSize: '13px',
            color: isDark ? '#666' : '#999',
            textAlign: 'center'
          }}>
            No menu items match &quot;{searchQuery}&quot;
          </p>
        )}
      </nav>

      {/* ─── Version Footer ──────────────────────────── */}
      <div style={{
        padding: '10px 15px',
        borderTop: `1px solid ${isDark ? '#333' : '#e8eaed'}`,
        fontSize: '10px',
        color: isDark ? '#555' : '#aaa',
        textAlign: 'center',
        flexShrink: 0
      }}>
        v10.0 • {schoolLevel.replace(/_/g, ' & ')}
      </div>
    </aside>
  );
}



