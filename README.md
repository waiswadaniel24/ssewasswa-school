# 🏫 Ssewasswa Comforts School ERP V10

> **❓ Confused about source code on this page?**
> This is the **SOURCE CODE repository** on GitHub — you're seeing the code files (`.js`, `.jsx`, etc.) that power the app.
> To use the actual application, visit the **LIVE WEBSITE** 👇

## 🌐 Live Website (Click to use the app)

| URL | Purpose |
|---|---|
| 🌍 **https://ssewasswa-school.pages.dev/** | Main website (Cloudflare Pages — primary) |
| 🌍 https://ssewasswa-school.vercel.app/ | Mirror (Vercel — backup) |
| 💻 https://github.com/waiswadaniel24/ssewasswa-school/releases/tag/v10.0.0 | Download Windows desktop installer |

**👉 Open https://ssewasswa-school.pages.dev/ in your browser to use the app.**

---

## 📋 About

**Ssewasswa Comforts School ERP V10** — a complete school management system for Ugandan schools. EMIS-compliant, UNEB-integrated, works on desktop (Windows) + web (phone/tablet/computer).

- **Owner:** Ssewasswa Comforts Technologies, Uganda 🇺🇬
- **Version:** 10.0.0
- **Pricing:** Ordinary UGX 150,000/year · Premium UGX 300,000/year

## ✨ Features

### Web App (Cloudflare Pages + Vercel)
- ✅ Public marketing landing page with subscription plans
- ✅ Customer signup + email verification
- ✅ Online payment via MTN MoMo, Airtel Money, or Pesapal
- ✅ License key generation + automatic email delivery
- ✅ PWA support (installable + offline)
- ✅ Mobile-responsive (works on phone/tablet/desktop)
- ✅ SEO optimized (sitemap, robots.txt, JSON-LD structured data)
- ✅ AI Chatbot for quick help

### Desktop App (Windows .exe)
- ✅ 65+ ERP modules (Students, Staff, Academics, Finance, EMIS, UNEB, etc.)
- ✅ Offline SQLite database (encrypted at rest)
- ✅ HWID-bound license activation
- ✅ Africa's Talking SMS integration
- ✅ Cloudinary image storage
- ✅ Multi-school management
- ✅ Automated Document Engine (bulk report cards, ID cards)

## 💳 Subscription Plans

| Tier | Price | Features |
|---|---|---|
| **Ordinary** | UGX 150,000/year | Students, Staff, Fees, Exams, Report Cards |
| **Premium ⭐** | UGX 300,000/year | All Ordinary + EMIS + UNEB + Multi-school + Auto-Docs |

## 📞 Contact

- WhatsApp / MTN: +256 752 971 118 (Kusuya Grace)
- Call / Airtel: +256 789 738 420 (Waiswa Moses)
- Email: support@ssewasswacomfortstechnologies.com

## 🚀 For Developers (Source Code)

If you're a developer wanting to run this locally:

```bash
# Clone the repo
git clone https://github.com/waiswadaniel24/ssewasswa-school.git
cd ssewasswa-school

# Install dependencies
npm install --legacy-peer-deps

# Run in development (Vite + Electron)
npm run dev

# Build for production
npm run build

# Package as Windows .exe
npm run package
```

### Tech Stack
- **Frontend:** React 18 + Vite 5 + React Router 6
- **Desktop:** Electron 28 + electron-builder
- **DB (web):** Supabase (auth + storage) + Neon Postgres (failover)
- **DB (desktop):** sql.js (SQLite WASM, encrypted at rest)
- **Payments:** Pesapal v3 API + manual MTN/Airtel MoMo
- **License API:** Cloudflare Worker + Vercel serverless functions
- **Hosting:** Cloudflare Pages (primary) + Vercel (mirror)
- **AI:** z-ai-web-dev-sdk for chatbot

### Environment Variables
See `.env.example` for required env vars (Supabase, Pesapal, GMAIL_APP_PASS, etc.)

---

**⚠️ Note:** This is a commercial product. Unauthorized copying, redistribution, or resale is prohibited. License keys are HWID-bound.
