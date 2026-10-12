# Creative Sound Studio — Redesign roadmap

Last updated: **13 October 2026** · Status: **Phase 2 prototype delivered — ready for visual review**

This is the working plan and progress record for the new Creative Sound Studio identity and website. Its priority is an original, visually compelling experience that feels personally art-directed and demonstrates the studio's craft.

## Start here: current phase and next action

| Item | Current position |
| --- | --- |
| Completed | Phase 0 research; Phase 1 identity; Phase 2 complete homepage prototype |
| Current phase | **Phase 2 delivered; visual review before Phase 3 integration** |
| Immediate task | Review the [complete homepage](docs/design/phase-2/index.html), then integrate the selected experience |
| Identity deliverable | [Final board](docs/design/phase-1/index.html), [brand guide](docs/design/phase-1/signal-brand/BRAND.md), [asset ZIP](docs/design/phase-1/creative-sound-studio-identity.zip) |
| First public release | Phase 3 working public-site MVP, after Phase 4 launch checks |
| Awaiting decisions | Homepage visual feedback; approved projects/film and bilingual copy before launch |
| Blocked? | No |

**Final foundation: Signal Notes.** Audience: organisations, brands and events. Approved combination: Strong bone surfaces with Subtle sans-serif headlines. Preserve the open-C + upright signal, full company name, ink/bone/vermilion, real founder image and serif archive notes. Identity finalisation does not mean the production website has been rebuilt.

## What success means

- The client recognises a distinctive studio identity, with a memorable visual idea beyond a generic gallery template.
- A first-time visitor can identify the studio's capabilities, explore its work, and start a project.
- Desktop and mobile feel equally composed; mobile is designed intentionally rather than compressed from desktop.
- The identity works on film titles, watermarks, social profiles, and proposals as well as the website.
- Motion and sound demonstrate craft without obstructing navigation or requiring audio to understand the page.
- Existing bilingual routes, booking, client access, tracking, and administration remain usable through the transition.

Visual quality is the first milestone. General editorial cleanup is not a prerequisite for exploring design. Accurate, authorised media and functioning enquiries become release requirements when the new experience goes public.

## MVP: the smallest complete expression of the new studio

The MVP is a distinctive identity and a working path from first impression to project enquiry. It is not a reduced-quality version of the eventual design.

**Included:**

- Original logo system: wordmark, compact mark, monochrome versions, favicon, watermark, and motion concept.
- Responsive homepage: stable core message and actions, memorable opening, selected work, concise capabilities, human studio introduction, and enquiry invitation.
- Work index and one reusable project-detail template, populated with three representative approved projects when available.
- Services overview, studio/about page, and project enquiry/contact journey using the existing booking backend where appropriate.
- English and Kinyarwanda support throughout the redesigned journey.
- Shared navigation, footer, buttons, forms, loading, empty, and error states.
- Playable film with poster fallback and accessible controls; any signature interaction has a useful static alternative.
- Existing blog, account, and tracking pages remain reachable and receive enough shared styling to avoid an abrupt brand break.
- Only CMS changes needed to maintain these experiences: for example film source, poster, project summary, credits, ordering, and image focal points if the chosen design requires them.

**Later:** full admin visual overhaul, advanced media-library workflows, additional case-study layouts, richer editorial pages, a larger experimental archive, and additional interactive scenes. Mandatory loaders, forced audio, scroll hijacking, and decorative 3D are not requirements.

## Phases and completion gates

### Phase 0 — Research and planning · COMPLETE

Delivered: live public/admin review, international reference analysis, and this roadmap. Research is qualitative, not a traffic ranking or a full accessibility/performance audit. Previous test results and old progress notes are not current release evidence.

### Phase 1 — Identity and visual direction · COMPLETE

1. Established the primary audience: organisations, brands and events, confirmed by the user.
2. Develop three genuinely different directions rather than three colour variations. Each must connect to the studio's name, people, history, or production practice.
3. Show each direction through a logo, typography, palette, image treatment, desktop hero, mobile hero, and one distinctive behaviour.
4. Recommend a direction and explain its fit, tradeoffs, and media requirements.
5. Refine the selected direction into a small brand system and reusable design tokens.

**Deliverables:** three concept boards; selected brand brief; SVG logo family; favicon and watermark studies; typography/colour/spacing/motion rules. Document font and media usage rights before release.

**Done when:** the user has reviewed tangible concepts and selected a direction; the logo remains legible in monochrome and at small sizes; the direction works on both desktop and mobile. Concept creation proceeds autonomously; selection is a creative decision, not a permission request to start work.

### Phase 2 — Homepage prototype · DELIVERED FOR REVIEW

1. Build a complete homepage preview using the chosen identity, including navigation and footer.
2. Compose the full sequence: opening → selected productions → capabilities → people/process → enquiry. Adjust that sequence if the selected concept justifies it.
3. Prototype **one** signature experience. Candidate: let visitors move between a captured moment, a production decision, and the finished scene. Sound is optional and starts only on request.
4. Design mobile crops, text wrapping, controls, and section pacing independently.
5. Show realistic loading, reduced-motion, missing-media, and video-failure states.

**Deliverables:** browsable preview; desktop/mobile captures; interaction demonstration; a list of assets required for production.

**Done when:** the user can assess the entire page, the experience has an identifiable CSS character, and essential information/actions survive without animation or video. Review typography, composition, originality, pacing, and mobile usability against the selected concept. A pretty hero alone does not complete this phase.

### Phase 3 — Working public-site MVP

1. Implement the shared visual system in the existing Next.js frontend; read applicable repository and installed-framework guidance before changing code.
2. Build the work index, project detail, services, about, and enquiry pages; connect them to existing data and routes.
3. Add only the project/media fields the design actually requires, with backward-compatible migrations and admin editing support.
4. Keep the enquiry state explicit: request received, scope/quote agreed, then booking confirmed. Preserve service preselection and tracking behaviour.
5. Integrate English/Kinyarwanda text and navigation, metadata, canonical URLs, and existing discoverable pages.
6. Apply the identity to the retained blog/client surfaces without replacing working business logic unnecessarily.

**Deliverables:** integrated preview release; maintainable project/media editing; updated route and migration notes; functioning end-to-end enquiry journey.

**Done when:** a visitor can discover a project, watch or inspect it, choose a relevant service, and send an enquiry in a controlled test environment; the studio can maintain the new content through admin. No fake live enquiries or production notification tests without agreed recipients.

### Phase 4 — Verification and launch · MVP RELEASE GATE

1. Run frontend lint/build; backend build/tests if affected; and the relevant existing end-to-end suites. Add targeted tests for genuinely new journey behaviour.
2. Review representative pages at 360, 390, 768, and 1440 CSS pixels; check one short landscape viewport, keyboard-only operation, and reduced motion. Check available real mobile hardware before release, recording any coverage gaps.
3. Confirm readable contrast, visible focus, labelled controls, modal focus/escape behaviour, captions where needed, and no hover-only essential actions.
4. Measure key pages under documented mobile throttling. Initial targets: LCP ≤2.5 s and CLS ≤0.1 in repeatable lab checks; assess interaction responsiveness in lab and monitor field INP ≤200 ms after launch when enough data exists. These are targets, not current measurements.
5. Load poster images before optional video, reserve media dimensions, and avoid preloading every project film. Test the page with video unavailable.
6. Verify enquiry receipt, error/retry behaviour, tracking, and configured notification channels using agreed test recipients. Investigate the earlier failed-send indicator rather than assuming delivery works.
7. Confirm publishable assets, route redirects where needed, backups, reversible migrations, and a rollback procedure. Prepare the concrete release for review before requesting publication approval.

**Deliverables:** visual review captures; test and performance results with limitations; launch checklist; rollback instructions; deployed release after approval.

**Done when:** the release gates have evidence, material failures are resolved, publication is approved, and live smoke checks confirm the intended experience. Do not mark a preview or a successful build as a completed launch.

### Phase 5 — Admin and client-experience refinement

Improve the admin around real studio tasks: project previews, clearer field labels, media/poster selection, crop controls, draft/publish visibility, and understandable notification failures. Refine client tracking and delivery presentation using the established identity. Prioritise observed workflow friction over dashboard decoration.

**Done when:** the owner can create, preview, publish, and update a representative project without developer help, and can understand a booking's actual status and delivery issues.

### Phase 6 — Distinctive extensions and measured iteration

Consider further sound/image scenes, richer production breakdowns, editorial stories, or a studio experiments area only after the MVP is coherent. Review actual viewing, enquiry, and usability evidence where available; do not invent conversion improvements. Expand what helps visitors appreciate the studio or start a project.

**Done when:** each chosen extension has a defined visitor benefit, a working accessible fallback, and a recorded outcome. This is an optional backlog, not a condition for MVP completion.

## Work order and responsibilities

**Critical path:** identity → homepage prototype → integrated public pages/CMS support → verification → approved launch → deeper admin work → optional extensions.

- **Implementation work:** prepare concepts, recommend design choices, build previews, implement, verify, and update this file.
- **User/client decisions:** choose the visual direction and confirm positioning; provide or identify usable original productions; review the concrete launch candidate.
- **Can overlap:** asset selection and audience clarification can proceed while concepts are developed. Existing-data/API review can proceed while the visual prototype is reviewed.
- **Do not start with:** bulk content correction, a full backend rewrite, or a new admin dashboard. None proves the visual quality the client is asking for.
- **Scheduling:** size implementation after the visual prototype reveals its interaction and media requirements. Do not promise calendar dates from the research alone.

## Progress and next-phase updates

This README is the persistent status board. It does not send background notifications. At the end of each redesign work session:

1. Update the date and the top status table.
2. Record what actually changed and link to the relevant files, preview, or verification evidence.
3. Mark a phase complete only when its gate is met; distinguish implemented, verified, reviewed, and deployed.
4. Name the next concrete action and any decision or asset needed from the user.
5. Include a short chat update: **Completed / Current phase / Next / Needed from you**.

| Phase | Status | Completion evidence |
| --- | --- | --- |
| 0 — Research and planning | Complete | Public/admin review and five-studio analysis in this chat; this roadmap |
| 1 — Identity | Complete | [Final board](docs/design/phase-1/index.html), [brand guide](docs/design/phase-1/signal-brand/BRAND.md), [verification](docs/design/phase-1/signal-brand/VERIFY.md), outlined SVG/PNG family, icons and watermarks |
| 2 — Homepage prototype | Implemented and locally verified; visual acceptance pending | [Homepage](docs/design/phase-2/index.html), [responsive/fallback review](docs/design/phase-2/review.html), [verification and asset requirements](docs/design/phase-2/README.md) |
| 3 — Public-site MVP | Not started | — |
| 4 — Verification and launch | Not started | — |
| 5 — Admin/client refinement | Not started | — |
| 6 — Optional extensions | Backlog | — |

### Session log

**13 October 2026 — Phase 2 prototype delivered.** Built the full homepage sequence, three archive previews, a three-stage framing interaction, service disclosures, founder/process sections, studio-film poster/fallback states and a local brief preview/download. Checked responsive widths, keyboard dialog dismissal/focus, menu, brief validation and reduced-motion override. Corrected dialog focus and a simulated loading-state issue. See [scope and verification](docs/design/phase-2/README.md). Film playback, bilingual integration, real enquiries and deployment remain later work. Next: visual feedback, then Phase 3 application integration.

**12 October 2026 — Phase 1 finalised.** Applied the user’s selected Strong warmth + Subtle typography combination. Delivered outlined full-name logo variants, transparent PNGs, favicon SVG/PNG/ICO, light/dark watermarks, bundled licensed fonts and reusable colour/type tokens. Final preview passed desktop/mobile overflow and image-load checks; reveal, mobile menu and archive-note states verified. Prior studies are archived. Next: Phase 2 complete homepage prototype. No production deployment.

**12 October 2026 — Signal Notes warmth studies.** Recorded audience and foundation selection; created Subtle and Strong comparisons with Jabo’s actual photograph, full wordmarks, frame reveal and archive notes. Prepared font licences, scoped tokens and draft logo/favicon/watermark exports. See [review brief](docs/design/phase-1/SIGNAL-NOTES.md). Next: warmth selection, then final identity refinement. Phase 1 is not complete.

**12 October 2026 — Phase 1 concept round delivered.** Created Signal, Fieldnotes, and Livewire as local responsive identity studies using original vector marks and project-local archive photographs. Added desktop/mobile comparison, monochrome and small-size mark studies, palette and interaction examples, and a recommendation. Browser checks recorded in the brief. Next: user direction selection and audience confirmation, then selected-brand refinement. Phase 1 remains in progress; no public deployment.

**12 October 2026 — Roadmap created.** Defined visual prototype and launchable MVP separately, ordered phases, set evidence-based completion gates, and established the next-phase update convention. No application code, production content, or deployment changed. Next: three original identity/hero directions.

## Research principles and reference links

These are references for reasoning, not layouts or assets to reproduce:

- [Ordinary Folk](https://www.ordinaryfolk.co/) — human personality and an understandable creative process.
- [Builders Club](https://builders-club.com/) — restrained interface and prominent, curated work.
- [Tendril](https://tendril.studio/) — visual craft and detailed production thinking.
- [Giant Films](https://www.giantfilms.tv/) — confident film presentation and locally rooted identity.
- [DIVISION](https://www.division.global/) — creative authorship and talent-led work discovery.
- [Visualists](https://www.visualistrw.com/) — the client's quality reference, not a template to copy.

CSS's opportunity: combine creative impact, a recognisable human presence, and an easy route from admiration to enquiry. The exact expression must emerge through original design work.

## Relationship to existing documentation

- [Main README](README.md): technical overview and setup.
- [Operations manual](docs/OPERATIONS.md): operational procedures; revalidate against the current deployment before executing them.
- [Earlier redesign blueprint](docs/design/redesign-blueprint.md): historical design direction. Its instructions to preserve the existing palette, fonts, carousel, and footer language-switch location are not requirements of this fresh redesign.
- [Earlier project progress](docs/progress.md): historical engineering record. Its deployment statements and passing-test counts are dated, not current evidence.

This roadmap governs the new creative redesign scope. Preserve useful historical documents; resolve contradictions explicitly rather than silently repeating old design decisions.
