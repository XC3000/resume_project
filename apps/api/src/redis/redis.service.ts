import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger('UpstashRedis');
  private client: Redis | null = null;
  private memoryCache = new Map<string, string>();

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      try {
        this.client = new Redis({ url, token });
      } catch (err) {
        this.logger.error(`❌ [Upstash Redis] Failed to initialize client: ${(err as Error).message}`);
      }
    } else {
      this.logger.warn('⚠️ [Upstash Redis] REST URL or TOKEN not configured. Falling back to in-memory store.');
    }
  }

  async onModuleInit() {
    if (this.client) {
      try {
        const start = Date.now();
        await this.client.ping();
        const latency = Date.now() - start;
        this.logger.log(`✅ [Upstash Redis] Connected to Upstash REST API successfully. Endpoint: ${process.env.UPSTASH_REDIS_REST_URL} (Ping: ${latency}ms)`);
      } catch (err) {
        this.logger.error(`❌ [Upstash Redis] Ping failed: ${(err as Error).message}`);
      }
    }
  }

  async checkHealth() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      return {
        status: 'unconfigured' as const,
        message: 'UPSTASH_REDIS_REST_URL/TOKEN not configured',
        timestamp: new Date().toISOString(),
      };
    }

    if (!this.client) {
      return {
        status: 'disconnected' as const,
        message: 'Redis client unavailable',
        timestamp: new Date().toISOString(),
      };
    }

    const start = Date.now();
    try {
      await this.client.ping();
      const latencyMs = Date.now() - start;
      this.logger.log(`[Upstash Redis Healthcheck] Ping ok (${latencyMs}ms)`);
      return {
        status: 'connected' as const,
        message: 'Connected to Upstash Redis',
        timestamp: new Date().toISOString(),
        latencyMs,
      };
    } catch (error) {
      return {
        status: 'error' as const,
        message: `Upstash Redis ping failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client) {
      try {
        const val = await this.client.get<any>(key);
        this.logger.log(`[Upstash Redis GET] key="${key}" -> ${val ? 'HIT' : 'MISS'}`);
        if (val === null || val === undefined) return null;
        return typeof val === 'object' ? JSON.stringify(val) : String(val);
      } catch (err) {
        this.logger.error(`[Upstash Redis GET Error] key="${key}": ${(err as Error).message}`);
      }
    }
    return this.memoryCache.get(key) || null;
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<'OK'> {
    if (this.client) {
      try {
        await this.client.set(key, value, { ex: ttlSeconds });
        this.logger.log(`[Upstash Redis SET] key="${key}" (TTL: ${ttlSeconds}s)`);
        return 'OK';
      } catch (err) {
        this.logger.error(`[Upstash Redis SET Error] key="${key}": ${(err as Error).message}`);
      }
    }
    this.memoryCache.set(key, value);
    return 'OK';
  }
}
