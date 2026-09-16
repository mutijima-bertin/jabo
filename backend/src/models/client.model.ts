import { prisma } from "../config/db";
import type { Client, Prisma } from "@prisma/client";

/** Data-access layer for Client (portal accounts auto-created from bookings). */

export function findByEmailInsensitive(email: string) {
  return prisma.client.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
}

/** Minimal client lookup (id/name/email) — e.g. ownership checks + emails. */
export function findById(id: string) {
  return prisma.client.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
}

export function upsertByEmail(params: {
  where: Prisma.ClientWhereUniqueInput;
  update: Prisma.ClientUpdateInput;
  create: Prisma.ClientCreateInput;
}) {
  return prisma.client.upsert({
    where: params.where,
    update: params.update,
    create: params.create,
  });
}

/** Portal "me" payload source: client + their bookings (newest first). */
export function findByIdWithBookings(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          reference: true,
          eventDate: true,
          location: true,
          budgetRange: true,
          status: true,
          createdAt: true,
          service: { select: { nameEn: true } },
        },
      },
    },
  });
}

/** Single-use magic login tokens: only the sha256 hash + expiry live on the row. */
export function setLoginToken(id: string, hash: string, expiresAt: Date) {
  return prisma.client.update({
    where: { id },
    data: { loginTokenHash: hash, loginTokenExpiresAt: expiresAt },
  });
}

/**
 * Atomic single-use consume of a magic login token: UPDATE ... WHERE hash AND
 * not expired RETURNING *. The row is cleared and returned in one statement, so
 * two racing exchanges can never both match — the loser gets 0 rows (→ null).
 */
export function consumeLoginToken(hash: string, now: Date) {
  return prisma.client.updateManyAndReturn({
    where: { loginTokenHash: hash, loginTokenExpiresAt: { gt: now } },
    data: { loginTokenHash: null, loginTokenExpiresAt: null },
  });
}

export function count(): Promise<number> {
  return prisma.client.count();
}

/** Admin list with each client's booking references. */
export function listForAdmin() {
  return prisma.client.findMany({
    include: { bookings: { select: { reference: true, status: true, createdAt: true } } },
  });
}

/**
 * Admin deletion: removes the client and every row they own atomically. The
 * Booking.client and Testimonial.client relations are optional (FK default is
 * ON DELETE SET NULL), so their rows must be deleted explicitly — never rely
 * on a DB cascade for them. BookingEvent/NotificationLog rows cascade off the
 * deleted bookings. Returns how many related rows were removed.
 *
 * An unknown id aborts the transaction (nothing committed) with a labeled
 * "CLIENT_NOT_FOUND" error the controller maps to 404. Deleting a client with
 * zero bookings/testimonials still commits and returns 0/0.
 */
export function removeWithRelated(id: string): Promise<{ deletedBookings: number; deletedTestimonials: number }> {
  return prisma.$transaction(async (tx) => {
    // Testimonials reference the client via an optional FK (SET NULL by default);
    // prune them before the client row so no orphans point at a deleted id.
    const deletedTestimonials = await tx.testimonial.deleteMany({ where: { clientId: id } });
    // Bookings too — their events/notifications cascade at the DB level.
    const deletedBookings = await tx.booking.deleteMany({ where: { clientId: id } });
    const deleted = await tx.client.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      throw new Error("CLIENT_NOT_FOUND");
    }
    return { deletedBookings: deletedBookings.count, deletedTestimonials: deletedTestimonials.count };
  });
}

export type ClientWithBookings = NonNullable<Awaited<ReturnType<typeof findByIdWithBookings>>>;
