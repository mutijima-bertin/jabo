import express from "express";
import type { Request, Response } from "express";
import net from "node:net";
import cors from "cors";
import helmet from "helmet";
import { head, BlobNotFoundError } from "@vercel/blob";
import { healthRouter } from "./routes/health";
import { publicRouter } from "./routes/public";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { clientsRouter } from "./routes/clients";
import { UPLOADS_DIR, blobStorageEnabled } from "./services/storage";
import { UPLOAD_JSON_BODY_LIMIT } from "./config/constants";
import { env } from "./config/env";
import { jsonErrorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  // Behind a reverse proxy (Caddy in front of Cloudflare) every socket peer is
  // the proxy, so req.ip would collapse to one shared address — and
  // express-rate-limit keys on req.ip. Without this, the per-IP caps collapse
  // into one global bucket: a handful of failed logins from unrelated visitors
  // `1` means "trust exactly one hop": Express reads the RIGHTMOST entry of
  // X-Forwarded-For. It is safe even though the real chain is
  // client → Cloudflare → Caddy → Next.js → Express, because Caddy REPLACES
  // X-Forwarded-For with CF-Connecting-IP (one entry) and Next's rewrite proxy
  // forwards that header unchanged instead of appending its own hop.
  // Verified 2026-10-03 against the live stack via rate-limit bucketing.
  // Never use `true` here — permissive trust makes the limiter throw
  // (ERR_ERL_PERMISSIVE_TRUST_PROXY) and lets a client spoof X-Forwarded-For
  // to bypass the caps entirely.
  app.set("trust proxy", 1);

  // Vercel path (VERCEL=1): same "1 hop" setting stays correct there — Vercel's
  // edge OVERWRITES X-Forwarded-For with the public client IP and refuses to
  // forward external IPs (anti-spoofing), and x-real-ip carries that same
  // platform-computed client IP (@vercel/functions' ipAddress() reads it).
  // We still pin req.ip to x-real-ip explicitly so rate-limit bucketing can
  // never collapse if anything ever appends a hop to X-Forwarded-For; the
  // value is only used when it is a syntactically valid IP, otherwise Express'
  // trust-proxy-computed req.ip stands. Registered only on Vercel — the
  // Caddy/Cloudflare Docker path above stays byte-for-byte untouched.
  if (process.env.VERCEL) {
    app.use((req: Request, _res: Response, next) => {
      const realIp = req.headers["x-real-ip"];
      if (typeof realIp === "string" && net.isIP(realIp) !== 0) {
        Object.defineProperty(req, "ip", { value: realIp, configurable: true, writable: true });
      }
      next();
    });
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(
    cors({
      origin: env.frontendOrigin,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Uploads arrive as base64 JSON data URLs. The client compresses images
  // before upload (the frontend resizes to ≤1920px WebP first), so payloads
  // fit well under 4400kb — and 4400kb (4,505,600 B) stays under Vercel's
  // 4.5 MB function request-body cap, which would otherwise hard-reject the
  // request before Express ever sees it. Images only — video is deliberately
  // not stored (see services/storage.ts).
  app.use("/api/admin/uploads", express.json({ limit: UPLOAD_JSON_BODY_LIMIT }));
  // Admin posts carry bilingual long-form markdown — scoped 2mb before the global cap.
  app.use("/api/admin/posts", express.json({ limit: "2mb" }));
  app.use(express.json({ limit: "64kb" }));

  if (blobStorageEnabled()) {
    // Vercel: the function filesystem is ephemeral, so images live in Blob and
    // the DB keeps storing the same relative /uploads/images/<file> URLs
    // (regex-enforced in adminCatalog/adminPosts). Resolve the Blob object and
    // 302 to its CDN URL: pathnames are unique and never rewritten, so the
    // redirect itself can be cached immutably for ~700 days.
    // Both shapes map to the `images/` Blob prefix — that is the only prefix
    // saveDataUrl ever writes.
    const redirectToBlob = async (req: Request, res: Response): Promise<void> => {
      const pathname = `images/${req.params.filename}`;
      try {
        const blob = await head(pathname);
        res.set("Cache-Control", "public, max-age=60480480, immutable");
        res.redirect(302, blob.url);
      } catch (err) {
        if (err instanceof BlobNotFoundError) {
          res.status(404).json({ error: "NOT_FOUND" });
          return;
        }
        console.error("[uploads:blob]", (err as Error).message);
        res.status(500).json({ error: "INTERNAL" });
      }
    };
    // /uploads/images/<file> is the shape saveDataUrl returns; /uploads/<file>
    // covers any single-segment path so the branch never falls through to a
    // disk lookup that cannot exist on Vercel.
    app.get("/uploads/images/:filename", redirectToBlob);
    app.get("/uploads/:filename", redirectToBlob);
  } else {
    // Docker/local: uploaded images served statically from disk, unchanged.
    app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "7d", immutable: true }));
  }

  // Mount order matters: clientsRouter MUST come before adminRouter because
  // admin has a path-less requireAdmin gate (adminRouter.use(requireAdmin))
  // that would otherwise swallow client routes.
  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", publicRouter);
  app.use("/api", clientsRouter);
  app.use("/api", adminRouter);

  // Registered after all routers — body-parser/JSON errors must return JSON, never leak HTML.
  app.use(jsonErrorHandler);

  return app;
}
