import React, { useState, useEffect } from 'react';
export default function NetworkSetup() {
  const [mode, setMode] = useState('server');
  const [ip, setIp] = useState('');
  const [localIp, setLocalIp] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { window.electronAPI.getNetworkMode().then(d => { if (d.localIp) setLocalIp(d.localIp); if (d.mode === 'client' && d.serverIp) setIp(d.serverIp); }); }, []);
  const handleSave = async () => { setMsg('Saving...'); const res = await window.electronAPI.setNetworkMode({ mode, ip }); if (res.success) { setMsg('Saved! Reloading...'); setTimeout(() => window.location.reload(), 1500); } else { setMsg('Failed.'); } };
  return ( <div className="login-container"><div style={{width: '400px'}} className="card"><div className="card-header">Network Config</div><div className="card-body"><div style={{display: 'flex', gap: '15px', marginBottom: '20px'}}><label><input type="radio" checked={mode === 'server'} onChange={() => setMode('server')} /> Server</label><label><input type="radio" checked={mode === 'client'} onChange={() => setMode('client')} /> Client</label></div>{mode === 'server' ? <p>IP: {localIp}</p> : <input className="form-input" value={ip} onChange={e => setIp(e.target.value)} placeholder="Server IP" />}<button onClick={handleSave} className="btn btn-primary">Save</button>{msg && <p>{msg}</p>}</div></div></div> );
}
