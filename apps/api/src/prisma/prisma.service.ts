import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('SupabasePostgres');

  async onModuleInit() {
    try {
      if (process.env.DATABASE_URL) {
        await this.$connect();
        const start = Date.now();
        await this.$queryRaw`SELECT 1`;
        const latency = Date.now() - start;
        this.logger.log(`✅ [Supabase DB] Connected to Supabase PostgreSQL pooler successfully. (Ping: ${latency}ms)`);
      } else {
        this.logger.warn('⚠️ [Supabase DB] DATABASE_URL is not configured.');
      }
    } catch (error) {
      this.logger.error(`❌ [Supabase DB] Connection failure: ${(error as Error).message}`);
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
      const latencyMs = Date.now() - start;
      this.logger.log(`[Supabase DB Healthcheck] Ping ok (${latencyMs}ms)`);
      return {
        status: 'connected' as const,
        message: 'Connected to Supabase PostgreSQL',
        timestamp: new Date().toISOString(),
        latencyMs,
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
