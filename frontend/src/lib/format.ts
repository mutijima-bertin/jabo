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
