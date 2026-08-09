import { Module, Global } from '@nestjs/common';
import { OrgContext } from './org-context';
import { OrgGuard } from './org.guard';
import { RoleGuard } from './role.guard';
import { AuthGuard } from './auth.guard';
import { ApiKeyGuard } from './api-key.guard';

@Global()
@Module({
  providers: [
    OrgContext,
    OrgGuard,
    RoleGuard,
    AuthGuard,
    ApiKeyGuard,
  ],
  exports: [
    OrgContext,
    OrgGuard,
    RoleGuard,
    AuthGuard,
    ApiKeyGuard,
  ],
})
export class AuthModule {}
