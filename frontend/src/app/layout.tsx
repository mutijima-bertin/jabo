import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import "./signal.css";
import "./globals.css";
import { BRAND } from "@/lib/constants";
import { I18nProvider } from "@/lib/i18n";
import { HtmlLangSync } from "@/components/shared/HtmlLangSync";
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale, localizedPath, OG_LOCALES } from "@/lib/locale";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/seo";

const geistSans = localFont({src: [
  {path: "../../public/brand/fonts/Montserrat-Regular.otf", weight: "400"},
  {path: "../../public/brand/fonts/Montserrat-Medium.otf", weight: "500"},
  {path: "../../public/brand/fonts/Montserrat-SemiBold.otf", weight: "600"},
], variable: "--font-geist-sans", display: "swap"});
const fraunces = localFont({src: "../../public/brand/fonts/LiberationSerif-Regular.ttf", variable: "--font-fraunces", display: "swap", preload: false});
const studioNote = localFont({src: "../../public/brand/fonts/LiberationSerif-Italic.ttf", style: "italic", weight: "400", variable: "--font-studio-note", display: "swap", preload: false});
// SEO phase 2 — metadata foundation. metadataBase resolves all relative
// URL-based fields (canonical/og) to absolute; title.template appends the
// brand to child page titles (pages export bare keywords only). SEO phase 6 —
// branded typographic OG poster (public/og-default.png). Next merges metadata
// shallowly, so every page that defines its own openGraph re-states the shared
// image (see those files) — only non-overriding routes inherit from here.
// Per-post covers come later once the real domain is wired. Admin stays
// noindex via its own layout.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s — ${BRAND}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: BRAND,
    locale: OG_LOCALES[DEFAULT_LOCALE],
    type: "website",
    // "/" 308-redirects to /en (src/proxy.ts). Left bare it advertised a
    // redirecting URL as the canonical social share target for every route that
    // inherits this block — the bare /login, /account and /track pages. The
    // localized pages set their own absolute URL in their own metadata.
    url: localizedPath(DEFAULT_LOCALE, "/"),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Creative Sound Studio — photography, videography & livestreaming in Kigali, Rwanda",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE],
  },
};

// Root layout holds only shared chrome (fonts, i18n, dark/cream canvas).
// The public site chrome (Nav / Footer / WhatsApp FAB) lives in the `(site)`
// and `(public)/[locale]` route groups as a shared `SiteChrome` component, and
// the admin panel renders chrome-free under `admin/` — QA #2.
//
// ASYNC: `headers()` is what makes `<html lang>` truthful. It was hardcoded to
// "en" while a Kinyarwanda visitor was reading Kinyarwanda — screen readers got
// the wrong pronunciation rules and crawlers got no language signal at all. The
// root layout is ABOVE `[locale]`, so it cannot read the route segment from
// params; `src/proxy.ts` forwards the resolved locale on `x-css-locale` instead.
// Reading a header opts the tree into dynamic rendering, which costs nothing
// here: every route already awaits a `no-store` backend fetch, so none of them
// was statically generated in the first place.
//
// Bare routes (/admin, /login, /account, /track) carry no locale segment, so the
// proxy sends DEFAULT_LOCALE and they keep rendering lang="en".
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get(LOCALE_HEADER) ?? "";
  const lang = isLocale(headerLocale) ? headerLocale : DEFAULT_LOCALE;

  return (
    <html
      lang={lang}
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${fraunces.variable} ${studioNote.variable} h-full antialiased`}
    >
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className="flex min-h-full flex-col bg-cream font-sans text-ink">
        <I18nProvider>{children}</I18nProvider>
        {/* `lang` above is server-rendered from the request header, which is right
            for a fresh document. This keeps it right after a soft locale switch —
            see the component for why it reads the URL instead of useI18n(). */}
        <HtmlLangSync />
      </body>
    </html>
  );
}
