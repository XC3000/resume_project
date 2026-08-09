import { Injectable, Inject, Logger, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { scopedClient, unsafeUnscopedClient } from '@platform/db';

export const REDIS_CONNECTION = 'REDIS_CONNECTION';

@Injectable()
export class WebhooksService {
  private readonly triageQueue: Queue;
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: Redis,
  ) {
    this.triageQueue = new Queue('triage-logs', {
      connection: this.redis,
    });
  }

  private timingSafeCompare(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(aBuf, bBuf);
  }

  private parseTimestamp(val: any): number | null {
    if (!val) return null;
    const num = Number(val);
    if (isNaN(num)) {
      const parsedDate = Date.parse(val);
      return isNaN(parsedDate) ? null : parsedDate;
    }
    // Handle seconds vs milliseconds
    return num < 9999999999 ? num * 1000 : num;
  }

  async processGithubWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
    const deliveryId = headers['x-github-delivery'] as string;
    const eventType = headers['x-github-event'] as string || 'unknown';
    const signatureHeader = headers['x-hub-signature-256'] as string;

    if (!deliveryId) {
      throw new BadRequestException('Missing x-github-delivery header.');
    }

    // 1. Verify signature, timing-safe, BEFORE any parsing
    const appSecret = process.env.GITHUB_APP_WEBHOOK_SECRET;
    if (!appSecret) {
      this.logger.error('GITHUB_APP_WEBHOOK_SECRET is not configured.');
      throw new BadRequestException('Webhook verification misconfigured.');
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      await this.logDelivery('unresolved', null, 'GITHUB', eventType, deliveryId, 'FAILED_VERIFICATION', 'Missing or malformed signature header.', rawBody.toString('utf8'));
      throw new UnauthorizedException('Missing signature header.');
    }

    const expectedSignature = signatureHeader.slice(7);
    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(rawBody);
    const computedSignature = hmac.digest('hex');

    if (!this.timingSafeCompare(computedSignature, expectedSignature)) {
      await this.logDelivery('unresolved', null, 'GITHUB', eventType, deliveryId, 'FAILED_VERIFICATION', 'Signature verification failed.', rawBody.toString('utf8'));
      throw new UnauthorizedException('Invalid signature matching.');
    }

    // Parse payload safely now that signature is verified
    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      await this.logDelivery('unresolved', null, 'GITHUB', eventType, deliveryId, 'MALFORMED_JSON', 'Malformed JSON payload.', rawBody.toString('utf8'));
      throw new BadRequestException('Malformed JSON payload.');
    }

    // 2. Replay Protection: reject deliveries older than 5 minutes
    let eventTime: number = Date.now();
    if (payload.workflow_run?.updated_at) {
      const parsed = this.parseTimestamp(payload.workflow_run.updated_at);
      if (parsed) eventTime = parsed;
    } else if (payload.installation?.updated_at) {
      const parsed = this.parseTimestamp(payload.installation.updated_at);
      if (parsed) eventTime = parsed;
    }
    
    if (Math.abs(Date.now() - eventTime) > 5 * 60 * 1000) {
      await this.logDelivery('unresolved', null, 'GITHUB', eventType, deliveryId, 'REJECTED_REPLAY', 'Delivery rejected: older than 5 minutes.', JSON.stringify(payload));
      throw new BadRequestException('Delivery rejected: older than 5 minutes.');
    }

    // 3. Duplicate protection: store delivery ID in Redis with 24h TTL
    const redisKey = `webhook:delivery:${deliveryId}`;
    const isNew = await this.redis.set(redisKey, '1', 'PX', 24 * 60 * 60 * 1000, 'NX');
    if (isNew !== 'OK') {
      this.logger.log(`Duplicate webhook delivery dropped: ${deliveryId}`);
      return { status: 202, message: 'Duplicate delivery dropped.' };
    }

    // 4. Resolve tenant
    const installationId = payload.installation?.id;
    if (!installationId) {
      await this.logDelivery('unresolved', null, 'GITHUB', eventType, deliveryId, 'FAILED_TENANT_RESOLUTION', 'Payload missing installation id.', JSON.stringify(payload));
      return { status: 202, message: 'Missing installation details.' };
    }

    const installation = await unsafeUnscopedClient.githubInstallation.findUnique({
      where: { installationId: BigInt(installationId) },
    });

    if (!installation) {
      this.logger.warn(`Unknown GitHub installation: ${installationId}`);
      await this.logDelivery('unresolved', null, 'GITHUB', eventType, deliveryId, 'FAILED_TENANT_RESOLUTION', `Unknown GitHub installation: ${installationId}`, JSON.stringify(payload));
      return { status: 202, message: 'Unknown installation.' };
    }

    const orgId = installation.organizationId;

    // Resolve Project
    const repoId = payload.repository?.id;
    if (!repoId) {
      await this.logDelivery(orgId, null, 'GITHUB', eventType, deliveryId, 'FAILED_PROJECT_RESOLUTION', 'Payload missing repository details.', JSON.stringify(payload));
      return { status: 202, message: 'Missing repository details.' };
    }

    const project = await unsafeUnscopedClient.project.findFirst({
      where: {
        organizationId: orgId,
        githubRepoId: BigInt(repoId),
      },
    });

    if (!project) {
      this.logger.log(`Unconnected repository ${repoId} for organization ${orgId}`);
      await this.logDelivery(orgId, null, 'GITHUB', eventType, deliveryId, 'FAILED_PROJECT_RESOLUTION', `Unconnected repository ID: ${repoId}`, JSON.stringify(payload));
      return { status: 202, message: 'Unconnected repository.' };
    }

    // 5. Enqueue BullMQ job
    // Check if the event is a completed workflow run with a failure conclusion
    if (
      eventType === 'workflow_run' &&
      payload.action === 'completed' &&
      payload.workflow_run &&
      payload.workflow_run.conclusion === 'failure'
    ) {
      const runId = payload.workflow_run.id;
      const owner = payload.repository?.owner?.login;
      const repo = payload.repository?.name;

      if (runId && owner && repo) {
        await this.triageQueue.add(
          'process-logs',
          {
            runId,
            owner,
            repo,
            organizationId: orgId,
            projectId: project.id,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          }
        );
      }
    }

    // 6. Record log and return 202
    await this.logDelivery(orgId, project.id, 'GITHUB', eventType, deliveryId, 'SUCCESS', null, JSON.stringify(payload));
    return { status: 202, message: 'Processed' };
  }

  async processGenericWebhook(projectId: string, rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
    const eventType = headers['x-webhook-event'] as string || 'generic';
    const signatureHeader = headers['x-signature-256'] as string || headers['x-webhook-signature-256'] as string;
    const timestampHeader = headers['x-timestamp'] as string || headers['x-webhook-timestamp'] as string;

    // Look up project first (unscoped, to retrieve the webhookSecret for signature comparison)
    const project = await unsafeUnscopedClient.project.findUnique({
      where: { id: projectId },
    });

    // Unknown projectId returns 401, not 404 — do not confirm which IDs exist
    if (!project) {
      this.logger.warn(`Rejected generic webhook: Unknown projectId: ${projectId}`);
      throw new UnauthorizedException('Unauthorized');
    }

    const orgId = project.organizationId;
    
    // Generate a unique delivery ID from headers or hash the payload
    let deliveryId = headers['x-delivery-id'] as string;
    if (!deliveryId) {
      deliveryId = crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 32);
    }

    // 1. Verify signature, timing-safe, BEFORE any parsing
    if (!signatureHeader) {
      await this.logDelivery(orgId, project.id, 'GENERIC', eventType, deliveryId, 'FAILED_VERIFICATION', 'Missing signature header.', rawBody.toString('utf8'));
      throw new UnauthorizedException('Missing signature header.');
    }

    const hmac = crypto.createHmac('sha256', project.webhookSecret);
    hmac.update(rawBody);
    const computedSignature = hmac.digest('hex');

    if (!this.timingSafeCompare(computedSignature, signatureHeader)) {
      await this.logDelivery(orgId, project.id, 'GENERIC', eventType, deliveryId, 'FAILED_VERIFICATION', 'Signature verification failed.', rawBody.toString('utf8'));
      throw new UnauthorizedException('Invalid signature matching.');
    }

    // Parse payload safely now that signature is verified
    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      await this.logDelivery(orgId, project.id, 'GENERIC', eventType, deliveryId, 'MALFORMED_JSON', 'Malformed JSON payload.', rawBody.toString('utf8'));
      throw new BadRequestException('Malformed JSON payload.');
    }

    // 2. Replay Protection: reject deliveries older than 5 minutes
    const reqTimestamp = this.parseTimestamp(timestampHeader);
    if (!reqTimestamp || Math.abs(Date.now() - reqTimestamp) > 5 * 60 * 1000) {
      await this.logDelivery(orgId, project.id, 'GENERIC', eventType, deliveryId, 'REJECTED_REPLAY', 'Delivery rejected: older than 5 minutes or missing timestamp.', JSON.stringify(payload));
      throw new BadRequestException('Delivery rejected: older than 5 minutes.');
    }

    // 3. Duplicate protection: store delivery ID in Redis with 24h TTL
    const redisKey = `webhook:delivery:${deliveryId}`;
    const isNew = await this.redis.set(redisKey, '1', 'PX', 24 * 60 * 60 * 1000, 'NX');
    if (isNew !== 'OK') {
      this.logger.log(`Duplicate generic webhook delivery dropped: ${deliveryId}`);
      return { status: 202, message: 'Duplicate delivery dropped.' };
    }

    // 4. Enqueue BullMQ job carrying organizationId and projectId explicitly
    const { runId, owner, repo } = payload;
    if (runId && owner && repo) {
      await this.triageQueue.add(
        'process-logs',
        {
          runId,
          owner,
          repo,
          organizationId: orgId,
          projectId: project.id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }
      );
    }

    // 5. Record log and return 202
    await this.logDelivery(orgId, project.id, 'GENERIC', eventType, deliveryId, 'SUCCESS', null, JSON.stringify(payload));
    return { status: 202, message: 'Processed' };
  }

  async redeliverWebhook(deliveryId: string) {
    // Lookup the webhook delivery log
    const delivery = await unsafeUnscopedClient.webhookDelivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException(`Webhook delivery record not found for id: ${deliveryId}`);
    }

    if (!delivery.payload) {
      throw new BadRequestException('Raw payload was not preserved for this webhook delivery.');
    }

    // Construct a unique delivery ID for redeliveries to avoid clashing constraints
    const redeliveryId = `${delivery.deliveryId}-redeliver-${Date.now()}`;
    const payload = JSON.parse(delivery.payload);

    this.logger.log(`Redelivering webhook. Original deliveryId: ${delivery.deliveryId}, Source: ${delivery.source}`);

    if (delivery.source === 'GITHUB') {
      // Re-run enqueuing checks for GitHub App Webhooks
      if (
        delivery.eventType === 'workflow_run' &&
        payload.action === 'completed' &&
        payload.workflow_run &&
        payload.workflow_run.conclusion === 'failure'
      ) {
        const runId = payload.workflow_run.id;
        const owner = payload.repository?.owner?.login;
        const repo = payload.repository?.name;

        if (runId && owner && repo) {
          await this.triageQueue.add(
            'process-logs',
            {
              runId,
              owner,
              repo,
              organizationId: delivery.organizationId,
              projectId: delivery.projectId || '',
            },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
            }
          );
        }
      }
    } else if (delivery.source === 'GENERIC') {
      // Re-run enqueuing for Generic Webhooks
      const { runId, owner, repo } = payload;
      if (runId && owner && repo) {
        await this.triageQueue.add(
          'process-logs',
          {
            runId,
            owner,
            repo,
            organizationId: delivery.organizationId,
            projectId: delivery.projectId || '',
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          }
        );
      }
    }

    // Save a new record logging this redelivery attempt
    return this.logDelivery(
      delivery.organizationId,
      delivery.projectId,
      delivery.source,
      delivery.eventType,
      redeliveryId,
      'SUCCESS',
      `Redelivery of original delivery: ${delivery.deliveryId}`,
      delivery.payload
    );
  }

  private async logDelivery(
    organizationId: string,
    projectId: string | null,
    source: string,
    eventType: string,
    deliveryId: string,
    status: string,
    error: string | null,
    payload: string | null,
  ) {
    // Write webhook log via scoped database client
    const db = scopedClient(organizationId);
    return db.webhookDelivery.create({
      data: {
        id: crypto.randomUUID(),
        organizationId,
        projectId,
        source,
        eventType,
        deliveryId,
        status,
        error,
        payload,
        receivedAt: new Date(),
      },
    });
  }
}
