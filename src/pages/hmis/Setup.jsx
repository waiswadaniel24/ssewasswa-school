// FileName: src/pages/hmis/Setup.jsx
// Ssewasswa Comforts HMIS — Facility Setup
// Collects HMIS-specific facility + admin user information.
// SEPARATE from the school SystemSetup.jsx.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

var UGANDA_DISTRICTS = ['Kampala','Wakiso','Mukono','Mpigi','Masaka','Mityana','Mubende','Buikwe','Bukomansimbi','Butambala','Buvuma','Gomba','Kalangala','Kalungu','Kayunga','Kiboga','Kyankwanzi','Lwengo','Lyantonde','Nakaseke','Nakasongola','Rakai','Ssembabule','Jinja','Mbale','Soroti','Tororo','Iganga','Kamuli','Kumi','Busia','Bugiri','Budaka','Bududa','Bukedea','Bulambuli','Butaleja','Butebo','Kaberamaido','Kaliro','Kapchorwa','Katakwi','Kibuku','Namayingo','Namutumba','Ngora','Pallisa','Serere','Sironko','Mbarara','Kasese','Kabale','Hoima','Masindi','Kisoro','Rukungiri','Ntungamo','Bushenyi','Ibanda','Isingiro','Kabarole','Kamwenge','Kanungu','Kyenjojo','Kiruhura','Kibaale','Kyegegwa','Mitooma','Ntoroko','Rubirizi','Sheema','Gulu','Lira','Kitgum','Pader','Apac','Amolatar','Amuru','Nwoya','Otuke','Oyam','Alebtong','Abim','Agago','Amudat','Lamwo','Napak','Nakapiripirit','Kaabong','Kotido','Arua','Nebbi','Adjumani','Moyo','Yumbe','Koboko','Maracha','Zombo','Other'];

var FACILITY_LEVELS = ['DrugShop','Pharmacy','Clinic','HC2','HC3','HC4','GeneralHospital','RegionalReferral','NationalReferral'];
var OWNERSHIP_TYPES = ['Government','PNFP','PFP','NGO','FBO'];
var SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  'What was the name of your first pet?',
  'In what city were you born?',
  'What is the name of your first school?',
  'What was your first car?',
  'What is your favorite book?',
];

export default function HMISSetup() {
  var navigate = useNavigate();
  var [formData, setFormData] = useState({
    facilityName: '',
    facilityLevel: 'HC III',
    ownership: 'Government',
    district: '',
    hmisCode: '',
    numBeds: '',
    numStaff: '',
    adminFullName: '',
    adminUsername: 'admin',
    adminPassword: '',
    confirmPassword: '',
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: '',
    phone: '',
    email: '',
  });
  var [error, setError] = useState('');
  var [loading, setLoading] = useState(false);
  var [success, setSuccess] = useState('');

  // Detect Electron desktop mode (IPC available — even if hmis-setup not built yet)
  var hasElectron = Boolean(
    typeof window !== 'undefined' &&
    window.electronAPI &&
    (typeof window.electronAPI.__isElectron !== 'undefined'
      ? window.electronAPI.__isElectron
      : typeof window.electronAPI.authLogin === 'function')
  );

  var handleChange = function (e) {
    setFormData(function (prev) {
      var n = {};
      for (var k in prev) n[k] = prev[k];
      n[e.target.name] = e.target.value;
      return n;
    });
  };

  var handleSubmit = async function (e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // ─── Validation ───
    if (!formData.facilityName.trim()) {
      setError('Facility Name is required');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!formData.district) {
      setError('Please select your district');
      return;
    }
    if (!formData.adminFullName.trim()) {
      setError('Admin full name is required');
      return;
    }
    if (!formData.adminUsername.trim()) {
      setError('Admin username is required');
      return;
    }
    if (formData.adminPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Za-z]/.test(formData.adminPassword) || !/\d/.test(formData.adminPassword)) {
      setError('Password must contain letters AND numbers');
      return;
    }
    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!formData.securityAnswer.trim()) {
      setError('Security answer is required');
      return;
    }

    setLoading(true);

    var payload = {};
    for (var k in formData) payload[k] = formData[k];
    payload.registeredAt = new Date().toISOString();

    try {
      // ─── DESKTOP MODE (Electron) — IPC hmis-setup not yet built; show success ───
      if (hasElectron) {
        // Future: var res = await window.electronAPI.hmisSetup(payload);
        // For now, simulate a successful local setup.
        try {
          localStorage.setItem('hmis_facility', JSON.stringify(payload));
          localStorage.setItem('hmis_is_initialized', 'true');
        } catch (e) {}
        setLoading(false);
        setSuccess('Facility setup complete! (Desktop mode — IPC hmis-setup pending.) Redirecting to HMIS login...');
        setTimeout(function () { navigate('/hmis/login'); }, 1800);
        return;
      }

      // ─── WEB MODE (Supabase) — save facility to localStorage + navigate to /hmis/login ───
      try {
        localStorage.setItem('hmis_facility', JSON.stringify(payload));
        localStorage.setItem('hmis_is_initialized', 'true');
      } catch (e) {}
      setLoading(false);
      setSuccess('Facility setup complete! Redirecting to HMIS login...');
      setTimeout(function () { navigate('/hmis/login'); }, 1800);
    } catch (err) {
      setLoading(false);
      setError('Setup error: ' + (err.message || 'Unknown error'));
    }
  };

  // ─── Style helpers (dark navy + green accent, matching HMISLanding.jsx) ───
  var accent = '#0b8043';
  var accentLight = '#61d3a5';
  var label = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#b5c9d7',
    marginBottom: '6px',
    letterSpacing: '.02em',
  };
  var input = {
    width: '100%',
    padding: '12px 14px',
    background: '#0c273d',
    border: '1px solid #2c4a64',
    borderRadius: '8px',
    color: '#f7fbff',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color .15s',
  };
  var inputFocusStyle = { borderColor: accent };
  var sectionBox = {
    borderTop: '1px solid #1d3a52',
    paddingTop: '20px',
    marginTop: '20px',
  };
  var sectionHeading = {
    color: accentLight,
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    margin: '0 0 14px 0',
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#071b2f',
        color: '#f7fbff',
        fontFamily: "'Segoe UI', sans-serif",
        padding: '28px 20px 60px',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Header / brand */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 26 }}>🏥</div>
            <div>
              <strong style={{ letterSpacing: '.06em' }}>SSEWASSWA HMIS</strong>
              <div style={{ color: '#8fb3c9', fontSize: 12 }}>Health Management Information System</div>
            </div>
          </div>
          <button
            onClick={function () { navigate('/hmis'); }}
            style={{
              background: 'transparent',
              color: '#8fb3c9',
              border: '1px solid #45657b',
              borderRadius: 999,
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ← Back to HMIS
          </button>
        </nav>

        {/* Title + tagline */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ color: accentLight, fontWeight: 700, letterSpacing: '.12em', fontSize: 12, textTransform: 'uppercase', marginBottom: 10 }}>
            Facility Registration
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', margin: '0 0 10px', letterSpacing: '-.03em' }}>🏥 HMIS Facility Setup</h1>
          <p style={{ color: '#b5c9d7', fontSize: 16, lineHeight: 1.55, maxWidth: 560, margin: '0 auto' }}>
            Register your health facility for the Ssewasswa Comforts HMIS
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#0c273d',
            border: '1px solid #2c4a64',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
          }}
        >
          {error && (
            <div
              style={{
                background: 'rgba(211,47,47,0.12)',
                color: '#ff9d9d',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '18px',
                fontSize: '14px',
                border: '1px solid #5b2a2a',
              }}
            >
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div
              style={{
                background: 'rgba(11,128,67,0.18)',
                color: accentLight,
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '18px',
                fontSize: '14px',
                border: '1px solid #2a6b50',
              }}
            >
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ─── Facility Information ─── */}
            <h3 style={sectionHeading}>Facility Information</h3>
            <div style={{ marginBottom: '14px' }}>
              <label style={label}>Facility Name *</label>
              <input
                style={input}
                type="text"
                name="facilityName"
                value={formData.facilityName}
                onChange={handleChange}
                placeholder="e.g. Kisugu Health Centre III"
                required
                autoFocus
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={label}>Facility Level *</label>
                <select style={input} name="facilityLevel" value={formData.facilityLevel} onChange={handleChange}>
                  {FACILITY_LEVELS.map(function (lv) {
                    return <option key={lv} value={lv} style={{ background: '#0c273d' }}>{lv}</option>;
                  })}
                </select>
              </div>
              <div>
                <label style={label}>Ownership *</label>
                <select style={input} name="ownership" value={formData.ownership} onChange={handleChange}>
                  {OWNERSHIP_TYPES.map(function (o) {
                    return <option key={o} value={o} style={{ background: '#0c273d' }}>{o}</option>;
                  })}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={label}>District *</label>
                <select style={input} name="district" value={formData.district} onChange={handleChange} required>
                  <option value="">-- Select District --</option>
                  {UGANDA_DISTRICTS.map(function (d) {
                    return <option key={d} value={d} style={{ background: '#0c273d' }}>{d}</option>;
                  })}
                </select>
              </div>
              <div>
                <label style={label}>HMIS Code</label>
                <input
                  style={input}
                  type="text"
                  name="hmisCode"
                  value={formData.hmisCode}
                  onChange={handleChange}
                  placeholder="e.g. U1215-HCIII"
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={label}>Number of Beds</label>
                <input
                  style={input}
                  type="number"
                  name="numBeds"
                  min="0"
                  value={formData.numBeds}
                  onChange={handleChange}
                  placeholder="e.g. 20"
                />
              </div>
              <div>
                <label style={label}>Number of Staff</label>
                <input
                  style={input}
                  type="number"
                  name="numStaff"
                  min="0"
                  value={formData.numStaff}
                  onChange={handleChange}
                  placeholder="e.g. 15"
                />
              </div>
            </div>

            {/* ─── Contact ─── */}
            <div style={sectionBox}>
              <h3 style={sectionHeading}>Contact</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={label}>Phone</label>
                  <input
                    style={input}
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="077X XXX XXX"
                  />
                </div>
                <div>
                  <label style={label}>Email</label>
                  <input
                    style={input}
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="facility@example.ug"
                  />
                </div>
              </div>
            </div>

            {/* ─── Admin HMIO User ─── */}
            <div style={sectionBox}>
              <h3 style={sectionHeading}>Admin HMIO User</h3>
              <div style={{ marginBottom: '14px' }}>
                <label style={label}>Full Name *</label>
                <input
                  style={input}
                  type="text"
                  name="adminFullName"
                  value={formData.adminFullName}
                  onChange={handleChange}
                  placeholder="e.g. Dr. John Mukasa"
                  required
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={label}>Username *</label>
                <input
                  style={input}
                  type="text"
                  name="adminUsername"
                  value={formData.adminUsername}
                  onChange={handleChange}
                  placeholder="admin"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={label}>Password *</label>
                  <input
                    style={input}
                    type="password"
                    name="adminPassword"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="Min 8 chars, letters + numbers"
                    required
                  />
                </div>
                <div>
                  <label style={label}>Confirm Password *</label>
                  <input
                    style={input}
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={label}>Security Question *</label>
                <select style={input} name="securityQuestion" value={formData.securityQuestion} onChange={handleChange}>
                  {SECURITY_QUESTIONS.map(function (q) {
                    return <option key={q} value={q} style={{ background: '#0c273d' }}>{q}</option>;
                  })}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={label}>Security Answer *</label>
                <input
                  style={input}
                  type="text"
                  name="securityAnswer"
                  value={formData.securityAnswer}
                  onChange={handleChange}
                  placeholder="Used to reset your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#2a6b50' : accent,
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
                boxShadow: '0 6px 20px rgba(11,128,67,0.35)',
                transition: 'background .15s',
              }}
            >
              {loading ? 'Saving Configuration...' : '🏥 Complete Facility Setup'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1d3a52' }}>
            <p style={{ color: '#8fb3c9', fontSize: '13px', margin: '0 0 6px 0' }}>Already registered your facility?</p>
            <button
              onClick={function () { navigate('/hmis/login'); }}
              style={{
                background: 'none',
                border: 'none',
                color: accentLight,
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '14px',
              }}
            >
              Sign in here →
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#5a7488', fontSize: 12, marginTop: 18 }}>
          Ssewasswa Comforts Technologies · HMIS Facility Registration
        </p>
      </div>
    </main>
  );
}
