import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { unsafeUnscopedClient, scopedClient } from '@platform/db';
import * as crypto from 'crypto';

const reservedSlugs = [
  'api',
  'admin',
  'login',
  'signup',
  'settings',
  'new',
  'docs',
  'health',
  'webhooks',
  'invite'
];

@Injectable()
export class OrgsService {
  async createTeamOrg(userId: string, name: string, slug: string) {
    if (!name || name.trim().length < 3) {
      throw new BadRequestException('Organization name must be at least 3 characters long.');
    }
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestException('Slug must contain only lowercase letters, numbers, and hyphens.');
    }

    const targetSlug = slug.toLowerCase();
    
    if (reservedSlugs.includes(targetSlug)) {
      throw new BadRequestException(`Slug '${targetSlug}' is a reserved system keyword.`);
    }

    const existing = await unsafeUnscopedClient.organization.findUnique({
      where: { slug: targetSlug },
    });

    if (existing) {
      throw new BadRequestException(`Organization slug '${targetSlug}' is already taken.`);
    }

    // Wrap in a transaction to create organization and member atomically
    return unsafeUnscopedClient.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          id: crypto.randomUUID(),
          name,
          slug: targetSlug,
          kind: 'TEAM',
          plan: 'FREE',
          createdAt: new Date(),
        },
      });

      await tx.member.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: org.id,
          userId,
          role: 'owner',
          createdAt: new Date(),
        },
      });

      return org;
    });
  }

  async switchActiveOrg(userId: string, sessionId: string, targetOrgId: string) {
    const member = await unsafeUnscopedClient.member.findFirst({
      where: {
        organizationId: targetOrgId,
        userId,
      },
    });

    if (!member) {
      throw new ForbiddenException('Security violation: You are not a member of the target organization.');
    }

    const session = await unsafeUnscopedClient.session.update({
      where: { id: sessionId },
      data: { activeOrganizationId: targetOrgId },
      include: {
        user: true,
      },
    });

    return {
      message: 'Active organization switched successfully.',
      activeOrganizationId: session.activeOrganizationId,
    };
  }

  async updateSettings(activeOrgId: string, name?: string, slug?: string) {
    const updateData: Record<string, any> = {};

    if (name !== undefined) {
      if (name.trim().length < 3) {
        throw new BadRequestException('Organization name must be at least 3 characters long.');
      }
      updateData.name = name;
    }

    if (slug !== undefined) {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new BadRequestException('Slug must contain only lowercase letters, numbers, and hyphens.');
      }
      const targetSlug = slug.toLowerCase();
      if (reservedSlugs.includes(targetSlug)) {
        throw new BadRequestException(`Slug '${targetSlug}' is a reserved system keyword.`);
      }

      const existing = await unsafeUnscopedClient.organization.findUnique({
        where: { slug: targetSlug },
      });

      if (existing && existing.id !== activeOrgId) {
        throw new BadRequestException(`Organization slug '${targetSlug}' is already taken.`);
      }

      updateData.slug = targetSlug;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided to update.');
    }

    return unsafeUnscopedClient.organization.update({
      where: { id: activeOrgId },
      data: updateData,
    });
  }

  async deleteOrg(activeOrgId: string) {
    const org = await unsafeUnscopedClient.organization.findUnique({
      where: { id: activeOrgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found.');
    }

    if (org.kind === 'PERSONAL') {
      throw new BadRequestException('Security violation: PERSONAL organizations cannot be deleted.');
    }

    // Delete organization (cascades memberships, invitation lists, etc.)
    await unsafeUnscopedClient.organization.delete({
      where: { id: activeOrgId },
    });

    return {
      message: 'Organization deleted successfully.',
    };
  }

  async createApiKey(orgId: string, userId: string, name: string, scopes: string[], expiresAt?: string) {
    if (!name || name.trim().length < 3) {
      throw new BadRequestException('API Key name must be at least 3 characters long.');
    }

    const validScopes = ['incidents:read', 'incidents:write', 'projects:read', 'webhooks:write'];
    for (const scope of scopes) {
      if (!validScopes.includes(scope)) {
        throw new BadRequestException(`Invalid scope: ${scope}`);
      }
    }

    const env = process.env.NODE_ENV === 'production' ? 'live' : 'dev';
    const randomPart = crypto.randomBytes(24).toString('base64url');
    const rawKey = `itg_${env}_${randomPart}`;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const db = scopedClient(orgId);
    const key = await db.apiKey.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: orgId,
        name,
        prefix: rawKey.slice(0, 12),
        hash,
        scopes,
        createdByUserId: userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdAt: new Date(),
      },
    });

    return {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      scopes: key.scopes,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      key: rawKey, // Returned exactly once
    };
  }

  async listApiKeys(orgId: string) {
    const db = scopedClient(orgId);
    return db.apiKey.findMany({
      where: { revokedAt: null },
      select: {
        id: true,
        organizationId: true,
        name: true,
        prefix: true,
        scopes: true,
        createdByUserId: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  async revokeApiKey(orgId: string, id: string) {
    const db = scopedClient(orgId);
    const key = await db.apiKey.findUnique({
      where: { id },
    });

    if (!key) {
      throw new NotFoundException('API Key not found.');
    }

    await db.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return { message: 'API Key revoked successfully.' };
  }
}
