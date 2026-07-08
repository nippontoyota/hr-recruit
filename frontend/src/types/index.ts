export type UserRole =
  | 'ADMIN'
  | 'LOCAL_HR'
  | 'HEAD_OFFICE_HR'
  | 'DEPARTMENT_HEAD'
  | 'SALARY_TEAM';

export type PipelineStage =
  | 'NEW_APPLICATION'
  | 'AWAITING_LOCAL_INTERVIEW'
  | 'LOCAL_HR_REVIEW_COMPLETE'
  | 'AWAITING_HEAD_OFFICE_INTERVIEW'
  | 'HEAD_OFFICE_INTERVIEW_COMPLETE'
  | 'SUITABLE_FOR_HIRE'
  | 'SALARY_PENDING'
  | 'SALARY_APPROVED'
  | 'OFFER_SENT'
  | 'OFFER_ACCEPTED'
  | 'OFFER_DECLINED'
  | 'JOINING_SCHEDULED'
  | 'JOINED'
  | 'REJECTED'
  | 'ON_HOLD';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  branch_location?: string;
}

export interface Candidate {
  id: string;
  candidate_id: string;
  full_name: string;
  phone: string;
  email?: string;
  source_channel: string;
  current_stage: PipelineStage;
  is_duplicate_flagged: boolean;
  is_rejoining: boolean;
  applied_at: string;
}
