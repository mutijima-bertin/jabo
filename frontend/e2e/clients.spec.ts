import { execSync } from "node:child_process";
import { test, expect } from "@playwright/test";

const API = "http://localhost:4000/api";
const BACKEND_CONTAINER = "css-backend";

// The magic link is never rendered on the frontend — the "email" is a log
// line printed by the backend mailer into `docker logs css-backend`:
//   [mailer] Magic login link for <email>: http://localhost:3000/login?token=<64-hex>
// Poll the container logs until the line for our (unique per run) email shows up.
async function fetchMagicToken(email: string, timeoutMs = 15000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastLogs = "";
  while (Date.now() < deadline) {
    try {
      const logs = execSync(`docker logs ${BACKEND_CONTAINER} 2>&1`, {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
      });
      lastLogs = logs;
      const lines = logs.split("\n").filter((l) => l.includes(`Magic login link for ${email}`));
      const last = lines[lines.length - 1];
      if (last) {
        const match = last.match(/token=([a-f0-9]{16,})/);
        if (match) return match[1];
      }
    } catch (err) {
      // docker logs can exit non-zero on transient failures — keep polling.
      lastLogs = String(err);
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  const snippet = lastLogs.split("\n").slice(-5).join("\n");
  throw new Error(
    `No magic link found in ${BACKEND_CONTAINER} logs for ${email} within ${timeoutMs}ms. ` +
      `Check the request reached /clients/login-request (rate limiter: 5 req / 10 min / IP — ` +
      `wait out the window before rerunning). Last log lines:\n${snippet}`,
  );
}

// Seed a real booking through the public API. This also upserts the client
// row, so a magic link can later be issued for that email.
async function createBookingFor(email: string): Promise<{ reference: string }> {
  const services = await (await fetch(`${API}/public/services`)).json();
  const res = await fetch(`${API}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: services[0].id,
      contactName: "Client E2E",
      contactEmail: email,
      language: "en",
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Booking seed failed (${res.status}): ${JSON.stringify(body)}`);
  return { reference: body.booking.reference };
}

test.describe("client login & account", () => {
  // Fresh storage for every test — no token or saved locale leaks between
  // tests (each test already gets a new context; this is belt and braces).
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
  });

  test("unauthenticated /account redirects to /login", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Client login" })).toBeVisible();
  });

  test("login page shows success card for unknown email", async ({ page }) => {
    const email = `nobody-${Date.now()}@test.local`;
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByRole("button", { name: "Send magic link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible({ timeout: 15000 });
  });

  test("magic link logs client in and shows their bookings", async ({ page }) => {
    const email = `client-${Date.now()}@test.local`;
    const { reference } = await createBookingFor(email);

    // Request the magic link through the real UI (1 login-request call).
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByRole("button", { name: "Send magic link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible({ timeout: 15000 });

    // The link only exists in the backend container logs — fetch it from there.
    const token = await fetchMagicToken(email);
    expect(token).toMatch(/^[a-f0-9]{16,}$/);

    // Redeeming the link stores the client JWT and lands on /account.
    await page.goto(`/login?token=${token}`);
    await expect(page).toHaveURL(/\/account$/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "My account" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
    await expect(page.getByText(reference, { exact: true })).toBeVisible();

    // Logout clears the token and returns to /login.
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
  });
});
