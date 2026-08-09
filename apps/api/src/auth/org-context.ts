import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class OrgContext {
  private organizationId?: string;
  private userRole?: string;

  setOrg(organizationId: string, role: string) {
    this.organizationId = organizationId;
    this.userRole = role;
  }

  getOrgId(): string {
    if (!this.organizationId) {
      throw new Error('OrgContext error: Organization ID is not set in this request context.');
    }
    return this.organizationId;
  }

  getRole(): string {
    if (!this.userRole) {
      throw new Error('OrgContext error: User role is not set in this request context.');
    }
    return this.userRole;
  }
}
