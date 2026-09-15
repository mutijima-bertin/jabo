import { Router } from "express";
import * as clientsController from "../controllers/clients.controller";
import { limiter } from "../middleware/rateLimit";
import { requireClient } from "../middleware/auth";

export const clientsRouter = Router();

const loginRequestLimiter = limiter({ windowMs: 10 * 60 * 1000, max: 5, message: "TOO_MANY_ATTEMPTS" });
// A client may resubmit after a rejected revision, but a flooded/leaked client
// token must not spam the admin approval queue — max 5 submissions per IP/hour.
const testiLimiter = limiter({ windowMs: 60 * 60 * 1000, max: 5, message: "TOO_MANY_ATTEMPTS" });

clientsRouter.post("/clients/login-request", loginRequestLimiter, clientsController.requestLogin);
clientsRouter.post("/clients/login/:token", clientsController.exchangeLoginToken);
// Specific paths MUST precede any :param route on this router (currently the
// file is all exact paths, but this ordering rule is sticky).
clientsRouter.get("/clients/testimonials/me", requireClient, clientsController.getMyTestimonial);
clientsRouter.post("/clients/testimonials", testiLimiter, requireClient, clientsController.postTestimonial);
clientsRouter.get("/clients/me", requireClient, clientsController.getMe);
// Dashboard "view details": mint a fresh magic token for one of the client's own bookings.
clientsRouter.post("/clients/bookings/:id/track-token", requireClient, clientsController.getBookingTrackToken);