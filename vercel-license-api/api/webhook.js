const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const n = req.body;
  if (n.status === 'COMPLETED') {
    const hwid = n.merchant_reference || n.hwid || 'UNKNOWN_HWID';
    const userEmail = n.email || n.customer_email;
    const tier = (n.amount || 0) >= 300000 ? 'PREM' : 'ORD';
    if (hwid === 'UNKNOWN_HWID' || !userEmail) return res.status(200).json({ status: 'ignored' });
    const hwidHash = crypto.createHash('sha256').update(hwid).digest('hex').substring(0, 16);
    const licenseKey = `SSEWASSWA-${tier}-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${hwidHash}`;
    await supabase.from('licenses').upsert([{ hwid, email: userEmail, license_key: licenseKey, tier, amount_paid: n.amount || 0 }]);
    return res.status(200).json({ status: 'success', key: licenseKey });
  }
  return res.status(200).json({ status: 'pending' });
};
