"use client";

import { GitCommit, Server, Database, Cpu, Layers, ArrowRight, ShieldCheck } from "lucide-react";

export function ArchitectureShowcase() {
  const steps = [
    {
      title: "1. Webhook Ingestion",
      tech: "NestJS 11 + Express Raw Handler",
      desc: "Receives GitHub events with timing-safe HMAC SHA-256 signature verification.",
      icon: GitCommit,
      color: "border-cyan-500/40 text-cyan-400",
    },
    {
      title: "2. AI Vector Embedding",
      tech: "Gemini AI + Supabase pgvector",
      desc: "Generates 768-dim halfvec embeddings for similarity matching against historical issues.",
      icon: Cpu,
      color: "border-indigo-500/40 text-indigo-400",
    },
    {
      title: "3. Async Queue Dispatch",
      tech: "BullMQ + Upstash Redis TLS",
      desc: "Pushes non-blocking job payload to Upstash Redis over TLS for worker consumption.",
      icon: Layers,
      color: "border-purple-500/40 text-purple-400",
    },
    {
      title: "4. UI Resolution & Rollup",
      tech: "Next.js 15 + Better Auth",
      desc: "Renders real-time incident status and aggregated analytics rollups without Postgres row overhead.",
      icon: ShieldCheck,
      color: "border-emerald-500/40 text-emerald-400",
    },
  ];

  return (
    <section id="architecture" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">
            System Topology
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Built Under Strict Production Constraints
          </p>
          <p className="mt-4 text-base text-slate-400">
            Compliant with a 512MB backend RAM ceiling and a 500MB free-tier Postgres storage footprint.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="glass-panel rounded-2xl p-6 relative border hover:border-cyan-500/50 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className={`h-10 w-10 rounded-xl bg-slate-900 border ${step.color} flex items-center justify-center mb-5`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1.5">{step.title}</h3>
                  <span className="text-[11px] font-mono text-cyan-400 block mb-3">{step.tech}</span>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
