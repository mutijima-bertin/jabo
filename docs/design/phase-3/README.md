# Phase 3 — Integrated Signal public site

14 October 2026 · Implemented and locally verified; not deployed.

The approved Phase 2 design now runs inside the existing Next.js application. The public experience uses the full Creative Sound Studio wordmark, open-C signal, bone/ink/vermilion palette, local fonts and real founder photograph.

## Delivered

- Homepage with selected CMS projects, capabilities, founder introduction, framing interaction and working project enquiry.
- Work index with category filters and published-only project detail routes at `/en/portfolio/[id]` and `/rw/portfolio/[id]`.
- CMS-driven services, service preselection, studio/about page and English/Kinyarwanda navigation.
- Project galleries and explicit-start film players; direct MP4/WebM, trusted YouTube/Vimeo embeds, caption tracks, posters and playback-error fallback.
- Shared navigation/footer and identity styling for retained blog, contact, account and tracking surfaces.
- Loading, missing-media, empty-catalog and retry states; required catalog failures surface a retry state rather than an apparently empty portfolio.
- Localised metadata, project sitemap entries and locale switching that preserves query strings and fragments.
- Admin portfolio editor support for film and caption URLs using existing `mediaUrls`. No database migration is required.

## CMS handoff

Published portfolio items supply title, category, client, tags, cover and gallery media. Only published entries have public detail pages. Set the cover to the film poster; add film URLs through the portfolio editor. Use same-origin/approved media hosting or the supported YouTube/Vimeo players. Arbitrary remote video hosts can be blocked by the existing Content Security Policy. Captions use `.en.vtt` or `.rw.vtt` filenames; English is the fallback. Embedded player availability cannot be verified from the page across origins, so a direct film link is also offered.

Service names, descriptions and prices continue to come from the existing service editor. Founder image/story use the existing settings. Missing translated CMS content follows existing English fallback behaviour. A full admin redesign remains Phase 5.

## Verification

- Final production build and TypeScript checks: passed, 14 October 2026.
- ESLint: zero errors; three existing unused-variable warnings in older end-to-end test files.
- Four focused media URL, embed-host, file-type and locale-path tests: passed (`node --experimental-strip-types frontend/tests/signal.test.mjs`). Node emits a harmless module-type detection warning for imported TypeScript modules.
- Earlier in this Phase 3 session: 44 existing backend tests passed across booking, public contact and admin catalog suites against the isolated test database, with external notifications disabled.
- Browser integration checks: published project navigation, failed-video fallback, service preselection, English/Kinyarwanda switching, mobile menu, required-field validation, saved enquiry and tracking page.
- Responsive iframe checks at 360, 390 and 768 pixels: no horizontal page overflow in the checked home/service/enquiry views. These are browser layout checks, not physical-device coverage.
- Final production preview `/en`: HTTP 200. Prior interactive checks used the development preview; full production browser/device QA belongs to Phase 4.

The test enquiry remained in the isolated local database and did not send external notifications. The preview includes clearly labelled test records; those are not production case studies.

## Reproduce the local preview

Requires the existing isolated PostgreSQL test database (`creativesoundstudio_test`) and installed dependencies. The harness explicitly selects that database and disables outbound notifications; it must never be used as a production entry point.

From `backend`:

```sh
./node_modules/.bin/tsx scripts/signal-preview.ts
```

From `frontend`:

```sh
BACKEND_URL=http://127.0.0.1:4011 npm run build
BACKEND_URL=http://127.0.0.1:4011 npm run start -- --hostname 127.0.0.1 --port 3011
```

Open `http://127.0.0.1:3011/en`. Rebuild with the real deployment backend configuration before release; this preview build targets the local test API. The responsive review harness is archived beside this document, outside the public application.

## Phase 4 remaining

Review the integrated design with the client; select approved representative projects and a working film with captions; review Kinyarwanda copy with a fluent speaker. Complete production keyboard/accessibility, real-device, cross-browser and performance checks, plus deployment-environment API, media and notification checks. Prepare the release and rollback plan, obtain publication approval, deploy, then perform live smoke checks. No production website or production CMS content was changed during this phase.

## Local admin access

The isolated preview database does not contain the production administrator. Before the first admin review, run `node scripts/create-preview-admin.mjs` from `backend`. It creates `signal-preview@example.com` only in `creativesoundstudio_test` on localhost and displays a randomly generated password once. Store that password privately; it is not written into this repository. Rerunning the script leaves existing credentials unchanged. Sign in at `http://127.0.0.1:3011/admin/login`. The live-site administrator and production data are separate.
