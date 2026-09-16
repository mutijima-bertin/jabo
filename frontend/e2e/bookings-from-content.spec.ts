import { test, expect, type APIRequestContext } from "@playwright/test";
import { API, getAdminToken } from "./auth";
// The category↔service matching util is a pure TS module (no test runner in
// this repo — only Playwright e2e), so it is covered HERE, driven by the live
// catalog, instead of introducing a new dev dependency (hard rule).
import { categoryMatchesService, confidentServiceForCategory } from "../src/lib/services";

/**
 * bookings-from-content.spec.ts — content-journey CTA coverage (Phase 5).
 *
 * Covers:
 *  (a) post pages: reading-time indicator in the meta row, and the per-type
 *      booking CTA whose href is /book?service=<id> when a service lists the
 *      post as its linkedPostSlug, else the generic /book; clicking the
 *      prefilled CTA really preselects that service on the booking form.
 *  (b) the portfolio lightbox: the "Book this type" link resolves to the
 *      service the item's category maps to CONFIDENTLY, else /book — asserted
 *      both through the UI and through the pure matching util against the
 *      live catalog (the util's e2e coverage).
 *
 * DB hygiene: posts are created with a unique non-"e2e-" slug prefix so the
 * parallel blog.spec sweep (which removes "e2e-*" rows) can never delete a
 * fixture mid-test, and every test deletes its posts / restores service
 * linkedPostSlug in a finally block. The service link override is transient.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

interface ServiceRow {
  id: string;
  nameEn: string;
  nameRw: string;
  descriptionEn: string | null;
  descriptionRw: string | null;
  priceEn: string;
  priceRw: string;
  category: string;
  icon: string | null;
  imageUrl: string | null;
  linkedPostSlug: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}

interface PostRow {
  id: string;
  slug: string;
  titleEn: string;
}

interface PortfolioRow {
  titleEn: string;
  category: string | null;
}

let token: string;

const AUTH = (t: string) => ({ Authorization: `Bearer ${t}` });

async function apiGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(`${API}${path}`, { headers: AUTH(token) });
  if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function createPost(
  request: APIRequestContext,
  slug: string,
  title: string,
  contentType: string,
): Promise<PostRow> {
  const res = await request.post(`${API}/admin/posts`, {
    headers: AUTH(token),
    data: {
      titleEn: title,
      titleRw: `${title} RW`,
      excerptEn: `CTA journey excerpt ${slug}`,
      excerptRw: `CTA journey excerpt RW ${slug}`,
      contentEn: `## Recap\n\nThis journey tests the reading-time indicator, the per-type CTA band and the related stories grid on a published post.`,
      contentRw: `## Inkuru\n\nIyi nkuru igerageza igihe cyo gusoma, akazu ko kwandikisha n'izindi nkuru.`,
      contentType,
      slug,
      published: true,
    },
  });
  expect(res.status(), `create post ${slug}`).toBe(201);
  return res.json() as Promise<PostRow>;
}

async function deletePost(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`${API}/admin/posts/${id}`, { headers: AUTH(token) }).catch(() => {});
}

test.describe("content journey CTAs", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "ADMIN_EMAIL/ADMIN_PASSWORD not set");

  test.beforeAll(async ({ request }) => {
    token = getAdminToken();
    // Precondition: live catalog is reachable (the whole suite depends on it).
    await apiGet<unknown[]>(request, "/public/services");
  });

  test("post CTA pre-fills the linked service when one declares the post as its deep-dive", async ({
    page,
    request,
  }) => {
    const RUN = Date.now();
    const slug = `cta-linked-${RUN}`;
    let post: PostRow | null = null;
    let svc: ServiceRow | null = null;
    let servicesOriginal = "";

    try {
      post = await createPost(request, slug, `CTA Linked ${RUN}`, "PROJECT_RECAP");

      // Transiently link a service to this post (PUT requires the full row).
      const services = await apiGet<ServiceRow[]>(request, "/admin/services");
      svc = services[0];
      expect(svc, "precondition: at least one service exists").toBeTruthy();
      const originalLink = svc!.linkedPostSlug;
      servicesOriginal = originalLink;
      const put = await request.put(`${API}/admin/services/${svc!.id}`, {
        headers: { ...AUTH(token), "Content-Type": "application/json" },
        data: {
          nameEn: svc!.nameEn,
          nameRw: svc!.nameRw,
          descriptionEn: svc!.descriptionEn,
          descriptionRw: svc!.descriptionRw,
          priceEn: svc!.priceEn,
          priceRw: svc!.priceRw,
          category: svc!.category,
          icon: svc!.icon,
          imageUrl: svc!.imageUrl,
          featured: svc!.featured,
          published: svc!.published,
          sortOrder: svc!.sortOrder,
          linkedPostSlug: slug,
        },
      });
      expect(put.status(), `link service ${svc!.id} → ${slug}`).toBe(200);

      await page.goto(`/blog/${slug}`);
      await expect(page.getByRole("heading", { name: `CTA Linked ${RUN}` })).toBeVisible();

      // Reading-time indicator in the meta row (words/200, min 1).
      await expect(page.locator("article").getByText(/\d+ min read/)).toBeVisible();

      // PROJECT_RECAP CTA label + linked-service href — never guessed.
      const cta = page.locator("article").getByRole("link", { name: "Book a shoot like this", exact: true });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("href", `/book?service=${svc!.id}`);

      // Clicking the prefilled CTA lands on /book with the service preselected.
      await cta.click();
      await expect(page).toHaveURL(/\/book\?service=/, { timeout: 10000 });
      await expect(page.locator("form").locator("select").first()).toHaveValue(svc!.id);

      // Restore the service link right away (defensive: before the outer finally).
      await request
        .put(`${API}/admin/services/${svc!.id}`, {
          headers: { ...AUTH(token), "Content-Type": "application/json" },
          data: {
            nameEn: svc!.nameEn,
            nameRw: svc!.nameRw,
            descriptionEn: svc!.descriptionEn,
            descriptionRw: svc!.descriptionRw,
            priceEn: svc!.priceEn,
            priceRw: svc!.priceRw,
            category: svc!.category,
            icon: svc!.icon,
            imageUrl: svc!.imageUrl,
            featured: svc!.featured,
            published: svc!.published,
            sortOrder: svc!.sortOrder,
            linkedPostSlug: originalLink,
          },
        })
        .catch(() => {});
    } finally {
      if (post) await deletePost(request, post.id);
      // Belt-and-braces: recompute from the DB so a hard failure between link
      // and restore can never leave the override behind.
      const fresh = await apiGet<ServiceRow[]>(request, "/admin/services").catch(() => []);
      for (const s of fresh) {
        if (s.linkedPostSlug === slug) {
          const original = servicesOriginal ?? "";
          await request
            .put(`${API}/admin/services/${s.id}`, {
              headers: { ...AUTH(token), "Content-Type": "application/json" },
              data: { ...s, linkedPostSlug: original },
            })
            .catch(() => {});
        }
      }
    }
  });

  test("post without a linked service shows a generic /book CTA with nothing preselected", async ({
    page,
    request,
  }) => {
    const RUN = Date.now();
    const slug = `cta-generic-${RUN}`;
    let post: PostRow | null = null;

    try {
      post = await createPost(request, slug, `CTA Generic ${RUN}`, "EDUCATIONAL");

      await page.goto(`/blog/${slug}`);
      await expect(page.getByRole("heading", { name: `CTA Generic ${RUN}` })).toBeVisible();
      await expect(page.locator("article").getByText(/\d+ min read/)).toBeVisible();

      // EDUCATIONAL label; NO service references this slug → bare /book.
      const cta = page.locator("article").getByRole("link", { name: "Book a private session", exact: true });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("href", "/book");

      await cta.click();
      await expect(page).toHaveURL(/\/book$/, { timeout: 10000 });
      await expect(page.locator("form").locator("select").first()).toHaveValue("");
    } finally {
      if (post) await deletePost(request, post.id);
    }
  });

  test("lightbox 'Book this type' resolves confident category matches, else /book — util covered via live data", async ({
    page,
    request,
  }) => {
    const portfolio = await apiGet<PortfolioRow[]>(request, "/public/portfolio");
    expect(portfolio.length, "precondition: published portfolio items exist").toBeGreaterThan(0);
    const services = await apiGet<ServiceRow[]>(request, "/public/services");

    // --- Util coverage (no JS unit runner in this repo — covered through e2e) ---
    // For every distinct category in the live catalog, the confident util must
    // agree with the raw per-pair matcher count: exactly ONE match → confident,
    // anything else → null. This is data-driven, never content-pinned.
    const categories = [...new Set(portfolio.map((i) => i.category ?? ""))].filter(Boolean);
    for (const c of categories) {
      const rawMatches = services.filter((s) => categoryMatchesService(c, s));
      const confident = confidentServiceForCategory(c, services);
      if (rawMatches.length === 1) {
        expect(confident, `category "${c}" matches exactly one service`).toBe(rawMatches[0]);
      } else {
        expect(confident, `category "${c}" must be ambiguous/unmatched → null`).toBeNull();
      }
    }

    // --- UI: first item — href must equal the util's prediction ---
    const first = portfolio[0];
    const firstExpected = confidentServiceForCategory(first.category ?? "", services);
    const firstHref = firstExpected ? `/book?service=${firstExpected.id}` : "/book";
    const firstLabel = firstExpected ? "Book this type of work" : "Book a production";

    await page.goto("/portfolio");
    const cards = page.locator(".grid-cols-1 > button");
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await cards.first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const bookLink = dialog.locator('a[href*="/book"]').first();
    await expect(bookLink).toBeVisible();
    await expect(bookLink).toHaveAttribute("href", firstHref);
    await expect(bookLink).toHaveText(firstLabel);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);

    // --- UI: a confidently-matched item pre-selects the service ---
    const confidentIdx = portfolio.findIndex((i) => confidentServiceForCategory(i.category ?? "", services));
    test.skip(confidentIdx === -1, "catalog has no portfolio category that maps to exactly one service");
    const confidentItem = portfolio[confidentIdx];
    const matched = confidentServiceForCategory(confidentItem.category ?? "", services)!;

    await cards.nth(confidentIdx).click();
    const dialog2 = page.getByRole("dialog");
    await expect(dialog2).toBeVisible();
    const prefilled = dialog2.getByRole("link", { name: "Book this type of work", exact: true });
    await expect(prefilled).toBeVisible();
    await expect(prefilled).toHaveAttribute("href", `/book?service=${matched.id}`);
    await page.keyboard.press("Escape");
    await expect(dialog2).toHaveCount(0);
  });
});