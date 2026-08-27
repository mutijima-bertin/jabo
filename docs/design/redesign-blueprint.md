# Creative Sound Studio — UI/UX Audit & Redesign Blueprint

Date: 2026-08-25 · Scope: public site (frontend/), design + UX only · No code changed in this pass.
Evidence: live screenshots captured 2026-08-25 (desktop 1440px + mobile 390px: hero, full-home scroll, portfolio, trust/logos, services, about, CTA, footer, /services, /blog, /book, mobile hero/menu/book) plus source review of `page.tsx`, `HeroSection`, `PortfolioGrid`, `Nav`, `Footer`, `TrustBand`, `ClientsWall`, `ServiceCard`, `ServiceBlocks`, `TestimonialsSection`, `BookingForm`, `WhatsAppFab`, `AdminPortfolio`, `AdminSettings`, `globals.css`, `schema.prisma`, the backend route map, and `docs/research/reference-sites.md`.

Tiebreaker for every judgment below (owner's words): "The landing page must show our production and what we do. The topmost thing is presenting our work. I need full pictures to fill the whole screen and let the pictures do the work instead of saying a lot of words." When a decision is contested, the option that shows more work with fewer words wins.

---

## 1. Executive summary

The bones are good — cream/brass/green palette, Fraunces serif, generous rhythm — but the site currently tells rather than shows: a 72vh hero with a wordy caption block, ten identical icon cards for services, and a portfolio grid whose filters silently do nothing. Several flaws in the external 2/10 review are empty-state or content artifacts, not design failures. The real debts: hero caption legibility (worse on mobile, where arrows collide with text), one WCAG AA contrast failure on all brass buttons, dead category data behind the filters, an unwired logo wall (the backend endpoint already exists), a services section that contradicts its own "Transparent prices" subtitle, and portfolio cards that are dead ends. The blueprint converts the hero to a full-screen picture-first carousel, makes portfolio honest and interactive, turns services into picture cards linked to blog deep-dives, and wires the trust signals that already sit in the database. About 80% is frontend-only; two small schema additions (Service image, Service blog link) unlock the rest.

---

## 2. Design-system verdict

**Palette — KEEP, with one contrast repair.** Cream `#FAF6EF`, brass `#B08D57`, deep green `#3F5A46` is distinctive, warm, and right for a premium Kigali studio; it also satisfies the "no dark mode default" constraint. Do not add hues. Measured contrast:

| Pair | Ratio | WCAG | Verdict |
|---|---|---|---|
| white text on brass `#B08D57` (all primary CTAs) | ~3.1:1 | AA normal 4.5:1 | FAIL — fix |
| white on brass-dark `#8F6F3E` | ~4.7:1 | AA normal | pass |
| ink `#1F1D1A` on brass | ~5.4:1 | AA normal | pass |
| cream on green `#3F5A46` (CTA banner) | ~7.1:1 | AAA | pass |
| `text-ink/45` "Book now" micro-links on white cards | ~3.5:1 | AA normal | FAIL — raise to ink/60 |
| `text-ink/55` stat labels (small tracked caps) | borderline | AA normal | raise to ink/65 |

Fix rule: filled primary buttons become `bg-brass-dark text-cream` with `hover:bg-brass`; brass stays as accent for hovers, borders, large numerals, and display text (where 3:1 large-text contrast is legal). Optionally add token `--color-brass-deep: #7a5c30` for a darker hover step.

**Typography — KEEP.** Fraunces display + Geist sans reads credible and editorial. Discipline rules: Fraunces only for headings/stats/quotes, never body; and end the lowercase raw-title look on cards ("minister of agriculture") via admin content guidance — not a CSS `capitalize` (it mishandles proper nouns).

**Motion — KEEP, gate it.** `kenburns`, `fade-up`, and the grain overlay carry the cinematic feel. Add a `prefers-reduced-motion: reduce` block that disables `kenburns`, `fade-up`, and hero autoplay, plus global `:focus-visible` brass rings — neither exists today.

**Spacing — KEEP** the `max-w-6xl` / `py-24` rhythm. The only structural offender is the About placeholder container (section 4.9).

---

## 3. Adjudication of the external critique (7 claims)

1. "Nav misaligned/asymmetric; Book CTA muddy tan, fails WCAG AA" — **PARTLY VALID.** The header is a balanced three-zone layout and reads fine in the screenshots; "misaligned" is not supported. The contrast claim is correct: white on `#B08D57` is ~3.1:1, below AA at 14px semibold. Fix the button color, not the layout.
2. "Hero text illegible over busy images; pagination/arrows invisible; no value prop above fold" — **PARTLY VALID.** Legibility: valid in practice — the slide's subject face sits behind the headline and the overlay mid-band is only `via-ink/35`. Controls: invalid on desktop (arrows, dots, and the 01/04 counter are all visible); on mobile there is a worse, different bug — arrows overlap and clip the subtitle. Value prop: it exists but is too wordy for the owner's goal; the fix is fewer words, not more.
3. "Portfolio cards: inconsistent aspect ratios; dark labels unreadable; filter active state unclear" — **MOSTLY INVALID.** The grid enforces `aspect-[3/2]` with `object-cover`; measured card heights are equal. Labels sit on an `from-ink/85` scrim and are readable (the pale podium under "conference with press" is the one weak spot). The active pill (brass fill vs outline) is discernible. The real problem Gemini walked past: all six items are categorized "Events", so five of seven filters match nothing — and the grid's silent fallback then shows everything as if nothing happened. A data bug wearing a design costume.
4. "Stats band: giant numbers dwarf tiny labels; wasted vertical space" — **PARTLY VALID.** Big-numeral editorial style is intentional and fine. The actual smell is redundancy: the headline says "Since 2015" and the first stat is "2015 — SINCE". Also "4+ media houses" undersells a wall that names five. Edit content; do not redesign the band.
5. "Trusted-by text pills look cheap; wants monochrome logos 50% to 100% hover" — **VALID, and better than the critique knows.** The pills read as buttons. The twist: the logo system already exists end-to-end — `ClientLogo` table, admin upload UI, live `GET /public/logos` endpoint — but `ClientsWall.tsx` is a hardcoded array that never fetches. Wiring fix plus logo files, not a rebuild.
6. "Services: identical monotonous icon cards, no hierarchy" — **VALID.** Ten identical white icon cards at home; a second, competing numbered-block presentation on /services. No imagery, no hierarchy; the subtitle promises "Transparent prices" while `priceEn/priceRw` sit unrendered in the database; the schema's `featured` flag is unused. The owner's picture-card direction is right.
7. "About: massive blank container with isolated J; green CTA jarring" — **PARTLY VALID.** The "J" is a deliberate founder-photo placeholder — a content gap, not a code bug — but at `aspect-[4/5]` of empty cream it genuinely reads broken, and the section duplicates the credit pills already shown in "Trusted by". The green banner is not jarring: green is already carried by the WhatsApp FAB, the logo badge, and the hero fallback, and the banner passes AAA. It stays, with small additions.

Design-vs-content ledger. Content problems (not design): thin portfolio captions, missing founder photo, zero published testimonials, placeholder blog post ("africa sumit 2023" / "qwertyui"), missing logo image files. Real design problems: hero caption legibility + mobile arrow collision, brass button contrast, silent filter fallback, services sameness + missing prices, About container proportions, unwired logo wall, portfolio cards as dead ends.

---

## 4. Per-section blueprint

Priorities: **P0** blocks the picture-first goal, trust, or function; **P1** high-value polish; **P2** nice-to-have.
Global rule: every visible string goes through the i18n dictionary (`src/lib/i18n.tsx`) with EN and RW keys added together (the typed Record prevents drift).

### 4.1 Nav — P0 (contrast only)

Stays: three-zone layout, sticky `bg-cream/90 backdrop-blur`, clean header with no language toggle (the constraint "toggle lives in the footer" is already satisfied), hamburger drawer.

Changes:
- CTA pill `bg-brass` → `bg-brass-dark text-cream`, hover `bg-brass`. Label stays `nav_book`. (P0)
- Mobile drawer: append the EN/RW toggle at the drawer's bottom — the header stays clean on every viewport, and mobile users no longer must reach the footer to switch language. (P2)
- Logo wordmark: loosen tracking slightly (`tracking-[0.18em]`) so the two-line lockup breathes at h-10. (P2)

### 4.2 Hero — P0 (owner's #1 request)

Stays: rotating carousel (constraint), intro slide + portfolio slides, kenburns, grain, brass accents.

Changes:
- **Viewport.** `h-[72vh] min-h-[540px] max-h-[780px]` → `h-svh min-h-[560px]` (Tailwind v4 has `h-svh`). The photo fills the first screen edge to edge; the sticky cream header floats above it on scroll. No max-height cap — full bleed is the point.
- **Words.** The intro slide carries the only copy: kicker pill (`hero_badge`), ONE headline (`hero_title`), ONE primary CTA "Book a production", and ONE quiet secondary link "View our work" rendered as underlined cream text with a down arrow — not a second pill. Switch HeroSection lines 146/154 from hardcoded EN/RW ternaries to the existing dead keys `hero_cta_book` / `hero_cta_portfolio`. Drop the intro subtitle from the default view (move the current subtitle sentence into `hero_title` settings or the About section); if the owner insists on keeping it, cap it at one line and let it sit under the CTAs at `text-cream/75`.
- **Legibility without the 40-60% black wash.** Contra the external suggestion, a flat full-frame dim would fight the cream brand and mute the pictures. Instead: (1) caption block anchored bottom-left; (2) a bottom-up ink scrim `bg-gradient-to-t from-ink/85 via-ink/30 to-transparent` limited to the lower 45% of the frame; (3) on desktop add a left-edge vertical scrim `bg-gradient-to-r from-ink/55 via-ink/20 to-transparent` behind the text column only. Top two-thirds of every photo stays untouched — the pictures do the work, the text sits where photos are naturally darker. Add a subtle `text-shadow: 0 1px 24px rgb(0 0 0 / 0.35)` on the headline as insurance on bright slides.
- **Controls that stay visible.** Replace mid-height arrows with a bottom-right cluster: `[prev] [next] [01 / 04]` as compact cream-bordered circles; progress dots move to bottom-left as thin bars (active = brass, wider). On mobile the cluster sits in the bottom-right corner, clear of the caption block — this fixes the current defect where arrows overlap the subtitle. Add touch swipe (pointer events, 40px threshold), keyboard Left/Right when the section has focus, an explicit pause/play button (a11y), and `aria-roledescription="carousel"` with a polite live region announcing slide changes.
- **Hidden-slide focus bug.** Inactive slides are `aria-hidden` but their links remain tabbable (an a11y violation). Give inactive slides `invisible` (not just opacity-0) or set `tabIndex={-1}` on their links.
- **Performance.** Replace raw `<img>` with `next/image`, `priority` on slide 1 only, `sizes="100vw"`, quality 80 (WebP automatic). The backend WebP pipeline already caps uploads at 1920px — hero LCP stays healthy. Respect `prefers-reduced-motion`: no kenburns, no autoplay (controls remain).
- **Fallback slide.** Keep the deep-green gradient for the zero-photos state, but add the soundwave mark centered at low opacity so even the fallback feels branded rather than empty. (P1)

### 4.3 Portfolio + filters — P0

Stays: 3:2 `object-cover` grid (already consistent — do not "fix" it), rounded-2xl cards, hover zoom, bottom scrim captions, i18n filter keys.

Changes:
- **Kill the silent fallback.** `PortfolioGrid` line 48 (`visible = filtered.length > 0 ? filtered : items`) lies to users: clicking "Weddings" today shows all six items, five of which are not weddings. Replace with an honest per-filter empty state: a quiet cream card — "No work in this category yet — view everything" with a reset link — plus i18n keys `portfolio_empty_filter_title` / `portfolio_empty_filter_action` (EN+RW). Honest emptiness beats fake abundance for a premium studio.
- **Card interaction (picture-first).** Cards are currently dead ends. Make each card open a lightbox (P0-adjacent, pure frontend): full-screen ink/95 overlay, large image, prev/next, close on Esc/backdrop, swipe on mobile, caption = title + category + client name (`clientName` exists in the schema and is never shown). The schema's `mediaUrls` array already supports multi-image sets — render dots when length > 1. No dedicated /portfolio/[id] route is needed yet; a lightbox keeps the user on the page with the work.
- **Label treatment.** Keep the bottom scrim but strengthen the weak case: `from-ink/85 via-ink/45 to-transparent` with `pt-16`; title always visible (drop the translate-y reveal on the title, keep it only for the category line); category as a small brass-tinted uppercase kicker above the title. Titles display in title case (content guidance in admin; add a placeholder/hint "Minister of Agriculture" not "minister of agriculture").
- **Filter pills.** Active = `bg-brass-dark text-cream` (contrast fix); inactive = `border-ink/15 text-ink/65 hover:border-brass`. On mobile: horizontal scroll-snap row (`overflow-x-auto` + `snap-x`, no wrap) so seven pills do not wrap to two ragged lines.
- **Section header.** Keep "Featured work". Add a quiet "All work" count or link once the collection grows past ~12 items (P2; a dedicated /portfolio page is not warranted at six items).

### 4.4 Stats band (TrustBand) — P1

Stays: cream-alt band, serif statement, three-stat layout with hairline dividers, big Fraunces numerals.

Changes:
- Remove the "2015 / SINCE" stat — the statement above already says "Since 2015". Replace with a metric that sells volume or reach once the owner confirms numbers (candidates: "400+ productions delivered", "10+ years, 100+ events", "3 countries covered"). Placeholder until confirmed (open question 2).
- Bump label color `text-ink/55` → `text-ink/65`; numerals `text-5xl/6xl` → `text-4xl/5xl` so labels and numbers relate; reduce `py-20/24` → `py-16/20` to reclaim the dead vertical space the critique sensed.
- Statement stays exactly as-is (it is good copy).

### 4.5 Logos wall (ClientsWall) — P0 wiring, P1 assets

Stays: section position (between testimonials and services), "Trusted by" title.

Changes:
- **Wire it.** Replace the hardcoded `CLIENTS` array with `fetchLogos()` (`GET /public/logos` — endpoint already live) fed server-side from `page.tsx` exactly like testimonials. Render `imageUrl` as a monochrome logo: `h-9 w-auto object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0` (adopting the critique's 50-to-100 hover — it is right).
- **Fallback.** Logos without `imageUrl` render as quiet text wordmarks — but styled as wordmarks, not pills: `font-serif text-lg tracking-wide text-ink/45 hover:text-brass`, no border, no background, no shadow. The pill look is what read as cheap.
- **Assets.** Owner task: supply FAO / The New Times / Kigali Today / Radio 10 / ABIS logo files (PNG/SVG; the WebP pipeline converts on upload). Until then the styled-wordmark fallback is respectable.
- De-duplicate: the About section repeats the same five credits as pills — keep them in ONE place only (here). (See 4.9.)

### 4.6 Services — P0 (owner request: picture cards)

Stays: section position and `services_title`/`services_sub`; the `featured` and `sortOrder` fields; /services page as the full catalog.

Changes (home section becomes a picture bento):
- **Layout.** Replace the 3-column icon-card grid with a bento: `lg:grid-cols-6` — one featured picture card spanning `col-span-3 row-span-2` (tall, ~480px min-height; use the schema's `featured` flag, defaulting to Documentary Production, the 600k flagship), plus five standard picture cards `col-span-3` (two per row). Home shows SIX services maximum — the full ten remain on /services. Fewer, bigger, pictorial: exactly the owner's instinct.
- **Card anatomy.** Full-bleed image (aspect 3:2 standard, featured 3:4 tall) + bottom scrim + serif service name (cream) + ONE-line description + price line "From 150,000 RWF" rendered from `priceEn`/`priceRw` (fields exist today, unrendered — this resolves the "Transparent prices" truth gap; confirm with owner, open question 3) + a persistent "Book now" chip bottom-right. Whole card links to the service's blog post when `linkedPostSlug` exists (section 5.2), otherwise to `/book?service=<id>`.
- **Hover (distinct, per owner).** Image scales 1.04 (500ms), card border turns brass, and the "Book now" chip inverts from outline to solid `bg-brass-dark text-cream` with a 150ms sweep. The chip is a nested interactive element inside the card link — implement as a separate absolutely-positioned `<Link>` with `stopPropagation` semantics (sibling, not child, of the card link) so both targets stay accessible.
- **Image sourcing (no new shoots needed).** Reuse uploaded portfolio covers via a frontend `SERVICE_IMAGE` map in Phase A (service slug → portfolio item/category), then migrate to a proper `Service.imageUrl` column in Phase C:
  - Documentary Production → "farming in rwanda" (FAO field doc, flagship)
  - Corporate & Institutional Pictures & Videos → "minister of agriculture" or "conference with press"
  - Wedding & Event Photography → "wedding"
  - Commercial & Advertising Production → "sanlam in sports"
  - Music Videos & Creative Productions → "intore" (performance energy)
  - Livestreaming & Event Coverage → "conference with press"
  - Aerial / Drone → "farming in rwanda" (landscape frame)
  - Photo & Video Editing, Location Scouting → keep icon treatment in the bento's minor cells until real imagery exists (an irrelevant photo is worse than an icon).
  Guidance: wide frames, subjects at ease, WebP pipeline handles weight. Never stretch a portrait to fill a landscape cell.
- **/services page.** Keep the numbered 01-10 blocks (Itara-style — good), add the same price line and, as images arrive, a small thumbnail per block. One presentation per job: bento at home, catalog at /services.

### 4.7 Testimonials — P1 (design ready, content empty)

Stays: the component is well-built and correctly hides itself when empty (zero published testimonials today — hence invisible in screenshots).

Changes:
- When quotes arrive: keep cream cards, add the client's company logo (from the logos wall data) beside the author at `h-6 opacity-70` — mirrors dric.rw's logo-backed quotes (reference-sites.md section 1).
- Cap at 3 on home; a "read more" is unnecessary.
- Owner task: collect 2-3 real quotes (FAO / New Times contacts are the strongest). No design work blocked.

### 4.8 CTA banner — P2

Stays: deep-green full-width band, serif question headline, single brass button (7.1:1 contrast — compliant), "no calls needed" reassurance line.

Changes:
- Add ONE quiet secondary line under the button: "Prefer WhatsApp? Message us directly" linking `wa.me/250783269951` — matches the WhatsApp-first behavior of the market and dric.rw's benchmark without competing with the main CTA.
- Button follows the global contrast rule (`bg-brass-dark` or `text-ink`).
- Do not introduce green earlier to "prepare" the banner — with the picture hero, the banner is the palette's full-voice moment and it works.

### 4.9 About — P1

Stays: two-column layout, story copy (it is genuinely good), "Read the full story" link, brass glow accent.

Changes:
- **Fix the broken-looking placeholder.** Reduce the empty `aspect-[4/5]` monogram box to `aspect-[4/3]` and turn it into an intentional "card": monogram "J" at reduced size, plus a name plate — "Nkurunziza Jabo — Founder & Video Journalist" (i18n keys `about_founder_name` / `about_founder_role`) — so it reads as a designed identity card, not a failed image. The real fix is the founder photo (content task; owner consent required — open question 1); the component should accept `about_founder_image` from SiteSettings and render it when present.
- **Remove the duplicated credit pills** (FAO / New Times / Kigali Today / Radio 10) — they already live in the logos wall. One home for trust signals; repetition reads as filler.

### 4.10 Footer — P1

Stays: three-column layout, brand blurb, quick links, contact column, EN/RW toggle (constraint: it lives here — keep it here), legal line, tagline.

Changes:
- **Differentiate the two Instagram icons.** Studio and personal accounts render as two identical glyphs side by side — indistinguishable. Options in order of preference: (a) keep only the studio account in the icon row and link the personal account inside the About section ("follow the founder"); (b) keep both but add tiny labels under the icons ("Studio" / "Jabo"). Do not ship two identical adjacent icons. (P1)
- Add a `tel:+250783269951` link beside the WhatsApp number (Itara shows both; some clients call). (P2)
- "Client login" / "Track a production" are fine as quiet links; consider grouping them under a small "Clients" heading for scannability. (P2)

---

## 5. Functional fixes spec

### 5.1 Portfolio categories: canonical dropdown + data normalization (P0)

Root cause (confirmed in code): `AdminPortfolio.tsx` line 152 renders category as a free-text `<input>` with placeholder "Weddings / Corporate / Events"; the public grid exact-matches (case/singular-tolerant) against six canonical labels. The owner's six items are all "Events" — so "Weddings", "Corporate", "Concerts", "Documentaries", "Portraits" have nothing to show, and the silent fallback hides the failure.

Fix spec:
1. **Admin UI.** Replace the input with a `<select>` of the six canonical categories (same keys as `portfolio_filter_*` i18n entries so admin labels localize too): Weddings, Events, Corporate, Concerts, Documentaries, Portraits. Keep "Events" as the default for new rows. Optional "Other" is NOT offered — six buckets is the public taxonomy; anything exotic belongs in tags (the field exists).
2. **Backend validation (light).** In `adminCatalog.controller.ts`, accept the category string but validate case-insensitively against the canonical list; reject with 400 VALIDATION + the list in the message. Keep the DB column a plain `String` (no migration) so legacy values keep rendering during transition; the public matcher already tolerates case and singular/plural.
3. **Normalization of existing rows.** Mapping table (apply by hand in the admin UI — six rows — or a one-off script via the admin API):
   - trim + casefold; map singular to plural ("wedding" → "Weddings", "documentary" → "Documentaries", "concert" → "Concerts", "portrait" → "Portraits", "corporate" stays, "event(s)" stays "Events").
   - Owner reclassification of the current six (open question 4): "wedding" → Weddings; "minister of agriculture" → Corporate (or Events); "conference with press" → Corporate; "intore" → Concerts (or Events); "farming in rwanda" → Documentaries; "sanlam in sports" → Events (or Commercial via tags).
4. **Frontend honesty.** With real categories in place, remove the silent fallback (section 4.3) so filters show true results and true empty states.

### 5.2 Services to blog posts: `linkedPostSlug` (P0 decision + Phase C migration)

Decision: **optional `linkedPostSlug String?` on Service** (explicit link, admin-set). NOT auto-filtering the blog by tag.

Justification:
- Explicit: the owner chooses the deep-dive per service; no tagging discipline required, no surprise matches.
- Cheap: one nullable column; the admin blog CRUD and `/blog/[slug]` route already exist; the admin services form gains a dropdown populated from `GET /admin/posts` (title + slug of published posts).
- Robust: if the linked post is deleted or unpublished, the card silently falls back to `/book?service=<id>` (validate at render time on the public payload, or clean the slug in `deletePost`/patch-unpublish handlers — one line each, Phase C).
- The tag alternative needs a new taxonomy on posts, a filter UI, tag maintenance in two languages, and still cannot express "this specific post is THIS service's landing page".

Spec:
- Schema: `linkedPostSlug String?` on Service (additive, safe migration). Public services payload includes it plus the post's title for the card's hover label ("Read the full story").
- Admin form: "Deep-dive post (optional)" select; empty = card links straight to booking.
- Card behavior: primary card click → `/blog/[slug]`; "Book now" chip → `/book?service=<id>`. The booking form reads the `service` query param and preselects the service (small frontend addition to `BookingForm` via `useSearchParams` — the `/login` page already establishes the Suspense pattern). This closes the loop: picture → story → pre-filled booking.
- i18n: the post body is already bilingual by design (contentEn/contentRw); the card needs only `services_read_more` / `services_book_now` keys (the latter exists).

---

## 6. Findings neither the external critique nor the owner spotted

Journey walked: land, browse work, service interest, book; land, blog, book; client portal loop (booking email, magic link, /account, track link).

1. **The logo wall is unwired, not just ugly (P0).** `ClientsWall.tsx` hardcodes five names while the admin logo manager uploads to a `ClientLogo` table served by a live `GET /public/logos`. The owner can upload logos today and the homepage will never show them. Cheapest high-impact fix in this document (section 4.5).
2. **"Transparent prices" is currently a false claim (P0).** The services subtitle promises transparent pricing; `Service.priceEn/priceRw` exist in the database and seed (150k-600k RWF) but no component renders them. Either render "From X RWF" (recommended — OneZone's research shows price transparency is a market differentiator) or change the subtitle. A premium studio should not open with a claim its own page contradicts.
3. **The filter fallback actively lies (P0).** Documented in 4.3: `filtered.length > 0 ? filtered : items` makes dead categories look alive. Every UX audit miss (including Gemini's) traces to this one line masking the data bug.
4. **Mobile hero arrows overlap the subtitle text (P0 defect).** Captured in the 390px screenshot: the prev/next circles sit at 50% height directly on top of "From weddings to documentaries…". The desktop critique ("invisible arrows") was looking at the wrong viewport.
5. **Portfolio cards are dead ends on a showcase-first site (P0-adjacent).** No lightbox, no detail view, `mediaUrls` unused, `clientName` never displayed, nav "Portfolio" points at the home section (`/#portfolio`). The product is the work — the work has no "bigger" state. Spec: 4.3 lightbox.
6. **i18n violations inside the hero itself (P0 for the constraint).** `HeroSection.tsx` lines 146/154 hardcode EN/RW ternaries while the dictionary keys `hero_cta_book`/`hero_cta_portfolio` sit unused — the exact drift the typed-Record system was built to prevent. Also `html lang` stays "en" in RW mode.
7. **Hidden-slide focus trap (a11y).** Inactive carousel slides are `aria-hidden` but their CTA links remain keyboard-focusable — a WCAG violation and a confusing tab order. Fix with `invisible` or `tabIndex={-1}` (4.2).
8. **CTA inflation (IA).** The homepage currently offers: nav "Book a shoot", hero "Book a production" + "View our work", ten service-card "Book now" links, About "Read the full story", banner "Book a production", the WhatsApp FAB, footer login/track links. That is ~15 competing actions with two visual weights of brass. Rule after redesign: brass filled = booking only, one per viewport; everything else is quiet ink/brass text links. Service cards link to stories (which end in a pre-filled booking) rather than all shouting "Book now".
9. **Booking form friction (P1).** Native `type="date"` renders US `mm/dd/yyyy` in many locales — wrong for Rwanda (dd/mm/yyyy); at minimum add localized helper text, better a lightweight dd/mm/yyyy input or three selects (P2). Service dropdown default "—" is uninformative; preselect via `?service=` (5.2). No reassurance under the submit button — add "We reply within one working day" + a WhatsApp alternative link (i18n keys `book_reassurance`, `book_whatsapp_alt`). On `/book`, hide the WhatsApp FAB: it overlaps the form on mobile and duplicates the inline alternative.
10. **Performance & motion on low-end phones (P1).** Full-screen kenburns at `scale(1.14)` on an uncapped `<img>` is heavy for the target market's devices. Mitigations already specified: `next/image` + priority + `sizes`, backend WebP 1920px cap (exists), reduced-motion kill switch. Also add `fetchpriority` semantics via `priority` on slide 1 only.
11. **Trust-signal placement (P1).** "Since 2015" is good; FAO/New Times credibility is diluted across three places (logos wall pills, About paragraph, About pills) and consolidated in 4.5/4.9. The strongest missing trust artifact — per the OneZone benchmark — is ONE flagship case study with hard numbers (e.g. the FAO field documentary, audience/reach figures) as a pinned blog post linked from a service card (5.2 gives it a home).
12. **Blog content quality (content, flag gently).** The only live post is titled "africa sumit 2023" (typo) with excerpt "qwertyui" and a 2018-dated cover. On a premium site, one sloppy card undermines every trust signal above it. Owner content task (open question 6).
13. **Empty-state inventory.** Portfolio empty = a bare "—" (line 91); blog has a proper themed empty state; testimonials hide themselves; filters lie (3). Standardize on the blog pattern: quiet card + action.

---

## 7. Advisory: "Continue with Google" for the client portal

Current state: passwordless magic links — email submit, 15-minute single-use token, 7-day client JWT; booking confirmations also carry a 168-hour tracking link. SMTP is not configured in production yet (links print to container logs) — that is the actual delivery emergency, independent of auth method.

UX fit for THIS audience (Rwandan clients, WhatsApp-heavy, variable email habits):
- For: most phones are Android (Google accounts near-universal); one-tap beats typing an email on a keyboard; no dependency on email deliverability for the login step.
- Against: the portal's real usage is not "logging in" — it is clicking a tracking link from WhatsApp or email. The magic link already IS the low-friction path for that behavior; a Google button mostly duplicates it. The booking form requires an email anyway, so the portal identity model (email-keyed Client rows) does not change. OAuth adds a Google Cloud project, consent-screen setup, client-secret handling, an OAuth callback + state/CSRF flow (manual ~3 endpoints, or Auth.js), account linking by verified email to existing Client rows, new i18n strings and error states — roughly 1-2 dev-days plus permanent secrets/maintenance — to save a step most users never perform.

Recommendation: **not now; maybe later; never urgent.** Fix email/WhatsApp delivery of the magic link first (that is the conversion lever). Add Google only if evidence demands it: expired-link errors in `NotificationLog`/support requests, or repeat-portal-usage analytics showing friction. If built: manual OAuth2 code flow or Auth.js v5, link by verified email to the existing Client row, keep magic link as the fallback path, button label and errors via i18n.

Low-cost trust/conversion gaps vs the reference sites (from reference-sites.md): flagship case study with hard numbers (OneZone's "216,000 vaccinated" pattern — strongest gap); visible phone/tel link alongside WhatsApp (Itara); real logo wall (dric — wiring exists, 4.5); testimonial quotes with client logos (dric — component exists, content missing); service-interest prefill in booking (Itara's dropdown pattern — we get it free via `?service=`).

---

## 8. Phased implementation plan

Phase A — pure frontend, no schema changes (one frontend release):
- A1 Hero: `h-svh`, scrim system, bottom-right control cluster, mobile arrow fix, swipe/pause/keyboard, `next/image` priority, i18n key fixes, reduced-motion + focus-visible in `globals.css`, hidden-slide focus fix. (P0)
- A2 Contrast sweep: nav CTA, filter active pill, service "Book now" chips, `ink/45` → `ink/60`. (P0)
- A3 Portfolio: remove silent fallback, honest filter empty states, lightbox with `mediaUrls`/`clientName`, label/scrim polish, mobile pill scroll row. (P0)
- A4 Services bento with `SERVICE_IMAGE` map over existing portfolio uploads, price line from existing `priceEn/priceRw`, hover chip behavior, `?service=` prefill in BookingForm. (P0)
- A5 ClientsWall wired to `GET /public/logos` with wordmark fallback; remove duplicate About credit pills. (P0 wiring)
- A6 TrustBand content/scale fix; About placeholder card with founder name plate; footer icon dedupe + tel link. (P1)
- A7 Booking form polish (date helper text, reassurance line, FAB hidden on /book). (P1)
- Gates: `tsc`, eslint, build, existing e2e suite green; manual mobile pass at 390px.

Phase B — admin + data, still no migration:
- B1 Admin category `<select>` (frontend) + canonical-list validation (backend controller, code only). (P0)
- B2 Normalize the six existing rows via admin UI per the 5.1 mapping; owner confirms reclassification (open question 4). (P0 data)

Phase C — schema/backend (one migration, additive):
- C1 `Service.imageUrl String?` + `Service.linkedPostSlug String?`; admin services form gains image dropzone (existing `/admin/uploads` pattern) and post dropdown (existing `GET /admin/posts`); public payload + card behavior per 5.2; cleanup of `linkedPostSlug` on post delete/unpublish. (P0 for the service-story loop)
- C2 Optional: `/portfolio/[id]` detail route if the lightbox proves insufficient at ~20+ items. (P2)

Phase D — content (owner, no code): founder photo + consent; logo files; 2-3 testimonials; category reclassification sign-off; real stats numbers; blog post cleanup + one flagship case study; service images where portfolio covers do not fit.

Dependency notes: A4's image map is superseded by C1 (map deleted, column wins). A5 works immediately (endpoint live). B2 should land before promoting the filters in any launch communication. C1 is the only migration; everything else is code or content.

---

## 9. Open questions for the owner

1. Founder photo for About — and consent for using the personal/founder imagery flagged in the research doc (portrait, wedding names).
2. Real numbers for the stats band (productions delivered, events covered, countries) to replace the redundant "2015" stat.
3. Show "From X RWF" prices on service cards (recommended; seed data already has 150k-600k), or keep pricing fully quote-based and change the "Transparent prices" subtitle?
4. Category assignments for the six live portfolio items (proposed mapping in 5.1.3 — confirm or adjust).
5. Logo files (PNG/SVG) for FAO, The New Times, Kigali Today, Radio 10, ABIS — and permission to display each.
6. Blog: fix the "africa sumit 2023" title/excerpt placeholder, and is the Africa Summit story the flagship case study candidate (with real figures)?
7. Two Instagram accounts (studio + personal): keep both in the footer (labeled) or feature the personal one in About only?
8. Canonical WhatsApp number for all CTAs (+250 783 269 951) — and should a tap-to-call number appear anywhere?
