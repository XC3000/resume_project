import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { auth } from '@platform/auth';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      // In DEMO_MODE, bypass missing API key check and supply mock key credentials
      if (process.env.DEMO_MODE === 'true') {
        request.apiKey = { id: 'demo-api-key-id', key: 'demo-key', referenceId: 'demo-ref-id' };
        return true;
      }
      throw new UnauthorizedException('Missing or invalid API key');
    }

    try {
      // Validate the API key using Better Auth's apiKey plugin verifyApiKey method
      const result = await auth.api.verifyApiKey({
        body: {
          key: apiKey,
        },
      });

      if (!result) {
        if (process.env.DEMO_MODE === 'true') {
          request.apiKey = { id: 'demo-api-key-id', key: 'demo-key', referenceId: 'demo-ref-id' };
          return true;
        }
        throw new UnauthorizedException('Invalid API key');
      }

      // Attach API key details to request context
      request.apiKey = result;
      return true;
    } catch (error) {
      if (process.env.DEMO_MODE === 'true') {
        request.apiKey = { id: 'demo-api-key-id', key: 'demo-key', referenceId: 'demo-ref-id' };
        return true;
      }
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
