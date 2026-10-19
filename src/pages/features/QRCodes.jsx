// Ssewasswa Comforts — QR Code Generator
import React, { useState } from 'react';

export default function QRCodes() {
  const [text, setText] = useState('https://ssewasswa-school.pages.dev');
  const [size, setSize] = useState(256);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;

  const download = () => {
    const a = document.createElement('a'); a.href = qrUrl; a.download = 'qr-code.png'; a.target = '_blank'; a.click();
  };

  return (
    <div className="page-container">
      <h1 className="page-title">🔳 QR Code Generator</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Generate QR codes for payments, forms, contact info, Wi-Fi, or any URL.</p>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Text or URL to encode</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
          <label style={{ display: 'block', marginTop: 16, marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Size: {size}px</label>
          <input type="range" min="128" max="512" step="32" value={size} onChange={e => setSize(Number(e.target.value))} style={{ width: '100%' }} />
          <button onClick={download} style={{ marginTop: 16, padding: '12px 24px', background: '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>⬇ Download PNG</button>
        </div>
        <div style={{ textAlign: 'center' }}>
          <img src={qrUrl} alt="QR Code" style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 8, background: 'white' }} />
          <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>Scan to open: {text.slice(0, 40)}{text.length > 40 ? '...' : ''}</div>
        </div>
      </div>
    </div>
  );
}