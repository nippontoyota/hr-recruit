import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, errorMessage, rightElement, id, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const errorId = id && errorMessage ? `${id}-error` : undefined;
    const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          id={id}
          aria-invalid={error || undefined}
          aria-describedby={describedBy}
          aria-errormessage={errorId}
          className={cn(
            'flex min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-1 text-sm transition-[border-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50',
            rightElement && 'pr-10',
            error && 'border-danger text-danger',
            className
          )}
          {...props}
        />
        {errorMessage && errorId && (
          <p id={errorId} className="mt-1 text-xs text-danger" role="alert">
            {errorMessage}
          </p>
        )}
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
