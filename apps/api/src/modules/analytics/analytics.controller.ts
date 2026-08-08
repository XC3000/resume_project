import { Controller, Post, Body, Req, UseGuards, BadRequestException, HttpCode, HttpStatus, Logger, Sse } from '@nestjs/common';
import { ApiKeyGuard } from '../../auth/api-key.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventBatchSchema } from '@platform/contracts';
import { prisma } from '@platform/db';
import * as crypto from 'crypto';
import { Observable, merge, interval } from 'rxjs';
import { map } from 'rxjs/operators';

// Rate limiting in-memory map for the demo-load endpoint to prevent abuse
const demoLoadRateLimits = new Map<string, number>();
const DEMO_LOAD_COOLDOWN_MS = 5000; // 5 seconds cooldown

@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async ingestEvents(@Req() req: any, @Body() body: any) {
    // 1. Validate payload batch structure with Zod schema from contracts package
    const parsed = AnalyticsEventBatchSchema.safeParse(body);
    if (!parsed.success) {
      this.logger.warn('Invalid batch payload format received on events ingestion');
      throw new BadRequestException({
        message: 'Invalid analytics events batch format',
        errors: parsed.error.issues,
      });
    }

    const events = parsed.data;
    const apiKeyInfo = req.apiKey; // Populated by ApiKeyGuard

    // 2. Fetch or initialize the tracking Source record inside Postgres.
    let source = await prisma.source.findFirst({
      where: { apiKeyId: apiKeyInfo.id },
    });

    if (!source) {
      this.logger.log(`No Source tracking record found for apiKeyId: ${apiKeyInfo.id}. Creating new default source...`);
      source = await prisma.source.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: apiKeyInfo.referenceId,
          name: apiKeyInfo.name || 'Default Source',
          apiKeyId: apiKeyInfo.id,
        },
      });
    }

    // 3. Queue the events into Redis stream. Does not execute Postgres queries for raw events.
    await this.analyticsService.enqueueEventsBatch(source.id, events);

    // 4. Return HTTP 202 immediately to signal acceptance of processing
    return {
      status: 'accepted',
      eventsReceived: events.length,
      sourceId: source.id,
    };
  }

  @Post('demo-load')
  @UseGuards(AuthGuard)
  async generateDemoLoad(@Req() req: any) {
    const userId = req.user.id;
    const now = Date.now();
    
    // Rate limit check based on authenticated userId
    const lastCalled = demoLoadRateLimits.get(userId) || 0;
    if (now - lastCalled < DEMO_LOAD_COOLDOWN_MS) {
      throw new BadRequestException({
        message: 'Demo load generator is rate-limited. Please wait 5 seconds before firing another burst.',
      });
    }
    demoLoadRateLimits.set(userId, now);

    // Get user's active organization ID, defaulting if not set
    let activeOrgId = req.session.activeOrganizationId;
    if (!activeOrgId) {
      // Look up first organization the user is a member of
      const memberOrg = await prisma.member.findFirst({
        where: { userId },
      });
      activeOrgId = memberOrg?.organizationId || 'demo-org';
    }

    // Find or create default demo source
    let source = await prisma.source.findFirst({
      where: { organizationId: activeOrgId },
    });

    if (!source) {
      source = await prisma.source.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: activeOrgId,
          name: 'Demo Load Generator Source',
          apiKeyId: 'demo-api-key-id',
        },
      });
    }

    // Generate a burst of 50 test events simulating diverse latencies and CPU spikes
    const metricNames = ['http_request_latency', 'cpu_utilization_pct', 'memory_utilization_pct'];
    const events = Array.from({ length: 50 }).map(() => ({
      eventId: crypto.randomUUID(),
      metricName: metricNames[Math.floor(Math.random() * metricNames.length)],
      value: Math.random() * 300 + 20, // Random values simulating server stats
      timestamp: new Date(Date.now() - Math.random() * 1000).toISOString(),
    }));

    // Direct XADD enqueuing
    await this.analyticsService.enqueueEventsBatch(source.id, events);
    this.logger.log(`Demo load fired: enqueued ${events.length} events for source ID: ${source.id}`);

    return {
      success: true,
      eventsGenerated: events.length,
      sourceId: source.id,
    };
  }

  @Sse('live')
  async sse(): Promise<Observable<{ data: any }>> {
    this.logger.log('SSE client connection opened for live analytics metrics stream');
    
    // Retrieve starting count from Postgres so client dashboard starts populated
    const totalCount = await prisma.processedEvent.count();
    
    const initialSnapshot$ = new Observable<{ data: any }>((subscriber) => {
      subscriber.next({
        data: {
          eventsPerSec: 0,
          totalEvents: totalCount,
          p50Latency: 0,
          p95Latency: 0,
          timestamp: new Date().toISOString(),
        },
      });
      subscriber.complete();
    });

    const liveMetrics$ = this.analyticsService.liveMetrics$.pipe(
      map((metrics) => ({
        data: metrics,
      }))
    );

    // Keep-alive ticks every 5 seconds to ensure proxies or load balancers don't drop the connection
    const keepAlive$ = interval(5000).pipe(
      map(() => ({
        data: { keepAlive: true, timestamp: new Date().toISOString() },
      }))
    );

    return merge(initialSnapshot$, liveMetrics$, keepAlive$);
  }
}
