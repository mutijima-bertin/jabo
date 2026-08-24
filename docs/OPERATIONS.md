# Creative Sound Studio — Operations Manual

**Last updated:** 2026-08-24
**Audience:** the site owner. Plain language, no assumed expertise beyond basic terminal use.
**Companion doc:** [docs/DATABASE.md](DATABASE.md) — full database table map. This file does not repeat it.

---

## 1. What is running here

Three containers, started by one command from the repo root (`docker compose up -d`).
The file that describes them is `docker-compose.yml` in the repo root.

```
   your browser
     |
     |  :3000 — pages, /admin panel, /login + /account portal,
     |          /uploads/... images (proxied through the frontend)
     v
css-frontend  (Next.js website, port 3000)
     |
     |  server-side data fetching over the Docker network
     v
css-backend   (Express API, port 4000)   <-- browser calls forms/likes here too
     |
     |  SQL (only the backend touches the database)
     v
css-postgres  (PostgreSQL 16, port 5432)

css-backend --> outside world: Zavu SMS (if key set), SMTP email (not configured yet)
```

Who talks to whom:

- **Browser → frontend (:3000):** all pages, admin panel, client portal; also `/uploads/...` images, which are stored by the backend but served *through the frontend* via a rewrite in `frontend/next.config.ts` so they load same-origin.
- **Frontend server → backend:** server-rendered pages fetch API data over the internal Docker network (`http://backend:4000`).
- **Browser → backend (:4000):** forms and buttons (booking form, blog likes) call the API directly at `http://localhost:4000`.
- **Backend → Postgres (:5432):** only the backend touches the database.
- **Backend → outside world:** Zavu SMS API (if key set) and SMTP email (not configured yet — see section 7).

### Ports

| Port | Container | What it is |
|------|-----------|------------|
| 3000 | css-frontend | Website + `/admin` panel + `/login`, `/account` client portal |
| 4000 | css-backend | REST API under `/api`, plus `/uploads` static files |
| 5432 | css-postgres | PostgreSQL database `creativesoundstudio`, user `css` |

On boot the backend container **automatically runs migrations and seed data**
(`npx prisma migrate deploy && npx prisma db seed` — see `backend/Dockerfile`),
so a fresh dockerized start needs no manual database steps.

---

## 2. Quick start — fully dockerized (recommended)

This is the happy path. Everything is self-contained: website, API, database.

```sh
# one-time: copy the example env file, then edit .env (see below)
cp .env.example .env

# generate a strong secret for JWT_SECRET in .env
openssl rand -hex 32

# build the images and start all three containers in the background
docker compose up -d --build

# first boot takes a minute: migrations run, seed data loads
docker compose ps
```

In `.env`, set `ADMIN_EMAIL` / `ADMIN_PASSWORD` (your `/admin` login; dev values are fine locally)
and paste the generated `JWT_SECRET`. Leave `SMTP_*` empty for now — magic links will print to logs instead.

Wait until all three containers show running/healthy, then smoke-check:

```sh
# API health — expect {"status":"ok","db":"up",...}
curl -s http://localhost:4000/api/health

# public posts list — expect []
curl -s http://localhost:4000/api/public/posts
```

| URL | What |
|-----|------|
| http://localhost:3000 | Public website |
| http://localhost:3000/admin | Admin panel (log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
| http://localhost:3000/login , `/account` | Client portal (magic link) |
| http://localhost:4000/api/health | API health probe |

To stop later:

```sh
# stop everything (data is kept in named volumes)
docker compose down
```

---

## 3. Running locally for development

You do not have to dockerize what you are editing. The usual split:

- **Postgres:** still easiest as its container (it holds the data volume).
- **Backend:** `npm run dev` — TypeScript watch mode, restarts on save.
- **Frontend:** `npm run dev` — Next.js dev server with hot reload (Turbopack).

```sh
# 1. database only
docker compose up -d postgres

# 2. backend, in a second terminal (reads backend/.env)
cd backend && npm run dev

# 3. frontend, in a third terminal (reads frontend/.env.local)
cd frontend && npm run dev
```

Local-dev env files (already present, never commit them): root `.env` feeds the *containers*;
`backend/.env` feeds the hand-run backend (DB at `localhost:5432`, Zavu SMS key lives here);
`frontend/.env.local` points the hand-run frontend at `localhost:4000`.

### The port-4000 rule — read this before starting the backend by hand

The backend listens on **4000**, and so does the `css-backend` container. If you try to run
`npm start` (or `npm run dev`) while the container is up, they fight over the port.

This used to fail **silently**: the process printed "listening" then quietly exited with code 0
and no error. That bug is fixed. It now fails loudly with this exact message (from
`backend/src/index.ts`):

```
FATAL: Port 4000 already in use — the css-backend docker container is probably running.
  Stop it:            docker stop css-backend
  Or use another port: PORT=<n> npm start
```

Do exactly one of the two things it suggests. Related loud failures: a permission-denied port
prints an EACCES message (use a port above 1024), and any unhandled crash now prints
`[css-backend] FATAL: ...` and exits non-zero instead of limping along.

Rule of thumb: **check who owns the ports before starting anything by hand** (next section).

The frontend has the same rule, it just fails quieter: if :3000 is taken (usually by the running
`css-frontend` container), `next dev` silently moves itself to :3001 and the backend will
CORS-reject that origin (see the CORS entry in section 9).

---

## 4. Checking state: who owns my ports?

Run these before blaming code.

```sh
# which of our containers are up, since when, on which ports
docker ps

# what is listening on port 4000 right now (works for any process, docker or not)
ss -ltnp | grep 4000

# same for 3000
ss -ltnp | grep 3000
```

Reading `ss` output: the `users:(("node",pid=123))` part names the owning process;
`docker-proxy` means a container owns the port — match it to a name via `docker ps`.

Log patterns you will actually use:

```sh
# follow backend logs live (bookings, notifications, errors)
docker compose logs -f backend

# fetch a CLIENT PORTAL magic link (SMTP not configured, so links print here)
docker logs css-backend 2>&1 | grep -i "magic"

# last 50 lines if things just broke
docker compose logs --tail=50 backend
```

The magic-link log line looks like:
`[mailer] Magic login link for <email>: http://localhost:3000/login?token=...`
Copy the whole URL into the browser within **15 minutes** (single-use). Booking *tracking*
links (`/track/<token>`) are a different mechanism and last 168 hours (`MAGIC_LINK_TTL_HOURS`).

---

## 5. Stopping, restarting, rebuilding

```sh
# stop everything, keep data
docker compose down

# stop and also delete the data volumes (DESTRUCTIVE — wipes bookings/uploads)
docker compose down -v

# restart one service after config/env changes to .env
docker compose up -d backend

# REBUILD one service after CODE changes
docker compose build frontend && docker compose up -d frontend
docker compose build backend  && docker compose up -d backend
```

### Why rebuild is mandatory after code edits (the stale-container lesson)

A running container runs the **image built when you last ran `docker compose build`**.
Editing files in the repo changes nothing inside a running container. We were bitten by this:
the site showed old pages even though the local build was green, because the deployed image
predated the changes.

After any code change you intend to see live:

```sh
# rebuild, restart, then confirm the image is fresh
docker compose build <service> && docker compose up -d <service>
docker inspect css-frontend --format '{{.Created}}'
```

If `Created` is not today, you are looking at a stale container.

---

## 6. Database operations

Prisma migrations are the **only** way tables are created or changed. Never hand-write SQL DDL.
Full schema map, migration history, enums, indexes: see [docs/DATABASE.md](DATABASE.md).

All commands below run from the `backend/` directory.

```sh
# apply pending migrations (what production/the container does on boot)
npx prisma migrate deploy

# create a migration after editing schema.prisma (development only)
npx prisma migrate dev --name describe_the_change

# re-run seed data (idempotent: safe to repeat, never deletes)
npx prisma db seed
```

Inspecting live data without installing anything:

```sh
# list tables / row counts / interactive SQL shell
docker exec css-postgres psql -U css -d creativesoundstudio -c '\dt'
docker exec css-postgres psql -U css -d creativesoundstudio -c 'SELECT count(*) FROM "Booking";'
docker exec -it css-postgres psql -U css -d creativesoundstudio
```

Seed creates: 1 admin user (from `ADMIN_EMAIL`/`ADMIN_PASSWORD`), 10 services,
8 site settings, 4 client logos. It does **not** touch bookings, uploads or blog posts.
Details and per-table reference: [docs/DATABASE.md](DATABASE.md).

---

## 7. Environment variables reference

| Variable | Lives in | Feeds | What it does | Dev value / prod action |
|----------|----------|-------|--------------|--------------------------|
| `ADMIN_EMAIL` | root `.env` | backend | Admin login email; also seeds the admin User (upsert by email) | owner's real address |
| `ADMIN_PASSWORD` | root `.env` | backend | Admin login password | owner's real password — never commit |
| `JWT_SECRET` | root `.env` | backend | Signs auth tokens. Startup refuses known-insecure values | prod: `openssl rand -hex 32` |
| `APP_URL` | root `.env` | backend | Base URL for booking *tracking* links (`/track/<token>`) | `http://localhost:3000` / prod: site domain |
| `FRONTEND_URL` | backend env (default applies) | backend | Base URL for client *portal login* links | default `http://localhost:3000`; **add explicitly for prod** |
| `FRONTEND_ORIGIN` | backend env (default applies) | backend | CORS allowed origin for browser→API calls | default `http://localhost:3000`; prod: site domain |
| `DATABASE_URL` | compose (auto) / `backend/.env` | backend | Postgres connection string | auto in docker; localhost form for local dev |
| `ZAVU_API_KEY`, `ZAVU_SENDER` | root `.env` + `backend/.env` | backend | Zavu SMS sending (booking notifications) | live key already in use; keep out of git |
| `SMTP_HOST/PORT/USER/PASS` | root `.env` | backend | Email sending. **Unconfigured** = emails print to logs instead | empty in dev / prod: real provider required |
| `MAGIC_LINK_TTL_HOURS` | compose (fixed `"168"`) | backend | Booking tracking-link lifetime | 168 h |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local`, compose env | frontend browser code | Address browsers use to reach the API | `http://localhost:4000`; prod: real API URL **at build time** |
| `BACKEND_URL` | compose build arg + `frontend/.env.local` | next.config.ts | Backend origin for the `/uploads/:path*` rewrite (baked at build) | `http://backend:4000` in docker, `http://localhost:4000` locally |

Two rules worth remembering:

1. **Root `.env` feeds the containers; `backend/.env` and `frontend/.env.local` feed hand-run processes.**
   A value added only to `backend/.env` will NOT reach the dockerized backend.
2. Anything `NEXT_PUBLIC_*` is baked into the frontend bundle **at image build time**, not read
   from the environment afterwards. Changing it means rebuilding the frontend image.

---

## 8. Testing & verification

```sh
# typecheck + production builds must pass
cd backend  && npx tsc --noEmit && npm run build
cd frontend && npm run build

# lint, then end-to-end suite (needs the docker stack UP)
cd frontend && npm run lint

# 16 tests: booking.spec.ts (6) + clients.spec.ts (3) + blog.spec.ts (7)
cd frontend && npx playwright test
```

Playwright facts (`frontend/playwright.config.ts`): base URL `http://localhost:3000`, Chromium,
failed tests retried once, traces kept for failures. Tests drive the **real** site at :3000 and
API at :4000 — start docker first (`docker compose up -d`), then test.

**Rate-limit caveat:** `/api/clients/login-request` allows **5 requests per IP per 10 minutes**
(anti-enumeration, by design). The suite uses exactly two calls, but back-to-back full runs can
flake those tests on HTTP 429. Wait ~10 minutes between full reruns.

---

## 9. Troubleshooting cookbook

**Symptom → cause → fix.**

### "My `npm start` printed nothing and exited"
Old silent-exit behavior; now fixed — the same situation prints the loud FATAL message from
section 3. If you still see quiet exits you are running old code: pull and rebuild.
Fix remains: `docker stop css-backend`, or `PORT=4001 npm start`.

### Site shows old pages / new feature missing live
Stale container image (section 5). Rebuild the service, restart, verify
`docker inspect css-<svc> --format '{{.Created}}'` is recent, hard-refresh (Ctrl+Shift+R).

### Client says "magic link didn't arrive"
SMTP is not configured — links print to backend logs, not email. Fetch with
`docker logs css-backend 2>&1 | grep -i "magic"`. Portal links expire in 15 minutes,
single-use; request a fresh one rather than retrying an old URL.

### Uploaded cover images don't show
Flow: backend storage → frontend rewrite `/uploads/:path*` → `BACKEND_URL`. If images 404:
(1) check files exist: `docker exec css-backend ls /app/uploads`;
(2) confirm the frontend was **built** with the right `BACKEND_URL` (build-time constant).

### `curl http://localhost:4000/api/health` → connection refused
Backend not running or crashed. `docker compose ps`, then `docker compose logs --tail=50 backend`.
Bad env fails fast: `Missing required environment variable: NAME`, or a placeholder `JWT_SECRET`
is refused as insecure.

### Database connection refused / P1001 errors in backend logs
Postgres down or not ready: `docker compose up -d postgres`, wait for *healthy* in
`docker compose ps`. Hand-run backends need `localhost:5432` (what `backend/.env` has),
not the docker hostname.

### Port 5432 already in use
A local Postgres install may own it. Stop it, or remap in `docker-compose.yml`
(e.g. `"5433:5432"`) and update DATABASE_URLs accordingly.

### E2E failures mentioning TOO_MANY_ATTEMPTS or login-request
Rate limit, not a bug (section 8). Wait 10 minutes, rerun.

### Admin login rejected
Credentials come from root `.env` and are seeded into the User table at boot. Changed `.env`
after first boot? Re-seed: `cd backend && npx prisma db seed`.

### Login dies with CORS / NetworkError when running local dev
Browser console: `Cross-Origin Request Blocked ... http://localhost:4000/api/auth/login ... CORS
header 'Access-Control-Allow-Origin' does not match 'http://localhost:3000'` plus
`NetworkError when attempting to fetch resource.` Cause chain: the `css-frontend` container owns
:3000, so your hand-run `npm run dev` quietly shifted itself to :3001 — and the backend CORS
whitelist (`FRONTEND_ORIGIN`, default `http://localhost:3000`) only knows :3000, so it rejects
every browser→API call coming from :3001. Fix — pick one: **Mode A:** `docker stop css-frontend`,
restart your local dev server, it gets :3000 back. **Mode B:** stay fully dockerized and work on
:3000. Advanced: if you must develop on :3001, set `FRONTEND_ORIGIN=http://localhost:<port>` in
the *local* backend env (`backend/.env`) and restart the hand-run backend. This is the frontend
twin of the port-4000 rule in section 3: **one boss per port** — it applies to the frontend just
as much as to the backend.

### Hydration mismatch warning mentioning `data-darkreader-*`
Not a site bug. The Dark Reader **browser extension** rewrites page colors in the DOM before
React hydrates, so React finds attributes it did not render and logs a mismatch warning.
Disable Dark Reader for localhost (or check in a private window without extensions); otherwise
the warning is safe to ignore — pages render correctly.

---

## 10. Going live — production checklist

Hosting-provider-neutral (any VPS or host that runs Docker). Work top to bottom.

**Secrets and accounts**

- [ ] Set a strong `ADMIN_PASSWORD` and a unique `JWT_SECRET` (`openssl rand -hex 32`). Never reuse dev values.
- [ ] Keep the real `.env` out of git (it is gitignored; `.env.example` documents the shape).

**Email — make magic links actually arrive**

- [ ] Fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` with a real transactional email provider. Until then, client portal links only exist in container logs.

**URLs and origins**

- [ ] Set `FRONTEND_URL` (portal login links) and `APP_URL` (tracking links) to the real site domain — note neither is currently passed in `docker-compose.yml`; add them to the backend `environment:` block.
- [ ] Set `FRONTEND_ORIGIN` to the same domain (CORS allows exactly this origin for browser→API calls).
- [ ] Browser-side code reaches the API at whatever `NEXT_PUBLIC_API_URL` was at **build time**; pass it as a frontend build arg pointing at the public API URL (e.g. `https://api.yourdomain.rw`) and rebuild. Also point `BACKEND_URL` at the same public origin so `/uploads` keeps working.

**HTTPS**

- [ ] Terminate TLS with a reverse proxy in front of the stack (Caddy or nginx+certbot) forwarding :80/:443 → :3000, plus the API hostname → :4000. Do not expose raw ports to the internet.

**Data safety**

- [ ] Data lives in named volumes `postgres-data` and `uploads-data`. They survive `docker compose down` but NOT host loss — back both up.
- [ ] Nightly database dump (cron):
  ```sh
  # dump the whole DB to a dated file
  docker exec css-postgres pg_dump -U css creativesoundstudio > backup-$(date +%F).sql
  ```
- [ ] Back up uploaded media too — copy out of the volume:
  ```sh
  # tar the uploads directory out of its volume
  docker run --rm -v jabo_uploads-data:/data -v $(pwd):/out alpine tar czf /out/uploads-$(date +%F).tgz -C /data .
  ```
  (Volume name is prefixed with the compose project name; check with `docker volume ls`.)
- [ ] Test a restore once: `cat backup.sql | docker exec -i css-postgres psql -U css -d creativesoundstudio` into a scratch database.

**Releases**

- [ ] Deploy = pull code, `docker compose build backend frontend`, `docker compose up -d`. Migrations apply automatically on backend boot (`migrate deploy`) — no manual schema steps.
- [ ] After each release, smoke-test (section 2 checks) and eyeball `docker compose logs --tail=20 backend`.

**Monitoring basics**

- [ ] Watch `/api/health` (returns `{status:"ok",db:"up"}`, HTTP 503 when the DB is down) with any uptime checker.
- [ ] Restart policy is already `unless-stopped` on all three services — containers come back after reboot/crash.
- [ ] Glance at `docker compose logs` weekly; the backend crashes loudly instead of silently, so absence of FATAL lines is meaningful.

---

*Every fact in this file was verified against the repository on 2026-08-24: `docker-compose.yml`,
both Dockerfiles, `backend/src/index.ts`, `backend/src/config/env.ts`, service/controller sources,
`frontend/next.config.ts`, Playwright config and specs, and `docs/DATABASE.md`.*
