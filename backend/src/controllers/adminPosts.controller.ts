import type { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import * as blogPostModel from "../models/blogPost.model";
import { pathParam } from "./params";

const POST_CONTENT_TYPES = ["PROJECT_RECAP", "CLIENT_STORY", "EDUCATIONAL", "STUDIO_NEWS"] as const;

const postSchema = z.object({
  slug: z.string().max(160).optional(),
  titleEn: z.string().min(1),
  titleRw: z.string().min(1),
  excerptEn: z.string().optional(),
  excerptRw: z.string().optional(),
  contentEn: z.string().min(1),
  contentRw: z.string().min(1),
  contentType: z.enum(POST_CONTENT_TYPES).default("PROJECT_RECAP"),
  coverImageUrl: z
    .string()
    .regex(/^\/uploads\//, "must be an uploaded /uploads/ path")
    .optional(), // NOTE: rejects null by contract — the UI sends "" instead.
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
    coverImageUrl: z.string().optional(),
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
  if (data.slug !== undefined) {
    update.slug = await blogPostModel.findFreeSlug(blogPostModel.slugify(data.slug), existing.id);
  }
  // First publish: set publishedAt. Unpublish or already-published → never touch it.
  if (data.published === true && existing.publishedAt === null) {
    update.publishedAt = new Date();
  }
  const post = await blogPostModel.updateById(existing.id, update);
  res.json(post);
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  try {
    await blogPostModel.deleteById(pathParam(req, "id"));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "NOT_FOUND" });
  }
}
