import { prisma } from "../config/db";
import { Prisma, type ContactMessage } from "@prisma/client";

/**
 * Data-access for contact-form submissions. Immutable by design — no updatedAt,
 * rows are append-only (Tier-2 inbox reads come later). Written by POST /api/contact.
 */

export function create(row: Prisma.ContactMessageCreateInput): Promise<ContactMessage> {
  return prisma.contactMessage.create({ data: row });
}