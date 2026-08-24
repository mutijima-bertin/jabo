import type { Prisma } from "@prisma/client";
import type { TransactionClient } from "./booking.model";

/** Data-access for the immutable BookingEvent audit rows. */
export function createInTx(
  tx: TransactionClient,
  data: Prisma.BookingEventUncheckedCreateInput
) {
  return tx.bookingEvent.create({ data });
}
