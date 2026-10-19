// FileName: api/news-subscribe.js
// Vercel serverless — subscribes a user to news (free email tier).
// Uses Supabase service role to write to news_subscribers table.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(503).json({ success: false, error: 'Supabase service key not configured' });
  }

  let body;
  try { body = JSON.parse(req.body); } catch { return res.status(400).json({ success: false, error: 'Invalid JSON' }); }

  const { email, name, categories, role, institutionName } = body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/news_subscribers`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        email,
        name: name || null,
        categories: JSON.stringify(categories || ['education']),
        role: role || null,
        institution_name: institutionName || null,
        tier: 'email',
        status: 'active',
        created_at: new Date().toISOString(),
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      // Likely a duplicate email (unique constraint)
      if (errText.includes('duplicate') || errText.includes('unique')) {
        return res.status(200).json({ success: true, message: 'You are already subscribed!' });
      }
      return res.status(400).json({ success: false, error: `Supabase error: ${errText}` });
    }
    return res.status(201).json({ success: true, message: 'Subscribed successfully. Check your email for confirmation.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
