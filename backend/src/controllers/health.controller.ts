import type { Request, Response } from "express";
import { prisma } from "../config/db";

export async function check(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", db: "down" });
  }
}
