import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, StatusBadge, Button } from '@repo/ui';
import { HealthCheckResponse } from '@repo/types';
import { Server, Database, Zap, RefreshCw, LogIn, UserPlus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { swaggerApiClient } from '../lib/swagger-client';

export const OverviewView: React.FC = () => {
  const { user } = useAuth();
  const { data, refetch, isFetching } = useQuery<HealthCheckResponse>({
    queryKey: ['health'],
    queryFn: async () => {
      return swaggerApiClient.health.getHealth();
    },
    refetchInterval: 15000,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '24px',
          padding: '40px 32px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ maxWidth: '750px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <StatusBadge status="connected" label="Triage AI Architecture Active" />
          </div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px', lineHeight: 1.2 }}>
            Next-Gen Incident Triage & Better Auth
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '1.05rem', marginBottom: '28px', lineHeight: 1.5 }}>
            React SPA powered by Vite, NestJS, Supabase PostgreSQL, and Upstash Redis session management with GitHub OAuth & Email Authentication.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
            {user ? (
              <Link
                to="/dashboard"
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
                Go to My Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/signin"
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
                  <LogIn size={18} />
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    textDecoration: 'none',
                  }}
                >
                  <UserPlus size={18} />
                  Sign Up with GitHub
                </Link>
              </>
            )}
            <Button variant="primary" onClick={() => refetch()} isLoading={isFetching}>
              <RefreshCw size={16} />
              Ping System Health
            </Button>
          </div>
        </div>
      </div>

      {/* System Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <Card
          title="NestJS App & Auth API"
          icon={<Server />}
          extra={<StatusBadge status={data?.server?.status === 'ok' ? 'ok' : 'connected'} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#d1d5db' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Environment:</span>
              <span style={{ fontWeight: 600 }}>{data?.server?.environment || 'development'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Auth Endpoints:</span>
              <span style={{ fontWeight: 600, color: '#818cf8' }}>/api/auth/*</span>
            </div>
          </div>
        </Card>

        <Card
          title="Supabase Database"
          icon={<Database />}
          extra={<StatusBadge status={data?.supabaseDatabase?.status || 'unconfigured'} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#d1d5db' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>ORM Layer:</span>
              <span style={{ fontWeight: 600, color: '#38bdf8' }}>Prisma ORM 5</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>User Records:</span>
              <span style={{ fontWeight: 600, color: '#4ade80' }}>Stored</span>
            </div>
          </div>
        </Card>

        <Card
          title="Upstash Redis Sessions"
          icon={<Zap />}
          extra={<StatusBadge status={data?.upstashRedis?.status || 'connected'} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#d1d5db' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Session Keys:</span>
              <span style={{ fontWeight: 600, color: '#c084fc' }}>session:*</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>OAuth State:</span>
              <span style={{ fontWeight: 600, color: '#4ade80' }}>Persisted</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
