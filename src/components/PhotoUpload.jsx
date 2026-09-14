// FileName: src/components/PhotoUpload.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Reusable photo upload component with preview, save, and remove

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Allowed image MIME types (excludes SVG which can contain scripts)
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function PhotoUpload({ currentPhoto, category, id, onPhotoSaved }) {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasChanges, setHasChanges] = useState(false);

    const mountedRef = useRef(true);
    const fileInputRef = useRef(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ─── Load existing photo on mount / when currentPhoto changes ───
    const loadCurrentPhoto = useCallback(async () => {
        if (!currentPhoto) {
            setPreview(null);
            return;
        }

        try {
            if (!window.electronAPI || !window.electronAPI.getPhoto) return;

            const result = await window.electronAPI.getPhoto(currentPhoto);
            if (!mountedRef.current) return;

            if (result && result.success && result.data) {
                setPreview(result.data);
            }
        } catch (e) {
            if (!mountedRef.current) return;
            console.error('PhotoUpload: failed to load photo:', e.message);
        }
    }, [currentPhoto]);

    useEffect(() => {
        loadCurrentPhoto();
    }, [loadCurrentPhoto]);

    // ─── Handle file selection from input ──────────────────────
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type (strict — no SVG)
        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Please select a JPG, PNG, GIF, or WebP image.');
            return;
        }

        // Validate file size
        if (file.size > MAX_SIZE) {
            setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 5MB.`);
            return;
        }

        setError('');

        // Read as base64 data URL for preview
        const reader = new FileReader();
        reader.onload = (event) => {
            if (!mountedRef.current) return;
            setPreview(event.target.result);
            setHasChanges(true);
        };
        reader.onerror = () => {
            if (!mountedRef.current) return;
            setError('Failed to read file. Please try again.');
        };
        reader.readAsDataURL(file);

        // Reset input so same file can be selected again
        e.target.value = '';
    };

    // ─── Save photo to file system via IPC ─────────────────────
    const handleSave = async () => {
        if (!preview || !hasChanges) return;

        setLoading(true);
        setError('');

        try {
            if (!window.electronAPI || !window.electronAPI.savePhoto) {
                setError('Photo save not available.');
                return;
            }

            const result = await window.electronAPI.savePhoto({
                base64: preview,
                category: category,
                id: id
            });

            if (!mountedRef.current) return;

            if (result && result.success) {
                setHasChanges(false);
                if (onPhotoSaved) onPhotoSaved(result.filename);
            } else {
                setError((result && result.error) || 'Failed to save photo');
            }
        } catch (e) {
            if (!mountedRef.current) return;
            setError('Save error: ' + e.message);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    // ─── Remove photo ──────────────────────────────────────────
    const handleRemove = async () => {
        setLoading(true);
        setError('');

        try {
            // Delete from file system if it was saved
            if (currentPhoto && window.electronAPI && window.electronAPI.deletePhoto) {
                await window.electronAPI.deletePhoto(currentPhoto);
            }

            if (!mountedRef.current) return;

            setPreview(null);
            setHasChanges(false);
            if (onPhotoSaved) onPhotoSaved(null);
        } catch (e) {
            if (!mountedRef.current) return;
            setError('Remove error: ' + e.message);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    // ─── Trigger file input click ───────────────────────────────
    const handleSelectFile = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // ─── Generate safe input ID ─────────────────────────────────
    const inputId = `photo-upload-${String(category || 'default').replace(/[^a-zA-Z0-9_-]/g, '_')}-${String(id || '0').replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    return (
        <div style={{ textAlign: 'center' }}>
            {/* ─── Photo Preview Circle ─────────────────────────── */}
            <div
                style={{
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    border: `4px ${preview ? 'solid #1a73e8' : 'dashed #dadce0'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    overflow: 'hidden',
                    background: preview ? '#f8f9fa' : '#e8eaed',
                    position: 'relative'
                }}
            >
                {preview ? (
                    <img
                        src={preview}
                        alt="Profile"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                ) : (
                    <div style={{ color: '#5f6368', fontSize: '14px' }}>
                        <div style={{ fontSize: '36px', marginBottom: '5px' }}>📷</div>
                        No Photo
                    </div>
                )}

                {/* Loading overlay */}
                {loading && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(255, 255, 255, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%'
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
            </div>

            {/* ─── Hidden File Input ────────────────────────────── */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id={inputId}
            />

            {/* ─── Action Buttons ───────────────────────────────── */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={handleSelectFile}
                    disabled={loading}
                    style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: '1px solid #dadce0',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#1a73e8',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                    }}
                >
                    {preview ? '🔄 Change' : '📷 Upload'}
                </button>

                {preview && hasChanges && (
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={loading}
                        style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            border: 'none',
                            borderRadius: '6px',
                            background: loading ? '#9aa0a6' : '#1a73e8',
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 4px rgba(26, 115, 232, 0.2)'
                        }}
                    >
                        {loading ? 'Saving...' : '💾 Save'}
                    </button>
                )}

                {preview && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={loading}
                        style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            border: '1px solid #ef9a9a',
                            borderRadius: '6px',
                            background: 'white',
                            color: '#d32f2f',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        🗑️ Remove
                    </button>
                )}
            </div>

            {/* ─── Error Message ────────────────────────────────── */}
            {error && (
                <p style={{
                    color: '#d32f2f',
                    fontSize: '12px',
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: '#ffebee',
                    borderRadius: '4px'
                }}>
                    {error}
                </p>
            )}

            {/* ─── Hint ─────────────────────────────────────────── */}
            <p style={{
                color: '#999',
                fontSize: '11px',
                marginTop: '6px'
            }}>
                Max 5MB • JPG, PNG, GIF, WebP
            </p>
        </div>
    );
}