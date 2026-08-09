import { Inject, Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CONNECTION } from './redis.provider';
import { TriageService } from './triage.service';
import { prisma } from '@platform/db';
import StreamZip from 'node-stream-zip';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import * as crypto from 'crypto';
import { normaliseLog } from './normaliser';
import { IEmbeddingService } from './embedding.service';
import { ClassifierService } from './classifier.service';

@Injectable()
export class TriageProcessor implements OnModuleInit, OnModuleDestroy {
  private worker!: Worker;
  private readonly logger = new Logger(TriageProcessor.name);

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redisConnection: Redis,
    private readonly triageService: TriageService,
    @Inject('IEmbeddingService') private readonly embeddingService: IEmbeddingService,
    private readonly classifierService: ClassifierService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      'triage-logs',
      async (job: Job) => {
        await this.processJob(job);
      },
      {
        connection: this.redisConnection,
      },
    );

    this.worker.on('error', (err) => {
      this.logger.error(`BullMQ worker error: ${err.message}`);
    });

    this.worker.on('failed', async (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`, err.stack);
      
      const maxAttempts = job?.opts?.attempts ?? 3;
      if (job && job.attemptsMade >= maxAttempts) {
        this.logger.warn(`Job ${job.id} failed permanently after ${job.attemptsMade} attempts. Moving to DLQ.`);
        try {
          await this.triageService.dlqQueue.add('dead-letter', {
            originalJobId: job.id,
            originalData: job.data,
            error: err.message,
            stack: err.stack,
            failedAt: new Date().toISOString(),
          });
        } catch (dlqErr: any) {
          this.logger.error(`Failed to move job ${job.id} to DLQ: ${dlqErr.message}`);
        }
      }
    });

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed successfully`);
    });
  }

  async OnModuleDestroy() {
    await this.worker.close();
  }

  // Fallback for OnModuleDestroy lifecycle hook if capital 'O' is registered or lowercase
  async onModuleDestroy() {
    await this.worker.close();
  }

  private async processJob(job: Job) {
    const { runId, owner, repo } = job.data;
    this.logger.log(`Processing log download for Run ID: ${runId} (Repo: ${owner}/${repo})`);

    // 1. Map organization based on github repository owner slug
    const ownerSlug = owner.toLowerCase();
    let org = await prisma.organization.findFirst({
      where: { slug: ownerSlug },
    });

    let targetOrgId: string;
    if (!org) {
      this.logger.log(`No organization found for slug '${ownerSlug}'. Creating a default triage org.`);
      const newOrg = await prisma.organization.create({
        data: {
          id: crypto.randomUUID(),
          name: `${owner} Triage Org`,
          slug: ownerSlug,
          kind: 'PERSONAL',
          plan: 'FREE',
          createdAt: new Date(),
        },
      });
      org = newOrg;
    }
    targetOrgId = org.id;

    // Map project based on repository slug
    const projectSlug = repo.toLowerCase();
    let project = await prisma.project.findFirst({
      where: {
        organizationId: targetOrgId,
        slug: projectSlug,
      },
    });

    if (!project) {
      this.logger.log(`No project found for slug '${projectSlug}'. Creating a default project.`);
      project = await prisma.project.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: targetOrgId,
          name: repo,
          slug: projectSlug,
          repoFullName: `${owner}/${repo}`,
          webhookSecret: crypto.randomBytes(32).toString('hex'),
          createdAt: new Date(),
        },
      });
    }

    // 2. Determine GitHub OAuth Token (check org metadata or fall back to GITHUB_OAUTH_TOKEN env)
    let token = process.env.GITHUB_OAUTH_TOKEN;
    if (org.metadata) {
      try {
        const parsedMeta = JSON.parse(org.metadata);
        if (parsedMeta.githubToken) {
          token = parsedMeta.githubToken;
          this.logger.log('Using organization OAuth token from metadata');
        }
      } catch (e) {
        this.logger.warn('Failed to parse organization metadata JSON');
      }
    }

    // 3. Download the workflow run logs ZIP archive via GitHub API
    const logsApiUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/logs`;
    this.logger.log(`Requesting logs redirect from: ${logsApiUrl}`);

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(logsApiUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch logs from GitHub API: HTTP ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Empty response body received from GitHub actions log download endpoint');
    }

    // 4. Stream response ZIP to temporary file
    const tempZipPath = path.join(os.tmpdir(), `run-${runId}-${crypto.randomBytes(4).toString('hex')}.zip`);
    const writeStream = fs.createWriteStream(tempZipPath);

    try {
      const nodeReadable = Readable.fromWeb(response.body as any);
      nodeReadable.pipe(writeStream);
      await finished(writeStream);
      this.logger.log(`Logs ZIP downloaded successfully to: ${tempZipPath}`);

      // 5. Open ZIP and stream extract contents capping total log volume at 2 MB
      const zip = new StreamZip.async({ file: tempZipPath });
      const entries = await zip.entries();
      
      const sortedTextEntries = Object.values(entries)
        .filter((entry) => !entry.isDirectory && entry.name.endsWith('.txt'))
        .sort((a, b) => a.name.localeCompare(b.name));

      const MAX_LOG_SIZE = 2 * 1024 * 1024; // 2 MB
      let totalExtractedBytes = 0;
      let truncated = false;
      let accumulatedContent = '';

      for (const entry of sortedTextEntries) {
        if (truncated) break;

        const dataBuffer = await zip.entryData(entry);
        let fileText = dataBuffer.toString('utf8');
        const fileBytes = Buffer.byteLength(fileText, 'utf8');

        if (totalExtractedBytes + fileBytes > MAX_LOG_SIZE) {
          const allowedBytes = MAX_LOG_SIZE - totalExtractedBytes;
          fileText = fileText.slice(0, allowedBytes) + '\n\n[LOGS TRUNCATED - EXCEEDED 2MB LIMIT]\n';
          truncated = true;
        }

        accumulatedContent += fileText;
        totalExtractedBytes += Buffer.byteLength(fileText, 'utf8');
      }
      
      await zip.close();

      if (accumulatedContent.length === 0) {
        this.logger.warn('Reassembled log text content is empty. No failure log chunks to write.');
        return;
      }

      // 6. Split logs into LogChunk rows with accurate byte offsets (e.g. 100 KB chunks)
      const CHUNK_SIZE = 100 * 1024; // 100 KB chunks
      const logChunksData: {
        content: string;
        startOffset: number;
        endOffset: number;
        sequence: number;
      }[] = [];

      let startOffset = 0;
      let sequence = 0;

      while (startOffset < accumulatedContent.length) {
        const contentChunk = accumulatedContent.slice(startOffset, startOffset + CHUNK_SIZE);
        const chunkBytes = Buffer.byteLength(contentChunk, 'utf8');
        const endOffset = startOffset + chunkBytes;

        logChunksData.push({
          content: contentChunk,
          startOffset,
          endOffset,
          sequence,
        });

        startOffset = endOffset;
        sequence++;
      }

      // 7. Save the Incident and ContextChunks inside a single database transaction
      this.logger.log(`Saving Incident and ${logChunksData.length} ContextChunks to the database...`);
      const incident = await prisma.incident.create({
        data: {
          organizationId: targetOrgId,
          projectId: project.id,
          source: 'GITHUB_CI',
          externalId: runId.toString(),
          title: `Workflow run failure on ${owner}/${repo} (Run #${runId})`,
          status: 'OPEN',
          severity: 'HIGH',
          contextChunks: {
            create: logChunksData.map((chunk) => ({
              organizationId: targetOrgId,
              content: chunk.content,
              startOffset: chunk.startOffset,
              endOffset: chunk.endOffset,
              sequence: chunk.sequence,
            })),
          },
        },
        include: {
          contextChunks: {
            orderBy: { sequence: 'asc' },
          },
        },
      });

      const dbLogChunks = incident.contextChunks;

      // 8. Generate stable failure signature and embedding
      const normalisedSignature = normaliseLog(accumulatedContent);
      this.logger.log('Generating embedding for failure signature...');
      let embedding: number[];
      try {
        embedding = await this.embeddingService.embedText(normalisedSignature);
      } catch (err: any) {
        this.logger.error(`Failed to generate embedding: ${err.message}. Skipping classification.`);
        return;
      }

      const sigId = crypto.randomUUID();
      this.logger.log('Inserting FailureSignature vector...');
      await this.triageService.createFailureSignature(
        sigId,
        targetOrgId,
        project.id,
        incident.id,
        normalisedSignature,
        embedding
      );

      // 9. Similarity Search: Fetch top 5 similar historical incidents
      this.logger.log('Executing similarity search for historical incidents...');
      const similarSignatures = await this.triageService.findSimilarFailureSignatures(targetOrgId, embedding);
      
      const similarIncidents = [];
      for (const sig of similarSignatures) {
        if (sig.incidentId === incident.id) continue;

        const histIncident = await prisma.incident.findUnique({
          where: { id: sig.incidentId },
          include: {
            contextChunks: {
              orderBy: { sequence: 'asc' },
            },
          },
        });
        if (histIncident) {
          similarIncidents.push(histIncident);
        }
      }

      // 10. Check Quota & Call Classifier
      this.logger.log('Verifying LLM token quota...');
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const usage = await prisma.llmUsage.findUnique({
        where: {
          organizationId_day: {
            organizationId: targetOrgId,
            day: today,
          },
        },
      });

      const cap = parseInt(process.env.DAILY_TOKEN_CAP || '500000', 10);
      const currentTokens = usage ? (usage.tokensIn + usage.tokensOut) : 0;

      if (currentTokens >= cap) {
        this.logger.warn(`Daily LLM token cap exceeded for org ${targetOrgId}. Setting status to PENDING_QUOTA.`);
        await prisma.incident.update({
          where: { id: incident.id },
          data: { status: 'PENDING_QUOTA' },
        });
        return;
      }

      this.logger.log('Calling incident classification LLM...');
      const classifierData = await this.classifierService.classifyIncident(
        dbLogChunks.map((c: { id: string; content: string; sequence: number }) => ({ id: c.id, content: c.content, sequence: c.sequence })),
        similarIncidents.map((i) => ({
          id: i.id,
          classification: i.classification,
          severity: i.severity,
          rootCauseHint: i.rootCauseHint,
          suggestedFix: i.suggestedFix,
          logChunks: i.contextChunks.map((c: { content: string }) => ({ content: c.content })),
        }))
      );

      if (!classifierData) {
        // Fallback: mark incident as TRIAGED with null values on validation failure
        this.logger.warn(`LLM classification failed validation. Falling back to null classification for incident: ${incident.id}`);
        await prisma.incident.update({
          where: { id: incident.id },
          data: {
            status: 'TRIAGED',
            classification: null,
            suggestedFix: null,
            rootCauseHint: null,
          },
        });
        return;
      }

      const { tokensIn, tokensOut, result } = classifierData;
      this.logger.log(`Classification returned. Tokens used: ${tokensIn} In, ${tokensOut} Out. Persisting result...`);

      // Atomically update LLM usage, Incident classification, and justifying LogChunks
      await prisma.$transaction([
        prisma.llmUsage.upsert({
          where: {
            organizationId_day: {
              organizationId: targetOrgId,
              day: today,
            },
          },
          create: {
            id: crypto.randomUUID(),
            organizationId: targetOrgId,
            day: today,
            tokensIn,
            tokensOut,
            callCount: 1,
          },
          update: {
            tokensIn: { increment: tokensIn },
            tokensOut: { increment: tokensOut },
            callCount: { increment: 1 },
          },
        }),
        prisma.incident.update({
          where: { id: incident.id },
          data: {
            status: 'TRIAGED',
            classification: result.category,
            suggestedFix: result.suggestedFix,
            rootCauseHint: result.rootCauseHint,
            severity: result.severity,
          },
        }),
        prisma.contextChunk.updateMany({
          where: {
            incidentId: incident.id,
            id: { in: result.justifyingLogChunkIds },
          },
          data: {
            justifies: true,
          },
        }),
      ]);

      this.logger.log(`Incident classification successfully persisted for: ${incident.id}`);
    } finally {
      // 11. Always delete the temporary ZIP archive
      try {
        if (fs.existsSync(tempZipPath)) {
          fs.unlinkSync(tempZipPath);
          this.logger.log(`Cleaned up temporary ZIP archive: ${tempZipPath}`);
        }
      } catch (err: any) {
        this.logger.error(`Failed to clean up temporary ZIP file: ${err.message}`);
      }
    }
  }
}
