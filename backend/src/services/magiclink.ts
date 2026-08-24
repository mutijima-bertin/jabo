import crypto from "crypto";
import { env } from "../config/env";
import * as bookingModel from "../models/booking.model";

const TOKEN_BYTES = 32;
const TOKEN_PREFIX = "css_";

export function generateMagicToken(): { token: string; hash: string } {
  const raw = crypto.randomBytes(TOKEN_BYTES).toString("base64url");
  const token = `${TOKEN_PREFIX}${raw}`;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

export function hashMagicToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function magicLinkUrl(token: string): string {
  return `${env.appUrl}/track/${token}`;
}

export async function consumeMagicToken(token: string): Promise<string | null> {
  const hash = hashMagicToken(token);
  return bookingModel.findIdByMagicTokenHash(hash);
}
