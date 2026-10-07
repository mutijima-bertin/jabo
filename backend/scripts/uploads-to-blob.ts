#!/usr/bin/env tsx
/**
 * uploads-to-blob.ts — one-off migration of locally stored images into Vercel
 * Blob, for the Vercel-free-tier deployment (the function filesystem is
 * ephemeral there, so images that exist only under backend/uploads/images/
 * must live in Blob instead).
 *
 * What it does:
 *   - Reads every file in backend/uploads/images/ (from src/services/storage,
 *     the SAME directory saveDataUrl writes to in disk mode — so uploaded
 *     filenames match byte-for-byte).
 *   - Uploads each to Blob pathname `images/<same filename>` (identical shape
 *     to what blob-mode saveDataUrl produces), public access, no random
 *     suffix — the DB already references these exact /uploads/images/<file>
 *     URLs and app.ts resolves them via the Blob 302 route.
 *   - Skips files that already exist in Blob (head() lookup), so re-running
 *     is idempotent.
 *   - NEVER deletes or renames local files — the disk copy stays as the
 *     Docker/local source of truth.
 *
 * Requirements:
 *   BLOB_READ_WRITE_TOKEN must be set (the script fails fast without it — a
 *   "successful" run that actually wrote nowhere would be worse than an error).
 *
 * Exit code: 0 only when every file is uploaded or skipped; 1 when the token
 * is missing or any upload fails (all files are still attempted).
 *
 * Run: npx tsx scripts/uploads-to-blob.ts
 */
import fs from "node:fs";
import path from "node:path";
import { put, head, BlobNotFoundError } from "@vercel/blob";
import { UPLOADS_DIR } from "../src/services/storage";

const IMAGES_DIR = path.join(UPLOADS_DIR, "images");

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
};

function contentTypeFor(fileName: string): string {
  return CONTENT_TYPE_BY_EXT[path.extname(fileName).toLowerCase()] ?? "application/octet-stream";
}

async function main(): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[uploads-to-blob] BLOB_READ_WRITE_TOKEN is not set — refusing to run. Set it from the Vercel project's Blob store, then re-run.");
    process.exit(1);
  }

  let entries: string[];
  try {
    entries = fs.readdirSync(IMAGES_DIR);
  } catch (err) {
    console.error(`[uploads-to-blob] cannot read ${IMAGES_DIR}: ${(err as Error).message}`);
    process.exit(1);
  }

  if (entries.length === 0) {
    console.log("[uploads-to-blob] no files under uploads/images/ — nothing to do.");
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const fileName of entries.sort()) {
    const pathname = `images/${fileName}`;
    const filePath = path.join(IMAGES_DIR, fileName);

    try {
      await head(pathname);
      // Already in Blob — keep the local copy and move on.
      console.log(`[uploads-to-blob] exists, skipping: ${pathname}`);
      skipped += 1;
    } catch (err) {
      if (err instanceof BlobNotFoundError || (err as { statusCode?: number }).statusCode === 404) {
        try {
          const bytes = fs.readFileSync(filePath);
          const blob = await put(pathname, bytes, {
            access: "public",
            addRandomSuffix: false,
            contentType: contentTypeFor(fileName),
          });
          console.log(`[uploads-to-blob] uploaded ${pathname} (${bytes.length} B) -> ${blob.url}`);
          uploaded += 1;
        } catch (uploadErr) {
          failed += 1;
          failures.push(fileName);
          console.error(`[uploads-to-blob] FAILED to upload ${fileName}: ${(uploadErr as Error).message}`);
        }
      } else {
        failed += 1;
        failures.push(fileName);
        console.error(`[uploads-to-blob] head() error for ${fileName}: ${(err as Error).message}`);
      }
    }
  }

  console.log(
    `[uploads-to-blob] done: uploaded=${uploaded} skipped=${skipped} failed=${failed}${failed > 0 ? ` failures=[${failures.join(", ")}]` : ""}`
  );
  // Local files are NEVER deleted regardless of outcome — disk stays intact for Docker/local.
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[uploads-to-blob] fatal:", (err as Error).message);
  process.exit(1);
});