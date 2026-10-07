import crypto from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { put } from "@vercel/blob";

export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

/**
 * True when uploads must be persisted to Vercel Blob. Two auth shapes exist:
 * the static BLOB_READ_WRITE_TOKEN (injected when the store is created) and,
 * on connected Vercel projects, OIDC auth (BLOB_STORE_ID + a platform-issued
 * VERCEL_OIDC_TOKEN the SDK reads itself — no static token involved).
 * Docker/local set neither, so they keep writing to UPLOADS_DIR exactly as
 * before — the disk path below is the fallback, not the exception.
 */
export function blobStorageEnabled(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  return Boolean(process.env.VERCEL && process.env.BLOB_STORE_ID);
}

// Images only. Video is deliberately NOT stored here: studio video lives on
// YouTube and is embedded by URL, so keeping an upload path for mp4/webm would
// only add an unused, expensive-to-serve code path (and a large-body attack
// surface). isAllowedMime() rejects video, so any attempt to store it fails
// closed with UNSUPPORTED_FILE_TYPE.
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Raster images normalized to WebP on write; GIF is excluded so animation stays intact.
const WEBP_CONVERSION_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const WEBP_QUALITY = 82;
const MAX_IMAGE_DIMENSION = 1920;

/** Hard ceiling on the DECODED image bytes, checked before any processing. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function isAllowedMime(mime: string): boolean {
  return IMAGE_TYPES.has(mime);
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extFor(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}

/** Verifies file content (magic bytes) matches the client-declared MIME. */
export function magicBytesMatch(mime: string, buf: Buffer): boolean {
  const b = buf;
  switch (mime) {
    case "image/jpeg":
      return b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png":
      return b.length > 7 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case "image/gif":
      return b.length > 5 && (b.toString("ascii", 0, 6) === "GIF87a" || b.toString("ascii", 0, 6) === "GIF89a");
    case "image/webp":
      return b.length > 11 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
    default:
      return false;
  }
}

/**
 * Normalizes a raster image to WebP (q82), auto-rotating per EXIF first
 * (conversion drops EXIF, so orientation must be baked in) and fitting
 * inside 1920×1920 without upscaling. Throws IMAGE_PROCESSING_FAILED when
 * valid-looking content cannot be decoded, so callers fail closed instead
 * of silently writing the original bytes.
 */
async function convertToWebp(buffer: Buffer): Promise<Buffer> {
  try {
    // Bound decode size explicitly (sharp's default ~268MP can OOM the
    // container on large panoramas/adversarial files); overflow throws and
    // maps to the fail-closed IMAGE_PROCESSING_FAILED path.
    return await sharp(buffer, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    throw new Error("IMAGE_PROCESSING_FAILED");
  }
}

/**
 * Persists a base64 data URL after verifying declared MIME against actual
 * content. JPEG/PNG/WebP images are re-encoded to WebP (quality 82, fitted
 * inside 1920×1920, never upscaled); GIFs are written byte-for-byte so
 * animation stays intact.
 *
 * Storage backend is chosen by environment, NOT by this function's callers:
 * - Vercel (Blob store connected): the bytes go to Vercel Blob under
 *   `images/<timestamp>-<rand>.webp` — the same unique names as disk — because
 *   the function filesystem is read-only/ephemeral there.
 * - Docker/local (no token): written to UPLOADS_DIR/images as always.
 * Either way the returned public URL is `/uploads/images/<fileName>`, which is
 * the contract the DB regex (`^\/uploads\//`) and the frontend depend on; app.ts
 * serves that path from Blob (302 to the CDN) or from disk respectively.
 */
export async function saveDataUrl(dataUrl: string, mime: string): Promise<string> {
  // Fail loudly BEFORE doing any work when the deployment is misconfigured:
  // writing to disk on Vercel would "succeed" and then vanish with the
  // instance, losing the upload silently.
  if (!blobStorageEnabled() && process.env.VERCEL) {
    console.error("[storage] no Blob store is connected while VERCEL=1 — refusing to write uploads to the ephemeral filesystem");
    throw new Error("BLOB_STORAGE_NOT_CONFIGURED");
  }

  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) throw new Error("INVALID_DATA_URL");
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("FILE_TOO_LARGE");
  if (!magicBytesMatch(mime, buffer)) throw new Error("CONTENT_MISMATCH");

  // Size cap + magic bytes above run against the ORIGINAL bytes; conversion
  // happens only after every validation has passed.
  const toWebp = WEBP_CONVERSION_TYPES.has(mime);
  const fileBuffer = toWebp ? await convertToWebp(buffer) : buffer;
  const ext = toWebp ? "webp" : extFor(mime);
  const fileName = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}.${ext}`;

  if (blobStorageEnabled()) {
    // The name already embeds a timestamp + 12 random bytes, so no random
    // suffix is needed (and addRandomSuffix would break the on-disk naming
    // parity with files migrated by scripts/uploads-to-blob.ts).
    await put(`images/${fileName}`, fileBuffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: toWebp ? "image/webp" : mime,
    });
    return `/uploads/images/${fileName}`;
  }

  const dir = path.join(UPLOADS_DIR, "images");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), fileBuffer);
  return `/uploads/images/${fileName}`;
}
