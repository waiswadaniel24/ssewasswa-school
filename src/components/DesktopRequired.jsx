// FileName: src/components/DesktopRequired.jsx
// Shown when a user accesses an ERP page on the web (no Electron)
// Instead of a blank page, shows a clear message with download link

import React from 'react';

export default function DesktopRequired({ pageName }) {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '24px'
    }}>
      <div style={{
        maxWidth: 480,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>💻</div>
        <h2 style={{ fontSize: 24, color: '#1a73e8', marginBottom: 12 }}>
          Desktop App Required
        </h2>
        <p style={{ fontSize: 16, color: '#587080', lineHeight: 1.6, marginBottom: 24 }}>
          {pageName ? `"${pageName}"` : 'This feature'} requires the Ssewasswa School ERP desktop app
          to function. The web version is for marketing, registration, payments,
          and license management only.
        </p>
        <a
          href="https://github.com/waiswadaniel24/ssewasswa-school/releases/download/v10.0.0/Ssewasswa-School-ERP-V10-Setup.exe"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-block',
            background: '#1a73e8',
            color: '#fff',
            padding: '14px 32px',
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(26,115,232,0.3)'
          }}
        >
          ⬇️ Download Desktop App (130 MB)
        </a>
        <p style={{ fontSize: 13, color: '#999', marginTop: 16 }}>
          After downloading: install on Windows → open → activate with your license key
        </p>
      </div>
    </div>
  );
}
