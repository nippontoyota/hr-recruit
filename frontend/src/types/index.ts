export type UserRole =
  | 'ADMIN'
  | 'HO_HR'
  | 'LOCAL_HR';

export type FormStatus = 'NOT_SENT' | 'SENT' | 'VIEWED' | 'SUBMITTED' | 'EXPIRED';
   
/** Every role in the system — use when a route/nav item is accessible to all authenticated users. */
export const ALL_ROLES: UserRole[] = ['ADMIN', 'HO_HR', 'LOCAL_HR'];

export type PipelineStage =
  | 'SCREENING'
  | 'CANDIDATE_FORM'
  | 'BRANCH_INTERVIEW'
  | 'TEST'
  | 'FINAL_APPROVAL'
  | 'HIRED'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'CALL_LETTER'
  | 'INTERVIEWS'
  | 'BACKGROUND_VERIFICATION'
  | 'APPLICATION'
  | 'SENT_TO_HO'
  | 'HO_INTERVIEWS'
  | 'HO_HR_INTERVIEW'
  | 'HO_DEPT_INTERVIEW'
  | 'SALARY_DETAILS'
  | 'CSS';

export const PIPELINE_STAGES: PipelineStage[] = [
  'SCREENING',
  'CANDIDATE_FORM',
  'TEST',
  'BRANCH_INTERVIEW',
  'SENT_TO_HO',
  'HO_INTERVIEWS',
  'CSS',
  'SALARY_DETAILS',
  'FINAL_APPROVAL',
  'HIRED',
  'REJECTED',
  'ON_HOLD',
];

export const HO_LINEAR_STAGES: PipelineStage[] = [
  'SENT_TO_HO',
  'HO_INTERVIEWS',
  'CSS',
  'SALARY_DETAILS',
  'FINAL_APPROVAL',
  'HIRED',
];

export const HO_POST_SEND_STAGES: PipelineStage[] = [
  'SENT_TO_HO',
  'HO_INTERVIEWS',
  'HO_HR_INTERVIEW',
  'HO_DEPT_INTERVIEW',
  'CSS',
  'SALARY_DETAILS',
  'FINAL_APPROVAL',
  'HIRED',
];

export const HO_PIPELINE_STAGES: PipelineStage[] = [
  ...HO_POST_SEND_STAGES,
  'ON_HOLD',
];

export const NIPPON_BRANCHES = [
  'Trivandrum',
  'Kollam',
  'Pathanamthitta',
  'Kayamkulam',
  'Kottayam',
  'Muvattupuzha',
  'Kalamassery',
  'Cochin',
  'Thrissur'
];

export { CANDIDATE_DEPARTMENTS } from '../lib/positions';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  branch_location?: string;
  department?: string;
}

export type CandidateActionKey =
  | 'NONE'
  | 'SEND_TO_HO'
  | 'RESUME_HOLD'
  | 'ADVANCE_STAGE'
  | 'WORKSPACE';

export interface CandidateWorkState {
  next_action: string;
  action_key?: CandidateActionKey;
  responsible_team: string;
  blockers: string[];
  days_in_stage: number;
  days_since_activity: number | null;
  queue_keys: string[];
}

export interface Candidate {
  id: string;
  candidate_id: string;
  full_name: string;
  phone: string;
  email?: string;
  source: string;
  source_reference?: string;
  experience?: string;
  department?: string;
  opening_type?: string;
  position_applied_for?: string;
  share_url?: string;
  pre_form_status: FormStatus;
  pre_form_sent_at?: string;
  pre_form_expires_at?: string;
  pre_form_submitted_at?: string;
  pre_form_token?: string;
  current_stage: PipelineStage;
  screening?: CandidateScreening;
  branch_location?: string;
  visit_branch?: string;
  visit_date?: string;
  visit_time?: string;
  visit_maps_link?: string;
  visit_instructions?: string;
  interviewer_assignments?: Record<string, string>;
  profile?: CandidateProfile;
  is_duplicate_flagged: boolean;
  duplicate_of_candidate_id?: string;
  is_rejoining: boolean;
  assigned_hr_user_id?: string;
  offer_status?: string;
  salary_data?: Record<string, unknown> | null;
  applied_at: string;
  has_resume?: boolean;
  offer_blockers?: string[];
  created_at: string;
  handed_over_to_ho?: boolean;
  work_state?: CandidateWorkState | null;
  evaluations?: Evaluation[];
}

export interface ResumeDocument {
  id: string;
  candidate_id: string;
  doc_type: string;
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  download_url: string;
  created_at: string;
}

export interface CandidateScreening {
  id: string;
  candidate_id: string;
  status: 'PENDING' | 'QUALIFIED' | 'REJECTED';
  call_completed?: boolean;
  interest_confirmed?: boolean;
  salary_discussed?: boolean;
  notice_period_discussed?: boolean;
  basic_eligibility_checked?: boolean;
  remarks?: string;
  pending_reason?: string;
  follow_up_date?: string;
  visit_branch?: string;
  branch_visit_date?: string;
  maps_link?: string;
  extra_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateProfile {
  id: string;
  candidate_id: string;
  version: number;
  current_location?: string;
  experience_level?: string;
  total_experience?: string;
  current_company?: string;
  expected_salary?: string;
  joining_date?: string;
  email?: string;
  resume_url?: string;
  photo_url?: string;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type InterviewMode = 'PHYSICAL' | 'ONLINE';
export type InterviewStatus = 'PENDING_SCHEDULE' | 'SCHEDULED' | 'EVALUATED';

export type EvaluationType =
  | 'BRANCH_HR'
  | 'DEPT_HEAD'
  | 'GM_LEVEL'
  | 'TECHNICAL_TEST'
  | 'HQ_INTERVIEW'
  | 'HQ_INTERVIEW_1'
  | 'HQ_INTERVIEW_2';
export type EvaluationVerdict = 'SELECTED' | 'REJECTED' | 'ON_HOLD' | 'PASS' | 'FAIL';

export interface Evaluation {
  id: string;
  candidate_id: string;
  type: EvaluationType;
  status: InterviewStatus;
  interview_mode?: InterviewMode;
  scheduled_time?: string;
  location_or_link?: string;
  verdict?: EvaluationVerdict;
  remarks?: string;
  scores?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EvaluationToken {
  token: string;
  expires_at: string;
}

export interface EvaluationPublicDetails {
  id: string;
  type: EvaluationType;
  candidate_name: string;
  candidate_position: string;
  candidate_resume_url?: string;
  candidate_photo_url?: string;
  candidate_experience?: string;
  candidate_education?: string;
  candidate_email?: string;
  candidate_phone?: string;
  candidate_location?: string;
  candidate_source?: string;
  candidate_skills?: string;
  candidate_current_salary?: string;
  candidate_expected_salary?: string;
  candidate_notice_period?: string;
  interviewer_name?: string;
  candidate_raw_data?: Record<string, any>;
  previous_remarks: Array<{
    type: string;
    verdict?: string;
    remarks: string;
    interviewer_name?: string;
    scores?: {
      attitude?: number;
      communication?: number;
      knowledge?: number;
      total_score?: number;
      interviewer_name?: string;
      percentage?: number;
      correct_answers?: number;
      total_questions?: number;
      custom_title?: string;
    };
  }>;
  is_already_submitted?: boolean;
}

export type ActivityType = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'STAGE_CHANGE' | 'FORM' | 'SYSTEM' | 'NOTE';

export interface ActivityLog {
  id: string;
  candidate_id: string;
  activity_type: ActivityType;
  title: string;
  description: string;
  created_by_user_id?: string;
  created_at: string;
}

