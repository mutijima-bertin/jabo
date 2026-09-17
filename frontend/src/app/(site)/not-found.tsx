import type { Metadata } from "next";
import NotFoundContent from "./NotFoundContent";

// SEO phase 3: Next.js already injects `noindex` for 404 responses; the
// explicit robots block + proper title keep the themed page consistent and
// index-safe even on soft-404 (streamed) responses.
export const metadata: Metadata = {
  title: "404: Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundContent />;
}
