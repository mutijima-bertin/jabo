import { prisma } from "../config/db";
import { Prisma, type Booking, type BookingStatus } from "@prisma/client";
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

/**
 * 14-day UTC booking series, zero-filled. One entry per day from
 * `daysBack - 1` days ago through today, oldest → newest.
 * Dates are ISO YYYY-MM-DD (UTC). The series is computed entirely in UTC
 * (deterministic, no timezone drift).
 */
export async function countByDaySince(
  daysBack: number
): Promise<{ date: string; count: number }[]> {
  // Floor "now" to UTC midnight.
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // Start of the window: (daysBack − 1) days before today (so we include today).
  const startUtc = new Date(todayUtc);
  startUtc.setUTCDate(startUtc.getUTCDate() - (daysBack - 1));

  // Query only the rows inside the window — GROUP BY day.
  const rows = await prisma.$queryRaw<{ day: Date | string; count: unknown }[]>(
    Prisma.sql`SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::int AS count FROM "Booking" WHERE "createdAt" >= ${startUtc} GROUP BY 1`
  );

  // Index raw counts by YYYY-MM-DD.
  const countMap = new Map<string, number>();
  for (const row of rows) {
    const key = new Date(row.day).toISOString().slice(0, 10);
    countMap.set(key, Number(row.count));
  }

  // Build the zero-filled series (oldest → newest).
  const series: { date: string; count: number }[] = [];
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(startUtc);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: countMap.get(key) ?? 0 });
  }

  return series;
}

/**
 * Top services by booking count (descending), tied on count sorted by
 * nameEn ascending. Returns at most `limit` entries.
 * Service rows that were deleted after the booking was created are silently
 * dropped (defensive).
 */
export async function topServices(
  limit = 5
): Promise<{ id: string; nameEn: string; count: number }[]> {
  // Raw query avoids Prisma 7 groupBy _count union-type issues and gives
  // a clean { serviceId, count } shape directly.
  const rows = await prisma.$queryRaw<{ serviceid: string; count: bigint }[]>(
    Prisma.sql`SELECT "serviceId" AS serviceid, COUNT(*)::bigint AS count FROM "Booking" GROUP BY "serviceId"`
  );

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.serviceid);
  const services = await prisma.service.findMany({
    where: { id: { in: ids } },
    select: { id: true, nameEn: true },
  });
  const nameMap = new Map(services.map((s) => [s.id, s.nameEn]));

  return rows
    .filter((r) => nameMap.has(r.serviceid))
    .map((r) => ({
      id: r.serviceid,
      nameEn: nameMap.get(r.serviceid)!,
      count: Number(r.count),
    }))
    .sort((a, b) => b.count - a.count || a.nameEn.localeCompare(b.nameEn))
    .slice(0, limit);
}

/** 10 most recent bookings with service name (admin dashboard). */
export function findRecentWithService(take: number) {
  return prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { service: { select: { nameEn: true } } },
  });
}

/** Admin list; optional status filter (callers must pass a validated BookingStatus). */
export function listForAdmin(status?: BookingStatus) {
  return prisma.booking.findMany({
    where: status ? { status } : undefined,
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

/**
 * Mint a fresh magic token for a booking (dashboard "view details" flow).
 * Replaces the previous hash so only one token is live per booking at a time.
 */
export function rotateMagicToken(id: string, hash: string, expiresAt: Date) {
  return prisma.booking.update({
    where: { id },
    data: { magicTokenHash: hash, magicTokenExpiresAt: expiresAt, magicTokenRevoked: false },
  });
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
