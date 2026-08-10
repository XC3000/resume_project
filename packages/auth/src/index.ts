import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, createAccessControl } from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key";
import { unsafeUnscopedClient } from "@platform/db";

declare const process: any;

// Define custom roles and permissions for multi-tenant incident triage SRE copilot
const ac = createAccessControl({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  project: ["create", "update", "delete"],
  incident: ["create", "update", "delete"],
});

const owner = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  project: ["create", "update", "delete"],
  incident: ["create", "update", "delete"],
});

const admin = ac.newRole({
  organization: ["update"],
  member: ["create", "update"],
  invitation: ["create", "cancel"],
  project: ["create", "update", "delete"],
  incident: ["create", "update", "delete"],
});

const member = ac.newRole({
  project: [],
  incident: ["create", "update"], // member can mutate incidents, resolve, comment
});

const viewer = ac.newRole({
  project: [],
  incident: [], // viewer can only read data (no mutations)
});

const reservedSlugs = [
  'api',
  'admin',
  'login',
  'signup',
  'settings',
  'new',
  'docs',
  'health',
  'webhooks',
  'invite'
];

/**
 * Utility to generate a unique lowercase URL-safe slug, appending numeric suffixes on collision.
 * Rejects slugs that match a reserved list.
 */
async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!slug) {
    slug = 'space';
  }
  
  let finalSlug = slug;
  if (reservedSlugs.includes(finalSlug)) {
    finalSlug = `${slug}-1`;
  }

  let count = 1;
  while (true) {
    const existing = await unsafeUnscopedClient.organization.findUnique({
      where: { slug: finalSlug },
    });
    if (!existing) {
      break;
    }
    finalSlug = `${slug}-${count}`;
    count++;
  }
  return finalSlug;
}

// Server auth instance
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(unsafeUnscopedClient, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      get clientId() {
        return process.env.GITHUB_CLIENT_ID || 'placeholder_client_id';
      },
      get clientSecret() {
        return process.env.GITHUB_CLIENT_SECRET || 'placeholder_client_secret';
      },
      scope: ["read:user", "user:email"], // Login only scopes (repository access managed via GitHub App)
    },
  },
  plugins: [
    organization({
      ac,
      roles: {
        owner,
        admin,
        member,
        viewer,
      },
    }),
    apiKey(),
  ],
  trustedOrigins: [
    process.env.WEB_URL || "http://localhost:3001",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://f4e1-2409-40e0-11c4-1859-795b-a595-cc8b-bdf3.ngrok-free.app",
    ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',') : []),
  ].filter((origin): origin is string => !!origin),

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Lifecycle hook on signup: create a PERSONAL Organization and user as OWNER
          const emailLocalPart = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'space';
          const orgSlug = await generateUniqueSlug(emailLocalPart);
          const org = await unsafeUnscopedClient.organization.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              name: `${user.name || emailLocalPart}'s Space`,
              slug: orgSlug,
              kind: 'PERSONAL',
              plan: 'FREE',
              createdAt: new Date(),
            },
          });
          await unsafeUnscopedClient.member.create({
            data: {
              id: globalThis.crypto.randomUUID(),
              organizationId: org.id,
              userId: user.id,
              role: 'owner',
              createdAt: new Date(),
            },
          });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          // Set PERSONAL Organization as the session's active organization to avoid empty state
          let personalMember = await unsafeUnscopedClient.member.findFirst({
            where: {
              userId: session.userId,
              organization: {
                kind: 'PERSONAL',
              },
            },
          });

          if (!personalMember) {
            // Fallback: create personal organization on the fly if user hook failed or was bypassed
            const user = await unsafeUnscopedClient.user.findUnique({
              where: { id: session.userId },
            });
            if (user) {
              const emailLocalPart = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'space';
              const orgSlug = await generateUniqueSlug(emailLocalPart);
              const org = await unsafeUnscopedClient.organization.create({
                data: {
                  id: globalThis.crypto.randomUUID(),
                  name: `${user.name || emailLocalPart}'s Space`,
                  slug: orgSlug,
                  kind: 'PERSONAL',
                  plan: 'FREE',
                  createdAt: new Date(),
                },
              });
              personalMember = await unsafeUnscopedClient.member.create({
                data: {
                  id: globalThis.crypto.randomUUID(),
                  organizationId: org.id,
                  userId: user.id,
                  role: 'owner',
                  createdAt: new Date(),
                },
              });
            }
          }

          if (personalMember) {
            session.activeOrganizationId = personalMember.organizationId;
          }
          return { data: session };
        },
      },
    },
  },
});

// Client auth instance
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [
    organizationClient({
      ac,
      roles: {
        owner,
        admin,
        member,
        viewer,
      },
    }),
    apiKeyClient(),
  ],
});
