import * as assert from 'assert';

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
  const searchResults = await triageService.findSimilarFailureSignatures(orgA.id, embeddingB);
  
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

  // Guard requiring ADMIN on Member role must fail
  const adminRequiredHandler = () => {};
  reflector.getAllAndOverride = () => Role.ADMIN;
  const execContextAdmin = createMockExecutionContext({}, adminRequiredHandler);
  assert.throws(
    () => roleGuard.canActivate(execContextAdmin),
    ForbiddenException,
    "Member was allowed to perform an Admin action!"
  );

  console.log('--- ALL TENANT ISOLATION TESTS PASSED SUCCESSFULLY! ---');
}

runIsolationSuite().catch((err) => {
  console.error('✗ Tenant Isolation Test Suite Failed!');
  console.error(err);
  process.exit(1);
});
