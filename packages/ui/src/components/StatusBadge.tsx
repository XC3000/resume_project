import React from 'react';

export interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'configured' | 'unconfigured' | 'error' | 'ok';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'connected':
      case 'ok':
        return {
          bg: 'rgba(34, 197, 94, 0.15)',
          color: '#4ade80',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          dot: '#22c55e',
        };
      case 'configured':
        return {
          bg: 'rgba(59, 130, 246, 0.15)',
          color: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          dot: '#3b82f6',
        };
      case 'disconnected':
      case 'error':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          dot: '#ef4444',
        };
      case 'unconfigured':
      default:
        return {
          bg: 'rgba(234, 179, 8, 0.15)',
          color: '#facc15',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          dot: '#eab308',
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.8rem',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
        border: style.border,
        textTransform: 'capitalize',
        letterSpacing: '0.02em',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: style.dot,
          boxShadow: `0 0 8px ${style.dot}`,
        }}
      />
      {label || status}
    </span>
  );
};
