import type { Request, Response } from "express";
import { z } from "zod";
import * as searchModel from "../models/search.model";

/**
 * Admin global search (⌘K palette).
 *   GET /api/admin/search?q=<term> -> { bookings, clients, posts, services }
 * Sits behind requireAdmin (see routes/admin.ts). Each group is capped at 5
 * and always present, so the palette can render sections unconditionally.
 */

/** Trimmed so "  ab  " and "ab" hit the same rows; min 2 keeps the query cheap. */
const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "q must be at least 2 characters")
    .max(60, "q must be at most 60 characters"),
});

export async function search(req: Request, res: Response): Promise<void> {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  res.json(await searchModel.searchAll(parsed.data.q));
}
