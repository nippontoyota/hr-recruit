import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'whatsapp';
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'md' | 'lg' | 'xl' | 'full';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', rounded = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary shadow-sm',
      secondary: 'bg-surface text-text-primary border border-border hover:bg-background focus:ring-border shadow-sm',
      danger: 'bg-danger text-white hover:brightness-90 focus:ring-danger shadow-sm',
      ghost: 'bg-transparent text-text-primary hover:bg-background focus:ring-border',
      whatsapp: 'bg-success text-white hover:brightness-90 focus:ring-success shadow-sm',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const roundedMap = {
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          roundedMap[rounded],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
