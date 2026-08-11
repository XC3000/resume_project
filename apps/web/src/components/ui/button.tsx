import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => {
    // Inline style fallback for crisp rendering
    const variantStyle: React.CSSProperties =
      variant === 'secondary'
        ? { background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' }
        : variant === 'outline'
        ? { background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }
        : variant === 'ghost'
        ? { background: 'transparent', color: '#475569', border: 'none' }
        : variant === 'destructive'
        ? { background: '#ef4444', color: '#ffffff', border: 'none' }
        : { background: '#0f172a', color: '#ffffff', border: 'none' };

    const sizeStyle: React.CSSProperties =
      size === 'sm'
        ? { padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }
        : size === 'icon'
        ? { width: '36px', height: '36px', padding: 0, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
        : { padding: '8px 16px', fontSize: '0.875rem', borderRadius: '8px' };

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        style={{
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontFamily: 'inherit',
          ...variantStyle,
          ...sizeStyle,
          ...style,
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
