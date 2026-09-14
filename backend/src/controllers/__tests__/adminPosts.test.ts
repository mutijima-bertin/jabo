import type { Server } from "http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";
import { prisma } from "../../config/db";
import { signAdminToken } from "../../services/auth";
import * as blogPostModel from "../../models/blogPost.model";

// Auto-spy all blogPost.model exports (originals still run); only the delete-race
// test swaps a write in so the controller's P2025 → 404 mapping is provable
// without a real concurrent transaction.
vi.mock("../../models/blogPost.model", { spy: true });

// Deep-dive Service links (linkedPostSlug) must follow the BlogPost lifecycle:
// delete/unpublish clears them, a slug rename repoints them — atomically with
// the post write itself.

describe("DELETE /api/admin/posts/:id (clears linkedPostSlug)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let postId: string;
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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    const post = await prisma.blogPost.create({
      data: {
        slug: "deep-dive-mixing",
        titleEn: "Mixing deep dive",
        titleRw: "Ibanga ryo kuvanga",
        contentEn: "Body",
        contentRw: "Umubiri",
        published: true,
      },
    });
    const service = await prisma.service.create({
      data: {
        nameEn: "Mixing",
        nameRw: "Kuvanga",
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: "audio",
        linkedPostSlug: post.slug,
      },
    });
    postId = post.id;
    serviceId = service.id;
  });

  it("deletes the post and nulls every service linked to its slug", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts/${postId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(await prisma.blogPost.findUnique({ where: { id: postId } })).toBeNull();
    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    expect(service.linkedPostSlug).toBeNull();
  });
});

describe("PATCH /api/admin/posts/:id (unpublish clears linkedPostSlug)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let postId: string;
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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    const post = await prisma.blogPost.create({
      data: {
        slug: "live-post",
        titleEn: "Live post",
        titleRw: "Inyandiko",
        contentEn: "Body",
        contentRw: "Umubiri",
        published: true,
        publishedAt: new Date(),
      },
    });
    const service = await prisma.service.create({
      data: {
        nameEn: "Mixing",
        nameRw: "Kuvanga",
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: "audio",
        linkedPostSlug: post.slug,
      },
    });
    postId = post.id;
    serviceId = service.id;
  });

  it("unpublishes the post and clears every service linked to its slug", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts/${postId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ published: false }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { published?: boolean };
    expect(body.published).toBe(false);

    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    expect(service.linkedPostSlug).toBeNull();

    const post = await prisma.blogPost.findUniqueOrThrow({ where: { id: postId } });
    expect(post.published).toBe(false);
  });
});

describe("PATCH /api/admin/posts/:id (slug rename repoints linkedPostSlug)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let postId: string;
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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    const post = await prisma.blogPost.create({
      data: {
        slug: "old-slug",
        titleEn: "Old slug",
        titleRw: "Izina rya kera",
        contentEn: "Body",
        contentRw: "Umubiri",
        published: true,
        publishedAt: new Date(),
      },
    });
    const service = await prisma.service.create({
      data: {
        nameEn: "Mixing",
        nameRw: "Kuvanga",
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: "audio",
        linkedPostSlug: post.slug,
      },
    });
    postId = post.id;
    serviceId = service.id;
  });

  it("renames the slug and repoints every linked service onto the new slug", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts/${postId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ slug: "new-slug" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { slug?: string };
    expect(body.slug).toBe("new-slug");

    const post = await prisma.blogPost.findUniqueOrThrow({ where: { id: postId } });
    expect(post.slug).toBe("new-slug");

    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    expect(service.linkedPostSlug).toBe("new-slug");
  });
});

describe("PATCH /api/admin/posts/:id (unpublish + rename — clear wins over repoint)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let postId: string;
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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    const post = await prisma.blogPost.create({
      data: {
        slug: "clear-wins-slug",
        titleEn: "Clear wins",
        titleRw: "Ibyatsinzwe",
        contentEn: "Body",
        contentRw: "Umubiri",
        published: true,
        publishedAt: new Date(),
      },
    });
    const service = await prisma.service.create({
      data: {
        nameEn: "Mixing",
        nameRw: "Kuvanga",
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: "audio",
        linkedPostSlug: post.slug,
      },
    });
    postId = post.id;
    serviceId = service.id;
  });

  it("unpublishes, renames the post, and clears links without also repointing them", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts/${postId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ published: false, slug: "renamed-while-unpublishing" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { slug?: string; published?: boolean };
    expect(body.slug).toBe("renamed-while-unpublishing");
    expect(body.published).toBe(false);

    // The rename still lands on the post itself…
    const post = await prisma.blogPost.findUniqueOrThrow({ where: { id: postId } });
    expect(post.slug).toBe("renamed-while-unpublishing");
    // …but the clear branch wins over the repoint branch for linked services.
    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    expect(service.linkedPostSlug).toBeNull();
  });
});

describe("PATCH /api/admin/posts/:id (publish while renaming — repoints links)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let postId: string;
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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    const post = await prisma.blogPost.create({
      data: {
        slug: "draft-slug",
        titleEn: "Draft",
        titleRw: "Umusaruro",
        contentEn: "Body",
        contentRw: "Umubiri",
        published: false,
        publishedAt: null,
      },
    });
    const service = await prisma.service.create({
      data: {
        nameEn: "Mixing",
        nameRw: "Kuvanga",
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: "audio",
        linkedPostSlug: post.slug,
      },
    });
    postId = post.id;
    serviceId = service.id;
  });

  it("publishes, renames, stamps publishedAt, and repoints every linked service", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts/${postId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ published: true, slug: "published-under-new-slug" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { slug?: string; published?: boolean };
    expect(body.slug).toBe("published-under-new-slug");
    expect(body.published).toBe(true);

    const post = await prisma.blogPost.findUniqueOrThrow({ where: { id: postId } });
    expect(post.slug).toBe("published-under-new-slug");
    expect(post.published).toBe(true);
    expect(post.publishedAt).not.toBeNull();

    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    expect(service.linkedPostSlug).toBe("published-under-new-slug");
  });
});

describe("PATCH /api/admin/posts/:id (first publish / content edits / same-slug — links untouched)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let postId: string;
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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    const post = await prisma.blogPost.create({
      data: {
        slug: "untouched-links",
        titleEn: "Untouched",
        titleRw: "Umutungo",
        contentEn: "Body",
        contentRw: "Umubiri",
        published: false,
        publishedAt: null,
      },
    });
    const service = await prisma.service.create({
      data: {
        nameEn: "Mixing",
        nameRw: "Kuvanga",
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: "audio",
        linkedPostSlug: post.slug,
      },
    });
    postId = post.id;
    serviceId = service.id;
  });

  it("first publish leaves every linked service untouched", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts/${postId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ published: true }),
    });

    expect(res.status).toBe(200);
    const post = await prisma.blogPost.findUniqueOrThrow({ where: { id: postId } });
    expect(post.published).toBe(true);
    expect(post.publishedAt).not.toBeNull();

    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    expect(service.linkedPostSlug).toBe("untouched-links");
  });

  it("editing another field leaves every linked service untouched", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts/${postId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ titleEn: "A brand new title" }),
    });

    expect(res.status).toBe(200);
    const post = await prisma.blogPost.findUniqueOrThrow({ where: { id: postId } });
    expect(post.titleEn).toBe("A brand new title");
    expect(post.slug).toBe("untouched-links");

    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    expect(service.linkedPostSlug).toBe("untouched-links");
  });

  it("renaming a slug to itself is a no-op for linked services", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts/${postId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ slug: "untouched-links" }),
    });

    expect(res.status).toBe(200);
    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    expect(service.linkedPostSlug).toBe("untouched-links");
  });
});

describe("PATCH/DELETE /api/admin/posts/:id (missing post → 404)", () => {
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
    await prisma.blogPost.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("returns 404 NOT_FOUND when patching an unknown post id", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts/does-not-exist`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ titleEn: "x" }),
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NOT_FOUND" });
  });

  it("returns 404 NOT_FOUND when deleting an unknown post id", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts/does-not-exist`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NOT_FOUND" });
  });
});

describe("DELETE /api/admin/posts/:id (delete race — P2025 → 404)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let postId: string;
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
    token = signAdminToken("test-admin");
  });

  afterAll(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    const post = await prisma.blogPost.create({
      data: {
        slug: "race-delete",
        titleEn: "Race delete",
        titleRw: "Gusiba",
        contentEn: "Body",
        contentRw: "Umubiri",
        published: true,
      },
    });
    const service = await prisma.service.create({
      data: {
        nameEn: "Mixing",
        nameRw: "Kuvanga",
        priceEn: "$100",
        priceRw: "Rwf 100k",
        category: "audio",
        linkedPostSlug: post.slug,
      },
    });
    postId = post.id;
    serviceId = service.id;
  });

  it("maps a mid-delete P2025 to 404 and leaves the row + links untouched", async () => {
    // deletePost checks the post exists, then commits [delete, clearLinks] in one
    // transaction. A concurrent delete between the check and the commit makes the
    // real delete throw P2025. We can't interleave a real second transaction
    // deterministically, so the model's deleteById is swapped for a real Prisma
    // delete against an unknown id — the exact P2025 the race produces, flowing
    // through the real $transaction machinery.
    vi.mocked(blogPostModel.deleteById).mockImplementationOnce(() =>
      prisma.blogPost.delete({ where: { id: `c${"a".repeat(24)}` } })
    );

    const res = await fetch(`${baseUrl}/api/admin/posts/${postId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "NOT_FOUND" });

    // Nothing was committed: the post and its links are untouched.
    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    expect(post).not.toBeNull();
    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    expect(service.linkedPostSlug).toBe("race-delete");
  });
});

describe("POST /api/admin/posts (empty slug derives from titleEn)", () => {
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
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
  });

  const createCall = (titleEn: string, titleRw: string) =>
    fetch(`${baseUrl}/api/admin/posts`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        // The admin editor always sends slug:"" unless the founder typed one.
        slug: "",
        titleEn,
        titleRw,
        contentEn: "Body",
        contentRw: "Umubiri",
        published: false,
      }),
    });

  it("normalizes slug:'' to a titleEn-derived slug instead of 'post'", async () => {
    const res = await createCall("Our First Wedding Film", "Filime yacu ya mbere");

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; slug: string };
    expect(body.slug).toBe("our-first-wedding-film");

    const persisted = await prisma.blogPost.findUniqueOrThrow({ where: { id: body.id } });
    expect(persisted.slug).toBe("our-first-wedding-film");
  });

  it("free-slugs a derived slug that collides with an existing post", async () => {
    const first = await createCall("Our First Wedding Film", "Filime yacu ya mbere");
    expect(first.status).toBe(201);

    const second = await createCall("Our First Wedding Film", "Filime ya kabiri");
    expect(second.status).toBe(201);
    const body = (await second.json()) as { id: string; slug: string };
    expect(body.slug).toBe("our-first-wedding-film-2");
  });

  it("still honors an explicit slug on create", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        slug: "explicit-slug",
        titleEn: "Our First Wedding Film",
        titleRw: "Filime yacu",
        contentEn: "Body",
        contentRw: "Umubiri",
        published: false,
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; slug: string };
    expect(body.slug).toBe("explicit-slug");

    const persisted = await prisma.blogPost.findUniqueOrThrow({ where: { id: body.id } });
    expect(persisted.slug).toBe("explicit-slug");
  });
});

describe("PATCH /api/admin/posts/:id (explicit slug changes unaffected by create-side normalization)", () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let postId: string;

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
    await prisma.blogPost.deleteMany();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    await prisma.service.deleteMany();
    await prisma.blogPost.deleteMany();
    const post = await prisma.blogPost.create({
      data: {
        slug: "before-rename",
        titleEn: "Before rename",
        titleRw: "Mbere yo kwitirwa",
        contentEn: "Body",
        contentRw: "Umubiri",
        published: false,
      },
    });
    postId = post.id;
  });

  it("still applies an explicit slug change through patchPost", async () => {
    const res = await fetch(`${baseUrl}/api/admin/posts/${postId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ slug: "renamed-explicitly" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { slug: string };
    expect(body.slug).toBe("renamed-explicitly");

    const persisted = await prisma.blogPost.findUniqueOrThrow({ where: { id: postId } });
    expect(persisted.slug).toBe("renamed-explicitly");
  });
});