import type { Request, Response } from "express";
import { z } from "zod";
import * as bookingModel from "../models/booking.model";
import * as testimonialModel from "../models/testimonial.model";
import * as blogPostModel from "../models/blogPost.model";
import * as portfolioItemModel from "../models/portfolioItem.model";
import * as serviceModel from "../models/service.model";
import { pathParam } from "./params";
import * as clientModel from "../models/client.model";
import { revokeMagicToken, updateBookingStatus } from "../services/bookings";

// ---------- Dashboard ----------
export async function dashboard(_req: Request, res: Response): Promise<void> {
  const [
    total,
    pending,
    confirmed,
    inProduction,
    delivered,
    completed,
    cancelled,
    recent,
    clients,
    bookingsByDay,
    topServices,
    testimonialCount,
    postCount,
    portfolioCount,
    serviceCount,
  ] = await Promise.all([
    bookingModel.countAll(),
    bookingModel.countByStatus("PENDING"),
    bookingModel.countByStatus("CONFIRMED"),
    bookingModel.countByStatus("IN_PRODUCTION"),
    bookingModel.countByStatus("DELIVERED"),
    bookingModel.countByStatus("COMPLETED"),
    bookingModel.countByStatus("CANCELLED"),
    bookingModel.findRecentWithService(10),
    clientModel.count(),
    bookingModel.countByDaySince(14),
    bookingModel.topServices(5),
    testimonialModel.countAll(),
    blogPostModel.countAll(),
    portfolioItemModel.countAll(),
    serviceModel.countAll(),
  ]);

  res.json({
    stats: { total, pending, confirmed, inProduction, delivered, completed, cancelled, clients },
    bookingsByDay,
    topServices,
    counts: { testimonials: testimonialCount, posts: postCount, portfolio: portfolioCount, services: serviceCount },
    recent,
  });
}

// ---------- Bookings ----------
// Canonical status values — mirrors BookingStatus in prisma/schema.prisma.
// Query params must be validated against this list; a raw cast to the DB
// driver used to 500 on anything else.
const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "IN_PRODUCTION", "DELIVERED", "COMPLETED", "CANCELLED"] as const;
const bookingStatusEnum = z.enum(BOOKING_STATUSES);

export async function listBookings(req: Request, res: Response): Promise<void> {
  const rawStatus = req.query.status;
  if (rawStatus !== undefined) {
    const parsed = bookingStatusEnum.safeParse(rawStatus);
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
      return;
    }
    res.json(await bookingModel.listForAdmin(parsed.data));
    return;
  }
  res.json(await bookingModel.listForAdmin());
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
  status: bookingStatusEnum,
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
