import path from "node:path";
import type { NextConfig } from "next";

// Backend origin for the /uploads rewrite. Non-public (BACKEND_URL) so it is
// read at server start — NEXT_PUBLIC_* values get inlined at build time and
// cannot see the container's runtime env. Falls back to the public API env,
// then localhost, mirroring src/lib/api.ts.
const API_ORIGIN = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to the repo root so a stray lockfile
  // outside the repo (e.g. ~/package-lock.json) can't be picked up.
  turbopack: { root: path.join(import.meta.dirname, "..") },
  // Portfolio cover/media files are stored and served by the backend as
  // relative "/uploads/..." paths. Proxy them through the Next.js origin so
  // the browser loads them same-origin (the API responds with
  // Cross-Origin-Resource-Policy: same-origin, which blocks cross-origin
  // <img> embeds) and relative coverUrls work unchanged.
  async rewrites() {
    return [{ source: "/uploads/:path*", destination: `${API_ORIGIN}/uploads/:path*` }];
  },
};

export default nextConfig;
