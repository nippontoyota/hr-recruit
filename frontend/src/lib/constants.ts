import type { PipelineStage } from '../types';

export const stageLabel = (stage: PipelineStage): string => {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const stageColor = (stage: PipelineStage): string => {
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
};
