export type ValidationResult = { ok: true } | { ok: false; message: string };

export const SOURCES = ['WALK_IN', 'INDEED', 'REFERRAL', 'CAMPUS', 'OTHER'] as const;

export const GENDERS = ['Male', 'Female', 'Other'] as const;
export const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'] as const;
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const STUDY_MODES = ['Regular', 'Distance'] as const;
export const OPENING_SOURCES = [
  'Advertisement',
  'Agency',
  'Employee Referral',
  'Walk-in',
  'Social Media',
] as const;
export const REF_ROLES = ['Manager', 'Colleague', 'Professor', 'Relative', 'Other'] as const;

const PHONE = /^[6-9]\d{9}$/;
const PIN = /^[1-9]\d{5}$/;
const AADHAAR = /^\d{12}$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
const PASSPORT = /^[A-Z]\d{7}$/;
const DL = /^[A-Z0-9]{8,20}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FULL_NAME = /^[a-zA-Z\s.'-]{2,100}$/;
const YEAR = /^\d{4}$/;

const MIN_AGE = 18;
const MAX_AGE = 65;
const MIN_YEAR = 1970;

export function digitsOnly(value: string, maxLen?: number): string {
  const digits = value.replace(/\D/g, '');
  return maxLen !== undefined ? digits.slice(0, maxLen) : digits;
}

export function alphanumericOnly(value: string, maxLen?: number): string {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return maxLen !== undefined ? cleaned.slice(0, maxLen) : cleaned;
}

export function requireNonEmpty(value: string, label: string): ValidationResult {
  if (!value.trim()) return { ok: false, message: `${label} is required.` };
  return { ok: true };
}

export function validateFullName(value: string, label = 'Full name'): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, message: `${label} is required.` };
  if (!FULL_NAME.test(trimmed)) {
    return { ok: false, message: `${label} must be 2–100 letters (spaces, dots, hyphens allowed).` };
  }
  return { ok: true };
}

export function validatePhone(value: string, label = 'Phone number'): ValidationResult {
  const digits = digitsOnly(value);
  if (!digits) return { ok: false, message: `${label} is required.` };
  if (!PHONE.test(digits)) {
    return { ok: false, message: `${label} must be a 10-digit Indian mobile number (starts with 6–9).` };
  }
  return { ok: true };
}

export function validateEmail(value: string, required = true, label = 'Email'): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) return { ok: false, message: `${label} is required.` };
    return { ok: true };
  }
  if (!EMAIL.test(trimmed)) return { ok: false, message: `${label} must be a valid email address.` };
  return { ok: true };
}

export function validatePinCode(value: string, label = 'PIN code'): ValidationResult {
  const digits = digitsOnly(value);
  if (!digits) return { ok: false, message: `${label} is required.` };
  if (!PIN.test(digits)) return { ok: false, message: `${label} must be a valid 6-digit PIN (first digit 1–9).` };
  return { ok: true };
}

export function validateAadhaar(value: string, label = 'Aadhaar number'): ValidationResult {
  const digits = digitsOnly(value);
  if (!digits) return { ok: false, message: `${label} is required.` };
  if (!AADHAAR.test(digits)) return { ok: false, message: `${label} must be exactly 12 digits.` };
  return { ok: true };
}

export function validatePan(value: string, label = 'PAN number'): ValidationResult {
  const normalized = alphanumericOnly(value, 10);
  if (!normalized) return { ok: false, message: `${label} is required.` };
  if (!PAN.test(normalized)) {
    return { ok: false, message: `${label} must match format ABCDE1234F (5 letters, 4 digits, 1 letter).` };
  }
  return { ok: true };
}

export function validatePassport(value: string, label = 'Passport number'): ValidationResult {
  const normalized = alphanumericOnly(value, 8);
  if (!normalized) return { ok: true };
  if (!PASSPORT.test(normalized)) {
    return { ok: false, message: `${label} must match Indian format: 1 letter followed by 7 digits (e.g. A1234567).` };
  }
  return { ok: true };
}

export function validateDrivingLicense(value: string, label = 'Driving license number'): ValidationResult {
  const normalized = alphanumericOnly(value, 20);
  if (!normalized) return { ok: false, message: `${label} is required.` };
  if (!DL.test(normalized)) {
    return { ok: false, message: `${label} must be 8–20 letters and digits.` };
  }
  return { ok: true };
}

export function validateSelect(value: string, options: readonly string[], label: string): ValidationResult {
  if (!value.trim()) return { ok: false, message: `${label} is required.` };
  if (!options.includes(value)) return { ok: false, message: `${label} must be a valid option.` };
  return { ok: true };
}

export function validateTextField(
  value: string,
  label: string,
  minLen: number,
  maxLen: number,
): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, message: `${label} is required.` };
  if (trimmed.length < minLen) return { ok: false, message: `${label} must be at least ${minLen} characters.` };
  if (trimmed.length > maxLen) return { ok: false, message: `${label} must be at most ${maxLen} characters.` };
  return { ok: true };
}

export function validateAgeFromDob(dob: string, ageStr: string): ValidationResult {
  if (!dob) return { ok: false, message: 'Date of birth is required.' };
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return { ok: false, message: 'Date of birth is invalid.' };

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;

  if (age < MIN_AGE || age > MAX_AGE) {
    return { ok: false, message: `Age must be between ${MIN_AGE} and ${MAX_AGE} years.` };
  }

  if (ageStr.trim()) {
    const entered = Number.parseInt(ageStr, 10);
    if (Number.isNaN(entered) || entered !== age) {
      return { ok: false, message: `Age must match date of birth (${age} years).` };
    }
  }

  return { ok: true };
}

export function validateNumberRange(
  value: string,
  label: string,
  min: number,
  max: number,
  unit?: string,
): ValidationResult {
  if (!value.trim()) return { ok: false, message: `${label} is required.` };
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return { ok: false, message: `${label} must be a number.` };
  if (num < min || num > max) {
    const suffix = unit ? ` ${unit}` : '';
    return { ok: false, message: `${label} must be between ${min} and ${max}${suffix}.` };
  }
  return { ok: true };
}

export function validatePercentage(value: string, label: string, required = true): ValidationResult {
  if (!value.trim()) {
    if (required) return { ok: false, message: `${label} is required.` };
    return { ok: true };
  }
  const num = Number.parseFloat(value);
  if (Number.isNaN(num) || num < 0 || num > 100) {
    return { ok: false, message: `${label} must be between 0 and 100.` };
  }
  return { ok: true };
}

export function formatAadhaar(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

export function validatePassingYear(value: string, label: string, required = true, maxYear?: number): ValidationResult {
  if (!value.trim()) {
    if (required) return { ok: false, message: `${label} is required.` };
    return { ok: true };
  }
  if (!YEAR.test(value.trim())) return { ok: false, message: `${label} must be a 4-digit year.` };
  const year = Number.parseInt(value, 10);
  const current = new Date().getFullYear();
  const limit = maxYear ?? current;
  if (year < MIN_YEAR || year > limit) {
    return { ok: false, message: `${label} must be between ${MIN_YEAR} and ${limit}.` };
  }
  return { ok: true };
}

export function validateSalary(value: string, label = 'Expected salary'): ValidationResult {
  const digits = digitsOnly(value);
  if (!digits) return { ok: false, message: `${label} is required.` };
  const amount = Number.parseInt(digits, 10);
  if (amount < 5000 || amount > 99999999) {
    return { ok: false, message: `${label} must be between ₹5,000 and ₹99,999,999.` };
  }
  return { ok: true };
}

export function validateExperienceText(value: string, label = 'Total experience'): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, message: `${label} is required.` };
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { ok: false, message: `${label} must be 2–50 characters (e.g. "2 Years 3 Months" or "Fresher").` };
  }
  return { ok: true };
}

export function validateFutureDate(value: string, label: string, maxDaysAhead = 365): ValidationResult {
  if (!value) return { ok: false, message: `${label} is required.` };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { ok: false, message: `${label} is invalid.` };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date < today) return { ok: false, message: `${label} cannot be in the past.` };

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxDaysAhead);
  if (date > maxDate) {
    return { ok: false, message: `${label} must be within ${maxDaysAhead} days from today.` };
  }
  return { ok: true };
}

export function validateResumeFile(file: File | null, required = false): ValidationResult {
  if (!file) {
    if (required) return { ok: false, message: 'Resume file is required.' };
    return { ok: true };
  }
  const allowed = ['.pdf', '.doc', '.docx'];
  const name = file.name.toLowerCase();
  if (!allowed.some((ext) => name.endsWith(ext))) {
    return { ok: false, message: 'Resume must be PDF, DOC, or DOCX.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, message: 'Resume must be 10 MB or smaller.' };
  }
  return { ok: true };
}

export function validateRejectRemarks(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, message: 'Rejection remarks are required.' };
  if (trimmed.length < 10) return { ok: false, message: 'Rejection remarks must be at least 10 characters.' };
  return { ok: true };
}

export function firstError(...results: ValidationResult[]): string | null {
  for (const result of results) {
    if (!result.ok) return result.message;
  }
  return null;
}
