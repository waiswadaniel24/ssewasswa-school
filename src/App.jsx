import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import { AuthProvider } from './context/AuthContext.jsx';
import AppRouter from './router/router.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#fff3e0', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#d32f2f' }}>ðŸš¨ Application Error</h1>
          <pre style={{ background: 'white', padding: '20px', borderRadius: '8px', marginTop: '20px', overflow: 'auto' }}>
            {this.state.error?.message}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', fontSize: '16px', marginTop: '20px', cursor: 'pointer', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px' }}>
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [isInitialized, setIsInitialized] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      if (!window.electronAPI) {
        setChecking(false);
        setIsInitialized(false);
        return;
      }

      try {
        const init = await window.electronAPI.checkInitialized();
        const hasUser = init.success && init.data === true;
        setIsInitialized(hasUser);

        if (hasUser) {
          const licRes = await window.electronAPI.checkLicense();
          if (!licRes.success && !licRes.isTrial) {
            setIsLocked(true);
          }
        }
      } catch (error) {
        console.error('Status check error:', error);
        setIsInitialized(false);
      }
      setChecking(false);
    };

    checkStatus();
  }, []);

  if (checking) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', flexDirection: 'column', gap: '20px' }}>
        <div style={{ width: '50px', height: '50px', border: '4px solid #f3f3f3', borderTop: '4px solid #1a73e8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <h2 style={{ color: '#666' }}>Loading System...</h2>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppRouter isInitialized={isInitialized} isLocked={isLocked} />
    </ErrorBoundary>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
