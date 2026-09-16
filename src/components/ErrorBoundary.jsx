import React from 'react';
export default class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error: error }; }
    componentDidCatch(error, errorInfo) { console.error('Application Crash:', error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                    <h1 style={{ color: '#d32f2f', marginBottom: '10px' }}>⚠️ System Hiccup</h1>
                    <p style={{ color: '#555', marginBottom: '20px' }}>The application encountered an unexpected error. You can try reloading.</p>
                    <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>Reload Application</button>
                </div>
            );
        }
        return this.props.children;
    }
}