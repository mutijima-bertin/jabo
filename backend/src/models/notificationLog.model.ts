import { prisma } from "../config/db";

/** Data-access for the NotificationLog audit trail (one row per delivery attempt). */
export function create(entry: {
  bookingId: string;
  channel: "EMAIL" | "WHATSAPP";
  kind: "BOOKING_RECEIVED" | "BOOKING_CONFIRMED" | "BOOKING_STATUS_CHANGED" | "BOOKING_CANCELLED" | "MAGIC_LINK";
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
