import type { Request, Response } from "express";
import { z } from "zod";
import * as serviceModel from "../models/service.model";
import * as portfolioModel from "../models/portfolioItem.model";
import * as clientLogoModel from "../models/clientLogo.model";
import * as testimonialModel from "../models/testimonial.model";
import * as siteSettingModel from "../models/siteSetting.model";
import { notifyAdminContactMessage, runFireAndForget } from "../services/notifications";
import { notifyAdmin } from "../services/adminNotifications";
import * as contactMessageModel from "../models/contactMessage.model";

/** Public, unauthenticated catalog reads (published rows only where applicable). */

export async function listServices(_req: Request, res: Response): Promise<void> {
  const services = await serviceModel.listPublished();
  res.json(services);
}

export async function listPortfolio(_req: Request, res: Response): Promise<void> {
  const items = await portfolioModel.listPublished();
  res.json(items);
}

export async function listLogos(_req: Request, res: Response): Promise<void> {
  const logos = await clientLogoModel.listAll();
  res.json(logos);
}

export async function listTestimonials(_req: Request, res: Response): Promise<void> {
  const items = await testimonialModel.listPublished();
  res.json(items);
}

export async function getSettings(_req: Request, res: Response): Promise<void> {
  const settings = await siteSettingModel.listAll();
  res.json(settings);
}

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is required")
    .max(120)
    .refine((v) => !/[\r\n\x00-\x1f]/.test(v), { message: "Name contains invalid characters" }),
  email: z.string().email("A valid email is required"),
  phone: z
    .string()
    .optional()
    .transform((v) => (v ?? "").replace(/\s+/g, ""))
    .pipe(
      z
        .string()
        .refine((v) => v === "" || /^\+[1-9]\d{7,14}$/.test(v), {
          message: "Phone must be a valid international number, e.g. +2507XXXXXXXX",
        }),
    )
    // Empty/whitespace-only → undefined so the dispatcher stores/renders "—".
    .transform((v) => (v === "" ? undefined : v)),
  subject: z
    .string()
    .trim()
    .min(3, "Subject is required")
    .max(200)
    .refine((v) => !/[\r\n\x00-\x1f]/.test(v), { message: "Subject contains invalid characters" }),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(3000),
  language: z.enum(["en", "rw"]).default("en"),
});

/**
 * Public contact form: POST /contact. Validates, then dispatches the
 * admin email in the background — the 201 response never waits on the send.
 * Also stores a ContactMessage row (Tier-2 inbox seed) and writes the in-app
 * NEW_CONTACT_MESSAGE bell row — both fire-and-forget via the same helper, so
 * the synchronous 201 { ok: true } contract is unchanged.
 */
export async function contact(req: Request, res: Response): Promise<void> {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) });
    return;
  }
  const input = parsed.data;
  runFireAndForget(() =>
    notifyAdminContactMessage({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      subject: input.subject,
      message: input.message,
      language: input.language,
    })
  );
  // Store the message + raise the bell notification. Combined in one detached
  // job so the row id can seed the bell payload; failures are swallowed (never
  // await-able before the response).
  runFireAndForget(async () => {
    const row = await contactMessageModel.create({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      subject: input.subject,
      message: input.message,
      language: input.language,
    });
    await notifyAdmin(
      "NEW_CONTACT_MESSAGE",
      {
        id: row.id,
        name: row.name,
        email: row.email,
        subject: row.subject,
        messagePreview: row.message.slice(0, 200),
        language: row.language,
      },
      "?tab=dashboard&attention=contact"
    );
  });
  res.status(201).json({ ok: true });
}
