/**
 * Browser-side image compression for admin uploads.
 *
 * The backend deploys on Vercel Functions, whose request bodies are hard-capped
 * at 4.5 MB, while the upload endpoint receives the photo as a base64 data URL
 * (base64 inflates a 10 MB photo to ~13.3 MB). Decoding happens here in the
 * browser, the image is downscaled to the SAME geometry the server applies
 * anyway (max 1920×1920, aspect preserved — never upscaled) and re-encoded as
 * WebP q0.82, so payloads land around ≤1 MB.
 *
 * Contract: NEVER throws and NEVER blocks an upload. Anything that cannot be
 * decoded, drawn or re-encoded smaller logs a console warning and returns the
 * ORIGINAL data URL untouched — a failed compression must not cost the admin an
 * upload. Module scope holds only constants and function declarations (no
 * browser API access), so importing this file is SSR-safe; every browser API is
 * reached inside the functions, which `adminUpload` calls from the client only.
 */

/** Mirrors the server-side sharp resize cap — downscale to this, never upscale. */
const MAX_DIMENSION = 1920;
/** Mirrors the server-side WebP quality (sharp re-encodes to q82 regardless). */
const WEBP_QUALITY = 0.82;
/** Warn once when the final data URL string creeps toward Vercel's 4.5 MB cap. */
const MAX_DATA_URL_LENGTH = 4_000_000;

/** base64 data URL → Blob for `createImageBitmap`. Throws on anything else. */
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, comma);
  if (comma < 0 || !/;base64$/i.test(meta)) throw new Error("not a base64 data URL");
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const type = meta.replace(/^data:/i, "").replace(/;base64$/i, "");
  return new Blob([bytes], { type });
}

/** `<img>` + onload decode — fallback for what `createImageBitmap` cannot take. */
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed to decode"));
    img.src = src;
  });
}

/**
 * Decode a data URL into something drawable. Prefers `createImageBitmap` (fast,
 * off-main-thread, decodes HEIC/WebP where the browser supports it) and falls
 * back to `<img>` for SVG, non-base64 data URLs, or bitmap-decode failures.
 */
async function decodeImage(dataUrl: string): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(dataUrlToBlob(dataUrl));
    } catch {
      /* fall through to <img> decoding */
    }
  }
  return loadImageElement(dataUrl);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

/** Decode → downscale to ≤1920×1920 → WebP q0.82 → data URL, or the input on any failure. */
async function compressImage(dataUrl: string): Promise<string> {
  if (typeof window === "undefined") return dataUrl;
  // Non-raster data URLs (or non-data-URL strings) pass through: the backend
  // only accepts images anyway, and attempting to decode them just fails.
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1];
  if (!mime?.startsWith("image/")) return dataUrl;

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decodeImage(dataUrl);
  } catch (err) {
    console.warn("[imageCompress] could not decode image; uploading original", err);
    return dataUrl;
  }

  try {
    const width = "naturalWidth" in source ? source.naturalWidth : source.width;
    const height = "naturalWidth" in source ? source.naturalHeight : source.height;
    if (width < 1 || height < 1) {
      console.warn("[imageCompress] image has no intrinsic size; uploading original");
      return dataUrl;
    }
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d canvas context unavailable");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
    if (!blob) throw new Error("canvas.toBlob returned null");
    const reencoded = await blobToDataUrl(blob);
    // Send the original whenever the re-encode did not shrink the payload
    // (keeps tiny already-optimized images untouched — never wastefully larger).
    return reencoded.length < dataUrl.length ? reencoded : dataUrl;
  } catch (err) {
    console.warn("[imageCompress] could not compress image; uploading original", err);
    return dataUrl;
  } finally {
    if ("close" in source) source.close();
  }
}

/**
 * Compress a raster data URL for upload (see contract above). Always resolves
 * with a data URL that is safe to POST; warns if the result still exceeds
 * ~4 MB, since Vercel Functions reject request bodies above 4.5 MB.
 */
export async function compressImageDataUrl(dataUrl: string): Promise<string> {
  const result = await compressImage(dataUrl);
  if (result.length > MAX_DATA_URL_LENGTH) {
    console.warn(
      `[imageCompress] data URL is ${(result.length / 1e6).toFixed(1)} MB after compression; ` +
        "the server caps request bodies at 4.5 MB",
    );
  }
  return result;
}
