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

// Service Positions
export const POS_SERVICE_TECH_TRAINEE = 'Technician Trainee';
export const POS_SERVICE_TECH = 'Technician';
export const POS_SERVICE_PAINT_TECH_TRAINEE = 'Paint Technician Trainee';
export const POS_SERVICE_PAINT_TECH = 'Paint Technician';
export const POS_SERVICE_BODY_TECH_TRAINEE = 'Body Technician Trainee';
export const POS_SERVICE_BODY_TECH = 'Body Technician';
export const POS_SERVICE_ADVISOR_TRAINEE = 'Service Advisor Trainee';
export const POS_SERVICE_ADVISOR = 'Service Advisor';
export const POS_SERVICE_CHIEF_GEN_TECH = 'Chief General Technician';
export const POS_SERVICE_FRONT_BACK_OFFICE = 'Front Office / Back Office Executive';
export const POS_SERVICE_WARRANTY_INCHARGE = 'Warranty In-Charge';
export const POS_SERVICE_TECH_LEADER = 'Technical Leader';
export const POS_SERVICE_PARTS_INCHARGE = 'Parts In-Charge';

// Call Centre Positions
export const POS_CALL_CENTRE_EXEC = 'Call Centre Executive';

// Accessories Positions
export const POS_ACCESSORIES_TECH = 'Accessories Technician';
export const POS_ACCESSORIES_SALES_EXEC = 'Accessories Sales Executive';
export const POS_ACCESSORIES_PARTS_INCHARGE = 'Accessories Parts In-Charge';

// Security Positions
export const POS_SECURITY_GUARD = 'Security Guard';
export const POS_SECURITY_SUPERVISOR = 'Security Supervisor';

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

const SERVICE_POSITIONS = [
  POS_SERVICE_TECH_TRAINEE,
  POS_SERVICE_TECH,
  POS_SERVICE_PAINT_TECH_TRAINEE,
  POS_SERVICE_PAINT_TECH,
  POS_SERVICE_BODY_TECH_TRAINEE,
  POS_SERVICE_BODY_TECH,
  POS_SERVICE_ADVISOR_TRAINEE,
  POS_SERVICE_ADVISOR,
  POS_SERVICE_CHIEF_GEN_TECH,
  POS_SERVICE_FRONT_BACK_OFFICE,
  POS_SERVICE_WARRANTY_INCHARGE,
  POS_SERVICE_TECH_LEADER,
  POS_SERVICE_PARTS_INCHARGE,
  POS_DRIVER,
] as const;

const ACCESSORIES_POSITIONS = [
  POS_ACCESSORIES_TECH,
  POS_ACCESSORIES_SALES_EXEC,
  POS_ACCESSORIES_PARTS_INCHARGE,
  POS_DRIVER,
] as const;

const SECURITY_POSITIONS = [
  POS_SECURITY_GUARD,
  POS_SECURITY_SUPERVISOR,
  POS_DRIVER,
] as const;

const CALL_CENTRE_POSITIONS = [
  POS_CALL_CENTRE_EXEC,
  POS_DRIVER,
] as const;

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
  if (department === 'Service' || department === 'Service - Lexus') return SERVICE_POSITIONS;
  if (department === 'Accessories') return ACCESSORIES_POSITIONS;
  if (department === 'Security') return SECURITY_POSITIONS;
  if (department === 'Call Centre') return CALL_CENTRE_POSITIONS;
  const staff = STAFF_BY_DEPT[department];
  if (staff) return [staff, POS_DRIVER];
  if ((CANDIDATE_DEPARTMENTS as readonly string[]).includes(department)) return DRIVER_ONLY;
  return [];
}

export function catalogPosition(department?: string, position?: string): string {
  if (!department || !position) return '';
  return positionsFor(department).includes(position) ? position : '';
}
