import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  action?: ReactNode;
  center?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, action, center, className }: PageHeaderProps) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative', className)}>
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      </div>
      
      {center && (
        <div className="flex-1 flex justify-center w-full">
          {center}
        </div>
      )}
      
      <div className="flex-1 flex sm:justify-end w-full">
        {action}
      </div>
    </div>
  );
};
