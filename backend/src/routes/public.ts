import { Router } from "express";
import * as publicController from "../controllers/public.controller";
import * as postsController from "../controllers/posts.controller";
import * as bookingsController from "../controllers/bookings.controller";
import { limiter, perEmailLimit } from "../middleware/rateLimit";

export const publicRouter = Router();

const createBookingLimiter = limiter({ windowMs: 60 * 60 * 1000, max: 30, message: "TOO_MANY_BOOKINGS" });
const trackLimiter = limiter({ windowMs: 60 * 60 * 1000, max: 240, message: "TOO_MANY_REQUESTS" });
// Feed/news-adjacent endpoints are unauthenticated → same 240/hr per-IP cap as tracking.
const postLikeLimiter = limiter({ windowMs: 60 * 60 * 1000, max: 240, message: "TOO_MANY_REQUESTS" });

publicRouter.get("/public/services", publicController.listServices);
publicRouter.get("/public/portfolio", publicController.listPortfolio);
publicRouter.get("/public/logos", publicController.listLogos);
publicRouter.get("/public/testimonials", publicController.listTestimonials);
publicRouter.get("/public/settings", publicController.getSettings);

publicRouter.post(
  "/bookings",
  createBookingLimiter,
  perEmailLimit(60 * 60 * 1000, 5, "TOO_MANY_BOOKINGS_FOR_EMAIL"),
  bookingsController.create
);
publicRouter.get("/bookings/track/:token", trackLimiter, bookingsController.trackByToken);

// ---------- Blog ----------
publicRouter.get("/public/posts", postsController.listPosts);
publicRouter.get("/public/posts/:slug", postsController.getPostBySlug);
publicRouter.post("/public/posts/:id/like", postLikeLimiter, postsController.likePost);
