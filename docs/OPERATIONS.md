# Creative Sound Studio — Operations Manual

**Last updated:** 2026-09-11
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

**Inside the admin panel** (sidebar tabs): **Dashboard** (stats + recent bookings) · **Bookings** (status changes, token revocation) · **Services** (catalog CRUD) · **Portfolio** (drag-and-drop upload — images are auto-converted to WebP, max 1920px) · **Blog** (full CMS) · **Settings** (site texts, **client logos** for the "Trusted by" wall, and **testimonials** — create as Draft, hit **Publish** to make one appear in the homepage section; unpublish anytime) · **Clients** (read-only directory of everyone who booked, with search).

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
| `FRONTEND_URL` | root `.env` (passed by compose) | backend | Base URL for client *portal login* links | `http://localhost:3000` / prod: site domain |
| `FRONTEND_ORIGIN` | root `.env` (passed by compose) | backend | CORS allowed origin for browser→API calls | `http://localhost:3000` / prod: site domain |
| `DATABASE_URL` | compose (auto) / `backend/.env` | backend | Postgres connection string | auto in docker; localhost form for local dev |
| `POSTGRES_PASSWORD` | root `.env` | postgres | DB password. **Required in prod** (`docker-compose.prod.yml` fails without it) | `css123` in dev only |
| `ZAVU_API_KEY`, `ZAVU_SENDER` | root `.env` + `backend/.env` | backend | Zavu SMS sending (booking notifications) | live key already in use; keep out of git |
| `SMTP_HOST/PORT/USER/PASS` | root `.env` | backend | Email sending. **Unconfigured** = emails print to logs instead | empty in dev / prod: real provider required |
| `MAIL_FROM` | root `.env` | backend | From-address. Requires a **verified Resend domain** or sends fail silently | `onboarding@resend.dev` until verified |
| `MAGIC_LINK_TTL_HOURS` | root `.env` | backend | Booking tracking-link lifetime | 168 h |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | frontend browser code | Overrides the API origin. **Leave empty in prod** — the browser uses same-origin `/api` paths via the rewrite, which keeps the image host-agnostic | empty / dev only |
| `NEXT_PUBLIC_SITE_URL` | root `.env` (compose build arg) | seo.ts | `metadataBase`, sitemap, robots, OG URLs. Build-time only | `https://creativesoundstudio.rw` |
| `BACKEND_URL` | compose build arg + runtime env | next.config.ts | Backend origin for the `/api/:path*` and `/uploads/:path*` rewrites | `http://backend:4000` in docker, `http://localhost:4000` locally |

Two rules worth remembering:

1. **Root `.env` feeds the containers; `backend/.env` and `frontend/.env.local` feed hand-run processes.**
   A value added only to `backend/.env` will NOT reach the dockerized backend.
2. Anything `NEXT_PUBLIC_*` is baked into the frontend bundle **at image build time**, not read
   from the environment afterwards. Changing it means rebuilding the frontend image.
   `NEXT_PUBLIC_API_URL` is deliberately empty in production so there is nothing to rebuild
   when the domain changes; `NEXT_PUBLIC_SITE_URL` is the one that genuinely must be baked.

---

## 8. Testing & verification

```sh
# typecheck + production builds must pass
cd backend  && npx tsc --noEmit && npm run build
cd frontend && npm run build

# lint, then end-to-end suite (needs the docker stack UP)
cd frontend && npm run lint

# 26 tests: booking.spec.ts (6) + clients.spec.ts (3) + blog.spec.ts (7) + admin-features.spec.ts (4) + redesign.spec.ts (6)
cd frontend && npx playwright test
```

Playwright facts (`frontend/playwright.config.ts`): base URL `http://localhost:3000`
(override with `E2E_BASE_URL`), Chromium, failed tests retried once, traces kept for failures.
Tests drive the **real** site at :3000 and the API behind it — start docker first
(`docker compose up -d`), then test.

**Known-failing specs — rate limiting (verified 2026-10-03, NOT fixed).** Three specs fail
deterministically on a full run, on a cold backend, *before and after* the Cloudflare hardening:

```
booking.spec.ts:207          dashboard lists all bookings and opens the timeline
client-testimonial.spec.ts:153  client submits a testimonial
clients.spec.ts:92           magic link logs the client in
```

Cause: every request originates from one IP when the suite runs locally, and
`/api/clients/login-request` allows only **5 req / 10 min / IP**. The three specs above each request
a magic link, so a single full run exhausts the budget and the UI never reaches
"Check your email". Reproduced identically on unmodified `HEAD`, so it is pre-existing and not a
regression from the single-origin rewrite.

Confirm the cause before investigating further — `POST /api/clients/login-request` answers
`429 TOO_MANY_ATTEMPTS` once the budget is gone. Real fixes, none taken yet (they change either a
security limit or test behaviour, so they need a decision): make the limit configurable via env and
raise it under test, or give those specs their own limiter budget.

`admin-notifications.spec.ts` is separately **order/state flaky**: it passes 4/4 in isolation but can
fail after repeated full runs against a database that has accumulated notifications. Reset the
database between runs rather than chasing it.

**Security posture (2026-09-11, updated 2026-10-03):** admin uploads rate-limited to 20/hr/IP, post views/likes to 240/hr/IP;
all three containers run as non-root (uid 1000, uploads dir chowned);
a Content-Security-Policy header is served on every frontend route.

In production `connect-src` is `'self'` **only** — the browser reaches the API through the
`/api/:path*` rewrite on the same origin, so no external origin is needed. `http://localhost:4000`
is added back only in development. The CSP deliberately excludes `cdnjs.cloudflare.com`: that CDN
hosts Cloudflare's email-obfuscation decoder and Rocket Loader bootstrap, and allowing it would
re-open both failure modes described in §10. `frontend/e2e/seo.spec.ts` enforces this.

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
On the Vercel/Neon deployment the same symptom usually means a **DB reference without a CDN
object** — run `scripts/verify-cdn-assets.sh` and repair with
`scripts/mirror-uploads-to-cdn.sh` (§11).

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

Target shape: **one public hostname, Cloudflare in front, one server, Docker Compose.**

```
visitor ──TLS──> Cloudflare ──TLS──> Caddy (:443) ──HTTP──> Next.js (:3000)
                                                          └── /api + /uploads ──> Express (:4000)
                                                                    Postgres: unpublished, compose-internal only
```

Single-origin is deliberate. The browser calls `/api` on the same hostname and
`next.config.ts` rewrites it to the backend, so there is no `api.` subdomain, no CORS
handshake to keep in sync, and one certificate to manage.

### DNS — Cloudflare (do this before the server exists)

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | `@` | server IPv4 | **Proxied (orange)** |

Do **not** add a `www` record. The SEO surface is apex-only — no `www` reference exists in
`seo.ts`, the sitemap, `robots.txt`, or any canonical — so a second hostname would only create
a duplicate-content decision. `deploy/Caddyfile` carries a commented redirect if you ever want one.

- [ ] Resend: **"Sign in to Cloudflare"** on the sending domain's Records tab (Domain Connect) —
      this writes the SPF/DKIM records correctly. Skip the manual table below if you use it.
- [ ] Manual fallback (paste values verbatim from Resend; it validates exact strings):

  | Type | Name | Value | Proxy |
  |------|------|-------|-------|
  | MX | `send` | `feedback-smtp.<region>.amazonses.com` | n/a |
  | TXT | `send` | `v=spf1 include:amazonses.com ~all` | grey |
  | TXT | `resend._domainkey` | `p=…` (copy from Resend) | **grey** |
  | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@creativesoundstudio.rw` | grey |

  Three traps: append a **trailing dot** to the MX value or Cloudflare appends your domain to it;
  omit your domain from the *names* (Resend shows `send.example.com`, Cloudflare wants `send`);
  and DKIM records must be **DNS-only** — proxied records never resolve as CNAME/MX and
  verification silently fails. Domains created after August 2026 may show CNAME records instead
  of the MX/TXT pair; follow Resend's table when it does.

### Cloudflare settings — check every one of these

- [ ] **SSL/TLS → Full (strict).** Not Flexible (plaintext edge→origin). Create an Origin Server
      certificate (hostnames: `creativesoundstudio.rw`, RSA 2048, 15 years) and install the
      PEM/key per `deploy/Caddyfile`.
- [ ] **Speed → Optimization → Rocket Loader: OFF.** It adds `data-cfasync="false"` to every
      `<script>`, inverting the ordered execution Next's RSC hydration depends on. The symptom
      is `Uncaught ReferenceError: $RC is not defined` or a page that renders but is dead to
      clicks. Our CSP cannot prevent this — the attribute rewrite lands before CSP is evaluated.
- [ ] **Scrape Shield → Email Address Obfuscation: OFF.** It replaces email text nodes with
      `data-cfemail` ciphertext and relies on a `cdnjs.cloudflare.com` decoder that our CSP
      blocks, so the address would stay encrypted permanently. `/contact` renders the address
      as its primary call to action, so this is a revenue-path break. It rewrites text nodes
      only, so the `mailto:` href would keep working while the visible label turned to a hex
      string — the worst kind of half-broken.
- [ ] **Security → Settings → Bot Fight Mode:** note its state. On the Free plan you cannot write
      a WAF exception, so if it challenges your own `/admin` logins the only fix is turning it off.
- [ ] **Always Use HTTPS** and **Automatic HTTPS Rewrites**: on.
- [ ] Leave caching at default. Cloudflare does not cache HTML without "Cache Everything", so
      canonicals, OG tags and `sitemap.xml` pass through untouched. Optionally add one Cache Rule
      for `/uploads/*` (Free includes 10).

### Server

- [ ] Provision a host (Hetzner CX/CPX in Falkenstein/Nuremberg/Helsinki, or Vultr Johannesburg for
      the shortest Kigali path). 2 vCPU / 4 GB covers all three containers with room to spare.
- [ ] Install Docker + Compose, then allow **only Cloudflare's IP ranges** on 80/443. This is what
      actually hides the origin — and it is what makes the `CF-Connecting-IP` header that
      `deploy/Caddyfile` forwards trustworthy.
- [ ] Strong `ADMIN_PASSWORD`, unique `JWT_SECRET` (`openssl rand -hex 32`), and
      `POSTGRES_PASSWORD` (`openssl rand -hex 32`). The prod compose file fails hard if the last
      one is missing, so `css123` cannot reach a real server.

### URLs and origins

- [ ] `APP_URL`, `FRONTEND_URL`, `FRONTEND_ORIGIN` = `https://creativesoundstudio.rw`.
      Compose now passes all three — previously `FRONTEND_URL`/`FRONTEND_ORIGIN` were missing,
      so magic links would have emitted `localhost:3000`.
- [ ] Leave `NEXT_PUBLIC_API_URL` **empty** (same-origin rewrite handles it) and set
      `NEXT_PUBLIC_SITE_URL=https://creativesoundstudio.rw`.

### Rate limiting behind Cloudflare

The chain to Express is client → Cloudflare → Caddy → Next → Express, which is more hops than
the usual single-proxy case, so `trust proxy` deserves a word.

`app.set("trust proxy", 1)` (in `backend/src/app.ts`) tells Express to read the **rightmost**
entry of `X-Forwarded-For`. That stays correct for a 3-hop chain only because of two properties,
both verified on 2026-10-03 against the running stack:

- Caddy **replaces** `X-Forwarded-For` with `CF-Connecting-IP`, leaving one entry.
  (`header_up X-Forwarded-For {...}` replaces. `header_up +X-Forwarded-For {...}` appends and
  would break this — do not "fix" it that way.)
- Next's rewrite proxy **forwards that header unchanged**, so no extra hop is appended. Proof: a
  two-entry XFF arrives at Express still two-entry, and rate-limit bucketing followed the
  rightmost entry.

Behaviour to preserve: two visitors get separate budgets on `/api/auth/login` (10/10min/IP) and
`/api/admin/uploads` (20/hr/IP). The failure mode to watch for is the opposite — every visitor
sharing one budget, so strangers lock each other out.

Re-verify after any change to Caddy or the proxy setup:

```sh
# 9 requests from one "IP", then a 10th -> 429
for i in $(seq 1 10); do curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -H 'X-Forwarded-For: 203.0.113.9' \
  -d '{"email":"nobody@example.com","password":"wrong"}'; done
# a different forwarded IP must still show a full budget
curl -sI -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -H 'X-Forwarded-For: 198.51.100.42' \
  -d '{"email":"nobody@example.com","password":"wrong"}' | grep -i ratelimit
```

Spoofed `X-Forwarded-For` values create their own buckets, so this does not consume the local
`127.0.0.1` budget the Playwright suite relies on.

### Data safety

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

### Releases (manual SSH)

- [ ] Pull prebuilt images — **no registry login is required.** Both packages are currently public
      on GHCR and pull anonymously. CI publishes `ghcr.io/mutijima-bertin/jabo-{frontend,backend}` on
      merge to `main`. Explicit `-f` flags are required, which also stops Compose auto-loading
      the dev override that publishes Postgres. **Verify the images are fresh before deploying**
      (see note below):
  ```sh
  docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build
  ```
  Migrations apply automatically on backend boot (`migrate deploy`) — no manual schema steps.

- [ ] **Verify image freshness.** CI's `publish-images` job has `continue-on-error: true`; if the
      GHCR push fails, CI stays green and `:main` still points at the PREVIOUS commit's image.
      Before deploying, confirm the remote digests match the commit being deployed:
  ```sh
  docker manifest inspect ghcr.io/mutijima-bertin/jabo-backend:main
  docker manifest inspect ghcr.io/mutijima-bertin/jabo-frontend:main
  ```
      Compare the digest from these manifests against what you expect for the deployed commit.
      A mismatch means the publish failed — re-run the workflow or fall back to building on the
      server.
- [ ] After each release, smoke-test (section 2 checks) and eyeball
      `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=20 backend`.

> **If the packages ever become private**, authentication returns — and it must be done as the user
> that runs Compose, with the token kept out of shell history and logs:
> ```sh
> read -rs GHCR_PAT && echo "$GHCR_PAT" | docker login ghcr.io -u mutijima-bertin --password-stdin
> unset GHCR_PAT
> ```
> Re-verify anonymous access after any change to package visibility, since a private package makes
> every server's first `pull` fail with `unauthorized` rather than a clear message.

### Post-deploy verification

`frontend/e2e/seo.spec.ts` is **read-only** (only `goto`/`get`), so it is the one spec safe to
point at production. Scope it explicitly — the rest of the suite creates bookings and
testimonials and must never run against the live site.

- [ ] Confirm the Cloudflare toggles against the real response, not just the dashboard:
  ```sh
  curl -s https://creativesoundstudio.rw | grep -c 'data-cfasync'                    # 0
  curl -s https://creativesoundstudio.rw | grep -c 'data-cfemail'                     # 0
  curl -s https://creativesoundstudio.rw | grep -c 'hello@creativesoundstudio.rw'    # >0
  ```
- [ ] Run the automated guard (asserts all three, plus the CSP excludes the Cloudflare CDN):
  ```sh
  cd frontend && E2E_BASE_URL=https://creativesoundstudio.rw npx playwright test e2e/seo.spec.ts
  ```
  The edge-transform test reports SKIPPED without `E2E_BASE_URL` — it cannot detect Cloudflare
  from localhost, so never read a green local run as proof.

- [ ] `curl -s https://creativesoundstudio.rw/api/health` → `{"status":"ok","db":"up"}`.
- [ ] Submit a test booking; confirm the confirmation email's tracking link is
      `https://creativesoundstudio.rw/track/<token>` and not `localhost`.
- [ ] Upload one image in the admin panel; confirm it renders through `/uploads/*`.
- [ ] Watch `/api/health` with an uptime checker (HTTP 503 when the DB is down).
- [ ] Restart policy is already `unless-stopped` on all three services — containers come back after reboot/crash.
- [ ] Glance at the logs weekly; the backend crashes loudly instead of silently, so absence of FATAL lines is meaningful.

### Known launch limits

- [ ] **Video is not stored.** Studio video lives on YouTube and is embedded by URL. Uploads accept
      images only (`isAllowedMime` rejects `video/*`); the JSON body ceiling is 15 MB, which covers
      a 10 MB image after base64 inflation. Cloudflare's Free-plan 100 MB request cap is therefore
      never the binding constraint.
- [ ] `mediaType: "video"` still exists on portfolio items but only changes an alt-text word
      ("videography" vs "photography") — it does not alter rendering. YouTube embeds would need a
      separate feature: a real video URL field, an iframe branch in `Lightbox.tsx`, a poster image
      plus play glyph in `PortfolioGrid`, and a `frame-src` directive in the CSP (there is none
      today, so iframes fall back to `default-src 'self'` and are blocked).
- [ ] A CI-built frontend image gets `NEXT_PUBLIC_SITE_URL` as a build arg (via the GitHub Actions
      repository variable `vars.NEXT_PUBLIC_SITE_URL`, defaulting to `https://creativesoundstudio.rw`)
      and is inlined at build time by `frontend/Dockerfile`. This replaces the implicit fallback;
      the value is explicit and configurable.

---

## 11. CDN asset integrity — verify & mirror

**The invariant:** every image the database references as `/uploads/<path>` must exist on the
public Vercel Blob store **`css-backend-blob-public`**, base URL

```
https://x9eveaplhocclmvl.public.blob.vercel-storage.com/<path>
```

so `/uploads/images/x.webp` is served at `…/images/x.webp` (the backend answers `/uploads/…`
with a 302 onto that base). **Never** commit the store token: `BLOB_READ_WRITE_TOKEN` and
`DATABASE_URL` are read at runtime from the environment or the gitignored `backend/.env.neon`,
and neither script ever prints them.

**Why this section exists.** Once already, the database carried 50 `/uploads/…` references
while 39 of the files existed only inside the running `css-backend` container
(`/app/uploads/images/`, the **docker-era source of truth**, 204 files) and had never been
mirrored to the CDN — broken images in admin and on the public site, found twice before
anyone noticed. Two scripts make that failure loud instead of silent:

| Script | Purpose |
|--------|---------|
| `scripts/verify-cdn-assets.sh` | Read-only audit. Pulls every reference out of Postgres (`PortfolioItem.coverUrl` + `mediaUrls`, `Service.imageUrl`, `BlogPost.coverImageUrl`, `ClientLogo.imageUrl`, `SiteSetting.value` starting `/uploads/`), deduplicates, HEADs each CDN URL and prints `total/ok/broken`. Exits **1** if anything is not HTTP 200, if psql/the DB fails, or if the query returns 0 rows (so a broken connection can never masquerade as "0 broken"). |
| `scripts/mirror-uploads-to-cdn.sh` | Repair. For every referenced file missing on the CDN it finds the bytes — first `backend/uploads/<path>` (repo-local), else `docker exec css-backend cat /app/uploads/<path>` — and uploads with `npx --yes vercel blob put <file> --pathname "<path>" --access public --allow-overwrite true`. Reports `NOT-RECOVERABLE` (exit 1) when neither source has the file. Idempotent: present objects are skipped, so it can be re-run/resumed at any time; it never deletes. |

**Run these after any DB restore, reseed, or image drift:**

```sh
scripts/verify-cdn-assets.sh            # audit — must print "broken=0" and exit 0
scripts/mirror-uploads-to-cdn.sh --check  # dry run: what WOULD be uploaded
scripts/mirror-uploads-to-cdn.sh        # repair the pending files
```

Options worth knowing:

- `--all` (mirror) additionally pushes **every** docker-era/repo-local file that is absent on
  the CDN — the full archival mirror — and refuses to run if `css-backend` is not up (a partial
  archival mirror defeats its purpose). Default stays DB-referenced-only.
- psql is invoked **inside the `css-postgres` container by default** (`docker exec … psql`,
  this machine has no host psql); pass `--no-docker` (or `PSQL=<binary>`) for a host binary —
  that is what CI does. `--docker-exec` forces the container path and fails loudly if it is down.
- Files uploaded through the **Vercel-deployed** backend go straight to Blob (its filesystem is
  ephemeral), so they have **no** local copy anywhere; `NOT-RECOVERABLE` then means exactly that.

**CI:** `.github/workflows/verify-assets.yml` runs `scripts/verify-cdn-assets.sh --no-docker`
on every push to `main` and on manual `workflow_dispatch`, using the existing `DATABASE_URL`
GitHub secret (never echoed; the workflow fails up front if the secret is missing). The runner
installs `postgresql-client` with apt — the same bash+curl+psql code path as a local run, so CI
and local can never disagree. Any broken reference fails the job.

---

*Every fact in this file was verified against the repository on 2026-10-03: `docker-compose.yml`,
`docker-compose.override.yml`, `docker-compose.prod.yml`, `deploy/Caddyfile`, both Dockerfiles,
`backend/src/index.ts`, `backend/src/app.ts`, `backend/src/config/env.ts`, `backend/src/services/storage.ts`,
`backend/src/services/emailTemplates.ts`, `frontend/next.config.ts`, `frontend/src/lib/apiOrigin.ts`,
Playwright config and specs, and `docs/DATABASE.md`. §11 (plus the §9 cross-reference) was added
and verified on 2026-10-08 against `scripts/verify-cdn-assets.sh`,
`scripts/mirror-uploads-to-cdn.sh`, `.github/workflows/verify-assets.yml` and a live scan of all
50 database references (50/50 HTTP 200 on the public Blob store).*
