# Reference Site Research — dric.rw · itaraproduction.com · onezonestudio.com

Research date: 2026-08-18. Method: live fetches of each site's public pages (markdown extraction), plus JS-bundle string extraction for onezonestudio.com (Vite/SPA — plain HTML fetch returns only title/meta). Every claim below comes from the cited page; anything not verifiable is marked `[?]`. This report feeds the client site (Creative Sound Studio) design benchmark, per the user's brief.

---

## 1. DRIC ENT — https://dric.rw

WordPress site (`/wp-content/uploads/...` assets). Nav: Home, About, Portfolio, Gallery, Social Impact (blog), Contact.

**Overview / About** (https://dric.rw/about/)
- Founded **2017** as a "creative film production agency" with a "Visual Storytelling Redefined" tagline.
- History story: small beginnings → by 2025 "a powerhouse" collaborating with MTN, RwandAir, SKOL.
- Mission: craft compelling visual stories that elevate brands; Vision: "best leading creative production powerhouse"; Values: creativity, excellence, integrity, collaboration, innovation.
- Testimonial carousel "Real People. Real Stories" with client logos: **MTN Rwanda, RwandAir, TIME100, Visit Rwanda** (4 quotes) — social-proof section.
- **No team section** (names from the user's brief — Cedric Karemangingo, Nailla Simbi, Umutoniwase Gretta, Alain Tuyikunde, Christopher J. Murenzi, Hanny Gakwandi, Hirwa Yves Emmanuel — do NOT appear on the site).

**Portfolio** (https://dric.rw/portfolio/)
- 6 categories: **Documentaries, Music Videos, Commercials, Events, Highlight Videos (Entertainment), Behind the Scenes** (URLs `/video/<category>/`).
- Thumbnails seen for BioNTech, RwandAir, WTTC (aerial/hospitality imagery).

**Blog → "Social Impact"** (https://dric.rw/blog/)
- Posts: "The Hands-On Workshop" (2026-08-11), "Celebrating the Women of Dric Ent.", "Capturing Rwanda's Spirit Through Sports and Tourism", "Redefining Storytelling, One Project at a Time". They use the blog for thought-leadership + community impact — a "Social Impact" section label, not "News".

**Contact** (https://dric.rw/contact/)
- Two CTA form sections: **"BOOK US!"** and **"PARTNER WITH US!"**.
- Footer: "Contact Support" → **WhatsApp wa.me/+250788898323**. **No public email or phone** on the site — WhatsApp is the only direct channel.

**Socials (footer, all pages)**
- Instagram https://www.instagram.com/dric_ent/
- X https://x.com/CedricDric1
- YouTube https://www.youtube.com/@dricent.415
- LinkedIn https://www.linkedin.com/company/dric-ent/

**Sections in footer nav:** About Us / Gallery / Portfolio only (lean footer nav + Services list below).

**Services (footer list):** Creative Development · Ideation & Strategy · Production Services · Post-Production Services — a **phase-based** framing (develop→ideate→produce→post), not a by-format list.

**Design notes:** Dark, cinematic photography-led WP theme; full-bleed hero images; heavy use of video thumbnails; copy is brand-story tone ("small beginnings can grow into something extraordinary"), testimonials with real logos. Contact page is sparse (two form blocks, no map, no office address). No pricing anywhere (private/quote-based, standard for production houses).

**Copy / structure patterns to imitate:** mission–vision–values trio; client-logo social proof; portfolio split by product category; "Social Impact" blog to position beyond commercial work; WhatsApp-first contact.

---

## 2. ITARA — https://itaraproduction.com

Custom site (heavy JS; content extracted from each route). Nav: Home, About, Services, Portfolio, Contact (default English; EN/FR switcher noted [?] — dictionary strings present).

**Overview / About** (https://itaraproduction.com/about)
- Name meaning: **"Itara" = light in Kinyarwanda**; full-service audio-visual & multimedia agency.
- Kigali HQ, serving **East Africa & the Middle East**.
- Mission / Vision / (values) stated; founding story "Born From Passion" — from a small team to a growing regional agency.
- (User brief adds: 4+ years, 130+ clients, portfolio covering documentaries, commercials, corporate films; 8 personnel — NOT on the fetched pages [?] — treat as client-supplied, verify with Itara before citing publicly.)

**Services** (https://itaraproduction.com/services) — numbered catalog, the most detailed of the three:
- **01 Documentary Production** — Research & Development, Scriptwriting & Narrative Structure, Filming & Interviews, Archival Integration, Post-Production.
- **02 Corporate & Institutional Videos** — Company Profile Videos, Annual Reports & Impact Stories, Institutional Documentaries, CSR Campaign Films, Internal Communications.
- **03 Commercial & Advertising Production** — TV Commercials, Social Media Ads & Campaigns, Brand Launch Videos, Promotional Campaign Films, Product Showcases.
- **04 Music Videos & Creative Productions** (list truncated at fetch — remainder visible via contact form's service dropdown: Post-Production, Location Scouting, Art Department, Brand & Communication, Web & Software Development).

**Portfolio** (https://itaraproduction.com/portfolio)
- Filter tabs: **All / Documentaries / Events & Culture / Corporate Films / Advertising & Commercials / TV Content**.
- Items: "Events & Festival Coverage", "Rwanda From Above", "Shots from ISACA Meeting", "Rwanda is Africa smiling from the top of it's hills" — each links to the work's **Instagram post** (no embedded player). Small but signal-rich catalog.

**Contact** (https://itaraproduction.com/contact)
- Form with **Service Interest dropdown** (full service list) — smart lead qualification.
- Locations: **East Africa HQ — Kigali, Rwanda**; **Middle East Office — Qatar**.
- Phones: +250 788 289 707 (https://wa.me/250788289707), +250 788 693 284 (tel:+250788693284), +968 9592 5123 (tel:+96895925123).
- Email: Cloudflare-protected (can't extract) — interesting anti-spam choice.
- Footer social icon row: **Instagram, YouTube, Vimeo, LinkedIn** (no X/TikTok).

**Design notes:** Clean white/light layout with large typography; numbered service modules (01/02/03/04) = scannable pricing-adjacent structure; "Our Global Presence" (East Africa + Middle East) as differentiating claim; portfolio links outward to Instagram (low maintenance but loses SEO/site retention); no public pricing (quote-based).

**Copy / structure patterns to imitate:** numbered services with sub-bullets (documentary = the *first* service = signature craft emphasis); service-interest dropdown in contact form; global-presence claim (diaspora/regional clients); Vimeo in socials (pro video platform signal).

---

## 3. OneZone Studio — https://onezonestudio.com (photography at /photography)

SPA built with **Vite + Wegic.ai** (single-page publish; content lives in JS chunks served from `cdn.wegic.ai/assets/onepage/publish/01KCZZP9N145M55A9X704KA74B/<hash>/assets/`). Because it's a JS app, **the HTML fetch returns only title/meta — all content below was extracted from the JS bundles** (fallback method, documented here deliberately). Live site title/meta: "OneZone Studio | Full Service Photo + Video Studio & Gear Rental — Kigali-based production team creating cinematic visuals for brands, events, and creators. We also offer professional camera, lighting, and audio gear rentals."

**Photography page (bundle `photography-Dx84X1XX.js`) — 4 portfolio categories:**
- **Events** (22 shots) — incl. named "Event Coverage", "Documentary", "FIFA Congress".
- **Hospitality & Interiors** (15 shots) — named "Blossom Restaurant", "Blossom Lounge", "Fine Dining Setup", "Champagne Evening", "Royal Salute", "Wine Collection", "Table 15/Setting", "Gentlemen's Lounge", "Lamp & Blossom".
- **Lifestyle** (22 shots) — "Lifestyle Campaign", "Outdoor Shoot", plus unlabeled "Photography 9–73" filler titles.
- **Portraits** (24 shots) — "Portrait Session", "Studio Session", "Creative Shoot".
- (Filler titles "Photography 9…73" = Wegic template placeholder names — the client has NOT renamed most uploads; a quality signal: real sites would name every shot.)

**Gear Rental catalog (bundles `rentalProducts-DkZIg8Ch.js`, `index-BCQJVSpj.js`) — daily FRW prices, publicly listed (unique among the three):**
Sony FX3A 50,000 · DJI RS 4 Pro 30,000 · PolarPro VarND 15,000 · Insta360 Ace Pro 2 30,000 · Amaran 300c RGB 30,000 · Sony a7 IV 25,000 · Lexar SD 10,000 · Manfrotto 502A+546GB 20,000 · SmallRig V-Mount 20,000 · Shure SM7B 30,000 · Delkin mount 30,000 · Sony FX6 400,000 · RED Komodo 6K 300,000 · Sony GM 24–70 f/2.8 II 40,000 · Aputure LS 600d Pro 60,000 · Sigma 24–70 20,000 · Sigma 70–200 25,000 · RODE Wireless GO II 15,000 · RODE Wireless PRO 20,000 · Zoom H6 25,000 · Insta360 X5 30,000 · Atomos Ninja V+ 30,000. (Denominated "FRW"/RWF; daily units inferred — [?] confirm before reusing prices.)

**Case studies / brand partners (intro bundles):**
- Documentary on Rwanda's Ebola-prevention campaign "Umurinzi" (216,000 vaccinated) — flagship story.
- **Sunripe Farms Rwanda** (agribusiness profile) — cross-checkable: Sunripe is a Bugesera agribusiness visited by Minister Musafiri in Apr 2023 (https://www.sunripefarmsrwanda.com/article/minister-of-agriculture-for-rwanda-visits-sunripe-farms).
- **OX Delivers** — electric-truck logistics for rural Rwanda (pay-per-kg model).
- Partners row: **Johnson & Johnson, SuperSport, Commonwealth, Envision, Arthur Nation** (+ more spanning brands/NGOs/sports).

**Team (intro bundles, capitalized display names):** **KARINIJABO JEAN DE DIEU (a.k.a. "Mex") — Founder & Creative Director**; **JUNIOR MATURIN RUTAYISIRE** (role not stated in extracted strings [?]).

**Contact (bundle strings):** email **official1zone@gmail.com**; phone/whatsapp **+250 781 052 279** (https://wa.me/250781052279). Email/phone are template-rendered (`mailto:${vi.email}`, `tel:${vi.phone}`) — i.e., site has NO contact form, only mailto/tel/WhatsApp links. Instagram/WhatsApp/YouTube keys exist in the bundle but concrete profile URLs weren't in the extracted strings (template-driven) [?].

**Design notes:** Modern one-page app with pricing exposure (rental rates) = trust for gear buyers; category tabs on /photography; hospitality brand work (Blossom Restaurant etc.) signals lifestyle/food clients; case-study partners (J&J, SuperSport) for credibility. Weaknesses: template filler titles ("Photography 9…73"), Gmail-only contact, no form, privacy of an SPA (no SEO content), Wegic builder look.

**Copy / structure patterns to imitate:** public rental/rate transparency as a differentiator; named photography categories (Portraits/Events/Lifestyle/Hospitality); flagship case study with hard numbers (216,000 vaccinated).

---

## Cross-site benchmark summary

| Dimension | DRIC | Itara | OneZone | Notes for CSS |
|---|---|---|---|---|
| Origin story | 2017, mission/vision/values | "Itara = light", EA+M.E. | — | CSS has founder-led story to tell |
| Services framing | 4 phases (Creative Dev→Post) | 4 numbered formats + 6 more | gear rental + photo/video | Itara model matches client's desired services list |
| Portfolio | 6 video categories w/ URLs | 6 filter tabs → Instagram | 4 photo categories | Use real category taxonomy |
| Social proof | Logos: MTN, RwandAir, TIME100, Visit Rwanda | case Instagram posts | J&J, SuperSport, Commonwealth | Client can name Zavu + local orgs |
| Contact | WhatsApp-only (+250788898323) | phones +250 788 289 707 / 693 284, Qatar +968, form + dropdown | official1zone@gmail.com, +250781052279 | WhatsApp-first + email + form w/ service dropdown is the strongest combo |
| Pricing | none public | none public | rental prices public in FRW | Client asked: confirm public pricing stance |
| Team | not shown | not on fetched pages [?] | Founder + 1 named | CSS has real team (founder-pioneered) |

---

## What could NOT be verified (per brief: document precisely)
1. **OneZone**: full HTML of `/photography` cannot be fetched as rendered content (SPA) — content recovered from JS bundles instead; bundle-internal instagram/youtube profile URLs not resolvable from strings; whether rental prices are daily vs per-shoot.
2. **Itara**: Services item 04 sub-bullets truncated at fetch; Email address hidden behind Cloudflare; FR/EN language toggle presence not confirmed on every page.
3. **DRIC**: No team page exists (names only from user brief); no email/phone on contact page (WhatsApp only); ©2025 footer (site may lag content updates — blog post dated 2026-08-11 contradicts).
4. Everything else above is live-verified on 2026-08-18.