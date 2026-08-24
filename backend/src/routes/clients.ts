import { Router } from "express";
import * as clientsController from "../controllers/clients.controller";
import { limiter } from "../middleware/rateLimit";
import { requireClient } from "../middleware/auth";

export const clientsRouter = Router();

const loginRequestLimiter = limiter({ windowMs: 10 * 60 * 1000, max: 5, message: "TOO_MANY_ATTEMPTS" });

clientsRouter.post("/clients/login-request", loginRequestLimiter, clientsController.requestLogin);
clientsRouter.post("/clients/login/:token", clientsController.exchangeLoginToken);
clientsRouter.get("/clients/me", requireClient, clientsController.getMe);
