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

  aadhaarNumber: string;
  panNumber: string;
  drivingLicenseNumber: string;
  passportNumber: string;

  confidentToDrive: boolean;
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
  gradCollege: string;
  gradPercentage: string;
  gradPassingYear: string;
  gradMode: string;

  postGradCourse: string;
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
  prevCompanyName: string;
  prevPosition: string;
  prev1Reporting: string;
  prev1From: string;
  prev1To: string;
  prev1Salary: string;
  prev1Reason: string;

  prev2Name: string;
  prev2Position: string;
  prev2Reporting: string;
  prev2From: string;
  prev2To: string;
  prev2Salary: string;
  prev2Reason: string;

  prev3Name: string;
  prev3Position: string;
  prev3Reporting: string;
  prev3From: string;
  prev3To: string;
  prev3Salary: string;
  prev3Reason: string;

  prev4Name: string;
  prev4Position: string;
  prev4Reporting: string;
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

  prevTerminated: boolean;
  physicalDisability: boolean;
  nervousDisorder: boolean;
  eyeVision: boolean;
  criminalConviction: boolean;
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
  confidentToDrive: false,
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
  gradCollege: '',
  gradPercentage: '',
  gradPassingYear: '',
  gradMode: '',
  postGradCourse: '',
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
  prevCompanyName: '',
  prevPosition: '',
  prev1Reporting: '',
  prev1From: '',
  prev1To: '',
  prev1Salary: '',
  prev1Reason: '',
  prev2Name: '',
  prev2Position: '',
  prev2Reporting: '',
  prev2From: '',
  prev2To: '',
  prev2Salary: '',
  prev2Reason: '',
  prev3Name: '',
  prev3Position: '',
  prev3Reporting: '',
  prev3From: '',
  prev3To: '',
  prev3Salary: '',
  prev3Reason: '',
  prev4Name: '',
  prev4Position: '',
  prev4Reporting: '',
  prev4From: '',
  prev4To: '',
  prev4Salary: '',
  prev4Reason: '',
  totalExperience: 'Fresher',
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
  prevTerminated: false,
  physicalDisability: false,
  nervousDisorder: false,
  eyeVision: false,
  criminalConviction: false,
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
