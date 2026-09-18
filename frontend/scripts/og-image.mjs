/**
 * Generic OG image generator — Creative Sound Studio brand poster (1200×630).
 *
 * Renders a typographic poster that mirrors the site identity (Logo.tsx): a
 * brass-gradient "CSS" monogram badge (exact SVG paths/gradient stops), the
 * Fraunces wordmark, a brass divider and the hero_badge tagline, on the
 * admin dark canvas tokens. NO new dependencies — Playwright Chromium is
 * already a devDependency.
 *
 * Usage (idempotent): node scripts/og-image.mjs  →  public/og-default.png
 */

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/og-default.png");

// Brand tokens — mirrored from Logo.tsx (badge gradients / cream) and
// globals.css (admin dark canvas #161310 → #0e0c0a, brass-light #c9a86f).
const CREAM = "#FAF6EF";
const BRASS_LIGHT = "#C9A86F";
const TAGLINE = "Photography · Videography · Livestreaming — Kigali, Rwanda"; // i18n en hero_badge

// logo-brass / logo-badge gradient IDs must stay unique in the doc — the
// badge artwork mirrors Logo.tsx exactly. IMPORTANT: this HTML is parsed as
// inline SVG, so SVG attributes must use their canonical hyphenated names
// (`stop-color`, `stroke-width`, `font-family`, `text-anchor`, …). CamelCase
// spelling (`stopColor` etc.) works in React/JSX but is lowercased and then
// dropped by the HTML parser here, which renders the badge pitch-black.
const BADGE_SVG = `
  <svg class="badge" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="32" cy="32" r="25.5" stroke="url(#logo-brass)" stroke-width="1.5" opacity="0.9"/>
    <circle cx="32" cy="32" r="21.5" fill="url(#logo-badge)"/>
    <g fill="#FAF6EF">
      <rect x="19" y="37" width="2.6" height="4" rx="1.3" opacity="0.85"/>
      <rect x="24.2" y="34.5" width="2.6" height="6.5" rx="1.3"/>
      <rect x="29.4" y="31.5" width="2.6" height="9.5" rx="1.3"/>
      <rect x="34.6" y="34.5" width="2.6" height="6.5" rx="1.3" opacity="0.85"/>
      <rect x="39.8" y="37" width="2.6" height="4" rx="1.3" opacity="0.6"/>
    </g>
    <text x="29" y="27.5" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="600" font-size="14" letter-spacing="2.2" fill="#FAF6EF">CSS</text>
    <defs>
      <linearGradient id="logo-badge" x1="14" y1="12" x2="50" y2="52" gradientunits="userSpaceOnUse">
        <stop stop-color="#BC9A63"/>
        <stop offset="1" stop-color="#96743F"/>
      </linearGradient>
      <linearGradient id="logo-brass" x1="6" y1="6" x2="58" y2="58" gradientunits="userSpaceOnUse">
        <stop stop-color="#B08D57"/>
        <stop offset="1" stop-color="#8F6F3E"/>
      </linearGradient>
    </defs>
  </svg>`;

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Geist:wght@300..700&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    overflow: hidden;
    background:
      radial-gradient(115% 85% at 50% -12%, rgba(201, 168, 111, 0.13) 0%, rgba(201, 168, 111, 0) 55%),
      linear-gradient(180deg, #161310 0%, #0e0c0a 100%);
    color: ${CREAM};
    font-family: "Geist", system-ui, sans-serif;
  }
  .stage {
    position: relative;
    width: 1200px; height: 630px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  /* Faint soundwave flourish behind the monogram (site soundwave motif) */
  .soundwave {
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -58%);
    display: flex; align-items: center; gap: 18px;
    opacity: 0.06;
  }
  .soundwave span {
    width: 13px; border-radius: 999px;
    background: linear-gradient(180deg, ${BRASS_LIGHT} 0%, #8F6F3E 100%);
  }
  .poster {
    position: relative;
    display: flex; flex-direction: column; align-items: center;
  }
  .badge {
    width: 232px; height: 232px;
    filter: drop-shadow(0 20px 44px rgba(0, 0, 0, 0.5));
  }
  .word-1 {
    margin-top: 38px;
    font-family: "Fraunces", Georgia, serif;
    font-weight: 500;
    font-size: 58px;
    letter-spacing: 0.30em;
    text-indent: 0.30em;
    color: ${CREAM};
    white-space: nowrap;
  }
  .word-2 {
    margin-top: 8px;
    font-family: "Fraunces", Georgia, serif;
    font-weight: 600;
    font-size: 66px;
    letter-spacing: 0.50em;
    text-indent: 0.50em;
    color: ${CREAM};
    white-space: nowrap;
  }
  .divider {
    margin-top: 34px;
    width: 190px; height: 2px;
    background: linear-gradient(90deg, rgba(176, 141, 87, 0) 0%, #B08D57 22%, #8F6F3E 78%, rgba(143, 111, 62, 0) 100%);
  }
  .tagline {
    margin-top: 26px;
    font-family: "Geist", system-ui, sans-serif;
    font-weight: 400;
    font-size: 24px;
    letter-spacing: 0.06em;
    color: ${BRASS_LIGHT};
    white-space: nowrap;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="soundwave" aria-hidden="true">
      <span style="height:44px"></span>
      <span style="height:76px"></span>
      <span style="height:120px"></span>
      <span style="height:76px"></span>
      <span style="height:44px"></span>
    </div>
    <div class="poster">
      ${BADGE_SVG}
      <div class="word-1">CREATIVE SOUND</div>
      <div class="word-2">STUDIO</div>
      <div class="divider"></div>
      <div class="tagline">${TAGLINE}</div>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(HTML, { waitUntil: "networkidle" });
  // Google fonts stylesheet applied? Block briefly for webfonts, then verify.
  await page.evaluate(() => document.fonts.ready);
  const fontsOk = await page.evaluate(() => ({
    fraunces: document.fonts.check('500 58px "Fraunces"'),
    geist: document.fonts.check('400 24px "Geist"'),
  }));
  console.log(`font check → Fraunces: ${fontsOk.fraunces}, Geist: ${fontsOk.geist}`);
  if (!fontsOk.fraunces || !fontsOk.geist) {
    console.warn("WARN: a brand font fell back to Georgia/system — inspect the PNG before committing.");
  }

  mkdirSync(dirname(OUT), { recursive: true });
  await page.locator("body").screenshot({ path: OUT, type: "png" });
  console.log(`wrote ${OUT}`);
} finally {
  await browser.close();
}