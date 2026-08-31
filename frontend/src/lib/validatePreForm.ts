import type { CandidateFormData, PreviousJob } from '../pages/candidates/wizard/wizardTypes';
import { EMPTY_PREVIOUS_JOB, previousJobsFromForm } from '../pages/candidates/wizard/wizardTypes';
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
  validateResumeFile,
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

function anyFilled(...values: string[]): boolean {
  return values.some((value) => (value || '').trim().length > 0);
}

function validateJobObject(job: PreviousJob, label: string, required: boolean): string | null {
  const filled = anyFilled(
    job.company,
    job.position,
    job.reporting,
    job.reportingDesignation,
    job.reportingPhone,
    job.fromDate,
    job.toDate,
    job.salary,
    job.reason,
  );
  if (!required && !filled) return null;

  return firstError(
    validateTextField(job.company, `${label} company name`, 2, 150),
    validateTextField(job.position, `${label} position`, 2, 100),
    validateTextField(job.reporting, `${label} reporting person`, 2, 100),
    validateTextField(job.reportingDesignation, `${label} reporting person designation`, 2, 100),
    validatePhone(job.reportingPhone, `${label} reporting person phone`),
    validateTextField(job.fromDate, `${label} from date`, 2, 50),
    validateTextField(job.toDate, `${label} to date`, 2, 50),
    validateSalary(job.salary, `${label} salary`),
    validateTextField(job.reason, `${label} reason for leaving`, 2, 200),
  );
}

function validateExperienceJobs(data: CandidateFormData): string | null {
  if (!data.previousExperience) return null;
  const jobs = data.previousJobs?.length ? data.previousJobs : previousJobsFromForm(data);
  if (jobs.length === 0) {
    return validateJobObject(EMPTY_PREVIOUS_JOB, 'Previous job 1', true);
  }
  for (let i = 0; i < jobs.length; i += 1) {
    const err = validateJobObject(jobs[i], `Previous job ${i + 1}`, i === 0);
    if (err) return err;
  }
  return null;
}

function validateDeclarationDate(value: string): ValidationResult {
  const trimmed = (value || '').trim();
  if (!trimmed) return { ok: true };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, message: 'Declaration date is invalid.' };
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, message: 'Declaration date is invalid.' };
  }
  return { ok: true };
}

function gradAnyFilled(data: CandidateFormData): boolean {
  return anyFilled(data.gradCourse, data.gradStream, data.gradCollege, data.gradPercentage, data.gradPassingYear, data.gradMode);
}

function postGradAnyFilled(data: CandidateFormData): boolean {
  return anyFilled(
    data.postGradCourse,
    data.postGradStream,
    data.postGradCollege,
    data.postGradPercentage,
    data.postGradPassingYear,
    data.postGradMode,
  );
}

export function validateBasicCandidateForm(input: {
  fullName: string;
  phone: string;
  email?: string;
  emailRequired?: boolean;
  experience: string;
  source?: string;
  sourceRequired?: boolean;
}): string | null {
  const checks: ValidationResult[] = [
    validateFullName(input.fullName),
    validatePhone(input.phone),
    validateEmail(input.email ?? '', input.emailRequired ?? false),
    validateSelect(input.experience, ['Fresher', 'Experienced'], 'Experience'),
  ];

  if (input.sourceRequired) {
    checks.push(validateSelect(input.source ?? '', [...SOURCES], 'Source'));
  } else if (input.source?.trim()) {
    checks.push(validateSelect(input.source, [...SOURCES], 'Source'));
  }

  return firstError(...checks);
}

function validateSingleField(field: keyof CandidateFormData, data: CandidateFormData): string | null {
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

    // Driving & Languages
    case 'hasValidDrivingLicense':
      if (typeof data.hasValidDrivingLicense !== 'boolean') {
        res = { ok: false, message: 'Please specify if you have a valid driving license.' };
      }
      break;
    case 'confidentToDrive':
      if (data.hasValidDrivingLicense && typeof data.confidentToDrive !== 'boolean') {
        res = { ok: false, message: 'Please specify if you are confident driving.' };
      }
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
      if (gradAnyFilled(data)) {
        res = validateTextField(data.gradCourse, 'Graduation degree / course type', 2, 100);
      }
      break;
    case 'gradStream':
      if (data.gradStream?.trim()) {
        res = validateTextField(data.gradStream, 'Graduation specialization', 2, 100);
      }
      break;
    case 'gradCollege':
      if (gradAnyFilled(data)) {
        res = validateTextField(data.gradCollege, 'Graduation college', 2, 100);
      }
      break;
    case 'gradPercentage':
      if (gradAnyFilled(data)) {
        res = validatePercentage(data.gradPercentage, 'Graduation percentage');
      }
      break;
    case 'gradPassingYear':
      if (gradAnyFilled(data)) {
        const current = new Date().getFullYear();
        res = validatePassingYear(data.gradPassingYear, 'Graduation passing year', true, current + 4);
      }
      break;
    case 'gradMode':
      if (gradAnyFilled(data)) {
        res = validateSelect(data.gradMode, STUDY_MODES, 'Graduation mode of study');
      }
      break;

    // Post Graduation (Optional, but validated if filled)
    case 'postGradCourse':
      if (postGradAnyFilled(data)) {
        res = validateTextField(data.postGradCourse, 'Post graduation course', 2, 100);
      }
      break;
    case 'postGradStream':
      if (data.postGradStream?.trim()) {
        res = validateTextField(data.postGradStream, 'Post graduation specialization', 2, 100);
      }
      break;
    case 'postGradCollege':
      if (postGradAnyFilled(data)) {
        res = validateTextField(data.postGradCollege, 'Post graduation college', 2, 100);
      }
      break;
    case 'postGradPercentage':
      if (postGradAnyFilled(data)) {
        res = validatePercentage(data.postGradPercentage, 'Post graduation percentage');
      }
      break;
    case 'postGradPassingYear':
      if (postGradAnyFilled(data)) {
        const current = new Date().getFullYear();
        res = validatePassingYear(data.postGradPassingYear, 'Post graduation passing year', true, current + 4);
      }
      break;
    case 'postGradMode':
      if (postGradAnyFilled(data)) {
        res = validateSelect(data.postGradMode, STUDY_MODES, 'Post graduation mode of study');
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

    // Family
    case 'fatherName':
      res = validateTextField(data.fatherName, 'Father name', 2, 100);
      break;
    case 'motherName':
      res = validateTextField(data.motherName, 'Mother name', 2, 100);
      break;
    case 'spouseName':
      if (data.maritalStatus === 'Married') {
        res = validateTextField(data.spouseName, 'Spouse name', 2, 100);
      }
      break;

    case 'previousJobs':
    case 'prevCompanyName':
    case 'prevPosition':
    case 'prev1Reporting':
    case 'prev1From':
    case 'prev1To':
    case 'prev1Salary':
    case 'prev1Reason':
    case 'prev2Name':
    case 'prev2Position':
    case 'prev2Reporting':
    case 'prev2From':
    case 'prev2To':
    case 'prev2Salary':
    case 'prev2Reason':
    case 'prev3Name':
    case 'prev3Position':
    case 'prev3Reporting':
    case 'prev3From':
    case 'prev3To':
    case 'prev3Salary':
    case 'prev3Reason':
    case 'prev4Name':
    case 'prev4Position':
    case 'prev4Reporting':
    case 'prev4From':
    case 'prev4To':
    case 'prev4Salary':
    case 'prev4Reason':
      return validateExperienceJobs(data);
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
      res = validateSelect(data.refRole, REF_ROLES, 'Reference role');
      break;
    case 'refName':
      res = validateTextField(data.refName, 'Reference name', 2, 100);
      break;
    case 'refPanchayat':
      res = validateTextField(data.refPanchayat, 'Reference panchayat / location', 2, 100);
      break;
    case 'refContactNumber':
      res = validatePhone(data.refContactNumber, 'Reference contact number');
      break;

    // Emergency contacts
    case 'emergency1Relation':
      res = validateTextField(data.emergency1Relation, 'Emergency contact 1 relation', 2, 50);
      break;
    case 'emergency1Name':
      res = validateTextField(data.emergency1Name, 'Emergency contact 1 name', 2, 100);
      break;
    case 'emergency1Address':
      res = validateTextField(data.emergency1Address, 'Emergency contact 1 address', 2, 200);
      break;
    case 'emergency1Contact':
      res = validatePhone(data.emergency1Contact, 'Emergency contact 1 phone');
      break;
    case 'emergency2Relation':
    case 'emergency2Name':
    case 'emergency2Address':
    case 'emergency2Contact':
      if (
        anyFilled(
          data.emergency2Relation,
          data.emergency2Name,
          data.emergency2Address,
          data.emergency2Contact,
        )
      ) {
        if (field === 'emergency2Relation') {
          res = validateTextField(data.emergency2Relation, 'Emergency contact 2 relation', 2, 50);
        } else if (field === 'emergency2Name') {
          res = validateTextField(data.emergency2Name, 'Emergency contact 2 name', 2, 100);
        } else if (field === 'emergency2Address') {
          res = validateTextField(data.emergency2Address, 'Emergency contact 2 address', 2, 200);
        } else {
          res = validatePhone(data.emergency2Contact, 'Emergency contact 2 phone');
        }
      }
      break;

    // General Information / Medical
    case 'prevTerminated':
      if (typeof data.prevTerminated !== 'boolean') {
        res = { ok: false, message: 'Please select Yes or No.' };
      }
      break;
    case 'nervousDisorder':
      if (typeof data.nervousDisorder !== 'boolean') {
        res = { ok: false, message: 'Please select Yes or No.' };
      }
      break;
    case 'physicalDisability':
      if (typeof data.physicalDisability !== 'boolean') {
        res = { ok: false, message: 'Please select Yes or No.' };
      }
      break;
    case 'eyeVision':
      if (typeof data.eyeVision !== 'boolean') {
        res = { ok: false, message: 'Please select Yes or No.' };
      }
      break;
    case 'criminalConviction':
      if (typeof data.criminalConviction !== 'boolean') {
        res = { ok: false, message: 'Please select Yes or No.' };
      }
      break;

    // Declaration
    case 'emailId':
      res = validateEmail(data.emailId, true, 'Email');
      break;
    case 'declarationPlace':
      res = validateTextField(data.declarationPlace, 'Declaration place', 2, 100);
      break;
    case 'declarationDate':
      res = validateDeclarationDate(data.declarationDate);
      break;
    case 'declarationName':
      res = validateTextField(data.declarationName, 'Declaration name', 2, 100);
      break;

    default:
      break;
  }

  return res.ok ? null : res.message;
}

const PRE_FORM_FIELDS: (keyof CandidateFormData)[] = [
  'nameAadhaar', 'gender', 'dateOfBirth', 'age', 'maritalStatus', 'bloodGroup', 'height', 'weight', 'religionCaste',
  'permHouseName', 'permPostOffice', 'permLandmark', 'permDistrict', 'permPinCode',
  'presHouseName', 'presPostOffice', 'presLandmark', 'presDistrict', 'presPinCode',
  'hasValidDrivingLicense',
  'class10School', 'class10Board', 'class10Percentage', 'class10PassingYear', 'class10Mode',
  'class12School', 'class12Stream', 'class12Percentage', 'class12PassingYear', 'class12Mode',
  'gradCourse', 'gradStream', 'gradCollege', 'gradPercentage', 'gradPassingYear', 'gradMode',
  'postGradCourse', 'postGradStream', 'postGradCollege', 'postGradPercentage', 'postGradPassingYear', 'postGradMode',
  'languagesRead', 'languagesWrite', 'languagesSpeak',
  'fatherName', 'motherName', 'spouseName',
  'previousJobs',
  'totalExperience', 'expectedSalary',
  'sourceOfOpening', 'referredBy', 'preferredRegion', 'expectedJoiningDate',
  'refRole', 'refName', 'refPanchayat', 'refContactNumber',
  'prevTerminated', 'nervousDisorder', 'physicalDisability', 'eyeVision', 'criminalConviction',
  'emergency1Relation', 'emergency1Name', 'emergency1Address', 'emergency1Contact',
  'emergency2Relation', 'emergency2Name', 'emergency2Address', 'emergency2Contact',
  'emailId', 'declarationPlace', 'declarationName',
];

export type PreFormFieldErrors = Partial<Record<keyof CandidateFormData, string>>;

export function validatePreFormFields(data: CandidateFormData): PreFormFieldErrors {
  const errors: PreFormFieldErrors = {};

  if (!data.photoFileObject) {
    errors.photoFileObject = 'Candidate photo (PNG or JPEG) is required.';
  } else {
    const photoName = data.photoFileObject.name.toLowerCase();
    if (!photoName.endsWith('.png') && !photoName.endsWith('.jpg') && !photoName.endsWith('.jpeg')) {
      errors.photoFileObject = 'Candidate photo must be a PNG or JPEG image.';
    } else if (data.photoFileObject.size > 5 * 1024 * 1024) {
      errors.photoFileObject = 'Candidate photo must be smaller than 5MB.';
    }
  }

  if (!data.resumeFileObject) {
    errors.resumeFileObject = 'Resume (PDF or Word) is required.';
  } else {
    const resumeResult = validateResumeFile(data.resumeFileObject, true);
    if (!resumeResult.ok) errors.resumeFileObject = resumeResult.message;
  }

  if (typeof data.hasValidDrivingLicense !== 'boolean') {
    errors.hasValidDrivingLicense = 'Please specify if you have a valid driving license.';
  } else if (data.hasValidDrivingLicense && typeof data.confidentToDrive !== 'boolean') {
    errors.confidentToDrive = 'Please specify if you are confident driving.';
  }

  for (const field of PRE_FORM_FIELDS) {
    const err = validateSingleField(field, data);
    if (err) errors[field] = err;
  }
  return errors;
}

export function validatePreForm(data: CandidateFormData): string | null {
  const errors = validatePreFormFields(data);
  return Object.values(errors)[0] || null;
}

export function validateOnePreFormField(
  field: keyof CandidateFormData,
  data: CandidateFormData,
): string | null {
  if (field === 'photoFileObject' || field === 'resumeFileObject') {
    return validatePreFormFields(data)[field] || null;
  }
  return validateSingleField(field, data);
}
