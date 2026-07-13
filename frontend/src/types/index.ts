export type UserRole =
  | 'SUPER_ADMIN'
  | 'HR'
  | 'MANAGER'
  | 'GM';

/** Every role in the system — use when a route/nav item is accessible to all authenticated users. */
export const ALL_ROLES: UserRole[] = ['SUPER_ADMIN', 'HR', 'MANAGER', 'GM'];

/** Restricted to super-admins only. */
export const ADMIN_ONLY: UserRole[] = ['SUPER_ADMIN'];

export type PipelineStage =
  | 'SCREENING'
  | 'CANDIDATE_FORM'
  | 'HR_INTERVIEW'
  | 'DEPARTMENT_INTERVIEW'
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
  pre_form_sent_at?: string;
  pre_form_submitted_at?: string;
  current_stage: PipelineStage;
  branch_location?: string;
  profile?: CandidateProfile;
  is_duplicate_flagged: boolean;
  duplicate_of_candidate_id?: string;
  is_rejoining: boolean;
  applied_at: string;
  has_resume?: boolean;
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

export interface ActivityLog {
  id: string;
  candidate_id: string;
  activity_type: string;
  title: string;
  description: string;
  created_at: string;
}

export interface Communication {
  id: string;
  candidate_id: string;
  type: 'WHATSAPP' | 'EMAIL' | 'PHONE_CALL';
  direction: 'INCOMING' | 'OUTGOING';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  subject?: string;
  content_preview: string;
  created_at: string;
}

export interface FollowUp {
  id: string;
  candidate_id: string;
  title: string;
  description?: string;
  due_at: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  assigned_to?: string;
  created_at: string;
}
