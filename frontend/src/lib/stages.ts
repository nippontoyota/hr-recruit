import type { PipelineStage } from '../types';
import type { BadgeProps } from '../components/ui/Badge';

export function stageLabel(stage?: PipelineStage | string | null): string {
  if (!stage) return 'Unknown';
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function stageColor(stage?: PipelineStage | string | null): string {
  if (!stage) return 'bg-background text-text-secondary border border-border';
  switch (stage) {
    case 'HIRED':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300 border-dashed';
    case 'SCREENING':
      return 'bg-sky-100 text-sky-700 border-sky-300 border-dashed';
    case 'CANDIDATE_FORM':
      return 'bg-purple-100 text-purple-700 border-purple-300 border-dashed';
    case 'BRANCH_INTERVIEW':
      return 'bg-indigo-100 text-indigo-700 border-indigo-300 border-dashed';
    case 'FINAL_APPROVAL':
      return 'bg-teal-100 text-teal-700 border-teal-300 border-dashed';
    case 'REJECTED':
      return 'bg-red-100 text-red-700 border-red-300 border-dashed';
    case 'ON_HOLD':
      return 'bg-amber-100 text-amber-700 border-amber-300 border-dashed';
    default:
      return 'bg-background text-text-secondary border border-border';
  }
}

export function getStageBadgeVariant(stage?: PipelineStage | string | null): BadgeProps['variant'] {
  if (!stage) return 'secondary';
  if (stage === 'REJECTED') return 'destructive';
  if (stage === 'HIRED') return 'success';
  if (stage === 'ON_HOLD') return 'warning';
  if (stage === 'SCREENING') return 'sky';
  if (stage === 'CANDIDATE_FORM') return 'purple';
  if (stage === 'BRANCH_INTERVIEW') return 'indigo';
  if (stage === 'FINAL_APPROVAL') return 'teal';
  return 'secondary';
}

const SOURCE_LABELS: Record<string, string> = {
  WALK_IN: 'Walk-in',
  INDEED: 'Indeed',
  NAUKRI: 'Naukri',
  REFERRAL: 'Referral',
  CAMPUS: 'Campus',
  LINKEDIN: 'LinkedIn',
  OTHER: 'Other',
};

export function formatSource(source: string | undefined | null): string {
  if (!source) return 'Direct';
  return SOURCE_LABELS[source.toUpperCase()] ?? source.replace(/_/g, ' ');
}

