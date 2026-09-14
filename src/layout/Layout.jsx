// FileName: src/layout/Layout.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import StatusBar from './StatusBar.jsx';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { logout } = useAuth();

  // ─── Dark mode (persisted in localStorage) ────────────────
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('darkMode') === 'true'; }
    catch (e) { return false; }
  });

  // ─── Sidebar search ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Session timeout warning (non-blocking) ───────────────
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const showTimeoutWarningRef = useRef(false);
  const warnTimerRef = useRef(null);
  const idleTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Apply dark mode to body and persist
  useEffect(() => {
    document.body.style.backgroundColor = isDark ? '#121212' : '#f0f2f5';
    document.body.style.color = isDark ? '#e0e0e0' : '#1e1e1e';
    localStorage.setItem('darkMode', String(isDark));
  }, [isDark]);

  // ─── Auto-logout after inactivity ─────────────────────────
  // FIXED: No alert() (blocking), 1-hour timeout, proper cleanup, stable refs
  const resetTimers = useCallback(() => {
    // Clear warning state if user is active
    if (showTimeoutWarningRef.current) {
      showTimeoutWarningRef.current = false;
      setShowTimeoutWarning(false);
    }

    // Clear existing timers
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Set warning timer (55 min)
    warnTimerRef.current = setTimeout(() => {
      showTimeoutWarningRef.current = true;
      setShowTimeoutWarning(true);
      let timeLeft = 300; // 5 minutes to respond

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(countdownIntervalRef.current);
          // Actually logout
          logout();
        }
      }, 1000);
    }, 55 * 60 * 1000); // 55 minutes

    // Set idle timer (60 min — backup in case warning is ignored)
    idleTimerRef.current = setTimeout(() => {
      logout();
    }, 60 * 60 * 1000); // 60 minutes
  }, [logout]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleActivity = () => resetTimers();

    // Use passive listeners for performance
    events.forEach(e => {
      window.addEventListener(e, handleActivity, { passive: true });
    });

    // Start initial timers
    resetTimers();

    // Cleanup on unmount to prevent listener pileup
    return () => {
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      events.forEach(e => {
        window.removeEventListener(e, handleActivity);
      });
    };
  }, [resetTimers]);

  // ─── Handle timeout warning actions ────────────────────────
  const handleStayLoggedIn = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  const handleLogoutNow = useCallback(() => {
    setShowTimeoutWarning(false);
    logout();
  }, [logout]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: isDark ? '#121212' : '#f0f2f5',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      overflow: 'hidden'
    }}>
      {/* ─── Top Header Bar ───────────────────────────── */}
      <Header
        isDark={isDark}
        toggleDarkMode={() => setIsDark(prev => !prev)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* ─── Middle: Sidebar + Content ────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        minHeight: 0  // Prevents flex overflow issues
      }}>
        {/* Left Sidebar */}
        <Sidebar searchQuery={searchQuery} isDark={isDark} />

        {/* Main Content — Outlet renders the active route */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          backgroundColor: isDark ? '#1e1e1e' : '#f4f6f9'
        }}>
          <Outlet />
        </main>
      </div>

      {/* ─── Bottom Status Bar ────────────────────────── */}
      <StatusBar />

      {/* ─── Session Timeout Warning Modal ────────────── */}
      {/* Non-blocking: shows a modal instead of alert() */}
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
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏰</div>
            <h2 style={{
              margin: '0 0 8px 0',
              color: '#333',
              fontSize: '20px',
              fontWeight: '700'
            }}>
              Session Expiring
            </h2>
            <p style={{
              color: '#666',
              fontSize: '14px',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              You will be automatically logged out in 5 minutes due to inactivity.
              Click &quot;Stay Logged In&quot; to continue your session.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleLogoutNow}
                style={{
                  padding: '10px 20px',
                  background: '#f1f3f4',
                  color: '#5f6368',
                  border: '1px solid #dadce0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Logout Now
              </button>
              <button
                onClick={handleStayLoggedIn}
                style={{
                  padding: '10px 24px',
                  background: '#1a73e8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(26, 115, 232, 0.3)'
                }}
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}