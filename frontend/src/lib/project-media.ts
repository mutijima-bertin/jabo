/** Only HTTP(S) or same-origin media paths may reach a player or anchor. */
export function safeMediaUrl(value: string): string | null {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; }
}
export function embedUrl(value: string): string | null {
  const safe = safeMediaUrl(value); if (!safe || safe.startsWith('/')) return null;
  const u = new URL(safe); let id: string | null = null;
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(u.hostname)) id = u.pathname === '/watch' ? u.searchParams.get('v') : u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)$/)?.[1] ?? null;
  if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
  if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(u.hostname)) { const v = u.pathname.match(/\/(?:video\/)?(\d+)$/)?.[1]; if (v) return `https://player.vimeo.com/video/${v}`; }
  return null;
}
export function mediaKind(value: string): 'image' | 'video' | 'captions' | 'unsupported' {
  const safe = safeMediaUrl(value); if (!safe) return 'unsupported';
  const pathname = new URL(safe, 'https://local.invalid').pathname;
  if (/\.vtt$/i.test(pathname)) return 'captions';
  if (/\.(mp4|webm|mov|m4v)$/i.test(pathname) || embedUrl(value)) return 'video';
  if (/\.(jpe?g|png|webp|gif|avif|svg)$/i.test(pathname) || safe.startsWith('/uploads/')) return 'image';
  return 'unsupported';
}
