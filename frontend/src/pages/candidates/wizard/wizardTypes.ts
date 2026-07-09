export type SectionStatus = 'Complete' | 'Partial' | 'Pending';

export type WizardSectionId =
  | 'basic'
  | 'personal'
  | 'address'
  | 'identity'
  | 'education'
  | 'languages'
  | 'employment'
  | 'reference'
  | 'recruitment'
  | 'medical';

export interface WizardSection {
  id: WizardSectionId;
  title: string;
  icon: any; // LucideIcon type
}

// Full candidate schema based on the detailed requirements
export interface CandidateFormData {
  // 1. Basic Information
  candidateId: string;
  fullName: string;
  mobileNumber: string;
  emailId: string;
  positionAppliedFor: string;
  branchName: string;
  source: string;
  appliedDate: string;
  resumeFile: string | null; // Simulating file upload (filename)
  resumeFileObject: File | null; // Actual file to be uploaded
  resumeUrl: string | null; // URL for previewing the document
  profilePicture: string | null; // Simulating image upload

  // 2. Personal Information
  nameAadhaar: string;
  gender: string;
  dateOfBirth: string;
  age: string;
  maritalStatus: string;
  height: string;
  weight: string;
  bloodGroup: string;
  religionCaste: string;

  // 3. Address
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

  // 4. Identity Documents
  aadhaarNumber: string;
  panNumber: string;
  drivingLicenseNumber: string;
  passportNumber: string;

  // 5. Education
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
  gradCollege: string;
  gradPercentage: string;
  gradPassingYear: string;

  postGradCourse: string;
  postGradCollege: string;
  postGradPercentage: string;
  postGradPassingYear: string;

  // 6. Languages
  languagesRead: string;
  languagesWrite: string;
  languagesSpeak: string;

  // 7. Employment History
  previousExperience: boolean;
  prevCompanyName: string;
  prevPosition: string;
  totalExperience: string;
  expectedSalary: string;

  // 8. Reference
  refRole: string;
  refName: string;
  refPanchayat: string;
  refContactNumber: string;

  // 9. Recruitment Information
  sourceOfOpening: string;
  referredBy: string;
  preferredRegion: string;
  expectedJoiningDate: string;

  // 10. Medical / Declaration
  prevTerminated: boolean;
  physicalDisability: boolean;
  nervousDisorder: boolean;
  eyeVision: boolean;
  criminalConviction: boolean;
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

  nameAadhaar: '',
  gender: '',
  dateOfBirth: '',
  age: '',
  maritalStatus: '',
  height: '',
  weight: '',
  bloodGroup: '',
  religionCaste: '',

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
  gradCollege: '',
  gradPercentage: '',
  gradPassingYear: '',
  postGradCourse: '',
  postGradCollege: '',
  postGradPercentage: '',
  postGradPassingYear: '',

  languagesRead: '',
  languagesWrite: '',
  languagesSpeak: '',

  previousExperience: false,
  prevCompanyName: '',
  prevPosition: '',
  totalExperience: '',
  expectedSalary: '',

  refRole: '',
  refName: '',
  refPanchayat: '',
  refContactNumber: '',

  sourceOfOpening: '',
  referredBy: '',
  preferredRegion: '',
  expectedJoiningDate: '',

  prevTerminated: false,
  physicalDisability: false,
  nervousDisorder: false,
  eyeVision: false,
  criminalConviction: false,
};
