import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HealthCheckResponse, CacheTestResponse } from '@repo/types';

@Controller('api')
export class HealthController {
  private startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  async getHealth(): Promise<HealthCheckResponse> {
    const dbStatus = await this.prisma.checkHealth();
    const redisStatus = await this.redis.checkHealth();

    return {
      server: {
        status: 'ok',
        uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
        environment: process.env.NODE_ENV || 'development',
      },
      supabaseDatabase: dbStatus,
      upstashRedis: redisStatus,
    };
  }

  @Get('cache-test')
  async testCache(@Query('key') key = 'sample-key', @Query('val') val = 'Hello from Turborepo!'): Promise<CacheTestResponse> {
    const cacheKey = `test:${key}`;
    await this.redis.set(cacheKey, val, 120);
    const retrieved = await this.redis.get(cacheKey);

    const isRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

    return {
      key: cacheKey,
      value: retrieved || val,
      source: isRedis ? 'upstash-redis' : 'memory-fallback',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('users')
  async getUsers() {
    if (!process.env.DATABASE_URL) {
      return {
        source: 'demo-data',
        message: 'Configure DATABASE_URL to connect to Supabase PostgreSQL',
        users: [
          { id: '1', name: 'Demo Admin', email: 'admin@example.com', createdAt: new Date().toISOString() },
          { id: '2', name: 'Demo User', email: 'user@example.com', createdAt: new Date().toISOString() },
        ],
      };
    }

    try {
      const users = await this.prisma.user.findMany({ take: 10 });
      return {
        source: 'supabase-postgresql',
        users,
      };
    } catch (err) {
      return {
        source: 'supabase-error',
        error: (err as Error).message,
        users: [],
      };
    }
  }
}
