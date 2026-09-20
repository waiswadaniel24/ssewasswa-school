import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseUser, supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

function readLocal(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [schoolLevel, setSchoolLevel] = useState(() => readLocal('erp_school_level', 'Primary'));
  const [currentSchoolId, setCurrentSchoolId] = useState(() => Number(readLocal('erp_school_id', '1')) || 1);
  const [schools, setSchools] = useState([]);

  const login = (userData) => {
    if (!userData) return;
    const normalized = {
      ...userData,
      id: userData.id || userData.user_id || null,
      username: userData.username || userData.email || 'User',
      role: userData.role || 'Staff',
    };
    setUser(normalized);
    try { localStorage.setItem('erp_user', JSON.stringify(normalized)); } catch { /* storage unavailable */ }
    if (normalized.isDeveloper && window.location.pathname !== '/dev') window.location.replace('/dev');
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    try { localStorage.removeItem('erp_user'); } catch { /* storage unavailable */ }
    window.location.assign('/login');
  };

  const switchSchool = (schoolId) => {
    setCurrentSchoolId(schoolId);
    try { localStorage.setItem('erp_school_id', String(schoolId)); } catch { /* storage unavailable */ }
    window.location.reload();
  };

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user) login(getSupabaseUser(data.session.user));
      setAuthReady(true);
    }).catch(() => active && setAuthReady(true));
    const authStateChange = supabase.auth.onAuthStateChange;
    const listener = typeof authStateChange === 'function'
      ? authStateChange.call(supabase.auth, (_event, session) => {
          if (!active) return;
          if (session?.user) login(getSupabaseUser(session.user));
          else setUser(null);
          setAuthReady(true);
        })
      : null;
    return () => {
      active = false;
      listener?.data?.subscription?.unsubscribe?.();
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const query = async (sql) => window.electronAPI?.queryDatabase?.(sql);
    Promise.all([
      query("SELECT value FROM system_settings WHERE key = 'school_level'"),
      query('SELECT id, school_name, emis_number, school_level FROM schools WHERE is_active = 1 ORDER BY school_name'),
    ]).then(([settings, schoolRows]) => {
      if (!active) return;
      const level = settings?.success && settings.data?.[0]?.value;
      if (level) { setSchoolLevel(level); try { localStorage.setItem('erp_school_level', level); } catch {} }
      if (schoolRows?.success && Array.isArray(schoolRows.data)) setSchools(schoolRows.data);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({ user, login, logout, authReady, schoolLevel, setSchoolLevel, currentSchoolId, switchSchool, schools }), [user, authReady, schoolLevel, currentSchoolId, schools]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
export { AuthContext };
export default AuthContext;
