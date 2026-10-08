import path from "node:path";
import type { NextConfig } from "next";

// Backend origin for the /api and /uploads rewrites. Non-public (BACKEND_URL)
// so it is read at server start — NEXT_PUBLIC_* values get inlined at build
// time and cannot see the container's runtime env. Falls back to the public API
// env, then localhost, mirroring src/lib/api.ts.
const API_ORIGIN = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Browser→API policy. In production the API is reached through the SAME origin
// via the /api rewrite below, so 'self' is the whole requirement — this is what
// lets the site sit behind Cloudflare on a single hostname with no CORS
// handshake. Dev still points the browser straight at :4000, so localhost must
// stay allowed there. API_ORIGIN is deliberately NOT used here: inside Docker it
// resolves to http://backend:4000, which is not a browser-reachable origin.
const CONNECT_SRC = process.env.NODE_ENV === "production" ? "'self'" : "'self' http://localhost:4000";

const nextConfig: NextConfig = {
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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next.js injects inline hydration / RSC bootstrap scripts;
              // without a nonce infrastructure, 'unsafe-inline' is required.
              "script-src 'self' 'unsafe-inline'",
              // Next inlines critical CSS; Tailwind uses external files but
              // inline styles may appear in SSR output.
              "style-src 'self' 'unsafe-inline'",
              // data:/blob: cover inline SVGs and client object URLs. The
              // Vercel Blob CDN host must be listed explicitly: the admin
              // panel renders raw <img src="/uploads/..."> and the backend
              // 302-redirects those to the CDN — CSP checks the FINAL URL,
              // so 'self' alone blanked every admin thumbnail. Public pages
              // go through same-origin /_next/image and never needed it.
              // media-src pre-authorizes the same store for future
              // portfolio videos served straight from Blob.
              "img-src 'self' data: blob: https://x9eveaplhocclmvl.public.blob.vercel-storage.com",
              "media-src 'self' blob: https://x9eveaplhocclmvl.public.blob.vercel-storage.com",
              // Browser→API calls, same-origin via the /api rewrite in prod.
              `connect-src ${CONNECT_SRC}`,
              "font-src 'self'",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
