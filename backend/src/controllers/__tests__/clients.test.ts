import type { Server } from "http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TestimonialSource } from "@prisma/client";
import { createApp } from "../../app";
import { prisma } from "../../config/db";
import { signAdminToken } from "../../services/auth";
import { issueClientJwt } from "../../services/clientAuth";

// Client testimonial submission: POST /api/clients/testimonials + GET /api/clients/testimonials/me.
// Uses the same real-express-app + prisma-fixture pattern as adminCatalog.test.ts.

describe("POST /api/clients/testimonials + GET /api/clients/testimonials/me", () => {
  let server: Server;
  let baseUrl: string;
  let adminToken: string;

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
    adminToken = signAdminToken("test-admin");
  });

  afterAll(async () => {
    // clientId is ON DELETE SET NULL (no cascade), so clear testimonials first.
    await prisma.testimonial.deleteMany();
    await prisma.client.deleteMany();
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.testimonial.deleteMany();
    await prisma.client.deleteMany();
  });

  const makeClient = async (name = "Client One") =>
    prisma.client.create({
      data: {
        name,
        email: `${name.replace(/\s+/g, "").toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        phone: "+250700000000",
      },
    });

  // Lazily resolved (like url() in adminCatalog) — baseUrl is only set in beforeAll.
  const postUrl = () => `${baseUrl}/api/clients/testimonials`;
  const myUrl = () => `${baseUrl}/api/clients/testimonials/me`;

  const postTestimonial = (token: string, body: Record<string, unknown>) =>
    fetch(postUrl(), {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  it("returns 401 for GET /me without a token", async () => {
    const res = await fetch(myUrl());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 for POST without a token", async () => {
    const res = await fetch(postUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentEn: "A brilliant experience end to end." }),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("creates an unpublished CLIENT testimonial authored from the client record, exposes it via GET /me, and rejects a second submission", async () => {
    const client = await makeClient();
    const token = issueClientJwt(client);

    const created = await postTestimonial(token, {
      role: "Producer",
      contentEn: "A brilliant experience end to end.",
      contentRw: "Uburambe bwiza kurwego rwose.",
    });
    expect(created.status).toBe(201);
    const body = (await created.json()) as { testimonial: Record<string, unknown> };
    expect(body.testimonial.author).toBe(client.name);
    expect(body.testimonial.role).toBe("Producer");
    expect(body.testimonial.contentEn).toBe("A brilliant experience end to end.");
    expect(body.testimonial.contentRw).toBe("Uburambe bwiza kurwego rwose.");
    expect(body.testimonial.source).toBe("CLIENT");
    expect(body.testimonial.published).toBe(false);
    // createdAt is a Date serialized to JSON — never the DB's raw type.
    expect(typeof body.testimonial.createdAt).toBe("string");

    const persisted = await prisma.testimonial.findUniqueOrThrow({
      where: { id: String(body.testimonial.id) },
    });
    expect(persisted.author).toBe(client.name);
    expect(persisted.source).toBe("CLIENT");
    expect(persisted.published).toBe(false);
    expect(persisted.clientId).toBe(client.id);

    // GET /me right after a real POST returns the same unpublished row.
    const mine = await fetch(myUrl(), { headers: { authorization: `Bearer ${token}` } });
    expect(mine.status).toBe(200);
    const mineBody = (await mine.json()) as { testimonial: Record<string, unknown> };
    expect(mineBody.testimonial).not.toBeNull();
    expect(mineBody.testimonial.id).toBe(body.testimonial.id);
    expect(mineBody.testimonial.author).toBe(client.name);
    expect(mineBody.testimonial.source).toBe("CLIENT");
    expect(mineBody.testimonial.published).toBe(false);

    // The client only gets one submission — no edit/replace path on this contract.
    const again = await postTestimonial(token, { contentEn: "A second submission." });
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ error: "ALREADY_SUBMITTED" });
  });

  it("returns {testimonial:null} for a client with no submission", async () => {
    const client = await makeClient();

    const res = await fetch(myUrl(), { headers: { authorization: `Bearer ${issueClientJwt(client)}` } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ testimonial: null });
  });

  it("returns 401 for a valid-format token whose client no longer exists", async () => {
    const token = issueClientJwt({ id: `c${"f".repeat(24)}` });

    const res = await fetch(myUrl(), { headers: { authorization: `Bearer ${token}` } });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid or expired token" });
  });

  it("returns 400 VALIDATION with issues when contentEn is shorter than 10 chars", async () => {
    const client = await makeClient();

    const res = await postTestimonial(issueClientJwt(client), { contentEn: "Too short" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("VALIDATION");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);

    // The rejected body must not have created a row.
    expect(await prisma.testimonial.count()).toBe(0);
  });

  it("turns blank role and blank contentRw into null (trimmed, optional)", async () => {
    const client = await makeClient("Client Three");

    const res = await postTestimonial(issueClientJwt(client), {
      role: "",
      contentRw: "",
      contentEn: "  A brilliant experience end to end.  ",
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { testimonial: { role: null; contentRw: null; contentEn: string } };
    expect(body.testimonial.role).toBeNull();
    expect(body.testimonial.contentRw).toBeNull();
    // contentEn is also trimmed on the way in.
    expect(body.testimonial.contentEn).toBe("A brilliant experience end to end.");
  });

  it("admin list returns CLIENT rows with the linked client and ADMIN rows with client null", async () => {
    const client = await makeClient();
    await prisma.testimonial.create({
      data: {
        author: client.name,
        role: "Producer",
        contentEn: "A brilliant experience end to end.",
        contentRw: "Uburambe bwiza.",
        source: TestimonialSource.CLIENT,
        published: false,
        clientId: client.id,
      },
    });
    await prisma.testimonial.create({
      data: { author: "Studio Founder", contentEn: "Hand written review.", published: true },
    });

    const res = await fetch(`${baseUrl}/api/admin/testimonials`, {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      source: string;
      client: { id: string; name: string; email: string } | null;
    }[];

    const clientRow = body.find((t) => t.source === "CLIENT");
    expect(clientRow).toBeDefined();
    expect(clientRow!.client).toEqual({ id: client.id, name: client.name, email: client.email });

    const adminRow = body.find((t) => t.source === "ADMIN");
    expect(adminRow).toBeDefined();
    expect(adminRow!.client).toBeNull();
  });
});

// POST /api/bookings — contactPhone E.164 requirement/normalization. Public
// booking form now sends E.164 via a country-coded input; the API must strip
// whitespace, accept empty/absent as null, and reject non-E.164 with a
// contactPhone-field VALIDATION issue. Uses the same real-express-app +
// prisma-fixture pattern as the testimonial suite above.
describe("POST /api/bookings contactPhone E.164 normalization", () => {
  let server: Server;
  let baseUrl: string;
  let serviceId: string;

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
    // Bookings must go first (they reference service + client); booking events
    // and notification logs cascade off the booking rows.
    await prisma.booking.deleteMany();
    await prisma.service.deleteMany();
    await prisma.client.deleteMany();
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.service.deleteMany();
    await prisma.client.deleteMany();
    const service = await prisma.service.create({
      data: {
        nameEn: "Studio Session",
        nameRw: "Sesi yo muri studio",
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: "audio",
      },
    });
    serviceId = service.id;
  });

  // Unique email per call so the create route's per-email limit (5/hour) and
  // the shared client-upsert never collide between tests.
  const postBooking = (overrides: Record<string, unknown> = {}) =>
    fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        serviceId,
        contactName: "Alice Test",
        contactEmail: `alice-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        ...overrides,
      }),
    });

  it("strips whitespace from an E.164 phone and stores the normalized value", async () => {
    const res = await postBooking({ contactPhone: "+250 788 123 456" });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { booking: { id: string; contactPhone: string | null } };
    // toPublicBooking passes contactPhone through.
    expect(body.booking.contactPhone).toBe("+250788123456");

    const persisted = await prisma.booking.findFirstOrThrow({ where: { id: body.booking.id } });
    expect(persisted.contactPhone).toBe("+250788123456");
  });

  it("rejects a national-format phone (missing +) with a contactPhone VALIDATION issue", async () => {
    const res = await postBooking({ contactPhone: "0788123456" });

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      issues: { field: string; message: string }[];
    };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContainEqual({
      field: "contactPhone",
      message: "Phone must be a valid international number, e.g. +2507XXXXXXXX",
    });
    expect(await prisma.booking.count()).toBe(0);
  });

  it("rejects an E.164-looking number without the + with a contactPhone VALIDATION issue", async () => {
    const res = await postBooking({ contactPhone: "250788123456" });

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      issues: { field: string; message: string }[];
    };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContainEqual({
      field: "contactPhone",
      message: "Phone must be a valid international number, e.g. +2507XXXXXXXX",
    });
    expect(await prisma.booking.count()).toBe(0);
  });

  it("still accepts a full E.164 phone unchanged", async () => {
    const res = await postBooking({ contactPhone: "+250700000000" });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { booking: { contactPhone: string | null } };
    expect(body.booking.contactPhone).toBe("+250700000000");
  });

  it("still accepts a booking with the phone omitted (stored as null)", async () => {
    const res = await postBooking({});

    expect(res.status).toBe(201);
    const body = (await res.json()) as { booking: { id: string; contactPhone: string | null } };
    expect(body.booking.contactPhone).toBeNull();

    const persisted = await prisma.booking.findFirstOrThrow({ where: { id: body.booking.id } });
    expect(persisted.contactPhone).toBeNull();
  });

  it("still accepts an empty-string phone (stored as null)", async () => {
    const res = await postBooking({ contactPhone: "" });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { booking: { contactPhone: string | null } };
    expect(body.booking.contactPhone).toBeNull();
  });
});