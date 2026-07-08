import type { PipelineStage } from '../types';

export const stageLabel = (stage: PipelineStage): string => {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const stageColor = (stage: PipelineStage): string => {
  switch (stage) {
    case 'NEW_APPLICATION':
    case 'SUITABLE_FOR_HIRE':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'AWAITING_LOCAL_INTERVIEW':
    case 'LOCAL_HR_REVIEW_COMPLETE':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'AWAITING_HEAD_OFFICE_INTERVIEW':
    case 'HEAD_OFFICE_INTERVIEW_COMPLETE':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'OFFER_SENT':
    case 'OFFER_ACCEPTED':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'JOINING_SCHEDULED':
    case 'JOINED':
      return 'bg-pink-100 text-pink-800 border-pink-200';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'ON_HOLD':
    case 'SALARY_PENDING':
    case 'SALARY_APPROVED':
    case 'OFFER_DECLINED':
      return 'bg-background text-text-secondary border border-border border-border';
    default:
      return 'bg-background text-text-secondary border border-border border-border';
  }
};
