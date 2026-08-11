import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { existsSync } from 'fs';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';

function getWebDistPath(): string {
  if (process.env.WEB_DIST_PATH && existsSync(process.env.WEB_DIST_PATH)) {
    return process.env.WEB_DIST_PATH;
  }
  // Try relative from apps/api directory (e.g. ../web/dist)
  const relativeFromApp = join(process.cwd(), '../web/dist');
  if (existsSync(relativeFromApp)) {
    return relativeFromApp;
  }
  // Try relative from root directory (e.g. apps/web/dist)
  const relativeFromRoot = join(process.cwd(), 'apps/web/dist');
  if (existsSync(relativeFromRoot)) {
    return relativeFromRoot;
  }
  // Fallback relative to __dirname (dist/src -> ../../../web/dist)
  return join(__dirname, '../../..', 'web', 'dist');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: getWebDistPath(),
      exclude: ['/api/(.*)'],
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
