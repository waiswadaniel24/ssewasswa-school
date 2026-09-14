import React from 'react';

export default function Terms() {
    return (
        <div className="page-container">
            <h1 className="page-title">ðŸ“œ Terms & Conditions</h1>
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">1. Acceptance of Terms</div>
                <div className="card-body">
                    <p>By accessing and using the Ssewasswa School ERP system, you agree to be bound by these Terms of Service.</p>
                </div>
            </div>
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-header">2. Data Handling & Privacy</div>
                <div className="card-body">
                    <p>All student data entered into this system is the sole property of the school. Users must handle data in strict compliance with the <strong>Uganda Data Protection and Privacy Act, 2019</strong>. Misuse of student or financial data will result in immediate account suspension.</p>
                </div>
            </div>
            <div className="card">
                <div className="card-header">3. System Usage</div>
                <div className="card-body">
                    <p>You agree not to attempt to reverse-engineer, decompile, or bypass the software&apos;s licensing or security mechanisms.</p>
                </div>
            </div>
        </div>
    );
}

