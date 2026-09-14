import type { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import * as serviceModel from "../models/service.model";
import * as portfolioModel from "../models/portfolioItem.model";
import * as clientLogoModel from "../models/clientLogo.model";
import * as testimonialModel from "../models/testimonial.model";
import * as siteSettingModel from "../models/siteSetting.model";
import { ReorderError } from "../models/errors";
import { isAllowedMime, saveDataUrl } from "../services/storage";
import {
  PORTFOLIO_CATEGORIES,
  normalizePortfolioCategory,
  type PortfolioCategory,
} from "../config/constants";
import { pathParam } from "./params";

// ---------- Whole-list reorder (shared by services / portfolio / logos) ----------
// The client sends the FULL list as a raw array (no wrapper): dense sortOrder
// 0..n-1 ascending by array position. Any failure → nothing is written.
const CUID = z.string().regex(/^c[a-z0-9]{24}$/, "Invalid id");

const reorderSchema = z
  .array(z.object({ id: CUID, sortOrder: z.number().int().min(0) }))
  .max(500, "Too many entries")
  .refine((entries) => new Set(entries.map((e) => e.id)).size === entries.length, {
    message: "Duplicate id",
  })
  .refine((entries) => new Set(entries.map((e) => e.sortOrder)).size === entries.length, {
    message: "Duplicate sortOrder",
  })
  .refine((entries) => entries.every((e, i) => e.sortOrder === i), {
    message: "sortOrder must be 0..n-1 ascending by array position",
  });

// Mirrors the per-id P2025 catch: model-layer labeled errors map to 404/409,
// anything unexpected propagates to the global JSON error handler (500).
function mapReorderError(res: Response, err: unknown): void {
  if (err instanceof ReorderError) {
    if (err.kind === "NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    res.status(409).json({ error: "STALE_COLLECTION", message: err.message });
    return;
  }
  // SERIALIZABLE isolation: two racing reorders abort with P2034 — the client's
  // view is exactly as stale as the STALE_COLLECTION label, so it gets the same
  // 409 envelope (frontend reload + banner) and self-heals.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
    res.status(409).json({
      error: "STALE_COLLECTION",
      message: "Collection changed since load — refetch and retry",
    });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  throw err;
}

// ---------- Services ----------
const serviceSchema = z.object({
  nameEn: z.string().min(1),
  nameRw: z.string().min(1),
  descriptionEn: z.string().optional(),
  descriptionRw: z.string().optional(),
  priceEn: z.string().min(1),
  priceRw: z.string().min(1),
  category: z.string().min(1),
  icon: z.string().optional(),
  // Same contract as BlogPost.coverImageUrl: rejects null by design — the UI sends "" to clear.
  // Must be an uploaded /uploads/... path — external/garbage URLs would crash
  // next/image rendering on the public site (admin-trusted input, still bounded).
  // "" is normalised to null (NULL in DB) so the regex only sees real paths.
  imageUrl: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().regex(/^\/uploads\//, "must be an uploaded /uploads/ path").nullable().optional(),
  ),
  linkedPostSlug: z.string().max(160).optional(), // deep-dive BlogPost slug; no FK by design
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export async function listServices(_req: Request, res: Response): Promise<void> {
  res.json(await serviceModel.listAll());
}

export async function createService(req: Request, res: Response): Promise<void> {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  const service = await serviceModel.create(parsed.data);
  res.status(201).json(service);
}

export async function updateService(req: Request, res: Response): Promise<void> {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  try {
    const service = await serviceModel.updateById(pathParam(req, "id"), parsed.data);
    res.json(service);
  } catch {
    res.status(404).json({ error: "NOT_FOUND" });
  }
}

export async function deleteService(req: Request, res: Response): Promise<void> {
  try {
    await serviceModel.deleteById(pathParam(req, "id"));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "NOT_FOUND" });
  }
}

export async function reorderServices(req: Request, res: Response): Promise<void> {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  try {
    res.json(await serviceModel.reorder(parsed.data));
  } catch (err) {
    mapReorderError(res, err);
  }
}

// ---------- Portfolio ----------
// Blueprint §5.1: the public grid exact-matches six canonical labels, so the
// admin API accepts case/singular variants but stores ONLY canonical values;
// anything else is rejected with the allowed list in the message.
const portfolioCategorySchema = z
  .string()
  .min(1)
  .transform((value) => normalizePortfolioCategory(value))
  .refine((category): category is PortfolioCategory => category !== null, {
    message: `category must be one of: ${PORTFOLIO_CATEGORIES.join(", ")}`,
  });

const portfolioSchema = z.object({
  titleEn: z.string().min(1),
  titleRw: z.string().optional(),
  category: portfolioCategorySchema,
  clientName: z.string().optional(),
  tags: z.array(z.string()).default([]),
  // Same contract as the posts cover: only uploaded /uploads/ paths are allowed.
  // "" is normalised to undefined so the regex only sees real values.
  coverUrl: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().regex(/^\/uploads\//, "must be an uploaded /uploads/ path"),
  ),
  mediaUrls: z.array(z.string()).default([]),
  mediaType: z.enum(["image", "video"]).default("image"),
  published: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export async function listPortfolio(_req: Request, res: Response): Promise<void> {
  res.json(await portfolioModel.listAll());
}

export async function createPortfolioItem(req: Request, res: Response): Promise<void> {
  const parsed = portfolioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  const item = await portfolioModel.create(parsed.data);
  res.status(201).json(item);
}

export async function updatePortfolioItem(req: Request, res: Response): Promise<void> {
  const parsed = portfolioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  try {
    const item = await portfolioModel.updateById(pathParam(req, "id"), parsed.data);
    res.json(item);
  } catch {
    res.status(404).json({ error: "NOT_FOUND" });
  }
}

export async function deletePortfolioItem(req: Request, res: Response): Promise<void> {
  try {
    await portfolioModel.deleteById(pathParam(req, "id"));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "NOT_FOUND" });
  }
}

export async function reorderPortfolio(req: Request, res: Response): Promise<void> {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  try {
    res.json(await portfolioModel.reorder(parsed.data));
  } catch (err) {
    mapReorderError(res, err);
  }
}

// ---------- Uploads (drag-and-drop) ----------
export async function upload(req: Request, res: Response): Promise<void> {
  const { dataUrl } = req.body as { dataUrl?: unknown };
  // dataUrl must be a string; a truthy non-string ({"dataUrl":123}) would throw on
  // .match() below and surface as a 500 — guard it into the same 400 VALIDATION
  // envelope as the missing-field branch.
  if (typeof dataUrl !== "string" || dataUrl === "") {
    res.status(400).json({ error: "VALIDATION" });
    return;
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  const mime = match?.[1] ?? "";
  if (!match || !isAllowedMime(mime)) {
    res.status(400).json({ error: "UNSUPPORTED_FILE_TYPE" });
    return;
  }
  try {
    const url = await saveDataUrl(dataUrl, mime);
    res.status(201).json({ url });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "FILE_TOO_LARGE") {
      res.status(413).json({ error: "FILE_TOO_LARGE" });
      return;
    }
    if (msg === "CONTENT_MISMATCH") {
      res.status(422).json({ error: "CONTENT_MISMATCH", message: "File content does not match its declared type" });
      return;
    }
    if (msg === "IMAGE_PROCESSING_FAILED") {
      res.status(422).json({ error: "IMAGE_PROCESSING_FAILED", message: "Image could not be processed" });
      return;
    }
    res.status(500).json({ error: "INTERNAL" });
  }
}

// ---------- Client logos ----------
// Logos may legitimately be hosted externally (http/https) OR live on /uploads/;
// "" is normalised to undefined (NULL in DB) so clearing an image still works.
const logoSchema = z.object({
  name: z.string().min(1),
  url: z.string().optional(),
  imageUrl: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().regex(/^(\/uploads\/|https?:\/\/)/, "must be an uploaded /uploads/ path or an http(s) URL").optional(),
  ),
  sortOrder: z.number().default(0),
});

export async function listLogos(_req: Request, res: Response): Promise<void> {
  res.json(await clientLogoModel.listAll());
}

export async function createLogo(req: Request, res: Response): Promise<void> {
  const parsed = logoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION" });
    return;
  }
  res.status(201).json(await clientLogoModel.create(parsed.data));
}

export async function deleteLogo(req: Request, res: Response): Promise<void> {
  try {
    await clientLogoModel.deleteById(pathParam(req, "id"));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "NOT_FOUND" });
  }
}

export async function reorderLogos(req: Request, res: Response): Promise<void> {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  try {
    res.json(await clientLogoModel.reorder(parsed.data));
  } catch (err) {
    mapReorderError(res, err);
  }
}

// ---------- Testimonials ----------
const testimonialSchema = z.object({
  author: z.string().min(1),
  role: z.string().optional(),
  contentEn: z.string().min(1),
  contentRw: z.string().optional(),
  published: z.boolean().default(true),
});

export async function listTestimonials(_req: Request, res: Response): Promise<void> {
  res.json(await testimonialModel.listAll());
}

export async function createTestimonial(req: Request, res: Response): Promise<void> {
  const parsed = testimonialSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION" });
    return;
  }
  res.status(201).json(await testimonialModel.create(parsed.data));
}

// Publish toggle only — the public feed's published-only filter is the approval gate.
const testimonialPatchSchema = z.strictObject({
  published: z.boolean(),
});

export async function patchTestimonial(req: Request, res: Response): Promise<void> {
  const parsed = testimonialPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  try {
    const testimonial = await testimonialModel.update(pathParam(req, "id"), parsed.data);
    res.json(testimonial);
  } catch {
    res.status(404).json({ error: "NOT_FOUND" });
  }
}

// Full replace from the admin panel — spec §8 lets the founder edit
// author/role/contentEn/contentRw/published together, so PUT sends the whole
// field set (published omitted → true, same default as create).
const testimonialEditSchema = z.object({
  author: z.string().min(1),
  role: z.string().optional(),
  contentEn: z.string().min(1),
  contentRw: z.string().optional(),
  published: z.boolean().default(true),
});

export async function putTestimonial(req: Request, res: Response): Promise<void> {
  const parsed = testimonialEditSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  try {
    const testimonial = await testimonialModel.update(pathParam(req, "id"), parsed.data);
    res.json(testimonial);
  } catch (err) {
    // A missing row is the only expected mid-write failure (P2025 → 404). Anything
    // else (connection loss, constraint, serialization abort) is a genuine server
    // error — rethrow so the global JSON handler returns 500, never a fake 404.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }
    throw err;
  }
}

export async function deleteTestimonial(req: Request, res: Response): Promise<void> {
  try {
    await testimonialModel.deleteById(pathParam(req, "id"));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "NOT_FOUND" });
  }
}

// ---------- Site settings ----------
export async function listSettings(_req: Request, res: Response): Promise<void> {
  res.json(await siteSettingModel.listAll());
}

const ALLOWED_SETTING_KEYS = new Set(["hero_title", "hero_badge", "hero_subtitle", "about_story", "contact_email", "contact_phone", "contact_location"]);
const settingsSchema = z.array(
  z.object({
    key: z.string().refine((k) => ALLOWED_SETTING_KEYS.has(k), "Unknown setting key"),
    locale: z.enum(["en", "rw"]).default("en"),
    value: z.string().max(4000),
  })
);

export async function replaceSettings(req: Request, res: Response): Promise<void> {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION" });
    return;
  }
  await siteSettingModel.upsertBatch(parsed.data);
  res.json({ ok: true });
}
