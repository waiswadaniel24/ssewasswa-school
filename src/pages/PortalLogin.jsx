// FileName: src/pages/PortalLogin.jsx
// Reusable portal-branded login component.
// Handles authentication for Business, Church, Org, and Individual portals.
// Receives a `portal` prop: { id, name, icon, color, gradient }.
//
// Auth flow mirrors Login.jsx:
//   • Supabase configured → supabase.auth.signInWithPassword / signUp
//     (signUp stores user_metadata.portal = portal.id so downstream portal
//      pages can scope the signed-in user to their portal).
//   • Supabase NOT configured → localStorage demo account fallback so the
//     portals are still explorable in demo / desktop builds.
//
// On success the user is sent to the portal route (e.g. /business-portal),
// taken from portal.route if present, otherwise built as `/${portal.id}`.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

// Sensible defaults so the component never crashes if a caller forgets a field.
var DEFAULT_PORTAL = {
    id: 'business-portal',
    name: 'Portal',
    icon: '🔐',
    color: '#1a73e8',
    gradient: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)'
};

function resolvePortal(portal) {
    if (!portal || typeof portal !== 'object') return DEFAULT_PORTAL;
    return {
        id: portal.id || DEFAULT_PORTAL.id,
        name: portal.name || DEFAULT_PORTAL.name,
        icon: portal.icon || DEFAULT_PORTAL.icon,
        color: portal.color || DEFAULT_PORTAL.color,
        gradient: portal.gradient || DEFAULT_PORTAL.gradient,
        route: portal.route || ('/' + (portal.id || DEFAULT_PORTAL.id))
    };
}

export default function PortalLogin(props) {
    var portal = resolvePortal(props && props.portal);
    var navigate = useNavigate();
    var auth = useAuth();
    var loginFn = (auth && auth.login) ? auth.login : function () { /* no-op */ };

    var hasSupabase = Boolean(supabase && isSupabaseConfigured);

    // ─── Form state ─────────────────────────────────────────
    var [tab, setTab] = useState('signin');           // 'signin' | 'register'
    var [name, setName] = useState('');
    var [email, setEmail] = useState('');
    var [password, setPassword] = useState('');
    var [confirm, setConfirm] = useState('');
    var [showPass, setShowPass] = useState(false);
    var [loading, setLoading] = useState(false);
    var [error, setError] = useState('');
    var [successMsg, setSuccessMsg] = useState('');
    var [forgotMode, setForgotMode] = useState(false);
    var [resetEmail, setResetEmail] = useState('');
    var [resetEmailSent, setResetEmailSent] = useState(false);

    // ─── Sign In ────────────────────────────────────────────
    var handleSignIn = async function (e) {
        e.preventDefault();
        setError(''); setSuccessMsg(''); setLoading(true);
        try {
            if (hasSupabase) {
                if (!email || email.indexOf('@') < 0) {
                    setError('Enter your email address');
                    setLoading(false);
                    return;
                }
                var sRes = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password
                });
                setLoading(false);
                if (sRes.error) {
                    setError(sRes.error.message || 'Invalid credentials');
                    return;
                }
                // Persist user via AuthContext so other portal pages can read it.
                try {
                    loginFn({
                        id: (sRes.data && sRes.data.user && sRes.data.user.id) || null,
                        username: name || email,
                        email: email,
                        role: portal.id,
                        portal: portal.id
                    });
                } catch (e2) { /* AuthContext not mounted — ignore */ }
                setSuccessMsg('Signed in! Redirecting to ' + portal.name + '...');
                setTimeout(function () { navigate(portal.route); }, 700);
            } else {
                // ─── Demo / localStorage fallback ──────────
                // No Supabase configured (e.g. desktop build, demo site).
                // Accept any non-empty email + password (min 4 chars) so the
                // portal can be explored. Stored under erp_user like AuthContext.login.
                if (!email || email.indexOf('@') < 0) {
                    setError('Enter your email address');
                    setLoading(false);
                    return;
                }
                if (password.length < 4) {
                    setError('Password must be at least 4 characters');
                    setLoading(false);
                    return;
                }
                var demoUser = {
                    id: 'demo-' + portal.id,
                    username: name || email.split('@')[0],
                    email: email,
                    role: portal.id,
                    portal: portal.id,
                    isDemo: true
                };
                try {
                    localStorage.setItem('erp_user', JSON.stringify(demoUser));
                } catch (e3) { /* storage unavailable — still try to login */ }
                loginFn(demoUser);
                setLoading(false);
                setSuccessMsg('Demo sign-in successful. Redirecting...');
                setTimeout(function () { navigate(portal.route); }, 700);
            }
        } catch (err) {
            setLoading(false);
            setError('Error: ' + ((err && err.message) ? err.message : 'Unknown'));
        }
    };

    // ─── Create Account ─────────────────────────────────────
    var handleRegister = async function (e) {
        e.preventDefault();
        setError(''); setSuccessMsg('');
        // Basic validation (mirrors Login.jsx rules).
        if (!name.trim()) { setError('Enter your full name'); return; }
        if (!email || email.indexOf('@') < 0) { setError('Enter a valid email address'); return; }
        if (password.length < 8) { setError('Password must be 8+ characters'); return; }
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
            setError('Password must contain letters AND numbers');
            return;
        }
        if (password !== confirm) { setError('Passwords do not match'); return; }
        setLoading(true);
        try {
            if (hasSupabase) {
                var sRes = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password,
                    options: {
                        data: {
                            name: name.trim(),
                            username: name.trim(),
                            portal: portal.id              // ← scopes user to this portal
                        }
                    }
                });
                setLoading(false);
                if (sRes.error) {
                    setError(sRes.error.message || 'Registration failed');
                    return;
                }
                setSuccessMsg('Account created! Check your email to confirm, then sign in.');
                setTab('signin');
            } else {
                // ─── Demo / localStorage fallback ──────────
                // Pre-seed a demo account so the new user can immediately sign in.
                var demoUser = {
                    id: 'demo-' + portal.id + '-' + Date.now(),
                    username: name.trim(),
                    email: email.trim(),
                    role: portal.id,
                    portal: portal.id,
                    isDemo: true
                };
                try {
                    localStorage.setItem('erp_user', JSON.stringify(demoUser));
                } catch (e4) { /* ignore */ }
                loginFn(demoUser);
                setLoading(false);
                setSuccessMsg('Demo account created! Redirecting to ' + portal.name + '...');
                setTimeout(function () { navigate(portal.route); }, 800);
            }
        } catch (err) {
            setLoading(false);
            setError('Error: ' + ((err && err.message) ? err.message : 'Unknown'));
        }
    };

    // ─── Forgot Password (Supabase reset email) ─────────────
    var handleSendResetEmail = async function (e) {
        e.preventDefault();
        e.stopPropagation();
        setError(''); setSuccessMsg('');
        if (!resetEmail.trim() || resetEmail.indexOf('@') < 0) {
            setError('Enter your email address');
            return;
        }
        if (!hasSupabase) {
            // Demo mode: no real reset pipeline. Surface the demo creds instead.
            setResetEmailSent(true);
            setSuccessMsg('Demo mode: any email + password (4+ chars) will sign you in.');
            return;
        }
        setLoading(true);
        try {
            var sRes = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
                redirectTo: window.location.origin + '/reset-password'
            });
            setLoading(false);
            if (sRes.error) {
                setError(sRes.error.message || 'Could not send reset email');
                return;
            }
            setResetEmailSent(true);
            setSuccessMsg('Reset link sent! Check your email inbox.');
        } catch (err) {
            setLoading(false);
            setError('Error: ' + ((err && err.message) ? err.message : 'Unknown'));
        }
    };

    // ─── Style helpers ──────────────────────────────────────
    var accent = portal.color;
    var labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' };
    var inputStyle = {
        width: '100%', padding: '12px', border: '1px solid #dadce0', borderRadius: '8px',
        fontSize: '14px', boxSizing: 'border-box', outline: 'none'
    };
    var primaryBtn = function (disabled) {
        return {
            width: '100%', padding: '12px', background: disabled ? '#9aa0a6' : accent,
            color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px',
            fontWeight: '600', cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: disabled ? 'none' : '0 4px 6px rgba(0,0,0,0.15)'
        };
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontFamily: "'Segoe UI', sans-serif", padding: '20px'
        }}>
            <div style={{
                background: 'white', width: '100%', maxWidth: '440px',
                borderRadius: '18px', overflow: 'hidden',
                boxShadow: '0 12px 44px rgba(0,0,0,0.14)'
            }}>
                {/* ─── Portal-branded header ─── */}
                <div style={{
                    background: portal.gradient,
                    padding: '32px 24px', textAlign: 'center', color: 'white',
                    position: 'relative'
                }}>
                    {!hasSupabase && (
                        <span style={{
                            position: 'absolute', top: '12px', right: '12px',
                            background: 'rgba(255,255,255,0.22)', color: 'white',
                            fontSize: '10px', fontWeight: '700', letterSpacing: '0.6px',
                            padding: '4px 10px', borderRadius: '999px',
                            textTransform: 'uppercase'
                        }}>Demo Edition</span>
                    )}
                    <div style={{ fontSize: '52px', lineHeight: 1, marginBottom: '8px' }}>{portal.icon}</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '0.3px' }}>{portal.name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.92, marginTop: '6px' }}>
                        {hasSupabase ? 'Cloud Edition' : 'Demo Edition'} · Secure Portal Access
                    </div>
                </div>

                {/* ─── Body ─── */}
                <div style={{ padding: '28px' }}>
                    {error && (
                        <div style={{
                            background: '#ffebee', color: '#c62828', padding: '12px',
                            borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
                            border: '1px solid #ef9a9a'
                        }}>{error}</div>
                    )}
                    {successMsg && !error && (
                        <div style={{
                            background: '#e8f5e9', color: '#2e7d32', padding: '12px',
                            borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
                            border: '1px solid #a5d6a7'
                        }}>{successMsg}</div>
                    )}

                    {forgotMode ? (
                        <div>
                            <h2 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '20px' }}>Forgot Password</h2>
                            <p style={{ margin: '0 0 18px 0', color: '#666', fontSize: '13px' }}>
                                {hasSupabase
                                    ? 'Enter your email and we\'ll send you a reset link.'
                                    : 'Demo mode — any email and password (4+ chars) will sign you in.'}
                            </p>
                            {resetEmailSent ? (
                                <div style={{
                                    background: '#e8f5e9', color: '#2e7d32', padding: '14px',
                                    borderRadius: '8px', fontSize: '14px', marginBottom: '12px'
                                }}>
                                    {successMsg || 'Request received. Check your email for further steps.'}
                                </div>
                            ) : (
                                <form onSubmit={handleSendResetEmail}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>Email Address</label>
                                        <input
                                            style={inputStyle}
                                            type="email"
                                            value={resetEmail}
                                            onChange={function (e) { setResetEmail(e.target.value); }}
                                            placeholder="your@email.com"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                                        {loading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                </form>
                            )}
                            <button
                                type="button"
                                onClick={function () {
                                    setForgotMode(false);
                                    setResetEmailSent(false);
                                    setResetEmail('');
                                    setError(''); setSuccessMsg('');
                                }}
                                style={{
                                    background: 'none', border: 'none', color: '#5f6368',
                                    cursor: 'pointer', fontSize: '13px', marginTop: '14px', width: '100%'
                                }}
                            >← Back to {portal.name} sign in</button>
                        </div>
                    ) : (
                        <div>
                            {/* ─── Tabs ─── */}
                            <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', marginBottom: '20px' }}>
                                <button
                                    onClick={function () { setTab('signin'); setError(''); setSuccessMsg(''); }}
                                    style={{
                                        flex: 1, padding: '10px', border: 'none',
                                        background: tab === 'signin' ? accent : 'transparent',
                                        color: tab === 'signin' ? 'white' : '#666',
                                        cursor: 'pointer', fontWeight: '600',
                                        borderBottom: tab === 'signin' ? ('2px solid ' + accent) : '2px solid transparent'
                                    }}
                                >Sign In</button>
                                <button
                                    onClick={function () { setTab('register'); setError(''); setSuccessMsg(''); }}
                                    style={{
                                        flex: 1, padding: '10px', border: 'none',
                                        background: tab === 'register' ? accent : 'transparent',
                                        color: tab === 'register' ? 'white' : '#666',
                                        cursor: 'pointer', fontWeight: '600',
                                        borderBottom: tab === 'register' ? ('2px solid ' + accent) : '2px solid transparent'
                                    }}
                                >Create Account</button>
                            </div>

                            {/* ─── Sign In tab ─── */}
                            {tab === 'signin' && (
                                <form onSubmit={handleSignIn}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>Email Address</label>
                                        <input
                                            style={inputStyle}
                                            type="email"
                                            value={email}
                                            onChange={function (e) { setEmail(e.target.value); }}
                                            placeholder="your@email.com"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                style={{ ...inputStyle, paddingRight: '60px' }}
                                                type={showPass ? 'text' : 'password'}
                                                value={password}
                                                onChange={function (e) { setPassword(e.target.value); }}
                                                placeholder="Enter password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={function () { setShowPass(!showPass); }}
                                                style={{
                                                    position: 'absolute', right: '12px', top: '50%',
                                                    transform: 'translateY(-50%)', background: 'none',
                                                    border: 'none', color: accent, cursor: 'pointer',
                                                    fontWeight: '600', fontSize: '13px'
                                                }}
                                            >{showPass ? 'Hide' : 'Show'}</button>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                                        {loading ? 'Signing in...' : 'Sign In'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={function () {
                                            setForgotMode(true);
                                            setResetEmail(email || '');
                                            setResetEmailSent(false);
                                            setError(''); setSuccessMsg('');
                                        }}
                                        style={{
                                            background: 'none', border: 'none', color: accent,
                                            cursor: 'pointer', fontSize: '13px', marginTop: '14px',
                                            width: '100%', fontWeight: '600'
                                        }}
                                    >Forgot Password?</button>
                                </form>
                            )}

                            {/* ─── Create Account tab ─── */}
                            {tab === 'register' && (
                                <form onSubmit={handleRegister}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>Full Name</label>
                                        <input
                                            style={inputStyle}
                                            type="text"
                                            value={name}
                                            onChange={function (e) { setName(e.target.value); }}
                                            placeholder="Jane Doe"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>Email Address</label>
                                        <input
                                            style={inputStyle}
                                            type="email"
                                            value={email}
                                            onChange={function (e) { setEmail(e.target.value); }}
                                            placeholder="your@email.com"
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>Password</label>
                                        <input
                                            style={inputStyle}
                                            type={showPass ? 'text' : 'password'}
                                            value={password}
                                            onChange={function (e) { setPassword(e.target.value); }}
                                            placeholder="Min 8 chars, letters + numbers"
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>Confirm Password</label>
                                        <input
                                            style={inputStyle}
                                            type={showPass ? 'text' : 'password'}
                                            value={confirm}
                                            onChange={function (e) { setConfirm(e.target.value); }}
                                            placeholder="Re-enter password"
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            id={'show-pass-' + portal.id}
                                            checked={showPass}
                                            onChange={function (e) { setShowPass(e.target.checked); }}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor={'show-pass-' + portal.id}
                                            style={{ fontSize: '13px', color: '#555', cursor: 'pointer' }}
                                        >Show passwords</label>
                                    </div>
                                    <button type="submit" disabled={loading} style={primaryBtn(loading)}>
                                        {loading ? 'Creating...' : 'Create Account'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
