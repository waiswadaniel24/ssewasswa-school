import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured, isNeonConfigured, activeBackend } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
    var navigate = useNavigate();
    var auth = useAuth();
    var loginFn = (auth && auth.login) ? auth.login : function () { /* no-op */ };
    var [tab, setTab] = useState('signin');
    var [username, setUsername] = useState('');
    var [password, setPassword] = useState('');
    var [email, setEmail] = useState('');
    var [code, setCode] = useState('');
    var [role, setRole] = useState('Teacher');
    var [showPass, setShowPass] = useState(false);
    var [loading, setLoading] = useState(false);
    var [error, setError] = useState('');
    var [successMsg, setSuccessMsg] = useState('');
    var [sentCode, setSentCode] = useState('');
    var [forgotMode, setForgotMode] = useState(false);
    var [resetEmailSent, setResetEmailSent] = useState(false);
    var [secQuestion, setSecQuestion] = useState('');
    var [recUserId, setRecUserId] = useState(null);
    var [recAnswer, setRecAnswer] = useState('');
    var [newPass, setNewPass] = useState('');

    var hasElectron = Boolean(typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.authLogin === 'function');
    var hasSupabase = Boolean(supabase);

    var handleSignIn = async function (e) {
        e.preventDefault(); setError(''); setSuccessMsg(''); setLoading(true);
        try {
            if (hasElectron) {
                var res = await window.electronAPI.authLogin({ username: username, password: password });
                setLoading(false);
                if (res && res.success && res.user) { loginFn(res.user); navigate('/'); }
                else { setError((res && res.error) || 'Invalid credentials'); }
            } else if (hasSupabase) {
                var loginEmail = username.indexOf('@') >= 0 ? username : email;
                if (!loginEmail) { setError('Enter your email address'); setLoading(false); return; }
                var sRes = await supabase.auth.signInWithPassword({ email: loginEmail, password: password });
                setLoading(false);
                if (sRes.error) { setError(sRes.error.message || 'Invalid credentials'); return; }
                setSuccessMsg('Signed in! Redirecting...');
                setTimeout(function () { navigate('/'); }, 800);
            } else {
                setLoading(false);
                setError('No auth backend available. Run via Electron (npm run dev:desktop) or configure Supabase env vars.');
            }
        } catch (err) { setLoading(false); setError('Error: ' + ((err && err.message) ? err.message : 'Unknown')); }
    };

    // ─── WEB: real Supabase password reset ───
    var handleSendResetEmail = async function (e) {
        e.preventDefault(); e.stopPropagation(); setError(''); setSuccessMsg('');
        if (!username.trim() || username.indexOf('@') < 0) { setError('Enter your email address first'); return; }
        setLoading(true);
        try {
            var sRes = await supabase.auth.resetPasswordForEmail(username.trim(), {
                redirectTo: window.location.origin + '/reset-password'
            });
            setLoading(false);
            if (sRes.error) { setError(sRes.error.message || 'Could not send reset email'); return; }
            setResetEmailSent(true);
            setSuccessMsg('Reset link sent! Check your email inbox.');
        } catch (err) { setLoading(false); setError('Error: ' + ((err && err.message) ? err.message : 'Unknown')); }
    };

    var handleSendCode = function () {
        if (!email || email.indexOf('@') < 0) { setError('Enter a valid email first'); return; }
        var c = String(Math.floor(100000 + Math.random() * 900000));
        setSentCode(c); setError(''); setSuccessMsg('Confirmation code sent: ' + c + ' (check your email)');
    };

    var handleRegister = async function (e) {
        e.preventDefault(); setError(''); setSuccessMsg('');
        if (!hasSupabase && code !== sentCode) { setError('Invalid confirmation code'); return; }
        if (password.length < 8) { setError('Password must be 8+ chars'); return; }
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) { setError('Password needs letters AND numbers'); return; }
        setLoading(true);
        try {
            if (hasElectron) {
                var res = await window.electronAPI.addUser({ username: username, password: password, role: role });
                setLoading(false);
                if (res && res.success) { setSuccessMsg('Account created! Switch to Sign In tab.'); setTab('signin'); }
                else { setError((res && res.error) || 'Registration failed'); }
            } else if (hasSupabase) {
                var sRes = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: { data: { username: username, role: role } }
                });
                setLoading(false);
                if (sRes.error) { setError(sRes.error.message || 'Registration failed'); return; }
                setSuccessMsg('Account created! Check your email to confirm, then sign in.');
                setTab('signin');
            } else {
                setLoading(false);
                setError('No auth backend available.');
            }
        } catch (err) { setLoading(false); setError('Error: ' + ((err && err.message) ? err.message : 'Unknown')); }
    };

    var handleStudentLogin = async function (e) {
        e.preventDefault(); setError(''); setSuccessMsg(''); setLoading(true);
        try {
            if (hasElectron) {
                var res = await window.electronAPI.queryDatabase("SELECT id, first_name, last_name, paycode FROM students WHERE paycode = ? AND status = 'Active'", [username]);
                setLoading(false);
                if (res && res.success && res.data && res.data.length > 0) {
                    var s = res.data[0];
                    loginFn({ id: s.id, username: ((s.first_name || '') + ' ' + (s.last_name || '')).trim(), role: 'Student' });
                    navigate('/');
                } else { setError('Invalid Paycode'); }
            } else if (hasSupabase) {
                var sRes = await supabase.from('students')
                    .select('id, first_name, last_name, paycode')
                    .eq('paycode', username)
                    .eq('status', 'Active')
                    .limit(1);
                setLoading(false);
                if (sRes.error) { setError(sRes.error.message || 'Lookup failed'); return; }
                if (sRes.data && sRes.data.length > 0) {
                    var st = sRes.data[0];
                    loginFn({ id: st.id, username: ((st.first_name || '') + ' ' + (st.last_name || '')).trim(), role: 'Student' });
                    navigate('/');
                } else { setError('Invalid Paycode'); }
            } else {
                setLoading(false);
                setError('No auth backend available.');
            }
        } catch (err) { setLoading(false); setError('Error: ' + ((err && err.message) ? err.message : 'Unknown')); }
    };

    var handleGetQuestion = async function (e) {
        e.preventDefault(); e.stopPropagation(); setError('');
        if (!username.trim()) { setError('Enter username first'); return; }
        if (!hasElectron) { setError('Security-question reset is desktop-only. Use email reset on web.'); return; }
        try {
            var res = await window.electronAPI.authGetSecurityQuestion(username);
            if (res && res.success && res.question) { setSecQuestion(res.question); setRecUserId(res.userId); }
            else { setError((res && res.error) || 'User not found'); }
        } catch (err) { setError('Error: ' + ((err && err.message) ? err.message : 'Unknown')); }
    };

    var handleResetPass = async function (e) {
        e.preventDefault(); e.stopPropagation(); setError('');
        if (!recAnswer.trim()) { setError('Enter your answer'); return; }
        if (newPass.length < 8) { setError('Password must be 8+ chars'); return; }
        try {
            var res = await window.electronAPI.authResetPasswordViaQuestion({ userId: recUserId, answer: recAnswer, newPassword: newPass });
            if (res && res.success) { setSuccessMsg('Password reset! Switch to Sign In.'); setForgotMode(false); setSecQuestion(''); setRecUserId(null); setRecAnswer(''); setNewPass(''); setPassword(''); }
            else { setError((res && res.error) || 'Reset failed'); }
        } catch (err) { setError('Error: ' + ((err && err.message) ? err.message : 'Unknown')); }
    };

    var ls = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' };
    var is = { width: '100%', padding: '12px', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Segoe UI', sans-serif", padding: '20px' }}>
            <div style={{ background: 'white', width: '100%', maxWidth: '420px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ background: '#1a73e8', padding: '30px', textAlign: 'center', color: 'white' }}>
                    <img src="/ssewasswa-comforts-technologies-logo.png" alt="Ssewasswa Comforts Technologies" style={{ width: '90px', height: '90px', objectFit: 'contain', marginBottom: '10px', filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.2))' }} />
                    <div style={{ fontSize: '20px', fontWeight: '800' }}>SSEWASSWA ERP</div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>
                        {hasElectron ? 'Desktop Edition' : (hasSupabase ? 'Cloud Edition' : 'School Management System')}
                    </div>
                </div>
                <div style={{ padding: '30px' }}>
                    <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px', marginBottom: '15px', fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                        <div style={{ marginBottom: '5px', fontWeight: 'bold', color: '#333' }}>INTEGRATIONS:</div>
                        <div>• Electron: <span style={{ color: hasElectron ? '#0d904f' : '#d32f2f' }}>{hasElectron ? '✓ Active (Desktop)' : '✗ Not running'}</span></div>
                        <div>• Supabase: <span style={{ color: isSupabaseConfigured ? '#0d904f' : '#d32f2f' }}>{isSupabaseConfigured ? '✓ Configured' : '✗ Not configured'}</span></div>
                        <div>• Neon Failover: <span style={{ color: isNeonConfigured ? '#0d904f' : '#999' }}>{isNeonConfigured ? '✓ Configured' : '○ Not set (optional)'}</span></div>
                        <div>• Active Backend: <span style={{ color: '#1a73e8' }}>{activeBackend}</span></div>
                        <div>• Cloudflare R2: <span style={{ color: import.meta.env.VITE_CLOUDFLARE_STORAGE_URL ? '#0d904f' : '#999' }}>{import.meta.env.VITE_CLOUDFLARE_STORAGE_URL ? '✓ URL set' : '○ No URL set (storage uploads disabled)'}</span></div>
                    </div>
                    {error && (<div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #ef9a9a' }}>{error}</div>)}
                    {successMsg && !error && (<div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #a5d6a7' }}>{successMsg}</div>)}
                    {forgotMode ? (
                        hasElectron ? (
                            <div>
                                <h2 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>Reset Password</h2>
                                <form onSubmit={secQuestion ? handleResetPass : handleGetQuestion}>
                                    <div style={{ marginBottom: '15px' }}><label style={ls}>Username or Email</label><input style={is} type="text" value={username} onChange={function (e) { setUsername(e.target.value); }} disabled={!!secQuestion} required /></div>
                                    {secQuestion && (<div><div style={{ background: '#f1f3f4', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{secQuestion}</div><div style={{ marginBottom: '15px' }}><label style={ls}>Your Answer</label><input style={is} type="text" value={recAnswer} onChange={function (e) { setRecAnswer(e.target.value); }} required /></div><div style={{ marginBottom: '15px' }}><label style={ls}>New Password</label><input style={is} type="password" value={newPass} onChange={function (e) { setNewPass(e.target.value); }} placeholder="Min 8 chars, letters + numbers" required /></div></div>)}
                                    <button type="submit" style={{ width: '100%', padding: '12px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>{secQuestion ? 'Reset Password' : 'Get Security Question'}</button>
                                    <button type="button" onClick={function () { setForgotMode(false); setSecQuestion(''); setError(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', fontSize: '13px', marginTop: '15px', width: '100%' }}>Back to Login</button>
                                </form>
                            </div>
                        ) : (
                            <div>
                                <h2 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>Reset Password</h2>
                                {resetEmailSent ? (
                                    <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '15px' }}>We emailed you a reset link. Open it on this device to set a new password.</div>
                                ) : (
                                    <form onSubmit={handleSendResetEmail}>
                                        <div style={{ marginBottom: '15px' }}><label style={ls}>Email Address</label><input style={is} type="email" value={username} onChange={function (e) { setUsername(e.target.value); }} placeholder="your@email.com" required /></div>
                                        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#9aa0a6' : '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
                                    </form>
                                )}
                                <button type="button" onClick={function () { setForgotMode(false); setResetEmailSent(false); setError(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', fontSize: '13px', marginTop: '15px', width: '100%' }}>Back to Login</button>
                            </div>
                        )
                    ) : (
                        <div>
                            <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', marginBottom: '20px' }}>
                                <button onClick={function () { setTab('signin'); setError(''); setSuccessMsg(''); }} style={{ flex: 1, padding: '10px', border: 'none', background: tab === 'signin' ? '#1a73e8' : 'transparent', color: tab === 'signin' ? 'white' : '#666', cursor: 'pointer', fontWeight: '600', borderBottom: tab === 'signin' ? '2px solid #1a73e8' : '2px solid transparent' }}>Sign In</button>
                                <button onClick={function () { setTab('register'); setError(''); setSuccessMsg(''); }} style={{ flex: 1, padding: '10px', border: 'none', background: tab === 'register' ? '#1a73e8' : 'transparent', color: tab === 'register' ? 'white' : '#666', cursor: 'pointer', fontWeight: '600', borderBottom: tab === 'register' ? '2px solid #1a73e8' : '2px solid transparent' }}>Register</button>
                                <button onClick={function () { setTab('student'); setError(''); setSuccessMsg(''); }} style={{ flex: 1, padding: '10px', border: 'none', background: tab === 'student' ? '#0d904f' : 'transparent', color: tab === 'student' ? 'white' : '#666', cursor: 'pointer', fontWeight: '600', borderBottom: tab === 'student' ? '2px solid #0d904f' : '2px solid transparent' }}>Student</button>
                            </div>
                            {tab === 'signin' && (
                                <form onSubmit={handleSignIn}>
                                    <div style={{ marginBottom: '15px' }}><label style={ls}>{hasElectron ? 'Username or Email' : 'Email Address'}</label><input style={is} type="text" value={username} onChange={function (e) { setUsername(e.target.value); }} placeholder={hasElectron ? 'Enter username or email' : 'your@email.com'} required autoFocus /></div>
                                    <div style={{ marginBottom: '15px' }}><label style={ls}>Password</label><div style={{ position: 'relative' }}><input style={{ ...is, paddingRight: '60px' }} type={showPass ? 'text' : 'password'} value={password} onChange={function (e) { setPassword(e.target.value); }} placeholder="Enter password" required /><button type="button" onClick={function () { setShowPass(!showPass); }} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>{showPass ? 'Hide' : 'Show'}</button></div></div>
                                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#9aa0a6' : '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 6px rgba(26, 115, 232, 0.3)' }}>{loading ? 'Signing in...' : 'Sign In'}</button>
                                    <button type="button" onClick={function () { setForgotMode(true); setResetEmailSent(false); setError(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: '13px', marginTop: '15px', width: '100%' }}>Forgot Password?</button>
                                    <div style={{ textAlign: 'center', margin: '20px 0', color: '#999', fontSize: '12px', position: 'relative' }}><span style={{ background: 'white', padding: '0 10px', position: 'relative', zIndex: 1 }}>or</span><div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e0e0e0', zIndex: 0 }} /></div>
                                    {hasElectron && (
                                        <button type="button" onClick={function () { try { localStorage.setItem('erp_force_setup', 'true'); } catch (e2) { /* no localStorage */ } navigate('/setup'); }} style={{ width: '100%', padding: '12px', background: 'white', color: '#0d904f', border: '2px solid #0d904f', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Create New Account</button>
                                    )}
                                </form>
                            )}
                            {tab === 'register' && (
                                <form onSubmit={handleRegister}>
                                    <div style={{ marginBottom: '15px' }}><label style={ls}>Email Address</label><div style={{ display: 'flex', gap: '5px' }}><input style={is} type="email" value={email} onChange={function (e) { setEmail(e.target.value); }} placeholder="your@email.com" required />{!hasSupabase && (<button type="button" onClick={handleSendCode} style={{ width: '120px', padding: '0 10px', background: '#e8f0fe', color: '#1a73e8', border: '1px solid #1a73e8', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Send Code</button>)}</div></div>
                                    {!hasSupabase && (<div style={{ marginBottom: '15px' }}><label style={ls}>Confirmation Code</label><input style={is} type="text" value={code} onChange={function (e) { setCode(e.target.value); }} placeholder="6-digit code" required /></div>)}
                                    <div style={{ marginBottom: '15px' }}><label style={ls}>Username</label><input style={is} type="text" value={username} onChange={function (e) { setUsername(e.target.value); }} required /></div>
                                    <div style={{ marginBottom: '15px' }}><label style={ls}>Password</label><input style={is} type="password" value={password} onChange={function (e) { setPassword(e.target.value); }} placeholder="Min 8 chars, letters + numbers" required /></div>
                                    <div style={{ marginBottom: '15px' }}><label style={ls}>Role</label><select style={is} value={role} onChange={function (e) { setRole(e.target.value); }}><option>Teacher</option><option>Admin</option><option>Bursar</option><option>Staff</option></select></div>
                                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#9aa0a6' : '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'Creating...' : 'Create Account'}</button>
                                </form>
                            )}
                            {tab === 'student' && (
                                <form onSubmit={handleStudentLogin}>
                                    <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px', color: '#0d904f' }}>Enter your unique Paycode to view your fees and payment status.</div>
                                    <div style={{ marginBottom: '15px' }}><label style={ls}>Student Paycode</label><input style={is} type="text" value={username} onChange={function (e) { setUsername(e.target.value); }} placeholder="e.g. P5X9A1" required /></div>
                                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#9aa0a6' : '#0d904f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'Checking...' : 'View Portal'}</button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}