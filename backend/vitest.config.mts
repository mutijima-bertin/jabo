import { configDefaults, defineConfig } from "vitest/config";

// Isolated Postgres for tests only — never the live creativesoundstudio DB.
// Env vars here are set BEFORE dotenv loads (backend/.env), so they win:
// dotenv never overrides an already-present variable. A matching DB is
// prepared by running `prisma migrate deploy` against this URL.
export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    // `dist/` is produced by `npm run build` (tsc also emits *.test.js); keep
    // vitest from executing the compiled copy of this suite.
    exclude: [...configDefaults.exclude, "dist/**"],
    env: {
      DATABASE_URL: "postgresql://css:css123@localhost:5432/creativesoundstudio_test?schema=public",
      JWT_SECRET: "test-only-secret-0123456789abcdef0123456789abcdef",
      NODE_ENV: "test",
    },
  },
});