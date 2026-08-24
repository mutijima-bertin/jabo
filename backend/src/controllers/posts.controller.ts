import type { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import * as blogPostModel from "../models/blogPost.model";
import { pathParam } from "./params";

// Prisma @default(cuid()) generates cuid/cuid2: "c" + 24 lowercase base36 chars.
const postIdParamSchema = z.string().regex(/^c[a-z0-9]{24}$/, "Invalid post id");

export async function listPosts(_req: Request, res: Response): Promise<void> {
  const posts = await blogPostModel.listPublished();
  res.json(posts);
}

export async function getPostBySlug(req: Request, res: Response): Promise<void> {
  try {
    const post = await blogPostModel.incrementViewsBySlug(pathParam(req, "slug"));
    res.json(post);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    console.error("[posts:get]", err);
    res.status(500).json({ error: "INTERNAL" });
  }
}

export async function likePost(req: Request, res: Response): Promise<void> {
  const parsed = postIdParamSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION" });
    return;
  }
  try {
    const post = await blogPostModel.incrementLikesForPublished(parsed.data);
    res.json({ ok: true, likes: post.likes });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    console.error("[posts:like]", err);
    res.status(500).json({ error: "INTERNAL" });
  }
}
