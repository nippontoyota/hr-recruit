import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { BrandMark } from './BrandMark';

interface PublicShellProps {
  children: ReactNode;
  maxWidth?: 'md' | 'xl' | '2xl';
  className?: string;
  title?: string;
  step?: string;
}

const widthClass = {
  md: 'max-w-md',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
} as const;

export function PublicShell({ children, maxWidth = 'xl', className, title, step }: PublicShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-content">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <BrandMark subtitle="Candidate services" />
          {(title || step) && (
            <div className="hidden text-right sm:block">
              {title && <p className="text-sm font-medium text-text-primary">{title}</p>}
              {step && <p className="text-xs text-text-secondary">{step}</p>}
            </div>
          )}
        </div>
      </header>
      <main className={cn('flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8', className)}>
        <div className={cn('mx-auto w-full', widthClass[maxWidth])}>{children}</div>
      </main>
      <footer className="border-t border-border px-4 py-4 text-center text-xs text-text-secondary">
        Keep this link private. For help, contact the HR recruiter who sent it.
      </footer>
    </div>
  );
}
