import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { fetchPosts } from "@/lib/content";

// Single consistent <lastmod> stamp for the static entry set (repo commit day).
// The Sitemaps protocol only needs YYYY-MM-DD; the posts below carry their own
// real publishedAt where available.
const STATIC_LAST_MODIFIED = "2026-09-18";

// Static route set — order matters: home first, then the brochure pages, then
// live posts appended newest-first. Change frequency/priority per page type:
// money pages top the priority ladder, reference pages sit lower.
const staticEntries: MetadataRoute.Sitemap = [
  { url: absoluteUrl("/"), lastModified: STATIC_LAST_MODIFIED, changeFrequency: "weekly", priority: 1 },
  { url: absoluteUrl("/about"), lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.6 },
  { url: absoluteUrl("/services"), lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.9 },
  { url: absoluteUrl("/portfolio"), lastModified: STATIC_LAST_MODIFIED, changeFrequency: "weekly", priority: 0.8 },
  { url: absoluteUrl("/blog"), lastModified: STATIC_LAST_MODIFIED, changeFrequency: "weekly", priority: 0.8 },
  { url: absoluteUrl("/book"), lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.9 },
  { url: absoluteUrl("/contact"), lastModified: STATIC_LAST_MODIFIED, changeFrequency: "monthly", priority: 0.6 },
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
      .map((post) => ({
        url: absoluteUrl(`/blog/${post.slug}`),
        lastModified: post.publishedAt ?? STATIC_LAST_MODIFIED,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }));
  } catch {
    // A sitemap must never 500: when the API is unreachable the statics alone
    // still advertise the crawlable surface.
    postEntries = [];
  }
  return [...staticEntries, ...postEntries];
}