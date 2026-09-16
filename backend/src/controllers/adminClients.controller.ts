import type { Request, Response } from "express";
import * as clientModel from "../models/client.model";
import { pathParam } from "./params";

/** Admin view of portal clients (read-only; clients are created via bookings/portal). */
export async function listClients(_req: Request, res: Response): Promise<void> {
  const clients = await clientModel.listForAdmin();
  res.json(clients);
}

/**
 * Admin deletion: removes the client plus every row they own (bookings and
 * client-sourced testimonials) in one transaction. Only the model's labeled
 * CLIENT_NOT_FOUND maps to 404; any other failure is a real server error and
 * propagates to the global JSON handler (500).
 */
export async function removeClient(req: Request, res: Response): Promise<void> {
  try {
    const { deletedBookings, deletedTestimonials } = await clientModel.removeWithRelated(pathParam(req, "id"));
    res.json({ ok: true, deletedBookings, deletedTestimonials });
  } catch (err) {
    if ((err as Error).message === "CLIENT_NOT_FOUND") {
      res.status(404).json({ error: "CLIENT_NOT_FOUND" });
      return;
    }
    throw err;
  }
}
