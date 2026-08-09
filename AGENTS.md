Turborepo monorepo containing the triage portfolio project that shares one Supabase
Postgres database and one NestJS backend service.

## Non-negotiable architecture

- pnpm workspaces + Turborepo. Package manager is pnpm. Never npm or yarn.
- ONE NestJS app at `apps/api`. The API and all background workers
  live inside it as Nest modules. Do NOT create a second backend service, a
  separate worker app, or a standalone cron service. The deploy target has a
  750 instance-hour/month budget that only fits one service.
- ONE Next.js 15 app (App Router): `apps/triage-web`.
- Prisma is the only DB access layer. Schema lives ONLY in `packages/db`.
  No app defines its own schema or instantiates its own PrismaClient.
- Single Postgres, two schemas: `shared`, `triage`.
- Better Auth for all authentication. No Supabase Auth, no NextAuth, no Clerk.
- Redis is used for BullMQ (triage).

## Stack versions

Next.js 15 (App Router) · NestJS 11 · Prisma 6 · TypeScript 5 (strict)
Tailwind + shadcn/ui · Zod · BullMQ · ioredis · pgvector (halfvec, 768 dims)

## Directory layout

apps/
api/ NestJS — src/modules/{auth,triage}/
triage-web/ Next.js
packages/
db/ Prisma schema + exported singleton client
auth/ Better Auth server instance + typed client
contracts/ Zod schemas shared between web and api
ui/ shadcn components

## Hard constraints — violating these breaks deployment

- Free-tier Postgres is capped at 500 MB. Assume it. Never design a table that
  stores one row per event.
- Backend RAM ceiling is 512 MB. No local ML models, no transformers.js,
  no in-process embedding generation. Embeddings come from an external API.
- Vector column is `halfvec(768)`, not `vector(1536)`. Prisma cannot type it —
  declare `Unsupported("halfvec(768)")` and query via `$queryRaw` with
  parameterised input. Never string-interpolate into raw SQL.
- Prisma connects via the pooled connection string (`DATABASE_URL`) and runs
  migrations via `DIRECT_URL`. Both must be in the datasource block.
- Better Auth's handler needs the raw request body. In `main.ts`, create the app
  with `{ bodyParser: false }`, mount the auth handler at `/api/auth` FIRST,
  then `app.use(json())`. Getting this order wrong silently breaks sign-up.

## Working agreement

- Stop and ask before: adding any dependency not already in package.json,
  creating a new app or package, changing the Prisma datasource block, or
  running any destructive migration.
- Never write real secrets to any file. Use `.env.example` with placeholders.
- Never commit `.env`. Verify it is gitignored before writing one.
- After every stage, run `pnpm turbo lint typecheck` and fix what you broke
  before reporting done.
- Prefer editing existing files over creating new ones.
- If a requirement seems to conflict with this file, stop and ask. Do not
  resolve the conflict yourself.
