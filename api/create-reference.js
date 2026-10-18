// /api/create-reference.js — Generates a unique payment reference code
// Customer uses this code as the "reason" when paying via MoMo
// The reference is linked to the customer email + tier in the licenses table
// When payment SMS arrives (via SMS Forwarder) → webhook finds the reference → generates license → emails customer

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { email, tier, customer_name, hwid } = req.body || {};
  if (!email || !tier) {
    return res.status(400).json({ error: 'Email and tier are required' });
  }

  const amount = tier === 'PREM' ? 300000 : 150000;

  // Generate unique reference code: SSEW-XXXX (6 chars, easy to type as payment reason)
  const refCode = 'SSEW-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  try {
    // Save to licenses table with is_active=false (pending payment)
    // Use the reference code as the HWID (so we can look it up when SMS arrives)
    const { data, error } = await supabase.from('licenses').upsert([{
      hwid: refCode,  // Use reference code as HWID for lookup
      email: email,
      customer_name: customer_name || 'Customer',
      tier: tier,
      amount_paid: 0,  // 0 until payment confirmed
      is_active: false,  // Inactive until payment confirmed
      license_key: null,  // No license key yet
      payment_reference: refCode,
      created_at: new Date().toISOString()
    }], { onConflict: 'hwid' }).select();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      reference: refCode,
      amount: amount,
      tier: tier,
      mtn_number: '0789736737',
      airtel_number: '0752971118',
      instructions: `Pay UGX ${amount.toLocaleString()} to MTN ${'0789736737'} or Airtel ${'0752971118'}. Use "${refCode}" as the payment reason. Your license key will be emailed to ${email} automatically after payment.`,
      note: 'You will receive your license key via email within 1-2 minutes after payment.'
    });
  } catch (err) {
    console.error('[create-reference] Error:', err.message);
    return res.status(200).json({
      success: false,
      error: 'Could not create reference. Please try manual payment.',
      mtn_number: '0789736737',
      airtel_number: '0752971118'
    });
  }
};
