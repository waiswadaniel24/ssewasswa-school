import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

export default function SchoolSignup() {
    var navigate = useNavigate();
    var [form, setForm] = useState({
        schoolName: '', schoolLevel: 'Primary', district: '', phone: '', email: '',
        adminName: '', adminEmail: '', adminPassword: '', confirmPass: ''
    });
    var [loading, setLoading] = useState(false);
    var [error, setError] = useState('');
    var [success, setSuccess] = useState('');

    var handleChange = function (e) {
        setForm(function (p) { var n = {}; for (var k in p) n[k] = p[k]; n[e.target.name] = e.target.value; return n; });
    };

    var handleSubmit = async function (e) {
        e.preventDefault(); setError(''); setSuccess('');
        if (!form.schoolName.trim()) { setError('School name is required'); return; }
        if (!form.adminEmail || form.adminEmail.indexOf('@') < 0) { setError('Admin email is required'); return; }
        if (form.adminPassword.length < 8) { setError('Password must be 8+ chars'); return; }
        if (!/[A-Za-z]/.test(form.adminPassword) || !/\d/.test(form.adminPassword)) { setError('Password needs letters AND numbers'); return; }
        if (form.adminPassword !== form.confirmPass) { setError('Passwords do not match'); return; }

        setLoading(true);
        try {
            // 1. Create the school row
            var schoolRes = await supabase.from('erp_schools').insert({
                school_name: form.schoolName,
                school_level: form.schoolLevel,
                is_active: true
            }).select().single();

            if (schoolRes.error) throw new Error(schoolRes.error.message);
            var schoolId = schoolRes.data.id;

            // 2. Create the admin user in Supabase Auth
            var authRes = await supabase.auth.signUp({
                email: form.adminEmail,
                password: form.adminPassword,
                options: {
                    data: {
                        username: form.adminName || form.adminEmail,
                        role: 'Super Admin',
                        school_id: schoolId
                    }
                }
            });

            if (authRes.error) throw new Error(authRes.error.message);

            // 3. Link user to school as Super Admin
            if (authRes.data.user) {
                await supabase.from('erp_school_memberships').insert({
                    user_id: authRes.data.user.id,
                    school_id: schoolId,
                    role: 'Super Admin',
                    is_active: true
                });

                await supabase.from('erp_profiles').insert({
                    user_id: authRes.data.user.id,
                    school_id: schoolId,
                    role: 'Super Admin',
                    permissions: ['read', 'write', 'delete', 'admin']
                });
            }

            setSuccess('School registered! Check ' + form.adminEmail + ' for confirmation link, then sign in.');
            setLoading(false);
            setTimeout(function () { navigate('/login'); }, 3000);
        } catch (err) {
            setLoading(false);
            setError('Error: ' + ((err && err.message) ? err.message : 'Unknown'));
        }
    };

    var ls = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' };
    var is = { width: '100%', padding: '12px', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Segoe UI', sans-serif", padding: '20px' }}>
            <div style={{ background: 'white', width: '100%', maxWidth: '600px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ background: '#0d904f', padding: '25px', textAlign: 'center', color: 'white' }}>
                    <img src="/ssewasswa-comforts-technologies-logo.png" alt="Ssewasswa Comforts Technologies" style={{ width: '70px', height: '70px', objectFit: 'contain', marginBottom: '8px' }} />
                    <div style={{ fontSize: '20px', fontWeight: '800' }}>Register Your School</div>
                    <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>Sign up for SSEWASSWA ERP Cloud Edition</div>
                </div>
                <div style={{ padding: '25px', maxHeight: '65vh', overflowY: 'auto' }}>
                    {error && (<div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{error}</div>)}
                    {success && (<div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{success}</div>)}
                    <form onSubmit={handleSubmit}>
                        <h4 style={{ color: '#0d904f', marginBottom: '10px', marginTop: 0 }}>School Information</h4>
                        <div style={{ marginBottom: '10px' }}><label style={ls}>School Name *</label><input style={is} type="text" name="schoolName" value={form.schoolName} onChange={handleChange} placeholder="e.g. St. Peter's Primary School" required autoFocus /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <div><label style={ls}>School Level *</label><select style={is} name="schoolLevel" value={form.schoolLevel} onChange={handleChange}><option>Primary</option><option>Secondary</option><option>Nursery</option><option>Nursery & Primary</option><option>Tertiary</option></select></div>
                            <div><label style={ls}>District *</label><input style={is} type="text" name="district" value={form.district} onChange={handleChange} placeholder="e.g. Kampala" required /></div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                            <div><label style={ls}>School Phone</label><input style={is} type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="0414 XXX XXX" /></div>
                            <div><label style={ls}>School Email</label><input style={is} type="email" name="email" value={form.email} onChange={handleChange} placeholder="school@example.com" /></div>
                        </div>
                        <h4 style={{ color: '#0d904f', marginBottom: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>Admin Account</h4>
                        <div style={{ marginBottom: '10px' }}><label style={ls}>Admin Name *</label><input style={is} type="text" name="adminName" value={form.adminName} onChange={handleChange} placeholder="e.g. John Doe" required /></div>
                        <div style={{ marginBottom: '10px' }}><label style={ls}>Admin Email *</label><input style={is} type="email" name="adminEmail" value={form.adminEmail} onChange={handleChange} placeholder="admin@school.com" required /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <div><label style={ls}>Password *</label><input style={is} type="password" name="adminPassword" value={form.adminPassword} onChange={handleChange} placeholder="Min 8 chars, letters + numbers" required /></div>
                            <div><label style={ls}>Confirm Password *</label><input style={is} type="password" name="confirmPass" value={form.confirmPass} onChange={handleChange} required /></div>
                        </div>
                        <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#9aa0a6' : '#0d904f', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}>{loading ? 'Registering...' : 'Register School & Create Admin Account'}</button>
                    </form>
                    <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                        <p style={{ color: '#666', fontSize: '14px', margin: '0 0 5px 0' }}>Already have an account?</p>
                        <Link to="/login" style={{ color: '#1a73e8', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }}>Sign In Here</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}