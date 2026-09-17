// FileName: src/layout/Header.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Top header — school name, school selector, language toggle, search, dark mode, logout

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Header(_ref) {
  var isDark = _ref.isDark;
  var toggleDarkMode = _ref.toggleDarkMode;
  var searchQuery = _ref.searchQuery;
  var setSearchQuery = _ref.setSearchQuery;

  var auth = useAuth();
  var user = (auth && auth.user) ? auth.user : null;
  var schools = (auth && auth.schools) ? auth.schools : [];
  var currentSchoolId = (auth && auth.currentSchoolId) ? auth.currentSchoolId : 1;
  var switchSchool = (auth && auth.switchSchool) ? auth.switchSchool : function () { /* no-op */ };
  var logout = (auth && auth.logout) ? auth.logout : function () { /* no-op */ };

  var langCtx = useLanguage();
  var lang = (langCtx && langCtx.lang) ? langCtx.lang : 'en';
  var setLang = (langCtx && langCtx.setLang) ? langCtx.setLang : function () { /* no-op */ };

  var [schoolName, setSchoolName] = useState('Ssewasswa School');
  var [netMode, setNetMode] = useState('Standalone');
  var mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  useEffect(function () {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) return;

    Promise.race([
      window.electronAPI.queryDatabase("SELECT value FROM system_settings WHERE key = 'school_name'"),
      new Promise(function (resolve) { setTimeout(function () { resolve({ success: false }); }, 2000); })
    ]).then(function (r) {
      if (!mountedRef.current) return;
      if (r && r.success && r.data && r.data.length > 0 && r.data[0].value) {
        setSchoolName(r.data[0].value);
      } else {
        setSchoolName('Ssewasswa School');
      }
    }).catch(function (err) { console.error("Header error:", err.message);
      if (!mountedRef.current) return;
      setSchoolName('Ssewasswa School');
    });

    if (window.electronAPI.getNetworkMode) {
      window.electronAPI.getNetworkMode().then(function (r) {
        if (!mountedRef.current) return;
        if (r && r.success && r.mode) {
          setNetMode(r.mode);
        }
      }).catch(function (err) { console.error("Header error:", err.message); /* no-op */ });
    }
  }, []);

  var roleColors = {
    'Super Admin': { bg: '#1a73e8', color: 'white' },
    'Admin': { bg: '#e8f0fe', color: '#1a73e8' },
    'Bursar': { bg: '#e8f5e9', color: '#0d904f' },
    'Teacher': { bg: '#fff3e0', color: '#e65100' },
    'Staff': { bg: '#f1f3f4', color: '#5f6368' },
    'Viewer': { bg: '#fce4ec', color: '#c2185b' }
  };
  var roleStyle = roleColors[(user && user.role) ? user.role : 'Staff'] || roleColors['Staff'];

  return (
    <header style={{
      background: isDark ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', padding: '0 24px', height: '60px', position: 'sticky', top: 0, zIndex: 100,
      borderBottom: '1px solid ' + (isDark ? '#333' : '#dadce0'),
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0
    }}>
      {/* ─── Left: School name + selector ────────────── */}
      <div className="school-header-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <img
          src="/ssewasswa-comforts-technologies-logo.png"
          alt="Ssewasswa Comforts Technologies logo"
  className="school-header-emblem"
          style={{ width: '38px', height: '38px', objectFit: 'contain', flex: '0 0 38px' }}
  />
        <h2 style={{
          margin: 0,
          color: isDark ? '#8ab4f8' : '#1a73e8',
          fontSize: '18px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {schoolName}
        </h2>

        {/* School selector (only if > 1 school) */}
        {schools && schools.length > 1 && (
          <select
            value={currentSchoolId}
            onChange={function (e) {
              if (confirm('Switch school? All data will reload.')) {
                switchSchool(parseInt(e.target.value));
              }
            }}
            style={{
              padding: '4px 10px', fontSize: '11px',
              border: '1px solid ' + (isDark ? '#555' : '#dadce0'),
              borderRadius: '4px',
              background: isDark ? '#333' : 'white',
              color: isDark ? '#ddd' : '#333',
              cursor: 'pointer', fontWeight: '600'
            }}
          >
            {schools.map(function (s) {
              return <option key={s.id} value={s.id}>{s.school_name}</option>;
            })}
          </select>
        )}

        <span style={{
          fontSize: '10px', fontWeight: '600',
          color: isDark ? '#aaa' : '#5f6368',
          background: isDark ? '#333' : '#f1f3f4',
          padding: '3px 10px', borderRadius: '12px',
          textTransform: 'uppercase'
        }}>
          {netMode} Mode
        </span>
      </div>

      {/* ─── Center: Search ─────────────────────────────── */}
      <div style={{ flex: 1, maxWidth: '400px', margin: '0 20px' }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)', color: '#9aa0a6', fontSize: '14px'
          }}>Search</span>
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={function (e) { setSearchQuery(e.target.value); }}
            style={{
              width: '100%', padding: '8px 12px 8px 36px',
              borderRadius: '20px',
              border: '1px solid ' + (isDark ? '#555' : '#dadce0'),
              background: isDark ? '#333' : '#f1f3f4',
              color: isDark ? '#fff' : '#000',
              fontSize: '13px', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* ─── Right: Toggles + User + Logout ──────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Language toggle */}
        <button
          onClick={function () { setLang(lang === 'en' ? 'lg' : 'en'); }}
          style={{
            background: 'none', border: '1px solid ' + (isDark ? '#555' : '#dadce0'),
            borderRadius: '4px', padding: '4px 10px',
            cursor: 'pointer', fontSize: '12px', fontWeight: '600',
            color: isDark ? '#ddd' : '#333'
          }}
          title="Switch language"
        >
          {lang === 'en' ? 'EN' : 'LG'}
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          title={isDark ? 'Light mode' : 'Dark mode'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '20px', padding: '4px', opacity: 0.8
          }}
        >
          {isDark ? 'Sun' : 'Moon'}
        </button>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '14px', color: isDark ? '#ddd' : '#333', fontWeight: '500'
          }}>
            {(user && user.username) ? user.username : 'User'}
          </span>
          <span style={{
            fontSize: '10px', fontWeight: '600',
            background: roleStyle.bg, color: roleStyle.color,
            padding: '2px 8px', borderRadius: '10px',
            textTransform: 'uppercase'
          }}>
            {(user && user.role) ? user.role : 'Staff'}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Logout"
          style={{
            padding: '6px 16px',
            background: isDark ? '#333' : 'white',
            color: isDark ? '#ddd' : '#1a73e8',
            border: '1px solid ' + (isDark ? '#555' : '#dadce0'),
            borderRadius: '6px', cursor: 'pointer',
            fontSize: '13px', fontWeight: '600'
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}




