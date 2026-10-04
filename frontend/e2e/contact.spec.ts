import { test, expect } from "@playwright/test";
import { en } from "./routes";

/**
 * contact.spec.ts — E2E for the public /contact bilingual form.
 *
 * Journey covered:
 *   1. happy path: fill every field with a UNIQUE email (per-email rate cap is
 *      5/hr — a stale unique address must never trip it) → submit → the
 *      success panel (contact_success_title) replaces the form and the
 *      "Send another message" button (contact_send_another) re-arms it.
 *   2. client-side validation: an invalid email (or a too-short message)
 *      paints the LOCALIZED inline field error (contact_err_email /
 *      contact_err_message) and the fetch to /api/contact NEVER fires — both
 *      collect the requests the page actually made and assert zero.
 *
 * Backend rate limits: 20/hr/IP + 5/hr/email on POST /api/contact. The only
 * test that posts uses one request with a unique email, so repeated local
 * runs stay under both budgets.
 *
 * Locator notes: the name/email/subject/message <label>s are NOT htmlFor-bound
 * to their inputs (siblings, no ids) — the suite's placeholder convention
 * (booking.spec.ts) is the robust handle. The phone field IS bound
 * (htmlFor="contact-phone" → PhoneInput id), so getByLabel works there.
 * EN is the suite's default locale; error/button matchers stay tolerant of RW
 * text the same way booking.spec.ts does.
 */

const RUN = Date.now();
const NAME = `E2E Contact Client ${RUN}`;
const MESSAGE = `Hello! We need photo and video coverage for our wedding in Kigali this December. Test ${RUN}.`;

// EN + RW tolerant matchers — the suite never flips css_locale, but staying
// locale-agnostic keeps these green if a locale sneaks in (booking.spec.ts
// precedent).
const SUCCESS_TITLE = /Message sent!|Ubutumwa bwoherejwe/;
const ERR_EMAIL = /Please enter a valid email address\.|Andika imeyili ikoreshwa\./;
const ERR_MESSAGE = /Please write a message \(at least 10 characters\)\.|Andika ubutumwa \(nibura inyuguti 10\)\./;
const SEND_ANOTHER = /Send another message|Ohereza irindi butumwa/;

/** Count POST hits the page makes against the backend contact endpoint. */
function trackContactPosts(page: import("@playwright/test").Page): () => number {
  let hits = 0;
  page.on("request", (req) => {
    if (req.method() === "POST" && /\/api\/contact$/.test(req.url())) hits += 1;
  });
  return () => hits;
}

test("contact form happy path: unique data → success panel → send-another re-arms the form", async ({ page }) => {
  const email = `contact-${RUN}@test.local`;

  await page.goto(en("/contact"));
  await expect(page.getByRole("heading", { name: "Contact us" })).toBeVisible({ timeout: 15000 });

  // All fields, including the optional phone (PhoneInput, labelled via
  // htmlFor="contact-phone").
  await page.getByPlaceholder("Jean Uwimana").fill(NAME);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByLabel("Phone / WhatsApp").fill("0788 123 456");
  await page.getByPlaceholder("Wedding coverage for September").fill("Wedding coverage for December");
  await page.getByPlaceholder("Tell us about your project, date and budget...").fill(MESSAGE);

  await page.getByRole("button", { name: /Send message|Ohereza ubutumwa/ }).click();

  // 201 → success panel with the localized title and the send-another button.
  await expect(page.getByRole("heading", { name: SUCCESS_TITLE })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: SEND_ANOTHER })).toBeVisible();

  // "Send another message" brings the blank form back (success panel gone).
  await page.getByRole("button", { name: SEND_ANOTHER }).click();
  await expect(page.getByRole("heading", { name: SUCCESS_TITLE })).toHaveCount(0);
  await expect(page.getByPlaceholder("Jean Uwimana")).toBeVisible();
  await expect(page.getByPlaceholder("you@example.com")).toHaveValue("");
});

test("invalid email shows the localized inline error WITHOUT hitting the API", async ({ page }) => {
  const countContactPosts = trackContactPosts(page);

  await page.goto(en("/contact"));
  await expect(page.getByRole("heading", { name: "Contact us" })).toBeVisible({ timeout: 15000 });

  // Everything valid EXCEPT the email, so only the email error can paint.
  await page.getByPlaceholder("Jean Uwimana").fill(NAME);
  await page.getByPlaceholder("you@example.com").fill("not-an-email");
  await page.getByPlaceholder("Wedding coverage for September").fill("Wedding coverage for December");
  await page.getByPlaceholder("Tell us about your project, date and budget...").fill(MESSAGE);

  await page.getByRole("button", { name: /Send message|Ohereza ubutumwa/ }).click();

  // Localized inline error under the email field (role=alert), field flagged.
  const emailError = page.getByRole("alert").filter({ hasText: ERR_EMAIL });
  await expect(emailError).toBeVisible({ timeout: 15000 });
  await expect(page.getByPlaceholder("you@example.com")).toHaveAttribute("aria-invalid", "true");

  // No success panel — and the payload never went to the wire: client-side
  // validation short-circuits before fetch.
  await expect(page.getByRole("heading", { name: SUCCESS_TITLE })).toHaveCount(0);
  await expect.poll(countContactPosts, "POST /api/contact must not fire on client-side validation").toBe(0);
});

test("message shorter than 10 chars shows the localized message error and blocks submit", async ({ page }) => {
  const countContactPosts = trackContactPosts(page);

  await page.goto(en("/contact"));
  await expect(page.getByRole("heading", { name: "Contact us" })).toBeVisible({ timeout: 15000 });

  await page.getByPlaceholder("Jean Uwimana").fill(NAME);
  await page.getByPlaceholder("you@example.com").fill(`contact-short-${RUN}@test.local`);
  await page.getByPlaceholder("Wedding coverage for September").fill("Wedding coverage for December");
  await page.getByPlaceholder("Tell us about your project, date and budget...").fill("short");

  await page.getByRole("button", { name: /Send message|Ohereza ubutumwa/ }).click();

  const messageError = page.getByRole("alert").filter({ hasText: ERR_MESSAGE });
  await expect(messageError).toBeVisible({ timeout: 15000 });
  await expect(page.getByPlaceholder("Tell us about your project, date and budget...")).toHaveAttribute("aria-invalid", "true");

  await expect(page.getByRole("heading", { name: SUCCESS_TITLE })).toHaveCount(0);
  await expect.poll(countContactPosts, "POST /api/contact must not fire on client-side validation").toBe(0);
});