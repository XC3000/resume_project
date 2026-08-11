import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HealthCheckResponse, CacheTestResponse } from '@repo/types';

@ApiTags('System Health & Operations')
@Controller('api')
export class HealthController {
  private startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @ApiOperation({ summary: 'System Health Check', description: 'Returns system uptime and connection status for Supabase PostgreSQL and Upstash Redis.' })
  @ApiResponse({ status: 200, description: 'Health check metrics' })
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

  @ApiOperation({ summary: 'Upstash Redis Cache Test', description: 'Tests GET/SET operation against Upstash Redis REST cluster.' })
  @ApiQuery({ name: 'key', required: false, example: 'sample-key' })
  @ApiQuery({ name: 'val', required: false, example: 'Hello from Turborepo!' })
  @ApiResponse({ status: 200, description: 'Cache test result' })
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

  @ApiOperation({ summary: 'Supabase Users Endpoint', description: 'Queries registered user accounts from Supabase PostgreSQL.' })
  @ApiResponse({ status: 200, description: 'User database query result' })
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
