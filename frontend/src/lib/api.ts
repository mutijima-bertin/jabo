const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(status: number, message: string, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let body: { error?: string; issues?: unknown } = {};
    try {
      body = await res.json();
    } catch {
      /* empty */
    }
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.issues);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    }),
  patch: <T>(path: string, body: unknown, token: string) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    }),
  put: <T>(path: string, body: unknown, token: string) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    }),
  del: <T>(path: string, token: string) =>
    request<T>(path, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),
};

export interface Service {
  id: string;
  nameEn: string;
  nameRw: string;
  descriptionEn: string | null;
  descriptionRw: string | null;
  priceEn: string;
  priceRw: string;
  category: string;
  icon: string | null;
  /** Picture for the public services bento card (/uploads/... path). Null until uploaded. */
  imageUrl: string | null;
  /** Optional blog deep-dive slug — public cards link to /blog/<slug> when set. */
  linkedPostSlug: string | null;
  featured: boolean;
  published: boolean;
  sortOrder: number;
}

export interface Booking {
  id: string;
  reference: string;
  serviceId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  eventDate: string | null;
  location: string | null;
  budgetRange: string | null;
  details: string | null;
  language: string;
  status: "PENDING" | "CONFIRMED" | "IN_PRODUCTION" | "DELIVERED" | "COMPLETED" | "CANCELLED";
  magicTokenExpiresAt: string | null;
  magicTokenRevoked: boolean;
  createdAt: string;
  service?: { nameEn: string; nameRw: string };
  events?: Array<{ id: string; status: string; note: string | null; createdAt: string }>;
  notifications?: Array<{ id: string; channel: string; kind: string; recipient: string; status: string; error: string | null; sentAt: string }>;
}

export interface PortfolioItem {
  id: string;
  titleEn: string;
  titleRw: string | null;
  category: string;
  clientName: string | null;
  tags: string[];
  coverUrl: string;
  mediaUrls: string[];
  mediaType: string;
  published: boolean;
  sortOrder: number;
}

export interface SiteSetting {
  key: string;
  locale: string;
  value: string;
}

export interface DashboardStats {
  stats: { total: number; pending: number; confirmed: number; inProduction: number; delivered: number; completed: number; cancelled: number; clients: number };
  /** Oldest→newest, ISO YYYY-MM-DD, zero-filled, ONE entry per requested day
   *  (14 by default; `?days=7|14|30|90`) — the admin dashboard area chart. */
  bookingsByDay: Array<{ date: string; count: number }>;
  /** Top 5 services by booking count, count desc (admin dashboard bar chart). */
  topServices: Array<{ id: string; nameEn: string; count: number }>;
  /** Live content catalog sizes shown by the admin shell/charts. */
  counts: { testimonials: number; posts: number; portfolio: number; services: number };
  recent: Array<{ id: string; reference: string; status: string; createdAt: string; service: { nameEn: string } | null }>;
  /** Productions scheduled within the next 14 days (status NOT COMPLETED/CANCELLED,
   *  eventDate ascending, capped at 20) — the dashboard "Upcoming" card. */
  upcoming: UpcomingBooking[];
}

/** `?days=` values the dashboard endpoint accepts (14 = default when omitted). */
export type DashboardRange = 7 | 14 | 30 | 90;

/**
 * GET /admin/health — admin-only health probe (the public /health deliberately
 * exposes neither uptime nor the failure count). The happy path is a 200; a dead
 * database answers 503 `{ error: "DB_DOWN" }` (service-unavailable, not a server
 * error), which `useAdminFetch` surfaces as an `error` string with `data` left
 * null — the same shape any non-2xx takes.
 */
export interface AdminHealth {
  status: "ok";
  /** Process uptime in whole seconds. */
  uptimeSeconds: number;
  db: "ok";
  /** Notification deliveries that FAILED in the trailing 24h window. */
  failedSends24h: number;
}

export type PostContentType = "PROJECT_RECAP" | "CLIENT_STORY" | "EDUCATIONAL" | "STUDIO_NEWS";

/** Public blog list item — no markdown bodies, no drafts (backend selects only these fields). */
export interface PostSummary {
  id: string;
  slug: string;
  titleEn: string;
  titleRw: string;
  excerptEn: string | null;
  excerptRw: string | null;
  contentType: PostContentType;
  coverImageUrl: string | null;
  views: number;
  likes: number;
  publishedAt: string | null;
}

/** Full published post — GET /public/posts/:slug also increments views server-side. */
export interface PostFull extends PostSummary {
  contentEn: string;
  contentRw: string;
  updatedAt: string;
}

/** Full admin row for a blog post (incl. drafts) — GET/POST/PATCH/DELETE /admin/posts. */
export interface AdminPost extends PostFull {
  published: boolean;
}

/** Published testimonial row from GET /public/testimonials. */
export interface Testimonial {
  id: string;
  author: string;
  role: string | null;
  contentEn: string;
  contentRw: string | null;
}

/** Who authored a testimonial — written by studio staff or submitted by a client. */
export type TestimonialSource = "ADMIN" | "CLIENT";

/** A client's own testimonial — GET /clients/testimonials/me and POST /clients/testimonials. */
export interface ClientTestimonial {
  id: string;
  author: string;
  role: string | null;
  contentEn: string;
  contentRw: string | null;
  source: TestimonialSource;
  published: boolean;
  createdAt: string;
}

/** Full admin testimonial row (incl. drafts) — GET/POST/DELETE + PATCH {published} /admin/testimonials. */
export interface AdminTestimonial extends Testimonial {
  source: TestimonialSource;
  client: { name: string; email: string } | null;
  published: boolean;
  createdAt: string;
}

/** Client-logo wall row — GET /public/logos and GET /admin/logos. */
export interface ClientLogo {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
}

/** Full admin logo row (adds ordering metadata). */
export interface AdminLogo extends ClientLogo {
  sortOrder: number;
  createdAt: string;
}

/** Portal client as returned by GET /admin/clients (read-only; created via bookings). */
export interface AdminClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  bookings: Array<{ reference: string; status: string; createdAt: string }>;
}

// ---------------------------------------------------------------------------
// Admin notifications (Tier-1) — GET /admin/notifications, POST /admin/notifications/read
// ---------------------------------------------------------------------------

export type AdminNotifType =
  | "NEW_BOOKING"
  | "STATUS_CHANGED"
  | "NEW_CONTACT_MESSAGE"
  | "TESTIMONIAL_SUBMITTED"
  | "SEND_FAILED";

/**
 * Best-effort notification payload — backend-authored, so EVERY field is
 * optional and this is NOT an authoritative contract: each writer
 * (`notifyAdmin` call sites) sends only the keys its own type needs, and the
 * set is expected to grow. Readers must therefore always fall back
 * (`p.reference ?? "—"`), never assume a key is present.
 *
 * Union of what the writers actually emit, by type:
 *  - NEW_BOOKING           → bookingId, reference, clientName, serviceName
 *  - STATUS_CHANGED        → bookingId, reference, from, to
 *  - NEW_CONTACT_MESSAGE   → id, name, email, subject, messagePreview, language
 *  - TESTIMONIAL_SUBMITTED → testimonialId, author, email, contentPreview
 *  - SEND_FAILED           → channel, recipient, error
 */
export interface AdminNotifPayload {
  bookingId?: string;
  reference?: string;
  clientName?: string;
  serviceName?: string;
  from?: string;
  to?: string;
  id?: string;
  name?: string;
  email?: string;
  subject?: string;
  messagePreview?: string;
  contentPreview?: string;
  language?: string;
  testimonialId?: string;
  author?: string;
  channel?: string;
  recipient?: string;
  error?: string;
}

export interface AdminNotifItem {
  id: string;
  type: AdminNotifType;
  payload: AdminNotifPayload;
  /** Relative query string on the admin page, e.g. "?tab=bookings&open=<id>" — null = no target. */
  linkHref: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AdminNotifResponse {
  items: AdminNotifItem[];
  unreadCount: number;
}

// ---------------------------------------------------------------------------
// Global admin search — GET /admin/search?q=<term> (⌘K palette)
// ---------------------------------------------------------------------------

/** `q` shorter than 2 characters is NOT sent: the endpoint answers 400 VALIDATION. */
export const SEARCH_MIN_TERM = 2;

/** One booking match — reference/status/contact/service are enough to identify it. */
export interface BookingHit {
  id: string;
  reference: string;
  status: string;
  contactName: string;
  serviceName: string;
  createdAt: string;
}

/** One client match — free-text match on name, email or phone. */
export interface ClientHit {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

/** One blog-post match — the palette localizes the title with locale-first EN/RW. */
export interface PostHit {
  id: string;
  slug: string;
  titleEn: string;
  titleRw: string;
  published: boolean;
}

/** One service match — the palette localizes the name with locale-first EN/RW. */
export interface ServiceHit {
  id: string;
  nameEn: string;
  nameRw: string;
  category: string;
  published: boolean;
}

/** Grouped search payload — each group holds AT MOST 5 hits (backend cap). */
export interface SearchResults {
  bookings: BookingHit[];
  clients: ClientHit[];
  posts: PostHit[];
  services: ServiceHit[];
}

/** One row of the dashboard "Upcoming productions" card (eventDate ≤ 14 days out,
 *  status NOT COMPLETED/CANCELLED, ascending, capped at 20). */
export interface UpcomingBooking {
  id: string;
  reference: string;
  status: string;
  eventDate: string | null;
  contactName: string;
  serviceName: string;
  location: string | null;
  budgetRange: string | null;
}
