# Signal release and rollback procedure

Prepared 14 October 2026. This is a reviewable procedure, not evidence of deployment.

## Prepare the candidate

- Record the exact reviewed Git commit and the currently active deployment ID or immutable image digest. Preserve the previous release for rollback.
- Confirm the active hosting setup. This repository contains both Vercel and Docker configuration; do not assume the older Docker operations guide describes the current live site.
- Use the production API origin for `BACKEND_URL` at build and runtime. Use `https://creativesoundstudio.rw` for `NEXT_PUBLIC_SITE_URL`. Never promote the local `.next` build targeting port 4011, the isolated database, or the preview harness.
- Build from source with the real deployment configuration. Run lint, unit checks and the read-only release script against the candidate URL, retaining the production canonical domain.
- Verify published projects, poster/film/caption URLs, service options, founder photograph and bilingual content. Remove preview records from any release data source by selecting the correct database, not by copying the local test database.
- Take the normal production database/media backup and record its recovery location. This redesign introduces no schema migration; do not run seeds or test fixtures in production.
- Verify enquiries and notifications with an approved test recipient in the release environment before exposing the candidate to visitors. Keep tracking tokens out of public screenshots and reports.

## Review and publish

Show the integrated candidate, open QA results and approved media list for final review. Once publication is approved, promote the reviewed deployment through the actual host. For a Docker release, use immutable release tags/digests and the explicit production compose files; do not rely on the mutable `main` tag or a dev override. No publishing commands were executed during this QA pass.

## Verify immediately after publication

Check the real domain on desktop and phone: EN/RW homepage, work index, project film/captions, services, enquiry, tracking entry, login and admin login. Verify favicon/social card, canonical/hreflang metadata, sitemap, API/upload proxying and error logs. Confirm an approved enquiry reaches the owner and receives a valid tracking link; check notification outcome separately from database persistence. Rerun the read-only script with the live origin.

## Roll back if a release-critical check fails

Re-promote the recorded previous deployment, or restore the previous immutable frontend image/configuration through the confirmed host. Retain the same production database and uploads. Do not restore a stale database merely to revert the frontend, because it would discard new enquiries. Recheck public routes, enquiry API reachability and media after rollback; retain failure details for a corrected candidate. No schema reversal is needed for the changes in this redesign.
