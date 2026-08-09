import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { OrgGuard } from '../../auth/org.guard';
import { RoleGuard } from '../../auth/role.guard';
import { RequireRole, Role } from '../../auth/require-role.decorator';
import { OrgContext } from '../../auth/org-context';
import { OrgsService } from './orgs.service';
import { CreateOrgDto, UpdateOrgSettingsDto, CreateApiKeyDto } from './orgs.dto';

@Controller('orgs')
export class OrgsController {
  constructor(
    private readonly orgsService: OrgsService,
    private readonly orgContext: OrgContext
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  async createTeamOrg(@Req() req: any, @Body() dto: CreateOrgDto) {
    return this.orgsService.createTeamOrg(req.user.id, dto.name, dto.slug);
  }

  @Post(':id/switch')
  @UseGuards(AuthGuard)
  async switchActiveOrg(@Req() req: any, @Param('id') id: string) {
    return this.orgsService.switchActiveOrg(req.user.id, req.session.id, id);
  }

  @Patch('settings')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  async updateSettings(@Body() dto: UpdateOrgSettingsDto) {
    const activeOrgId = this.orgContext.getOrgId();
    return this.orgsService.updateSettings(activeOrgId, dto.name, dto.slug);
  }

  @Delete()
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.OWNER)
  async deleteOrg() {
    const activeOrgId = this.orgContext.getOrgId();
    return this.orgsService.deleteOrg(activeOrgId);
  }

  @Post('keys')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  async createApiKey(@Req() req: any, @Body() dto: CreateApiKeyDto) {
    const activeOrgId = this.orgContext.getOrgId();
    return this.orgsService.createApiKey(activeOrgId, req.user.id, dto.name, dto.scopes, dto.expiresAt);
  }

  @Get('keys')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  async listApiKeys() {
    const activeOrgId = this.orgContext.getOrgId();
    return this.orgsService.listApiKeys(activeOrgId);
  }

  @Post('keys/:id/revoke')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  async revokeApiKey(@Param('id') id: string) {
    const activeOrgId = this.orgContext.getOrgId();
    return this.orgsService.revokeApiKey(activeOrgId, id);
  }
}
