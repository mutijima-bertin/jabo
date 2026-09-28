import type { Request, Response } from "express";
import { prisma } from "../config/db";
import * as notificationLogModel from "../models/notificationLog.model";

/**
 * Admin-only health probe (distinct from the public GET /api/health): the
 * dashboard's status strip needs process uptime and the 24h notification-failure
 * count, which the public endpoint deliberately does not expose.
 *
 *   200 { status: "ok", uptimeSeconds, db: "ok", failedSends24h }
 *   503 { error: "DB_DOWN" }  — a dead database is still JSON, never a crash.
 *   503 (not 500) matches the public GET /api/health and keeps load balancers
 *   from routing to this instance while its database pool is unreachable.
 */

const FAILED_SENDS_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function check(_req: Request, res: Response): Promise<void> {
  try {
    // SELECT 1 is the cheapest possible round-trip: it proves the pool can
    // reach Postgres without touching application tables.
    await prisma.$queryRaw`SELECT 1`;
    const failedSends24h = await notificationLogModel.countFailedSince(FAILED_SENDS_WINDOW_MS);
    res.json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      db: "ok",
      failedSends24h,
    });
  } catch {
    res.status(503).json({ error: "DB_DOWN" });
  }
}
