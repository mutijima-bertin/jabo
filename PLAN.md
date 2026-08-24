# Creative Sound Studio — Project Plan (v1)

> Status: IN BUILD — phases 1–6 done (booking engine, client portal, cream redesign, showcase-first redesign DEPLOYED 2026-08-20, e2e 9/9, review clean). Next: blog engine, admin panel completion, CI/CD. Last updated: 2026-08-20

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
7. Blog engine: BlogPost model (EN/RW, views+likes), admin CRUD + drag-drop images, public /blog + post pages
8. Admin panel completion: all CRUD + drag-and-drop upload (portfolio + blog)
9. Docker + compose + GitHub Actions CI/CD
10. Security review, e2e, verify, deploy prep

## Secrets (never commit)
- ZAVU_API_KEY (live) — user provided, keep in backend/.env (gitignored)
- SMTP creds — pending from user (Gmail app password or provider)
- Zavu WhatsApp sender number + template approval — pending; tracking-link domain needs Zavu URL verification
