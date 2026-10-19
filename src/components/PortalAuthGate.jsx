// FileName: src/components/PortalAuthGate.jsx
// Portal isolation gate. Wraps a portal page (Business / Church / Org / Individual)
// and enforces three rules:
//
//   1. DEVELOPER BYPASS — if the signed-in user is the developer
//      (waiswadaniel24@gmail.com), they can access ANY portal. This is the
//      "Apart from the developer's initials, no one can switch portals" rule.
//
//   2. PORTAL MATCH — non-developer users may only view the portal whose
//      `portalId` matches their `user.portal`. If they're signed in for a
//      DIFFERENT portal, we show an "Access denied — sign in for X" message
//      with a link to the correct login page.
//
//   3. SUBSCRIPTION / TRIAL — in cloud (Supabase) mode, non-developer users
//      whose trial has expired (and who have no active subscription) see a
//      "Subscription expired" message. Demo / localStorage mode has an
//      unlimited trial by design.
//
// Children render normally when all three checks pass (or when Supabase isn't
// configured AND no user is signed in — demo browsing mode).

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isSupabaseConfigured } from '../lib/supabase.js';

// Map portalId → that portal's login route + friendly name.
// Used to render "Sign in for X" links.
const PORTAL_LOGIN_ROUTES = {
    'business-portal': { name: 'Business / SME', loginRoute: '/login/business' },
    'church-portal': { name: 'Church / Religious Org', loginRoute: '/login/church' },
    'org-portal': { name: 'Org / NGO / CBO', loginRoute: '/login/org' },
    'individual-portal': { name: 'Individual / Personal', loginRoute: '/login/individual' },
};

const DEFAULT_PORTAL_NAME = 'this portal';
const DEFAULT_LOGIN_ROUTE = '/login/business';

function describePortal(portalId) {
    return PORTAL_LOGIN_ROUTES[portalId] || { name: DEFAULT_PORTAL_NAME, loginRoute: DEFAULT_LOGIN_ROUTE };
}

export default function PortalAuthGate({ portalId, accent = '#1a73e8', children }) {
    const auth = useAuth();
    const navigate = useNavigate();
    const user = auth?.user || null;
    const authReady = (auth && typeof auth.authReady !== 'undefined') ? auth.authReady : true;
    const trialDaysLeft = (auth && typeof auth.trialDaysLeft !== 'undefined') ? auth.trialDaysLeft : null;

    // While the auth state is still resolving (Supabase session fetch), show
    // a neutral loading message instead of flickering the gate on/off.
    if (!authReady) {
        return (
            <div style={{ padding: 60, textAlign: 'center', color: '#666', fontFamily: "'Segoe UI', sans-serif" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
                <div>Checking your session…</div>
            </div>
        );
    }

    // Demo / no-user browsing mode — let the portal render. (PublicRoute already
    // allows anonymous browsing; the gate only blocks SIGNED-IN cross-portal hops.)
    if (!user) {
        return <>{children}</>;
    }

    // Rule 1: Developer bypass — they can open any portal.
    const isDeveloper = Boolean(user.isDeveloper);
    if (isDeveloper) {
        return <>{children}</>;
    }

    // Rule 3: Subscription / trial check (cloud mode only).
    const subscriptionExpired = Boolean(
        isSupabaseConfigured
        && trialDaysLeft !== null
        && trialDaysLeft !== Number.POSITIVE_INFINITY
        && trialDaysLeft <= 0
        && !user.subscriptionActive
    );

    if (subscriptionExpired && user.portal === portalId) {
        // They're on the right portal but their trial has expired.
        const target = describePortal(portalId);
        return (
            <div style={wrapStyle(accent)}>
                <div style={cardStyle(accent)}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
                    <h1 style={{ margin: '0 0 12px', fontSize: 26, color: '#c62828' }}>Subscription expired</h1>
                    <p style={{ color: '#444', lineHeight: 1.6, fontSize: 15, margin: '0 0 20px' }}>
                        Your free trial for <strong>{target.name}</strong> has ended. Please renew your
                        subscription to regain access to {target.name}.
                    </p>
                    <p style={{ color: '#888', fontSize: 13, margin: '0 0 24px' }}>
                        Signed in as <strong>{user.email || user.username}</strong> for{' '}
                        <strong>{user.portal}</strong>.
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate('/saas-portal')} style={primaryBtn(accent)}>
                            View plans →
                        </button>
                        <button onClick={() => auth?.logout?.()} style={ghostBtn(accent)}>
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Rule 2: Cross-portal block — non-developer signed in for a different portal.
    if (user.portal && user.portal !== portalId) {
        const current = describePortal(user.portal);
        const target = describePortal(portalId);
        return (
            <div style={wrapStyle(accent)}>
                <div style={cardStyle(accent)}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>⛔</div>
                    <h1 style={{ margin: '0 0 12px', fontSize: 26, color: '#c62828' }}>Access denied</h1>
                    <p style={{ color: '#444', lineHeight: 1.6, fontSize: 15, margin: '0 0 20px' }}>
                        You are signed in for <strong>{current.name}</strong>. You can't switch to{' '}
                        <strong>{target.name}</strong> without signing out and signing in again.
                    </p>
                    <p style={{ color: '#888', fontSize: 13, margin: '0 0 24px' }}>
                        Signed in as <strong>{user.email || user.username}</strong> (portal: {user.portal}).
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate(current.loginRoute)} style={primaryBtn(accent)}>
                            Go to {current.name} sign in
                        </button>
                        <button onClick={() => navigate(target.loginRoute)} style={ghostBtn(accent)}>
                            Sign in for {target.name} instead
                        </button>
                        <button onClick={() => auth?.logout?.()} style={ghostBtn('#c62828')}>
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // All checks passed — render the portal content.
    return <>{children}</>;
}

// ─── Style helpers ──────────────────────────────────────────────────────
function wrapStyle(accent) {
    return {
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        fontFamily: "'Segoe UI', sans-serif",
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%)',
    };
}
function cardStyle(accent) {
    return {
        background: 'white',
        borderRadius: 16,
        padding: '40px 32px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 12px 44px rgba(0,0,0,0.12)',
        borderTop: '6px solid ' + accent,
    };
}
function primaryBtn(accent) {
    return {
        background: accent,
        color: 'white',
        border: 'none',
        borderRadius: 8,
        padding: '12px 20px',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
    };
}
function ghostBtn(borderColor) {
    return {
        background: 'transparent',
        color: borderColor,
        border: '1px solid ' + borderColor,
        borderRadius: 8,
        padding: '12px 20px',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
    };
}
