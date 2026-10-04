import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { LOCALES, OG_LOCALES, localizedPath, type Locale } from "@/lib/locale";

/**
 * Canonical origin. Always absolute (metadataBase requirement). Falls back to
 * the production placeholder; set NEXT_PUBLIC_SITE_URL to override.
 *
 * NEXT_PUBLIC_* vars are inlined at BUILD time, which is acceptable here:
 * each deployment builds its own image (`docker compose up -d --build
 * frontend`), so the value is baked in per environment. A real domain later
 * only needs the env var set in the build — no code change.
 *
 * The `||` is deliberate and must NOT become `??`: the value arrives via a
 * Dockerfile build ARG (`ARG NEXT_PUBLIC_SITE_URL`), so it is frequently
 * present-but-EMPTY rather than absent — e.g. docker-compose's
 * `${NEXT_PUBLIC_SITE_URL:-}` when no .env entry exists, or an unset shell var
 * exported as "". `??` only falls back on null/undefined, so an empty string
 * survived it and made `absoluteUrl()` call `new URL(path, "")`, which throws
 * `TypeError: Invalid URL` and kills the build at "collect page data for
 * /_not-found". `||` treats empty the same as unset and restores the placeholder.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://creativesoundstudio.rw";

/**
 * Site-wide <title> default and meta/OG description — shared by the root
 * layout metadata and the homepage's explicit metadata so nothing drifts
 * (the root `default` is what renders on pages without their own title).
 */
export const SITE_TITLE = `${BRAND} — Photography, Videography & Livestreaming in Kigali`;
export const SITE_DESCRIPTION = `${BRAND} in Kigali — photography, videography and livestreaming by founder Nkurunziza Jabo, trusted by FAO, The New Times and Kigali Today.`;

/**
 * Absolute URL for `path`, optionally locale-prefixed.
 *
 * `locale` is OPTIONAL and additive: all 31 existing single-arg call sites keep
 * working untouched, which matters because two of them are not page routes at
 * all — `OG_IMAGE` below and the `/uploads/...` image paths in lib/jsonld.tsx.
 * Those MUST stay bare (the backend serves them from one origin, so a
 * `/en/uploads/...` URL would 404), so the prefixing only happens when a caller
 * explicitly passes a locale.
 */
export function absoluteUrl(path: string, locale?: Locale): string {
  return new URL(locale ? localizedPath(locale, path) : path, SITE_URL).toString();
}

/**
 * Every locale's absolute URL for one bare route path, plus the `x-default`
 * entry. Used as `alternates.languages` on every localized page.
 *
 * x-default is the EN URL rather than a bare "/", deliberately: the bare root
 * now 308s to /en, so a bare / would advertise a redirect as the canonical
 * fallback for every locale. Pointing x-default at /en means a crawler with no
 * language preference lands on real, indexable content.
 */
export function localeAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[locale] = absoluteUrl(path, locale);
  languages["x-default"] = absoluteUrl(path, "en");
  return languages;
}

/**
 * Per-page `<title>` and meta description, in both languages.
 *
 * Kept HERE rather than added to the 505-key dictionaries in lib/i18n.tsx for
 * two reasons: the dictionaries are keyed by `keyof typeof en` and are asserted
 * complete, so adding keys means touching both dictionaries and the assertion;
 * and crawler-facing copy is not the same register as UI copy — a meta
 * description is written for a SERP, an h1 for a reader.
 *
 * Length matters: search engines truncate roughly at 160 characters (the
 * e2e SEO spec enforces a 50–165 envelope), so every description below stays
 * inside it in BOTH languages.
 */
export const PAGE_META = {
  home: {
    en: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    },
    rw: {
      title: `${BRAND} — Amafoto, Vidiyo n'Umusanzwe w'Ibinyabiziga i Kigali`,
      description:
        `${BRAND} i Kigali — amafoto, vidiyo n'umusanzwe w'ibinyabiziga by Nkurunziza Jabo, twizewe FAO, The New Times na Kigali Today.`,
    },
  },
  about: {
    en: {
      title: "About",
      description:
        "Creative Sound Studio is a Kigali-based media production company by video journalist Nkurunziza Jabo — trusted by FAO, The New Times, Kigali Today and Radio 10.",
    },
    rw: {
      title: "Abo turi bo",
      description:
        "Creative Sound Studio ni ikigo cyo Kigali gikora imyaka ya TV, cyakozwe na Nkurunziza Jabo — twizewe FAO, The New Times, Kigali Today na Radio 10.",
    },
  },
  services: {
    en: {
      title: "Services",
      description:
        "Wedding & event photography, corporate and documentary videography, livestreaming, drone coverage and more in Kigali, Rwanda.",
    },
    rw: {
      title: "Serivisi",
      description:
        "Amafoto y'ubuk ubukuru n'ibirori, vidiyo y'ikigo n'ibisobanuro, umusanzwe w'ibinyabiziga, drone na byindi muri Kigali, Ruwanda.",
    },
  },
  portfolio: {
    en: {
      title: "Portfolio",
      description:
        "Recent photography, videography and livestreaming productions for media houses, institutions, and events across Rwanda.",
    },
    rw: {
      title: "Amafoto",
      description:
        "Amakazi y'amasezerano y'amafoto, vidiyo n'imusanzwe w'ibinyabiziga ku bitanganya by'imbumwe, ku mashuri no mu birori byo mu Rwanda.",
    },
  },
  blog: {
    en: {
      title: "Blog",
      description:
        "Notes, highlights and client stories from behind the lens at Creative Sound Studio — Kigali, Rwanda.",
    },
    rw: {
      title: "Blog",
      description: "Amakuru, ibisobanuro n'ibintu byose byari inyuma y'ifoto muri Creative Sound Studio — Kigali, Ruwanda.",
    },
  },
  book: {
    en: {
      title: "Book a Production",
      description:
        "Book photography, videography or livestreaming in Kigali in minutes. Receive a confirmation and a personal tracking link by email and WhatsApp.",
    },
    rw: {
      title: "Andikisha umurimo",
      description:
        "Andikisha amafoto, vidiyo cyangwa umusanzwe w'ibinyabiziga muri Kigali mu minsi. Uzabona icyemezo n'urugero rwo gukurikirana kuri email na WhatsApp.",
    },
  },
  contact: {
    en: {
      title: "Contact",
      description:
        "Reach Creative Sound Studio in Kigali — WhatsApp, email or phone. We reply within 24 hours.",
    },
    rw: {
      title: "Twandikire",
      description:
        "Vugana na Creative Sound Studio i Kigali — WhatsApp, email cyangwa telephone. Tusubiza mu masaha 24.",
    },
  },
} as const satisfies Record<string, Record<Locale, { title: string; description: string }>>;

export type MetaKey = keyof typeof PAGE_META;

/**
 * The full metadata block for one localized page: localized title/description,
 * a SELF-canonical (never cross-canonical to the other language — hreflang, not
 * canonical, is the mechanism for "same page in two languages"), hreflang for
 * every locale + x-default, and an og:locale matching the route's language.
 *
 * `openGraph` is re-declared in full because Next merges metadata SHALLOWLY: a
 * page-level `openGraph` replaces the root's object entirely, so `siteName`,
 * `type` and the shared OG poster all have to be restated or the page silently
 * loses the brand and the preview image.
 */
export function localeMetadata(locale: Locale, path: string, key: MetaKey): Metadata {
  const copy = PAGE_META[key][locale];
  // Self-canonical: /rw/services points at /rw/services. hreflang — not
  // canonical — is what tells Google the two are translations of each other;
  // cross-canonicalising to the other language would deindex one of them.
  const canonical = absoluteUrl(path, locale);
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical, languages: localeAlternates(path) },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      images: [OG_IMAGE],
      siteName: BRAND,
      locale: OG_LOCALES[locale],
      type: "website",
    },
  };
}

/** The same hreflang/canonical block for the blog-post route, whose copy comes
 *  from the post row rather than PAGE_META (and whose og:type is "article"). */
export function postMetadata(
  locale: Locale,
  slug: string,
  copy: { title: string; description: string },
): Metadata {
  const path = `/blog/${slug}`;
  const canonical = absoluteUrl(path, locale);
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical, languages: localeAlternates(path) },
    openGraph: {
      // og:type stays "article" for posts (SEO phase 3); only the marketing
      // pages are "website".
      title: `${copy.title} — ${BRAND}`,
      description: copy.description,
      url: canonical,
      images: [OG_IMAGE],
      siteName: BRAND,
      locale: OG_LOCALES[locale],
      type: "article",
    },
  };
}

/**
 * Branded typographic OG poster (1200×630, `public/og-default.png`), generated
 * by `scripts/og-image.mjs`. Absolute like everything else in this module so
 * build-time env swaps (NEXT_PUBLIC_SITE_URL) stay seamless — SEO phase 6.
 */
export const OG_IMAGE = absoluteUrl("/og-default.png");
