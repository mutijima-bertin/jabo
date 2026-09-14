import { existsSync, readFileSync } from "node:fs";

export const API = "http://localhost:4000/api";

const TOKEN_FILE = "e2e/.auth/admin.json";

/**
 * Admin bearer token written once per run by the "setup" project
 * (e2e/admin.auth.setup.ts — the only caller of /api/auth/login).
 *
 * The auth route is limited to 10 logins / 10 min / IP, and with per-file
 * beforeAll logins every retry re-logged-in and could exhaust the budget
 * mid-run (429 cascades). One shared login per run removes that entire class
 * of flakes. Set `E2E_SKIP_AUTH_SETUP=1` only when you run a single spec
 * against an already-provisioned token file.
 */
export function getAdminToken(): string {
  if (!existsSync(TOKEN_FILE)) {
    throw new Error(`admin token file missing (${TOKEN_FILE}) — run the "setup" project first`);
  }
  return (JSON.parse(readFileSync(TOKEN_FILE, "utf8")) as { token: string }).token;
}