// /api/pesapal-webhook.js — Vercel serverless function
// Receives Pesapal IPN (Instant Payment Notification) when a payment completes.
// Generates a license key + emails it to the customer.
//
// Pesapal does a GET verification when registering the IPN URL, so we return 200 OK for any method.
// The actual license generation only happens for POST requests with status=COMPLETED.
//
// SECURITY (2026-10-19): HMAC-SHA256 signature verification.
// If PESAPAL_WEBHOOK_SECRET env var is set, the webhook verifies the
// 'X-Pesapal-Signature' header (or 'x-pesapal-signature') against
// HMAC-SHA256(secret, raw_body). If signature is missing or invalid,
// the request is rejected with 401. If the env var is NOT set, the
// webhook accepts all requests (backwards-compatible).


// S4 fix: HTML-escape user input to prevent email/HTML injection
function htmlEscape(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

let supabase = null;
try {
  supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  );
} catch (e) {
  console.log('[Pesapal Webhook] Supabase client init failed:', e.message);
}

// ═══════════════════════════════════════════════════════════
// HMAC-SHA256 signature verification helper
// ═══════════════════════════════════════════════════════════
// Pesapal sends the signature in the 'X-Pesapal-Signature' header.
// The signature is HMAC-SHA256 of the RAW request body using the
// shared secret (PESAPAL_WEBHOOK_SECRET).
//
// Configure PESAPAL_WEBHOOK_SECRET on Vercel:
//   vercel env add PESAPAL_WEBHOOK_SECRET
// And in your Pesapal merchant dashboard, set the same secret for IPN signing.
function verifyPesapalSignature(req) {
  const secret = process.env.PESAPAL_WEBHOOK_SECRET;
  // If no secret configured, accept all requests (backwards-compatible)
  if (!secret) {
    console.log('[Pesapal Webhook] No PESAPAL_WEBHOOK_SECRET set — skipping signature verification');
    return { valid: true, reason: 'no-secret-configured' };
  }

  // Get the signature from any of these headers (Pesapal uses different ones per version)
  const signature = req.headers['x-pesapal-signature']
    || req.headers['x-pesapal-token']
    || req.headers['x-signature']
    || req.headers['pesapal-signature'];

  if (!signature) {
    return { valid: false, reason: 'missing-signature-header' };
  }

  // Compute expected HMAC-SHA256
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const isValid = signature.length === expectedSig.length
    && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));

  return { valid: isValid, reason: isValid ? 'valid' : 'signature-mismatch', expected: expectedSig.slice(0, 16) + '...' };
}

module.exports = async (req, res) => {
  // CORS — allow Pesapal + our own frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Pesapal-Token, X-Pesapal-Signature, X-Signature');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ═══════════════════════════════════════════════════════════
  // HMAC-SHA256 signature verification (only for POST, not GET)
  // GET is the IPN URL verification — Pesapal doesn't sign it
  // ═══════════════════════════════════════════════════════════
  if (req.method === 'POST') {
    const sigCheck = verifyPesapalSignature(req);
    if (!sigCheck.valid) {
      console.error(`[Pesapal Webhook] REJECTED: ${sigCheck.reason}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
        reason: sigCheck.reason,
      });
    }
    console.log(`[Pesapal Webhook] Signature verified (${sigCheck.reason})`);
  }
  
  // Handle GET — Pesapal does this to verify the IPN URL is reachable
  // Return 200 OK with simple acknowledgment (no license generation)
  if (req.method === 'GET') {
    console.log('[Pesapal Webhook] GET verification from:', req.headers.get?.('user-agent') || 'unknown');
    return res.status(200).json({
      status: 'ok',
      message: 'Pesapal IPN endpoint is active',
      url: 'https://ssewasswa-school.vercel.app/api/pesapal-webhook',
      timestamp: new Date().toISOString()
    });
  }
  
  // Handle HEAD (some verifications use HEAD instead of GET)
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }
  
  // Reject all other methods
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  // Process the actual IPN notification (POST request)
  const n = req.body || {};
  console.log('[Pesapal Webhook] Received POST:', JSON.stringify(n).substring(0, 500));
  
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
      else console.log('[Pesapal Webhook] License saved to Supabase');
    }
  } catch (e) {
    console.log('[Pesapal Webhook] Supabase save failed:', e.message);
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
          <h2>Thank you for your subscription, ${htmlEscape(customerName)}!</h2>
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
            <li>WhatsApp: <a href="https://wa.me/256752971118">+256 752 971 118</a> (Ssewasswa Comforts Tech)</li>
            <li>Call: <a href="tel:+256789738420">+256 789 738 420</a> (Ssewasswa Comforts Tech)</li>
            <li>Email: support@ssewasswacomfortstechnologies.com</li>
          </ul>
          <p>Best regards,<br/>Ssewasswa Comforts Technologies</p>
        `
      });
      console.log('[Pesapal Webhook] License key emailed to', userEmail);
    } else {
      console.log('[Pesapal Webhook] Email not sent (DEV_EMAIL or GMAIL_APP_PASS not set)');
    }
  } catch (e) {
    console.log('[Pesapal Webhook] Email send failed:', e.message);
  }
  
  return res.status(200).json({ status: 'success', license_key: licenseKey, tier });
};
