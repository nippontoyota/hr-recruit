import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import type { PipelineStage } from '../../types';
import { stageColor as getStageColor, stageLabel as getStageLabel } from '../../lib/constants';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export const Badge = ({ className, variant = 'default', children, ...props }: BadgeProps) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-orange-100 text-orange-800 border-orange-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export const StageBadge = ({ stage, className }: { stage: PipelineStage; className?: string }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
        getStageColor(stage),
        className
      )}
    >
      {getStageLabel(stage)}
    </span>
  );
};
