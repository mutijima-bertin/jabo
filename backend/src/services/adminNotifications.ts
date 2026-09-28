import { Prisma, type AdminNotificationType } from "@prisma/client";
import * as adminNotificationModel from "../models/adminNotification.model";

/**
 * Fire-and-forget in-app admin notification writer. NEVER throws to the caller —
 * every event writer (booking creation, status change, contact form, testimonial,
 * send-failure) funnels through this so a notification-storage hiccup can never
 * break the booking/contact/testimonial request path. Errors are logged with a
 * stable prefix for the operator.
 */
export async function notifyAdmin(
  type: AdminNotificationType,
  payload: Prisma.JsonObject,
  linkHref: string | null = null
): Promise<void> {
  try {
    await adminNotificationModel.create(type, payload, linkHref);
  } catch (err) {
    console.error("[admin-notify] notification write failed:", (err as Error).message ?? err);
  }
}