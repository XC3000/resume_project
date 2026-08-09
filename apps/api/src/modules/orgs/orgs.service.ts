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

  async sendInviteEmail(email: string, token: string, orgName: string) {
    const inviteUrl = `${process.env.WEB_URL || 'http://localhost:3001'}/invite?token=${token}`;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.log(`[LOCAL DEV] Invitation Link for ${email}: ${inviteUrl}`);
      return;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: email,
          subject: `Invitation to join ${orgName} on Incident Triage`,
          html: `<p>You have been invited to join <strong>${orgName}</strong>.</p><p>Click <a href="${inviteUrl}">here</a> to accept the invitation.</p>`,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Failed to send email via Resend: ${errText}`);
      }
    } catch (err) {
      console.error(`Failed to send email via Resend: ${err}`);
    }
  }

  async inviteMember(orgId: string, inviterId: string, email: string, role: string) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required.');
    }

    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException(`Invalid invitation role: ${role}. Only admin, member, or viewer can be invited.`);
    }

    // Single-use token: 7-day expiry
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const org = await unsafeUnscopedClient.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found.');
    }

    const invite = await unsafeUnscopedClient.invitation.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: orgId,
        email: email.toLowerCase(),
        role,
        status: 'pending',
        expiresAt,
        createdAt: new Date(),
        inviterId,
        tokenHash,
      },
    });

    await this.sendInviteEmail(email, token, org.name);

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      token,
    };
  }

  async listInvitations(orgId: string) {
    return unsafeUnscopedClient.invitation.findMany({
      where: { organizationId: orgId, status: 'pending' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        inviterId: true,
      },
    });
  }

  async revokeInvitation(orgId: string, invitationId: string) {
    const invite = await unsafeUnscopedClient.invitation.findFirst({
      where: { id: invitationId, organizationId: orgId },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found.');
    }

    await unsafeUnscopedClient.invitation.update({
      where: { id: invitationId },
      data: { status: 'revoked' },
    });

    return { message: 'Invitation revoked successfully.' };
  }

  async acceptInvitation(userId: string, email: string, token: string, confirm?: boolean) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = await unsafeUnscopedClient.invitation.findFirst({
      where: { tokenHash, status: 'pending' },
    });

    if (!invite) {
      throw new BadRequestException('Invalid or expired invitation token.');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('This invitation has expired.');
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      if (!confirm) {
        throw new BadRequestException('Email mismatch: The invitation was sent to different email address. Please confirm if you want to join anyway.');
      }
    }

    const existingMember = await unsafeUnscopedClient.member.findFirst({
      where: { organizationId: invite.organizationId, userId },
    });

    if (existingMember) {
      throw new BadRequestException('You are already a member of this organization.');
    }

    return unsafeUnscopedClient.$transaction(async (tx) => {
      // Create membership
      await tx.member.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: invite.organizationId,
          userId,
          role: invite.role || 'member',
          createdAt: new Date(),
        },
      });

      // Mark invitation accepted
      await tx.invitation.update({
        where: { id: invite.id },
        data: { status: 'accepted' },
      });

      return {
        message: 'Invitation accepted successfully.',
        organizationId: invite.organizationId,
      };
    });
  }

  async listMembers(orgId: string) {
    return unsafeUnscopedClient.member.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async updateMemberRole(orgId: string, callerRole: string, targetMemberId: string, targetRole: string) {
    const validRoles = ['owner', 'admin', 'member', 'viewer'];
    if (!validRoles.includes(targetRole)) {
      throw new BadRequestException(`Invalid role: ${targetRole}`);
    }

    const targetMember = await unsafeUnscopedClient.member.findUnique({
      where: { id: targetMemberId },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      throw new NotFoundException('Member not found in this organization.');
    }

    // Role checks
    if (callerRole === 'admin') {
      if (targetRole === 'owner') {
        throw new ForbiddenException('An ADMIN cannot promote to OWNER; only an OWNER can.');
      }
      if (targetMember.role === 'owner') {
        throw new ForbiddenException('An ADMIN cannot modify the OWNER role.');
      }
    }

    if (targetMember.role === 'owner' && targetRole !== 'owner') {
      // Demoting owner
      const ownerCount = await unsafeUnscopedClient.member.count({
        where: { organizationId: orgId, role: 'owner' },
      });
      if (ownerCount === 1) {
        throw new BadRequestException('Cannot demote the last OWNER of the organization. Please transfer ownership instead.');
      }
    }

    return unsafeUnscopedClient.member.update({
      where: { id: targetMemberId },
      data: { role: targetRole },
    });
  }

  async removeMember(orgId: string, callerRole: string, targetMemberId: string) {
    const targetMember = await unsafeUnscopedClient.member.findUnique({
      where: { id: targetMemberId },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      throw new NotFoundException('Member not found in this organization.');
    }

    if (callerRole === 'admin') {
      if (targetMember.role === 'owner') {
        throw new ForbiddenException('An ADMIN cannot remove an OWNER.');
      }
    }

    if (targetMember.role === 'owner') {
      const ownerCount = await unsafeUnscopedClient.member.count({
        where: { organizationId: orgId, role: 'owner' },
      });
      if (ownerCount === 1) {
        throw new BadRequestException('Cannot remove the last OWNER of the organization. Please transfer ownership first.');
      }
    }

    await unsafeUnscopedClient.member.delete({
      where: { id: targetMemberId },
    });

    return { message: 'Member removed successfully.' };
  }

  async leaveOrg(orgId: string, userId: string) {
    const org = await unsafeUnscopedClient.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found.');
    }

    if (org.kind === 'PERSONAL') {
      throw new BadRequestException('PERSONAL organizations cannot be left.');
    }

    const member = await unsafeUnscopedClient.member.findFirst({
      where: { organizationId: orgId, userId },
    });

    if (!member) {
      throw new BadRequestException('You are not a member of this organization.');
    }

    if (member.role === 'owner') {
      const ownerCount = await unsafeUnscopedClient.member.count({
        where: { organizationId: orgId, role: 'owner' },
      });
      if (ownerCount === 1) {
        throw new BadRequestException('Cannot leave the organization as the last OWNER. Please transfer ownership first.');
      }
    }

    await unsafeUnscopedClient.member.delete({
      where: { id: member.id },
    });

    return { message: 'Left organization successfully.' };
  }

  async transferOwnership(orgId: string, ownerUserId: string, targetMemberId: string, confirm?: boolean) {
    const callerMember = await unsafeUnscopedClient.member.findFirst({
      where: { organizationId: orgId, userId: ownerUserId },
    });

    if (!callerMember || callerMember.role !== 'owner') {
      throw new ForbiddenException('Only the OWNER can transfer ownership.');
    }

    const targetMember = await unsafeUnscopedClient.member.findUnique({
      where: { id: targetMemberId },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      throw new NotFoundException('Target member not found in this organization.');
    }

    if (!confirm) {
      return {
        confirmationRequired: true,
        message: 'Are you sure you want to transfer ownership? You will be demoted to admin.',
      };
    }

    return unsafeUnscopedClient.$transaction(async (tx) => {
      // Demote current owner to admin
      await tx.member.update({
        where: { id: callerMember.id },
        data: { role: 'admin' },
      });

      // Promote target member to owner
      await tx.member.update({
        where: { id: targetMemberId },
        data: { role: 'owner' },
      });

      return { message: 'Ownership transferred successfully.' };
    });
  }
}
