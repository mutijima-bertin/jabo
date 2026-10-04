import { test, expect } from "@playwright/test";
import { LOCALES, PUBLIC_PATHS, localizedPath, swapLocaleInPath } from "../src/lib/locale";

/**
 * locale-routing.spec.ts — regression guard for the `[locale]` URL refactor.
 *
 * The hazard this file exists for: adding `app/(public)/[locale]/` introduced a
 * dynamic segment that matches ANY single path segment. If it ever won the
 * match over a static sibling, the app would start serving the marketing home
 * page in place of /track, /login, /account or /admin; and if a rewrite order
 * ever changed, it could swallow `/api/*` and `/uploads/*` — which the backend
 * serves through `next.config.ts`, and which every image on the site depends
 * on. Both failure modes are silent in a type-check and invisible in a unit
 * test, because they are properties of Next's ROUTER, not of any module.
 * Hence an HTTP-level spec.
 *
 * Read-only and self-contained: no admin login, no fixtures, nothing written.
 * Route lists and the locale vocabulary are IMPORTED from src/lib/locale.ts
 * rather than duplicated, so this spec cannot drift from the implementation
 * the way a hardcoded array would.
 */

/** The bare, non-prefixed routes that must survive the refactor intact. */
const BARE_ROUTES = ["/login", "/account", "/track", "/admin", "/admin/login"] as const;

/** Reads the <html lang> attribute actually rendered. */
const htmlLang = async (page: import("@playwright/test").Page): Promise<string | null> =>
  page.locator("html").getAttribute("lang");

test.describe("locale URL routing", () => {
  test("bare / permanently redirects to the default locale", async ({ request }) => {
    const res = await request.get("/", { maxRedirects: 0 });

    // 308, not 301/302: this is a permanent move of a URL, not a temporary
    // experiment, and 308 is method-preserving. A 3xx here would also mean the
    // root has no page of its own (the home page moved to /[locale]/page.tsx).
    expect(res.status(), "/ must 308").toBe(308);
    expect(res.headers()["location"], "/ must point at the default locale").toBe("/en");
  });

  test("every public marketing route exists under both locales", async ({ page }) => {
    for (const locale of LOCALES) {
      for (const path of PUBLIC_PATHS) {
        const res = await page.goto(localizedPath(locale, path));
        expect(res?.status(), `${localizedPath(locale, path)} must serve 200`).toBe(200);
        // The locale guard in (public)/[locale]/layout.tsx.
        expect(await htmlLang(page), `lang on ${localizedPath(locale, path)}`).toBe(locale);
      }
    }
  });

  test("a non-locale first segment 404s instead of rendering an undefined language", async ({ page }) => {
    // The hazard: `[locale]` matches ANY single segment, so /fr/… and a bare
    // /services both land in the layout. Only a real locale may render.
    for (const bogus of ["/fr/about", "/fr", "/EN/about"]) {
      const res = await page.goto(bogus);
      expect(res?.status(), `${bogus} must 404`).toBe(404);
    }
  });

  test("the bare, non-localized routes are NOT captured by [locale]", async ({ request }) => {
    for (const path of BARE_ROUTES) {
      const res = await request.get(path);
      expect(res.status(), `${path} must still resolve`).toBe(200);

      const html = await res.text();
      expect(html, `lang on bare ${path} must be the default`).toContain('<html lang="en"');

      // The decisive assertion. If `[locale]` had won the match, these routes
      // would be rendered by (public)/[locale]/layout.tsx + page.tsx and would
      // therefore carry that group's metadata: a SELF-canonical and hreflang
      // under a /en|locale prefix. A genuine bare route emits none of it —
      // /track's own canonical is the bare /track, and the auth/admin surfaces
      // are noindex with no canonical at all.
      //
      // (An `<h1>` count was tried here first and is the wrong probe: /account,
      // /admin and /admin/login legitimately render no h1, so it asserted a
      // property of those pages rather than of the router.)
      expect(html, `${path} must not be canonicalised into the locale tree`).not.toMatch(
        /rel="canonical"[^>]*href="[^"]*\/en\/|rel="canonical"[^>]*href="[^"]*\/rw\//,
      );
      expect(html, `${path} must not emit hreflang for the locale tree`).not.toContain(
        'rel="alternate"',
      );
    }
  });

  /**
   * THE load-bearing test. `/api` and `/uploads` are not app routes at all —
   * they are `afterFiles` rewrites to the backend (next.config.ts), which the
   * router applies BEFORE it ever considers a dynamic segment. So `[locale]`
   * cannot capture them.
   *
   * Both assertions are deliberately made against paths that do NOT exist
   * upstream. A 200 from a real endpoint would also be produced by a Next page
   * that happened to swallow the path and returned 200 HTML, so "it resolved"
   * proves nothing. What proves it is that the response comes from the BACKEND,
   * identified by its own machine-readable body (`{"error":...}` JSON or an
   * Express "Cannot GET" page) rather than by Next's rendered HTML shell. If
   * `[locale]` ever won the match, the body would be the site's HTML document.
   */
  test("/api/* still reaches the backend rewrite, never the [locale] page", async ({ request }) => {
    const res = await request.get("/api/definitely-not-a-real-endpoint-xyz");

    expect(res.headers()["content-type"], "/api must answer JSON, not HTML").toContain("application/json");
    // The backend's own error shape — proof the request was proxied.
    await expect(res.json()).resolves.toHaveProperty("error");

    // Positive control: a real public endpoint must return real data.
    const ok = await request.get("/api/public/settings");
    expect(ok.status(), "/api/public/settings must reach the backend").toBe(200);
    expect(Array.isArray(await ok.json()), "/api/public/settings must return a JSON array").toBe(true);
  });

  test("/uploads/* still reaches the backend rewrite, never the [locale] page", async ({ request }) => {
    const res = await request.get("/uploads/definitely-not-a-real-file.jpg");

    // Express answers an unknown upload with its default HTML error page.
    // Next's own 404 would instead carry the site's document chrome. Matching
    // on the Express signature is what makes this a real assertion about WHICH
    // server answered.
    const body = await res.text();
    expect(body, "the response must come from the backend, not a Next page").toContain("Cannot GET /uploads/");
    expect(body, "a Next-rendered locale page would carry this chrome").not.toContain("<footer");
  });

  test("localizedPath and swapLocaleInPath keep the locale tree closed", () => {
    // Pure-function guards for the two helpers the locale toggle and the link
    // pass depend on. "/" + hash is a real literal (Footer.tsx "/#about").
    expect(localizedPath("en", "/")).toBe("/en");
    expect(localizedPath("en", "")).toBe("/en");
    expect(localizedPath("en", "/about")).toBe("/en/about");
    expect(localizedPath("en", "/blog?page=2")).toBe("/en/blog?page=2");
    expect(localizedPath("en", "/#about")).toBe("/en#about");
    expect(localizedPath("rw", "/#about")).toBe("/rw#about");

    expect(swapLocaleInPath("/en/services", "rw")).toBe("/rw/services");
    expect(swapLocaleInPath("/rw/blog/x", "en")).toBe("/en/blog/x");
    expect(swapLocaleInPath("/en/blog?page=2#top", "rw")).toBe("/rw/blog?page=2#top");
    // No locale segment → the locale home. /rw/account is NOT a route, so the
    // toggle must never manufacture it.
    expect(swapLocaleInPath("/account", "rw")).toBe("/rw");
  });

  test("each localized page self-canonicalises and advertises both locales", async ({ page }) => {
    for (const locale of LOCALES) {
      const path = localizedPath(locale, "/services");
      await page.goto(path);

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical, `one canonical on ${path}`).toHaveCount(1);
      const href = (await canonical.getAttribute("href")) ?? "";

      // Self-canonical: the page points at ITSELF, never at the other
      // language. hreflang is the mechanism for "same page, two languages";
      // cross-canonicalising would deindex one of them.
      expect(href, `canonical on ${path} must be self-referential`).toContain(`/${locale}/services`);

      // hreflang for both locales plus x-default.
      for (const target of [...LOCALES, "x-default"]) {
        await expect(
          page.locator(`link[rel="alternate"][hreflang="${target}"]`),
          `hreflang="${target}" must be present on ${path}`,
        ).toHaveCount(1);
      }

      // og:locale must track the route, not the hardcoded "en_RW" it replaced.
      const ogLocale = (await page.locator('meta[property="og:locale"]').getAttribute("content")) ?? "";
      expect(ogLocale, `og:locale on ${path}`).toBe(locale === "rw" ? "rw_RW" : "en_RW");
    }
  });
});
