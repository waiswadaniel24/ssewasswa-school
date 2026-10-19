// Ssewasswa Comforts — API Docs
import React from 'react';

const ENDPOINTS = [
  { method: 'GET', path: '/api/business-directory', desc: 'List all active business ads (public)' },
  { method: 'GET', path: '/api/donor-marketplace', desc: 'List verified donors + active institution listings (public)' },
  { method: 'POST', path: '/api/donor-register', desc: 'Register as a new donor (free, public)' },
  { method: 'GET', path: '/api/news', desc: 'List recent news articles (public)' },
  { method: 'POST', path: '/api/news-subscribe', desc: 'Subscribe to news (free email tier)' },
  { method: 'POST', path: '/api/pesapal-initiate', desc: 'Initiate a Pesapal payment (returns redirect URL)' },
  { method: 'POST', path: '/api/pesapal-webhook', desc: 'Pesapal IPN webhook receiver (auto-issues license on payment)' },
  { method: 'POST', path: '/api/sms-payment', desc: 'Receives SMS-forwarded MoMo payments' },
  { method: 'POST', path: '/api/create-reference', desc: 'Generate unique payment reference code' },
  { method: 'POST', path: '/api/chat', desc: 'AI chatbot endpoint (rule-based responses)' },
];

const methodColor = { GET: '#1a73e8', POST: '#0b8043', PUT: '#f9ab00', DELETE: '#d32f2f' };

export default function APIDocs() {
  return (
    <div className="page-container">
      <h1 className="page-title">📚 API Documentation</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>REST API for developers. All endpoints accept JSON and return JSON. Base URL: <code style={{ background: '#f0f2f5', padding: '2px 6px', borderRadius: 4 }}>https://ssewasswa-school.vercel.app</code></p>
      <div style={{ marginBottom: 16, padding: 14, background: '#e8f0fe', borderRadius: 6, fontSize: 13, color: '#1a73e8' }}>
        <strong>Authentication:</strong> For protected endpoints, include <code style={{ background: 'white', padding: '2px 6px', borderRadius: 4 }}>Authorization: Bearer YOUR_API_KEY</code> header. Generate keys at <strong>API Keys</strong> page.
      </div>
      {ENDPOINTS.map(e => (
        <div key={e.method + e.path} style={{ display: 'flex', gap: 12, padding: 14, marginBottom: 8, borderRadius: 8, background: 'white', border: '1px solid #e0e0e0', alignItems: 'flex-start' }}>
          <span style={{ background: methodColor[e.method], color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 4, minWidth: 50, textAlign: 'center' }}>{e.method}</span>
          <div style={{ flex: 1 }}>
            <code style={{ fontSize: 13, fontFamily: 'monospace', color: '#1a73e8' }}>{e.path}</code>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{e.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}