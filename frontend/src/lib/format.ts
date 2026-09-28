/**
 * Estimate reading time from markdown/HTML content — strip tags and markup,
 * count words, return minutes (min 1, 200 words/min). Pure function, safe to
 * import from server and client components.
 */
export function readingMinutes(content: string): number {
  const text = content
    .replace(/<[^>]+>/g, " ") // strip HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // markdown images
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ") // markdown links
    .replace(/^#{1,6}\s+/gm, "") // ATX headings
    .replace(/[`*_~>|\[\]]/g, " ") // inline/block markers
    .replace(/^\s*[-+]\s+/gm, " ") // unordered list bullets
    .replace(/^\s*\d+[.)]\s+/gm, " "); // ordered list markers
  const words = text.split(/\s+/).filter((w) => /\S/.test(w)).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Locale-aware date formatting shared by blog cards and the post detail view.
 * Pure function — safe to import from server and client components.
 * Standardized on short month names so it fits card meta rows.
 */

export function formatDate(iso: string | null, locale: "en" | "rw"): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(locale === "rw" ? "rw-RW" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Compact process uptime for the dashboard health strip — "3d 4h", "23h 12m",
 * "45m". Unit abbreviations are locale-neutral (EN/RW both read d/h/m), so the
 * caller interpolates the result into its own dictionary string via
 * `.replace("{n}", …)`. Pure function — safe on server and client.
 */
export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
