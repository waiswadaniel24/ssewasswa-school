import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseUser, supabase, isSupabaseConfigured } from '../lib/supabase.js';

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

// ─── Portal isolation constants ──────────────────────────────────────
// Trial window (days) — after this, non-developer portal users must have
// an active subscription (checked at the portal gate). In demo / localStorage
// mode (no Supabase), trial is unlimited — see checkPortalAccess below.
const TRIAL_DAYS = 14;
const DEVELOPER_EMAIL = 'waiswadaniel24@gmail.com';

// All localStorage keys we use for portal session scoping — cleared on logout
// so a user cannot jump from one portal to another without re-authenticating.
const PORTAL_LS_PREFIXES = ['erp_portal_user_', 'erp_business_', 'erp_church_', 'erp_org_', 'erp_individual_'];

function clearPortalLocalStorage() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (PORTAL_LS_PREFIXES.some((p) => key.startsWith(p))) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
}

// Compute trial days left from a user's created_at timestamp.
// Returns null when created_at is missing (treat as unlimited) so the
// gate never accidentally locks out a brand-new account that hasn't synced
// its created_at yet.
function computeTrialDaysLeft(user) {
  if (!user) return null;
  if (user.isDeveloper) return Number.POSITIVE_INFINITY;
  if (!user.created_at) return null;
  try {
    const created = new Date(user.created_at).getTime();
    if (!Number.isFinite(created)) return null;
    const now = Date.now();
    const elapsedDays = Math.floor((now - created) / (24 * 60 * 60 * 1000));
    return TRIAL_DAYS - elapsedDays;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  // LAZY INITIAL STATE: read user from localStorage on first mount.
  // This is what makes login → page reload → still logged in work.
  const [user, setUser] = useState(readUserFromStorage);
  const [authReady, setAuthReady] = useState(!supabase);
  const [schoolLevel, setSchoolLevel] = useState(() => readLocal('erp_school_level', 'Primary'));
  const [currentSchoolId, setCurrentSchoolId] = useState(() => readLocal('erp_school_id', '1') || '1');
  const [schools, setSchools] = useState([]);

  const login = (userData) => {
    if (!userData) return;
    // Normalize so portal-scoping fields survive round-trips through localStorage
    // and downstream portal gates can read user.portal / user.isDeveloper reliably.
    const normalized = {
      ...userData,
      id: userData.id || userData.user_id || null,
      username: userData.username || userData.email || 'User',
      email: userData.email || '',
      role: userData.role || 'Staff',
      // Explicitly preserve portal-scoping + developer bypass fields so that
      // a user signed in for one portal cannot be silently re-scoped to another.
      portal: userData.portal || userData.user_metadata?.portal || null,
      isDeveloper: Boolean(
        userData.isDeveloper ||
        (typeof userData.email === 'string' && userData.email.toLowerCase() === DEVELOPER_EMAIL)
      ),
      created_at: userData.created_at || userData.user_metadata?.created_at || null,
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
    // ─── Portal isolation: clear all portal-scoped localStorage ─────────
    // Prevents a user from hopping from one portal to another without signing
    // in again. erp_user is already removed above; clear erp_portal_user_*
    // plus the per-portal data buckets so the next portal session is clean.
    clearPortalLocalStorage();
    // Redirect to /login (the page reload is OK because logout explicitly clears state)
    window.location.assign('/login');
  };

  // ─── Portal isolation helper ────────────────────────────────────────
  // Returns true if the current user is allowed to access the given portal.
  //   • Developer → always allowed (bypass)
  //   • User signed in for that portal → allowed
  //   • Demo mode (no Supabase configured) → trial is unlimited; allowed
  //   • Otherwise (cross-portal or expired trial + no subscription) → false
  //
  // `portalId` should be the portal.id from a PortalLogin portal prop
  // (e.g. 'business-portal', 'church-portal', 'org-portal', 'individual-portal').
  const checkPortalAccess = (portalId) => {
    if (!portalId) return false;
    if (!user) return false;
    if (user.isDeveloper) return true;
    if (user.portal === portalId) {
      // Same portal — also gate on subscription / trial expiry (only when
      // Supabase is configured; demo mode trial is unlimited).
      if (isSupabaseConfigured) {
        const daysLeft = computeTrialDaysLeft(user);
        if (daysLeft !== null && !Number.isFinite(daysLeft) && daysLeft !== Number.POSITIVE_INFINITY) {
          // shouldn't happen — defensive
        }
        if (daysLeft !== null && daysLeft <= 0 && !user.subscriptionActive) {
          return false;
        }
      }
      return true;
    }
    return false;
  };

  // Convenience: trial days left for the current user (Number.POSITIVE_INFINITY
  // for developer, null when unknown, otherwise an integer).
  const trialDaysLeft = useMemo(() => computeTrialDaysLeft(user), [user]);

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

  const value = useMemo(() => ({ user, login, logout, authReady, schoolLevel, setSchoolLevel, currentSchoolId, switchSchool, schools, checkPortalAccess, trialDaysLeft, isSupabaseConfigured }), [user, authReady, schoolLevel, currentSchoolId, schools, trialDaysLeft]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
export { AuthContext };
export default AuthContext;
