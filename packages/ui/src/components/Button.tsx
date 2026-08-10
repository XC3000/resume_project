import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  disabled,
  style,
  ...props
}) => {
  const getStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '10px 18px',
      borderRadius: '10px',
      fontWeight: 600,
      fontSize: '0.9rem',
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      opacity: disabled || isLoading ? 0.6 : 1,
      transition: 'all 0.2s ease',
      border: 'none',
      outline: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    };

    if (variant === 'primary') {
      return {
        ...base,
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: '#ffffff',
        boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
      };
    }

    if (variant === 'secondary') {
      return {
        ...base,
        background: 'rgba(255, 255, 255, 0.1)',
        color: '#f3f4f6',
      };
    }

    return {
      ...base,
      background: 'transparent',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      color: '#f3f4f6',
    };
  };

  return (
    <button disabled={disabled || isLoading} style={{ ...getStyles(), ...style }} {...props}>
      {isLoading && (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}
      {children}
    </button>
  );
};
