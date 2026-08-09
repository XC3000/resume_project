import { Controller, Post, Get, Req, Res, UseGuards, Query, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { OrgGuard } from '../../auth/org.guard';
import { RoleGuard } from '../../auth/role.guard';
import { RequireRole, Role } from '../../auth/require-role.decorator';
import { OrgContext } from '../../auth/org-context';
import { GithubService } from './github.service';

@Controller('github')
export class GithubController {
  constructor(
    private readonly githubService: GithubService,
    private readonly orgContext: OrgContext,
  ) {}

  @Get('setup')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  async setupCallback(
    @Query('installation_id') installationId: string,
    @Query('setup_action') setupAction: string,
  ) {
    if (!installationId) {
      throw new BadRequestException('Missing installation_id parameter.');
    }
    const orgId = this.orgContext.getOrgId();
    return this.githubService.bindInstallation(orgId, installationId, setupAction);
  }

  @Get('repos')
  @UseGuards(AuthGuard, OrgGuard)
  async listRepos() {
    const orgId = this.orgContext.getOrgId();
    return this.githubService.listRepositoriesByOrg(orgId);
  }

  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const rawBody = req.body;
    const signatureHeader = req.headers['x-hub-signature-256'] as string;
    
    await this.githubService.processWebhook(rawBody, signatureHeader);
    
    return res.status(HttpStatus.OK).json({ processed: true });
  }
}
