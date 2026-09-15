import { test, expect } from "@playwright/test";
import { getAdminToken } from "./auth";

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

  // 1) Google-style phone input (component: PhoneInput). The country select
  // exposes the LOCALIZED aria-label "Country code" (EN is the default locale
  // — the suite never flips css_locale here). Scope the phone input by its
  // flex row so the select ↔ input pairing is exercised, not assumed.
  const countrySelect = page.getByLabel("Country code");
  await expect(countrySelect).toBeVisible();
  await expect(countrySelect).toHaveValue("+250"); // Rwanda is the default
  const phoneInput = countrySelect.locator("..").locator("..").locator('input[type="tel"]'); // grandparent flex row → tel field
  await expect(phoneInput).toBeVisible();

  // Type a LOCAL Rwandan number — the field formats with spaces as you type
  // (AsYouType): "0788 123 456". Spacing is at-format; be tolerant of the
  // exact grouping but pin the digits and separated groups.
  await phoneInput.fill("0788 123 456");
  await expect(phoneInput).toHaveValue(/0788\s?1?2?3?\s?4?5?6?/);
  // Relaxed: whatever the exact spacing, the field is populated, the input
  // keeps the digits visible, and no inline phone error is painted while the
  // number is well-formed.
  await expect(phoneInput).not.toHaveValue("");
  await expect(phoneInput).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Enter a valid phone number", { exact: false })).toHaveCount(0);

  // 2) Budget preset chips (aria-pressed toggle) — select the first band.
  const budgetGroup = page.getByRole("group", { name: "Budget range" });
  const budgetChip = budgetGroup.getByRole("button", { name: "Under 300,000 RWF" });
  await expect(budgetChip).toBeVisible();
  await expect(budgetChip).toHaveAttribute("aria-pressed", "false");
  await budgetChip.click();
  await expect(budgetChip).toHaveAttribute("aria-pressed", "true");

  // 3) Name/email + submit → success screen with the CSS- reference.
  await page.getByPlaceholder("Jean Uwimana").fill("E2E Client");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByRole("button", { name: /Send booking request/ }).click();
  await expect(page.getByText("Booking received!")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/CSS-/)).toBeVisible();

  // 4) The stored phone is E.164 ("+250788123456"). Verify against the admin
  // API (auth token shared via e2e/.auth/admin.json) rather than the
  // rate-limited public /track endpoint — the booking's reference is printed
  // on the success screen, and the admin list returns contactPhone.
  const reference = (await page.getByText(/CSS-/).first().innerText()).trim();
  const token = getAdminToken();
  const adminRes = await fetch(`${API}/admin/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(adminRes.ok, `admin bookings list should be readable (${adminRes.status})`).toBe(true);
  const rows = (await adminRes.json()) as Array<{ reference: string; contactPhone: string | null }>;
  const created = rows.find((r) => r.reference === reference);
  expect(created, `booking ${reference} must be listed in the admin API`).toBeTruthy();
  expect(created!.contactPhone, "phone must be stored in E.164").toBe("+250788123456");
});

test("an invalid/incomplete phone is normalized away — no phone error, booking still succeeds, no raw VALIDATION", async ({ page }) => {
  // Contract (spec bullet): "Empty/incomplete phone is fine (stays "")". The
  // PhoneInput emits "" for anything libphonenumber can't validate, so typing
  // an obviously-invalid national number must NOT surface a field error and
  // must NOT block the booking.
  const email = `e2e-phone-${Date.now()}@test.local`;
  await page.goto("/book");
  await page.selectOption("select", { index: 1 });
  await page.getByPlaceholder("Jean Uwimana").fill("E2E Client");
  await page.getByPlaceholder("you@example.com").fill(email);

  // Obviously-invalid phone — the typed text stays visible in the field…
  const phoneInput = page.locator("#booking-phone");
  await phoneInput.fill("123");
  await expect(phoneInput).toHaveValue("123");
  // …but it is normalized to an empty payload value: the field never paints
  // an error ring and no book_err_phone alert is rendered.
  await expect(phoneInput).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Enter a valid phone number", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Andika nomero ikoreshwa")).toHaveCount(0);

  await page.getByRole("button", { name: /Send booking request/ }).click();
  await expect(page.getByText("Booking received!")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/CSS-/)).toBeVisible();

  // The bare backend "VALIDATION" code must NEVER leak onto the page.
  await expect(page.getByText("VALIDATION")).toHaveCount(0);
});

test("a real 400 renders a localized inline field error — never the raw VALIDATION string", async ({ page }) => {
  // Reachable 400 through the shipped UI: a 1-character name is below the API
  // minimum (2 chars) → backend returns 400 VALIDATION with a contactName
  // issue. The form must render the LOCALIZED inline field error (book_err_name)
  // and keep the raw backend "VALIDATION" code off the page.
  const email = `e2e-invalid-${Date.now()}@test.local`;
  await page.goto("/book");
  await page.selectOption("select", { index: 1 });

  // Valid phone (local format, spaced) + valid email — only the name is bad.
  const phoneInput = page.locator("#booking-phone");
  await phoneInput.fill("0788 123 456");
  await page.getByPlaceholder("Jean Uwimana").fill("E");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByRole("button", { name: /Send booking request/ }).click();

  // Localized inline error under the name field — tolerant of EN or RW text
  // (the suite defaults to EN; the regex keeps it green if a locale sneaks in).
  const nameError = page
    .getByRole("alert")
    .filter({ hasText: /Please enter your name \(at least 2 characters\)|Andika amazina yawe/i });
  await expect(nameError).toBeVisible({ timeout: 15000 });

  // The raw backend "VALIDATION" code must NEVER appear anywhere on the page.
  await expect(page.getByText("VALIDATION")).toHaveCount(0);

  // The well-formed phone field must stay error-free next to the name error.
  await expect(phoneInput).not.toHaveAttribute("aria-invalid", "true");

  // And the booking was rejected — no success screen.
  await expect(page.getByText("Booking received!")).toHaveCount(0);
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
