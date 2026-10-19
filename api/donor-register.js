// FileName: api/donor-register.js
// Vercel serverless — registers a new donor (free).
// Uses Supabase service role key to bypass RLS (write to public donors table).

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  // Use service role key for write access (kept server-side only)
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(503).json({ success: false, error: 'Supabase service key not configured' });
  }

  let body;
  try {
    // Vercel auto-parses application/json into an object; req.body may already
    // be an object. Handle both cases (string or object).
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object') throw new Error('not object');
  } catch { return res.status(400).json({ success: false, error: 'Invalid JSON' }); }

  const { donorName, organization, email, phone, country, interestAreas, capacity } = body;
  if (!donorName || !email) {
    return res.status(400).json({ success: false, error: 'donorName and email are required' });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/donors`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        donor_name: donorName,
        organization: organization || null,
        email,
        phone: phone || null,
        country: country || 'Uganda',
        interest_areas: JSON.stringify(interestAreas || []),
        capacity: capacity || null,
        verified: false,  // Admin verifies manually
        created_at: new Date().toISOString(),
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      return res.status(400).json({ success: false, error: `Supabase error: ${errText}` });
    }
    return res.status(201).json({ success: true, message: 'Donor registered. We will verify and connect you with matching institutions.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
