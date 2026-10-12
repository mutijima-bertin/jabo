# Creative Sound Studio — Signal Notes identity

Selected and finalised: 12 October 2026. Scope: Phase 1 identity package, not a production website release.

## Approved direction

Audience: organisations, brands and events. Warm bone surfaces from the Strong study, neutral sans-serif headlines from Subtle. Keep the open-C + upright-signal mark and the full **Creative Sound Studio** name. Use the real founder photograph and a restrained editorial note to provide human presence.

Signal Notes is the design direction's internal name. The business remains Creative Sound Studio. The symbol is not a typographic spelling of CSS.

## Logo family

- `logo-primary.svg/png`: ink wordmark with vermilion symbol; use on bone.
- `logo-reversed.svg/png`: bone wordmark with vermilion symbol; use on ink.
- `logo-mono-ink.svg/png`: single-colour dark lockup for print and light imagery.
- `logo-mono-bone.svg/png`: single-colour light lockup for dark imagery.
- `watermark.svg/png` and `watermark-ink.svg/png`: transparent full-name lockups. Start at 70% opacity and adjust for the photograph rather than applying a fixed treatment blindly.
- `favicon.svg`, `favicon-16.png`, `favicon-32.png`, `favicon-180.png`, `favicon.ico`: symbol on ink, for browser/device identification only.

The final SVG wordmarks contain vector outlines rather than live text. PNGs provide compatibility where SVG is unsupported. Do not distort the mark, alter its proportions, outline it, add a gold badge, or substitute the letters CSS. Preserve the full name in site navigation, footer, credits, proposals, social covers, and watermarks. The favicon is the small-format exception, where a full name cannot remain legible.

Clear space: at least half the symbol's visible height around the complete lockup. Minimum full-lockup width: 190 CSS pixels on screen; confirm printed readability at the intended print size. At smaller sizes, use a larger placement rather than dropping the name. The final board includes a 190px wordmark and actual 16px and 32px favicon exports.

## Colour system

| Token | Hex | Role |
| --- | --- | --- |
| Ink | #151817 | Text, dark work sections, favicon ground |
| Bone | #efece4 | Main page surface; light text on ink |
| Vermilion | #e67c52 | Symbol, underlines, notes, action surfaces |
| Quiet | #575b54 | Secondary text on bone |
| Line | #c8c7bd | Nonessential dividers on bone |

Use ink text on vermilion buttons. Do not use vermilion for small text on bone or bone text on vermilion. Bone should dominate the opening and people sections; ink provides contrast around the selected work. Keep imagery in natural colour. Do not import Fieldnotes' forest/citron colours.

## Typography

**Primary: Montserrat.** Regular 400 for body, medium 500 for headlines and navigation, semibold 600 for the wordmark and occasional emphasis. Files and SIL OFL licence are bundled in `fonts/`.

**Editorial accent: Liberation Serif Italic.** Reserved for the personal archive note; not main headlines or interface controls. Regular and italic files with licence are bundled. This keeps humanity without turning the studio into a journal.

Body: 15px desktop / 14px mobile with 1.6 line-height. Opening headline: responsive 51–112px, 500 weight, tight tracking; inspect every actual line break in both languages during Phase 2. Section headings: 38–62px. Micro captions: 10–11px only for secondary labels; essential actions stay larger. Do not use serif headlines from the Strong experiment in the selected design.

## Composition and behaviour

Main sequence for the selected identity preview: message + founder frame → people/process → selected archive work → enquiry invitation. Homepage storytelling and final project selection belong to Phase 2.

Gutters: minimum 22px, scaling to 5vw with 80px ceiling. Spacing base: 4px. Use generous separation and avoid rounding every image into a card. Keep one dominant headline per composition.

Signature: the divided frame opens into one photograph on request. Use the same geometry in future film titles, without inventing sound or making audio compulsory. Reveal timing: 450ms with `cubic-bezier(.2,.65,.3,1)`; reduced motion removes transitions while preserving state changes. Notes turn once per click rather than animating continuously. No autoplay audio or mandatory intro.

## Source and rights record

Montserrat is redistributed under the included SIL OFL. Liberation Serif has its included licence. The logo geometry was authored for these studies; vector wordmark shapes derive from the bundled Montserrat font. This is not a trademark clearance report.

Founder and archive photographs are supplied in the repository; see `../asset-sources.txt`. Public usage permissions and final captions remain owner-confirmation items before launch. Final website footage, audio, bilingual editorial copy, and image selection remain Phase 2/launch work, not missing identity assets.

## Reuse

`tokens.css` contains the scoped palette, typography, spacing, and motion tokens. Fonts are loaded locally. Production integration will adapt scope and paths to the existing frontend; these files have not modified the live app.

`build-logos.py` rebuilds outlined SVGs using FontTools. `render-assets.cjs` renders PNG derivatives using the repository’s existing Sharp dependency. The ICO is generated from the 180px PNG using Pillow. See `VERIFY.md` for actual checks and limits.
