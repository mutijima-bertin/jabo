import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { fetchPosts } from "@/lib/content";
import { LOCALES, PUBLIC_PATHS } from "@/lib/locale";

// Single consistent <lastmod> stamp for the static entry set (repo commit day).
// The Sitemaps protocol only needs YYYY-MM-DD; the posts below carry their own
// real publishedAt where available.
const STATIC_LAST_MODIFIED = "2026-09-18";

/**
 * Crawl policy per route, and the order entries are emitted in: home first, then
 * the brochure pages, then live posts appended newest-first. Change frequency /
 * priority per page type: money pages top the priority ladder, reference pages
 * sit lower. Priorities are per-page-type and locale-independent on purpose —
 * `/en/contact` and `/rw/contact` are the same page in two languages and must
 * not compete with each other for crawl budget.
 */
const STATIC_ROUTES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/services", changeFrequency: "monthly", priority: 0.9 },
  { path: "/portfolio", changeFrequency: "weekly", priority: 0.8 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/book", changeFrequency: "monthly", priority: 0.9 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
] as const satisfies ReadonlyArray<{
  path: (typeof PUBLIC_PATHS)[number];
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}>;

/** hreflang block for one bare route — every locale plus x-default, identical
 *  to what the page emits in its own <head>. Keeping the two generated from the
 *  same helper is what stops the sitemap advertising an /en/rw pair the pages
 *  themselves don't reciprocate. */
function alternatesFor(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[locale] = absoluteUrl(path, locale);
  languages["x-default"] = absoluteUrl(path, "en");
  return languages;
}

/**
 * Static route set — BOTH locale variants of all 8 public marketing routes.
 *
 * Emitting each locale as its own <url> (rather than only the EN one) is the
 * point of the whole refactor: a sitemap containing only `/en/…` tells Google
 * the Kinyarwanda URLs exist only if something else links them, and a *self*
 * hreflang cluster (each page listing both locales) is exactly what the
 * `<x-default>` + `alternates.languages` on each page advertise.
 *
 * `/track` is the one deliberate exception: it stays BARE (no locale segment —
 * see lib/locale.ts) so it gets a single unprefixed entry, not a locale pair.
 */
const staticEntries: MetadataRoute.Sitemap = [
  ...STATIC_ROUTES.flatMap(({ path, changeFrequency, priority }) =>
    LOCALES.map((locale) => ({
      url: absoluteUrl(path, locale),
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency,
      priority,
      alternates: { languages: alternatesFor(path) },
    })),
  ),
  { url: absoluteUrl("/track"), lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let postEntries: MetadataRoute.Sitemap = [];
  try {
    postEntries = (await fetchPosts())
      // Newest-first regardless of backend ordering (publishedAt can be null —
      // those sort last, into the past).
      .slice()
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .flatMap((post) => {
        const path = `/blog/${post.slug}`;
        return LOCALES.map((locale) => ({
          url: absoluteUrl(path, locale),
          lastModified: post.publishedAt ?? STATIC_LAST_MODIFIED,
          changeFrequency: "monthly" as const,
          priority: 0.7,
          alternates: { languages: alternatesFor(path) },
        }));
      });
  } catch {
    // A sitemap must never 500: when the API is unreachable the statics alone
    // still advertise the crawlable surface.
    postEntries = [];
  }
  return [...staticEntries, ...postEntries];
}
