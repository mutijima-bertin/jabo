> Historical first-round brief. Signal Notes and the organisations/brands/events audience are now selected. See [current review](SIGNAL-NOTES.md) for the two warmth studies and outstanding refinement.

# Phase 1 — Original identity studies

12 October 2026 · Concept round 1 · Awaiting direction selection

Open `index.html` in a browser, or serve this folder on localhost. Each direction includes a responsive opening, draft vector mark, palette, interaction study, and short continuation into work/studio/enquiry. These are identity studies, not the approved Phase 2 homepage.

## Provisional positioning

A Kigali production studio connecting photography, filmmaking, and live production for organisations, brands, and events. This audience assumption is not yet confirmed. Weddings can remain part of the portfolio without defining the entire brand. The emphasis should change if weddings or music are the main commercial priority.

## The three directions

| | Signal | Fieldnotes | Livewire |
| --- | --- | --- | --- |
| Central idea | Sound gives the image its rhythm | The filmmaker as attentive witness | A studio as a place where ideas meet |
| Mark | Open C plus an upright signal | Open frame holding a moment | Short/long/short geometric rhythm |
| Personality | Composed, cinematic, direct | Human, thoughtful, editorial | Energetic, collaborative, expressive |
| Colour | Ink, bone, vermilion | Paper, forest, citron | Cobalt, chalk, acid yellow |
| Type study | Large neutral sans; compact mono annotations | Editorial serif; clear sans controls | Heavy sans; compact technical captions |
| Image treatment | Divided frame opens to the full photograph | Large observational image plus personal note | Overlapping editorial cuts |
| Interaction | Reveal the complete frame on request | Turn the note to another thought | Change the collage perspective |
| Strongest fit | Broad multimedia production | Documentary and institutional storytelling | Commercial, music and event production |
| Risk | Can feel like a generic film studio if execution relies only on dark colour | Can feel like a photography publication without moving-image work | Can overpower quieter work or formal institutional commissions |

**Recommendation: develop Signal first**, if the aim remains a broad multimedia identity. Its underlying sound/image relationship can extend into titles, edits and a short sonic identity. Keep the full company name visible: the compact mark is not intended to be read as the initials CSS.

Fieldnotes is the strongest alternative when documentary storytelling is the commercial centre. Livewire deliberately tests a more outgoing personality. Do not merge all three palettes and layouts; choose a coherent foundation and carry over only specific useful details.

## Draft system rules

- Keep one dominant visual or headline per opening composition.
- Use 22px mobile gutters, approximately 4.5–5% desktop gutters, and a 4px spacing base.
- Body copy is 14–15px in these studies; final production typography requires testing in both languages.
- All marks are authored vector paths. Retain monochrome and reversed versions; optical refinement and 16/32px favicon exports follow selection.
- The wordmark currently uses system fonts to make the studies independent of external font delivery. Arial/Helvetica and Georgia are fallback studies, not bundled licensed font files. Choose and verify a redistributable production font before delivery; do not extract proprietary fonts.
- Motion must be user-controlled and have a reduced-motion alternative. Signal demonstrates a reveal; Fieldnotes and Livewire demonstrate state changes. These are not finished film or sound treatments.
- No automatic audio, fake showreel, invented production credits, client claims, or external stock imagery.

## Media

Preview photographs come from the existing `pictures/best for landing page or blog` folder. See `asset-sources.txt` for the exact mapping. Public usage rights and exact project descriptions remain to be confirmed; the study labels are intentionally thematic rather than invented client assignments.

The next round needs a shortlist of real film footage, suitable landscape and mobile poster crops, a founder/crew photograph, and optionally a short sound recorded by the studio. No missing footage blocks comparing the identity studies.

## Review decision

Choose the direction whose personality fits the company, then identify one thing to preserve and one thing to improve. Also confirm the main audience: organisations/brands/events, documentary work, or another commercial priority.

After selection: refine the symbol and custom wordmark spacing; export the selected logo family, favicon and watermark; finalise design tokens and typography; then build the full Phase 2 homepage. Phase 1 is not complete until that refinement and selection are recorded.

## Verification and limits

- All three concepts load in the local browser and the comparison controls switch the title, palette, marks, and both embedded previews.
- Mobile content widths checked without horizontal overflow: Signal at 295px; Fieldnotes and Livewire at 375px.
- Inspected Fieldnotes mobile menu and Livewire collage interaction; Signal frame reveal verified with its pressed state and changed control label.
- Basic reduced-motion rules and keyboard focus styles are present. This is not a full accessibility, cross-browser, or performance audit.
- The enquiry action is explicitly a preview dialog. There is no backend connection or production-site change.
- Final typography, bilingual copy, finished motion/audio, and full project-detail layouts are not part of this first concept round.

## Local preview

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/design/phase-1
```

Then open http://127.0.0.1:8765/. The board also works by opening `index.html` directly with a normal browser.
