import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function ResetPassword() {
    var navigate = useNavigate();
    var [pass, setPass] = useState('');
    var [loading, setLoading] = useState(false);
    var [error, setError] = useState('');
    var [done, setDone] = useState(false);

    var handleUpdate = async function (e) {
        e.preventDefault(); setError('');
        if (pass.length < 8) { setError('Password must be 8+ chars'); return; }
        if (!/[A-Za-z]/.test(pass) || !/\d/.test(pass)) { setError('Password needs letters AND numbers'); return; }
        setLoading(true);
        var sRes = await supabase.auth.updateUser({ password: pass });
        setLoading(false);
        if (sRes.error) { setError(sRes.error.message || 'Reset failed'); return; }
        setDone(true);
        setTimeout(function () { navigate('/'); }, 1800);
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Segoe UI', sans-serif", padding: '20px' }}>
            <div style={{ background: 'white', width: '100%', maxWidth: '420px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '30px' }}>
                <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Set New Password</h2>
                {done && (<div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>Password updated! Redirecting to sign in...</div>)}
                {error && (<div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{error}</div>)}
                {!done && (
                    <form onSubmit={handleUpdate}>
                        <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' }}>New Password</label><input style={{ width: '100%', padding: '12px', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} type="password" value={pass} onChange={function (e) { setPass(e.target.value); }} placeholder="Min 8 chars, letters + numbers" required autoFocus /></div>
                        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#9aa0a6' : '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'Updating...' : 'Update Password'}</button>
                    </form>
                )}
            </div>
        </div>
    );
}