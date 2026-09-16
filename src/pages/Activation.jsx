import React, { useState, useEffect } from 'react';
export default function Activation() {
  var [licenseKey, setLicenseKey] = useState('');
  var [hwid, setHwid] = useState('Loading...');
  var [msg, setMsg] = useState('');
  var [loading, setLoading] = useState(false);
  useEffect(function() {
    if (window.electronAPI && window.electronAPI.getHwid) {
      window.electronAPI.getHwid().then(function(res) {
        if (res && res.success) setHwid(res.hwid.substring(0, 32) + '...');
      });
    }
  }, []);
  var handleActivate = async function(e) {
    e.preventDefault();
    setMsg('Validating...'); setLoading(true);
    var res = await window.electronAPI.activateLicense({ licenseKey });
    setLoading(false);
    if (res && res.success) {
      var valRes = await window.electronAPI.validateLicenseKey({ licenseKey });
      if (valRes && valRes.valid) {
        setMsg('✅ Activation Successful! Restarting...');
        setTimeout(function() { window.location.reload(); }, 2000);
      } else {
        setMsg('❌ ' + (valRes && valRes.error ? valRes.error : 'Invalid key'));
      }
    } else {
      setMsg('❌ ' + ((res && res.error) || 'Invalid key'));
    }
  };
  var supportEmail = 'support@ssewasswacomfortstechnologies.com';
  var supportPhone = '+256752971118';
  var whatsappUrl = 'https://wa.me/256752971118';
  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
      <div style={{ background: 'white', width: '100%', maxWidth: '800px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#1a73e8', padding: '30px', textAlign: 'center', color: 'white' }}>
          <img src="/ssewasswa-comforts-technologies-logo.png" alt="Ssewasswa Comforts Technologies logo" style={{ width: '82px', height: '82px', objectFit: 'contain', background: 'white', borderRadius: '16px', padding: '6px', marginBottom: '10px' }} />
          <h1 style={{ margin: 0, fontSize: '24px' }}>Unlock Ssewasswa ERP</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.9 }}>Choose your subscription plan</p>
        </div>
        <div className="activation-plans" style={{ padding: '30px', display: 'flex', gap: '20px' }}>
          {/* Ordinary Plan */}
          <div style={{ flex: 1, border: '2px solid #e0e0e0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Ordinary Access</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>UGX 150k<span style={{ fontSize: '14px', fontWeight: 'normal' }}>/yr</span></p>
            <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
              <li>Student & Staff Management</li>
              <li>Fees & Basic Finance</li>
              <li>Exams & Report Cards</li>
              <li>Basic Settings</li>
            </ul>
          </div>
          {/* Premium Plan */}
          <div style={{ flex: 1, border: '2px solid #1a73e8', borderRadius: '12px', padding: '20px', background: '#e8f0fe' }}>
            <h3 style={{ marginTop: 0, color: '#1a73e8' }}>Premium Access ⭐</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a73e8' }}>UGX 300k<span style={{ fontSize: '14px', fontWeight: 'normal' }}>/yr</span></p>
            <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#444', lineHeight: '1.6' }}>
              <li>All Ordinary Features</li>
              <li>EMIS Compliance & Reports</li>
              <li>UNEB API Integration</li>
              <li>Multi-School Management</li>
              <li>Automated Document Engine</li>
            </ul>
          </div>
        </div>
        <div style={{ padding: '0 30px 30px' }}>
          <div style={{ padding: '14px', marginBottom: '18px', borderRadius: '10px', background: '#eef6ff', border: '1px solid #c7ddff', color: '#174a7c' }}>
            <strong>Need help restoring access?</strong>
            <p style={{ margin: '6px 0 10px', fontSize: '13px' }}>If you were logged out because a subscription expired, contact us to renew access or choose a plan.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <a href={`mailto:${supportEmail}?subject=Help restoring school system access`} style={{ color: '#1769aa', fontWeight: 600 }}>Email support</a>
              <a href={`tel:${supportPhone}`} style={{ color: '#1769aa', fontWeight: 600 }}>Call support</a>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" style={{ color: '#1769aa', fontWeight: 600 }}>WhatsApp support</a>
            </div>
          </div>
          {msg && <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '15px', background: msg.includes('❌') ? '#ffebee' : '#e8f5e9', color: msg.includes('❌') ? '#c62828' : '#2e7d32', fontSize: '14px' }}>{msg}</div>}
          <form onSubmit={handleActivate}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' }}>Enter Activation Key</label>
            <input style={{ width: '100%', padding: '14px', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} type="text" value={licenseKey} onChange={function(e) { setLicenseKey(e.target.value.toUpperCase()); }} placeholder="SSEWASSWA-PREM-XXXX-XXXX-XXXXXXXX" required disabled={loading} />
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#9aa0a6' : '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '15px' }}>
              {loading ? 'Validating...' : 'Activate Software'}
            </button>
          </form>
          <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>🔒 MACHINE HARDWARE ID (HWID)</p>
            <p style={{ margin: 0, fontSize: '13px', fontFamily: 'monospace', color: '#333', wordBreak: 'break-all' }}>{hwid}</p>
            <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#d32f2f' }}>Provide this ID when paying to get your activation key.</p>
          </div>
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#555', marginTop: '20px' }}>Pay via MTN MoMo/Airtel/Bank to: +256 752 971 118</p>
        </div>
      </div>
    </div>
  );
}
