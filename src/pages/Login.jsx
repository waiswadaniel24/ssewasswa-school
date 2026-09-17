import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getSupabaseUser, isSupabaseConfigured, supabase } from '../lib/supabase.js';

const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #d7dee8', borderRadius: 10, fontSize: 14, boxSizing: 'border-box' };
const buttonStyle = { width: '100%', padding: 13, border: 0, borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' };

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Teacher');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!supabase) return undefined;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryReady(true);
        setMode('recovery');
        setMessage({ type: 'success', text: 'Choose a new password below. This will replace your old password.' });
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    if (!supabase || !isSupabaseConfigured) {
      setMessage({ type: 'error', text: 'Authentication is not configured. Add the Supabase URL and publishable key.' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();
    if (mode === 'signup' && normalizedUsername.length < 2) {
      setMessage({ type: 'error', text: 'Enter a username with at least 2 characters.' });
      return;
    }
    if ((mode === 'signup' || mode === 'recovery') && password.length < 8) {
      setMessage({ type: 'error', text: 'Use a password with at least 8 characters.' });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'recovery') {
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setRecoveryReady(false);
        setPassword('');
        setMode('signin');
        setMessage({ type: 'success', text: 'Your password was changed. You can now sign in with the new password.' });
      } else if (mode === 'signup') {
        const result = await supabase.auth.signUp({
          email: normalizedEmail, password,
          options: { emailRedirectTo: import.meta.env.VITE_DEV_SUPABASE_REDIRECT_URL || import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`, data: { username: normalizedUsername, role } },
        });
        if (result.error) throw result.error;
        if (result.data.session && result.data.user) { login(getSupabaseUser(result.data.user)); navigate('/'); return; }
        setMessage({ type: 'success', text: 'Account created. Check your email to confirm it, then sign in.' });
        setMode('signin');
      } else {
        const result = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (result.error || !result.data.user) throw result.error || new Error('Invalid credentials');
        login(getSupabaseUser(result.data.user));
        navigate('/');
      }
    } catch (error) {
      const text = String(error?.message || '').toLowerCase();
      let friendly = mode === 'signup' ? 'Unable to create the account. Check your details and try again.' : 'Invalid email or password.';
      if (/confirm|not confirmed/.test(text)) friendly = 'Please confirm your email before signing in.';
      if (/rate limit|too many|429/.test(text)) friendly = 'Too many attempts. Wait a moment and try again.';
      if (/already registered|already exists/.test(text)) friendly = 'This email is already registered. Sign in instead.';
      setMessage({ type: 'error', text: friendly });
    } finally { setLoading(false); }
  };

  const requestPasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage({ type: 'error', text: 'Enter your email address first, then select Forgot password.' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (result.error) throw result.error;
      setMessage({ type: 'success', text: 'Password reset email sent. Open the email, select Reset password, then choose a new password here. Check spam or junk if you do not see it.' });
    } catch (error) {
      const text = String(error?.message || '').toLowerCase();
      setMessage({ type: 'error', text: /rate limit|too many|429/.test(text) ? 'Too many reset requests. Wait a moment and try again.' : 'We could not send the reset email. Check the email address and try again.' });
    } finally { setLoading(false); }
  };

  const github = async () => {
    if (!supabase) return setMessage({ type: 'error', text: 'GitHub sign-in is not configured.' });
    setLoading(true);
    const result = await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: import.meta.env.VITE_DEV_SUPABASE_REDIRECT_URL || import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback` } });
    if (result.error) { setLoading(false); setMessage({ type: 'error', text: 'Unable to start GitHub sign-in.' }); }
  };

  return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'linear-gradient(135deg,#eef4ff,#f8fafc)', fontFamily: 'Arial,sans-serif' }}>
    <section style={{ width: '100%', maxWidth: 430, background: '#fff', borderRadius: 18, boxShadow: '0 18px 55px rgba(35,55,90,.14)', overflow: 'hidden' }}>
      <header style={{ padding: '30px 28px', textAlign: 'center', color: '#fff', background: '#155eef' }}><img src="/ssewasswa-comforts-school-erp-mark.png" alt="Ssewasswa Comforts School ERP" style={{ width: 74, height: 74, objectFit: 'contain' }} /><h1 style={{ fontSize: 20, margin: '12px 0 5px' }}>SSEWASSWA COMFORTS SCHOOL ERP</h1><p style={{ margin: 0, opacity: .85, fontSize: 13 }}>Secure school management access</p></header>
      <div style={{ padding: 28 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}><button type="button" onClick={() => { setMode('signin'); setMessage({ type: '', text: '' }); }} style={{ ...buttonStyle, background: mode === 'signin' ? '#155eef' : '#eef2f7', color: mode === 'signin' ? '#fff' : '#526070' }}>Sign in</button><button type="button" onClick={() => { setMode('signup'); setMessage({ type: '', text: '' }); }} style={{ ...buttonStyle, background: mode === 'signup' ? '#155eef' : '#eef2f7', color: mode === 'signup' ? '#fff' : '#526070' }}>Create account</button></div>
        {message.text && <div role="alert" style={{ padding: 12, borderRadius: 9, marginBottom: 18, color: message.type === 'success' ? '#126b3a' : '#b42318', background: message.type === 'success' ? '#ecfdf3' : '#fff1f0', fontSize: 13 }}>{message.text}</div>}
        <form onSubmit={submit}>
          {mode === 'signup' && <><label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Username<input style={{ ...inputStyle, marginTop: 6 }} value={username} onChange={e => setUsername(e.target.value)} required /></label><label style={{ display: 'block', fontSize: 13, fontWeight: 700, margin: '15px 0 6px' }}>Role<select style={{ ...inputStyle, marginTop: 6 }} value={role} onChange={e => setRole(e.target.value)}><option>Teacher</option><option>Administrator</option><option>Accountant</option><option>Staff</option></select></label></>}
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, margin: '15px 0 6px' }}>Email address<input type="email" style={{ ...inputStyle, marginTop: 6 }} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
          {mode !== 'recovery' && <label style={{ display: 'block', fontSize: 13, fontWeight: 700, margin: '15px 0 6px' }}>Password<input type="password" style={{ ...inputStyle, marginTop: 6 }} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : mode === 'recovery' ? 'new-password' : 'current-password'} required /></label>}
          {mode === 'recovery' && <label style={{ display: 'block', fontSize: 13, fontWeight: 700, margin: '15px 0 6px' }}>New password<input type="password" style={{ ...inputStyle, marginTop: 6 }} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required /></label>}
          <button type="submit" disabled={loading} style={{ ...buttonStyle, marginTop: 22, background: loading ? '#9ab4e8' : '#155eef' }}>{loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : mode === 'recovery' ? 'Save new password' : 'Sign in'}</button>
        </form>
        {mode === 'signin' && <><button type="button" onClick={requestPasswordReset} disabled={loading} style={{ width: '100%', border: 0, background: 'transparent', color: '#155eef', cursor: 'pointer', fontWeight: 700, fontSize: 13, marginTop: 14 }}>Forgot password?</button><div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8793a3', fontSize: 12, margin: '22px 0' }}><hr style={{ flex: 1, border: 0, borderTop: '1px solid #e5e9ef' }} />OR<hr style={{ flex: 1, border: 0, borderTop: '1px solid #e5e9ef' }} /></div><button type="button" onClick={github} disabled={loading} style={{ ...buttonStyle, background: '#24292f' }}>Continue with GitHub</button></>}
        {mode === 'recovery' && <button type="button" onClick={() => { setMode('signin'); setRecoveryReady(false); setMessage({ type: '', text: '' }); }} style={{ width: '100%', border: 0, background: 'transparent', color: '#526070', cursor: 'pointer', fontWeight: 700, fontSize: 13, marginTop: 14 }}>Back to sign in</button>}
      </div>
    </section>
  </main>;
}
