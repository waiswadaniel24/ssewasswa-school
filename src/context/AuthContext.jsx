import React, { createContext, useState, useEffect, useContext } from 'react';

var AuthContext = createContext({
    user: null, login: function() { /* no-op */ }, logout: function() { /* no-op */ },
    schoolLevel: 'Primary', setSchoolLevel: function() { /* no-op */ },
    currentSchoolId: 1, switchSchool: function() { /* no-op */ }, schools: []
});

export function AuthProvider(props) {
    var children = props.children;
    var [user, setUser] = useState(function() {
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

    var login = function(userData) { setUser(userData); localStorage.setItem('erp_user', JSON.stringify(userData)); };
    var logout = function() { setUser(null); localStorage.removeItem('erp_user'); window.location.hash = '#/login'; };
    var switchSchool = function(schoolId) { setCurrentSchoolId(schoolId); localStorage.setItem('erp_school_id', String(schoolId)); window.location.reload(); };

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
        value: { user: user, login: login, logout: logout, schoolLevel: schoolLevel, setSchoolLevel: setSchoolLevel, currentSchoolId: currentSchoolId, switchSchool: switchSchool, schools: schools }
    }, children);
}

export function useAuth() { return useContext(AuthContext); }
export { AuthContext };


