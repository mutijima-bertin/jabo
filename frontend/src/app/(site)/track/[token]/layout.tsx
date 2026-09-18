import type { Metadata } from "next";

// Token-gated tracker screen: a leaked /track/<token> URL must never enter
// search indexes (SEO phase 4). The page itself is a client component, so this
// segment layout (server) carries the robots directive. The /track landing
// page one level up stays indexable.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TrackTokenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}