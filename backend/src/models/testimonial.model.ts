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

export function deleteById(id: string) {
  return prisma.testimonial.delete({ where: { id } });
}
