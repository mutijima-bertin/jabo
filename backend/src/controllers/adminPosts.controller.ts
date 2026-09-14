import type { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import * as blogPostModel from "../models/blogPost.model";
import * as serviceModel from "../models/service.model";
import { pathParam } from "./params";

const POST_CONTENT_TYPES = ["PROJECT_RECAP", "CLIENT_STORY", "EDUCATIONAL", "STUDIO_NEWS"] as const;

const postSchema = z.object({
  // UI sends "" when the slug field is untouched — treat it the same way the cover
  // field treats "" (normalize to undefined) so the titleEn-derived slug runs;
  // explicit slugs still pass through unchanged. slugify is applied afterwards.
  slug: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().max(160).optional(),
  ),
  titleEn: z.string().min(1),
  titleRw: z.string().min(1),
  excerptEn: z.string().optional(),
  excerptRw: z.string().optional(),
  contentEn: z.string().min(1),
  contentRw: z.string().min(1),
  contentType: z.enum(POST_CONTENT_TYPES).default("PROJECT_RECAP"),
  // UI sends "" to mean "no cover" — normalise to undefined (NULL in DB) before regex check.
  coverImageUrl: z
    .preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().regex(/^\/uploads\//, "must be an uploaded /uploads/ path").optional(),
    ),
  published: z.boolean().default(false),
});

const postPatchSchema = z
  .object({
    slug: z.string().max(160).optional(),
    titleEn: z.string().min(1).optional(),
    titleRw: z.string().min(1).optional(),
    excerptEn: z.string().optional(),
    excerptRw: z.string().optional(),
    contentEn: z.string().min(1).optional(),
    contentRw: z.string().min(1).optional(),
    contentType: z.enum(POST_CONTENT_TYPES).optional(),
    coverImageUrl: z.preprocess(
      (v) => (v === "" ? null : v),
      z.string().nullable().optional(),
    ),
    published: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export async function listPosts(_req: Request, res: Response): Promise<void> {
  const posts = await blogPostModel.listAllAdmin();
  res.json(posts);
}

export async function getPost(req: Request, res: Response): Promise<void> {
  const post = await blogPostModel.findById(pathParam(req, "id"));
  if (!post) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  res.json(post);
}

export async function createPost(req: Request, res: Response): Promise<void> {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  const data = parsed.data;
  const slug = await blogPostModel.findFreeSlug(blogPostModel.slugify(data.slug ?? data.titleEn));
  try {
    const post = await blogPostModel.create({
      ...data,
      slug,
      publishedAt: data.published ? new Date() : null,
    });
    res.status(201).json(post);
  } catch (err) {
    // findFreeSlug is check-then-insert; a concurrent create can still trip the unique
    // constraint (P2002). Surface it as a conflict instead of an HTML 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Prisma 7 + pg driver adapter drops meta.target — the constraint surfaces only as
      // driverAdapterError ("UniqueConstraintViolation"). BlogPost's only unique field is
      // `slug`, so a P2002 with no target (or targeting slug) is always a slug conflict.
      const meta = err.meta as { target?: string | string[] } | undefined;
      const target = Array.isArray(meta?.target) ? meta.target.join(",") : meta?.target;
      if (target === undefined || target === "slug" || target.includes("slug")) {
        res.status(409).json({ error: "SLUG_CONFLICT" });
        return;
      }
    }
    console.error("[posts:create]", err);
    res.status(500).json({ error: "INTERNAL" });
  }
}

export async function patchPost(req: Request, res: Response): Promise<void> {
  const parsed = postPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  const data = parsed.data;
  const existing = await blogPostModel.findById(pathParam(req, "id"));
  if (!existing) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  const update: Prisma.BlogPostUncheckedUpdateInput = { ...data };
  let finalSlug: string | undefined;
  if (data.slug !== undefined) {
    finalSlug = await blogPostModel.findFreeSlug(blogPostModel.slugify(data.slug), existing.id);
    update.slug = finalSlug;
  }
  // First publish: set publishedAt. Unpublish or already-published → never touch it.
  if (data.published === true && existing.publishedAt === null) {
    update.publishedAt = new Date();
  }
  // Keep the deep-dive Service links in sync with the post lifecycle:
  // unpublish clears every link (and wins over a simultaneous re-slug);
  // a slug rename repoints links onto the final free-slug value. Everything
  // else (first publish/republish, content edits) leaves links untouched.
  const serviceWrites: Prisma.PrismaPromise<Prisma.BatchPayload>[] = [];
  if (data.published === false && existing.published === true) {
    serviceWrites.push(serviceModel.clearLinkedPostSlug(existing.slug));
  } else if (data.slug !== undefined && finalSlug !== undefined && existing.slug !== finalSlug && data.published !== false) {
    serviceWrites.push(serviceModel.repointLinkedPostSlug(existing.slug, finalSlug));
  }
  // Post write MUST be first — atomic with the service cleanup.
  const [post] = await prisma.$transaction([
    blogPostModel.updateById(existing.id, update),
    ...serviceWrites,
  ]);
  res.json(post);
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  const post = await blogPostModel.findById(pathParam(req, "id"));
  if (!post) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  try {
    // delete + link cleanup commit atomically; a concurrent delete still trips
    // P2025 below (404), and the catch-back covers check-then-act races.
    await prisma.$transaction([
      blogPostModel.deleteById(post.id),
      serviceModel.clearLinkedPostSlug(post.slug),
    ]);
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "NOT_FOUND" });
  }
}
