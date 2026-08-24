import { prisma } from "../config/db";
import type { Prisma } from "@prisma/client";

/**
 * Data-access for BlogPost. Public list must never leak drafts or markdown
 * bodies — explicit select only (POST_PUBLIC_FIELDS).
 */
export const POST_PUBLIC_FIELDS = {
  id: true,
  slug: true,
  titleEn: true,
  titleRw: true,
  excerptEn: true,
  excerptRw: true,
  contentType: true,
  coverImageUrl: true,
  views: true,
  likes: true,
  publishedAt: true,
} as const;

export type PostPublicSummary = Prisma.BlogPostGetPayload<{ select: typeof POST_PUBLIC_FIELDS }>;

export function listPublished(): Promise<PostPublicSummary[]> {
  return prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    select: POST_PUBLIC_FIELDS,
  });
}

/**
 * Single-query increment (TOCTOU-safe): UPDATE ... SET views = views + 1
 * WHERE slug = ... AND published RETURNING *. P2025 covers both "not found"
 * and "draft"; the returned record carries the post-increment count.
 */
export function incrementViewsBySlug(slug: string) {
  return prisma.blogPost.update({
    where: { slug, published: true },
    data: { views: { increment: 1 } },
  });
}

/** Only published posts are likeable — liking a draft hits P2025 → 404 (caller maps it). */
export function incrementLikesForPublished(id: string) {
  return prisma.blogPost.update({
    where: { id, published: true },
    data: { likes: { increment: 1 } },
  });
}

export function listAllAdmin() {
  return prisma.blogPost.findMany({ orderBy: { updatedAt: "desc" } });
}

export function findById(id: string) {
  return prisma.blogPost.findUnique({ where: { id } });
}

export function create(data: Prisma.BlogPostCreateInput) {
  return prisma.blogPost.create({ data });
}

export function updateById(id: string, data: Prisma.BlogPostUncheckedUpdateInput) {
  return prisma.blogPost.update({ where: { id }, data });
}

export function deleteById(id: string) {
  return prisma.blogPost.delete({ where: { id } });
}

/* ----- slug generation ----- */

// lowercase → strip accents → non-alphanumeric collapsed to "-" → trim edges; fallback "post".
// Capped at 80 chars (before uniqueSlug suffixing) so generated slugs stay URL-sane.
export function slugify(input: string): string {
  const base = (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    || "post"
  );
  return base.slice(0, 80).replace(/-+$/, "");
}

/**
 * Deterministic uniqueness: append -2, -3, ... until the slug is free.
 * excludeId lets a PATCH keep its own existing slug.
 */
export async function findFreeSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let n = 2;
  for (;;) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${n++}`;
  }
}
