import type { CandidateFormData } from '../pages/candidates/wizard/wizardTypes';
import {
  firstError,
  validateAadhaar,
  validateAgeFromDob,
  validateDrivingLicense,
  validateExperienceText,
  validateFullName,
  validateFutureDate,
  validateNumberRange,
  validatePan,
  validatePassport,
  validatePassingYear,
  validatePercentage,
  validatePhone,
  validatePinCode,
  validateSalary,
  validateEmail,
  validateSelect,
  validateTextField,
  type ValidationResult,
  GENDERS,
  MARITAL_STATUSES,
  BLOOD_GROUPS,
  STUDY_MODES,
  OPENING_SOURCES,
  REF_ROLES,
} from './validation';

export function validateBasicCandidateForm(input: {
  fullName: string;
  phone: string;
  email?: string;
  emailRequired?: boolean;
  position: string;
  source?: string;
  sourceRequired?: boolean;
}): string | null {
  const sources = ['WALK_IN', 'INDEED', 'REFERRAL', 'CAMPUS', 'OTHER'];

  const checks: ValidationResult[] = [
    validateFullName(input.fullName),
    validatePhone(input.phone),
    validateEmail(input.email ?? '', input.emailRequired ?? false),
    validateTextField(input.position, 'Position applied for', 2, 100),
  ];

  if (input.sourceRequired) {
    checks.push(validateSelect(input.source ?? '', sources, 'Source'));
  } else if (input.source?.trim()) {
    checks.push(validateSelect(input.source, sources, 'Source'));
  }

  return firstError(...checks);
}

function addressChecks(data: CandidateFormData, prefix: 'perm' | 'pres'): ValidationResult[] {
  const label = prefix === 'perm' ? 'Permanent' : 'Present';
  return [
    validateTextField(data[`${prefix}HouseName`], `${label} house name`, 2, 200),
    validateTextField(data[`${prefix}PostOffice`], `${label} post office`, 2, 100),
    validateTextField(data[`${prefix}Landmark`], `${label} landmark`, 2, 100),
    validateTextField(data[`${prefix}District`], `${label} district`, 2, 100),
    validatePinCode(data[`${prefix}PinCode`], `${label} PIN code`),
  ];
}

export function validatePreForm(data: CandidateFormData): string | null {
  const checks: ValidationResult[] = [
    validateFullName(data.nameAadhaar, 'Name (as per Aadhaar)'),
    validateSelect(data.gender, GENDERS, 'Gender'),
    validateAgeFromDob(data.dateOfBirth, data.age),
    validateSelect(data.maritalStatus, MARITAL_STATUSES, 'Marital status'),
    validateSelect(data.bloodGroup, BLOOD_GROUPS, 'Blood group'),
    validateNumberRange(data.height, 'Height', 100, 250, 'cm'),
    validateNumberRange(data.weight, 'Weight', 30, 200, 'kg'),
    validateTextField(data.religionCaste, 'Religion & caste', 2, 100),
    ...addressChecks(data, 'perm'),
    validateAadhaar(data.aadhaarNumber),
    validatePan(data.panNumber),
    validateDrivingLicense(data.drivingLicenseNumber),
    validatePassport(data.passportNumber),
    validateTextField(data.class10School, '10th school name', 2, 150),
    validateTextField(data.class10Board, '10th board', 2, 100),
    validatePercentage(data.class10Percentage, '10th percentage'),
    validatePassingYear(data.class10PassingYear, '10th passing year'),
    validateSelect(data.class10Mode, STUDY_MODES, '10th mode of study'),
    validateTextField(data.languagesRead, 'Languages to read', 2, 200),
    validateTextField(data.languagesWrite, 'Languages to write', 2, 200),
    validateTextField(data.languagesSpeak, 'Languages to speak', 2, 200),
    validateExperienceText(data.totalExperience),
    validateSalary(data.expectedSalary),
    validateSelect(data.sourceOfOpening, OPENING_SOURCES, 'Source of opening'),
    validateTextField(data.preferredRegion, 'Preferred region', 2, 100),
    validateFutureDate(data.expectedJoiningDate, 'Expected joining date', 365),
    validateSelect(data.refRole, REF_ROLES, 'Reference role'),
    validateTextField(data.refName, 'Reference name', 2, 100),
    validateTextField(data.refPanchayat, 'Reference panchayat / location', 2, 100),
    validatePhone(data.refContactNumber, 'Reference contact number'),
  ];

  if (!data.sameAsPermanent) {
    checks.push(...addressChecks(data, 'pres'));
  }

  if (data.previousExperience) {
    checks.push(
      validateTextField(data.prevCompanyName, 'Previous company name', 2, 150),
      validateTextField(data.prevPosition, 'Previous position', 2, 100),
    );
  }

  if (data.sourceOfOpening === 'Employee Referral') {
    checks.push(validateTextField(data.referredBy, 'Referred by', 2, 100));
  } else if (data.referredBy.trim()) {
    checks.push(validateTextField(data.referredBy, 'Referred by', 2, 100));
  }

  return firstError(...checks);
}
