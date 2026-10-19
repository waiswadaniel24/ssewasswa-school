// FileName: api/news.js
// Vercel serverless — fetches recent news articles (public).

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
    // Return some seed articles if Supabase not configured
    return res.status(200).json({
      success: true,
      news: [
        { id: 1, category: 'product', title: 'Ssewasswa ERP V10 launched', summary: 'New version with HMIS, auto-update, and 16 education sectors.', publishedAt: new Date().toISOString() },
        { id: 2, category: 'education', title: 'UNEB PLE results release', summary: 'Primary Leaving Examination results for 2025 are out. Schools can download via the UNEB portal.', publishedAt: new Date().toISOString() },
        { id: 3, category: 'health', title: 'DHIS2 quarterly reporting', summary: 'All Health Center IIIs and above must submit DHIS2 reports by end of quarter.', publishedAt: new Date().toISOString() },
      ],
    });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/news_articles?select=*&order=published_at.desc&limit=10`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const articles = await r.json();
    return res.status(200).json({ success: true, news: articles || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, news: [] });
  }
};
