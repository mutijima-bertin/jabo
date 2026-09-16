# Creative Sound Studio — Project Plan (v1)

> Status: IN BUILD — phases 1–15 done. Production-stack stress campaign + notifications fire-and-forget (p95 1.3s→336ms) landed at e4e9d68, pushed to main (previous: nightly CI fix d005885). SMTP still blocked on user's Resend API key. Nightly cron green expected on the 2026-09-16 02:00 UTC run. Last updated: 2026-09-16

## Company & Founder Context
- **Company**: Creative Sound Studio — Kigali, Rwanda. Media production: livestreaming, photography, videography (sound may be re-added later; name is legacy).
- **Founder**: Nkurunziza Jabo — video journalist/editor, studied Mass Communication at Mount Kenya University, ex-Radio 10. Started with sonorization services, switched to photography/videography in **2015**.
- **Credibility assets**: works with New Times, Kigali Today, FAO (director of pictures/videos, farming & agriculture sector) — government + non-government clients. Use on website.

## Product Decisions (agreed)
- **PRIORITY (2026-08-18, founder)**: presenting the work beautifully is #1 — everything must look clean and professional (founder already has clients; the showcase is what wins them). Booking is the #2 conversion layer; keep as built.
- **Booking flow (built, phase 5)**: client fills smart request form → auto email notification (magic link) + WhatsApp notification (if number on WhatsApp) + admin dashboard → admin confirms → client notified → payment discussed after confirmation (**NO prices on site**, decided 2026-08-18; custom quote per project) → client tracks production on their own dashboard via magic link. **NO client account creation.** Magic link → signed token → their private dashboard.
- **Statuses**: Pending → Confirmed → In Production → Delivered → Completed (+ Cancelled).
- **Admin panel**: Jabo logs in and manages everything — services, prices, portfolio (drag-and-drop upload), bookings, site content. All real-time, no hardcoded content. Must be reusable/sellable as a product.
- **Payments**: after contact/confirmation, not online (v1).
- **Languages**: English + Kinyarwanda (i18n).
- **Design**: dark & cinematic (photography/videography aesthetic).
- **Portfolio content**: real photos/videos + client names ready; drag-and-drop upload via admin.

### Updated 2026-08-18 (showcase-first direction)
- **Services** (+6, mirroring industry standard: Dric/Itara/OneZone): documentary production · corporate & institutional pictures & videos · commercial & advertising production · music videos & creative productions · location scouting & fixer services (added to existing photo/video/livestream catalog).
- **Trust messaging**: "Since 2015 — over a decade of experience" (founder started 2015 → 11 years in 2026).
- **Navigation**: Home · Services · Portfolio · Blog only + brass "Book a shoot" CTA button. Client login moves to footer. About = homepage section (no separate page). On mobile: hamburger menu + floating WhatsApp button (wa.me/250783269951); NO social badges in mobile header.
- **Blog (new core feature)**: admin-written, weekly, 4 content types (project recaps/BTS, client stories, educational guides, studio news), bilingual per post (EN + RW fields), drag-and-drop image upload (any photo allowed — storytellers that don't fit portfolio), per-post views + likes counters, NO comments in v1 (CTA = booking/WhatsApp), public /blog + full admin CRUD. Adds sellable value to the admin panel.
- **Socials**: WhatsApp 0783269951 (+250783269951) · Instagram @creativesoundstudiorw · Instagram (Jabo) @jabo_nkurunziza · YouTube @nkurunzizajabo7867 (recommend custom handle, e.g. @creativesoundstudio) · emails: professional, pending from user.
- **Portfolio images**: real local photos in /home/mutijimabertin/Documents/proj/jabo/pictures (17+ folders/events; research identifying unclear names done 2026-08-18). Upload pipeline must optimize/resize → WebP.

### Research done (2026-08-18, verified on disk)
- docs/research/reference-sites.md (12.6 KB) + docs/research/pictures-identification.md (16 KB).
- Competitors: Dric Ent (dric.rw — client logo wall MTN/RwandAir/UNICEF/Reuters/WHO/RDB/PSG, portfolio categories, WhatsApp-only contact, 7-person team), ITARA FILMS (itaraproduction.com — numbered services 01–04, contact form w/ service-interest dropdown, "10+ Years"), OneZone Studio (photography categories, FRW gear rental prices, Umurinzi Ebola case study). NO competitor publishes service prices → validates no-prices decision.
- Pictures: 7 HIGH-confidence (ABIS Summit 2019 Day 2; FAO ADG field visit Rwamagana Sep 2022; KnoWat closing workshop 20–22 Sep 2022; Kingdom of God Ministry album launch 11 Jun 2017; founder's wedding; landing page = curated hero mix 2019–2022), 5 MEDIUM (Ndatumande 7th ed. Aug 2019; Kigali Infants Academy; Sanlam&sports; africa summit.jpg = ABIS 2019 vs Africa CEO Forum; fishing activities.jpg), 5 NEED FOUNDER: ceo of aerg.jpg (CORRECTED 08-18 per client: org = ARJ — Association Rwandaise des Journalistes, arj.org.rw; person + role unknown), portrait of prime minister of agriculture.jpg (correct = MINAGRI Minister; Musafiri or Ndabamenye; not Mukeshimana), which summit (africa summit.jpg), wedding names + portrait consent, Ndatumande organizer.
- KEY SOURCE: founder's public Flickr "J&A Heritage" — NKURUNZIZA JABO, NSID 150635355@N06; albums match pictures/ folders with exact dates → verify/date images.

## Tech Stack
- frontend/: Next.js (App Router) + Tailwind CSS + i18n
- backend/: Node.js + Express + Prisma ORM + PostgreSQL
- Notifications: SMTP (Nodemailer) + **Zavu API** for WhatsApp (key: see .env, NOT in repo)
- Auth: admin JWT; client magic-link tokens (single-use, expiry, revocable)
- Docker (identical env everywhere) + docker-compose (postgres + services)
- CI/CD: GitHub Actions (lint → test → docker build/push → deploy)
- Hosting later: frontend Vercel or Docker; backend Railway/Render/VPS. Domain: none yet.

## Agent Architecture (ECC-based, all in .opencode/)
- **orchestrator** (primary, admin): user talks to it; plans (blueprint/orch-pipeline), assigns tasks, tracks; every agent reports to it; every agent can spawn sub-agents that report back up.
- Squads (each agent = one primary skill, no model pins):
  - Business & Brand: competitor-analyst (competitive-platform-analysis), benchmark-analyst (benchmark-methodology), report-builder (competitive-report-structure), market-researcher, researcher (deep-research), brand-discoverer, brand-voice, article-writer, content-engine, investor-materials, investor-outreach, frontend-slides
  - Frontend: frontend-engineer (frontend-patterns), nextjs-engineer (nextjs-turbopack), api-designer (api-design)
  - Backend: backend-engineer (backend-patterns), database-engineer (postgres-patterns, prisma-patterns, database-migrations)
  - Quality & Security: tdd-developer, e2e-tester, security-reviewer, coding-standards-guard, verifier
  - Ops & Infra: docker-engineer (docker-patterns), devops-ci-cd (deployment-patterns, github-ops, git-workflow, canary-watch, production-audit)
  - Core/AgentOps: agent-sorter, introspection-debugger, strategic-compactor, memory-keeper, plan-canvas, product-capability, mcp-builder, x-poster
- ECC install at ~/.opencode/ (skills in ~/.opencode/skills, agents from ~/.opencode/opencode.json).

## ECC Model Fix (DONE 2026-08-17)
- Error "Agent build's configured model anthropic/claude-sonnet-4-5 is not valid" — caused by ~/.opencode/opencode.json hardcoding Anthropic models; user has no Anthropic provider (only opencode/* free + alibaba-coding-plan-cn).
- Fixed: removed all 27 `model` lines from ~/.opencode/opencode.json (backup: ~/.opencode/opencode.json.ecc-backup). Agents now inherit default model.
- Rule: NEVER add model pins to .opencode/agent/*.md unless model is verified available via `opencode models`.

## Skills to install from ECC (missing locally)
api-design, backend-patterns, coding-standards, frontend-patterns, frontend-slides, mcp-server-patterns, nextjs-turbopack (28 of 35 already installed).

## Build Phases
1. ✅ Persist plan + memory
2. ✅ Scaffold repo (frontend/, backend/, docker, prisma, postgres)
3. ✅ DB schema (User, Client, Booking, Service, PortfolioItem, ClientLogo, Testimonial, SiteSetting) + migrations
4. ✅ Public site EN/RW: home, services, portfolio, about, clients (cream redesign 08-18)
5. ✅ Booking engine: smart form, magic links, client dashboard, admin dashboard (e2e 9/9)
6. ✅ Showcase-first redesign (DONE, DEPLOYED 2026-08-20): portfolio-leads home (Hero → PortfolioGrid → TrustBand → ClientsWall → Services → About → CTA), nav Home·Services·Portfolio·Blog + Book CTA (login → footer/mobile), services page (Itara-style numbered blocks), blog page placeholder ("Stories from the studio"). Services catalog expanded to 10 (seed, idempotent): 5 kept + Documentary Production / Corporate & Institutional / Commercial & Advertising / Music Videos / Location Scouting & Fixer (category Production, "From X RWF", flagships 600k). Real pictures wiring still BLOCKED on founder confirmation of the 5 NEED-FOUNDER picture items + portrait consent (see Research above) — captions/categories only, not layout.
7. ✅ Blog engine: BlogPost model (EN/RW, views+likes), admin CRUD + drag-drop images, public /blog + post pages
8. ✅ Admin panel completion: all CRUD + drag-and-drop upload (portfolio + blog), clients/logos/testimonials managers, WebP pipeline (commit 11d2c03)
9. ✅ Docker + compose + GitHub Actions CI/CD (fast lint/build split from nightly full e2e; hosting deploy still pending — NO external deployment yet, session 2026-09-11)
10. ✅ Security review + hardening + frontend org (2026-09-11): all cheap/high-value findings fixed & verified (C1 critical fixed, HS256 pin, atomic token consume, input validation, rate limits, CSP, non-root containers, npm audit 0); e2e green 25+1; frontend org done. Commit & push pending user approval (combined with admin overhaul).
11. ✅ Admin overhaul — DONE, VERIFIED SHIPPABLE (2026-09-12): design language + full UI kit (globals.css tokens + lib/ui.ts), shell + tab architecture (?tab= URL routing, chrome-free admin via (site) route group, useAdminFetch/useSessionGuard), reorder API (PUT /admin/{services,portfolio,logos}/order — full-set raw array, dense sortOrder==index, SERIALIZABLE tx, 404/409), PUT /admin/testimonials/:id full edit, vitest toolchain (49/49 tests), full EN+RW i18n (~117 new admin keys, typed), 7 rewritten admin tabs + shared CollectionManager/AdminDialog, backend patches (slug normalization, upload guard, P2034→409), 36 e2e pass / 3 skip / 0 fail.
12. ✅ Content import + Client testimonials (2026-09-14, verified-by-dev): (P1) `import-content.ts` — 25 logos (FAO→KC2, names pending founder), 6 portfolio items (7→13), founder image set, /app/uploads 79→111 files; (P2) `client_testimonials` schema + POST /clients/testimonials (5/hr/IP, duplicate→409) + GET /me + admin listAll with client join + /account 3-state form + admin Source badge + ~16 i18n keys. Backend 57/57, e2e 40/3/0.
13. ✅ Commit+push (2026-09-15) + nightly CI fix: 3-part phased push landed (admin overhaul → content e7209ba → testimonials e3256de); nightly red Sep 4–14 root-caused — CI JWT_SECRET below 32-char guard in env.ts killed seed at module load → fixed 40-char (43b9bbe). Booking UX pass (5937099): country-coded phone input (PhoneInput.tsx, E.164), guided budget chips, field-localized inline errors, admin bookings table 8 cols, mailer fallback log. Backend 63/63, e2e 45/1/0. Detail: .opencode/memory/booking-ux-2026-09-15.md
14. ✅ Email system (2026-09-15, 52e6077): branded HTML email templates (cream+brass palette, Outlook-safe tables, esc() for all user fields, 6 template builders); notifications.ts rewrite (template-driven, .mailbox dumps for dev, always-log login token for e2e); new POST /clients/bookings/:id/track-token (7-day magic token mint with ownership gate); /account "View details" button; testimonial admin publish → client thank-you email; SMTP activation path C (Resend now, branded domain later); 12 new vitest template tests. Backend 75/75, e2e 44/3/0. Detail: .opencode/memory/email-system-2026-09-15.md
15. ✅ Nightly CI fresh-DB green (2026-09-15, d005885): the 02:00 UTC nightly cleared the seed block then failed inside `npx playwright test` (run 34939293950, head 5937099); diagnosis done via a local CI-parity harness (ces_ci db + ci env block — now repo-golden for pre-checking any nightly). Fixes: (a) removed duplicate admin empty-state CTAs (AdminBlog/AdminSettings — strict-mode violations on empty collections); (b) seed now generates 3 placeholder WebP covers via sharp (1200×800, q82, written only when missing) + 3 published portfolio items (2 Weddings + 1 Corporate) + demo client Aline Uwase (aline.demo@example.co.rw) + CONFIRMED booking CSS-SEED-001 (+30 days, 2 BookingEvent rows) — idempotent, no schema changes; (c) redesign.spec rewrote to RELATIONAL assertions + seed floors (logos ≥4, portfolio ≥3, first-2 live titles); (d) blog.spec empty-state → /^No posts yet/ regex. Fresh-DB parity suite 45 pass / 2 skip / 0 fail; dev stack 44/3/0; backend 75/75. Detail: .opencode/memory/nightly-ci-fresh-db-2026-09-15.md
16. ✅ Perf/ops — notifications fire-and-forget + production stress campaign (2026-09-16, e4e9d68): full live-stack stress verified rate limits exact + abuse probes clean (0×500; SQLi/XSS/template-injection parameterized-safe). FINDING #1: POST /api/bookings awaited Zavu WhatsApp send (~500ms, p95 1.3s @30 burst) → all notification call sites now fire-and-forget via runFireAndForget() (always .catch; Zavu AbortSignal.timeout(8000), nodemailer 10s) → booking POST p95 336ms, median 15–60ms, zero 5xx. FINDING #2 (fix): naive fire-and-forget would print magic login URLs (token) unconditionally → gated by new `env.smtpConfigured` (requires host+user+pass AND host≥5 chars; placeholders = unconfigured) in mailer.getTransporter() AND notifyClientLogin — token only prints when SMTP unusable or non-prod (e2e contract kept). e2e 44/3/0, vitest 75/75, 2h log window clean. Detail: .opencode/memory/perf-ops-notification-fire-and-forget-2026-09-16.md

## Secrets (never commit)
- ZAVU_API_KEY (live) — user provided, keep in backend/.env (gitignored)
- SMTP creds — **Resend chosen (PATH C)**: user has not yet provided API key; set `SMTP_*` in root `.env` once provided; activation block at `env.smtpConfigured` (host+user+pass all set AND host≥5 chars — single-char placeholders count as unconfigured). Everything wired + verified without it (login token logs in non-prod only). Until domain verified, MAIL_FROM = `onboarding@resend.dev`. Branded domain (creativesoundstudio.rw) deferred.
- Zavu WhatsApp sender number + template approval — pending; tracking-link domain needs Zavu URL verification
