export type UserRole =
  | 'SUPER_ADMIN'
  | 'HR'
  | 'MANAGER'
  | 'GM';

/** Every role in the system — use when a route/nav item is accessible to all authenticated users. */
export const ALL_ROLES: UserRole[] = ['SUPER_ADMIN', 'HR', 'MANAGER', 'GM'];

export type PipelineStage =
  | 'SCREENING'
  | 'CANDIDATE_FORM'
  | 'BRANCH_INTERVIEW'
  | 'TEST'
  | 'FINAL_APPROVAL'
  | 'HIRED'
  | 'REJECTED'
  | 'ON_HOLD';

export const NIPPON_BRANCHES = [
  'Enchakkal',
  'Kazhakootam',
  'Kochuveli',
  'Kalamassery (Nippon Towers)',
  'Nettoor',
  'Muvattupuzha',
  'Puzhakkal (Ayyanthole)',
  'Nadathara',
  'Vellangallur (Irinjalakuda)',
  'Nattakom',
  'Thellakom',
  'Pala',
  'Kottiyam (Kollam)',
  'Pathanamthitta',
  'Thiruvalla',
  'Kayamkulam'
];

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  branch_location?: string;
  department?: string;
}

export interface Candidate {
  id: string;
  candidate_id: string;
  full_name: string;
  phone: string;
  email?: string;
  source: string;
  source_reference?: string;
  position_applied_for?: string;
  share_url?: string;
  pre_form_status?: string;
  is_awaiting_full_fill?: boolean;
  pre_form_sent_at?: string;
  pre_form_submitted_at?: string;
  current_stage: PipelineStage;
  screening?: CandidateScreening;
  branch_location?: string;
  interviewer_assignments?: Record<string, string>;
  profile?: CandidateProfile;
  is_duplicate_flagged: boolean;
  duplicate_of_candidate_id?: string;
  is_rejoining: boolean;
  applied_at: string;
  has_resume?: boolean;
  created_at: string;
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
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type InterviewMode = 'PHYSICAL' | 'ONLINE';
export type InterviewStatus = 'PENDING_SCHEDULE' | 'SCHEDULED' | 'EVALUATED';

export interface BranchInterviewData {
  id?: string;
  candidate_id?: string;
  interview_mode?: InterviewMode;
  scheduled_time?: string;
  location_or_link?: string;
  status?: InterviewStatus;
  

  current_salary?: string;
  expected_salary?: string;
  notice_period?: string;
}

export type EvaluationType = 'BRANCH_HR' | 'DEPT_HEAD' | 'GM_LEVEL' | 'TECHNICAL_TEST' | 'HQ_INTERVIEW';
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
  candidate_raw_data?: Record<string, any>;
  previous_remarks: Array<{
    type: string;
    verdict?: string;
    remarks: string;
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

