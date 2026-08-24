import type { Request, Response } from "express";
import { z } from "zod";
import * as bookingModel from "../models/booking.model";
import { pathParam } from "./params";
import * as clientModel from "../models/client.model";
import { revokeMagicToken, updateBookingStatus } from "../services/bookings";

// ---------- Dashboard ----------
export async function dashboard(_req: Request, res: Response): Promise<void> {
  const [total, pending, confirmed, inProduction, delivered, completed, cancelled, recent, clients] = await Promise.all([
    bookingModel.countAll(),
    bookingModel.countByStatus("PENDING"),
    bookingModel.countByStatus("CONFIRMED"),
    bookingModel.countByStatus("IN_PRODUCTION"),
    bookingModel.countByStatus("DELIVERED"),
    bookingModel.countByStatus("COMPLETED"),
    bookingModel.countByStatus("CANCELLED"),
    bookingModel.findRecentWithService(10),
    clientModel.count(),
  ]);
  res.json({ stats: { total, pending, confirmed, inProduction, delivered, completed, cancelled, clients }, recent });
}

// ---------- Bookings ----------
export async function listBookings(req: Request, res: Response): Promise<void> {
  const status = req.query.status as string | undefined;
  const bookings = await bookingModel.listForAdmin(status);
  res.json(bookings);
}

export async function getBooking(req: Request, res: Response): Promise<void> {
  const booking = await bookingModel.findByIdDetailed(pathParam(req, "id"));
  if (!booking) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  res.json(booking);
}

const statusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "IN_PRODUCTION", "DELIVERED", "COMPLETED", "CANCELLED"]),
  note: z.string().max(500).optional(),
});

export async function patchBookingStatus(req: Request, res: Response): Promise<void> {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  try {
    await updateBookingStatus(pathParam(req, "id"), parsed.data.status, parsed.data.note);
    res.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "BOOKING_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    if (msg.startsWith("INVALID_TRANSITION")) {
      res.status(400).json({ error: msg });
      return;
    }
    if (msg === "STATUS_UNCHANGED") {
      res.status(409).json({ error: msg });
      return;
    }
    res.status(500).json({ error: "INTERNAL" });
  }
}

export async function revokeToken(req: Request, res: Response): Promise<void> {
  try {
    await revokeMagicToken(pathParam(req, "id"));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "NOT_FOUND" });
  }
}
