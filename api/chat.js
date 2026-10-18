// /api/chat.js — Vercel serverless function for AI chatbot
// Uses z-ai-web-dev-sdk to provide quick help for visitors
// Pre-configured with knowledge about Ssewasswa ERP (pricing, features, contacts)
// Gracefully falls back to rule-based responses if the SDK fails to load

let ZAI = null;
let zaiInstance = null;
let sdkLoadError = null;

// Try to load z-ai-web-dev-sdk (might fail if not installed)
try {
  ZAI = require('z-ai-web-dev-sdk').default || require('z-ai-web-dev-sdk');
} catch (err) {
  sdkLoadError = err.message;
  console.log('[chat] WARNING: z-ai-web-dev-sdk could not be loaded:', err.message);
  console.log('[chat] Falling back to rule-based responses.');
}

async function getZAI() {
  if (!ZAI) return null;
  if (!zaiInstance) {
    try { zaiInstance = await ZAI.create(); }
    catch (err) { console.log('[chat] ZAI.create() failed:', err.message); return null; }
  }
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

RULES:
- Be friendly, concise, and helpful
- Use bullet points for clarity
- Always end complex answers with "Anything else I can help with?"
- If you do not know something, say "Let me refer you to our support team: WhatsApp +256 752 971 118"
- Never make up prices or features — only use the info above
- Keep responses under 200 words when possible
`;

// Rule-based fallback (used if SDK not loaded)
function ruleBasedResponse(message) {
  const m = (message || '').toLowerCase();
  if (m.includes('price') || m.includes('cost') || m.includes('how much')) {
    return 'We have 2 subscription plans:\n\n- Ordinary Access: UGX 150,000/year (Students, Staff, Fees, Exams, Report Cards)\n- Premium Access: UGX 300,000/year (All Ordinary + EMIS + UNEB + Multi-school + Auto-Docs)\n\nAnything else I can help with?';
  }
  if (m.includes('subscribe') || m.includes('buy') || m.includes('purchase')) {
    return 'To subscribe:\n1. Visit https://ssewasswa-school.pages.dev/\n2. Click "Subscribe to Ordinary" or "Subscribe to Premium"\n3. Enter your name + email\n4. Pay via MTN/Airtel MoMo OR Pesapal\n5. Send payment screenshot + HWID via WhatsApp\n6. Receive license key via email';
  }
  if (m.includes('payment') || m.includes('pay')) {
    return 'Payment methods:\n- MTN MoMo: 0752 971 118 (Kusuya Grace)\n- Airtel Money: 0789 738 420 (Waiswa Moses)\n- Online: Pesapal (Visa/Mastercard)';
  }
  if (m.includes('download') || m.includes('app') || m.includes('install')) {
    return 'Download the desktop app here:\nhttps://github.com/waiswadaniel24/ssewasswa-school/releases/download/v10.0.0/Ssewasswa-School-ERP-V10-Setup.exe\n\n(130 MB, Windows 7+ 64-bit)';
  }
  if (m.includes('contact') || m.includes('support') || m.includes('help') || m.includes('whatsapp')) {
    return 'Contact us:\n- WhatsApp: +256 752 971 118 (Kusuya Grace)\n- Phone: +256 789 738 420 (Waiswa Moses)\n- Email: support@ssewasswacomfortstechnologies.com';
  }
  if (m.includes('ordinary') || m.includes('premium') || m.includes('difference')) {
    return 'Ordinary (UGX 150k): Students, Staff, Fees, Exams, Report Cards.\n\nPremium (UGX 300k) adds: EMIS compliance, UNEB API, Multi-school, Auto-Docs, Priority support.';
  }
  if (m.includes('hi') || m.includes('hello') || m.includes('hey')) {
    return 'Hello! I am the Ssewasswa ERP assistant. Ask me about pricing, payment methods, or how to subscribe.';
  }
  return 'I can help with: pricing, payment methods, subscription, downloads, contacts, features. What would you like to know?\n\nFor complex questions, contact our support team on WhatsApp: +256 752 971 118';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { message, history = [] } = req.body || {};

  if (!message || typeof message !== 'string' || message.length > 500) {
    return res.status(400).json({ error: 'Message is required (max 500 chars)' });
  }

  // If SDK not loaded, use rule-based fallback
  if (!ZAI) {
    return res.status(200).json({
      success: true,
      response: ruleBasedResponse(message),
      mode: 'rule-based',
      note: sdkLoadError ? `SDK unavailable: ${sdkLoadError.substring(0, 80)}` : null
    });
  }

  try {
    const zai = await getZAI();
    if (!zai) {
      // SDK loaded but failed to initialize — use fallback
      return res.status(200).json({
        success: true,
        response: ruleBasedResponse(message),
        mode: 'rule-based-fallback',
        note: 'SDK initialization failed'
      });
    }

    const messages = [
      { role: 'assistant', content: SYSTEM_PROMPT },
      ...history.slice(-10).map(h => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' }
    });

    const response = completion.choices[0]?.message?.content || ruleBasedResponse(message);

    return res.status(200).json({
      success: true,
      response,
      mode: 'ai'
    });
  } catch (err) {
    console.error('[chat] Error:', err.message);
    return res.status(200).json({
      success: true,  // still "success" because we have a fallback
      response: ruleBasedResponse(message),
      mode: 'rule-based-error',
      error: err.message
    });
  }
};
