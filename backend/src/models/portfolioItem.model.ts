import { prisma } from "../config/db";
import type { Prisma } from "@prisma/client";

/** Data-access for PortfolioItem (showcase grid). */

export function listPublished() {
  return prisma.portfolioItem.findMany({
    where: { published: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export function listAll() {
  return prisma.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } });
}

export function create(data: Prisma.PortfolioItemCreateInput) {
  return prisma.portfolioItem.create({ data });
}

export function updateById(id: string, data: Prisma.PortfolioItemUpdateInput) {
  return prisma.portfolioItem.update({ where: { id }, data });
}

export function deleteById(id: string) {
  return prisma.portfolioItem.delete({ where: { id } });
}
