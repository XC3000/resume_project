'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Github, Folder, AlertCircle, Play, Shield, Terminal, ArrowRight, HelpCircle, Loader2 } from 'lucide-react';

export default function OrgDashboardPage() {
  const router = useRouter();
  const { orgSlug } = useParams() as { orgSlug: string };

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [githubInstallation, setGithubInstallation] = useState<any>(null);
  
  // Repo connection flow states
  const [installing, setInstalling] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [connectingRepo, setConnectingRepo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [orgSlug]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch connected projects
      const projectList = await api.get('/triage/projects');
      setProjects(projectList || []);

      // 2. Fetch repo picker if no projects
      if (!projectList || projectList.length === 0) {
        await loadRepositories();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const loadRepositories = async () => {
    try {
      const repoList = await api.get('/github/repos');
      setRepos(repoList || []);
    } catch (err) {
      console.warn('Real GitHub App not configured or token expired, using mock repository list for simulation.');
      // Graceful fallback simulation mock repositories
      setRepos([
        { id: 101, name: 'sre-copilot-backend', full_name: 'acme-org/sre-copilot-backend', private: true },
        { id: 102, name: 'k8s-infrastructure', full_name: 'acme-org/k8s-infrastructure', private: true },
        { id: 103, name: 'react-dashboard', full_name: 'acme-org/react-dashboard', private: false },
      ]);
    }
  };

  const handleSimulateInstall = async () => {
    setInstalling(true);
    setError('');
    try {
      // Simulate setup callback redirection
      await api.get('/github/setup?installation_id=54321&setup_action=install');
      await loadRepositories();
    } catch (err: any) {
      setError(err.message || 'Failed to bind simulated installation.');
    } finally {
      setInstalling(false);
    }
  };

  const handleConnectProject = async (repo: any) => {
    setConnectingRepo(repo.full_name);
    setError('');
    try {
      const res = await api.post('/triage/projects', {
        name: repo.name,
        repoFullName: repo.full_name,
        githubRepoId: repo.id,
      });
      // Refresh dashboard
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to connect repository as project.');
    } finally {
      setConnectingRepo(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading active organization environment...</p>
      </div>
    );
  }

  // --- EMPTY STATE CONNECT REPO FLOW ---
  if (projects.length === 0) {
    const filteredRepos = repos.filter((r) =>
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="max-w-4xl mx-auto py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Set Up Your Sandbox
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
            Connect a GitHub repository via our GitHub App to ingest CI failure logs and run vector search similarity analysis.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {repos.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl text-center">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/30 mx-auto mb-4">
              <Github className="w-7 h-7 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Connect GitHub App</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
              Install the Incident Triage App to authorize repository access.
            </p>
            <button
              onClick={handleSimulateInstall}
              disabled={installing}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {installing ? 'Connecting...' : 'Connect GitHub App'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Select Repository</h3>
                <p className="text-xs text-slate-500">Pick an authorized repository to import</p>
              </div>
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-indigo-500 outline-none text-slate-200 text-xs w-64 transition"
              />
            </div>

            <div className="divide-y divide-slate-850 max-h-80 overflow-y-auto">
              {filteredRepos.length > 0 ? (
                filteredRepos.map((repo) => (
                  <div key={repo.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Folder className="w-5 h-5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{repo.full_name}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                          {repo.private ? 'Private' : 'Public'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConnectProject(repo)}
                      disabled={connectingRepo === repo.full_name}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition text-xs font-semibold disabled:opacity-50"
                    >
                      {connectingRepo === repo.full_name ? 'Connecting...' : 'Connect Repo'}
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No repositories match your filter.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between text-xs text-slate-500">
              <span>Need access to other repositories?</span>
              <button
                onClick={handleSimulateInstall}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition"
              >
                Re-install GitHub App
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- STANDARD DASHBOARD VIEW ---
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          Workspace Dashboard
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Monitor connected codebases, active build failures, and automated AI analysis.
        </p>
      </div>

      {/* Grid connected projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/${orgSlug}/projects/${project.slug}/incidents`}
            className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/40 shadow-xl backdrop-blur-md hover:scale-[1.01] transition flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20 mb-4 group-hover:bg-indigo-500/20 transition">
                <Folder className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-200 group-hover:text-indigo-300 transition">
                {project.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">{project.repoFullName || 'Generic Webhook'}</p>
            </div>
            
            <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Active Incidents
              </span>
              <div className="flex items-center gap-1 text-indigo-400 font-semibold">
                <span>View logs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
