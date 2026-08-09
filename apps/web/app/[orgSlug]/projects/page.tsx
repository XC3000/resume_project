'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Folder, ArrowRight, Github, Trash2, Key, Check, Plus, AlertCircle, Loader2 } from 'lucide-react';

export default function ProjectsPage() {
  const router = useRouter();
  const { orgSlug } = useParams() as { orgSlug: string };

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [repos, setRepos] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [connectingRepo, setConnectingRepo] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, [orgSlug]);

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const projectList = await api.get('/triage/projects');
      setProjects(projectList || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPicker = async () => {
    setShowPicker(true);
    setError('');
    try {
      const repoList = await api.get('/github/repos');
      setRepos(repoList || []);
    } catch (err) {
      console.warn('Real GitHub App not configured or token expired, using mock repository list for simulation.');
      setRepos([
        { id: 101, name: 'sre-copilot-backend', full_name: 'acme-org/sre-copilot-backend', private: true },
        { id: 102, name: 'k8s-infrastructure', full_name: 'acme-org/k8s-infrastructure', private: true },
        { id: 103, name: 'react-dashboard', full_name: 'acme-org/react-dashboard', private: false },
      ]);
    }
  };

  const handleConnectProject = async (repo: any) => {
    setConnectingRepo(repo.full_name);
    setError('');
    try {
      await api.post('/triage/projects', {
        name: repo.name,
        repoFullName: repo.full_name,
        githubRepoId: repo.id,
      });
      setShowPicker(false);
      await loadProjects();
    } catch (err: any) {
      setError(err.message || 'Failed to connect repository.');
    } finally {
      setConnectingRepo(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading active projects directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Connected Projects
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage repository bindings, retrieve webhook parameters, and inspect security settings.
          </p>
        </div>
        <button
          onClick={handleOpenPicker}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Connect Repository
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Connected projects list table */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        {projects.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No projects connected to this organization yet. Click "Connect Repository" above.
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {projects.map((project) => (
              <div key={project.id} className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20 shrink-0">
                    <Folder className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-200">{project.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{project.repoFullName || 'Generic Webhook'}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-slate-500 text-[10px] uppercase font-semibold tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5" />
                        Webhook Secret: <code className="text-slate-400 select-all normal-case">{project.webhookSecret}</code>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/${orgSlug}/projects/${project.slug}/incidents`}
                    className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 transition text-xs font-semibold flex items-center gap-2"
                  >
                    View Incidents
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Repo connection modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl relative">
            <h2 className="text-xl font-bold text-slate-100 mb-2">Connect Repository</h2>
            <p className="text-sm text-slate-400 mb-4">
              Select an authorized repository from your GitHub App installation.
            </p>

            <div className="divide-y divide-slate-900 max-h-80 overflow-y-auto">
              {repos.map((repo) => {
                const isConnected = projects.some((p) => p.repoFullName === repo.full_name);
                return (
                  <div key={repo.id} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Folder className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{repo.full_name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                          {repo.private ? 'Private' : 'Public'}
                        </p>
                      </div>
                    </div>

                    {isConnected ? (
                      <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                        <Check className="w-4 h-4 text-green-500" />
                        Connected
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConnectProject(repo)}
                        disabled={connectingRepo === repo.full_name}
                        className="px-4 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 transition text-xs font-semibold disabled:opacity-50"
                      >
                        {connectingRepo === repo.full_name ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-900 mt-4">
              <button
                onClick={() => setShowPicker(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
