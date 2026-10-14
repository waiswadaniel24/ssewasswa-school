// /api/pesapal-initiate.js — Vercel serverless function
// Initiates a Pesapal payment for a subscription. Returns the redirect URL.
// Customer pays via Pesapal (card, mobile money, bank), then Pesapal calls /api/pesapal-webhook
//
// Pesapal v3 API endpoints (confirmed):
//   Auth:           POST {PESAPAL_API_BASE}/api/Auth/RequestToken
//   Submit order:   POST {PESAPAL_API_BASE}/api/Transactions/SubmitOrderRequest  ← the correct path!
//   Production:     https://pay.pesapal.com/v3
//   Sandbox:        https://cybqa.pesapal.com/pesapalv3

const PESAPAL_API_BASE = process.env.PESAPAL_API_BASE || 'https://pay.pesapal.com/v3';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { tier, hwid, email, customer_name } = req.body || {};
  
  if (!hwid || !email) {
    return res.status(400).json({ error: 'Missing required fields: hwid, email' });
  }
  
  const amount = tier === 'PREM' ? 300000 : 150000;
  const tierName = tier === 'PREM' ? 'Premium' : 'Ordinary';
  
  const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
  const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;
  
  if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
    return res.status(200).json({
      status: 'manual',
      amount, tier: tierName,
      instructions: 'Pay via MTN MoMo to 0752 971 118 (Kusuya Grace) OR Airtel Money to 0789 738 420 (Waiswa Moses). Send payment screenshot + your HWID to WhatsApp +256 752 971 118 to receive your license key.',
      momo_numbers: [
        { name: 'Kusuya Grace', number: '0752971118', network: 'MTN' },
        { name: 'Waiswa Moses', number: '0789738420', network: 'Airtel' }
      ],
      whatsapp: 'https://wa.me/256752971118'
    });
  }
  
  try {
    // Step 1: Get OAuth token (POST /api/Auth/RequestToken)
    console.log('[Pesapal] Step 1: Get auth token from', PESAPAL_API_BASE);
    const tokenRes = await fetch(`${PESAPAL_API_BASE}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ consumer_key: PESAPAL_CONSUMER_KEY, consumer_secret: PESAPAL_CONSUMER_SECRET })
    });
    
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Auth failed: ${tokenRes.status} - ${text.substring(0, 200)}`);
    }
    
    const tokenData = await tokenRes.json();
    if (!tokenData.token) throw new Error('No token in Pesapal response: ' + JSON.stringify(tokenData).substring(0, 200));
    console.log('[Pesapal] Got token, expires:', tokenData.expiryDate);
    
    // Step 2: Submit order (POST /api/Transactions/SubmitOrderRequest) — the CORRECT endpoint!
    const callbackUrl = process.env.PESAPAL_CALLBACK_URL || 'https://ssewasswa-school.pages.dev/welcome';
    const ipnUrl = process.env.PESAPAL_IPN_URL || 'https://ssewasswa-school.vercel.app/api/pesapal-webhook';
    const orderId = `${hwid}-${Date.now()}`;
    
    console.log('[Pesapal] Step 2: Submit order', orderId, 'amount:', amount, 'to:', PESAPAL_API_BASE + '/api/Transactions/SubmitOrderRequest');
    const orderRes = await fetch(`${PESAPAL_API_BASE}/api/Transactions/SubmitOrderRequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        id: orderId,
        currency: 'UGX',
        amount: amount,
        description: `Ssewasswa ERP ${tierName} Access — 1 year subscription`,
        callback_url: callbackUrl,
        notification_mode: 'IPN',
        billing_address: {
          email_address: email,
          first_name: customer_name || 'Customer',
          phone_number: ''
        }
      })
    });
    
    if (!orderRes.ok) {
      const text = await orderRes.text();
      throw new Error(`Submit failed: ${orderRes.status} - ${text.substring(0, 300)}`);
    }
    
    const orderData = await orderRes.json();
    console.log('[Pesapal] Order response:', JSON.stringify(orderData).substring(0, 500));
    
    // Pesapal returns: { order_tracking_id, redirect_url, status, message }
    if (orderData.redirect_url) {
      return res.status(200).json({
        status: 'pesapal',
        redirect_url: orderData.redirect_url,
        order_tracking_id: orderData.order_tracking_id,
        amount, tier: tierName
      });
    }
    throw new Error('No redirect_url in Pesapal response: ' + JSON.stringify(orderData).substring(0, 500));
  } catch (err) {
    console.error('[Pesapal Initiate] Error:', err.message);
    return res.status(200).json({
      status: 'manual',
      amount, tier: tierName,
      instructions: 'Pesapal unavailable. Pay via MTN MoMo to 0752 971 118 (Kusuya Grace) OR Airtel to 0789 738 420 (Waiswa Moses).',
      momo_numbers: [
        { name: 'Kusuya Grace', number: '0752971118', network: 'MTN' },
        { name: 'Waiswa Moses', number: '0789738420', network: 'Airtel' }
      ],
      whatsapp: 'https://wa.me/256752971118',
      error: err.message
    });
  }
};
