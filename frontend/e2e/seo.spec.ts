import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { API } from "./auth";
import { OG_IMAGE, SITE_TITLE, absoluteUrl } from "../src/lib/seo";

/**
 * seo.spec.ts — SEO contract e2e (Phase 9, final).
 *
 * Asserts the machine-readable surface the SEO phases shipped: per-page
 * title/description/canonical contract, enough OG/Twitter metadata on the
 * money pages, robots.txt crawl policy, sitemap.xml completeness, parseable
 * JSON-LD per page, and noindex on auth/admin surfaces.
 *
 * THE CARDINAL RULE — fresh-seed-safe + relational. This spec must pass on a
 * freshly seeded CI database AND on the accumulated dev DB:
 *
 *  - NO hardcoded counts. The sitemap expectations are READ from the live
 *    `/public/posts` API (never a number or literals list), and every
 *    canonical/metadata literal comes from importing `frontend/src/lib/seo.ts`
 *    (pure TS — Playwright resolves its `@/` alias via tsconfig paths).
 *  - The only hardcoded page list is the 8 static routes (imported paths only —
 *    they are routes, not data). Blog inventory is always live-derived.
 *  - E2E fixtures created concurrently by sibling specs (blog/publication,
 *    responsive blog, bookings-from-content) carry self-identifying slug
 *    prefixes — e2e-, responsive-, cta- — and live only for the duration of
 *    THEIR test. They are filtered out of the "expected content" set exactly
 *    like the other suites' isE2e* filters, so the static sitemap is compared
 *    ONLY against real owner content and the suite stays race-free under
 *    `fullyParallel`.
 */

interface PostSummary {
  slug: string;
  titleEn?: string;
}

/** The 8 static routes that every public layout must serve. */
const PUBLIC_PAGES = ["/", "/services", "/about", "/portfolio", "/blog", "/book", "/contact", "/track"] as const;

/**
 * True only when E2E_BASE_URL points at a non-localhost origin. Gates the checks
 * that assert on Cloudflare's edge behaviour — those are unreachable from
 * localhost by definition, so they must report as SKIPPED (honest: no coverage)
 * rather than PASSED (a false claim of coverage).
 */
const RUNS_AGAINST_PROD = /^https?:\/\/(?!localhost\b|127\.0\.0\.1)/.test(process.env.E2E_BASE_URL ?? "");

/**
 * Next.js metadata rendering strips a single trailing slash from URL-shaped
 * fields (homepage canonical/og:url render as "…creativesoundstudio.rw" while
 * the app's absoluteUrl("/") value carries one). Compare normalized forms.
 */
const stripTrailingSlash = (u: string): string => (u.length > 1 ? u.replace(/\/$/, "") : u);

/**
 * Recognize E2E-authored posts from sibling specs (self-identifying slug
 * prefixes, mirroring the isE2ePortfolio/isE2eAuthored filters elsewhere).
 * These are transient fixtures — never part of the content set a build-time
 * sitemap advertises. Filtering is by PREFIX, never by count.
 */
const isFixturePost = (p: PostSummary): boolean =>
  /^(e2e-|responsive-|cta-)/.test(p.slug) || (p.titleEn ?? "").startsWith("E2E ");

async function publicGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(`${API}${path}`);
  if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Published, non-fixture blog slugs — the "real" content of the day. */
async function ownerPostSlugs(request: APIRequestContext): Promise<string[]> {
  const posts = await publicGet<PostSummary[]>(request, "/public/posts");
  return posts.filter((p) => !isFixturePost(p)).map((p) => p.slug);
}

interface JsonLdBlock {
  [k: string]: unknown;
}

/** Parse every ld+json script; a throw here IS the parse-success assertion. */
function parseJsonLd(page: Page): Promise<JsonLdBlock[]> {
  return page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
    els.map((el) => JSON.parse((el as HTMLScriptElement).textContent ?? "") as JsonLdBlock),
  );
}

const typesOf = (b: JsonLdBlock): string[] => {
  const t = b["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
};

const hasType = (b: JsonLdBlock, t: string): boolean => typesOf(b).includes(t);

const metaProp = async (page: Page, property: string): Promise<string> =>
  (await page.locator(`meta[property="${property}"]`).getAttribute("content")) ?? "";

const metaName = async (page: Page, name: string): Promise<string> =>
  (await page.locator(`meta[name="${name}"]`).getAttribute("content")) ?? "";

test.describe("SEO contract", () => {
  test("every public page renders the title / description / canonical contract", async ({ page }) => {
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);

      // <title>: home is the exact brand headline (absolute, unsuffixed); every
      // other public page is the `%s — Creative Sound Studio` template form.
      const title = await page.title();
      if (path === "/") {
        expect(title, `home <title> must equal SITE_TITLE`).toBe(SITE_TITLE);
      } else {
        expect(title, `templated <title> on ${path}`).toMatch(/^.+ — Creative Sound Studio$/);
      }

      // meta description: present, and inside the 50–165 character envelope.
      const desc = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
      expect(desc, `meta description on ${path} must exist`).not.toBe("");
      expect(desc.length, `meta description length on ${path}`).toBeGreaterThanOrEqual(50);
      expect(desc.length, `meta description length on ${path}`).toBeLessThanOrEqual(165);

      // EXACTLY ONE canonical, equal to absoluteUrl(path) modulo Next's
      // trailing-slash rendering (see stripTrailingSlash).
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical, `single canonical on ${path}`).toHaveCount(1);
      const href = (await canonical.getAttribute("href")) ?? "";
      expect(href, `canonical href on ${path} must be absolute`).toBeTruthy();
      expect(stripTrailingSlash(href), `canonical on ${path} must match absoluteUrl`).toBe(
        stripTrailingSlash(absoluteUrl(path)),
      );
    }
  });

  test("homepage <title> is the exact brand headline — never a suffixed template", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    // The homepage declares title.absolute = SITE_TITLE; the root template
    // (`%s — Creative Sound Studio`) must NOT be re-applied on top of it.
    expect(title).toBe(SITE_TITLE);
    expect((title.match(/Creative Sound Studio/g) ?? []).length, "brand appears exactly once").toBe(1);
    expect(title).not.toMatch(/— Creative Sound Studio —/);
  });

  test("money pages carry full OG + Twitter card metadata aligned to seo.ts", async ({ page, request }) => {
    // Live post for the third case — read from the API, never hardcoded.
    const slugs = await ownerPostSlugs(request);
    expect(slugs.length, "at least one published post must exist for the OG contract").toBeGreaterThanOrEqual(1);

    const cases = [
      { path: "/", ogType: "website", locale: "en_RW" },
      { path: "/services", ogType: "website", locale: undefined },
      { path: `/blog/${slugs[0]}`, ogType: "article", locale: undefined }, // blog posts emit og:type article (SEO phase 3)
    ] as const;

    for (const c of cases) {
      await page.goto(c.path);

      const canonical = (await page.locator('link[rel="canonical"]').getAttribute("href")) ?? "";
      expect(canonical, `canonical on ${c.path}`).toBeTruthy();

      await expect(page.locator(`meta[property="og:title"]`), `og:title on ${c.path}`).toHaveCount(1);
      await expect(page.locator(`meta[property="og:description"]`), `og:description on ${c.path}`).toHaveCount(1);

      expect(await metaProp(page, "og:title"), `og:title non-empty on ${c.path}`).not.toBe("");
      expect(await metaProp(page, "og:description"), `og:description non-empty on ${c.path}`).not.toBe("");
      expect(await metaProp(page, "og:url"), `og:url === canonical on ${c.path}`).toBe(canonical);
      expect(await metaProp(page, "og:type"), `og:type on ${c.path}`).toBe(c.ogType);
      expect(await metaProp(page, "og:image"), `og:image === OG_IMAGE on ${c.path}`).toBe(OG_IMAGE);
      expect(await metaName(page, "twitter:card"), `twitter:card on ${c.path}`).toBe("summary_large_image");
      expect(await metaName(page, "twitter:image"), `twitter:image === OG_IMAGE on ${c.path}`).toBe(OG_IMAGE);

      if (c.locale) {
        expect(await metaProp(page, "og:locale"), `og:locale on ${c.path}`).toBe("en_RW");
      }
    }
  });

  test("robots.txt blocks auth/admin surfaces and points at the sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] ?? "", "robots.txt must be text/plain").toContain("text/plain");
    const body = await res.text();

    for (const disallowed of ["/admin", "/login", "/account", "/track/"]) {
      expect(body, `robots.txt must disallow ${disallowed}`).toContain(`Disallow: ${disallowed}`);
    }
    expect(body).toContain(`Sitemap: ${absoluteUrl("/sitemap.xml")}`);
  });

  test("sitemap.xml lists the 8 static routes plus every published blog post", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.startsWith("<?xml"), "sitemap must be XML").toBe(true);
    expect(body).toContain("<urlset");
    expect(body).toContain("</urlset>");

    // The 8 static entries (routes, not data — safe to enumerate).
    for (const path of PUBLIC_PAGES) {
      expect(body, `sitemap must contain ${absoluteUrl(path)}`).toContain(absoluteUrl(path));
    }

    // Blog inventory — read live from /public/posts (fresh-seed-safe: the
    // repro rebuilds the frontend right after seeding, so the static sitemap
    // and the API always agree on the fresh seed, whatever the seed size).
    const ownerSlugs = await ownerPostSlugs(request);
    for (const slug of ownerSlugs) {
      expect(body, `sitemap must advertise /blog/${slug}`).toContain(absoluteUrl(`/blog/${slug}`));
    }

    // Set-equality backstop: every /blog/ loc in the sitemap corresponds to a
    // live published (non-fixture) post and vice versa — no orphan URLs baked
    // in, no published post missing from the sitemap.
    const blogSlugs = [...body.matchAll(/<loc>([^<]*\/blog\/[^<]*)<\/loc>/g)].map((m) =>
      (m[1] ?? "").replace(/\/$/, "").split("/").pop() ?? "",
    );
    expect(new Set(blogSlugs), "sitemap blog set must match the live published set").toEqual(
      new Set(ownerSlugs),
    );

    // Auth/admin surfaces never leak into the sitemap (`/track/` keeps its
    // trailing slash: the crawlable /track landing page is fine as `/track`).
    for (const banned of ["/admin", "/login", "/account", "/track/"]) {
      expect(body, `sitemap must not contain ${banned}`).not.toContain(banned);
    }
  });

  test("JSON-LD blocks parse and carry the per-page schema types", async ({ page, request }) => {
    // Home: LocalBusiness (rendered as an array ["LocalBusiness","ProfessionalService"]).
    await page.goto("/");
    let blocks = await parseJsonLd(page);
    expect(blocks.some((b) => hasType(b, "LocalBusiness")), "home must emit a LocalBusiness block").toBe(true);

    // /services: ItemList whose elements include at least one Service.
    await page.goto("/services");
    blocks = await parseJsonLd(page);
    const svcList = blocks.find((b) => hasType(b, "ItemList") && Array.isArray(b.itemListElement));
    expect(svcList, "/services must emit an ItemList").toBeTruthy();
    expect(
      (svcList!.itemListElement as JsonLdBlock[]).some((it) => hasType(it, "Service")),
      "/services ItemList must contain at least one Service",
    ).toBe(true);

    // One live published post: Article + BreadcrumbList.
    const slugs = await ownerPostSlugs(request);
    expect(slugs.length, "at least one published post must exist for the JSON-LD check").toBeGreaterThanOrEqual(1);
    await page.goto(`/blog/${slugs[0]}`);
    blocks = await parseJsonLd(page);
    expect(blocks.some((b) => hasType(b, "Article")), "post must emit an Article block").toBe(true);
    expect(blocks.some((b) => hasType(b, "BreadcrumbList")), "post must emit a BreadcrumbList block").toBe(true);

    // /blog index: BreadcrumbList (an ItemList of BlogPosting also renders
    // while the backend is reachable, but BreadcrumbList is the invariant).
    await page.goto("/blog");
    blocks = await parseJsonLd(page);
    expect(blocks.some((b) => hasType(b, "BreadcrumbList")), "/blog must emit a BreadcrumbList block").toBe(true);

    // /portfolio: ItemList of CreativeWork.
    await page.goto("/portfolio");
    blocks = await parseJsonLd(page);
    const pfList = blocks.find((b) => hasType(b, "ItemList") && Array.isArray(b.itemListElement));
    expect(pfList, "/portfolio must emit an ItemList").toBeTruthy();
    expect(
      (pfList!.itemListElement as JsonLdBlock[]).some((it) => hasType(it, "CreativeWork")),
      "/portfolio ItemList must contain at least one CreativeWork",
    ).toBe(true);
  });

  test("login / account / admin are noindex, nofollow", async ({ page }) => {
    // /account redirects to /login when unauthenticated (client-side) — both
    // pages carry the identical robots directive, so the assertion is safe on
    // either side of the redirect. Next's soft navigation can briefly leave
    // BOTH pages' robots metas in the head (a known metadata-outlet artefact),
    // so assert on EVERY robots meta present instead of pinning a count of 1.
    // /admin gates client-side with the same admin-layout robots meta (no
    // server redirect today; if one ever lands, /admin/login also inherits the
    // admin layout's noindex).
    for (const path of ["/login", "/account", "/admin"]) {
      await page.goto(path);
      const contents = await page
        .locator('meta[name="robots"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute("content") ?? ""));
      expect(contents.length, `robots meta must exist on ${path}`).toBeGreaterThanOrEqual(1);
      for (const content of contents) {
        expect(content, `robots content on ${path}`).toContain("noindex");
        expect(content, `robots content on ${path}`).toContain("nofollow");
      }
    }
  });

  /**
   * Cloudflare edge-transform guard — Rocket Loader + email obfuscation.
   *
   * Both features rewrite the response at Cloudflare's edge and break this app
   * in ways that never surface locally:
   *
   *  - Email Obfuscation replaces email text nodes with `data-cfemail`
   *    ciphertext and relies on a cdnjs.cloudflare.com decoder script. Our CSP
   *    blocks that CDN, so if the feature were ever enabled the address would
   *    stay encrypted forever and the contact page CTA would read as a hex
   *    string. `/contact` renders hello@… as its PRIMARY call to action, so
   *    that is a revenue-path break, not cosmetic.
   *  - Rocket Loader adds `data-cfasync="false"` to every <script>, inverting
   *    the ordered execution Next's RSC hydration depends on. This one is NOT
   *    mitigated by the CSP: the attribute rewrite happens before CSP is even
   *    evaluated, so blocking the bootstrap script cannot undo it.
   *
   * Tier 1 runs everywhere (it asserts OUR header, so it has teeth on
   * localhost). Tier 2 requires E2E_BASE_URL, because Cloudflare is not in the
   * localhost request path and a local run could never observe either feature.
   */
  const CDN = "cdnjs.cloudflare.com";
  const CONTACT_EMAIL = "hello@creativesoundstudio.rw";

  test("CSP keeps the Cloudflare CDN out of script-src", async ({ request }) => {
    for (const path of ["/", "/contact"]) {
      const res = await request.get(path);
      expect(res.status(), `${path} must respond`).toBe(200);
      const csp = res.headers()["content-security-policy"] ?? "";
      expect(csp, `CSP header must be present on ${path}`).not.toBe("");
      expect(csp, `script-src must be self-only on ${path}`).toContain("script-src 'self'");
      // The safety net for email obfuscation: its decoder is on the Cloudflare
      // CDN, so allowing that origin would re-enable the encrypted-text failure.
      expect(csp, `CSP must not allow ${CDN} on ${path}`).not.toContain(CDN);
    }
  });

  test("Cloudflare injects no Rocket Loader / email-obfuscation transforms", async ({ request }) => {
    test.skip(
      !RUNS_AGAINST_PROD,
      "edge transforms only exist behind Cloudflare — set E2E_BASE_URL=https://<domain> to enforce",
    );

    for (const path of ["/", "/contact"]) {
      const res = await request.get(path);
      const html = await res.text();

      expect(html, `no email obfuscation on ${path}`).not.toContain("data-cfemail");
      expect(html, `no Rocket Loader on ${path}`).not.toContain("data-cfasync");
      expect(html, `no Cloudflare obfuscation spans on ${path}`).not.toContain("__cf_email__");
      expect(html, `no Cloudflare CDN script on ${path}`).not.toContain(CDN);
    }

    // The positive assertion: the address must be real, readable text. The
    // negative checks above only prove absence — this proves the email still
    // renders, which is what the contact CTA depends on.
    const contact = await request.get("/contact");
    expect(await contact.text(), "/contact must render the contact email as plain text").toContain(CONTACT_EMAIL);
  });
});