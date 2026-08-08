import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { prisma } from '@platform/db';
import { AnalyticsEvent } from '@platform/contracts';
import * as crypto from 'crypto';
import { Subject } from 'rxjs';

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  
  private redisProducer!: Redis;
  private redisConsumer!: Redis;
  
  private active = true;
  private autoclaimInterval!: NodeJS.Timeout;
  private readonly consumerName = `consumer-${crypto.randomBytes(4).toString('hex')}`;
  
  private readonly streamKey = 'analytics-stream';
  private readonly groupName = 'analytics-group';

  // Observable stream to broadcast metrics live to SSE clients
  public readonly liveMetrics$ = new Subject<{
    eventsPerSec: number;
    totalEvents: number;
    p50Latency: number;
    p95Latency: number;
    timestamp: string;
  }>();

  async onModuleInit() {
    this.logger.log(`Initializing Analytics service with consumer name: ${this.consumerName}`);
    
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const isTls = redisUrl.startsWith('rediss://');
    const redisOptions = {
      maxRetriesPerRequest: null,
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    };
    
    // We use two connections because redisConsumer will perform blocking XREADGROUP calls.
    // A blocked connection cannot process other commands, so redisProducer serves as the non-blocking channel.
    this.redisProducer = new Redis(redisUrl, redisOptions);
    this.redisConsumer = new Redis(redisUrl, redisOptions);

    this.redisProducer.on('error', (err) => {
      this.logger.error(`Redis Producer error: ${err.message}`);
    });

    this.redisConsumer.on('error', (err) => {
      this.logger.error(`Redis Consumer error: ${err.message}`);
    });

    // Initialize stream and group
    try {
      await this.redisProducer.xgroup('CREATE', this.streamKey, this.groupName, '$', 'MKSTREAM');
      this.logger.log(`Created Redis stream group '${this.groupName}'`);
    } catch (e: any) {
      if (!e.message?.includes('BUSYGROUP')) {
        this.logger.error(`Failed to initialize Redis stream group: ${e.message}`);
      }
    }

    // Start background consumer loop and claim timer
    this.runConsumerLoop();
    this.startAutoclaimTimer();
  }

  async onModuleDestroy() {
    this.active = false;
    if (this.autoclaimInterval) {
      clearInterval(this.autoclaimInterval);
    }
    
    // Close connections cleanly
    await this.redisProducer.quit();
    await this.redisConsumer.quit();
    this.logger.log('Analytics service connections closed cleanly');
  }

  /**
   * Enqueues a batch of up to 500 events to the Redis stream via XADD in a pipeline.
   * Returns immediately without performing database writes.
   */
  async enqueueEventsBatch(sourceId: string, events: AnalyticsEvent[]): Promise<void> {
    const pipeline = this.redisProducer.pipeline();

    for (const event of events) {
      pipeline.xadd(
        this.streamKey,
        'MAXLEN',
        '~',
        '50000',
        '*',
        'eventId', event.eventId,
        'metricName', event.metricName,
        'value', event.value.toString(),
        'timestamp', event.timestamp,
        'sourceId', sourceId
      );
    }

    await pipeline.exec();
  }

  /**
   * Background blocking consumer loop reading from the stream group
   */
  private async runConsumerLoop() {
    while (this.active) {
      try {
        // Block up to 5 seconds waiting for new events to arrive
        const results = await (this.redisConsumer.xreadgroup as any)(
          'GROUP',
          this.groupName,
          this.consumerName,
          'BLOCK',
          '5000',
          'COUNT',
          '100',
          'STREAMS',
          this.streamKey,
          '>'
        );

        if (results && Array.isArray(results) && results.length > 0) {
          const messages = results[0][1] as any[];
          await this.processStreamMessages(messages);
        }
      } catch (err: any) {
        if (err.message?.includes('NOGROUP')) {
          try {
            await this.redisProducer.xgroup('CREATE', this.streamKey, this.groupName, '$', 'MKSTREAM');
          } catch (_) {}
        } else {
          this.logger.error(`Error in stream consumer loop: ${err.message}`);
        }
        // Throttle backoff on connection errors
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Timer that automatically claims stale pending messages from dead consumers (pending > 60 seconds)
   */
  private startAutoclaimTimer() {
    this.autoclaimInterval = setInterval(async () => {
      if (!this.active) return;
      try {
        const results = await (this.redisProducer.xautoclaim as any)(
          this.streamKey,
          this.groupName,
          this.consumerName,
          '60000', // min idle time (60 seconds)
          '0-0',   // start ID
          'COUNT',
          '100'
        );

        if (results && Array.isArray(results) && results[1] && results[1].length > 0) {
          const messages = results[1] as any[];
          this.logger.log(`Claimed ${messages.length} dead consumer pending messages`);
          await this.processStreamMessages(messages);
        }
      } catch (err: any) {
        this.logger.error(`Failed executing XAUTOCLAIM claim timer: ${err.message}`, err.stack);
      }
    }, 30000);
  }

  /**
   * Parses stream entries and runs aggregations and database inserts
   */
  private async processStreamMessages(messages: any[]): Promise<void> {
    if (messages.length === 0) return;

    const messageIds: string[] = [];
    const uniqueEvents: Array<{
      eventId: string;
      metricName: string;
      value: number;
      timestamp: string;
      sourceId: string;
    }> = [];

    for (const msg of messages) {
      const msgId = msg[0];
      const fields = msg[1];
      messageIds.push(msgId);

      // Parse key-value stream elements to an object
      const parsedFields: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        parsedFields[fields[i]] = fields[i + 1];
      }

      const { eventId, metricName, value, timestamp, sourceId } = parsedFields;
      if (!eventId || !metricName || !value || !timestamp || !sourceId) {
        // Skip malformed entries and acknowledge to prevent stream poison pills
        this.logger.warn(`Skipping malformed stream message: ${msgId}`);
        await this.redisProducer.xack(this.streamKey, this.groupName, msgId);
        continue;
      }

      // 1. Idempotency Layer 1: SET NX with 1-hour TTL (Redis hot path)
      const hotPathKey = `event-id:${eventId}`;
      const isNewInRedis = await this.redisProducer.set(hotPathKey, '1', 'EX', 3600, 'NX');

      if (!isNewInRedis) {
        // Redis says duplicate; verify if it is already in Postgres (backstop) or skip
        this.logger.debug(`Skipping duplicate event ID (Redis hot path match): ${eventId}`);
        await this.redisProducer.xack(this.streamKey, this.groupName, msgId);
        continue;
      }

      // 2. Idempotency Layer 2: ProcessedEvent database check via ON CONFLICT DO NOTHING
      // Perform database insertion check
      try {
        const rowsAffected = await prisma.$executeRaw`
          INSERT INTO "analytics"."ProcessedEvent" ("id", "sourceId", "processedAt")
          VALUES (${eventId}, ${sourceId}, ${new Date()})
          ON CONFLICT DO NOTHING
        `;

        if (rowsAffected === 0) {
          // Already exists in Postgres! Skip it.
          this.logger.debug(`Skipping duplicate event ID (Postgres backstop match): ${eventId}`);
          await this.redisProducer.xack(this.streamKey, this.groupName, msgId);
          continue;
        }

        uniqueEvents.push({
          eventId,
          metricName,
          value: parseFloat(value),
          timestamp,
          sourceId,
        });
      } catch (err: any) {
        this.logger.error(`Database failure checking idempotency for event ${eventId}: ${err.message}`);
        throw err;
      }
    }

    if (uniqueEvents.length === 0) {
      // All messages in this batch were duplicates, acknowledge stream
      await this.redisProducer.xack(this.streamKey, this.groupName, ...messageIds);
      return;
    }

    // 3. Roll up events in memory
    const rollups = new Map<string, {
      sourceId: string;
      metricName: string;
      bucketStart: string;
      granularity: 'MINUTE' | 'HOUR';
      count: number;
      sum: number;
      min: number;
      max: number;
    }>();

    // Collect processing latencies for SSE statistics
    const latencies: number[] = [];

    for (const event of uniqueEvents) {
      const eventTime = new Date(event.timestamp).getTime();
      latencies.push(Math.max(0, Date.now() - eventTime));

      for (const granularity of ['MINUTE', 'HOUR'] as const) {
        const bucketStart = this.calculateBucketStart(event.timestamp, granularity).toISOString();
        const key = `${event.sourceId}:${event.metricName}:${bucketStart}:${granularity}`;

        const existing = rollups.get(key);
        if (!existing) {
          rollups.set(key, {
            sourceId: event.sourceId,
            metricName: event.metricName,
            bucketStart,
            granularity,
            count: 1,
            sum: event.value,
            min: event.value,
            max: event.value,
          });
        } else {
          existing.count += 1;
          existing.sum += event.value;
          existing.min = Math.min(existing.min, event.value);
          existing.max = Math.max(existing.max, event.value);
        }
      }
    }

    // 4. Flush aggregated rollups in a single transaction using SQL ON CONFLICT DO UPDATE
    try {
      const txs = Array.from(rollups.values()).map((rollup) => {
        const id = crypto.randomUUID();
        const bucketStart = new Date(rollup.bucketStart);

        return prisma.$executeRaw`
          INSERT INTO "analytics"."MetricRollup" ("id", "sourceId", "metricName", "bucketStart", "granularity", "count", "sum", "min", "max")
          VALUES (${id}, ${rollup.sourceId}, ${rollup.metricName}, ${bucketStart}, ${rollup.granularity}::"analytics"."MetricGranularity", ${rollup.count}, ${rollup.sum}, ${rollup.min}, ${rollup.max})
          ON CONFLICT ("sourceId", "metricName", "bucketStart", "granularity") DO UPDATE
          SET
            "count" = "MetricRollup"."count" + EXCLUDED."count",
            "sum" = "MetricRollup"."sum" + EXCLUDED."sum",
            "min" = LEAST("MetricRollup"."min", EXCLUDED."min"),
            "max" = GREATEST("MetricRollup"."max", EXCLUDED."max")
        `;
      });

      this.logger.log(`Flushing ${txs.length} aggregates in transaction to Postgres...`);
      await prisma.$transaction(txs);

      // 5. XACK entries ONLY after successful database write (PEL boundary)
      this.logger.log(`Acknowledging ${messageIds.length} messages in Redis stream...`);
      await this.redisProducer.xack(this.streamKey, this.groupName, ...messageIds);

      // Calculate latency percentiles for SSE broadcasting
      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
      const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
      const totalEventsCount = await prisma.processedEvent.count();

      // Emit live metrics to subject
      this.liveMetrics$.next({
        eventsPerSec: uniqueEvents.length / 5.0, // Average rate over consumer block window (5s)
        totalEvents: totalEventsCount,
        p50Latency: p50,
        p95Latency: p95,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      this.logger.error(`Failed to flush aggregated rollups transaction: ${err.message}`, err.stack);
      throw err;
    }
  }

  private calculateBucketStart(timestampStr: string, granularity: 'MINUTE' | 'HOUR'): Date {
    const date = new Date(timestampStr);
    if (granularity === 'MINUTE') {
      date.setUTCSeconds(0, 0);
    } else {
      date.setUTCMinutes(0, 0, 0);
    }
    return date;
  }
}
