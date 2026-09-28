/**
 * e2e-purge.ts — remove Playwright e2e residue from the dev database.
 *
 * CRITERIA (evidence-based; see scripts/e2e-purge-survey.ts for the survey that
 * produced them). Every predicate is an e2e fixture convention found in
 * frontend/e2e/*.spec.ts:
 *   Bookings           contactEmail ILIKE '%@test.local'
 *                      (specs: e2e-, e2e-phone-, e2e-invalid-, track-, dash-,
 *                       client-, client-testi-, contact-, nobody-, filter-*,
 *                       columns-, note-, clients-del-, bell-*, vantrix-*,
 *                       rescue-*)
 *   BookingEvent       NOT selected — Booking -> BookingEvent is onDelete:Cascade
 *   NotificationLog    NOT selected — Booking -> NotificationLog is onDelete:Cascade
 *   AdminNotification  NEW_BOOKING        payload.reference IN (test booking refs)
 *                      STATUS_CHANGED     payload.bookingId/reference IN (test bookings)
 *                      NEW_CONTACT_MESSAGE payload.email ILIKE '%@test.local'
 *                      TESTIMONIAL_SUBMITTED payload.email ILIKE '%@test.local'
 *                      PRESERVED: NEW_BOOKING rows for non-test bookings, and
 *                      SEND_FAILED rows (payload carries no booking reference at
 *                      all, so they cannot be attributed to an e2e booking).
 *   Testimonial        source = CLIENT OR role/author ILIKE 'E2E %' — deleted
 *                      explicitly because Testimonial.client is an OPTIONAL
 *                      relation (Prisma default SetNull), so deleting the Client
 *                      would orphan the row instead of removing it.
 *   Client             email ILIKE '%@test.local'
 *   ContactMessage     email ILIKE '%@test.local'
 *
 * PRESERVED BY DESIGN (other harnesses / real data, report only):
 *   gmail.com bookings+clients, @example.com (verifier/smoke/magiclink),
 *   @compose.local ("Compose E2E"), @example.co.rw (CSS-SEED-001 seed row).
 *
 * Run: npx tsx scripts/e2e-purge.ts
 */
import { prisma } from "../src/config/db";

const TEST_EMAIL = { endsWith: "@test.local" } as const;

type Report = Record<string, number>;

async function main() {
  const before: Report = {
    bookings: await prisma.booking.count(),
    bookingEvents: await prisma.bookingEvent.count(),
    notificationLogs: await prisma.notificationLog.count(),
    adminNotifications: await prisma.adminNotification.count(),
    clients: await prisma.client.count(),
    testimonials: await prisma.testimonial.count(),
    contactMessages: await prisma.contactMessage.count(),
  };
  console.log("BEFORE:", JSON.stringify(before));

  const result = await prisma.$transaction(async (tx) => {
    // --- Resolve the exact e2e booking set first (ids + references) ---------
    const testBookings = await tx.booking.findMany({
      where: { contactEmail: TEST_EMAIL },
      select: { id: true, reference: true },
    });
    const testIds = new Set(testBookings.map((b) => b.id));
    const testRefs = new Set(testBookings.map((b) => b.reference));

    const allNotifs = await tx.adminNotification.findMany({
      select: { id: true, type: true, payload: true, linkHref: true },
    });
    const payload = (n: (typeof allNotifs)[number]) => (n.payload ?? {}) as Record<string, unknown>;
    const linkBookingId = (href: string | null) => /open=([a-zA-Z0-9]+)/.exec(href ?? "")?.[1] ?? "";

    const notifIdsToDelete = allNotifs
      .filter((n) => {
        const p = payload(n);
        const byBooking = testIds.has(String(p.bookingId ?? "")) || testRefs.has(String(p.reference ?? ""));
        const byLink = testIds.has(linkBookingId(n.linkHref));
        switch (n.type) {
          case "NEW_BOOKING":
            return byBooking || byLink;
          case "STATUS_CHANGED":
            return byBooking || byLink;
          case "NEW_CONTACT_MESSAGE":
          case "TESTIMONIAL_SUBMITTED":
            return String(p.email ?? "").toLowerCase().endsWith("@test.local");
          default:
            return false; // SEND_FAILED and anything unknown: preserved
        }
      })
      .map((n) => n.id);

    const notifBreakdown = allNotifs.reduce<Record<string, number>>((acc, n) => {
      const willDelete = notifIdsToDelete.includes(n.id);
      const k = `${n.type}:${willDelete ? "DELETE" : "KEEP"}`;
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

    // --- Deletes, children first where a cascade does not apply -----------
    const testimonials = await tx.testimonial.deleteMany({
      where: { OR: [{ source: "CLIENT" }, { role: { startsWith: "E2E" } }, { author: { startsWith: "E2E" } }] },
    });
    const notifications = await tx.adminNotification.deleteMany({ where: { id: { in: notifIdsToDelete } } });
    const contactMessages = await tx.contactMessage.deleteMany({ where: { email: TEST_EMAIL } });
    // Booking -> BookingEvent / NotificationLog cascade (verified onDelete:Cascade).
    const bookings = await tx.booking.deleteMany({ where: { contactEmail: TEST_EMAIL } });
    // Booking.client is optional => SetNull; bookings are already gone.
    const clients = await tx.client.deleteMany({ where: { email: TEST_EMAIL } });

    return { notifBreakdown, deleted: { testimonials: testimonials.count, adminNotifications: notifications.count, contactMessages: contactMessages.count, bookings: bookings.count, clients: clients.count } };
  });

  console.log("\nAdminNotification decision breakdown (type:DELETE / type:KEEP):");
  for (const k of Object.keys(result.notifBreakdown).sort()) console.log(`   ${k} = ${result.notifBreakdown[k]}`);

  console.log("\nDELETED (rows):", JSON.stringify(result.deleted, null, 1));

  const after: Report = {
    bookings: await prisma.booking.count(),
    bookingEvents: await prisma.bookingEvent.count(),
    notificationLogs: await prisma.notificationLog.count(),
    adminNotifications: await prisma.adminNotification.count(),
    clients: await prisma.client.count(),
    testimonials: await prisma.testimonial.count(),
    contactMessages: await prisma.contactMessage.count(),
  };
  console.log("AFTER:", JSON.stringify(after));

  // Verify the cascade assumption held: children of the purged bookings are gone.
  const orphanEvents = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM "BookingEvent" b WHERE NOT EXISTS (SELECT 1 FROM "Booking" x WHERE x.id = b."bookingId")`;
  const orphanLogs = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM "NotificationLog" b WHERE NOT EXISTS (SELECT 1 FROM "Booking" x WHERE x.id = b."bookingId")`;
  console.log(`ORPHAN CHECK: BookingEvent without Booking=${orphanEvents[0].n} NotificationLog without Booking=${orphanLogs[0].n} (both should be 0)`);
}

main()
  .catch((e) => {
    console.error("PURGE FAILED (transaction rolled back):", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
