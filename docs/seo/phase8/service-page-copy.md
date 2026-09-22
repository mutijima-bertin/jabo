# SEO Phase 8 — `page_services_sub` string replacement (EN + RW)

**Target file:** `frontend/src/lib/i18n.tsx` — the `en` dict (line ~233) and the `rw` dict (line ~673).

**One-line change only.** Processing claims are preserved verbatim; the new clause front-loads the four Tier-1/Tier-2 offers with the Kigali, Rwanda locality.

---

## EN

- Old string (exact, currently in `i18n.tsx`):

```
Every production includes professional editing, online delivery, and a personal tracking link from booking to final delivery.
```

- New string (exact replacement):

```
Wedding & gusaba photography, corporate video, event livestreaming, and drone coverage in Kigali, Rwanda — every production includes professional editing, online delivery, and a personal tracking link from booking to final delivery.
```

## RW

- Old string (exact, currently in `i18n.tsx`):

```
Buri murimo urimo gutunganya amashusho, gutanga online, n'urugero rwo gukurikirana kuva mu kwandikisha kugeza ku gutanga.
```

- New string (exact replacement — mirrors the EN clause order, existing process wording kept word-for-word):

```
Amafoto y'ubukwe n'ubusaba, amashusho y'ibigo, ibirori biriho ku mubare mubanza, n'amafoto y'igisore i Kigali, u Rwanda — buri murimo urimo gutunganya amashusho, gutanga online, n'urugero rwo gukurikirana kuva mu kwandikisha kugeza ku gutanga.
```

Note on RW wording: `"ubusaba"` is the standard Kinyarwanda noun for the engagement/gusaba ceremony — the EN copy intentionally keeps the loanword "gusaba"; `"ibirori biriho ku mubare mubanza"` reuses the studio's existing RW term for livestreaming from the seed (`Kwerekana Ibirori mu Mubare Mubanza`); `"igisore"` matches the seed's drone term.

---

## E2E pin risk

**None found.** Checked all specs in `frontend/e2e/`:

- No spec asserts `page_services_sub` or either of its literal strings (`Every production includes…` / `Buri murimo urimo…`).
- The services bento test (`redesign.spec.ts` `"services bento renders prices and placeholder cards"`) pins the **heading** "Services & pricing", the `/^From [\d,]+ RWF/` price regex, the live **service count**, and image counts — none touch the services-page subtitle.
- `admin-overhaul.spec.ts` pins service **names** via `truncateServiceName(s.nameEn)` on the admin chart ticks — names are untouched by this phase.
- No other spec references the services description strings either (verified: `descriptionEn` is only read in `bookings-from-content.spec.ts` for API-patch round-trips of already-modifiable data, never asserted as fixed text).

Safe to ship with the seed/service-copy change in the same PR.