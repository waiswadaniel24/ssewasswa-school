// FileName: api/business-directory.js
// Vercel serverless function — fetches all paid-up businesses from Supabase.
// Public endpoint (no auth) — anyone can browse.

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(503).json({ success: false, error: 'Supabase not configured', businesses: [] });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/business_ads?select=*&status=eq.active&order=created_at.desc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    const rows = await r.json();
    return res.status(200).json({ success: true, businesses: rows || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, businesses: [] });
  }
};
