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

  aadhaarNumber: string;
  panNumber: string;
  drivingLicenseNumber: string;
  passportNumber: string;

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

  languagesRead: string;
  languagesWrite: string;
  languagesSpeak: string;

  previousExperience: boolean;
  prevCompanyName: string;
  prevPosition: string;
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

  medicalRemarks: string;
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
  hasReference: false,
  refRole: '',
  refName: '',
  refPanchayat: '',
  refContactNumber: '',
  sourceOfOpening: '',
  referredBy: '',
  preferredRegion: '',
  expectedJoiningDate: '',
  medicalRemarks: '',
};
