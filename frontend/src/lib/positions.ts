export const EXPERIENCE_LEVELS = ['Fresher', 'Experienced'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const POS_GEM = 'GEM (Guest Experienced Manager)';
export const POS_BACK_OFFICE = 'Back Office / Delivery Coordinator';
export const POS_LOBBY = 'Lobby In-Charge';
export const POS_DRIVER = 'Driver';
export const POS_CR = 'Customer Relation Executive';
export const POS_ACCOUNTS = 'Accounts Executive';
export const POS_HR = 'HR Executive';
export const POS_SYSTEMS = 'System Administrator';
export const POS_PROJECTS = 'Projects Executive';
export const POS_INSURANCE = 'Insurance Executive';
export const POS_MARKETING = 'Marketing Executive';
export const POS_FINANCE = 'Finance Coordinator';
export const POS_TRAINING = 'Trainer';

export const CANDIDATE_DEPARTMENTS = [
  'Accessories',
  'Accounts',
  'Administration',
  'Call Centre',
  'CR',
  'Finance',
  'HR',
  'Insurance',
  'Marketing',
  'Projects',
  'Purchase',
  'Sales',
  'Sales - Lexus',
  'Sales - U Trust',
  'Security',
  'Service',
  'Service - Lexus',
  'Systems',
  'Training',
  'Management operations',
] as const;

export type CandidateDepartment = (typeof CANDIDATE_DEPARTMENTS)[number];

const SALES_POSITIONS = [POS_GEM, POS_BACK_OFFICE, POS_LOBBY, POS_DRIVER] as const;
const DRIVER_ONLY = [POS_DRIVER] as const;
const STAFF_BY_DEPT: Record<string, string> = {
  CR: POS_CR,
  Accounts: POS_ACCOUNTS,
  HR: POS_HR,
  Systems: POS_SYSTEMS,
  Projects: POS_PROJECTS,
  Insurance: POS_INSURANCE,
  Marketing: POS_MARKETING,
  Finance: POS_FINANCE,
  Training: POS_TRAINING,
};

export function positionsFor(department: string): readonly string[] {
  if (department === 'Sales') return SALES_POSITIONS;
  const staff = STAFF_BY_DEPT[department];
  if (staff) return [staff, POS_DRIVER];
  if ((CANDIDATE_DEPARTMENTS as readonly string[]).includes(department)) return DRIVER_ONLY;
  return [];
}

export function catalogPosition(department?: string, position?: string): string {
  if (!department || !position) return '';
  return positionsFor(department).includes(position) ? position : '';
}
