// FileName: src/pages/QuickLicense.jsx
// Mobile-friendly quick license generator — for developer to use on phone
// Access at /quick-license (developer-only)
// Generates license key + emails customer automatically

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function QuickLicense() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const [hwid, setHwid] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState('ORD');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showResult, setShowResult] = useState(false);

  if (authReady && !user) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!hwid.trim() || !email.trim()) {
      setError('HWID and Email are required');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const amount = tier === 'PREM' ? 300000 : 150000;
      const res = await fetch('/api/pesapal-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          merchant_reference: hwid.trim(),
          email: email.trim(),
          customer_name: name.trim() || 'Customer',
          amount: amount,
          order_tracking_id: 'QUICK-' + Date.now()
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.license_key) {
        setResult({
          key: data.license_key,
          tier: data.tier
        });
        setShowResult(true);
        // Clear form
        setHwid('');
        setEmail('');
        setName('');
      } else {
        setError(data.error || 'Could not generate license');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    try {
      navigator.clipboard.writeText(text);
      alert('License key copied to clipboard!');
    } catch (e) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('License key copied!');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #071b2f 0%, #0c273d 100%)',
      color: '#f7fbff',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '20px 16px',
      maxWidth: 500,
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24, paddingTop: 20 }}>
        <img src="/ssewasswa-comforts-school-erp-mark.png" alt="Ssewasswa" style={{ filter: 'brightness(1.18) saturate(1.35) contrast(1.05) drop-shadow(0 2px 6px rgba(0,0,0,0.18))', width: 50, height: 50, objectFit: 'contain', marginBottom: 8 }} />
        <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Quick License</h1>
        <p style={{ fontSize: 13, color: '#8fb3c9', margin: 0 }}>Generate + email license keys from your phone</p>
      </div>

      {/* Success card */}
      {showResult && result && (
        <div style={{
          background: '#e6f4ea',
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
          color: '#0d652d',
          border: '2px solid #c3e6cb'
        }}>
          <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 18, margin: '0 0 12px', textAlign: 'center' }}>License Generated + Emailed!</h2>
          <div style={{
            background: '#fff',
            padding: '14px',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: 15,
            color: '#1a73e8',
            wordBreak: 'break-all',
            textAlign: 'center',
            marginBottom: 12,
            border: '1px solid #dce7ed'
          }}>
            {result.key}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => copyToClipboard(result.key)}
              style={{
                flex: 1,
                padding: '14px',
                background: '#1a73e8',
                color: '#fff',
                border: '0',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              📋 Copy Key
            </button>
            <button
              onClick={() => setShowResult(false)}
              style={{
                flex: 1,
                padding: '14px',
                background: '#fff',
                color: '#587080',
                border: '1px solid #dadce0',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ➕ New License
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: '#fce8e6',
          color: '#c62828',
          padding: '12px 16px',
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 14,
          border: '1px solid #f5c6cb'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Form */}
      {!showResult && (
        <form onSubmit={handleGenerate}>
          {/* Tier selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#8fb3c9', marginBottom: 8, fontWeight: 600 }}>
              Subscription Tier
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setTier('ORD')}
                style={{
                  flex: 1,
                  padding: '16px 8px',
                  borderRadius: 10,
                  border: tier === 'ORD' ? '2px solid #1a73e8' : '2px solid #2c4a64',
                  background: tier === 'ORD' ? '#1a73e8' : 'transparent',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Ordinary<br /><span style={{ fontSize: 11, opacity: 0.8 }}>UGX 150k</span>
              </button>
              <button
                type="button"
                onClick={() => setTier('PREM')}
                style={{
                  flex: 1,
                  padding: '16px 8px',
                  borderRadius: 10,
                  border: tier === 'PREM' ? '2px solid #0b8043' : '2px solid #2c4a64',
                  background: tier === 'PREM' ? '#0b8043' : 'transparent',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Premium ⭐<br /><span style={{ fontSize: 11, opacity: 0.8 }}>UGX 300k</span>
              </button>
            </div>
          </div>

          {/* HWID */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#8fb3c9', marginBottom: 6, fontWeight: 600 }}>
              Customer HWID *
            </label>
            <input
              type="text"
              value={hwid}
              onChange={(e) => setHwid(e.target.value)}
              placeholder="e.g. WEB-Chrome1234..."
              required
              style={{
                width: '100%',
                padding: '16px',
                background: '#0c273d',
                border: '1px solid #2c4a64',
                borderRadius: 10,
                color: '#fff',
                fontSize: 15,
                boxSizing: 'border-box',
                fontFamily: 'monospace'
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#8fb3c9', marginBottom: 6, fontWeight: 600 }}>
              Customer Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              required
              style={{
                width: '100%',
                padding: '16px',
                background: '#0c273d',
                border: '1px solid #2c4a64',
                borderRadius: 10,
                color: '#fff',
                fontSize: 15,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#8fb3c9', marginBottom: 6, fontWeight: 600 }}>
              Customer Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Mukasa"
              style={{
                width: '100%',
                padding: '16px',
                background: '#0c273d',
                border: '1px solid #2c4a64',
                borderRadius: 10,
                color: '#fff',
                fontSize: 15,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Generate button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '18px',
              background: loading ? '#444' : '#61d3a5',
              color: '#062218',
              border: '0',
              borderRadius: 12,
              fontSize: 17,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(97,211,165,0.3)'
            }}
          >
            {loading ? '⏳ Generating...' : '🚀 Generate + Email License'}
          </button>
        </form>
      )}

      {/* Info */}
      <div style={{
        marginTop: 24,
        padding: 16,
        background: 'rgba(97,211,165,0.08)',
        borderRadius: 12,
        border: '1px solid #2a6b50',
        fontSize: 12,
        color: '#9ab4c5',
        lineHeight: 1.6
      }}>
        <strong style={{ color: '#61d3a5' }}>How it works:</strong><br />
        1. Customer pays via MoMo (0752 971 118 or 0789 736 737)<br />
        2. Customer sends WhatsApp with HWID + email<br />
        3. You enter HWID + email here → click Generate<br />
        4. License key auto-generated + emailed to customer<br />
        5. Customer downloads .exe + activates with key
      </div>
    </div>
  );
}
