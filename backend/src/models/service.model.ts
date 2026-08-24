import { prisma } from "../config/db";
import type { Prisma } from "@prisma/client";

/** Data-access for the Service catalog. */

export function listPublished() {
  return prisma.service.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function listAll() {
  return prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
}

export function findById(id: string) {
  return prisma.service.findUnique({ where: { id } });
}

export function create(data: Prisma.ServiceCreateInput) {
  return prisma.service.create({ data });
}

export function updateById(id: string, data: Prisma.ServiceUpdateInput) {
  return prisma.service.update({ where: { id }, data });
}

export function deleteById(id: string) {
  return prisma.service.delete({ where: { id } });
}
