# Creative Sound Studio — Project Progress Tracker

> Personal reference file for the founder. Updated end of each work session.
> Plan of record: `PLAN.md` (repo root). Full engineering memory: `.opencode/memory/`.

**Last updated: 2026-09-17**

---

## Current status

- **Code: SHIPPABLE** — UX/journey overhaul complete (8 phases), all shipped on main, CI green.
- **Git:** main branch, latest commit `cbedec6` (dashboard API + recharts). All phases pushed.
- **Live stack (local docker):** frontend :3000, backend :4000, postgres. Running the latest code.
- **Not deployed anywhere yet.** No domain, no live hosting. SMTP + Zavu + domain = next phase.
- **Test gates:** e2e 56 pass / 3 skip / 0 fail · vitest 96/96 · lint 0 · tsc clean · build 14 routes.

---

## What the site has now (one-view sell)

A client visiting the site sees, in one scroll:

1. **Hero carousel** — real photos (Africa Summit, portraits, events) with book + portfolio CTAs
2. **Portfolio grid** — 13 items, real work
3. **TrustBand + Client logos wall** — 27 real client logos (FAO, MTN, UNICEF, WHO, BAL, BK Arena, Visit Rwanda …)
4. **Testimonials** — published client quotes (clients can now submit their own, admin approves)
5. **Services** — 10-service bento catalog
6. **About** — founder photo + story
7. **CTA + Book** — booking engine

---

## Session log

### 2026-09-12 — Admin dashboard overhaul (VERIFIED SHIPPABLE)
- New design language: warm-ink/brass admin theme, full UI kit (`frontend/src/lib/ui.ts`), spec at `docs/design/admin-interface-spec.md`
- Real session guard (no more silent bricking), `?tab=` URL routing, admin is chrome-free (no public nav/WhatsApp FAB)
- All 7 admin tabs rebuilt + full EN/RW i18n (180 typed keys)
- Real up/down ordering (Services/Portfolio/Logos) with conflict-safe reorder API
- Backend: testimonial edit endpoint, vitest test toolchain, crash fixes (PATCH bug, empty slugs, upload guards)
- **Gates:** backend 49/49 · frontend lint 0 · build 14 routes · e2e 36 pass / 3 skip / 0 fail

### 2026-09-17 — UX/journey overhaul (8 phases, all shipped)
The full end-to-end user journey was rebuilt across 8 commits on main:

1. **Container density** (`3bf8680`) — all public containers widened to `max-w-7xl`.
2. **Booking journey** (`58dd769`) — two-column /book (form left, 360px sticky context right), service prefill via `/book?service=<id>`, services-as-CTA, trust signals/FQA section. i18n +30 keys.
3. **Post-submit + contacts** (`3ee90ae`) — success card with WhatsApp prefilled reference, /contact page, footer/About clickable mailto/tel, `lib/site.ts` single-source phone/email helpers. i18n +10 keys.
4. **Notifications** (`4b6dfca`) — magic track URL in status emails + WhatsApp, new `REVIEW_REQUEST` NotificationKind firing on DELIVERED (additive Prisma enum + migration). Backend tests 87→96.
5. **Content journey** (`9810528`) — reading time estimate, per-contentType booking CTA (strict linkedPostSlug match), "More stories" related posts, lightbox "Book this type" CTA. New `bookings-from-content.spec.ts`. i18n +11 keys.
6. **Responsive** (`144d3ca`) — 40px touch targets everywhere, admin grids single-column at base, hero control repositioned on <md, BlogList pager flex-wrap.
7. **e2e deflake** (`a0f8cfe`) — monotonic (≥) view-count assertions fixed (exact counts raced under fullyParallel).
8. **Dashboard API + charts** (`cbedec6`) — `/admin/dashboard` returns bookingsByDay (14d zero-filled), topServices (max 5), counts (4 models). recharts v3.10.1 lazy-loaded (ssr:false → chart chunk never touches public site). AreaChart, PieChart, BarChart, QuickActions, empty states. e2e +1 chart invariant test.

**Gates:** e2e 56/3/0 · vitest 96/96 · lint 0 · tsc clean · build 14 routes.

**Operational gotcha discovered:** in-memory express-rate-limiters (bookings 30/hr/IP, login 5/10min/IP) exhaust within back-to-back full e2e runs → `docker compose restart backend` clears them. Also: SMTP still blocked on Resend API key; Phase 4 notification paths verified via `.mailbox` HTML dumps.

### 2026-09-14 — Content import (P1) + Client testimonials (P2)
- **Content import** (`backend/scripts/import-content.ts`): 25 client logos, 6 showcase portfolio items ("Africa Summit", "CEO of AERG — Portrait", "Fishing Activities", 2 portraits, "Wedding Party"), founder photo (`Pasted image.png`) wired into About section. Idempotent, re-runnable (`npm run content:import -- --dir=…`).
- **Junk cleanup:** removed 13 leftover test/download artifacts from the logo wall (8× "Dropped Image", "New York Times Logo", "Visit Rwanda vector logo…", "MTN Logo PNG Vector…", "Republic of Rwanda seal", mojibake "Tour du Rwanda ⛱ Visit Rwanda"). Wall now = 27 clean logos, FAO first, Kigali Channel 2 last.
- **Client testimonials:** clients (magic-link login → their account page) can submit ONE testimonial each. Admin approves via the existing publish toggle. Source column added in admin (Client/Admin).
- **Gates:** backend 57/57 · frontend lint 0 · build 14 routes · e2e 40 pass / 3 skip / 0 fail

---

## Verification numbers (current)

| Gate | Admin overhaul | +P1 & P2 | +UX/journey overhaul |
|---|---|---|---|
| Backend tests | 49/49 | **57/57** | **96/96** |
| Frontend lint | 0 errors | 0 errors (3 tolerated e2e warnings) | 0 errors |
| Frontend build | 14 routes | 14 routes | 14 routes |
| E2E | 36 pass / 3 skip / 0 fail | **40 pass / 3 skip / 0 fail** | **56 pass / 3 skip / 0 fail** |
| Uploads | 79 files | **111 files** (WebP q82, ≤1920px) | 111 files (unchanged) |

---

## Open items

1. **RW translations** — mechanical verification done, need a native-speaker review (esp. Phase 2/3/5 journey keys)
2. **Junk cleanup** — ✅ DONE (logo wall + placeholders clean). Blog content still has placeholder posts
3. **Composition security ticket** — local compose uses `css123` + published 5432; fix before hosting
4. **Dead kit exports** — 12 unused UI-kit exports to remove (pending)
5. **Owner-blocked content still missing:** real testimonials from clients, founder consent for `jabo.jpg`, stats numbers, blog posts, SMTP credentials, Zavu sender + template, domain, deploy

## Next phases (order)

1. SMTP credentials → real magic-link + review-request emails (currently gated at `env.smtpConfigured`)
2. Zavu WhatsApp integration (sender number + template approval; tracking-link domain verification pending)
3. Domain + real deploy (VPS + compose)
4. Content: real blog posts, client testimonials seeding, stats
5. Possible future (not approved): Google review request link; RW translation quality pass on Phase 2/3/5 keys; nothing post-phase-18 scheduled. Nightly CI view-count test now stable.

---

## Gotchas (don't re-learn these)

- E2E full-suite reruns: testimonial POST limiter 5/hr/IP → max 2 runs/hour or restart backend
- Booking POST limiter 30/hr/IP — back-to-back full-suite e2e runs within an hour exhaust it too; `docker compose restart backend` clears all in-memory limiters
- Client login limiter 5/10-min/IP → space full e2e runs ≥10 min apart (or `docker compose restart backend`)
- Admin login: use `.env` values (mutijimabertinr@gmail.com), not the `admin@creativesoundstudio.rw` placeholder
- Docker rebuild resets in-memory rate limiters (that's a feature)
- `docker compose build` does NOT copy `backend/scripts/` into the image (dev tool only)
- Never commit `.opencode/memory/` (gitignored vault)

---

## Phase: Email templates + real sending (2026-09-15)

**Delivered (commit pending):**
- `backend/src/services/emailTemplates.ts` — light cream + brass template system: shared Outlook-safe table layout, XSS-safe esc(), EN/RW copy. Six builders: booking received (primary "Track this production" + secondary "Open my dashboard"), status changed, magic login/dashboard link, admin new booking, admin **testimonial submitted** (new), client **testimonial published** (new).
- `notifications.ts` — all inline HTML replaced with templates; recipients `ADMIN_EMAILS`; when SMTP is unset, renders are still captured to `backend/.mailbox/*.html` in non-production (e.g. local `tsx` runs).
- **Account creation flow:** magic login link → `/login?token=` → auto-sign-in → `/account` dashboard with ALL of the client's bookings.
- Dashboard upgrades: per-booking **"View details"** button (mints a fresh 7-day magic token via `POST /clients/bookings/:id/track-token`, ownership-checked) + **"Book another"** link.
- `POST /clients/testimonials` now emails the studio; `PATCH /admin/testimonials/:id` publish (false→true) emails the client author.
- `docker-compose.yml` gained `SMTP_SECURE` passthrough.
- Tests: backend **75/75** (12 new template tests), frontend lint/tsc/build clean, e2e **44 pass / 3 skip / 0 fail** (new dashboard → track timeline test).

**SMTP activation (Resend free, no domain needed):**
1. Sign up at https://resend.com → API Keys → create key (`re_…`)
2. Root `.env` (compose feeds the backend):
   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=resend
   SMTP_PASS=re_...
   MAIL_FROM="Creative Sound Studio <onboarding@resend.dev>"
   ```
3. `docker compose up -d backend` → make a test booking → check the inbox + Resend dashboard.
4. **Branded later (env-only):** buy `creativesoundstudio.rw` (RICTA/register.rw ≈ RWF 15-17k/yr) → add domain in Resend → copy SPF/DKIM records → flip `MAIL_FROM` to `hello@creativesoundstudio.rw`.

**Note:** with SMTP LIVE, the e2e `fetchMagicToken` reads a dev-only backend log line that still prints in non-production, so local/CI e2e keep working. In prod, tokens are never logged.

---

## Phase: Nightly CI green on a fresh DB (2026-09-15, commit d005885)

The 02:00 UTC nightly finally cleared the seed block (JWT_SECRET fix) and failed **inside playwright** — every assertion that depended on the rich imported dev DB fails on a fresh database. Fixed by a local CI-parity repro (clean `ces_ci` DB + the ci-nightly env vars, one full suite per fresh DB):

- **Duplicate admin CTAs** — AdminBlog + AdminSettings testimonials each rendered toolbar + empty-state buttons with identical accessible names → Playwright strict-mode violations whenever a collection is empty. Removed the redundant empty-state buttons.
- **Hero collapsed with no covers** — seed now generates 3 placeholder WebP covers (sharp gradients → `backend/uploads/images/seed-*.webp`) + 3 published portfolio items (2 Weddings + 1 Corporate, so the e2e sparsest-category precondition holds).
- **Empty admin needs data** — seed additionally creates a demo client (Aline Uwase) + one CONFIRMED booking (`CSS-SEED-001`) so the admin dashboard/directory render on fresh installs.
- **e2e literals pinned to dev imports** — `redesign.spec.ts` (>25 logo imgs, >13 portfolio, hardcoded titles) rewritten to relational/API-driven assertions with seed floors; `blog.spec.ts` empty-state copy matcher fixed ("No posts yet." → `/^No posts yet/`).
- All seed blocks idempotent (upsert-by-name / fixed reference).

**Verification:** parity fresh-DB full suite **45 pass / 2 skip / 0 fail**; docker dev stack **44 pass / 3 skip / 0 fail**; backend **75/75**; fast CI green on d005885. Next nightly observation: 2026-09-16 02:00 UTC.

**Fresh-seed contract** (what the seed guarantees): 1 admin (env creds), 10 services, 8 settings, 4 name-only logos, 3 portfolio items WITH images, 1 demo client, 1 demo booking. Everything else is empty — tests must be relational, never dev-import literals.