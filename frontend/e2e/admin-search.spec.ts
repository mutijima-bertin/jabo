import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { API, getAdminToken } from "./auth";

/**
 * admin-search.spec.ts — E2E proof for the Tier-1 ⌘K admin search palette
 * (`frontend/src/components/admin/AdminSearchPalette.tsx` +
 * `GET /api/admin/search?q=`).
 *
 * The real-user journey: open the palette with the platform shortcut, type the
 * beginning of a distinctive booking contact, pick the booking result with
 * Enter, and land on the bookings tab with that booking previewed.
 *
 * Determinism: the fixture contact name carries a per-run numeric suffix
 * (`Vantrix<runId>`), so the term matches exactly the booking this run created
 * and the result row can be anchored on its reference — never on a count, an
 * order or a date.
 *
 * Logins happen ONCE per suite in the "setup" project (e2e/admin.auth.setup.ts).
 */

const RUN = Date.now();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

/** Distinctive + run-unique: matches the booking, the client and nothing else. */
const CONTACT_NAME = `Vantrix${RUN}`;

interface BookingRow {
  id: string;
  reference: string;
  status: string;
}

let token: string;

const AUTH = (t: string) => ({ Authorization: `Bearer ${t}` });

async function apiGet<T>(request: APIRequestContext, path: string, auth = true): Promise<T> {
  const res = await request.get(`${API}${path}`, { headers: auth ? AUTH(token) : undefined });
  if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Public booking create — the same endpoint the client form posts to. */
async function createBooking(request: APIRequestContext, contactName: string, contactEmail: string): Promise<BookingRow> {
  const services = await apiGet<Array<{ id: string }>>(request, "/public/services", false);
  const res = await request.post(`${API}/bookings`, {
    data: { serviceId: services[0].id, contactName, contactEmail, language: "en" },
  });
  if (!res.ok()) throw new Error(`booking seed failed: ${res.status()} ${await res.text()}`);
  const { booking } = (await res.json()) as { booking: BookingRow };
  return booking;
}

/** Boot an admin session without burning a UI login. */
async function adminSession(page: Page): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), token);
}

test.describe("admin ⌘K search palette", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "ADMIN_EMAIL/ADMIN_PASSWORD not set");

  test.beforeAll(async () => {
    token = getAdminToken(); // logged in once by the "setup" project
  });

  test("Ctrl/⌘K opens the palette and Enter deep-links a booking result to ?tab=bookings", async ({ page, request }) => {
    const booking = await createBooking(request, CONTACT_NAME, `vantrix-${RUN}@test.local`);

    await adminSession(page);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({ timeout: 10000 });

    // The palette listens for BOTH modifiers, so one platform-agnostic chord
    // (Control on Linux CI, Meta on macOS) opens it from anywhere in /admin.
    await page.keyboard.press("ControlOrMeta+K");
    const palette = page.getByRole("dialog", { name: "Search studio records" });
    await expect(palette).toBeVisible();
    const field = palette.getByRole("combobox");
    await expect(field).toBeFocused();

    // Fewer than 2 characters is never sent (the API answers 400 VALIDATION)
    // and the hint says so.
    await field.pressSequentially("V");
    await expect(palette.getByText("Type at least 2 characters")).toBeVisible();

    // Typing the distinctive name surfaces OUR booking (anchored on the
    // reference, so group order / hit counts never matter).
    await field.fill(CONTACT_NAME);
    const option = palette.getByRole("option").filter({ hasText: booking.reference });
    await expect(option).toBeVisible({ timeout: 15000 });
    await expect(option).toContainText(CONTACT_NAME);
    // First hit of the flattened list is the active option (aria-activedescendant).
    await expect(option).toHaveAttribute("aria-selected", "true");
    const optionId = (await option.getAttribute("id")) ?? "";
    expect(optionId, "each option must expose the id aria-activedescendant points at").not.toBe("");
    await expect(field).toHaveAttribute("aria-activedescendant", optionId);

    // Enter opens the active row → the bookings tab with this booking previewed.
    await field.press("Enter");
    await expect(page.getByRole("dialog", { name: "Search studio records" })).toHaveCount(0);
    await expect(page).toHaveURL(/\?tab=bookings/);
    expect(page.url(), "the palette deep-links with the booking id").toContain(`open=${booking.id}`);
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: booking.reference, exact: true }),
      "the palette result previews the booking",
    ).toBeVisible({ timeout: 15000 });
  });

  test("a term with no matches shows the empty state instead of stale results", async ({ page }) => {
    await adminSession(page);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({ timeout: 10000 });

    // The topbar trigger opens the same palette (⌘K is not the only door).
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const palette = page.getByRole("dialog", { name: "Search studio records" });
    await expect(palette).toBeVisible();
    await expect(palette.getByText("Find anything in the studio")).toBeVisible();

    await palette.getByRole("combobox").fill(`zz-nothing-matches-${RUN}`);
    // "No matches" is rendered twice on purpose (visible empty state + the
    // polite aria-live announcement), so assert on the line that is unique to
    // the visible empty state.
    await expect(palette.getByText("Try a different reference, name, email or service.")).toBeVisible({ timeout: 15000 });
    await expect(palette.getByRole("option")).toHaveCount(0);

    // Escape closes the palette and hands focus back to the trigger.
    await page.keyboard.press("Escape");
    await expect(palette).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Search", exact: true })).toBeFocused();
  });
});
