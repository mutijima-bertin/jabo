import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import * as clientModel from "../models/client.model";
import { createClientLoginToken, getClientByLoginToken, issueClientJwt } from "../services/clientAuth";
import { notifyClientLogin } from "../services/notifications";

const loginRequestSchema = z.object({
  email: z.string().email(),
});

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
