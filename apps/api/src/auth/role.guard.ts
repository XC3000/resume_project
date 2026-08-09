import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgContext } from './org-context';
import { Role, REQUIRE_ROLE_KEY } from './require-role.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly orgContext: OrgContext
  ) {}

  private readonly roleHierarchy: Record<string, number> = {
    [Role.VIEWER]: 1,
    [Role.MEMBER]: 2,
    [Role.ADMIN]: 3,
    [Role.OWNER]: 4,
  };

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.getAllAndOverride<Role>(REQUIRE_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRole) {
      return true;
    }

    const userRoleString = this.orgContext.getRole().toLowerCase();
    const userLevel = this.roleHierarchy[userRoleString as Role] || 0;
    const requiredLevel = this.roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(
        `Security violation: Insufficient permissions. Required role: ${requiredRole}, User role: ${userRoleString}`
      );
    }

    return true;
  }
}
