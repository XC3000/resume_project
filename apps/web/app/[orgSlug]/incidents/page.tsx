'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ShieldAlert, AlertTriangle, CheckCircle, Clock, Search, Folder, ChevronDown, Loader2 } from 'lucide-react';

export default function OrgIncidentsPage() {
  const { orgSlug } = useParams() as { orgSlug: string };

  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Filter states
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadIncidentsData();
  }, [orgSlug]);

  const loadIncidentsData = async () => {
    setLoading(true);
    setError('');
    try {
      const [incList, projList] = await Promise.all([
        api.get('/triage/incidents'),
        api.get('/triage/projects'),
      ]);
      setIncidents(incList || []);
      setProjects(projList || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load incidents list.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'HIGH':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'RESOLVED') {
      return (
        <span className="flex items-center gap-1 text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider">
          <CheckCircle className="w-3 h-3" />
          Resolved
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider">
        <Clock className="w-3 h-3" />
        Open
      </span>
    );
  };

  // Filter logic
  const filteredIncidents = incidents.filter((inc) => {
    if (selectedProject !== 'ALL' && inc.projectId !== selectedProject) return false;
    if (selectedStatus !== 'ALL' && inc.status !== selectedStatus) return false;
    if (selectedSeverity !== 'ALL' && inc.severity !== selectedSeverity) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = inc.title.toLowerCase().includes(query);
      const matchClassification = inc.classification?.toLowerCase().includes(query);
      const matchHint = inc.rootCauseHint?.toLowerCase().includes(query);
      return matchTitle || matchClassification || matchHint;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Gathering organization failure reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
          CI Failure Incidents
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review classified workflow failures and trace root cause evidence.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Filter toolbar card */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-lg backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search stack traces, cause..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 focus:border-indigo-500 outline-none text-slate-200 text-xs transition"
          />
        </div>

        <div className="w-full md:w-auto flex flex-wrap gap-3 items-center">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Project:</span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-transparent text-slate-350 outline-none pr-2 cursor-pointer font-medium"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-slate-355 outline-none pr-2 cursor-pointer font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent text-slate-355 outline-none pr-2 cursor-pointer font-medium"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents list container */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        {filteredIncidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No incidents matched your active filters selection.
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {filteredIncidents.map((incident) => {
              const proj = projects.find((p) => p.id === incident.projectId);
              return (
                <Link
                  key={incident.id}
                  href={`/${orgSlug}/projects/${proj?.slug || 'unknown'}/incidents/${incident.id}`}
                  className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-850 shrink-0 group-hover:bg-slate-900 transition">
                      {incident.severity === 'CRITICAL' ? (
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center flex-wrap gap-2">
                        <h3 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition">
                          {incident.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${getSeverityBadge(incident.severity)}`}>
                          {incident.severity}
                        </span>
                        {getStatusBadge(incident.status)}
                        {proj && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider bg-slate-950/80 border border-slate-850 px-2 py-0.5 rounded">
                            <Folder className="w-3 h-3" />
                            {proj.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-xl line-clamp-1">
                        {incident.rootCauseHint || 'AI analysis pending... Ingesting log logs.'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-2.5">
                        Detected {new Date(incident.detectedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500 group-hover:text-indigo-400 transition text-xs font-semibold shrink-0">
                    <span>Inspect Log</span>
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
