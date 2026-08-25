import { prisma } from "../config/db";
import type { Prisma } from "@prisma/client";

/** Data-access for testimonials. */
export function listPublished() {
  return prisma.testimonial.findMany({ where: { published: true } });
}

export function listAll() {
  return prisma.testimonial.findMany();
}

export function create(data: Prisma.TestimonialCreateInput) {
  return prisma.testimonial.create({ data });
}

/** Minimal update — used only for the publish toggle. */
export function update(id: string, data: Prisma.TestimonialUpdateInput) {
  return prisma.testimonial.update({ where: { id }, data });
}

export function deleteById(id: string) {
  return prisma.testimonial.delete({ where: { id } });
}
