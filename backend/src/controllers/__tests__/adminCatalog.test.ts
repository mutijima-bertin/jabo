import type { Server } from "http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { createApp } from "../../app";
import { prisma } from "../../config/db";
import { signAdminToken } from "../../services/auth";
import * as serviceModel from "../../models/service.model";
import * as testimonialModel from "../../models/testimonial.model";

// Auto-spy model exports (originals still run); individual tests swap in a
// failure (P2025/P2034 reorder race, generic testimonial failure) so the
// controller's error mapping is provable without a real concurrent transaction.
vi.mock("../../models/service.model", { spy: true });
vi.mock("../../models/testimonial.model", { spy: true });

describe("PUT /api/admin/testimonials/:id", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let testimonialId: string;

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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.testimonial.deleteMany();
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.testimonial.deleteMany();
    const created = await prisma.testimonial.create({
      data: {
        author: "Alice",
        role: "Producer",
        contentEn: "Original content",
        contentRw: "Umurimo mwiza",
        published: true,
      },
    });
    testimonialId = created.id;
  });

  // Immutable defaults + spread overrides; `undefined`/missing keys are
  // dropped by JSON.stringify, which is exactly what the validation tests need.
  const putBody = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
      author: "Bob",
      role: "Director",
      contentEn: "Updated content",
      contentRw: "Ibice bishya",
      published: false,
      ...overrides,
    });

  const url = () => `${baseUrl}/api/admin/testimonials/${testimonialId}`;

  it("replaces all editable fields and persists them", async () => {
    const res = await fetch(url(), {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: putBody(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe(testimonialId);
    expect(body.author).toBe("Bob");
    expect(body.role).toBe("Director");
    expect(body.contentEn).toBe("Updated content");
    expect(body.contentRw).toBe("Ibice bishya");
    expect(body.published).toBe(false);

    const persisted = await prisma.testimonial.findUniqueOrThrow({ where: { id: testimonialId } });
    expect(persisted.author).toBe("Bob");
    expect(persisted.role).toBe("Director");
    expect(persisted.contentEn).toBe("Updated content");
    expect(persisted.contentRw).toBe("Ibice bishya");
    expect(persisted.published).toBe(false);
  });

  it("defaults published to true when omitted", async () => {
    const res = await fetch(url(), {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: putBody({ published: undefined }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.published).toBe(true);

    const persisted = await prisma.testimonial.findUniqueOrThrow({ where: { id: testimonialId } });
    expect(persisted.published).toBe(true);
  });

  it("returns 400 VALIDATION with issues when author is missing", async () => {
    const res = await fetch(url(), {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: putBody({ author: undefined }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string; issues?: string[] };
    expect(body.error).toBe("VALIDATION");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues!.length).toBeGreaterThan(0);

    // Rejected edit must not have touched the stored row.
    const persisted = await prisma.testimonial.findUniqueOrThrow({ where: { id: testimonialId } });
    expect(persisted.author).toBe("Alice");
  });

  it("returns 404 NOT_FOUND for an unknown id", async () => {
    const res = await fetch(`${baseUrl}/api/admin/testimonials/does-not-exist`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: putBody(),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NOT_FOUND" });
  });

  it("does not mask a generic model failure as 404 — rethrows to the 500 handler", async () => {
    // The catch must label ONLY P2025 as not-found; a transient DB failure is a
    // real server error. Stub the model with a plain Error and assert the global
    // JSON handler returns 500, not a fake 404.
    vi.mocked(testimonialModel.update).mockRejectedValueOnce(new Error("connection lost"));

    const res = await fetch(url(), {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: putBody(),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "INTERNAL" });

    // Failed write must not have touched the stored row.
    const persisted = await prisma.testimonial.findUniqueOrThrow({ where: { id: testimonialId } });
    expect(persisted.author).toBe("Alice");
  });

  it("returns 401 without an admin token", async () => {
    const res = await fetch(url(), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: putBody(),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 for an invalid admin token", async () => {
    const res = await fetch(url(), {
      method: "PUT",
      headers: { authorization: "Bearer not-a-real-token", "content-type": "application/json" },
      body: putBody(),
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid or expired token" });
  });
});

describe("PATCH /api/admin/testimonials/:id (publish toggle, unchanged)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let testimonialId: string;

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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.testimonial.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.testimonial.deleteMany();
    const created = await prisma.testimonial.create({
      data: {
        author: "Alice",
        role: "Producer",
        contentEn: "Original content",
        contentRw: "Umurimo mwiza",
        published: true,
      },
    });
    testimonialId = created.id;
  });

  it("still toggles published and leaves the rest untouched", async () => {
    const res = await fetch(`${baseUrl}/api/admin/testimonials/${testimonialId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ published: false }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.published).toBe(false);

    const persisted = await prisma.testimonial.findUniqueOrThrow({ where: { id: testimonialId } });
    expect(persisted.published).toBe(false);
    expect(persisted.author).toBe("Alice");
    expect(persisted.contentEn).toBe("Original content");
  });
});

describe("PUT /api/admin/services/order (whole-list reorder)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  const services: { id: string }[] = [];

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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.service.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.service.deleteMany();
    services.length = 0;
    for (let i = 0; i < 3; i++) {
      const service = await prisma.service.create({
        data: {
          nameEn: `Service ${i}`,
          nameRw: `Izina ${i}`,
          priceEn: "$100",
          priceRw: "Rwf 100k",
          category: "audio",
          sortOrder: i,
        },
      });
      services.push({ id: service.id });
    }
  });

  const url = () => `${baseUrl}/api/admin/services/order`;

  const reorderCall = (body: unknown) =>
    fetch(url(), {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  it("persists a full-list replace and returns the re-sorted list", async () => {
    const res = await reorderCall([
      { id: services[2].id, sortOrder: 0 },
      { id: services[1].id, sortOrder: 1 },
      { id: services[0].id, sortOrder: 2 },
    ]);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; sortOrder: number }[];
    expect(body.map((s) => ({ id: s.id, sortOrder: s.sortOrder }))).toEqual([
      { id: services[2].id, sortOrder: 0 },
      { id: services[1].id, sortOrder: 1 },
      { id: services[0].id, sortOrder: 2 },
    ]);

    const persisted = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((s) => s.id)).toEqual([services[2].id, services[1].id, services[0].id]);
  });

  it("returns 409 STALE_COLLECTION for a strict subset and writes nothing", async () => {
    const res = await reorderCall([
      { id: services[0].id, sortOrder: 0 },
      { id: services[1].id, sortOrder: 1 },
    ]);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "STALE_COLLECTION",
      message: "Collection changed since load — refetch and retry",
    });

    const persisted = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((s) => s.sortOrder)).toEqual([0, 1, 2]);
  });

  it("returns 404 NOT_FOUND for an unknown id and writes nothing", async () => {
    const res = await reorderCall([
      { id: services[0].id, sortOrder: 0 },
      { id: `c${"a".repeat(24)}`, sortOrder: 1 },
    ]);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NOT_FOUND" });

    const persisted = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((s) => s.sortOrder)).toEqual([0, 1, 2]);
  });

  it("returns 400 VALIDATION for a duplicate id", async () => {
    const res = await reorderCall([
      { id: services[0].id, sortOrder: 0 },
      { id: services[0].id, sortOrder: 1 },
    ]);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContain("Duplicate id");
  });

  it("returns 400 VALIDATION for duplicate sortOrders", async () => {
    const res = await reorderCall([
      { id: services[0].id, sortOrder: 0 },
      { id: services[1].id, sortOrder: 0 },
    ]);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContain("Duplicate sortOrder");
  });

  it("returns 400 VALIDATION for a non-dense sortOrder", async () => {
    const res = await reorderCall([
      { id: services[0].id, sortOrder: 0 },
      { id: services[1].id, sortOrder: 2 },
    ]);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContain("sortOrder must be 0..n-1 ascending by array position");
  });

  it("returns 400 VALIDATION for a negative sortOrder", async () => {
    const res = await reorderCall([
      { id: services[0].id, sortOrder: -1 },
      { id: services[1].id, sortOrder: 0 },
    ]);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContain("Too small: expected number to be >=0");
  });

  it("returns 400 VALIDATION for a fractional sortOrder", async () => {
    const res = await reorderCall([
      { id: services[0].id, sortOrder: 0 },
      { id: services[1].id, sortOrder: 2.5 },
    ]);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContain("Invalid input: expected int, received number");
  });

  it("returns 400 VALIDATION for a malformed id", async () => {
    const res = await reorderCall([{ id: "not-a-cuid", sortOrder: 0 }]);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContain("Invalid id");
  });

  it("returns 400 VALIDATION for more than 500 entries", async () => {
    const big = Array.from({ length: 501 }, (_, i) => ({
      id: `c${i.toString(36).padStart(24, "0")}`,
      sortOrder: i,
    }));
    const res = await reorderCall(big);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContain("Too many entries");
  });

  it("returns 200 [] for an empty collection and an empty body", async () => {
    await prisma.service.deleteMany();
    const res = await reorderCall([]);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 409 STALE_COLLECTION for an empty body against a non-empty collection and writes nothing", async () => {
    const res = await reorderCall([]);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "STALE_COLLECTION",
      message: "Collection changed since load — refetch and retry",
    });

    const persisted = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((s) => s.sortOrder)).toEqual([0, 1, 2]);
  });

  it("returns 404 NOT_FOUND when a live row vanishes mid-write (P2025 race)", async () => {
    // A concurrent delete between the transaction's initial read and its writes
    // surfaces as P2025 inside reorder(). We cannot interleave a real second
    // transaction deterministically, so the model's reorder is stubbed to reject
    // with the exact Prisma error the race produces — the controller's mapping
    // (P2025 → 404, nothing written) is what's under test.
    vi.mocked(serviceModel.reorder).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Service no longer exists", {
        code: "P2025",
        clientVersion: "7.9.1",
      })
    );

    const res = await reorderCall([
      { id: services[0].id, sortOrder: 0 },
      { id: services[1].id, sortOrder: 1 },
      { id: services[2].id, sortOrder: 2 },
    ]);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NOT_FOUND" });

    const persisted = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((s) => s.sortOrder)).toEqual([0, 1, 2]);
  });

  it("returns 409 STALE_COLLECTION when the SERIALIZABLE transaction aborts (P2034)", async () => {
    // Two racing reorders on SERIALIZABLE abort with P2034 "could not serialize
    // access"; the client's view is stale. Stub the model with that exact Prisma
    // error and assert the controller maps it to the same 409 envelope the
    // frontend's stale-collection handling (reload + banner) already knows.
    vi.mocked(serviceModel.reorder).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("could not serialize access due to concurrent update", {
        code: "P2034",
        clientVersion: "7.9.1",
      })
    );

    const res = await reorderCall([
      { id: services[0].id, sortOrder: 0 },
      { id: services[1].id, sortOrder: 1 },
      { id: services[2].id, sortOrder: 2 },
    ]);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "STALE_COLLECTION",
      message: "Collection changed since load — refetch and retry",
    });

    const persisted = await prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((s) => s.sortOrder)).toEqual([0, 1, 2]);
  });
});

describe("PUT /api/admin/logos/order (whole-list reorder)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  const logos: { id: string }[] = [];

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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.clientLogo.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.clientLogo.deleteMany();
    logos.length = 0;
    for (let i = 0; i < 3; i++) {
      const logo = await prisma.clientLogo.create({ data: { name: `Logo ${i}`, sortOrder: i } });
      logos.push({ id: logo.id });
    }
  });

  it("persists a full-list replace and returns the re-sorted admin rows", async () => {
    const res = await fetch(`${baseUrl}/api/admin/logos/order`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([
        { id: logos[2].id, sortOrder: 0 },
        { id: logos[1].id, sortOrder: 1 },
        { id: logos[0].id, sortOrder: 2 },
      ]),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; name: string; sortOrder: number; createdAt: string }[];
    // Admin/DB row shape — includes sortOrder + createdAt (not the trimmed public shape).
    expect(body).toHaveLength(3);
    expect(body[0]).toEqual({
      id: logos[2].id,
      name: "Logo 2",
      url: null,
      imageUrl: null,
      sortOrder: 0,
      createdAt: expect.any(String),
    });
    expect(body.map((l) => ({ id: l.id, sortOrder: l.sortOrder }))).toEqual([
      { id: logos[2].id, sortOrder: 0 },
      { id: logos[1].id, sortOrder: 1 },
      { id: logos[0].id, sortOrder: 2 },
    ]);

    const persisted = await prisma.clientLogo.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((l) => l.id)).toEqual([logos[2].id, logos[1].id, logos[0].id]);
  });

  it("mirrors services: 409 STALE_COLLECTION for a strict subset and writes nothing", async () => {
    const res = await fetch(`${baseUrl}/api/admin/logos/order`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([
        { id: logos[0].id, sortOrder: 0 },
        { id: logos[1].id, sortOrder: 1 },
      ]),
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "STALE_COLLECTION",
      message: "Collection changed since load — refetch and retry",
    });

    const persisted = await prisma.clientLogo.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((l) => l.sortOrder)).toEqual([0, 1, 2]);
  });

  it("mirrors services: 404 NOT_FOUND for an unknown id and writes nothing", async () => {
    const res = await fetch(`${baseUrl}/api/admin/logos/order`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([
        { id: logos[0].id, sortOrder: 0 },
        { id: `c${"b".repeat(24)}`, sortOrder: 1 },
      ]),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NOT_FOUND" });

    const persisted = await prisma.clientLogo.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((l) => l.sortOrder)).toEqual([0, 1, 2]);
  });

  it("mirrors services: 400 VALIDATION for a duplicate id", async () => {
    const res = await fetch(`${baseUrl}/api/admin/logos/order`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([
        { id: logos[0].id, sortOrder: 0 },
        { id: logos[0].id, sortOrder: 1 },
      ]),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContain("Duplicate id");
  });

  it("mirrors services: 200 [] for an empty collection and an empty body", async () => {
    await prisma.clientLogo.deleteMany();
    const res = await fetch(`${baseUrl}/api/admin/logos/order`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([]),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("PUT /api/admin/portfolio/order (whole-list reorder)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  const items: { id: string }[] = [];

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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.portfolioItem.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.portfolioItem.deleteMany();
    items.length = 0;
    for (let i = 0; i < 3; i++) {
      const item = await prisma.portfolioItem.create({
        data: { titleEn: `Project ${i}`, category: "audio", coverUrl: `/uploads/proj-${i}.jpg`, sortOrder: i },
      });
      items.push({ id: item.id });
    }
  });

  it("persists a full-list replace and returns the re-sorted list", async () => {
    const res = await fetch(`${baseUrl}/api/admin/portfolio/order`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([
        { id: items[2].id, sortOrder: 0 },
        { id: items[1].id, sortOrder: 1 },
        { id: items[0].id, sortOrder: 2 },
      ]),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; sortOrder: number }[];
    expect(body.map((p) => ({ id: p.id, sortOrder: p.sortOrder }))).toEqual([
      { id: items[2].id, sortOrder: 0 },
      { id: items[1].id, sortOrder: 1 },
      { id: items[0].id, sortOrder: 2 },
    ]);

    const persisted = await prisma.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((p) => p.id)).toEqual([items[2].id, items[1].id, items[0].id]);
  });

  it("mirrors services: 409 STALE_COLLECTION for a strict subset and writes nothing", async () => {
    const res = await fetch(`${baseUrl}/api/admin/portfolio/order`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([
        { id: items[0].id, sortOrder: 0 },
        { id: items[1].id, sortOrder: 1 },
      ]),
    });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "STALE_COLLECTION",
      message: "Collection changed since load — refetch and retry",
    });

    const persisted = await prisma.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((p) => p.sortOrder)).toEqual([0, 1, 2]);
  });

  it("mirrors services: 404 NOT_FOUND for an unknown id and writes nothing", async () => {
    const res = await fetch(`${baseUrl}/api/admin/portfolio/order`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([
        { id: items[0].id, sortOrder: 0 },
        { id: `c${"b".repeat(24)}`, sortOrder: 1 },
      ]),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NOT_FOUND" });

    const persisted = await prisma.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } });
    expect(persisted.map((p) => p.sortOrder)).toEqual([0, 1, 2]);
  });

  it("mirrors services: 400 VALIDATION for a duplicate id", async () => {
    const res = await fetch(`${baseUrl}/api/admin/portfolio/order`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([
        { id: items[0].id, sortOrder: 0 },
        { id: items[0].id, sortOrder: 1 },
      ]),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: string[] };
    expect(body.error).toBe("VALIDATION");
    expect(body.issues).toContain("Duplicate id");
  });

  it("mirrors services: 200 [] for an empty collection and an empty body", async () => {
    await prisma.portfolioItem.deleteMany();
    const res = await fetch(`${baseUrl}/api/admin/portfolio/order`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([]),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/admin/uploads (non-string dataUrl → 400 VALIDATION, never a 500)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;

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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  const uploadCall = (dataUrl: unknown) =>
    fetch(`${baseUrl}/api/admin/uploads`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    });

  it("returns 400 VALIDATION for a numeric dataUrl instead of throwing a TypeError → 500", async () => {
    const res = await uploadCall(123);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "VALIDATION" });
  });

  it("returns 400 VALIDATION for an object dataUrl instead of throwing a TypeError → 500", async () => {
    const res = await uploadCall({ uri: "data:image/png;base64,AAAA" });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "VALIDATION" });
  });
});