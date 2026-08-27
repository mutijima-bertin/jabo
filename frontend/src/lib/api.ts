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
  recent: Array<{ id: string; reference: string; status: string; createdAt: string; service: { nameEn: string } | null }>;
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

/** Full admin testimonial row (incl. drafts) — GET/POST/DELETE + PATCH {published} /admin/testimonials. */
export interface AdminTestimonial extends Testimonial {
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
