/**
 * API origin, which is DIFFERENT on the server and in the browser.
 *
 * Browser → relative, same-origin. `next.config.ts` rewrites `/api/:path*` to
 * the backend (see its `rewrites()` block) and that rewrite is active in both
 * `next dev` and `next start`, so the browser never needs to know where the
 * backend lives. An empty base makes every request same-origin and the rewrite
 * forwards it internally.
 *
 * Why that matters: `NEXT_PUBLIC_*` values are INLINED AT BUILD TIME. Hardcoding
 * a fallback like `http://localhost:4000` bakes an unreachable origin into the
 * production bundle — and the image is built in CI, which cannot know the deploy
 * domain. Staying relative makes the frontend host-agnostic: one image works on
 * any domain with no rebuild.
 *
 * Server → MUST be absolute. `fetch("/api/...")` throws
 * `TypeError: Failed to parse URL from /api/...` in React Server Components and
 * during SSR; there is no page origin to resolve against. Server-rendered routes
 * (blog posts, the sitemap, /services) would silently lose their data. Note that
 * `http://localhost:4000` is also wrong inside the frontend container, where
 * localhost is the frontend itself — hence `BACKEND_URL`, which compose sets to
 * the real container-network origin.
 *
 * `BACKEND_URL` is deliberately NOT `NEXT_PUBLIC_`-prefixed: it must stay a
 * runtime value so a CI-built image works without knowing the deploy domain.
 * The browser branch returns before reaching it, so it is inlined as undefined
 * client-side, which is harmless.
 *
 * Override NEXT_PUBLIC_API_URL only to point the browser at a DIFFERENT origin
 * than the page (e.g. a local dev setup calling :4000 cross-origin).
 */
export function apiOrigin(): string {
  if (typeof window !== "undefined") return "";
  return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}