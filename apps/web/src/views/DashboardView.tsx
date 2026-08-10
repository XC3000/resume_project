import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, StatusBadge, Button } from '@repo/ui';
import { HealthCheckResponse } from '@repo/types';
import { Server, Database, Zap, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { data, refetch, isFetching } = useQuery<HealthCheckResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      return res.json();
    },
    refetchInterval: 15000,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '20px',
          padding: '32px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '700px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <StatusBadge status="connected" label="Turborepo Monorepo Active" />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px', lineHeight: 1.2 }}>
            React (TanStack SPA) & NestJS Backend
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '1rem', marginBottom: '24px' }}>
            Fully configured client-side rendering (No SSR) monorepo setup ready for single Render web service deployment. Integrates Supabase PostgreSQL & Upstash Redis.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="primary" onClick={() => refetch()} isLoading={isFetching}>
              <RefreshCw size={16} />
              Ping Health Checks
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of System Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* NestJS Web Host */}
        <Card
          title="NestJS App Server"
          icon={<Server />}
          extra={<StatusBadge status={data?.server?.status === 'ok' ? 'ok' : 'error'} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#d1d5db' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Environment:</span>
              <span style={{ fontWeight: 600 }}>{data?.server?.environment || 'development'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Uptime:</span>
              <span style={{ fontWeight: 600 }}>{data?.server?.uptimeSeconds !== undefined ? `${data.server.uptimeSeconds}s` : '---'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>SPA Renderer:</span>
              <span style={{ fontWeight: 600, color: '#818cf8' }}>@nestjs/serve-static</span>
            </div>
          </div>
        </Card>

        {/* Supabase Database */}
        <Card
          title="Supabase PostgreSQL"
          icon={<Database />}
          extra={<StatusBadge status={data?.supabaseDatabase?.status || 'unconfigured'} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#d1d5db' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>ORM Layer:</span>
              <span style={{ fontWeight: 600, color: '#38bdf8' }}>Prisma ORM 5</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Message:</span>
              <span style={{ fontWeight: 500, fontSize: '0.8rem', textAlign: 'right', color: '#9ca3af' }}>
                {data?.supabaseDatabase?.message || 'Check DATABASE_URL in .env'}
              </span>
            </div>
            {data?.supabaseDatabase?.latencyMs !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Ping Latency:</span>
                <span style={{ fontWeight: 600, color: '#4ade80' }}>{data.supabaseDatabase.latencyMs}ms</span>
              </div>
            )}
          </div>
        </Card>

        {/* Upstash Redis */}
        <Card
          title="Upstash Redis"
          icon={<Zap />}
          extra={<StatusBadge status={data?.upstashRedis?.status || 'unconfigured'} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#d1d5db' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Client Type:</span>
              <span style={{ fontWeight: 600, color: '#c084fc' }}>@upstash/redis REST</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Status Message:</span>
              <span style={{ fontWeight: 500, fontSize: '0.8rem', textAlign: 'right', color: '#9ca3af' }}>
                {data?.upstashRedis?.message || 'Check UPSTASH_REDIS credentials'}
              </span>
            </div>
            {data?.upstashRedis?.latencyMs !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af' }}>Ping Latency:</span>
                <span style={{ fontWeight: 600, color: '#4ade80' }}>{data.upstashRedis.latencyMs}ms</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Tech Stack Specs */}
      <Card title="Monorepo Architecture Overview" icon={<Layers />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            { title: 'Turborepo Workspaces', desc: 'Cached builds & shared TypeScript configs across apps & packages.' },
            { title: 'TanStack Router', desc: 'Type-safe client side routing without SSR bundle bloat.' },
            { title: 'TanStack Query', desc: 'Smart async state management, automatic refetching & query caching.' },
            { title: 'Prisma + Supabase', desc: 'PostgreSQL connection pooling with direct migration support.' },
          ].map((spec, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <CheckCircle2 size={16} color="#818cf8" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f3f4f6' }}>{spec.title}</h4>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>{spec.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
