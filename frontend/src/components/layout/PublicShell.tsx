import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PublicShellProps {
  children: ReactNode;
  maxWidth?: 'md' | 'xl' | '2xl';
  className?: string;
}

const widthClass = {
  md: 'max-w-md',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
} as const;

export function PublicShell({ children, maxWidth = 'xl', className }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-content flex flex-col">
      <main className={cn('flex-1 py-8 sm:py-10 px-4 sm:px-6 lg:px-8', className)}>
        <div className={cn('mx-auto w-full', widthClass[maxWidth])}>{children}</div>
      </main>
      <footer className="border-t border-border bg-surface py-4 px-4 text-center text-xs text-text-secondary shrink-0">
        HR Recruitment Portal
      </footer>
    </div>
  );
}
