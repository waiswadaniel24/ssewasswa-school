// FileName: src/pages/Settings.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: System settings — school profile, payments, location, leadership, backup

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SchoolBranding from '../components/SchoolBranding.jsx';

export default function Settings() {
  const [tab, setTab] = useState('school');
  const [profile, setProfile] = useState({ /* no-op */ });
  const [paySettings, setPaySettings] = useState({ mtn_api_key: '', airtel_client_id: '', pesapal_key: '', pesapal_secret: '', at_username: '', at_api_key: '', wa_access_token: '', wa_phone_number_id: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPayments, setSavingPayments] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Show timed message ────────────────────────────────────
  var showMessage = function (text) {
    if (!mountedRef.current) return;
    setMsg(text);
    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 5000);
  };

  // ─── Load profile and payment settings on mount ───────────
  const loadData = useCallback(async function () {
    if (!window.electronAPI) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    try {
      // Load school profile
      if (window.electronAPI.emisGetSchoolProfile) {
        try {
          var r = await window.electronAPI.emisGetSchoolProfile();
          if (!mountedRef.current) return;
          if (r && r.success && r.data) {
            setProfile(r.data);
          }
        } catch (e) { /* ignore */ }
      }

      // Load payment settings
      if (window.electronAPI.getPaymentSettings) {
        try {
          var pr = await window.electronAPI.getPaymentSettings();
          if (!mountedRef.current) return;
          if (pr && pr.success && pr.data) {
            setPaySettings(pr.data);
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      if (!mountedRef.current) return;
      console.error('Settings: load error:', (e && e.message) ? e.message : 'Unknown');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(function () {
    loadData();
  }, [loadData]);

  // ─── Update profile field ────────────────────────────────
  var up = function (k, v) {
    setProfile(function (prev) {
      var next = { ...prev };
      next[k] = v;
      return next;
    });
  };

  // ─── Save school profile ──────────────────────────────────
  const handleSaveProfile = async function () {
    setSavingProfile(true);
    showMessage('⏳ Saving profile...');

    try {
      var r = await window.electronAPI.emisSaveSchoolProfile(profile);
      if (!mountedRef.current) return;

      if (r && r.success) {
        showMessage('✅ School profile saved!');
      } else {
        var errMsg = (r && r.error) ? r.error : 'Save failed';
        showMessage('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      var errCatch = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Error: ' + errCatch);
    } finally {
      if (mountedRef.current) setSavingProfile(false);
    }
  };

  // ─── Save payment settings ───────────────────────────────
  const handleSavePayments = async function () {
    setSavingPayments(true);
    showMessage('⏳ Saving payment APIs...');

    try {
      var r = await window.electronAPI.savePaymentSettings(paySettings);
      if (!mountedRef.current) return;

      if (r && r.success) {
        showMessage('✅ Payment settings saved!');
      } else {
        var errMsg = (r && r.error) ? r.error : 'Save failed';
        showMessage('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      var errCatch = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Error: ' + errCatch);
    } finally {
      if (mountedRef.current) setSavingPayments(false);
    }
  };

  // ─── Backup to Gmail ──────────────────────────────────────
  const handleBackupGmail = async function () {
    var email = prompt('Enter your Gmail address for backup:');
    if (!email || !email.trim()) return;

    var password = prompt('Enter Gmail App Password (see note below):');
    if (!password || !password.trim()) return;

    setBackingUp(true);
    showMessage('⏳ Sending backup to ' + email + '...');

    try {
      var r = await window.electronAPI.backupToGmail({ email: email.trim(), password: password.trim() });
      if (!mountedRef.current) return;

      if (r && r.success) {
        showMessage('✅ Backup sent to ' + email + '!');
      } else {
        var errMsg = (r && r.error) ? r.error : 'Backup failed';
        showMessage('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      var errCatch = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Backup error: ' + errCatch);
    } finally {
      if (mountedRef.current) setBackingUp(false);
    }
  };

  // ─── Field component ──────────────────────────────────────
  var Field = function (_props) {
    var k = _props.k;
    var label = _props.label;
    var type = _props.type || 'text';
    var opts = _props.opts;

    var value = (profile && profile[k] !== undefined && profile[k] !== null) ? profile[k] : '';

    return (
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label className="form-label">{label}</label>
        {type === 'select' ? (
          <select className="form-input" value={value}
            onChange={function (e) { up(k, e.target.value); }}>
            {opts.map(function (o) { return <option key={o} value={o}>{o}</option>; })}
          </select>
        ) : (
          <input type={type} className="form-input" value={value}
            onChange={function (e) { up(k, e.target.value); }} />
        )}
      </div>
    );
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">⚙️ System Settings</h1>
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
            <p style={{ color: '#666' }}>Loading settings...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">⚙️ System Settings</h1>

      <SchoolBranding />

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: (msg.indexOf('❌') >= 0) ? '#c62828' :
            (msg.indexOf('⚠️') >= 0) ? '#e65100' :
              (msg.indexOf('⏳') >= 0) ? '#1a73e8' : '#0d904f',
          marginBottom: '15px', padding: '10px 14px',
          background: (msg.indexOf('❌') >= 0) ? '#ffebee' :
            (msg.indexOf('⚠️') >= 0) ? '#fff3e0' :
              (msg.indexOf('⏳') >= 0) ? '#e8f0fe' : '#e8f5e9',
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Tabs ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #dadce0', paddingBottom: '5px', flexWrap: 'wrap' }}>
        {['school', 'payments', 'apis', 'location', 'leadership'].map(function (t) {
          return (
            <button
              key={t}
              onClick={function () { setTab(t); }}
              style={{
                padding: '8px 16px', border: 'none',
                background: tab === t ? '#1a73e8' : 'transparent',
                color: tab === t ? 'white' : '#5f6368',
                cursor: 'pointer', borderRadius: '4px',
                fontWeight: 600, textTransform: 'capitalize'
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: SCHOOL                                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'school' && (
        <div className="card">
          <div className="card-header">🏫 Basic Information</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <Field k="school_name" label="School Name" />
              <Field k="emis_number" label="EMIS Number" />
              <Field k="school_type" label="School Type" type="select" opts={['Government', 'Private', 'PPP']} />
              <Field k="phone" label="Phone" />
              <Field k="email" label="Email" type="email" />
              <Field k="postal_address" label="Postal Address" />
            </div>
            <button onClick={handleSaveProfile} className="btn btn-primary" style={{ marginTop: '15px' }} disabled={savingProfile}>
              {savingProfile ? '⏳ Saving...' : '💾 Save Profile'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: PAYMENTS                                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: API CONFIGURATION */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'apis' && (
        <div className="card">
          <div className="card-header">🔌 Unified API Configuration (Per School)</div>
          <div className="card-body">
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Enter the API credentials for the services this school will use. These keys are stored securely in the local database.</p>
            <h4 style={{ color: 'white', background: '#1a73e8', padding: '8px 12px', borderRadius: '6px' }}>💳 Payment Gateways</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div className="form-group"><label className="form-label">PesaPal Consumer Key</label><input className="form-input" value={paySettings.pesapal_key || ''} onChange={function (e) { setPaySettings(function (p) { return { ...p, pesapal_key: e.target.value }; }); }} /></div>
              <div className="form-group"><label className="form-label">PesaPal Consumer Secret</label><input type="password" className="form-input" value={paySettings.pesapal_secret || ''} onChange={function (e) { setPaySettings(function (p) { return { ...p, pesapal_secret: e.target.value }; }); }} /></div>
            </div>
            <h4 style={{ color: 'white', background: '#0d904f', padding: '8px 12px', borderRadius: '6px', marginTop: '30px' }}>📱 SMS Gateway (Africa&apos;s Talking)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div className="form-group"><label className="form-label">AT Username</label><input className="form-input" placeholder="e.g., ssewasswa" value={paySettings.at_username || ''} onChange={function (e) { setPaySettings(function (p) { return { ...p, at_username: e.target.value }; }); }} /></div>
              <div className="form-group"><label className="form-label">AT API Key</label><input type="password" className="form-input" value={paySettings.at_api_key || ''} onChange={function (e) { setPaySettings(function (p) { return { ...p, at_api_key: e.target.value }; }); }} /></div>
            </div>
            <h4 style={{ color: 'white', background: '#25D366', padding: '8px 12px', borderRadius: '6px', marginTop: '30px' }}>🟢 WhatsApp Cloud API</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div className="form-group"><label className="form-label">WhatsApp Access Token</label><input type="password" className="form-input" value={paySettings.wa_access_token || ''} onChange={function (e) { setPaySettings(function (p) { return { ...p, wa_access_token: e.target.value }; }); }} /></div>
              <div className="form-group"><label className="form-label">WhatsApp Phone Number ID</label><input className="form-input" value={paySettings.wa_phone_number_id || ''} onChange={function (e) { setPaySettings(function (p) { return { ...p, wa_phone_number_id: e.target.value }; }); }} /></div>
            </div>
            <button onClick={handleSavePayments} className="btn btn-primary" style={{ marginTop: '25px' }} disabled={savingPayments}>{savingPayments ? '⏳ Saving...' : '💾 Save All API Configurations'}</button>
          </div>
        </div>
      )}
      {/* ─── Academic Year Rollover Engine ──────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">📅 Academic Year Rollover</div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>Click this button at the end of the year to automatically promote all students to the next class, archive old marks, and reset fee balances.</p>
          <button className="btn btn-primary" style={{ background: '#d32f2f' }} onClick={() => alert('Rollover Engine triggered. This would normally prompt for confirmation.')}>🚀 Start New Academic Year</button>
        </div>
      </div>
      {/* ─── In-App Helpdesk ──────────────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">🎧 Help & Support</div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>Experiencing a bug or need help? Send a ticket directly to Ssewasswa Comfort&apos;s Technologies.</p>
          <textarea className="form-input" rows="3" placeholder="Describe your issue here..." id="helpdesk-issue"></textarea>
          <button className="btn btn-secondary" style={{ marginTop: '10px' }} onClick={async () => {
            const issue = document.getElementById('helpdesk-issue').value;
            if (!issue) return alert('Please describe your issue.');
            const res = await window.electronAPI.submitHelpdeskTicket({ issue: issue, schoolId: 'Local School', username: 'Admin' });
            if (res.success) { alert('Ticket sent! We will contact you shortly.'); document.getElementById('helpdesk-issue').value = ''; }
            else { alert('Failed to send ticket. Check your internet.'); }
          }}>Submit Ticket</button>
        </div>
      </div>
      {/* ─── Gmail Backup ──────────────────────────────────────── */}

      {tab === 'payments' && (
        <div className="card">
          <div className="card-header">💳 Payment Gateways & Bank APIs</div>
          <div className="card-body">
            {/* MTN */}
            <h4 style={{ color: '#ffcc00', background: '#333', padding: '8px 12px', borderRadius: '6px' }}>📱 MTN Mobile Money</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div className="form-group">
                <label className="form-label">API Key</label>
                <input className="form-input" value={paySettings.mtn_api_key || ''}
                  onChange={function (e) { setPaySettings(function (p) { return { ...p, mtn_api_key: e.target.value }; }); }} />
              </div>
              <div className="form-group">
                <label className="form-label">User ID</label>
                <input className="form-input" value={paySettings.mtn_user_id || ''}
                  onChange={function (e) { setPaySettings(function (p) { return { ...p, mtn_user_id: e.target.value }; }); }} />
              </div>
            </div>

            {/* Airtel */}
            <h4 style={{ color: 'white', background: '#e31e24', padding: '8px 12px', borderRadius: '6px', marginTop: '30px' }}>📱 Airtel Money</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div className="form-group">
                <label className="form-label">Client ID</label>
                <input className="form-input" value={paySettings.airtel_client_id || ''}
                  onChange={function (e) { setPaySettings(function (p) { return { ...p, airtel_client_id: e.target.value }; }); }} />
              </div>
              <div className="form-group">
                <label className="form-label">Client Secret</label>
                <input type="password" className="form-input" value={paySettings.airtel_client_secret || ''}
                  onChange={function (e) { setPaySettings(function (p) { return { ...p, airtel_client_secret: e.target.value }; }); }} />
              </div>
              <div className="form-group">
                <label className="form-label">PIN</label>
                <input type="password" className="form-input" value={paySettings.airtel_pin || ''}
                  onChange={function (e) { setPaySettings(function (p) { return { ...p, airtel_pin: e.target.value }; }); }} />
              </div>
            </div>

            {/* Bank */}
            <h4 style={{ color: 'white', background: '#003366', padding: '8px 12px', borderRadius: '6px', marginTop: '30px' }}>🏦 Bank Account Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input className="form-input" value={paySettings.bank_name || ''}
                  onChange={function (e) { setPaySettings(function (p) { return { ...p, bank_name: e.target.value }; }); }} />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input className="form-input" value={paySettings.bank_account_number || ''}
                  onChange={function (e) { setPaySettings(function (p) { return { ...p, bank_account_number: e.target.value }; }); }} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Account Name</label>
                <input className="form-input" value={paySettings.bank_account_name || ''}
                  onChange={function (e) { setPaySettings(function (p) { return { ...p, bank_account_name: e.target.value }; }); }} />
              </div>
            </div>

            <button onClick={handleSavePayments} className="btn btn-primary" style={{ marginTop: '25px' }} disabled={savingPayments}>
              {savingPayments ? '⏳ Saving...' : '💾 Save All Payment Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: LOCATION                                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'location' && (
        <div className="card">
          <div className="card-header">📍 Location & GPS</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <Field k="district_name" label="District" />
              <Field k="county_name" label="County" />
              <Field k="sub_county_name" label="Sub-county" />
              <Field k="parish_name" label="Parish" />
              <Field k="village" label="Village" />
              <Field k="founding_year" label="Founding Year" type="number" />
            </div>
            <button onClick={handleSaveProfile} className="btn btn-primary" style={{ marginTop: '15px' }} disabled={savingProfile}>
              {savingProfile ? '⏳ Saving...' : '💾 Save Location'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: LEADERSHIP                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'leadership' && (
        <div className="card">
          <div className="card-header">👥 Leadership & Contacts</div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <Field k="head_teacher_name" label="Head Teacher Name" />
              <Field k="head_teacher_phone" label="Head Teacher Phone" />
              <Field k="chairperson_name" label="SMC/BOG Chairperson" />
              <Field k="chairperson_phone" label="Chairperson Phone" />
            </div>
            <button onClick={handleSaveProfile} className="btn btn-primary" style={{ marginTop: '15px' }} disabled={savingProfile}>
              {savingProfile ? '⏳ Saving...' : '💾 Save Leadership'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Gmail Backup ──────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">📧 Database Backup</div>
        <div className="card-body">
          <button
            className="btn btn-secondary"
            onClick={handleBackupGmail}
            disabled={backingUp}
          >
            {backingUp ? '⏳ Sending backup...' : '📧 Backup Database to Gmail'}
          </button>
          <p style={{ fontSize: '11px', color: '#999', marginTop: '8px', margin: '8px 0 0 0' }}>
            Gmail App Password required: Google Account → Security → 2-Step Verification → App Passwords → Create
          </p>
        </div>
      </div>
    </div>
  );
}
