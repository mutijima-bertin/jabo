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
  // body-parser marks malformed JSON with type "entity.parse.failed" (also an
  // instanceof SyntaxError). Route those to 400, never the 500 catch-all.
  if ((err as { type?: string })?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    res.status(400).json({ error: "INVALID_JSON" });
    return;
  }
  console.error("[json-body]", err);
  res.status(500).json({ error: "INTERNAL" });
};
