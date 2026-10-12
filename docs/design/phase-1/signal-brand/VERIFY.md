# Phase 1 verification — 12 October 2026

- Final selected desktop preview inspected in the browser at 1265px content width: no horizontal overflow; all images loaded. Screenshot: `../signal-final-preview.png`.
- Mobile preview inside a 390px frame (373px available content): no horizontal overflow; all images loaded. Menu expanded successfully; archive note changed on click. Desktop frame reveal changed state successfully.
- All SVG exports parse correctly and contain no live text nodes. Wordmark glyphs are outlines.
- Six transparent logo/watermark PNGs decode at 1140 × 246. Favicons decode at 16, 32 and 180px. ICO includes 16, 32 and 48px sizes.
- JavaScript syntax checks pass for signal-refined.js and signal-notes.js.
- Calculated WCAG contrast: ink/bone 15.14:1; quiet/bone 5.87:1; ink/vermilion 6.27:1. Vermilion/bone is only 2.41:1: decorative use only, not small text or the sole essential control boundary.
- Font licences are bundled. Logo family, tokens and source files are packaged together.

## Scope and limits

These checks validate identity assets and selected concept behaviour. This is not a full accessibility, cross-browser, real-device or production performance audit. No live enquiry, backend or deployment was changed. Final media permissions, bilingual page composition, complete homepage, application integration and release tests remain in later phases.

## Rebuilding

From repository root, with FontTools available: `python3 docs/design/phase-1/signal-brand/build-logos.py`.

With the repository backend Sharp dependency installed: `node docs/design/phase-1/signal-brand/render-assets.cjs`.

The ICO can be rebuilt with Pillow from favicon-180.png using `image.save(path, format="ICO", sizes=[(16,16),(32,32),(48,48)])`.
