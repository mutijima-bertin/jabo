import type { Request, Response } from "express";
import { z } from "zod";
import type { Testimonial } from "@prisma/client";
import { env } from "../config/env";
import * as clientModel from "../models/client.model";
import * as testimonialModel from "../models/testimonial.model";
import { createClientLoginToken, getClientByLoginToken, issueClientJwt } from "../services/clientAuth";
import { notifyClientLogin } from "../services/notifications";

const loginRequestSchema = z.object({
  email: z.string().email(),
});

// Client testimonial submission. Blank/omitted role and contentRw are stored as
// null (the frontend may omit role entirely). contentEn is trimmed before the
// 10-char minimum so "   hi   " can never sneak through.
const testimonialSubmissionSchema = z.object({
  role: z
    .string()
    .max(80)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
  contentEn: z.string().trim().min(10).max(1000),
  contentRw: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});

// Both client-testimonial endpoints return the same row shape; source/published
// always come from the stored row (an admin-published CLIENT row shows up true).
function testimonialPayload(t: Testimonial) {
  return {
    id: t.id,
    author: t.author,
    role: t.role,
    contentEn: t.contentEn,
    contentRw: t.contentRw,
    source: t.source,
    published: t.published,
    createdAt: t.createdAt,
  };
}

// Request a magic login link. Always 200 { ok: true } — never reveals whether the account exists.
export async function requestLogin(req: Request, res: Response): Promise<void> {
  const parsed = loginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();
  try {
    const client = await clientModel.findByEmailInsensitive(email);
    if (client) {
      const rawToken = await createClientLoginToken(client);
      const loginUrl = `${env.frontendUrl}/login?token=${rawToken}`;
      try {
        await notifyClientLogin(client, loginUrl);
      } catch (err) {
        // Email must never block the response.
        console.error("[clients:login-request:notify]", (err as Error).message);
      }
    }
  } catch (err) {
    console.error("[clients:login-request]", err);
    res.status(500).json({ error: "INTERNAL" });
    return;
  }
  res.json({ ok: true });
}

// Exchange a magic login token for a client JWT (tokens are single-use).
export async function exchangeLoginToken(req: Request, res: Response): Promise<void> {
  const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  try {
    const client = await getClientByLoginToken(token);
    if (!client) {
      res.status(401).json({ error: "INVALID_OR_EXPIRED_LINK" });
      return;
    }
    const jwt = issueClientJwt(client);
    res.json({ token: jwt, client: { id: client.id, name: client.name, email: client.email, phone: client.phone } });
  } catch (err) {
    console.error("[clients:login]", err);
    res.status(500).json({ error: "INTERNAL" });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const client = await clientModel.findByIdWithBookings(req.clientId!);
    if (!client) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    res.json({
      client: { id: client.id, name: client.name, email: client.email, phone: client.phone },
      bookings: client.bookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        serviceName: b.service.nameEn,
        eventDate: b.eventDate,
        location: b.location,
        budgetRange: b.budgetRange,
        status: b.status,
        createdAt: b.createdAt,
      })),
    });
  } catch (err) {
    console.error("[clients:me]", err);
    res.status(500).json({ error: "INTERNAL" });
  }
}

export async function getMyTestimonial(req: Request, res: Response): Promise<void> {
  try {
    const client = await clientModel.findByIdWithBookings(req.clientId!);
    if (!client) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const testimonial = await testimonialModel.findByClientId(client.id);
    if (!testimonial) {
      res.json({ testimonial: null });
      return;
    }
    res.json({ testimonial: testimonialPayload(testimonial) });
  } catch (err) {
    console.error("[clients:testimonials:me]", err);
    res.status(500).json({ error: "INTERNAL" });
  }
}

export async function postTestimonial(req: Request, res: Response): Promise<void> {
  const parsed = testimonialSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  try {
    const client = await clientModel.findByIdWithBookings(req.clientId!);
    if (!client) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const existing = await testimonialModel.findByClientId(client.id);
    if (existing) {
      res.status(409).json({ error: "ALREADY_SUBMITTED" });
      return;
    }
    // author ALWAYS comes from the client record — the request body cannot set it.
    const testimonial = await testimonialModel.createForClient({
      author: client.name,
      role: parsed.data.role,
      contentEn: parsed.data.contentEn,
      contentRw: parsed.data.contentRw,
      clientId: client.id,
    });
    res.status(201).json({ testimonial: testimonialPayload(testimonial) });
  } catch (err) {
    console.error("[clients:testimonials:post]", err);
    res.status(500).json({ error: "INTERNAL" });
  }
}