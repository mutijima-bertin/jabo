import type { Server } from "http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NotificationChannel, NotificationKind, TestimonialSource } from "@prisma/client";
import { createApp } from "../../app";
import { prisma } from "../../config/db";
import { signAdminToken } from "../../services/auth";

// Admin client deletion: DELETE /api/admin/clients/:id. The Booking.client and
// Testimonial.client relations are optional FKs (ON DELETE SET NULL by default),
// so the endpoint must delete those rows explicitly inside one transaction;
// BookingEvent/NotificationLog rows cascade off the deleted bookings. Uses the
// same real-express-app + prisma-fixture pattern as adminCatalog.test.ts.

describe("DELETE /api/admin/clients/:id (transactional cascade)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let serviceId: string;

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
    // Bookings first (they reference service + client; events/notifications
    // cascade off them), then testimonials (optional client FK is SET NULL),
    // then clients, then services.
    await prisma.booking.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.client.deleteMany();
    await prisma.service.deleteMany();
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.testimonial.deleteMany();
    await prisma.client.deleteMany();
    await prisma.service.deleteMany();
    const service = await prisma.service.create({
      data: {
        nameEn: "Studio Session",
        nameRw: "Sesi yo muri studio",
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: "audio",
      },
    });
    serviceId = service.id;
  });

  // Unique email + reference per call so fixtures never collide between tests.
  async function makeClientWithRelations(name: string) {
    const email = `${name.replace(/\s+/g, "").toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const client = await prisma.client.create({
      data: { name, email, phone: "+250700000000" },
    });
    const booking = await prisma.booking.create({
      data: {
        reference: `CSS-${name.replace(/\s+/g, "").toUpperCase()}-${Math.random().toString(36).slice(2).toUpperCase()}`,
        serviceId,
        clientId: client.id,
        contactName: name,
        contactEmail: email,
        status: "CONFIRMED",
      },
    });
    await prisma.bookingEvent.create({
      data: { bookingId: booking.id, status: "CONFIRMED", note: "Test event" },
    });
    await prisma.notificationLog.create({
      data: {
        bookingId: booking.id,
        channel: NotificationChannel.EMAIL,
        kind: NotificationKind.BOOKING_CONFIRMED,
        recipient: email,
      },
    });
    await prisma.testimonial.create({
      data: {
        author: name,
        role: "Producer",
        contentEn: "Brilliant experience end to end.",
        source: TestimonialSource.CLIENT,
        published: false,
        clientId: client.id,
      },
    });
    return { client, booking };
  }

  const deleteCall = (id: string) =>
    fetch(`${baseUrl}/api/admin/clients/${id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });

  it("removes the client, their bookings (+ cascaded events/notifications) and testimonials; leaves unrelated rows untouched", async () => {
    const target = await makeClientWithRelations("Target Client");
    const unrelated = await makeClientWithRelations("Unrelated Client");

    const res = await deleteCall(target.client.id);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, deletedBookings: 1, deletedTestimonials: 1 });

    // Client + every owned row gone…
    expect(await prisma.client.findUnique({ where: { id: target.client.id } })).toBeNull();
    expect(await prisma.booking.findUnique({ where: { id: target.booking.id } })).toBeNull();
    // …including the rows that cascade off the deleted booking.
    expect(await prisma.bookingEvent.count({ where: { bookingId: target.booking.id } })).toBe(0);
    expect(await prisma.notificationLog.count({ where: { bookingId: target.booking.id } })).toBe(0);
    expect(await prisma.testimonial.count({ where: { clientId: target.client.id } })).toBe(0);

    // Unrelated client + their full subtree untouched.
    expect(await prisma.client.findUnique({ where: { id: unrelated.client.id } })).not.toBeNull();
    expect(await prisma.booking.findUnique({ where: { id: unrelated.booking.id } })).not.toBeNull();
    expect(await prisma.bookingEvent.count({ where: { bookingId: unrelated.booking.id } })).toBe(1);
    expect(await prisma.notificationLog.count({ where: { bookingId: unrelated.booking.id } })).toBe(1);
    expect(await prisma.testimonial.count({ where: { clientId: unrelated.client.id } })).toBe(1);
  });

  it("returns 404 CLIENT_NOT_FOUND for an unknown id", async () => {
    const res = await deleteCall(`c${"a".repeat(24)}`);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "CLIENT_NOT_FOUND" });
  });

  it("deletes a client with zero bookings and testimonials (counts 0/0)", async () => {
    const client = await prisma.client.create({
      data: {
        name: "Bare Client",
        email: `bare-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        phone: "+250700000000",
      },
    });

    const res = await deleteCall(client.id);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, deletedBookings: 0, deletedTestimonials: 0 });
    expect(await prisma.client.findUnique({ where: { id: client.id } })).toBeNull();
  });

  it("returns 401 without an admin token", async () => {
    const res = await fetch(`${baseUrl}/api/admin/clients/${`c${"b".repeat(24)}`}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});