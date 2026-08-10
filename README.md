# Incident Triage Agent

A multi-tenant incident triage platform. Ingests CI failures, retrieves similar historical failures from a vector index, and classifies incidents with that context.

---

## 1. System Architecture & Tenancy Boundary

The tenancy model explicitly isolates client requests, webhook deliveries, and background processes using a strict database and logic boundary.

```mermaid
graph TD
    subgraph Client & Source Space
        Browser["Next.js Web Client (apps/web)"]
        CI["CI Runners (GitHub/Generic Webhooks)"]
    end

    subgraph API Execution Context
        Nest["NestJS Backend (apps/api)"]
    end

    subgraph Database Boundary [Tenant Isolation Boundary]
        subgraph Shared Schema [shared Schema]
            Org["Organization (Tenancy Root)"]
            User["User Profile"]
            Mem["Member (Mapping & Roles)"]
            Invite["Invitation"]
        end

        subgraph Scoped Triage Schema [triage Schema]
            Proj["Project (organizationId, projectId)"]
            Inc["Incident (organizationId, projectId)"]
            Chunks["ContextChunk (organizationId)"]
            Sigs["FailureSignature (organizationId, projectId)"]
            Keys["ApiKey (organizationId)"]
            Usage["LlmUsage (organizationId)"]
        end
    end

    Browser -->|Session Cookie| Nest
    CI -->|HMAC Verified Payload| Nest
    Nest -->|Scoped Prisma Client| Scoped Triage Schema
    Nest -->|Unscoped Client| Shared Schema
```

---

## 2. Multi-Tenancy

### The Scoping Extension
Database isolation is enforced at the query-engine level using a custom Prisma client extension located in [scoped.ts](file:///Users/richard/Documents/personal/resume_project/packages/db/src/scoped.ts). When a feature module instantiates a database client via `scopedClient(organizationId)`, the extension intercepts all incoming database queries targetting the `triage` schema and injects a `where: { organizationId }` filter automatically. This prevents developer oversights from leaking cross-tenant rows.

### Denormalisation of `organizationId`
The `organizationId` column is denormalised onto every single database table inside the `triage` schema (including `Project`, `Incident`, `ContextChunk`, and `FailureSignature`). This design decision is deliberate:
1. It permits the Prisma scoping extension to inject a single flat `where` clause predicate into any query without triggering expensive table joins.
2. It maximizes read/write performance when handling millions of log lines, avoiding query execution degradation on large indices.

### Raw SQL Constraints
Prisma's query interception extensions do not parse or rewrite raw SQL strings. Consequently, `$queryRaw` statements represent the highest-risk security surface in the codebase. Every raw query (for example, the pgvector cosine similarity search on the `FailureSignature` table) must explicitly parameterize and check the `organizationId` (e.g. `WHERE "organizationId" = $1`). These raw SQL parameters are verified in code review and undergo automated boundaries validation.

### Async Context Propagation (BullMQ)
Background workers operate outside the lifecycle of incoming HTTP requests and have no ambient session context. To preserve database isolation across async queue boundaries, every payload pushed to a BullMQ channel must explicitly carry `organizationId` and `projectId`. Ingestors and processors extract these IDs from the payload and build an isolated scoped database client at boot time, preventing stateful leakage inside background processes.

---

## 3. Security & Isolation Guarantees

### Webhook Signature Verification
Timing-safe HMAC-SHA256 signature verification is performed against the raw request payload buffer before any JSON parsing. This prevents timing attacks and guards against malicious JSON payloads exploiting parser vulnerabilities.

### Hashed API Keys
API keys belong to an organization and use the prefix/hash layout:
- Raw keys (`itg_<env>_<random_chars>`) are returned exactly once upon creation.
- Only the display prefix (first 12 characters) and a secure SHA-256 hash are persisted.
- Throttled log updates restrict `lastUsedAt` write frequencies to at most once per minute, minimizing database traffic degradation.

### Slug Enumeration Prevention
Slugs are not enumerable. Non-members requesting access to organizations they do not belong to receive a `404 Not Found` response instead of a `403 Forbidden` response.

---

## 4. Local Setup & GitHub App Integration

### Environment Variables
Create a `.env` file in the project root:
```env
# Database Connections
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/incident_triage?pgbouncer=true"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/incident_triage"

# Web App Configuration
WEB_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Better Auth Secret
BETTER_AUTH_SECRET="your_super_secret_better_auth_key_here"

# GitHub App Integration
GITHUB_APP_ID="your_github_app_id"
GITHUB_APP_PRIVATE_KEY_BASE64="your_base64_encoded_pem_key"
GITHUB_APP_WEBHOOK_SECRET="your_webhook_signature_secret"
```

### GitHub App Configuration
1. Navigate to GitHub Developer Settings and create a new **GitHub App**.
2. **Webhook settings**:
   - Set **Webhook URL** to `${API_URL}/api/webhooks/github` (in local development, use a tunnel like ngrok).
   - Set **Webhook secret** to match `GITHUB_APP_WEBHOOK_SECRET`.
3. **App Permissions**:
   - Repository Permissions:
     - `Actions`: Read-only (to download workflow logs)
     - `Checks`: Read-only
     - `Metadata`: Read-only
4. **Subscribe to events**:
   - `Workflow Run`
   - `Check Run`
5. Generate a private PEM key, encode it: `cat key.pem | base64`, and set the output as `GITHUB_APP_PRIVATE_KEY_BASE64` in `.env`.
