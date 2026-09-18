import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

// Crawl policy — public site is fully open; auth/admin surfaces are blocked.
// `/track/` keeps its trailing slash on purpose: the /track landing page stays
// crawlable while token-gated /track/<token> URLs never get crawled (they are
// additionally noindexed by the segment layout).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/login", "/account", "/track/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}