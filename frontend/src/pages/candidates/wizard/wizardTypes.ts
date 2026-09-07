export interface PreviousJob {
  company: string;
  position: string;
  reporting: string;
  reportingDesignation: string;
  reportingPhone: string;
  fromDate: string;
  toDate: string;
  salary: string;
  reason: string;
}

export const EMPTY_PREVIOUS_JOB: PreviousJob = {
  company: '',
  position: '',
  reporting: '',
  reportingDesignation: '',
  reportingPhone: '',
  fromDate: '',
  toDate: '',
  salary: '',
  reason: '',
};

export interface FamilyMember {
  relation: string;
  name: string;
  age: string;
  occupation: string;
  company: string;
  phone: string;
}

export const EMPTY_FAMILY_MEMBER: FamilyMember = {
  relation: '',
  name: '',
  age: '',
  occupation: '',
  company: '',
  phone: '',
};

export interface CandidateFormData {
  candidateId: string;
  fullName: string;
  mobileNumber: string;
  emailId: string;
  positionAppliedFor: string;
  branchName: string;
  source: string;
  appliedDate: string;
  resumeFile: string | null;
  resumeFileObject: File | null;
  resumeUrl: string | null;
  profilePicture: string | null;
  photoFileObject: File | null;

  nameAadhaar: string;
  gender: string;
  dateOfBirth: string;
  age: string;
  maritalStatus: string;
  height: string;
  weight: string;
  bloodGroup: string;
  religionCaste: string;
  positionSuitable: string;

  permHouseName: string;
  permPostOffice: string;
  permLandmark: string;
  permDistrict: string;
  permPinCode: string;

  sameAsPermanent: boolean;
  presHouseName: string;
  presPostOffice: string;
  presLandmark: string;
  presDistrict: string;
  presPinCode: string;

  aadhaarNumber?: string;
  panNumber?: string;
  drivingLicenseNumber?: string;
  passportNumber?: string;

  hasValidDrivingLicense: boolean | null;
  confidentToDrive: boolean | null;
  drive2Wheeler: boolean;
  drive3Wheeler: boolean;
  drive4Wheeler: boolean;
  driveHeavy: boolean;

  class10School: string;
  class10Board: string;
  class10Percentage: string;
  class10PassingYear: string;
  class10Mode: string;

  class12School: string;
  class12Stream: string;
  class12Percentage: string;
  class12PassingYear: string;
  class12Mode: string;

  gradCourse: string;
  gradStream: string;
  gradCollege: string;
  gradPercentage: string;
  gradPassingYear: string;
  gradMode: string;

  postGradCourse: string;
  postGradStream: string;
  postGradCollege: string;
  postGradPercentage: string;
  postGradPassingYear: string;
  postGradMode: string;

  compWord: boolean;
  compExcel: boolean;
  compPowerPoint: boolean;
  compTally: boolean;
  compOther: boolean;
  softwareCerts: string;

  languagesRead: string;
  languagesWrite: string;
  languagesSpeak: string;
  languagesOther: string;

  familyMembers: FamilyMember[];

  fatherName: string;
  fatherAge: string;
  fatherOccupation: string;
  fatherCompany: string;
  fatherPhone: string;

  motherName: string;
  motherAge: string;
  motherOccupation: string;
  motherCompany: string;
  motherPhone: string;

  spouseName: string;
  spouseAge: string;
  spouseOccupation: string;
  spouseCompany: string;
  spousePhone: string;

  child1Relation: string;
  child1Name: string;
  child1Age: string;
  child1Occupation: string;
  child1Company: string;
  child1Phone: string;

  child2Relation: string;
  child2Name: string;
  child2Age: string;
  child2Occupation: string;
  child2Company: string;
  child2Phone: string;

  child3Relation: string;
  child3Name: string;
  child3Age: string;
  child3Occupation: string;
  child3Company: string;
  child3Phone: string;

  sibling1Relation: string;
  sibling1Name: string;
  sibling1Age: string;
  sibling1Occupation: string;
  sibling1Company: string;
  sibling1Phone: string;

  sibling2Relation: string;
  sibling2Name: string;
  sibling2Age: string;
  sibling2Occupation: string;
  sibling2Company: string;
  sibling2Phone: string;

  sibling3Relation: string;
  sibling3Name: string;
  sibling3Age: string;
  sibling3Occupation: string;
  sibling3Company: string;
  sibling3Phone: string;

  previousExperience: boolean;
  previousJobs: PreviousJob[];
  prevCompanyName: string;
  prevPosition: string;
  prev1Reporting: string;
  prev1ReportingDesignation: string;
  prev1ReportingPhone: string;
  prev1From: string;
  prev1To: string;
  prev1Salary: string;
  prev1Reason: string;

  prev2Name: string;
  prev2Position: string;
  prev2Reporting: string;
  prev2ReportingDesignation: string;
  prev2ReportingPhone: string;
  prev2From: string;
  prev2To: string;
  prev2Salary: string;
  prev2Reason: string;

  prev3Name: string;
  prev3Position: string;
  prev3Reporting: string;
  prev3ReportingDesignation: string;
  prev3ReportingPhone: string;
  prev3From: string;
  prev3To: string;
  prev3Salary: string;
  prev3Reason: string;

  prev4Name: string;
  prev4Position: string;
  prev4Reporting: string;
  prev4ReportingDesignation: string;
  prev4ReportingPhone: string;
  prev4From: string;
  prev4To: string;
  prev4Salary: string;
  prev4Reason: string;

  totalExperience: string;
  expectedSalary: string;

  refRole: string;
  refName: string;
  refPanchayat: string;
  refContactNumber: string;
  hasReference: boolean;

  sourceOfOpening: string;
  referredBy: string;
  preferredRegion: string;
  expectedJoiningDate: string;

  achievements: string;
  hobbies: string;

  prevTerminated: boolean | null;
  physicalDisability: boolean | null;
  nervousDisorder: boolean | null;
  eyeVision: boolean | null;
  criminalConviction: boolean | null;
  medicalRemarks: string;

  emergency1Relation: string;
  emergency1Name: string;
  emergency1Address: string;
  emergency1Contact: string;

  emergency2Relation: string;
  emergency2Name: string;
  emergency2Address: string;
  emergency2Contact: string;

  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;

  declarationPlace: string;
  declarationDate: string;
  declarationName: string;
}

function jobHasContent(job: PreviousJob): boolean {
  return [
    job.company,
    job.position,
    job.reporting,
    job.reportingDesignation,
    job.reportingPhone,
    job.fromDate,
    job.toDate,
    job.salary,
    job.reason,
  ].some((value) => (value || '').trim().length > 0);
}

function familyMemberHasContent(member: FamilyMember): boolean {
  return [member.relation, member.name, member.age, member.occupation, member.company, member.phone]
    .some((value) => (value || '').trim().length > 0);
}

function familyMemberFromRaw(value: unknown): FamilyMember | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const member: FamilyMember = {
    relation: String(row.relation ?? row.rel ?? '').trim(),
    name: String(row.name ?? '').trim(),
    age: String(row.age ?? '').trim(),
    occupation: String(row.occupation ?? row.occ ?? '').trim(),
    company: String(row.company ?? row.co ?? '').trim(),
    phone: String(row.phone ?? row.ph ?? '').trim(),
  };
  return familyMemberHasContent(member) ? member : null;
}

function legacyFamilyMember(
  data: CandidateFormData,
  prefix: 'father' | 'mother' | 'spouse' | 'child1' | 'child2' | 'child3' | 'sibling1' | 'sibling2' | 'sibling3',
  relation: string,
): FamilyMember {
  return {
    relation: prefix.startsWith('child') || prefix.startsWith('sibling')
      ? String(data[`${prefix}Relation` as keyof CandidateFormData] || relation)
      : relation,
    name: String(data[`${prefix}Name` as keyof CandidateFormData] || ''),
    age: String(data[`${prefix}Age` as keyof CandidateFormData] || ''),
    occupation: String(data[`${prefix}Occupation` as keyof CandidateFormData] || ''),
    company: String(data[`${prefix}Company` as keyof CandidateFormData] || ''),
    phone: String(data[`${prefix}Phone` as keyof CandidateFormData] || ''),
  };
}

export function familyMembersFromForm(data: CandidateFormData): FamilyMember[] {
  if (Array.isArray(data.familyMembers) && data.familyMembers.length > 0) {
    return data.familyMembers
      .map(familyMemberFromRaw)
      .filter((member): member is FamilyMember => member !== null);
  }
  return [
    legacyFamilyMember(data, 'father', 'Father'),
    legacyFamilyMember(data, 'mother', 'Mother'),
    legacyFamilyMember(data, 'spouse', 'Spouse'),
    legacyFamilyMember(data, 'child1', 'Son / Daughter'),
    legacyFamilyMember(data, 'child2', 'Son / Daughter'),
    legacyFamilyMember(data, 'child3', 'Son / Daughter'),
    legacyFamilyMember(data, 'sibling1', 'Brother / Sister'),
    legacyFamilyMember(data, 'sibling2', 'Brother / Sister'),
    legacyFamilyMember(data, 'sibling3', 'Brother / Sister'),
  ].filter(familyMemberHasContent);
}

export function familyMembersPatch(members: FamilyMember[]): Partial<CandidateFormData> {
  const normalized = members
    .map(familyMemberFromRaw)
    .filter((member): member is FamilyMember => member !== null);
  const empty = EMPTY_FAMILY_MEMBER;
  const findRelation = (relation: string, fallbackIndex: number) =>
    normalized.find((member) => member.relation.trim().toLowerCase() === relation) || normalized[fallbackIndex] || empty;
  const father = findRelation('father', 0);
  const mother = findRelation('mother', 1);
  const spouse = normalized.find((member) => member.relation.trim().toLowerCase() === 'spouse') || empty;
  const optional = normalized.filter((member) => member !== father && member !== mother && member !== spouse);
  const child1 = optional[0] || empty;
  const child2 = optional[1] || empty;
  const child3 = optional[2] || empty;
  const sibling1 = optional[3] || empty;
  const sibling2 = optional[4] || empty;
  const sibling3 = optional[5] || empty;
  return {
    familyMembers: normalized,
    fatherName: father.name,
    fatherAge: father.age,
    fatherOccupation: father.occupation,
    fatherCompany: father.company,
    fatherPhone: father.phone,
    motherName: mother.name,
    motherAge: mother.age,
    motherOccupation: mother.occupation,
    motherCompany: mother.company,
    motherPhone: mother.phone,
    spouseName: spouse.name,
    spouseAge: spouse.age,
    spouseOccupation: spouse.occupation,
    spouseCompany: spouse.company,
    spousePhone: spouse.phone,
    child1Relation: child1.relation,
    child1Name: child1.name,
    child1Age: child1.age,
    child1Occupation: child1.occupation,
    child1Company: child1.company,
    child1Phone: child1.phone,
    child2Relation: child2.relation,
    child2Name: child2.name,
    child2Age: child2.age,
    child2Occupation: child2.occupation,
    child2Company: child2.company,
    child2Phone: child2.phone,
    child3Relation: child3.relation,
    child3Name: child3.name,
    child3Age: child3.age,
    child3Occupation: child3.occupation,
    child3Company: child3.company,
    child3Phone: child3.phone,
    sibling1Relation: sibling1.relation,
    sibling1Name: sibling1.name,
    sibling1Age: sibling1.age,
    sibling1Occupation: sibling1.occupation,
    sibling1Company: sibling1.company,
    sibling1Phone: sibling1.phone,
    sibling2Relation: sibling2.relation,
    sibling2Name: sibling2.name,
    sibling2Age: sibling2.age,
    sibling2Occupation: sibling2.occupation,
    sibling2Company: sibling2.company,
    sibling2Phone: sibling2.phone,
    sibling3Relation: sibling3.relation,
    sibling3Name: sibling3.name,
    sibling3Age: sibling3.age,
    sibling3Occupation: sibling3.occupation,
    sibling3Company: sibling3.company,
    sibling3Phone: sibling3.phone,
  };
}

function rawJobValue(row: Record<string, unknown>, canonical: string, ...aliases: string[]): string {
  for (const key of [canonical, ...aliases]) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const value = row[key];
      return value == null ? '' : String(value).trim();
    }
  }
  return '';
}

function normalizePreviousJob(value: unknown): PreviousJob | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const job: PreviousJob = {
    company: rawJobValue(row, 'company', 'co'),
    position: rawJobValue(row, 'position', 'pos'),
    reporting: rawJobValue(row, 'reporting', 'rep'),
    reportingDesignation: rawJobValue(row, 'reportingDesignation', 'repDesignation'),
    reportingPhone: rawJobValue(row, 'reportingPhone', 'repPhone'),
    fromDate: rawJobValue(row, 'fromDate', 'from', 'from_date'),
    toDate: rawJobValue(row, 'toDate', 'to', 'to_date'),
    salary: rawJobValue(row, 'salary', 'sal'),
    reason: rawJobValue(row, 'reason'),
  };
  return jobHasContent(job) ? job : null;
}

export function previousJobsFromForm(data: CandidateFormData): PreviousJob[] {
  if (Array.isArray(data.previousJobs) && data.previousJobs.length > 0) {
    return data.previousJobs
      .map(normalizePreviousJob)
      .filter((job): job is PreviousJob => job !== null);
  }
  return [
    {
      company: data.prevCompanyName,
      position: data.prevPosition,
      reporting: data.prev1Reporting,
      reportingDesignation: data.prev1ReportingDesignation,
      reportingPhone: data.prev1ReportingPhone,
      fromDate: data.prev1From,
      toDate: data.prev1To,
      salary: data.prev1Salary,
      reason: data.prev1Reason,
    },
    {
      company: data.prev2Name,
      position: data.prev2Position,
      reporting: data.prev2Reporting,
      reportingDesignation: data.prev2ReportingDesignation,
      reportingPhone: data.prev2ReportingPhone,
      fromDate: data.prev2From,
      toDate: data.prev2To,
      salary: data.prev2Salary,
      reason: data.prev2Reason,
    },
    {
      company: data.prev3Name,
      position: data.prev3Position,
      reporting: data.prev3Reporting,
      reportingDesignation: data.prev3ReportingDesignation,
      reportingPhone: data.prev3ReportingPhone,
      fromDate: data.prev3From,
      toDate: data.prev3To,
      salary: data.prev3Salary,
      reason: data.prev3Reason,
    },
    {
      company: data.prev4Name,
      position: data.prev4Position,
      reporting: data.prev4Reporting,
      reportingDesignation: data.prev4ReportingDesignation,
      reportingPhone: data.prev4ReportingPhone,
      fromDate: data.prev4From,
      toDate: data.prev4To,
      salary: data.prev4Salary,
      reason: data.prev4Reason,
    },
  ].filter(jobHasContent);
}

export function previousJobsPatch(jobs: PreviousJob[]): Partial<CandidateFormData> {
  const slot = (index: number): PreviousJob => jobs[index] ?? EMPTY_PREVIOUS_JOB;
  return {
    previousJobs: jobs,
    prevCompanyName: slot(0).company,
    prevPosition: slot(0).position,
    prev1Reporting: slot(0).reporting,
    prev1ReportingDesignation: slot(0).reportingDesignation,
    prev1ReportingPhone: slot(0).reportingPhone,
    prev1From: slot(0).fromDate,
    prev1To: slot(0).toDate,
    prev1Salary: slot(0).salary,
    prev1Reason: slot(0).reason,
    prev2Name: slot(1).company,
    prev2Position: slot(1).position,
    prev2Reporting: slot(1).reporting,
    prev2ReportingDesignation: slot(1).reportingDesignation,
    prev2ReportingPhone: slot(1).reportingPhone,
    prev2From: slot(1).fromDate,
    prev2To: slot(1).toDate,
    prev2Salary: slot(1).salary,
    prev2Reason: slot(1).reason,
    prev3Name: slot(2).company,
    prev3Position: slot(2).position,
    prev3Reporting: slot(2).reporting,
    prev3ReportingDesignation: slot(2).reportingDesignation,
    prev3ReportingPhone: slot(2).reportingPhone,
    prev3From: slot(2).fromDate,
    prev3To: slot(2).toDate,
    prev3Salary: slot(2).salary,
    prev3Reason: slot(2).reason,
    prev4Name: slot(3).company,
    prev4Position: slot(3).position,
    prev4Reporting: slot(3).reporting,
    prev4ReportingDesignation: slot(3).reportingDesignation,
    prev4ReportingPhone: slot(3).reportingPhone,
    prev4From: slot(3).fromDate,
    prev4To: slot(3).toDate,
    prev4Salary: slot(3).salary,
    prev4Reason: slot(3).reason,
  };
}

export const initialCandidateData: CandidateFormData = {
  candidateId: '',
  fullName: '',
  mobileNumber: '',
  emailId: '',
  positionAppliedFor: '',
  branchName: '',
  source: '',
  appliedDate: new Date().toISOString().split('T')[0],
  resumeFile: null,
  resumeFileObject: null,
  resumeUrl: null,
  profilePicture: null,
  photoFileObject: null,
  nameAadhaar: '',
  gender: '',
  dateOfBirth: '',
  age: '',
  maritalStatus: '',
  height: '',
  weight: '',
  bloodGroup: '',
  religionCaste: '',
  positionSuitable: '',
  permHouseName: '',
  permPostOffice: '',
  permLandmark: '',
  permDistrict: '',
  permPinCode: '',
  sameAsPermanent: true,
  presHouseName: '',
  presPostOffice: '',
  presLandmark: '',
  presDistrict: '',
  presPinCode: '',
  aadhaarNumber: '',
  panNumber: '',
  drivingLicenseNumber: '',
  passportNumber: '',
  hasValidDrivingLicense: null,
  confidentToDrive: null,
  drive2Wheeler: false,
  drive3Wheeler: false,
  drive4Wheeler: false,
  driveHeavy: false,
  class10School: '',
  class10Board: '',
  class10Percentage: '',
  class10PassingYear: '',
  class10Mode: '',
  class12School: '',
  class12Stream: '',
  class12Percentage: '',
  class12PassingYear: '',
  class12Mode: '',
  gradCourse: '',
  gradStream: '',
  gradCollege: '',
  gradPercentage: '',
  gradPassingYear: '',
  gradMode: '',
  postGradCourse: '',
  postGradStream: '',
  postGradCollege: '',
  postGradPercentage: '',
  postGradPassingYear: '',
  postGradMode: '',
  compWord: false,
  compExcel: false,
  compPowerPoint: false,
  compTally: false,
  compOther: false,
  softwareCerts: '',
  languagesRead: '',
  languagesWrite: '',
  languagesSpeak: '',
  languagesOther: '',
  familyMembers: [],
  fatherName: '',
  fatherAge: '',
  fatherOccupation: '',
  fatherCompany: '',
  fatherPhone: '',
  motherName: '',
  motherAge: '',
  motherOccupation: '',
  motherCompany: '',
  motherPhone: '',
  spouseName: '',
  spouseAge: '',
  spouseOccupation: '',
  spouseCompany: '',
  spousePhone: '',
  child1Relation: '',
  child1Name: '',
  child1Age: '',
  child1Occupation: '',
  child1Company: '',
  child1Phone: '',
  child2Relation: '',
  child2Name: '',
  child2Age: '',
  child2Occupation: '',
  child2Company: '',
  child2Phone: '',
  child3Relation: '',
  child3Name: '',
  child3Age: '',
  child3Occupation: '',
  child3Company: '',
  child3Phone: '',
  sibling1Relation: '',
  sibling1Name: '',
  sibling1Age: '',
  sibling1Occupation: '',
  sibling1Company: '',
  sibling1Phone: '',
  sibling2Relation: '',
  sibling2Name: '',
  sibling2Age: '',
  sibling2Occupation: '',
  sibling2Company: '',
  sibling2Phone: '',
  sibling3Relation: '',
  sibling3Name: '',
  sibling3Age: '',
  sibling3Occupation: '',
  sibling3Company: '',
  sibling3Phone: '',
  previousExperience: false,
  previousJobs: [],
  prevCompanyName: '',
  prevPosition: '',
  prev1Reporting: '',
  prev1ReportingDesignation: '',
  prev1ReportingPhone: '',
  prev1From: '',
  prev1To: '',
  prev1Salary: '',
  prev1Reason: '',
  prev2Name: '',
  prev2Position: '',
  prev2Reporting: '',
  prev2ReportingDesignation: '',
  prev2ReportingPhone: '',
  prev2From: '',
  prev2To: '',
  prev2Salary: '',
  prev2Reason: '',
  prev3Name: '',
  prev3Position: '',
  prev3Reporting: '',
  prev3ReportingDesignation: '',
  prev3ReportingPhone: '',
  prev3From: '',
  prev3To: '',
  prev3Salary: '',
  prev3Reason: '',
  prev4Name: '',
  prev4Position: '',
  prev4Reporting: '',
  prev4ReportingDesignation: '',
  prev4ReportingPhone: '',
  prev4From: '',
  prev4To: '',
  prev4Salary: '',
  prev4Reason: '',
  totalExperience: '',
  expectedSalary: '',
  hasReference: false,
  refRole: '',
  refName: '',
  refPanchayat: '',
  refContactNumber: '',
  sourceOfOpening: '',
  referredBy: '',
  preferredRegion: '',
  expectedJoiningDate: '',
  achievements: '',
  hobbies: '',
  prevTerminated: null,
  physicalDisability: null,
  nervousDisorder: null,
  eyeVision: null,
  criminalConviction: null,
  medicalRemarks: '',
  emergency1Relation: '',
  emergency1Name: '',
  emergency1Address: '',
  emergency1Contact: '',
  emergency2Relation: '',
  emergency2Name: '',
  emergency2Address: '',
  emergency2Contact: '',
  facebookUrl: '',
  instagramUrl: '',
  twitterUrl: '',
  declarationPlace: '',
  declarationDate: '',
  declarationName: '',
};
