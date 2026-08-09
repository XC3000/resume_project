'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authClient } from '@platform/auth';
import { api } from '@/lib/api';
import { SettingsTabs } from '@/components/SettingsTabs';
import { Users, Mail, UserMinus, ShieldAlert, Award, LogOut, CheckCircle, AlertCircle, Trash2, Shield, Loader2 } from 'lucide-react';

export default function MembersSettingsPage() {
  const router = useRouter();
  const { orgSlug } = useParams() as { orgSlug: string };

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [currentOrg, setCurrentOrg] = useState<any | null>(null);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Transfer ownership states
  const [transferTarget, setTransferTarget] = useState('');
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [transferPrompt, setTransferPrompt] = useState<any>(null);
  const [transferLoading, setTransferLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: sessionData } = authClient.useSession();

  useEffect(() => {
    setSession(sessionData);
    loadMembersData();
  }, [orgSlug, sessionData]);

  const loadMembersData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch organization list to find current slug kind and info
      const orgListRes = await authClient.organization.list();
      const active = orgListRes?.data?.find((o) => o.slug === orgSlug);
      if (active) {
        setCurrentOrg(active);
      }

      // 2. Fetch members list
      const memberList = await api.get('/orgs/members');
      setMembers(memberList || []);

      // 3. Fetch invitations list
      const inviteList = await api.get('/orgs/invitations');
      setInvitations(inviteList || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load organization members.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviteLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/orgs/invitations', {
        email: inviteEmail,
        role: inviteRole,
      });
      setSuccess(`Invitation sent successfully to ${inviteEmail}.`);
      setInviteEmail('');
      await loadMembersData();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;

    setError('');
    setSuccess('');
    try {
      await api.post(`/orgs/invitations/${inviteId}/revoke`);
      setSuccess('Invitation revoked successfully.');
      await loadMembersData();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke invitation.');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/orgs/members/${memberId}`, { role: newRole });
      setSuccess('Member role updated successfully.');
      await loadMembersData();
    } catch (err: any) {
      setError(err.message || 'Failed to update member role.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the organization?')) return;

    setError('');
    setSuccess('');
    try {
      await api.delete(`/orgs/members/${memberId}`);
      setSuccess('Member removed successfully.');
      await loadMembersData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member.');
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this organization?')) return;

    setError('');
    try {
      await api.post('/orgs/leave');
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to leave organization.');
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTarget) return;

    setTransferLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/orgs/transfer-ownership', {
        targetMemberId: transferTarget,
        confirm: transferConfirm,
      });

      if (res.confirmationRequired) {
        setTransferPrompt(res);
      } else {
        setSuccess('Ownership transferred successfully.');
        setTransferPrompt(null);
        setTransferTarget('');
        setTransferConfirm(false);
        await loadMembersData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to transfer ownership.');
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading member directory...</p>
      </div>
    );
  }

  // Find user's own role
  const currentUserMember = members.find((m) => m.userId === session?.user?.id);
  const userRole = currentUserMember?.role;
  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin' || isOwner;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Organization Settings
        </h1>
      </div>

      <SettingsTabs />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
          <p className="text-sm text-green-300">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Invite Form & Ownership Transfer */}
        <div className="md:col-span-1 space-y-6">
          {/* Invite Member form */}
          {isAdmin && (
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
              <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Mail className="w-4.5 h-4.5 text-indigo-400" />
                Invite Member
              </h3>

              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:border-indigo-500 outline-none text-slate-200 text-xs transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Role Privilege
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:border-indigo-500 outline-none text-slate-200 text-xs transition"
                  >
                    <option value="viewer">Viewer (Read Only)</option>
                    <option value="member">Member (Triage logs, comment)</option>
                    <option value="admin">Admin (Manage keys, settings)</option>
                    {isOwner && <option value="owner">Owner (Transfer, Delete)</option>}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-705 text-white font-semibold transition text-xs disabled:opacity-50"
                >
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </form>
            </div>
          )}

          {/* Transfer Ownership card (only for OWNERs) */}
          {isOwner && currentOrg?.kind !== 'PERSONAL' && (
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
              <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-amber-400" />
                Transfer Ownership
              </h3>

              <form onSubmit={handleTransferOwnership} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Target Member
                  </label>
                  <select
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 focus:border-indigo-500 outline-none text-slate-200 text-xs transition"
                    required
                  >
                    <option value="">Select a member...</option>
                    {members
                      .filter((m) => m.userId !== session?.user?.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.user?.name || m.user?.email || m.userId} ({m.role})
                        </option>
                      ))}
                  </select>
                </div>

                {transferPrompt && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-normal">
                    <p className="font-semibold mb-1">Confirmation Required:</p>
                    <p className="mb-2">{transferPrompt.message}</p>
                    <label className="flex items-center gap-2 cursor-pointer font-bold mt-1">
                      <input
                        type="checkbox"
                        checked={transferConfirm}
                        onChange={(e) => setTransferConfirm(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                      />
                      Confirm demotion to admin
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={transferLoading || (transferPrompt && !transferConfirm)}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition text-xs disabled:opacity-50"
                >
                  {transferLoading ? 'Transferring...' : 'Transfer Ownership'}
                </button>
              </form>
            </div>
          )}

          {/* Leave Organization */}
          {currentOrg?.kind !== 'PERSONAL' && (
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl text-center">
              <h3 className="text-sm font-bold text-slate-200 mb-2">Leave Space</h3>
              <p className="text-[11px] text-slate-500 leading-normal mb-4">
                Depart from this organization space. You will lose access to all its repositories and logs.
              </p>
              <button
                onClick={handleLeave}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-red-400 font-semibold transition text-xs flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Leave Organization
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Active Members & Pending Invitations list */}
        <div className="md:col-span-2 space-y-6">
          {/* Active Members list */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Active Workspace Members
            </h3>

            <div className="divide-y divide-slate-850">
              {members.map((member) => (
                <div key={member.id} className="py-4.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-200">
                      {member.user?.name || 'Workspace Member'}
                      {member.userId === session?.user?.id && (
                        <span className="ml-2 text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 font-bold uppercase tracking-wider">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{member.user?.email || ''}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role changer dropdown (only for Admins/Owners and for OTHER members) */}
                    {isAdmin && member.userId !== session?.user?.id && member.role !== 'owner' ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-900 text-slate-300 text-xs outline-none focus:border-indigo-500"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        {isOwner && <option value="owner">Owner</option>}
                      </select>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        {member.role}
                      </span>
                    )}

                    {/* Delete button (only for Admins/Owners removing lower-tier members) */}
                    {isAdmin && member.userId !== session?.user?.id && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        title="Remove Member"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-950 transition"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invitations list */}
          {invitations.length > 0 && (
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
              <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Mail className="w-4.5 h-4.5 text-indigo-400" />
                Pending Invitations
              </h3>

              <div className="divide-y divide-slate-850">
                {invitations.map((invite) => (
                  <div key={invite.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{invite.email}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-semibold uppercase tracking-wider">
                        Role: {invite.role} · Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleRevokeInvite(invite.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
