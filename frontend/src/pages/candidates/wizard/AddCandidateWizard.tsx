import { useState } from 'react';
import {
  User, UserCircle, MapPin, Fingerprint, GraduationCap,
  Languages, Briefcase, Users, HeartHandshake, ShieldAlert
} from 'lucide-react';
import { initialCandidateData } from './wizardTypes';
import type { CandidateFormData, WizardSection, WizardSectionId } from './wizardTypes';
import { getSectionStatus } from './wizardUtils';
import { SectionList } from './SectionList';
import { SectionWrapper } from './SectionWrapper';
import { Button } from '../../../components/ui';
import { createCandidate, uploadResume } from '../../../api/candidates';

import { BasicInfoForm } from './sections/BasicInfoForm';
import { PersonalInfoForm } from './sections/PersonalInfoForm';
import { AddressForm } from './sections/AddressForm';
import { IdentityForm } from './sections/IdentityForm';
import { EducationForm } from './sections/EducationForm';
import { LanguagesForm } from './sections/LanguagesForm';
import { EmploymentForm } from './sections/EmploymentForm';
import { ReferenceForm } from './sections/ReferenceForm';
import { RecruitmentForm } from './sections/RecruitmentForm';
import { MedicalForm } from './sections/MedicalForm';

const WIZARD_SECTIONS: WizardSection[] = [
  { id: 'basic', title: 'Basic Information', icon: User },
  { id: 'personal', title: 'Personal Information', icon: UserCircle },
  { id: 'address', title: 'Address Details', icon: MapPin },
  { id: 'identity', title: 'Identity Documents', icon: Fingerprint },
  { id: 'education', title: 'Education', icon: GraduationCap },
  { id: 'languages', title: 'Languages', icon: Languages },
  { id: 'employment', title: 'Employment History', icon: Briefcase },
  { id: 'reference', title: 'References', icon: Users },
  { id: 'recruitment', title: 'Recruitment Details', icon: HeartHandshake },
  { id: 'medical', title: 'Medical / Declaration', icon: ShieldAlert },
];

interface AddCandidateWizardProps {
  importMode?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AddCandidateWizard = ({ importMode = false, onSuccess, onCancel }: AddCandidateWizardProps) => {
  const [formData, setFormData] = useState<CandidateFormData>(
    importMode ? { 
      ...initialCandidateData, 
      fullName: 'Shiva Sajay', 
      emailId: 'shivasajay007@gmail.com',
      mobileNumber: '9995228904',
      branchName: 'Kalamassery Branch',
      positionAppliedFor: 'Software Developer'
    } : initialCandidateData
  );
  // Default to the first section instead of null since we always show a side-by-side view
  const [activeSection, setActiveSection] = useState<WizardSectionId>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleUpdateField = (field: keyof CandidateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStatusCheck = (id: WizardSectionId) => getSectionStatus(id, formData);

  const handleSubmit = async () => {
    // Basic validation to ensure at least BasicInfo is filled before creating
    const basicStatus = getSectionStatus('basic', formData);
    if (basicStatus !== 'Complete') {
      setError('Basic Information is mandatory to create a candidate profile.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const { resumeFile, resumeUrl, resumeFileObject, profilePicture, ...applicationData } = formData;
      
      const candidate = await createCandidate({
        full_name: formData.fullName,
        phone: formData.mobileNumber,
        email: formData.emailId,
        source_channel: formData.source,
        branch_location: formData.branchName,
        application_data: applicationData,
      } as any);

      if (formData.resumeFileObject) {
        await uploadResume(candidate.id, formData.resumeFileObject);
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create candidate');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the active form based on activeSection
  const renderActiveForm = () => {
    switch (activeSection) {
      case 'basic': return <BasicInfoForm data={formData} update={handleUpdateField} />;
      case 'personal': return <PersonalInfoForm data={formData} update={handleUpdateField} />;
      case 'address': return <AddressForm data={formData} update={handleUpdateField} />;
      case 'identity': return <IdentityForm data={formData} update={handleUpdateField} />;
      case 'education': return <EducationForm data={formData} update={handleUpdateField} />;
      case 'languages': return <LanguagesForm data={formData} update={handleUpdateField} />;
      case 'employment': return <EmploymentForm data={formData} update={handleUpdateField} />;
      case 'reference': return <ReferenceForm data={formData} update={handleUpdateField} />;
      case 'recruitment': return <RecruitmentForm data={formData} update={handleUpdateField} />;
      case 'medical': return <MedicalForm data={formData} update={handleUpdateField} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Top Navigation - Horizontal Tabs */}
      <div className="w-full bg-surface px-6 pt-4 pb-2 z-10">
        <SectionList
          sections={WIZARD_SECTIONS}
          getSectionStatus={handleStatusCheck}
          activeSection={activeSection}
          onSelectSection={setActiveSection}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative bg-surface">
        <div className="h-full overflow-y-auto px-8 py-6">
          <SectionWrapper
            key={activeSection} // Force re-mount and animation when section changes
            title={WIZARD_SECTIONS.find(s => s.id === activeSection)?.title || ''}
          >
            {renderActiveForm()}
          </SectionWrapper>
        </div>
      </div>

      {/* Persistent Footer Actions */}
      <div className="px-6 py-4 flex justify-between items-center bg-surface z-10 mt-auto">
        {error ? (
          <p className="text-sm text-danger max-w-[60%]">{error}</p>
        ) : (
          <p className="text-sm text-text-secondary">
            {WIZARD_SECTIONS.filter(s => handleStatusCheck(s.id) === 'Complete').length} / {WIZARD_SECTIONS.length} sections complete
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
            Save Candidate
          </Button>
        </div>
      </div>
    </div>
  );
};
