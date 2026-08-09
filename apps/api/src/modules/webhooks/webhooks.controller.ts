import { Controller, Post, Req, Res, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { OrgGuard } from '../../auth/org.guard';
import { RoleGuard } from '../../auth/role.guard';
import { RequireRole, Role } from '../../auth/require-role.decorator';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('github')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleGithubWebhook(@Req() req: Request, @Res() res: Response) {
    const rawBody = req.body;
    const headers = req.headers;
    
    const outcome = await this.webhooksService.processGithubWebhook(rawBody, headers);
    return res.status(HttpStatus.ACCEPTED).json(outcome);
  }

  @Post('generic/:projectId')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleGenericWebhook(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const rawBody = req.body;
    const headers = req.headers;
    
    const outcome = await this.webhooksService.processGenericWebhook(projectId, rawBody, headers);
    return res.status(HttpStatus.ACCEPTED).json(outcome);
  }

  @Post('deliveries/:id/redeliver')
  @UseGuards(AuthGuard, OrgGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  async handleRedeliver(@Param('id') id: string) {
    return this.webhooksService.redeliverWebhook(id);
  }
}
