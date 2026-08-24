import { createApp } from "./app";
import { env } from "./config/env";

// Fail loudly on programmer errors and stray async failures — a stateless API
// should crash (and be restarted by its supervisor) rather than limp along.
process.on("unhandledRejection", (reason) => {
  console.error("[css-backend] FATAL: Unhandled promise rejection:", reason);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("[css-backend] FATAL: Uncaught exception:", err);
  process.exit(1);
});

const app = createApp();

// Keep the server referenced for the lifetime of the process — a discarded
// http.Server can be garbage-collected, silently draining the event loop.
const server = app.listen(env.port, () => {
  console.log(`[css-backend] listening on http://localhost:${env.port}`);
});

// NOTE: on Node >= 20 the "listening" callback can fire BEFORE the bind result
// is final under port contention; the real verdict arrives here. Without this
// handler an EADDRINUSE used to exit code 0 with NO output at all.
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`FATAL: Port ${env.port} already in use — the css-backend docker container is probably running.`);
    console.error("  Stop it:            docker stop css-backend");
    console.error("  Or use another port: PORT=<n> npm start");
  } else if (err.code === "EACCES") {
    console.error(`FATAL: Port ${env.port} requires elevated privileges (EACCES). Use PORT=<n> npm start with a port >1024.`);
  } else {
    console.error("[css-backend] FATAL: Server error:", err);
  }
  process.exit(1);
});

// Any post-listen async init must run inside this guard so failures crash
// loudly with context instead of dying silently after the banner prints.
async function postListenInit(): Promise<void> {
  // (none today — placeholder keeps the contract explicit)
}

postListenInit().catch((err) => {
  console.error("[css-backend] FATAL: Post-listen initialization failed:", err);
  server.close(() => process.exit(1));
  process.exitCode = 1;
});
