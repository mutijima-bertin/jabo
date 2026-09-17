import { prisma } from "../config/db";
import { TestimonialSource, type Prisma } from "@prisma/client";

/** Data-access for testimonials. */
export function listPublished() {
  return prisma.testimonial.findMany({ where: { published: true } });
}

/**
 * Admin list — CLIENT rows carry their linked client (id/name/email) so the
 * admin grid can show who submitted what. ADMIN rows keep client: null; the
 * source lives on the row itself.
 */
export function listAll() {
  return prisma.testimonial.findMany({
    include: { client: { select: { id: true, name: true, email: true } } },
  });
}

export function create(data: Prisma.TestimonialCreateInput) {
  return prisma.testimonial.create({ data });
}

/** The client's own submitted row (the API enforces one per client). */
export function findByClientId(clientId: string) {
  return prisma.testimonial.findFirst({ where: { clientId } });
}

/**
 * Single row with its linked client (id/name/email) — used when the publish
 * toggle needs to know who to notify.
 */
export function findById(id: string) {
  return prisma.testimonial.findUnique({
    where: { id },
    include: { client: { select: { id: true, name: true, email: true } } },
  });
}

/** CLIENT-submitted rows: never auto-published, always attributed to the client. */
export function createForClient(data: {
  author: string;
  role?: string | null;
  contentEn: string;
  contentRw?: string | null;
  clientId: string;
}) {
  return prisma.testimonial.create({
    data: {
      author: data.author,
      role: data.role ?? null,
      contentEn: data.contentEn,
      contentRw: data.contentRw ?? null,
      source: TestimonialSource.CLIENT,
      published: false,
      client: { connect: { id: data.clientId } },
    },
  });
}

/** Minimal update — used only for the publish toggle. */
export function update(id: string, data: Prisma.TestimonialUpdateInput) {
  return prisma.testimonial.update({ where: { id }, data });
}

export function deleteById(id: string) {
  return prisma.testimonial.delete({ where: { id } });
}

export function countAll(): Promise<number> {
  return prisma.testimonial.count();
}