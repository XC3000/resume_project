"use client";

import { Check, Sparkles, ArrowRight } from "lucide-react";

export function Pricing() {
  const tiers = [
    {
      name: "Free Developer",
      price: "$0",
      period: "forever",
      description: "Ideal for open-source maintainers and indie developers.",
      features: [
        "Up to 50,000 tokens/month",
        "1 GitHub Repository",
        "pgvector halfvec(768) search",
        "Upstash Redis shared queue",
        "Community Support",
      ],
      highlight: false,
      cta: "Get Started Free",
    },
    {
      name: "Pro Team",
      price: "$49",
      period: "per month",
      description: "For scaling engineering teams requiring real-time incident resolution.",
      features: [
        "Up to 500,000 tokens/month",
        "Unlimited Repositories",
        "Dedicated BullMQ Queue Workers",
        "Better Auth RBAC & API Keys",
        "Priority Triage SLAs",
        "Direct Slack & Webhook Dispatch",
      ],
      highlight: true,
      cta: "Start 14-Day Free Trial",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "billed annually",
      description: "Custom deployment with dedicated Postgres and custom LLM embeddings.",
      features: [
        "Custom Token & Event Capacity",
        "Self-Hosted Supabase / Postgres",
        "SAML SSO & Audit Logs",
        "24/7 Incident Hotline",
        "Dedicated Solutions Engineer",
      ],
      highlight: false,
      cta: "Contact Enterprise Sales",
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-slate-950/40 relative border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">
            Transparent Pricing
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Flexible Plans for Every Team Size
          </p>
          <p className="mt-4 text-base text-slate-400">
            Start free with full vector search capabilities. Upgrade as your incident volume grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className={`rounded-2xl p-8 flex flex-col justify-between transition-all relative ${
                tier.highlight
                  ? "glass-panel border-cyan-500/80 shadow-2xl shadow-cyan-500/10 gradient-border"
                  : "glass-card border-slate-800"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">{tier.description}</p>
                <div className="flex items-baseline space-x-1 mb-6">
                  <span className="text-4xl font-black text-white">{tier.price}</span>
                  <span className="text-xs text-slate-500 font-medium">/ {tier.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center space-x-3 text-xs text-slate-300">
                      <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  tier.highlight
                    ? "bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                    : "bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{tier.cta}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
