// File: generate-key.js
// Run: node generate-key.js <hwid> <PREM|ORD> <email>
// Example: node generate-key.js 1234567890abcdef PREM parent@gmail.com
//
// !!! SECURITY: Put your Gmail App Password below (Google Account >
//     Security > 2-Step Verification > App Passwords). Never commit it!

const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- CONFIGURE YOUR GMAIL HERE ---
const DEV_EMAIL = 'ssewasswacomfortzone@gmail.com'; // Your Gmail
const DEV_PASS = 'your_gmail_app_password';         // Your Gmail App Password
// ---------------------------------

async function main() {
    const hwid = process.argv[2];
    const tier = (process.argv[3] || 'ORD').toUpperCase();
    const userEmail = process.argv[4];

    if (!hwid || !userEmail) {
        console.log('Usage: node generate-key.js <hwid> <PREM|ORD> <email>');
        process.exit(1);
    }

    if (tier !== 'PREM' && tier !== 'ORD') {
        console.log('Tier must be PREM or ORD');
        process.exit(1);
    }

    // Generate Key
    const hwidHash = crypto.createHash('sha256').update(hwid).digest('hex').substring(0, 16);
    const seg1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const seg2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const licenseKey = `SSEWASSWA-${tier}-${seg1}-${seg2}-${hwidHash}`;

    console.log('Generated Key:', licenseKey);

    // Send Email
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: DEV_EMAIL, pass: DEV_PASS }
    });

    let info = await transporter.sendMail({
        from: `"Ssewasswa ERP" <${DEV_EMAIL}>`,
        to: userEmail,
        subject: 'Your Ssewasswa ERP Activation Key',
        html: `
            <h2>Thank you for your subscription!</h2>
            <p>Your activation key is:</p>
            <h1 style="color:#1a73e8; background:#e8f0fe; padding:10px; border-radius:8px; text-align:center;">${licenseKey}</h1>
            <p><strong>Tier:</strong> ${tier === 'PREM' ? 'Premium Access' : 'Ordinary Access'}</p>
            <p>To activate your software:</p>
            <ol>
                <li>Open Ssewasswa School ERP on your computer.</li>
                <li>Go to the Activation page.</li>
                <li>Copy and paste the key above into the input field.</li>
                <li>Click "Activate Software".</li>
            </ol>
            <p>If you need help, reply to this email.</p>
            <p>Best regards,<br/>Ssewasswa Comfort's Technologies</p>
        `
    });

    console.log('Email sent to:', userEmail);
}

main().catch(console.error);
