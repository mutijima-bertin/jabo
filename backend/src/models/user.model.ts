import { prisma } from "../config/db";

/** Data-access for admin User rows (login only — no user CRUD exists). */
export function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
}
