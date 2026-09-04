import type { Candidate } from '../types';

export interface OfferLetterFields {
  candidate_name: string;
  designation: string;
  department: string;
  total_salary: string;
  total_allowance: string;
  others: string;
  gross_salary: string;
  joining_date: string;
}

function pick(data: Record<string, unknown> | null | undefined, keys: string[]): string {
  if (!data) return '';
  const folded = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key.trim().toLowerCase().replace(/_/g, ' ').replace(/\+/g, ' ').replace(/\s+/g, ' '),
      value,
    ]),
  );
  for (const key of keys) {
    const value = folded[key.toLowerCase()];
    if (value != null && String(value).trim() && String(value).toLowerCase() !== 'nan') {
      return String(value).trim();
    }
  }
  return '';
}

export function formatOfferJoinDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  const legacy = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (legacy) return `${legacy[1]}/${legacy[2]}/${legacy[3]}`;
  return value.trim();
}

export function toJoinDateInput(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return '';
}

export function defaultOfferFields(candidate: Candidate): OfferLetterFields {
  const salary = candidate.salary_data;
  const raw = candidate.profile?.raw_data;
  return {
    candidate_name: candidate.full_name || '',
    designation: pick(salary, ['designation']) || candidate.position_applied_for || candidate.department || '',
    department: pick(salary, ['department']) || candidate.department || '',
    total_salary: pick(salary, ['total salary', 'basic', 'basic salary']),
    total_allowance: pick(salary, ['total allowance', 'allowance']),
    others: pick(salary, ['others', 'other', 'fixed incentive', 'total incentive']) || '0',
    gross_salary: pick(salary, ['gross salary', 'gross', 'total package', 'ctc', 'monthly package', 'monthly ctc']),
    joining_date: toJoinDateInput(
      pick(salary, ['proposed doj', 'proposed date of joining', 'joining date'])
        || candidate.profile?.joining_date
        || String(raw?.dateOfJoining || '')
        || String(raw?.expectedJoiningDate || raw?.expected_joining_date || ''),
    ),
  };
}

export function offerFieldErrors(fields: OfferLetterFields): Partial<Record<keyof OfferLetterFields, string>> {
  const errors: Partial<Record<keyof OfferLetterFields, string>> = {};
  if (!fields.candidate_name.trim()) errors.candidate_name = 'Name is required.';
  if (!fields.designation.trim()) errors.designation = 'Designation is required.';
  if (!fields.gross_salary.trim()) errors.gross_salary = 'Total package is required.';
  if (!fields.joining_date.trim()) errors.joining_date = 'Joining date is required.';
  return errors;
}

export function canSendOfferLetter(fields: OfferLetterFields): boolean {
  return Object.keys(offerFieldErrors(fields)).length === 0;
}

export function payloadFromOfferFields(fields: OfferLetterFields): Record<string, string> {
  return {
    ...fields,
    joining_date: formatOfferJoinDate(fields.joining_date),
  };
}

export function buildOfferWhatsAppMessage(candidate: Candidate, fields: OfferLetterFields): string {
  const role = fields.designation || candidate.position_applied_for || candidate.department || 'the offered role';
  const joiningDate = fields.joining_date ? formatOfferJoinDate(fields.joining_date) : 'as discussed';
  return [
    `Dear ${candidate.full_name},`,
    '',
    'Greetings from Nippon Toyota HR.',
    '',
    `We are pleased to inform you that you have been selected for the position of *${role}*.`,
    `Your offer letter has been sent to ${candidate.email || 'your registered email address'}.`,
    `Please check your email and confirm receipt. Your expected joining date is *${joiningDate}*.`,
    '',
    'Regards,',
    'Human Resources',
    'Nippon Toyota',
  ].join('\\n');
}

const STORAGE_KEY = (id: string) => `offer-letter:${id}`;

export function loadStoredOfferFields(candidateId: string): Partial<OfferLetterFields> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(candidateId));
    return raw ? (JSON.parse(raw) as Partial<OfferLetterFields>) : null;
  } catch {
    return null;
  }
}

export function storeOfferFields(candidateId: string, fields: OfferLetterFields) {
  localStorage.setItem(STORAGE_KEY(candidateId), JSON.stringify(fields));
}
