import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key";
import { prisma } from "@platform/db";
import { z } from "zod";

declare const process: any;

// Server auth instance
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'placeholder',
    },
  },
  plugins: [
    organization(),
    apiKey(),
  ],
  trustedOrigins: [
    process.env.TRIAGE_WEB_URL,
    process.env.ANALYTICS_WEB_URL,
  ].filter((origin): origin is string => !!origin),
});

// Client auth instance
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [
    organizationClient(),
    apiKeyClient(),
  ],
});
