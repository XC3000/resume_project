import { Injectable, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memoryCache = new Map<string, string>();

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      try {
        this.client = new Redis({ url, token });
        this.logger.log('Upstash Redis client initialized.');
      } catch (err) {
        this.logger.error(`Failed to initialize Upstash Redis: ${(err as Error).message}`);
      }
    } else {
      this.logger.warn('UPSTASH_REDIS_REST_URL or TOKEN not set. Falling back to in-memory store.');
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
      return {
        status: 'connected' as const,
        message: 'Connected to Upstash Redis',
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
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
        const val = await this.client.get<string>(key);
        return val ? String(val) : null;
      } catch (err) {
        this.logger.error(`Redis get error: ${(err as Error).message}`);
      }
    }
    return this.memoryCache.get(key) || null;
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<'OK'> {
    if (this.client) {
      try {
        await this.client.set(key, value, { ex: ttlSeconds });
        return 'OK';
      } catch (err) {
        this.logger.error(`Redis set error: ${(err as Error).message}`);
      }
    }
    this.memoryCache.set(key, value);
    return 'OK';
  }
}
