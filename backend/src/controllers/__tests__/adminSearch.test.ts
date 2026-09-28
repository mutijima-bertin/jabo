import type { Server } from "http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { prisma } from "../../config/db";
import { signAdminToken } from "../../services/auth";

/**
 * Admin ⌘K palette (GET /api/admin/search), the bookings-list free-text filter
 * (?q= on GET /api/admin/bookings), the dashboard range picker + upcoming
 * productions (?days=), and the admin health probe (GET /api/admin/health).
 *
 * Same real-express-app + prisma-fixture harness as adminBookings.test.ts /
 * adminNotifications.test.ts. beforeEach wipes the shared tables because the
 * suite runs against the same test DB as the other admin files.
 *
 * Search terms are deliberately nonsense words (Zylophonia, Quixberry,
 * Thistlewick) so no fixture left behind by another suite can match.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

describe("admin search, bookings ?q=, dashboard ?days= and /admin/health", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let refSeq = 0;

  beforeAll(async () => {
    const app = createApp();
    server = app.listen(0);
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("test server started without a TCP address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.notificationLog.deleteMany();
    await prisma.bookingEvent.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.blogPost.deleteMany();
    await prisma.portfolioItem.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.service.deleteMany();
    await prisma.client.deleteMany();
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.notificationLog.deleteMany();
    await prisma.bookingEvent.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.blogPost.deleteMany();
    await prisma.portfolioItem.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.service.deleteMany();
    await prisma.client.deleteMany();
  });

  // ---------- helpers ----------

  const authed = (url: string) => fetch(url, { headers: { authorization: `Bearer ${token}` } });

  const searchUrl = (q: string) => `${baseUrl}/api/admin/search?q=${encodeURIComponent(q)}`;
  const bookingsUrl = (qs = "") => `${baseUrl}/api/admin/bookings${qs}`;
  const dashboardUrl = (qs = "") => `${baseUrl}/api/admin/dashboard${qs}`;
  const healthUrl = () => `${baseUrl}/api/admin/health`;

  type Overrides = Record<string, unknown>;

  function createService(nameEn: string, overrides: Overrides = {}) {
    return prisma.service.create({
      data: {
        nameEn,
        nameRw: (overrides.nameRw as string) ?? nameEn,
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: (overrides.category as string) ?? "audio",
        sortOrder: (overrides.sortOrder as number) ?? undefined,
        published: (overrides.published as boolean) ?? undefined,
      },
    });
  }

  function createBooking(serviceId: string, overrides: Overrides = {}) {
    refSeq += 1;
    return prisma.booking.create({
      data: {
        reference: (overrides.reference as string) ?? `CSS-TEST-${refSeq}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        serviceId,
        contactName: (overrides.contactName as string) ?? "Fixture Contact",
        contactEmail: (overrides.contactEmail as string) ?? `fixture-${refSeq}-${Math.random().toString(36).slice(2)}@example.com`,
        status: (overrides.status as "PENDING" | "CONFIRMED" | "IN_PRODUCTION" | "DELIVERED" | "COMPLETED" | "CANCELLED") ?? "PENDING",
        createdAt: overrides.createdAt as Date | undefined,
        eventDate: overrides.eventDate as Date | undefined,
        location: overrides.location as string | undefined,
        budgetRange: overrides.budgetRange as string | undefined,
      },
    });
  }

  function createClient(name: string, overrides: Overrides = {}) {
    return prisma.client.create({
      data: {
        name,
        email: (overrides.email as string) ?? `${name.toLowerCase().replace(/[^a-z]+/g, "-")}-${refSeq++}-${Math.random().toString(36).slice(2)}@example.com`,
        phone: (overrides.phone as string) ?? undefined,
      },
    });
  }

  function createPost(overrides: Overrides = {}) {
    refSeq += 1;
    return prisma.blogPost.create({
      data: {
        slug: (overrides.slug as string) ?? `post-${refSeq}-${Math.random().toString(36).slice(2, 8)}`,
        titleEn: (overrides.titleEn as string) ?? "Fixture Post",
        titleRw: (overrides.titleRw as string) ?? "Imyandikire",
        contentEn: "Body",
        contentRw: "Umubiri",
        published: (overrides.published as boolean) ?? undefined,
        publishedAt: overrides.publishedAt as Date | undefined,
        createdAt: overrides.createdAt as Date | undefined,
      },
    });
  }

  type SearchBody = {
    bookings: Record<string, unknown>[];
    clients: Record<string, unknown>[];
    posts: Record<string, unknown>[];
    services: Record<string, unknown>[];
  };

  type DashboardBody = {
    stats: Record<string, number>;
    bookingsByDay: { date: string; count: number }[];
    topServices: unknown;
    counts: Record<string, number>;
    recent: unknown;
    upcoming: Record<string, unknown>[];
  };

  // ================= GET /api/admin/search =================

  describe("GET /api/admin/search", () => {
    it("rejects a q shorter than 2 characters with 400 VALIDATION", async () => {
      for (const qs of ["", "?q=", "?q=a", "?q=%20%20"]) {
        const res = await authed(`${baseUrl}/api/admin/search${qs}`);
        expect(res.status, qs).toBe(400);
        const body = (await res.json()) as { error: string; issues: unknown[] };
        expect(body.error, qs).toBe("VALIDATION");
        expect(Array.isArray(body.issues), qs).toBe(true);
        expect(body.issues.length, qs).toBeGreaterThan(0);
      }
    });

    it("rejects a q longer than 60 characters and accepts exactly 60", async () => {
      const tooLong = await authed(searchUrl("x".repeat(61)));
      expect(tooLong.status).toBe(400);
      const tooLongBody = (await tooLong.json()) as { error: string; issues: unknown[] };
      expect(tooLongBody.error).toBe("VALIDATION");
      expect(Array.isArray(tooLongBody.issues)).toBe(true);

      const atLimit = await authed(searchUrl("y".repeat(60)));
      expect(atLimit.status).toBe(200);
      const atLimitBody = (await atLimit.json()) as SearchBody;
      expect(Object.keys(atLimitBody).sort()).toEqual(["bookings", "clients", "posts", "services"]);
    });

    it("returns all four groups with the exact item shape (empty arrays when nothing matches)", async () => {
      const res = await authed(searchUrl("nothingmatchesthis"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as SearchBody;

      expect(Object.keys(body).sort()).toEqual(["bookings", "clients", "posts", "services"]);
      // Never omit a key — the palette renders every section unconditionally.
      expect(body.bookings).toEqual([]);
      expect(body.clients).toEqual([]);
      expect(body.posts).toEqual([]);
      expect(body.services).toEqual([]);
    });

    it("caps every group at 5 hits when more than 5 rows match", async () => {
      const term = "Zylophonia";

      // 7 services + a booking each -> 7 booking hits (via the service relation)
      // and 7 service hits.
      const services: { id: string }[] = [];
      const bookings: { id: string }[] = [];
      for (let i = 0; i < 7; i++) {
        const svc = await createService(`${term} Service ${i}`);
        services.push(svc);
        bookings.push(await createBooking(svc.id));
      }
      // 7 clients, none of whose emails contain the term (name-only match).
      for (let i = 0; i < 7; i++) {
        await createClient(`${term} Client ${i}`, { email: `nomatch-${i}-${Math.random().toString(36).slice(2)}@example.com` });
      }
      // 7 posts matching on title only.
      for (let i = 0; i < 7; i++) {
        await createPost({ titleEn: `${term} Post ${i}`, titleRw: `Imyandikire ${i}`, slug: `unrelated-slug-${i}-${refSeq}` });
      }

      const res = await authed(searchUrl(term));
      expect(res.status).toBe(200);
      const body = (await res.json()) as SearchBody;

      expect(body.bookings).toHaveLength(5);
      expect(body.clients).toHaveLength(5);
      expect(body.posts).toHaveLength(5);
      expect(body.services).toHaveLength(5);

      // Item shapes are exactly the contract fields (no service relation leaked).
      expect(Object.keys(body.bookings[0]).sort()).toEqual([
        "contactName", "createdAt", "id", "reference", "serviceName", "status",
      ]);
      expect(Object.keys(body.clients[0]).sort()).toEqual(["email", "id", "name", "phone"]);
      expect(Object.keys(body.posts[0]).sort()).toEqual(["id", "published", "slug", "titleEn", "titleRw"]);
      expect(Object.keys(body.services[0]).sort()).toEqual(["category", "id", "nameEn", "nameRw", "published"]);

      // bookings: createdAt desc -> the last seeded booking leads.
      expect(body.bookings[0].id).toBe(bookings[6].id);
      expect(new Date(body.bookings[0].createdAt as string).toISOString()).toBe(body.bookings[0].createdAt);

      // services: sortOrder asc (all 0 here) then createdAt asc -> the first seeded.
      expect(body.services[0].id).toBe(services[0].id);
      expect(body.services[0].serviceName).toBeUndefined();
    });

    it("orders clients by name ascending", async () => {
      for (const name of ["Thistlewick Delta", "Thistlewick Alpha", "Thistlewick Zulu"]) {
        await createClient(name, { email: `alpha-${name.split(" ")[1]}-${Math.random().toString(36).slice(2)}@example.com` });
      }
      const res = await authed(searchUrl("Thistlewick"));
      const body = (await res.json()) as SearchBody;

      expect(body.clients.map((c) => c.name)).toEqual([
        "Thistlewick Alpha", "Thistlewick Delta", "Thistlewick Zulu",
      ]);
    });

    it("matches a booking on its reference and on the related service name (both spellings)", async () => {
      const svc = await createService("Quixberry Production", { nameRw: "Ibyakora Quixberry" });
      const byRef = await createBooking(svc.id, { reference: "CSS-QUIXBERRY-REF" });

      const res = await authed(searchUrl("quixberry"));
      const body = (await res.json()) as SearchBody;

      // Reference substring hit, insensitive on the uppercase reference.
      const ids = body.bookings.map((b) => b.id);
      expect(ids).toContain(byRef.id);
      const hit = body.bookings.find((b) => b.id === byRef.id)!;
      expect(hit.reference).toBe("CSS-QUIXBERRY-REF");
      expect(hit.serviceName).toBe("Quixberry Production");
      expect(hit.status).toBe("PENDING");

      // The nameRw spelling of the service matches too.
      const rw = await authed(searchUrl("Ibyakora"));
      const rwBody = (await rw.json()) as SearchBody;
      expect(rwBody.bookings.map((b) => b.id)).toContain(byRef.id);

      // A booking whose own columns and service name all miss the term does not match.
      const other = await createService("Unrelated Mix", { nameRw: "Ibindi" });
      const miss = await createBooking(other.id, { contactName: "Nobody", contactEmail: "no@match.example" });
      const missRes = await authed(searchUrl("quixberry"));
      const missBody = (await missRes.json()) as SearchBody;
      expect(missBody.bookings.map((b) => b.id)).not.toContain(miss.id);
    });

    it("matches bookings on contactName and contactEmail too", async () => {
      const svc = await createService("Generic Service");
      const named = await createBooking(svc.id, { contactName: "Aline Uwase" });
      const emailed = await createBooking(svc.id, { contactEmail: "unique-email-target@example.com" });

      const byName = (await (await authed(searchUrl("Uwase"))).json()) as SearchBody;
      expect(byName.bookings.map((b) => b.id)).toEqual([named.id]);

      const byEmail = (await (await authed(searchUrl("unique-email-target"))).json()) as SearchBody;
      expect(byEmail.bookings.map((b) => b.id)).toEqual([emailed.id]);
    });

    it("matches posts by titleEn, titleRw and slug, ordered publishedAt desc nulls last then createdAt desc", async () => {
      const base = Date.now();
      const oldest = await createPost({
        titleEn: "Fenwick Recap", titleRw: "Ibyakora", slug: "oldest-fenwick",
        published: true, publishedAt: new Date(base - 3000), createdAt: new Date(base - 5000),
      });
      const newestPublished = await createPost({
        titleEn: "Fenwick Launch", titleRw: "Ibyakora", slug: "newest-fenwick",
        published: true, publishedAt: new Date(base - 1000), createdAt: new Date(base - 4000),
      });
      // Two drafts (publishedAt null) — createdAt desc breaks the tie between them.
      const draftOld = await createPost({
        titleEn: "Fenwick Draft Old", titleRw: "Ibyakora", slug: "draft-old-fenwick",
        published: false, publishedAt: null, createdAt: new Date(base - 2000),
      });
      const draftNew = await createPost({
        titleEn: "Fenwick Draft New", titleRw: "Ibyakora", slug: "draft-new-fenwick",
        published: false, publishedAt: null, createdAt: new Date(base - 100),
      });

      const body = (await (await authed(searchUrl("Fenwick"))).json()) as SearchBody;
      expect(body.posts.map((p) => p.id)).toEqual([newestPublished.id, oldest.id, draftNew.id, draftOld.id]);
      expect(body.posts.map((p) => p.published)).toEqual([true, true, false, false]);

      // titleRw and slug are searchable too.
      const byRw = (await (await authed(searchUrl("Ibyakora"))).json()) as SearchBody;
      expect(byRw.posts.length).toBeGreaterThanOrEqual(4);
      const bySlug = (await (await authed(searchUrl("draft-old-fenwick"))).json()) as SearchBody;
      expect(bySlug.posts.map((p) => p.id)).toEqual([draftOld.id]);
    });

    it("matches services by nameEn and nameRw, ordered sortOrder asc then createdAt asc", async () => {
      // Seeding order is deliberately NOT the expected order: the two sortOrder-1
      // rows are created Zulu-last, so only "createdAt asc" can order them.
      const second = await createService("Widdershins Rig", { sortOrder: 5 });
      const firstLate = await createService("Widdershins Alpha", { sortOrder: 1 });
      const firstEarly = await createService("Widdershins Zulu", { sortOrder: 1 });
      const rwOnly = await createService("Imbareake", { nameRw: "Widdershins Kinyarwanda", sortOrder: 0 });

      const body = (await (await authed(searchUrl("Widdershins"))).json()) as SearchBody;
      // sortOrder asc puts rwOnly first; the sortOrder-1 pair is broken by createdAt asc.
      expect(body.services.map((s) => s.id)).toEqual([rwOnly.id, firstLate.id, firstEarly.id, second.id]);
      const byRw = (await (await authed(searchUrl("Widdershins Kinyarwanda"))).json()) as SearchBody;
      expect(byRw.services.map((s) => s.id)).toEqual([rwOnly.id]);
    });

    it("trims the term before matching", async () => {
      const svc = await createService("Marginal Gain Rig");
      const booking = await createBooking(svc.id);
      const res = await authed(`${baseUrl}/api/admin/search?q=${encodeURIComponent("  Marginal  ")}`);
      const body = (await res.json()) as SearchBody;
      expect(body.services.map((s) => s.id)).toEqual([svc.id]);
      expect(body.bookings.map((b) => b.id)).toEqual([booking.id]);
    });

    it("returns 401 without an admin token", async () => {
      const res = await fetch(searchUrl("anything"));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });
  });

  // ================= GET /api/admin/bookings?q= =================

  describe("GET /api/admin/bookings?status=&q=", () => {
    it("filters on q alone, matching the same predicate as /search", async () => {
      const svc = await createService("Kettledrum Labs");
      const hit = await createBooking(svc.id, { contactName: "Found By Term" });
      // Different service AND different own-columns -> matches nothing.
      const other = await createService("Flugelhorn Stage");
      const miss = await createBooking(other.id, { contactName: "Unrelated Person" });

      const res = await authed(bookingsUrl("?q=Kettledrum"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string }[];
      expect(body.map((b) => b.id)).toEqual([hit.id]);
      expect(body.map((b) => b.id)).not.toContain(miss.id);
    });

    it("ANDs q with the optional status filter", async () => {
      const svc = await createService("Vellum Works");
      const pending = await createBooking(svc.id, { contactName: "Vellum Person", status: "PENDING" });
      const confirmed = await createBooking(svc.id, { contactName: "Vellum Person", status: "CONFIRMED" });
      const cancelled = await createBooking(svc.id, { contactName: "Vellum Person", status: "CANCELLED" });

      const qOnly = (await (await authed(bookingsUrl("?q=Vellum"))).json()) as { id: string }[];
      expect(qOnly.map((b) => b.id).sort()).toEqual([pending.id, confirmed.id, cancelled.id].sort());

      const qAndConfirmed = (await (await authed(bookingsUrl("?q=Vellum&status=CONFIRMED"))).json()) as { id: string; status: string }[];
      expect(qAndConfirmed.map((b) => b.id)).toEqual([confirmed.id]);
      expect(qAndConfirmed[0].status).toBe("CONFIRMED");

      // status alone (no q) still works exactly as before.
      const statusOnly = (await (await authed(bookingsUrl("?status=CANCELLED"))).json()) as { id: string }[];
      expect(statusOnly.map((b) => b.id)).toEqual([cancelled.id]);

      // no filters at all.
      const all = (await (await authed(bookingsUrl())).json()) as { id: string }[];
      expect(all).toHaveLength(3);
    });

    it("leaves the row shape unchanged (service + notifications still present)", async () => {
      const svc = await createService("Oriel Sound Stage");
      const booking = await createBooking(svc.id, { contactName: "Oriel Person" });
      await prisma.notificationLog.create({
        data: {
          bookingId: booking.id,
          channel: "EMAIL",
          kind: "BOOKING_RECEIVED",
          recipient: "oriel@example.com",
          status: "sent",
        },
      });

      const body = (await (await authed(bookingsUrl("?q=Oriel"))).json()) as Record<string, unknown>[];
      const row = body[0];
      expect(row.id).toBe(booking.id);
      expect(row).toHaveProperty("service");
      expect(row).toHaveProperty("notifications");
      expect((row.service as { nameEn: string }).nameEn).toBe("Oriel Sound Stage");
      expect(Array.isArray(row.notifications)).toBe(true);
      expect((row.notifications as unknown[]).length).toBe(1);
      // Pre-existing scalar columns must survive.
      for (const key of ["reference", "contactName", "contactEmail", "status", "createdAt", "eventDate", "location", "budgetRange"]) {
        expect(row).toHaveProperty(key);
      }
    });

    it("rejects an invalid q or status with 400 VALIDATION", async () => {
      for (const qs of ["?q=a", "?q=" + "x".repeat(61), "?status=NOPE", "?q=ab&status=BOGUS"]) {
        const res = await authed(bookingsUrl(qs));
        expect(res.status, qs).toBe(400);
        const body = (await res.json()) as { error: string; issues: unknown[] };
        expect(body.error, qs).toBe("VALIDATION");
        expect(Array.isArray(body.issues), qs).toBe(true);
      }
    });
  });

  // ================= GET /api/admin/dashboard?days= =================

  describe("GET /api/admin/dashboard?days=", () => {
    it("keeps every pre-existing key (additive response) and defaults days to 14", async () => {
      const res = await authed(dashboardUrl());
      expect(res.status).toBe(200);
      const body = (await res.json()) as DashboardBody;

      for (const key of ["stats", "bookingsByDay", "topServices", "counts", "recent", "upcoming"]) {
        expect(body, key).toHaveProperty(key);
      }
      expect(body.bookingsByDay).toHaveLength(14);
    });

    it("days=30 spans exactly 30 zero-filled days ending today", async () => {
      const svc = await createService("Chart Service");
      // A booking 20 days old is outside the default 14-day window but inside 30.
      const twentyDaysAgo = new Date(Date.now() - 20 * DAY_MS);
      await createBooking(svc.id, { createdAt: twentyDaysAgo });

      const wide = (await (await authed(dashboardUrl("?days=30"))).json()) as DashboardBody;
      expect(wide.bookingsByDay).toHaveLength(30);

      const narrow = (await (await authed(dashboardUrl())).json()) as DashboardBody;
      expect(narrow.bookingsByDay).toHaveLength(14);

      // The first entry is 29 days back; the last is today.
      const todayUtc = new Date().toISOString().slice(0, 10);
      expect(wide.bookingsByDay[29].date).toBe(todayUtc);
      const first = new Date(wide.bookingsByDay[0].date + "T00:00:00Z");
      const expectedFirst = new Date(new Date(todayUtc + "T00:00:00Z").getTime() - 29 * DAY_MS);
      expect(first.toISOString()).toBe(expectedFirst.toISOString());

      // Strictly ascending, same item shape as before.
      for (let i = 1; i < wide.bookingsByDay.length; i++) {
        expect(wide.bookingsByDay[i].date > wide.bookingsByDay[i - 1].date).toBe(true);
        expect(typeof wide.bookingsByDay[i].count).toBe("number");
      }
      // The 20-day-old booking only shows in the 30-day series.
      const oldKey = twentyDaysAgo.toISOString().slice(0, 10);
      expect(wide.bookingsByDay.find((e) => e.date === oldKey)!.count).toBeGreaterThanOrEqual(1);
      expect(narrow.bookingsByDay.some((e) => e.date === oldKey)).toBe(false);
    });

    it("accepts 7, 14, 30 and 90 and rejects anything else with 400 VALIDATION", async () => {
      for (const [days, span] of [[7, 7], [14, 14], [30, 30], [90, 90]] as const) {
        const res = await authed(dashboardUrl(`?days=${days}`));
        expect(res.status, String(days)).toBe(200);
        const body = (await res.json()) as DashboardBody;
        expect(body.bookingsByDay, String(days)).toHaveLength(span);
      }

      for (const bad of ["7x", "abc", "0", "15", "-7", ""]) {
        const res = await authed(dashboardUrl(`?days=${bad}`));
        expect(res.status, bad).toBe(400);
        const body = (await res.json()) as { error: string; issues: unknown[] };
        expect(body.error, bad).toBe("VALIDATION");
        expect(Array.isArray(body.issues), bad).toBe(true);
      }
    });

    it("always includes upcoming, as an empty array when nothing is scheduled", async () => {
      const svc = await createService("No Events Service");
      await createBooking(svc.id, { contactName: "Undated" });

      const body = (await (await authed(dashboardUrl())).json()) as DashboardBody;
      expect(body).toHaveProperty("upcoming");
      expect(Array.isArray(body.upcoming)).toBe(true);
      expect(body.upcoming).toEqual([]);
    });

    it("upcoming orders eventDate asc and excludes COMPLETED/CANCELLED, out-of-window and undated bookings", async () => {
      const svc = await createService("Production Week");
      const in2 = await createBooking(svc.id, { eventDate: new Date(Date.now() + 2 * DAY_MS), status: "CONFIRMED", location: "Kigali", budgetRange: "1M-2M RWF" });
      const in5 = await createBooking(svc.id, { eventDate: new Date(Date.now() + 5 * DAY_MS), status: "PENDING" });
      const in10 = await createBooking(svc.id, { eventDate: new Date(Date.now() + 10 * DAY_MS), status: "DELIVERED" });
      // Excluded: terminal statuses.
      const completed = await createBooking(svc.id, { eventDate: new Date(Date.now() + 3 * DAY_MS), status: "COMPLETED" });
      const cancelled = await createBooking(svc.id, { eventDate: new Date(Date.now() + 4 * DAY_MS), status: "CANCELLED" });
      // Excluded: outside the 14-day window / in the past / no eventDate.
      const farFuture = await createBooking(svc.id, { eventDate: new Date(Date.now() + 30 * DAY_MS), status: "CONFIRMED" });
      const past = await createBooking(svc.id, { eventDate: new Date(Date.now() - 2 * DAY_MS), status: "CONFIRMED" });
      const undated = await createBooking(svc.id, { status: "CONFIRMED" });

      const body = (await (await authed(dashboardUrl())).json()) as DashboardBody;
      expect(body.upcoming.map((b) => b.id)).toEqual([in2.id, in5.id, in10.id]);

      for (const excluded of [completed.id, cancelled.id, farFuture.id, past.id, undated.id]) {
        expect(body.upcoming.map((b) => b.id)).not.toContain(excluded);
      }

      // Exact item shape.
      expect(Object.keys(body.upcoming[0]).sort()).toEqual([
        "budgetRange", "contactName", "eventDate", "id", "location", "reference", "serviceName", "status",
      ]);
      const first = body.upcoming[0];
      expect(first.reference).toBe(in2.reference);
      expect(first.status).toBe("CONFIRMED");
      expect(first.location).toBe("Kigali");
      expect(first.budgetRange).toBe("1M-2M RWF");
      expect(first.serviceName).toBe("Production Week");
      expect(new Date(first.eventDate as string).toISOString()).toBe(first.eventDate);

      // Ascending by event date.
      const dates = body.upcoming.map((b) => new Date(b.eventDate as string).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });

    it("upcoming caps at 20 and keeps the 20 soonest events", async () => {
      const svc = await createService("Busy Season");
      // 25 events, all INSIDE the 14-day window (10h apart, max ~10.4 days out)
      // so the cap — not the window — is what truncates the list.
      const created: { id: string }[] = [];
      for (let i = 0; i < 25; i++) {
        created.push(await createBooking(svc.id, { eventDate: new Date(Date.now() + (i + 1) * 10 * 60 * 60 * 1000) }));
      }

      const body = (await (await authed(dashboardUrl())).json()) as DashboardBody;
      expect(body.upcoming).toHaveLength(20);
      // Ascending eventDate + take 20 => the 20 soonest, in order.
      expect(body.upcoming.map((b) => b.id)).toEqual(created.slice(0, 20).map((b) => b.id));
    });
  });

  // ================= GET /api/admin/health =================

  describe("GET /api/admin/health", () => {
    it("returns the four contract fields with db ok and a numeric uptime", async () => {
      const res = await authed(healthUrl());
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;

      expect(Object.keys(body).sort()).toEqual(["db", "failedSends24h", "status", "uptimeSeconds"]);
      expect(body.status).toBe("ok");
      expect(body.db).toBe("ok");
      expect(typeof body.uptimeSeconds).toBe("number");
      expect(Number.isInteger(body.uptimeSeconds)).toBe(true);
      expect(body.uptimeSeconds as number).toBeGreaterThanOrEqual(0);
      expect(body.uptimeSeconds as number).toBeLessThanOrEqual(Math.round(process.uptime()));
      expect(typeof body.failedSends24h).toBe("number");
      expect(body.failedSends24h).toBe(0);
    });

    it("failedSends24h counts only failed logs created inside the last 24h", async () => {
      const svc = await createService("Health Service");
      const booking = await createBooking(svc.id);
      const now = Date.now();

      await prisma.notificationLog.createMany({
        data: [
          { bookingId: booking.id, channel: "EMAIL", kind: "BOOKING_RECEIVED", recipient: "a@example.com", status: "failed", sentAt: new Date(now - 1 * 60 * 60 * 1000) },
          { bookingId: booking.id, channel: "EMAIL", kind: "BOOKING_RECEIVED", recipient: "b@example.com", status: "failed", sentAt: new Date(now - 23 * 60 * 60 * 1000) },
          // Outside the window.
          { bookingId: booking.id, channel: "EMAIL", kind: "BOOKING_RECEIVED", recipient: "c@example.com", status: "failed", sentAt: new Date(now - 30 * 60 * 60 * 1000) },
          // In-window but not failed.
          { bookingId: booking.id, channel: "EMAIL", kind: "BOOKING_RECEIVED", recipient: "d@example.com", status: "sent", sentAt: new Date(now - 2 * 60 * 60 * 1000) },
          { bookingId: booking.id, channel: "WHATSAPP", kind: "BOOKING_RECEIVED", recipient: "e@example.com", status: "skipped", sentAt: new Date(now - 3 * 60 * 60 * 1000) },
        ],
      });

      const body = (await (await authed(healthUrl())).json()) as { failedSends24h: number };
      expect(body.failedSends24h).toBe(2);
    });

    it("returns 401 without an admin token", async () => {
      const res = await fetch(healthUrl());
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });
  });
});
