import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'google_site_verification_token';

function extractToken(value) {
    const text = String(value || '').trim();
    const contentMatch = text.match(/content=["']([^"']+)["']/i);
    if (contentMatch) return contentMatch[1].trim();
    const equalsMatch = text.match(/google-site-verification\s*[=:]\s*([\w-]+)/i);
    return equalsMatch ? equalsMatch[1].trim() : text.replace(/\s+/g, '');
}

function applyVerificationToken(token) {
    if (!token) return;
    let tag = document.querySelector('meta[name="google-site-verification"]');
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'google-site-verification');
        document.head.appendChild(tag);
    }
    tag.setAttribute('content', token);
}

export default function DevDashboard() {
    const [verificationInput, setVerificationInput] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const saved = window.localStorage.getItem(STORAGE_KEY) || '';
        setVerificationInput(saved);
        if (saved) applyVerificationToken(saved);
    }, []);

    const saveVerification = (event) => {
        event.preventDefault();
        const token = extractToken(verificationInput);
        if (!token) {
            setMessage('Paste the Google verification meta tag or token first.');
            return;
        }
        window.localStorage.setItem(STORAGE_KEY, token);
        applyVerificationToken(token);
        setVerificationInput(token);
        setMessage('Saved for this app. Publish a new deployment, then click Verify in Google Search Console.');
    };

    return (
        <main className="page-container">
            <h1 className="page-title">Developer Dashboard</h1>
            <section className="card" aria-labelledby="developer-tools-title">
                <div className="card-body">
                    <h2 id="developer-tools-title">Developer tools and diagnostics</h2>
                    <p>These tools are restricted to the developer route.</p>
                </div>
            </section>

            <section className="card" aria-labelledby="google-verification-title" style={{ marginTop: '16px' }}>
                <div className="card-body">
                    <h2 id="google-verification-title">Google Search Console verification</h2>
                    <p>Paste the complete meta tag Google gives you, or paste only its verification token.</p>
                    <form onSubmit={saveVerification}>
                        <label htmlFor="google-verification" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                            Google verification code
                        </label>
                        <textarea
                            id="google-verification"
                            value={verificationInput}
                            onChange={(event) => setVerificationInput(event.target.value)}
                            placeholder={'<meta name="google-site-verification" content="..." />'}
                            rows={4}
                            style={{ width: '100%', maxWidth: '720px', padding: '12px', border: '1px solid #c7cbd1', borderRadius: '8px', font: 'inherit', resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                            <button className="btn btn-primary" type="submit">Save verification code</button>
                            <a className="btn btn-secondary" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Open Search Console</a>
                        </div>
                    </form>
                    {message && <p role="status" style={{ marginTop: '12px', color: '#176b3a' }}>{message}</p>}
                    <p style={{ marginTop: '12px', color: '#5f6368', fontSize: '0.92rem' }}>
                        Important: Google can only read this after the updated project is deployed at your public Vercel URL. Saving here updates the live page head in the browser and remembers the token for this device; it does not replace publishing the deployment.
                    </p>
                </div>
            </section>
        </main>
    );
}

