import type { Request, Response } from "express";
import { z } from "zod";
import * as serviceModel from "../models/service.model";
import * as portfolioModel from "../models/portfolioItem.model";
import * as clientLogoModel from "../models/clientLogo.model";
import * as testimonialModel from "../models/testimonial.model";
import * as siteSettingModel from "../models/siteSetting.model";
import { isAllowedMime, saveDataUrl } from "../services/storage";
import { pathParam } from "./params";

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

// ---------- Portfolio ----------
const portfolioSchema = z.object({
  titleEn: z.string().min(1),
  titleRw: z.string().optional(),
  category: z.string().min(1),
  clientName: z.string().optional(),
  tags: z.array(z.string()).default([]),
  coverUrl: z.string().min(1),
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

// ---------- Uploads (drag-and-drop) ----------
export async function upload(req: Request, res: Response): Promise<void> {
  const { dataUrl } = req.body as { dataUrl?: string };
  if (!dataUrl) {
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
    res.status(500).json({ error: "INTERNAL" });
  }
}

// ---------- Client logos ----------
const logoSchema = z.object({ name: z.string().min(1), url: z.string().optional(), imageUrl: z.string().optional(), sortOrder: z.number().default(0) });

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
