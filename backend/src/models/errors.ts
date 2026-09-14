/**
 * Labeled domain errors thrown inside model-layer transactions so controllers
 * can map failures to the right HTTP status without pattern-matching Prisma
 * internals. A ReorderError aborts the interactive transaction it was thrown
 * from — nothing is committed.
 */
export class ReorderError extends Error {
  constructor(
    public readonly kind: "NOT_FOUND" | "STALE_COLLECTION",
    message: string
  ) {
    super(message);
    this.name = "ReorderError";
  }
}