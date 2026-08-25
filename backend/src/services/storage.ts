import crypto from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";

export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

// Raster images normalized to WebP on write; GIF is excluded so animation stays intact.
const WEBP_CONVERSION_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const WEBP_QUALITY = 82;
const MAX_IMAGE_DIMENSION = 1920;

export function isAllowedMime(mime: string): boolean {
  return IMAGE_TYPES.has(mime) || VIDEO_TYPES.has(mime);
}

export function isVideoMime(mime: string): boolean {
  return VIDEO_TYPES.has(mime);
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

export function maxBytesFor(mime: string): number {
  return isVideoMime(mime) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
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
    case "video/mp4":
      return b.length > 11 && b.toString("ascii", 4, 8) === "ftyp";
    case "video/webm":
      return b.length > 3 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
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
 * Persists a base64 data URL to disk after verifying declared MIME against
 * actual content. JPEG/PNG/WebP images are re-encoded to WebP (quality 82,
 * fitted inside 1920×1920, never upscaled); GIFs and videos are written
 * byte-for-byte. Returns the public URL path.
 */
export async function saveDataUrl(dataUrl: string, mime: string): Promise<string> {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) throw new Error("INVALID_DATA_URL");
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length > maxBytesFor(mime)) throw new Error("FILE_TOO_LARGE");
  if (!magicBytesMatch(mime, buffer)) throw new Error("CONTENT_MISMATCH");

  const folder = isVideoMime(mime) ? "videos" : "images";
  const dir = path.join(UPLOADS_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });

  // Size cap + magic bytes above run against the ORIGINAL bytes; conversion
  // happens only after every validation has passed.
  const toWebp = WEBP_CONVERSION_TYPES.has(mime);
  const fileBuffer = toWebp ? await convertToWebp(buffer) : buffer;
  const ext = toWebp ? "webp" : extFor(mime);
  const fileName = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(dir, fileName), fileBuffer);
  return `/uploads/${folder}/${fileName}`;
}
