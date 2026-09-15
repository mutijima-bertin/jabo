import type { Request, Response } from "express";
import { z } from "zod";
import { createBooking, toPublicBooking } from "../services/bookings";
import { consumeMagicToken } from "../services/magiclink";
import * as bookingModel from "../models/booking.model";

const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  contactName: z.string().min(2, "Name is required").max(120),
  contactEmail: z.string().email("A valid email is required"),
  contactPhone: z
    .string()
    .optional()
    .transform((v) => (v ?? "").replace(/\s+/g, ""))
    .pipe(
      z
        .string()
        .refine((v) => v === "" || /^\+[1-9]\d{7,14}$/.test(v), {
          message: "Phone must be a valid international number, e.g. +2507XXXXXXXX",
        }),
    )
    // Empty/whitespace-only → undefined so the service's `input.contactPhone ?? null` stores null.
    .transform((v) => (v === "" ? undefined : v)),
  eventDate: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === "" || !Number.isNaN(Date.parse(v)), { message: "eventDate must be a valid date" }),
  location: z.string().max(200).optional(),
  budgetRange: z.string().max(120).optional(),
  details: z.string().max(3000).optional(),
  language: z.enum(["en", "rw"]).default("en"),
});

export async function create(req: Request, res: Response): Promise<void> {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) });
    return;
  }
  try {
    const { booking, token } = await createBooking(parsed.data);
    res.status(201).json({
      booking: toPublicBooking(booking),
      trackUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/track/${token}`,
    });
  } catch (err) {
    if ((err as Error).message === "SERVICE_NOT_FOUND") {
      res.status(400).json({ error: "SERVICE_NOT_FOUND" });
      return;
    }
    console.error("[bookings:create]", err);
    res.status(500).json({ error: "INTERNAL" });
  }
}

export async function trackByToken(req: Request, res: Response): Promise<void> {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const bookingId = await consumeMagicToken(token);
  if (!bookingId) {
    res.status(404).json({ error: "INVALID_OR_EXPIRED_LINK" });
    return;
  }
  const booking = await bookingModel.findByIdWithTrackingIncludes(bookingId);
  res.json(toPublicBooking(booking));
}
