import { Toaster } from 'react-hot-toast';
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import AppRouter from "./router/router.jsx";

// ═══════════════════════════════════════════════════════════════════
// WEB-MODE SHIM for window.electronAPI
// ═══════════════════════════════════════════════════════════════════
// On web (Cloudflare Pages / Vercel), window.electronAPI is undefined
// because the Electron preload script doesn't run. Many pages call
// window.electronAPI.queryDatabase(...) or window.electronAPI.getSignature(...)
// without checking — those calls throw "cannot access property X of undefined"
// → "Module Failed to Load" error → page crashes.
//
// This shim provides a JavaScript Proxy that returns safe defaults for
// ANY method call. Pages get empty arrays / null data instead of crashing.
// On desktop (Electron), the real preload.js exposes window.electronAPI
// BEFORE main.jsx runs, so this shim is skipped.
if (typeof window !== 'undefined' && !window.electronAPI) {
  // ─── ELECTRON-ONLY METHODS ─────────────────────────────────────
  // These methods should NOT exist on web. Returning `undefined` (NOT a function)
  // means `typeof window.electronAPI.authLogin === 'function'` correctly returns
  // false on web → caller code (Login.jsx, SystemSetup.jsx, Activation.jsx)
  // detects web mode and falls through to the Supabase branch.
  //
  // Earlier bug: the shim returned a DEFAULT_STUB function for ALL methods,
  // including authLogin. Login.jsx did `typeof window.electronAPI.authLogin === 'function'`
  // → got true → took the Electron branch → called the stub → got "Desktop only" error
  // → web users couldn't sign in.
  //
  // Fix: explicitly return undefined for these methods. Pages that check
  // `typeof window.electronAPI.X === 'function'` will correctly see false → fall through.
  const ELECTRON_ONLY_METHODS = new Set([
    'authLogin',              // desktop local auth (Login.jsx checks this)
    'auth-add-user',          // desktop add user
    'auth-setup',              // desktop auth setup
    'auth-reset-password-via-question',
    'auth-get-security-question',
    'addUser',                // desktop user management
    'deleteUser',
    'activateLicense',        // desktop license activation (Activation.jsx)
    'validateLicenseKey',
    'checkLicense',           // careful — was in KNOWN_STUBS, but we want a real stub for it
    'backupDatabase',         // desktop DB backup
    'restoreDatabase',
    'backupToGmail',
    'getLicenseTier',
    'generatePaycodes',
    'generateLicenseForHwid',
    'submit-helpdesk-ticket',
    'send-bulk-sms',         // desktop SMS via Africa's Talking
    'staff-clock-in',
    'log-sickbay',
    'createPurchaseRequest',
    'authorizePurchase',
    'confirm-bank-payment',
    'create-bank-payment',
    'confirmManualPayment',
    'check-payment-status',
  ]);

  // Known methods that need specific return shapes (NOT in ELECTRON_ONLY_METHODS)
  const KNOWN_STUBS = {
    checkInitialized: async () => ({ success: true, data: false }),
    checkLicense: async () => ({ success: false, isTrial: false, daysLeft: 0, note: 'Web mode — license not enforced. Use desktop app for trial enforcement.' }),
    getHwid: async () => 'web-browser-' + Math.random().toString(36).slice(2, 10),
    // Event listener stubs (return undefined; never call the callback)
    onUpdateAvailable: () => {}, onUpdateDownloaded: () => {},
    onUpdateDownloadProgress: () => {}, onUpdateError: () => {},
    onUpdateShowDialog: () => {},
    onUpdateNotAvailable: () => {},
    // Auto-update stubs (return "not available")
    checkForUpdates: async () => ({ success: false, error: 'Web mode — no auto-update' }),
    downloadUpdate: async () => ({ success: false, error: 'Web mode — no auto-update' }),
    installUpdate: async () => ({ success: false, error: 'Web mode — no auto-update' }),
    getUpdateStatus: async () => ({ updateAvailable: false }),
    // Sync stubs
    syncNow: async () => ({ success: false, error: 'Web mode — sync available on desktop only' }),
    getSyncStatus: async () => ({ lastSyncAt: null, syncing: false, supabaseConfigured: false }),
    startAutoSync: async () => ({ success: false }),
    stopAutoSync: async () => ({ success: false }),
    // queryDatabase — return empty results gracefully (HMIS pages + others use this for SELECTs)
    queryDatabase: async (sql, params) => {
      const upperSql = String(sql || '').trim().toUpperCase();
      if (upperSql.startsWith('SELECT') || upperSql.startsWith('PRAGMA')) {
        return { success: true, data: [] };  // empty array for SELECTs
      }
      return { success: false, data: null, error: 'Web mode — DB writes not available' };
    },
    // getSignature — return null gracefully (SignatureManagement.jsx uses this)
    getSignature: async () => ({ success: false, data: null }),
    getSignatureAssignments: async () => ({ success: false, data: [] }),
    saveSignature: async () => ({ success: false, error: 'Desktop only' }),
    saveSignatureAssignment: async () => ({ success: false }),
    // Photo + document handlers
    savePhoto: async () => ({ success: false, error: 'Desktop only' }),
    getPhoto: async () => ({ success: false, data: null }),
    deletePhoto: async () => ({ success: false }),
    saveDocument: async () => ({ success: false }),
    getDocument: async () => ({ success: false, data: null }),
    deleteDocument: async () => ({ success: false }),
  };

  // Default stub for any unknown method — returns safe empty result
  // BUT only if the method is NOT in ELECTRON_ONLY_METHODS (those return undefined)
  const DEFAULT_STUB = async (...args) => ({
    success: false,
    data: Array.isArray(args[0]) ? [] : null,
    error: 'Desktop only — feature not available on web. Run via Electron app to use this.'
  });

  window.electronAPI = new Proxy(KNOWN_STUBS, {
    get(target, prop) {
      // 1. If it's an ELECTRON_ONLY_METHOD, return undefined (NOT a function)
      //    so caller-side typeof === 'function' checks return false → fall through to web branch
      if (ELECTRON_ONLY_METHODS.has(prop)) {
        return undefined;
      }
      // 2. If it's a known stub, return it
      if (prop in target) return target[prop];
      // 3. For event listener methods (start with 'on'), return a no-op
      if (typeof prop === 'string' && prop.startsWith('on')) return () => {};
      // 4. Default: return the stub function (for IPC methods we don't know about)
      return DEFAULT_STUB;
    }
  });
  console.log('[Shim] Web-mode electronAPI stub installed (ELECTRON_ONLY_METHODS return undefined → web fallback works)');
}


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("App Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement(
        "div",
        {
          style: {
            padding: "40px",
            fontFamily: "sans-serif",
            background: "#fff3e0",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              background: "white",
              borderRadius: "16px",
              padding: "40px",
              maxWidth: "600px",
              width: "90%",
              boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
            },
          },
          React.createElement("h1", { style: { color: "#d32f2f" } }, "Application Error"),
          React.createElement(
            "pre",
            {
              style: {
                background: "#f8f9fa",
                padding: "16px",
                borderRadius: "8px",
                marginTop: "20px",
                overflow: "auto",
                maxHeight: "200px",
              },
            },
            this.state.error ? this.state.error.toString() : "Unknown error"
          ),
          React.createElement(
            "button",
            {
              onClick: function () {
                window.location.reload();
              },
              style: {
                padding: "10px 24px",
                background: "#1a73e8",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                marginTop: "20px",
              },
            },
            "Reload Application"
          )
        )
      );
    }
    return this.props.children;
  }
}

function App() {
  var [isInitialized, setIsInitialized] = useState(null);
  var [isLocked, setIsLocked] = useState(false);
  var [checking, setChecking] = useState(true);
  var mountedRef = useRef(true);

  useEffect(function () {
    mountedRef.current = true;
    return function () {
      mountedRef.current = false;
    };
  }, []);

  useEffect(function () {
    var checkStatus = async function () {
      if (!window.electronAPI) {
        if (mountedRef.current) {
          setChecking(false);
          setIsInitialized(false);
        }
        return;
      }

      try {
        var init = await window.electronAPI.checkInitialized();
        var hasUser = init && init.success && init.data === true;
        if (!mountedRef.current) return;
        setIsInitialized(hasUser);

        if (hasUser) {
          try {
            var licRes = await window.electronAPI.checkLicense();
            if (!mountedRef.current) return;
            if (!licRes.success) {
              if (licRes.isTrial) {
                setIsLocked(false);
              } else {
                setIsLocked(true);
              }
            }
          } catch (e) {
            console.error("License check error:", e.message);
          }
        }
      } catch (e) {
        console.error("Status check error:", e.message);
        if (mountedRef.current) setIsInitialized(false);
      }

      if (mountedRef.current) setChecking(false);
    };

    checkStatus();
  }, []);

  if (checking) {
    return React.createElement(
      "div",
      {
        style: {
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "20px",
          fontFamily: "sans-serif",
        },
      },
      React.createElement("div", {
        style: {
          width: "50px",
          height: "50px",
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #1a73e8",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        },
      }),
      React.createElement("h2", { style: { color: "#666" } }, "Loading System..."),
      React.createElement(
        "style",
        null,
        "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }"
      )
    );
  }

  // === FORCE SETUP CHECK ===
  // If user clicked "Create New Account" on login page,
  // this flag is set in localStorage
  var forceSetup = false;
  try {
    forceSetup = localStorage.getItem("erp_force_setup") === "true";
  } catch (e) {
    /* localStorage not available */
  }

  // If forceSetup is true, pretend the system is NOT initialized
  // so the router shows the setup page
  var effectiveInitialized = forceSetup ? false : isInitialized;

  // Only clear forceSetup AFTER the user completes setup
  // (This happens in SystemSetup.jsx when authSetup succeeds)
  // Do NOT clear it here — that would break the redirect

  return React.createElement(
    ErrorBoundary,
    null,
    React.createElement(AppRouter, {
      isInitialized: effectiveInitialized,
      isLocked: isLocked,
    })
  );
}

var root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(React.StrictMode, null, React.createElement(AuthProvider, null, React.createElement(App, null)), React.createElement(Toaster, { position: 'top-right', toastOptions: { duration: 4000 } }))
  )
);

// Register service worker for PWA + offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[SW] Registered with scope:', reg.scope);
    }).catch((err) => {
      console.log('[SW] Registration failed:', err);
    });
  });
}
