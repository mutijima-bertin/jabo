# SEO Phase 8 — Keyword-tuned service copy (draft for seed application)

**Status:** Draft copy only — the backend engineer applies these `descriptionEn` replacements to `backend/prisma/seed.ts` (SERVICES array) in a follow-up. NO other repo files were touched.

**Conventions applied (per Phase 8 brief + brand voice from `frontend/src/lib/i18n.tsx`):**

- EN first; ≤2 sentences per replacement; same meaning and factual claims as the current seed string.
- Natural tier-1 / tier-2 keyword integration (read-aloud test passed): Tier-1 = livestreaming / event streaming, drone / aerial, wedding / gusaba; Tier-2 = corporate video, editing.
- Keywords land only where the service genuinely provides that offer. Where no tier phrase fits honestly (documentary, advertising, music, location/fixer), the replacement still adds a natural locality or category phrase ("in Kigali", "in Kigali and across Rwanda", "filming permits") so the whole catalog reads as one SEO-consistent voice.
- `nameEn`, `priceEn`, category, icon, and all RW fields stay untouched.

---

## Keyword coverage summary

| # | Service (`nameEn`) | Tier phrase carried in replacement | Count |
|---|---|---|---|
| 1 | Wedding & Event Photography | **Tier-1** — wedding & gusaba photography | 1 |
| 2 | Corporate & Documentary Videography | **Tier-2** — corporate video | 1 |
| 3 | Livestreaming & Event Coverage | **Tier-1** — event livestreaming | 1 |
| 4 | Aerial / Drone Photography | **Tier-1** — drone & aerial, RCAA permitting | 1 |
| 5 | Photo & Video Editing | **Tier-2** — photo & video editing | 1 |
| 6 | Documentary Production | — (locality: Kigali + across Rwanda) | 0 |
| 7 | Corporate & Institutional Pictures & Videos | **Tier-2** — corporate video | 1 |
| 8 | Commercial & Advertising Production | — (locality: Kigali, Rwanda) | 0 |
| 9 | Music Videos & Creative Productions | — (locality: Kigali, Rwanda) | 0 |
| 10 | Location Scouting & Fixer Services | — (permit tie-in: "filming permits", links to permit guides) | 0 |

**Descriptions carrying a tier-1/tier-2 phrase: 6 of 10.** The remaining four keep fact-parity and gain a natural category/locality keyword while staying truthful.

---

## 1. Wedding & Event Photography `[seed copy]`

- Current `descriptionEn`: `"Full-day coverage of weddings, ceremonies, and celebrations with professional editing."`
- Recommended `descriptionEn`: `"Full-day wedding and gusaba photography in Kigali, covering ceremonies, celebrations, and every important moment with professional editing."`

Why: Tier-1 wedding/gusaba phrase front-loaded; factual claims (full-day, ceremonies, celebrations, professional editing) unchanged; "in Kigali" adds the local ranking signal the tier research targets.

---

## 2. Corporate & Documentary Videography `[seed copy]`

- Current `descriptionEn`: `"High-quality video production for companies, NGOs, and government institutions."`
- Recommended `descriptionEn`: `"Corporate video and documentary production in Kigali for companies, NGOs, and government institutions."`

Why: Tier-2 "corporate video" phrase + Kigali locality; every factual claim preserved; one clean sentence.

---

## 3. Livestreaming & Event Coverage `[seed copy]`

- Current `descriptionEn`: `"Professional live streaming of events with multi-camera setups, for local and international audiences."`
- Recommended `descriptionEn`: `"Professional event livestreaming in Kigali with multi-camera setups for conferences, ceremonies, and live events — broadcast in real time to local and international audiences."`

Why: Tier-1 "event livestreaming" phrase leads; "conferences" reflects the verified Kigali MICE demand (RDB 2025: 165 events / $94.7M); "real time" names what livestreaming already means (no new factual claim); audience + multi-camera claims preserved.

---

## 4. Aerial / Drone Photography `[seed copy]`

- Current `descriptionEn`: `"Stunning aerial views for real estate, agriculture (FAO projects), and landscapes."`
- Recommended `descriptionEn`: `"Drone and aerial photography in Kigali and across Rwanda for real estate, agriculture (FAO projects), and landscapes — with RCAA-compliant permitting arranged."`

Why: Tier-1 "drone and aerial" phrase leads; catalogue claim (real estate / FAO agriculture / landscapes) intact; "RCAA-compliant permitting arranged" is an honest offer — the same promise the Location Scouting service already makes ("with permits … arranged") and matches the new drone permit guide concept. NOTE for founder sign-off: the geography "in Kigali and across Rwanda" reflects existing portfolio work (e.g., Lake Kivu) — soften to "across Rwanda" if you prefer no city claim on this card.

---

## 5. Photo & Video Editing `[seed copy]`

- Current `descriptionEn`: `"Professional post-production: color grading, editing, and delivery in any format."`
- Recommended `descriptionEn`: `"Professional photo and video editing and post-production in Kigali — color grading, editing, and delivery in any format."`

Why: Tier-2 "photo and video editing" phrase leads; the original post-production claims (color grading, delivery formats) preserved verbatim; locality added.

---

## 6. Documentary Production `[seed copy]`

- Current `descriptionEn`: `"End-to-end documentary production: research, scripting, interviews, and archival footage for development agencies, media, and institutions."`
- Recommended `descriptionEn`: `"End-to-end documentary production in Kigali and across Rwanda: research, scripting, interviews, and archival footage for development agencies, media, and institutions."`

Why: Strong honest sequence keyword ("documentary production") + locality; every scope claim (research → archival footage; development agencies, media, institutions) preserved exactly. Not a tier-1/tier-2 phrase per Phase 1 research.

---

## 7. Corporate & Institutional Pictures & Videos `[seed copy]`

- Current `descriptionEn`: `"Brand films, event coverage, portraits, and impact stories for companies, NGOs, and government offices."`
- Recommended `descriptionEn`: `"Corporate video production in Kigali — brand films, event coverage, portraits, and impact stories for companies, NGOs, and government offices."`

Why: Tier-2 "corporate video production" leads while every deliverable (brand films, event coverage, portraits, impact stories) and audience (companies, NGOs, government offices) stays identical.

---

## 8. Commercial & Advertising Production `[seed copy]`

- Current `descriptionEn`: `"TV commercials, social media ads, and product launch films — from concept to final cut."`
- Recommended `descriptionEn`: `"Commercial and advertising production in Kigali, Rwanda — TV commercials, social media ads, and product launch films, from concept to final cut."`

Why: The deliverable list is already precise; the replacement adds "Commercial and advertising production" as a leading phrase + "Kigali, Rwanda" locality. No tier-1/2 phrase honestly applies.

---

## 9. Music Videos & Creative Productions `[seed copy]`

- Current `descriptionEn`: `"Music videos, artist content, and bold creative projects — concept, direction, and editing included."`
- Recommended `descriptionEn`: `"Music video production in Kigali, Rwanda — artist content and bold creative projects, with concept, direction, and editing included."`

Why: Leads with a searchable "music video production" phrase + locality; all creative claims (concept, direction, editing included) preserved. No tier-1/2 phrase honestly applies.

---

## 10. Location Scouting & Fixer Services `[seed copy]`

- Current `descriptionEn`: `"Find the perfect Rwandan locations, with permits, logistics, and local crews arranged for local and international productions."`
- Recommended `descriptionEn`: `"Rwanda location scouting and fixer services for film and video productions — filming permits, logistics, and local crews arranged for local and international shoots."`

Why: Leads with "Rwanda location scouting"; "permits" becomes "filming permits" (context-accurate for a production-fixer service and ranks for the permit topic family covered by the new filming-permit guide); audience claim (local and international) preserved. This service is the natural `linkedPostSlug` home for the filming permit guide (see `handoff-notes.md`).

---

## Conformance checklist (applied)

- [x] EN first, ≤2 sentences per replacement
- [x] No invented facts, fees, or officer names
- [x] No "click here"
- [x] Natural keyword placement — each replacement reads aloud like spoken offer copy, not a keyword list
- [x] Read-aloud test: every sentence is grammatically complete and conversational
- [x] Prices, names, categories, icons, and RW fields untouched