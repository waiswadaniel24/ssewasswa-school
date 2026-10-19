import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseUser, supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

function readLocal(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

function readUserFromStorage() {
  // Critical: restore user from localStorage on initial load.
  // This is REQUIRED for the desktop app (no Supabase configured) so that
  // the user persists across page reloads (login → navigate → page reload).
  // Without this, every page reload loses the user state → broken login flow.
  try {
    const stored = localStorage.getItem('erp_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch { /* storage unavailable or corrupt — fall through to null */ }
  return null;
}

export function AuthProvider({ children }) {
  // LAZY INITIAL STATE: read user from localStorage on first mount.
  // This is what makes login → page reload → still logged in work.
  const [user, setUser] = useState(readUserFromStorage);
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
    // NOTE: Do NOT do redirect logic here. The router's <RootRoute /> component
    // reactively reads user + isDeveloper from useAuth() and navigates to the
    // correct route (/app/dev for devs, /app for users). Earlier this function
    // did window.history.replaceState + dispatchEvent('popstate') in a setTimeout
    // to force a redirect — that caused blinking loops because popstate triggered
    // router re-syncs which collided with React's own state updates.
    // Callers (Login.jsx) should call navigate(?next) themselves after login.
  };

  const logout = async () => {
    // Sign out of Supabase (no-op in desktop mode where supabase is null)
    if (supabase) {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
    }
    setUser(null);
    try { localStorage.removeItem('erp_user'); } catch { /* storage unavailable */ }
    // Redirect to /login (the page reload is OK because logout explicitly clears state)
    window.location.assign('/login');
  };

  const switchSchool = (schoolId) => {
    setCurrentSchoolId(schoolId);
    try { localStorage.setItem('erp_school_id', String(schoolId)); } catch { /* storage unavailable */ }
    window.location.reload();
  };

  // ─── Supabase session listener (only when Supabase is configured) ───
  // In desktop mode (no Supabase), we rely on localStorage for session persistence
  // (see readUserFromStorage above). This useEffect is a no-op in desktop mode.
  useEffect(() => {
    if (!supabase) {
      // Desktop mode — no Supabase session to manage. User state already
      // restored from localStorage via the lazy initial useState above.
      setAuthReady(true);
      return undefined;
    }
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
