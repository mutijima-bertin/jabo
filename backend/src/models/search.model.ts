import { prisma } from "../config/db";
import { Prisma, type BookingStatus } from "@prisma/client";

/**
 * Data-access for the admin global search (⌘K palette) and the shared
 * free-text predicate behind it. Every group is capped at SEARCH_RESULT_LIMIT
 * and ordered deterministically so the palette renders a stable list on
 * repeat keystrokes.
 */

/** One screen of hits per group — the palette renders a short list, not a page. */
export const SEARCH_RESULT_LIMIT = 5;

/** Case-insensitive substring filter (Postgres ILIKE under the hood). */
function contains(term: string): Prisma.StringFilter {
  return { contains: term, mode: "insensitive" };
}

/**
 * The one booking free-text predicate, shared by GET /admin/search (bookings
 * group) and the `?q=` filter on GET /admin/bookings so both match identically:
 * reference, contact name, contact email, or the related Service's bilingual
 * name. Callers AND this with any other filter (e.g. `status`).
 */
export function bookingTextWhere(term: string): Prisma.BookingWhereInput {
  return {
    OR: [
      { reference: contains(term) },
      { contactName: contains(term) },
      { contactEmail: contains(term) },
      { service: { is: { OR: [{ nameEn: contains(term) }, { nameRw: contains(term) }] } } },
    ],
  };
}

export type BookingHit = {
  id: string;
  reference: string;
  status: BookingStatus;
  contactName: string;
  serviceName: string;
  createdAt: string;
};

export type ClientHit = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type PostHit = {
  id: string;
  slug: string;
  titleEn: string;
  titleRw: string;
  published: boolean;
};

export type ServiceHit = {
  id: string;
  nameEn: string;
  nameRw: string;
  category: string;
  published: boolean;
};

export type SearchResults = {
  bookings: BookingHit[];
  clients: ClientHit[];
  posts: PostHit[];
  services: ServiceHit[];
};

/**
 * Four group queries in parallel, each capped at SEARCH_RESULT_LIMIT.
 * Ordering: bookings newest-first; clients by name asc; posts by publishedAt
 * desc (nulls last — drafts sink) then createdAt desc; services by catalog
 * sortOrder asc then createdAt asc. `term` is already trimmed/validated.
 * Every group resolves to [] (never omitted) when nothing matches.
 */
export async function searchAll(term: string): Promise<SearchResults> {
  const [bookings, clients, posts, services] = await Promise.all([
    prisma.booking.findMany({
      where: bookingTextWhere(term),
      orderBy: { createdAt: "desc" },
      take: SEARCH_RESULT_LIMIT,
      select: {
        id: true,
        reference: true,
        status: true,
        contactName: true,
        createdAt: true,
        service: { select: { nameEn: true } },
      },
    }),
    prisma.client.findMany({
      where: { OR: [{ name: contains(term) }, { email: contains(term) }] },
      orderBy: { name: "asc" },
      take: SEARCH_RESULT_LIMIT,
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.blogPost.findMany({
      where: { OR: [{ titleEn: contains(term) }, { titleRw: contains(term) }, { slug: contains(term) }] },
      // nulls last keeps drafts (never published) below every published post.
      orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: SEARCH_RESULT_LIMIT,
      select: { id: true, slug: true, titleEn: true, titleRw: true, published: true },
    }),
    prisma.service.findMany({
      where: { OR: [{ nameEn: contains(term) }, { nameRw: contains(term) }] },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: SEARCH_RESULT_LIMIT,
      select: { id: true, nameEn: true, nameRw: true, category: true, published: true },
    }),
  ]);

  return {
    bookings: bookings.map((b) => ({
      id: b.id,
      reference: b.reference,
      status: b.status,
      contactName: b.contactName,
      serviceName: b.service.nameEn,
      createdAt: b.createdAt.toISOString(),
    })),
    clients: clients.map((c) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone })),
    posts: posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      titleEn: p.titleEn,
      titleRw: p.titleRw,
      published: p.published,
    })),
    services: services.map((s) => ({
      id: s.id,
      nameEn: s.nameEn,
      nameRw: s.nameRw,
      category: s.category,
      published: s.published,
    })),
  };
}
