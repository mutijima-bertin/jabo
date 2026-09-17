import { BRAND } from "@/lib/constants";

/**
 * Canonical origin. Always absolute (metadataBase requirement). Placeholder
 * until production deployment; set NEXT_PUBLIC_SITE_URL to override.
 *
 * NEXT_PUBLIC_* vars are inlined at BUILD time, which is acceptable here:
 * each deployment builds its own image (`docker compose up -d --build
 * frontend`), so the placeholder is baked in per environment. A real domain
 * later only needs the env var set in the build — no code change.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://creativesoundstudio.rw";

/**
 * Site-wide <title> default and meta/OG description — shared by the root
 * layout metadata and the homepage's explicit metadata so nothing drifts
 * (the root `default` is what renders on pages without their own title).
 */
export const SITE_TITLE = `${BRAND} — Photography, Videography & Livestreaming in Kigali`;
export const SITE_DESCRIPTION = `${BRAND} in Kigali — photography, videography and livestreaming by founder Nkurunziza Jabo, trusted by FAO, The New Times and Kigali Today.`;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}