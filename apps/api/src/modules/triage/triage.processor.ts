import { Inject, Injectable, OnModuleInit, OnModuleDestroy, Logger, forwardRef } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CONNECTION } from './redis.provider';
import { TriageService } from './triage.service';
import { scopedClient } from '@platform/db';
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
import { GithubService } from '../github/github.service';
import { PLAN_CONFIGS } from '@platform/contracts';

@Injectable()
export class TriageProcessor implements OnModuleInit, OnModuleDestroy {
  private worker!: Worker;
  private readonly logger = new Logger(TriageProcessor.name);

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redisConnection: Redis,
    private readonly triageService: TriageService,
    @Inject('IEmbeddingService') private readonly embeddingService: IEmbeddingService,
    private readonly classifierService: ClassifierService,
    @Inject(forwardRef(() => GithubService)) private readonly githubService: GithubService,
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
    const { runId, owner, repo, organizationId, projectId } = job.data;
    this.logger.log(`Processing log download for Run ID: ${runId} (Repo: ${owner}/${repo})`);

    // Use system database client for shared-schema queries
    const systemDb = scopedClient('system');

    let targetOrgId = organizationId;
    let org;

    if (!targetOrgId) {
      // Fallback: Map organization based on github repository owner slug
      const ownerSlug = owner.toLowerCase();
      org = await systemDb.organization.findFirst({
        where: { slug: ownerSlug },
      });

      if (!org) {
        this.logger.log(`No organization found for slug '${ownerSlug}'. Creating a default triage org.`);
        const newOrg = await systemDb.organization.create({
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
    } else {
      org = await systemDb.organization.findUnique({
        where: { id: targetOrgId },
      });
      if (!org) {
        throw new Error(`Organization ${targetOrgId} not found`);
      }
    }

    // Map project based on repository slug
    const db = scopedClient(targetOrgId);
    let project;

    if (projectId) {
      project = await db.project.findUnique({
        where: { id: projectId },
      });
    } else {
      // Fallback: Map project based on repository slug
      const projectSlug = repo.toLowerCase();
      project = await db.project.findFirst({
        where: {
          organizationId: targetOrgId,
          slug: projectSlug,
        },
      });

      if (!project) {
        this.logger.log(`No project found for slug '${projectSlug}'. Creating a default project.`);
        project = await db.project.create({
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
    }

    if (!project) {
      throw new Error(`Project ${projectId || 'unknown'} not found under organization ${targetOrgId}`);
    }

    // 2. Fetch workflow logs using the ORG's installation token, not a user token
    let token = process.env.GITHUB_OAUTH_TOKEN;
    const githubInstallation = await systemDb.githubInstallation.findFirst({
      where: { organizationId: targetOrgId },
    });

    if (githubInstallation) {
      this.logger.log(`Fetching installation token for organization ${targetOrgId} (Installation: ${githubInstallation.installationId})`);
      token = await this.githubService.getInstallationToken(githubInstallation.installationId.toString());
    } else {
      this.logger.log('No GitHub App installation found. Falling back to GITHUB_OAUTH_TOKEN.');
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
      const CHUNK_SIZE_CHARS = 100 * 1024; // Slice 100K characters at a time
      const logChunksData: {
        content: string;
        startOffset: number;
        endOffset: number;
        sequence: number;
      }[] = [];

      let currentByteOffset = 0;
      let charOffset = 0;
      let sequence = 0;

      while (charOffset < accumulatedContent.length) {
        const contentChunk = accumulatedContent.slice(charOffset, charOffset + CHUNK_SIZE_CHARS);
        const chunkBytes = Buffer.byteLength(contentChunk, 'utf8');
        const startOffset = currentByteOffset;
        const endOffset = currentByteOffset + chunkBytes;

        logChunksData.push({
          content: contentChunk,
          startOffset,
          endOffset,
          sequence,
        });

        currentByteOffset = endOffset;
        charOffset += contentChunk.length;
        sequence++;
      }

      // 7. Save the Incident and ContextChunks inside a single database transaction
      this.logger.log(`Saving Incident and ${logChunksData.length} ContextChunks to the database...`);
      const incident = await db.incident.create({
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
      const similarSignatures = await this.triageService.findSimilarFailureSignatures(targetOrgId, project.id, embedding);
      
      const similarIncidents: any[] = [];
      for (const sig of similarSignatures) {
        if (sig.incidentId === incident.id) continue;

        const histIncident = await db.incident.findUnique({
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
      
      if (process.env.DEMO_MODE === 'true' && targetOrgId === 'demo-org-id') {
        this.logger.log('Demo mode active: bypassing Gemini LLM classification for demo organization.');
        await db.incident.update({
          where: { id: incident.id },
          data: {
            status: 'TRIAGED',
            classification: 'Demo Pipeline Failure',
            rootCauseHint: 'Simulated connection failure due to mock environment state.',
            suggestedFix: 'Re-run build pipeline or switch to an authenticated tenant scope.',
            severity: 'MEDIUM',
          },
        });
        return;
      }

      let quotaExceeded = false;
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      try {
        await db.$transaction(async (tx) => {
          // Get the plan config for this org
          const org = await tx.organization.findUnique({
            where: { id: targetOrgId },
            select: { plan: true },
          });
          const plan = org?.plan || 'FREE';
          const planConfig = PLAN_CONFIGS[plan];

          // Ensure row exists for today
          await tx.$executeRaw`
            INSERT INTO "triage"."llm_usage" ("id", "organizationId", "day", "tokensIn", "tokensOut", "callCount")
            VALUES (${crypto.randomUUID()}, ${targetOrgId}, ${today}, 0, 0, 0)
            ON CONFLICT ("organizationId", "day") DO NOTHING
          `;

          // Lock row FOR UPDATE
          const usageRows = await tx.$queryRaw<Array<{ tokensIn: number; tokensOut: number; callCount: number }>>`
            SELECT "tokensIn", "tokensOut", "callCount"
            FROM "triage"."llm_usage"
            WHERE "organizationId" = ${targetOrgId} AND "day" = ${today}
            FOR UPDATE
          `;
          const usage = usageRows[0] || { tokensIn: 0, tokensOut: 0, callCount: 0 };
          const currentTokens = usage.tokensIn + usage.tokensOut;

          // Check daily token cap
          if (currentTokens >= planConfig.dailyTokenCap) {
            quotaExceeded = true;
            throw new Error('QUOTA_EXCEEDED');
          }

          // Check global spend kill switch
          const globalUsageRows = await tx.$queryRaw<Array<{ total: number }>>`
            SELECT COALESCE(SUM("tokensIn" + "tokensOut"), 0)::int as "total"
            FROM "triage"."llm_usage"
            WHERE "day" = ${today}
          `;
          const globalTokens = globalUsageRows[0]?.total || 0;
          const globalCap = parseInt(process.env.GLOBAL_DAILY_TOKEN_CAP || '50000000', 10);
          if (globalTokens >= globalCap) {
            this.logger.warn(`Global daily cap exceeded: ${globalTokens} tokens today.`);
            quotaExceeded = true;
            throw new Error('GLOBAL_QUOTA_EXCEEDED');
          }

          // Call LLM
          this.logger.log('Calling incident classification LLM...');
          const classifierData = await this.classifierService.classifyIncident(
            dbLogChunks.map((c: any) => ({ id: c.id, content: c.content, sequence: c.sequence })),
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
            throw new Error('CLASSIFICATION_FAILED');
          }

          const { tokensIn, tokensOut, result } = classifierData;
          this.logger.log(`Classification returned. Tokens used: ${tokensIn} In, ${tokensOut} Out. Persisting...`);

          // Update usage
          await tx.$executeRaw`
            UPDATE "triage"."llm_usage"
            SET "tokensIn" = "tokensIn" + ${tokensIn},
                "tokensOut" = "tokensOut" + ${tokensOut},
                "callCount" = "callCount" + 1
            WHERE "organizationId" = ${targetOrgId} AND "day" = ${today}
          `;

          // Update incident details
          await tx.incident.update({
            where: { id: incident.id },
            data: {
              status: 'TRIAGED',
              classification: result.category,
              suggestedFix: result.suggestedFix,
              rootCauseHint: result.rootCauseHint,
              severity: result.severity,
            },
          });

          // Update justifying chunks
          await tx.contextChunk.updateMany({
            where: {
              incidentId: incident.id,
              id: { in: result.justifyingLogChunkIds },
            },
            data: {
              justifies: true,
            },
          });
        }, { timeout: 30000 });

        this.logger.log(`Incident classification successfully persisted for: ${incident.id}`);
      } catch (err: any) {
        if (quotaExceeded) {
          this.logger.warn(`Daily LLM token cap exceeded for org ${targetOrgId}. Setting status to PENDING_QUOTA.`);
          await db.incident.update({
            where: { id: incident.id },
            data: { status: 'PENDING_QUOTA' },
          });
          return;
        }

        this.logger.warn(`LLM classification failed or transaction abort: ${err.message}`);
        await db.incident.update({
          where: { id: incident.id },
          data: {
            status: 'TRIAGED',
            classification: null,
            suggestedFix: null,
            rootCauseHint: null,
          },
        });
      }
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
