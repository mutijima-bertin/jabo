import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";
import { ReorderError } from "./errors";

/** Data-access for the client-logo wall. */

export type ReorderEntry = { id: string; sortOrder: number };

export function listAll() {
  return prisma.clientLogo.findMany({ orderBy: { sortOrder: "asc" } });
}

export function create(data: Prisma.ClientLogoCreateInput) {
  return prisma.clientLogo.create({ data });
}

export function deleteById(id: string) {
  return prisma.clientLogo.delete({ where: { id } });
}

/**
 * Bulk-replace the whole wall's order atomically (see serviceModel.reorder for
 * the shared semantics — all-or-nothing, labeled errors abort the transaction,
 * success returns the full re-sorted admin/DB row shape, sortOrder + createdAt
 * included).
 */
export function reorder(entries: ReorderEntry[]) {
  return prisma.$transaction(
    async (tx) => {
      const live = await tx.clientLogo.findMany({ select: { id: true }, orderBy: { sortOrder: "asc" } });
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
        await tx.clientLogo.update({ where: { id: entry.id }, data: { sortOrder: entry.sortOrder } });
      }
      return tx.clientLogo.findMany({ orderBy: { sortOrder: "asc" } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}