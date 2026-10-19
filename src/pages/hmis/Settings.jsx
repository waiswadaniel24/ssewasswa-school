// FileName: src/pages/hmis/Settings.jsx
// HMIS Facility Settings — facility info, NHIS config, user accounts, backup, appearance, about
// localStorage persistence under 'hmis_facility', 'hmis_nhis', 'hmis_staff', 'hmis_last_backup', 'darkMode'
// SEPARATE from the school ERP settings — this page is HMIS-specific.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const C = {
  bg: '#071b2f',
  card: '#0d2640',
  cardAlt: '#0a2238',
  input: '#0a1f36',
  border: '#1a3a5c',
  green: '#0b8043',
  greenLight: '#0ca252',
  text: '#e6f0fa',
  muted: '#8da7c1',
  red: '#d32f2f',
  orange: '#e8710a',
  blue: '#1a73e8',
  purple: '#7b1fa2',
  teal: '#00838f',
  indigo: '#5c6bc0',
};

const FACILITY_LEVELS = ['DrugShop', 'Pharmacy', 'Clinic', 'HC2', 'HC3', 'HC4', 'GeneralHospital', 'RegionalReferral', 'NationalReferral'];
const OWNERSHIP_TYPES = ['Government', 'PNFP', 'PFP', 'NGO', 'FBO'];
const UGANDA_DISTRICTS = ['Kampala', 'Wakiso', 'Mukono', 'Mpigi', 'Masaka', 'Mityana', 'Mubende', 'Buikwe', 'Bukomansimbi', 'Butambala', 'Buvuma', 'Gomba', 'Kalangala', 'Kalungu', 'Kayunga', 'Kiboga', 'Kyankwanzi', 'Lwengo', 'Lyantonde', 'Nakaseke', 'Nakasongola', 'Rakai', 'Ssembabule', 'Jinja', 'Mbale', 'Soroti', 'Tororo', 'Iganga', 'Kamuli', 'Kumi', 'Busia', 'Bugiri', 'Budaka', 'Bududa', 'Bukedea', 'Bulambuli', 'Butaleja', 'Butebo', 'Kaberamaido', 'Kaliro', 'Kapchorwa', 'Katakwi', 'Kibuku', 'Namayingo', 'Namutumba', 'Ngora', 'Pallisa', 'Serere', 'Sironko', 'Mbarara', 'Kasese', 'Kabale', 'Hoima', 'Masindi', 'Kisoro', 'Rukungiri', 'Ntungamo', 'Bushenyi', 'Ibanda', 'Isingiro', 'Kabarole', 'Kamwenge', 'Kanungu', 'Kyenjojo', 'Kiruhura', 'Kibaale', 'Kyegegwa', 'Mitooma', 'Ntoroko', 'Rubirizi', 'Sheema', 'Gulu', 'Lira', 'Kitgum', 'Pader', 'Apac', 'Amolatar', 'Amuru', 'Nwoya', 'Otuke', 'Oyam', 'Alebtong', 'Abim', 'Agago', 'Amudat', 'Lamwo', 'Napak', 'Nakapiripirit', 'Kaabong', 'Kotido', 'Arua', 'Nebbi', 'Adjumani', 'Moyo', 'Yumbe', 'Koboko', 'Maracha', 'Zombo', 'Other'];

const ROLE_COLORS = {
  Clinical: C.blue,
  Nursing: C.teal,
  Lab: C.purple,
  Pharmacy: C.orange,
  Records: C.indigo,
  Administration: C.green,
  Support: C.muted,
};

const VERSION = 'HMIS v10.1';

const EMPTY_FACILITY = {
  facilityName: '',
  facilityLevel: 'HC3',
  ownership: 'Government',
  district: '',
  hmisCode: '',
  numBeds: '',
  numStaff: '',
};

const EMPTY_NHIS = {
  schemeName: '',
  providerCode: '',
  verificationEndpoint: '',
};

const CONTACT = {
  mtn: '+256 789 736 737',
  airtel: '+256 752 971 118',
  email: 'support@ssewasswacomfortstechnologies.com',
};

function useLocalState(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
  }, [key, val]);
  return [val, setVal];
}

export default function Settings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('facility');
  const [facility, setFacility] = useLocalState('hmis_facility', EMPTY_FACILITY);
  const [nhis, setNhis] = useLocalState('hmis_nhis', EMPTY_NHIS);
  const [staff] = useLocalState('hmis_staff', []);
  const [lastBackup] = useLocalState('hmis_last_backup', null);
  const [facilityForm, setFacilityForm] = useState({ ...EMPTY_FACILITY, ...facility });
  const [nhisForm, setNhisForm] = useState({ ...EMPTY_NHIS, ...nhis });
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('darkMode') === 'true'; } catch { return false; }
  });
  const [msg, setMsg] = useState('');

  // Sync local form state whenever the persisted facility record changes
  // (e.g. if Setup.jsx rewrote 'hmis_facility' before this page mounted).
  useEffect(() => { setFacilityForm({ ...EMPTY_FACILITY, ...facility }); }, [facility]);
  useEffect(() => { setNhisForm({ ...EMPTY_NHIS, ...nhis }); }, [nhis]);

  const saveFacility = (e) => {
    e.preventDefault();
    if (!facilityForm.facilityName || !facilityForm.facilityName.trim()) {
      setMsg('❌ Facility name is required'); return;
    }
    setFacility({ ...facilityForm, updatedAt: new Date().toISOString() });
    setMsg('✅ Facility information saved');
  };

  const saveNhis = (e) => {
    e.preventDefault();
    setNhis({ ...nhisForm, updatedAt: new Date().toISOString() });
    setMsg('✅ NHIS configuration saved');
  };

  const backupToEmail = () => {
    alert('Coming soon — configure GMAIL_APP_PASS env var');
  };

  const syncNow = () => {
    alert('Cloud sync available on desktop app');
  };

  const toggleDarkMode = (e) => {
    const next = e.target.checked;
    setDarkMode(next);
    try { localStorage.setItem('darkMode', String(next)); } catch { /* ignore */ }
    setMsg(next ? '🌙 Dark mode enabled (cosmetic only)' : '☀️ Light mode enabled (cosmetic only)');
  };

  const facilityNameDisplay = (facility.facilityName || '').trim() || 'Unregistered Facility';
  const lastBackupDisplay = lastBackup
    ? new Date(lastBackup).toLocaleString()
    : 'No backup has been performed yet.';

  const inputStyle = { width: '100%', padding: '11px 14px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.4px' };
  const btnStyle = { padding: '11px 22px', background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)`, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(11,128,67,0.3)' };
  const btnGhostStyle = { padding: '11px 22px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' };
  const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', marginBottom: '20px' };
  const headerStyle = { padding: '16px 20px', borderBottom: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: '15px' };
  const bodyStyle = { padding: '20px' };
  const tabBtn = (id, label, icon, active) => (
    <button key={id} onClick={() => { setTab(id); setMsg(''); }} style={{
      padding: '10px 18px', background: active ? `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)` : 'transparent',
      color: active ? '#fff' : C.muted, border: `1px solid ${active ? C.green : C.border}`, borderRadius: '8px',
      fontWeight: 600, fontSize: '13px', cursor: 'pointer', marginBottom: '6px',
    }}>{icon} {label}</button>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '32px', boxSizing: 'border-box' }}>
      <h1 style={{ color: C.green, fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>⚙️ HMIS Settings</h1>
      <p style={{ color: C.muted, fontSize: '14px', marginBottom: '20px' }}>Facility · NHIS · Users · Backup · Appearance · About</p>

      {msg && <div style={{ padding: '12px 16px', background: msg.includes('✅') ? 'rgba(11,128,67,0.18)' : 'rgba(211,47,47,0.18)', border: `1px solid ${msg.includes('✅') ? C.green : C.red}`, borderRadius: '8px', marginBottom: '16px', color: C.text, fontSize: '14px' }}>{msg}</div>}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {tabBtn('facility', 'Facility Information', '🏥', tab === 'facility')}
        {tabBtn('nhis', 'NHIS Configuration', '🪪', tab === 'nhis')}
        {tabBtn('users', 'User Accounts', '👥', tab === 'users')}
        {tabBtn('backup', 'Backup & Sync', '☁️', tab === 'backup')}
        {tabBtn('appearance', 'Appearance', '🎨', tab === 'appearance')}
        {tabBtn('about', 'About', 'ℹ️', tab === 'about')}
      </div>

      {tab === 'facility' && (
        <div style={cardStyle}>
          <div style={headerStyle}>🏥 Facility Information</div>
          <div style={bodyStyle}>
            <form onSubmit={saveFacility}>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Facility Name *</label>
                <input style={inputStyle} value={facilityForm.facilityName} onChange={(e) => setFacilityForm({ ...facilityForm, facilityName: e.target.value })} placeholder="e.g. Kisugu Health Centre III" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Facility Level *</label>
                  <select style={inputStyle} value={facilityForm.facilityLevel} onChange={(e) => setFacilityForm({ ...facilityForm, facilityLevel: e.target.value })}>
                    {FACILITY_LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Ownership *</label>
                  <select style={inputStyle} value={facilityForm.ownership} onChange={(e) => setFacilityForm({ ...facilityForm, ownership: e.target.value })}>
                    {OWNERSHIP_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>District *</label>
                  <select style={inputStyle} value={facilityForm.district} onChange={(e) => setFacilityForm({ ...facilityForm, district: e.target.value })} required>
                    <option value="">— Select District —</option>
                    {UGANDA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>HMIS Code</label>
                  <input style={inputStyle} value={facilityForm.hmisCode} onChange={(e) => setFacilityForm({ ...facilityForm, hmisCode: e.target.value })} placeholder="e.g. U1215-HCIII" />
                </div>
                <div>
                  <label style={labelStyle}>Number of Beds</label>
                  <input style={inputStyle} type="number" min="0" value={facilityForm.numBeds} onChange={(e) => setFacilityForm({ ...facilityForm, numBeds: e.target.value })} placeholder="e.g. 20" />
                </div>
                <div>
                  <label style={labelStyle}>Number of Staff</label>
                  <input style={inputStyle} type="number" min="0" value={facilityForm.numStaff} onChange={(e) => setFacilityForm({ ...facilityForm, numStaff: e.target.value })} placeholder="e.g. 15" />
                </div>
              </div>
              <button type="submit" style={{ ...btnStyle, marginTop: '6px' }}>💾 Save Facility Information</button>
            </form>
          </div>
        </div>
      )}

      {tab === 'nhis' && (
        <div style={cardStyle}>
          <div style={headerStyle}>🪪 NHIS Configuration</div>
          <div style={bodyStyle}>
            <form onSubmit={saveNhis}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>NHIS Scheme Name</label>
                  <input style={inputStyle} value={nhisForm.schemeName} onChange={(e) => setNhisForm({ ...nhisForm, schemeName: e.target.value })} placeholder="e.g. Community Based Health Insurance" />
                </div>
                <div>
                  <label style={labelStyle}>NHIS Provider Code</label>
                  <input style={inputStyle} value={nhisForm.providerCode} onChange={(e) => setNhisForm({ ...nhisForm, providerCode: e.target.value })} placeholder="e.g. NHIS-UG-00451" />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>NHIS Verification API Endpoint (optional)</label>
                <input style={inputStyle} value={nhisForm.verificationEndpoint} onChange={(e) => setNhisForm({ ...nhisForm, verificationEndpoint: e.target.value })} placeholder="https://nhis.example.ug/api/verify" />
              </div>
              <button type="submit" style={{ ...btnStyle, marginTop: '6px' }}>💾 Save NHIS Configuration</button>
            </form>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div style={cardStyle}>
          <div style={{ ...headerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span>👥 HMIS Staff Accounts ({staff.length})</span>
            <button onClick={() => navigate('/hmis/staff')} style={{ ...btnStyle, padding: '8px 16px', fontSize: '13px' }}>➕ Add Staff</button>
          </div>
          <div style={{ ...bodyStyle, overflowX: 'auto' }}>
            {staff.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                  <p style={{ color: C.muted, fontSize: '14px', marginBottom: '14px' }}>No HMIS staff accounts yet. Add your first staff member.</p>
                  <button onClick={() => navigate('/hmis/staff')} style={btnStyle}>➕ Go to Staff Management</button>
                </div>
              )
              : <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                  <thead>
                    <tr>
                      {['Name', 'Cadre', 'Role', 'Phone', 'Email', 'Status'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: C.muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => {
                      const rc = ROLE_COLORS[s.role] || C.blue;
                      const sc = s.status === 'Active' ? C.green : s.status === 'On Leave' ? C.orange : s.status === 'Suspended' ? C.red : C.muted;
                      return (
                        <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{s.name}<div style={{ fontSize: '11px', color: C.muted }}>{s.id}</div></td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{s.cadre || '-'}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${rc}22`, color: rc, border: `1px solid ${rc}` }}>{s.role || '—'}</span>
                          </td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{s.phone || '-'}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>{s.email || '-'}</td>
                          <td style={{ padding: '11px 12px', fontSize: '13px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: `${sc}22`, color: sc, border: `1px solid ${sc}` }}>{s.status || '-'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>}
          </div>
        </div>
      )}

      {tab === 'backup' && (
        <div style={cardStyle}>
          <div style={headerStyle}>☁️ Backup & Sync</div>
          <div style={bodyStyle}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: C.muted, marginBottom: '6px' }}>Last Backup</div>
                <div style={{ fontSize: '14px', color: C.text, fontWeight: 600 }}>{lastBackupDisplay}</div>
              </div>
              <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: C.muted, marginBottom: '6px' }}>Cloud Sync</div>
                <div style={{ fontSize: '14px', color: C.text, fontWeight: 600 }}>Desktop app only</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button onClick={backupToEmail} style={btnStyle}>📧 Backup to Email</button>
              <button onClick={syncNow} style={btnGhostStyle}>🔄 Sync Now</button>
            </div>
            <p style={{ marginTop: '16px', fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>
              Email backup requires a Gmail App Password configured on the desktop build. Cloud sync between devices is only available in the Electron desktop application.
            </p>
          </div>
        </div>
      )}

      {tab === 'appearance' && (
        <div style={cardStyle}>
          <div style={headerStyle}>🎨 Appearance</div>
          <div style={bodyStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '16px 20px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, marginBottom: '4px' }}>🌙 Dark Mode</div>
                <div style={{ fontSize: '12px', color: C.muted }}>Toggle the interface theme. Cosmetic only — does not affect data.</div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px', flexShrink: 0, cursor: 'pointer' }}>
                <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: '28px',
                  background: darkMode ? `linear-gradient(135deg, ${C.green} 0%, ${C.greenLight} 100%)` : C.border,
                  transition: 'background 0.2s',
                }} />
                <span style={{
                  position: 'absolute', top: '3px', left: '3px', width: '22px', height: '22px', borderRadius: '50%',
                  background: '#fff', transition: 'transform 0.2s',
                  transform: darkMode ? 'translateX(24px)' : 'translateX(0)',
                }} />
              </label>
            </div>
            <p style={{ marginTop: '16px', fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>
              Preference is saved to <code style={{ color: C.green, background: C.input, padding: '1px 6px', borderRadius: '4px' }}>{"localStorage('darkMode')"}</code> and persists across sessions.
            </p>
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div style={cardStyle}>
          <div style={headerStyle}>ℹ️ About</div>
          <div style={bodyStyle}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏥</div>
              <h2 style={{ color: C.green, fontSize: '22px', fontWeight: 700, margin: '0 0 4px 0' }}>{facilityNameDisplay}</h2>
              <div style={{ fontSize: '13px', color: C.muted }}>{VERSION} · Ssewasswa Comforts Technologies</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Version</div>
                <div style={{ fontSize: '14px', color: C.text, fontWeight: 600 }}>{VERSION}</div>
              </div>
              <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '14px 16px' }}>
                <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Facility</div>
                <div style={{ fontSize: '14px', color: C.text, fontWeight: 600 }}>{facilityNameDisplay}</div>
              </div>
            </div>

            <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '16px 20px' }}>
              <div style={{ fontSize: '12px', color: C.muted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>Contact Support</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '14px' }}>
                <div style={{ color: C.text }}><span style={{ color: C.green, fontWeight: 700 }}>MTN:</span> {CONTACT.mtn}</div>
                <div style={{ color: C.text }}><span style={{ color: C.green, fontWeight: 700 }}>Airtel:</span> {CONTACT.airtel}</div>
                <div style={{ color: C.text, gridColumn: '1 / -1' }}><span style={{ color: C.green, fontWeight: 700 }}>Email:</span> <a href={`mailto:${CONTACT.email}`} style={{ color: C.green, textDecoration: 'none' }}>{CONTACT.email}</a></div>
              </div>
            </div>

            <p style={{ marginTop: '18px', fontSize: '12px', color: C.muted, textAlign: 'center', lineHeight: 1.5 }}>
              Ssewasswa Comforts Technologies · Health Management Information System<br />
              Built for Ugandan health facilities · localStorage-first offline data storage
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
