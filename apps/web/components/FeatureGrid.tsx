"use client";

import { Database, Zap, Key, GitPullRequest, Search, Server, Cpu, ShieldCheck } from "lucide-react";

export function FeatureGrid() {
  const features = [
    {
      title: "pgvector (halfvec 768)",
      description:
        "Custom $queryRaw parameterized SQL matching using halfvec(768) vector embeddings to detect duplicate incidents instantly without exceeding Postgres storage limits.",
      icon: Database,
      badge: "Prisma 6 + Supabase",
    },
    {
      title: "BullMQ & Upstash Redis",
      description:
        "Asynchronous, non-blocking queue processing for heavy triage jobs with automatic retry loops and rate-limiting across distributed workers.",
      icon: Zap,
      badge: "High Throughput",
    },
    {
      title: "Better Auth Integration",
      description:
        "Unified authentication layer supporting GitHub OAuth, session cookies, API Key guards, and multi-tenant RBAC permissions.",
      icon: Key,
      badge: "Security Standard",
    },
    {
      title: "Timing-Safe Webhooks",
      description:
        "NestJS raw body stream preservation enabling timingSafeEqual HMAC SHA-256 signature verification for incoming GitHub repo webhooks.",
      icon: GitPullRequest,
      badge: "GitHub Webhooks",
    },
    {
      title: "Severity Classification",
      description:
        "Automated root-cause scoring assigning P0 (Critical) through P3 (Minor) tiers with suggested PR fixes generated via Gemini AI.",
      icon: Search,
      badge: "AI Categorization",
    },
    {
      title: "512MB RAM Ceiling Compliant",
      description:
        "Architected with zero in-process ML models. All embeddings and classifications stream directly from high-speed external API providers.",
      icon: Cpu,
      badge: "Lightweight Engine",
    },
  ];

  return (
    <section id="features" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">
            Core Capabilities
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Engineered for High-Reliability Engineering Teams
          </p>
          <p className="mt-4 text-base text-slate-400">
            A production-grade NestJS + Next.js architecture built to handle real-world incident workloads at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="glass-panel rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:border-cyan-500/40 transition-all">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800/40">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
