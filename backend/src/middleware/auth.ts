import type { NextFunction, Request, Response } from "express";
import { verifyAdminToken, verifyClientToken } from "../services/auth";

declare global {
  namespace Express {
    interface Request {
      adminId?: string;
      clientId?: string;
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = verifyAdminToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.adminId = payload.sub;
  next();
}

/** Require a valid client JWT (type "client") on the request; sets req.clientId. */
export function requireClient(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = verifyClientToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.clientId = payload.sub;
  next();
}
