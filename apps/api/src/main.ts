import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, raw, Request, Response, NextFunction } from 'express';
import { auth } from '@platform/auth';
import { toNodeHandler } from 'better-auth/node';

// In-memory rate limiting map for public endpoints
const ipLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Apply rate limiting to all public endpoints: /health and /triage/webhooks/github
  const isPublicRoute = req.path === '/health' || req.path === '/triage/webhooks/github';
  if (!isPublicRoute) {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const limitInfo = ipLimits.get(ip);

  if (!limitInfo || now > limitInfo.resetAt) {
    ipLimits.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return next();
  }

  if (limitInfo.count >= RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
    return;
  }

  limitInfo.count++;
  next();
}

async function bootstrap() {
  // Create NestJS app with default Nest body parsers disabled.
  // This is required because Better Auth requires the raw request body stream
  // to parse and verify signatures/payloads (e.g. signup flow, webhooks).
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // WARNING: MIDDLEWARE ORDER IS CRITICAL. DO NOT CHANGE THIS ORDER.
  //
  // 1. Mount public route rate limiter first.
  app.use(rateLimiter);

  // 2. Mount the Better Auth node handler at '/api/auth' FIRST, before any body-parsing middleware.
  //    Better Auth needs the raw request body stream. If express.json() is applied first,
  //    it consumes the request stream, which silently breaks Better Auth signup.
  //
  // 3. Exclude '/triage/webhooks/github' from the global JSON body parser. Instead, parse it as a
  //    raw buffer via express.raw({ type: '*/*' }) to keep the raw payload intact for timing-safe
  //    HMAC signature verification.
  //
  // 4. Apply express.json() middleware for all other routes after mounting Better Auth.
  app.use('/api/auth', toNodeHandler(auth));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/triage/webhooks/github') {
      raw({ type: '*/*' })(req, res, next);
    } else {
      json()(req, res, next);
    }
  });

  // Enable CORS with credentials allowed and origins read from env
  app.enableCors({
    origin: [
      process.env.TRIAGE_WEB_URL,
      process.env.ANALYTICS_WEB_URL,
    ].filter((origin): origin is string => !!origin),
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
