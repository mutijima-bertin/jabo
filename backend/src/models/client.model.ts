import { prisma } from "../config/db";
import type { Client, Prisma } from "@prisma/client";

/** Data-access layer for Client (portal accounts auto-created from bookings). */

export function findByEmailInsensitive(email: string) {
  return prisma.client.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
}

export function upsertByEmail(params: {
  where: Prisma.ClientWhereUniqueInput;
  update: Prisma.ClientUpdateInput;
  create: Prisma.ClientCreateInput;
}) {
  return prisma.client.upsert({
    where: params.where,
    update: params.update,
    create: params.create,
  });
}

/** Portal "me" payload source: client + their bookings (newest first). */
export function findByIdWithBookings(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          reference: true,
          eventDate: true,
          location: true,
          budgetRange: true,
          status: true,
          createdAt: true,
          service: { select: { nameEn: true } },
        },
      },
    },
  });
}

/** Single-use magic login tokens: only the sha256 hash + expiry live on the row. */
export function setLoginToken(id: string, hash: string, expiresAt: Date) {
  return prisma.client.update({
    where: { id },
    data: { loginTokenHash: hash, loginTokenExpiresAt: expiresAt },
  });
}

export function clearLoginToken(id: string) {
  return prisma.client.update({
    where: { id },
    data: { loginTokenHash: null, loginTokenExpiresAt: null },
  });
}

export function findByValidLoginTokenHash(hash: string, now: Date) {
  return prisma.client.findFirst({
    where: { loginTokenHash: hash, loginTokenExpiresAt: { gt: now } },
  });
}

export function count(): Promise<number> {
  return prisma.client.count();
}

/** Admin list with each client's booking references. */
export function listForAdmin() {
  return prisma.client.findMany({
    include: { bookings: { select: { reference: true, status: true, createdAt: true } } },
  });
}

export type ClientWithBookings = NonNullable<Awaited<ReturnType<typeof findByIdWithBookings>>>;
