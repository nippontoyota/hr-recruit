import type { Candidate } from '../types';

export type YesNo = 'Yes' | 'No' | '';

export interface BgSignature {
  name: string;
  role: string;
  userId?: string;
  at?: string;
}

export interface BgVerificationData {
  meta: {
    totalWorkExperience: string;
    completedAt?: string;
  };
  locality: {
    panchayathName: string;
    councillorName: string;
    panchayathMemberName: string;
    contactNoCouncillor: string;
    contactNoMember: string;
    anyIssueUpdated: YesNo;
    anyIssueSpecify: string;
    policeCaseReported: YesNo;
    policeCaseSpecify: string;
    familyIssues: YesNo;
    familyIssuesSpecify: string;
    overallFeedbackLocality: string;
  };
  social: {
    facebookName: string;
    instagramName: string;
    politicalInterference: YesNo;
    politicalSide: string;
    sharedLikedPages: string;
    instagramFacebookFollowers: string;
    followingPages4Years: string;
    activeInSocialMedia: YesNo;
    overallFeedbackSocialMedia: string;
  };
  employer: {
    employerName: string;
    designation: string;
    periodOfEmploymentFrom: string;
    periodOfEmploymentTo: string;
    totalYearOfEmployment: string;
    contactedPersonName: string;
    contactedPersonDesignation: string;
    contactedPersonMobNo: string;
    employeeEmployerRapport: string;
    financialLoansTaken: YesNo;
    financialLoansSpecify: string;
    longLeavesTaken: YesNo;
    overallFeedbackEmployer: string;
  };
  signatures: {
    preparedBy?: BgSignature;
    checkedBy1: BgSignature;
    checkedBy2: BgSignature;
  };
}

function createEmptyBgData(): BgVerificationData {
  return {
    meta: { totalWorkExperience: '' },
    locality: {
      panchayathName: '',
      councillorName: '',
      panchayathMemberName: '',
      contactNoCouncillor: '',
      contactNoMember: '',
      anyIssueUpdated: '',
      anyIssueSpecify: '',
      policeCaseReported: '',
      policeCaseSpecify: '',
      familyIssues: '',
      familyIssuesSpecify: '',
      overallFeedbackLocality: '',
    },
    social: {
      facebookName: '',
      instagramName: '',
      politicalInterference: '',
      politicalSide: '',
      sharedLikedPages: '',
      instagramFacebookFollowers: '',
      followingPages4Years: '',
      activeInSocialMedia: '',
      overallFeedbackSocialMedia: '',
    },
    employer: {
      employerName: '',
      designation: '',
      periodOfEmploymentFrom: '',
      periodOfEmploymentTo: '',
      totalYearOfEmployment: '',
      contactedPersonName: '',
      contactedPersonDesignation: '',
      contactedPersonMobNo: '',
      employeeEmployerRapport: '',
      financialLoansTaken: '',
      financialLoansSpecify: '',
      longLeavesTaken: '',
      overallFeedbackEmployer: '',
    },
    signatures: {
      checkedBy1: { name: '', role: 'HRD' },
      checkedBy2: { name: '', role: 'HRM' },
    },
  };
}

function mergeSection<T extends object>(defaults: T, saved?: Partial<T>): T {
  return { ...defaults, ...(saved || {}) };
}

function mergeBgData(base: BgVerificationData, saved?: Partial<BgVerificationData>): BgVerificationData {
  if (!saved) return base;
  return {
    meta: mergeSection(base.meta, saved.meta),
    locality: mergeSection(base.locality, saved.locality),
    social: mergeSection(base.social, saved.social),
    employer: mergeSection(base.employer, saved.employer),
    signatures: {
      checkedBy1: mergeSection(base.signatures.checkedBy1, saved.signatures?.checkedBy1),
      checkedBy2: mergeSection(base.signatures.checkedBy2, saved.signatures?.checkedBy2),
      preparedBy: saved.signatures?.preparedBy ?? base.signatures.preparedBy,
    },
  };
}

export function buildInitialBgData(candidate: Candidate): BgVerificationData {
  const saved = candidate.profile?.raw_data?.bg_verification as Partial<BgVerificationData> | undefined;
  if (saved && (saved.locality || saved.social || saved.employer)) {
    return mergeBgData(createEmptyBgData(), saved);
  }

  const preForm = candidate.profile?.raw_data || {};
  const data = createEmptyBgData();

  data.meta.totalWorkExperience =
    candidate.profile?.total_experience ||
    preForm.totalExperience ||
    candidate.experience ||
    '';

  data.locality.panchayathName = preForm.refPanchayat || preForm.permDistrict || '';
  data.locality.panchayathMemberName = preForm.refName || '';
  data.locality.contactNoMember = preForm.refContactNumber || '';

  data.social.facebookName = preForm.facebookName || preForm.facebookUrl || '';
  data.social.instagramName = preForm.instagramName || preForm.instagramUrl || '';

  data.employer.employerName =
    preForm.prevCompanyName || preForm.prev1Name || candidate.profile?.current_company || '';
  data.employer.designation = preForm.prevPosition || preForm.prev1Position || '';
  data.employer.periodOfEmploymentFrom = preForm.prev1From || '';
  data.employer.periodOfEmploymentTo = preForm.prev1To || '';
  data.employer.totalYearOfEmployment = data.meta.totalWorkExperience;

  return data;
}

export function validateBgVerification(data: BgVerificationData): string[] {
  const errors: string[] = [];

  const requireYesNo = (value: YesNo, label: string) => {
    if (!value) errors.push(`${label} is required`);
  };

  const requireSpecifyIfYes = (value: YesNo, specify: string, label: string) => {
    if (value === 'Yes' && !specify.trim()) {
      errors.push(`${label}: please specify details`);
    }
  };

  const requireFeedback = (value: string, label: string) => {
    if (!value.trim()) errors.push(`${label} is required`);
  };

  requireYesNo(data.locality.anyIssueUpdated, 'Locality — any issue updated');
  requireSpecifyIfYes(data.locality.anyIssueUpdated, data.locality.anyIssueSpecify, 'Locality — issue details');
  requireYesNo(data.locality.policeCaseReported, 'Locality — police case reported');
  requireSpecifyIfYes(data.locality.policeCaseReported, data.locality.policeCaseSpecify, 'Locality — police case details');
  requireYesNo(data.locality.familyIssues, 'Locality — family issues');
  requireSpecifyIfYes(data.locality.familyIssues, data.locality.familyIssuesSpecify, 'Locality — family issue details');
  requireFeedback(data.locality.overallFeedbackLocality, 'Locality overall feedback');

  requireYesNo(data.social.politicalInterference, 'Social media — political interference');
  requireSpecifyIfYes(data.social.politicalInterference, data.social.politicalSide, 'Social media — political side');
  requireYesNo(data.social.activeInSocialMedia, 'Social media — active on social media');
  requireFeedback(data.social.overallFeedbackSocialMedia, 'Social media overall feedback');

  requireYesNo(data.employer.financialLoansTaken, 'Employer — financial loans');
  requireSpecifyIfYes(data.employer.financialLoansTaken, data.employer.financialLoansSpecify, 'Employer — loan details');
  requireYesNo(data.employer.longLeavesTaken, 'Employer — long leaves taken');
  requireFeedback(data.employer.overallFeedbackEmployer, 'Employer overall feedback');

  return errors;
}

export function getBgWarnings(data: BgVerificationData): string[] {
  const warnings: string[] = [];
  if (data.locality.policeCaseReported === 'Yes') {
    warnings.push('Police case reported — flag for HO review');
  }
  if (data.locality.familyIssues === 'Yes') {
    warnings.push('Family issues reported — flag for HO review');
  }
  if (data.social.politicalInterference === 'Yes') {
    warnings.push('Political interference noted — flag for HO review');
  }
  return warnings;
}
