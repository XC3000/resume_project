'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@platform/auth';
import { api } from '@/lib/api';
import { Mail, CheckCircle2, AlertTriangle, ArrowRight, ShieldAlert, Loader } from 'lucide-react';

export default function InviteAcceptPage() {
  const router = useRouter();
  const { token } = useParams() as { token: string };

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const { data: sessionData, isPending: sessionLoading } = authClient.useSession();
  const session = sessionData;

  useEffect(() => {
    if (!sessionLoading) {
      if (sessionData) {
        attemptAccept(false);
      } else {
        setLoading(false);
      }
    }
  }, [sessionData, sessionLoading, token]);

  const attemptAccept = async (confirm: boolean) => {
    setError('');
    setProcessing(true);
    try {
      const res = await api.post('/orgs/invitations/accept', { token, confirm });
      setSuccess(true);
      
      // Fetch organizations list again and redirect to dashboard
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('email mismatch')) {
        setNeedsConfirm(true);
      } else {
        setError(err.message || 'Invalid or expired invitation token.');
      }
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-center items-center">
        <Loader className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Verifying invitation details...</p>
      </div>
    );
  }

  // Not authenticated flow
  if (!session) {
    return (
      <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl text-center">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/30 mx-auto mb-4">
            <Mail className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">You've Been Invited!</h1>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            To accept this invitation and join the SRE incident triage organization, please sign in or create an account first.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href={`/login?redirect=/invite/${token}`}
              className="py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition text-center"
            >
              Sign In to Accept
            </Link>
            <Link
              href={`/signup?redirect=/invite/${token}`}
              className="py-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 transition text-center"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/30 mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-green-400 mb-2">Invitation Accepted!</h1>
            <p className="text-slate-400 text-sm">
              You are now a member of the organization. Redirecting to workspace...
            </p>
          </div>
        ) : needsConfirm ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/30 mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-amber-400 mb-3">Email Address Mismatch</h1>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              This invitation was sent to a different email address than your current account (<strong>{session.user.email}</strong>).
              Do you still want to accept this invitation using your current account?
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => attemptAccept(true)}
                disabled={processing}
                className="py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold transition flex items-center justify-center gap-2"
              >
                {processing ? 'Processing...' : 'Accept Invitation Anyway'}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={async () => {
                  await authClient.signOut();
                  router.push(`/login?redirect=/invite/${token}`);
                }}
                className="py-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 transition"
              >
                Sign In with Different Email
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/30 mx-auto mb-4">
              <ShieldAlert className="w-7 h-7 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-red-400 mb-2">Invalid Invitation</h1>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {error || 'This invitation has expired or has already been accepted.'}
            </p>
            <Link
              href="/"
              className="inline-block py-2.5 px-6 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 transition text-sm font-semibold"
            >
              Go to Homepage
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
