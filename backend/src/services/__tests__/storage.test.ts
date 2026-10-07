import { describe, it, expect } from "vitest";
import { isAllowedMime, magicBytesMatch, extFor, MAX_IMAGE_BYTES } from "../storage";

/**
 * storage.test.ts — upload guard rails.
 *
 * The load-bearing assertion here is that VIDEO IS REJECTED. Studio video
 * lives on YouTube and is embedded by URL; there is deliberately no upload path
 * for it. That decision is only enforced by this allowlist, so it is pinned
 * here rather than left to the absence of a feature.
 */

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_MIMES = ["video/mp4", "video/webm"];

/** Minimal valid PNG magic-byte prefix (89 50 4E 47 0D 0A 1A 0A). */
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Minimal MP4 `ftyp` header — the bytes a real video upload would carry. */
const MP4_HEADER = Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.alloc(8)]);

/** Minimal WebM (EBML) header. */
const WEBM_HEADER = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02]);

describe("isAllowedMime", () => {
  it("accepts every supported image type", () => {
    for (const mime of IMAGE_MIMES) {
      expect(isAllowedMime(mime), `${mime} must be accepted`).toBe(true);
    }
  });

  it("rejects video — video is embedded from YouTube, never uploaded", () => {
    for (const mime of VIDEO_MIMES) {
      expect(isAllowedMime(mime), `${mime} must be rejected`).toBe(false);
    }
  });

  it("rejects anything outside the image allowlist", () => {
    for (const mime of ["application/pdf", "text/html", "image/svg+xml", "", "IMAGE/JPEG"]) {
      expect(isAllowedMime(mime), `${mime} must be rejected`).toBe(false);
    }
  });
});

describe("magicBytesMatch", () => {
  it("accepts a PNG header declared as PNG", () => {
    expect(magicBytesMatch("image/png", PNG_HEADER)).toBe(true);
  });

  it("rejects video headers outright — no video branch exists to match", () => {
    expect(magicBytesMatch("video/mp4", MP4_HEADER)).toBe(false);
    expect(magicBytesMatch("video/webm", WEBM_HEADER)).toBe(false);
  });

  it("rejects content whose bytes contradict the declared type", () => {
    // A video file re-labelled as a PNG must not slip through.
    expect(magicBytesMatch("image/png", MP4_HEADER)).toBe(false);
    expect(magicBytesMatch("image/jpeg", PNG_HEADER)).toBe(false);
  });
});

describe("extFor", () => {
  it("maps image types to a file extension", () => {
    expect(extFor("image/jpeg")).toBe("jpg");
    expect(extFor("image/png")).toBe("png");
    expect(extFor("image/gif")).toBe("gif");
  });

  it("has no video extensions left to hand out", () => {
    expect(extFor("video/mp4")).toBe("bin");
    expect(extFor("video/webm")).toBe("bin");
  });
});

describe("MAX_IMAGE_BYTES", () => {
  it("is the 10 MB image ceiling, with no separate video allowance", () => {
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
  });

  it("endpoint body cap (4400kb) binds before the 10MB decoded-image ceiling", () => {
    // base64 encodes 3 bytes into 4, so a 4400kb JSON body can carry at most
    // ~3.3MB of decoded image bytes — the /api/admin/uploads body limit
    // (Vercel's 4.5MB function cap) is therefore the real ceiling, not the
    // MAX_IMAGE_BYTES safety cap below. That is correct: the frontend uploads
    // ≤1920px WebP, so well-formed uploads never approach either bound.
    const maxDecodedUnderBodyCap = Math.floor((4400 * 1024) / 4) * 3;
    expect(maxDecodedUnderBodyCap).toBeLessThan(MAX_IMAGE_BYTES);

    // Sanity: even MAX_IMAGE_BYTES base64-inflated stays under Cloudflare's
    // 100 MB cap, so no intermediary can hard-reject it on size alone.
    const inflatedAsBase64 = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
    expect(inflatedAsBase64).toBeLessThan(100 * 1024 * 1024);
  });
});