import type { Metadata } from "next";
import LoginClient from "./LoginClient";

// Auth-intent page: keep it out of search indexes entirely (SEO phase 3).
// Title is a bare keyword — the root layout template appends the brand.
// No Open Graph on auth pages (title + robots only): `openGraph: null` also
// drops the root layout's inherited og block, so nothing share-worthy leaks.
export const metadata: Metadata = {
  title: "Client Login",
  robots: { index: false, follow: false },
  openGraph: null,
};

export default function LoginPage() {
  return <LoginClient />;
}
