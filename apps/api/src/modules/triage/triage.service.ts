import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CONNECTION } from './redis.provider';
import { scopedClient } from '@platform/db';

@Injectable()
export class TriageService implements OnModuleDestroy {
  public readonly triageQueue: Queue;
  public readonly dlqQueue: Queue;

  private readonly logger = new Logger(TriageService.name);

  constructor(@Inject(REDIS_CONNECTION) private readonly redisConnection: Redis) {
    this.triageQueue = new Queue('triage-logs', {
      connection: this.redisConnection,
    });
    this.dlqQueue = new Queue('triage-dlq', {
      connection: this.redisConnection,
    });

    this.triageQueue.on('error', (err) => {
      this.logger.error(`Triage Queue error: ${err.message}`);
    });
    this.dlqQueue.on('error', (err) => {
      this.logger.error(`DLQ Queue error: ${err.message}`);
    });
  }

  async enqueueWebhookJob(data: { runId: number; owner: string; repo: string }) {
    // Retry policy: 3 attempts, exponential backoff (starting at 1s delay)
    await this.triageQueue.add('process-logs', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  /**
   * Inserts a failure signature with an embedding vector using parameterized raw SQL.
   * Prevents SQL injection and properly casts the vector to halfvec.
   */
  async createFailureSignature(
    id: string,
    organizationId: string,
    projectId: string,
    incidentId: string,
    normalisedText: string,
    embedding: number[]
  ): Promise<void> {
    const embeddingString = `[${embedding.join(',')}]`;
    const createdAt = new Date();

    const db = scopedClient(organizationId);
    await db.$executeRaw`
      INSERT INTO "triage"."failure_signature" ("id", "organizationId", "projectId", "incidentId", "normalisedText", "embedding", "createdAt")
      VALUES (${id}, ${organizationId}, ${projectId}, ${incidentId}, ${normalisedText}, ${embeddingString}::halfvec, ${createdAt})
    `;
  }

  /**
   * Similarity Search method:
   * Returns top 5 most similar FailureSignatures for the same organizationId
   * using pgvector cosine distance operator (<=>).
   */
  async findSimilarFailureSignatures(
    organizationId: string,
    embedding: number[]
  ): Promise<Array<{
    id: string;
    organizationId: string;
    incidentId: string;
    normalisedText: string;
    createdAt: Date;
    similarity: number;
  }>> {
    const embeddingString = `[${embedding.join(',')}]`;

    const db = scopedClient(organizationId);
    return db.$queryRaw<Array<{
      id: string;
      organizationId: string;
      incidentId: string;
      normalisedText: string;
      createdAt: Date;
      similarity: number;
    }>>`
      SELECT 
        "id", 
        "organizationId", 
        "incidentId", 
        "normalisedText", 
        "createdAt",
        (1.0 - ("embedding" <=> ${embeddingString}::halfvec))::double precision AS "similarity"
      FROM "triage"."failure_signature"
      WHERE "organizationId" = ${organizationId}
      ORDER BY "embedding" <=> ${embeddingString}::halfvec ASC
      LIMIT 5
    `;
  }

  async onModuleDestroy() {
    await this.triageQueue.close();
    await this.dlqQueue.close();
  }
}
