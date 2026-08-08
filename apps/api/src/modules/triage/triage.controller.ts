import { Controller, Post, Req, Res, UnauthorizedException, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { TriageService } from './triage.service';

@Controller('triage')
export class TriageController {
  private readonly logger = new Logger(TriageController.name);

  constructor(private readonly triageService: TriageService) {}

  @Post('webhooks/github')
  @HttpCode(HttpStatus.OK)
  async handleGithubWebhook(@Req() req: Request, @Res() res: Response) {
    const signatureHeader = req.headers['x-hub-signature-256'];
    if (!signatureHeader || typeof signatureHeader !== 'string') {
      this.logger.warn('Webhook request missing x-hub-signature-256 header');
      throw new UnauthorizedException('Missing signature header');
    }

    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('GITHUB_WEBHOOK_SECRET is not configured in the environment');
      throw new UnauthorizedException('Webhook verification misconfigured');
    }

    // Verify HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', secret);
    
    // req.body is a Buffer containing the raw request body
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      this.logger.error('Webhook body is not parsed as raw Buffer. Check middleware order in main.ts.');
      throw new UnauthorizedException('Invalid request body parsing');
    }

    hmac.update(rawBody);
    const computedSignature = 'sha256=' + hmac.digest('hex');

    // timingSafeEqual requires buffers to have equal length
    const computedBuffer = Buffer.from(computedSignature);
    const receivedBuffer = Buffer.from(signatureHeader);

    if (
      computedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(computedBuffer, receivedBuffer)
    ) {
      this.logger.warn('Timing safe signature comparison failed');
      throw new UnauthorizedException('Invalid signature matching');
    }

    // Parse payload from raw buffer
    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      this.logger.error('Failed to parse webhook body JSON payload');
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Malformed JSON payload' });
    }

    const { action, workflow_run, repository } = payload;

    // Check if the event is a completed workflow run with a failure conclusion
    if (
      action === 'completed' &&
      workflow_run &&
      workflow_run.conclusion === 'failure'
    ) {
      const runId = workflow_run.id;
      const owner = repository?.owner?.login;
      const repo = repository?.name;

      if (!runId || !owner || !repo) {
        this.logger.warn('Payload missing runId, owner or repo fields');
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing run data' });
      }

      this.logger.log(`Enqueuing log download job for run: ${owner}/${repo}#${runId}`);
      await this.triageService.enqueueWebhookJob({ runId, owner, repo });

      return res.status(HttpStatus.OK).json({ queued: true, runId });
    }

    return res.status(HttpStatus.OK).json({ processed: false, reason: 'Event is not a workflow run failure' });
  }
}
