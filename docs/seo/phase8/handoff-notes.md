# SEO Phase 8 — Handoff notes for the applying backend engineer

This file documents the model/seed contract so the copy in this folder (A–D) lands correctly in `backend/prisma/seed.ts` and `frontend/src/lib/i18n.tsx`. COPY ONLY — no VCS changes were made by the content pass.

---

## 1. Data model contract (verified against `backend/prisma/schema.prisma`)

`Service` (canonical, 10 rows in the `services` array):

- `nameEn`, `nameRw`, `descriptionEn`, `descriptionRw`, `priceEn`, `priceRw`, `category`, `icon` (+ `sortOrder` managed by the existing loop).
- This phase changes **`descriptionEn` only** for each of the 10 services (see `service-copy.md`). Names, RW fields, prices, categories, icons unchanged.

`BlogPost` (verified — NO `tags` field, NO `linkedPostSlug` on this model):

| Field | Type / constraint | Value for the two new posts |
|---|---|---|
| `slug` | String, UNIQUE, max 160 (zod) | `rwanda-filming-permit-guide` · `rwanda-drone-permit-guide` |
| `titleEn` | String, required | per front matter |
| `titleRw` | String, **NOT NULL** | per front matter |
| `excerptEn` | String? | per front matter (142 / 146 chars) |
| `excerptRw` | String? | per front matter |
| `contentEn` | String, required, GFM markdown | per front matter |
| `contentRw` | String, **NOT NULL** | per front matter (stopgap summary — see §2) |
| `contentType` | enum `PostContentType` | `EDUCATIONAL` (exists in enum) |
| `coverImageUrl` | String? | `null` both posts |
| `published` | Boolean | `true` |
| `publishedAt` | DateTime? | **Set it** — see §3 |
| `views` / `likes` | Int | default 0 |

Seed-key matching follows the existing idempotent patterns: services are `findFirst({ where: { nameEn } })` then create-if-missing (see §4 warning); mirror that with `findUnique({ where: { slug } })` for posts.

## 2. RW field conventions (stopgap)

- Existing seeded + live content proves the convention: `titleRw`/`contentRw` are REQUIRED but may carry a **short honest summary** where a full translation is out of scope — e.g. the live `summit` post has a 19-char `contentRw`; client-story posts carry fuller translations. The two new posts follow the summary style per the Phase 8 brief.
- The RW `contentRw` fields are 3–4 sentences that state the guide **is written in English** and what it covers. RW UI readers see the RW title + RW excerpt, then the honest note in the body. Native-speaker review of these stopgaps is a known open item (same as prior phases).
- `excerptRw` is optional; if omitted the RW card falls back to `excerptEn` (per `BlogCard`/`PostView`). Both new posts include one.

## 3. `publishedAt` note

The public feed and `app/sitemap.ts` sort by `publishedAt DESC`, with `null` treated as oldest. Stamp `publishedAt: new Date()` when seeding the two posts so they appear at the top of the blog feed and in the sitemap. This is a seed-time decision for the engineer (the mission brief's front matter does not carry a date; `published` must be `true`).

## 4. ⚠️ The 10-vs-11 services note + seed idempotence trap

- **The canonical seed list has exactly 10 services.** There is no 11th "permit/fixer" service anywhere in the seed or schema. Do NOT add an 11th service for the permit guides — the two posts are **educational blog content**, not services.
- **Trap:** the current service loop is create-only (`if (!existing) create`). Re-running the seed against a DB that already has the 10 services will silently keep the OLD `descriptionEn` strings. Applying this phase therefore needs one of:
  1. change the loop to `upsert({ where: { nameEn }, update: {...}, create: {...} })`, or
  2. a one-off `updateMany` keyed on `nameEn` with the new descriptions (safe: names are unchanged uniqueness keys), or
  3. wipe + fresh seed.
  Flagging so the live dev DB's service rows actually get the new copy.

## 5. Linking plan (`Service.linkedPostSlug`)

Linking exists on `Service` (intentionally NO FK). `PostView`'s CTA finds the service whose `linkedPostSlug === post.slug` and pre-selects it at `/book?service=<id>`; otherwise the CTA falls back to bare `/book`.

Apply these two links:

| Service (`nameEn`) | `linkedPostSlug` |
|---|---|
| Aerial / Drone Photography | `rwanda-drone-permit-guide` |
| Location Scouting & Fixer Services | `rwanda-filming-permit-guide` |

Both are already-published `published: true` posts, so "no dead link" holds. The filming guide also links inline to `/blog/rwanda-drone-permit-guide` (internal cross-link between the two permit guides). `bookings-from-content.spec.ts` patches `linkedPostSlug` transiently during its own run and restores it afterwards — pre-existing values are safe.

## 6. Applying `page_services_sub` (deliverable D)

Exact old/new strings in `service-page-copy.md`. Two dicts (`en` and `rw`) — replace only those two string values; no e2e spec pins either string (verified; see that file's pin-risk section).

## 7. Content integrity commitments honored

- No invented fees/officers: all institutional references verified 2026 — Irembo (MINIYOUTH) shooting permit, Rwanda Film Office (RDB), RCAA RCAR Part 27 process (registration → activity permit → pilot certificate → UOC), drone entry declaration to Rwanda National Police, RDB MICE figures (USD 94.7M / 165 events, 2025). Fee figures are labelled as reference points ("typically", "confirm current").
- Standard GFM markdown only (react-markdown renders `h2`–`h4`, lists, bold, links, blockquotes; no raw HTML — `<h1>` never appears in the bodies, the H1 is the page title).
- No "click here" anywhere in the copy.
- Read-aloud-tested natural keyword placement (details + coverage table in `service-copy.md`).