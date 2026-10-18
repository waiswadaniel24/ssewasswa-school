import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function ResetPassword() {
    var navigate = useNavigate();
    var [pass, setPass] = useState('');
    var [loading, setLoading] = useState(false);
    var [error, setError] = useState('');
    var [done, setDone] = useState(false);
    var [sessionReady, setSessionReady] = useState(false);
    var [checkingSession, setCheckingSession] = useState(true);

    // CRITICAL: Wait for the recovery token (in the URL fragment) to be
    // processed by the Supabase SDK. Without this, supabase.auth.updateUser
    // fails with "User not found" or "no session" error.
    useEffect(() => {
        if (!supabase) {
            setError('Password reset requires an internet connection. Please try again or contact support.');
            setCheckingSession(false);
            return;
        }

        let mounted = true;

        // Check current session (the recovery token might already be processed)
        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return;
            if (data.session) {
                setSessionReady(true);
                setCheckingSession(false);
            } else {
                // No session yet — listen for the recovery token to be processed
                // The Supabase SDK auto-detects the token in the URL fragment on init
                // and fires an AUTH_RECOVERED event when done
                const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
                    if (!mounted) return;
                    if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || session) {
                        setSessionReady(true);
                        setCheckingSession(false);
                    }
                });
                // Also poll for up to 5 seconds (in case the listener doesn't fire)
                let attempts = 0;
                const pollInterval = setInterval(() => {
                    attempts += 1;
                    supabase.auth.getSession().then(({ data }) => {
                        if (data.session) {
                            setSessionReady(true);
                            setCheckingSession(false);
                            clearInterval(pollInterval);
                        } else if (attempts >= 10) {
                            clearInterval(pollInterval);
                            setCheckingSession(false);
                            setError('Invalid or expired reset link. Please request a new password reset.');
                        }
                    });
                }, 500);

                return () => {
                    mounted = false;
                    authListener?.subscription?.unsubscribe?.();
                    clearInterval(pollInterval);
                };
            }
        }).catch(() => {
            if (!mounted) return;
            setCheckingSession(false);
            setError('Could not initialize session. Please try refreshing the page.');
        });
    }, []);

    var handleUpdate = async function (e) {
        e.preventDefault(); setError('');
        if (pass.length < 8) { setError('Password must be 8+ chars'); return; }
        if (!/[A-Za-z]/.test(pass) || !/\d/.test(pass)) { setError('Password needs letters AND numbers'); return; }
        if (!sessionReady) { setError('Session not ready. Please wait a moment and try again.'); return; }
        setLoading(true);
        try {
            var sRes = await supabase.auth.updateUser({ password: pass });
            setLoading(false);
            if (sRes.error) { setError(sRes.error.message || 'Reset failed'); return; }
            setDone(true);
            setTimeout(function () { navigate('/'); }, 1800);
        } catch (err) {
            setLoading(false);
            setError('Error: ' + ((err && err.message) ? err.message : 'Unknown'));
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Segoe UI', sans-serif", padding: '20px' }}>
            <div style={{ background: 'white', width: '100%', maxWidth: '420px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '30px' }}>
                <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Set New Password</h2>
                {done && (<div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>Password updated! Redirecting to sign in...</div>)}
                {error && (<div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{error}</div>)}
                {checkingSession && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '14px' }}>
                        <div style={{ width: '32px', height: '32px', border: '3px solid #e0e0e0', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                        Verifying your reset link...
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}
                {!checkingSession && sessionReady && !done && (
                    <form onSubmit={handleUpdate}>
                        <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' }}>New Password</label><input style={{ width: '100%', padding: '12px', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} type="password" value={pass} onChange={function (e) { setPass(e.target.value); }} placeholder="Min 8 chars, letters + numbers" required autoFocus /></div>
                        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#9aa0a6' : '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'Updating...' : 'Update Password'}</button>
                    </form>
                )}
                {!checkingSession && !sessionReady && !done && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <a href="/login" style={{ color: '#1a73e8', fontSize: '14px', textDecoration: 'none' }}>← Back to login</a>
                    </div>
                )}
            </div>
        </div>
    );
}
