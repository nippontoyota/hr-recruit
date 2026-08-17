import type { Evaluation, EvaluationType } from '../types';

export function defaultInterviewTitle(type: EvaluationType | string): string {
  switch (type) {
    case 'BRANCH_HR':
    case 'HQ_INTERVIEW_1':
      return 'HR Interview';
    case 'DEPT_HEAD':
      return 'Department Interview';
    case 'HQ_INTERVIEW_2':
      return 'HO Department Interview';
    case 'HQ_INTERVIEW':
      return 'HO Interview';
    case 'GM_LEVEL':
      return 'GM Interview';
    case 'TECHNICAL_TEST':
      return 'Technical Test';
    case 'HR_SCREENING':
      return 'HR Screening';
    default:
      return String(type).replace(/_/g, ' ');
  }
}

export function interviewTitle(ev: Pick<Evaluation, 'type' | 'scores'>): string {
  const custom = String(ev.scores?.custom_title || '').trim();
  return custom || defaultInterviewTitle(ev.type);
}

export function canRenameInterview(type: EvaluationType | string): boolean {
  return type === 'DEPT_HEAD' || type === 'HQ_INTERVIEW_2';
}
