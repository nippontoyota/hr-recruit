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
      return 'bg-success/10 text-success border-success border-dashed';
    case 'SCREENING':
    case 'CANDIDATE_FORM':
      return 'bg-info/10 text-info border-info border-dashed';
    case 'HR_INTERVIEW':
    case 'DEPARTMENT_INTERVIEW':
    case 'FINAL_APPROVAL':
      return 'bg-primary/10 text-primary border-primary border-dashed';
    case 'REJECTED':
      return 'bg-danger/10 text-danger border-danger border-dashed';
    case 'ON_HOLD':
      return 'bg-warning/10 text-warning border-warning border-dashed';
    default:
      return 'bg-background text-text-secondary border border-border';
  }
}

export function getStageBadgeVariant(stage: PipelineStage | string): BadgeProps['variant'] {
  if (stage === 'REJECTED') return 'destructive';
  if (stage === 'HIRED') return 'success';
  if (stage === 'ON_HOLD') return 'warning';
  if (stage === 'SCREENING' || stage === 'CANDIDATE_FORM') return 'info';
  if (stage === 'HR_INTERVIEW' || stage === 'DEPARTMENT_INTERVIEW' || stage === 'FINAL_APPROVAL') {
    return 'indigo';
  }
  return 'secondary';
}
