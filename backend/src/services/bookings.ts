import crypto from "crypto";
import { BookingStatus } from "@prisma/client";
import { env } from "../config/env";
import { generateMagicToken } from "./magiclink";
import { notifyAdminBookingReceived, notifyClientBookingReceived, notifyClientStatusChanged } from "./notifications";
import * as bookingModel from "../models/booking.model";
import * as clientModel from "../models/client.model";
import * as serviceModel from "../models/service.model";

export interface CreateBookingInput {
  serviceId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  eventDate?: string;
  location?: string;
  budgetRange?: string;
  details?: string;
  language?: "en" | "rw";
}

function makeReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 6; i++) {
    ref += chars[crypto.randomInt(chars.length)];
  }
  return `CSS-${ref}`;
}

const FORWARD_STATUSES: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function createBooking(input: CreateBookingInput): Promise<{ booking: Awaited<ReturnType<typeof bookingModel.findByIdOrThrow>>; token: string }> {
  const service = await serviceModel.findById(input.serviceId);
  if (!service) {
    throw new Error("SERVICE_NOT_FOUND");
  }

  const { token, hash } = generateMagicToken();
  const reference = makeReference();
  const expiresAt = new Date(Date.now() + env.magicLinkTtlHours * 3600 * 1000);

  const client = await clientModel.upsertByEmail({
    where: { email: input.contactEmail.toLowerCase().trim() },
    update: { name: input.contactName, phone: input.contactPhone ?? null },
    create: {
      name: input.contactName,
      email: input.contactEmail.toLowerCase().trim(),
      phone: input.contactPhone ?? null,
    },
  });

  // Booking creation in a transaction; notifications fire AFTER the transaction (external calls must never be inside).
  const bookingData = {
    reference,
    serviceId: service.id,
    clientId: client.id,
    contactName: input.contactName,
    contactEmail: input.contactEmail.toLowerCase().trim(),
    contactPhone: input.contactPhone ?? null,
    eventDate: input.eventDate ? new Date(input.eventDate) : null,
    location: input.location ?? null,
    budgetRange: input.budgetRange ?? null,
    details: input.details ?? null,
    language: input.language === "rw" ? "rw" : "en",
    status: "PENDING" as const,
    magicTokenHash: hash,
    magicTokenExpiresAt: expiresAt,
  };
  const booking = await bookingModel.createBookingWithEvent(bookingData, {
    status: "PENDING",
    note: "Booking received",
  });

  // External calls: outside the transaction, with failure isolation (logged via NotificationLog).
  try {
    await notifyClientBookingReceived(booking, token);
  } catch (err) {
    console.error("[notify:client:received]", (err as Error).message);
  }
  try {
    await notifyAdminBookingReceived(booking, service.nameEn);
  } catch (err) {
    console.error("[notify:admin:received]", (err as Error).message);
  }

  return { booking, token };
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus, note?: string): Promise<void> {
  const booking = await bookingModel.findById(bookingId);
  if (!booking) throw new Error("BOOKING_NOT_FOUND");
  if (booking.status === status) throw new Error("STATUS_UNCHANGED");
  if (!FORWARD_STATUSES[booking.status].includes(status)) {
    throw new Error(`INVALID_TRANSITION:${booking.status}->${status}`);
  }

  await bookingModel.applyStatusTransition(bookingId, status, note);

  const updated = await bookingModel.findByIdOrThrow(bookingId);
  try {
    await notifyClientStatusChanged(updated);
  } catch (err) {
    console.error("[notify:status]", (err as Error).message);
  }
}

export async function revokeMagicToken(bookingId: string): Promise<void> {
  await bookingModel.revokeMagicToken(bookingId);
}

export function toPublicBooking(booking: Awaited<ReturnType<typeof bookingModel.findByIdOrThrow>>) {
  const { magicTokenHash: _h, magicTokenExpiresAt, magicTokenRevoked, ...rest } = booking;
  return { ...rest, magicTokenExpiresAt, magicTokenRevoked };
}
