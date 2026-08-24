import crypto from "crypto";
import fs from "fs";
import path from "path";

export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

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
 * Persists a base64 data URL to disk after verifying declared MIME against
 * actual content. Returns the public URL path.
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

  const fileName = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}.${extFor(mime)}`;
  fs.writeFileSync(path.join(dir, fileName), buffer);
  return `/uploads/${folder}/${fileName}`;
}
