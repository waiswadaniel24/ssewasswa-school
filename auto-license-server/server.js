// File: server.js
// This is a simple web server you can host for free on Render.com or Glitch.com
// It listens for payments from Flutterwave and automatically emails the license key.

const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());

// --- CONFIGURE YOUR GMAIL HERE ---
const DEV_EMAIL = 'ssewasswacomfortzone@gmail.com';
const DEV_PASS = 'your_gmail_app_password'; // Use a Gmail App Password
const SECRET_HASH = 'YOUR_SECRET_WEBHOOK_HASH'; // A secret word you set in Flutterwave

// Gmail Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: DEV_EMAIL, pass: DEV_PASS }
});

// Function to generate license key
function generateKey(hwid, tier) {
    const hwidHash = crypto.createHash('sha256').update(hwid).digest('hex').substring(0, 16);
    const seg1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const seg2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `SSEWASSWA-${tier}-${seg1}-${seg2}-${hwidHash}`;
}

// Webhook Endpoint for Flutterwave/Paystack
app.post('/payment-webhook', async (req, res) => {
    const event = req.body;

    // 1. Verify it's a successful payment
    if (event.event === 'charge.completed' && event.data.status === 'successful') {
        
        // 2. Check if they paid the Premium or Ordinary amount
        const amount = event.data.amount;
        const tier = amount >= 300000 ? 'PREM' : 'ORD'; // 300k = Premium, 150k = Ordinary
        
        // 3. Extract HWID and Email from the payment description/custom fields
        // (You must ask users to enter their HWID and Email on the Flutterwave payment page)
        const hwid = event.data.meta.hwid || 'UNKNOWN_HWID';
        const userEmail = event.data.customer.email;
        
        if (hwid === 'UNKNOWN_HWID') {
            console.log('Payment received but no HWID provided!');
            return res.status(200).send('No HWID');
        }

        // 4. Generate the License Key
        const licenseKey = generateKey(hwid, tier);
        console.log(`Generated ${tier} key for ${userEmail}: ${licenseKey}`);

        // 5. Email the key to the user automatically
        await transporter.sendMail({
            from: `"Ssewasswa ERP" <${DEV_EMAIL}>`,
            to: userEmail,
            subject: 'Your Ssewasswa ERP Activation Key',
            html: `
                <h2>Thank you for your payment!</h2>
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
                <p>Best regards,<br/>Ssewasswa Comfort's Technologies</p>
            `
        });

        console.log('Email sent to:', userEmail);
    }

    // Always return 200 OK to Flutterwave so they know you received it
    res.status(200).send('Webhook received');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`License Server running on port ${PORT}`));
