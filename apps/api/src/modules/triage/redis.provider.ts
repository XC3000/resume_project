import { Logger, Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CONNECTION = 'REDIS_CONNECTION';

export const RedisConnectionProvider: Provider = {
  provide: REDIS_CONNECTION,
  useFactory: () => {
    const logger = new Logger('RedisProvider');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const isTls = redisUrl.startsWith('rediss://');

    // BullMQ requires maxRetriesPerRequest to be null
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    });

    client.on('error', (err) => {
      logger.error(`Redis connection error: ${err.message}`);
    });

    return client;
  },
};
