# ShareNCare

**Notes meant to be given.** Write a note for yourself, or for someone you care about.

🔗 **Live:** https://sharencare.onrender.com
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

**Coming next:** share links, burn-after-reading notes, sealed time-capsule notes, and care boards.

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

## History

- **v1:** MERN (MongoDB, Express, React, Node), preserved at tag [`v1-mern`](https://github.com/abeenash/shareNcare/tree/v1-mern)
- **v2:** rewritten as a TypeScript monorepo with Bun, Hono, Postgres and authentication

## Author

**Abinash Adhikari** ([@abeenash](https://github.com/abeenash)).