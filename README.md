# ShareNCare

**Notes meant to be given.** Write a note for yourself, or for someone you care about.

🔗 **Live:** https://sharencare.abinasha.com.np
*(free hosting: the first visit can take up to a minute while the server wakes up)*

![ShareNCare desk](docs/desk.png)

## Features

- **Your desk of letters:** create, edit, pin and organize notes
- **Trash with restore:** soft delete, restore, or delete forever
- **Accounts:** email and password, or **Sign in with Google**, with explicit account linking
- **Private by default:** every note belongs to its owner, enforced on the server
- **Feels instant:** optimistic updates with TanStack Query
- **Protected API:** per-IP rate limiting with Upstash Redis, validated input with Zod
- **Measurable:** every API response carries a `Server-Timing` header
- **Letters worth sending:** share links, burn-after-reading, sealed letters, and private photos on Cloudflare R2
- **Trash that cleans itself:** empty it any time, and letters left for 30 days are deleted along with their photos
- **Care boards:** one link where friends add notes for someone; anyone can read, signed-in people write one note each, with reporting and owner moderation
- **Watched in production:** one JSON log line per request (tokens never logged), Sentry error alerts from the server and the browser, an hourly uptime check and a heartbeat for the daily sweep

**Coming next:** live boards with WebSockets.

## Tech stack

| Layer | Tools |
|---|---|
| Runtime and monorepo | [Bun](https://bun.sh) workspaces, TypeScript |
| API | [Hono](https://hono.dev), [Zod](https://zod.dev), [Better Auth](https://better-auth.com) |
| Database | PostgreSQL ([Neon](https://neon.com)) with [Drizzle ORM](https://orm.drizzle.team) and migrations |
| Rate limiting | [Upstash Redis](https://upstash.com) |
| Web | React, Vite, React Router, TanStack Query, Tailwind CSS v4, DaisyUI 5 |
| Quality | [Biome](https://biomejs.dev) (lint and format), `bun test` on in-memory Postgres ([PGlite](https://pglite.dev)) |

## Project structure

```
apps/
  api/        Hono API: routes, auth, middleware, Drizzle schema and migrations
  web/        React app (Vite)
packages/
  shared/     Zod schemas and types shared by the API and the web app
```

The web app calls the API through a **typed RPC client** (Hono `hc`), so a change in an API route shows up as a type error in the frontend.

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.4.4 (see `.bun-version`)
- A PostgreSQL database (a free [Neon](https://neon.com) project works)
- An [Upstash Redis](https://upstash.com) database
- A Google OAuth client, for Google sign-in

### 1. Install

```bash
git clone https://github.com/abeenash/shareNcare.git
cd shareNcare
bun install
```

### 2. Environment variables

Copy the example file and fill it in:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash REST credentials |
| `BETTER_AUTH_SECRET` | Random string, at least 32 characters |
| `BETTER_AUTH_URL` | The URL you open in the browser (`http://localhost:5173` in development) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud Console → Credentials |
| `STORAGE_ENDPOINT` / `STORAGE_BUCKET` / `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | Cloudflare R2 endpoint, bucket and API token, for photos |
| `CRON_SECRET` | Random string, at least 32 characters. The scheduled trash sweep must present it |

Generate a secret:

```bash
bun -e "console.log(crypto.getRandomValues(new Uint8Array(32)).toHex())"
```

In your Google OAuth client, add this **authorized redirect URI**:
`http://localhost:5173/api/auth/callback/google`

The API validates every variable at startup and tells you exactly which one is missing.

### 3. Create the tables

```bash
cd apps/api
bun run db:migrate
cd ../..
```

### 4. Run

```bash
bun run dev
```

Open http://localhost:5173. Vite proxies `/api` to the API on port 5000.

## Scripts

Run from the repository root:

| Command | What it does |
|---|---|
| `bun run dev` | API and web app with hot reload |
| `bun run typecheck` | Type-check every package |
| `bun run check` | Lint and format check (Biome) |
| `bun run check:fix` | Apply safe lint and format fixes |
| `bun run test` | API tests on an in-memory Postgres, no `.env` needed |
| `bun run build` | Production build of the web app |
| `bun run start` | Run migrations, then serve the API and built web app |

## Deployment

Deployed on [Render](https://render.com) as **one web service**: the API serves both `/api/*` and the built React app.

- **Build command:** `bun install && bun run build`
- **Start command:** `bun run start` (applies pending migrations, then starts the server)
- **Environment:** the variables above, plus `NODE_ENV=production`, with `BETTER_AUTH_URL` set to the public URL
- **Google OAuth:** add `https://<your-domain>/api/auth/callback/google` as a redirect URI

### Monitoring

| What | Where | Free limit |
|---|---|---|
| Request logs (JSON, one line per request) | Render → Logs | 7 days kept |
| Error alerts, server and browser | [Sentry](https://sentry.io), email on a new issue | 5,000 errors a month |
| Uptime: is the site up, does the database answer? | `.github/workflows/uptime.yml` every hour → [Healthchecks.io](https://healthchecks.io) | 20 checks |
| The daily trash sweep ran | `.github/workflows/sweep-trash.yml` → Healthchecks.io | |

Extra settings: on Render, `SENTRY_DSN`, `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`; in GitHub → Settings → Secrets → Actions, `UPTIME_HEARTBEAT_URL` and `SWEEP_HEARTBEAT_URL` (ping URLs from Healthchecks.io).

`GET /api/health` answers without touching the database. `GET /api/health/db` also asks the database, and answers `503` if it can't.

## When something breaks

Start from the email you got, then follow the row.

| You got | Look here first | Usual cause and fix |
|---|---|---|
| **Uptime is down** (Healthchecks.io) | Open `/api/health`, then `/api/health/db` | `/api/health` fails: Render → Events (a failed deploy? out of free hours?). Only `/db` fails: Neon console (compute suspended after the monthly limit, or Neon is down) |
| **Sweep failed or never ran** | GitHub → Actions → *Sweep old trash* | `401`: `CRON_SECRET` differs between GitHub and Render. No run at all: GitHub turns schedules off after 60 days without a commit; press *Enable workflow*. Re-run with *Run workflow* |
| **A new Sentry issue** | The issue's `requestId` and `route` tags | Search the `requestId` in Render → Logs to see every line of that request |
| **"Something went wrong (ref 3f9a1c2e)"** from a user | Render → Logs, search `3f9a1c2e` | The `crash` line holds the error and stack |
| **Codes or emails don't arrive** | Render → Logs, search `email.failed` | Resend refused it (key, domain, or the 100-a-day free limit). Sign-up still "works", and the next sign-in sends a new code |
| **Logs say `ratelimit.unavailable`** | Upstash console | Upstash is down. The app lets requests through on purpose, so nothing is broken for users |
| **Photos fail, or `note.destroy_failed`** | Cloudflare R2 dashboard | R2 is down or the token expired. The letter stays in the trash, and the next sweep tries again |
| **The deploy fails** | Render → the deploy's logs | `Invalid environment variables` names the missing one. The old version keeps running; Render can roll back |
| **Google sign-in fails** | Google Cloud Console → Credentials | The redirect URI must be `https://<your-domain>/api/auth/callback/google`, matching `BETTER_AUTH_URL` |
| **The first visit takes ~30 seconds** | Nothing | Render's free server sleeps after 15 minutes idle. Expected |

## History

- **v1:** MERN (MongoDB, Express, React, Node), preserved at tag [`v1-mern`](https://github.com/abeenash/shareNcare/tree/v1-mern)
- **v2:** rewritten as a TypeScript monorepo with Bun, Hono, Postgres and authentication

## Author

**Abinash Adhikari** ([@abeenash](https://github.com/abeenash)).