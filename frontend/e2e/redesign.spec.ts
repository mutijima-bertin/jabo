import { test, expect, type APIRequestContext } from "@playwright/test";
import { API, getAdminToken } from "./auth";

/**
 * redesign.spec.ts — E2E coverage for the picture-first redesign (Phase A+B).
 *
 * Covers: full-viewport hero carousel with its control cluster, the HONEST
 * portfolio filters (empty category → explicit empty state, no fallback),
 * the shared portfolio lightbox, the services bento (prices + placeholder
 * skin while no service has an image), and the two new admin editor
 * affordances (portfolio canonical-category select, services image dropzone
 * + linked-post dropdown).
 *
 * DB hygiene: the only mutation this spec makes is a TRANSIENT re-categorize
 * of one owner row (needed because every canonical category currently holds
 * at least one item, so no naturally-empty filter exists). The original
 * category is captured in beforeAll and restored in a finally block AND
 * again defensively in afterAll; afterAll asserts the catalog multiset,
 * testimonials and e2e-post counts match their baselines.
 */

// Credentials from the environment (root .env via playwright.config.ts, or CI
// env) — never hardcoded. Same contract as the other specs.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

/** Canonical public taxonomy — mirrors AdminPortfolio's CATEGORIES constant. */
const CANONICAL_CATEGORIES = [
  "Weddings",
  "Events",
  "Corporate",
  "Concerts",
  "Documentaries",
  "Portraits",
] as const;

interface PortfolioRow {
  id: string;
  titleEn: string;
  category: string | null;
  clientName?: string | null;
}

let token: string;
let baselineCategories: string[] = []; // multiset of item categories before the run
let baselineTestimonials = -1; // testimonial count before the run (owner content may exist)
// Transient re-categorize (test 2): the import added several rows per
// category, so the empty condition is manufactured by moving EVERY row of the
// sparsest PUBLISHED canonical category → all of them must come back verbatim.
let movedItems: { id: string; originalCategory: string }[] = [];

const AUTH = (t: string) => ({ Authorization: `Bearer ${t}` });

// E2E-authored testimonial rows belong to the parallel admin-features spec
// (they self-clean in its afterAll). Exclude them from this spec's drift
// checks so the cross-checks are race-free under fullyParallel workers.
const isE2eAuthored = (t: { author: string; role: string | null }) =>
  t.author === "E2E Checker" || (t.role ?? "").startsWith("E2E ");

// Same idea for the admin-overhaul.mobile fixture: it creates a transient
// E2E-titled portfolio item (published: false) while THIS spec runs in the
// same worker pool. The owner catalog is what this spec must not disturb, so
// the portfolio baselines compare ONLY non-"E2E " rows.
const isE2ePortfolio = (i: { titleEn: string }) => i.titleEn.startsWith("E2E ");

// Logins happen ONCE per suite in the "setup" project (e2e/admin.auth.setup.ts).
async function apiGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(`${API}${path}`, { headers: AUTH(token) });
  if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Full-body PUT (backend zod requires titleEn/category/coverUrl at minimum). */
async function putPortfolioCategory(
  request: APIRequestContext,
  row: Record<string, unknown>,
  category: string,
): Promise<void> {
  const res = await request.put(`${API}/admin/portfolio/${row.id}`, {
    headers: { ...AUTH(token), "Content-Type": "application/json" },
    data: {
      titleEn: row.titleEn,
      titleRw: row.titleRw ?? "",
      category,
      clientName: row.clientName ?? "",
      tags: row.tags ?? [],
      coverUrl: row.coverUrl,
      mediaUrls: row.mediaUrls ?? [],
      mediaType: row.mediaType ?? "image",
      published: row.published ?? true,
      sortOrder: row.sortOrder ?? 0,
    },
  });
  if (!res.ok()) throw new Error(`PUT category=${category} failed: ${res.status()} ${await res.text()}`);
}

test.describe("redesign journeys", () => {
  // Tests share the transient re-categorized state and the admin session, so
  // the file runs serially in a single worker.
  test.describe.configure({ mode: "serial" });
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "ADMIN_EMAIL/ADMIN_PASSWORD not set");

  test.beforeAll(async ({ request }) => {
    token = getAdminToken(); // logged in once by the "setup" project
    const items = await apiGet<PortfolioRow[]>(request, "/admin/portfolio");
    baselineCategories = items.filter((i) => !isE2ePortfolio(i)).map((i) => i.category ?? "");
    baselineTestimonials = (
      await apiGet<Array<{ author: string; role: string | null }>>(request, "/admin/testimonials")
    ).filter((t) => !isE2eAuthored(t)).length;
  });

  test.afterAll(async ({ request }, workerInfo) => {
    if (!token) return; // suite skipped before login — nothing to verify

    // Defensive restore: if a transient re-categorize leaked past its
    // finally block (hard failure between mutate and restore), undo it here.
    for (const m of movedItems) {
      const items = await apiGet<Array<Record<string, unknown>>>(request, "/admin/portfolio");
      const row = items.find((i) => i.id === m.id);
      if (row && row.category !== m.originalCategory) {
        console.warn(
          `[redesign.spec] afterAll restoring drifted category on "${row.titleEn}" ` +
            `${String(row.category)} → ${m.originalCategory}`,
        );
        await putPortfolioCategory(request, row, m.originalCategory);
      }
    }
    movedItems = [];

    // Baseline confirmation: catalog size + category multiset untouched —
    // over the OWNER rows only (parallel specs may hold a transient "E2E "
    // fixture at this exact moment, which must not skew the drift check).
    const items = await apiGet<PortfolioRow[]>(request, "/admin/portfolio");
    const ownerItems = items.filter((i) => !isE2ePortfolio(i));
    expect(ownerItems, `owner portfolio count must stay at baseline (${baselineCategories.length})`).toHaveLength(
      baselineCategories.length,
    );
    expect(
      [...ownerItems.map((i) => i.category ?? "")].sort(),
      "category multiset must be restored exactly",
    ).toEqual([...baselineCategories].sort());
    expect(ownerItems.every((i) => CANONICAL_CATEGORIES.includes(i.category as never))).toBe(true);

    // No testimonial/e2e-blog drift either (cheap cross-checks for the report).
    // Parallel specs legitimately create/delete E2E-authored testimonials, so
    // compare ONLY the non-E2E catalog (the part this spec must not disturb).
    const testimonials = await apiGet<Array<{ author: string; role: string | null }>>(request, "/admin/testimonials");
    expect(
      testimonials.filter((t) => !isE2eAuthored(t)),
      "non-E2E testimonials must return to baseline",
    ).toHaveLength(baselineTestimonials);
    // blog.spec (running in parallel) cleans its own e2e-* posts in ITS
    // afterAll — poll briefly instead of asserting instantly (cross-spec race).
    await expect
      .poll(
        async () => {
          const latest = await apiGet<Array<{ slug: string }>>(request, "/admin/posts");
          return latest.filter((p) => p.slug.startsWith("e2e-")).length;
        },
        { timeout: 15000, intervals: [250, 500, 1000, 2000, 2000, 2000, 3000, 4000] },
      )
      .toBe(0);
  });

  test("hero renders full-viewport with visible controls", async ({ page }) => {
    await page.goto("/");

    const hero = page.locator('section[aria-roledescription="carousel"]');
    await expect(hero).toBeVisible();

    // Height contract: calc(100svh - 4rem) below the h-16 sticky nav — the
    // hero bottom lands on the viewport bottom so controls paint on screen 1.
    const box = await hero.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    const expectedHeight = viewport.height - 64; // 4rem nav offset
    expect(Math.abs(box!.height - expectedHeight), `hero height ≈ viewport - nav`).toBeLessThanOrEqual(50);
    expect(Math.abs(box!.y - 64), "hero starts right below the sticky nav").toBeLessThanOrEqual(8);

    // Control cluster (bottom-right): pause / prev / next + NN/NN counter.
    await expect(hero.getByRole("button", { name: "Pause slideshow" })).toBeVisible();
    await expect(hero.getByRole("button", { name: "Previous slide" })).toBeVisible();
    await expect(hero.getByRole("button", { name: "Next slide" })).toBeVisible();
    await expect(hero.getByText(/^\d{2} \/ \d{2}$/)).toBeVisible(); // counter, autoplay-tolerant

    // Progress bars (bottom-left) — one per slide, ≥2 means carousel active.
    expect(await hero.getByRole("button", { name: /^Slide \d+ \/ \d+$/ }).count()).toBeGreaterThanOrEqual(2);
  });

  test("live content import: clients wall logos, full portfolio grid and 5-slide hero", async ({ page, request }) => {
    // HARDENING vs the content import: the DB now ships 40 client logos
    // (incl. text-only wordmarks) and 13 published portfolio items. The wall
    // has NO published flag — /public/logos returns everything, so all rows
    // must render. Assert dynamically against the live catalog, never literals.
    const logos = await apiGet<Array<{ id: string; imageUrl: string | null }>>(request, "/public/logos");
    const imaged = logos.filter((l) => l.imageUrl).length;
    expect(imaged, "import ships 25+ real logo images").toBeGreaterThanOrEqual(25);

    await page.goto("/");

    const wall = page.locator("section").filter({ has: page.getByRole("heading", { name: "Trusted by" }) });
    await expect(wall.getByRole("heading", { name: "Trusted by" })).toBeVisible({ timeout: 10000 });
    expect(await wall.locator("ul > li").count()).toBe(logos.length); // all rows show
    expect(await wall.locator("img").count()).toBe(imaged); // one <img> per image logo; wordmarks are spans
    expect(await wall.locator("img").count()).toBeGreaterThanOrEqual(25);

    // Homepage portfolio grid renders every published item (13 post-import).
    const portfolio = await apiGet<Array<{ titleEn: string }>>(request, "/public/portfolio");
    expect(portfolio.length).toBeGreaterThanOrEqual(13);
    const grid = page.locator("#portfolio .grid-cols-1 > button");
    await expect(grid.first()).toBeVisible({ timeout: 10000 });
    expect(await grid.count()).toBe(portfolio.length);

    // Spot-check two imported titles are actually on the grid.
    for (const title of ["Africa Summit", "CEO of AERG — Portrait"]) {
      await expect(page.getByRole("button", { name: title })).toBeVisible();
    }

    // The imported covers joined the hero carousel. The hero renders at most
    // intro + (MAX_SLIDES-2) cover slides, so the live denominator is not
    // necessarily "05" — assert counter↔slide-button agreement instead of
    // hardcoding a slide count.
    const hero = page.locator('section[aria-roledescription="carousel"]');
    const counter = hero.getByText(/^\d{2} \/ \d{2}$/).first();
    await expect(counter).toBeVisible();
    const slideCount = await hero.getByRole("button", { name: /^Slide \d+ \/ \d+$/ }).count();
    expect(slideCount, "hero carries the intro slide plus imported covers").toBeGreaterThanOrEqual(3);
    await expect(counter).toHaveText(new RegExp(`^\\d{2} / ${String(slideCount).padStart(2, "0")}$`));
  });

  test("portfolio filter shows honest empty state and recovers", async ({ page, request }) => {
    // The content import filled every canonical category (Portraits alone now
    // holds 4 rows), so manufacture the empty condition DYNAMICALLY: take the
    // sparsest canonical category among the PUBLISHED rows (never the transient
    // "E2E " admin fixture) and temporarily move ALL of its rows to another
    // canonical category, then restore them verbatim.
    const published = await apiGet<Array<{ id: string; titleEn: string; category: string | null }>>(
      request,
      "/public/portfolio",
    );
    const byCategory = new Map<string, Array<{ id: string; titleEn: string; category: string | null }>>();
    for (const it of published) {
      const c = it.category ?? "";
      if (CANONICAL_CATEGORIES.includes(c as never)) {
        byCategory.set(c, [...(byCategory.get(c) ?? []), it]);
      }
    }
    const choice = [...byCategory.entries()].sort((a, b) => a[1].length - b[1].length)[0];
    expect(choice, "precondition: at least one canonical category has published rows").toBeTruthy();
    if (!choice) return;
    const [emptyCategory, rowsToMove] = choice;
    const targetCategory = emptyCategory === "Events" ? "Corporate" : "Events";
    movedItems = rowsToMove.map((r) => ({ id: r.id, originalCategory: r.category ?? "" }));

    try {
      for (const r of rowsToMove) {
        await putPortfolioCategory(request, r, targetCategory);
      }

      // Fresh SSR navigation so the grid sees the updated catalog.
      await page.goto("/portfolio");
      const gridRoot = page.locator("main"); // single PortfolioGrid instance on this page

      // All items visible under "All" (the grid is the only .grid-cols-1 on this page).
      // The expected count comes from /public/portfolio (published rows only):
      // the ADMIN list may transiently hold an unpublished "E2E " fixture from
      // the parallel admin-overhaul mobile test, which never renders here.
      const cards = gridRoot.locator(".grid-cols-1 > button");
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
      const total = await cards.count();
      const publishedCount = (await apiGet<unknown[]>(request, "/public/portfolio")).length;
      expect(total).toBe(publishedCount);

      // Click the now-dead category pill → honest empty state, NOT a
      // silent fallback to all items.
      const deadPill = gridRoot.getByRole("button", { name: emptyCategory, exact: true });
      await deadPill.click();
      await expect(deadPill).toHaveClass(/bg-brass-deep/); // active-pill styling
      await expect(gridRoot.getByText("No work in this category yet")).toBeVisible();
      await expect(cards).toHaveCount(0); // honesty: zero cards rendered

      // Recovery actions inside the empty state.
      await expect(gridRoot.getByRole("link", { name: "Book now" })).toBeVisible();
      await gridRoot.getByRole("button", { name: "View all work" }).click();
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
      expect(await cards.count()).toBe(total); // everything back
      await expect(gridRoot.getByText("No work in this category yet")).toHaveCount(0);
    } finally {
      // Restore every owner row even on assertion failure.
      const fresh = await apiGet<Array<{ id: string; category: string | null }>>(request, "/admin/portfolio");
      for (const m of movedItems) {
        const row = fresh.find((r: { id: string; category: string | null }) => r.id === m.id);
        if (row && row.category !== m.originalCategory) {
          await putPortfolioCategory(request, row, m.originalCategory);
        }
      }
      movedItems = [];
    }
  });

  test("lightbox opens, navigates, closes", async ({ page }) => {
    await page.goto("/portfolio");

    // Cards are <button aria-label="{title}"> in the single grid on /portfolio.
    const firstCard = page.locator(".grid-cols-1 > button").first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    const firstTitle = (await firstCard.getAttribute("aria-label")) ?? "";
    expect(firstTitle, "card exposes its title as accessible name").not.toBe("");

    await firstCard.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // Image stage + serif title + Client line + category chip + position.
    await expect(dialog.locator(`img[alt="${firstTitle}"]`)).toBeVisible();
    await expect(dialog.getByRole("heading", { name: firstTitle })).toBeVisible();
    await expect(dialog.getByText(/^Client: /)).toBeVisible();
    await expect(dialog.locator("span.rounded-full").filter({ hasText: /^[A-Za-z]+$/ })).toBeVisible(); // category chip
    const counter = dialog.getByText(/^\d{2} \/ \d{2}$/).first();
    await expect(counter).toHaveText(/^01 \/ \d{2}$/); // first of the visible list
    const denominator = ((await counter.innerText()).split("/")[1] ?? "").trim();

    // ArrowRight advances within the wrapped list.
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByText(new RegExp(`^02 / ${denominator}$`)).first()).toBeVisible();

    // Escape closes the overlay entirely.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("services bento renders prices and placeholder cards", async ({ page, request }) => {
    await page.goto("/");
    const bento = page.locator("#services");
    await expect(bento.getByRole("heading", { name: "Services & pricing" })).toBeVisible();

    // All published services render as bento cards (count from the live catalog,
    // never hardcoded — the persisted DB may legitimately hold extra services).
    const services = await apiGet<Array<{ id: string; imageUrl: string | null }>>(request, "/public/services");
    const expectedCount = services.length;
    const imaged = services.filter((s) => s.imageUrl).length;
    const cards = bento.locator("ol > li");
    await expect(cards).toHaveCount(expectedCount);

    // Price lines come verbatim from priceEn ("From X RWF").
    const prices = bento.getByText(/^From [\d,]+ RWF/);
    expect(await prices.count()).toBeGreaterThanOrEqual(1);
    await expect(prices.first()).toBeVisible();

    // Every card carries its Book-now chip.
    await expect(bento.getByRole("link", { name: "Book now" })).toHaveCount(expectedCount);

    // One <img> per service that owns an uploaded image (from the live
    // catalog); services without an image must render the placeholder skin
    // instead — so the count not only matches but also proves the placeholder
    // cards emit no photo element.
    expect(await bento.locator("img").count()).toBe(imaged);
  });

  test("admin portfolio category dropdown saves canonical value", async ({ page, request }) => {
    await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), token);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
    await page.locator("aside").getByRole("button", { name: "Portfolio", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Portfolio", exact: true })).toBeVisible({ timeout: 10000 });

    // Anchor on ONE identifiable item — NOT on grid position. listAll() sorts
    // by [category asc, sortOrder asc], so a successful category save MOVES
    // the card and any positional locator would reopen a different row.
    const rows = await apiGet<Record<string, unknown>[]>(request, "/admin/portfolio");
    // Never anchor the round-trip on a parallel spec's transient "E2E " row
    // (admin-overhaul mobile creates one under Corporate) — pick real owner
    // content, with Corporate preferred so the test exercises a canonical save.
    const anchor =
      rows.find((r) => r.category === "Corporate" && !String(r.titleEn).startsWith("E2E ")) ??
      rows.find((r) => !String(r.titleEn).startsWith("E2E "));
    expect(anchor, "precondition: owner-authored portfolio content exists").toBeTruthy();
    const anchorTitle = String(anchor!.titleEn);
    const originalCategory = String(anchor!.category);
    // Round-trip target chosen so the final state equals the starting state.
    const target = originalCategory === "Weddings" ? "Corporate" : "Weddings";

    // The overhauled grid dropped the hover-only `.group` card wrapper (QA #4):
    // actions are always visible on a scrim/action strip, so anchor the card by
    // its cover's img[alt=title] and climb to the card div.
    const card = page.locator(`img[alt="${anchorTitle}"]`).locator("..");
    const editInCard = card.getByRole("button", { name: "Edit", exact: true });

    const openEditor = async () => {
      await expect(editInCard).toBeVisible({ timeout: 10000 });
      await editInCard.click();
      await expect(form).toBeVisible();
    };

    const form = page.locator("form");
    // The overhauled admin-kit Field renders the label without the asterisk
    // that the old editor appended for required fields.
    const catSelect = form.locator("label", { hasText: "Category" }).locator("..").locator("select");

    await openEditor();
    await expect(catSelect).toHaveValue(originalCategory);

    // Exactly the six canonical options are offered.
    const optionValues = await catSelect
      .locator("option")
      .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    for (const c of CANONICAL_CATEGORIES) {
      expect(optionValues, `canonical option ${c} present`).toContain(c);
    }

    // Change → Save → the overhauled editor persists with a "Saved" label
    // (no timers, matches blog/portfolio editors) → dismiss it to reload list.
    await catSelect.selectOption(target);
    await form.getByRole("button", { name: "Save", exact: true }).click();
    await expect(form.getByRole("button", { name: "Saved" })).toBeVisible({ timeout: 10000 });
    await form.getByRole("button", { name: "Cancel" }).click();
    await expect(form).toHaveCount(0);

    // Persisted server-side…
    const saved = (await apiGet<Record<string, unknown>[]>(request, "/admin/portfolio")).find(
      (r) => r.id === anchor!.id,
    );
    expect(saved?.category).toBe(target);

    // …and on reopen (same content-anchored card) the select shows it.
    await openEditor();
    await expect(catSelect).toHaveValue(target);

    // Restore the original category (keeps the DB baseline intact).
    await catSelect.selectOption(originalCategory);
    await form.getByRole("button", { name: "Save", exact: true }).click();
    await expect(form.getByRole("button", { name: "Saved" })).toBeVisible({ timeout: 10000 });
    await form.getByRole("button", { name: "Cancel" }).click();
    await expect(form).toHaveCount(0);
    const restored = (await apiGet<Record<string, unknown>[]>(request, "/admin/portfolio")).find(
      (r) => r.id === anchor!.id,
    );
    expect(restored?.category).toBe(originalCategory);
  });

  test("admin services form has image and linked-post fields", async ({ page, request }) => {
    await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), token);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
    await page.locator("aside").getByRole("button", { name: "Services", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Services", exact: true })).toBeVisible({ timeout: 10000 });

    // Open the editor for a KNOWN service (grid order == API order here; no
    // save happens, so positions stay put).
    const svcRows = await apiGet<Array<Record<string, unknown>>>(request, "/admin/services");
    const firstService = svcRows[0];

    const editButtons = page.getByRole("button", { name: "Edit", exact: true });
    await expect(editButtons.first()).toBeVisible({ timeout: 10000 });
    await editButtons.first().click();

    const form = page.locator("form");
    await expect(form).toBeVisible();

    // Image dropzone: labeled block containing the hidden file input plus hint.
    const imageField = form.locator("label", { hasText: "Service image" }).locator("..");
    await expect(imageField.locator('input[type="file"]')).toBeAttached();
    await expect(imageField.getByText("Drop here or click to choose")).toBeVisible();

    // Linked-post dropdown offers the explicit "No blog post" none-option.
    const linkedSelect = form.locator("label", { hasText: "Linked blog post" }).locator("..").locator("select");
    await expect(linkedSelect).toBeVisible();
    await expect(linkedSelect.locator("option", { hasText: "No blog post" })).toBeAttached();
    if (!firstService?.linkedPostSlug) {
      await expect(linkedSelect).toHaveValue(""); // precondition: seed service is unlinked
    }

    // Read-only check — cancel without saving anything.
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(form).toHaveCount(0);
  });
});
