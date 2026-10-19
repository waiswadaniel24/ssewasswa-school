// Ssewasswa Comforts — Bulk SMS Campaigns
import React, { useState } from 'react';

export default function BulkSMS() {
  const [recipients, setRecipients] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const send = async () => {
    if (!recipients.trim() || !message.trim()) return;
    const numbers = recipients.split(/[\n,\s]+/).filter(n => n.trim());
    setSending(true);
    setSentCount(0);
    for (let i = 0; i < numbers.length; i++) {
      // In production: call /api/send-sms with Africa's Talking
      await new Promise(r => setTimeout(r, 100));
      setSentCount(i + 1);
    }
    setSending(false);
    alert(`Sent ${numbers.length} SMS messages (simulated). On desktop, this would use Africa's Talking API.`);
  };

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 160);
  const numbers = recipients.split(/[\n,\s]+/).filter(n => n.trim());

  return (
    <div className="page-container">
      <h1 className="page-title">📱 Bulk SMS Campaigns</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>Send bulk SMS via Africa's Talking to parents, staff, or any contacts.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Recipients (one per line or comma-separated)</label>
          <textarea value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="+256 789 736 737&#10;+256 752 971 118&#10;..." rows={6} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'monospace' }} />
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{numbers.length} recipients</div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{charCount} chars • {smsCount} SMS per recipient • Total: {numbers.length * smsCount} SMS</div>
        </div>
      </div>
      <button onClick={send} disabled={sending} style={{ marginTop: 16, padding: '12px 24px', background: sending ? '#ccc' : '#1a73e8', color: 'white', border: 0, borderRadius: 6, cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 600 }}>📱 Send SMS</button>
      {sending && <div style={{ marginTop: 16, padding: 14, background: '#e8f0fe', color: '#1a73e8', borderRadius: 6 }}>⏳ Sending... {sentCount} / {numbers.length}</div>}
    </div>
  );
}