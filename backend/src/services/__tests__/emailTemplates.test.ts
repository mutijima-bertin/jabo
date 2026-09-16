import { describe, expect, it } from "vitest";
import {
  adminPanelUrl,
  bookingReceived,
  esc,
  loginLink,
  newBookingAdmin,
  reviewRequest,
  statusChanged,
  statusLabel,
  testimonialPublished,
  testimonialSubmittedAdmin,
} from "../emailTemplates";

const bookingFixture = {
  reference: "CSS-MNFFGY",
  status: "PENDING",
  language: "en" as const,
  contactName: "Alain <script>alert(1)</script>",
};

describe("esc", () => {
  it("neutralizes HTML and quotes", () => {
    expect(esc(`<b onclick="x()"> & 'yo' </b>`)).toBe("&lt;b onclick=&quot;x()&quot;&gt; &amp; &#39;yo&#39; &lt;/b&gt;");
  });
  it("renders null/undefined as empty", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });
});

describe("bookingReceived", () => {
  it("builds EN subject + contains track and dashboard URLs", () => {
    const mail = bookingReceived({
      booking: bookingFixture,
      contactName: bookingFixture.contactName,
      trackUrl: "http://localhost:3000/track/css_token",
      dashboardUrl: "http://localhost:3000/login",
      ttlHours: 168,
    });
    expect(mail.subject).toBe("Your booking is received — Creative Sound Studio");
    expect(mail.html).toContain("http://localhost:3000/track/css_token");
    expect(mail.html).toContain("http://localhost:3000/login");
    expect(mail.html).toContain("Track this production");
    expect(mail.html).toContain("Open my dashboard to see all my bookings");
    expect(mail.html).toContain("CSS-MNFFGY");
    // User content is escaped: no raw <script>
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("switches to Kinyarwanda copy when the booking language is rw", () => {
    const mail = bookingReceived({
      booking: { ...bookingFixture, language: "rw" },
      contactName: "Alain",
      trackUrl: "http://localhost:3000/track/css_token",
      dashboardUrl: "http://localhost:3000/login",
      ttlHours: 168,
    });
    expect(mail.subject).toBe("Urugero rwawe rwahawe — Creative Sound Studio");
    expect(mail.html).toContain("Urugero rwawe rwahawe");
    expect(mail.html).toContain("Kurikirana umurimo");
    expect(mail.html).toContain("amasaha 168");
  });
});

describe("statusChanged", () => {
  it("shows the localized status badge label and the dashboard link", () => {
    const mail = statusChanged({
      reference: "CSS-MNFFGY",
      status: "IN_PRODUCTION",
      language: "en",
      contactName: "Alain",
      dashboardUrl: "http://localhost:3000/login",
    });
    expect(mail.subject).toContain("CSS-MNFFGY");
    expect(mail.html).toContain("In production");
    expect(mail.html).toContain("http://localhost:3000/login");
  });

  it("uses Kinyarwanda status + subject for rw", () => {
    const mail = statusChanged({
      reference: "CSS-MNFFGY",
      status: "CANCELLED",
      language: "rw",
      contactName: "Alain",
      dashboardUrl: "http://localhost:3000/login",
    });
    expect(mail.subject).toContain("Ibyegeranyo by'urugero rwawe byahindutse");
    expect(mail.html).toContain("Byahagaritswe");
  });

  it("renders the tracking CTA (primary) plus the dashboard sub-link when trackUrl is given", () => {
    const mail = statusChanged({
      reference: "CSS-MNFFGY",
      status: "DELIVERED",
      language: "en",
      contactName: "Alain",
      dashboardUrl: "http://localhost:3000/login",
      trackUrl: "http://localhost:3000/track/css_fresh",
    });
    expect(mail.html).toContain("http://localhost:3000/track/css_fresh");
    expect(mail.html).toContain("Track this production");
    // CTA button href (escaped in the anchor) + dashboard sub-link both present.
    expect(mail.html).toContain('href="http://localhost:3000/track/css_fresh"');
    expect(mail.html).toContain('<a href="http://localhost:3000/login"');
  });

  it("renders the tracking CTA in Kinyarwanda for a CANCELLED rw booking (timeline still matters)", () => {
    const mail = statusChanged({
      reference: "CSS-MNFFGY",
      status: "CANCELLED",
      language: "rw",
      contactName: "Alain",
      dashboardUrl: "http://localhost:3000/login",
      trackUrl: "http://localhost:3000/track/css_fresh",
    });
    expect(mail.html).toContain("Kurikirana umurimo");
    expect(mail.html).toContain('href="http://localhost:3000/track/css_fresh"');
    expect(mail.html).toContain('href="http://localhost:3000/login"');
  });

  it("skips the tracking CTA (keeps the dashboard sub-link) when trackUrl is missing", () => {
    const mail = statusChanged({
      reference: "CSS-MNFFGY",
      status: "CONFIRMED",
      language: "en",
      contactName: "Alain",
      dashboardUrl: "http://localhost:3000/login",
    });
    expect(mail.html).not.toContain("Track this production");
    expect(mail.html).toContain("Open my dashboard");
    expect(mail.html).toContain('href="http://localhost:3000/login"');
  });
});

describe("reviewRequest", () => {
  it("asks for feedback in EN with the dashboard CTA", () => {
    const mail = reviewRequest({
      booking: { reference: "CSS-MNFFGY", language: "en" },
      contactName: "Alain",
      dashboardUrl: "http://localhost:3000/login",
    });
    expect(mail.subject).toBe("Your production is ready — Creative Sound Studio");
    expect(mail.html).toContain("Hello,");
    expect(mail.html).toContain("Alain");
    expect(mail.html).toContain("Your production CSS-MNFFGY has been delivered.");
    expect(mail.html).toContain("Share your experience");
    expect(mail.html).toContain('href="http://localhost:3000/login"');
    expect(mail.html).toContain("You can also just reply to this email.");
  });

  it("switches to Kinyarwanda copy for rw bookings", () => {
    const mail = reviewRequest({
      booking: { reference: "CSS-MNFFGY", language: "rw" },
      contactName: "Aline",
      dashboardUrl: "http://localhost:3000/login",
    });
    expect(mail.subject).toBe("Umurimo wawe urasozwa — Creative Sound Studio");
    expect(mail.html).toContain("Muraho,");
    expect(mail.html).toContain("Umurimo wawe CSS-MNFFGY watanzwe.");
    expect(mail.html).toContain("Sangiza ibitekerezo");
    expect(mail.html).toContain('href="http://localhost:3000/login"');
  });
});

describe("layout footer", () => {
  it("shows the studio's real phone number in the footer for EN and RW (never the old placeholder)", () => {
    for (const language of ["en", "rw"] as const) {
      const mail = bookingReceived({
        booking: { ...bookingFixture, language },
        contactName: "Alain",
        trackUrl: "http://localhost:3000/track/css_token",
        dashboardUrl: "http://localhost:3000/login",
        ttlHours: 168,
      });
      expect(mail.html).toContain("+250 783 269 951");
      expect(mail.html).not.toContain("+250 700 000 000");
    }
  });
});

describe("loginLink", () => {
  it("points the CTA at the magic login URL", () => {
    const mail = loginLink({ client: { name: "Alain" }, loginUrl: "http://localhost:3000/login?token=css_abc" });
    expect(mail.subject).toBe("Access your booking dashboard — Creative Sound Studio");
    expect(mail.html).toContain("http://localhost:3000/login?token=css_abc");
    expect(mail.html).toContain("Open my dashboard");
    expect(mail.html).toContain("15 minutes");
  });
});

describe("newBookingAdmin", () => {
  it("contains every booking detail + admin panel CTA", () => {
    const mail = newBookingAdmin({
      booking: {
        reference: "CSS-MNFFGY",
        contactName: "Alain",
        contactEmail: "alain@example.com",
        contactPhone: "+250788123456",
        eventDate: new Date("2026-10-01T10:00:00Z"),
        location: "Kigali",
        budgetRange: "300k–600k RWF",
        details: "Wedding <img src=x onerror=alert(1)> coverage",
      },
      serviceName: "Videography",
      adminPanelUrl: "http://localhost:4000/admin/bookings",
    });
    expect(mail.subject).toBe("New booking CSS-MNFFGY — Alain");
    expect(mail.html).toContain("+250788123456");
    expect(mail.html).toContain("Videography");
    expect(mail.html).toContain("300k–600k RWF");
    expect(mail.html).toContain("http://localhost:4000/admin/bookings");
    expect(mail.html).not.toContain("<img");
  });
});

describe("testimonialSubmittedAdmin", () => {
  it("summarizes the submission and points at the review CTA", () => {
    const mail = testimonialSubmittedAdmin({
      author: "Alain",
      email: "alain@example.com",
      role: "Bride's father",
      contentEn: "Creative Sound Studio delivered an unforgettable ceremony film. Highly recommended!",
      contentRw: "Creative Sound Studio yadutanzeza firime idasibuka. Barabikora neza!",
      adminPanelUrl: "http://localhost:4000/admin/bookings",
    });
    expect(mail.subject).toContain("Alain");
    expect(mail.html).toContain("Bride&#39;s father");
    expect(mail.html).toContain("Creative Sound Studio delivered");
    expect(mail.html).toContain("Kinyarwanda:");
  });
});

describe("testimonialPublished", () => {
  it("thanks the client with a dashboard CTA", () => {
    const mail = testimonialPublished({
      client: { name: "Alain" },
      dashboardUrl: "http://localhost:3000/login",
    });
    expect(mail.subject).toBe("Your testimonial is live — Creative Sound Studio");
    expect(mail.html).toContain("Alain");
    expect(mail.html).toContain("http://localhost:3000/login");
  });
});

describe("helpers", () => {
  it("statusLabel covers every booking status in EN + RW", () => {
    for (const status of ["PENDING", "CONFIRMED", "IN_PRODUCTION", "DELIVERED", "COMPLETED", "CANCELLED"]) {
      expect(statusLabel(status, "en")).not.toBe(status);
      expect(statusLabel(status, "rw")).not.toBe(status);
    }
  });
  it("adminPanelUrl appends the bookings route", () => {
    expect(adminPanelUrl("http://localhost:4000")).toBe("http://localhost:4000/admin/bookings");
  });
});