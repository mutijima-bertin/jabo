import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
import { API, getAdminToken } from "./auth";
// Single source of truth for the top-services Y-axis tick formatter — matches
// the EXACT rendered (truncated) label, never the untruncated API string.
// Pure module (no JSX/React), safe for Playwright's esbuild transpiler.
import { truncateServiceName } from "../src/lib/admin-charts";

/**
 * admin-overhaul.spec.ts — E2E proof for the admin interface overhaul
 * (design contract: docs/design/admin-interface-spec.md).
 *
 * The existing specs already cover the old affordances; THIS file proves the
 * nine behaviours that were previously untestable:
 *
 *  1. expired JWT            → single-fire guard redirect to /admin/login?expired=1
 *                              + "session expired" info banner
 *  2. routable ?tab=         → deep link loads the tab, reload persists it,
 *                              invalid values fall back to Dashboard, the
 *                              sidebar click rewrites the URL
 *  3. status filter chips    → ?status=PENDING drives the fetched list,
 *                              "All statuses" clears it
 *  4. bookings detail dialog → CONFIRMED transition with an attached note lands
 *                              in the timeline (status + note UI + API truth)
 *  5. services reorder       → "Move up" persists server-side, survives reload
 *  6. testimonial editor     → Settings rename propagates to the admin list AND
 *                              the public homepage
 *  7. uploads hourly quota   → test.skip (shared per-IP 20/hr limiter would
 *                              starve the parallel admin-features logo upload);
 *                              the contract probe proves the endpoint carries
 *                              the draft-7 combined RateLimit header that
 *                              admin.ts parses for the "N uploads left" hint
 *  8. mobile 390px           → no horizontal page overflow, snap-scrolling pill
 *                              nav owns the tab overflow, portfolio card
 *                              actions are visible WITHOUT hover (defect 3 fix)
 *  9. Kinyarwanda locale     → css_locale=rw renders RW shell labels
 *
 * Fixture hygiene: every created row carries the RUN-suffixed "E2E Overhaul"
 * prefix, and testimonial roles start with "E2E " to join the suite-wide
 * E2E-role convention (crossing sweeps + this file's afterAll sweep can always
 * find a leaked row). App code (frontend/src/**, backend/src/**) is READ-ONLY —
 * the app may not be modified here, only contracts asserted.
 */

// Logins happen ONCE per suite in the "setup" project (e2e/admin.auth.setup.ts).
// Credentials from the environment (root .env via playwright.config.ts, or CI
// env) — never hardcoded. Same contract as the other specs.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

// One unique run id per spec run → names/emails/slugs never collide with
// earlier runs (safe to rerun without a DB reset).
const RUN = Date.now();
const PREFIX = `E2E Overhaul ${RUN}`;

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// Minimal shapes of the API rows used below (mirrors src/lib/api.ts).
interface ServiceRow {
  id: string;
  nameEn: string;
  sortOrder: number;
}
interface PortfolioRow {
  id: string;
  titleEn: string;
}
interface TestimonialRow {
  id: string;
  author: string;
  role: string | null;
}
interface BookingLike {
  id: string;
  reference: string;
  status: string;
  eventDate?: string | null;
  location?: string | null;
  budgetRange?: string | null;
  events?: Array<{ id: string; status: string; note: string | null }>;
}

/** GET /admin/dashboard shape — mirrors frontend/src/lib/api.ts DashboardStats. */
interface DashboardPayload {
  stats: {
    total: number;
    pending: number;
    confirmed: number;
    inProduction: number;
    delivered: number;
    completed: number;
    cancelled: number;
    clients: number;
  };
  bookingsByDay: Array<{ date: string; count: number }>;
  topServices: Array<{ id: string; nameEn: string; count: number }>;
  counts: { testimonials: number; posts: number; portfolio: number; services: number };
  recent: Array<{ id: string; reference: string; status: string; createdAt: string; service: { nameEn: string } | null }>;
}

let token: string;

const AUTH = (t: string) => ({ Authorization: `Bearer ${t}` });

async function apiGet<T>(request: APIRequestContext, path: string, opts?: { auth?: boolean }): Promise<T> {
  const headers = opts?.auth === false ? undefined : { Authorization: `Bearer ${token}` };
  const res = await request.get(`${API}${path}`, { headers });
  if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Public booking create (same endpoint the client form posts to). */
async function createBooking(
  request: APIRequestContext,
  contactName: string,
  contactEmail: string,
  extra?: Partial<Pick<BookingLike, "eventDate" | "location" | "budgetRange">>,
): Promise<BookingLike> {
  const services = await apiGet<Array<{ id: string }>>(request, "/public/services", { auth: false });
  const res = await request.post(`${API}/bookings`, {
    data: { serviceId: services[0].id, contactName, contactEmail, language: "en", ...extra },
  });
  if (!res.ok()) throw new Error(`bookings create failed: ${res.status()} ${await res.text()}`);
  expect(res.status()).toBe(201);
  const { booking } = (await res.json()) as { booking: BookingLike };
  return booking;
}

async function createService(request: APIRequestContext, name: string, sortOrder: number): Promise<{ id: string }> {
  const res = await request.post(`${API}/admin/services`, {
    headers: AUTH(token),
    data: {
      nameEn: name,
      nameRw: `${name} RW`,
      priceEn: `${1000 + (RUN % 5000)} RWF`,
      priceRw: `${(RUN % 5000) + 1} RWF`,
      category: "Studio",
      icon: "",
      imageUrl: "", // "" is normalised to null by the backend schema
      published: false,
      featured: false,
      sortOrder,
    },
  });
  if (!res.ok()) throw new Error(`createService failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<{ id: string }>;
}

async function createTestimonial(
  request: APIRequestContext,
  body: { author: string; role: string; contentEn: string; published: boolean },
): Promise<{ id: string }> {
  const res = await request.post(`${API}/admin/testimonials`, {
    headers: AUTH(token),
    data: { ...body, contentRw: body.contentEn },
  });
  if (!res.ok()) throw new Error(`createTestimonial failed: ${res.status()} ${await res.text()}`);
  expect(res.status()).toBe(201);
  return res.json() as Promise<{ id: string }>;
}

/** Real HS256 admin JWT that is already expired (guard must still 401 it). */
function expiredAdminToken(): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: "000000000000000000000000", role: "admin", iat: now - 7200, exp: now - 1800 };
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const signingInput = `${b64(header)}.${b64(payload)}`;
  const secret = process.env.JWT_SECRET;
  if (!secret) return "definitely-expired-garbage"; // ANY invalid token maps to 401
  const sig = createHmac("sha256", secret).update(signingInput).digest("base64url");
  return `${signingInput}.${sig}`;
}

/** Boot an admin session for a fresh page without burning a UI login. */
async function adminSession(page: Page, locale?: "rw"): Promise<void> {
  await page.addInitScript(
    ([t, l]) => {
      localStorage.setItem("css_admin_token", t);
      if (l) localStorage.setItem("css_locale", l);
    },
    [token, locale] as [string, "rw" | undefined],
  );
}

test.describe("admin interface overhaul", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "ADMIN_EMAIL/ADMIN_PASSWORD not set");

  test.beforeAll(async ({ request }) => {
    token = getAdminToken(); // logged in once by the "setup" project
  });

  test.afterAll(async ({ request }) => {
    if (!token) return; // suite skipped before login — nothing to clean
    // Defensive sweep for anything this run leaked between tests.
    const services = await apiGet<ServiceRow[]>(request, "/admin/services").catch(() => []);
    for (const s of services) {
      if (s.nameEn.includes(PREFIX)) await request.delete(`${API}/admin/services/${s.id}`, { headers: AUTH(token) }).catch(() => {});
    }
    const portfolio = await apiGet<PortfolioRow[]>(request, "/admin/portfolio").catch(() => []);
    for (const p of portfolio) {
      if (p.titleEn.includes(PREFIX)) await request.delete(`${API}/admin/portfolio/${p.id}`, { headers: AUTH(token) }).catch(() => {});
    }
    const testimonials = await apiGet<TestimonialRow[]>(request, "/admin/testimonials").catch(() => []);
    for (const t of testimonials) {
      if ((t.role ?? "").includes(PREFIX)) await request.delete(`${API}/admin/testimonials/${t.id}`, { headers: AUTH(token) }).catch(() => {});
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Session expiry — the guard clears the token and redirects once.
  // ---------------------------------------------------------------------------
  test("expired JWT redirects to the login page with the session-expired banner", async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), expiredAdminToken());
    await page.goto("/admin");

    // The centralized useSessionGuard funnels every 401 through a single
    // client-side redirect (spec §9) — never an infinite loop.
    await expect(page).toHaveURL(/\/admin\/login\?expired=1$/, { timeout: 15000 });
    await expect(page.getByText("Your session has expired — please sign in again.")).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 1b. Chrome-free admin shell (QA #2) — /admin/login AND the authenticated
  // /admin must render WITHOUT the public Nav, Footer and WhatsApp FAB. The
  // standalone admin layout (frontend/src/app/admin/layout.tsx) renders only
  // {children}; these assertions pin the public chrome classes by their
  // accessible names so they can never silently come back.
  // ---------------------------------------------------------------------------
  test("admin shell is chrome-free: no public nav/footer/WhatsApp FAB on /admin/login or /admin", async ({ page }) => {
    const publicChrome = {
      mainNav: page.getByRole("navigation", { name: "Main" }), // site Nav desktop
      mobileNav: page.getByRole("navigation", { name: "Mobile" }), // site Nav mobile drawer
      footerNav: page.getByRole("navigation", { name: "Footer" }),
      footer: page.locator("footer"),
      whatsappFab: page.getByRole("link", { name: "Chat on WhatsApp" }),
    };

    // Login page (unauthenticated render path).
    await page.goto("/admin/login");
    await expect(page.getByPlaceholder("admin@creativesoundstudio.rw")).toBeVisible({ timeout: 10000 });
    for (const [label, l] of Object.entries(publicChrome)) {
      await expect(l, `public ${label} must be absent on /admin/login`).toHaveCount(0);
    }

    // Authenticated dashboard.
    await adminSession(page);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({ timeout: 10000 });
    for (const [label, l] of Object.entries(publicChrome)) {
      await expect(l, `public ${label} must be absent on /admin`).toHaveCount(0);
    }
  });

  // ---------------------------------------------------------------------------
  // 1d. Dashboard analytics (phase 7B) — the lazy-loaded recharts region renders
  // the live /admin/dashboard payload. KPIs mirror the API's own numbers,
  // the three chart cards + quick actions carry their titles, and the 14-day
  // area chart renders a REAL chart when the series has data (or its empty
  // state otherwise); a top-services row shows the leading live service name.
  // All counts are relational (read straight from the API), never hardcoded.
  // ---------------------------------------------------------------------------
  test("dashboard renders recharts KPIs, chart regions and quick actions from the live API", async ({ page, request }) => {
    const dash = await apiGet<DashboardPayload>(request, "/admin/dashboard");

    await adminSession(page);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({ timeout: 10000 });

    // KPI cards expose numeric labels. Exact snapshot equality is impossible
    // in this fully-parallel suite (sibling specs create/delete bookings while
    // this test runs), so assert the shape AND the one true booking invariant:
    // the six status KPIs always sum to the total-bookings KPI (same render).
    const totalBtn = page.getByRole("button", { name: /^Total bookings: \d+$/ });
    await expect(totalBtn).toBeVisible();
    await expect(page.getByRole("button", { name: /^Clients: \d+$/ })).toBeVisible();
    const kpiNumber = async (btn: Locator): Promise<number> => {
      const m = /\d+$/.exec((await btn.getAttribute("aria-label")) ?? "");
      return m ? Number(m[0]) : Number.NaN;
    };
    const total = await kpiNumber(totalBtn);
    const statusKpis = ["Booking received", "Confirmed", "In production", "Delivered", "Completed", "Cancelled"];
    const statusSum = (
      await Promise.all(statusKpis.map((label) => kpiNumber(page.getByRole("button", { name: new RegExp(`^${label}: \\d+$`) }))))
    ).reduce((a, b) => a + b, 0);
    expect(statusSum, `status KPIs ${statusSum} must equal the total bookings KPI ${total}`).toBe(total);

    // The three chart cards (+ quick actions) render once the chart chunk loads.
    const areaTitle = page.getByRole("heading", { name: "Bookings — last 14 days", exact: true });
    await expect(areaTitle).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Bookings by status", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top services", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quick actions", exact: true })).toBeVisible();

    // 14-day area: a real chart when the series has data, the empty state else.
    const areaCard = areaTitle.locator("..");
    if (dash.bookingsByDay.some((d) => d.count > 0)) {
      await expect(areaCard.locator('[role="img"][aria-label*="last 14 days"]')).toBeVisible();
    } else {
      await expect(areaCard.getByText("No bookings yet", { exact: true })).toBeVisible();
    }

    // Top services: at least one of the live top-5 service names renders a
    // bar row (the peak charts on seeded data; membership is stable, exact
    // ordering can shift while parallel specs add bookings). The Y-axis ticks
    // run through truncateServiceName (>22 chars → "…"), so match against the
    // SAME formatter — the full API string (e.g. the 27-char seed service
    // "Wedding & Event Photography") never appears verbatim in the chart.
    if (dash.topServices.length > 0) {
      const topCard = page.getByRole("heading", { name: "Top services", exact: true }).locator("..");
      let found = false;
      for (const s of dash.topServices) {
        if ((await topCard.getByText(truncateServiceName(s.nameEn), { exact: true }).count()) > 0) {
          found = true;
          break;
        }
      }
      expect(found, `top services chart must render one of: ${dash.topServices.map((s) => s.nameEn).join(", ")}`).toBe(true);
    }

    // Quick actions deep-link to the correct ?tab= targets.
    await page.getByRole("link", { name: "Clients", exact: true }).click();
    await expect(page).toHaveURL(/tab=clients$/);
    await expect(page.getByRole("heading", { name: /^Clients\d*$/ })).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // 1c. Login error mapping (QA #4) — the 429 → friendly-banner path for a
  // locked account. NOT runnable cheaply: the auth route is rate-limited to
  // 10 attempts / 10 min / IP (backend/src/routes/admin.ts), and burning the
  // remaining budget here would starve the setup login + retries mid-suite
  // (429 cascades). The mapping itself is one continuous line in
  // frontend/src/app/admin/login/page.tsx: 401/INVALID_CREDENTIALS →
  // t("admin_login_invalid"), 429/TOO_MANY_ATTEMPTS →
  // t("admin_login_rate_limited"), anything else → t("admin_error_generic").
  // A full lockout burn-down belongs in a CI-dedicated isolate.
  // ---------------------------------------------------------------------------
  test("locked account shows the friendly rate-limit banner — skipped", async () => {
    test.skip(true, "auth limiter is 10/10min per IP — see comment above");
  });

  // ---------------------------------------------------------------------------
  // 2. Routable tabs — ?tab= deep links, reload persistence, invalid fallback.
  // ---------------------------------------------------------------------------
  test("routable tabs: deep link, reload, invalid fallback, sidebar updates the URL", async ({ page }) => {
    await adminSession(page);

    await page.goto("/admin?tab=bookings");
    await expect(page.getByRole("heading", { name: "Bookings", level: 1 })).toBeVisible({ timeout: 10000 });

    // The tab lives in the URL, so reload (and back/forward) keeps it.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Bookings", level: 1 })).toBeVisible({ timeout: 10000 });

    // Hand-typed / undocumented values fall back to the dashboard, never 404.
    await page.goto("/admin?tab=garbage");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({ timeout: 10000 });

    // Sidebar click rewrites the URL (router.replace, preserving other params).
    await page.locator("aside").getByRole("button", { name: "Services", exact: true }).click();
    await expect(page).toHaveURL(/tab=services$/);
    await expect(page.getByRole("heading", { name: "Services", level: 1 })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 3. Bookings status filter — chips drive ?status= and the fetched list.
  // ---------------------------------------------------------------------------
  test("bookings filter chips drive ?status= and the visible rows", async ({ page, request }) => {
    const pending = await createBooking(request, `Filter Pending ${RUN}`, `filter-pending-${RUN}@test.local`);
    const done = await createBooking(request, `Filter Done ${RUN}`, `filter-done-${RUN}@test.local`);
    const patch = await request.patch(`${API}/admin/bookings/${done.id}/status`, {
      headers: AUTH(token),
      data: { status: "CONFIRMED" },
    });
    expect(patch.ok(), `precondition: booking transitions to CONFIRMED (${patch.status()} ${await patch.text()})`).toBe(true);

    await adminSession(page);
    await page.goto("/admin?tab=bookings");
    await expect(page.getByRole("heading", { name: "Bookings", level: 1 })).toBeVisible({ timeout: 10000 });

    const filters = page.getByRole("navigation", { name: "Filter bookings by status" });
    await filters.getByRole("button", { name: "Booking received", exact: true }).click(); // PENDING chip

    await expect(page).toHaveURL(/tab=bookings&status=PENDING$/);
    await expect(page.locator("tbody tr").filter({ hasText: pending.reference })).toBeVisible();
    await expect(page.locator("tbody tr").filter({ hasText: done.reference })).toHaveCount(0);

    // Clearing the filter drops ?status= and the CONFIRMED row returns.
    await filters.getByRole("button", { name: "All statuses", exact: true }).click();
    await expect(page).not.toHaveURL(/status=/);
    await expect(page.locator("tbody tr").filter({ hasText: done.reference })).toBeVisible();
    await expect(page.locator("tbody tr").filter({ hasText: pending.reference })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 3b. Bookings LIST columns — Event date | Location | Budget data round-trip.
  // The overhaul widened the table to 8 columns; create the row via the public
  // API (fast, skips the form), then assert the three new cells on its row.
  // ---------------------------------------------------------------------------
  test("bookings list renders the Event date, Location and Budget columns", async ({ page, request }) => {
    const location = `${PREFIX} venue`;
    const booking = await createBooking(request, `Columns E2E ${RUN}`, `columns-${RUN}@test.local`, {
      eventDate: "2026-12-25",
      location,
      budgetRange: "600k–1.5m RWF",
    });
    // Server-side truth: the extra fields were persisted with the booking.
    expect(booking.eventDate, "eventDate should not be null").toBeTruthy();
    expect(booking.location).toBe(location);
    expect(booking.budgetRange).toBe("600k–1.5m RWF");

    await adminSession(page);
    await page.goto("/admin?tab=bookings");
    await expect(page.getByRole("heading", { name: "Bookings", level: 1 })).toBeVisible({ timeout: 10000 });

    // Row is newest-first (list sorts by createdAt desc) but anchor by the
    // unique reference so ordering never matters.
    const row = page.locator("tbody tr").filter({ hasText: booking.reference });
    await expect(row).toBeVisible({ timeout: 10000 });

    // 8 columns: 0 Reference | 1 Client | 2 Service | 3 Event date | 4 Location
    // | 5 Budget | 6 Status | 7 Created.
    const cells = row.locator("td");
    await expect(cells.nth(3), "event date cell renders a formatted date (e.g. 25 Dec 2026), not a raw ISO or —")
      .toHaveText(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
    await expect(cells.nth(3)).not.toHaveText("—");
    await expect(cells.nth(4)).toHaveText(location);
    await expect(cells.nth(5)).toHaveText("600k–1.5m RWF");

    // The admin API agrees on what the row shows.
    const fresh = await apiGet<BookingLike>(request, `/admin/bookings/${booking.id}`);
    expect(fresh.location).toBe(location);
    expect(fresh.budgetRange).toBe("600k–1.5m RWF");
    expect(fresh.eventDate).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // 4. Booking detail dialog — CONFIRMED transition with an attached note.
  // ---------------------------------------------------------------------------
  test("booking detail dialog: CONFIRMED transition with note lands in the timeline", async ({ page, request }) => {
    const booking = await createBooking(request, `Note E2E ${RUN}`, `note-${RUN}@test.local`);
    const note = `E2E note ${RUN}`;

    await adminSession(page);
    await page.goto("/admin?tab=bookings");
    await expect(page.getByRole("heading", { name: "Bookings", level: 1 })).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: `View booking ${booking.reference}` }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await dialog.getByLabel("Note (optional)").fill(note);
    await dialog.getByRole("button", { name: "Confirmed", exact: true }).click();

    const statusSection = dialog.locator("section[aria-labelledby='bd-status']");
    // Reached status stops being offered as a next step…
    await expect(statusSection.getByRole("button", { name: "Confirmed", exact: true })).toHaveCount(0, { timeout: 10000 });
    // …and the status pill reflects it.
    await expect(statusSection.getByText("Confirmed", { exact: true })).toBeVisible();
    // Honest feedback (QA #6): because a note was attached, the dialog says in
    // so many words that it rode the status change — never a silent save.
    await expect(dialog.getByText("Note saved with the status change.")).toBeVisible();

    const timeline = dialog.locator("section[aria-labelledby='bd-timeline']");
    await expect(timeline.getByText(note, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(timeline.locator("li").filter({ hasText: "Confirmed" })).toBeVisible();

    // Server-side truth: the events[] trail carries the transition + note.
    const fresh = await apiGet<BookingLike>(request, `/admin/bookings/${booking.id}`);
    expect(fresh.status, "admin API agrees the booking is CONFIRMED").toBe("CONFIRMED");
    expect(fresh.events?.some((e) => e.status === "CONFIRMED" && e.note === note)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 5. Services reorder — Move up persists and survives a reload.
  // ---------------------------------------------------------------------------
  test("services reorder via Move up persists server-side and survives reload", async ({ page, request }) => {
    // Place both fixtures AFTER every existing service so the pair is at the
    // end of the grid in a deterministic A→B order.
    const services = await apiGet<ServiceRow[]>(request, "/admin/services");
    const maxOrder = Math.max(0, ...services.map((s) => s.sortOrder));
    const svcA = await createService(request, `${PREFIX} Svc A`, maxOrder + 1);
    const svcB = await createService(request, `${PREFIX} Svc B`, maxOrder + 2);

    try {
      await adminSession(page);
      await page.goto("/admin?tab=services");
      await expect(page.getByRole("heading", { name: "Services", level: 1 })).toBeVisible({ timeout: 10000 });

      const grid = page.locator("div.grid-cols-1.gap-4");
      await expect(grid.getByText(`${PREFIX} Svc A`, { exact: true })).toBeVisible({ timeout: 10000 });
      const cards = grid.locator("> div");
      const indexOf = async (name: string): Promise<number> =>
        (await cards.evaluateAll((els) => (els as HTMLElement[]).map((el) => el.textContent ?? ""))).findIndex((t) =>
          t.includes(name),
        );

      const a0 = await indexOf(`${PREFIX} Svc A`);
      const b0 = await indexOf(`${PREFIX} Svc B`);
      expect(a0).toBeGreaterThanOrEqual(0);
      expect(b0).toBeGreaterThan(a0); // B sorts after A

      await cards.nth(b0).getByRole("button", { name: "Move up", exact: true }).click();

      // The grid re-renders with the swapped order…
      await expect
        .poll(async () => [await indexOf(`${PREFIX} Svc A`), await indexOf(`${PREFIX} Svc B`)], { timeout: 10000 })
        .toEqual([b0, a0]);

      // …the order survives a reload (server persisted the dense sortOrder)…
      await page.reload();
      await expect
        .poll(async () => [await indexOf(`${PREFIX} Svc A`), await indexOf(`${PREFIX} Svc B`)], { timeout: 10000 })
        .toEqual([b0, a0]);

      // …and the admin API agrees: B now sorts before A.
      const after = await apiGet<ServiceRow[]>(request, "/admin/services");
      expect(after.findIndex((s) => s.id === svcB.id)).toBeLessThan(after.findIndex((s) => s.id === svcA.id));
    } finally {
      await request.delete(`${API}/admin/services/${svcA.id}`, { headers: AUTH(token) }).catch(() => {});
      await request.delete(`${API}/admin/services/${svcB.id}`, { headers: AUTH(token) }).catch(() => {});
    }
  });

  // ---------------------------------------------------------------------------
  // 6. Testimonial editor — rename propagates to the admin list + homepage.
  // ---------------------------------------------------------------------------
  test("settings testimonial rename propagates to the admin list and the homepage", async ({ page, request }) => {
    const author = `Editor ${RUN}`;
    const renamedAuthor = `Editor Renamed ${RUN}`;
    const quote = `Quote for the rename test ${RUN}.`;
    // Role joins the suite-wide "E2E " convention → crossing sweeps can clean a leak.
    const created = await createTestimonial(request, {
      author,
      role: `E2E ${PREFIX}`,
      contentEn: quote,
      published: true,
    });

    try {
      await adminSession(page);
      await page.goto("/admin?tab=settings");
      const section = page.locator("section").filter({
        has: page.getByRole("heading", { name: "Testimonials", exact: true }),
      });

      const row = section.locator("tbody tr").filter({ hasText: quote });
      await expect(row).toBeVisible({ timeout: 10000 });
      await row.getByRole("button", { name: "Edit", exact: true }).click();

      const authorInput = section.locator("form").locator("label", { hasText: "Author *" }).locator("..").locator("input");
      await expect(authorInput).toHaveValue(author);
      await authorInput.fill(renamedAuthor);
      await section.locator("form").getByRole("button", { name: "Save", exact: true }).click();
      await expect(section.locator("form")).toHaveCount(0, { timeout: 10000 });

      // The admin list reflects the rename…
      await expect(section.locator("tbody tr").filter({ hasText: renamedAuthor })).toBeVisible();
      await expect(section.locator("tbody tr").filter({ hasText: author }).filter({ hasText: quote })).toHaveCount(0);

      // …and the public homepage renders the renamed quote block.
      await page.goto("/");
      await expect(page.getByText(quote)).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(renamedAuthor)).toBeVisible();
    } finally {
      await request.delete(`${API}/admin/testimonials/${created.id}`, { headers: AUTH(token) }).catch(() => {});
    }
  });

  // ---------------------------------------------------------------------------
  // 7. Uploads hourly quota.
  // ---------------------------------------------------------------------------
  test("upload quota: exhausting the shared limiter to show the banner — skipped", async () => {
    // Economics (see file header): the uploads limiter is a shared per-IP
    // 20/hour budget (backend/src/routes/admin.ts). Burning all 20 here would
    // starve the parallel admin-features.spec logo-upload test AND its retries,
    // and Playwright's file-parallel ordering is not deterministic — a genuine
    // 429 cannot be driven safely inside this suite.
    //
    // The header-parse side of the fix IS probe-covered below: the backend
    // emits standardHeaders "draft-7" → ONE combined `RateLimit: limit=20,
    // remaining=N, reset=3600` header (legacyHeaders: false), and
    // frontend/src/lib/admin.ts (adminUpload) now parses that combined header
    // first via /remaining=(\d+)/, only falling back to the legacy
    // `RateLimit-Remaining` on older backends. The map from a 429 body
    // `RATE_LIMITED` to t("admin_upload_rate_limited") lives in
    // frontend/src/lib/i18n.tsx. A full quota burn-down is left as a
    // manual/CI-dedicated exercise.
    test.skip(true, "uploads limiter is a shared per-IP 20/hr budget — see comment above");
  });

  test("upload endpoint is guarded by the hourly limiter (contract probe)", async ({ request }) => {
    const res = await request.post(`${API}/admin/uploads`, {
      headers: { ...AUTH(token), "Content-Type": "application/json" },
      data: { dataUrl: PNG_DATA_URL },
    });
    expect(res.status()).toBe(201);
    // Backend limiter: standardHeaders "draft-7", legacyHeaders false → ONE
    // combined `RateLimit: limit=20, remaining=N, reset=…` header. This is the
    // exact header admin.ts parses (/remaining=(\d+)/) for the live uploads-
    // left hint — assert the combined VALUE, not just a RateLimit-* key.
    const headers = res.headers();
    const combined = Object.entries(headers).find(([k]) => k.toLowerCase() === "ratelimit")?.[1];
    expect(combined, "draft-7 combined RateLimit header must carry remaining=N").toMatch(/remaining=\d+/);
  });

  // ---------------------------------------------------------------------------
  // 8. Mobile (390px) — no page overflow, scrolling pill nav, visible actions.
  // ---------------------------------------------------------------------------
  test.describe("admin shell at 390px viewport", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("no horizontal page overflow; pill nav scrolls; portfolio actions always visible", async ({ page, request }) => {
      const title = `${PREFIX} Mobile Card`;
      const created = await request.post(`${API}/admin/portfolio`, {
        headers: AUTH(token),
        data: {
          titleEn: title,
          titleRw: "",
          category: "Corporate",
          clientName: "",
          tags: [],
          coverUrl: "/uploads/e2e-mobile.png", // admin-trusted path string; not fetched
          mediaUrls: [],
          mediaType: "image",
          published: false,
          sortOrder: 99999,
        },
      });
      expect(created.status()).toBe(201);
      const portfolioItem = (await created.json()) as { id: string };

      try {
        await adminSession(page);
        await page.goto("/admin?tab=portfolio");
        await expect(page.getByRole("heading", { name: "Portfolio", level: 1 })).toBeVisible({ timeout: 10000 });

        // The shell must not overflow the document — the nav owns its own scroll.
        const pageOverflow = await page.evaluate(() => {
          const el = document.scrollingElement;
          return (el?.scrollWidth ?? 0) > window.innerWidth;
        });
        expect(pageOverflow, "document must not scroll horizontally").toBe(false);

        // The mobile nav is the snap-scrolling pill rail (never wraps).
        const mobileNav = page.getByRole("navigation", { name: "Admin navigation" });
        await expect(mobileNav).toBeVisible();
        const navScrolls = await mobileNav.evaluate((el) => el.scrollWidth > el.clientWidth);
        expect(navScrolls, "the pill nav must scroll internally on 390px").toBe(true);

        // Portfolio card actions are ALWAYS visible — the overhaul removed the
        // hover-only reveal (spec §4.3 / defect 3), so no hover is needed. The
        // grid also dropped the old `.group` wrapper class; anchor the card by
        // its cover img[alt=title] and climb to the card div instead.
        const card = page.locator(`img[alt="${title}"]`).locator("..");
        await expect(card.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
        await expect(card.getByRole("button", { name: "Delete", exact: true })).toBeVisible();
      } finally {
        await request.delete(`${API}/admin/portfolio/${portfolioItem.id}`, { headers: AUTH(token) }).catch(() => {});
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Kinyarwanda locale — the dashboard + sidebar render RW labels.
  // ---------------------------------------------------------------------------
  test("dashboard and sidebar render Kinyarwanda labels when css_locale=rw", async ({ page }) => {
    await adminSession(page, "rw");
    await page.goto("/admin");

    // admin_dashboard = "Ahabanza"; data-independent (the h1 always renders).
    await expect(page.getByRole("heading", { name: "Ahabanza", level: 1 })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/^Incamake/)).toBeVisible(); // admin_dash_sub (RW)
    await expect(page.locator("aside").getByRole("button", { name: "Ubutumwa", exact: true })).toBeVisible(); // admin_bookings
  });

  // ---------------------------------------------------------------------------
  // 10. Admin portfolio delete — the always-visible in-flow footer action row
  // (no scrim / hover-reveal anymore) drives Delete, with BOTH branches of the
  // inline confirm exercised: cancel keeps the card, commit removes it.
  // ---------------------------------------------------------------------------
  test("admin portfolio Delete removes a card after confirm; Cancel keeps it", async ({ page, request }) => {
    const DELETE_TITLE = `${PREFIX} Delete Card`;
    const CANCEL_TITLE = `${PREFIX} Cancel Card`;

    const createCard = async (title: string): Promise<{ id: string }> => {
      const res = await request.post(`${API}/admin/portfolio`, {
        headers: AUTH(token),
        data: {
          titleEn: title,
          titleRw: "",
          category: "Corporate",
          clientName: "",
          tags: [],
          coverUrl: "/uploads/e2e-action.png", // admin-trusted path string; not fetched
          mediaUrls: [],
          mediaType: "image",
          published: false,
          sortOrder: 900001,
        },
      });
      expect(res.status(), `portfolio create for "${title}" should be 201`).toBe(201);
      return res.json() as Promise<{ id: string }>;
    };

    const toDelete = await createCard(DELETE_TITLE);
    const toKeep = await createCard(CANCEL_TITLE);

    try {
      await adminSession(page);
      await page.goto("/admin?tab=portfolio");
      await expect(page.getByRole("heading", { name: "Portfolio", level: 1 })).toBeVisible({ timeout: 10000 });

      // Anchor each card by its cover's img[alt=title] and climb to the card
      // div (the footer action row lives inside it at every breakpoint).
      const cardFor = (title: string) => page.locator(`img[alt="${title}"]`).locator("..");

      // --- Cancel branch: Delete → Cancel → the card stays put. ---
      let card = cardFor(CANCEL_TITLE);
      await expect(card.getByRole("button", { name: "Delete", exact: true })).toBeVisible({ timeout: 10000 });
      await card.getByRole("button", { name: "Delete", exact: true }).click();
      // The footer swaps the Delete button for the inline confirmation panel.
      await expect(card.getByRole("button", { name: "Yes, delete", exact: true })).toBeVisible();
      await card.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(card.getByRole("button", { name: "Delete", exact: true })).toBeVisible();
      expect(
        (await apiGet<Array<{ id: string }>>(request, "/admin/portfolio")).some((p) => p.id === toKeep.id),
        "cancelled delete must keep the item",
      ).toBe(true);

      // --- Commit branch: Delete → Yes, delete → the card disappears AND the
      // admin catalog no longer contains it. ---
      card = cardFor(DELETE_TITLE);
      await expect(card.getByRole("button", { name: "Delete", exact: true })).toBeVisible({ timeout: 10000 });
      await card.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(card.getByRole("button", { name: "Yes, delete", exact: true })).toBeVisible();
      await card.getByRole("button", { name: "Yes, delete", exact: true }).click();
      await expect(page.locator(`img[alt="${DELETE_TITLE}"]`)).toHaveCount(0, { timeout: 10000 });
      const after = await apiGet<Array<{ id: string }>>(request, "/admin/portfolio");
      expect(after.some((p) => p.id === toDelete.id), "deleted item must be gone from the admin API").toBe(false);
    } finally {
      // If the UI delete path itself failed, leave the catalog clean (the
      // afterAll PREFIX sweep is the backstop, this is the prompt path).
      const all = await apiGet<Array<{ id: string }>>(request, "/admin/portfolio").catch(() => []);
      for (const p of all) {
        if (p.id === toDelete.id || p.id === toKeep.id) {
          await request.delete(`${API}/admin/portfolio/${p.id}`, { headers: AUTH(token) }).catch(() => {});
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 11. Admin clients delete — the new 7th "Actions" column runs
  // DELETE /admin/clients/:id with the cascade-warning inline confirm. The
  // booking (created via the public API) and its client row must BOTH vanish.
  // ---------------------------------------------------------------------------
  test("admin clients Delete removes the client row and cascades their bookings", async ({ page, request }) => {
    const email = `clients-del-${RUN}@test.local`;
    const contactName = `Clients Del ${RUN}`;
    // The public booking create upserts the Client row too (portal contract).
    const booking = await createBooking(request, contactName, email);
    expect(booking.reference).toBeTruthy();

    const clientsList = () => apiGet<Array<{ id: string; email: string | null }>>(request, "/admin/clients");
    const bookingStillListed = async (): Promise<boolean> =>
      (await apiGet<Array<{ reference: string }>>(request, "/admin/bookings")).some((b) => b.reference === booking.reference);

    // Preconditions via the admin API: the booking upsert created its client
    // row, and the booking is listed before the deletion.
    const seeded = await clientsList();
    const clientRow = seeded.find((c) => c.email === email);
    expect(clientRow, "booking create must upsert the client row").toBeTruthy();
    expect(await bookingStillListed()).toBe(true);

    try {
      await adminSession(page);
      await page.goto("/admin?tab=clients");
      await expect(page.getByRole("heading", { name: /^Clients\d*$/ })).toBeVisible({ timeout: 10000 });

      // Narrow the directory to exactly our run-unique client (search is the
      // client-side filter; the email cell is unique per booking upsert).
      const search = page.getByPlaceholder("Search by name or email");
      await search.fill(email);
      const row = page.locator("tbody tr").filter({ hasText: email });
      await expect(row).toHaveCount(1, { timeout: 10000 });

      // Delete → the inline confirm spells out the cascade out loud.
      await row.getByRole("button", { name: "Delete", exact: true }).click();
      await expect(row.getByText("Delete this client? Their bookings and testimonials are removed too.")).toBeVisible();
      await row.getByRole("button", { name: "Yes, delete", exact: true }).click();

      // The row disappears and the success banner confirms the removal.
      await expect(page.locator("tbody tr").filter({ hasText: email })).toHaveCount(0, { timeout: 10000 });
      await expect(page.getByText("Client removed", { exact: true })).toBeVisible();

      // Server truth: the client is gone…
      expect((await clientsList()).some((c) => c.email === email), "client must leave the admin catalog").toBe(false);
      // …and the cascade wiped the booking too (that is the point of the API).
      expect(await bookingStillListed(), "client deletion must cascade to their bookings").toBe(false);
    } finally {
      // If the UI delete path failed, clean the orphan client via the admin
      // API — it is the only route (no public booking DELETE endpoint exists).
      const all = await clientsList().catch(() => []);
      const orphan = all.find((c) => c.email === email);
      if (orphan) {
        await request.delete(`${API}/admin/clients/${orphan.id}`, { headers: AUTH(token) }).catch(() => {});
      }
    }
  });
});