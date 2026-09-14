// FileName: src/pages/Activation.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: License activation page — HWID display, license key entry, trial info

import React, { useState, useEffect, useRef } from 'react';

export default function Activation() {
  const [licenseKey, setLicenseKey] = useState('');
  const [hwid, setHwid] = useState('Loading...');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info'); // 'info' | 'success' | 'error' | 'warning'
  const [loading, setLoading] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Fetch HWID + license status on mount ─────────────────
  useEffect(() => {
    const init = async () => {
      try {
        // Get hardware ID
        if (window.electronAPI && window.electronAPI.getHwid) {
          const hwidRes = await window.electronAPI.getHwid();
          if (!mountedRef.current) return;
          if (hwidRes && hwidRes.success && hwidRes.hwid) {
            setHwid(hwidRes.hwid.substring(0, 32) + '...');
          } else {
            setHwid('Unable to generate HWID');
          }
        }

        // Check license status
        if (window.electronAPI && window.electronAPI.checkLicense) {
          const licRes = await window.electronAPI.checkLicense();
          if (!mountedRef.current) return;

          if (licRes.success) {
            // Already licensed — shouldn't be on this page
            setMsg('Your software is already activated.');
            setMsgType('success');
          } else if (licRes.isTrial) {
            setTrialDaysLeft(licRes.daysLeft);
            if (licRes.daysLeft <= 2) {
              setMsg('⏳ Your free trial ends in ' + licRes.daysLeft + ' day(s). Activate now to avoid lockout.');
              setMsgType('warning');
            } else {
              setMsg('You are on a free trial. ' + licRes.daysLeft + ' days remaining.');
              setMsgType('info');
            }
          } else {
            setMsg('Your free trial has ended. Please enter your license key to continue.');
            setMsgType('error');
          }
        }
      } catch (e) {
        if (!mountedRef.current) return;
        console.error('Activation init error:', e.message);
      }
    };

    init();
  }, []);

  // ─── Handle license activation ─────────────────────────────
  const handleActivate = async (e) => {
    e.preventDefault();

    // Validate format: SSEWASSWA-XXXX-XXXX-XXXX-...
    const key = licenseKey.trim().toUpperCase();
    if (key.length < 10) {
      setMsg('License key is too short. Please check and try again.');
      setMsgType('error');
      return;
    }
    if (!key.startsWith('SSEWASSWA-')) {
      setMsg('Invalid license key format. Key must start with SSEWASSWA-.');
      setMsgType('error');
      return;
    }

    setMsg('Validating license key...');
    setMsgType('info');
    setLoading(true);

    try {
      const res = await window.electronAPI.activateLicense({ licenseKey: key });

      if (!mountedRef.current) return;
      setLoading(false);

      if (res && res.success) {
        // Try full validation
        const validRes = await window.electronAPI.validateLicenseKey({ licenseKey: key });
        if (!mountedRef.current) return;

        if (validRes && validRes.valid) {
          setMsg('✅ Activation successful! Restarting system...');
          setMsgType('success');
          setTimeout(() => {
            if (mountedRef.current) window.location.reload();
          }, 2000);
        } else if (validRes && !validRes.valid) {
          setMsg('⚠️ License saved but validation failed: ' + (validRes.error || 'Unknown error') + '. Please contact support.');
          setMsgType('warning');
        } else {
          // validateLicenseKey might not be available — activation was saved
          setMsg('✅ Activation successful! Restarting system...');
          setMsgType('success');
          setTimeout(() => {
            if (mountedRef.current) window.location.reload();
          }, 2000);
        }
      } else {
        setMsg('🚫 ' + ((res && res.error) || 'Invalid license key for this computer.'));
        setMsgType('error');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setLoading(false);
      setMsg('Error: ' + err.message);
      setMsgType('error');
    }
  };

  // ─── Copy HWID to clipboard ────────────────────────────────
  const handleCopyHwid = () => {
    // Get full HWID (not truncated)
    if (window.electronAPI && window.electronAPI.getHwid) {
      window.electronAPI.getHwid().then(res => {
        if (res && res.success && res.hwid) {
          navigator.clipboard.writeText(res.hwid).then(() => {
            setMsg('HWID copied to clipboard!');
            setMsgType('info');
            setTimeout(() => {
              if (mountedRef.current && msgType === 'info') {
                setMsg(trialDaysLeft !== null ? 'You are on a free trial. ' + trialDaysLeft + ' days remaining.' : '');
              }
            }, 2000);
          }).catch(() => {
            // Clipboard might not be available
          });
        }
      });
    }
  };

  // ─── Message styles based on type ──────────────────────────
  const msgStyles = {
    info: { bg: '#e8f0fe', color: '#1a73e8', border: '#aecbfa', icon: 'ℹ️' },
    success: { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7', icon: '✅' },
    error: { bg: '#ffebee', color: '#c62828', border: '#ef9a9a', icon: '🚫' },
    warning: { bg: '#fff3e0', color: '#e65100', border: '#ffcc80', icon: '⚠️' }
  };
  const ms = msgStyles[msgType] || msgStyles.info;

  // ─── Shared styles ────────────────────────────────────────
  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#444',
    marginBottom: '6px'
  };
  const inputStyle = {
    width: '100%',
    padding: '14px',
    border: '1px solid #dadce0',
    borderRadius: '8px',
    fontSize: '16px',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'monospace',
    letterSpacing: '1px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        width: '100%',
        maxWidth: '500px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>

        {/* ─── Header with Logo ─────────────────────────────── */}
        <div style={{
          background: '#1a73e8',
          padding: '30px',
          textAlign: 'center',
          color: 'white'
        }}>
          <svg width="70" height="80" viewBox="0 0 120 140" fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginBottom: '10px', filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.2))' }}>
            <path d="M60 10 L100 30 V75 C100 105 60 130 60 130 C60 130 20 105 20 75 V30 L60 10Z"
              fill="#ffffff" stroke="#ffffff" strokeWidth="3" />
            <path d="M60 20 L90 36 V73 C90 97 60 118 60 118 C60 118 30 97 30 73 V36 L60 20Z"
              fill="#1a73e8" opacity="0.9" />
            <circle cx="60" cy="58" r="14" fill="#FFC107" stroke="#FFA000" strokeWidth="1.5" />
            <path d="M46 66 L46 88 C46 88 52 85 60 88 C68 85 74 88 74 88 L74 66"
              fill="white" stroke="#0d47a1" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '1px' }}>SSEWASSWA ERP</div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>System Activation Required</div>
        </div>

        {/* ─── Body ────────────────────────────────────────── */}
        <div style={{ padding: '30px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '20px' }}>🔒 Software Authorization</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
            {trialDaysLeft !== null
              ? "You are using a free trial. Enter your license key below to unlock the full version."
              : "Your free trial period has ended. Please enter your license key to continue."
            }
          </p>

          {/* ─── Message Display ─────────────────────────────── */}
          {msg && (
            <div style={{
              background: ms.bg,
              color: ms.color,
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              border: '1px solid ' + ms.border,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>{ms.icon}</span>
              {msg}
            </div>
          )}

          {/* ─── License Key Form ────────────────────────────── */}
          <form onSubmit={handleActivate}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>License Key</label>
              <input
                style={inputStyle}
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                placeholder="SSEWASSWA-XXXX-XXXX-XXXX-XXXXXXXX"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || licenseKey.trim().length < 5}
              style={{
                width: '100%',
                padding: '14px',
                background: (loading || licenseKey.trim().length < 5) ? '#9aa0a6' : '#1a73e8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (loading || licenseKey.trim().length < 5) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px rgba(26, 115, 232, 0.3)',
                transition: 'background 0.2s'
              }}
            >
              {loading ? '⏳ Validating...' : '🔑 Activate Software'}
            </button>
          </form>

          {/* ─── HWID Section ────────────────────────────────── */}
          <div style={{
            marginTop: '30px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #eee'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '5px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#555'
              }}>
                🔒 MACHINE HARDWARE ID (HWID)
              </p>
              <button
                onClick={handleCopyHwid}
                style={{
                  background: 'none',
                  border: '1px solid #dadce0',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  color: '#1a73e8',
                  cursor: 'pointer'
                }}
              >
                📋 Copy
              </button>
            </div>
            <p style={{
              margin: 0,
              fontSize: '13px',
              fontFamily: 'monospace',
              color: '#333',
              wordBreak: 'break-all'
            }}>
              {hwid}
            </p>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '11px',
              color: '#d32f2f'
            }}>
              Provide this ID when purchasing a license. The software is permanently locked to this specific computer.
            </p>
          </div>

          {/* ─── Contact Info ───────────────────────────────── */}
          <div style={{
            marginTop: '25px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#555',
            borderTop: '1px solid #eee',
            paddingTop: '15px'
          }}>
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Need a License Key?</p>
            <p style={{ margin: 0 }}>📧 ssewasswacomfortzone@gmail.com</p>
            <p style={{ margin: 0 }}>📱 Call/WhatsApp: +256 752 971 118</p>
          </div>
        </div>
      </div>
    </div>
  );
}