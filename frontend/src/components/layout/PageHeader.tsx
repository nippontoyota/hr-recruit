import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  action?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, action, className }: PageHeaderProps) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4', className)}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
