import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Crawl policy — public site is fully open; auth/admin surfaces are blocked.
// `/track/` keeps its trailing slash on purpose: the /track landing page stays
// crawlable while token-gated /track/<token> URLs never get crawled (they are
// additionally noindexed by the segment layout).
//
// NO LOCALE VARIANTS ARE NEEDED HERE, which is worth recording explicitly.
// Every path in the disallow list (`/admin`, `/login`, `/account`, `/track/`)
// is one of the deliberately BARE routes — none of them carries a `/{locale}`
// segment (see lib/locale.ts). So the four entries above are already complete
// and unprefixed is correct: there is no `/en/admin` to block, because that
// path does not resolve (it 404s at the `[locale]` layout's locale guard).
// Adding locale-prefixed variants would match nothing while implying a
// per-language surface that was deliberately never built.
//
// Symmetrically, the sitemap must NOT emit locale variants for `/track`, which
// is why it appears there as a single bare entry.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/login", "/account", "/track/"],
      },
    ],
    // The sitemap advertises BOTH locales for the 8 public routes, so its own
    // absolute URL is unchanged and stays locale-free.
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}