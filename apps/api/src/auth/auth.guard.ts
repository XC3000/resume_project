import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '@platform/auth';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Better Auth's getSession expects headers to be converted using fromNodeHeaders
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      // In DEMO_MODE, allow unauthenticated requests by attaching mock user credentials
      if (process.env.DEMO_MODE === 'true') {
        request.user = { id: 'demo-user-id', email: 'demo@example.com', name: 'Demo User' };
        request.session = { id: 'demo-session-id', userId: 'demo-user-id', expiresAt: new Date(Date.now() + 86400000) };
        return true;
      }
      throw new UnauthorizedException('Unauthorized');
    }

    // Attach user and session to the request context
    request.user = session.user;
    request.session = session.session;
    return true;
  }
}
