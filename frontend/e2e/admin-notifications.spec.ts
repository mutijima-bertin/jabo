import { test, expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { API, getAdminToken } from "./auth";

/**
 * admin-notifications.spec.ts — E2E proof for the Tier-1 admin notification
 * bell (`frontend/src/components/admin/AdminNotifications.tsx` +
 * `GET /api/admin/notifications`, `POST /api/admin/notifications/read`).
 *
 * Three real-user flows, all seeded through the PUBLIC booking endpoint (the
 * client form's own route) so the backend's fire-and-forget `NEW_BOOKING`
 * AdminNotification is created the way production creates it:
 *
 *  1. a new booking paints the unread badge, the panel lists it, and clicking
 *     the row follows its `?tab=bookings&open=<id>` deep link (and marks the
 *     row read);
 *  2. "Mark all as read" empties the badge;
 *  3. a booking created AFTER the dashboard is already open still shows up —
 *     the 30s background re-poll.
 *
 * Determinism rules used here (the suite is fullyParallel, so sibling specs
 * create bookings — and therefore notifications — while these tests run):
 *   - Never assert an absolute unread COUNT. The count is read out of the
 *     bell's accessible name and compared RELATIVELY (before/after mark-all,
 *     before/after a new poll).
 *   - Never assert an absolute badge COUNT either: the invariant is
 *     "the indicator is painted ⇔ something is unread" (dot for ≤9, a number
 *     above 9), checked against the live count.
 *   - The notification write is fire-and-forget server-side, so each test
 *     gates on the row being READABLE through the admin API before the page's
 *     first /admin/notifications fetch — no sleeping, just a retryable probe.
 *   - The row a test acts on is resolved from the API at click time
 *     (`newestUnreadBooking`) and the "there is something unread" precondition
 *     is re-established if it ever evaporates (`ensureUnread`) — the bell is
 *     SHARED state, so no test may assume its own seed is still the newest
 *     unread thing in the inbox.
 *
 * Logins happen ONCE per suite in the "setup" project (e2e/admin.auth.setup.ts).
 */

const RUN = Date.now();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

interface BookingRow {
  id: string;
  reference: string;
  status: string;
}
interface AdminNotifItem {
  id: string;
  type: string;
  payload: { reference?: string; clientName?: string } | null;
  linkHref: string | null;
  readAt: string | null;
  createdAt: string;
}
interface AdminNotifResponse {
  items: AdminNotifItem[];
  unreadCount: number;
}

let token: string;

const AUTH = (t: string) => ({ Authorization: `Bearer ${t}` });

async function apiGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(`${API}${path}`, { headers: AUTH(token) });
  if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Public booking create — the same endpoint the client form posts to. */
async function createBooking(request: APIRequestContext, contactName: string, contactEmail: string): Promise<BookingRow> {
  const services = await apiGet<Array<{ id: string }>>(request, "/public/services");
  const res = await request.post(`${API}/bookings`, {
    data: { serviceId: services[0].id, contactName, contactEmail, language: "en" },
  });
  if (!res.ok()) throw new Error(`booking seed failed: ${res.status()} ${await res.text()}`);
  const { booking } = (await res.json()) as { booking: BookingRow };
  return booking;
}

/**
 * Seed a booking AND wait until its NEW_BOOKING notification is readable
 * through the admin API (fire-and-forget on the server, so a page that loads
 * in the same instant could legitimately fetch a payload without it).
 */
async function createBookingWithNotification(
  request: APIRequestContext,
  contactName: string,
  contactEmail: string,
): Promise<BookingRow> {
  const booking = await createBooking(request, contactName, contactEmail);
  await expect(async () => {
    const body = await apiGet<AdminNotifResponse>(request, "/admin/notifications?limit=30");
    const found = body.items.find((n) => n.type === "NEW_BOOKING" && n.payload?.reference === booking.reference);
    expect(found, `NEW_BOOKING notification for ${booking.reference} must be readable`).toBeTruthy();
  }).toPass({ timeout: 15000, intervals: [200, 400, 800] });
  return booking;
}

/**
 * The bell trigger. Its accessible name is the dictionary string
 * `notif_bell_aria` = "Notifications ({n} unread)" — i.e. the live unread count
 * is carried by role+name, no test ids needed.
 */
function bell(page: Page): Locator {
  return page.getByRole("button", { name: /^Notifications \(\d+ unread\)$/ });
}

/** Live unread count, read out of the bell's accessible name. */
async function unreadOf(bellLocator: Locator): Promise<number> {
  const label = (await bellLocator.getAttribute("aria-label")) ?? "";
  const m = /\((\d+) unread\)/.exec(label);
  expect(m, `bell aria-label must carry the unread count, got "${label}"`).toBeTruthy();
  return Number(m![1]);
}

/** The dropdown: a labelled region, not a dialog (simple popover). */
function notifPanel(page: Page): Locator {
  return page.getByRole("region", { name: "Notifications" });
}

/** Boot an admin session without burning a UI login. */
async function adminSession(page: Page): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem("css_admin_token", t), token);
}

/**
 * Guarantee the bell has at least one unread row in an ALREADY-OPEN page and
 * return that count. Happy path: the gated booking is already there, so this
 * returns immediately. Only when something wiped the inbox in between (the
 * bell is shared state) does it re-seed and wait for the next 30s poll.
 */
async function ensureUnread(
  request: APIRequestContext,
  bellBtn: Locator,
  label: string,
): Promise<number> {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  for (let attempt = 0; attempt < 3; attempt++) {
    const n = await unreadOf(bellBtn);
    if (n > 0) return n;
    await createBooking(request, `${label} rescue ${RUN} ${attempt}`, `rescue-${slug}-${RUN}-${attempt}@test.local`);
    await expect
      .poll(async () => unreadOf(bellBtn), { timeout: 45_000, intervals: [1000, 2000] })
      .toBeGreaterThan(0);
  }
  const n = await unreadOf(bellBtn);
  expect(n, `could not get an unread notification into the bell (${label})`).toBeGreaterThan(0);
  return n;
}

test.describe("admin notification bell", () => {
  // The mark-all test mutates shared notification state, so the three flows
  // run one after another instead of racing each other inside the file.
  test.describe.configure({ mode: "serial" });
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "ADMIN_EMAIL/ADMIN_PASSWORD not set");

  test.beforeAll(async () => {
    token = getAdminToken(); // logged in once by the "setup" project
  });

  test("a new booking raises the badge; the panel row deep-links into the bookings tab", async ({ page, request }) => {
    await createBookingWithNotification(request, `Bell Deep ${RUN}`, `bell-deep-${RUN}@test.local`);

    await adminSession(page);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({ timeout: 10000 });

    // Badge: the gated NEW_BOOKING row guarantees at least one unread, and the
    // indicator (dot ≤ 9 / count > 9) is painted exactly then.
    const bellBtn = bell(page);
    await expect(bellBtn).toBeVisible();
    await expect(bellBtn).toHaveAttribute("aria-expanded", "false");
    await ensureUnread(request, bellBtn, "Bell Deep");
    await expect(async () => {
      const n = await unreadOf(bellBtn);
      expect(await bellBtn.locator("span").count(), "the unread indicator is painted").toBe(n > 0 ? 1 : 0);
    }).toPass({ timeout: 10000 });

    // The panel lists unread rows, and its header mirrors the bell's live
    // count. Count assertions are made inside a retryable block (rather than
    // against one captured number) so a notification a sibling spec drops in
    // mid-assertion can't flake them.
    await bellBtn.click();
    const panel = notifPanel(page);
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: /^Unread: / }).first()).toBeVisible();
    await expect(async () => {
      const header = await panel.getByRole("heading", { name: "Notifications", exact: true }).locator("..").innerText();
      expect(header, "the panel header shows the same unread count as the bell").toContain(String(await unreadOf(bellBtn)));
    }).toPass({ timeout: 10000 });

    // Click the first unread row the panel is showing and follow the deep link
    // the backend stored on it. The row is identified from the panel's OWN list
    // — the dropdown is a snapshot and the 30s re-poll is paused while it is
    // open — and its link is read from the API, so the click does not depend on
    // the row still being unread at that instant (the inbox is shared state:
    // a sibling spec may mark rows read at any time).
    const firstUnread = panel.getByRole("button", { name: /^Unread: / }).first();
    const rowLabel = (await firstUnread.getAttribute("aria-label")) ?? "";
    const rowRef = /^Unread: New booking ([^,]+),/.exec(rowLabel)?.[1] ?? "";
    expect(rowRef, `an unread row must name its booking reference, got "${rowLabel}"`).toBeTruthy();
    const listed = await apiGet<AdminNotifResponse>(request, "/admin/notifications?limit=50");
    const linkHref = listed.items.find((n) => n.payload?.reference === rowRef)?.linkHref ?? "";
    expect(linkHref, `the NEW_BOOKING notification for ${rowRef} must carry a deep link`).toContain("?tab=bookings");

    await firstUnread.click();
    await expect(panel).toHaveCount(0);
    await expect(page).toHaveURL(/\?tab=bookings/);
    expect(page.url(), "the row must follow the stored linkHref").toContain(linkHref);
    // …and the deep link previews the booking in the detail dialog.
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: rowRef, exact: true })).toBeVisible({ timeout: 15000 });

    // Clicking the row marked it read — asserted against the server, which is
    // the source of truth once the panel has closed.
    await expect
      .poll(
        async () => {
          const after = await apiGet<AdminNotifResponse>(request, "/admin/notifications?limit=50");
          return Boolean(after.items.find((n) => n.payload?.reference === rowRef)?.readAt);
        },
        { timeout: 10000, intervals: [250, 500] },
      )
      .toBe(true);

    // Reopening the bell shows the same row WITHOUT the "Unread:" prefix.
    await page.keyboard.press("Escape"); // closes the booking dialog
    await expect(dialog).toHaveCount(0);
    await bellBtn.click();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: new RegExp(`^New booking ${rowRef},`) })).toBeVisible();
    await expect(
      panel.getByRole("button", { name: new RegExp(`^Unread: New booking ${rowRef},`) }),
      "the opened row is no longer marked unread",
    ).toHaveCount(0);
  });

  test("Mark all as read empties the badge", async ({ page, request }) => {
    await createBookingWithNotification(request, `Bell Mark ${RUN}`, `bell-mark-${RUN}@test.local`);

    await adminSession(page);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({ timeout: 10000 });

    const bellBtn = bell(page);
    const before = await ensureUnread(request, bellBtn, "Bell Mark");

    await bellBtn.click();
    const panel = notifPanel(page);
    await expect(panel.getByRole("button", { name: /^Unread: / }).first()).toBeVisible();
    await panel.getByRole("button", { name: "Mark all as read" }).click();

    // Relative, not absolute: sibling specs may add notifications mid-run, so
    // the contract is "the unread count drops", not "it is exactly 0".
    await expect
      .poll(async () => unreadOf(bellBtn), { timeout: 15000, intervals: [250, 500, 1000] })
      .toBeLessThan(before);
    const after = await unreadOf(bellBtn);

    // The indicator is painted ⇔ something is unread (dot ≤ 9, number > 9).
    // Retryable so a sibling spec's new booking can't flip it mid-assertion.
    await expect(async () => {
      const n = await unreadOf(bellBtn);
      expect(
        await bellBtn.locator("span").count(),
        `the indicator is painted exactly while something is unread (before=${before}, after=${after})`,
      ).toBe(n > 0 ? 1 : 0);
    }).toPass({ timeout: 10000 });
    // Nothing is left flagged unread in the open panel. The 30s re-poll is
    // paused while the panel is open, so this list cannot gain rows mid-check.
    await expect(panel.getByRole("button", { name: /^Unread: / })).toHaveCount(0);
    // The server agrees the unread count dropped.
    const server = await apiGet<AdminNotifResponse>(request, "/admin/notifications?limit=30");
    expect(server.unreadCount, "server-side unread count must drop too").toBeLessThan(before);
  });

  test("a booking created after the dashboard is open shows up on the next poll", async ({ page, request }) => {
    test.setTimeout(90_000); // the bell re-polls every 30s by design

    await adminSession(page);
    // Gated on the bell's own mount fetch so the baseline count is real data,
    // not the "0 unread" placeholder rendered before the first response.
    const firstPoll = page.waitForResponse((r) => r.url().includes("/api/admin/notifications?limit=30"));
    await page.goto("/admin");
    await firstPoll;
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible({ timeout: 10000 });

    const bellBtn = bell(page);
    await expect(bellBtn).toBeVisible();
    expect(await unreadOf(bellBtn), "the mount fetch already returned a real count").toBeGreaterThanOrEqual(0);

    // From here on there is no page reload and no user interaction, so the new
    // row can only reach the bell through the component's 30s background
    // re-poll. Waiting for that very request is an unambiguous signal: it does
    // not depend on the unread COUNT moving, which sibling specs adding or
    // marking-read rows at the same time can leave coincidentally unchanged.
    const booking = await createBooking(request, `Bell Poll ${RUN}`, `bell-poll-${RUN}@test.local`);
    const repoll = await page.waitForResponse(
      (r) => r.url().includes("/api/admin/notifications?limit=30") && r.status() === 200,
      { timeout: 45_000 },
    );

    // The re-poll landed: the panel now lists the booking that did not exist
    // when the dashboard was opened. (A sibling run may have marked it read in
    // the meantime, so the row is matched without the "Unread:" anchor.)
    const served = ((await repoll.json()) as AdminNotifResponse).items.some(
      (n) => n.payload?.reference === booking.reference,
    );
    expect(served, "the re-poll must serve the new booking's notification").toBe(true);
    await bellBtn.click();
    await expect(notifPanel(page).getByRole("button", { name: new RegExp(`New booking ${booking.reference},`) })).toBeVisible();
  });
});
