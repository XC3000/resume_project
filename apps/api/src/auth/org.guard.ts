import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { unsafeUnscopedClient } from '@platform/db';
import { OrgContext } from './org-context';

@Injectable()
export class OrgGuard implements CanActivate {
  constructor(private readonly orgContext: OrgContext) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Resolve activeOrganizationId from session or API key
    // Never from headers, body, or parameters!
    const sessionOrgId = request.session?.activeOrganizationId;
    const apiKeyOrgId = request.apiKey?.referenceId || request.apiKey?.apiKey?.referenceId;

    const activeOrgId = sessionOrgId || apiKeyOrgId;

    if (!activeOrgId) {
      throw new ForbiddenException('Security violation: No active organization context found.');
    }

    if (request.apiKey) {
      // Authenticated via API key: it belongs directly to the Organization.
      // Set role as admin by default for organizational keys.
      this.orgContext.setOrg(activeOrgId, 'admin');
      return true;
    }

    if (request.user) {
      // Authenticated via user session: we must verify membership
      const member = await unsafeUnscopedClient.member.findFirst({
        where: {
          organizationId: activeOrgId,
          userId: request.user.id,
        },
      });

      if (!member) {
        throw new ForbiddenException('Security violation: User is not a member of this organization.');
      }

      this.orgContext.setOrg(activeOrgId, member.role);
      return true;
    }

    throw new ForbiddenException('Security violation: Request is unauthenticated.');
  }
}
