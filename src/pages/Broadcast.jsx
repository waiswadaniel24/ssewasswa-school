// FileName: src/pages/Broadcast.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Validate and format Ugandan phone number for WhatsApp (256XXXXXXXXX)
function formatWhatsAppPhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  let phone = rawPhone.replace(/\s+/g, '').replace(/^\+/, '');

  // Remove leading 0 and prepend 256
  if (phone.startsWith('0')) {
    phone = '256' + phone.substring(1);
  }
  // Already starts with 256
  else if (phone.startsWith('256')) {
    // keep as is
  }
  // Just digits starting with 7 (e.g., 772123456)
  else if (phone.startsWith('7') && phone.length === 9) {
    phone = '256' + phone;
  }
  else {
    return null; // Invalid format
  }

  // Validate: 256 followed by 9 digits (total 12 chars)
  if (phone.length === 12 && /^256\d{9}$/.test(phone)) {
    return phone;
  }

  return null;
}

export default function Broadcast() {
  // ─── State variables with proper defaults ──────────────
  const [classes, setClasses] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info'); // 'info' | 'success' | 'error' | 'warning'
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState([]);

  // ─── Refs ───────────────────────────────────────────────
  const mountedRef = useRef(true);

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load classes on mount ────────────────────────────────
  useEffect(() => {
    const loadClasses = async () => {
      if (!window.electronAPI || !window.electronAPI.queryDatabase) return;

      try {
        const r = await window.electronAPI.queryDatabase(
          "SELECT id, name FROM classes ORDER BY name"
        );
        if (!mountedRef.current) return;
        if (r && r.success && Array.isArray(r.data)) {
          setClasses(r.data);
        }
      } catch (e) {
        if (!mountedRef.current) return;
        console.error('Broadcast: load classes error:', (e && e.message) ? e.message : 'Unknown');
      }
    };
    loadClasses();
  }, []);

  // ─── Fetch students and validate phone numbers ────────────
  const handleFetchRecipients = useCallback(async () => {
    if (!message || !message.trim()) {
      setStatus('⚠️ Please type a message first');
      setStatusType('warning');
      return;
    }

    setLoading(true);
    setStatus('⏳ Fetching parents...');
    setStatusType('info');
    setRecipients([]);

    try {
      // FIXED: Uses parameterized query instead of string concatenation to prevent SQL Injection
      let query = "SELECT id, first_name, last_name, guardian_phone FROM students WHERE status = 'Active'";
      const params = [];

      if (selClass) {
        query += " AND class_id = ?";
        params.push(selClass);
      }

      query += " ORDER BY first_name";

      const sRes = await window.electronAPI.queryDatabase(query, params);

      if (!mountedRef.current) return;

      if (!sRes || !sRes.success || !Array.isArray(sRes.data) || sRes.data.length === 0) {
        setStatus('❌ No students found');
        setStatusType('error');
        setRecipients([]);
        return;
      }

      // Process and validate phone numbers
      const validRecipients = [];
      let invalidCount = 0;

      sRes.data.forEach(s => {
        if (!s) return;

        const firstName = s.first_name ? s.first_name : '';
        const lastName = s.last_name ? s.last_name : '';
        const rawPhone = s.guardian_phone ? s.guardian_phone : '';
        const formattedPhone = formatWhatsAppPhone(rawPhone);

        if (formattedPhone) {
          validRecipients.push({
            id: s.id || null,
            name: (firstName + ' ' + lastName).trim() || 'Unknown',
            rawPhone: rawPhone,
            whatsappNumber: formattedPhone
          });
        } else {
          invalidCount++;
        }
      });

      if (!mountedRef.current) return;

      setRecipients(validRecipients);

      if (validRecipients.length === 0) {
        setStatus(`❌ No valid WhatsApp numbers found. ${invalidCount} student(s) had invalid or missing phone numbers.`);
        setStatusType('error');
      } else {
        setStatus(`✅ Found ${validRecipients.length} valid WhatsApp number(s) out of ${sRes.data.length} student(s).${invalidCount > 0 ? ` ${invalidCount} had invalid numbers.` : ''}`);
        setStatusType('success');
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('Broadcast: fetch recipients error:', errMsg);
      setStatus('❌ Error: ' + errMsg);
      setStatusType('error');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [message, selClass]);

  // ─── Send to one recipient ────────────────────────────────
  const handleSendOne = useCallback((recipient) => {
    if (!recipient || !recipient.whatsappNumber) return;

    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${recipient.whatsappNumber}?text=${encodedMessage}`;

    window.open(url, '_blank');

    setStatus(`📩 Opened WhatsApp for ${recipient.name} (${recipient.whatsappNumber})`);
    setStatusType('success');
  }, [message]);

  // ─── Send to all recipients (with delays) ─────────────────
  const handleSendAll = useCallback(async () => {
    if (recipients.length === 0) {
      setStatus('⚠️ No recipients to send to. Fetch recipients first.');
      setStatusType('warning');
      return;
    }

    if (!confirm(`Send WhatsApp message to ${recipients.length} parent(s)?\n\nThis will open ${recipients.length} browser tab(s). Your browser may ask for permission to open multiple tabs.`)) {
      return;
    }

    setSending(true);
    setStatus(`⏳ Sending to ${recipients.length} recipients...`);
    setStatusType('info');

    const encodedMessage = encodeURIComponent(message);
    let sentCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      if (!r || !r.whatsappNumber) continue;

      const url = `https://wa.me/${r.whatsappNumber}?text=${encodedMessage}`;

      try {
        window.open(url, '_blank');
        sentCount++;
      } catch (e) {
        console.error('Broadcast: failed to open WhatsApp for', r.whatsappNumber, e);
      }

      // Delay between opens to prevent browser blocking
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!mountedRef.current) return;

    setSending(false);
    setStatus(`✅ Opened WhatsApp for ${sentCount} out of ${recipients.length} recipient(s). Check your browser tabs to send each message.`);
    setStatusType('success');
  }, [recipients, message]);

  // ─── Status colors ────────────────────────────────────────
  const statusStyles = {
    info: { bg: '#e8f0fe', color: '#1a73e8', icon: 'ℹ️' },
    success: { bg: '#e8f5e9', color: '#0d904f', icon: '✅' },
    error: { bg: '#ffebee', color: '#c62828', icon: '❌' },
    warning: { bg: '#fff3e0', color: '#e65100', icon: '⚠️' }
  };
  const ss = statusStyles[statusType] || statusStyles.info;

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">📢 Mass Broadcast (WhatsApp)</h1>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '36px', height: '36px',
              border: '3px solid #e0e0e0',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#666' }}>Fetching parent contacts...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📢 Mass Broadcast (WhatsApp)</h1>

      {/* ─── Status Message ──────────────────────────────────── */}
      {status && (
        <div style={{
          background: ss.bg, color: ss.color,
          padding: '12px 16px', borderRadius: '8px',
          marginBottom: '20px', fontSize: '14px',
          border: `1px solid ${ss.color}40`,
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>{ss.icon}</span>
          {status}
        </div>
      )}

      {/* ─── Compose Message Card ────────────────────────────── */}
      <div className="card">
        <div className="card-header">✍️ Compose Message</div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Class (Optional)</label>
            <select
              className="form-input"
              value={selClass}
              onChange={(e) => { setSelClass(e.target.value); setRecipients([]); setStatus(''); }}
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea
              className="form-input"
              rows="5"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here. Example:&#10;Dear Parent, this is a reminder that PTA meeting is scheduled for Saturday at 10:00 AM."
            />
            <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {message.length} characters
            </p>
          </div>

          <button
            onClick={handleFetchRecipients}
            className="btn btn-primary"
            disabled={loading || !message.trim()}
            style={{ background: '#25D366', marginBottom: '15px' }}
          >
            {loading ? '⏳ Fetching...' : '🔍 Fetch Recipients'}
          </button>
        </div>
      </div>

      {/* ─── Recipients List ────────────────────────────────── */}
      {recipients.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📋 Valid WhatsApp Numbers ({recipients.length})</span>
            <button
              onClick={handleSendAll}
              className="btn btn-primary"
              style={{ width: 'auto', padding: '6px 16px', fontSize: '13px', background: '#25D366' }}
              disabled={sending}
            >
              {sending ? '⏳ Sending...' : `📢 Send to All (${recipients.length})`}
            </button>
          </div>
          <div className="card-body" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Student Name</th>
                  <th>Guardian Phone</th>
                  <th>WhatsApp Number</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r, i) => {
                  const id = (r && r.id) ? r.id : i;
                  const name = (r && r.name) ? r.name : 'Unknown';
                  const rawPhone = (r && r.rawPhone) ? r.rawPhone : '-';
                  const waNumber = (r && r.whatsappNumber) ? r.whatsappNumber : '-';

                  return (
                    <tr key={id}>
                      <td style={{ color: '#999' }}>{i + 1}</td>
                      <td style={{ fontWeight: '600' }}>{name}</td>
                      <td style={{ fontSize: '12px' }}>{rawPhone}</td>
                      <td>
                        <code style={{
                          background: '#e8f5e9', color: '#0d904f',
                          padding: '2px 8px', borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {waNumber}
                        </code>
                      </td>
                      <td>
                        <button
                          onClick={() => handleSendOne(r)}
                          style={{
                            color: 'white', border: 'none',
                            background: '#25D366', cursor: 'pointer',
                            fontSize: '12px', fontWeight: '600',
                            padding: '4px 12px', borderRadius: '4px'
                          }}
                        >
                          💬 Send
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Info Note ──────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">ℹ️ How It Works</div>
        <div className="card-body">
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Step 1:</strong> Type your message and optionally select a class.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Step 2:</strong> Click &quot;Fetch Recipients&quot;to find students with valid WhatsApp phone numbers.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px 0' }}>
            💡 <strong>Step 3:</strong> Click &quot;Send&quot; next to each recipient, or &quot;Send to All&quot;to open WhatsApp for everyone.
          </p>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
            ⚠️ <strong>Note:</strong> This opens WhatsApp Web in your browser. You still need to click &quot;Send&quot; in WhatsApp for each message. Phone numbers must be valid Ugandan format (256XXXXXXXXX).
          </p>
        </div>
      </div>
    </div>
  );
}