import { DEFAULT_LOCALE, localizedPath } from "../src/lib/locale";

/**
 * routes.ts — the suite's one place where "which paths carry a locale segment?"
 * is decided.
 *
 * WHY A HELPER INSTEAD OF LITERALS. The 8 public marketing routes moved under
 * `app/(public)/[locale]/`, so `/book` is now a 404 and `/en/book` is the page.
 * Every spec that navigates or asserts on a marketing URL therefore needs the
 * prefix, and every one of those call sites is a place a future locale change
 * would have to be re-applied. Wrapping `localizedPath` keeps that a one-line
 * change here (or in `src/lib/locale.ts`) instead of ~90 edits spread over 11
 * spec files — and it means a spec can never assert a path the router would 404.
 *
 * The alternative — hardcoding "/en/book" at every call site — is what makes
 * exact-equality `href` assertions so easy to miss, because a bare literal in
 * an attribute assertion looks identical to a correct one.
 *
 * THE BARE SET IS NOT OPTIONAL. These stay unprefixed by design and MUST NOT go
 * through `en()`:
 *
 *   /admin  /admin/login   the admin shell and its login
 *   /login  /account       client auth + dashboard; pasted between devices by
 *                          clients who are not browsing the site at all
 *   /track  /track/<token> emailed/WhatsApp'd as a magic link — prefixing it
 *                          would break every link already sitting in an inbox
 *   /api/*  /uploads/*     backend rewrites, not app routes at all
 *
 * `/` 308-redirects to `/en`, so `en("/")` is the canonical way to reach home.
 */

/**
 * The locale the functional specs browse in: English.
 *
 * Only a spec that is SPECIFICALLY about locale behaviour should reach for
 * another one. Nothing else should start asserting Kinyarwanda copy as a side
 * effect of a path edit — that turns a mechanical migration into a translation
 * review, and it makes every EN test depend on the rw dictionaries too.
 * `locale-routing.spec.ts` is where cross-locale behaviour is proven.
 */
export const EN = DEFAULT_LOCALE;

/**
 * An EN-prefixed path for a bare app path: `en("/book")` → `"/en/book"`.
 *
 * Use for EVERY public marketing route — navigation (`page.goto`), exact href
 * assertions (`toHaveAttribute("href", …)`), `a[href="…"]` selectors, and
 * `toHaveURL` regexes (`new RegExp(`^${en("/book")}$`)`), where a bare
 * `/\/book$/` would also match a hypothetical `/rw/x/book`).
 *
 * Do NOT use for the bare set above — see the file header.
 */
export const en = (path: string): string => localizedPath(EN, path);

export { LOCALES, PUBLIC_PATHS, localizedPath, swapLocaleInPath } from "../src/lib/locale";
export type { Locale } from "../src/lib/locale";