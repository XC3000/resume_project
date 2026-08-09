import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { OrgGuard } from '../../auth/org.guard';
import { RoleGuard } from '../../auth/role.guard';
import { RequireRole, Role } from '../../auth/require-role.decorator';
import { OrgContext } from '../../auth/org-context';
import { OrgsService } from './orgs.service';
import { CreateOrgDto, UpdateOrgSettingsDto, CreateApiKeyDto, InviteMemberDto, AcceptInviteDto, TransferOwnershipDto } from './orgs.dto';
import { scopedClient } from '@platform/db';

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

  @Post('invitations')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  async inviteMember(@Req() req: any, @Body() dto: InviteMemberDto) {
    const activeOrgId = this.orgContext.getOrgId();
    return this.orgsService.inviteMember(activeOrgId, req.user.id, dto.email, dto.role);
  }

  @Get('invitations')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  async listInvitations() {
    const activeOrgId = this.orgContext.getOrgId();
    return this.orgsService.listInvitations(activeOrgId);
  }

  @Post('invitations/:id/revoke')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  async revokeInvitation(@Param('id') id: string) {
    const activeOrgId = this.orgContext.getOrgId();
    return this.orgsService.revokeInvitation(activeOrgId, id);
  }

  @Post('invitations/accept')
  @UseGuards(AuthGuard)
  async acceptInvitation(@Req() req: any, @Body() dto: AcceptInviteDto) {
    return this.orgsService.acceptInvitation(req.user.id, req.user.email, dto.token, dto.confirm);
  }

  @Get('members')
  @UseGuards(AuthGuard, OrgGuard)
  async listMembers() {
    const activeOrgId = this.orgContext.getOrgId();
    return this.orgsService.listMembers(activeOrgId);
  }

  @Patch('members/:memberId')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  async updateMemberRole(@Param('memberId') memberId: string, @Body('role') role: string) {
    const activeOrgId = this.orgContext.getOrgId();
    const callerRole = this.orgContext.getRole();
    return this.orgsService.updateMemberRole(activeOrgId, callerRole, memberId, role);
  }

  @Delete('members/:memberId')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  async removeMember(@Param('memberId') memberId: string) {
    const activeOrgId = this.orgContext.getOrgId();
    const callerRole = this.orgContext.getRole();
    return this.orgsService.removeMember(activeOrgId, callerRole, memberId);
  }

  @Post('leave')
  @UseGuards(AuthGuard, OrgGuard)
  async leaveOrg(@Req() req: any) {
    const activeOrgId = this.orgContext.getOrgId();
    return this.orgsService.leaveOrg(activeOrgId, req.user.id);
  }

  @Post('transfer-ownership')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.OWNER)
  async transferOwnership(@Req() req: any, @Body() dto: TransferOwnershipDto) {
    const activeOrgId = this.orgContext.getOrgId();
    return this.orgsService.transferOwnership(activeOrgId, req.user.id, dto.targetMemberId, dto.confirm);
  }

  @Get('usage')
  @UseGuards(AuthGuard, OrgGuard)
  async getLlmUsage() {
    const activeOrgId = this.orgContext.getOrgId();
    const db = scopedClient(activeOrgId);
    return db.llmUsage.findMany({
      orderBy: { day: 'desc' },
      take: 30,
    });
  }
}
