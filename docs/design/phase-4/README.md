# Phase 4 — Quality and release preparation

14 October 2026 · Local QA pass complete; launch gate remains open. Nothing deployed.

## Fixes delivered

- Kept the full wordmark and mobile controls within a 320px viewport; the header previously overflowed.
- Escape closes the mobile menu while its toggle has focus, as well as from its links.
- The skip link now explicitly focuses the main content.
- Portfolio links announce their title once instead of repeating the image title and heading.
- Consolidated Montserrat loading through Next's local-font system, removing the duplicate CSS font definitions. The handwritten-style notes use the approved italic serif through the same system. Noncritical serif fonts are not preloaded.
- Removed the new-tracking-link instruction from valid tracking pages; invalid links retain that instruction.
- Changed the mobile navigation action to “Start a project”, consistent with the enquiry workflow.
- Replaced the old gold CSS social-sharing badge with the approved full-name Signal identity. The source and PNG can be regenerated with `node frontend/scripts/og-image.mjs`.

## Evidence

| Check | Result |
| --- | --- |
| Next production build / TypeScript | Passed after application fixes |
| ESLint | No errors; three pre-existing unused-variable warnings in older E2E files |
| Focused unit tests | Four passed |
| Read-only release smoke checks | 25 passed; [raw results](http-checks.json) |
| 320px phone layout | EN/RW homepage, project, enquiry and tracking checked; no page overflow after fix |
| 390px and 768px layouts | EN/RW home, EN services and RW enquiry checked; no horizontal page overflow |
| Keyboard | Mobile toggle Escape and skip-link focus verified in production preview |
| Video | A generated local three-second fixture loaded, played to completion, and loaded its default caption track (`readyState=2`); no autoplay |
| Failed video | Failure state observed; retry control verified during fixture setup; Phase 3 also tested a deliberately missing source |
| Enquiry journey | Project CTA selected Photography, real test request saved, reference and tracking page opened successfully |
| Browser console | No warnings/errors in the final preview observation |
| Visual review | [Desktop](desktop.png), [phone](mobile.png), [share card](../../../frontend/public/og-default.png) |

All submitted data went to the isolated test database with external notifications disabled. Test media and labels are not approved studio productions. No additional production backend logic or schema changes were needed.

Run the read-only checks again with:

```sh
node frontend/scripts/check-release.mjs
```

`PREVIEW_ORIGIN` changes the target; `EXPECTED_SITE_ORIGIN` changes the expected canonical domain. This checks HTML, HTTP responses, indexing rules, sitemap and API reachability. It does not submit forms or alter records. Millisecond values in the JSON are local server timings, **not** page-load scores or Core Web Vitals.

For the optional film fixture, generate `/tmp/signal-phase4-media/check.webm` and `check.en.vtt`, then start the Phase 3 test harness with `SIGNAL_PREVIEW_MEDIA_DIR=/tmp/signal-phase4-media`. It serves only these two named files, on localhost, outside the production app. Without that variable the regular preview remains unchanged. Do not run the harness against production.

## Outstanding release gates

1. Confirm the final representative projects, media rights and working studio film. The user was asked whether to start with the currently published portfolio or three nominated projects; no selection has been received yet.
2. Review final Kinyarwanda content with a fluent speaker.
3. Complete real-device and independent-browser testing, including captions, keyboard/screen-reader use, form errors and reduced-motion preferences. The in-app browser checks are not a full accessibility certification or cross-browser result.
4. Measure production-network performance with the real media. Duplicate font requests were removed, but there is no verified Lighthouse/Core Web Vitals score yet. WOFF2 conversion and image delivery optimisation can follow measured results.
5. Verify the actual hosting project, build configuration, media/CDN paths and notification delivery in the release environment. No live email/SMS was sent in this pass.
6. Review the concrete release candidate and approve publication; deploy and perform live smoke checks.

See [release and rollback procedure](RELEASE.md). Phase 4 is not marked complete until these gates are closed.

### Admin access follow-up

The preview database had zero admin accounts, so the public preview worked but production credentials could not authenticate locally. Added a create-only local admin bootstrap with a random hashed password and verified login through the actual sign-in form into the authenticated dashboard. See [dashboard evidence](admin-access.png) and [setup instructions](../phase-3/README.md#local-admin-access). No production accounts or passwords were changed.
