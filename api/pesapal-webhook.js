// /api/pesapal-webhook.js — Vercel serverless function
// Receives Pesapal IPN (Instant Payment Notification) when a payment completes.
// Generates a license key + emails it to the customer.

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

module.exports = async (req, res) => {
  // CORS — allow Pesapal + our own frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Pesapal-Token');
  
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const n = req.body || {};
  console.log('[Pesapal Webhook] Received:', JSON.stringify(n));
  
  // Pesapal sends status changes; we only act on COMPLETED
  if (n.status !== 'COMPLETED' && n.payment_status !== 'COMPLETED') {
    return res.status(200).json({ status: 'pending', received: true });
  }
  
  const hwid = n.merchant_reference || n.hwid || n.reference;
  const userEmail = n.email || n.customer_email || n.billing_address?.email;
  const customerName = n.customer_name || n.billing_address?.first_name || 'Customer';
  const amount = Number(n.amount || 0);
  const tier = amount >= 300000 ? 'PREM' : 'ORD';
  const tierName = tier === 'PREM' ? 'Premium' : 'Ordinary';
  
  if (!hwid || !userEmail) {
    console.log('[Pesapal Webhook] Missing hwid or email, ignoring');
    return res.status(200).json({ status: 'ignored', reason: 'missing hwid or email' });
  }
  
  // Generate license key (matches the Electron app's validation format)
  const hwidHash = crypto.createHash('sha256').update(hwid).digest('hex').substring(0, 16);
  const seg1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const seg2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const licenseKey = `SSEWASSWA-${tier}-${seg1}-${seg2}-${hwidHash}`;
  
  console.log(`[Pesapal Webhook] Generated ${tierName} license: ${licenseKey} for ${userEmail}`);
  
  // Save to Supabase (for online lookup)
  try {
    if (supabase) {
      const { error } = await supabase
        .from('licenses')
        .upsert([{
          hwid, email: userEmail, customer_name: customerName,
          license_key: licenseKey, tier, amount_paid: amount,
          payment_reference: n.order_tracking_id || n.reference,
          created_at: new Date().toISOString()
        }], { onConflict: 'hwid' });
      if (error) console.log('[Pesapal Webhook] Supabase insert error:', error.message);
    }
  } catch (e) {
    console.log('[Pesapal Webhook] Supabase not configured:', e.message);
  }
  
  // Email the license key to the customer
  try {
    if (process.env.DEV_EMAIL && process.env.GMAIL_APP_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.DEV_EMAIL, pass: process.env.GMAIL_APP_PASS }
      });
      await transporter.sendMail({
        from: `"Ssewasswa Comforts Technologies" <${process.env.DEV_EMAIL}>`,
        to: userEmail,
        subject: `Your Ssewasswa ERP ${tierName} Activation Key`,
        html: `
          <h2>Thank you for your subscription, ${customerName}!</h2>
          <p>Your ${tierName} Access activation key is:</p>
          <h1 style="color:#1a73e8; background:#e8f0fe; padding:14px; border-radius:8px; text-align:center; font-family:monospace;">${licenseKey}</h1>
          <p><strong>Tier:</strong> ${tierName} Access</p>
          <p><strong>Amount paid:</strong> UGX ${amount.toLocaleString()}</p>
          <h3>To activate:</h3>
          <ol>
            <li>Download the Ssewasswa School ERP desktop app from <a href="https://ssewasswa-school.pages.dev">our website</a>.</li>
            <li>Install and open the app on your computer.</li>
            <li>On the Activation page, paste the key above into the input.</li>
            <li>Click "Activate Software".</li>
          </ol>
          <p>Need help? Contact us:</p>
          <ul>
            <li>WhatsApp: <a href="https://wa.me/256752971118">+256 752 971 118</a> (Kusuya Grace)</li>
            <li>Call: <a href="tel:+256789738420">+256 789 738 420</a> (Waiswa Moses)</li>
            <li>Email: support@ssewasswacomfortstechnologies.com</li>
          </ul>
          <p>Best regards,<br/>Ssewasswa Comforts Technologies</p>
        `
      });
      console.log('[Pesapal Webhook] License key emailed to', userEmail);
    }
  } catch (e) {
    console.log('[Pesapal Webhook] Email send failed:', e.message);
  }
  
  return res.status(200).json({ status: 'success', license_key: licenseKey, tier });
};
