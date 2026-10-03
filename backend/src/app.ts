import express from "express";
import cors from "cors";
import helmet from "helmet";
import { healthRouter } from "./routes/health";
import { publicRouter } from "./routes/public";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { clientsRouter } from "./routes/clients";
import { UPLOADS_DIR } from "./services/storage";
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

  // Uploads arrive as base64 JSON data URLs, which inflate the raw bytes by ~4/3
  // (10 MB image → ~13.3 MB body). 15mb leaves headroom over that ceiling while
  // staying far below Cloudflare's 100 MB request cap. Images only — video is
  // deliberately not stored (see services/storage.ts).
  app.use("/api/admin/uploads", express.json({ limit: "15mb" }));
  // Admin posts carry bilingual long-form markdown — scoped 2mb before the global cap.
  app.use("/api/admin/posts", express.json({ limit: "2mb" }));
  app.use(express.json({ limit: "64kb" }));

  // Uploaded images served statically
  app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "7d", immutable: true }));

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
