import { prisma } from "../config/db";
import type { Booking, BookingStatus, Prisma } from "@prisma/client";
import * as bookingEventModel from "./bookingEvent.model";

/**
 * Data-access layer for Booking + related rows. Every query here mirrors the
 * exact shape (select/include/orderBy/where) previously inlined in routes.
 * Prisma schema remains the single source of truth.
 */

export type TransactionClient = Prisma.TransactionClient;

/** Dashboard counts — all statuses in one parallel batch (order preserved by caller). */
export function countAll(): Promise<number> {
  return prisma.booking.count();
}

export function countByStatus(status: BookingStatus): Promise<number> {
  return prisma.booking.count({ where: { status } });
}

/** 10 most recent bookings with service name (admin dashboard). */
export function findRecentWithService(take: number) {
  return prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { service: { select: { nameEn: true } } },
  });
}

/** Admin list; optional status filter. */
export function listForAdmin(status?: string) {
  return prisma.booking.findMany({
    where: status ? { status: status as BookingStatus } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      service: { select: { nameEn: true, nameRw: true } },
      notifications: { orderBy: { sentAt: "desc" }, take: 5 },
    },
  });
}

export function findByIdDetailed(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      service: true,
      events: { orderBy: { createdAt: "asc" } },
      notifications: { orderBy: { sentAt: "desc" } },
      client: true,
    },
  });
}

/** Tracking-page fetch. Throws P2025 via findUniqueOrThrow when missing (same as before). */
export function findByIdWithTrackingIncludes(id: string) {
  return prisma.booking.findUniqueOrThrow({
    where: { id },
    include: {
      service: { select: { nameEn: true, nameRw: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

export type BookingWithTrackingIncludes = Prisma.BookingGetPayload<{
  include: {
    service: { select: { nameEn: true, nameRw: true } };
    events: true;
  };
}>;

/** Resolve a magic-token hash to its booking id (not yet consumed — link stays reusable until expiry). */
export async function findIdByMagicTokenHash(
  hash: string
): Promise<string | null> {
  const booking = await prisma.booking.findFirst({
    where: {
      magicTokenHash: hash,
      magicTokenRevoked: false,
      magicTokenExpiresAt: { gt: new Date() },
    },
  });
  if (!booking) return null;
  return booking.id;
}

export function revokeMagicToken(id: string) {
  return prisma.booking.update({ where: { id }, data: { magicTokenRevoked: true } });
}

/** Latest booking id for a client (used to attach MAGIC_LINK notification logs). */
export async function findLatestIdByClientId(clientId: string): Promise<string | null> {
  const latest = await prisma.booking.findFirst({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return latest?.id ?? null;
}

/* ----- unit-of-work helpers (service layer decides WHEN; model owns HOW) ----- */

/**
 * Creates the booking plus its initial PENDING BookingEvent atomically.
 * Mirrors the exact transaction previously inlined in services/bookings.ts.
 */
export function createBookingWithEvent(
  bookingData: Prisma.BookingUncheckedCreateInput,
  eventData: { status: BookingStatus; note: string | null }
): Promise<Booking> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({ data: bookingData });
    await bookingEventModel.createInTx(tx, { bookingId: created.id, status: eventData.status, note: eventData.note });
    return created;
  });
}

/** Status flip + audit event atomically. */
export function applyStatusTransition(bookingId: string, status: BookingStatus, note?: string) {
  return prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status } });
    await bookingEventModel.createInTx(tx, { bookingId, status, note: note ?? null });
  });
}

/** Plain single-row fetches. */
export function findById(id: string) {
  return prisma.booking.findUnique({ where: { id } });
}

export function findByIdOrThrow(id: string) {
  return prisma.booking.findUniqueOrThrow({ where: { id } });
}
