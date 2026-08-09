# Project: incident-triage-agent

A multi-tenant incident triage platform. Ingests CI failures, retrieves similar
historical failures from a vector index, and classifies incidents with that
context — surfacing root-cause hints linked to the exact log region that
justified them.

Tenancy follows Vercel's model: users belong to scopes (a personal account or a
team), and all data lives under a scope.

## Non-negotiable architecture

- pnpm workspaces + Turborepo. Never npm or yarn.
- ONE NestJS app at `apps/api`. All routes, workers, queues and scheduled jobs
  live inside it as Nest modules. Do NOT create a second backend service, a
  worker app, or a cron service. The deploy target allows 750
  instance-hours/month, which fits exactly one service.
- ONE Next.js 15 app at `apps/web` (App Router).
- Prisma is the only DB access layer. Schema lives ONLY in `packages/db`.
- Better Auth for all authentication. No Supabase Auth, NextAuth, or Clerk.
- Single Postgres, two schemas: `shared` (auth, orgs, members) and `triage`.
- Redis serves BullMQ enrichment jobs and GitHub installation-token caching.

## Stack

Next.js 15 · NestJS 11 · Prisma 6 · TypeScript 5 strict · Tailwind + shadcn/ui
Zod · BullMQ · ioredis · pgvector (halfvec, 768 dims) · Gemini

## Layout

apps/
  api/   NestJS — src/modules/{auth,orgs,github,webhooks,incidents,intelligence,keys}/
  web/   Next.js
packages/
  db/          Prisma schema, scoped client factory
  auth/        Better Auth server instance + typed client
  contracts/   Zod schemas shared between web and api
  ui/          shadcn components

## Tenancy model — read before touching any query

Every row in the `triage` schema belongs to exactly one Organization. There is
no global data and no unscoped query. Ever.

- `Organization` is the tenancy root. Two kinds: PERSONAL (auto-created at
  signup, one per user, undeletable) and TEAM (user-created, invitable).
- `Project` belongs to an Organization and maps to one connected repository.
  Incidents, ContextChunks and FailureSignatures belong to a Project.
- `Member` joins User to Organization with a role: OWNER, ADMIN, MEMBER, VIEWER.
- API keys belong to an Organization, never a User. A member leaving must not
  break that org's CI integration.
- GitHub repository access is via a GitHub App installation owned by the
  Organization, never a user's OAuth token. User OAuth is for login only.

### Query rules — non-negotiable

- Every Prisma query touching `triage` MUST use the scoped client from
  `packages/db/src/scoped.ts`. Feature modules must NOT import the raw
  PrismaClient. The raw client exists only for the scoped-client factory,
  Better Auth's adapter, and migrations.
- Every `$queryRaw` MUST include an explicit parameterised
  `WHERE "organizationId" = $n`. The scoping extension CANNOT enforce this on
  raw SQL. This is the highest-risk surface in the codebase — the pgvector
  similarity search above all.
- Background jobs have no request context. Every BullMQ payload MUST carry
  `organizationId` and `projectId` explicitly, and processors MUST build a
  scoped client from the payload. Never resolve tenancy from ambient state in a
  worker.
- Never accept an organizationId from a request body, query param or header. It
  comes from the session's active organization or an authenticated API key.
- `organizationId` is denormalised onto every triage table deliberately, so the
  scoping extension injects one where-clause without a join. Keep it there.

### Authorisation

Permission checks live in guards, never in controllers.
- VIEWER: read org data
- MEMBER: mutate incidents, resolve, comment
- ADMIN: manage members, API keys, projects, integrations
- OWNER: delete org, transfer ownership

Non-members receive 404 on scope routes, not 403 — slugs must not be enumerable.

## Hard constraints — violating these breaks deployment

- Free-tier Postgres is capped at 500 MB. Never design a table storing one row
  per log line or per raw event.
- Backend RAM ceiling is 512 MB. No local ML models, no transformers.js, no
  in-process embedding generation. Embeddings come from the Gemini API.
- Vector column is `halfvec(768)`, never `vector(1536)`. Prisma cannot type it:
  declare `Unsupported("halfvec(768)")`, query via `$queryRaw` with parameters.
  Never string-interpolate into raw SQL.
- Embeddings are Gemini with outputDimensionality 768. Never OpenAI.
- `DATABASE_URL` is pooled (port 6543, `pgbouncer=true`). `DIRECT_URL` is the
  session pooler (port 5432), used only by `prisma migrate`. Different strings.
  Never add `?schema=` to either — it breaks multiSchema resolution.
- Better Auth's handler needs the raw request body. In `main.ts`: create the app
  with `{ bodyParser: false }`, mount the auth handler at `/api/auth` FIRST,
  then `app.use(json())`. Wrong order silently breaks sign-up.
- Webhook routes also need raw bodies for HMAC verification and must stay
  excluded from the JSON parser.
- The GitHub App private key is a multi-line PEM. Store it base64-encoded in one
  env var and decode at boot.

## Working agreement

- Stop and ask before: adding a dependency, creating a new app or package,
  changing the Prisma datasource block, or running any destructive migration.
- Never write real secrets to any file. Use `.env.example` with placeholders.
- Verify `.env` is gitignored before writing one.
- After every stage run `pnpm turbo lint typecheck` and fix what you broke.
- Prefer editing existing files over creating new ones.
- If a requirement conflicts with this file, stop and ask. Do not resolve it
  yourself.
