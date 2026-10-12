> Historical warmth comparison. The user selected Strong bone surfaces with Subtle sans-serif headlines. See [final identity](signal-brand/BRAND.md) and [selected preview](signal-final.html).

# Signal Notes — Phase 1b review

12 October 2026. Foundation and audience confirmed; warmth balance awaiting selection.

## Confirmed direction

Audience: organisations, brands and events. Preserve Signal's open-C + upright-signal mark and exact ink/bone/vermilion palette. Always pair the mark with the full Creative Sound Studio wordmark in public headers, footers and branding. Isolated marks in the comparison board are technical size studies; favicons are the practical small-format exception.

The user requested two warmth studies under the name **Signal Notes**. Transfer only: (1) the archive note, (2) bone/paper warmth and a real founder photograph, (3) an editorial serif accent. No forest/citron palette or separate journal identity.

## Compare

- `hybrid-subtle.html`: ink opening, sans headline, bone note, founder in the opening, warm people section. Serif appears only in editorial accents.
- `hybrid-strong.html`: bone opening, serif headline, more prominent vermilion note, founder central to the opening, dark work section.
- `index.html`: switchable desktop and 390px mobile previews, full wordmarks, palette values, small and reversed mark studies.
- `index-round1.html`: preserved first-round comparisons.

Both demonstrate the frame reveal and a turning archive note. Captions and note text are provisional editorial writing, not quotations attributed to the founder. Enquiry opens a clearly labelled preview dialog and sends nothing.

## Prepared identity assets

`signal-brand/` contains primary, reversed, monochrome ink and monochrome bone SVG/PNG lockups; a transparent watermark SVG; favicon SVG and 16/32/180px PNG exports; scoped CSS tokens; and local font files with licences.

Fonts: Montserrat regular/medium/semibold (SIL OFL, bundled `fonts/OFL.txt`) and Liberation Serif regular/italic (bundled `fonts/Liberation-LICENSE.txt`). No proprietary font extraction. The SVG lockups now contain outlined vector paths (rebuilt by `signal-brand/build-logos.py`), not editable text, so they no longer need Montserrat installed in external vector editors; supplied PNGs preserve appearance. Optical spacing review remains. This file is a historical record of the warmth comparison; the finalised outlined lockups are documented in `signal-brand/BRAND.md`.

Colours: ink `#151817`, bone `#efece4`, vermilion `#e67c52`. Vermilion is for highlights and dark-text buttons, not small body text on bone. Default gutters: 22px minimum, scaling to 5vw/80px; body: 15px desktop, 14px mobile; 450ms optional reveal with reduced-motion override. Final production bilingual typesetting remains Phase 2 work.

Founder source: `pictures/founder/jabo.jpg`, visually inspected as Jabo photographing with a camera. Derived preview: `assets/founder-jabo.webp`. Other mappings remain in `asset-sources.txt`. These are existing project assets, not newly licensed stock; public usage rights still require owner verification before launch.

## Verification

Both embedded mobile views report 390px viewport, 375px content width including reserved scrollbar, and no horizontal overflow. Images loaded in both. Subtle note changed its pressed state; Strong frame reveal changed its state and label. Desktop Strong composition was visually inspected. JavaScript syntax checks passed. This is a concept verification, not a production accessibility or performance audit.

## Next

Choose Subtle, Strong, or a specific balance. Then finish optical logo refinement, outlined exports, watermark/small-size review and the chosen tokens. Only then mark Phase 1 complete and proceed to the full homepage prototype. No CI/CD, repository badge work, or live deployment is included in this design turn.

The local server is a concept preview. The actual public URL previously reviewed is https://creativesoundstudio.rw/en; stale repository notes saying nothing is deployed are not current evidence about that site.
