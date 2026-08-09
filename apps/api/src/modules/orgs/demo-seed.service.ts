import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { unsafeUnscopedClient } from '@platform/db';

@Injectable()
export class DemoSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoSeedService.name);

  async onApplicationBootstrap() {
    if (process.env.DEMO_MODE !== 'true') {
      this.logger.log('Demo mode is disabled. Skipping database seed.');
      return;
    }

    this.logger.log('Demo mode active: checking/seeding demo organization data...');
    try {
      // 1. Check if demo organization exists
      const existingOrg = await unsafeUnscopedClient.organization.findUnique({
        where: { id: 'demo-org-id' },
      });

      if (existingOrg) {
        this.logger.log('Demo organization already seeded.');
        return;
      }

      this.logger.log('Demo organization not found. Seeding database values...');

      // 2. Create organization
      await unsafeUnscopedClient.organization.create({
        data: {
          id: 'demo-org-id',
          name: 'Demo Sandbox Workspace',
          slug: 'demo',
          logo: null,
          createdAt: new Date(),
          kind: 'TEAM',
          plan: 'FREE',
        },
      });

      // 3. Create mock member
      await unsafeUnscopedClient.member.create({
        data: {
          id: 'demo-mem-id',
          organizationId: 'demo-org-id',
          userId: 'demo-user-id',
          role: 'viewer',
          createdAt: new Date(),
        },
      });

      // 4. Create mock project
      await unsafeUnscopedClient.project.create({
        data: {
          id: 'demo-proj-id',
          organizationId: 'demo-org-id',
          name: 'acme-backend',
          slug: 'acme-backend',
          webhookSecret: 'itg_wh_demo_secret_xyz123',
          createdAt: new Date(),
        },
      });

      // 5. Create mock incidents and chunks
      // Incident 1: NullPointerException
      await unsafeUnscopedClient.incident.create({
        data: {
          id: 'demo-inc-1',
          organizationId: 'demo-org-id',
          projectId: 'demo-proj-id',
          source: 'GITHUB_CI',
          title: 'NullPointerException in PaymentController',
          status: 'OPEN',
          severity: 'CRITICAL',
          detectedAt: new Date(Date.now() - 3600000),
          classification: 'Runtime Exception (NullPointer)',
          rootCauseHint: 'NullPointerException was thrown from PaymentController.java:L45 because paymentMethod was null.',
          suggestedFix: 'Add null check check for paymentMethod object inside request payload before dereferencing.',
        },
      });

      await unsafeUnscopedClient.contextChunk.create({
        data: {
          id: 'demo-chunk-1',
          organizationId: 'demo-org-id',
          incidentId: 'demo-inc-1',
          sequence: 1,
          startOffset: 0,
          endOffset: 500,
          content: '2026-08-09T20:15:33Z ERROR PaymentController: Failed to process checkout transaction request\njava.lang.NullPointerException: Cannot invoke "PaymentMethod.getType()" because "paymentMethod" is null\n\tat PaymentController.checkout(PaymentController.java:45)\n\tat java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)',
          justifies: true,
        },
      });

      // Incident 2: Redis Connection Failure
      await unsafeUnscopedClient.incident.create({
        data: {
          id: 'demo-inc-2',
          organizationId: 'demo-org-id',
          projectId: 'demo-proj-id',
          source: 'GITHUB_CI',
          title: 'Failed to connect to Redis cache database server',
          status: 'RESOLVED',
          severity: 'HIGH',
          detectedAt: new Date(Date.now() - 7200000),
          resolvedAt: new Date(Date.now() - 3600000),
          classification: 'Network Connection Timeout',
          rootCauseHint: 'Connection timeout while connecting to Upstash Redis cluster.',
          suggestedFix: 'Verify Redis URL credentials are correct, or increase connection timeout pool sizes.',
        },
      });

      await unsafeUnscopedClient.contextChunk.create({
        data: {
          id: 'demo-chunk-2',
          organizationId: 'demo-org-id',
          incidentId: 'demo-inc-2',
          sequence: 1,
          startOffset: 0,
          endOffset: 450,
          content: 'Redis connection failure: host=amused-koi-163979.upstash.io port=6379 status=ConnectionRefused\nConnection timeout after 5000ms\nShutting down database connection pools...',
          justifies: true,
        },
      });

      // Create initial LLM Usage
      await unsafeUnscopedClient.llmUsage.create({
        data: {
          id: 'demo-usage-id',
          organizationId: 'demo-org-id',
          day: new Date(new Date().setUTCHours(0, 0, 0, 0)),
          tokensIn: 12000,
          tokensOut: 8500,
          callCount: 15,
        },
      });

      this.logger.log('Demo database records seeded successfully.');
    } catch (err: any) {
      this.logger.error(`Failed to seed demo organization data: ${err.message}`);
    }
  }
}
