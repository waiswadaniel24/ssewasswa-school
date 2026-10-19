// FileName: src/pages/Admin.jsx
// Admin page — manually trigger license generation when customer pays via MoMo.
// Usage: Visit /admin → enter HWID + email + tier + amount → click "Generate License"
// → calls /api/pesapal-webhook to generate + save + email the license key.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Admin() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const [form, setForm] = useState({
    hwid: '',
    email: '',
    customer_name: '',
    tier: 'ORD',
    amount: 150000,
    payment_reference: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [licenses, setLicenses] = useState([]);

  // Only allow access if user is developer
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (!user.isDeveloper) {
      navigate('/', { replace: true });
      return;
    }
  }, [authReady, user, navigate]);

  // Load existing licenses from Supabase (via fetch to /api/licenses if exists)
  // For now, we'll just show the form

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTierChange = (tier) => {
    setForm((prev) => ({
      ...prev,
      tier,
      amount: tier === 'PREM' ? 300000 : 150000
    }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.hwid || !form.email) {
      setError('HWID and Email are required.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/pesapal-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          merchant_reference: form.hwid,
          email: form.email,
          customer_name: form.customer_name || 'Customer',
          amount: Number(form.amount),
          order_tracking_id: form.payment_reference || 'MANUAL-' + Date.now()
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.license_key) {
        setResult({
          license_key: data.license_key,
          tier: data.tier
        });
        setForm({
          hwid: '', email: '', customer_name: '',
          tier: 'ORD', amount: 150000, payment_reference: ''
        });
      } else {
        setError(data.error || 'Failed to generate license');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || !user) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>
    );
  }

  if (!user.isDeveloper) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#d32f2f' }}>
        Access denied. Developer account required.
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#071b2f',
      color: '#f7fbff',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '40px 24px'
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <img src="/ssewasswa-comforts-school-erp-mark.png" alt="Ssewasswa" style={{ width: 46, height: 46, objectFit: 'contain' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>Admin: License Generator</h1>
            <p style={{ margin: 0, color: '#8fb3c9', fontSize: 13 }}>
              Generate license keys manually when customers pay via MoMo.
            </p>
          </div>
          <button onClick={() => navigate('/app/dev')} style={{
            marginLeft: 'auto', background: 'transparent', color: '#fff',
            border: '1px solid #45657b', borderRadius: 999,
            padding: '10px 18px', cursor: 'pointer'
          }}>
            Back to Dev Tools →
          </button>
        </div>

        {/* Result alert */}
        {result && (
          <div style={{
            background: '#e6f4ea', border: '1px solid #c3e6cb',
            borderRadius: 10, padding: 20, marginBottom: 24, color: '#0d652d'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>✅ License Generated + Emailed!</h3>
            <p style={{ margin: '0 0 12px' }}>
              <strong>Tier:</strong> {result.tier === 'PREM' ? 'Premium' : 'Ordinary'}
            </p>
            <p style={{ margin: '0 0 8px' }}><strong>License Key:</strong></p>
            <div style={{
              background: '#fff', padding: '12px 16px', borderRadius: 6,
              fontFamily: 'monospace', fontSize: 16, color: '#1a73e8',
              border: '1px solid #dce7ed', wordBreak: 'break-all'
            }}>
              {result.license_key}
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 13, color: '#587080' }}>
              License key has been saved to Supabase + emailed to the customer.
            </p>
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div style={{
            background: '#fce8e6', border: '1px solid #f5c6cb',
            borderRadius: 10, padding: 14, marginBottom: 24, color: '#c62828'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid #2c4a64',
          borderRadius: 14, padding: 28
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Generate New License</h2>

          {/* Tier selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#8fb3c9', marginBottom: 8 }}>
              Subscription Tier
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => handleTierChange('ORD')}
                style={{
                  flex: 1, padding: 14, cursor: 'pointer',
                  background: form.tier === 'ORD' ? '#1a73e8' : '#0c273d',
                  border: `1px solid ${form.tier === 'ORD' ? '#1a73e8' : '#2c4a64'}`,
                  borderRadius: 10, color: '#fff', fontWeight: 700
                }}
              >
                Ordinary (UGX 150,000/year)
              </button>
              <button
                type="button"
                onClick={() => handleTierChange('PREM')}
                style={{
                  flex: 1, padding: 14, cursor: 'pointer',
                  background: form.tier === 'PREM' ? '#0b8043' : '#0c273d',
                  border: `1px solid ${form.tier === 'PREM' ? '#0b8043' : '#2c4a64'}`,
                  borderRadius: 10, color: '#fff', fontWeight: 700
                }}
              >
                Premium ⭐ (UGX 300,000/year)
              </button>
            </div>
          </div>

          <form onSubmit={handleGenerate}>
            {/* HWID + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#8fb3c9', marginBottom: 6 }}>
                  Customer HWID *
                </label>
                <input
                  type="text"
                  name="hwid"
                  value={form.hwid}
                  onChange={handleChange}
                  required
                  placeholder="e.g. WEB-Chrome-1234 or from generate-key.js"
                  style={{
                    width: '100%', padding: 12,
                    background: '#0c273d', border: '1px solid #2c4a64',
                    borderRadius: 8, color: '#fff', fontSize: 14,
                    boxSizing: 'border-box', fontFamily: 'monospace'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#8fb3c9', marginBottom: 6 }}>
                  Customer Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="customer@example.com"
                  style={{
                    width: '100%', padding: 12,
                    background: '#0c273d', border: '1px solid #2c4a64',
                    borderRadius: 8, color: '#fff', fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Customer name + payment reference */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#8fb3c9', marginBottom: 6 }}>
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={form.customer_name}
                  onChange={handleChange}
                  placeholder="e.g. John Mukasa"
                  style={{
                    width: '100%', padding: 12,
                    background: '#0c273d', border: '1px solid #2c4a64',
                    borderRadius: 8, color: '#fff', fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#8fb3c9', marginBottom: 6 }}>
                  Payment Reference (optional)
                </label>
                <input
                  type="text"
                  name="payment_reference"
                  value={form.payment_reference}
                  onChange={handleChange}
                  placeholder="e.g. MTN-123456789 OR leave blank"
                  style={{
                    width: '100%', padding: 12,
                    background: '#0c273d', border: '1px solid #2c4a64',
                    borderRadius: 8, color: '#fff', fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Amount display */}
            <div style={{ marginBottom: 20, padding: 14, background: '#0c273d', borderRadius: 10 }}>
              <strong style={{ color: '#61d3a5' }}>Amount to charge:</strong>
              <span style={{ marginLeft: 12, fontFamily: 'monospace', fontSize: 18 }}>
                UGX {Number(form.amount).toLocaleString()}
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: 16,
                background: loading ? '#444' : '#61d3a5',
                color: '#062218', border: 0,
                borderRadius: 10, fontWeight: 800, fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? '⏳ Generating + Emailing…' : '🚀 Generate License + Email Customer'}
            </button>
          </form>
        </div>

        {/* Help section */}
        <div style={{
          marginTop: 32, padding: 20,
          background: 'rgba(97,211,165,0.08)',
          border: '1px solid #2a6b50',
          borderRadius: 14, fontSize: 13,
          color: '#b5c9d7', lineHeight: 1.7
        }}>
          <h3 style={{ margin: '0 0 12px', color: '#61d3a5', fontSize: 15 }}>
            📖 How this works
          </h3>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li>Customer pays you UGX 150k/300k via MTN MoMo (0752 971 118) OR Airtel (0789 736 737).</li>
            <li>Customer sends WhatsApp message with their payment screenshot + HWID.</li>
            <li>You log into this admin page (/admin).</li>
            <li>Enter the customer's HWID + email + name (from WhatsApp message).</li>
            <li>Pick the tier (Ordinary UGX 150k OR Premium UGX 300k) based on what they paid.</li>
            <li>Click "Generate License + Email Customer".</li>
            <li>The system generates a license key, saves it to Supabase, AND emails it to the customer automatically.</li>
            <li>Customer receives the license key + activation instructions in their email.</li>
            <li>Customer downloads the desktop app + activates with the license key.</li>
          </ol>
          <p style={{ margin: '16px 0 0', color: '#8fb3c9' }}>
            <strong>Note:</strong> The HWID comes from the customer's device — they need to either:
          </p>
          <ul style={{ margin: '8px 0 0 20px', color: '#8fb3c9' }}>
            <li>Visit the website, click "Subscribe", and copy the HWID shown on the form</li>
            <li>OR open the desktop app and check the Activation page (shows their HWID)</li>
            <li>OR run <code style={{ background: '#0c273d', padding: '2px 6px', borderRadius: 4 }}>node generate-key.js &lt;hwid&gt; &lt;PREM|ORD&gt; &lt;email&gt;</code> on their PC (which generates + emails the license directly from their device)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
