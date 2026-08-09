-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "shared";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "triage";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "shared"."OrganizationKind" AS ENUM ('PERSONAL', 'TEAM');

-- CreateEnum
CREATE TYPE "shared"."OrganizationPlan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "triage"."IncidentSource" AS ENUM ('GITHUB_CI', 'GENERIC');

-- CreateEnum
CREATE TYPE "triage"."IncidentStatus" AS ENUM ('OPEN', 'ENRICHING', 'TRIAGED', 'RESOLVED', 'PENDING_QUOTA');

-- CreateEnum
CREATE TYPE "triage"."Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "shared"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "activeOrganizationId" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "kind" "shared"."OrganizationKind" NOT NULL,
    "plan" "shared"."OrganizationPlan" NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."apikey" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT,
    "start" TEXT,
    "referenceId" TEXT NOT NULL,
    "prefix" TEXT,
    "key" TEXT NOT NULL,
    "refillInterval" INTEGER,
    "refillAmount" INTEGER,
    "lastRefillAt" TIMESTAMP(3),
    "enabled" BOOLEAN DEFAULT true,
    "rateLimitEnabled" BOOLEAN DEFAULT true,
    "rateLimitTimeWindow" INTEGER DEFAULT 86400000,
    "rateLimitMax" INTEGER DEFAULT 10,
    "requestCount" INTEGER DEFAULT 0,
    "remaining" INTEGER,
    "lastRequest" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "permissions" TEXT,
    "metadata" TEXT,

    CONSTRAINT "apikey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage"."project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "repoFullName" TEXT,
    "githubRepoId" BIGINT,
    "webhookSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage"."github_installation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "installationId" BIGINT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "repositorySelection" TEXT NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_installation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage"."incident" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "source" "triage"."IncidentSource" NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "status" "triage"."IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "triage"."Severity" NOT NULL,
    "classification" TEXT,
    "rootCauseHint" TEXT,
    "suggestedFix" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage"."context_chunk" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "justifies" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "context_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage"."failure_signature" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "normalisedText" TEXT NOT NULL,
    "embedding" halfvec(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failure_signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage"."api_key" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "scopes" TEXT[],
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage"."webhook_delivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage"."llm_usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "tokensIn" INTEGER NOT NULL,
    "tokensOut" INTEGER NOT NULL,
    "callCount" INTEGER NOT NULL,

    CONSTRAINT "llm_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "shared"."user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "shared"."session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "shared"."session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "shared"."account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "shared"."verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "shared"."organization"("slug");

-- CreateIndex
CREATE INDEX "member_organizationId_idx" ON "shared"."member"("organizationId");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "shared"."member"("userId");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "shared"."invitation"("organizationId");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "shared"."invitation"("email");

-- CreateIndex
CREATE INDEX "apikey_configId_idx" ON "shared"."apikey"("configId");

-- CreateIndex
CREATE INDEX "apikey_referenceId_idx" ON "shared"."apikey"("referenceId");

-- CreateIndex
CREATE INDEX "apikey_key_idx" ON "shared"."apikey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "project_organizationId_slug_key" ON "triage"."project"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "github_installation_installationId_key" ON "triage"."github_installation"("installationId");

-- CreateIndex
CREATE INDEX "incident_organizationId_projectId_status_detectedAt_idx" ON "triage"."incident"("organizationId", "projectId", "status", "detectedAt");

-- CreateIndex
CREATE INDEX "context_chunk_incidentId_idx" ON "triage"."context_chunk"("incidentId");

-- CreateIndex
CREATE INDEX "context_chunk_sequence_idx" ON "triage"."context_chunk"("sequence");

-- CreateIndex
CREATE INDEX "failure_signature_organizationId_projectId_idx" ON "triage"."failure_signature"("organizationId", "projectId");

-- CreateIndex
CREATE INDEX "api_key_prefix_idx" ON "triage"."api_key"("prefix");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_delivery_deliveryId_key" ON "triage"."webhook_delivery"("deliveryId");

-- CreateIndex
CREATE INDEX "webhook_delivery_organizationId_receivedAt_idx" ON "triage"."webhook_delivery"("organizationId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "llm_usage_organizationId_day_key" ON "triage"."llm_usage"("organizationId", "day");

-- AddForeignKey
ALTER TABLE "shared"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "shared"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "shared"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared"."member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "shared"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared"."member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "shared"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared"."invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "shared"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared"."invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "shared"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage"."incident" ADD CONSTRAINT "incident_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "triage"."project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage"."context_chunk" ADD CONSTRAINT "context_chunk_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "triage"."incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage"."failure_signature" ADD CONSTRAINT "failure_signature_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "triage"."incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage"."failure_signature" ADD CONSTRAINT "failure_signature_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "triage"."project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage"."webhook_delivery" ADD CONSTRAINT "webhook_delivery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "triage"."project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
