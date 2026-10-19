// FileName: src/layout/HMISLayout.jsx
// Ssewasswa Comforts HMIS — Layout for /hmis/* routes
// Uses HMISSidebar (HMIS-specific menu items) instead of School ERP Sidebar.
// Shares the same Header + StatusBar + UpdateNotifier as School ERP Layout
// to keep code DRY.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './Header.jsx';
import HMISSidebar from './HMISSidebar.jsx';
import StatusBar from './StatusBar.jsx';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import UpdateNotifier from '../components/UpdateNotifier.jsx';

export default function HMISLayout() {
  const { logout } = useAuth();

  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('darkMode') === 'true'; }
    catch (e) { return false; }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const showTimeoutWarningRef = useRef(false);
  const warnTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    document.body.style.backgroundColor = isDark ? '#121212' : '#f0f2f5';
    document.body.style.color = isDark ? '#e0e0e0' : '#1e1e1e';
    localStorage.setItem('darkMode', String(isDark));
  }, [isDark]);

  const resetTimers = useCallback(() => {
    if (showTimeoutWarningRef.current) {
      showTimeoutWarningRef.current = false;
      setShowTimeoutWarning(false);
    }
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    warnTimerRef.current = setTimeout(() => {
      showTimeoutWarningRef.current = true;
      setShowTimeoutWarning(true);
      let timeLeft = 300;
      countdownIntervalRef.current = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(countdownIntervalRef.current);
          logout();
        }
      }, 1000);
    }, 55 * 60 * 1000);
    idleTimerRef.current = setTimeout(() => { logout(); }, 60 * 60 * 1000);
  }, [logout]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleActivity = () => resetTimers();
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimers();
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [resetTimers]);

  return (
    <div className="app-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: isDark ? '#121212' : '#f4f6f9',
      color: isDark ? '#e0e0e0' : '#1e1e1e',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* ─── Top Header ────────────────────────────────── */}
      <Header isDark={isDark} setIsDark={setIsDark} />

      {/* ─── Middle: HMIS Sidebar + Content ──────────── */}
      <div className="app-body" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Left Sidebar — HMIS-specific (was School ERP Sidebar before — that's why HMIS looked like School ERP) */}
        <HMISSidebar isDark={isDark} />

        {/* Main Content — Outlet renders the active HMIS route */}
        <main className="app-main" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          backgroundColor: isDark ? '#1e1e1e' : '#f4f6f9'
        }}>
          <Outlet />
          <UpdateNotifier />
        </main>
      </div>

      {/* ─── Bottom Status Bar ────────────────────────── */}
      <StatusBar />

      {/* ─── Session Timeout Warning Modal ────────────── */}
      {showTimeoutWarning && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '420px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</div>
            <h3 style={{ marginTop: 0, color: '#d32f2f' }}>Session Timeout Warning</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              You will be automatically logged out in 5 minutes due to inactivity.
              Click below to stay signed in.
            </p>
            <button
              onClick={() => {
                showTimeoutWarningRef.current = false;
                setShowTimeoutWarning(false);
                resetTimers();
              }}
              style={{
                padding: '12px 24px',
                background: '#1a73e8',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Stay Signed In
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
