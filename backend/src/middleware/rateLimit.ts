import rateLimit from "express-rate-limit";

export const limiter = (opts: { windowMs: number; max: number; message?: string; keyGenerator?: (req: any) => string }) =>
  rateLimit({
    windowMs: opts.windowMs,
    limit: opts.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: opts.message ?? "RATE_LIMITED" },
    keyGenerator: opts.keyGenerator,
  });

const emailHits = new Map<string, { count: number; resetAt: number }>();

export function cleanupEmailHits() {
  const now = Date.now();
  for (const [k, v] of emailHits) {
    if (v.resetAt < now) emailHits.delete(k);
  }
}

setInterval(cleanupEmailHits, 60_000).unref();

/** Per-normalized-email limit, e.g. max 5 bookings per email per hour. */
export function perEmailLimit(windowMs: number, max: number, message: string) {
  return (_req: any, res: any, next: any) => {
    const email = String(_req.body?.contactEmail ?? "").toLowerCase().trim();
    if (!email) {
      next();
      return;
    }
    const now = Date.now();
    const key = `email:${email}`;
    const hit = emailHits.get(key);
    if (!hit || hit.resetAt < now) {
      emailHits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (hit.count >= max) {
      res.status(429).json({ error: message });
      return;
    }
    hit.count += 1;
    next();
  };
}
