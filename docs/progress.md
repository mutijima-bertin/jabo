# Creative Sound Studio — Project Progress Tracker

> Personal reference file for the founder. Updated end of each work session.
> Plan of record: `PLAN.md` (repo root). Full engineering memory: `.opencode/memory/`.

**Last updated: 2026-09-14**

---

## Current status

- **Code: SHIPPABLE** — admin overhaul + content import + client testimonials all pass their verification gates.
- **Git:** 3-phase push to `main` (admin overhaul → content import → client testimonials), CI gate between each — IN PROGRESS.
- **Live stack (local docker):** frontend :3000, backend :4000, postgres. Running the latest code.
- **Not deployed anywhere yet.** No domain, no live hosting. SMTP + Zavu + domain = next phase.

**Nightly E2E:** was red every night Sep 4→14 (CI `JWT_SECRET` below the backend's 32-char guard → seed step died). Fixed in the workflows on 2026-09-14; next night's cron (02:00 UTC) confirms green.

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

### 2026-09-14 — Content import (P1) + Client testimonials (P2)
- **Content import** (`backend/scripts/import-content.ts`): 25 client logos, 6 showcase portfolio items ("Africa Summit", "CEO of AERG — Portrait", "Fishing Activities", 2 portraits, "Wedding Party"), founder photo (`Pasted image.png`) wired into About section. Idempotent, re-runnable (`npm run content:import -- --dir=…`).
- **Junk cleanup:** removed 13 leftover test/download artifacts from the logo wall (8× "Dropped Image", "New York Times Logo", "Visit Rwanda vector logo…", "MTN Logo PNG Vector…", "Republic of Rwanda seal", mojibake "Tour du Rwanda ⛱ Visit Rwanda"). Wall now = 27 clean logos, FAO first, Kigali Channel 2 last.
- **Client testimonials:** clients (magic-link login → their account page) can submit ONE testimonial each. Admin approves via the existing publish toggle. Source column added in admin (Client/Admin).
- **Gates:** backend 57/57 · frontend lint 0 · build 14 routes · e2e 40 pass / 3 skip / 0 fail

---

## Verification numbers (current)

| Gate | Admin overhaul | +P1 & P2 |
|---|---|---|
| Backend tests | 49/49 | **57/57** |
| Frontend lint | 0 errors | 0 errors (3 tolerated e2e warnings) |
| Frontend build | 14 routes | 14 routes |
| E2E | 36 pass / 3 skip / 0 fail | **40 pass / 3 skip / 0 fail** |
| Uploads | 79 files | **111 files** (WebP q82, ≤1920px) |

---

## Open items

1. **Git push in progress** — 3 phases, CI green between each (see current status)
2. **RW translations** — 196 keys now; mechanically verified, need a native-speaker review
3. **Junk cleanup** — ✅ DONE (logo wall clean). Blog content still has placeholder posts ("africa sumit 2023", "qwertyui")
4. **Composition security ticket** — local compose uses `css123` + published 5432; fix before hosting
5. **Dead kit exports** — 12 unused UI-kit exports to remove (pending)
6. **Owner-blocked content still missing:** real testimonials from clients, founder consent for `jabo.jpg` (the `Pasted image.png` is live), stats numbers, blog posts, SMTP credentials, Zavu sender + template, domain, deploy

---

## Next phases (order)

1. ✅ Finish 3-phase push → CI green
2. RW translation native review
3. SMTP credentials → real magic-link emails (links currently print to backend logs)
4. Zavu WhatsApp integration
5. Domain + real deploy (VPS + compose)
6. Content: real blog posts, client testimonials seeding, stats

---

## Gotchas (don't re-learn these)

- E2E full-suite reruns: testimonial POST limiter 5/hr/IP → max 2 runs/hour or restart backend
- Client login limiter 5/10-min/IP → space full e2e runs ≥10 min apart
- Admin login: use `.env` values (mutijimabertinr@gmail.com), not the `admin@creativesoundstudio.rw` placeholder
- Docker rebuild resets in-memory rate limiters (that's a feature)
- `docker compose build` does NOT copy `backend/scripts/` into the image (dev tool only)
- Never commit `.opencode/memory/` (gitignored vault)