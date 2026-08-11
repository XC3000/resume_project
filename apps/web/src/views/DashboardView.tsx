import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from '@tanstack/react-router';
import { Card, StatusBadge } from '@repo/ui';
import { User, LogOut, ShieldCheck, Database, Zap, Key, Calendar, Mail, Github, CheckCircle2, Lock } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user, token, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
        <Lock size={48} color="#6366f1" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '8px' }}>Authentication Required</h2>
        <p style={{ marginBottom: '24px' }}>You must be signed in to view your dashboard session.</p>
        <Link
          to="/signin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: '/signin' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top User Profile Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 30px rgba(99, 102, 241, 0.12)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Avatar Image */}
          <div style={{ position: 'relative' }}>
            <img
              src={user.avatar}
              alt={user.name}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(99, 102, 241, 0.6)',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#22c55e',
                border: '2px solid #0f172a',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {user.name}
              </h2>
              {user.provider === 'github' ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <Github size={12} />
                  GitHub OAuth
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <Mail size={12} />
                  Email Verified
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0 0 4px 0' }}>
              @{user.username} • {user.email}
            </p>
            {user.bio && (
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>
                {user.bio}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSignOut}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#fca5a5',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* Upstash Redis Session Info Box */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} color="#c084fc" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Upstash Redis Session State
            </h3>
          </div>
          <StatusBadge status="connected" label="Session Active (24h TTL)" />
        </div>

        <p style={{ fontSize: '0.825rem', color: '#9ca3af', margin: 0 }}>
          Your authentication session is backed by key-value storage in Upstash Redis. Below is your active bearer session token:
        </p>

        <div
          style={{
            background: '#090d16',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '12px 16px',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            color: '#38bdf8',
            wordBreak: 'break-all',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Key size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
          <span>session:{token || 'offline_demo_session_token'}</span>
        </div>
      </div>

      {/* Grid of Dummy Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <Card title="Account Details" icon={<User />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: '#d1d5db' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>User ID:</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>{user.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Auth Provider:</span>
              <span style={{ fontWeight: 600, color: '#c084fc' }}>
                {user.provider === 'github' ? 'GitHub OAuth 2.0' : 'Better-Auth Password'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Location:</span>
              <span style={{ fontWeight: 600 }}>{user.location || 'San Francisco, CA'}</span>
            </div>
          </div>
        </Card>

        <Card title="GitHub Integration" icon={<Github />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: '#d1d5db' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Public Repositories:</span>
              <span style={{ fontWeight: 600, color: '#4ade80' }}>{user.publicRepos || 42} repos</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Sync Status:</span>
              <span style={{ fontWeight: 600, color: '#38bdf8' }}>Connected</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Webhook Triage:</span>
              <span style={{ fontWeight: 600, color: '#818cf8' }}>Enabled</span>
            </div>
          </div>
        </Card>

        <Card title="Security & Storage" icon={<ShieldCheck />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', color: '#d1d5db' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Session Store:</span>
              <span style={{ fontWeight: 600, color: '#a855f7' }}>Upstash Redis REST</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Database ORM:</span>
              <span style={{ fontWeight: 600, color: '#38bdf8' }}>Supabase PostgreSQL</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9ca3af' }}>Session TTL:</span>
              <span style={{ fontWeight: 600, color: '#4ade80' }}>24 Hours</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
