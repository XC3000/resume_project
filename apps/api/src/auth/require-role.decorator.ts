import { SetMetadata } from '@nestjs/common';

export enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export const REQUIRE_ROLE_KEY = 'require_role';
export const RequireRole = (role: Role) => SetMetadata(REQUIRE_ROLE_KEY, role);
