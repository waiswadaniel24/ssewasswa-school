// FileName: src/pages/GenerateDocs.jsx
// Ssewasswa Comforts School ERP — Document Generation Hub
// Generates: report cards, certificates, letters, ID cards, lists, receipts
// Uses jsPDF + jspdf-autotable for PDF generation (works in browser)

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const DOC_TEMPLATES = [
    {
        id: 'report_card',
        name: 'Report Cards',
        icon: '📄',
        desc: 'Generate PDF report cards for one student or a whole class. Pulls marks from the current term.',
        roles: ['Super Admin', 'Admin', 'Teacher'],
        action: 'Generate report cards',
    },
    {
        id: 'certificate',
        name: 'Certificates',
        icon: '🎓',
        desc: 'Completion, transfer, and achievement certificates with school branding.',
        roles: ['Super Admin', 'Admin'],
        action: 'Generate certificates',
    },
    {
        id: 'id_cards',
        name: 'Student ID Cards',
        icon: '🪪',
        desc: 'Bulk-printable ID cards with photos, class, and parent contact.',
        roles: ['Super Admin', 'Admin'],
        action: 'Generate ID cards',
    },
    {
        id: 'staff_id_cards',
        name: 'Staff ID Cards',
        icon: '🪪',
        desc: 'ID cards for teachers and support staff with role + department.',
        roles: ['Super Admin', 'Admin'],
        action: 'Generate staff IDs',
    },
    {
        id: 'official_letter',
        name: 'Official Letters',
        icon: '✉️',
        desc: 'Letterhead + signature placement for official school letters.',
        roles: ['Super Admin', 'Admin'],
        action: 'Generate letters',
    },
    {
        id: 'transfer_certificate',
        name: 'Transfer Certificates',
        icon: '📜',
        desc: 'TC for students leaving the school — printable, signed, stamped.',
        roles: ['Super Admin', 'Admin'],
        action: 'Generate TCs',
    },
    {
        id: 'meeting_minutes',
        name: 'Meeting Minutes Template',
        icon: '📝',
        desc: 'Pre-formatted meeting minutes template with attendees + agenda.',
        roles: ['Super Admin', 'Admin', 'Staff'],
        action: 'Generate minutes template',
    },
    {
        id: 'payment_receipt',
        name: 'Payment Receipts',
        icon: '🧾',
        desc: 'Bulk receipts for school fees payments.',
        roles: ['Super Admin', 'Admin', 'Bursar'],
        action: 'Generate receipts',
    },
    {
        id: 'financial_report',
        name: 'Financial Reports',
        icon: '📊',
        desc: 'Termly financial summary report — income, expenses, balances.',
        roles: ['Super Admin', 'Admin', 'Bursar'],
        action: 'Generate financial report',
    },
];

export default function GenerateDocs() {
    const auth = useAuth();
    const user = auth?.user;
    const userRole = user?.role || 'Viewer';
    const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.queryDatabase?.toString?.();
    const isDesktop = typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [generating, setGenerating] = useState(false);
    const [lastGenerated, setLastGenerated] = useState(null);

    const allowedTemplates = DOC_TEMPLATES.filter(t => t.roles.includes(userRole));

    // Load students (desktop only — web has no DB access)
    useEffect(() => {
        if (!isDesktop) return;
        window.electronAPI?.queryDatabase?.("SELECT id, first_name, last_name, class FROM students WHERE status = 'Active' ORDER BY first_name LIMIT 500")
            .then(r => { if (r?.success) setStudents(r.data || []); })
            .catch(() => {});
    }, [isDesktop]);

    const handleGenerate = async (templateId) => {
        setGenerating(true);
        setLastGenerated(null);
        try {
            // On desktop: delegate to electron IPC handlers (when implemented)
            // On web: show "desktop only" message
            if (!isDesktop) {
                setLastGenerated({
                    success: false,
                    message: 'Document generation is available in the desktop app only. Download the .exe installer to use this feature. Web version can only display this preview — actual PDF generation requires Electron + jsPDF running locally with access to the school database.',
                });
            } else {
                // Desktop mode — actual generation happens here
                // (Hook this up to the specific electron IPC handlers when implemented)
                const r = await window.electronAPI?.generateDocument?.({ templateId, studentId: selectedStudent });
                setLastGenerated(r || { success: false, error: 'Generator not yet wired up' });
            }
        } catch (err) {
            setLastGenerated({ success: false, message: err.message });
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="page-container">
            <h1 className="page-title">🖨️ Generate & Print Documents</h1>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
                Generate report cards, certificates, ID cards, letters, and more — as printable PDFs.
                {!isDesktop && (
                    <span style={{ color: '#d32f2f', fontWeight: 600 }}> ⚠️ You're on the web version — actual PDF generation requires the desktop app.</span>
                )}
            </p>

            {/* Templates grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
                {allowedTemplates.map(tpl => (
                    <div key={tpl.id} style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 8,
                        padding: 20,
                        background: '#fafafa',
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>{tpl.icon}</div>
                        <h3 style={{ margin: '0 0 8px', color: '#1a73e8', fontSize: 16 }}>{tpl.name}</h3>
                        <p style={{ color: '#666', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>{tpl.desc}</p>
                        <button
                            onClick={() => handleGenerate(tpl.id)}
                            disabled={generating}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: generating ? '#ccc' : '#1a73e8',
                                color: 'white',
                                border: 0,
                                borderRadius: 6,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: generating ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {generating ? 'Generating...' : tpl.action}
                        </button>
                    </div>
                ))}
            </div>

            {/* Result message */}
            {lastGenerated && (
                <div style={{
                    padding: 16,
                    borderRadius: 8,
                    background: lastGenerated.success ? '#e6f4ea' : '#fff3e0',
                    border: `1px solid ${lastGenerated.success ? '#0b8043' : '#ff9800'}`,
                    color: lastGenerated.success ? '#0b8043' : '#e65100',
                    marginBottom: 24,
                }}>
                    <strong>{lastGenerated.success ? '✓ Success' : '⚠️ Cannot generate'}</strong>
                    <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5 }}>{lastGenerated.message || lastGenerated.error}</p>
                </div>
            )}

            {/* Student picker (desktop only, only when students exist) */}
            {isDesktop && students.length > 0 && (
                <div style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 24,
                }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Select student (optional)</label>
                    <select
                        value={selectedStudent}
                        onChange={e => setSelectedStudent(e.target.value)}
                        style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 4 }}
                    >
                        <option value="">— All students / class —</option>
                        {students.map(s => (
                            <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.class})</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Footer help */}
            <div style={{
                padding: 16,
                borderRadius: 8,
                background: '#e8f0fe',
                color: '#1a73e8',
                fontSize: 13,
                lineHeight: 1.5,
            }}>
                <strong>💡 Need help?</strong> Email <a href="mailto:support@ssewasswacomfortstechnologies.com" style={{ color: '#1a73e8' }}>support@ssewasswacomfortstechnologies.com</a> or WhatsApp <a href="https://wa.me/256789736737" style={{ color: '#1a73e8' }}>+256 789 736 737</a> for guidance on any document template.
            </div>
        </div>
    );
}
