import { prisma } from "../config/db";

/** Data-access for the NotificationLog audit trail (one row per delivery attempt). */
export function create(entry: {
  bookingId: string;
  channel: "EMAIL" | "WHATSAPP";
  kind: "BOOKING_RECEIVED" | "BOOKING_CONFIRMED" | "BOOKING_STATUS_CHANGED" | "BOOKING_CANCELLED" | "MAGIC_LINK" | "REVIEW_REQUEST";
  recipient: string;
  status: string;
  error?: string | null;
}) {
  return prisma.notificationLog.create({
    data: {
      bookingId: entry.bookingId,
      channel: entry.channel,
      kind: entry.kind,
      recipient: entry.recipient,
      status: entry.status,
      error: entry.error,
    },
  });
}

/**
 * Failed delivery attempts in the trailing `sinceMs` window — the admin health
 * endpoint's single source of truth. The row's `sentAt` column is the attempt
 * timestamp (defaults to now() on insert), so it is the "created" clock here.
 */
export function countFailedSince(sinceMs: number): Promise<number> {
  return prisma.notificationLog.count({
    where: { status: "failed", sentAt: { gte: new Date(Date.now() - sinceMs) } },
  });
}
