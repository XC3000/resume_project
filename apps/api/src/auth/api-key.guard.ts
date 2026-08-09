import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { unsafeUnscopedClient } from '@platform/db';
import { OrgContext } from './org-context';
import { REQUIRE_SCOPES_KEY } from './require-scopes.decorator';

export const REDIS_CONNECTION = 'REDIS_CONNECTION';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: Redis,
    private readonly orgContext: OrgContext,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Extract API Key from headers (check x-api-key or Authorization Bearer)
    const authHeader = request.headers['authorization'];
    const apiKeyHeader = request.headers['x-api-key'];
    let rawKey = '';
    let isApiKeyRequest = false;

    if (apiKeyHeader !== undefined) {
      isApiKeyRequest = true;
      if (typeof apiKeyHeader === 'string') {
        rawKey = apiKeyHeader;
      }
    } else if (typeof authHeader === 'string' && authHeader.startsWith('Bearer itg_')) {
      isApiKeyRequest = true;
      rawKey = authHeader.slice(7);
    }

    // If no API key headers are present, pass through to let Session Authentication handle it
    if (!isApiKeyRequest) {
      return true;
    }

    // 2. Validate format
    if (!rawKey.startsWith('itg_')) {
      throw new UnauthorizedException('Invalid API key format.');
    }

    // 3. Look up by prefix (first 12 characters)
    const prefix = rawKey.slice(0, 12);
    const keyRecord = await unsafeUnscopedClient.apiKey.findFirst({
      where: {
        prefix,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (!keyRecord) {
      throw new UnauthorizedException('Invalid API Key.');
    }

    // 4. Verify timing-safe hash
    const computedHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const isMatch = crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(keyRecord.hash));
    if (!isMatch) {
      throw new UnauthorizedException('Invalid API Key.');
    }

    // 5. Rate limit per key: 100 requests per minute
    const rateLimitKey = `ratelimit:apikey:${keyRecord.id}:${Math.floor(Date.now() / 60000)}`;
    const current = await this.redis.incr(rateLimitKey);
    if (current === 1) {
      await this.redis.expire(rateLimitKey, 60);
    }
    if (current > 100) {
      throw new HttpException('Too Many Requests: API rate limit exceeded.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // 6. Update lastUsedAt at most once per minute
    const oneMinuteAgo = new Date(Date.now() - 60000);
    if (!keyRecord.lastUsedAt || keyRecord.lastUsedAt < oneMinuteAgo) {
      unsafeUnscopedClient.apiKey.update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() }
      }).catch(() => {});
    }

    // 7. Check scopes if route is annotated
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(REQUIRE_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredScopes && requiredScopes.length > 0) {
      const hasScope = requiredScopes.every(scope => keyRecord.scopes.includes(scope));
      if (!hasScope) {
        throw new ForbiddenException('Insufficient API key permissions.');
      }
    }

    // 8. Attach key details to request and set OrgContext
    request.apiKey = keyRecord;
    this.orgContext.setOrg(keyRecord.organizationId, 'admin');

    return true;
  }
}
