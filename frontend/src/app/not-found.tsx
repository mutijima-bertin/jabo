import type { Metadata } from "next";
import NotFoundContent from "@/components/site/NotFoundContent";

/**
 * Root 404 boundary. Next.js resolves an unmatched URL to the CLOSEST
 * `not-found.tsx` walking up from the route that failed, so the pre-refactor
 * `(site)/not-found.tsx` only covered notFound() calls thrown inside that group.
 * Two important cases sit outside it and were falling through to Next's
 * unbranded built-in page:
 *
 *   - an unknown path entirely (`/nonexistent-page`)
 *   - an invalid locale segment (`/fr`, `/EN`) — `(public)/[locale]/layout.tsx`
 *     calls notFound() for those, and that segment has no nearer boundary.
 *
 * A visitor hitting `/fr` on a live site should see the studio's 404, not a
 * default framework page. Same metadata contract as the (site) boundary:
 * Next injects noindex for 404 responses, and the explicit block keeps that
 * guarantee on soft-404 (streamed) responses too.
 *
 * The copy is localized inside NotFoundContent via the persisted locale,
 * because this boundary renders for bare URLs that carry no locale segment.
 */
export const metadata: Metadata = {
  title: "404: Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundContent />;
}