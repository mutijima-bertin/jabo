import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";
import { ReorderError } from "./errors";

/** Data-access for PortfolioItem (showcase grid). */

export type ReorderEntry = { id: string; sortOrder: number };

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

/**
 * Bulk-replace the whole grid's order atomically (see serviceModel.reorder for
 * the shared semantics — all-or-nothing, labeled errors abort the transaction,
 * success returns the full re-sorted listAll shape).
 */
export function reorder(entries: ReorderEntry[]) {
  return prisma.$transaction(
    async (tx) => {
      const live = await tx.portfolioItem.findMany({ select: { id: true }, orderBy: { sortOrder: "asc" } });
      const liveIds = new Set(live.map((s) => s.id));
      const requestedIds = new Set(entries.map((e) => e.id));

      for (const entry of entries) {
        if (!liveIds.has(entry.id)) {
          throw new ReorderError("NOT_FOUND", `Unknown id: ${entry.id}`);
        }
      }
      if (live.some((s) => !requestedIds.has(s.id))) {
        throw new ReorderError("STALE_COLLECTION", "Collection changed since load — refetch and retry");
      }

      for (const entry of entries) {
        await tx.portfolioItem.update({ where: { id: entry.id }, data: { sortOrder: entry.sortOrder } });
      }
      return tx.portfolioItem.findMany({ orderBy: { sortOrder: "asc" } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}