import { test, expect } from "@playwright/test";

const API = "http://localhost:4000/api";
// Admin credentials from the environment (root .env via playwright.config.ts,
// or CI env) — never hardcoded.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

test("public site renders live content from the API", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Capturing Rwanda/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Services & pricing" })).toBeVisible();
  await expect(page.getByText("Wedding & Event Photography")).toBeVisible();
});

test("booking form creates a booking and shows the tracking link", async ({ page }) => {
  const email = `e2e-${Date.now()}@test.local`;
  await page.goto("/book");
  await page.selectOption("select", { index: 1 });
  await page.getByPlaceholder("Jean Uwimana").fill("E2E Client");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByRole("button", { name: /Send booking request/ }).click();
  await expect(page.getByText("Booking received!")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/CSS-/)).toBeVisible();
});

test("magic link tracking page shows booking status", async ({ page }) => {
  const services = await (await fetch(`${API}/public/services`)).json();
  const res = await fetch(`${API}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serviceId: services[0].id,
      contactName: "Track E2E",
      contactEmail: `track-${Date.now()}@test.local`,
      language: "en",
    }),
  });
  const { trackUrl } = await res.json();
  await page.goto(new URL(trackUrl).pathname);
  const expected = /CSS-/;
  await expect(page.getByText(expected).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Booking received").first()).toBeVisible();
});

test("invalid tracking token shows the expired-link message", async ({ page }) => {
  await page.goto("/track/definitely-not-a-real-token");
  await expect(page.getByText(/invalid or expired/i)).toBeVisible({ timeout: 10000 });
});

test("admin login works and dashboard loads", async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "ADMIN_EMAIL/ADMIN_PASSWORD not set");
  await page.goto("/admin/login");
  await page.getByPlaceholder("admin@creativesoundstudio.rw").fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Recent bookings")).toBeVisible({ timeout: 10000 });
});

test("language switcher toggles Kinyarwanda", async ({ page }) => {
  await page.goto("/");
  // After the redesign the toggle lives in the footer (a pill with
  // aria-label "Switch language") — scope the locator to <footer>.
  const toggle = page.locator("footer").getByRole("button", { name: "Switch language" });
  await expect(toggle).toBeVisible();
  // English baseline: "Services & pricing" is dict-driven, unlike the hero
  // heading which comes from backend settings (hero_title / hero_title_rw).
  await expect(page.getByRole("heading", { name: "Services & pricing" })).toBeVisible();
  // Flip to Kinyarwanda and assert the dict-driven section title.
  await toggle.click();
  await expect(page.getByRole("heading", { name: "Serivisi n'ibiciro" })).toBeVisible();
  // Toggle back to English for cleanliness.
  await page.locator("footer").getByRole("button", { name: "Switch language" }).click();
  await expect(page.getByRole("heading", { name: "Services & pricing" })).toBeVisible();
});
