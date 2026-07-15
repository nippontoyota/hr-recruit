import type { PipelineStage } from '../types';
import type { BadgeProps } from '../components/ui/Badge';

export function stageLabel(stage: PipelineStage | string): string {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function stageColor(stage: PipelineStage): string {
  switch (stage) {
    case 'HIRED':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300 border-dashed';
    case 'SCREENING':
      return 'bg-sky-100 text-sky-700 border-sky-300 border-dashed';
    case 'CANDIDATE_FORM':
      return 'bg-purple-100 text-purple-700 border-purple-300 border-dashed';
    case 'BRANCH_EVALUATION':
      return 'bg-indigo-100 text-indigo-700 border-indigo-300 border-dashed';
    case 'HQ_EVALUATION':
      return 'bg-teal-100 text-teal-700 border-teal-300 border-dashed';
    case 'REJECTED':
      return 'bg-red-100 text-red-700 border-red-300 border-dashed';
    case 'ON_HOLD':
      return 'bg-amber-100 text-amber-700 border-amber-300 border-dashed';
    default:
      return 'bg-background text-text-secondary border border-border';
  }
}

export function getStageBadgeVariant(stage: PipelineStage | string): BadgeProps['variant'] {
  if (stage === 'REJECTED') return 'destructive';
  if (stage === 'HIRED') return 'success';
  if (stage === 'ON_HOLD') return 'warning';
  if (stage === 'SCREENING') return 'sky';
  if (stage === 'CANDIDATE_FORM') return 'purple';
  if (stage === 'BRANCH_EVALUATION') return 'indigo';
  if (stage === 'HQ_EVALUATION') return 'teal';
  return 'secondary';
}
