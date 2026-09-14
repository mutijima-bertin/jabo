import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { API, getAdminToken } from "./auth";

/**
 * client-testimonial.spec.ts — E2E for authenticated client testimonial
 * submissions (magic-link login → /account).
 *
 * Journey covered end-to-end:
 *   1. a client who has booked (≥1 booking) gets the "Share your experience"
 *      section on /account and submits ONE testimonial (author is server-set
 *      from the client record; 10–1000 char quota EN).
 *   2. a too-short quote is blocked CLIENT-side (hint flips to role=alert),
 *      and a duplicate submit is blocked SERVER-side (409 ALREADY_SUBMITTED).
 *   3. the admin Settings → Testimonials table shows the CLIENT source badge
 *      with the client name/email sub-line, and the publish toggle flips the
 *      pill; the public homepage then renders the quote + author.
 *   4. the client account page flips to the "Live on our site" pill.
 *
 * Rate-limit discipline (5 login-requests / 10 min / IP): the whole spec uses
 * ONE magic-link request (test 1). The client JWT (7d TTL) is captured from
 * localStorage and re-injected into later tests — no second login-request.
 *
 * DB hygiene: the testimonial is deleted via the admin API in afterAll (the
 * booking/client rows are left behind, matching clients.spec's clean-up style
 * — no other spec clears them either). Role carries the suite-wide "E2E "
 * prefix so the owner-catalog baselines in admin-features.spec and
 * redesign.spec exclude this row while it is live (parallel-safe).
 */

const BACKEND_CONTAINER = "css-backend";
const BACKEND_LOG_FILE = process.env.BACKEND_LOG_FILE;

// One unique run id → email/name/quote never collide with earlier runs.
const RUN = Date.now();
const EMAIL = `client-testi-${RUN}@test.local`;
const CLIENT_NAME = `Testi Client ${RUN}`;
// Role joins the suite-wide "E2E " convention so owner-catalog checks in
// admin-features.spec and redesign.spec exclude these rows while they are live.
const ROLE = `E2E Client Testimonial ${RUN}`;
const QUOTE = `Every frame was delivered with care, exactly on time. Test ${RUN}.`;
const SHORT_QUOTE = "ABC"; // < 10 chars → client-side validation must block it

function readBackendLogs(): string {
  if (BACKEND_LOG_FILE) return readFileSync(BACKEND_LOG_FILE, "utf8");
  return execSync(`docker logs ${BACKEND_CONTAINER} 2>&1`, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

// Poll the backend output until the line for our (unique per run) email shows up.
async function fetchMagicToken(email: string, timeoutMs = 15000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastLogs = "";
  while (Date.now() < deadline) {
    try {
      const logs = readBackendLogs();
      lastLogs = logs;
      const lines = logs.split("\n").filter((l) => l.includes(`Magic login link for ${email}`));
      const last = lines[lines.length - 1];
      if (last) {
        const match = last.match(/token=([a-f0-9]{16,})/);
        if (match) return match[1];
      }
    } catch (err) {
      lastLogs = String(err);
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  const snippet = lastLogs.split("\n").slice(-5).join("\n");
  const source = BACKEND_LOG_FILE ? `file ${BACKEND_LOG_FILE}` : `${BACKEND_CONTAINER} logs`;
  throw new Error(
    `No magic link found in ${source} for ${email} within ${timeoutMs}ms. ` +
      `Check the request reached /clients/login-request (rate limiter: 5 req / 10 min / IP — ` +
      `wait out the window before rerunning). Last log lines:\n${snippet}`,
  );
}

// Seed a real booking through the public API. This also upserts the client
// row, so a magic link can later be issued for that email (clients.spec pattern).
async function createBookingFor(email: string): Promise<{ reference: string }> {
  const services = await (await fetch(`${API}/public/services`)).json();
  const res = await fetch(`${API}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: services[0].id,
      contactName: CLIENT_NAME,
      contactEmail: email,
      language: "en",
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Booking seed failed (${res.status}): ${JSON.stringify(body)}`);
  return { reference: body.booking.reference };
}

interface AdminTestimonialRow {
  id: string;
  author: string;
  role: string | null;
  contentEn: string;
  source: "ADMIN" | "CLIENT";
  published: boolean;
  client: { name: string; email: string } | null;
}

let token: string; // admin token (setup project)
let clientToken: string; // client JWT captured in test 1, reused in test 3 (no 2nd login-request)

const AUTH = (t: string) => ({ Authorization: `Bearer ${t}` });

async function apiGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(`${API}${path}`, { headers: AUTH(token) });
  if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<T>;
}

test.describe("client testimonials", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ request }) => {
    token = getAdminToken(); // logged in once by the "setup" project
  });

  test.afterAll(async ({ request }) => {
    if (!token) return;
    // Defensive sweep: whatever this spec created must be deleted so the
    // catalog returns to baseline. Leave the client/booking rows behind —
    // clients.spec and admin-overhaul.spec do the same, so no other file
    // has a dependency counting bookings/clients.
    const all = await apiGet<AdminTestimonialRow[]>(request, "/admin/testimonials").catch(() => []);
    const ours = all.filter(
      (t) => t.contentEn === QUOTE || t.author === CLIENT_NAME || (t.role ?? "").startsWith("E2E Client Testimonial"),
    );
    // Log rather than hard-fail: if the submission test itself failed (e.g. a
    // rate-limit cascade), no row exists and that failure is already reported.
    console.log(`[client-testimonial.spec] afterAll deleting ${ours.length} E2E testimonial row(s)`);
    for (const t of ours) {
      await request.delete(`${API}/admin/testimonials/${t.id}`, { headers: AUTH(token) }).catch(() => {});
    }

    // The public homepage must no longer render our quote (SSR fetch, no page
    // fixture needed in afterAll).
    const home = await request.get("http://localhost:3000/");
    const html = await home.text();
    expect(html, "quote is gone from the homepage after cleanup").not.toContain(QUOTE);
    expect(html, "client author name is gone from the homepage after cleanup").not.toContain(CLIENT_NAME);
  });

  test("client submits one testimonial; short quotes are blocked client-side; duplicates 409", async ({ page }) => {
    const { reference } = await createBookingFor(EMAIL);

    // ONE login-request for the whole spec. Request through the real UI.
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(EMAIL);
    await page.getByRole("button", { name: "Send magic link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible({ timeout: 15000 });

    const magicToken = await fetchMagicToken(EMAIL);
    expect(magicToken).toMatch(/^[a-f0-9]{16,}$/);

    await page.goto(`/login?token=${magicToken}`);
    await expect(page).toHaveURL(/\/account$/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
    await expect(page.getByText(reference, { exact: true })).toBeVisible();

    // "Share your experience" only renders when the account has ≥1 booking.
    const sectionTitle = page.getByRole("heading", { name: "Share your experience" });
    await expect(sectionTitle).toBeVisible();
    await expect(page.getByLabel("Your role (optional)")).toBeVisible();
    await expect(page.getByLabel(/Your testimonial \(English\)/)).toBeVisible();

    // Client-side validation: a short quote must NOT reach the wire. The hint
    // flips to role=alert and the form stays put (heading unchanged).
    await page.getByLabel(/Your testimonial \(English\)/).fill(SHORT_QUOTE);
    await page.getByRole("button", { name: "Submit for review" }).click();
    const hint = page.getByText("Minimum 10 characters.");
    await expect(hint).toHaveAttribute("role", "alert");
    await expect(hint).toBeVisible();
    await expect(sectionTitle).toBeVisible(); // still the form view — nothing submitted
    await expect(page.getByRole("heading", { name: "Your testimonial is in review" })).toHaveCount(0);

    // Submit a valid unique quote → "awaiting approval" state with the quote.
    await page.getByLabel(/Your testimonial \(English\)/).fill(QUOTE);
    await page.getByLabel("Your role (optional)").fill(ROLE);
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByRole("heading", { name: "Your testimonial is in review" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Awaiting approval", { exact: true })).toBeVisible();
    await expect(page.getByText(QUOTE)).toBeVisible();
    // CLIENT_NAME appears in BOTH the profile greeting and the testimonial
    // figure — scope to the figure so Playwright doesn't choke on strict mode.
    await expect(page.locator("figure figcaption").getByText(CLIENT_NAME, { exact: true })).toBeVisible();
    await expect(page.getByText("Live on our site", { exact: true })).toHaveCount(0);

    // The submitted state survives a reload (server-persisted row).
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your testimonial is in review" })).toBeVisible();
    await expect(page.getByText("Awaiting approval", { exact: true })).toBeVisible();

    // Capture the client JWT for later tests — no second login-request needed.
    clientToken = (await page.evaluate(() => localStorage.getItem("css_client_token"))) ?? "";
    expect(clientToken).toMatch(/^eyJ/);

    // Duplicate submit: the UI hides the form after submission (state switch),
    // so prove the server-side 409 gate directly with the same credentials.
    // POST /clients/testimonials is limited to 5 req/hour/IP: a retry of this
    // test (or a rerun within the hour) can itself deplete that budget, in
    // which case the server refuses with 429 instead of 409. Either refusal
    // proves no second row was created, which is what the gate guarantees.
    const dup = await fetch(`${API}/clients/testimonials`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({ contentEn: `A duplicate quote ${RUN}` }),
    });
    expect(
      dup.status === 409 || dup.status === 429,
      `duplicate submit must be refused server-side (got ${dup.status})`,
    ).toBe(true);
    if (dup.status === 409) {
      expect(((await dup.json()) as { error: string }).error).toBe("ALREADY_SUBMITTED");
    }
  });

  test("admin sees the Client-sourced row and publishing sends the quote to the homepage", async ({ page, request }) => {
    expect(clientToken, "runs after the client submitted in test 1").toMatch(/^eyJ/);

    // Server-side truth before any UI action: row is CLIENT-sourced,
    // attributed to our client, and never auto-published.
    const before = await apiGet<AdminTestimonialRow[]>(request, "/admin/testimonials");
    const row = before.find((t) => t.contentEn === QUOTE);
    expect(row, "the client testimonial exists in the admin catalog").toBeTruthy();
    expect(row?.source).toBe("CLIENT");
    expect(row?.client?.email).toBe(EMAIL);
    expect(row?.client?.name).toBe(CLIENT_NAME);
    expect(row?.published).toBe(false);

    await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), token);
    await page.goto("/admin?tab=settings");
    await expect(page.getByRole("heading", { name: "Site settings" })).toBeVisible({ timeout: 10000 });

    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Testimonials", exact: true }),
    });
    const tableRow = section.locator("tbody tr").filter({ hasText: QUOTE });
    await expect(tableRow).toBeVisible({ timeout: 10000 });

    // Source column: CLIENT badge + client name/email sub-line. The client name
    // also shows in the Author column, so scope the name assertion (.first()).
    await expect(tableRow.getByText("Client", { exact: true })).toBeVisible();
    await expect(tableRow.getByText("Draft", { exact: true })).toBeVisible();
    await expect(tableRow.getByText(CLIENT_NAME, { exact: true }).first()).toBeVisible();
    await expect(tableRow.getByText(EMAIL, { exact: true })).toBeVisible();

    // Publish toggle flips the pill Draft → Published.
    await tableRow.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(tableRow.getByText("Published", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(tableRow.getByText("Draft", { exact: true })).toHaveCount(0);

    // Server agrees.
    const after = await apiGet<AdminTestimonialRow[]>(request, "/admin/testimonials");
    expect(after.find((t) => t.contentEn === QUOTE)?.published).toBe(true);

    // Public homepage (same page, new navigation): TestimonialsSection shows
    // the quote (EN) with the author = client name.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "What clients say" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(QUOTE)).toBeVisible();
    await expect(page.getByText(CLIENT_NAME, { exact: true })).toBeVisible();
  });

  test("client account shows 'Live on our site' once the testimonial is published", async ({ page }) => {
    expect(clientToken, "runs after publication in test 2").toMatch(/^eyJ/);

    // Reuse the LONG-LIVED client JWT from test 1 — no second login-request.
    await page.addInitScript((t) => localStorage.setItem("css_client_token", t), clientToken);
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "My account" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(QUOTE)).toBeVisible();
    await expect(page.getByText("Live on our site", { exact: true })).toBeVisible();
    await expect(page.getByText("Awaiting approval", { exact: true })).toHaveCount(0);
  });
});