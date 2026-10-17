/** Per-response nonce; executable inline scripts without it are rejected. */
export function securityPolicy(nonce: string, development: boolean) {
  const blob = "https://x9eveaplhocclmvl.public.blob.vercel-storage.com";
  // Umami Cloud analytics: the tracker script and the pageview beacon. The
  // script tag carries the request nonce, so 'strict-dynamic' trusts it; the
  // host is listed in script-src too for browsers without strict-dynamic.
  const umami = "https://cloud.umami.is";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${umami}${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${blob}`,
    `media-src 'self' blob: ${blob}`,
    `connect-src 'self' ${umami}${development ? " ws: http://localhost:4000" : ""}`,
    "font-src 'self'", "object-src 'none'", "base-uri 'self'",
    "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
    "frame-ancestors 'none'", "form-action 'self'",
  ].join("; ");
}
