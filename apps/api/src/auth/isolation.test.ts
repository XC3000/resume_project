import * as assert from 'assert';
import * as crypto from 'crypto';

// Stub bullmq using Node's require hook to prevent Redis connection retries in test
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === 'bullmq') {
    return {
      Queue: class MockQueue {
        on() {}
        async close() {}
      },
    };
  }
  return originalRequire.apply(this, arguments);
};

import { scopedClient, unsafeUnscopedClient } from '@platform/db';
import { TriageService } from '../modules/triage/triage.service';
import { OrgContext } from './org-context';
import { OrgGuard } from './org.guard';
import { Role, REQUIRE_ROLE_KEY } from './require-role.decorator';
import { RoleGuard } from './role.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { auth } from '@platform/auth';
import { OrgsService } from '../modules/orgs/orgs.service';
import { GithubService } from '../modules/github/github.service';
import { WebhooksService } from '../modules/webhooks/webhooks.service';
import { ApiKeyGuard } from './api-key.guard';
import { REQUIRE_SCOPES_KEY } from './require-scopes.decorator';

// Helper to mock NestJS ExecutionContext
function createMockExecutionContext(request: any, handler?: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getClass: () => ({}),
    getHandler: () => handler || (() => {}),
    getType: () => 'http',
  } as unknown as ExecutionContext;
}

async function runIsolationSuite() {
  console.log('--- STARTING TENANT ISOLATION TEST SUITE ---');

  // 1. Database Clean up
  console.log('Cleaning up database tables...');
  await unsafeUnscopedClient.webhookDelivery.deleteMany({});
  await unsafeUnscopedClient.githubInstallation.deleteMany({});
  await unsafeUnscopedClient.failureSignature.deleteMany({});
  await unsafeUnscopedClient.contextChunk.deleteMany({});
  await unsafeUnscopedClient.incident.deleteMany({});
  await unsafeUnscopedClient.project.deleteMany({});
  await unsafeUnscopedClient.member.deleteMany({});
  await unsafeUnscopedClient.user.deleteMany({});
  await unsafeUnscopedClient.organization.deleteMany({});

  // 2. Seeding Tenant A and Tenant B
  console.log('Seeding Org A and Org B mock data...');
  
  const orgA = await unsafeUnscopedClient.organization.create({
    data: {
      id: 'org-a-id',
      name: 'Organization A',
      slug: 'org-a',
      kind: 'PERSONAL',
      plan: 'FREE',
      createdAt: new Date(),
    },
  });

  const orgB = await unsafeUnscopedClient.organization.create({
    data: {
      id: 'org-b-id',
      name: 'Organization B',
      slug: 'org-b',
      kind: 'PERSONAL',
      plan: 'FREE',
      createdAt: new Date(),
    },
  });

  const userA = await unsafeUnscopedClient.user.create({
    data: {
      id: 'user-a-id',
      name: 'User A',
      email: 'user-a@example.com',
    },
  });

  const userB = await unsafeUnscopedClient.user.create({
    data: {
      id: 'user-b-id',
      name: 'User B',
      email: 'user-b@example.com',
    },
  });

  // User A is member of Org A, User B of Org B
  await unsafeUnscopedClient.member.create({
    data: {
      id: 'member-a-id',
      organizationId: orgA.id,
      userId: userA.id,
      role: 'member',
      createdAt: new Date(),
    },
  });

  await unsafeUnscopedClient.member.create({
    data: {
      id: 'member-b-id',
      organizationId: orgB.id,
      userId: userB.id,
      role: 'member',
      createdAt: new Date(),
    },
  });

  const projA = await unsafeUnscopedClient.project.create({
    data: {
      id: 'proj-a-id',
      organizationId: orgA.id,
      name: 'Project A',
      slug: 'project-a',
      webhookSecret: 'secret-a',
    },
  });

  const projB = await unsafeUnscopedClient.project.create({
    data: {
      id: 'proj-b-id',
      organizationId: orgB.id,
      name: 'Project B',
      slug: 'project-b',
      webhookSecret: 'secret-b',
    },
  });

  const incA = await unsafeUnscopedClient.incident.create({
    data: {
      id: 'inc-a-id',
      organizationId: orgA.id,
      projectId: projA.id,
      source: 'GITHUB_CI',
      title: 'Failed Test on Org A',
      status: 'OPEN',
      severity: 'HIGH',
    },
  });

  const incB = await unsafeUnscopedClient.incident.create({
    data: {
      id: 'inc-b-id',
      organizationId: orgB.id,
      projectId: projB.id,
      source: 'GITHUB_CI',
      title: 'Failed Test on Org B',
      status: 'OPEN',
      severity: 'HIGH',
    },
  });

  // Seed FailureSignatures using TriageService
  const triageService = new TriageService({ on: () => {} } as any);
  
  const embeddingA = new Array(768).fill(0);
  embeddingA[0] = 1.0;
  const embeddingB = new Array(768).fill(0);
  embeddingB[1] = 1.0;

  await triageService.createFailureSignature(
    'sig-a-id',
    orgA.id,
    projA.id,
    incA.id,
    'failed test logic a',
    embeddingA
  );

  await triageService.createFailureSignature(
    'sig-b-id',
    orgB.id,
    projB.id,
    incB.id,
    'failed test logic b',
    embeddingB
  );

  console.log('Seeding completed. Starting isolation test assertions...');

  // --- TEST CASE 1: READ ISOLATION ---
  console.log('Test Case 1: Read Isolation');
  const dbA = scopedClient(orgA.id);

  // Finding B's incident using A's scoped client must return null
  const resIncB = await dbA.incident.findUnique({
    where: { id: incB.id },
  });
  assert.strictEqual(resIncB, null, "Org A scoped client read Org B's incident!");

  // Finding many incidents using A's client must only return A's incidents
  const resIncAll = await dbA.incident.findMany({});
  assert.strictEqual(resIncAll.length, 1, "Org A scoped client returned multiple incidents!");
  assert.strictEqual(resIncAll[0].id, incA.id, "Org A scoped client returned incorrect incident!");

  // --- TEST CASE 2: WRITE CONFLICT DETECTION ---
  console.log('Test Case 2: Write Conflict Detection');
  
  // Scoped client must throw if trying to create an incident with a conflicting organizationId
  await assert.rejects(
    async () => {
      await dbA.incident.create({
        data: {
          id: 'inc-conflict-id',
          organizationId: orgB.id, // Conflicting ID
          projectId: projA.id,
          source: 'GITHUB_CI',
          title: 'Should throw',
          status: 'OPEN',
          severity: 'HIGH',
        },
      });
    },
    /Security violation: Conflicting organizationId/i,
    "Conflicting organizationId did not throw on creation!"
  );

  // Scoped client must throw if trying to createMany with conflicting organizationId
  await assert.rejects(
    async () => {
      await dbA.incident.createMany({
        data: [
          {
            id: 'inc-conflict-many-id',
            organizationId: orgB.id,
            projectId: projA.id,
            source: 'GITHUB_CI',
            title: 'Should throw',
            status: 'OPEN',
            severity: 'HIGH',
          },
        ],
      });
    },
    /Security violation: Conflicting organizationId/i,
    "Conflicting organizationId did not throw on createMany!"
  );

  // --- TEST CASE 3: UPDATE ISOLATION ---
  console.log('Test Case 3: Update Isolation');

  // Attempting to update Org B's incident via Org A's client should have no effect
  const updateRes = await dbA.incident.updateMany({
    where: { id: incB.id },
    data: { title: 'Malicious Update' },
  });
  assert.strictEqual(updateRes.count, 0, "Org A scoped client successfully updated Org B's incident!");

  // Attempting to update Org A's incident but passing a conflicting organizationId must throw
  await assert.rejects(
    async () => {
      await dbA.incident.update({
        where: { id: incA.id },
        data: { organizationId: orgB.id },
      });
    },
    /Security violation: Conflicting organizationId/i,
    "Conflicting organizationId in update parameter did not throw!"
  );

  // --- TEST CASE 4: DELETE ISOLATION ---
  console.log('Test Case 4: Delete Isolation');

  // Attempting to delete Org B's incident via Org A's client should not delete it
  const deleteRes = await dbA.incident.deleteMany({
    where: { id: incB.id },
  });
  assert.strictEqual(deleteRes.count, 0, "Org A scoped client successfully deleted Org B's incident!");

  const checkIncBExists = await unsafeUnscopedClient.incident.findUnique({
    where: { id: incB.id },
  });
  assert.ok(checkIncBExists, "Org B incident was deleted during deletion isolation test!");

  // --- TEST CASE 5: VECTOR SEARCH ISOLATION ---
  console.log('Test Case 5: Vector Search Isolation');

  // Running vector search using Org A context must never return Org B's signatures
  // even if B's vector matches the search query perfectly
  const searchResults = await triageService.findSimilarFailureSignatures(orgA.id, projA.id, embeddingB);
  
  // Verify that B's signature is NOT in the search results
  const hasOrgBSignature = searchResults.some(res => res.id === 'sig-b-id');
  assert.strictEqual(hasOrgBSignature, false, "Vector search returned failure signature from another org!");

  // --- TEST CASE 6: GUARD & API KEY ISOLATION ---
  console.log('Test Case 6: Guard & API Key Isolation');

  const context = new OrgContext();
  const guard = new OrgGuard(context);

  // 6a. Authenticated via API key belonging to Org A
  const apiKeyMockRequest = {
    apiKey: { referenceId: orgA.id },
  };
  const execContextApiKey = createMockExecutionContext(apiKeyMockRequest);
  const guardResApiKey = await guard.canActivate(execContextApiKey);
  assert.strictEqual(guardResApiKey, true);
  assert.strictEqual(context.getOrgId(), orgA.id);
  assert.strictEqual(context.getRole(), 'admin');

  // 6b. Authenticated via User A session but accessing Org B context
  const userSessionMockRequest = {
    user: { id: userA.id },
    session: { activeOrganizationId: orgB.id },
  };
  const execContextUser = createMockExecutionContext(userSessionMockRequest);
  await assert.rejects(
    async () => {
      await guard.canActivate(execContextUser);
    },
    ForbiddenException,
    "Non-member was allowed access to an organization!"
  );

  // --- TEST CASE 7: JOB & BACKGROUND PROCESS ISOLATION ---
  console.log('Test Case 7: Job & Background Process Isolation');

  // Background jobs must build a scoped client from their payload organizationId.
  // If the job for Org A attempts to write a row with Org B's ID, the scoped client will block it.
  const dbJobA = scopedClient(orgA.id);
  await assert.rejects(
    async () => {
      await dbJobA.incident.create({
        data: {
          id: 'job-conflict-id',
          organizationId: orgB.id, // Trying to write Org B's rows under Org A client context
          projectId: projA.id,
          source: 'GITHUB_CI',
          title: 'Job Leak Test',
          status: 'OPEN',
          severity: 'HIGH',
        },
      });
    },
    /Security violation: Conflicting organizationId/i,
    "Background job was able to bypass organization scoping!"
  );

  // --- TEST CASE 8: ROLE HIERARCHY ---
  console.log('Test Case 8: Role Hierarchy Guard');

  const reflector = new Reflector();
  const roleGuard = new RoleGuard(reflector, context);

  // Set active role to Member
  context.setOrg(orgA.id, 'member');

  // Guard requiring MEMBER on Member role must succeed
  const memberRequiredHandler = () => {};
  reflector.getAllAndOverride = () => Role.MEMBER;
  const execContextMember = createMockExecutionContext({}, memberRequiredHandler);
  const roleGuardRes1 = roleGuard.canActivate(execContextMember);
  assert.strictEqual(roleGuardRes1, true);

  // --- TEST CASE 9: BETTER AUTH SIGNUP & ACTIVE ORG HOOK ---
  console.log('Test Case 9: Better Auth SignUp & Active Org Hooks');
  
  // Clean up user to avoid signup collisions
  await unsafeUnscopedClient.user.deleteMany({
    where: { email: { in: ['signupuser@example.com', 'signupuser@another.com'] } },
  });

  // Call the sign-up API to trigger Better Auth hook
  const signUpRes1 = await auth.api.signUpEmail({
    body: {
      email: 'signupuser@example.com',
      password: 'Password123!',
      name: 'Signup User',
    },
  });
  
  assert.ok(signUpRes1);
  assert.ok(signUpRes1.user);
  assert.ok(signUpRes1.token);

  const sessionRecord1 = await unsafeUnscopedClient.session.findFirst({
    where: { token: signUpRes1.token },
  });
  assert.ok(sessionRecord1, "Session record was not created on sign-up!");

  // Verify that a PERSONAL organization was created
  const personalOrg1 = await unsafeUnscopedClient.organization.findFirst({
    where: {
      slug: 'signupuser',
    },
  });
  assert.ok(personalOrg1, "Personal organization was not created on sign-up!");
  assert.strictEqual(personalOrg1.kind, 'PERSONAL');

  // Verify that the user is the OWNER of this personal organization
  const member1 = await unsafeUnscopedClient.member.findFirst({
    where: {
      organizationId: personalOrg1.id,
      userId: signUpRes1.user.id,
    },
  });
  assert.ok(member1, "User is not a member of their personal organization!");
  assert.strictEqual(member1.role, 'owner');

  // Verify that the session has activeOrganizationId set to the personal organization
  assert.strictEqual(sessionRecord1.activeOrganizationId, personalOrg1.id, "Active organization was not set on signup session!");

  // Verify slug collision handling: sign up another user with the same email local-part
  const signUpRes2 = await auth.api.signUpEmail({
    body: {
      email: 'signupuser@another.com',
      password: 'Password123!',
      name: 'Signup User 2',
    },
  });
  assert.ok(signUpRes2);

  const personalOrg2 = await unsafeUnscopedClient.organization.findFirst({
    where: {
      slug: 'signupuser-1', // Collision resolved by appending "-1"
    },
  });
  assert.ok(personalOrg2, "Collision resolution slug was not generated!");

  // --- TEST CASE 10: ORGANIZATION MODULE ENDPOINTS ---
  console.log('Test Case 10: Organization Module Endpoints (Create TEAM, Switch Active, Update Settings, Delete restrictions)');

  const orgsService = new OrgsService();

  // 10a. Create TEAM organization
  const teamOrg = await orgsService.createTeamOrg(signUpRes1.user.id, 'My Team Org', 'my-team-org');
  assert.ok(teamOrg);
  assert.strictEqual(teamOrg.kind, 'TEAM');

  // Verify user is owner of newly created team org
  const teamMember = await unsafeUnscopedClient.member.findFirst({
    where: {
      organizationId: teamOrg.id,
      userId: signUpRes1.user.id,
    },
  });
  assert.ok(teamMember);
  assert.strictEqual(teamMember.role, 'owner');

  // 10b. Switch Active Org
  const switchRes = await orgsService.switchActiveOrg(signUpRes1.user.id, sessionRecord1.id, teamOrg.id);
  assert.strictEqual(switchRes.activeOrganizationId, teamOrg.id);

  // 10c. Update Settings
  const updatedOrg = await orgsService.updateSettings(teamOrg.id, 'New Name', 'new-team-slug');
  assert.strictEqual(updatedOrg.name, 'New Name');
  assert.strictEqual(updatedOrg.slug, 'new-team-slug');

  // 10d. Delete Organization restrictions
  // Personal organization cannot be deleted
  await assert.rejects(
    async () => {
      await orgsService.deleteOrg(personalOrg1.id);
    },
    /PERSONAL organizations cannot be deleted/i,
    "Personal organization deletion did not throw!"
  );

  // Team organization can be deleted
  const deleteOrgRes = await orgsService.deleteOrg(teamOrg.id);
  assert.strictEqual(deleteOrgRes.message, 'Organization deleted successfully.');

  const checkTeamOrgExists = await unsafeUnscopedClient.organization.findUnique({
    where: { id: teamOrg.id },
  });
  assert.ok(!checkTeamOrgExists, "Team organization was not deleted!");

  // --- TEST CASE 11: GITHUB APP TOKEN CACHING & CONCURRENCY (REDIS MUTEX) ---
  console.log('Test Case 11: GitHub App Token Caching & Concurrency (Redis Mutex)');

  // Stub environment variables for GitHub App if they are not set
  process.env.GITHUB_APP_ID = process.env.GITHUB_APP_ID || '123456';
  if (!process.env.GITHUB_APP_PRIVATE_KEY_BASE64) {
    const { privateKey } = crypto.generateKeyPairSync('rsa' as any, {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.GITHUB_APP_PRIVATE_KEY_BASE64 = Buffer.from(privateKey as any).toString('base64');
  }
  process.env.GITHUB_APP_WEBHOOK_SECRET = process.env.GITHUB_APP_WEBHOOK_SECRET || 'webhook_secret';

  // Create an in-memory Redis mock to test the caching logic
  const mockRedisStore = new Map<string, string>();
  const mockRedis = {
    get: async (key: string) => mockRedisStore.get(key) || null,
    set: async (key: string, value: string, ...args: any[]) => {
      const isNx = args.includes('NX');
      if (isNx && mockRedisStore.has(key)) {
        return null;
      }
      mockRedisStore.set(key, value);
      return 'OK';
    },
    del: async (key: string) => {
      mockRedisStore.delete(key);
      return 1;
    },
    incr: async (key: string) => {
      const val = parseInt(mockRedisStore.get(key) || '0', 10) + 1;
      mockRedisStore.set(key, val.toString());
      return val;
    },
    expire: async (key: string, seconds: number) => {
      return 1;
    },
  } as any;

  // Stub global fetch
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  globalThis.fetch = async (url: any, options: any) => {
    fetchCallCount++;
    const urlStr = url.toString();
    if (urlStr.includes('/access_tokens')) {
      return {
        ok: true,
        json: async () => ({ token: 'mocked-installation-token-123' }),
      } as any;
    }
    if (urlStr.includes('/app/installations/')) {
      return {
        ok: true,
        json: async () => ({
          account: { login: 'mocked-account', type: 'Organization' },
          repository_selection: 'all',
        }),
      } as any;
    }
    if (urlStr.includes('/installation/repositories')) {
      return {
        ok: true,
        json: async () => ({
          repositories: [
            { id: 101, name: 'repo-1', full_name: 'mocked-account/repo-1', private: true },
          ],
        }),
      } as any;
    }
    return originalFetch(url, options);
  };

  const githubService = new GithubService(mockRedis);

  // First fetch: should call fetch (mocked) and cache token
  const token1 = await githubService.getInstallationToken('test-inst-1');
  assert.strictEqual(token1, 'mocked-installation-token-123');
  assert.strictEqual(fetchCallCount, 1);

  // Second fetch: should read from cache (fetch call count remains 1)
  const token2 = await githubService.getInstallationToken('test-inst-1');
  assert.strictEqual(token2, 'mocked-installation-token-123');
  assert.strictEqual(fetchCallCount, 1);

  // --- TEST CASE 12: GITHUB APP ORGANIZATION BINDING ---
  console.log('Test Case 12: GitHub App Organization Binding');
  
  // Clean up any existing installations
  await unsafeUnscopedClient.githubInstallation.deleteMany({});

  // Bind installation to Org A
  const bindRes1 = await githubService.bindInstallation(orgA.id, '12345', 'install');
  assert.ok(bindRes1);
  assert.strictEqual(bindRes1.organizationId, orgA.id);
  assert.strictEqual(bindRes1.installationId, '12345');

  // Attempt to bind the SAME installation to Org B: must throw security violation!
  await assert.rejects(
    async () => {
      await githubService.bindInstallation(orgB.id, '12345', 'install');
    },
    /already bound to another organization/i,
    "Was able to bind an installation to a second organization!"
  );

  // --- TEST CASE 13: GITHUB APP WEBHOOKS AND ARCHIVING ---
  console.log('Test Case 13: GitHub App Webhooks and Archiving');

  // Create a project linked to githubRepoId 202
  const project = await unsafeUnscopedClient.project.create({
    data: {
      id: 'test-webhook-proj-id',
      organizationId: orgA.id,
      name: 'Webhook Project',
      slug: 'webhook-proj',
      githubRepoId: 202n,
      webhookSecret: 'sec',
    },
  });

  // Verify project is not archived initially
  assert.strictEqual(project.archivedAt, null);

  // Webhook: payload for repositories_removed
  const webhookBodyRemoved = JSON.stringify({
    action: 'removed',
    installation: { id: 12345 },
    repositories_removed: [{ id: 202, full_name: 'orgA/repo-removed' }],
  });

  const secret = 'webhook_secret';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(webhookBodyRemoved);
  const signature = 'sha256=' + hmac.digest('hex');

  // Process repositories_removed webhook
  await githubService.processWebhook(Buffer.from(webhookBodyRemoved, 'utf8'), signature);

  // Check if project is archived
  const updatedProj1 = await unsafeUnscopedClient.project.findUnique({
    where: { id: project.id },
  });
  assert.ok(updatedProj1?.archivedAt, "Project was not archived when repository was removed!");

  // Create another project linked to repo 303
  const project2 = await unsafeUnscopedClient.project.create({
    data: {
      id: 'test-webhook-proj-2-id',
      organizationId: orgA.id,
      name: 'Webhook Project 2',
      slug: 'webhook-proj-2',
      githubRepoId: 303n,
      webhookSecret: 'sec',
    },
  });

  // Webhook: payload for installation deleted
  const webhookBodyDeleted = JSON.stringify({
    action: 'deleted',
    installation: { id: 12345 },
  });

  const hmacDel = crypto.createHmac('sha256', secret);
  hmacDel.update(webhookBodyDeleted);
  const signatureDel = 'sha256=' + hmacDel.digest('hex');

  // Process installation deleted webhook
  await githubService.processWebhook(Buffer.from(webhookBodyDeleted, 'utf8'), signatureDel);

  // Verify project2 is archived
  const updatedProj2 = await unsafeUnscopedClient.project.findUnique({
    where: { id: project2.id },
  });
  assert.ok(updatedProj2?.archivedAt, "Project was not archived when installation was deleted!");

  // Verify GithubInstallation record is deleted from DB
  const checkInstExists = await unsafeUnscopedClient.githubInstallation.findUnique({
    where: { installationId: 12345n },
  });
  assert.ok(!checkInstExists, "GithubInstallation was not deleted!");

  // Restore fetch
  globalThis.fetch = originalFetch;

  // --- TEST CASE 14: GITHUB APP WEBHOOK INGESTION (VERIFY, REPLAY, DUPLICATE, ENQUEUE, WebhookDelivery LOGS) ---
  console.log('Test Case 14: GitHub App Webhook Ingestion');

  // We mock a project in orgA and associate it with githubRepoId 505
  const webhookProject = await unsafeUnscopedClient.project.create({
    data: {
      id: 'webhook-project-a',
      organizationId: orgA.id,
      name: 'Webhook Project A',
      slug: 'webhook-project-a',
      githubRepoId: 505n,
      webhookSecret: 'generic-secret',
    },
  });

  // Re-seed GithubInstallation under orgA
  await unsafeUnscopedClient.githubInstallation.create({
    data: {
      id: crypto.randomUUID(),
      organizationId: orgA.id,
      installationId: 5005n,
      accountLogin: 'mock-login',
      accountType: 'Organization',
      repositorySelection: 'all',
      createdAt: new Date(),
    },
  });

  const webhooksService = new WebhooksService(mockRedis);

  // 14a. Invalid signature check
  const githubPayloadStr = JSON.stringify({
    action: 'completed',
    installation: { id: 5005 },
    repository: { id: 505, name: 'repo-a', owner: { login: 'mock-login' } },
    workflow_run: { id: 8888, conclusion: 'failure', updated_at: new Date().toISOString() },
  });

  await assert.rejects(
    async () => {
      await webhooksService.processGithubWebhook(Buffer.from(githubPayloadStr, 'utf8'), {
        'x-github-delivery': 'delivery-id-1',
        'x-github-event': 'workflow_run',
        'x-hub-signature-256': 'sha256=invalidsignature',
      });
    },
    /Invalid signature matching/i,
    "Invalid signature did not throw!"
  );

  // Check that the failed delivery was recorded
  const failedLog = await unsafeUnscopedClient.webhookDelivery.findFirst({
    where: { deliveryId: 'delivery-id-1' },
  });
  assert.ok(failedLog);
  assert.strictEqual(failedLog.status, 'FAILED_VERIFICATION');

  // 14b. Replay protection check
  const oldGithubPayloadStr = JSON.stringify({
    action: 'completed',
    installation: { id: 5005 },
    repository: { id: 505, name: 'repo-a', owner: { login: 'mock-login' } },
    workflow_run: { id: 8888, conclusion: 'failure', updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() }, // 10 minutes ago
  });

  // Create signature for old payload
  const sigHmacOld = crypto.createHmac('sha256', process.env.GITHUB_APP_WEBHOOK_SECRET || 'webhook_secret');
  sigHmacOld.update(oldGithubPayloadStr);
  const oldSignatureHeader = 'sha256=' + sigHmacOld.digest('hex');

  await assert.rejects(
    async () => {
      await webhooksService.processGithubWebhook(Buffer.from(oldGithubPayloadStr, 'utf8'), {
        'x-github-delivery': 'delivery-id-2',
        'x-github-event': 'workflow_run',
        'x-hub-signature-256': oldSignatureHeader,
      });
    },
    /older than 5 minutes/i,
    "Older webhook delivery was not rejected!"
  );

  const replayLog = await unsafeUnscopedClient.webhookDelivery.findFirst({
    where: { deliveryId: 'delivery-id-2' },
  });
  assert.ok(replayLog);
  assert.strictEqual(replayLog.status, 'REJECTED_REPLAY');

  // 14c. Valid signature, timestamp, duplicate & BullMQ check
  // Mock BullMQ add method to intercept enqueued job
  let enqueuedJobData: any = null;
  (webhooksService as any).triageQueue = {
    add: async (name: string, data: any) => {
      enqueuedJobData = data;
      return { id: 'job-id' };
    },
  } as any;

  const validHmac = crypto.createHmac('sha256', process.env.GITHUB_APP_WEBHOOK_SECRET || 'webhook_secret');
  validHmac.update(githubPayloadStr);
  const validSignatureHeader = 'sha256=' + validHmac.digest('hex');

  const outcomeSuccess = await webhooksService.processGithubWebhook(Buffer.from(githubPayloadStr, 'utf8'), {
    'x-github-delivery': 'delivery-id-3',
    'x-github-event': 'workflow_run',
    'x-hub-signature-256': validSignatureHeader,
  });

  assert.strictEqual(outcomeSuccess.status, 202);
  // Verify BullMQ job has explicit organizationId and projectId
  assert.ok(enqueuedJobData);
  assert.strictEqual(enqueuedJobData.organizationId, orgA.id);
  assert.strictEqual(enqueuedJobData.projectId, webhookProject.id);

  // Verify successful delivery logging
  const successLog = await unsafeUnscopedClient.webhookDelivery.findFirst({
    where: { deliveryId: 'delivery-id-3' },
  });
  assert.ok(successLog);
  assert.strictEqual(successLog.status, 'SUCCESS');
  assert.strictEqual(successLog.payload, githubPayloadStr);

  // Try delivering duplicate delivery ID: should return 202 directly and not trigger a second job
  enqueuedJobData = null;
  const duplicateOutcome = await webhooksService.processGithubWebhook(Buffer.from(githubPayloadStr, 'utf8'), {
    'x-github-delivery': 'delivery-id-3', // Same ID
    'x-github-event': 'workflow_run',
    'x-hub-signature-256': validSignatureHeader,
  });
  assert.strictEqual(duplicateOutcome.status, 202);
  assert.strictEqual(enqueuedJobData, null, "Duplicate delivery triggered another BullMQ job!");

  // --- TEST CASE 15: GENERIC HMAC WEBHOOK INGESTION ---
  console.log('Test Case 15: Generic HMAC Webhook Ingestion');

  const genericPayloadStr = JSON.stringify({
    runId: 9999,
    owner: 'mock-login',
    repo: 'repo-a',
  });

  // 15a. Unknown projectId throws 401 Unauthorized
  await assert.rejects(
    async () => {
      await webhooksService.processGenericWebhook('unknown-project-id', Buffer.from(genericPayloadStr, 'utf8'), {
        'x-delivery-id': 'delivery-gen-1',
      });
    },
    /Unauthorized/i,
    "Unknown generic project ID did not throw 401 Unauthorized!"
  );

  // 15b. Valid project, invalid signature
  await assert.rejects(
    async () => {
      await webhooksService.processGenericWebhook(webhookProject.id, Buffer.from(genericPayloadStr, 'utf8'), {
        'x-delivery-id': 'delivery-gen-2',
        'x-signature-256': 'invalidsig',
        'x-timestamp': Date.now().toString(),
      });
    },
    /Invalid signature matching/i,
    "Generic invalid signature did not throw!"
  );

  // 15c. Valid project, valid signature, duplicate, and BullMQ enqueuing
  const genHmac = crypto.createHmac('sha256', webhookProject.webhookSecret);
  genHmac.update(genericPayloadStr);
  const genSignatureHeader = genHmac.digest('hex');

  enqueuedJobData = null;
  const genOutcome = await webhooksService.processGenericWebhook(webhookProject.id, Buffer.from(genericPayloadStr, 'utf8'), {
    'x-delivery-id': 'delivery-gen-3',
    'x-signature-256': genSignatureHeader,
    'x-timestamp': Date.now().toString(),
  });

  assert.strictEqual(genOutcome.status, 202);
  assert.ok(enqueuedJobData);
  assert.strictEqual(enqueuedJobData.organizationId, orgA.id);
  assert.strictEqual(enqueuedJobData.projectId, webhookProject.id);

  // Verify generic success log
  const genLog = await unsafeUnscopedClient.webhookDelivery.findFirst({
    where: { deliveryId: 'delivery-gen-3' },
  });
  assert.ok(genLog);
  assert.strictEqual(genLog.status, 'SUCCESS');

  // --- TEST CASE 16: ADMIN WEBHOOK REDELIVERY ---
  console.log('Test Case 16: Admin Webhook Redelivery');

  enqueuedJobData = null;
  const redeliverRes = await webhooksService.redeliverWebhook(successLog.id);
  assert.ok(redeliverRes);
  assert.strictEqual(redeliverRes.status, 'SUCCESS');
  assert.ok(enqueuedJobData);
  assert.strictEqual(enqueuedJobData.runId, 8888);
  assert.strictEqual(enqueuedJobData.organizationId, orgA.id);

  // --- TEST CASE 17: CUSTOM ORG API KEYS (CREATE, LIST, REVOKE) ---
  console.log('Test Case 17: Custom Org API Keys (Create, List, Revoke)');

  // Clear existing API keys
  await unsafeUnscopedClient.apiKey.deleteMany({});

  // 17a. Create API Key
  const createKeyRes = await orgsService.createApiKey(orgA.id, userA.id, 'Production Key', ['incidents:read']);
  assert.ok(createKeyRes);
  assert.ok(createKeyRes.key.startsWith('itg_dev_') || createKeyRes.key.startsWith('itg_live_'));
  assert.strictEqual(createKeyRes.name, 'Production Key');
  assert.strictEqual(createKeyRes.prefix, createKeyRes.key.slice(0, 12));
  assert.deepStrictEqual(createKeyRes.scopes, ['incidents:read']);

  // Ensure key hash matches SHA-256 of raw key
  const expectedHash = crypto.createHash('sha256').update(createKeyRes.key).digest('hex');
  const storedKey = await unsafeUnscopedClient.apiKey.findUnique({
    where: { id: createKeyRes.id },
  });
  assert.ok(storedKey);
  assert.strictEqual(storedKey.hash, expectedHash);

  // 17b. List API Keys
  const listKeys = await orgsService.listApiKeys(orgA.id);
  assert.strictEqual(listKeys.length, 1);
  assert.strictEqual(listKeys[0].name, 'Production Key');
  // Hash must be excluded in select
  assert.strictEqual((listKeys[0] as any).hash, undefined);

  // 17c. Revoke API Key
  await orgsService.revokeApiKey(orgA.id, createKeyRes.id);
  const checkRevoked = await unsafeUnscopedClient.apiKey.findUnique({
    where: { id: createKeyRes.id },
  });
  assert.ok(checkRevoked?.revokedAt);

  // --- TEST CASE 18: API KEY GUARD INTEGRATION ---
  console.log('Test Case 18: ApiKeyGuard Integration');

  // Create a new active key
  const activeKeyRes = await orgsService.createApiKey(orgA.id, userA.id, 'Active Key', ['incidents:read', 'incidents:write']);
  
  const reflectorKeys = new Reflector();
  const apiKeyGuard = new ApiKeyGuard(mockRedis, context, reflectorKeys);

  // 18a. Pass-through when no headers
  const mockReqNoHeaders = { headers: {} };
  const canActivateNoHeaders = await apiKeyGuard.canActivate(createMockExecutionContext(mockReqNoHeaders));
  assert.strictEqual(canActivateNoHeaders, true);

  // 18b. Throws on invalid prefix
  const mockReqInvalidKey = { headers: { 'x-api-key': 'invalid_prefix_key' } };
  await assert.rejects(
    async () => {
      await apiKeyGuard.canActivate(createMockExecutionContext(mockReqInvalidKey));
    },
    /Invalid API key format/i,
    "Invalid prefix format did not throw!"
  );

  // 18c. Throws on missing required scopes
  const mockReqScopes = { headers: { 'x-api-key': activeKeyRes.key } };
  const mockHandlerWithScopes = () => {};
  // Annotate handler with 'projects:read' which our key does not have
  Reflect.defineMetadata(REQUIRE_SCOPES_KEY, ['projects:read'], mockHandlerWithScopes);

  await assert.rejects(
    async () => {
      await apiKeyGuard.canActivate(createMockExecutionContext(mockReqScopes, mockHandlerWithScopes));
    },
    /Insufficient API key permissions/i,
    "Missing scopes did not throw ForbiddenException!"
  );

  // 18d. Access granted and OrgContext populates
  const mockReqSuccess = { headers: { 'x-api-key': activeKeyRes.key } };
  const mockHandlerSuccess = () => {};
  Reflect.defineMetadata(REQUIRE_SCOPES_KEY, ['incidents:read'], mockHandlerSuccess);

  // Clean rate limit redis entry for this key
  mockRedisStore.clear();

  const contextForGuard = new OrgContext();
  const apiKeyGuardSuccess = new ApiKeyGuard(mockRedis, contextForGuard, reflectorKeys);

  const canActivateSuccess = await apiKeyGuardSuccess.canActivate(
    createMockExecutionContext(mockReqSuccess, mockHandlerSuccess)
  );

  assert.strictEqual(canActivateSuccess, true);
  assert.strictEqual(contextForGuard.getOrgId(), orgA.id);
  assert.strictEqual(contextForGuard.getRole(), 'admin');

  // 18e. Rate limit enforcement
  // Artificially flood rate limit key in mockRedisStore
  const limitKey = `ratelimit:apikey:${activeKeyRes.id}:${Math.floor(Date.now() / 60000)}`;
  mockRedisStore.set(limitKey, '101'); // Force exceed 100 limit

  await assert.rejects(
    async () => {
      await apiKeyGuardSuccess.canActivate(createMockExecutionContext(mockReqSuccess, mockHandlerSuccess));
    },
    /API rate limit exceeded/i,
    "Rate limiting did not throw 429 HttpException!"
  );

  // --- TEST CASE 19: ORG MEMBER & ROLE RULES ---
  console.log('Test Case 19: Org Member & Role Rules');

  // Setup a TEAM organization for testing
  const orgTeam = await unsafeUnscopedClient.organization.create({
    data: {
      id: 'org-team-id',
      name: 'Team Org',
      slug: 'org-team',
      kind: 'TEAM',
      plan: 'FREE',
      createdAt: new Date(),
    },
  });

  // Seed two members: User A as owner, User B as member
  const memberOwner = await unsafeUnscopedClient.member.create({
    data: {
      id: 'member-owner-team-id',
      organizationId: orgTeam.id,
      userId: userA.id,
      role: 'owner',
      createdAt: new Date(),
    },
  });

  const memberB = await unsafeUnscopedClient.member.create({
    data: {
      id: 'member-b-team-id',
      organizationId: orgTeam.id,
      userId: userB.id,
      role: 'member',
      createdAt: new Date(),
    },
  });

  // 19a. PERSONAL org cannot be left or deleted
  await assert.rejects(
    async () => {
      await orgsService.leaveOrg(orgA.id, userA.id);
    },
    /PERSONAL organizations cannot be left/i,
    "Left PERSONAL org did not throw!"
  );

  // 19b. Admin cannot promote to OWNER; only OWNER can
  // Create a mock user for the admin membership first to satisfy foreign key constraints
  const userAdminMock = await unsafeUnscopedClient.user.create({
    data: {
      id: 'user-admin-mock-id',
      email: 'admin-mock@example.com',
      name: 'Admin Mock User',
    },
  });

  const memberAdmin = await unsafeUnscopedClient.member.create({
    data: {
      id: 'member-admin-team-id',
      organizationId: orgTeam.id,
      userId: userAdminMock.id,
      role: 'admin',
      createdAt: new Date(),
    },
  });

  await assert.rejects(
    async () => {
      await orgsService.updateMemberRole(orgTeam.id, 'admin', memberB.id, 'owner');
    },
    /An ADMIN cannot promote to OWNER/i,
    "Admin promoting to OWNER did not throw!"
  );

  // OWNER can promote
  const updatedToOwner = await orgsService.updateMemberRole(orgTeam.id, 'owner', memberB.id, 'owner');
  assert.strictEqual(updatedToOwner.role, 'owner');

  // Revert memberB role back to member
  await unsafeUnscopedClient.member.update({
    where: { id: memberB.id },
    data: { role: 'member' },
  });

  // 19c. Block removing the last OWNER, and block the last OWNER leaving
  await assert.rejects(
    async () => {
      await orgsService.removeMember(orgTeam.id, 'owner', memberOwner.id);
    },
    /Cannot remove the last OWNER/i,
    "Removing the last owner did not throw!"
  );

  await assert.rejects(
    async () => {
      await orgsService.leaveOrg(orgTeam.id, userA.id);
    },
    /Cannot leave the organization as the last OWNER/i,
    "Last OWNER leaving did not throw!"
  );

  // 19d. Ownership transfer, OWNER only, with confirmation
  // Transfer request without confirmation
  const transferPrompt = await orgsService.transferOwnership(orgTeam.id, userA.id, memberB.id, false) as any;
  assert.ok(transferPrompt.confirmationRequired);

  // Perform transfer with confirmation
  const transferSuccess = await orgsService.transferOwnership(orgTeam.id, userA.id, memberB.id, true);
  assert.strictEqual(transferSuccess.message, 'Ownership transferred successfully.');

  // Verify roles have switched: User B is now owner, User A is demoted to admin
  const newOwnerRec = await unsafeUnscopedClient.member.findUnique({ where: { id: memberB.id } });
  const newAdminRec = await unsafeUnscopedClient.member.findUnique({ where: { id: memberOwner.id } });
  assert.strictEqual(newOwnerRec?.role, 'owner');
  assert.strictEqual(newAdminRec?.role, 'admin');

  // Clean up orgTeam members and org
  await unsafeUnscopedClient.member.deleteMany({ where: { organizationId: orgTeam.id } });
  await unsafeUnscopedClient.organization.delete({ where: { id: orgTeam.id } });


  // --- TEST CASE 20: EMAIL INVITATIONS VERIFICATION ---
  console.log('Test Case 20: Email Invitations Verification');

  // Create a new TEAM org for invitations test
  const orgTeam2 = await unsafeUnscopedClient.organization.create({
    data: {
      id: 'org-team2-id',
      name: 'Team Org 2',
      slug: 'org-team2',
      kind: 'TEAM',
      plan: 'FREE',
      createdAt: new Date(),
    },
  });

  const memberOwner2 = await unsafeUnscopedClient.member.create({
    data: {
      id: 'member-owner2-id',
      organizationId: orgTeam2.id,
      userId: userA.id,
      role: 'owner',
      createdAt: new Date(),
    },
  });

  // 20a. Create invitation & verify token hashed in DB
  const inviteRes = await orgsService.inviteMember(orgTeam2.id, userA.id, 'invitee@example.com', 'member');
  assert.ok(inviteRes);
  assert.strictEqual(inviteRes.email, 'invitee@example.com');
  
  // Find stored invitation
  const inviteInDb = await unsafeUnscopedClient.invitation.findUnique({
    where: { id: inviteRes.id },
  });
  assert.ok(inviteInDb);
  assert.ok(inviteInDb.tokenHash);
  assert.strictEqual(inviteInDb.status, 'pending');

  // Create another invitation
  const invite2 = await orgsService.inviteMember(orgTeam2.id, userA.id, 'invitee2@example.com', 'member');
  assert.ok(invite2.token);

  // 20b. Expired invitation rejected
  // Update invitation to be expired
  await unsafeUnscopedClient.invitation.update({
    where: { id: invite2.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  await assert.rejects(
    async () => {
      await orgsService.acceptInvitation(userB.id, 'invitee2@example.com', invite2.token, false);
    },
    /This invitation has expired/i,
    "Expired invitation did not throw!"
  );

  // 20c. Accepting requires email to match or explicit confirmation step
  const invite3 = await orgsService.inviteMember(orgTeam2.id, userA.id, 'invitee3@example.com', 'member');
  
  // Try accepting with email mismatch and confirm = false
  await assert.rejects(
    async () => {
      await orgsService.acceptInvitation(userB.id, 'different@example.com', invite3.token, false);
    },
    /Email mismatch/i,
    "Email mismatch without confirm did not throw!"
  );

  // Accept with confirm = true should succeed
  const acceptResConfirm = await orgsService.acceptInvitation(userB.id, 'different@example.com', invite3.token, true);
  assert.strictEqual(acceptResConfirm.organizationId, orgTeam2.id);

  // 20d. Token single-use
  await assert.rejects(
    async () => {
      await orgsService.acceptInvitation(userB.id, 'different@example.com', invite3.token, true);
    },
    /Invalid or expired invitation token/i,
    "Re-using invitation token did not throw!"
  );

  // 20e. Cross-org / invalid token rejection
  await assert.rejects(
    async () => {
      await orgsService.acceptInvitation(userB.id, 'some@example.com', 'invalidrandomtoken', true);
    },
    /Invalid or expired invitation token/i,
    "Invalid token accepted!"
  );

  // Clean up orgTeam2
  await unsafeUnscopedClient.member.deleteMany({ where: { organizationId: orgTeam2.id } });
  await unsafeUnscopedClient.invitation.deleteMany({ where: { organizationId: orgTeam2.id } });
  await unsafeUnscopedClient.organization.delete({ where: { id: orgTeam2.id } });

  console.log('--- ALL TENANT ISOLATION TESTS PASSED SUCCESSFULLY! ---');
}

runIsolationSuite().catch((err) => {
  console.error('✗ Tenant Isolation Test Suite Failed!');
  console.error(err);
  process.exit(1);
});
