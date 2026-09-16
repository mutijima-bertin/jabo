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
