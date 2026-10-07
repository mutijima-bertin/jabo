# Database migrations

Applied by two paths:

- **Local / Docker** — the backend container runs `prisma migrate deploy` on
  every boot (`backend/Dockerfile`).
- **Vercel production** — no container boot exists there, so the GitHub Actions
  workflow `migrate.yml` runs `prisma migrate deploy` against the `DATABASE_URL`
  secret on every push to `main` that touches this directory (and on manual
  `workflow_dispatch`).

## Rules

- **Never edit a migration that has already been applied anywhere** — Prisma
  records a checksum of each file in `_prisma_migrations` and a mismatch makes
  the next `migrate deploy` fail. Fix mistakes with a new `prisma migrate dev`
  migration instead.
- Schema changes are authored with `npm run prisma:migrate` (dev, generates SQL
  and applies it to the local database); `prisma.config.ts` keeps the seed
  command wired to `prisma/seed.ts`.
