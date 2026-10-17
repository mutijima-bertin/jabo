import path from "node:path";
import type { NextConfig } from "next";

// Backend origin for the /api and /uploads rewrites. Non-public (BACKEND_URL)
// so it is read at server start — NEXT_PUBLIC_* values get inlined at build
// time and cannot see the container's runtime env. Falls back to the public API
// env, then localhost, mirroring src/lib/api.ts.
const API_ORIGIN = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, ".."),
  poweredByHeader: false,
  // Pin Turbopack's workspace root to the repo root so a stray lockfile
  // outside the repo (e.g. ~/package-lock.json) can't be picked up.
  turbopack: { root: path.join(import.meta.dirname, "..") },
  images: {
    // Next 16 requires an explicit allowlist; the hero uses quality={80}
    // (blueprint §4.2) on top of the backend's 1920px WebP pipeline.
    qualities: [80],
  },
  // Both backend surfaces are proxied through the Next.js origin, so the site
  // is served from ONE hostname (no api. subdomain, no CORS, one TLS cert).
  //
  // /uploads — portfolio cover/media files are stored and served by the backend
  // as relative "/uploads/..." paths. Proxying them keeps the browser
  // same-origin (the API responds with Cross-Origin-Resource-Policy: same-origin,
  // which blocks cross-origin <img> embeds) and relative coverUrls work
  // unchanged.
  //
  // /api — lets the browser call the API at the same origin. NEXT_PUBLIC_API_URL
  // is set to the public site origin in production, so `${API_URL}/api/...`
  // resolves here and is transparently forwarded to the backend container. The
  // backend still sets CORS from FRONTEND_ORIGIN as defence in depth.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_ORIGIN}/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      {
        // Apply CSP to every route (public site + admin).
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
