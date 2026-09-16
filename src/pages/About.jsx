// FileName: src/pages/About.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: About page — system info, school info, version, support contacts

import React, { useState, useEffect, useRef } from 'react';

export default function About() {
  var [info, setInfo] = useState({
    school: 'Loading...',
    emis: '-',
    version: '10.0.0',
    build: 'EMIS Complete',
    dbSize: '-'
  });
  var [loading, setLoading] = useState(true);

  var mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  useEffect(function () {
    var cancelled = false;

    const loadInfo = async function () {
      if (!window.electronAPI || !window.electronAPI.queryDatabase) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      try {
        // FIXED: Single batched query instead of two separate queries
        var r = await window.electronAPI.queryDatabase(
          "SELECT key, value FROM system_settings WHERE key IN ('school_name', 'emis_number')"
        );

        if (!cancelled && mountedRef.current) {
          var schoolName = 'School';
          var emisNum = '-';

          if (r && r.success && Array.isArray(r.data)) {
            r.data.forEach(function (row) {
              if (!row || !row.key) return;
              if (row.key === 'school_name') {
                schoolName = row.value || 'School';
              }
              if (row.key === 'emis_number') {
                emisNum = row.value || '-';
              }
            });
          }

          setInfo(function (prev) {
            return { ...prev, school: schoolName, emis: emisNum };
          });
        }

        // Get database size
        if (!cancelled && window.electronAPI.backupDatabase) {
          try {
            var dbRes = await window.electronAPI.backupDatabase();
            if (!cancelled && mountedRef.current && dbRes && dbRes.success && dbRes.path) {
              // Can't easily get file size from renderer, skip for now
              setInfo(function (prev) { return { ...prev, dbSize: 'Encrypted' }; });
            }
          } catch (e) { /* ignore */ }
        }

      } catch (e) {
        if (!cancelled) return;
        console.error('About: load error:', (e && e.message) ? e.message : 'Unknown');
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    };

    loadInfo();
    return function () { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">ℹ️ About</h1>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{
              width: '40px', height: '40px',
              border: '4px solid #e0e0e0',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#666' }}>Loading system info...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">ℹ️ About</h1>

      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
          {/* ─── Logo ───────────────────────────────────────── */}
          <svg width="80" height="90" viewBox="0 0 120 140" fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginBottom: '15px', filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.15))' }}>
            <path d="M60 10 L100 30 V75 C100 105 60 130 60 130 C60 130 20 105 20 75 V30 L60 10Z"
              fill="#ffffff" stroke="#1a73e8" strokeWidth="3" />
            <path d="M60 20 L90 36 V73 C90 97 60 118 60 118 C60 118 30 97 30 73 V36 L60 20Z"
              fill="#1a73e8" opacity="0.9" />
            <circle cx="60" cy="58" r="14" fill="#FFC107" stroke="#FFA000" strokeWidth="1.5" />
            <path d="M46 66 L46 88 C46 88 52 85 60 88 C68 85 74 88 74 88 L74 66"
              fill="white" stroke="#0d47a1" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>

          <h2 style={{ color: '#1a73e8', marginBottom: '10px', fontSize: '22px' }}>
            Ssewasswa School ERP V10
          </h2>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            Uganda EMIS Compliant Edition
          </p>

          {/* ─── Info Grid ────────────────────────────────────── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '10px', maxWidth: '400px', margin: '0 auto', textAlign: 'left'
          }}>
            <p style={{ color: '#5f6368', fontSize: '13px', fontWeight: '600' }}>
              School:
            </p>
            <p style={{ color: '#202124', fontSize: '14px' }}>{info.school}</p>

            <p style={{ color: '#5f6368', fontSize: '13px', fontWeight: '600' }}>
              EMIS No:
            </p>
            <p style={{ color: '#202124', fontSize: '14px' }}>{info.emis}</p>

            <p style={{ color: '#5f6368', fontSize: '13px', fontWeight: '600' }}>
              Version:
            </p>
            <p style={{ color: '#202124', fontSize: '14px' }}>{info.version}</p>

            <p style={{ color: '#5f6368', fontSize: '13px', fontWeight: '600' }}>
              Build:
            </p>
            <p style={{ color: '#202124', fontSize: '14px' }}>{info.build}</p>

            <p style={{ color: '#5f6368', fontSize: '13px', fontWeight: '600' }}>
              Database:
            </p>
            <p style={{ color: '#202124', fontSize: '14px' }}>{info.dbSize}</p>
          </div>

          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e0e0e0' }} />

          {/* ─── Support Contact ─────────────────────────────── */}
          <p style={{ fontSize: '13px', color: '#999' }}>
            &copy; 2024 Ssewasswa Comfort&apos;s Technologies
          </p>
          <p style={{ fontSize: '12px', color: '#aaa' }}>
            📧 ssewasswacomfortzone@gmail.com<br />
            📱 +256 752 971 118 | +256 789 736 737
          </p>
        </div>
      </div>

      {/* ─── Quick Links ──────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">🔗 Quick Links</div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            <a href="/manuals" style={{
              display: 'block', padding: '10px 14px', borderRadius: '6px',
              background: '#e8f0fe', color: '#1a73e8',
              textDecoration: 'none', fontSize: '13px', fontWeight: '600'
            }}>
              📖 System Manuals
            </a>
            <a href="/terms" style={{
              display: 'block', padding: '10px 14px', borderRadius: '6px',
              background: '#e8f0fe', color: '#1a73e8',
              textDecoration: 'none', fontSize: '13px', fontWeight: '600'
            }}>
              📜 Terms &amp; Conditions
            </a>
            <a href="/copyright" style={{
              display: 'block', padding: '10px 14px', borderRadius: '6px',
              background: '#e8f0fe', color: '#1a73e8',
              textDecoration: 'none', fontSize: '13px', fontWeight: '600'
            }}>
              ©️ Copyright &amp; Licensing
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
