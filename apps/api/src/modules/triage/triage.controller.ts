import { Controller, Post, Get, Patch, Req, Res, Body, Param, UseGuards, UnauthorizedException, HttpCode, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { TriageService } from './triage.service';
import { AuthGuard } from '../../auth/auth.guard';
import { OrgGuard } from '../../auth/org.guard';
import { OrgContext } from '../../auth/org-context';
import { scopedClient } from '@platform/db';

@Controller('triage')
export class TriageController {
  private readonly logger = new Logger(TriageController.name);

  constructor(
    private readonly triageService: TriageService,
    private readonly orgContext: OrgContext,
  ) {}

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

  @Get('incidents')
  @UseGuards(AuthGuard, OrgGuard)
  async listAllIncidents() {
    const orgId = this.orgContext.getOrgId();
    const db = scopedClient(orgId);
    const incidents = await db.incident.findMany({
      orderBy: { detectedAt: 'desc' },
      include: { project: true },
    });
    return incidents.map((i) => ({
      ...i,
      project: i.project ? {
        ...i.project,
        githubRepoId: i.project.githubRepoId ? Number(i.project.githubRepoId) : null,
      } : null,
    }));
  }

  @Get('projects')
  @UseGuards(AuthGuard, OrgGuard)
  async listProjects() {
    const orgId = this.orgContext.getOrgId();
    const db = scopedClient(orgId);
    const projects = await db.project.findMany({
      where: { archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return projects.map((p) => ({
      ...p,
      githubRepoId: p.githubRepoId ? Number(p.githubRepoId) : null,
    }));
  }

  @Post('projects')
  @UseGuards(AuthGuard, OrgGuard)
  async createProject(@Body() dto: { name: string; repoFullName: string; githubRepoId?: number }) {
    const orgId = this.orgContext.getOrgId();
    const db = scopedClient(orgId);
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    
    const existing = await db.project.findFirst({
      where: { organizationId: orgId, slug },
    });
    
    if (existing) {
      return {
        ...existing,
        githubRepoId: existing.githubRepoId ? Number(existing.githubRepoId) : null,
      };
    }

    const project = await db.project.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        slug,
        repoFullName: dto.repoFullName,
        githubRepoId: dto.githubRepoId ? BigInt(dto.githubRepoId) : null,
        webhookSecret: crypto.randomBytes(20).toString('hex'),
      },
    });

    return {
      ...project,
      githubRepoId: project.githubRepoId ? Number(project.githubRepoId) : null,
    };
  }

  @Get('projects/:projectSlug/incidents')
  @UseGuards(AuthGuard, OrgGuard)
  async listIncidents(@Param('projectSlug') projectSlug: string) {
    const orgId = this.orgContext.getOrgId();
    const db = scopedClient(orgId);
    
    const project = await db.project.findFirst({
      where: { organizationId: orgId, slug: projectSlug },
    });
    
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    
    return db.incident.findMany({
      where: { projectId: project.id },
      orderBy: { detectedAt: 'desc' },
    });
  }

  @Get('incidents/:id')
  @UseGuards(AuthGuard, OrgGuard)
  async getIncidentDetails(@Param('id') id: string) {
    const orgId = this.orgContext.getOrgId();
    const db = scopedClient(orgId);
    
    const incident = await db.incident.findUnique({
      where: { id },
      include: {
        contextChunks: {
          orderBy: { sequence: 'asc' },
        },
        project: true,
      },
    });
    
    if (!incident || incident.organizationId !== orgId) {
      throw new NotFoundException('Incident not found');
    }
    
    return {
      ...incident,
      project: incident.project ? {
        ...incident.project,
        githubRepoId: incident.project.githubRepoId ? Number(incident.project.githubRepoId) : null
      } : null
    };
  }

  @Post('incidents/:id/resolve')
  @UseGuards(AuthGuard, OrgGuard)
  async resolveIncident(@Param('id') id: string) {
    const orgId = this.orgContext.getOrgId();
    const db = scopedClient(orgId);
    
    const incident = await db.incident.findUnique({
      where: { id },
    });
    
    if (!incident || incident.organizationId !== orgId) {
      throw new NotFoundException('Incident not found');
    }
    
    return db.incident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }

  @Patch('incidents/:id/analysis')
  @UseGuards(AuthGuard, OrgGuard)
  async updateIncidentAnalysis(
    @Param('id') id: string,
    @Body() dto: { rootCauseHint?: string; suggestedFix?: string }
  ) {
    const orgId = this.orgContext.getOrgId();
    const db = scopedClient(orgId);
    
    const incident = await db.incident.findUnique({
      where: { id },
    });
    
    if (!incident || incident.organizationId !== orgId) {
      throw new NotFoundException('Incident not found');
    }
    
    return db.incident.update({
      where: { id },
      data: {
        rootCauseHint: dto.rootCauseHint !== undefined ? dto.rootCauseHint : incident.rootCauseHint,
        suggestedFix: dto.suggestedFix !== undefined ? dto.suggestedFix : incident.suggestedFix,
      },
    });
  }

  @Get('incidents/:id/similar')
  @UseGuards(AuthGuard, OrgGuard)
  async getSimilarIncidents(@Param('id') id: string) {
    const orgId = this.orgContext.getOrgId();
    const db = scopedClient(orgId);
    
    const incident = await db.incident.findUnique({
      where: { id },
      include: { failureSignatures: true },
    });
    
    if (!incident || incident.organizationId !== orgId) {
      throw new NotFoundException('Incident not found');
    }
    
    const sig = incident.failureSignatures[0];
    if (!sig) {
      return [];
    }
    
    const sigWithEmbedding = await db.$queryRaw<Array<{ embedding: string }>>`
      SELECT "embedding"::text FROM "triage"."failure_signature" WHERE "id" = ${sig.id}
    `;
    
    const embStr = sigWithEmbedding[0]?.embedding;
    if (!embStr) {
      return [];
    }
    
    const embedding = embStr.replace(/[\[\]]/g, '').split(',').map(Number);
    const similarSigs = await this.triageService.findSimilarFailureSignatures(orgId, incident.projectId, embedding);
    
    const otherIncidentIds = similarSigs
      .filter((s) => s.incidentId !== id)
      .map((s) => s.incidentId);
      
    if (otherIncidentIds.length === 0) {
      return [];
    }
    
    const otherIncidents = await db.incident.findMany({
      where: { id: { in: otherIncidentIds } },
    });
    
    return similarSigs
      .filter((s) => s.incidentId !== id)
      .map((s) => {
        const inc = otherIncidents.find((i) => i.id === s.incidentId);
        if (!inc) return null;
        return {
          ...inc,
          similarity: s.similarity,
        };
      })
      .filter(Boolean);
  }
}
