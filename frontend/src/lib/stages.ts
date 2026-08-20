import type { Candidate, PipelineStage } from '../types';
import { getCandidateWorkState } from './candidateWork';
import type { BadgeProps } from '../components/ui/Badge';

export function stageLabel(stage: PipelineStage | string): string {
  if (stage === 'CANDIDATE_FORM' || stage === 'CALL_LETTER') return 'INITIAL REVIEW';
  if (stage === 'BRANCH_INTERVIEW' || stage === 'INTERVIEWS') return 'INTERVIEWS';
  if (stage === 'HO_HR_INTERVIEW' || stage === 'HO_DEPT_INTERVIEW' || stage === 'HO_INTERVIEWS') return 'INTERVIEWS';
  if (stage === 'CSS') return 'CSS';
  if (stage === 'TEST') return 'TECHNICAL TEST';
  if (stage === 'SENT_TO_HO') return 'SENT TO HEAD OFFICE';
  return stage
    .replace(/_/g, ' ')
    .toUpperCase();
}

export function getStageBadgeVariant(stage: PipelineStage | string): BadgeProps['variant'] {
  if (stage === 'REJECTED') return 'destructive';
  if (stage === 'HIRED') return 'success';
  if (stage === 'ON_HOLD') return 'warning';
  if (stage === 'SENT_TO_HO') return 'info';
  return 'secondary';
}

export function stageColor(stage: PipelineStage): string {
  switch (stage) {
    case 'HIRED':
      return 'bg-success/10 text-success border-success/20';
    case 'REJECTED':
      return 'bg-danger/10 text-danger border-danger/20';
    case 'ON_HOLD':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'SENT_TO_HO':
      return 'bg-info/10 text-info border-info/20';
    default:
      return 'bg-muted text-text-secondary border-border';
  }
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

export type CandidateQueue =
  | 'NEEDS_ACTION'
  | 'WAITING_FOR_CANDIDATE'
  | 'WAITING_FOR_HO'
  | 'READY_FOR_OFFER'
  | 'ON_HOLD'
  | 'STALLED';

export const QUEUE_DEFINITIONS: Array<{ key: CandidateQueue; label: string }> = [
  { key: 'NEEDS_ACTION', label: 'Needs my action' },
  { key: 'WAITING_FOR_CANDIDATE', label: 'Waiting for candidate response' },
  { key: 'WAITING_FOR_HO', label: 'Waiting for Head Office' },
  { key: 'READY_FOR_OFFER', label: 'Ready for offer' },
  { key: 'ON_HOLD', label: 'On hold' },
  { key: 'STALLED', label: 'Stalled' },
];

export function isCandidateQueue(value: string | null): value is CandidateQueue {
  return QUEUE_DEFINITIONS.some(({ key }) => key === value);
}

export function matchesQueue(candidate: Candidate, queue: CandidateQueue): boolean {
  return getCandidateWorkState(candidate).queue_keys.includes(queue);
}

