import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, style, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      style={{
        height: '36px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        padding: '6px 12px',
        fontSize: '0.85rem',
        color: '#0f172a',
        outline: 'none',
        boxSizing: 'border-box',
        ...style,
      }}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
