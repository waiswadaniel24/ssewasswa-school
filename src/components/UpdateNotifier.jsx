// FileName: src/components/UpdateNotifier.jsx
// Auto-update notification UI — shows when a new version is available
// Listens for electron-updater events via window.electronAPI

import React, { useState, useEffect } from 'react';

export default function UpdateNotifier() {
  const [visible, setVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only run in Electron (desktop app) — bail in browser
    if (!window.electronAPI) return;

    // Check for updates on mount
    const checkUpdates = async () => {
      try {
        const result = await window.electronAPI.getUpdateStatus();
        if (result?.updateAvailable && result?.updateInfo) {
          setUpdateInfo(result.updateInfo);
          setVisible(true);
        } else {
          // Also try to actively check
          const check = await window.electronAPI.checkForUpdates();
          if (check?.success && check?.updateAvailable) {
            setUpdateInfo(check.updateInfo);
            setVisible(true);
          }
        }
      } catch (e) {
        // Silent failure — don't bother user with update check errors
        console.log('[UpdateNotifier] Check failed:', e.message);
      }
    };

    checkUpdates();

    // Listen for events
    window.electronAPI.onUpdateAvailable?.((info) => {
      setUpdateInfo(info);
      setVisible(true);
    });

    window.electronAPI.onUpdateDownloadProgress?.((progress) => {
      setDownloadProgress(progress.percent || 0);
    });

    window.electronAPI.onUpdateDownloaded?.(() => {
      setDownloaded(true);
      setDownloading(false);
    });

    window.electronAPI.onUpdateError?.((err) => {
      setError(err.message || 'Update failed');
      setDownloading(false);
    });
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      await window.electronAPI.downloadUpdate();
    } catch (e) {
      setError(e.message || 'Could not download update');
      setDownloading(false);
    }
  };

  const handleInstall = async () => {
    try {
      await window.electronAPI.installUpdate();
      // App will quit + restart to install
    } catch (e) {
      setError(e.message || 'Could not install update');
    }
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#fff',
      border: '1px solid #dce7ed',
      borderRadius: '14px',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
      padding: '20px',
      maxWidth: '380px',
      zIndex: 9998,
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      {/* Icon + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #1a73e8 0%, #0b8043 100%)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flex: '0 0 auto',
        }}>⬆️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#102a3c', fontSize: 16 }}>Update Available</div>
          <div style={{ fontSize: 12, color: '#587080' }}>
            Version {updateInfo?.version || 'unknown'} is ready to install
          </div>
        </div>
        <button onClick={handleDismiss} aria-label="Dismiss" style={{
          background: 'transparent', border: '0', color: '#999', cursor: 'pointer',
          fontSize: 18, padding: 4,
        }}>✕</button>
      </div>

      {/* Body — release notes (optional) */}
      {updateInfo?.releaseNotes && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e0e7ed', borderRadius: 8,
          padding: 10, marginBottom: 12, maxHeight: 120, overflowY: 'auto',
          fontSize: 12, color: '#374753', lineHeight: 1.5,
        }}>
          {typeof updateInfo.releaseNotes === 'string'
            ? updateInfo.releaseNotes.substring(0, 300)
            : 'New features and bug fixes available.'}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: '#fce8e6', border: '1px solid #f5c6cb', borderRadius: 6,
          padding: 8, marginBottom: 12, color: '#c62828', fontSize: 12,
        }}>⚠️ {error}</div>
      )}

      {/* Download progress */}
      {downloading && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#587080', marginBottom: 6 }}>
            Downloading: {downloadProgress.toFixed(1)}%
          </div>
          <div style={{
            height: 6, background: '#e0e7ed', borderRadius: 999, overflow: 'hidden',
          }}>
            <div style={{
              width: `${downloadProgress}%`, height: '100%',
              background: 'linear-gradient(90deg, #1a73e8, #0b8043)',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {downloaded ? (
          <button onClick={handleInstall} style={{
            flex: 1, padding: '12px', border: '0', borderRadius: 8,
            background: '#0b8043', color: '#fff', fontWeight: 700, cursor: 'pointer',
            fontSize: 14,
          }}>
            ⬆️ Install & Restart
          </button>
        ) : downloading ? (
          <button disabled style={{
            flex: 1, padding: '12px', border: '0', borderRadius: 8,
            background: '#9aa0a6', color: '#fff', fontWeight: 700, cursor: 'not-allowed',
            fontSize: 14,
          }}>
            ⏳ Downloading...
          </button>
        ) : (
          <button onClick={handleDownload} style={{
            flex: 1, padding: '12px', border: '0', borderRadius: 8,
            background: '#1a73e8', color: '#fff', fontWeight: 700, cursor: 'pointer',
            fontSize: 14,
          }}>
            ⬇️ Download Update
          </button>
        )}
        <button onClick={handleDismiss} style={{
          padding: '12px 16px', border: '1px solid #dadce0', borderRadius: 8,
          background: '#fff', color: '#587080', fontWeight: 600, cursor: 'pointer',
          fontSize: 14,
        }}>
          Later
        </button>
      </div>
    </div>
  );
}
