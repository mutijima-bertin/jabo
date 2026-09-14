import { test as setup, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { API } from "./auth";

/**
 * Runs BEFORE the chromium project (project dependency) and performs the one
 * admin login the whole suite reuses. Token lands in e2e/.auth/admin.json,
 * where every spec's beforeAll picks it up via getAdminToken(). Re-running
 * the project merely reuses the existing login if it's still valid.
 */
setup("authenticate as admin (once per suite run)", async ({ request }) => {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  });
  expect(res.ok(), `admin login failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const { token } = (await res.json()) as { token: string };
  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync("e2e/.auth/admin.json", JSON.stringify({ token }));
});