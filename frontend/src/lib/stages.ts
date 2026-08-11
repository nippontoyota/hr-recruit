import type { PipelineStage } from '../types';
import type { BadgeProps } from '../components/ui/Badge';

export function stageLabel(stage: PipelineStage | string): string {
  if (stage === 'CANDIDATE_FORM' || stage === 'CALL_LETTER') return 'CALL LETTER';
  if (stage === 'BRANCH_INTERVIEW' || stage === 'INTERVIEWS') return 'INTERVIEWS';
  if (stage === 'HO_INTERVIEWS') return 'INTERVIEWS';
  if (stage === 'SALARY_DETAILS') return 'SALARY DETAILS';
  if (stage === 'CSS') return 'CSS';
  if (stage === 'TEST') return 'TECHNICAL TEST';
  if (stage === 'SENT_TO_HO') return 'SENT TO HEAD OFFICE';
  return stage
    .replace(/_/g, ' ')
    .toUpperCase();
}

export function stageColor(stage: PipelineStage): string {
  switch (stage) {
    case 'HIRED':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300 border-dashed';
    case 'SCREENING':
      return 'bg-sky-100 text-sky-700 border-sky-300 border-dashed';
    case 'CANDIDATE_FORM':
      return 'bg-purple-100 text-purple-700 border-purple-300 border-dashed';
    case 'BRANCH_INTERVIEW':
      return 'bg-indigo-100 text-indigo-700 border-indigo-300 border-dashed';
    case 'HO_INTERVIEWS':
      return 'bg-blue-100 text-blue-700 border-blue-300 border-dashed';
    case 'SALARY_DETAILS':
      return 'bg-cyan-100 text-cyan-700 border-cyan-300 border-dashed';
    case 'CSS':
      return 'bg-teal-100 text-teal-700 border-teal-300 border-dashed';
    case 'FINAL_APPROVAL':
      return 'bg-teal-100 text-teal-700 border-teal-300 border-dashed';
    case 'REJECTED':
      return 'bg-red-100 text-red-700 border-red-300 border-dashed';
    case 'ON_HOLD':
      return 'bg-amber-100 text-amber-700 border-amber-300 border-dashed';
    case 'CALL_LETTER':
      return 'bg-purple-100 text-purple-700 border-purple-300 border-dashed';
    case 'INTERVIEWS':
      return 'bg-indigo-100 text-indigo-700 border-indigo-300 border-dashed';
    case 'TEST':
      return 'bg-blue-100 text-blue-700 border-blue-300 border-dashed';
    case 'BACKGROUND_VERIFICATION':
      return 'bg-teal-100 text-teal-700 border-teal-300 border-dashed';
    case 'APPLICATION':
      return 'bg-sky-100 text-sky-700 border-sky-300 border-dashed';
    case 'SENT_TO_HO':
      return 'bg-pink-100 text-pink-700 border-pink-300 border-dashed';
    default:
      return 'bg-background text-text-secondary border border-border';
  }
}

export function getStageBadgeVariant(stage: PipelineStage | string): BadgeProps['variant'] {
  if (stage === 'REJECTED') return 'destructive';
  if (stage === 'HIRED') return 'success';
  if (stage === 'ON_HOLD') return 'warning';
  if (stage === 'SCREENING') return 'sky';
  if (stage === 'CANDIDATE_FORM' || stage === 'CALL_LETTER') return 'purple';
  if (stage === 'BRANCH_INTERVIEW' || stage === 'INTERVIEWS') return 'indigo';
  if (stage === 'HO_INTERVIEWS') return 'blue';
  if (stage === 'SALARY_DETAILS') return 'cyan';
  if (stage === 'CSS') return 'teal';
  if (stage === 'FINAL_APPROVAL') return 'teal';
  if (stage === 'TEST') return 'info';
  if (stage === 'BACKGROUND_VERIFICATION') return 'teal';
  if (stage === 'APPLICATION') return 'sky';
  if (stage === 'SENT_TO_HO') return 'pink';
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

