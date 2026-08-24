import type { Request, Response } from "express";
import { z } from "zod";
import { loginAdmin } from "../services/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION", issues: parsed.error.issues.map((i) => i.message) });
    return;
  }
  const token = await loginAdmin(parsed.data.email, parsed.data.password);
  if (!token) {
    res.status(401).json({ error: "INVALID_CREDENTIALS" });
    return;
  }
  res.json({ token });
}
