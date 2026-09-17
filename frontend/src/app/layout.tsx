import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/constants";
import { I18nProvider } from "@/lib/i18n";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// SEO phase 2 — metadata foundation. metadataBase resolves all relative
// URL-based fields (canonical/og) to absolute; title.template appends the
// brand to child page titles (pages export bare keywords only). No OG image
// yet — a dedicated phase ships it. Admin stays noindex via its own layout.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s — ${BRAND}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: BRAND,
    locale: "en_RW",
    type: "website",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
  },
};

// Root layout holds only shared chrome (fonts, i18n, dark/cream canvas).
// The public site chrome (Nav / Footer / WhatsApp FAB) lives in the `(site)`
// route group, and the admin panel renders chrome-free under `admin/` — QA #2.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className="flex min-h-full flex-col bg-cream font-sans text-ink">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
