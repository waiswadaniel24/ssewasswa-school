// FileName: src/pages/Copyright.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Copyright & licensing — software terms, HWID, license status

import React, { useState, useEffect, useRef } from 'react';

export default function Copyright() {
    var [hwid, setHwid] = useState('Loading...');
    var [licenseStatus, setLicenseStatus] = useState('Unknown');
    var [trialDays, setTrialDays] = useState(null);
    var [loading, setLoading] = useState(true);

    var mountedRef = useRef(true);

    useEffect(function () {
        mountedRef.current = true;
        return function () { mountedRef.current = false; };
    }, []);

    useEffect(function () {
        var cancelled = false;

        const loadInfo = async function () {
            if (!window.electronAPI) {
                if (mountedRef.current) setLoading(false);
                return;
            }

            try {
                // Get HWID
                if (window.electronAPI.getHwid) {
                    try {
                        var hwidRes = await window.electronAPI.getHwid();
                        if (!cancelled && mountedRef.current && hwidRes && hwidRes.success && hwidRes.hwid) {
                            setHwid(hwidRes.hwid.substring(0, 40) + '...');
                        }
                    } catch (e) { /* ignore */ }
                }

                // Get license status
                if (window.electronAPI.checkLicense) {
                    try {
                        var licRes = await window.electronAPI.checkLicense();
                        if (!cancelled && mountedRef.current && licRes) {
                            if (licRes.success) {
                                setLicenseStatus('Licensed');
                            } else if (licRes.isTrial) {
                                setLicenseStatus('Trial');
                                setTrialDays(licRes.daysLeft || 0);
                            } else {
                                setLicenseStatus('Expired');
                            }
                        }
                    } catch (e) { /* ignore */ }
                }
            } catch (e) {
                if (!cancelled) return;
                console.error('Copyright: load error:', (e && e.message) ? e.message : 'Unknown');
            } finally {
                if (!cancelled && mountedRef.current) setLoading(false);
            }
        };

        loadInfo();
        return function () { cancelled = true; };
    }, []);

    var copyHwid = function () {
        if (!window.electronAPI || !window.electronAPI.getHwid) return;

        window.electronAPI.getHwid().then(function (res) {
            if (res && res.success && res.hwid) {
                try {
                    navigator.clipboard.writeText(res.hwid);
                } catch (e) {
                    // Clipboard might not be available
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="page-container">
                <h1 className="page-title">©️ Copyright &amp; Licensing</h1>
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
                        <p style={{ color: '#666' }}>Loading license info...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            </div>
        );
    }

    var statusColor = licenseStatus === 'Licensed' ? '#0d904f' :
        licenseStatus === 'Trial' ? '#e65100' : '#d32f2f';

    return (
        <div className="page-container">
            <h1 className="page-title">©️ Copyright &amp; Licensing</h1>

            {/* ─── License Status Banner ──────────────────────────── */}
            <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid ' + statusColor }}>
                <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#5f6368', textTransform: 'uppercase', marginBottom: '4px' }}>
                                License Status
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: statusColor }}>
                                {licenseStatus === 'Licensed' ? '✅ Licensed' :
                                    licenseStatus === 'Trial' ? '⏳ Trial (' + trialDays + ' days left)' :
                                        '❌ Expired'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#5f6368', textTransform: 'uppercase', marginBottom: '4px' }}>
                                Hardware ID (HWID)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <code style={{
                                    fontSize: '11px', fontFamily: 'monospace',
                                    color: '#333', wordBreak: 'break-all',
                                    maxWidth: '250px'
                                }}>
                                    {hwid}
                                </code>
                                <button
                                    onClick={copyHwid}
                                    style={{
                                        padding: '4px 10px', fontSize: '11px',
                                        border: '1px solid #dadce0', borderRadius: '4px',
                                        background: 'white', color: '#1a73e8',
                                        cursor: 'pointer', fontWeight: '600',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    📋 Copy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Copyright Notice ──────────────────────────────── */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">©️ Copyright Notice</div>
                <div className="card-body" style={{ lineHeight: '1.6' }}>
                    <p style={{ fontSize: '14px', color: '#333' }}>
                        <strong>Ssewasswa School ERP V10</strong> — Uganda EMIS Compliant Edition
                    </p>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                        Copyright &copy; 2024 <strong>Ssewasswa Comfort&apos;s Technologies</strong>. All rights reserved.
                    </p>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                        This software and its accompanying files (the &quot;Software&quot;) are protected by
                        copyright laws and international copyright treaties. The Software is licensed, not sold.
                    </p>
                </div>
            </div>

            {/* ─── License Terms ─────────────────────────────────── */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">📋 License Terms</div>
                <div className="card-body" style={{ lineHeight: '1.6' }}>
                    <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>1. Grant of License</h4>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                        Ssewasswa Comfort&apos;s Technologies grants the purchaser a non-exclusive, non-transferable
                        license to use the Software on a single computer (identified by the Hardware ID above).
                        The license is permanently bound to this specific computer.
                    </p>

                    <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>2. Trial Period</h4>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                        The Software provides a 5-day free trial period from the date of first installation.
                        After the trial period expires, the Software will be locked and all features will be
                        disabled until a valid license key is entered.
                    </p>

                    <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>3. Restrictions</h4>
                    <ul style={{ fontSize: '13px', color: '#666', paddingLeft: '20px', marginBottom: '15px' }}>
                        <li style={{ marginBottom: '5px' }}>You may NOT copy, distribute, or sublicense the Software.</li>
                        <li style={{ marginBottom: '5px' }}>You may NOT reverse-engineer, decompile, or disassemble the Software.</li>
                        <li style={{ marginBottom: '5px' }}>You may NOT bypass, modify, or remove the licensing or encryption mechanisms.</li>
                        <li style={{ marginBottom: '5px' }}>You may NOT transfer the license to another computer (HWID-bound).</li>
                        <li style={{ marginBottom: '5px' }}>You may NOT use the Software on more than one computer simultaneously.</li>
                    </ul>

                    <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>4. Data Ownership</h4>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                        All data entered into the Software (student records, staff records, financial data, etc.)
                        remains the sole property of the school. Ssewasswa Comfort&apos;s Technologies does not
                        access, collect, or transmit any school data. The database is stored locally on your
                        computer and encrypted at rest using industry-standard encryption.
                    </p>

                    <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>5. Updates &amp; Support</h4>
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                        The license includes free bug fixes and minor updates. Major version upgrades may
                        require a new license. Support is available via email and phone during business hours.
                    </p>

                    <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>6. Limitation of Liability</h4>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                        The Software is provided &quot;as is&quot; without warranty of any kind. Ssewasswa Comfort&apos;s
                        Technologies shall not be liable for any data loss, business interruption, or other damages
                        resulting from the use of or inability to use the Software. Always maintain regular database
                        backups.
                    </p>
                </div>
            </div>

            {/* ─── Trademark ─────────────────────────────────────── */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">™ Trademark Information</div>
                <div className="card-body" style={{ lineHeight: '1.6' }}>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                        &quot;Ssewasswa School ERP&quot;, &quot;Ssewasswa Comfort&apos;s Technologies&quot;, the Ssewasswa
                        logo, and related marks are trademarks of Ssewasswa Comfort&apos;s Technologies.
                    </p>
                    <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>
                        &quot;EMIS&quot; (Education Management Information System) is a system of the Ministry of
                        Education and Sports (MoES), Uganda. &quot;UNEB&quot; (Uganda National Examinations Board)
                        is a government body. This Software is designed to be compatible with EMIS and UNEB data
                        formats but is not officially endorsed by MoES or UNEB.
                    </p>
                </div>
            </div>

            {/* ─── Purchase License ──────────────────────────────── */}
            <div className="card" style={{ marginBottom: '20px', background: '#e8f0fe' }}>
                <div className="card-header">🔑 Purchase a License</div>
                <div className="card-body" style={{ lineHeight: '1.6' }}>
                    <p style={{ fontSize: '14px', color: '#333', fontWeight: '600' }}>
                        To purchase a license key:
                    </p>
                    <ol style={{ fontSize: '13px', color: '#666', paddingLeft: '20px', marginTop: '10px' }}>
                        <li style={{ marginBottom: '5px' }}>Copy your Hardware ID (HWID) shown above.</li>
                        <li style={{ marginBottom: '5px' }}>Contact us with your HWID and school details.</li>
                        <li style={{ marginBottom: '5px' }}>Receive your license key (format: SSEWASSWA-XXXX-XXXX-XXXX-XXXXXXXX).</li>
                        <li style={{ marginBottom: '5px' }}>Go to the Activation page and enter the key.</li>
                    </ol>

                    <div style={{ marginTop: '15px', padding: '12px 16px', background: 'white', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: '600', color: '#1a73e8' }}>
                            📞 Contact Information
                        </p>
                        <p style={{ margin: '0 0 3px 0', fontSize: '13px', color: '#666' }}>
                            📧 Email: <a href="mailto:ssewasswacomfortzone@gmail.com" style={{ color: '#1a73e8' }}>ssewasswacomfortzone@gmail.com</a>
                        </p>
                        <p style={{ margin: '0 0 3px 0', fontSize: '13px', color: '#666' }}>
                            📱 Call/WhatsApp: +256 752 971 118
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                            📱 Alt: +256 789 736 737
                        </p>
                    </div>
                </div>
            </div>

            {/* ─── Footer ─────────────────────────────────────────── */}
            <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>
                <p style={{ margin: '0 0 5px 0' }}>
                    Ssewasswa School ERP V10.0 — EMIS Complete Build
                </p>
                <p style={{ margin: 0 }}>
                    &copy; 2024 Ssewasswa Comfort&apos;s Technologies. All rights reserved.
                </p>
            </div>
        </div>
    );
}