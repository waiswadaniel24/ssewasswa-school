// FileName: src/components/StatusBar.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Bottom status bar — power mode, network status, clock, support contact

import React, { useState, useEffect, useRef } from 'react';

export default function StatusBar() {
  const [tailscaleIp, setTailscaleIp] = useState(null);
  const [powerMode, setPowerMode] = useState('Plugged In');
  const [currentTime, setCurrentTime] = useState(new Date());

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Fetch system status (network + power) ─────────────
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Tailscale IP
        if (window.electronAPI && window.electronAPI.getTailscaleIp) {
          const ipResult = await window.electronAPI.getTailscaleIp();
          if (!mountedRef.current) return;
          if (ipResult && ipResult.success && ipResult.ip) {
            setTailscaleIp(ipResult.ip);
          }
        }

        // Power mode
        if (window.electronAPI && window.electronAPI.getPowerMode) {
          const pResult = await window.electronAPI.getPowerMode();
          if (!mountedRef.current) return;
          if (pResult && pResult.success && pResult.mode) {
            setPowerMode(pResult.mode);
          }
        }
      } catch (e) {
        if (!mountedRef.current) return;
        console.error('StatusBar: status fetch error:', e.message);
      }
    };

    fetchStatus();

    // Refresh every 60 seconds
    const statusInterval = setInterval(fetchStatus, 60000);

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  // ─── Live clock (updates every second) ─────────────────
  useEffect(() => {
    const clockInterval = setInterval(() => {
      if (mountedRef.current) {
        setCurrentTime(new Date());
      }
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  // ─── Format time for display ────────────────────────────
  const formattedTime = currentTime.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <footer style={{
      background: '#1a73e8',
      color: 'white',
      padding: '0 16px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '12px',
      flexShrink: 0,  // Prevent status bar from collapsing
      userSelect: 'none'  // Prevent text selection on status bar
    }}>
      {/* ─── Left: Power + Network ──────────────────── */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span title={powerMode === 'Battery' ? 'Running on battery — plug in to prevent data loss' : 'Connected to power'}>
          {powerMode === 'Battery' ? '🔋 Battery' : '🔌 Plugged In'}
        </span>
        <span title={tailscaleIp ? 'Tailscale VPN connected' : 'Standalone mode (single PC)'}>
          {tailscaleIp ? `🌐 ${tailscaleIp}` : '🌐 Standalone'}
        </span>
      </div>

      {/* ─── Center: Clock ───────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        fontFamily: "'Courier New', monospace",
        fontSize: '11px',
        opacity: 0.9
      }}>
        <span>{formattedDate}</span>
        <span style={{ opacity: 0.6 }}>|</span>
        <span style={{ fontWeight: '600' }}>{formattedTime}</span>
      </div>

      {/* ─── Right: Support ──────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        fontSize: '11px'
      }}>
        <span style={{ fontStyle: 'italic', opacity: 0.85 }}>
          &quot;Make your comfort look at the sky as the limit&quot;
        </span>
        <span style={{ opacity: 0.6 }}>|</span>
        <span>Support: +256 752 971 118</span>
      </div>
    </footer>
  );
}