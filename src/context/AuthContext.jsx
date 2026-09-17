import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSupabaseUser, supabase } from '../lib/supabase.js';

var AuthContext = createContext({
    user: null, authReady: false, login: function() { /* no-op */ }, logout: function() { /* no-op */ },
    schoolLevel: 'Primary', setSchoolLevel: function() { /* no-op */ },
    currentSchoolId: 1, switchSchool: function() { /* no-op */ }, schools: []
});

export function AuthProvider(props) {
    var children = props.children;
    var [user, setUser] = useState(function() {
        if (supabase) return null;
        try { var s = localStorage.getItem('erp_user'); return s ? JSON.parse(s) : null; }
        catch (e) { return null; }
    });
    var [schoolLevel, setSchoolLevel] = useState(function() {
        try { return localStorage.getItem('erp_school_level') || 'Primary'; }
        catch (e) { return 'Primary'; }
    });
    var [currentSchoolId, setCurrentSchoolId] = useState(function() {
        try { return parseInt(localStorage.getItem('erp_school_id')) || 1; }
        catch (e) { return 1; }
    });
    var [schools, setSchools] = useState([]);
    var [authReady, setAuthReady] = useState(!supabase);

    var login = function(userData) {
        if (!userData || typeof userData !== 'object') return;
        var normalizedUser = {
            ...userData,
            id: userData.id ?? userData.user_id ?? null,
            username: userData.username || userData.email || 'User',
            role: userData.role || 'Staff'
        };
        setUser(normalizedUser);
        localStorage.setItem('erp_user', JSON.stringify(normalizedUser));
        if (normalizedUser.isDeveloper && window.location.pathname !== '/dev') {
            window.location.replace('/dev');
        }
    };
    var logout = function() { setUser(null); localStorage.removeItem('erp_user'); window.location.assign('/login'); };
    var switchSchool = function(schoolId) { setCurrentSchoolId(schoolId); localStorage.setItem('erp_school_id', String(schoolId)); window.location.reload(); };

    useEffect(function() {
        if (!supabase) return function() {};
        var cancelled = false;
        supabase.auth.getSession().then(function(result) {
            if (cancelled) return;
            if (result.data && result.data.session && result.data.session.user) {
                login(getSupabaseUser(result.data.session.user));
            } else {
                setUser(null);
                localStorage.removeItem('erp_user');
            }
            setAuthReady(true);
        }).catch(function() {
            if (!cancelled) setAuthReady(true);
        });
        var subscription = supabase.auth.onAuthStateChange(function(event, session) {
            if (cancelled) return;
            if (session && session.user) login(getSupabaseUser(session.user));
            if (event === 'SIGNED_OUT') setUser(null);
        });
        return function() { cancelled = true; subscription.data.subscription.unsubscribe(); };
    }, []);

    useEffect(function() {
        var cancelled = false;
        var syncLevel = async function() {
            if (!window.electronAPI || !window.electronAPI.queryDatabase) return;
            try {
                var result = await window.electronAPI.queryDatabase("SELECT value FROM system_settings WHERE key = 'school_level'");
                if (!cancelled && result && result.success && result.data && result.data.length > 0) {
                    var level = result.data[0].value;
                    if (level && level !== schoolLevel) { setSchoolLevel(level); localStorage.setItem('erp_school_level', level); }
                }
            } catch (e) { /* settings not available yet */ }
        };
        var loadSchools = async function() {
            if (!window.electronAPI || !window.electronAPI.queryDatabase) return;
            try {
                var r = await window.electronAPI.queryDatabase("SELECT id, school_name, emis_number, school_level FROM schools WHERE is_active = 1 ORDER BY school_name");
                if (!cancelled && r && r.success && Array.isArray(r.data)) { setSchools(r.data); }
            } catch (e) { /* schools table might not exist yet */ }
        };
        syncLevel(); loadSchools();
        var interval = setInterval(syncLevel, 30000);
        return function() { cancelled = true; clearInterval(interval); };
    }, [schoolLevel]);

    return React.createElement(AuthContext.Provider, {
        value: { user: user, login: login, logout: logout, authReady: authReady, schoolLevel: schoolLevel, setSchoolLevel: setSchoolLevel, currentSchoolId: currentSchoolId, switchSchool: switchSchool, schools: schools }
    }, children);
}

export function useAuth() { return useContext(AuthContext); }
export { AuthContext };


