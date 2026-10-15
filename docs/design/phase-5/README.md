# Phase 5 — Signal studio workspace

15 October 2026 · Core redesign implemented and locally verified; ready for owner review. Not deployed.

## What changed

The admin now uses a bone workspace, ink navigation, vermilion accents, the complete Signal wordmark and Montserrat typography. Cards, fields, tables, dialogs and chart colours share the new theme. This supersedes the dark/brass colour direction in the older admin interface specification; existing keyboard, authentication and management behaviour remains applicable.

Navigation now distinguishes **Studio overview**, **Enquiries & productions** and **Projects**, with an English/Kinyarwanda switch and a link back to the public website. Login uses the full approved mark. The theme also applies to services, blog, clients and settings without replacing their existing business logic.

### Projects

- New projects start as private drafts.
- Publication status and published/draft totals are visible in the collection.
- The editor explains when changes become public and previews the current title, cover, gallery and films before saving.
- Gallery images can be uploaded separately from the cover. Film and caption URLs use the existing media editor.
- The published-page link reflects saved publication state rather than an unsaved checkbox change.
- Saving a newly created project again updates its returned ID instead of creating a duplicate. The same correction was applied to services and blog posts.
- Tag entry preserves commas while typing, so multiple tags can be entered normally.
- Cancelling an editor with changes after a previous save still asks whether to discard those changes. Saved messages do not mask subsequent dirty edits.

### Enquiries and clients

Existing enquiry search, status filters, detail dialogs, timeline and notification results remain available in the new visual system. The status-note hint now accurately says that the update is visible to the client; it previously incorrectly described a publicly displayed note as internal.

Client tracking explains the next step for each actual status, including the distinction between a received enquiry and a confirmed booking. No additional promises of delivery or notifications are inferred from the status.

## Verification

- Production build and TypeScript: passed.
- ESLint: zero errors; three existing unused-variable warnings in older E2E files.
- Read-only route checks: 25 passed; [results](http-checks.json).
- Real admin login and EN/RW switching: verified in the local production preview.
- Uploaded a cover and separate gallery image through the actual editor into local storage.
- Created a private test draft, saved an edit, and confirmed there was exactly one matching database row and no public listing while draft.
- Previewed and published that record locally, then verified its public page loaded the uploaded cover/gallery and film control. Returned the record to draft afterward.
- Verified cancellation after a saved record had further edits displays the unsaved-changes prompt.
- Verified multiple tags can be typed and saved.
- Verified project list/editor at a true 320px viewport (305px content area): no page overflow. Also inspected the 390px layout.
- Opened enquiry details and checked the existing status/timeline/notification sections remain accessible.

All writes used the isolated `creativesoundstudio_test` database. Remote upload storage and outbound notifications are explicitly disabled by the preview harness. Sample records now use valid uploaded-image paths and supported categories, so they can also be edited normally.

During the long verification pause the local API process stopped, causing upload/proxy failures. Restarting it restored the workflow. The preview requires both servers to remain running; a frontend-only session cannot load admin data.

## Owner review

Open `http://127.0.0.1:3011/admin` with the separate preview account supplied in the chat. To restart, follow the [preview commands](../phase-3/README.md#reproduce-the-local-preview). Use the real deployment account only on the live deployment.

Try: Projects → Add work → upload cover and gallery → Preview project → Create as draft → enable Published → Save → View published project. The local workflow fixture is deliberately left as a draft.

[Desktop preview](admin-desktop.png) · [Phone preview](admin-mobile.png)

## Limits and remaining work

This is a tested local candidate, not a completed launch. Phase 4's final media, native-language, independent browser/device and production notification checks still apply. Owner workflow acceptance remains pending. Image cropping/focal-point controls, drag-and-drop gallery ordering and a separate media-library interface are not included in this pass. Existing image fitting is retained. No database migration was introduced.
