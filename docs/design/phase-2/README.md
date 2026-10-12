# Phase 2 — Complete homepage prototype

Delivered 13 October 2026. Status: implemented and checked locally; ready for visual review. This is not the deployed website or the Phase 3 application integration.

## Open

From repository root:

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory docs/design
```

- Homepage: http://127.0.0.1:8766/phase-2/index.html
- Responsive and fallback review: http://127.0.0.1:8766/phase-2/review.html
- Desktop opening capture: [desktop.png](desktop.png)
- Mobile opening capture: [mobile.png](mobile.png)
- Complete mobile-page capture: [homepage-full.png](homepage-full.png)

The prototype uses the Phase 1 font and logo files through relative paths. Keep both phase directories together.

## Design and visitor journey

1. Warm bone opening, full-name logo, sans-serif headline and the real founder photograph.
2. Selected archive work: a large field photograph, event coverage, then a conversational portrait. Each opens an accessible preview with honest archive context.
3. **Inside the frame:** three visitor-controlled stages — the moment, the framing decision, the complete image. Divisions inspired by the Signal mark open into a photograph. This is a composition demonstration, not a claim about how a particular commission was produced. There is no invented soundtrack or mandatory audio.
4. Photography, film and live-production sections, with expandable detail and service preselection in the brief.
5. The founder, a human studio introduction and a three-step production process.
6. A studio-film poster and modal with graceful unavailable/loading designs.
7. A project brief with validation, review, editing and a downloadable text copy. No messages, bookings or server writes occur. No browser persistence is used.
8. Shared navigation, a functional mobile menu, footer and back-to-start links.

Prototype notices explain non-live actions. They are not proposed final marketing copy. The public release should replace archive notices with confirmed case studies and the local brief preview with an explicit enquiry submission and delivery confirmation.

## Verification performed

- Browser layout readings at 1440, 768, 390 and 360 CSS-pixel viewport settings showed no horizontal overflow (content widths exclude scrollbars). Desktop and mobile captures were inspected.
- All three framing stages changed image state and copy. Reduced-motion review override reported `transition-duration: 0s` while the interaction remained usable. System preference is handled by CSS; no OS setting was changed.
- Mobile menu opened and closed when a navigation link was chosen.
- Project dialog opened; Escape closed it and restored focus to the invoking project link.
- Film service opened using the keyboard. Photography service preselected the corresponding brief checkbox.
- Empty brief submission was blocked. A valid fictitious brief showed the correct values and service in the local preview. The downloaded text file was inspected. Keep editing retained values and returned focus to the idea field.
- Film poster, deliberate loading state and unavailable state checked through the review controls. Missing-image review state retained the page structure. These are simulated states; approved film media is not present, so playback/codec/caption tests remain outstanding.
- No browser console errors were reported in the checked session. JavaScript syntax and local asset/link checks passed.
- Source preserves useful static content and native service disclosure without JavaScript. The brief submit and interactive framing buttons start disabled until handlers attach; film button starts hidden. No-JavaScript behavior was inspected in source, not a separate disabled-JavaScript browser run.

Not a complete accessibility certification, performance benchmark, real-device or cross-browser audit. Final production testing is Phase 4. English is prototyped; the Kinyarwanda edition and language routing remain integration work. Client visual acceptance is not assumed.

## Required assets before production release

| Needed | Purpose |
| --- | --- |
| Three approved representative projects with accurate titles, client/organisation, studio role, date, credits, deliverables and usage permission | Replace archive studies with genuine case studies; no results or clients have been invented |
| Approved studio film or showreel, poster, captions/transcript, licence/consent information | Connect real playback and verify loading, failure, accessible controls and captions |
| A wider founder or crew photograph, if available | Improve variety between the opening and studio section; current prototype intentionally uses the supplied founder image twice |
| Approved service scope, process copy and English/Kinyarwanda copy | Confirm positioning and compose both languages with equivalent usability |
| Confirmed enquiry recipients, delivery rules and privacy copy | Connect the existing backend and verify success/error/retry using agreed test recipients |

## Media provenance

All photographs come from the supplied repository, converted to WebP in 640px and original-resolution variants. Larger filenames use a 1440 target suffix, but exports do not upscale originals; HTML width descriptors use actual pixel widths.

- `fieldwork-*`: `pictures/best for landing page or blog/fishing activities.jpg`
- `summit-*`: `pictures/best for landing page or blog/africa summit.jpg`
- `portrait-*`: `pictures/best for landing page or blog/nice portrait of a lady smiling.jpg`
- `founder-*`: `pictures/founder/jabo.jpg`

Public usage rights remain owner-confirmation items. Supplied client-logo files were not treated as proof of an endorsement or commission. Fonts, licences and outlined logos remain in the final Phase 1 identity kit.

## Phase 3 handoff

Implement this hierarchy and behavior in the existing Next.js frontend after incorporating visual feedback. Read `frontend/AGENTS.md` and local framework guidance first. Integrate project data, bilingual routes, shared components and the existing enquiry backend. Do not transplant the review query parameters, demo notices or local-only submission flow into the live product. Adapt responsive assets and font loading to the application; preserve the Phase 1 palette and complete wordmark.
