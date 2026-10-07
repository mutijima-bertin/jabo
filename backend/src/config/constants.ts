/**
 * App-wide constants. Values must match what routes/services used inline before
 * the layered restructure — changing them changes API behavior.
 */

/** Default HTTP port (overridable via PORT env — see config/env.ts). */
export const DEFAULT_PORT = 4000;

/**
 * JSON body limit for the admin upload endpoint (base64 data URLs). Kept under
 * Vercel's 4.5 MB function request-body cap — the frontend compresses images to
 * ≤1920px WebP before upload, so real payloads sit far below this ceiling.
 * See the comment above its use in app.ts.
 */
export const UPLOAD_JSON_BODY_LIMIT = "4400kb";

/** Admin JWT lifetime (was inline in lib/auth.ts). */
export const ADMIN_JWT_EXPIRES_IN = "12h";

/** Client portal JWT lifetime (was inline in lib/auth.ts). */
export const CLIENT_JWT_EXPIRES_IN = "7d";

/**
 * Canonical public portfolio categories (redesign blueprint §5.1). The public
 * grid filters exact-match against these six labels, so the admin API stores
 * exactly these values. No "Other" bucket by design — exotic work goes in tags.
 */
export const PORTFOLIO_CATEGORIES = [
  "Weddings",
  "Events",
  "Corporate",
  "Concerts",
  "Documentaries",
  "Portraits",
] as const;

export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number];

/**
 * Case/singular-tolerant lookup ("wedding", "WEDDINGS", " documentary " → canonical).
 * Blueprint §5.1 mapping table: trim + casefold; singular maps to its plural;
 * "corporate" matches itself. Returns null for anything outside the taxonomy.
 */
export function normalizePortfolioCategory(value: string): PortfolioCategory | null {
  const key = value.trim().toLowerCase();
  for (const canonical of PORTFOLIO_CATEGORIES) {
    const lower = canonical.toLowerCase();
    if (key === lower) return canonical;
    // Singular of a plural label: strip trailing "s" ("wedding", "event",
    // "concert", "portrait"); "-ies" → "-y" for "documentaries" → "documentary".
    const singular = lower.endsWith("ies")
      ? `${lower.slice(0, -3)}y`
      : lower.endsWith("s")
        ? lower.slice(0, -1)
        : null;
    if (singular !== null && key === singular) return canonical;
  }
  return null;
}
