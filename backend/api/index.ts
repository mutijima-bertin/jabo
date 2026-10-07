// Serverless entry for the Vercel deployment (project root = backend/, preset
// "Other"; vercel.json rewrites everything to /api → this function).
//
// The app is instantiated ONCE at module scope so every request on a warm
// instance reuses the same Express app (rate-limit Maps, middleware) — calling
// createApp() per request would silently reset the per-IP buckets.
//
// Deliberately OUTSIDE tsconfig.json's include (rootDir "src"): Vercel's
// @vercel/node compiles api/*.ts itself, while `npm run build` keeps emitting
// dist/ from src/ unchanged (Docker/local runs dist/index.js via src/index.ts,
// which stays untouched).
import { createApp } from "../src/app";

export default createApp();
