import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { ADMIN_JWT_EXPIRES_IN, CLIENT_JWT_EXPIRES_IN } from "../config/constants";
import * as userModel from "../models/user.model";

// A fixed dummy hash so unknown-email logins take the same time as real ones
// (equalizes the enumeration timing oracle).
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8kQm0j0w0Y0xPzQ0yI1Y7h2Kz0W2u";

export function signAdminToken(userId: string): string {
  return jwt.sign({ sub: userId, role: "admin" }, env.jwtSecret, { expiresIn: ADMIN_JWT_EXPIRES_IN });
}

export function verifyAdminToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string; role?: string };
    return payload.role === "admin" ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}

export function signClientToken(clientId: string): string {
  return jwt.sign({ sub: clientId, type: "client" }, env.jwtSecret, { expiresIn: CLIENT_JWT_EXPIRES_IN });
}

export function verifyClientToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string; type?: string };
    return payload.type === "client" ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}

export async function loginAdmin(email: string, password: string): Promise<string | null> {
  const user = await userModel.findByEmail(email);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user) return null;
  return ok ? signAdminToken(user.id) : null;
}
