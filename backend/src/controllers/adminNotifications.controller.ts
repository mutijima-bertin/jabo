import type { Request, Response } from "express";
import { z } from "zod";
import * as adminNotificationModel from "../models/adminNotification.model";

/**
 * In-app admin notification bell (Tier 1).
 *   GET  /api/admin/notifications?limit=20&unread=1 -> { items, unreadCount }
 *   POST /api/admin/notifications/read { ids? }     -> { ok: true }
 * Both routes sit behind requireAdmin (see routes/admin.ts).
 */

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unread: z.coerce.number().int().refine((v) => v === 0 || v === 1, "unread must be 0 or 1").optional(),
});

/** AdminNotifItem — payload is the raw JSONB from the column; dates are ISO strings. */
export async function listNotifications(req: Request, res: Response): Promise<void> {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  const { limit, unread } = parsed.data;
  const [rows, unreadCount] = await Promise.all([
    adminNotificationModel.listRecent({ limit, unreadOnly: unread === 1 }),
    adminNotificationModel.countUnread(),
  ]);
  res.json({
    items: rows.map((n) => ({
      id: n.id,
      type: n.type,
      payload: n.payload,
      linkHref: n.linkHref,
      readAt: n.readAt ? new Date(n.readAt).toISOString() : null,
      createdAt: new Date(n.createdAt).toISOString(),
    })),
    unreadCount,
  });
}

const markReadSchema = z.object({
  ids: z.array(z.string()).max(100).optional(),
});

/** Missing/empty ids => mark ALL unread rows read; with ids => only those (already-read = no-op). */
export async function markNotificationsRead(req: Request, res: Response): Promise<void> {
  const parsed = markReadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  await adminNotificationModel.markRead(parsed.data.ids);
  res.json({ ok: true });
}