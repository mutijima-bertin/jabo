import { NextResponse, type NextRequest } from "next/server";
import { securityPolicy } from "@/lib/securityPolicy";
import { DEFAULT_LOCALE, LOCALE_HEADER, PATHNAME_HEADER, isLocale } from "@/lib/locale";

/**
 * Locale routing (Next 16.3.4 `proxy` file convention — the successor to
 * `middleware`, which this version logs as deprecated; see the migration note
 * in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * proxy.md` and the runtime deprecation warning in `next/dist/build/index.js`).
 * Lives at `src/proxy.ts` so it sits at the same level as `src/app`.
 *
 * Two responsibilities, and the split matters:
 *
 *  1. `/` → `/en`, permanently. The bare root is now a redirect rather than a
 *     page: the home page itself moved to `/[locale]/page.tsx`, so `/` has no
 *     route of its own. 308 (permanent, method-preserving) is deliberate — this
 *     is a permanent move of a URL, not a temporary experiment, and 301 is
 *     cached by browsers for as long as they feel like while 308 is
 *     cache-correct for the canonical form.
 *
 *     Not negotiated on `Accept-Language`: a permanent redirect is cached by
 *     the browser, so honouring the first visitor's header would pin that one
 *     visitor to their language on every later visit to `/` forever. EN stays
 *     the fixed target; the toggle and the hreflang cluster handle the rest.
 *
 *  2. FORWARD the resolved locale on a request header. The root layout renders
 *     `<html lang>` but sits above `[locale]`, so it cannot read the segment
 *     from params — a header is the only channel that reaches it without
 *     nesting the whole app under `[lang]` (which would break the deliberately
 *     bare routes — see lib/locale.ts). Bare paths fall back to DEFAULT_LOCALE
 *     so `/admin`, `/account` and `/track` render `lang="en"`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}`;
    return NextResponse.redirect(url, 308);
  }

  // The locale is the FIRST path segment, and only if it is exactly "en"/"rw" —
  // `/English/…` or `/english/…` must resolve to the default, not to a
  // dictionary that does not exist.
  const first = pathname.split("/")[1] ?? "";
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, isLocale(first) ? first : DEFAULT_LOCALE);
  // Forwarded so the root layout can branch per-path (analytics excludes the
  // staff-only /admin and /login surfaces). See PATHNAME_HEADER.
  requestHeaders.set(PATHNAME_HEADER, pathname);

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = securityPolicy(nonce, process.env.NODE_ENV === "development");
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // Never share nonce-bearing HTML between visitors or cache account pages.
  response.headers.set("Cache-Control", "private, no-store");
  if (/^\/(admin|account|login|track)(\/|$)/.test(pathname)) {
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Every route the app itself renders — and nothing else.
     *
     * Excluded on purpose:
     *  - `api` / `uploads` are forwarded to the backend by the rewrites in
     *    next.config.ts. They are already handled before any filesystem or
     *    dynamic route is considered, so they can never be captured by
     *    `[locale]`; keeping them out of the matcher too means no proxy hop and
     *    no header rewrite is added to every image and every API call.
     *  - `_next` is build output.
     *  - `favicon.ico`, `robots.txt`, `sitemap.xml` are static metadata routes
     *    that are not locale-scoped — sitemap.xml advertises BOTH locales by
     *    itself, so it must not be treated as living under one.
     */
    "/((?!_next|api|uploads|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
