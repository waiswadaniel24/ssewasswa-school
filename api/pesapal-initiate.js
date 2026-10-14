// /api/pesapal-initiate.js — Vercel serverless function
// Initiates a Pesapal payment for a subscription. Returns the redirect URL.
// Customer pays via Pesapal (card, mobile money, bank), then Pesapal calls /api/pesapal-webhook

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
    // If Pesapal not configured, return manual payment instructions
    return res.status(200).json({
      status: 'manual',
      amount,
      tier: tierName,
      instructions: 'Pay via MTN MoMo to 0752 971 118 (Kusuya Grace) OR Airtel Money to 0789 738 420 (Waiswa Moses). Send payment screenshot + your HWID to WhatsApp +256 752 971 118 to receive your license key.',
      momo_numbers: [
        { name: 'Kusuya Grace', number: '0752971118', network: 'MTN' },
        { name: 'Waiswa Moses', number: '0789738420', network: 'Airtel' }
      ],
      whatsapp: 'https://wa.me/256752971118'
    });
  }
  
  // If Pesapal IS configured, initiate real payment
  try {
    // Step 1: Get OAuth token from Pesapal
    const tokenRes = await fetch('https://cyberventures.pesapal.com/pesapalv3/merchant/auth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ consumer_key: PESAPAL_CONSUMER_KEY, consumer_secret: PESAPAL_CONSUMER_SECRET })
    });
    const tokenData = await tokenRes.json();
    
    if (!tokenData.token) throw new Error('Failed to get Pesapal token');
    
    // Step 2: Submit order to Pesapal
    const callbackUrl = process.env.PESAPAL_CALLBACK_URL || 'https://ssewasswa-school.pages.dev/welcome';
    const ipnUrl = process.env.PESAPAL_IPN_URL || 'https://ssewasswa-school.vercel.app/api/pesapal-webhook';
    
    const orderRes = await fetch('https://cyberventures.pesapal.com/pesapalv3/api/Transactions/SubmitOrder', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenData.token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        id: `${hwid}-${Date.now()}`,
        currency: 'UGX',
        amount: amount,
        description: `Ssewasswa ERP ${tierName} Access — 1 year`,
        callback_url: callbackUrl,
        notification_mode: 'IPN',
        billing_address: {
          email_address: email,
          first_name: customer_name || 'Customer',
          phone_number: ''
        }
      })
    });
    const orderData = await orderRes.json();
    
    if (orderData.redirect_url) {
      return res.status(200).json({
        status: 'pesapal',
        redirect_url: orderData.redirect_url,
        amount, tier: tierName
      });
    }
    throw new Error('No redirect URL from Pesapal');
  } catch (err) {
    console.error('[Pesapal Initiate] Error:', err.message);
    // Fallback to manual payment
    return res.status(200).json({
      status: 'manual',
      amount,
      tier: tierName,
      instructions: 'Pesapal unavailable. Pay via MTN MoMo to 0752 971 118 (Kusuya Grace) OR Airtel to 0789 738 420 (Waiswa Moses).',
      error: err.message
    });
  }
};
