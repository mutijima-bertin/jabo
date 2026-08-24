import type { Request, Response } from "express";
import * as clientModel from "../models/client.model";

/** Admin view of portal clients (read-only; clients are created via bookings/portal). */
export async function listClients(_req: Request, res: Response): Promise<void> {
  const clients = await clientModel.listForAdmin();
  res.json(clients);
}
