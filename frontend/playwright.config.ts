import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Local runs: load the gitignored root .env so e2e specs can use the real
// ADMIN_EMAIL / ADMIN_PASSWORD without hardcoding credentials here.
// Existing env always wins (CI passes its own dev placeholders explicitly).
for (const candidate of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../.env")]) {
  try {
    const raw = readFileSync(candidate, "utf8");
    for (const line of raw.split("\n")) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    /* file missing — try next candidate */
  }
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
