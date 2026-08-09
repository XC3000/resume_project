import { Prisma } from '@prisma/client';
import { unsafeUnscopedClient } from './index';

// Export type-safe PrismaClient type for extension client
export type ScopedPrismaClient = ReturnType<typeof scopedClient>;

/**
 * Creates a request-scoped Prisma Client extension that automatically isolates queries by organizationId.
 * Only scopes triage models; shared schema models (auth, orgs, members) are bypassed.
 */
export function scopedClient(organizationId: string) {
  if (!organizationId) {
    throw new Error('OrgContext error: Organization ID must be set to instantiate a scoped client.');
  }

  // Triage models defined in the schema
  const triageModels = [
    'Project',
    'GithubInstallation',
    'Incident',
    'ContextChunk',
    'FailureSignature',
    'ApiKey',
    'WebhookDelivery',
    'LlmUsage',
  ];

  return unsafeUnscopedClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!triageModels.includes(model)) {
            // Shared schema models are bypassed
            return query(args);
          }

          const queryArgs = args as any;
          const op = operation as string;

          const readOps = [
            'findMany',
            'findFirst',
            'findFirstOrThrow',
            'findUnique',
            'findUniqueOrThrow',
            'count',
            'aggregate',
            'groupBy',
          ];

          const writeOps = [
            'update',
            'updateMany',
            'delete',
            'deleteMany',
          ];

          if (readOps.includes(op) || writeOps.includes(op)) {
            queryArgs.where = queryArgs.where || {};

            // Check if organizationId is already supplied and mismatches
            if (queryArgs.where.organizationId !== undefined && queryArgs.where.organizationId !== organizationId) {
              throw new Error(
                `Security violation: Conflicting organizationId in query filters. Expected ${organizationId}, got ${queryArgs.where.organizationId}`
              );
            }

            // In case of findUnique, query might be using a compound unique index like organizationId_slug on Project,
            // or organizationId_day on LlmUsage, etc. We must check these compound keys for conflicts.
            const compoundKeys = ['organizationId_slug', 'organizationId_day'];
            for (const key of compoundKeys) {
              if (queryArgs.where[key]) {
                if (
                  queryArgs.where[key].organizationId !== undefined &&
                  queryArgs.where[key].organizationId !== organizationId
                ) {
                  throw new Error(
                    `Security violation: Conflicting organizationId in query compound index filters. Expected ${organizationId}, got ${queryArgs.where[key].organizationId}`
                  );
                }
                queryArgs.where[key].organizationId = organizationId;
              }
            }

            if (writeOps.includes(op) && queryArgs.data) {
              if (queryArgs.data.organizationId !== undefined && queryArgs.data.organizationId !== organizationId) {
                throw new Error(
                  `Security violation: Conflicting organizationId in update parameters. Expected ${organizationId}, got ${queryArgs.data.organizationId}`
                );
              }
            }

            queryArgs.where.organizationId = organizationId;
          } else if (op === 'create') {
            queryArgs.data = queryArgs.data || {};
            if (queryArgs.data.organizationId !== undefined && queryArgs.data.organizationId !== organizationId) {
              throw new Error(
                `Security violation: Conflicting organizationId in create parameters. Expected ${organizationId}, got ${queryArgs.data.organizationId}`
              );
            }
            queryArgs.data.organizationId = organizationId;
          } else if (op === 'createMany') {
            if (Array.isArray(queryArgs.data)) {
              for (const item of queryArgs.data) {
                if (item.organizationId !== undefined && item.organizationId !== organizationId) {
                  throw new Error(
                    `Security violation: Conflicting organizationId in createMany parameters. Expected ${organizationId}, got ${item.organizationId}`
                  );
                }
                item.organizationId = organizationId;
              }
            } else if (queryArgs.data) {
              if (queryArgs.data.organizationId !== undefined && queryArgs.data.organizationId !== organizationId) {
                throw new Error(
                  `Security violation: Conflicting organizationId in createMany parameters. Expected ${organizationId}, got ${queryArgs.data.organizationId}`
                );
              }
              queryArgs.data.organizationId = organizationId;
            }
          } else if (op === 'upsert') {
            // Handle upsert operation where we have update, create, and where arguments
            queryArgs.where = queryArgs.where || {};
            if (queryArgs.where.organizationId !== undefined && queryArgs.where.organizationId !== organizationId) {
              throw new Error(
                `Security violation: Conflicting organizationId in upsert where clause. Expected ${organizationId}, got ${queryArgs.where.organizationId}`
              );
            }
            const compoundKeys = ['organizationId_slug', 'organizationId_day'];
            for (const key of compoundKeys) {
              if (queryArgs.where[key]) {
                if (
                  queryArgs.where[key].organizationId !== undefined &&
                  queryArgs.where[key].organizationId !== organizationId
                ) {
                  throw new Error(
                    `Security violation: Conflicting organizationId in upsert compound index. Expected ${organizationId}, got ${queryArgs.where[key].organizationId}`
                  );
                }
                queryArgs.where[key].organizationId = organizationId;
              }
            }
            queryArgs.where.organizationId = organizationId;

            queryArgs.create = queryArgs.create || {};
            if (queryArgs.create.organizationId !== undefined && queryArgs.create.organizationId !== organizationId) {
              throw new Error(
                `Security violation: Conflicting organizationId in upsert create parameters. Expected ${organizationId}, got ${queryArgs.create.organizationId}`
              );
            }
            queryArgs.create.organizationId = organizationId;

            queryArgs.update = queryArgs.update || {};
            if (queryArgs.update.organizationId !== undefined && queryArgs.update.organizationId !== organizationId) {
              throw new Error(
                `Security violation: Conflicting organizationId in upsert update parameters. Expected ${organizationId}, got ${queryArgs.update.organizationId}`
              );
            }
            queryArgs.update.organizationId = organizationId;
          }

          return query(queryArgs);
        },
      },
    },
  });
}
