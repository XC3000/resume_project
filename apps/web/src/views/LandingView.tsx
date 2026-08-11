import React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { Card, StatusBadge } from '@repo/ui';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Database,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Layers,
  Github,
  LogIn,
  UserPlus,
  Terminal,
  Clock,
} from 'lucide-react';

export const LandingView: React.FC = () => {
  const { user, signInWithGithub } = useAuth();
  const navigate = useNavigate();

  const handleGithubClick = async () => {
    if (user) {
      navigate({ to: '/dashboard' });
    } else {
      const res = await signInWithGithub();
      if (res.success) {
        navigate({ to: '/dashboard' });
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '64px', paddingBottom: '40px' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', maxWidth: '900px', margin: '20px auto 0 auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '30px',
            padding: '6px 16px',
            fontSize: '0.85rem',
            color: '#818cf8',
            fontWeight: 600,
            marginBottom: '24px',
          }}
        >
          <Sparkles size={16} color="#818cf8" />
          <span>Next-Gen Autonomous Incident Triage Engine</span>
        </div>

        <h1
          style={{
            fontSize: '3.25rem',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Automate Production Triage & Monitor System Health
        </h1>

        <p
          style={{
            fontSize: '1.15rem',
            color: '#9ca3af',
            lineHeight: 1.6,
            marginBottom: '36px',
            maxWidth: '750px',
            margin: '0 auto 36px auto',
          }}
        >
          Detect anomalies, inspect Redis session caches, and resolve Supabase database bottlenecks in seconds with AI-driven root cause analysis.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
          {user ? (
            <Link
              to="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '1rem',
                textDecoration: 'none',
                boxShadow: '0 4px 25px rgba(99, 102, 241, 0.45)',
                transition: 'transform 0.2s',
              }}
            >
              <span>Go to My Dashboard</span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  padding: '14px 28px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 25px rgba(99, 102, 241, 0.45)',
                }}
              >
                <UserPlus size={18} />
                <span>Create Free Account</span>
              </Link>

              <button
                onClick={handleGithubClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  padding: '14px 24px',
                  borderRadius: '14px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Github size={20} />
                <span>Continue with GitHub</span>
              </button>

              <Link
                to="/signin"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'transparent',
                  color: '#9ca3af',
                  padding: '14px 20px',
                  borderRadius: '14px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  textDecoration: 'none',
                }}
              >
                <LogIn size={18} />
                <span>Sign In</span>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Live Interactive Triage Console Demo (Dummy Data) */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(99, 102, 241, 0.15)',
          }}
        >
          {/* Mock Window Header */}
          <div
            style={{
              background: 'rgba(9, 13, 22, 0.9)',
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#eab308' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: '0.8rem', color: '#9ca3af', marginLeft: '12px', fontFamily: 'monospace' }}>
                triage-ai://live-monitor/prod-cluster
              </span>
            </div>
            <StatusBadge status="connected" label="Live Stream" />
          </div>

          {/* Console Content */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Terminal size={18} color="#818cf8" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Real-time Incident Feed & Root Cause Analysis
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                Refreshed: Just now
              </span>
            </div>

            {/* Dummy Incidents List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                {
                  id: 'INC-8942',
                  service: 'upstash-redis-cluster',
                  type: 'Session Cache Hit Rate High',
                  status: 'RESOLVED',
                  statusColor: '#22c55e',
                  latency: '14ms',
                  time: '2 mins ago',
                },
                {
                  id: 'INC-8941',
                  service: 'supabase-postgres-pooler',
                  type: 'Connection Pool Spike Handled',
                  status: 'MONITORING',
                  statusColor: '#38bdf8',
                  latency: '42ms',
                  time: '8 mins ago',
                },
                {
                  id: 'INC-8940',
                  service: 'github-webhook-triage',
                  type: 'Auto PR Triage Triggered',
                  status: 'COMPLETED',
                  statusColor: '#a855f7',
                  latency: '120ms',
                  time: '15 mins ago',
                },
              ].map((inc) => (
                <div
                  key={inc.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#818cf8' }}>{inc.id}</span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>{inc.service}</span>
                    <span style={{ color: '#9ca3af' }}>• {inc.type}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {inc.time}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#4ade80', fontFamily: 'monospace' }}>{inc.latency}</span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: inc.statusColor,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${inc.statusColor}44`,
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {inc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
            Built for Modern Engineering Teams
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '1rem', margin: 0 }}>
            Seamless integration with your tech stack and authentication workflows.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          {[
            {
              title: 'Better Auth Integration',
              desc: 'Secure session management backed by Upstash Redis key-value storage and 24h bearer tokens.',
              icon: <ShieldCheck size={24} color="#818cf8" />,
            },
            {
              title: 'GitHub OAuth 2.0',
              desc: 'Instant one-click developer signup and repository sync with pre-populated developer profiles.',
              icon: <Github size={24} color="#a855f7" />,
            },
            {
              title: 'Supabase PostgreSQL',
              desc: 'Direct connection pooling via Prisma ORM for lightning fast database query execution.',
              icon: <Database size={24} color="#38bdf8" />,
            },
            {
              title: 'Upstash Redis Caching',
              desc: 'Sub-millisecond REST caching layer for high concurrency traffic and session verification.',
              icon: <Zap size={24} color="#c084fc" />,
            },
          ].map((feat, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {feat.icon}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>{feat.title}</h3>
              <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '24px',
          padding: '40px 32px',
          textAlign: 'center',
          maxWidth: '1100px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          {[
            { metric: '99.99%', label: 'Uptime SLA' },
            { metric: '< 12ms', label: 'Average Redis Latency' },
            { metric: '24/7', label: 'Automated Monitoring' },
            { metric: '10,000+', label: 'Incidents Triaged' },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', marginBottom: '4px' }}>
                {stat.metric}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
          Ready to Get Started?
        </h2>
        <p style={{ fontSize: '1rem', color: '#9ca3af', marginBottom: '28px' }}>
          Sign in or create your account to unlock your personalized incident triage dashboard.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
          <Link
            to={user ? '/dashboard' : '/signup'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            <span>{user ? 'Go to Dashboard' : 'Sign Up Free'}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
};
