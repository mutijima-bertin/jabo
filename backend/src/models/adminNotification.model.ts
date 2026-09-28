import { prisma } from "../config/db";
import { Prisma, type AdminNotification, type AdminNotificationType } from "@prisma/client";

/**
 * Data-access for in-app admin notifications (Tier 1 attention queue).
 * One row per event; payload is free-form JSON authored by the event writers
 * (booking id/reference, contact name, subject, message preview...). Single-admin
 * app — no user relation, the bell belongs to whoever holds the admin token.
 */

/** Insert one notification. linkHref is a relative deep-link, e.g. "?tab=bookings&open=<id>". */
export function create(
  type: AdminNotificationType,
  payload: Prisma.JsonObject,
  linkHref?: string | null
): Promise<AdminNotification> {
  return prisma.adminNotification.create({
    data: { type, payload, linkHref: linkHref ?? null },
  });
}

/** Newest-first list; unreadOnly = readAt is null. Callers pass a validated 1..50 limit. */
export function listRecent(options: { limit: number; unreadOnly: boolean }) {
  return prisma.adminNotification.findMany({
    where: options.unreadOnly ? { readAt: null } : undefined,
    orderBy: { createdAt: "desc" },
    take: options.limit,
  });
}

/** Total unread rows — always computed for the bell badge, regardless of filters. */
export function countUnread(): Promise<number> {
  return prisma.adminNotification.count({ where: { readAt: null } });
}

/**
 * Mark rows read. With `ids`: only those (already-read rows are a no-op).
 * Missing/empty `ids`: every unread row. readAt is set to now().
 */
export function markRead(ids?: string[]): Promise<{ count: number }> {
  if (ids && ids.length > 0) {
    return prisma.adminNotification.updateMany({
      where: { id: { in: ids }, readAt: null },
      data: { readAt: new Date() },
    });
  }
  return prisma.adminNotification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
}