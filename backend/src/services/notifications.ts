import type { Booking } from "@prisma/client";
import { env } from "../config/env";
import { sendEmail } from "./mailer";
import { sendWhatsApp } from "./zavu";
import { magicLinkUrl } from "./magiclink";
import * as notificationLogModel from "../models/notificationLog.model";
import * as bookingModel from "../models/booking.model";

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusLabel(status: string, lang: string): string {
  const labels: Record<string, { en: string; rw: string }> = {
    PENDING: { en: "Pending", rw: "Itegereje" },
    CONFIRMED: { en: "Confirmed", rw: "Byemejwe" },
    IN_PRODUCTION: { en: "In production", rw: "Biri gukorwa" },
    DELIVERED: { en: "Delivered", rw: "Byatanzwe" },
    COMPLETED: { en: "Completed", rw: "Byarangiye" },
    CANCELLED: { en: "Cancelled", rw: "Byahagaritswe" },
  };
  return labels[status]?.[lang === "rw" ? "rw" : "en"] ?? status;
}

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

function trackPageHtml(booking: Booking, trackUrl: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111;background:#0a0a0a;color:#eee">
    <h2 style="color:#f5c518">Creative Sound Studio</h2>
    <p>${booking.language === "rw" ? "Murakaza neza" : "Hello"} <strong>${esc(booking.contactName)}</strong>,</p>
    <p>${booking.language === "rw" ? "Uru ni urubuga rwawe rwo gukurikirana akazi kawe. Kanda ku murongo uri hano kugira ngo urebe ibyegeranyo by'umurimo wawe:" : "This is your personal production tracking page. Click the link below to see the status of your booking:"}</p>
    <p style="text-align:center;margin:32px 0">
      <a href="${trackUrl}" style="background:#f5c518;color:#111;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold">${booking.language === "rw" ? "Reba Urugero rwawe" : "View My Production"}</a>
    </p>
    <p style="color:#999;font-size:13px">${booking.language === "rw" ? "Iyi link izakora" : "This link will work for"} ${env.magicLinkTtlHours} ${booking.language === "rw" ? "amasaha" : "hours"} · ${booking.language === "rw" ? "Umubare w'ubutumwa" : "Booking reference"}: <strong>${booking.reference}</strong></p>
  </div>`;
}

function statusHtml(booking: Booking): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#0a0a0a;color:#eee">
    <h2 style="color:#f5c518">Creative Sound Studio</h2>
    <p>${booking.language === "rw" ? "Murakaza neza" : "Hello"} <strong>${esc(booking.contactName)}</strong>,</p>
    <p>${booking.language === "rw" ? "Ibyegeranyo by'umurimo wawe byahindutse:" : "Your production status has been updated to:"}</p>
    <p style="font-size:20px;font-weight:bold;color:#f5c518">${statusLabel(booking.status, booking.language)}</p>
    <p>${booking.language === "rw" ? "Umubare w'ubutumwa" : "Booking reference"}: <strong>${booking.reference}</strong></p>
    ${booking.status === "CANCELLED" ? `<p>${booking.language === "rw" ? "Niba ufite ikibazo, twandikire." : "If you have any questions, please contact us."}</p>` : ""}
  </div>`;
}

export async function notifyClientBookingReceived(booking: Booking, token: string): Promise<void> {
  const trackUrl = magicLinkUrl(token);
  const subject = booking.language === "rw" ? "Urugero rwawe rwahawe — Creative Sound Studio" : "Your booking is received — Creative Sound Studio";
  const html = trackPageHtml(booking, trackUrl);
  const emailRes = await sendEmail({ to: booking.contactEmail, subject, html });
  await log({ bookingId: booking.id, channel: "EMAIL", kind: "BOOKING_RECEIVED", recipient: booking.contactEmail, ok: emailRes.sent, error: emailRes.error });

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
  for (const adminEmail of env.adminEmails) {
    const res = await sendEmail({
      to: adminEmail,
      subject: `New booking ${booking.reference} — ${esc(booking.contactName)}`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#0a0a0a;color:#eee">
        <h2 style="color:#f5c518">New booking received</h2>
        <p><strong>Reference:</strong> ${booking.reference}</p>
        <p><strong>Client:</strong> ${esc(booking.contactName)} (${esc(booking.contactEmail)}${booking.contactPhone ? `, ${esc(booking.contactPhone)}` : ""})</p>
        <p><strong>Service:</strong> ${esc(serviceName)}</p>
        <p><strong>Date:</strong> ${booking.eventDate?.toISOString() ?? "To be agreed"}</p>
        <p><strong>Location:</strong> ${esc(booking.location) ?? "To be agreed"}</p>
        <p><strong>Budget:</strong> ${esc(booking.budgetRange) ?? "Not specified"}</p>
        ${booking.details ? `<p><strong>Details:</strong> ${esc(booking.details)}</p>` : ""}
        <p><a href="${env.appUrl}/admin/bookings" style="background:#f5c518;color:#111;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Open admin panel</a></p>
      </div>`,
    });
    await log({ bookingId: booking.id, channel: "EMAIL", kind: "BOOKING_RECEIVED", recipient: adminEmail, ok: res.sent, error: res.error });
  }
}

export async function notifyClientStatusChanged(booking: Booking): Promise<void> {
  const subject = booking.language === "rw"
    ? `Ibyegeranyo by'umurimo wawe byahindutse (${booking.reference})`
    : `Your production status updated (${booking.reference})`;
  const emailRes = await sendEmail({ to: booking.contactEmail, subject, html: statusHtml(booking) });
  await log({ bookingId: booking.id, channel: "EMAIL", kind: booking.status === "CANCELLED" ? "BOOKING_CANCELLED" : "BOOKING_STATUS_CHANGED", recipient: booking.contactEmail, ok: emailRes.sent, error: emailRes.error });

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
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;background:#0a0a0a;color:#eee">
    <h2 style="color:#f5c518">Creative Sound Studio</h2>
    <p>Hello <strong>${esc(client.name)}</strong>,</p>
    <p>Click the link below to sign in and view your bookings. This link is single-use and expires in 15 minutes.</p>
    <p style="text-align:center;margin:32px 0">
      <a href="${loginUrl}" style="background:#f5c518;color:#111;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold">Sign in to my account</a>
    </p>
    <p style="color:#999;font-size:13px">If you didn't request this link, you can safely ignore this email.</p>
  </div>`;

  const emailRes = await sendEmail({ to: client.email, subject: "Your login link — Creative Sound Studio", html });
  if (!emailRes.sent) {
    // SMTP not configured (dev) — surface the link in server logs instead.
    console.log(`[mailer] Magic login link for ${client.email}: ${loginUrl}`);
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
