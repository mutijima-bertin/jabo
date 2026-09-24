import type { Server } from "http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app";

// Public contact form: POST /api/contact (frontend posts to /contact and its
// api helper prefixes /api). Validates the body, fires the admin email in the
// background (never blocks the response), returns 201 synchronously. No
// database writes — same real-express-app harness as the other controller
// suites, no prisma fixtures needed.

describe("POST /api/contact", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    server = app.listen(0);
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("test server started without a TCP address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // Unique email per call so the per-email limit (5/hour) never collides.
  const postContact = (overrides: Record<string, unknown> = {}) =>
    fetch(`${baseUrl}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Alain Bizimana",
        email: `alain-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        phone: "+250 788 123 456",
        subject: "Wedding videography",
        message: "Hi, we would love a quote for a full wedding film next January.",
        language: "en",
        ...overrides,
      }),
    });

  it("accepts a valid message and returns 201 { ok: true } synchronously", async () => {
    const res = await postContact();

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("accepts a message with the phone omitted", async () => {
    const res = await postContact({ phone: "" });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 400 VALIDATION with issues for an invalid email and a too-short message", async () => {
    const res = await postContact({ email: "not-an-email", message: "short" });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: { field: string; message: string }[] };
    expect(body.error).toBe("VALIDATION");
    expect(Array.isArray(body.issues)).toBe(true);
    const fields = body.issues.map((i) => i.field);
    expect(fields).toContain("email");
    expect(fields).toContain("message");
    const emailIssue = body.issues.find((i) => i.field === "email");
    expect(emailIssue?.message).toMatch(/valid email/i);
  });

  it("rejects a national-format phone with a phone VALIDATION issue (same refine as bookings)", async () => {
    const res = await postContact({ phone: "0788123456" });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: { field: string; message: string }[] };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContainEqual({
      field: "phone",
      message: "Phone must be a valid international number, e.g. +2507XXXXXXXX",
    });
  });

  it("rejects a whitespace-only name with a name VALIDATION issue", async () => {
    const res = await postContact({ name: "   " });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: { field: string; message: string }[] };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues.map((i) => i.field)).toContain("name");
  });

  it("rejects a name containing a newline with a name VALIDATION issue", async () => {
    const res = await postContact({ name: "Alain\n<script>alert(1)</script>" });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: { field: string; message: string }[] };
    expect(body.error).toBe("VALIDATION");
    const nameIssue = body.issues.find((i) => i.field === "name");
    expect(nameIssue).toBeDefined();
    expect(nameIssue?.message).toMatch(/invalid characters/i);
  });

  it("rejects a subject containing a newline with a subject VALIDATION issue", async () => {
    const res = await postContact({ subject: "Wedding\nfilm" });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: { field: string; message: string }[] };
    expect(body.error).toBe("VALIDATION");
    const subjectIssue = body.issues.find((i) => i.field === "subject");
    expect(subjectIssue).toBeDefined();
    expect(subjectIssue?.message).toMatch(/invalid characters/i);
  });

  it("still accepts a valid name trimmed of outer whitespace", async () => {
    const res = await postContact({ name: "  Alain Bizimana  " });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });
});