# Creative Sound Studio

The studio platform for **Creative Sound Studio** — photography · videography · livestreaming — based in Kigali, Rwanda.

One system for everything the studio runs on: a bilingual public site with a booking engine, a password-free client portal, and a full admin CMS with a blog.

## Features

- **Smart booking form** — clients request a production from a live services catalog; the studio gets notified by email and WhatsApp.
- **Client portal** — clients sign in with a single-use magic link sent by email. No passwords, no account creation.
- **Admin dashboard** — manage bookings, the services catalog, portfolio items (drag-and-drop ordering), blog posts, and site settings at `/admin`.
- **Blog CMS** — bilingual markdown articles with per-post view and like counters.
- **Bilingual site** — every page is available in English and Kinyarwanda.
- **Plain security model** — JWT-based admin sessions, plus single-use client login tokens stored as hashes with a short expiry.

## Tech stack

| Layer      | What it uses                                              |
| ---------- | --------------------------------------------------------- |
| Frontend   | Next.js 16 (App Router), React 19, Tailwind CSS v4, Turbopack |
| Backend    | Node.js 22, Express 5, TypeScript, Zod validation         |
| Database   | PostgreSQL 16 via Prisma 7                                 |
| Messaging  | SMTP email (Nodemailer) + Zavu WhatsApp API (both optional)|
| Testing    | Playwright end-to-end suite (16 specs)                     |
| Deployment | Docker Compose — three containers, one command             |

## Architecture

```
     browser
        |
        |  :3000 — pages, /admin panel, /login + /account portal,
        |          /uploads/... images (stored by the backend,
        |          proxied through the frontend so they load same-origin)
        v
 css-frontend   Next.js website, port 3000
        |
        |  server-rendered pages fetch API data over the Docker network
        v
 css-backend    Express API, port 4000    <-- browser calls forms/likes here too
        |
        |  SQL — only the backend touches the database
        v
 css-postgres   PostgreSQL, port 5432

 css-backend -> outside world: SMTP email, Zavu WhatsApp (each optional)
```

## Quick start (dockerized)

Requires Docker and Docker Compose.

```sh
# 1. create your env file from the example
cp .env.example .env

# 2. edit .env:
#    JWT_SECRET     -> generate one:  openssl rand -hex 32
#    ADMIN_EMAIL    -> the admin login email you want
#    ADMIN_PASSWORD -> the admin login password you want

# 3. build the images and start all three containers
docker compose up -d --build
```

First boot takes about a minute: the backend runs database migrations and loads seed data automatically. Then check it is alive:

```sh
curl http://localhost:4000/api/health   # expect {"status":"ok","db":"up",...}
```

| URL                        | What it is          |
| -------------------------- | ------------------- |
| http://localhost:3000       | Public website      |
| http://localhost:3000/admin | Admin dashboard     |
| http://localhost:3000/login | Client portal login |

SMTP is not configured by default. Until you fill in SMTP settings in `.env`, magic-link emails are printed to the backend logs instead:

```sh
docker logs css-backend | grep -i magic
```

## Running locally for development

You can also run each service on its own — one database container plus two dev servers — which is often more convenient while coding. The exact per-service commands, the environment files each service reads, and the "one server per port" port-4000 rule are written up in [docs/OPERATIONS.md](docs/OPERATIONS.md) section 3 (*Running locally for development*). This README does not repeat that runbook.

## Documentation

| Document                                        | What's inside                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [docs/OPERATIONS.md](docs/OPERATIONS.md)        | Owner operations manual: quick start, local dev, ports, rebuilds, database ops, troubleshooting, go-live checklist |
| [docs/DATABASE.md](docs/DATABASE.md)            | Full database reference: tables, columns, enums, indexes, migration history — generated from the Prisma schema and verified against a live database |
| [docs/research/](docs/research/)                | Design research: competitor reference-site analysis and photo/content identification notes                 |

## Project structure

```
jabo/
├── frontend/           # Next.js site: public pages, /admin panel, /login portal, Playwright e2e specs
├── backend/            # Express API: routes, Prisma schema + migrations, seed data, uploads
├── docs/               # Operations manual, database reference, design research
├── .github/workflows/  # CI: backend build, frontend lint + build, full e2e suite
└── docker-compose.yml  # postgres + backend + frontend containers
```

---

© Creative Sound Studio — Kigali, Rwanda.
This repository is the studio's production website and admin platform.
