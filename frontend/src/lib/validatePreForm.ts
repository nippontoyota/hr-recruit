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
  SOURCES,
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
  const checks: ValidationResult[] = [
    validateFullName(input.fullName),
    validatePhone(input.phone),
    validateEmail(input.email ?? '', input.emailRequired ?? false),
    validateTextField(input.position, 'Position applied for', 2, 100),
  ];

  if (input.sourceRequired) {
    checks.push(validateSelect(input.source ?? '', [...SOURCES], 'Source'));
  } else if (input.source?.trim()) {
    checks.push(validateSelect(input.source, [...SOURCES], 'Source'));
  }

  return firstError(...checks);
}

export function validateSingleField(field: keyof CandidateFormData, data: CandidateFormData): string | null {
  let res: ValidationResult = { ok: true };

  switch (field) {
    case 'nameAadhaar':
      res = validateFullName(data.nameAadhaar, 'Name (as per Aadhaar)');
      break;
    case 'gender':
      res = validateSelect(data.gender, GENDERS, 'Gender');
      break;
    case 'dateOfBirth':
    case 'age':
      res = validateAgeFromDob(data.dateOfBirth, data.age);
      break;
    case 'maritalStatus':
      res = validateSelect(data.maritalStatus, MARITAL_STATUSES, 'Marital status');
      break;
    case 'bloodGroup':
      res = validateSelect(data.bloodGroup, BLOOD_GROUPS, 'Blood group');
      break;
    case 'height':
      res = validateNumberRange(data.height, 'Height', 100, 250, 'cm');
      break;
    case 'weight':
      res = validateNumberRange(data.weight, 'Weight', 30, 200, 'kg');
      break;
    case 'religionCaste':
      res = validateTextField(data.religionCaste, 'Religion & caste', 2, 100);
      break;

    // Permanent Address
    case 'permHouseName':
      res = validateTextField(data.permHouseName, 'Permanent house name', 2, 200);
      break;
    case 'permPostOffice':
      res = validateTextField(data.permPostOffice, 'Permanent post office', 2, 100);
      break;
    case 'permLandmark':
      res = validateTextField(data.permLandmark, 'Permanent landmark', 2, 100);
      break;
    case 'permDistrict':
      res = validateTextField(data.permDistrict, 'Permanent district', 2, 100);
      break;
    case 'permPinCode':
      res = validatePinCode(data.permPinCode, 'Permanent PIN code');
      break;

    // Present Address (Only if sameAsPermanent is false)
    case 'presHouseName':
      if (!data.sameAsPermanent) res = validateTextField(data.presHouseName, 'Present house name', 2, 200);
      break;
    case 'presPostOffice':
      if (!data.sameAsPermanent) res = validateTextField(data.presPostOffice, 'Present post office', 2, 100);
      break;
    case 'presLandmark':
      if (!data.sameAsPermanent) res = validateTextField(data.presLandmark, 'Present landmark', 2, 100);
      break;
    case 'presDistrict':
      if (!data.sameAsPermanent) res = validateTextField(data.presDistrict, 'Present district', 2, 100);
      break;
    case 'presPinCode':
      if (!data.sameAsPermanent) res = validatePinCode(data.presPinCode, 'Present PIN code');
      break;

    // Identity
    case 'aadhaarNumber':
      res = validateAadhaar(data.aadhaarNumber);
      break;
    case 'panNumber':
      res = validatePan(data.panNumber);
      break;
    case 'drivingLicenseNumber':
      res = validateDrivingLicense(data.drivingLicenseNumber);
      break;
    case 'passportNumber':
      res = validatePassport(data.passportNumber);
      break;

    // Education 10th
    case 'class10School':
      res = validateTextField(data.class10School, '10th school name', 2, 150);
      break;
    case 'class10Board':
      res = validateTextField(data.class10Board, '10th board', 2, 100);
      break;
    case 'class10Percentage':
      res = validatePercentage(data.class10Percentage, '10th percentage');
      break;
    case 'class10PassingYear':
      res = validatePassingYear(data.class10PassingYear, '10th passing year');
      break;
    case 'class10Mode':
      res = validateSelect(data.class10Mode, STUDY_MODES, '10th mode of study');
      break;

    // Education 12th
    case 'class12School':
      res = validateTextField(data.class12School, '12th school/college name', 2, 150);
      break;
    case 'class12Stream':
      res = validateTextField(data.class12Stream, '12th stream', 2, 100);
      break;
    case 'class12Percentage':
      res = validatePercentage(data.class12Percentage, '12th percentage');
      break;
    case 'class12PassingYear':
      res = validatePassingYear(data.class12PassingYear, '12th passing year');
      break;
    case 'class12Mode':
      res = validateSelect(data.class12Mode, STUDY_MODES, '12th mode of study');
      break;

    // Graduation (Optional, but validated if filled)
    case 'gradCourse':
      if (data.gradCourse.trim() || data.gradCollege.trim() || data.gradPercentage.trim() || data.gradPassingYear.trim()) {
        res = validateTextField(data.gradCourse, 'Graduation course name', 2, 100);
      }
      break;
    case 'gradCollege':
      if (data.gradCourse.trim() || data.gradCollege.trim() || data.gradPercentage.trim() || data.gradPassingYear.trim()) {
        res = validateTextField(data.gradCollege, 'Graduation college/university', 2, 100);
      }
      break;
    case 'gradPercentage':
      if (data.gradCourse.trim() || data.gradCollege.trim() || data.gradPercentage.trim() || data.gradPassingYear.trim()) {
        res = validatePercentage(data.gradPercentage, 'Graduation percentage', true);
      }
      break;
    case 'gradPassingYear':
      if (data.gradCourse.trim() || data.gradCollege.trim() || data.gradPercentage.trim() || data.gradPassingYear.trim()) {
        const current = new Date().getFullYear();
        res = validatePassingYear(data.gradPassingYear, 'Graduation passing year', true, current + 4);
      }
      break;

    // Post Graduation (Optional, but validated if filled)
    case 'postGradCourse':
      if (data.postGradCourse.trim() || data.postGradCollege.trim() || data.postGradPercentage.trim() || data.postGradPassingYear.trim()) {
        res = validateTextField(data.postGradCourse, 'Post graduation course name', 2, 100);
      }
      break;
    case 'postGradCollege':
      if (data.postGradCourse.trim() || data.postGradCollege.trim() || data.postGradPercentage.trim() || data.postGradPassingYear.trim()) {
        res = validateTextField(data.postGradCollege, 'Post graduation college/university', 2, 100);
      }
      break;
    case 'postGradPercentage':
      if (data.postGradCourse.trim() || data.postGradCollege.trim() || data.postGradPercentage.trim() || data.postGradPassingYear.trim()) {
        res = validatePercentage(data.postGradPercentage, 'Post graduation percentage', true);
      }
      break;
    case 'postGradPassingYear':
      if (data.postGradCourse.trim() || data.postGradCollege.trim() || data.postGradPercentage.trim() || data.postGradPassingYear.trim()) {
        const current = new Date().getFullYear();
        res = validatePassingYear(data.postGradPassingYear, 'Post graduation passing year', true, current + 4);
      }
      break;

    // Languages
    case 'languagesRead':
      res = validateTextField(data.languagesRead, 'Languages to read', 2, 200);
      break;
    case 'languagesWrite':
      res = validateTextField(data.languagesWrite, 'Languages to write', 2, 200);
      break;
    case 'languagesSpeak':
      res = validateTextField(data.languagesSpeak, 'Languages to speak', 2, 200);
      break;

    // Experience (Conditional on previousExperience)
    case 'prevCompanyName':
      if (data.previousExperience) {
        res = validateTextField(data.prevCompanyName, 'Previous company name', 2, 150);
      }
      break;
    case 'prevPosition':
      if (data.previousExperience) {
        res = validateTextField(data.prevPosition, 'Previous position', 2, 100);
      }
      break;
    case 'totalExperience':
      if (data.previousExperience) {
        res = validateExperienceText(data.totalExperience);
      }
      break;
    case 'expectedSalary':
      res = validateSalary(data.expectedSalary);
      break;

    // Recruitment & Reference
    case 'sourceOfOpening':
      res = validateSelect(data.sourceOfOpening, OPENING_SOURCES, 'Source of opening');
      break;
    case 'referredBy':
      if (data.sourceOfOpening === 'Employee Referral' || data.referredBy.trim()) {
        res = validateTextField(data.referredBy, 'Referred by', 2, 100);
      }
      break;
    case 'preferredRegion':
      res = validateTextField(data.preferredRegion, 'Preferred region', 2, 100);
      break;
    case 'expectedJoiningDate':
      res = validateFutureDate(data.expectedJoiningDate, 'Expected joining date', 365);
      break;

    case 'refRole':
      if (data.hasReference) {
        res = validateSelect(data.refRole, REF_ROLES, 'Reference role');
      }
      break;
    case 'refName':
      if (data.hasReference) {
        res = validateTextField(data.refName, 'Reference name', 2, 100);
      }
      break;
    case 'refPanchayat':
      if (data.hasReference) {
        res = validateTextField(data.refPanchayat, 'Reference panchayat / location', 2, 100);
      }
      break;
    case 'refContactNumber':
      if (data.hasReference) {
        res = validatePhone(data.refContactNumber, 'Reference contact number');
      }
      break;
    default:
      break;
  }

  return res.ok ? null : res.message;
}

export function validatePreForm(data: CandidateFormData): string | null {
  const fields: (keyof CandidateFormData)[] = [
    'nameAadhaar', 'gender', 'dateOfBirth', 'age', 'maritalStatus', 'bloodGroup', 'height', 'weight', 'religionCaste',
    'permHouseName', 'permPostOffice', 'permLandmark', 'permDistrict', 'permPinCode',
    'presHouseName', 'presPostOffice', 'presLandmark', 'presDistrict', 'presPinCode',
    'aadhaarNumber', 'panNumber', 'drivingLicenseNumber', 'passportNumber',
    'class10School', 'class10Board', 'class10Percentage', 'class10PassingYear', 'class10Mode',
    'class12School', 'class12Stream', 'class12Percentage', 'class12PassingYear', 'class12Mode',
    'gradCourse', 'gradCollege', 'gradPercentage', 'gradPassingYear',
    'postGradCourse', 'postGradCollege', 'postGradPercentage', 'postGradPassingYear',
    'languagesRead', 'languagesWrite', 'languagesSpeak',
    'prevCompanyName', 'prevPosition', 'totalExperience', 'expectedSalary',
    'sourceOfOpening', 'referredBy', 'preferredRegion', 'expectedJoiningDate',
    'refRole', 'refName', 'refPanchayat', 'refContactNumber',
    'medicalRemarks'
  ];

  for (const f of fields) {
    const err = validateSingleField(f, data);
    if (err) return err;
  }
  return null;
}
