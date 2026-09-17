import type { Metadata } from "next";
import AccountClient from "./AccountClient";

// Authenticated client area: never index it (SEO phase 3). Title is a bare
// keyword — the root layout template appends the brand. No Open Graph here
// (title + robots only): `openGraph: null` drops the root layout's inherited
// og block so authenticated pages carry no share/social metadata.
export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
  openGraph: null,
};

export default function AccountPage() {
  return <AccountClient />;
}
