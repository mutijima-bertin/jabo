import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { limiter } from "../middleware/rateLimit";

export const authRouter = Router();

const loginLimiter = limiter({ windowMs: 10 * 60 * 1000, max: 10, message: "TOO_MANY_ATTEMPTS" });

authRouter.post("/auth/login", loginLimiter, authController.login);
