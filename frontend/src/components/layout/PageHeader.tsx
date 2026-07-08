import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, action, className }: PageHeaderProps) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4', className)}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
