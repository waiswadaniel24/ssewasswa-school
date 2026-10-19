// /api/sms-payment.js — Receives forwarded MoMo payment SMS
// Parses the SMS to extract: amount + reference code + sender phone
// Looks up the reference in licenses table → generates license → emails customer
// FULLY AUTOMATIC — zero manual work needed
//
// SECURITY (2026-10-19): HMAC-SHA256 signature verification.
// If SMS_WEBHOOK_SECRET env var is set, the webhook verifies the
// 'X-SMS-Signature' header (or 'x-sms-signature') against
// HMAC-SHA256(secret, raw_body). If signature is missing or invalid,
// the request is rejected with 401. If the env var is NOT set, the
// webhook accepts all requests (backwards-compatible).
//
// Configure SMS_WEBHOOK_SECRET on Vercel:
//   vercel env add SMS_WEBHOOK_SECRET
// And in your SMS Forwarder app (Android), set the same secret in the
// webhook URL header configuration.

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

// ═══════════════════════════════════════════════════════════
// HMAC-SHA256 signature verification helper
// ═══════════════════════════════════════════════════════════
// SMS Forwarder app sends the signature in the 'X-SMS-Signature' header.
// The signature is HMAC-SHA256 of the RAW request body using the
// shared secret (SMS_WEBHOOK_SECRET).
function verifySmsSignature(req) {
  const secret = process.env.SMS_WEBHOOK_SECRET;
  // If no secret configured, accept all requests (backwards-compatible)
  if (!secret) {
    console.log('[SMS Payment] No SMS_WEBHOOK_SECRET set — skipping signature verification');
    return { valid: true, reason: 'no-secret-configured' };
  }

  // Get the signature from any of these headers
  const signature = req.headers['x-sms-signature']
    || req.headers['x-signature']
    || req.headers['x-webhook-signature'];

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

  return { valid: isValid, reason: isValid ? 'valid' : 'signature-mismatch' };
}

// Parse SMS to extract payment details
function parseMomoSMS(text) {
  if (!text) return null;
  const sms = text.toString().trim();

  // Extract amount — handles "UGX 150,000", "Ugx.150000", "UGX150000", etc.
  let amount = 0;
  const amountMatch = sms.match(/UGX\.?\s*([\d,]+)/i) || sms.match(/ugx\.?\s*([\d,]+)/i);
  if (amountMatch) {
    amount = parseInt(amountMatch[1].replace(/,/g, ''));
  }

  // Extract reference code — handles "Reason: SSEW-AB12", "Ref: SSEW-AB12", etc.
  let reference = null;
  const refMatch = sms.match(/SSEW-[A-F0-9]{4,8}/i) || sms.match(/reason[:\s]+(SSEW-[A-Z0-9]+)/i) || sms.match(/ref[:\s]+(SSEW-[A-Z0-9]+)/i);
  if (refMatch) {
    reference = (refMatch[1] || refMatch[0]).toUpperCase();
  }

  // Extract sender phone
  let senderPhone = null;
  const phoneMatch = sms.match(/from\s+([\d\s+]{10,15})/i) || sms.match(/(\+?256\d{9})/) || sms.match(/(0\d{9})/);
  if (phoneMatch) {
    senderPhone = phoneMatch[1].trim();
  }

  // Detect network (MTN vs Airtel)
  let network = 'unknown';
  if (/mtn/i.test(sms) || /0789/i.test(sms) || /077/i.test(sms)) network = 'MTN';
  else if (/airtel/i.test(sms) || /0752/i.test(sms) || /075/i.test(sms)) network = 'Airtel';

  return { amount, reference, senderPhone, network, rawText: sms };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-SMS-Signature, X-Signature, X-Webhook-Signature');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // ═══════════════════════════════════════════════════════════
  // HMAC-SHA256 signature verification
  // ═══════════════════════════════════════════════════════════
  const sigCheck = verifySmsSignature(req);
  if (!sigCheck.valid) {
    console.error(`[SMS Payment] REJECTED: ${sigCheck.reason}`);
    return res.status(401).json({
      success: false,
      error: 'Invalid webhook signature',
      reason: sigCheck.reason,
    });
  }
  console.log(`[SMS Payment] Signature verified (${sigCheck.reason})`);

  // SMS Forwarder apps send SMS text in various formats — handle all
  const body = req.body || {};
  const smsText = body.text || body.message || body.sms || body.body || (typeof body === 'string' ? body : JSON.stringify(body));

  console.log('[sms-payment] Received SMS:', smsText.substring(0, 200));

  const parsed = parseMomoSMS(smsText);
  if (!parsed) {
    return res.status(200).json({ status: 'ignored', reason: 'Could not parse SMS' });
  }

  console.log('[sms-payment] Parsed:', JSON.stringify(parsed));

  // Must have at least an amount to proceed
  if (!parsed.amount || parsed.amount < 1000) {
    return res.status(200).json({ status: 'ignored', reason: 'Amount not found or too small' });
  }

  // Determine tier based on amount
  const tier = parsed.amount >= 300000 ? 'PREM' : 'ORD';
  const tierName = tier === 'PREM' ? 'Premium' : 'Ordinary';

  // If we have a reference code → look it up in the licenses table
  if (parsed.reference) {
    try {
      const { data: existing } = await supabase
        .from('licenses')
        .select('*')
        .eq('hwid', parsed.reference)
        .eq('is_active', false)
        .single();

      if (existing) {
        // Found the pending reference — generate license!
        const hwidHash = crypto.createHash('sha256').update(parsed.reference).digest('hex').substring(0, 16);
        const seg1 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const seg2 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const licenseKey = `SSEWASSWA-${tier}-${seg1}-${seg2}-${hwidHash}`;

        // Update the license record
        await supabase.from('licenses').update({
          license_key: licenseKey,
          is_active: true,
          amount_paid: parsed.amount,
          payment_reference: parsed.reference,
          activated_at: new Date().toISOString()
        }).eq('hwid', parsed.reference);

        // Email the customer
        if (existing.email && process.env.DEV_EMAIL && process.env.GMAIL_APP_PASS) {
          try {
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: { user: process.env.DEV_EMAIL, pass: process.env.GMAIL_APP_PASS }
            });
            await transporter.sendMail({
              from: `"Ssewasswa Comforts Technologies" <${process.env.DEV_EMAIL}>`,
              to: existing.email,
              subject: `Your Ssewasswa ERP ${tierName} Activation Key`,
              html: `<h2>Thank you for your payment, ${existing.customer_name || 'Customer'}!</h2>
                <p>Your ${tierName} Access activation key is:</p>
                <h1 style="color:#1a73e8; background:#e8f0fe; padding:14px; border-radius:8px; text-align:center; font-family:monospace;">${licenseKey}</h1>
                <p><strong>Amount paid:</strong> UGX ${parsed.amount.toLocaleString()}</p>
                <p><strong>Tier:</strong> ${tierName} Access</p>
                <h3>To activate:</h3>
                <ol>
                  <li>Download the Ssewasswa School ERP desktop app from <a href="https://ssewasswa-school.pages.dev">our website</a>.</li>
                  <li>Install and open the app on your computer.</li>
                  <li>On the Activation page, paste the key above into the input.</li>
                  <li>Click "Activate Software".</li>
                </ol>
                <p>Need help? WhatsApp: <a href="https://wa.me/256789736737">+256 789 736 737</a> (MTN) or <a href="https://wa.me/256752971118">+256 752 971 118</a> (Airtel)</p>
                <p>Best regards,<br/>Ssewasswa Comforts Technologies</p>`
            });
            console.log('[sms-payment] License emailed to', existing.email);
          } catch (emailErr) {
            console.log('[sms-payment] Email failed:', emailErr.message);
          }
        }

        return res.status(200).json({
          status: 'success',
          reference: parsed.reference,
          license_key: licenseKey,
          tier: tier,
          amount: parsed.amount,
          emailed_to: existing.email
        });
      }
    } catch (lookupErr) {
      console.log('[sms-payment] Reference lookup error:', lookupErr.message);
    }
  }

  // No reference found OR reference not in database
  // Generate a license anyway (but we don't know the customer email)
  // Save with the sender phone as a fallback
  const fallbackHwid = parsed.senderPhone || ('SMS-' + Date.now());
  const hwidHash = crypto.createHash('sha256').update(fallbackHwid).digest('hex').substring(0, 16);
  const seg1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const seg2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const licenseKey = `SSEWASSWA-${tier}-${seg1}-${seg2}-${hwidHash}`;

  try {
    await supabase.from('licenses').upsert([{
      hwid: fallbackHwid,
      email: 'unknown@sms-payment',
      customer_name: 'SMS Payment (no reference)',
      tier: tier,
      amount_paid: parsed.amount,
      is_active: true,
      license_key: licenseKey,
      payment_reference: parsed.reference || 'none',
      created_at: new Date().toISOString()
    }], { onConflict: 'hwid' });
  } catch (e) {
    console.log('[sms-payment] Save error:', e.message);
  }

  return res.status(200).json({
    status: 'no_reference',
    license_key: licenseKey,
    tier: tier,
    amount: parsed.amount,
    note: 'Payment received but no reference code found. License generated but customer email unknown. Check admin panel to assign manually.'
  });
};
