// FileName: api/donor-marketplace.js
// Vercel serverless function — fetches:
// 1. Verified donors (public — name, organization, interest areas only)
// 2. Institutions seeking support (public — name, location, needs, description)

module.exports = async (req, res) => {
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
    return res.status(503).json({ success: false, error: 'Supabase not configured', donors: [], institutions: [] });
  }

  try {
    const [donorsRes, instRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/donors?select=id,donor_name,organization,interest_areas,verified&order=created_at.desc&limit=20`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      }),
      fetch(`${SUPABASE_URL}/rest/v1/donor_institutions?select=*&status=eq.active&order=created_at.desc&limit=12`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      }),
    ]);
    const donors = await donorsRes.json();
    const institutions = await instRes.json();
    return res.status(200).json({ success: true, donors: donors || [], institutions: institutions || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, donors: [], institutions: [] });
  }
};
