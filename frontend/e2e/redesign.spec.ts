import { test, expect, type APIRequestContext } from "@playwright/test";

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

const API = "http://localhost:4000/api";
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
interface ServiceRow {
  id: string;
  nameEn: string;
  priceEn: string | null;
}

let token: string;
let baselineCategories: string[] = []; // multiset of item categories before the run
let movedItem: { id: string; originalCategory: string } | null = null; // transient re-categorize (test 2)

const AUTH = (t: string) => ({ Authorization: `Bearer ${t}` });

async function adminLogin(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!res.ok()) throw new Error(`admin login failed: ${res.status()} ${await res.text()}`);
  return (await res.json()).token as string;
}

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
    token = await adminLogin(request); // exactly one admin API login per run
    const items = await apiGet<PortfolioRow[]>(request, "/admin/portfolio");
    baselineCategories = items.map((i) => i.category ?? "");
  });

  test.afterAll(async ({ request }, workerInfo) => {
    if (!token) return; // suite skipped before login — nothing to verify

    // Defensive restore: if the transient re-categorize leaked past its
    // finally block (hard failure between mutate and restore), undo it here.
    if (movedItem) {
      const items = await apiGet<Array<Record<string, unknown>>>(request, "/admin/portfolio");
      const row = items.find((i) => i.id === movedItem!.id);
      if (row && row.category !== movedItem.originalCategory) {
        console.warn(
          `[redesign.spec] afterAll restoring drifted category on "${row.titleEn}" ` +
            `${String(row.category)} → ${movedItem.originalCategory}`,
        );
        await putPortfolioCategory(request, row, movedItem.originalCategory);
      }
    }

    // Baseline confirmation: catalog size + category multiset untouched.
    const items = await apiGet<PortfolioRow[]>(request, "/admin/portfolio");
    expect(items, `portfolio count must stay at baseline (${baselineCategories.length})`).toHaveLength(
      baselineCategories.length,
    );
    expect(
      [...items.map((i) => i.category ?? "")].sort(),
      "category multiset must be restored exactly",
    ).toEqual([...baselineCategories].sort());
    expect(items.every((i) => CANONICAL_CATEGORIES.includes(i.category as never))).toBe(true);

    // No testimonial/e2e-blog drift either (cheap cross-checks for the report).
    const testimonials = await apiGet<unknown[]>(request, "/admin/testimonials");
    expect(testimonials, "testimonials must stay at baseline (0)").toHaveLength(0);
    const posts = await apiGet<Array<{ slug: string }>>(request, "/admin/posts");
    expect(posts.filter((p) => p.slug.startsWith("e2e-")), "no e2e blog posts may leak").toHaveLength(0);
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

  test("portfolio filter shows honest empty state and recovers", async ({ page, request }) => {
    // Every canonical category currently holds ≥1 item, so manufacture the
    // empty condition: move the Portraits item into Events for the duration
    // of this test, then restore it verbatim.
    const items = await apiGet<Record<string, unknown>>(request, "/admin/portfolio");
    const portraits = items.find((i) => i.category === "Portraits");
    expect(portraits, "precondition: a Portraits item exists").toBeTruthy();
    movedItem = { id: String(portraits!.id), originalCategory: "Portraits" };
    try {
      await putPortfolioCategory(request, portraits!, "Events");

      // Fresh SSR navigation so the grid sees the updated catalog.
      await page.goto("/portfolio");
      const gridRoot = page.locator("main"); // single PortfolioGrid instance on this page

      // All items visible under "All" (the grid is the only .grid-cols-1 on this page).
      const cards = gridRoot.locator(".grid-cols-1 > button");
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
      const total = await cards.count();
      expect(total).toBe(items.length);

      // Click the now-dead "Portraits" pill → honest empty state, NOT a
      // silent fallback to all items.
      const portraitsPill = gridRoot.getByRole("button", { name: "Portraits", exact: true });
      await portraitsPill.click();
      await expect(portraitsPill).toHaveClass(/bg-brass-deep/); // active-pill styling
      await expect(gridRoot.getByText("No work in this category yet")).toBeVisible();
      await expect(cards).toHaveCount(0); // honesty: zero cards rendered

      // Recovery actions inside the empty state.
      await expect(gridRoot.getByRole("link", { name: "Book now" })).toBeVisible();
      await gridRoot.getByRole("button", { name: "View all work" }).click();
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
      expect(await cards.count()).toBe(total); // everything back
      await expect(gridRoot.getByText("No work in this category yet")).toHaveCount(0);
    } finally {
      // Restore the owner row even on assertion failure.
      const fresh = await apiGet<Record<string, unknown>>(request, "/admin/portfolio");
      const row = fresh.find((i) => i.id === movedItem!.id);
      if (row && row.category !== movedItem.originalCategory) {
        await putPortfolioCategory(request, row, movedItem.originalCategory);
      }
      movedItem = null;
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

  test("services bento renders prices and placeholder cards", async ({ page }) => {
    await page.goto("/");
    const bento = page.locator("#services");
    await expect(bento.getByRole("heading", { name: "Services & pricing" })).toBeVisible();

    // All 10 seed services render as bento cards.
    const cards = bento.locator("ol > li");
    await expect(cards).toHaveCount(10);

    // Price lines come verbatim from priceEn ("From X RWF").
    const prices = bento.getByText(/^From [\d,]+ RWF/);
    expect(await prices.count()).toBeGreaterThanOrEqual(1);
    await expect(prices.first()).toBeVisible();

    // Every card carries its Book-now chip.
    await expect(bento.getByRole("link", { name: "Book now" })).toHaveCount(10);

    // Baseline truth: no service has an image yet → placeholder skin, so the
    // bento must not contain any photo elements. Soft-assert so the test
    // degrades gracefully once the owner starts uploading real images.
    expect.soft(await bento.locator("img").count(), "[soft] no images yet → placeholder skin").toBe(0);
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
    const anchor = rows.find((r) => r.category === "Corporate") ?? rows[0];
    const anchorTitle = String(anchor.titleEn);
    const originalCategory = String(anchor.category);
    // Round-trip target chosen so the final state equals the starting state.
    const target = originalCategory === "Weddings" ? "Corporate" : "Weddings";

    const card = page
      .locator(".group")
      .filter({ has: page.locator(`img[alt="${anchorTitle}"]`) });
    const editInCard = card.getByRole("button", { name: "Edit", exact: true });

    const openEditor = async () => {
      await expect(editInCard).toBeVisible({ timeout: 10000 });
      await editInCard.hover(); // reveal the hover overlay like a user would
      await editInCard.click();
      await expect(form).toBeVisible();
    };

    const form = page.locator("form");
    const catSelect = form.locator("label", { hasText: "Category *" }).locator("..").locator("select");

    await openEditor();
    await expect(catSelect).toHaveValue(originalCategory);

    // Exactly the six canonical options are offered.
    const optionValues = await catSelect
      .locator("option")
      .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    for (const c of CANONICAL_CATEGORIES) {
      expect(optionValues, `canonical option ${c} present`).toContain(c);
    }

    // Change → Save → form closes.
    await catSelect.selectOption(target);
    await form.getByRole("button", { name: "Save", exact: true }).click();
    await expect(form).toHaveCount(0, { timeout: 10000 });

    // Persisted server-side…
    const saved = (await apiGet<Record<string, unknown>[]>(request, "/admin/portfolio")).find(
      (r) => r.id === anchor.id,
    );
    expect(saved?.category).toBe(target);

    // …and on reopen (same content-anchored card) the select shows it.
    await openEditor();
    await expect(catSelect).toHaveValue(target);

    // Restore the original category (keeps the DB baseline intact).
    await catSelect.selectOption(originalCategory);
    await form.getByRole("button", { name: "Save", exact: true }).click();
    await expect(form).toHaveCount(0, { timeout: 10000 });
    const restored = (await apiGet<Record<string, unknown>[]>(request, "/admin/portfolio")).find(
      (r) => r.id === anchor.id,
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
