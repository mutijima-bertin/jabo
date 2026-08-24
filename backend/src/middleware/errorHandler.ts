import type { ErrorRequestHandler } from "express";

/**
 * Central error handler — registered AFTER all routers in app.ts so that
 * body-parser/JSON errors and any async handler rejection (Express 5 forwards
 * them here) return JSON, never leak HTML.
 */
export const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if ((err as { type?: string })?.type === "entity.too.large") {
    res.status(413).json({ error: "PAYLOAD_TOO_LARGE" });
    return;
  }
  console.error("[json-body]", err);
  res.status(500).json({ error: "INTERNAL" });
};
