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
// Range options for the dashboard chart. The query param arrives as a string, so
// it is coerced to a number and then narrowed to the allowed set (zod v4's
// z.enum only covers strings, hence z.literal over the numeric tuple). An
// unvalidated cast used to let anything through.
const DASHBOARD_DAY_OPTIONS = [7, 14, 30, 90] as const;
const dashboardQuerySchema = z.object({
  days: z.coerce.number().pipe(z.literal(DASHBOARD_DAY_OPTIONS)).default(14),
});

/** Upcoming productions window + cap (soonest 20 events inside 14 days). */
const UPCOMING_WINDOW_DAYS = 14;
const UPCOMING_LIMIT = 20;

export async function dashboard(req: Request, res: Response): Promise<void> {
  const parsed = dashboardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  const days = parsed.data.days;
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
    upcoming,
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
    bookingModel.countByDaySince(days),
    bookingModel.topServices(5),
    testimonialModel.countAll(),
    blogPostModel.countAll(),
    portfolioItemModel.countAll(),
    serviceModel.countAll(),
    bookingModel.findUpcoming(UPCOMING_WINDOW_DAYS, UPCOMING_LIMIT),
  ]);

  res.json({
    stats: { total, pending, confirmed, inProduction, delivered, completed, cancelled, clients },
    bookingsByDay,
    topServices,
    counts: { testimonials: testimonialCount, posts: postCount, portfolio: portfolioCount, services: serviceCount },
    recent,
    // Always present (empty array when nothing is scheduled) — the dashboard
    // renders the "upcoming productions" list without a null check.
    upcoming: upcoming.map((b) => ({
      id: b.id,
      reference: b.reference,
      status: b.status,
      eventDate: b.eventDate ? b.eventDate.toISOString() : null,
      contactName: b.contactName,
      serviceName: b.service.nameEn,
      location: b.location,
      budgetRange: b.budgetRange,
    })),
  });
}

// ---------- Bookings ----------
// Canonical status values — mirrors BookingStatus in prisma/schema.prisma.
// Query params must be validated against this list; a raw cast to the DB
// driver used to 500 on anything else.
const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "IN_PRODUCTION", "DELIVERED", "COMPLETED", "CANCELLED"] as const;
const bookingStatusEnum = z.enum(BOOKING_STATUSES);

/** Free-text term for the bookings-list filter; same rule as the ⌘K palette. */
const bookingQuerySchema = z.object({
  status: bookingStatusEnum.optional(),
  q: z
    .string()
    .trim()
    .min(2, "q must be at least 2 characters")
    .max(60, "q must be at most 60 characters")
    .optional(),
});

export async function listBookings(req: Request, res: Response): Promise<void> {
  const parsed = bookingQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  const { status, q } = parsed.data;
  res.json(await bookingModel.listForAdmin(status, q));
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
