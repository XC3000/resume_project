import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      if (process.env.DATABASE_URL) {
        await this.$connect();
        this.logger.log('Successfully connected to Supabase PostgreSQL via Prisma.');
      } else {
        this.logger.warn('DATABASE_URL is not set. Skipping Prisma connection on init.');
      }
    } catch (error) {
      this.logger.error(`Prisma connection error: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async checkHealth() {
    if (!process.env.DATABASE_URL) {
      return {
        status: 'unconfigured' as const,
        message: 'DATABASE_URL environment variable is missing',
        timestamp: new Date().toISOString(),
      };
    }

    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        status: 'connected' as const,
        message: 'Connected to Supabase PostgreSQL',
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'error' as const,
        message: `Database ping failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
