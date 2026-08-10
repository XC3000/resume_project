import * as fs from 'fs';
import * as path from 'path';

// Pre-load .env file before module initialization if environment variables are missing
(function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
})();

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

  // Enable CORS with credentials allowed and origins read from env
  app.enableCors({
    origin: [
      process.env.WEB_URL || 'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://f4e1-2409-40e0-11c4-1859-795b-a595-cc8b-bdf3.ngrok-free.app',
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cookie'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // WARNING: MIDDLEWARE ORDER IS CRITICAL. DO NOT CHANGE THIS ORDER.
  //
  // 1. Mount public route rate limiter.
  app.use(rateLimiter);

  // 2. Mount the Better Auth node handler at '/api/auth' BEFORE any body-parsing middleware.
  //    Better Auth needs the raw request body stream. If express.json() is applied first,
  //    it consumes the request stream, which silently breaks Better Auth signup.
  //
  // 3. Exclude '/triage/webhooks/github' and '/github/webhooks' from the global JSON body parser. Instead, parse them
  //    as raw buffers via express.raw({ type: '*/*' }) to keep the raw payload intact for timing-safe
  //    HMAC signature verification.
  //
  // 4. Apply express.json() middleware for all other routes after mounting Better Auth.
  app.use('/api/auth', toNodeHandler(auth));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/webhooks/') || req.path === '/triage/webhooks/github') {
      raw({ type: '*/*' })(req, res, next);
    } else {
      json()(req, res, next);
    }
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
