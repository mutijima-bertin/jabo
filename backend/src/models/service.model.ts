import { prisma } from "../config/db";
import { Prisma } from "@prisma/client";
import { ReorderError } from "./errors";

/** Data-access for the Service catalog. */

export type ReorderEntry = { id: string; sortOrder: number };

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

/**
 * Bulk-replace the whole catalog's order atomically. All-or-nothing: any id not
 * in the live set (NOT_FOUND) or a request that omits live rows (STALE_COLLECTION)
 * aborts before anything is written; a concurrent delete mid-write surfaces as
 * P2025 (the caller maps it). Returns the full re-sorted list (listAll shape).
 *
 * Mirrors siteSetting.upsertBatch but as an interactive introspection + write
 * under SERIALIZABLE so a concurrent reorder can never interleave.
 */
export function reorder(entries: ReorderEntry[]) {
  return prisma.$transaction(
    async (tx) => {
      const live = await tx.service.findMany({ select: { id: true }, orderBy: { sortOrder: "asc" } });
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
        await tx.service.update({ where: { id: entry.id }, data: { sortOrder: entry.sortOrder } });
      }
      return tx.service.findMany({ orderBy: { sortOrder: "asc" } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/* ----- deep-dive BlogPost linking (no FK by design; these compose into prisma.$transaction([...])) ----- */

/** Unawaited PrismaPromise: clears the deep-dive link on every service pointing at `slug`. */
export function clearLinkedPostSlug(slug: string) {
  return prisma.service.updateMany({
    where: { linkedPostSlug: slug },
    data: { linkedPostSlug: null },
  });
}

/** Unawaited PrismaPromise: repoints every service linked to `fromSlug` onto `toSlug`. */
export function repointLinkedPostSlug(fromSlug: string, toSlug: string) {
  return prisma.service.updateMany({
    where: { linkedPostSlug: fromSlug },
    data: { linkedPostSlug: toSlug },
  });
}