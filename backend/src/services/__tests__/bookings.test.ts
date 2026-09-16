import { beforeEach, afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../config/db";
import { updateBookingStatus } from "../bookings";
import { createBooking } from "../bookings";

// Service-level coverage for updateBookingStatus. Notifications fire
// fire-and-forget (never awaited in the request path), so the DELIVERED hook
// that fires notifyClientReviewRequest is covered by inspection here + the
// .mailbox smoke test — asserting "doesn't throw" keeps this suite honest
// without racing background sends.

describe("updateBookingStatus", () => {
  afterAll(async () => {
    // Bookings must go first (they reference service + client); booking events
    // and notification logs cascade off the booking rows.
    await prisma.booking.deleteMany();
    await prisma.service.deleteMany();
    await prisma.client.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.service.deleteMany();
    await prisma.client.deleteMany();
  });

  const makeService = async () =>
    prisma.service.create({
      data: {
        nameEn: "Studio Session",
        nameRw: "Sesi yo muri studio",
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: "audio",
      },
    });

  const makeBookingToDeliver = async () => {
    const service = await makeService();
    const { booking } = await createBooking({
      serviceId: service.id,
      contactName: "Aline Uwase",
      contactEmail: `aline-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      contactPhone: "+250788123456",
    });
    // Walk the forward chain so DELIVERED is a valid final transition:
    // PENDING -> CONFIRMED -> IN_PRODUCTION.
    await updateBookingStatus(booking.id, "CONFIRMED");
    await updateBookingStatus(booking.id, "IN_PRODUCTION");
    return prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
  };

  it("does not throw on a DELIVERED transition from IN_PRODUCTION and persists the new status", async () => {
    const booking = await makeBookingToDeliver();
    expect(booking.status).toBe("IN_PRODUCTION");

    await expect(updateBookingStatus(booking.id, "DELIVERED")).resolves.toBeUndefined();

    const persisted = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(persisted.status).toBe("DELIVERED");

    const events = await prisma.bookingEvent.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((e) => e.status)).toEqual(["PENDING", "CONFIRMED", "IN_PRODUCTION", "DELIVERED"]);
  });

  it("still rejects a backwards transition after DELIVERED (guard untouched)", async () => {
    const booking = await makeBookingToDeliver();
    await updateBookingStatus(booking.id, "DELIVERED");
    await expect(updateBookingStatus(booking.id, "IN_PRODUCTION")).rejects.toThrow("INVALID_TRANSITION");
  });
});