import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CONNECTION = 'REDIS_CONNECTION';

export const RedisConnectionProvider: Provider = {
  provide: REDIS_CONNECTION,
  useFactory: () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const isTls = redisUrl.startsWith('rediss://');

    // BullMQ requires maxRetriesPerRequest to be null
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    });
  },
};
