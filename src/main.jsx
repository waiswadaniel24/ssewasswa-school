import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import AppRouter from "./router/router.jsx";

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
    React.createElement(AuthProvider, null, React.createElement(App, null))
  )
);
