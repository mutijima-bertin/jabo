import { prisma } from "../config/db";
import type { Prisma } from "@prisma/client";

/** Data-access for the client-logo wall. */
export function listAll() {
  return prisma.clientLogo.findMany({ orderBy: { sortOrder: "asc" } });
}

export function create(data: Prisma.ClientLogoCreateInput) {
  return prisma.clientLogo.create({ data });
}

export function deleteById(id: string) {
  return prisma.clientLogo.delete({ where: { id } });
}
