import type { CandidateFormData, SectionStatus, WizardSectionId } from './wizardTypes';

export const getSectionStatus = (sectionId: WizardSectionId, data: CandidateFormData): SectionStatus => {
  switch (sectionId) {
    case 'basic': {
      const required = [data.candidateId, data.fullName, data.mobileNumber, data.emailId, data.positionAppliedFor, data.source, data.appliedDate];
      const filled = required.filter(v => v.trim() !== '').length;
      if (filled === required.length) return 'Complete';
      if (filled > 0) return 'Partial';
      return 'Pending';
    }
    case 'personal': {
      const required = [data.nameAadhaar, data.gender, data.dateOfBirth, data.age, data.maritalStatus, data.height, data.weight, data.bloodGroup, data.religionCaste];
      const filled = required.filter(v => v.trim() !== '').length;
      if (filled === required.length) return 'Complete';
      if (filled > 0) return 'Partial';
      return 'Pending';
    }
    case 'address': {
      const permReq = [data.permHouseName, data.permPostOffice, data.permLandmark, data.permDistrict, data.permPinCode];
      let required = [...permReq];
      if (!data.sameAsPermanent) {
        required.push(data.presHouseName, data.presPostOffice, data.presLandmark, data.presDistrict, data.presPinCode);
      }
      const filled = required.filter(v => v.trim() !== '').length;
      if (filled === required.length) return 'Complete';
      if (filled > 0) return 'Partial';
      return 'Pending';
    }
    case 'identity': {
      const required = [data.aadhaarNumber, data.panNumber, data.drivingLicenseNumber];
      const filled = required.filter(v => v.trim() !== '').length;
      if (filled === required.length) return 'Complete';
      if (filled > 0) return 'Partial';
      return 'Pending';
    }
    case 'education': {
      // All optional, so let's check if they filled any
      const anyFilled = [data.class10School, data.class12School, data.gradCollege, data.postGradCollege].some(v => v.trim() !== '');
      return anyFilled ? 'Complete' : 'Pending';
    }
    case 'languages': {
      return data.languagesRead.trim() !== '' ? 'Complete' : 'Pending';
    }
    case 'employment': {
      let required = [String(data.previousExperience), data.totalExperience, data.expectedSalary];
      if (data.previousExperience) {
        required.push(data.prevCompanyName, data.prevPosition);
      }
      const filled = required.filter(v => v.trim() !== '').length;
      if (filled === required.length) return 'Complete';
      if (filled > 0) return 'Partial';
      return 'Pending';
    }
    case 'reference': {
      const required = [data.refRole, data.refName, data.refPanchayat, data.refContactNumber];
      const filled = required.filter(v => v.trim() !== '').length;
      if (filled === required.length) return 'Complete';
      if (filled > 0) return 'Partial';
      return 'Pending';
    }
    case 'recruitment': {
      const required = [data.sourceOfOpening, data.referredBy, data.preferredRegion, data.expectedJoiningDate];
      const filled = required.filter(v => v.trim() !== '').length;
      if (filled === required.length) return 'Complete';
      if (filled > 0) return 'Partial';
      return 'Pending';
    }
    case 'medical': {
      // All optional boolean toggles, so considered complete by default since they have a boolean state
      return 'Complete';
    }
    default:
      return 'Pending';
  }
};
