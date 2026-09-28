import type { Server } from "http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Request } from "express";
import { Prisma, type AdminNotification } from "@prisma/client";
import { createApp } from "../../app";
import { prisma } from "../../config/db";
import { signAdminToken } from "../../services/auth";
import { createBooking, updateBookingStatus } from "../../services/bookings";
import { postTestimonial } from "../../controllers/clients.controller";

type NotifType = AdminNotification["type"];

/**
 * Tier-1 in-app admin notifications: list/read endpoints + the five event
 * writers (NEW_BOOKING, STATUS_CHANGED, NEW_CONTACT_MESSAGE, TESTIMONIAL_SUBMITTED).
 * Same real-express-app + prisma-fixture harness as adminBookings.test.ts.
 *
 * NOTE: event writers are fire-and-forget by contract — callers must never await
 * them — so this suite polls for the asynchronously-landed rows instead of racing
 * them. beforeEach clears the shared bell/contact tables (other suites leave
 * async bell rows behind in the same test DB).
 */

describe("GET /api/admin/notifications + POST /api/admin/notifications/read", () => {
  let server: Server;
  let baseUrl: string;
  let adminToken: string;

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
    adminToken = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.adminNotification.deleteMany();
    await prisma.contactMessage.deleteMany();
    await prisma.bookingEvent.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.service.deleteMany();
    await prisma.client.deleteMany();
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    // Fresh bell/contact baseline for every test — other suites (services/bookings,
    // publicContact) leave async fire-and-forget rows in the shared test DB.
    await prisma.adminNotification.deleteMany();
    await prisma.contactMessage.deleteMany();
    await prisma.bookingEvent.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.service.deleteMany();
    await prisma.client.deleteMany();
  });

  // ---------- helpers ----------

  function createNotif(
    overrides: Partial<{ type: NotifType; payload: Prisma.JsonObject; linkHref: string | null; readAt: Date | null; createdAt: Date }> = {}
  ): Promise<AdminNotification> {
    return prisma.adminNotification.create({
      data: {
        type: overrides.type ?? "NEW_BOOKING",
        payload: overrides.payload ?? { bookingId: "b1" },
        linkHref: overrides.linkHref ?? undefined,
        readAt: overrides.readAt ?? undefined,
        createdAt: overrides.createdAt ?? undefined,
      },
    });
  }

  const notifyRow = (type: NotifType) => prisma.adminNotification.findFirst({ where: { type } });

  const listUrl = () => `${baseUrl}/api/admin/notifications`;
  const readUrl = () => `${baseUrl}/api/admin/notifications/read`;

  const authedGet = (url: string) => fetch(url, { headers: { authorization: `Bearer ${adminToken}` } });

  async function postRead(body: unknown) {
    return fetch(readUrl(), {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function makeService(nameEn = "Studio Session") {
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

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  // ---------- contract: list ----------

  it("returns items newest-first with unreadCount and the exact AdminNotifItem shape", async () => {
    const base = Date.now();
    const n1 = await createNotif({ createdAt: new Date(base - 2000) });
    const n2 = await createNotif({ type: "STATUS_CHANGED", payload: { from: "PENDING", to: "CONFIRMED" }, createdAt: new Date(base - 1000) });
    const n3 = await createNotif({ type: "NEW_CONTACT_MESSAGE", payload: { subject: "Hi" }, createdAt: new Date(base) });

    const res = await authedGet(listUrl());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Record<string, unknown>[]; unreadCount: number };

    expect(body.items).toHaveLength(3);
    expect(body.items.map((i) => i.id)).toEqual([n3.id, n2.id, n1.id]);
    expect(body.unreadCount).toBe(3);

    for (const item of body.items) {
      expect(Object.keys(item).sort()).toEqual(["createdAt", "id", "linkHref", "payload", "readAt", "type"]);
      expect(typeof item.createdAt).toBe("string");
      expect(new Date(item.createdAt as string).toISOString()).toBe(item.createdAt); // ISO-8601
      expect(item.readAt).toBeNull();
      expect(typeof item.payload).toBe("object");
      expect(typeof item.type).toBe("string");
    }
  });

  it("supports linkHref null, then a value, and readAt ISO once read", async () => {
    const n1 = await createNotif({ linkHref: null });
    await createNotif({ type: "TESTIMONIAL_SUBMITTED", linkHref: "?tab=settings", payload: { author: "A" } });

    const res = await authedGet(listUrl());
    const body = (await res.json()) as { items: Record<string, unknown>[] };
    const newest = body.items.find((i) => i.type === "TESTIMONIAL_SUBMITTED")!;
    expect(newest.linkHref).toBe("?tab=settings");

    const read = await prisma.adminNotification.update({ where: { id: n1.id }, data: { readAt: new Date() } });
    const res2 = await authedGet(listUrl());
    const body2 = (await res2.json()) as { items: Record<string, unknown>[] };
    const readItem = body2.items.find((i) => i.id === n1.id)!;
    expect(readItem.readAt).toBe(new Date(read.readAt!).toISOString());
  });

  it("unread=1 filters to unread rows while unreadCount stays the global unread total", async () => {
    const a = await createNotif();
    const b = await createNotif();
    const c = await createNotif();
    // Only `c` is read.
    await prisma.adminNotification.update({ where: { id: c.id }, data: { readAt: new Date() } });

    const res = await authedGet(`${listUrl()}?unread=1`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { id: string }[]; unreadCount: number };

    expect(body.items.map((i) => i.id).sort()).toEqual([a.id, b.id].sort());
    expect(body.items.every((_) => true)).toBe(true);
    for (const item of body.items) {
      expect(item.id).not.toBe(c.id);
    }
    expect(body.unreadCount).toBe(2);
  });

  it("defaults limit to 20 and honors a smaller explicit limit", async () => {
    await prisma.adminNotification.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({ type: "NEW_BOOKING" as NotifType, payload: { i } })),
    });

    const defaultRes = await authedGet(listUrl());
    const defaultBody = (await defaultRes.json()) as { items: unknown[] };
    expect(defaultBody.items).toHaveLength(20);

    const limitedRes = await authedGet(`${listUrl()}?limit=1`);
    const limitedBody = (await limitedRes.json()) as { items: unknown[] };
    expect(limitedBody.items).toHaveLength(1);
  });

  it("rejects invalid limit/unread query values with 400 VALIDATION", async () => {
    for (const qs of ["limit=0", "limit=51", "limit=abc", "limit=-1", "unread=2", "unread=abc"]) {
      const res = await authedGet(`${listUrl()}?${qs}`);
      expect(res.status, qs).toBe(400);
      const body = (await res.json()) as { error: string; issues: unknown[] };
      expect(body.error).toBe("VALIDATION");
      expect(Array.isArray(body.issues)).toBe(true);
    }
  });

  it("returns 401 without an admin token", async () => {
    const res = await fetch(listUrl());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  // ---------- contract: read ----------

  it("POST /read with missing ids marks every unread row read", async () => {
    await createNotif();
    await createNotif();
    await createNotif();
    expect(await prisma.adminNotification.count({ where: { readAt: null } })).toBe(3);

    const res = await postRead({});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await prisma.adminNotification.count({ where: { readAt: null } })).toBe(0);
  });

  it("POST /read with an empty ids array also marks all read", async () => {
    await createNotif();
    const res = await postRead({ ids: [] });
    expect(res.status).toBe(200);
    expect(await prisma.adminNotification.count({ where: { readAt: null } })).toBe(0);
  });

  it("POST /read with ids marks only those rows; already-read ids are a no-op", async () => {
    const a = await createNotif();
    const b = await createNotif();
    const c = await createNotif();
    await prisma.adminNotification.update({ where: { id: c.id }, data: { readAt: new Date() } });

    const res = await postRead({ ids: [a.id, c.id] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const [aRow, bRow, cRow] = await Promise.all([
      prisma.adminNotification.findUniqueOrThrow({ where: { id: a.id } }),
      prisma.adminNotification.findUniqueOrThrow({ where: { id: b.id } }),
      prisma.adminNotification.findUniqueOrThrow({ where: { id: c.id } }),
    ]);
    expect(aRow.readAt).not.toBeNull();
    expect(bRow.readAt).toBeNull();
    expect(cRow.readAt).not.toBeNull(); // was already read -> unchanged
    expect(await prisma.adminNotification.count({ where: { readAt: null } })).toBe(1);
  });

  it("POST /read rejects non-array or oversized ids with 400 VALIDATION", async () => {
    const cases = [{ ids: "abc" }, { ids: [1, 2] }, { ids: Array.from({ length: 101 }, (_, i) => `id-${i}`) }];
    for (const body of cases) {
      const res = await postRead(body);
      expect(res.status).toBe(400);
      const parsed = (await res.json()) as { error: string; issues: unknown[] };
      expect(parsed.error).toBe("VALIDATION");
      expect(Array.isArray(parsed.issues)).toBe(true);
    }
  });

  // ---------- event writers ----------

  it("createBooking writes a NEW_BOOKING bell row and still returns to the caller (fire-and-forget)", async () => {
    const service = await makeService("Wedding Photography");
    const contactName = "Aline Uwase";
    const { booking } = await createBooking({
      serviceId: service.id,
      contactName,
      contactEmail: uniqueEmail("alice"),
    });

    // The service returns without awaiting the bell — the row lands asynchronously.
    expect(booking.id).toBeTruthy();
    await expect.poll(() => notifyRow("NEW_BOOKING"), { timeout: 3000 }).not.toBeNull();

    const n = (await notifyRow("NEW_BOOKING"))!;
    expect(n.payload).toMatchObject({ bookingId: booking.id, reference: booking.reference, clientName: contactName });
    expect(n.linkHref).toBe(`?tab=bookings&open=${booking.id}`);
  });

  it("updateBookingStatus writes STATUS_CHANGED with from/to payload captured before the transition", async () => {
    const service = await makeService("Event Videography");
    const { booking } = await createBooking({
      serviceId: service.id,
      contactName: "Eric",
      contactEmail: uniqueEmail("eric"),
    });
    await expect.poll(() => notifyRow("NEW_BOOKING"), { timeout: 3000 }).not.toBeNull();

    await updateBookingStatus(booking.id, "CONFIRMED");

    await expect.poll(() => notifyRow("STATUS_CHANGED"), { timeout: 3000 }).not.toBeNull();
    const n = (await notifyRow("STATUS_CHANGED"))!;
    expect(n.payload).toMatchObject({
      bookingId: booking.id,
      reference: booking.reference,
      from: "PENDING",
      to: "CONFIRMED",
    });
    expect(n.linkHref).toBe(`?tab=bookings&open=${booking.id}`);
  });

  it("POST /api/contact stores a ContactMessage + NEW_CONTACT_MESSAGE while still returning a synchronous 201", async () => {
    const email = uniqueEmail("contact");
    const subject = "Wedding quote";
    const message = "Hi, we would love a quote for a full wedding film next January.";
    const res = await fetch(`${baseUrl}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alain Bizimana", email, phone: "+250788123456", subject, message, language: "en" }),
    });

    // The response contract is byte-identical to before — it must not await the writes.
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });

    await expect.poll(() => prisma.contactMessage.findFirst({ where: { email } }), { timeout: 3000 }).not.toBeNull();
    await expect.poll(() => notifyRow("NEW_CONTACT_MESSAGE"), { timeout: 3000 }).not.toBeNull();

    const row = await prisma.contactMessage.findFirstOrThrow({ where: { email } });
    expect(row.name).toBe("Alain Bizimana");
    expect(row.subject).toBe(subject);
    expect(row.message).toBe(message);
    expect(row.phone).toBe("+250788123456");
    expect(row.language).toBe("en");

    const n = (await notifyRow("NEW_CONTACT_MESSAGE"))!;
    expect(n.payload).toMatchObject({ id: row.id, email: row.email, subject: row.subject });
    expect(n.linkHref).toBe("?tab=dashboard&attention=contact");
  });

  it("postTestimonial raises TESTIMONIAL_SUBMITTED after the insert (handler-level, bypasses the route limiter)", async () => {
    const client = await prisma.client.create({
      data: { name: "Client One", email: uniqueEmail("client"), phone: "+250700000000" },
    });

    const req = {
      clientId: client.id,
      body: { contentEn: "A brilliant experience end to end.", role: "Producer" },
    } as unknown as Request;

    let statusCode = 0;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
    } as unknown as Parameters<typeof postTestimonial>[1];

    await postTestimonial(req, res);
    expect(statusCode).toBe(201);

    await expect.poll(() => notifyRow("TESTIMONIAL_SUBMITTED"), { timeout: 3000 }).not.toBeNull();
    const n = (await notifyRow("TESTIMONIAL_SUBMITTED"))!;
    expect(n.payload).toMatchObject({ author: client.name, email: client.email });
    expect(n.linkHref).toBe("?tab=settings");

    // The testimonial itself was persisted (the writer fires only after insert).
    const persisted = await prisma.testimonial.findFirstOrThrow({ where: { clientId: client.id } });
    expect(persisted.source).toBe("CLIENT");
    expect(persisted.published).toBe(false);
  });
});