import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Using raw client only for seeding/migrations
const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

const FAILURE_FAMILIES = [
  {
    name: 'OOM kill',
    severity: 'CRITICAL',
    classification: 'Container Out Of Memory',
    rootCauseHint: 'Java Virtual Machine / Node process exceeded container RAM allocation limits and was terminated by Linux kernel OOM killer.',
    suggestedFix: 'Increase memory limits in Kubernetes deployment specification or optimize memory leak profiles.',
    log: 'Killed process 12345 (node) total-vm:4321568kB, anon-rss:524288kB, file-rss:0kB, shmem-rss:0kB\nContainer memory usage limit exceeded. Exit code 137.',
    baseDim: 0,
  },
  {
    name: 'flaky network test',
    severity: 'MEDIUM',
    classification: 'Connection Interruption (EPIPE)',
    rootCauseHint: 'Network socket connection closed prematurely during HTTP request handshake with downstream microservice.',
    suggestedFix: 'Implement retry policy with exponential backoff on HTTP client request modules.',
    log: '2026-08-09T15:20:00Z ERROR NetworkClient: socket hangup\nError: write EPIPE\n\tat WriteWrap.afterWrite [as oncomplete] (node:internal/stream_base_commons:94:14)',
    baseDim: 10,
  },
  {
    name: 'dependency resolution failure',
    severity: 'HIGH',
    classification: 'Package Build Error',
    rootCauseHint: 'Failed to retrieve npm packages from private registry due to network proxy credentials mismatch.',
    suggestedFix: 'Verify registry authorization token environment variables are correct in GitHub Action secrets.',
    log: 'pnpm ERR! ERR_PNPM_FETCH_401  GET https://npm.pkg.github.com/@platform/contracts: Authorization Required\nCommand failed with exit code 1.',
    baseDim: 20,
  },
  {
    name: 'timeout',
    severity: 'CRITICAL',
    classification: 'Service Connection Timeout',
    rootCauseHint: 'Database connection timeout exceeded (10000ms) while waiting for pool session acquire.',
    suggestedFix: 'Optimize SQL slow queries or increase direct pool size allocations.',
    log: 'PrismaClientInitializationError: Connection timeout exceeded: database did not respond in 10000ms\nCheck network topology and server status.',
    baseDim: 30,
  },
  {
    name: 'assertion failure',
    severity: 'MEDIUM',
    classification: 'Unit Test Assertion Error',
    rootCauseHint: 'Expected response HTTP status 200 but received 500 from server controller.',
    suggestedFix: 'Review error trace log payloads on CheckoutController endpoint.',
    log: 'AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n200 !== 500\n\tat TestContext.<anonymous> (test/checkout.spec.ts:18:12)',
    baseDim: 40,
  },
  {
    name: 'disk full',
    severity: 'CRITICAL',
    classification: 'Disk Space Exhausted (ENOSPC)',
    rootCauseHint: 'No space left on device while writing temporary telemetry event streams to disk storage.',
    suggestedFix: 'Implement log rotation scheduler or clear temporary build directories periodically.',
    log: 'Error: ENOSPC: no space left on device, write /tmp/telemetry.json\nFailed to finalize build output packaging.',
    baseDim: 50,
  },
  {
    name: 'auth token expiry',
    severity: 'HIGH',
    classification: 'Authentication Credentials Expired',
    rootCauseHint: 'OAuth installation access token expired and failed signature validations.',
    suggestedFix: 'Trigger credentials refresh handshake or check cache key TTL limits in Redis cache.',
    log: '2026-08-09T18:11:00Z ERROR GitHubAppClient: 401 Unauthorized\nExpired JWT or bad authorization bearer headers.',
    baseDim: 60,
  },
  {
    name: 'race condition',
    severity: 'MEDIUM',
    classification: 'Lock Acquisition Contention',
    rootCauseHint: 'Deadlock encountered in transaction locks acquisition while processing concurrent inventory increments.',
    suggestedFix: 'Use pessimistic database lock queues or serializable transaction isolation state.',
    log: 'ERROR: deadlock detected\nDETAIL: Process 4125 waits for ShareLock on transaction 8214; blocked by process 4130.',
    baseDim: 70,
  },
];

function generateVector(baseDim: number, similarToSameFamily: boolean = true): number[] {
  const vec = new Array(768).fill(0).map(() => Math.random() * 0.02); // Small random noise
  if (similarToSameFamily) {
    // Inject family signal
    for (let i = baseDim; i < baseDim + 10; i++) {
      vec[i] = 0.85 + Math.random() * 0.1;
    }
  } else {
    // Generate completely random vector
    for (let i = 0; i < 15; i++) {
      const idx = Math.floor(Math.random() * 768);
      vec[idx] = 0.5 + Math.random() * 0.4;
    }
  }
  // Normalize vector to unit length
  const sumSq = vec.reduce((sum, val) => sum + val * val, 0);
  const len = Math.sqrt(sumSq);
  return vec.map((v) => v / len);
}

async function seed() {
  console.log('Clearing database tables...');
  await db.$executeRawUnsafe('TRUNCATE TABLE "shared"."organization" CASCADE');
  await db.$executeRawUnsafe('TRUNCATE TABLE "shared"."user" CASCADE');
  await db.$executeRawUnsafe('TRUNCATE TABLE "triage"."project" CASCADE');
  await db.$executeRawUnsafe('TRUNCATE TABLE "triage"."incident" CASCADE');
  await db.$executeRawUnsafe('TRUNCATE TABLE "triage"."context_chunk" CASCADE');
  await db.$executeRawUnsafe('TRUNCATE TABLE "triage"."failure_signature" CASCADE');
  await db.$executeRawUnsafe('TRUNCATE TABLE "triage"."api_key" CASCADE');
  await db.$executeRawUnsafe('TRUNCATE TABLE "shared"."invitation" CASCADE');
  await db.$executeRawUnsafe('TRUNCATE TABLE "triage"."llm_usage" CASCADE');

  console.log('Seeding organizations and users...');
  // Users
  await db.user.create({ data: { id: 'usr-owner-id', email: 'owner@acme.com', name: 'Owner User' } });
  await db.user.create({ data: { id: 'usr-admin-id', email: 'admin@acme.com', name: 'Admin User' } });
  await db.user.create({ data: { id: 'usr-member-id', email: 'member@acme.com', name: 'Member User' } });
  await db.user.create({ data: { id: 'usr-viewer-id', email: 'viewer@acme.com', name: 'Viewer User' } });

  // Orgs
  // 1. Personal Org (for Owner)
  await db.organization.create({
    data: {
      id: 'org-personal-id',
      name: 'Personal Org Workspace',
      slug: 'personal-org',
      kind: 'PERSONAL',
      plan: 'FREE',
      createdAt: new Date(),
    },
  });
  await db.member.create({
    data: {
      id: 'mem-personal-owner',
      organizationId: 'org-personal-id',
      userId: 'usr-owner-id',
      role: 'owner',
      createdAt: new Date(),
    },
  });

  // 2. Org Alpha (TEAM)
  await db.organization.create({
    data: {
      id: 'org-alpha-id',
      name: 'Alpha Development Group',
      slug: 'alpha-dev',
      kind: 'TEAM',
      plan: 'PRO',
      createdAt: new Date(),
    },
  });
  // Overlapping members for switcher testing: Owner is OWNER, Admin is ADMIN, Member is MEMBER, Viewer is VIEWER
  const membersAlpha = [
    { id: 'mem-alpha-owner', userId: 'usr-owner-id', role: 'owner' },
    { id: 'mem-alpha-admin', userId: 'usr-admin-id', role: 'admin' },
    { id: 'mem-alpha-member', userId: 'usr-member-id', role: 'member' },
    { id: 'mem-alpha-viewer', userId: 'usr-viewer-id', role: 'viewer' },
  ];
  for (const m of membersAlpha) {
    await db.member.create({
      data: {
        id: m.id,
        organizationId: 'org-alpha-id',
        userId: m.userId,
        role: m.role as any,
        createdAt: new Date(),
      },
    });
  }

  // 3. Org Beta (TEAM)
  await db.organization.create({
    data: {
      id: 'org-beta-id',
      name: 'Beta Production Ops',
      slug: 'beta-ops',
      kind: 'TEAM',
      plan: 'PRO',
      createdAt: new Date(),
    },
  });
  // Overlapping roles: Admin is OWNER, Owner is ADMIN, Member is MEMBER, Viewer is VIEWER
  const membersBeta = [
    { id: 'mem-beta-owner', userId: 'usr-admin-id', role: 'owner' },
    { id: 'mem-beta-admin', userId: 'usr-owner-id', role: 'admin' },
    { id: 'mem-beta-member', userId: 'usr-member-id', role: 'member' },
    { id: 'mem-beta-viewer', userId: 'usr-viewer-id', role: 'viewer' },
  ];
  for (const m of membersBeta) {
    await db.member.create({
      data: {
        id: m.id,
        organizationId: 'org-beta-id',
        userId: m.userId,
        role: m.role as any,
        createdAt: new Date(),
      },
    });
  }

  console.log('Seeding projects...');
  await db.project.create({
    data: { id: 'proj-personal-1', organizationId: 'org-personal-id', name: 'personal-site', slug: 'personal-site', webhookSecret: 'sec-pers' },
  });

  await db.project.create({
    data: { id: 'proj-alpha-1', organizationId: 'org-alpha-id', name: 'alpha-api', slug: 'alpha-api', webhookSecret: 'sec-alpha1' },
  });
  await db.project.create({
    data: { id: 'proj-alpha-2', organizationId: 'org-alpha-id', name: 'alpha-frontend', slug: 'alpha-frontend', webhookSecret: 'sec-alpha2' },
  });

  await db.project.create({
    data: { id: 'proj-beta-1', organizationId: 'org-beta-id', name: 'beta-processor', slug: 'beta-processor', webhookSecret: 'sec-beta1' },
  });
  await db.project.create({
    data: { id: 'proj-beta-2', organizationId: 'org-beta-id', name: 'beta-dashboard', slug: 'beta-dashboard', webhookSecret: 'sec-beta2' },
  });

  console.log('Seeding API keys...');
  const rawKeyPersonal = 'itg_dev_personal_key_seeding12345';
  const rawKeyAlpha = 'itg_dev_alphadev_key_seeding12345';
  const rawKeyBeta = 'itg_dev_betaops_key_seeding12345';

  const hashKey = (key: string) => crypto.createHash('sha256').update(key).digest('hex');

  await db.apiKey.create({
    data: {
      id: 'key-pers-id',
      organizationId: 'org-personal-id',
      name: 'Personal Dev Key',
      prefix: 'itg_dev_pers',
      hash: hashKey(rawKeyPersonal),
      scopes: ['incidents:read'],
      createdByUserId: 'usr-owner-id',
    },
  });

  await db.apiKey.create({
    data: {
      id: 'key-alpha-id',
      organizationId: 'org-alpha-id',
      name: 'Alpha Admin Key',
      prefix: 'itg_dev_alph',
      hash: hashKey(rawKeyAlpha),
      scopes: ['incidents:read', 'incidents:write'],
      createdByUserId: 'usr-owner-id',
    },
  });

  await db.apiKey.create({
    data: {
      id: 'key-beta-id',
      organizationId: 'org-beta-id',
      name: 'Beta Server Key',
      prefix: 'itg_dev_beta',
      hash: hashKey(rawKeyBeta),
      scopes: ['incidents:read', 'webhooks:write'],
      createdByUserId: 'usr-admin-id',
    },
  });

  console.log('Generating and seeding 100 mock incidents across orgs/projects...');
  const projectsList = [
    { orgId: 'org-personal-id', projId: 'proj-personal-1' },
    { orgId: 'org-alpha-id', projId: 'proj-alpha-1' },
    { orgId: 'org-alpha-id', projId: 'proj-alpha-2' },
    { orgId: 'org-beta-id', projId: 'proj-beta-1' },
    { orgId: 'org-beta-id', projId: 'proj-beta-2' },
  ];

  // Keep track of two specifically similar cross-org incidents to verify security boundaries
  // We'll generate identical embeddings for OOM fails in Org Alpha and Org Beta
  const identicalOomVector = generateVector(0, true);

  for (let index = 1; index <= 100; index++) {
    const family = FAILURE_FAMILIES[index % 8];
    const targetProj = projectsList[index % projectsList.length];
    
    // Choose status (OPEN or RESOLVED)
    const status = index % 3 === 0 ? 'RESOLVED' : 'OPEN';
    const resolvedAt = status === 'RESOLVED' ? new Date(Date.now() - 3600000) : null;

    const incId = `inc-mock-${index}`;
    await db.incident.create({
      data: {
        id: incId,
        organizationId: targetProj.orgId,
        projectId: targetProj.projId,
        source: 'GITHUB_CI',
        title: `${family.name} failure in pipeline build #${1000 + index}`,
        status: status as any,
        severity: family.severity as any,
        classification: family.classification,
        rootCauseHint: family.rootCauseHint,
        suggestedFix: family.suggestedFix,
        detectedAt: new Date(Date.now() - index * 7200000),
        resolvedAt,
      },
    });

    await db.contextChunk.create({
      data: {
        id: `chunk-mock-${index}`,
        organizationId: targetProj.orgId,
        incidentId: incId,
        sequence: 1,
        startOffset: 0,
        endOffset: family.log.length,
        content: family.log,
        justifies: true,
      },
    });

    // Check if we inject cross-org similar vectors
    let embedding: number[];
    if (family.name === 'OOM kill' && (targetProj.orgId === 'org-alpha-id' || targetProj.orgId === 'org-beta-id')) {
      embedding = [...identicalOomVector];
    } else {
      embedding = generateVector(family.baseDim, true);
    }

    const sigId = `sig-mock-${index}`;
    const embeddingStr = `[${embedding.join(',')}]`;
    
    // Run direct SQL Insert to bypass Prisma Unsupported embedding type constraints
    await db.$executeRawUnsafe(
      `INSERT INTO "triage"."failure_signature" ("id", "organizationId", "projectId", "incidentId", "normalisedText", "embedding")
       VALUES ('${sigId}', '${targetProj.orgId}', '${targetProj.projId}', '${incId}', '${family.name}', '${embeddingStr}'::halfvec)`
    );
  }

  console.log('Building HNSW index on database FailureSignature table...');
  const sqlPath = path.join(__dirname, 'hnsw_index.sql');
  if (fs.existsSync(sqlPath)) {
    const indexSql = fs.readFileSync(sqlPath, 'utf-8');
    await db.$executeRawUnsafe(indexSql);
    console.log('HNSW similarity index compiled successfully!');
  } else {
    console.warn(`HNSW index script not found at path: ${sqlPath}`);
  }

  console.log('\n==================================================');
  console.log('DATABASE SEEDING SUCCESSFULLY COMPLETED!');
  console.log('==================================================');
  console.log('API KEYS GENERATED FOR TESTING:');
  console.log(`Personal Org (personal-org): ${rawKeyPersonal}`);
  console.log(`Alpha Dev Group (alpha-dev):  ${rawKeyAlpha}`);
  console.log(`Beta Prod Ops (beta-ops):     ${rawKeyBeta}`);
  console.log('==================================================\n');

  await db.$disconnect();
}

seed().catch((err) => {
  console.error('Seeding process failed:', err);
  db.$disconnect();
  process.exit(1);
});
