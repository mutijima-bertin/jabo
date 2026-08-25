import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";

const API = "http://localhost:4000/api";
// Credentials come from the environment (root .env via playwright.config.ts,
// or CI env) — never hardcoded. Same contract as blog.spec.ts.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

// One unique run id → names/markers never collide with earlier runs, and any
// leftover from a crashed run is identifiable by prefix for the cleanup sweep.
const RUN = Date.now();
const LOGO_FILE = `e2e-logo-${RUN}.png`; // uploaded filename → logo name minus ext
const LOGO_NAME = `e2e-logo-${RUN}`;
const AUTHOR = "E2E Checker";
const ROLE_MARKER = `E2E ${RUN}`; // unique per run; also the cleanup key
const QUOTE = "Flawless production from booking to delivery.";
const GARBAGE_QUERY = `zz-no-match-${RUN}@nowhere.invalid`;

// Minimal shapes of the admin API rows used below (mirrors src/lib/api.ts).
interface AdminLogo {
  id: string;
  name: string;
  imageUrl: string | null;
}
interface AdminTestimonial {
  id: string;
  author: string;
  role: string | null;
  contentEn: string;
  published: boolean;
}

let token: string;
let baselineLogos = -1; // captured in beforeAll AFTER the defensive sweep
let baselineTestimonials = -1;

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

// Remove anything this spec's namespace could have left behind (crashed run,
// interrupted retry) so the baseline captured afterwards is trustworthy.
async function sweepE2ECreated(request: APIRequestContext): Promise<void> {
  const logos = await apiGet<AdminLogo[]>(request, "/admin/logos").catch(() => []);
  for (const l of logos) {
    if (l.name.startsWith("e2e-logo-")) {
      await request.delete(`${API}/admin/logos/${l.id}`, { headers: AUTH(token) });
    }
  }
  const testimonials = await apiGet<AdminTestimonial[]>(request, "/admin/testimonials").catch(() => []);
  for (const t of testimonials) {
    if (t.author === AUTHOR || (t.role ?? "").startsWith("E2E ")) {
      await request.delete(`${API}/admin/testimonials/${t.id}`, { headers: AUTH(token) });
    }
  }
}

async function adminLoginViaUi(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByPlaceholder("admin@creativesoundstudio.rw").fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
}

async function openAdminTab(page: Page, name: string): Promise<void> {
  await page.locator("aside").getByRole("button", { name, exact: true }).click();
}

/** The Settings tab hosts three stacked blocks; scope by the block's heading. */
function adminSection(page: Page, heading: string): Locator {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
}

// The testimonial editor labels have no htmlFor — climb from the label to the
// wrapper div and pick the control (same trick as editorField in blog.spec.ts).
function formField(form: Locator, labelText: string, tag: "input" | "textarea" = "input"): Locator {
  return form.locator("label", { hasText: labelText }).locator("..").locator(tag).first();
}

test.describe("phase 8 admin features", () => {
  // Tests build on each other's state (login → logos → publish journey → draft),
  // so the file runs serially in a single worker.
  test.describe.configure({ mode: "serial" });
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "ADMIN_EMAIL/ADMIN_PASSWORD not set");

  test.beforeAll(async ({ request }) => {
    token = await adminLogin(request); // exactly one admin API login per run
    await sweepE2ECreated(request); // defend against leftovers from a crashed run
    baselineLogos = (await apiGet<AdminLogo[]>(request, "/admin/logos")).length;
    baselineTestimonials = (await apiGet<AdminTestimonial[]>(request, "/admin/testimonials")).length;
  });

  test.afterAll(async ({ request }) => {
    await sweepE2ECreated(request);
    const logos = await apiGet<AdminLogo[]>(request, "/admin/logos");
    const testimonials = await apiGet<AdminTestimonial[]>(request, "/admin/testimonials");
    // Constraint: the suite leaves the catalog exactly at its starting size.
    expect(logos, `"Client logos" must return to baseline (${baselineLogos})`).toHaveLength(baselineLogos);
    expect(
      testimonials,
      `"Testimonials" must return to baseline (${baselineTestimonials})`,
    ).toHaveLength(baselineTestimonials);
  });

  test("clients tab renders directory with search", async ({ page }) => {
    await adminLoginViaUi(page);
    await openAdminTab(page, "Clients");
    // The h1 embeds a live count badge (<span>N</span>), so its accessible
    // name is e.g. "Clients48" — match by prefix, not exact.
    await expect(page.getByRole("heading", { name: /^Clients\d*$/ })).toBeVisible();

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const initial = await rows.count();
    expect(initial, "directory should list the seeded portal clients").toBeGreaterThan(0);

    // Pick the first row that actually has an email (cells render "—" when null).
    let email = "";
    for (let i = 0; i < initial; i++) {
      const candidate = (await rows.nth(i).locator("td").nth(1).innerText()).trim();
      if (candidate && candidate !== "—") {
        email = candidate;
        break;
      }
    }
    expect(email, "at least one client should have an email").not.toBe("");

    // Searching a substring of that email narrows the table; bookings upsert
    // clients by email, so addresses are unique → exactly one match.
    const search = page.getByPlaceholder("Search by name or email");
    await search.fill(email);
    await expect(page.locator("tbody tr")).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator("tbody tr").first()).toContainText(email);

    // Garbage query → explicit no-match empty state (not the "no clients yet" one).
    await search.fill(GARBAGE_QUERY);
    await expect(page.getByText("No clients match your search.")).toBeVisible();
    await expect(rows).toHaveCount(0);
  });

  test("logo add and delete round-trip", async ({ page, request }) => {
    expect(token, "runs after the beforeAll login").toBeTruthy();
    await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), token);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
    await openAdminTab(page, "Settings");

    const logosSection = adminSection(page, "Client logos");
    await expect(logosSection.getByRole("heading", { name: "Client logos" })).toBeVisible({ timeout: 10000 });

    const before = (await apiGet<AdminLogo[]>(request, "/admin/logos")).length;
    expect(before).toBe(baselineLogos);

    // Small generated PNG (valid 1×1 image) through the dropzone's hidden input.
    const png1x1 = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await logosSection.locator('input[type="file"]').setInputFiles({
      name: LOGO_FILE,
      mimeType: "image/png",
      buffer: png1x1,
    });

    // Card for the new logo appears (upload → convert → create → refetch).
    const nameEl = logosSection.getByText(LOGO_NAME, { exact: true });
    await expect(nameEl).toBeVisible({ timeout: 20000 });
    const afterUpload = await apiGet<AdminLogo[]>(request, "/admin/logos");
    expect(afterUpload, "logo count should grow by exactly one").toHaveLength(before + 1);

    // Backend converts raster uploads to WebP — soft-assert, report the value.
    const created = afterUpload.find((l) => l.name === LOGO_NAME);
    const imageUrl = created?.imageUrl ?? "<missing>";
    expect.soft(
      imageUrl.endsWith(".webp"),
      `[soft] uploaded PNG should be stored as .webp — actual imageUrl: ${imageUrl}`,
    ).toBeTruthy();

    // Delete it (window.confirm → auto-accept) and the wall returns to baseline.
    page.on("dialog", (d) => void d.accept());
    const card = nameEl.locator("xpath=..");
    await card.getByRole("button", { name: "Delete" }).click();
    await expect(nameEl).toHaveCount(0, { timeout: 10000 });
    expect(await apiGet<AdminLogo[]>(request, "/admin/logos")).toHaveLength(before);
  });

  test("testimonial approval journey reaches the homepage and back", async ({ page, request }) => {
    expect(token, "runs after the beforeAll login").toBeTruthy();

    // Homepage starts with NO testimonials section (baseline is zero published).
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What clients say" })).toHaveCount(0);
    await expect(page.getByText(QUOTE)).toHaveCount(0);

    // Admin creates a PUBLISHED testimonial through the Settings tab.
    await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), token);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
    await openAdminTab(page, "Settings");

    const testimonialsSection = adminSection(page, "Testimonials");
    await expect(testimonialsSection.getByRole("heading", { name: "Testimonials" })).toBeVisible({ timeout: 10000 });

    await testimonialsSection.getByRole("button", { name: "+ New testimonial" }).click();
    const form = testimonialsSection.locator("form");
    await expect(formField(form, "Author *")).toBeVisible();
    await formField(form, "Author *").fill(AUTHOR);
    await formField(form, "Role / company").fill(ROLE_MARKER);
    await formField(form, "Quote (EN)", "textarea").fill(QUOTE);
    await form.getByRole("checkbox").check(); // published (already default-checked)

    // Status pill flips to Published and the refreshed list carries the row.
    await form.getByRole("button", { name: "Create" }).click();
    const row = page.locator("tbody tr").filter({ hasText: AUTHOR });
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText("Published");

    // …and the homepage now renders the section with the quote.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What clients say" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(QUOTE)).toBeVisible();
    await expect(page.getByText(AUTHOR)).toBeVisible();

    // Unpublish → section disappears again.
    await page.goto("/admin");
    await openAdminTab(page, "Settings");
    const rowAgain = page.locator("tbody tr").filter({ hasText: AUTHOR });
    await expect(rowAgain).toBeVisible({ timeout: 10000 });
    await rowAgain.getByRole("button", { name: "Unpublish" }).click();
    await expect(rowAgain).toContainText("Draft", { timeout: 10000 });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What clients say" })).toHaveCount(0);
    await expect(page.getByText(QUOTE)).toHaveCount(0);

    // Delete → admin list is empty again.
    await page.goto("/admin");
    await openAdminTab(page, "Settings");
    page.on("dialog", (d) => void d.accept());
    const rowFinal = page.locator("tbody tr").filter({ hasText: AUTHOR });
    await expect(rowFinal).toBeVisible({ timeout: 10000 });
    await rowFinal.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No testimonials yet.")).toBeVisible({ timeout: 10000 });
    expect(await apiGet<AdminTestimonial[]>(request, "/admin/testimonials")).toHaveLength(baselineTestimonials);
  });

  test("draft testimonial never reaches the homepage", async ({ page, request }) => {
    expect(token, "runs after the beforeAll login").toBeTruthy();
    await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), token);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
    await openAdminTab(page, "Settings");

    const testimonialsSection = adminSection(page, "Testimonials");
    await expect(testimonialsSection.getByRole("heading", { name: "Testimonials" })).toBeVisible({ timeout: 10000 });

    await testimonialsSection.getByRole("button", { name: "+ New testimonial" }).click();
    const form = testimonialsSection.locator("form");
    await expect(formField(form, "Author *")).toBeVisible();
    await formField(form, "Author *").fill(AUTHOR);
    await formField(form, "Role / company").fill(`draft ${ROLE_MARKER}`);
    await formField(form, "Quote (EN)", "textarea").fill(`Unpublished draft quote ${RUN}.`);
    await form.getByRole("checkbox").uncheck(); // explicitly a draft
    await form.getByRole("button", { name: "Create" }).click();

    // List marks it Draft and dims the row.
    const row = page.locator("tbody tr").filter({ hasText: AUTHOR });
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText("Draft");
    await expect(row).toHaveClass(/opacity-60/);

    // Drafts stay off the public site entirely.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What clients say" })).toHaveCount(0);
    await expect(page.getByText(`Unpublished draft quote ${RUN}.`)).toHaveCount(0);

    // Clean up through the UI (confirm dialog) → back to an empty list.
    await page.goto("/admin");
    await openAdminTab(page, "Settings");
    page.on("dialog", (d) => void d.accept());
    const rowFinal = page.locator("tbody tr").filter({ hasText: AUTHOR });
    await expect(rowFinal).toBeVisible({ timeout: 10000 });
    await rowFinal.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No testimonials yet.")).toBeVisible({ timeout: 10000 });
    expect(await apiGet<AdminTestimonial[]>(request, "/admin/testimonials")).toHaveLength(baselineTestimonials);
  });
});
