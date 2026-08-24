import crypto from "crypto";
import type { Client } from "@prisma/client";
import { signClientToken } from "./auth";
import * as clientModel from "../models/client.model";

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function hashLoginToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Generate a raw login token, storing only its sha256 hash + expiry on the client row. */
export async function createClientLoginToken(client: { id: string }): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  await clientModel.setLoginToken(
    client.id,
    hashLoginToken(raw),
    new Date(Date.now() + LOGIN_TOKEN_TTL_MS)
  );
  return raw;
}

/** Resolve a raw login token to its client; tokens are single-use and cleared after a successful match. */
export async function getClientByLoginToken(rawToken: string): Promise<Client | null> {
  const hash = hashLoginToken(rawToken);
  const client = await clientModel.findByValidLoginTokenHash(hash, new Date());
  if (!client) return null;
  await clientModel.clearLoginToken(client.id);
  return client;
}

/** Sign a client JWT (same secret as admin, 7d expiry). */
export function issueClientJwt(client: { id: string }): string {
  return signClientToken(client.id);
}
