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

  // Uploads route has its own generous body limit (base64 images/videos);
  // everything else is capped small to prevent memory-exhaustion DoS.
  app.use("/api/admin/uploads", express.json({ limit: "70mb" }));
  // Admin posts carry bilingual long-form markdown — scoped 2mb before the global cap.
  app.use("/api/admin/posts", express.json({ limit: "2mb" }));
  app.use(express.json({ limit: "64kb" }));

  // Uploaded media (images/videos) served statically
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
