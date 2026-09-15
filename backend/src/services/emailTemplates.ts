/**
 * Email templates — light cream + brass, matching the site's brand palette.
 *
 * Every builder returns an object with a { subject, html } pair. All
 * user-supplied values pass through esc() before being interpolated; href
 * values are escaped too. The layout is a 600px Outlook-safe table with
 * inline styles only (no <style> blocks, no class references).
 */

export type Lang = "en" | "rw";

/** Site palette (frontend/src/app/globals.css). */
const COLOR = {
  page: "#f7f2e9", // --cream-alt
  card: "#ffffff",
  cream: "#faf6ef", // --cream
  ink: "#1f1d1a", // --ink
  muted: "#6b655a",
  faint: "#948d7d",
  line: "#e6dfd0",
  brass: "#b08d57", // --brass
  brassDark: "#8f6f3e", // --brass-dark
  brassDeep: "#7a5c30", // --brass-deep
};

function t(lang: Lang | undefined, en: string, rw: string): string {
  return lang === "rw" ? rw : en;
}

/** Escape user-supplied text for HTML email content. */
export function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Booking status labels in EN/RW (shared with notifications). */
export function statusLabel(status: string, lang: Lang | undefined): string {
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

/** Short human date, e.g. "Mon, 15 Sep 2026" / rw-RW for Kinyarwanda. */
function formatDate(date: Date | null | undefined, lang: Lang | undefined): string {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString(lang === "rw" ? "rw-RW" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return new Date(date).toISOString();
  }
}

function ctaHtml(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:10px 0 4px">
      <tr><td align="center" style="padding:8px 0 24px">
        <a href="${esc(href)}" style="display:inline-block;background:${COLOR.brassDeep};color:${COLOR.cream};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:999px;mso-padding-alt:0">${esc(label)}</a>
      </td></tr>
    </table>`;
}

function subLinkHtml(href: string, label: string): string {
  return `<p style="margin:0;padding:0 32px 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLOR.brassDark}">
    <a href="${esc(href)}" style="color:${COLOR.brassDark};text-decoration:underline">${esc(label)}</a>
  </p>`;
}

function metaRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLOR.muted};width:130px" valign="top">${esc(label)}</td>
      <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COLOR.ink};font-weight:600" valign="top">${esc(value)}</td>
    </tr>`;
}

/**
 * Shared shell: 600px centered card on cream, serif wordmark, optional CTA
 * button + secondary text link, footer with studio contact details.
 */
function layout(opts: {
  preheader: string;
  body: string;
  cta?: { href: string; label: string };
  subLink?: { href: string; label: string };
  lang?: Lang;
}): string {
  const { preheader, body, cta, subLink, lang } = opts;
  return `<!DOCTYPE html>
<html lang="${lang === "rw" ? "rw" : "en"}">
<body style="margin:0;padding:0;background:${COLOR.page}">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.page}">
    <tr><td align="center" style="padding:32px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${COLOR.card};border-radius:14px;border:1px solid ${COLOR.line}">
        <!-- Header -->
        <tr><td style="padding:32px 32px 0">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;letter-spacing:2px;color:${COLOR.ink};text-align:center">CREATIVE&nbsp;SOUND&nbsp;STUDIO</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 0"><tr><td height="2" style="height:2px;background:${COLOR.brass};font-size:0;line-height:0">&nbsp;</td></tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:28px 32px 8px">${body}</td></tr>
        ${cta ? `<tr><td style="padding:0 32px">${ctaHtml(cta.href, cta.label)}</td></tr>` : ""}
        ${subLink ? `<tr><td style="padding:0">${subLinkHtml(subLink.href, subLink.label)}</td></tr>` : ""}
        <!-- Footer -->
        <tr><td style="padding:24px 32px 28px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;background:${COLOR.line};font-size:0;line-height:0">&nbsp;</td></tr></table>
          <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${COLOR.faint};text-align:center;letter-spacing:1px">CREATIVE SOUND STUDIO</p>
          <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${COLOR.faint};text-align:center">Kigali · Rwanda</p>
          <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${COLOR.faint};text-align:center">
            ${esc(t(lang, "hello@creativesoundstudio.rw · +250 700 000 000", "hello@creativesoundstudio.rw · +250 700 000 000"))}
          </p>
          <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${COLOR.faint};text-align:center;line-height:1.6">
            ${esc(t(lang, "You received this email because of booking or account activity at Creative Sound Studio.", "Wakiriye iyi imeyili kubera urugendo cyangwa ibikorwa kuri Creative Sound Studio."))}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 1. Booking received (client)
// ---------------------------------------------------------------------------
export function bookingReceived(params: {
  booking: { reference: string; status: string; language: string | null };
  contactName: string;
  trackUrl: string;
  dashboardUrl: string;
  ttlHours: number;
}): { subject: string; html: string } {
  const lang: Lang = params.booking.language === "rw" ? "rw" : "en";
  const subject = t(lang, "Your booking is received — Creative Sound Studio", "Urugero rwawe rwahawe — Creative Sound Studio");
  const body = `
    <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${COLOR.ink};font-weight:600">${esc(t(lang, "Thank you,", "Murakoze,"))} <span style="color:${COLOR.brassDark}">${esc(params.contactName)}</span></p>
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${COLOR.ink}">
      ${esc(t(lang,
      "Your booking has been received and our team is on it. Follow its progress any time from your tracking page:",
      "Urugero rwawe rwahawe kandi itsinda ryacu rirakurikirana. Mushobora kureba uko umurimo ugenda igihe cyose kuri page yawe yo gukurikirana:"))}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:6px 0 10px;padding:14px 18px;background:${COLOR.cream};border-radius:10px;border:1px solid ${COLOR.line}">
      ${metaRow(t(lang, "Reference", "Injandikire"), params.booking.reference)}
      ${metaRow(t(lang, "Status", "Icyegeranyo"), statusLabel(params.booking.status, lang))}
      ${metaRow(t(lang, "Tracking link", "Ihuza ryo gukurikirana"), t(lang, `valid for ${params.ttlHours} hours`, `rizakora amasaha ${params.ttlHours}`))}
    </table>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COLOR.ink}">
      ${esc(t(lang, "If you have any question, just reply to this email — we reply fast.", "Niba mufite ikibazo, musubiza muri iyi imeyili — dusubiza vuba."))}
    </p>`;
  return {
    subject,
    html: layout({
      preheader: `${esc(params.contactName)}, ${t(lang, "your booking is received", "urugero rwawe rwahawe")} — ${params.booking.reference}`,
      body,
      cta: { href: params.trackUrl, label: t(lang, "Track this production", "Kurikirana umurimo") },
      subLink: { href: params.dashboardUrl, label: t(lang, "Open my dashboard to see all my bookings", "Fungura dashibodi yanjye urebe urugendo rwanje rwose") },
      lang,
    }),
  };
}

// ---------------------------------------------------------------------------
// 2. Status changed (client)
// ---------------------------------------------------------------------------
export function statusChanged(params: {
  reference: string;
  status: string;
  language: string | null;
  contactName: string;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const lang: Lang = params.language === "rw" ? "rw" : "en";
  const subject = t(lang, `Your booking status updated (${params.reference})`, `Ibyegeranyo by'urugero rwawe byahindutse (${params.reference})`);
  const body = `
    <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${COLOR.ink};font-weight:600">${esc(t(lang, "Hello,", "Muraho,"))} <span style="color:${COLOR.brassDark}">${esc(params.contactName)}</span></p>
    <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${COLOR.ink}">
      ${esc(t(lang, "Your booking", "Urugero rwawe"))} <strong>${esc(params.reference)}</strong> ${esc(t(lang, "is now:", "ubu ruri:"))}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px"><tr><td align="center">
      <span style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:${COLOR.cream};background:${COLOR.brassDark};padding:10px 22px;border-radius:999px;display:inline-block">${esc(statusLabel(params.status, lang))}</span>
    </td></tr></table>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COLOR.ink}">
      ${esc(t(lang, params.status === "CANCELLED" ? "If you have any questions about this change, reply to this email." : "Good things are moving — see full progress and history on your dashboard.", params.status === "CANCELLED" ? "Niba mufite ikibazo kuri iyi mpinduka, musubiza muri iyi imeyili." : "Ibyiza birakomeza — reba urugendo rwose kuri dashibodi yawe."))}
    </p>`;
  return {
    subject,
    html: layout({
      preheader: `${params.reference} — ${statusLabel(params.status, lang)}`,
      body,
      subLink: { href: params.dashboardUrl, label: t(lang, "Open my dashboard", "Fungura dashibodi yanjye") },
      lang,
    }),
  };
}

// ---------------------------------------------------------------------------
// 3. Magic login link (client account/dashboard)
// ---------------------------------------------------------------------------
export function loginLink(params: {
  client: { name: string | null };
  loginUrl: string;
}): { subject: string; html: string } {
  const subject = "Access your booking dashboard — Creative Sound Studio";
  const body = `
    <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${COLOR.ink};font-weight:600">${esc(params.client.name ? `Hello, ${params.client.name}` : "Hello")}</p>
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${COLOR.ink}">
      Here is your secure link to the booking dashboard. From there you can see <strong>all of your bookings</strong> at Creative Sound Studio, their current status, and your testimonial.
    </p>
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLOR.muted}">This link is single-use and expires in <strong>15 minutes</strong>. If you didn't request it, you can safely ignore this email.</p>`;
  return {
    subject,
    html: layout({
      preheader: "Your booking dashboard sign-in link (valid 15 minutes)",
      body,
      cta: { href: params.loginUrl, label: "Open my dashboard" },
      subLink: { href: "https://creativesoundstudio.rw", label: "creativesoundstudio.rw" },
    }),
  };
}

// ---------------------------------------------------------------------------
// 4. New booking (admin)
// ---------------------------------------------------------------------------
export function newBookingAdmin(params: {
  booking: {
    reference: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    eventDate: Date | null;
    location: string | null;
    budgetRange: string | null;
    details: string | null;
  };
  serviceName: string;
  adminPanelUrl: string;
}): { subject: string; html: string } {
  const { booking, serviceName, adminPanelUrl } = params;
  const subject = `New booking ${booking.reference} — ${booking.contactName}`;
  const body = `
    <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${COLOR.ink};font-weight:600">New booking received</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;padding:14px 18px;background:${COLOR.cream};border-radius:10px;border:1px solid ${COLOR.line}">
      ${metaRow("Reference", booking.reference)}
      ${metaRow("Client", `${booking.contactName} · ${booking.contactEmail}`)}
      ${metaRow("Phone", booking.contactPhone ?? "—")}
      ${metaRow("Service", serviceName)}
      ${metaRow("Event date", formatDate(booking.eventDate, "en") || "To be agreed")}
      ${metaRow("Location", booking.location ?? "To be agreed")}
      ${metaRow("Budget", booking.budgetRange ?? "Not specified")}
    </table>
    ${booking.details ? `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${COLOR.ink}"><strong>Details:</strong> ${esc(booking.details)}</p>` : ""}`;
  return {
    subject,
    html: layout({
      preheader: `New booking ${booking.reference} from ${booking.contactName}`,
      body,
      cta: { href: adminPanelUrl, label: "Open admin panel" },
    }),
  };
}

// ---------------------------------------------------------------------------
// 5. Client testimonial submitted (admin)
// ---------------------------------------------------------------------------
export function testimonialSubmittedAdmin(params: {
  author: string;
  email: string;
  role: string | null;
  contentEn: string;
  contentRw: string | null;
  adminPanelUrl: string;
}): { subject: string; html: string } {
  const subject = `New testimonial from ${params.author} — review requested`;
  const body = `
    <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${COLOR.ink};font-weight:600">A client shared their experience 🎬</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;padding:14px 18px;background:${COLOR.cream};border-radius:10px;border:1px solid ${COLOR.line}">
      ${metaRow("Author", params.author)}
      ${metaRow("Contact", params.email)}
      ${metaRow("Role", params.role ?? "—")}
    </table>
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${COLOR.ink}"><strong>Testimonial:</strong></p>
    <blockquote style="margin:0 0 14px;padding:12px 16px;border-left:3px solid ${COLOR.brass};background:${COLOR.cream};font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:${COLOR.ink}">${esc(params.contentEn)}</blockquote>
    ${params.contentRw ? `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLOR.muted}">Kinyarwanda: ${esc(params.contentRw)}</p>` : ""}`;
  return {
    subject,
    html: layout({
      preheader: `New testimonial: ${params.author}`,
      body,
      cta: { href: params.adminPanelUrl, label: "Review and publish" },
    }),
  };
}

// ---------------------------------------------------------------------------
// 6. Testimonial published (client)
// ---------------------------------------------------------------------------
export function testimonialPublished(params: {
  client: { name: string };
  dashboardUrl: string;
}): { subject: string; html: string } {
  const subject = "Your testimonial is live — Creative Sound Studio";
  const body = `
    <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${COLOR.ink};font-weight:600">Yay, <span style="color:${COLOR.brassDark}">${esc(params.client.name)}</span> 🎉</p>
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${COLOR.ink}">
      Your testimonial is now live on our website — thank you for sharing your experience. It means the world to us.
    </p>
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:${COLOR.ink}">
      Meanwhile, your booking dashboard is always open for you.
    </p>`;
  return {
    subject,
    html: layout({
      preheader: `${params.client.name}, your testimonial is live`,
      body,
      cta: { href: params.dashboardUrl, label: "Open my dashboard" },
    }),
  };
}

/** Admin panel URL for notification emails (English only). */
export function adminPanelUrl(base: string): string {
  return `${base}/admin/bookings`;
}