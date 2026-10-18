// /api/chat.js — Vercel serverless function for AI chatbot
// Uses z-ai-web-dev-sdk to provide quick help for visitors
// Pre-configured with knowledge about Ssewasswa ERP (pricing, features, contacts)

const ZAI = require('z-ai-web-dev-sdk').default;

// Cache the ZAI instance across cold starts
let zaiInstance = null;
async function getZAI() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

// System prompt with all the info the chatbot needs to know
const SYSTEM_PROMPT = `You are the Ssewasswa Comforts School ERP assistant. You help visitors with quick questions about the school management system.

KEY INFO YOU KNOW:

**Product:** Ssewasswa Comforts School ERP V10 — school management system for Ugandan schools.

**Pricing:**
- Ordinary Access: UGX 150,000/year (Students, Staff, Fees, Exams, Report Cards, Basic Settings)
- Premium Access: UGX 300,000/year (All Ordinary + EMIS compliance + UNEB API + Multi-school + Auto-Docs)

**Payment methods:**
1. MTN Mobile Money to 0752 971 118 (Kusuya Grace)
2. Airtel Money to 0789 738 420 (Waiswa Moses)
3. Online via Pesapal (Visa/Mastercard)

**Live URLs:**
- Main website: https://ssewasswa-school.pages.dev/
- Download Windows app: https://github.com/waiswadaniel24/ssewasswa-school/releases/download/v10.0.0/Ssewasswa-School-ERP-V10-Setup.exe

**Contacts:**
- WhatsApp: https://wa.me/256752971118 (Kusuya Grace)
- Phone: +256 789 738 420 (Waiswa Moses)
- Email: support@ssewasswacomfortstechnologies.com

**Features:**
- Student admissions, profiles, attendance
- Staff management with role-based access
- Fees collection, receipts, balances
- Exams + report cards (Primary + Secondary)
- EMIS compliance (Premium)
- UNEB API integration (Premium)
- Multi-school management (Premium)
- Automated Document Engine (Premium)
- Offline desktop app (encrypted local DB)
- Mobile-responsive web (PWA installable)
- Hardware-bound license activation

**How to subscribe:**
1. Visit https://ssewasswa-school.pages.dev/
2. Click "Subscribe to Ordinary" or "Subscribe to Premium"
3. Enter your name + email (your HWID auto-generated)
4. Pay via MTN/Airtel MoMo OR Pesapal online
5. Send payment screenshot + HWID via WhatsApp to +256 752 971 118
6. Receive license key via email automatically
7. Download desktop app + activate with license key

**Support:** For complex issues, refer users to WhatsApp +256 752 971 118 (Kusuya Grace).

RULES:
- Be friendly, concise, and helpful
- Use bullet points for clarity
- Always end complex answers with "Anything else I can help with?"
- If you don't know something, say "Let me refer you to our support team: WhatsApp +256 752 971 118"
- Never make up prices or features — only use the info above
- Keep responses under 200 words when possible
- Use emojis sparingly (✅ 📱 💳 etc.)
`;

module.exports = async (req, res) => {
  // CORS — allow our own frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { message, history = [] } = req.body || {};

  if (!message || typeof message !== 'string' || message.length > 500) {
    return res.status(400).json({ error: 'Message is required (max 500 chars)' });
  }

  try {
    const zai = await getZAI();

    // Build conversation: system prompt + history + new message
    const messages = [
      { role: 'assistant', content: SYSTEM_PROMPT },
      ...history.slice(-10).map(h => ({  // Keep last 10 messages for context
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' }
    });

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return res.status(200).json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[chat] Error:', err.message);
    return res.status(200).json({
      success: false,
      response: 'I am having trouble connecting right now. Please contact our support team on WhatsApp: +256 752 971 118.',
      error: err.message
    });
  }
};
