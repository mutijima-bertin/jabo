/**
 * Locale primitives for the `[locale]` URL segment.
 *
 * WHY the locale lives in the URL and not only in localStorage: until now the
 * language was a client-side cookie-equivalent, so a crawler that never runs JS
 * only ever saw English — Kinyarwanda was invisible to Google, `<html lang>`
 * was hardcoded to "en", and no hreflang existed to tie the two surfaces
 * together. A locale SEGMENT makes each language a first-class, indexable URL.
 *
 * SCOPE — only the 8 public marketing routes are prefixed:
 *   /en /en/about /en/services /en/portfolio /en/blog /en/blog/<slug>
 *   /en/book /en/contact   (and the /rw twins)
 *
 * Deliberately BARE (no locale segment):
 *   /admin /admin/login /login /account /track /track/<token>
 *   /api/* /uploads/* /sitemap.xml /robots.txt /favicon.ico
 *
 * The bare set is a compatibility contract, not an oversight. `/track/<token>`
 * is emailed to clients as a magic link; prefixing it would break every link
 * already in an inbox, and `/account` + `/login` are pasted between devices by
 * clients who are not browsing the site at all. Those routes still follow the
 * user's persisted language preference (see I18nProvider), they are just not
 * *addressable* per language — they are noindex/Disallow'd anyway.
 */

/** Every supported locale, as a URL segment. Order is the fallback order. */
export const LOCALES = ["en", "rw"] as const;

export type Locale = (typeof LOCALES)[number];

/** The locale served for a bare/unprefixed URL, and the `x-default` target. */
export const DEFAULT_LOCALE: Locale = "en";

/**
 * localStorage key holding the visitor's language PREFERENCE.
 *
 * Only meaningful on the bare routes (`/login`, `/account`, `/track`, `/admin`),
 * which carry no locale segment and therefore follow this instead of the URL.
 * On the localized routes the URL wins and this key is written but never read —
 * see `I18nProvider`'s two-mode note. It lives here rather than inline in
 * `i18n.tsx` so the `<html lang>` sync and the provider cannot drift apart.
 */
export const LOCALE_STORAGE_KEY = "css_locale";

/**
 * Request header set by `src/proxy.ts` carrying the resolved locale.
 *
 * The root layout renders `<html lang>` but sits ABOVE `[locale]` in the tree,
 * so it cannot read the route param (a parent layout never receives a child's
 * dynamic segments). `next/root-params` only works when the whole app is nested
 * under `[lang]` — which it deliberately is NOT here, because the bare routes
 * above must keep working. A request header is the only channel that reaches the
 * root layout without restructuring the tree, and reading it is free: these
 * routes already opt into dynamic rendering (every page awaits a `no-store`
 * backend fetch), so no page loses static generation by having the root layout
 * call `headers()`.
 */
export const LOCALE_HEADER = "x-css-locale";

/** Type guard for a locale URL segment — `true` for exactly "en" | "rw". */
export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

/**
 * `og:locale` per locale. These are Open Graph's `language_TERRITORY` form
 * (`<language>_<COUNTRY>`, country uppercase), NOT BCP-47 — passing plain
 * "rw"/"en" is a common and silent mistake. Both variants are Rwanda because
 * the studio operates only there; the country is not part of the language, so
 * the locale prefix in the URL stays the short `en`/`rw`.
 */
export const OG_LOCALES: Record<Locale, string> = { en: "en_RW", rw: "rw_RW" };

/**
 * Prefix a bare app path with its locale segment: "/" → "/en",
 * "/about" → "/en/about", "" → "/en".
 *
 * The query string and hash are split off BEFORE prefixing and re-appended
 * verbatim. That split is not defensive coding for its own sake — it exists for
 * `"/#about"`, which is a real literal in `components/site/Footer.tsx`. Naive
 * `/${locale}${path}` on that input yields `/en/#about`: a locale-prefixed
 * slash segment in front of the hash, which does NOT land on the home page's
 * `#about` anchor and escapes the intended `/en#about`.
 *
 * Idempotent-ish by contract, not by guard: callers that may already hold a
 * localized path should pass the BARE path (the 8 route paths are constants in
 * this file's consumers, and `PUBLIC_PATHS` at the bottom is the single list).
 */
export function localizedPath(locale: Locale, path?: string): string {
  // Everything after the first "#" — fragments are client-side only and must
  // never be prefixed.
  const hashAt = path?.indexOf("#") ?? -1;
  const hash = hashAt === -1 ? "" : (path as string).slice(hashAt);
  const beforeHash = hashAt === -1 ? (path ?? "") : (path as string).slice(0, hashAt);

  // Same split for the query string, which must sit between path and hash in a
  // URL ("/blog?page=2" + "#top" → "/en/blog?page=2#top").
  const qAt = beforeHash.indexOf("?");
  const search = qAt === -1 ? "" : beforeHash.slice(qAt);
  let pathname = qAt === -1 ? beforeHash : beforeHash.slice(0, qAt);

  // "/" and "" both mean "the locale home page" → "/en", never "/en/".
  if (pathname === "" || pathname === "/") return `/${locale}${hash}${search}`;
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;

  return `/${locale}${pathname}${search}${hash}`;
}

/**
 * Swap the locale segment of an already-localized pathname, for the EN/RW
 * toggle: "/en/services" → "/rw/services", "/rw" → "/en", "/en/blog?page=2#x"
 * → "/rw/blog?page=2#x".
 *
 * Query string and hash are preserved (this is why the input is a full
 * pathname, not a route constant). A path with NO locale segment — e.g. a bare
 * "/account" — returns the locale HOME rather than "/rw/account", because
 * /rw/account is not a route: the bare set is deliberately unprefixed and the
 * toggle must not manufacture a URL that 404s.
 */
export function swapLocaleInPath(pathname: string, next: Locale): string {
  const hashAt = pathname.indexOf("#");
  const hash = hashAt === -1 ? "" : pathname.slice(hashAt);
  const beforeHash = hashAt === -1 ? pathname : pathname.slice(0, hashAt);

  const qAt = beforeHash.indexOf("?");
  const search = qAt === -1 ? "" : beforeHash.slice(qAt);
  const path = qAt === -1 ? beforeHash : beforeHash.slice(0, qAt);

  const segments = path.split("/").filter(Boolean);

  // A localized path ALREADY carries the locale as segment 0 — replace it in
  // place (rather than prepending a second one, which would yield
  // "/rw/rw/services"). A path without a locale segment falls through to the
  // locale home, because /rw/account is not a route.
  if (segments.length > 0 && isLocale(segments[0])) {
    segments[0] = next;
    return `/${segments.join("/")}${search}${hash}`;
  }
  return `/${next}${search}${hash}`;
}

/**
 * The 8 public marketing routes, bare. One list, imported by the pages (for
 * canonical/hreflang), the sitemap (locale expansion) and the tests, so the
 * localized route set has exactly ONE definition and cannot drift.
 */
export const PUBLIC_PATHS = [
  "/",
  "/about",
  "/services",
  "/portfolio",
  "/blog",
  "/book",
  "/contact",
] as const;

export type PublicPath = (typeof PUBLIC_PATHS)[number];
