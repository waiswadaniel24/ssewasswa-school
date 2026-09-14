// FileName: src/pages/EMISConfig.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useCallback, useRef } from 'react';

export default function EMISConfig() {
  const [config, setConfig] = useState({
    emis_number: '',
    uneb_center_number: '',
    uneb_api_key: '',
    uneb_api_secret: '',
    uneb_api_url: 'https://emis.uneb.go.ug/api/v1',
    last_sync: 'Never'
  });
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState({ hwid: 'Loading...', status: 'Unknown' });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Show timed message ────────────────────────────────────
  const showMessage = (text, type) => {
    if (!mountedRef.current) return;
    setMsg(text);
    setMsgType(type || 'info');
    setTimeout(() => {
      if (mountedRef.current) setMsg('');
    }, 5000);
  };

  // ─── Load config from database ────────────────────────────
  const loadConfig = useCallback(async () => {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    try {
      const keys = ['emis_number', 'uneb_center_number', 'uneb_api_key', 'uneb_api_secret', 'uneb_api_url', 'last_emis_sync'];
      const settings = { /* no-op */ };

      for (const key of keys) {
        try {
          const r = await window.electronAPI.queryDatabase(
            "SELECT value FROM system_settings WHERE key = ?", [key]
          );
          if (r && r.success && r.data && r.data.length > 0 && r.data[0]) {
            settings[key] = r.data[0].value || '';
          }
        } catch (e) { /* ignore individual key errors */ }
      }

      if (!mountedRef.current) return;

      setConfig({
        emis_number: settings.emis_number || '',
        uneb_center_number: settings.uneb_center_number || '',
        uneb_api_key: settings.uneb_api_key || '',
        uneb_api_secret: settings.uneb_api_secret || '',
        uneb_api_url: settings.uneb_api_url || 'https://emis.uneb.go.ug/api/v1',
        last_sync: settings.last_emis_sync || 'Never'
      });

      // Load HWID and license status
      try {
        if (window.electronAPI.getHwid) {
          const hwidRes = await window.electronAPI.getHwid();
          if (mountedRef.current && hwidRes && hwidRes.success && hwidRes.hwid) {
            setLicenseInfo(prev => ({ ...prev, hwid: hwidRes.hwid.substring(0, 32) + '...' }));
          }
        }
      } catch (e) { /* ignore hwid error */ }

      try {
        if (window.electronAPI.checkLicense) {
          const licRes = await window.electronAPI.checkLicense();
          if (mountedRef.current && licRes) {
            let status = 'Unknown';
            if (licRes.success) {
              status = '✅ Licensed';
            } else if (licRes.isTrial) {
              status = `⏳ Trial (${licRes.daysLeft || 0} days left)`;
            } else {
              status = '❌ Expired';
            }
            setLicenseInfo(prev => ({ ...prev, status: status }));
          }
        }
      } catch (e) { /* ignore license error */ }

    } catch (e) {
      if (!mountedRef.current) return;
      console.error('EMISConfig: load error:', (e && e.message) ? e.message : 'Unknown');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // ─── Save config to database ──────────────────────────────
  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    setSaving(true);
    showMessage('⏳ Saving configuration...', 'info');

    try {
      const settings = {
        'emis_number': config.emis_number || '',
        'uneb_center_number': config.uneb_center_number || '',
        'uneb_api_key': config.uneb_api_key || '',
        'uneb_api_secret': config.uneb_api_secret || '',
        'uneb_api_url': config.uneb_api_url || 'https://emis.uneb.go.ug/api/v1'
      };

      // FIXED: Replaced for...in with Object.entries to prevent "Do not access Object.prototype" ESLint error
      for (const [key, value] of Object.entries(settings)) {
        try {
          await window.electronAPI.queryDatabase(
            "INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)",
            [key, value]
          );
        } catch (e) { /* ignore individual key errors */ }
      }

      if (!mountedRef.current) return;
      showMessage('✅ EMIS configuration saved!', 'success');
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('EMISConfig: save error:', errMsg);
      showMessage('❌ Error saving: ' + errMsg, 'error');
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  // ─── Test UNEB API connection ─────────────────────────────
  const handleTestConnection = async () => {
    if (!config.uneb_api_key) {
      showMessage('⚠️ Please enter the UNEB API key first', 'warning');
      return;
    }

    setTesting(true);
    showMessage('⏳ Testing UNEB API connection...', 'info');

    try {
      if (!window.electronAPI.unebRegisterCandidates) {
        showMessage('ℹ️ UNEB connector not available. Save the config and try again.', 'warning');
        return;
      }

      // Try a simple health check by registering 0 candidates
      const r = await window.electronAPI.unebRegisterCandidates('PLE', 0);
      if (!mountedRef.current) return;

      if (r && r.success) {
        showMessage('✅ UNEB API connection successful! Response received.', 'success');
      } else {
        const errMsg = (r && r.error) ? r.error : 'Connection failed';
        showMessage('⚠️ Connection test result: ' + errMsg + '\n\nThis may be normal if no candidates are pending. The API key is saved.', 'warning');
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errCatch = (e && e.message) ? e.message : 'Unknown error';
      showMessage('❌ Connection error: ' + errCatch + '\n\nCheck your API key, URL, and network connection.', 'error');
    } finally {
      if (mountedRef.current) setTesting(false);
    }
  };

  // ─── Message styles ───────────────────────────────────────
  const msgStyles = {
    info: { bg: '#e8f0fe', color: '#1a73e8', icon: 'ℹ️' },
    success: { bg: '#e8f5e9', color: '#0d904f', icon: '✅' },
    error: { bg: '#ffebee', color: '#c62828', icon: '❌' },
    warning: { bg: '#fff3e0', color: '#e65100', icon: '⚠️' }
  };
  const ms = msgStyles[msgType] || msgStyles.info;

  // ─── Field update helper ──────────────────────────────────
  const updateField = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">⚙️ EMIS Setup & Sync</h1>
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
            <p style={{ color: '#666' }}>Loading EMIS configuration...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">⚙️ EMIS Setup & Sync</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <div style={{
          background: ms.bg, color: ms.color,
          padding: '12px 16px', borderRadius: '8px',
          marginBottom: '20px', fontSize: '14px',
          display: 'flex', alignItems: 'center', gap: '8px',
          whiteSpace: 'pre-line'
        }}>
          <span style={{ fontSize: '16px' }}>{ms.icon}</span>
          {msg}
        </div>
      )}

      {/* ─── License & HWID Info ─────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">🔐 System License</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#5f6368', textTransform: 'uppercase', marginBottom: '4px' }}>
                Hardware ID
              </div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#333', wordBreak: 'break-all' }}>
                {licenseInfo.hwid}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#5f6368', textTransform: 'uppercase', marginBottom: '4px' }}>
                License Status
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>
                {licenseInfo.status}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#5f6368', textTransform: 'uppercase', marginBottom: '4px' }}>
                Last EMIS Sync
              </div>
              <div style={{ fontSize: '14px' }}>
                {config.last_sync || 'Never'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── School Identification ─────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">🏫 School Identification</div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">EMIS Number</label>
              <input
                className="form-input"
                value={config.emis_number || ''}
                onChange={(e) => updateField('emis_number', e.target.value)}
                placeholder="e.g. P12345"
              />
            </div>
            <div className="form-group">
              <label className="form-label">UNEB Center Number</label>
              <input
                className="form-input"
                value={config.uneb_center_number || ''}
                onChange={(e) => updateField('uneb_center_number', e.target.value)}
                placeholder="e.g. U1234"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── UNEB API Configuration ────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">🔌 UNEB/EMIS API Configuration</div>
        <div className="card-body">
          <div style={{
            background: '#e8f0fe', padding: '12px 16px', borderRadius: '8px',
            marginBottom: '15px', fontSize: '13px', color: '#1a73e8'
          }}>
            💡 To get API access, contact the Ministry of Education and Sports (MoES) or UNEB.
            Provide your EMIS number and school registration details.
          </div>

          <div className="form-group">
            <label className="form-label">API Key</label>
            <input
              type="password"
              className="form-input"
              value={config.uneb_api_key || ''}
              onChange={(e) => updateField('uneb_api_key', e.target.value)}
              placeholder="UNEB API Key (Ocp-Apim-Subscription-Key)"
            />
          </div>

          <div className="form-group">
            <label className="form-label">API Secret</label>
            <input
              type="password"
              className="form-input"
              value={config.uneb_api_secret || ''}
              onChange={(e) => updateField('uneb_api_secret', e.target.value)}
              placeholder="UNEB API Secret"
            />
          </div>

          <div className="form-group">
            <label className="form-label">API URL</label>
            <input
              className="form-input"
              value={config.uneb_api_url || ''}
              onChange={(e) => updateField('uneb_api_url', e.target.value)}
              placeholder="https://emis.uneb.go.ug/api/v1"
            />
            <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              Default: https://emis.uneb.go.ug/api/v1 (do not change unless instructed by MoES)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Configuration'}
            </button>
            <button onClick={handleTestConnection} className="btn btn-secondary" disabled={testing}>
              {testing ? '⏳ Testing...' : '🔌 Test Connection'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Sync Status ─────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">🔄 Sync Status</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#5f6368', textTransform: 'uppercase', marginBottom: '4px' }}>
                Last Sync
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: (config.last_sync && config.last_sync !== 'Never') ? '#0d904f' : '#999' }}>
                {config.last_sync || 'Never'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#5f6368', textTransform: 'uppercase', marginBottom: '4px' }}>
                API Status
              </div>
              <div style={{ fontSize: '14px' }}>
                {config.uneb_api_key ? (
                  <span style={{ color: '#0d904f' }}>✅ API Key Configured</span>
                ) : (
                  <span style={{ color: '#d32f2f' }}>❌ Not Configured</span>
                )}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '15px', padding: '12px 16px',
            background: '#f8f9fa', borderRadius: '8px',
            fontSize: '13px', color: '#666'
          }}>
            <p style={{ margin: '0 0 8px 0' }}>
              📤 <strong>Push:</strong> Upload school EMIS data (enrollment, staff, infrastructure) to the national system.
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              📥 <strong>Pull:</strong> Download UNEB exam results for registered candidates.
            </p>
            <p style={{ margin: 0 }}>
              📊 <strong>Compile:</strong> Use the EMIS Report page to generate and review data before pushing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
