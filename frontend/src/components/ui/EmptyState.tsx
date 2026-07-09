import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center bg-surface rounded-md border border-dashed border-border', className)}>
      <div className="mb-4 text-text-secondary">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-text-primary">{title}</h3>
      {description && <p className="mt-1 text-sm text-text-secondary max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
