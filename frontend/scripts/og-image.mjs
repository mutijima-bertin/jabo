/** Rebuild the 1200×630 Signal share card from the approved outlined logo. */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const publicDir = new URL('../public/', import.meta.url);
const logo = await readFile(new URL('brand/logo-primary.svg', publicDir));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#efece4"/>
<path d="M64 94H1136" stroke="#c8c7bd"/>
<text x="64" y="66" fill="#575b54" font-family="sans-serif" font-size="18" letter-spacing="3">KIGALI, RWANDA</text>
<image x="64" y="180" width="1072" height="232" href="data:image/svg+xml;base64,${logo.toString('base64')}"/>
<path d="M64 488H220" stroke="#e67c52" stroke-width="8"/>
<text x="64" y="559" fill="#151817" font-family="sans-serif" font-size="27" letter-spacing="1">Photography. Film. Live production.</text>
<text x="1136" y="559" text-anchor="end" fill="#575b54" font-family="sans-serif" font-size="18">creativesoundstudio.rw</text>
</svg>`;
await writeFile(new URL('brand/social-preview.svg', publicDir), svg);
await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL('og-default.png', publicDir)));
console.log('Generated Signal share card: public/og-default.png');
