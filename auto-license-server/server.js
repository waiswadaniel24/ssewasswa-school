const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const app = express();
app.use(express.json());
const DEV_EMAIL = 'ssewasswacomfortzone@gmail.com';
const DEV_PASS = 'your_gmail_app_password';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: DEV_EMAIL, pass: DEV_PASS }
});
function generateKey(hwid, tier) {
  const hwidHash = crypto.createHash('sha256').update(hwid).digest('hex').substring(0, 16);
  const seg1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const seg2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `SSEWASSWA-${tier}-${seg1}-${seg2}-${hwidHash}`;
}
app.post('/payment-webhook', async (req, res) => {
  const event = req.body;
  if (event.event === 'charge.completed' && event.data.status === 'successful') {
    const amount = event.data.amount;
    const tier = amount >= 300000 ? 'PREM' : 'ORD';
    const hwid = event.data.meta.hwid || 'UNKNOWN_HWID';
    const userEmail = event.data.customer.email;
    if (hwid === 'UNKNOWN_HWID' || !userEmail) {
      return res.status(200).send('No HWID');
    }
    const licenseKey = generateKey(hwid, tier);
    console.log(`Generated ${tier} key for ${userEmail}: ${licenseKey}`);
    await transporter.sendMail({
      from: `"Ssewasswa ERP" <${DEV_EMAIL}>`,
      to: userEmail,
      subject: 'Your Ssewasswa ERP Activation Key',
      html: `<h2>Thank you for your payment!</h2><p>Your activation key is:</p><h1 style="color:#1a73e8; background:#e8f0fe; padding:10px; border-radius:8px; text-align:center;">${licenseKey}</h1>`
    });
    console.log('Email sent to:', userEmail);
  }
  res.status(200).send('Webhook received');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`License Server running on port ${PORT}`));