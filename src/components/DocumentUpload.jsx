// FileName: src/components/DocumentUpload.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Document upload component for student certificates and files

import React, { useState, useRef, useEffect } from 'react';

// Document types — defined OUTSIDE component to avoid re-creation on every render
const DOCUMENT_TYPES = [
    'Birth Certificate',
    'Immunization Card',
    'Transfer Letter',
    'Previous Report Card',
    'Passport Photo',
    'NIN Copy',
    'Medical Form',
    'Parent ID Copy',
    'Other'
];

// Allowed file types for upload
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function DocumentUpload({ studentId, documents, onRefresh }) {
    const [uploading, setUploading] = useState(null); // null or the doc type being uploaded
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(null); // filename being downloaded

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ─── Handle file upload ────────────────────────────────────
    const handleUpload = async (e, docType) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file extension
        const ext = file.name.split('.').pop().toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            setError(`Invalid file type (.${ext}). Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
            e.target.value = '';
            return;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 10MB.`);
            e.target.value = '';
            return;
        }

        setError('');
        setUploading(docType);

        try {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    if (!window.electronAPI || !window.electronAPI.saveDocument) {
                        if (!mountedRef.current) return;
                        setError('Document upload not available.');
                        setUploading(null);
                        return;
                    }

                    const result = await window.electronAPI.saveDocument({
                        base64: event.target.result,
                        originalName: file.name,
                        documentType: docType,
                        studentId: studentId
                    });

                    if (!mountedRef.current) return;

                    if (result && result.success) {
                        setError('');
                        if (onRefresh) onRefresh();
                    } else {
                        setError((result && result.error) || 'Upload failed');
                    }
                } catch (err) {
                    if (!mountedRef.current) return;
                    setError('Upload error: ' + err.message);
                } finally {
                    if (mountedRef.current) setUploading(null);
                }
            };

            reader.onerror = () => {
                if (!mountedRef.current) return;
                setError('Failed to read file. Please try again.');
                setUploading(null);
            };

            reader.readAsDataURL(file);
        } catch (e) {
            if (!mountedRef.current) return;
            setError('Upload error: ' + e.message);
            setUploading(null);
        }

        // Reset input so same file can be selected again
        e.target.value = '';
    };

    // ─── Download document ─────────────────────────────────────
    const handleDownload = async (filename, originalName) => {
        setDownloading(filename);
        setError('');

        try {
            if (!window.electronAPI || !window.electronAPI.getDocument) {
                setError('Document download not available.');
                return;
            }

            const result = await window.electronAPI.getDocument(filename);

            if (!mountedRef.current) return;

            if (result && result.success && result.data) {
                // Create a temporary link and trigger download
                const link = document.createElement('a');
                link.href = result.data;
                link.download = originalName || filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                setError('Document not found.');
            }
        } catch (e) {
            if (!mountedRef.current) return;
            setError('Download error: ' + e.message);
        } finally {
            if (mountedRef.current) setDownloading(null);
        }
    };

    // ─── Delete document ───────────────────────────────────────
    const handleDelete = async (docId, filename) => {
        if (!confirm(`Delete this document permanently?\n\nFile: ${filename || 'Unknown'}`)) return;

        setError('');

        try {
            if (!window.electronAPI || !window.electronAPI.deleteDocument) {
                setError('Document delete not available.');
                return;
            }

            const result = await window.electronAPI.deleteDocument(docId);

            if (!mountedRef.current) return;

            if (result && result.success) {
                if (onRefresh) onRefresh();
            } else {
                setError((result && result.error) || 'Delete failed');
            }
        } catch (e) {
            if (!mountedRef.current) return;
            setError('Delete error: ' + e.message);
        }
    };

    // ─── Format file size for display ──────────────────────────
    const formatSize = (bytes) => {
        if (!bytes) return '-';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    };

    return (
        <div className="card">
            <div className="card-header">📎 Documents & Certificates</div>
            <div className="card-body">

                {/* ─── Upload Grid ─────────────────────────────── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '10px',
                    marginBottom: '20px'
                }}>
                    {DOCUMENT_TYPES.map(docType => {
                        const isUploading = uploading === docType;
                        const inputId = `doc-upload-${docType.replace(/\s+/g, '-').toLowerCase()}`;

                        return (
                            <label
                                key={docType}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '12px 8px',
                                    border: `2px dashed ${isUploading ? '#1a73e8' : '#dadce0'}`,
                                    borderRadius: '8px',
                                    cursor: isUploading ? 'wait' : 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: isUploading ? '#1a73e8' : '#5f6368',
                                    background: isUploading ? '#e8f0fe' : '#f8f9fa',
                                    transition: 'all 0.2s',
                                    textAlign: 'center',
                                    opacity: isUploading ? 0.7 : 1
                                }}
                                onMouseEnter={(e) => {
                                    if (!isUploading) {
                                        e.target.style.background = '#e8f0fe';
                                        e.target.style.borderColor = '#1a73e8';
                                        e.target.style.color = '#1a73e8';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isUploading) {
                                        e.target.style.background = '#f8f9fa';
                                        e.target.style.borderColor = '#dadce0';
                                        e.target.style.color = '#5f6368';
                                    }
                                }}
                            >
                                <span>{isUploading ? '⏳' : '📤'}</span>
                                {isUploading ? 'Uploading...' : docType}
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                                    data-doc-type={docType}
                                    onChange={(e) => handleUpload(e, docType)}
                                    style={{ display: 'none' }}
                                    disabled={isUploading}
                                    id={inputId}
                                />
                            </label>
                        );
                    })}
                </div>

                {/* ─── Error Message ──────────────────────────── */}
                {error && (
                    <div style={{
                        padding: '8px 12px',
                        background: '#ffebee',
                        color: '#c62828',
                        borderRadius: '6px',
                        marginBottom: '12px',
                        fontSize: '13px',
                        border: '1px solid #ef9a9a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span>⚠️</span>
                        {error}
                        <button
                            onClick={() => setError('')}
                            style={{
                                marginLeft: 'auto',
                                background: 'none',
                                border: 'none',
                                color: '#c62828',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* ─── Documents Table ────────────────────────── */}
                {documents && documents.length > 0 ? (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Document Type</th>
                                <th>Filename</th>
                                <th>Size</th>
                                <th>Uploaded</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map(doc => (
                                <tr key={doc.id}>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            background: '#e8f0fe',
                                            color: '#1a73e8',
                                            fontSize: '12px',
                                            fontWeight: '600'
                                        }}>
                                            {doc.document_type}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '13px' }}>{doc.original_name}</td>
                                    <td style={{ fontSize: '12px', color: '#666' }}>{formatSize(doc.file_size)}</td>
                                    <td style={{ fontSize: '12px', color: '#999' }}>
                                        {doc.uploaded_at ? String(doc.uploaded_at).slice(0, 19) : '-'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => handleDownload(doc.filename, doc.original_name)}
                                                disabled={downloading === doc.filename}
                                                style={{
                                                    color: '#1a73e8',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: downloading === doc.filename ? 'wait' : 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    opacity: downloading === doc.filename ? 0.5 : 1
                                                }}
                                            >
                                                {downloading === doc.filename ? '⏳ Downloading...' : '📥 Download'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(doc.id, doc.original_name)}
                                                style={{
                                                    color: '#d32f2f',
                                                    border: 'none',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '30px',
                        color: '#999',
                        fontSize: '14px'
                    }}>
                        <div style={{ fontSize: '36px', marginBottom: '8px' }}>📄</div>
                        No documents uploaded yet
                    </div>
                )}
            </div>
        </div>
    );
}