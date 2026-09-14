// FileName: src/components/SchoolBranding.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: School branding settings — logo, badge, motto, slogan, scripture

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Allowed image types (excludes SVG which can contain scripts)
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB for logos (smaller than photos)

export default function SchoolBranding() {
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logo, setLogo] = useState(null);
    const [badge, setBadge] = useState(null);
    const [form, setForm] = useState({
        motto: '',
        slogan: '',
        scripture: ''
    });
    const [uploading, setUploading] = useState(null); // 'logo' | 'badge' | null

    const logoInputRef = useRef(null);
    const badgeInputRef = useRef(null);
    const mountedRef = useRef(true);
    const msgTimerRef = useRef(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
        };
    }, []);

    const showMessage = useCallback((text) => {
        if (!mountedRef.current) return;
        setMsg(text);
        if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
        msgTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setMsg('');
        }, 4000);
    }, []);

    // ─── Load branding settings from database ──────────────────
    const loadBranding = useCallback(async () => {
        if (!window.electronAPI) {
            showMessage('Electron API not available');
            setLoading(false);
            return;
        }

        try {
            const r = await window.electronAPI.queryDatabase(
                "SELECT key, value FROM system_settings WHERE key IN ('school_motto','school_slogan','school_scripture','school_logo','school_badge')"
            );

            if (!mountedRef.current) return;

            if (!r || !r.success || !r.data || !Array.isArray(r.data)) {
                showMessage('Failed to load branding settings');
                setLoading(false);
                return;
            }

            const settings = { /* no-op */ };
            r.data.forEach((row) => {
                if (row && row.key) settings[row.key] = row.value;
            });

            if (!mountedRef.current) return;

            setForm({
                motto: settings.school_motto || '',
                slogan: settings.school_slogan || '',
                scripture: settings.school_scripture || ''
            });

            // Load logo image
            if (settings.school_logo) {
                try {
                    const p = await window.electronAPI.getPhoto(settings.school_logo);
                    if (mountedRef.current && p && p.success && p.data) {
                        setLogo(p.data);
                    }
                } catch (e) {
                    console.error('SchoolBranding: logo load error:', e.message);
                }
            }

            // Load badge image
            if (settings.school_badge) {
                try {
                    const p = await window.electronAPI.getPhoto(settings.school_badge);
                    if (mountedRef.current && p && p.success && p.data) {
                        setBadge(p.data);
                    }
                } catch (e) {
                    console.error('SchoolBranding: badge load error:', e.message);
                }
            }
        } catch (err) {
            console.error('SchoolBranding: load error:', err.message);
            if (mountedRef.current) {
                showMessage('Error loading branding data');
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [showMessage]);

    useEffect(() => {
        loadBranding();
    }, [loadBranding]);

    // ─── Handle image upload (logo or badge) ────────────────────
    const handleUpload = async (file, type) => {
        if (!file) return;

        // Validate file type (strict — no SVG)
        if (!ALLOWED_TYPES.includes(file.type)) {
            showMessage('Please select a JPG, PNG, GIF, or WebP image.');
            return;
        }

        // Validate file size
        if (file.size > MAX_SIZE) {
            showMessage('File size must be under 2MB for logos/badges.');
            return;
        }

        setUploading(type);

        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const base64Data = e.target.result;

                    // Save to file system
                    const saveResult = await window.electronAPI.savePhoto({
                        base64: base64Data,
                        category: type,
                        id: 1
                    });

                    if (!mountedRef.current) {
                        resolve(false);
                        return;
                    }

                    if (!saveResult || !saveResult.success) {
                        showMessage('Error saving file: ' + ((saveResult && saveResult.error) || 'Unknown error'));
                        resolve(false);
                        return;
                    }

                    // Save filename to database
                    const dbResult = await window.electronAPI.queryDatabase(
                        'INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)',
                        ['school_' + type, saveResult.filename]
                    );

                    if (!mountedRef.current) {
                        resolve(false);
                        return;
                    }

                    if (!dbResult || !dbResult.success) {
                        showMessage('Error saving to database');
                        resolve(false);
                        return;
                    }

                    // Update preview
                    if (type === 'logo') {
                        setLogo(base64Data);
                        if (logoInputRef.current) logoInputRef.current.value = '';
                    } else {
                        setBadge(base64Data);
                        if (badgeInputRef.current) badgeInputRef.current.value = '';
                    }

                    showMessage((type === 'logo' ? 'Logo' : 'Badge') + ' saved successfully!');
                    resolve(true);
                } catch (err) {
                    console.error('SchoolBranding: upload error:', err.message);
                    if (mountedRef.current) {
                        showMessage('Error: ' + err.message);
                    }
                    resolve(false);
                } finally {
                    if (mountedRef.current) setUploading(null);
                }
            };

            reader.onerror = () => {
                if (mountedRef.current) {
                    showMessage('Failed to read file');
                    setUploading(null);
                }
                resolve(false);
            };

            reader.readAsDataURL(file);
        });
    };

    // ─── Save text fields (motto, slogan, scripture) ───────────
    const handleSaveText = async () => {
        setSaving(true);

        try {
            const results = await Promise.all([
                window.electronAPI.queryDatabase(
                    "INSERT OR REPLACE INTO system_settings (key, value) VALUES ('school_motto', ?)",
                    [form.motto]
                ),
                window.electronAPI.queryDatabase(
                    "INSERT OR REPLACE INTO system_settings (key, value) VALUES ('school_slogan', ?)",
                    [form.slogan]
                ),
                window.electronAPI.queryDatabase(
                    "INSERT OR REPLACE INTO system_settings (key, value) VALUES ('school_scripture', ?)",
                    [form.scripture]
                )
            ]);

            if (!mountedRef.current) return;

            const allSuccess = results.every((r) => r && r.success);
            if (allSuccess) {
                showMessage('Branding saved! Appears on all printed documents.');
            } else {
                const failedCount = results.filter((r) => !r || !r.success).length;
                showMessage('Error: ' + failedCount + ' setting(s) failed to save');
            }
        } catch (err) {
            console.error('SchoolBranding: save error:', err.message);
            if (mountedRef.current) {
                showMessage('Error saving: ' + err.message);
            }
        } finally {
            if (mountedRef.current) setSaving(false);
        }
    };

    // ─── Determine if message is an error ───────────────────────
    const isError = msg && (
        msg.includes('Error') ||
        msg.includes('Failed') ||
        msg.includes('under') ||
        msg.includes('valid') ||
        msg.includes('select')
    );

    // ─── Upload box renderer ────────────────────────────────────
    const renderUploadBox = (type, image, inputRef, label, icon) => (
        <div style={{ textAlign: 'center' }}>
            <label style={{
                cursor: uploading === type ? 'wait' : 'pointer',
                display: 'inline-block'
            }}>
                <div style={{
                    width: 120,
                    height: 120,
                    borderRadius: 12,
                    border: `2px dashed ${uploading === type ? '#1a73e8' : '#dadce0'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    background: '#fafafa',
                    opacity: uploading === type ? 0.6 : 1,
                    position: 'relative',
                    transition: 'border-color 0.2s, opacity 0.2s'
                }}
                    onMouseEnter={(e) => {
                        if (uploading !== type) e.currentTarget.style.borderColor = '#1a73e8';
                    }}
                    onMouseLeave={(e) => {
                        if (uploading !== type) e.currentTarget.style.borderColor = '#dadce0';
                    }}
                >
                    {/* Loading overlay */}
                    {uploading === type && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.8)',
                            zIndex: 1
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                border: '3px solid #e0e0e0',
                                borderTopColor: '#1a73e8',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite'
                            }} />
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    {image ? (
                        <img
                            src={image}
                            alt={label}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                            }}
                        />
                    ) : (
                        <span style={{ fontSize: '28px' }}>{icon}</span>
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                    disabled={uploading === type}
                    onChange={(e) => handleUpload(e.target.files[0], type)}
                />
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '6px', margin: '6px 0 0 0' }}>
                {label}
            </p>
            <p style={{ fontSize: '10px', color: '#999', margin: '2px 0 0 0' }}>
                Max 2MB • JPG, PNG, GIF, WebP
            </p>
        </div>
    );

    // ─── Loading state ──────────────────────────────────────────
    if (loading) {
        return (
            <div className="card">
                <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid #e0e0e0',
                        borderTopColor: '#1a73e8',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 12px'
                    }} />
                    <p style={{ color: '#666', fontSize: '14px' }}>Loading branding settings...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">School Branding (Logos, Motto, Scripture)</div>
            <div className="card-body">
                {/* ─── Message ──────────────────────────────────── */}
                {msg && (
                    <div style={{
                        color: isError ? '#d93025' : '#0d652d',
                        marginBottom: '15px',
                        fontSize: '13px',
                        padding: '8px 12px',
                        background: isError ? '#fce8e6' : '#e6f4ea',
                        borderRadius: '6px',
                        border: '1px solid ' + (isError ? '#f5c6cb' : '#c3e6cb'),
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>{isError ? '⚠️' : '✅'}</span>
                        {msg}
                    </div>
                )}

                {/* ─── Description ─────────────────────────────── */}
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                    These appear on all printed documents: report cards, letters,
                    certificates, meeting minutes, ID cards.
                </p>

                {/* ─── Logo + Badge Upload ───────────────────────── */}
                <div style={{
                    display: 'flex',
                    gap: '40px',
                    justifyContent: 'center',
                    marginBottom: '24px'
                }}>
                    {renderUploadBox('logo', logo, logoInputRef, 'School Logo', '📷')}
                    {renderUploadBox('badge', badge, badgeInputRef, 'School Badge/Crest', '🏅')}
                </div>

                {/* ─── Text Fields ──────────────────────────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    maxWidth: '600px'
                }}>
                    <div className="form-group">
                        <label className="form-label">School Motto</label>
                        <input
                            className="form-input"
                            value={form.motto}
                            onChange={(e) => setForm({ ...form, motto: e.target.value })}
                            placeholder="e.g. Education for Excellence"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">School Slogan</label>
                        <input
                            className="form-input"
                            value={form.slogan}
                            onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                            placeholder="e.g. Nurturing Future Leaders"
                        />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">
                            Scripture / Quote / Saying (appears on all documents)
                        </label>
                        <input
                            className="form-input"
                            value={form.scripture}
                            onChange={(e) => setForm({ ...form, scripture: e.target.value })}
                            placeholder='e.g. "Fear of the Lord is the beginning of wisdom" - Proverbs 9:10'
                        />
                    </div>
                </div>

                {/* ─── Save Button ──────────────────────────────── */}
                <button
                    className="btn btn-primary"
                    style={{ marginTop: '10px' }}
                    onClick={handleSaveText}
                    disabled={saving}
                >
                    {saving ? '⏳ Saving...' : '💾 Save Branding'}
                </button>
            </div>
        </div>
    );
}
