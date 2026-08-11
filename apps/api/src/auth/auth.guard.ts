import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

const COOKIE_NAME = 'triage_ai_session';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required. Missing session cookie.');
    }

    const user = await this.authService.getSession(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session in Upstash Redis.');
    }

    // Attach authenticated user to request
    request.user = user;
    request.sessionToken = token;
    return true;
  }

  private extractToken(request: any): string | null {
    // 1. Check req.cookies
    if (request.cookies && request.cookies[COOKIE_NAME]) {
      return request.cookies[COOKIE_NAME];
    }

    // 2. Check Authorization Bearer header
    const authHeader = request.headers?.authorization;
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7).trim();
      }
      return authHeader.trim();
    }

    // 3. Fallback raw Cookie header parsing
    const rawCookie = request.headers?.cookie;
    if (rawCookie) {
      const match = rawCookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }

    return null;
  }
}
