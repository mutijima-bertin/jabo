import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { API } from "./auth";
import { OG_IMAGE, PAGE_META, SITE_TITLE, absoluteUrl, localeAlternates, type MetaKey } from "../src/lib/seo";
import {
  DEFAULT_LOCALE,
  LOCALES,
  OG_LOCALES,
  PUBLIC_PATHS,
  isLocale,
  localizedPath,
  type Locale,
} from "../src/lib/locale";
import { BRAND } from "../src/lib/constants";

/**
 * seo.spec.ts — SEO contract e2e for the locale-URL era.
 *
 * Asserts the machine-readable surface the SEO phases shipped: per-page
 * title/description/canonical contract, hreflang reciprocity, per-route
 * og:locale, OG/Twitter metadata on the money pages, robots.txt crawl policy,
 * sitemap.xml completeness, parseable JSON-LD per page, and noindex on
 * auth/admin surfaces.
 *
 * WHAT THE LOCALE REFACTOR CHANGED IN THIS CONTRACT — the whole point of
 * moving the 8 marketing pages under `[locale]`:
 *
 *  - Titles, descriptions and canonicals are now PER LOCALE, and the canonical
 *    is SELF-referential. `/en/about` points at `/en/about` and `/rw/about`
 *    points at `/rw/about`. hreflang — not canonical — is the mechanism for
 *    "same page, two languages"; cross-canonicalising would deindex one of
 *    them, which is the single most damaging thing this refactor could get
 *    wrong, so it is asserted explicitly in both directions below.
 *  - `alternates.languages` must expose BOTH locales plus an `x-default`, and
 *    must be RECIPROCAL: the `rw` alternate on `/en/x` has to equal the
 *    canonical that `/rw/x` serves. One-way hreflang is a silent, common
 *    failure (the cluster still parses, the SEO still works, the assertion on
 *    "count === 1" still passes) so reciprocity is checked by comparing
 *    values across the two pages, not by counting tags.
 *  - `og:locale` tracks the route: `en_RW` on `/en/*`, `rw_RW` on `/rw/*`.
 *    It used to be the hardcoded `en_RW` on every page, which told every
 *    social scraper the Kinyarwanda pages were English.
 *  - The sitemap carries BOTH locale variants of every marketing route and
 *    every blog post, and `/track` stays BARE with no locale pair.
 *  - `/rw/blog/<slug>` serves the post's `titleRw`/`excerptRw`. Those DB
 *    columns existed and were unreachable by any search engine before the
 *    locale became addressable.
 *
 * THE CARDINAL RULE — fresh-seed-safe + relational. This spec must pass on a
 * freshly seeded CI database AND on the accumulated dev DB:
 *
 *  - NO hardcoded counts. The sitemap expectations are READ from the live
 *    `/public/posts` API (never a number or literals list), and every
 *    canonical/alternate/metadata expectation is DERIVED by calling
 *    `frontend/src/lib/seo.ts` + `frontend/src/lib/locale.ts` (pure TS —
 *    Playwright resolves their imports via tsconfig paths). Adding a locale is
 *    a change to those two modules, not to this file.
 *  - The only enumerated list is the static route set, and even that is
 *    imported from `PUBLIC_PATHS` rather than retyped. Blog inventory is
 *    always live-derived.
 *  - E2E fixtures created concurrently by sibling specs (blog/publication,
 *    responsive blog, bookings-from-content) carry self-identifying slug
 *    prefixes — e2e-, responsive-, cta- — and live only for the duration of
 *    THEIR test. They are filtered out of the "expected content" set exactly
 *    like the other suites' isE2e* filters, so the static sitemap is compared
 *    ONLY against real owner content and the suite stays race-free under
 *    `fullyParallel`.
 *  - READ-ONLY. No test in this file writes anything. docs/OPERATIONS.md
 *    relies on that to point this spec at production.
 */

interface PostSummary {
  slug: string;
  titleEn: string;
  titleRw: string;
  excerptEn: string | null;
  excerptRw: string | null;
}

/** `/about` → "about"; "/" → "home". The PAGE_META key for a bare route. */
const metaKeyFor = (path: string): MetaKey => (path === "/" ? "home" : (path.slice(1) as MetaKey));

/** One entry of the public-URL contract: what to navigate to, and what the
 *  page must then say about itself. `locale: null` marks a deliberately BARE
 *  route — one with no locale segment and therefore no localized metadata. */
interface PublicPage {
  /** Path exactly as a browser sees it. */
  path: string;
  /** The locale this path serves, or null for a deliberately-bare route. */
  locale: Locale | null;
  /** Absolute URL the single <link rel=canonical> must carry. */
  canonical: string;
  /** PAGE_META copy key, or null when the route has no localized metadata. */
  key: MetaKey | null;
}

/**
 * The 8-route contract, updated to the localized reality.
 *
 * `PUBLIC_PATHS` (lib/locale.ts) is the 7 locale-PREFIXED marketing routes and
 * is the single source of truth for them, so it is imported rather than retyped
 * — the loop below expands it across every locale. `/track` is the 8th and the
 * one deliberate exception: it is emailed to clients as a magic link, so
 * prefixing it would break every link already sitting in an inbox. It has
 * exactly ONE url, no locale and no localized metadata.
 */
const PUBLIC_PAGES: readonly PublicPage[] = [
  ...LOCALES.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      path: localizedPath(locale, path),
      locale,
      canonical: absoluteUrl(path, locale),
      key: metaKeyFor(path),
    })),
  ),
  { path: "/track", locale: null, canonical: absoluteUrl("/track"), key: null },
];

/**
 * True only when E2E_BASE_URL points at a non-localhost origin. Gates the checks
 * that assert on Cloudflare's edge behaviour — those are unreachable from
 * localhost by definition, so they must report as SKIPPED (honest: no coverage)
 * rather than PASSED (a false claim of coverage).
 */
const RUNS_AGAINST_PROD = /^https?:\/\/(?!localhost\b|127\.0\.0\.1)/.test(process.env.E2E_BASE_URL ?? "");

/**
 * Next.js metadata rendering strips a single trailing slash from URL-shaped
 * fields. Defensive now that the homepage moved off "/" (no canonical in the
 * localized set ends in a slash), but kept so a future route that does would
 * fail on its real contract rather than on this normalizer.
 */
const stripTrailingSlash = (u: string): string => (u.length > 1 ? u.replace(/\/$/, "") : u);

/**
 * Recognize E2E-authored posts from sibling specs (self-identifying slug
 * prefixes, mirroring the isE2ePortfolio/isE2eAuthored filters elsewhere).
 * These are transient fixtures — never part of the content set a build-time
 * sitemap advertises. Filtering is by PREFIX, never by count.
 */
const isFixturePost = (p: PostSummary): boolean =>
  /^(e2e-|responsive-|cta-)/.test(p.slug) || p.titleEn.startsWith("E2E ");

async function publicGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(`${API}${path}`);
  if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Published, non-fixture blog slugs — the "real" content of the day. */
async function ownerPosts(request: APIRequestContext): Promise<PostSummary[]> {
  const posts = await publicGet<PostSummary[]>(request, "/public/posts");
  return posts.filter((p) => !isFixturePost(p));
}

async function ownerPostSlugs(request: APIRequestContext): Promise<string[]> {
  return (await ownerPosts(request)).map((p) => p.slug);
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

/** Everything the SEO contract needs out of <head>, in ONE round trip.
 *
 * The per-page sweeps below navigate 14–18 times each, and reading each fact
 * with its own `getAttribute` costs a full protocol round trip per tag — five
 * hreflangs plus a canonical plus a description is seven, which was enough to
 * push the reciprocity sweep past Playwright's 30s default under
 * `fullyParallel`. One `evaluate` per page keeps the sweeps comfortably fast
 * without raising a single timeout.
 *
 * Note `canonical`/`alternates` are ARRAYS, not scalars: "exactly one
 * canonical" is a contract this file asserts, and collapsing the duplicates
 * here would hide the failure instead of reporting it.
 */
interface HeadFacts {
  title: string;
  description: string;
  canonical: string[];
  /** hreflang → href. Duplicates collapse, so a doubled key is caught by the
   *  per-key COUNT check below rather than by an array comparison. */
  alternates: Record<string, string>;
  canonicalCount: number;
  alternateCounts: Record<string, number>;
  ogLocale: string;
  ogUrl: string;
  ogType: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterImage: string;
  robots: string[];
}

const readHead = (page: Page): Promise<HeadFacts> =>
  page.evaluate(() => {
    const content = (sel: string): string[] =>
      [...document.querySelectorAll<HTMLMetaElement>(sel)].map((m) => m.content);
    const alternates = [...document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"]')];
    const canonicals = [...document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]')];
    const hreflangs = alternates.map((l) => l.getAttribute("hreflang") ?? "");
    const counts = (keys: string[]): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const k of [...new Set(keys)]) out[k] = keys.filter((x) => x === k).length;
      return out;
    };
    return {
      title: document.title,
      description: content('meta[name="description"]')[0] ?? "",
      canonical: canonicals.map((l) => l.href),
      canonicalCount: canonicals.length,
      alternates: Object.fromEntries(alternates.map((l) => [l.getAttribute("hreflang") ?? "", l.href])),
      alternateCounts: counts(hreflangs),
      ogLocale: content('meta[property="og:locale"]')[0] ?? "",
      ogUrl: content('meta[property="og:url"]')[0] ?? "",
      ogType: content('meta[property="og:type"]')[0] ?? "",
      ogTitle: content('meta[property="og:title"]')[0] ?? "",
      ogDescription: content('meta[property="og:description"]')[0] ?? "",
      ogImage: content('meta[property="og:image"]')[0] ?? "",
      twitterCard: content('meta[name="twitter:card"]')[0] ?? "",
      twitterImage: content('meta[name="twitter:image"]')[0] ?? "",
      robots: content('meta[name="robots"]'),
    };
  });

/**
 * Timeouts for the whole-page sweeps.
 *
 * These tests navigate every route in both locales (14–18 full SSR page loads,
 * each awaiting several `no-store` backend fetches) while the rest of the suite
 * runs in parallel workers on the same box. Playwright's 30s default measures
 * the SUM of that, not the health of any one page, so it fails on load rather
 * than on contract. Budgeted per sweep, deliberately — raising it globally would
 * also mask a genuinely hung page everywhere else.
 */
const SWEEP_TIMEOUT = 120_000;

test.describe("SEO contract", () => {
  // ---------------------------------------------------------------------------
  // 1. Per-locale title / description / canonical.
  // ---------------------------------------------------------------------------
  test("every public page renders the localized title / description / self-canonical", async ({ page }) => {
    test.setTimeout(SWEEP_TIMEOUT);
    for (const target of PUBLIC_PAGES) {
      const { path, canonical, key, locale } = target;
      await page.goto(path);

      const head = await readHead(page);
      const { title, description: desc } = head;

      if (key !== null && locale !== null) {
        const copy = PAGE_META[key][locale];

        // The homepage declares `title.absolute`, so the root's
        // `%s — <brand>` template must NOT be re-applied on top of it — that
        // produced "Creative Sound Studio — … — Creative Sound Studio" before
        // the refactor. Every OTHER localized page exports the bare keyword and
        // IS templated, with the brand appended exactly once.
        if (key === "home") {
          expect(title, `home <title> must be the localized brand headline (${path})`).toBe(copy.title);
          expect(
            (title.match(new RegExp(BRAND, "g")) ?? []).length,
            `brand must appear exactly once in the home <title> (${path})`,
          ).toBe(1);
          expect(title).not.toMatch(/— Creative Sound Studio —/);
        } else {
          expect(title, `templated <title> on ${path}`).toBe(`${copy.title} — ${BRAND}`);
        }

        // EXACT description, not just "some description": this is the localized
        // copy from PAGE_META, the same module the page itself imports.
        expect(desc, `meta description on ${path} must be the ${locale} copy`).toBe(copy.description);
      } else {
        // /track — the one bare route. Templated title and its own description
        // (no localized variant exists, and none should be invented).
        expect(title, `templated <title> on ${path}`).toMatch(new RegExp(`^.+ — ${BRAND}$`));
        expect(desc, `meta description on ${path} must exist`).not.toBe("");
      }

      // 50–165 character envelope (search engines truncate around 160).
      expect(desc.length, `meta description length on ${path}`).toBeGreaterThanOrEqual(50);
      expect(desc.length, `meta description length on ${path}`).toBeLessThanOrEqual(165);

      // EXACTLY ONE canonical, equal to the absolute URL of THIS locale's URL.
      expect(head.canonicalCount, `single canonical on ${path}`).toBe(1);
      const href = head.canonical[0]!;
      expect(href, `canonical href on ${path} must be absolute`).toBeTruthy();
      expect(stripTrailingSlash(href), `canonical on ${path} must be self-referential`).toBe(
        stripTrailingSlash(canonical),
      );

      // Never cross-locale. Stated separately from the equality above so a
      // regression names the actual defect ("/en/about canonicalised to
      // /rw/about") instead of just reporting two unequal strings.
      for (const other of LOCALES.filter((l) => l !== locale)) {
        expect(href, `canonical on ${path} must never point at /${other}`).not.toContain(`/${other}`);
      }
    }
  });

  test("homepage <title> is the exact brand headline per locale — never a suffixed template", async ({ page }) => {
    // EN: the SITE_TITLE constant itself.
    await page.goto(localizedPath("en", "/"));
    expect(await page.title()).toBe(SITE_TITLE);

    // RW: the Kinyarwanda headline from PAGE_META — the reason the refactor
    // exists. Before it, every crawler saw the English string at every URL.
    await page.goto(localizedPath("rw", "/"));
    const rwTitle = await page.title();
    expect(rwTitle).toBe(PAGE_META.home.rw.title);
    expect(rwTitle).not.toBe(SITE_TITLE);
    expect((rwTitle.match(new RegExp(BRAND, "g")) ?? []).length, "brand appears exactly once").toBe(1);
    expect(rwTitle).not.toMatch(/— Creative Sound Studio —/);
  });

  // ---------------------------------------------------------------------------
  // 2. hreflang: both locales + x-default, and RECIPROCALITY.
  // ---------------------------------------------------------------------------
  test("every localized page advertises both locales plus x-default, reciprocally", async ({ page }) => {
    test.setTimeout(SWEEP_TIMEOUT);
    for (const bare of PUBLIC_PATHS) {
      const expected = localeAlternates(bare);

      // `x-default` points at the EN URL, never at a bare "/": the root now
      // 308-redirects, and pointing the fallback at a redirect tells Google the
      // redirect is the canonical fallback for every locale.
      expect(expected["x-default"], `x-default for ${bare}`).toBe(absoluteUrl(bare, "en"));

      /** Per-locale observations, so reciprocity below is a pure value
       *  comparison instead of a second round of navigations. */
      const seen: Record<string, { canonical: string; alternates: Record<string, string> }> = {};

      for (const locale of LOCALES) {
        const path = localizedPath(locale, bare);
        await page.goto(path);
        const head = await readHead(page);

        for (const hreflang of [...LOCALES, "x-default"]) {
          expect(head.alternateCounts[hreflang] ?? 0, `exactly one hreflang="${hreflang}" on ${path}`).toBe(1);
          expect(
            stripTrailingSlash(head.alternates[hreflang] ?? ""),
            `hreflang="${hreflang}" on ${path} must match localeAlternates(${bare})`,
          ).toBe(stripTrailingSlash(expected[hreflang]!));
        }

        seen[locale] = {
          canonical: stripTrailingSlash(head.canonical[0] ?? ""),
          alternates: Object.fromEntries(
            Object.entries(head.alternates).map(([k, v]) => [k, stripTrailingSlash(v)]),
          ),
        };
      }

      // RECIPROCITY. The alternate a page advertises for the OTHER locale must
      // be exactly the canonical that other locale's page serves — in both
      // directions. Asserted by comparing values across the two pages, because
      // a one-way hreflang cluster still renders one <link> per language and
      // would sail past any count-based check.
      for (const locale of LOCALES) {
        for (const other of LOCALES.filter((l) => l !== locale)) {
          expect(
            seen[locale]!.alternates[other],
            `the ${other} alternate advertised on ${localizedPath(locale, bare)} must equal the canonical served by ${localizedPath(other, bare)}`,
          ).toBe(seen[other]!.canonical);
        }
      }
    }
  });

  test("hreflang sets contain exactly the locale vocabulary — no invented language keys", async ({ page }) => {
    test.setTimeout(SWEEP_TIMEOUT);
    // Guard against a stale/typo'd hreflang key surviving the refactor: an
    // hreflang cluster pointing at a 404 is worse than no cluster at all, and
    // it is invisible to every other assertion in this file (the per-page
    // checks only assert that the EXPECTED keys are present, not that no
    // extra ones are). Asserted as an exact key SET, over every marketing
    // route in both locales — not just /services.
    for (const locale of LOCALES) {
      for (const bare of PUBLIC_PATHS) {
        await page.goto(localizedPath(locale, bare));
        const head = await readHead(page);
        expect(
          new Set(Object.keys(head.alternates)),
          `hreflang set on /${locale}${bare === "/" ? "" : bare}`,
        ).toEqual(new Set([...LOCALES, "x-default"]));
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 3. og:locale tracks the route.
  // ---------------------------------------------------------------------------
  test("og:locale follows the route's locale, not a hardcoded en_RW", async ({ page, request }) => {
    test.setTimeout(SWEEP_TIMEOUT);
    // Pin the map itself first: og:locale is Open Graph's
    // `language_TERRITORY` form, so a bare "rw" is a common and silent
    // mistake that still renders a <meta> tag.
    expect(OG_LOCALES).toEqual({ en: "en_RW", rw: "rw_RW" });

    const slugs = await ownerPostSlugs(request);
    expect(slugs.length, "at least one published post for the og:locale sweep").toBeGreaterThanOrEqual(1);

    /** og:locale per bare route, so the two locales of the SAME page can be
     *  compared directly. A hardcoded `en_RW` on every page — what this file
     *  used to assert — is exactly what "the two locales differ" rules out. */
    const byRoute = new Map<string, Record<string, string>>();
    const paths: { locale: Locale; path: string; bare: string }[] = [
      ...LOCALES.flatMap((locale) =>
        [...PUBLIC_PATHS, `/blog/${slugs[0]}`].map((bare) => ({
          locale,
          bare,
          path: localizedPath(locale, bare),
        })),
      ),
    ];

    for (const { locale, path, bare } of paths) {
      await page.goto(path);
      const head = await readHead(page);

      expect(head.ogLocale, `og:locale on ${path}`).toBe(OG_LOCALES[locale]);
      // og:url is the same self-canonical as <link rel=canonical> — a page
      // whose social card points at the other language is the og:locale bug in
      // a second disguise.
      expect(stripTrailingSlash(head.ogUrl), `og:url must be self-referential on ${path}`).toBe(
        stripTrailingSlash(head.canonical[0] ?? ""),
      );

      byRoute.set(bare, { ...(byRoute.get(bare) ?? {}), [locale]: head.ogLocale });
    }

    // Every route's two locales must advertise DIFFERENT og:locale values.
    for (const [bare, pair] of byRoute) {
      expect(pair["en"], `og:locale for /en${bare}`).toBe(OG_LOCALES.en);
      expect(pair["rw"], `og:locale for /rw${bare}`).toBe(OG_LOCALES.rw);
      expect(pair["en"], `og:locale must differ between the two locales of ${bare}`).not.toBe(pair["rw"]);
    }
    expect(byRoute.size, "og:locale checked across every route plus a post").toBe(PUBLIC_PATHS.length + 1);
  });

  // ---------------------------------------------------------------------------
  // 4. Kinyarwanda blog metadata — the columns the refactor made reachable.
  // ---------------------------------------------------------------------------
  test("/rw/blog/<slug> serves titleRw + excerptRw; /en/blog/<slug> the English pair", async ({ page, request }) => {
    // Derive the fixture from live data, never a hardcoded slug: pick an owner
    // post whose RW title AND RW excerpt are actually populated and actually
    // DIFFERENT from the English ones, so "the rw page served the English
    // string" cannot pass. (excerptRw is nullable in the schema and
    // titleRw falls back to titleEn when blank — the page does
    // `description = excerptRw ?? titleRw`, so a post with no RW excerpt would
    // make this assertion vacuous.)
    const posts = await ownerPosts(request);
    const translated = posts.filter(
      (p) =>
        p.titleRw.length > 0 &&
        p.titleRw !== p.titleEn &&
        p.excerptRw !== null &&
        p.excerptRw.length > 0 &&
        p.excerptRw !== p.excerptEn,
    );
    expect(
      translated.length,
      "at least one published post must carry distinct Kinyarwanda title+excerpt",
    ).toBeGreaterThanOrEqual(1);
    const post = translated[0]!;

    const seen: Record<string, { title: string; desc: string }> = {};

    for (const locale of LOCALES) {
      const path = localizedPath(locale, `/blog/${post.slug}`);
      await page.goto(path);
      const head = await readHead(page);
      seen[locale] = { title: head.title, desc: head.description };

      if (locale === "rw") {
        expect(head.title, `/rw/blog/<slug> <title> must carry titleRw`).toContain(post.titleRw);
        expect(head.title, "/rw/blog/<slug> <title> must not be the English headline").not.toContain(post.titleEn);
        expect(head.description, "/rw/blog/<slug> description must be excerptRw").toBe(post.excerptRw);
        // og:title for a post is `${title} — ${BRAND}` (seo.ts postMetadata), so
        // the Kinyarwanda headline has to reach the social card too.
        expect(head.ogTitle, "/rw/blog/<slug> og:title must carry titleRw").toContain(post.titleRw);
      } else {
        expect(head.title, "/en/blog/<slug> <title> must carry titleEn").toContain(post.titleEn);
        expect(head.description, "/en/blog/<slug> description must be excerptEn").toBe(post.excerptEn);
      }
    }

    // The two locales must genuinely differ — otherwise "the rw page served
    // the English string" would have been caught by the contains-assertions
    // above only by accident of the fixture.
    expect(seen.rw!.title).not.toBe(seen.en!.title);
    expect(seen.rw!.desc).not.toBe(seen.en!.desc);
  });

  // ---------------------------------------------------------------------------
  // 5. Money pages: OG + Twitter.
  // ---------------------------------------------------------------------------
  test("money pages carry full OG + Twitter card metadata aligned to seo.ts", async ({ page, request }) => {
    // Live post for the third case — read from the API, never hardcoded.
    const slugs = await ownerPostSlugs(request);
    expect(slugs.length, "at least one published post must exist for the OG contract").toBeGreaterThanOrEqual(1);

    const cases = [
      { path: localizedPath("en", "/"), ogType: "website", locale: "en_RW" },
      { path: localizedPath("en", "/services"), ogType: "website", locale: undefined },
      { path: localizedPath("en", `/blog/${slugs[0]}`), ogType: "article", locale: undefined }, // blog posts emit og:type article (SEO phase 3)
    ] as const;

    for (const c of cases) {
      await page.goto(c.path);
      const head = await readHead(page);
      const canonical = head.canonical[0] ?? "";

      expect(canonical, `canonical on ${c.path}`).toBeTruthy();

      expect(head.ogTitle, `og:title non-empty on ${c.path}`).not.toBe("");
      expect(head.ogDescription, `og:description non-empty on ${c.path}`).not.toBe("");
      expect(head.ogUrl, `og:url === canonical on ${c.path}`).toBe(canonical);
      expect(head.ogType, `og:type on ${c.path}`).toBe(c.ogType);
      expect(head.ogImage, `og:image === OG_IMAGE on ${c.path}`).toBe(OG_IMAGE);
      expect(head.twitterCard, `twitter:card on ${c.path}`).toBe("summary_large_image");
      expect(head.twitterImage, `twitter:image === OG_IMAGE on ${c.path}`).toBe(OG_IMAGE);

      if (c.locale) {
        expect(head.ogLocale, `og:locale on ${c.path}`).toBe(c.locale);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 6. robots.txt — crawl policy. BARE paths, unchanged by the refactor.
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // 7. sitemap.xml — both locale variants of every route and post.
  // ---------------------------------------------------------------------------
  test("sitemap.xml lists both locale variants of every route and blog post, and /track bare", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.startsWith("<?xml"), "sitemap must be XML").toBe(true);
    expect(body).toContain("<urlset");
    expect(body).toContain("</urlset>");

    /** Every <url> entry, with its <loc> and its xhtml:link alternates. */
    const entries = [...body.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
      const block = m[1] ?? "";
      return {
        block,
        loc: (/<loc>([^<]*)<\/loc>/.exec(block)?.[1] ?? "").trim(),
        alternates: Object.fromEntries(
          [...block.matchAll(/<xhtml:link[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)].map((a) => [
            a[1]!,
            a[2]!,
          ]),
        ),
      };
    });
    expect(entries.length, "sitemap must have at least one <url> entry").toBeGreaterThan(0);

    const locs = new Set(entries.map((e) => stripTrailingSlash(e.loc)));

    // Both locale variants of all 7 static marketing routes. Emitting only the
    // EN one would tell Google the Kinyarwanda URLs exist merely if something
    // else happens to link them.
    for (const bare of PUBLIC_PATHS) {
      for (const locale of LOCALES) {
        const url = stripTrailingSlash(absoluteUrl(bare, locale));
        expect(locs, `sitemap must contain the ${locale} variant of ${bare}`).toContain(url);
      }
    }

    // /track is the deliberate exception: ONE bare entry, never a locale pair.
    // (It is crawlable — robots.txt only blocks /track/, the tokenized view.)
    expect(locs, "sitemap must contain the bare /track").toContain(stripTrailingSlash(absoluteUrl("/track")));
    for (const locale of LOCALES) {
      expect(
        locs,
        `/track must NOT be advertised as /${locale}/track — the magic link is bare`,
      ).not.toContain(stripTrailingSlash(absoluteUrl("/track", locale)));
    }

    // Blog inventory — read live from /public/posts (fresh-seed-safe: the
    // repro rebuilds the frontend right after seeding, so the static sitemap
    // and the API always agree on the fresh seed, whatever the seed size).
    const ownerSlugs = await ownerPostSlugs(request);
    for (const slug of ownerSlugs) {
      for (const locale of LOCALES) {
        const url = stripTrailingSlash(absoluteUrl(`/blog/${slug}`, locale));
        expect(locs, `sitemap must advertise the ${locale} variant of /blog/${slug}`).toContain(url);
      }
    }

    // Set-equality backstop, PER LOCALE: every /blog/ loc in the sitemap
    // corresponds to a live published (non-fixture) post and vice versa — no
    // orphan URLs baked in, no published post missing, and (via the count)
    // no locale variant silently dropped for one post only.
    for (const locale of LOCALES) {
      const blogSlugs = entries
        .filter((e) => e.loc.includes(`/${locale}/blog/`))
        .map((e) => e.loc.replace(/\/$/, "").split("/").pop() ?? "");
      expect(new Set(blogSlugs), `sitemap /${locale}/blog set must match the live published set`).toEqual(
        new Set(ownerSlugs),
      );
      expect(blogSlugs.length, `every post must appear once per locale (/${locale}/blog)`).toBe(ownerSlugs.length);
    }

    // No UNLOCALIZED marketing URL may survive in the sitemap: after the
    // refactor `https://site/about` and `https://site/blog/x` are dead URLs
    // (bare /about 404s), and advertising them would burn crawl budget on 404s.
    for (const e of entries) {
      const segments = new URL(e.loc).pathname.split("/").filter(Boolean);
      const localized = segments.length > 0 && isLocale(segments[0]!);
      const isBareTrack = e.loc === absoluteUrl("/track");
      expect(localized || isBareTrack, `sitemap loc ${e.loc} must be locale-prefixed or the bare /track`).toBe(
        true,
      );
    }

    // Auth/admin surfaces never leak into the sitemap (`/track/` keeps its
    // trailing slash: the crawlable /track landing page is fine as `/track`).
    for (const banned of ["/admin", "/login", "/account", "/track/"]) {
      expect(body, `sitemap must not contain ${banned}`).not.toContain(banned);
    }
  });

  test("every sitemap entry carries an alternates.languages block matching its route", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();

    /** `/en/blog/x` → "/blog/x"; "/en" → "/". Inverse of localizedPath(). */
    const barePathOf = (loc: string): string | null => {
      const segments = new URL(loc).pathname.split("/").filter(Boolean);
      if (segments.length === 0 || !isLocale(segments[0]!)) return null; // bare route
      return `/${segments.slice(1).join("/")}`;
    };

    const checked = new Set<string>();
    let withAlternates = 0;

    for (const [, block] of [...body.matchAll(/<url>([\s\S]*?)<\/url>/g)]) {
      const loc = (/<loc>([^<]*)<\/loc>/.exec(block ?? "")?.[1] ?? "").trim();
      const bare = barePathOf(loc);
      if (bare === null) continue; // /track — bare by design, no locale pair

      const expected = localeAlternates(bare);
      const hreflangs = Object.fromEntries(
        [...(block ?? "").matchAll(/<xhtml:link[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)].map((a) => [
          a[1]!,
          a[2]!,
        ]),
      );

      expect(
        Object.keys(hreflangs).sort(),
        `sitemap ${loc} must advertise every locale + x-default`,
      ).toEqual([...LOCALES, "x-default"].sort());
      for (const hreflang of [...LOCALES, "x-default"]) {
        expect(
          stripTrailingSlash(hreflangs[hreflang] ?? ""),
          `sitemap alternate "${hreflang}" for ${loc}`,
        ).toBe(stripTrailingSlash(expected[hreflang]!));
      }

      // The sitemap and the page must advertise the SAME cluster — otherwise
      // the sitemap tells Google about an /en|/<path> pair the pages never
      // reciprocate. One sample per route is enough and keeps this cheap.
      if (!checked.has(bare)) {
        checked.add(bare);
        withAlternates++;
      }
    }

    // Both locales of all 7 marketing routes must have been represented.
    for (const bare of PUBLIC_PATHS) {
      expect(checked.has(bare), `sitemap must carry alternates for both locales of ${bare}`).toBe(true);
    }
    expect(withAlternates, "alternates were verified for every marketing route").toBeGreaterThanOrEqual(
      PUBLIC_PATHS.length,
    );
  });

  // ---------------------------------------------------------------------------
  // 8. JSON-LD per page.
  // ---------------------------------------------------------------------------
  test("JSON-LD blocks parse and carry the per-page schema types", async ({ page, request }) => {
    // Home: LocalBusiness (rendered as an array ["LocalBusiness","ProfessionalService"]).
    await page.goto(localizedPath("en", "/"));
    let blocks = await parseJsonLd(page);
    expect(blocks.some((b) => hasType(b, "LocalBusiness")), "home must emit a LocalBusiness block").toBe(true);

    // /services: ItemList whose elements include at least one Service.
    await page.goto(localizedPath("en", "/services"));
    blocks = await parseJsonLd(page);
    const svcList = blocks.find((b) => hasType(b, "ItemList") && Array.isArray(b.itemListElement));
    expect(svcList, "/en/services must emit an ItemList").toBeTruthy();
    expect(
      (svcList!.itemListElement as JsonLdBlock[]).some((it) => hasType(it, "Service")),
      "/en/services ItemList must contain at least one Service",
    ).toBe(true);

    // One live published post: Article + BreadcrumbList.
    const slugs = await ownerPostSlugs(request);
    expect(slugs.length, "at least one published post must exist for the JSON-LD check").toBeGreaterThanOrEqual(1);
    await page.goto(localizedPath("en", `/blog/${slugs[0]}`));
    blocks = await parseJsonLd(page);
    expect(blocks.some((b) => hasType(b, "Article")), "post must emit an Article block").toBe(true);
    expect(blocks.some((b) => hasType(b, "BreadcrumbList")), "post must emit a BreadcrumbList block").toBe(true);

    // /blog index: BreadcrumbList (an ItemList of BlogPosting also renders
    // while the backend is reachable, but BreadcrumbList is the invariant).
    await page.goto(localizedPath("en", "/blog"));
    blocks = await parseJsonLd(page);
    expect(
      blocks.some((b) => hasType(b, "BreadcrumbList")),
      "/en/blog must emit a BreadcrumbList block",
    ).toBe(true);

    // /portfolio: ItemList of CreativeWork.
    await page.goto(localizedPath("en", "/portfolio"));
    blocks = await parseJsonLd(page);
    const pfList = blocks.find((b) => hasType(b, "ItemList") && Array.isArray(b.itemListElement));
    expect(pfList, "/en/portfolio must emit an ItemList").toBeTruthy();
    expect(
      (pfList!.itemListElement as JsonLdBlock[]).some((it) => hasType(it, "CreativeWork")),
      "/en/portfolio ItemList must contain at least one CreativeWork",
    ).toBe(true);
  });

  test("JSON-LD for a Kinyarwanda page carries the Kinyarwanda headline", async ({ page, request }) => {
    const posts = await ownerPosts(request);
    const translated = posts.filter((p) => p.titleRw.length > 0 && p.titleRw !== p.titleEn);
    expect(translated.length, "at least one published post must carry a distinct titleRw").toBeGreaterThanOrEqual(1);
    const post = translated[0]!;

    await page.goto(localizedPath("rw", `/blog/${post.slug}`));
    const blocks = await parseJsonLd(page);

    // articleJsonLd(post, locale) headlines in the page's own language. Before
    // the refactor this was hardcoded to titleEn, so a Kinyarwanda URL
    // advertised an English headline to every consumer of the JSON-LD.
    const article = blocks.find((b) => hasType(b, "Article"));
    expect(article, "/rw/blog/<slug> must emit an Article block").toBeTruthy();
    expect(JSON.stringify(article), "Article headline must be the Kinyarwanda title").toContain(post.titleRw);
    expect(JSON.stringify(article), "Article must not headline the English title").not.toContain(post.titleEn);

    // The breadcrumb trail's URLs must be locale-prefixed too — a trail
    // pointing at bare / and /blog would advertise the dead, pre-refactor URLs.
    const trail = blocks.find((b) => hasType(b, "BreadcrumbList"));
    const trailJson = JSON.stringify(trail);
    expect(trail, "post must emit a BreadcrumbList block").toBeTruthy();
    expect(trailJson, "breadcrumb URLs must be locale-prefixed").toContain(absoluteUrl("/", "rw"));
    expect(trailJson, "breadcrumb URLs must be locale-prefixed").toContain(absoluteUrl("/blog", "rw"));
    expect(trailJson, "breadcrumbs must not point at bare pre-refactor URLs").not.toContain(`"${absoluteUrl("/blog")}"`);
  });

  // ---------------------------------------------------------------------------
  // 9. noindex on the bare auth/admin surfaces — unchanged by the refactor.
  // ---------------------------------------------------------------------------
  test("login / account / admin are noindex, nofollow", async ({ page }) => {
    // /account redirects to /login when unauthenticated (client-side) — both
    // pages carry the identical robots directive, so the assertion is safe on
    // either side of the redirect. Next's soft navigation can briefly leave
    // BOTH pages' robots metas in the head (a known metadata-outlet artefact),
    // so assert on EVERY robots meta present instead of pinning a count of 1.
    // /admin gates client-side with the same admin-layout robots meta (no
    // server redirect today; if one ever lands, /admin/login also inherits the
    // admin layout's noindex).
    //
    // These three paths are DELIBERATELY BARE — no locale segment. A locale
    // here would be a 404, and one that a future "just add /en everywhere"
    // sweep would introduce silently.
    for (const path of ["/login", "/account", "/admin"]) {
      await page.goto(path);
      const robots = (await readHead(page)).robots;
      expect(robots.length, `robots meta must exist on ${path}`).toBeGreaterThanOrEqual(1);
      for (const content of robots) {
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
  /** The live contact page, in the default locale (the one the CTA lives on). */
  const EDGE_PATHS = [localizedPath(DEFAULT_LOCALE, "/"), localizedPath(DEFAULT_LOCALE, "/contact")] as const;

  test("CSP keeps the Cloudflare CDN out of script-src", async ({ request }) => {
    for (const path of EDGE_PATHS) {
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

    for (const path of EDGE_PATHS) {
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
    const contact = await request.get(localizedPath(DEFAULT_LOCALE, "/contact"));
    expect(await contact.text(), "/en/contact must render the contact email as plain text").toContain(CONTACT_EMAIL);
  });
});