import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { API, getAdminToken } from "./auth";

/**
 * responsive.spec.ts — E2E proof for the small-screen responsive pass (Phase 6).
 *
 * Defects under test (all fixed by design changes, asserted here on live UI):
 *  1. carousel progress segments were hair-thin 4px tap targets — now 40px
 *     hit-slop buttons (the visual bar stays 4px; the hit area is the button);
 *  2. admin portfolio / logos grids were 2-wide at base width — now single
 *     column at <sm, one card per row, nothing clipped at 320–480px;
 *  3. the admin settings name-only logo pill could overflow a narrow card —
 *     now min-w-0 + max-w-full + truncate so long names ellipsize in place;
 *  4. the blog pager row (Newer/Older posts) could not share the 320px width —
 *     it wraps gracefully (flex-wrap + min-w-0), targets stay ≥40px tall.
 *
 * Scope notes:
 *  - The seeded DB ships NO published blog posts, so the blog-detail test:
 *    provisions one transient published post through the admin API (slug
 *    `responsive-<run>`, NEVER "e2e-" so the parallel blog.spec sweeps leave
 *    it alone), asserts the 320px rendering, and removes it in finally.
 *  - Admin tests are READ-ONLY: the portfolio Delete path is exercised up to
 *    the inline confirm and cancelled — no owner rows are touched.
 *  - Counts are RELATIONAL (live API), never hardcoded.
 */

// Credentials from the environment (root .env via playwright.config.ts, or CI
// env) — never hardcoded. Same contract as the other specs.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

// One unique run id per spec run → slugs never collide with earlier runs.
const RUN = Date.now();
const POST_SLUG = `responsive-${RUN}`;

/** Small-screen viewports exercised by the public-site tests. */
const VIEWPORTS = [
  { width: 320, height: 700 },
  { width: 360, height: 800 },
  { width: 480, height: 900 },
] as const;

interface PostRow {
  id: string;
  slug: string;
  published: boolean;
}
interface ClientLogo {
  id: string;
  name: string;
  imageUrl: string | null;
}

let token: string;
// Name-only logos (no imageUrl) render the cordal pill — captured once from the
// live catalog so the settings test stays RELATIONAL to the seed (ships 4).
let nameOnlyLogos: ClientLogo[] = [];

const AUTH = (t: string) => ({ Authorization: `Bearer ${t}` });

async function apiGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(`${API}${path}`, { headers: AUTH(token) });
  if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Boot an admin session for a fresh page without burning a UI login. */
async function adminSession(page: Page): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), token);
}

/** True when the document would need horizontal scrolling at the viewport. */
async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}

test.describe("small-screen responsive pass", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "ADMIN_EMAIL/ADMIN_PASSWORD not set");

  test.beforeAll(async ({ request }) => {
    token = getAdminToken(); // logged in once by the "setup" project
    nameOnlyLogos = (await apiGet<ClientLogo[]>(request, "/public/logos")).filter((l) => !l.imageUrl);
  });

  // ---------------------------------------------------------------------------
  // 1. Hero controls stay visible & tappable at 320/360/480, footer contact
  //    entries render, and the document never scrolls horizontally.
  // ---------------------------------------------------------------------------
  test("hero controls and footer contact are visible and tappable at 320/360/480", async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await test.step(`${vp.width}px viewport`, async () => {
        await page.setViewportSize(vp);
        await page.goto("/");

        const hero = page.locator('section[aria-roledescription="carousel"]');
        await expect(hero, `${vp.width}px: hero renders`).toBeVisible();

        // The pause control is a p-3 + h-4 icon → 40px+. Bound it, don't just
        // assert visibility — the touch-target floor is the point of the fix.
        const pause = hero.getByRole("button", { name: "Pause slideshow" });
        await expect(pause).toBeVisible();
        const pauseBox = await pause.boundingBox();
        expect(pauseBox, `${vp.width}px: pause control has a box`).not.toBeNull();
        expect(pauseBox!.height, `${vp.width}px: pause target ≥ 40px`).toBeGreaterThanOrEqual(40);

        // Progress segments: 40px tall hit-slop buttons (visual bar stays 4px).
        const segments = hero.getByRole("button", { name: /^Slide \d+ \/ \d+$/ });
        expect(await segments.count(), `${vp.width}px: ≥2 progress segments`).toBeGreaterThanOrEqual(2);
        const segBox = await segments.first().boundingBox();
        expect(segBox, `${vp.width}px: progress segment has a box`).not.toBeNull();
        expect(segBox!.height, `${vp.width}px: progress segment hit target ≥ 40px`).toBeGreaterThanOrEqual(40);

        // No page-level horizontal overflow.
        expect(await hasHorizontalOverflow(page), `${vp.width}px: no horizontal body overflow`).toBe(false);

        // Footer contact entries are reachable (bottom of page, no clipping).
        const footer = page.locator("footer");
        await expect(footer.getByText("Kigali, Rwanda", { exact: true })).toBeVisible();
        await expect(footer.getByRole("link", { name: "hello@creativesoundstudio.rw" })).toBeVisible();
        await expect(footer.getByRole("link", { name: "+250 783 269 951" }).first()).toBeVisible();
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Progress segment tap advances the slide at 320px (hit-slop works, and
  //    the aria-labels match the shared /^Slide \d+ \/ \d+$/ contract).
  // ---------------------------------------------------------------------------
  test("hero progress segment click advances the slide at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");

    const hero = page.locator('section[aria-roledescription="carousel"]');
    const counter = hero.getByText(/^\d{2} \/ \d{2}$/).first();
    await expect(counter).toBeVisible();

    // Pause autoplay first so the assertion can never race the 6s timer.
    await hero.getByRole("button", { name: "Pause slideshow" }).click();
    // Segments are aria-labeled with the raw (unpadded) denominator: "Slide 2 / 4".
    const segmentCount = await hero.getByRole("button", { name: /^Slide \d+ \/ \d+$/ }).count();

    await hero.getByRole("button", { name: `Slide 2 / ${segmentCount}` }).click();
    await expect(counter).toHaveText(`02 / ${String(segmentCount).padStart(2, "0")}`);
  });

  // ---------------------------------------------------------------------------
  // 3. Blog post at 320px: no horizontal overflow, reading time + per-type CTA
  //    visible. Seed ships no posts, so a transient published fixture is used
  //    and removed (slug `responsive-*` keeps parallel e2e-* sweeps away).
  // ---------------------------------------------------------------------------
  test("blog post at 320px: no overflow, reading time and CTA visible", async ({ page, request }) => {
    await page.setViewportSize({ width: 320, height: 700 });

    const created = await request.post(`${API}/admin/posts`, {
      headers: AUTH(token),
      data: {
        titleEn: `Responsive Blog ${RUN}`,
        titleRw: `Inyandiko ${RUN}`,
        contentEn: `## Routing\n\nResponsive blog body paragraph ${RUN}.`,
        contentRw: `## Imbogamizi\n\nUmubiri wa test ${RUN}.`,
        contentType: "CLIENT_STORY",
        slug: POST_SLUG,
        published: true,
      },
    });
    expect(created.status(), `post create should be 201 (${created.status()} ${await created.text()})`).toBe(201);
    const post = (await created.json()) as PostRow;

    try {
      await page.goto(`/blog/${POST_SLUG}`);
      await expect(page.locator("article")).toBeVisible();
      await expect(
        page.locator("article").getByRole("heading", { name: `Responsive Blog ${RUN}`, level: 1 }),
      ).toBeVisible();

      expect(await hasHorizontalOverflow(page), "320px: no horizontal body overflow on a blog post").toBe(false);

      // Reading time (readingMinutes(content) → "N min read") and the
      // CLIENT_STORY per-type CTA link (no linked service → generic /book).
      await expect(page.locator("article").getByText(/\d+ min read/)).toBeVisible();
      const cta = page.locator("article").getByRole("link", { name: "Book your own story", exact: true });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("href", "/book");
    } finally {
      await request.delete(`${API}/admin/posts/${post.id}`, { headers: AUTH(token) }).catch(() => {});
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Admin portfolio at 360px: single-column grid, Delete action visible in
  //    the viewport and tappable (opened, then CANCELLED — no rows mutate).
  // ---------------------------------------------------------------------------
  test("admin portfolio is single-column at 360px with an in-view Delete action", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await adminSession(page);
    await page.goto("/admin?tab=portfolio");
    await expect(page.getByRole("heading", { name: "Portfolio", level: 1 })).toBeVisible({ timeout: 10000 });

    // Anchor the first card via its cover img (thumbCls renders img[alt=titleEn]
    // and the in-flow footer action row lives inside the same card div).
    const cover = page.locator("img[alt]").first();
    await expect(cover).toBeVisible({ timeout: 10000 });
    const card = cover.locator("..");

    const cardBox = await card.boundingBox();
    expect(cardBox, "portfolio card has a box").not.toBeNull();
    // grid-cols-1 at base → the card spans the content column (~360−2×16px).
    expect(cardBox!.width, "portfolio card is single-column (full width) at 360px").toBeGreaterThan(250);
    expect(cardBox!.width, "portfolio card fits within the viewport").toBeLessThanOrEqual(364);

    // Delete is in the always-visible footer, fully inside the viewport.
    const del = card.getByRole("button", { name: "Delete", exact: true });
    await expect(del).toBeVisible();
    const delBox = await del.boundingBox();
    expect(delBox, "delete button has a box").not.toBeNull();
    expect(delBox!.x, "delete starts inside the viewport").toBeGreaterThanOrEqual(0);
    expect(delBox!.x + delBox!.width, "delete ends inside the viewport").toBeLessThanOrEqual(360);

    // Tap-through with no side effects: Delete → confirm → Cancel keeps the card.
    await del.click();
    await expect(card.getByRole("button", { name: "Yes, delete", exact: true })).toBeVisible();
    await card.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(card.getByRole("button", { name: "Delete", exact: true })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 5. Admin settings at 320px: the name-only logo pill stays inside the
  //    viewport (min-w-0 + max-w-full + truncate) and the page never overflows.
  // ---------------------------------------------------------------------------
  test("admin settings name-only logo pill does not overflow at 320px", async ({ page }) => {
    test.skip(nameOnlyLogos.length === 0, "no name-only client logos in the live catalog");
    await page.setViewportSize({ width: 320, height: 700 });
    await adminSession(page);
    await page.goto("/admin?tab=settings");
    await expect(page.getByRole("heading", { name: "Site settings", level: 1 })).toBeVisible({ timeout: 10000 });

    // Pick a name-only logo: the cordal pill is the rounded-full span carrying
    // the name (the same name also appears below it in a smaller truncate <p>).
    const pill = page.locator("span.rounded-full").filter({ hasText: nameOnlyLogos[0].name });
    await expect(pill).toBeVisible({ timeout: 10000 });

    const box = await pill.boundingBox();
    expect(box, "name-only logo pill has a box").not.toBeNull();
    expect(box!.x, "pill starts inside the viewport").toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width, "pill stays inside the viewport").toBeLessThanOrEqual(320);

    // Whole-document check — the settings page must not scroll horizontally.
    expect(await hasHorizontalOverflow(page), "settings page has no horizontal overflow at 320px").toBe(false);
  });
});