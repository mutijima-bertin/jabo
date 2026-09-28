/**
 * e2e-purge-survey.ts — READ-ONLY survey of the dev DB before any e2e residue
 * purge. Prints the row counts and the distinct identity values per table so
 * the delete criteria can be verified against real data instead of assumed.
 *
 * Run: npx tsx scripts/e2e-purge-survey.ts
 */
import { prisma } from "../src/config/db";

const domain = (email: string | null | undefined) => (email ? String(email).split("@").pop() : "(null)");

async function main() {
  const bookings = await prisma.booking.findMany({ select: { id: true, reference: true, contactEmail: true, contactName: true } });

  const byDomain = new Map<string, number>();
  for (const b of bookings) byDomain.set(domain(b.contactEmail), (byDomain.get(domain(b.contactEmail)) ?? 0) + 1);
  console.log("Booking.contactEmail domains:", JSON.stringify(Object.fromEntries([...byDomain].sort((a, b) => b[1] - a[1])), null, 1));

  const testBookings = bookings.filter((b) => /@(test\.local|nowhere\.invalid)$/i.test(b.contactEmail));
  console.log(`Booking total=${bookings.length} testLike=${testBookings.length}`);

  // Anything NOT matching the test pattern — the rows we must NOT touch.
  const keep = bookings.filter((b) => !/@(test\.local|nowhere\.invalid)$/i.test(b.contactEmail));
  console.log("NON-test bookings (must be preserved):");
  for (const b of keep.slice(0, 25)) console.log(`   ${b.reference}  ${b.contactEmail}  ${b.contactName}`);

  const clients = await prisma.client.findMany({ select: { id: true, name: true, email: true } });
  const clientDomains = new Map<string, number>();
  for (const c of clients) clientDomains.set(domain(c.email), (clientDomains.get(domain(c.email)) ?? 0) + 1);
  console.log("Client.email domains:", JSON.stringify(Object.fromEntries([...clientDomains].sort((a, b) => b[1] - a[1])), null, 1));
  console.log("NON-test clients (must be preserved):");
  for (const c of clients.filter((c) => !/@(test\.local|nowhere\.invalid)$/i.test(c.email ?? "")))
    console.log(`   ${c.email}  ${c.name}`);

  const testis = await prisma.testimonial.findMany({ select: { id: true, author: true, role: true, source: true, clientId: true } });
  console.log(`Testimonial total=${testis.length}`);
  console.log("  E2E-marked (role/author starts with 'E2E ' or content E2E):",
    testis.filter((t) => /^E2E/i.test(t.role ?? "") || /^E2E/i.test(t.author)).length);
  console.log("  source=CLIENT:", testis.filter((t) => t.source === "CLIENT").length);
  console.log("  NON-E2E testimonials (must be preserved):");
  for (const t of testis.filter((t) => !/^E2E/i.test(t.role ?? "") && !/^E2E/i.test(t.author)).slice(0, 25))
    console.log(`   src=${t.source} author="${t.author}" role="${t.role ?? ""}"`);

  const msgs = await prisma.contactMessage.findMany({ select: { id: true, email: true, name: true, subject: true } });
  const msgDomains = new Map<string, number>();
  for (const m of msgs) msgDomains.set(domain(m.email), (msgDomains.get(domain(m.email)) ?? 0) + 1);
  console.log("ContactMessage.email domains:", JSON.stringify(Object.fromEntries([...msgDomains].sort((a, b) => b[1] - a[1])), null, 1));
  console.log("NON-test contact messages (must be preserved):");
  for (const m of msgs.filter((m) => !/@(test\.local|nowhere\.invalid)$/i.test(m.email)).slice(0, 25))
    console.log(`   ${m.email}  "${m.subject}"`);

  const notifs = await prisma.adminNotification.findMany({ select: { id: true, type: true, payload: true, linkHref: true } });
  const testRefs = new Set(testBookings.map((b) => b.reference));
  const notifTypes = new Map<string, number>();
  for (const n of notifs) notifs_set(n.type, notifTypes);
  function notifs_set(t: string, m: Map<string, number>) {
    m.set(t, (m.get(t) ?? 0) + 1);
  }
  console.log("AdminNotification types:", JSON.stringify(Object.fromEntries(notifTypes), null, 1));

  const payloadOf = (n: (typeof notifs)[number]) => (n.payload ?? {}) as Record<string, unknown>;
  const bookingNotifs = notifs.filter((n) => n.type === "NEW_BOOKING");
  const bookingNotifsTest = bookingNotifs.filter((n) => testRefs.has(String(payloadOf(n).reference ?? "")));
  const contactNotifs = notifs.filter((n) => n.type === "NEW_CONTACT_MESSAGE");
  const contactNotifsTest = contactNotifs.filter((n) => /@(test\.local|nowhere\.invalid)$/i.test(String(payloadOf(n).email ?? "")));
  const otherTypes = notifs.filter((n) => n.type !== "NEW_BOOKING" && n.type !== "NEW_CONTACT_MESSAGE");
  console.log(`AdminNotification NEW_BOOKING total=${bookingNotifs.length} matchingTestBookingRef=${bookingNotifsTest.length}`);
  console.log(`AdminNotification NEW_CONTACT_MESSAGE total=${contactNotifs.length} matchingTestEmail=${contactNotifsTest.length}`);
  console.log(`AdminNotification other types total=${otherTypes.length} (preserved)`);
  for (const n of otherTypes.slice(0, 10)) console.log(`   type=${n.type} linkHref=${n.linkHref ?? "(null)"}`);

  console.log("\nCASCADE CHECKS (from schema): BookingEvent/NotificationLog -> Booking are onDelete:Cascade;");
  console.log("Booking.client is an OPTIONAL relation (SetNull default); Testimonial.client is OPTIONAL (SetNull) => testimonials must be deleted explicitly, not cascaded.");

  console.log("\nCOUNTS (current):", JSON.stringify({
    bookings: bookings.length,
    testBookings: testBookings.length,
    bookingEvents: await prisma.bookingEvent.count(),
    notificationLogs: await prisma.notificationLog.count(),
    clients: clients.length,
    testimonials: testis.length,
    contactMessages: msgs.length,
    adminNotifications: notifs.length,
  }, null, 1));
}

main()
  .catch((e) => {
    console.error("SURVEY FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
