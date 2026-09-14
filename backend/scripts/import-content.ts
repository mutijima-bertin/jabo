#!/usr/bin/env tsx
/**
 * One-off content import for Creative Sound Studio.
 *
 * Reads client logos, the founder photo, and portfolio shots from a local
 * source directory, pushes each through the SAME storage pipeline the admin
 * upload endpoint uses (saveDataUrl → magic-byte validation → WebP q82 →
 * fit-1920 → random filename under UPLOADS_DIR), then upserts the matching
 * SiteSetting / ClientLogo / PortfolioItem rows.
 *
 * Usage:
 *   tsx scripts/import-content.ts [--dir=/path/to/pictures] [--dry-run]
 *
 * Source root resolution: --dir arg > PICTURES_DIR env > /tmp/pictures
 *
 * Idempotence: re-running never duplicates rows — logos are upserted by name
 * (files are only re-imported when the row has no image yet), the founder
 * setting is skipped once set, and portfolio items are skipped when a titleEn
 * already exists.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/config/db";
import { saveDataUrl } from "../src/services/storage";
import { normalizePortfolioCategory } from "../src/config/constants";

// ---------------------------------------------------------------------------
// Manifests (curated order + display names live here, in the script itself).
// ---------------------------------------------------------------------------

/** Curated wall order, biggest/trusted first. sortOrder = index + 1. */
const LOGO_MANIFEST: ReadonlyArray<{ fileName: string; displayName: string }> = [
  { fileName: "fao.png", displayName: "FAO" },
  { fileName: "the new times.png", displayName: "The New Times" },
  { fileName: "unicef.png", displayName: "UNICEF" },
  { fileName: "who.png", displayName: "WHO" },
  { fileName: "visit Rwanda.png", displayName: "Visit Rwanda" },
  { fileName: "mtn.png", displayName: "MTN" },
  { fileName: "BAL.png", displayName: "BAL" },
  { fileName: "bk arena.png", displayName: "BK Arena" },
  { fileName: "Rwanda events.png", displayName: "Rwanda Events" },
  { fileName: "tour du Rwanda.png", displayName: "Tour du Rwanda" },
  { fileName: "tv10.png", displayName: "TV10" },
  { fileName: "rssb.png", displayName: "RSSB" },
  { fileName: "rra.png", displayName: "RRA" },
  { fileName: "rgb.png", displayName: "RGB" },
  { fileName: "government of Rwanda.png", displayName: "Government of Rwanda" },
  { fileName: "Rwanda caa.png", displayName: "Rwanda CAA" },
  { fileName: "reg.png", displayName: "Reg" },
  { fileName: "Aegis.png", displayName: "Aegis" },
  { fileName: "african leadership group.png", displayName: "African Leadership Group" },
  { fileName: "british council.png", displayName: "British Council" },
  { fileName: "mo ibrahim foundation.png", displayName: "Mo Ibrahim Foundation" },
  { fileName: "mercedes benz.png", displayName: "Mercedes Benz" },
  { fileName: "skol.png", displayName: "Skol" },
  { fileName: "timber land.png", displayName: "Timber Land" },
  { fileName: "kc2.png", displayName: "Kigali Channel 2" },
];

const PORTFOLIO_MANIFEST: ReadonlyArray<{
  fileName: string;
  titleEn: string;
  titleRw: string;
  category: string;
}> = [
  {
    fileName: "africa summit.jpg",
    titleEn: "Africa Summit",
    titleRw: "Inama Nkuru ya Afurika",
    category: "Events",
  },
  {
    fileName: "ceo of aerg.jpg",
    titleEn: "CEO of AERG — Portrait",
    titleRw: "Portret y'Umukuru wa AERG",
    category: "Portraits",
  },
  {
    fileName: "fishing activities.jpg",
    titleEn: "Fishing Activities",
    titleRw: "Ibikorwa byo Kuroba",
    category: "Documentaries",
  },
  {
    fileName: "nice portrait of a lady smiling.jpg",
    titleEn: "Portrait of a Smiling Lady",
    titleRw: "Portret y'Umugore Useka",
    category: "Portraits",
  },
  {
    fileName: "portrait of prime minister of agriculture.jpg",
    titleEn: "Minister of Agriculture — Portrait",
    titleRw: "Portret ya Minisitiri w'Ubuhinzi",
    category: "Portraits",
  },
  {
    fileName: "wedding picture with the bride maids and groom maids.jpg",
    titleEn: "Wedding Party with Bride & Groom",
    titleRw: "Umukwe n'Abageni mu Bukwe",
    category: "Weddings",
  },
];

const FOUNDER_SUBPATH = path.join("founder", "Pasted image.png");
const FOUNDER_SETTING_KEY = "about_founder_image";
const FOUNDER_LOCALE = "en" as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(): { dir: string; dryRun: boolean } {
  let dir = process.env.PICTURES_DIR ?? "/tmp/pictures";
  let dryRun = false;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--dir=")) {
      dir = arg.slice("--dir=".length);
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }
  return { dir: path.resolve(dir), dryRun };
}

/** .png → image/png, .jpg/.jpeg → image/jpeg; anything else fails the plan. */
function mimeForExtension(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  throw new Error(`Unsupported file extension for ${fileName}`);
}

/**
 * Reads the file from disk, base64-encodes it, and hands it to the SAME
 * storage pipeline the admin upload endpoint uses. Returns the /uploads/... URL.
 */
async function importFile(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const mime = mimeForExtension(path.basename(filePath));
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  return saveDataUrl(dataUrl, mime);
}

function validateFileExists(srcPath: string, label: string): boolean {
  if (!fs.existsSync(srcPath)) {
    console.error(`  [MISSING] ${label}: ${srcPath}`);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { dir, dryRun } = parseArgs();
  const logosDir = path.join(dir, "client logos");
  const portfolioDir = path.join(dir, "best for landing page or blog");
  const founderPath = path.join(dir, FOUNDER_SUBPATH);

  console.log(`CONTENT IMPORT ${dryRun ? "PLAN (dry-run)" : "RUN"}`);
  console.log(`Source directory: ${dir}`);
  console.log("");

  // ---- Phase 0: validate the full plan before touching anything ------------
  {
    let allPresent = validateFileExists(founderPath, `Founder photo (${FOUNDER_SUBPATH})`);
    for (const logo of LOGO_MANIFEST) {
      allPresent = validateFileExists(path.join(logosDir, logo.fileName), `Logo: ${logo.displayName}`) && allPresent;
    }
    for (const item of PORTFOLIO_MANIFEST) {
      allPresent =
        validateFileExists(path.join(portfolioDir, item.fileName), `Portfolio: ${item.titleEn}`) && allPresent;
    }
    if (!allPresent) {
      console.error("");
      console.error("Aborting: some source files are missing from the source root.");
      process.exit(1);
    }
  }

  // ---- Phase 1: FOUNDER -----------------------------------------------------
  let founderImported = 0;
  let founderSkipped = 0;
  console.log("FOUNDER");
  if (dryRun) {
    console.log(`  [import] ${FOUNDER_SETTING_KEY} (${FOUNDER_LOCALE}) <- ${FOUNDER_SUBPATH}`);
  } else {
    const existing = await prisma.siteSetting.findUnique({
      where: { key_locale: { key: FOUNDER_SETTING_KEY, locale: FOUNDER_LOCALE } },
    });
    if (existing && existing.value) {
      founderSkipped++;
      console.log(`  [skip] ${FOUNDER_SETTING_KEY} already set to ${existing.value}`);
    } else {
      const url = await importFile(founderPath);
      await prisma.siteSetting.upsert({
        where: { key_locale: { key: FOUNDER_SETTING_KEY, locale: FOUNDER_LOCALE } },
        update: { value: url },
        create: { key: FOUNDER_SETTING_KEY, locale: FOUNDER_LOCALE, value: url },
      });
      founderImported++;
      console.log(`  [imported] ${FOUNDER_SETTING_KEY} = ${url}`);
    }
  }
  console.log("");

  // ---- Phase 2: LOGOS --------------------------------------------------------
  let logosImported = 0;
  let logosSkipped = 0;
  console.log(`LOGOS (${LOGO_MANIFEST.length}, curated order)`);
  for (let i = 0; i < LOGO_MANIFEST.length; i++) {
    const logo = LOGO_MANIFEST[i];
    const sortOrder = i + 1;
    if (dryRun) {
      console.log(`  [${String(sortOrder).padStart(2, "0")}] ${logo.displayName} <- client logos/${logo.fileName}`);
      continue;
    }
    const srcPath = path.join(logosDir, logo.fileName);
    const existing = await prisma.clientLogo.findFirst({ where: { name: logo.displayName } });
    if (existing?.imageUrl) {
      await prisma.clientLogo.update({ where: { id: existing.id }, data: { sortOrder } });
      logosSkipped++;
      console.log(`  [${String(sortOrder).padStart(2, "0")}] ${logo.displayName} — skipped (already has an image)`);
      continue;
    }
    const url = await importFile(srcPath);
    if (existing) {
      await prisma.clientLogo.update({ where: { id: existing.id }, data: { imageUrl: url, sortOrder } });
    } else {
      await prisma.clientLogo.create({ data: { name: logo.displayName, imageUrl: url, sortOrder } });
    }
    logosImported++;
    console.log(`  [${String(sortOrder).padStart(2, "0")}] ${logo.displayName} — imported`);
  }
  console.log("");

  // ---- Phase 3: PORTFOLIO -----------------------------------------------------
  let portfolioImported = 0;
  let portfolioSkipped = 0;
  console.log(`PORTFOLIO (${PORTFOLIO_MANIFEST.length})`);
  for (let i = 0; i < PORTFOLIO_MANIFEST.length; i++) {
    const entry = PORTFOLIO_MANIFEST[i];
    const category = normalizePortfolioCategory(entry.category);
    if (!category) {
      throw new Error(`Invalid portfolio category for "${entry.titleEn}": "${entry.category}"`);
    }
    const sortOrder = 1000 + i;
    if (dryRun) {
      console.log(
        `  [${category}] ${entry.titleEn} (${entry.titleRw}) <- best for landing page or blog/${entry.fileName}`
      );
      continue;
    }
    // Idempotence: skip when a titleEn already exists — the coverUrl is a
    // random filename, so titleEn is the stable dedupe key across re-runs.
    const existing = await prisma.portfolioItem.findFirst({ where: { titleEn: entry.titleEn } });
    if (existing) {
      portfolioSkipped++;
      console.log(`  [${category}] ${entry.titleEn} — skipped (already exists)`);
      continue;
    }
    const coverUrl = await importFile(path.join(portfolioDir, entry.fileName));
    await prisma.portfolioItem.create({
      data: {
        titleEn: entry.titleEn,
        titleRw: entry.titleRw,
        category,
        coverUrl,
        mediaUrls: [coverUrl],
        mediaType: "image",
        published: true,
        sortOrder,
      },
    });
    portfolioImported++;
    console.log(`  [${category}] ${entry.titleEn} — imported`);
  }
  console.log("");

  // ---- Summary --------------------------------------------------------------
  console.log("SUMMARY");
  console.log(
    dryRun
      ? "  Dry run — nothing was written. Plan above covers founder + 25 logos + 6 portfolio items."
      : `  Founder  : imported=${founderImported} skipped=${founderSkipped}`
  );
  if (!dryRun) {
    console.log(`  Logos    : imported=${logosImported} skipped=${logosSkipped} (of ${LOGO_MANIFEST.length})`);
    console.log(`  Portfolio: imported=${portfolioImported} skipped=${portfolioSkipped} (of ${PORTFOLIO_MANIFEST.length})`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("");
    console.log("Done.");
  })
  .catch(async (err) => {
    console.error("");
    console.error("CONTENT IMPORT FAILED:", err instanceof Error ? err.message : String(err));
    await prisma.$disconnect();
    process.exit(1);
  });