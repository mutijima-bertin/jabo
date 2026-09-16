import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { API, getAdminToken } from "./auth";
// Credentials come from the environment (root .env via playwright.config.ts,
// or CI env) — never hardcoded. The admin account is seeded from these same
// variables, so CI's placeholder values self-provision.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

// One unique run id per spec run → titles/slugs never collide with earlier
// runs (safe to rerun without a DB reset). Matches the backend slugify():
// lowercase ASCII + dashes.
const RUN = Date.now();
const RUN_TITLE = `E2E Blog ${RUN}`; // published from the admin UI
const RENAMED_TITLE = `E2E Renamed ${RUN}`; // result of the admin edit
const DRAFT_TITLE = `E2E Draft ${RUN}`; // created as a draft via API
const RUN_SLUG = `e2e-blog-${RUN}`;
const DRAFT_SLUG = `e2e-draft-${RUN}`;

interface PostRow {
  id: string;
  slug: string;
  titleEn: string;
  views: number;
  likes: number;
  published: boolean;
}

let token: string;
let published: PostRow | null = null; // set by the admin-create test

const AUTH = (t: string) => ({ Authorization: `Bearer ${t}` });

// Logins happen ONCE per suite in the "setup" project (e2e/admin.auth.setup.ts).

async function apiGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(`${API}${path}`, { headers: AUTH(token) });
  if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<T>;
}

// Remove any post our E2E runs created (slug prefix "e2e-"), so a crashed /
// interrupted run can never pollute the next one.
async function deleteE2EPosts(request: APIRequestContext): Promise<void> {
  const posts = await apiGet<PostRow[]>(request, "/admin/posts").catch(() => []);
  for (const p of posts) {
    // Every row this suite creates carries an "e2e-" slug (explicit or
    // title-derived now that the backend derives slugs server-side). The
    // titleEn "E2E " prefix is a belt-and-braces sweep for anything a
    // pre-fix run could have leaked under a fallback "post"-style slug.
    if (p.slug.startsWith("e2e-") || p.titleEn.startsWith("E2E ")) {
      await request.delete(`${API}/admin/posts/${p.id}`, { headers: AUTH(token) });
    }
  }
}

// Scope a field by its row label (the editor labels have no htmlFor, so we
// climb from the label to the wrapper div and pick the control). Follows the
// AdminBlog.tsx structure: <div><label>…</label><input|textarea /></div>.
function editorField(form: Locator, labelText: string, tag: "input" | "textarea" = "input"): Locator {
  return form.locator("label", { hasText: labelText }).locator("..").locator(tag).first();
}

function readCounter(page: Page, word: string): Promise<number> {
  return page
    .locator("article")
    .getByText(new RegExp(`^\\d+\\s+${word}$`))
    .first()
    .textContent()
    .then((t) => parseInt(t ?? "0", 10));
}

// The UI-login path itself is covered by booking.spec ("admin login works")
// and admin-features.spec ("clients tab"); this file's admin flows reuse the
// beforeAll API token to stay well under the auth rate limiter (10 req/10min/IP)
// during retries.
async function openBlogTab(page: Page): Promise<void> {
  await page.locator("aside").getByRole("button", { name: "Blog", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "New post", exact: true })).toBeVisible();
}

test.describe("blog journeys", () => {
  // Each test continues the state the previous one left behind (create →
  // publish → detail → like → draft → edit → delete), so the file must run
  // serially in a single worker.
  test.describe.configure({ mode: "serial" });
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "ADMIN_EMAIL/ADMIN_PASSWORD not set");

  test.beforeAll(async ({ request }) => {
    token = getAdminToken(); // logged in once by the "setup" project
    await deleteE2EPosts(request); // defend against leftovers from a crashed run
  });

  test.afterAll(async ({ request }) => {
    await deleteE2EPosts(request);
    const remaining = await apiGet<PostRow[]>(request, "/admin/posts");
    // Constraint: the suite leaves zero E2E posts behind. Owner-written
    // posts (non-"e2e-" slugs) are legitimate content and must survive.
    expect(remaining.filter((p) => p.slug.startsWith("e2e-"))).toHaveLength(0);
  });

  test("public blog index shows the empty state when there are no posts", async ({ page, request }) => {
    const posts = await apiGet<PostRow[]>(request, "/public/posts");
    // The empty state only applies when no real content exists — owner posts
    // (non-"e2e-" slugs) are legitimate and make this scenario N/A.
    test.skip(
      posts.some((p) => !p.slug.startsWith("e2e-")),
      "owner-authored posts exist — empty state not applicable",
    );
    expect(posts).toEqual([]);

    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "Stories from the studio" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No stories yet" })).toBeVisible();
    await expect(page.getByText("Book a shoot").first()).toBeVisible(); // empty-state CTA
    // No blog cards at all (cards are anchors to /blog/<slug>).
    await expect(page.locator('a[href^="/blog/"]')).toHaveCount(0);
  });

  test("admin creates a published post through the Blog tab", async ({ page, request }) => {
    // Use the beforeAll API token instead of a second UI login — the login
    // page itself is already covered by booking.spec and admin-features.spec,
    // and the auth limiter (10 req/10min/IP) makes extra logins risky under
    // retries.
    await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), token);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
    await openBlogTab(page);

    await page.getByRole("button", { name: "New post", exact: true }).click();
    const form = page.locator("form").first();
    await expect(editorField(form, "Title (EN)")).toBeVisible();

    const body = `## Release notes\n\nThis is the e2e body paragraph ${RUN}.`;
    await editorField(form, "Title (EN)").fill(RUN_TITLE);
    await editorField(form, "Excerpt (EN)").fill(`E2E excerpt ${RUN}`);
    await editorField(form, "Content (EN)", "textarea").fill(body);
    await editorField(form, "Title (RW)").fill(`E2E Blog RW ${RUN}`);
    await editorField(form, "Excerpt (RW)").fill(`E2E excerpt RW ${RUN}`);
    await editorField(form, "Content (RW)", "textarea").fill(`## Amakuru\n\nUmubiri wa test ${RUN}.`);
    // Cover upload left empty → public card falls back to the soundwave placeholder.
    // Slug: the UI always sends the slug input; the backend now preprocesses
    // "" → undefined so the titleEn-derived slug runs (slug fix). The explicit
    // slug below is PURE determinism for the public /blog/<slug> link — the
    // derived-slug path is proved by the draft test (title-created post →
    // slugify(titleEn), never the old "post"/"post-N" fallback).
    await editorField(form, "Slug").fill(RUN_SLUG);
    await form.locator("select").selectOption({ label: "Client story" });
    await form.getByLabel("Published").check();
    await form.getByRole("button", { name: "Create" }).click();

    // The overhauled editor no longer auto-unmounts on save: it stays open and
    // confirms with a "Saved" submit label + success banner (no timers — spec §7.2),
    // so the row only becomes visible once the editor is dismissed.
    await expect(form.getByRole("button", { name: "Saved" })).toBeVisible({ timeout: 15000 });
    await form.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("form").first()).toHaveCount(0);

    // The refreshed list shows the new row. The overhauled table dropped the
    // slug column (Title/Type/Status/Updated/Actions), so the slug is verified
    // below via the admin API instead of the DOM.
    const row = page.locator("tbody tr").filter({ hasText: RUN_TITLE });
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText("Client story");
    await expect(row).toContainText("Published");

    // Grab the server row for the detail/views/likes tests.
    const all = await apiGet<PostRow[]>(request, "/admin/posts");
    published = all.find((p) => p.slug === RUN_SLUG) ?? null;
    expect(published, "created post should be fetchable via the admin API").not.toBeNull();
    expect(published?.published).toBe(true);
  });

  test("published post card renders on the public index", async ({ page }) => {
    expect(published, "runs after the admin-create test").not.toBeNull();
    await page.goto("/blog");

    const card = page.locator(`a[href="/blog/${RUN_SLUG}"]`);
    await expect(card).toBeVisible();
    await expect(card.getByRole("heading", { name: RUN_TITLE })).toBeVisible();
    await expect(card.getByText("Client story", { exact: true })).toBeVisible();
    await expect(card.getByText(new RegExp(`E2E excerpt ${RUN}`))).toBeVisible();
    // No cover was uploaded → placeholder cover with the title as aria-label.
    await expect(page.getByRole("img", { name: RUN_TITLE })).toBeVisible();
    await expect(card.getByText(/Views/)).toBeVisible();
    await expect(card.getByText(/Likes/)).toBeVisible();
  });

  test("post page renders content and increments views by exactly 1 per navigation", async ({ page, request }) => {
    expect(published, "runs after the admin-create test").not.toBeNull();
    const id = published!.id;

    const v0 = (await apiGet<PostRow>(request, `/admin/posts/${id}`)).views;

    await page.goto(`/blog/${RUN_SLUG}`);
    await expect(page.getByRole("heading", { name: RUN_TITLE })).toBeVisible();
    await expect(page.getByText("Back to blog")).toBeVisible();
    await expect(page.getByText(`E2E excerpt ${RUN}`).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Release notes", level: 2 })).toBeVisible(); // markdown rendered
    await expect(page.getByText(`This is the e2e body paragraph ${RUN}.`)).toBeVisible();
    await expect(page.locator("article").getByRole("link", { name: "Book a shoot", exact: true })).toBeVisible(); // CTA block

    await expect(page.locator("article").getByText(new RegExp(`^${v0 + 1}\\s+Views$`))).toBeVisible();
    expect((await apiGet<PostRow>(request, `/admin/posts/${id}`)).views).toBe(v0 + 1);

    // A reload is exactly one more server fetch (React cache() dedupes within a request).
    await page.reload();
    await expect(page.locator("article").getByText(new RegExp(`^${v0 + 2}\\s+Views$`))).toBeVisible();
    expect((await apiGet<PostRow>(request, `/admin/posts/${id}`)).views).toBe(v0 + 2);
  });

  test("like button increments the count and it sticks after reload", async ({ page, request }) => {
    expect(published, "runs after the admin-create test").not.toBeNull();
    const id = published!.id;

    await page.goto(`/blog/${RUN_SLUG}`);
    const before = (await apiGet<PostRow>(request, `/admin/posts/${id}`)).likes;
    expect(await readCounter(page, "Likes")).toBe(before);

    const button = page.locator("article").getByRole("button", { name: /Like/ });
    await button.click();
    await expect(button).toContainText(`${before + 1} Like`);
    // No optimistic-revert error state.
    await expect(page.getByText("Something went wrong. Please try again.")).toHaveCount(0);
    expect((await apiGet<PostRow>(request, `/admin/posts/${id}`)).likes).toBe(before + 1);

    // Like is server-persisted (no per-user identity): reload keeps the count.
    await page.reload();
    await expect(page.locator("article").getByText(new RegExp(`^${before + 1}\\s+Likes$`))).toBeVisible();
  });

  test("draft posts never reach the public site", async ({ page, request }) => {
    // slug: "" mimics exactly what the admin editor sends for an untouched Slug
    // field. The backend preprocesses "" → undefined and derives
    // slugify(titleEn), so the created row MUST carry the title-derived slug —
    // never the old "post"/"post-N" fallback. This is the E2E proof for the
    // backend slug-normalization fix.
    const res = await request.post(`${API}/admin/posts`, {
      headers: AUTH(token),
      data: {
        titleEn: DRAFT_TITLE,
        titleRw: `${DRAFT_TITLE} RW`,
        contentEn: `Draft body ${RUN}`,
        contentRw: `Umubiri w'inyandiko ${RUN}`,
        contentType: "STUDIO_NEWS",
        slug: "",
        published: false,
      },
    });
    expect(res.status()).toBe(201);
    const created = (await res.json()) as PostRow;
    expect(created.slug, "slug is derived from titleEn, not the UI ''").toBe(DRAFT_SLUG);
    expect(created.slug, "title-created post must never get the 'post'/'post-N' fallback").not.toMatch(/^post(-\d+)?$/);

    // Not in the public list…
    const list = await apiGet<PostRow[]>(request, "/public/posts");
    expect(list.some((p) => p.slug === DRAFT_SLUG)).toBe(false);

    // …not on /blog…
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: DRAFT_TITLE })).toHaveCount(0);

    // …and a direct URL falls through to the themed 404 (drafts are filtered
    // server-side, so fetchPost → null → notFound()).
    await page.goto(`/blog/${DRAFT_SLUG}`);
    await expect(page.getByRole("heading", { name: "This page is out of frame" })).toBeVisible();
  });

  test("admin edit updates the card; delete restores the empty state", async ({ page, request }) => {
    // QA #1 regression proof: edits round-trip through PATCH /admin/posts/:id
    // (AdminBlog.tsx now uses adminApi.patch, and the editor stays open with a
    // "Saved" label until dismissed). The renamed title must survive save +
    // reload all the way to the public index.
    expect(published, "runs after the admin-create test").not.toBeNull();

    // Reuse the API token instead of a second UI login (login already covered above).
    await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), token);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
    await openBlogTab(page);

    // --- Edit: rename the published post, keep it published. ---
    let row = page.locator("tbody tr").filter({ hasText: RUN_TITLE });
    await row.getByRole("button", { name: "Edit" }).click();
    const form = page.locator("form").first();
    await expect(editorField(form, "Title (EN)")).toHaveValue(RUN_TITLE);
    await editorField(form, "Title (EN)").fill(RENAMED_TITLE);
    await form.getByRole("button", { name: "Save" }).click();
    // Same persisted-editor pattern as the create flow: Saved label → dismiss.
    await expect(form.getByRole("button", { name: "Saved" })).toBeVisible({ timeout: 15000 });
    await form.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("form").first()).toHaveCount(0);

    row = page.locator("tbody tr").filter({ hasText: RENAMED_TITLE });
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(page.locator("tbody tr").filter({ hasText: RUN_TITLE })).toHaveCount(0);

    // Renamed title is what the public index now shows.
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: RENAMED_TITLE })).toBeVisible();
    await expect(page.getByRole("heading", { name: RUN_TITLE })).toHaveCount(0);

    // --- Delete everything the suite created (UI delete + inline confirm). ---
    await page.goto("/admin");
    await openBlogTab(page);
    for (const title of [RENAMED_TITLE, DRAFT_TITLE]) {
      const r = page.locator("tbody tr").filter({ hasText: title });
      await expect(r).toBeVisible({ timeout: 10000 });
      await r.getByRole("button", { name: "Delete" }).click();
      await r.getByRole("button", { name: "Yes, delete" }).click();
      await expect(page.locator("tbody tr").filter({ hasText: title })).toHaveCount(0, { timeout: 10000 });
    }
    // The literal empty state only applies when no real content exists —
    // owner-authored posts (non-"e2e-" slugs) are legitimate content that
    // keeps both lists non-empty (same relaxation as the index empty-state
    // test at the top of this file). What must ALWAYS hold: zero e2e posts.
    const remaining = await apiGet<PostRow[]>(request, "/admin/posts");
    expect(remaining.filter((p) => p.slug.startsWith("e2e-")), "every e2e post must be deleted").toHaveLength(0);
    if (remaining.length === 0) {
      // admin_blog_empty EN is "No posts yet — write your first story." — a
      // tolerant ASCII prefix regex (no em dash in the matcher, and no exact
      // copy pinning) so the assertion survives copy tweaks.
      await expect(page.getByText(/^No posts yet/)).toBeVisible();

      // Admin list is empty and the public site is back to the empty state.
      expect(await apiGet<PostRow[]>(request, "/public/posts")).toEqual([]);
      await page.goto("/blog");
      await expect(page.getByRole("heading", { name: "No stories yet" })).toBeVisible();
    }
  });
});
