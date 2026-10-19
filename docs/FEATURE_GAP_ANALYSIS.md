# Feature Gap Analysis — ssewasswa-api vs ssewasswa-school

## 📊 At a glance

| Metric | ssewasswa-api (old) | ssewasswa-school (current) |
|--------|---------------------|----------------------------|
| Total routes | **1,119** | **86** |
| Lines of code | **23,425** (20,735 server.js + 2,690 launch-routes.js) | ~15,000 (React frontend only) |
| Architecture | Monolithic Express + Postgres + Render | React SPA + Electron + Cloudflare + Vercel + Supabase |
| Last updated | 2026-06-28 (4 months ago) | 2026-10-19 (today) |
| Multi-tenant | Yes (5 portals) | No (single-tenant per install) |
| Public JSON API | Yes (full `/api/v1/*` REST) | Limited (serverless functions only) |

## 🏢 Major portals in old API that we're MISSING

The old API served 5 distinct user segments. We only serve 2 (schools + hospitals).

### Missing portal #1: Business / SME
The old API had a full **business portal** (80+ routes) with:
- **POS (Point of Sale)** — `GET /business/pos`, `POST /business/pos/checkout`
- Sales tracking — `GET /business/sales`, `GET /business/charts/sales`
- Customer CRM — `GET /business/customers` (CRUD)
- Supplier management — `GET /suppliers` (CRUD)
- Multi-branch — `GET /branches`
- Expense tracking + `GET /business/charts/expenses`
- Debt payoff planner — `GET /debt-payoff`
- Bill reminders — `GET /bill-reminders`
- Loyalty points — `GET /loyalty`

### Missing portal #2: Church / Religious Organization
68+ routes for churches:
- **Tithes** tracking — `GET /church/tithes`, `POST /church/tithes/save`
- **Donations** tracking — `GET /church/charts/donations`
- **Sermons** library — `GET /church/sermons` (CRUD)
- **Committees** — `GET /committees`
- **Volunteer hours** — `GET /volunteer-hours`

### Missing portal #3: Org / NGO / CBO
45 routes for organizations:
- Member directory — `GET /org/members` (CRUD + import)
- Membership registration — `GET /org/register`
- Finance tracking — `GET /org/charts/finance`
- Member chart — `GET /org/charts/members`

### Missing portal #4: Individual / Personal
11 routes for personal users:
- Personal budget — `GET /individual/budget` (CRUD + charts)
- Savings goals — `GET /individual/goals` (CRUD)

### Missing portal #5: Clinic (different from HMIS)
46 routes — note this was a smaller "clinic staff" portal, NOT a full HMIS:
- Staff management — `GET /clinic/staff` (CRUD)
- Patient queue — `GET /clinic/queue`

## 🧩 Cross-cutting features missing from current platform

These features existed across ALL portals in the old API. We have NONE of them.

### Communication & Engagement (HIGH priority — common requests)

| Feature | Old API routes | What it does |
|---------|----------------|--------------|
| **Real-time Chat** | `/chat`, `/chat/new`, `/chat/:id/join`, `/chat/:id/send` | WebSocket-based group chat between users |
| **Forums** | `/forums` | Discussion boards with threads + replies |
| **Bulk SMS** | `/sms`, `/sms-campaigns` | Send bulk SMS via Africa's Talking |
| **Email Templates** | `/email-templates` | Pre-designed email templates for common messages |
| **Push Notifications** | `/push` | Web push notifications (web-push VAPID) |
| **Notifications** | `/notifications` | In-app notification center |
| **Events** | `/events` | Calendar events with registration |

### Automation & Workflow

| Feature | Old API routes | What it does |
|---------|----------------|--------------|
| **Workflows** | `/workflows`, `/workflows/new`, `/workflows/:id/toggle` | Trigger-action rules (e.g. "when fee paid → send receipt") |
| **Automations** | `/automations` | Scheduled job runner |
| **Scheduled Reports** | `/scheduled-reports` | Auto-send reports daily/weekly/monthly |
| **Tasks** | `/tasks`, `/tasks/new`, `/tasks/:id/complete` | To-do list per user/team |
| **Recurring Donations** | `/donations/recurring`, `/donations/recurring/:id/pause` | Subscription-style donations with pause/resume |

### Commerce & Marketplace

| Feature | Old API routes | What it does |
|---------|----------------|--------------|
| **E-commerce Shop** | `/shop/browse`, `/shop/cart`, `/shop/checkout`, `/shop/orders` | Full online store with cart + checkout |
| **App Marketplace** | `/marketplace`, `/marketplace/:id/install` | Plugin/extension installation |
| **Plugins** | `/plugins` | Installed extensions |
| **Loyalty Points** | `/loyalty` | Reward points for purchases |
| **Fundraising** | `/fundraising`, `/fundraising/:id/donate` | Crowdfunding campaigns (we have /donors but only for institutions) |

### Analytics & Reporting

| Feature | Old API routes | What it does |
|---------|----------------|--------------|
| **Custom Report Builder** | `/report-builder` | Drag-and-drop report builder |
| **Benchmarks** | `/benchmarks` | Compare your metrics vs industry |
| **AI Insights** | `/ai-insights` | GPT-powered data analysis |
| **Analytics Dashboards** | `/analytics` | Business intelligence |

### Admin & Compliance

| Feature | Old API routes | What it does |
|---------|----------------|--------------|
| **API Keys** | `/api-keys`, `/api-keys/:id/revoke` | Self-serve API access tokens for integrations |
| **API Docs** | `/api-docs` | Auto-generated REST API docs (Swagger-style) |
| **Audit Logs** | `/audit-logs` | Track all user actions for compliance |
| **Login History** | `/login-history` | Track every login (IP, device, time) |
| **Roles & Permissions** | `/roles` | Granular RBAC editor |
| **Compliance** | `/compliance` | Regulatory checklist (e.g. GDPR, NDA, NIRA) |
| **Government Reports** | `/government-reports` | Pre-built reports for MoES, MoH, URSB, NSSF |
| **Trash / Soft Delete** | `/trash` | Recover accidentally deleted records |
| **Duplicates** | `/duplicates` | Find + merge duplicate entities |
| **Policies** | `/policies` | CMS for Terms, Privacy, Acceptable Use |
| **Opt-out** | `/opt-out` | GDPR right-to-be-forgotten workflow |
| **Custom Fields** | `/custom-fields` | Add custom fields to any entity |
| **Backup** | `/settings/backup`, `/settings/backup/download` | One-click DB backup to CSV + restore |

### Content & Marketing

| Feature | Old API routes | What it does |
|---------|----------------|--------------|
| **Blog/CMS** | `/blog` | Publish articles + news (we have /news but only as subscriber feed) |
| **Public Pages** | `/pages`, `/public-site` | Static page CMS (About, Mission, etc.) |
| **Homepage Builder** | `/homepage` | Drag-and-drop landing page builder |
| **Surveys** | `/surveys`, `/surveys/:id/respond` | Questionnaires with response collection |
| **Suggestions Box** | `/suggestions` | User-submitted feedback |
| **QR Codes** | `/qr-codes` | Generate QR codes (link to payments, forms, etc.) |
| **Barcodes** | `/barcode` | Generate + scan barcodes |
| **Deep Links** | `/deep-links`, `/dl/:code`, `/s/:code` | Short links for sharing |
| **USSD** | `/ussd` | Mobile USSD codes (e.g. dial *123# to check balance) |

### Mobile & PWA

| Feature | Old API routes | What it does |
|---------|----------------|--------------|
| **Biometrics Login** | `/biometrics` | Fingerprint / Face ID auth |
| **Manifest.json** | `/manifest.json`, `/sw.js` | PWA installation (we have this) |
| **Dark Mode Toggle** | `/toggle-dark`, `/dark-mode` | Server-side dark mode preference |

### Procurement & Inventory

| Feature | Old API routes | What it does |
|---------|----------------|--------------|
| **Requisitions** | `/requisitions` | Internal purchase requests |
| **Suppliers** | `/suppliers` | Vendor database (we have /purchases but not suppliers) |
| **Signing** | `/signing` | Document e-signing |

### Entertainment (unique to old API)

| Feature | Old API routes | What it does |
|---------|----------------|--------------|
| **Entertainment** | `/entertainment`, `/my-entertainment` | Video + music hosting |
| **Scrape Settings** | `/entertainment/scrape-settings` | Auto-scrape media from external sources |

## 🎯 What's UNIQUE in our current platform (not in old API)

These features we built that the old API doesn't have:

| Feature | Status |
|---------|--------|
| **HMIS (Hospital Management)** — patients, OPD, lab, pharmacy, billing, 6 facility types | ✅ New (old API only had basic /clinic) |
| **Sponsor marketplace** — paid business advertising | ✅ New (old API had generic /marketplace but for plugins) |
| **Donor Connection matching** — pairs institutions with verified donors | ✅ New (old API had /donations but only transactional) |
| **News subscription service** — free email + paid WhatsApp/SMS | ✅ New (old API had /blog only) |
| **PWA support** — service worker + manifest | ✅ New (old API had /sw.js but minimal) |
| **Auto-update (electron-updater)** — like WhatsApp desktop | ✅ New |
| **Hybrid cloud sync** — local SQLite ↔ Supabase | ✅ New |
| **Multi-search-engine indexing** — Google + Bing + Yandex + Baidu + DuckDuckGo | ✅ New |
| **16 education sectors** — Primary, Secondary, Tertiary, Vocational, Technical, etc. | ✅ New (old API had generic /school) |
| **6 Ugandan exam boards** — UNEB, UBTEB, NCHE, Nurses Council, AHPC, Kyambogo | ✅ New |
| **Desktop installable** (.exe + auto-update) | ✅ New (old API was web-only) |
| **Mobile installable** (PWA) | ✅ New |

## 📋 Priority recommendations — what to port next

If you want to gradually bring features over from the old API to the new platform, here's the priority order I recommend:

### 🟢 High priority — quick wins, high value

1. **Audit Logs + Login History** — schools/hospitals need this for compliance + security. Implement as a Supabase table + read-only admin page.
2. **Trash / Soft Delete** — recover accidentally deleted students/patients. Add `deleted_at` column to all tables.
3. **Backup + Restore** — one-click DB export to CSV/JSON. Already have auto-backup on desktop, just need UI.
4. **Tasks** — internal to-do list per user (Head Teacher assigns tasks to staff).
5. **Bulk SMS** — we have Africa's Talking integration on desktop, just need a UI for selecting recipients + writing messages.
6. **Notifications center** — in-app notifications bar (like the bell icon in Gmail).
7. **Custom Fields** — let schools/hospitals add custom fields to students/patients/staff.

### 🟡 Medium priority — significant features

8. **Events + Calendar** — school events, exam dates, parent meetings with registration. We have /calendar but it's empty.
9. **Surveys** — collect feedback from parents, students, patients, staff.
10. **Workflows** — trigger-action automation ("when fee paid → send receipt + update finance dashboard").
11. **Scheduled Reports** — auto-email weekly reports to school administration.
12. **API Keys** — let developers/integrators get API tokens to read school data programmatically.
13. **API Docs** — auto-document the marketplace APIs (we have 5 serverless functions, expose them properly).
14. **Email Templates** — pre-designed email templates (welcome, payment confirmation, exam results, etc.).
15. **Parent Portal** — separate login for parents to view children's attendance, fees, report cards.
16. **Student Portal** — separate login for students to view own attendance, marks, assignments.

### 🔴 Lower priority — significant scope

17. **E-commerce Shop** — full online store for selling school uniforms, books, supplies. Big scope.
18. **Fundraising Campaigns** — crowdfunding for school infrastructure, hospital equipment. We have /donors for institutions, but not for campaigns.
19. **Loyalty Points** — reward students/patients for attendance, on-time payment.
20. **Forums** — discussion boards for parents, staff, students.
21. **AI Insights** — GPT-powered data analysis ("why did grade 5 attendance drop last month?").
22. **Real-time Chat** — WebSocket-based messaging between teachers, parents, staff.
23. **Biometrics Login** — fingerprint auth (mobile/desktop).
24. **USSD** — dial codes for mobile (no internet) balance check + payment.

### ⛔ Skip — not relevant

- **Church portal** — not relevant for school ERP + HMIS
- **Business POS** — not relevant for schools/hospitals (unless selling uniforms)
- **Entertainment + Media scraping** — definitely skip
- **Multi-tenant architecture** — current single-tenant-per-install is simpler + matches desktop model

## 📦 Migration strategy

If you want to port features from old API to new platform:

1. **For UI features (Tasks, Surveys, Notifications, etc.)**:
   - Create new React pages in `src/pages/`
   - Add routes in `src/router/router.jsx`
   - Add Supabase tables (mirror the old Postgres schema)
   - Add serverless API in `api/` for any backend logic
   - Add menu items in `src/layout/Sidebar.jsx`

2. **For backend features (Workflows, Scheduled Reports, etc.)**:
   - Need a job runner — Vercel Cron Jobs or Supabase Edge Functions with `pg_cron`
   - More complex — schedule a separate session for each

3. **For real-time features (Chat, Push Notifications)**:
   - Use Supabase Realtime (built-in WebSocket) — much simpler than the old BullMQ + Redis approach
   - Or use Cloudflare Durable Objects

## 📌 Summary

The old `ssewasswa-api` platform had **~70 distinct feature areas** that the current `ssewasswa-school` platform doesn't have. The most impactful gaps:

1. **4 missing portals** (Business, Church, Org, Individual) — but you might not need these
2. **Communication tools** (Chat, SMS, Forums, Notifications) — high demand from schools
3. **Parent + Student portals** — major UX gap (parents can't view their children's data)
4. **Audit logs + soft-delete** — compliance gap
5. **Workflows + Automation** — major efficiency loss
6. **E-commerce** (if you sell uniforms/supplies)
7. **Surveys + Suggestion box** — easy to add, high engagement value

The current platform has **12 unique features** the old API didn't have (HMIS, sponsor marketplace, donor matching, PWA, auto-update, hybrid sync, multi-SE indexing, 16 education sectors, 6 exam boards, etc.) — so the new platform isn't strictly worse, it just focused on different things.
