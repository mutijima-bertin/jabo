import type { Server } from "http";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { createApp } from "../../app";
import { prisma } from "../../config/db";
import { signAdminToken } from "../../services/auth";

// Admin dashboard: GET /api/admin/dashboard. Exercises the extended contract
// (stats + bookingsByDay + topServices + counts + recent) using the same
// real-express-app + prisma-fixture pattern as adminClients.test.ts.

describe("GET /api/admin/dashboard (extended contract)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;

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
    // Clean up everything in FK-safe order.
    await prisma.bookingEvent.deleteMany();
    await prisma.notificationLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.blogPost.deleteMany();
    await prisma.portfolioItem.deleteMany();
    await prisma.service.deleteMany();
    await prisma.client.deleteMany();
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  afterEach(async () => {
    await prisma.bookingEvent.deleteMany();
    await prisma.notificationLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.blogPost.deleteMany();
    await prisma.portfolioItem.deleteMany();
    await prisma.service.deleteMany();
    await prisma.client.deleteMany();
  });

  // ---------- helpers ----------

  async function createService(nameEn: string) {
    return prisma.service.create({
      data: {
        nameEn,
        nameRw: nameEn,
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: "audio",
      },
    });
  }

  async function createBooking(serviceId: string, overrides: Record<string, unknown> = {}) {
    const ref = `CSS-${Date.now()}-${Math.random().toString(36).slice(2).toUpperCase()}`;
    return prisma.booking.create({
      data: {
        reference: ref,
        serviceId,
        contactName: (overrides.contactName as string) ?? "Test Contact",
        contactEmail: (overrides.contactEmail as string) ?? "test@example.com",
        status: (overrides.status as "PENDING" | "CONFIRMED" | "IN_PRODUCTION" | "DELIVERED" | "COMPLETED" | "CANCELLED") ?? "PENDING",
        createdAt: overrides.createdAt as Date | undefined,
      },
    });
  }

  // ---------- tests ----------

  it("returns 200 with the full contract shape", async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    // Top-level keys
    expect(body).toHaveProperty("stats");
    expect(body).toHaveProperty("bookingsByDay");
    expect(body).toHaveProperty("topServices");
    expect(body).toHaveProperty("counts");
    expect(body).toHaveProperty("recent");

    // stats sub-keys (zero-filled on empty DB)
    const stats = body.stats as Record<string, number>;
    for (const key of [
      "total",
      "pending",
      "confirmed",
      "inProduction",
      "delivered",
      "completed",
      "cancelled",
      "clients",
    ]) {
      expect(stats).toHaveProperty(key);
      expect(typeof stats[key]).toBe("number");
    }

    // bookingsByDay is an array
    expect(Array.isArray(body.bookingsByDay)).toBe(true);

    // topServices is an array
    expect(Array.isArray(body.topServices)).toBe(true);

    // counts sub-keys
    const counts = body.counts as Record<string, number>;
    for (const key of ["testimonials", "posts", "portfolio", "services"]) {
      expect(counts).toHaveProperty(key);
      expect(typeof counts[key]).toBe("number");
    }

    // recent is an array
    expect(Array.isArray(body.recent)).toBe(true);
  });

  it("bookingsByDay has exactly 14 entries, dates strictly ascending and YYYY-MM-DD", async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { bookingsByDay: { date: string; count: number }[] };

    expect(body.bookingsByDay).toHaveLength(14);

    // Each date must match YYYY-MM-DD and be strictly ascending.
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (let i = 0; i < body.bookingsByDay.length; i++) {
      expect(body.bookingsByDay[i].date).toMatch(dateRegex);
      expect(typeof body.bookingsByDay[i].count).toBe("number");
      if (i > 0) {
        expect(body.bookingsByDay[i].date > body.bookingsByDay[i - 1].date).toBe(true);
      }
    }
  });

  it("today's count in bookingsByDay reflects a booking created today", async () => {
    const service = await createService("Wedding Photography");
    await createBooking(service.id, { contactName: "Today Client" });

    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { bookingsByDay: { date: string; count: number }[] };

    // Today in YYYY-MM-DD (UTC).
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      .toISOString()
      .slice(0, 10);

    const todayEntry = body.bookingsByDay.find((e) => e.date === today);
    expect(todayEntry).toBeDefined();
    expect(todayEntry!.count).toBeGreaterThanOrEqual(1);
  });

  it("zero-fills days with no bookings (count: 0)", async () => {
    // Create a booking 3 days ago so at least one day has data, but others
    // should still be zero-filled.
    const service = await createService("Studio Session");
    const threeDaysAgo = new Date();
    threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
    threeDaysAgo.setUTCHours(12, 0, 0, 0);
    await createBooking(service.id, { contactName: "Old Client", createdAt: threeDaysAgo });

    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { bookingsByDay: { date: string; count: number }[] };

    // At least one entry must have count 0 (the 14-day window contains many
    // empty days when only one booking exists).
    const zeroDays = body.bookingsByDay.filter((e) => e.count === 0);
    expect(zeroDays.length).toBeGreaterThan(0);

    // The specific day 3 days ago should have count >= 1.
    const target = threeDaysAgo.toISOString().slice(0, 10);
    const targetEntry = body.bookingsByDay.find((e) => e.date === target);
    expect(targetEntry).toBeDefined();
    expect(targetEntry!.count).toBeGreaterThanOrEqual(1);
  });

  it("topServices breaks ties by nameEn ascending", async () => {
    const svcA = await createService("Zulu Audio");
    const svcB = await createService("Alpha Studio");
    // Same count on both — must land sorted by nameEn ascending.
    await createBooking(svcA.id);
    await createBooking(svcB.id);

    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as {
      topServices: { id: string; nameEn: string; count: number }[];
    };

    const alphaEntry = body.topServices.find((s) => s.id === svcB.id);
    const zuluEntry = body.topServices.find((s) => s.id === svcA.id);
    expect(alphaEntry).toBeDefined();
    expect(zuluEntry).toBeDefined();
    const alphaIdx = body.topServices.findIndex((s) => s.id === svcB.id);
    const zuluIdx = body.topServices.findIndex((s) => s.id === svcA.id);
    expect(alphaIdx).toBeLessThan(zuluIdx);
    expect(alphaEntry!.count).toBe(zuluEntry!.count);
  });

  it("topServices orders by count desc and caps at 5", async () => {
    // Create 6 services, put bookings on each so the 6th is dropped.
    const svcNames = [
      "Wedding Photography",
      "Event Videography",
      "Studio Recording",
      "Live Sound",
      "Podcast Production",
      "Drone Shoot",
    ];
    const services = await Promise.all(svcNames.map((n) => createService(n)));

    // 5 bookings on the first service, 4 on the second, ..., 0 on the last.
    for (let i = 0; i < 5; i++) await createBooking(services[0].id);
    for (let i = 0; i < 4; i++) await createBooking(services[1].id);
    for (let i = 0; i < 3; i++) await createBooking(services[2].id);
    for (let i = 0; i < 2; i++) await createBooking(services[3].id);
    for (let i = 0; i < 1; i++) await createBooking(services[4].id);
    // services[5] gets zero bookings.

    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as {
      topServices: { id: string; nameEn: string; count: number }[];
    };

    expect(body.topServices).toHaveLength(5);

    // Descending by count.
    for (let i = 1; i < body.topServices.length; i++) {
      expect(body.topServices[i].count <= body.topServices[i - 1].count).toBe(true);
    }

    // First entry is Wedding Photography with count 5.
    expect(body.topServices[0].nameEn).toBe("Wedding Photography");
    expect(body.topServices[0].count).toBe(5);

    // Drone Shoot (zero bookings) must not appear.
    expect(body.topServices.find((s) => s.nameEn === "Drone Shoot")).toBeUndefined();
  });

  it("counts reflects seeded rows for testimonials and services", async () => {
    // Seed 2 testimonials, 3 services, 1 blog post, 1 portfolio item.
    const services = await Promise.all([
      createService("Service A"),
      createService("Service B"),
      createService("Service C"),
    ]);
    await prisma.testimonial.createMany({
      data: [
        { author: "T1", contentEn: "Great!" },
        { author: "T2", contentEn: "Awesome!" },
      ],
    });
    await prisma.blogPost.create({
      data: {
        slug: "test-post-1",
        titleEn: "Test Post",
        titleRw: "Inkoko",
        excerptEn: "Excerpt",
        contentEn: "Content",
        contentRw: "Ibisobanuro",
      },
    });
    await prisma.portfolioItem.create({
      data: {
        titleEn: "Portfolio Item",
        category: "audio",
        coverUrl: "/uploads/test.jpg",
      },
    });

    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { counts: Record<string, number> };

    expect(body.counts.testimonials).toBeGreaterThanOrEqual(2);
    expect(body.counts.services).toBeGreaterThanOrEqual(3);
    expect(body.counts.posts).toBeGreaterThanOrEqual(1);
    expect(body.counts.portfolio).toBeGreaterThanOrEqual(1);
  });

  it("stats are accurate for seeded bookings", async () => {
    const svc = await createService("Status Test Service");
    await createBooking(svc.id, { status: "PENDING" });
    await createBooking(svc.id, { status: "CONFIRMED" });
    await createBooking(svc.id, { status: "CONFIRMED" });

    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as { stats: Record<string, number> };

    expect(body.stats.total).toBeGreaterThanOrEqual(3);
    expect(body.stats.pending).toBeGreaterThanOrEqual(1);
    expect(body.stats.confirmed).toBeGreaterThanOrEqual(2);
  });

  it("returns 401 without an admin token", async () => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});
