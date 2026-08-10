import { Module, Global } from '@nestjs/common';
import { OrgContext } from './org-context';
import { OrgGuard } from './org.guard';
import { RoleGuard } from './role.guard';
import { AuthGuard } from './auth.guard';
import { ApiKeyGuard } from './api-key.guard';
import { TriageModule } from '../modules/triage/triage.module';

@Global()
@Module({
  imports: [TriageModule],
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
