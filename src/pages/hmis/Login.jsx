// FileName: src/pages/hmis/Login.jsx
// Ssewasswa Comforts HMIS — Sign-in page (SEPARATE from school Login.jsx)
//
// Health workers sign in here with their HMIS username/password (NOT school
// credentials). This page is intentionally distinct from the School ERP login:
//   - Different localStorage keys:   'hmis_facility' + 'hmis_user'  (not 'erp_*')
//   - Different auth surface:         web mode reads localStorage('hmis_user');
//                                     desktop mode will eventually call IPC
//                                     'hmis-login' (not yet wired in main)
//   - Different theme:                green accent #0b8043 (matches HMISLanding)
//   - Different post-login target:    navigate('/hmis')  (not '/app')
//
// Flow (web mode):
//   1. Read localStorage('hmis_facility'). If missing → demo mode → redirect
//      to /hmis/setup so the user can register their facility first.
//   2. Read localStorage('hmis_user'). If credentials match (username +
//      password), persist the session and navigate to ?next= (default /hmis).
//   3. On mismatch → show "Invalid username or password" error.
//
// Flow (desktop mode, IPC hmis-login not yet built):
//   - Show success with a mock user so the page is testable now. When
//     window.electronAPI.hmisLogin ships in main, swap the mock block for
//     the real IPC call.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function HMISLogin() {
    var navigate = useNavigate();
    var auth = useAuth();
    var loginFn = (auth && auth.login) ? auth.login : function () { /* no-op */ };

    var [username, setUsername] = useState('');
    var [password, setPassword] = useState('');
    var [showPass, setShowPass] = useState(false);
    var [loading, setLoading] = useState(false);
    var [error, setError] = useState('');
    var [successMsg, setSuccessMsg] = useState('');

    // ─── Forgot Password (security question reset) state ────────
    var [forgotMode, setForgotMode] = useState(false);
    var [secQuestion, setSecQuestion] = useState('');
    var [recUserId, setRecUserId] = useState(null);
    var [recAnswer, setRecAnswer] = useState('');
    var [newPass, setNewPass] = useState('');

    // Desktop detection — window.electronAPI exists when running in Electron.
    // (We do NOT check for window.electronAPI.hmisLogin because that IPC handler
    // is intentionally not yet built — see header comment.)
    var isDesktop = Boolean(typeof window !== 'undefined' && window.electronAPI);

    // ─── "?next=" redirect target after sign-in ─────────────────
    // HMIS login always lands inside /hmis (default). Supports ?next=/hmis/<x>
    // for deep links from the HMIS marketing landing page.
    var nextParam = '/hmis';
    try {
        var params = new URLSearchParams(window.location.search);
        var n = params.get('next');
        if (n && n.startsWith('/') && !n.startsWith('//')) nextParam = n;
    } catch (e) { /* ignore */ }

    // ─── Demo mode: if no facility set up yet → redirect to /hmis/setup
    // Runs once on mount (NOT on every keystroke) so the user can fill the
    // form without being bounced. We intentionally use [navigate] as the
    // dep array (stable from useNavigate) so this fires only once.
    useEffect(function () {
        try {
            var facility = localStorage.getItem('hmis_facility');
            if (!facility) {
                navigate('/hmis/setup', { replace: true });
            }
        } catch (e) { /* localStorage unavailable — fall through */ }
    }, [navigate]);

    // ─── Helpers — read facility / user from localStorage ───────
    var readFacility = function () {
        try {
            var raw = localStorage.getItem('hmis_facility');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    };
    var readStoredUser = function () {
        try {
            var raw = localStorage.getItem('hmis_user');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    };
    var matchesUsername = function (stored, input) {
        if (!stored || !input) return false;
        var u = String(input).trim().toLowerCase();
        if (stored.username && String(stored.username).toLowerCase() === u) return true;
        if (stored.email && String(stored.email).toLowerCase() === u) return true;
        return false;
    };

    // ─── Sign In (web + desktop modes) ──────────────────────────
    var handleSignIn = async function (e) {
        e.preventDefault();
        setError(''); setSuccessMsg(''); setLoading(true);
        try {
            // Step 1 — facility must exist. If missing, push the user to setup.
            var facility = readFacility();
            if (!facility) {
                setLoading(false);
                setError('No HMIS facility is set up on this device yet. Redirecting to facility setup...');
                setTimeout(function () { navigate('/hmis/setup'); }, 1200);
                return;
            }

            if (isDesktop) {
                // Desktop mode — IPC hmis-login is not yet built. Show success
                // with a mock user so the page is testable end-to-end now.
                // When window.electronAPI.hmisLogin ships in main, replace this
                // block with: var res = await window.electronAPI.hmisLogin({ username, password });
                var mockUser = {
                    id: 'demo-hmis-user',
                    username: username,
                    role: 'Health Worker',
                    facilityId: facility.id || facility.facilityId || null,
                    facilityName: facility.name || facility.facilityName || null,
                    source: 'hmis'
                };
                try { localStorage.setItem('hmis_user', JSON.stringify(mockUser)); } catch (e2) { /* storage unavailable */ }
                loginFn(mockUser);
                setLoading(false);
                setSuccessMsg('Signed in! Redirecting...');
                setTimeout(function () { navigate(nextParam); }, 500);
                return;
            }

            // Web mode — match credentials against localStorage('hmis_user')
            var stored = readStoredUser();
            if (!stored) {
                setLoading(false);
                setError('No HMIS user account found on this device. Please set up the facility first.');
                return;
            }
            if (!matchesUsername(stored, username)) {
                setLoading(false);
                setError('Invalid username or password. Please try again.');
                return;
            }
            if (!stored.password || stored.password !== password) {
                setLoading(false);
                setError('Invalid username or password. Please try again.');
                return;
            }

            // Success — persist HMIS user session, update AuthContext (so the
            // router's ProtectedHMISLayout renders HMISLayout instead of the
            // marketing landing), then navigate to next.
            var session = {
                id: stored.id || 'hmis-user',
                username: stored.username || username,
                role: stored.role || 'Health Worker',
                facilityId: facility.id || facility.facilityId || null,
                facilityName: facility.name || facility.facilityName || null,
                source: 'hmis'
            };
            try { localStorage.setItem('hmis_user', JSON.stringify(session)); } catch (e2) { /* storage unavailable */ }
            loginFn(session);
            setLoading(false);
            setSuccessMsg('Signed in! Redirecting...');
            setTimeout(function () { navigate(nextParam); }, 500);
        } catch (err) {
            setLoading(false);
            setError('Error: ' + ((err && err.message) ? err.message : 'Unknown'));
        }
    };

    // ─── Forgot Password (security question reset) ──────────────
    // Web mode: pull the security question from localStorage('hmis_user'),
    // verify the answer, and overwrite the password in place. Desktop mode
    // is intentionally stubbed until the IPC hmis-reset-password handler ships.
    var handleGetQuestion = function (e) {
        e.preventDefault(); e.stopPropagation(); setError('');
        if (!username.trim()) { setError('Enter your HMIS username first'); return; }

        if (isDesktop) {
            setError('Password reset via security question is not yet wired in desktop mode. Please contact support.');
            return;
        }

        var stored = readStoredUser();
        if (!stored) { setError('No HMIS user account found on this device.'); return; }
        if (!matchesUsername(stored, username)) { setError('Username not found in HMIS records.'); return; }
        if (!stored.securityQuestion) { setError('No security question set for this account.'); return; }

        setSecQuestion(stored.securityQuestion);
        setRecUserId(stored.id || username);
    };

    var handleResetPass = function (e) {
        e.preventDefault(); e.stopPropagation(); setError('');
        if (!recAnswer.trim()) { setError('Enter your answer'); return; }
        if (newPass.length < 8) { setError('New password must be at least 8 characters'); return; }

        if (isDesktop) {
            setError('Password reset is not yet wired in desktop mode. Please contact support.');
            return;
        }

        var stored = readStoredUser();
        if (!stored) { setError('No HMIS user account found.'); return; }
        if (!stored.securityAnswer) { setError('No security answer set for this account.'); return; }
        if (String(stored.securityAnswer).trim().toLowerCase() !== String(recAnswer).trim().toLowerCase()) {
            setError('Security answer is incorrect.');
            return;
        }

        // Overwrite password in localStorage('hmis_user')
        stored.password = newPass;
        try { localStorage.setItem('hmis_user', JSON.stringify(stored)); } catch (e2) { /* storage unavailable */ }

        setSuccessMsg('Password reset successfully! You can now sign in with your new password.');
        setForgotMode(false);
        setSecQuestion('');
        setRecUserId(null);
        setRecAnswer('');
        setNewPass('');
        setPassword('');
    };

    // ─── Shared input styles ────────────────────────────────────
    var ls = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374753', marginBottom: '6px' };
    var is = { width: '100%', padding: '12px', border: '1px solid #c8d8d2', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };

    // Green HMIS palette (matches HMISLanding accent #0b8043)
    var GREEN = '#0b8043';
    var GREEN_DARK = '#095e30';
    var GREEN_LIGHT = '#e8f5e9';
    var GREEN_BORDER = '#a5d6a7';

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Segoe UI', sans-serif", padding: '20px' }}>
            <div style={{ background: 'white', width: '100%', maxWidth: '420px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(11,128,67,0.15)', overflow: 'hidden' }}>
                {/* ─── Green header with 🏥 icon + "HMIS Sign In" title ─── */}
                <div style={{ background: 'linear-gradient(135deg, #0b8043 0%, #095e30 100%)', padding: '30px', textAlign: 'center', color: 'white' }}>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏥</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '.02em' }}>HMIS Sign In</div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                        {isDesktop ? 'Health Management Information System — Desktop Edition' : 'Health Management Information System'}
                    </div>
                </div>

                <div style={{ padding: '30px' }}>
                    {error && (
                        <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #ef9a9a' }}>{error}</div>
                    )}
                    {successMsg && !error && (
                        <div style={{ background: GREEN_LIGHT, color: GREEN_DARK, padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid ' + GREEN_BORDER }}>{successMsg}</div>
                    )}

                    {forgotMode ? (
                        <div>
                            <h2 style={{ margin: '0 0 8px 0', color: '#374753', fontSize: '20px' }}>Reset HMIS Password</h2>
                            <p style={{ margin: '0 0 20px 0', color: '#7a8a8e', fontSize: '13px', lineHeight: 1.5 }}>
                                Answer your security question to set a new HMIS password.
                            </p>
                            <form onSubmit={secQuestion ? handleResetPass : handleGetQuestion}>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={ls}>Username</label>
                                    <input style={is} type="text" value={username} onChange={function (e) { setUsername(e.target.value); }} disabled={!!secQuestion} placeholder="Enter your HMIS username" required autoFocus={!secQuestion} />
                                </div>
                                {secQuestion && (
                                    <div>
                                        <div style={{ background: '#f1f5f3', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px', color: '#374753' }}>
                                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#7a8a8e', marginBottom: '4px', fontWeight: 700 }}>Security Question</div>
                                            {secQuestion}
                                        </div>
                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={ls}>Your Answer</label>
                                            <input style={is} type="text" value={recAnswer} onChange={function (e) { setRecAnswer(e.target.value); }} required autoFocus />
                                        </div>
                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={ls}>New Password</label>
                                            <input style={is} type="password" value={newPass} onChange={function (e) { setNewPass(e.target.value); }} placeholder="Min 8 characters" required />
                                        </div>
                                    </div>
                                )}
                                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#9aa0a6' : GREEN, color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px rgba(11,128,67,0.3)' }}>
                                    {secQuestion ? 'Reset Password' : 'Get Security Question'}
                                </button>
                                <button type="button" onClick={function () { setForgotMode(false); setSecQuestion(''); setRecUserId(null); setRecAnswer(''); setNewPass(''); setError(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', fontSize: '13px', marginTop: '15px', width: '100%' }}>Back to Sign In</button>
                            </form>
                        </div>
                    ) : (
                        <form onSubmit={handleSignIn}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={ls}>Username</label>
                                <input style={is} type="text" value={username} onChange={function (e) { setUsername(e.target.value); }} placeholder="Enter HMIS username" required autoFocus />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={ls}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input style={{ ...is, paddingRight: '60px' }} type={showPass ? 'text' : 'password'} value={password} onChange={function (e) { setPassword(e.target.value); }} placeholder="Enter password" required />
                                    <button type="button" onClick={function () { setShowPass(!showPass); }} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: GREEN, cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>{showPass ? 'Hide' : 'Show'}</button>
                                </div>
                            </div>
                            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#9aa0a6' : GREEN, color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px rgba(11,128,67,0.3)' }}>
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                            <button type="button" onClick={function () { setForgotMode(true); setError(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: GREEN, cursor: 'pointer', fontSize: '13px', marginTop: '15px', width: '100%' }}>Forgot Password?</button>

                            <div style={{ textAlign: 'center', margin: '20px 0', color: '#999', fontSize: '12px', position: 'relative' }}>
                                <span style={{ background: 'white', padding: '0 10px', position: 'relative', zIndex: 1 }}>or</span>
                                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e0e0e0', zIndex: 0 }} />
                            </div>

                            <button type="button" onClick={function () { navigate('/hmis/setup'); }} style={{ width: '100%', padding: '12px', background: 'white', color: GREEN, border: '2px solid ' + GREEN, borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                                Create New Facility (Setup)
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
