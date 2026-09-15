import type { Booking } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { env } from "../config/env";
import { sendEmail } from "./mailer";
import { sendWhatsApp } from "./zavu";
import { magicLinkUrl } from "./magiclink";
import {
  adminPanelUrl,
  bookingReceived,
  esc,
  loginLink,
  newBookingAdmin,
  statusChanged,
  statusLabel,
  testimonialPublished,
  testimonialSubmittedAdmin,
} from "./emailTemplates";
import * as notificationLogModel from "../models/notificationLog.model";
import * as bookingModel from "../models/booking.model";

async function log(entry: {
  bookingId: string;
  channel: "EMAIL" | "WHATSAPP";
  kind: "BOOKING_RECEIVED" | "BOOKING_CONFIRMED" | "BOOKING_STATUS_CHANGED" | "BOOKING_CANCELLED" | "MAGIC_LINK";
  recipient: string;
  ok: boolean;
  error?: string;
}) {
  await notificationLogModel.create({
    bookingId: entry.bookingId,
    channel: entry.channel,
    kind: entry.kind,
    recipient: entry.recipient,
    status: entry.ok ? "sent" : entry.error === "SMTP not configured" || entry.error?.includes("Zavu API key not configured") ? "skipped" : "failed",
    error: entry.error,
  });
}

/**
 * Dev preview: when SMTP is not configured, also write the full rendered HTML
 * to backend/.mailbox/<kind>-<ts>.html so the templates can be opened in a
 * browser without sending. Never writes in production.
 */
async function dumpHtml(kind: string, html: string): Promise<void> {
  if (env.nodeEnv === "production") return;
  try {
    const dir = path.join(process.cwd(), ".mailbox");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${kind}-${Date.now()}.html`), html, "utf8");
  } catch (err) {
    console.error("[mailer:dump]", (err as Error).message);
  }
}

export async function notifyClientBookingReceived(booking: Booking, token: string): Promise<void> {
  const trackUrl = magicLinkUrl(token);
  const dashboardUrl = `${env.appUrl}/login`;
  const { subject, html } = bookingReceived({
    booking,
    contactName: booking.contactName,
    trackUrl,
    dashboardUrl,
    ttlHours: env.magicLinkTtlHours,
  });
  const emailRes = await sendEmail({ to: booking.contactEmail, subject, html });
  await log({ bookingId: booking.id, channel: "EMAIL", kind: "BOOKING_RECEIVED", recipient: booking.contactEmail, ok: emailRes.sent, error: emailRes.error });
  if (!emailRes.sent) {
    console.log(`[mailer] Booking ${booking.reference} (${booking.contactEmail}): track ${trackUrl}`);
    await dumpHtml("booking-received", html);
  }

  if (booking.contactPhone) {
    const waText = booking.language === "rw"
      ? `Murakaza neza ${booking.contactName}! Urugero rwawe rwahawe (${booking.reference}). Kanda hano urebe ibyegeranyo: ${trackUrl}`
      : `Hi ${booking.contactName}! Your booking (${booking.reference}) has been received. Track it here: ${trackUrl}`;
    const waRes = await sendWhatsApp({ to: booking.contactPhone, text: waText });
    await log({ bookingId: booking.id, channel: "WHATSAPP", kind: "BOOKING_RECEIVED", recipient: booking.contactPhone, ok: waRes.sent, error: waRes.error });
  } else {
    await log({ bookingId: booking.id, channel: "WHATSAPP", kind: "BOOKING_RECEIVED", recipient: "(no phone)", ok: true });
  }
}

export async function notifyAdminBookingReceived(booking: Booking, serviceName: string): Promise<void> {
  if (env.adminEmails.length === 0) {
    console.log(`[mailer] Admin notification skipped (ADMIN_EMAILS empty): new booking ${booking.reference}`);
    return;
  }
  const { subject, html } = newBookingAdmin({
    booking: {
      reference: booking.reference,
      contactName: booking.contactName,
      contactEmail: booking.contactEmail,
      contactPhone: booking.contactPhone,
      eventDate: booking.eventDate,
      location: booking.location,
      budgetRange: booking.budgetRange,
      details: booking.details,
    },
    serviceName,
    adminPanelUrl: adminPanelUrl(env.appUrl),
  });
  for (const adminEmail of env.adminEmails) {
    const res = await sendEmail({ to: adminEmail, subject, html });
    await log({ bookingId: booking.id, channel: "EMAIL", kind: "BOOKING_RECEIVED", recipient: adminEmail, ok: res.sent, error: res.error });
    if (!res.sent) {
      console.log(`[mailer] New booking ${booking.reference} -> admin ${adminEmail}`);
      await dumpHtml("admin-booking", html);
    }
  }
}

export async function notifyClientStatusChanged(booking: Booking): Promise<void> {
  const dashboardUrl = `${env.appUrl}/login`;
  const { subject, html } = statusChanged({
    reference: booking.reference,
    status: booking.status,
    language: booking.language,
    contactName: booking.contactName,
    dashboardUrl,
  });
  const emailRes = await sendEmail({ to: booking.contactEmail, subject, html });
  await log({ bookingId: booking.id, channel: "EMAIL", kind: booking.status === "CANCELLED" ? "BOOKING_CANCELLED" : "BOOKING_STATUS_CHANGED", recipient: booking.contactEmail, ok: emailRes.sent, error: emailRes.error });
  if (!emailRes.sent) {
    console.log(`[mailer] Status ${booking.status} (${booking.reference}) -> ${booking.contactEmail}`);
    await dumpHtml("booking-status-changed", html);
  }

  if (booking.contactPhone) {
    const waText = booking.language === "rw"
      ? `Creative Sound Studio: ${statusLabel(booking.status, "rw")} — ${booking.reference}.`
      : `Creative Sound Studio: your booking ${booking.reference} is now ${statusLabel(booking.status, "en")}.`;
    const waRes = await sendWhatsApp({ to: booking.contactPhone, text: waText });
    await log({ bookingId: booking.id, channel: "WHATSAPP", kind: booking.status === "CANCELLED" ? "BOOKING_CANCELLED" : "BOOKING_STATUS_CHANGED", recipient: booking.contactPhone, ok: waRes.sent, error: waRes.error });
  }
}

/** Email a client their magic login link. Never throws; the email send is the requirement, the log row is best-effort. */
export async function notifyClientLogin(client: { id: string; name: string; email: string | null }, loginUrl: string): Promise<void> {
  if (!client.email) return;
  const { subject, html } = loginLink({ client, loginUrl });
  const emailRes = await sendEmail({ to: client.email, subject, html });
  if (!emailRes.sent) {
    // SMTP not configured (dev) — surface the link in server logs + preview file.
    console.log(`[mailer] Magic login link for ${client.email}: ${loginUrl}`);
    await dumpHtml("client-login", html);
  } else if (env.nodeEnv !== "production") {
    // Non-prod with SMTP: still log the link so the e2e suite can read it
    // (never logs the token in production).
    console.log(`[mailer] Magic login link sent for ${client.email}`);
  }

  // NotificationLog requires a bookingId; use the client's most recent booking, else skip the log row.
  try {
    const latestId = await bookingModel.findLatestIdByClientId(client.id);
    if (latestId) {
      await log({ bookingId: latestId, channel: "EMAIL", kind: "MAGIC_LINK", recipient: client.email, ok: emailRes.sent, error: emailRes.error });
    }
  } catch (err) {
    console.error("[notify:login:log]", (err as Error).message);
  }
}

/** Admin alert when a client submits a testimonial for review. Recipients come from ADMIN_EMAILS. */
export async function notifyAdminTestimonialSubmitted(params: {
  author: string;
  email: string;
  role: string | null;
  contentEn: string;
  contentRw: string | null;
}): Promise<void> {
  if (env.adminEmails.length === 0) {
    console.log(`[mailer] Admin notification skipped (ADMIN_EMAILS empty): testimonial from ${params.author}`);
    return;
  }
  const { subject, html } = testimonialSubmittedAdmin({
    author: params.author,
    email: params.email,
    role: params.role,
    contentEn: params.contentEn,
    contentRw: params.contentRw,
    adminPanelUrl: adminPanelUrl(env.appUrl),
  });
  for (const adminEmail of env.adminEmails) {
    const res = await sendEmail({ to: adminEmail, subject, html });
    if (!res.sent) {
      console.log(`[mailer] New testimonial ${params.author} -> admin ${adminEmail}`);
      await dumpHtml("admin-testimonial", html);
    }
  }
}

/** Thank-you email when the client's testimonial goes live. */
export async function notifyClientTestimonialPublished(params: { client: { name: string; email: string | null } }): Promise<void> {
  if (!params.client.email) return;
  const dashboardUrl = `${env.appUrl}/login`;
  const { subject, html } = testimonialPublished({ client: { name: params.client.name }, dashboardUrl });
  const emailRes = await sendEmail({ to: params.client.email, subject, html });
  if (!emailRes.sent) {
    console.log(`[mailer] Testimonial published -> ${params.client.email}`);
    await dumpHtml("client-testimonial-published", html);
  }
}