import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { initialCandidateData } from './wizard/wizardTypes';
import type { CandidateFormData } from './wizard/wizardTypes';
import { publicGetFullStatus, publicApplyFullCandidate } from '../../api/candidates';
import { LoadingSpinner, Button } from '../../components/ui';

import { PersonalInfoForm } from './wizard/sections/PersonalInfoForm';
import { AddressForm } from './wizard/sections/AddressForm';
import { IdentityForm } from './wizard/sections/IdentityForm';
import { EducationForm } from './wizard/sections/EducationForm';
import { LanguagesForm } from './wizard/sections/LanguagesForm';
import { EmploymentForm } from './wizard/sections/EmploymentForm';
import { ReferenceForm } from './wizard/sections/ReferenceForm';
import { RecruitmentForm } from './wizard/sections/RecruitmentForm';
import { MedicalForm } from './wizard/sections/MedicalForm';

export default function ApplyFullForm() {
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get('candidate');

  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CandidateFormData>(initialCandidateData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!candidateId) {
      setStatusError('Missing candidate ID reference. Please use the link provided by your HR recruiter.');
      setLoading(false);
      return;
    }

    publicGetFullStatus(candidateId)
      .then(res => {
        if (!res.is_awaiting_full_fill) {
          setStatusError('This candidate application form has already been submitted or is not yet open.');
        } else {
          setCandidateName(res.full_name);
          setFormData(prev => ({ ...prev, fullName: res.full_name }));
        }
        setLoading(false);
      })
      .catch(() => {
        setStatusError('Invalid candidate reference URL.');
        setLoading(false);
      });
  }, [candidateId]);

  const handleUpdateField = (field: keyof CandidateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId) return;

    setIsSubmitting(true);
    setErrorText('');

    try {
      const { resumeFile, resumeUrl, resumeFileObject, profilePicture, ...applicationData } = formData;
      const candidateObj = await publicApplyFullCandidate(candidateId, applicationData);
      setSubmitSuccess(candidateObj.candidate_id);
    } catch (err: any) {
      setErrorText(err?.response?.data?.detail || err.message || 'Failed to submit application details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-text-secondary">Loading onboarding form...</p>
        </div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-surface border border-border/80 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">Onboarding Link Invalid</h2>
          <p className="text-text-secondary leading-relaxed mb-6">{statusError}</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-lg w-full bg-surface border border-border/80 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-text-primary mb-3">Onboarding Submitted!</h2>
          <p className="text-text-secondary leading-relaxed mb-6">
            Thank you, {candidateName}. Your comprehensive onboarding profile has been registered.
          </p>
          <div className="bg-background border rounded-xl p-4 mb-6">
            <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-1">Onboarding Reference ID</p>
            <p className="text-2xl font-extrabold text-primary">{submitSuccess}</p>
          </div>
          <p className="text-sm text-text-secondary">Your recruiter will contact you shortly for local interviews.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 mb-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
          <div>
            <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Pre-Interview Profile Form</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Welcome, <span className="font-semibold text-text-primary">{candidateName}</span>. Please complete all sections below.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-text-primary mb-6 pb-2 border-b border-border/40">Personal Details</h2>
            <PersonalInfoForm data={formData} update={handleUpdateField} />
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-text-primary mb-6 pb-2 border-b border-border/40">Address Details</h2>
            <AddressForm data={formData} update={handleUpdateField} />
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-text-primary mb-6 pb-2 border-b border-border/40">Identity Documents</h2>
            <IdentityForm data={formData} update={handleUpdateField} />
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-text-primary mb-6 pb-2 border-b border-border/40">Education</h2>
            <EducationForm data={formData} update={handleUpdateField} />
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-text-primary mb-6 pb-2 border-b border-border/40">Languages</h2>
            <LanguagesForm data={formData} update={handleUpdateField} />
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-text-primary mb-6 pb-2 border-b border-border/40">Employment History</h2>
            <EmploymentForm data={formData} update={handleUpdateField} />
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-text-primary mb-6 pb-2 border-b border-border/40">References</h2>
            <ReferenceForm data={formData} update={handleUpdateField} />
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-text-primary mb-6 pb-2 border-b border-border/40">Recruitment Details</h2>
            <RecruitmentForm data={formData} update={handleUpdateField} />
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-text-primary mb-6 pb-2 border-b border-border/40">Medical / Declaration</h2>
            <MedicalForm data={formData} update={handleUpdateField} />
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            {errorText && (
              <p className="text-sm text-danger font-medium text-center sm:text-left">{errorText}</p>
            )}
            <div className="w-full sm:w-auto sm:ml-auto">
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto px-8 py-3 text-base"
                isLoading={isSubmitting}
              >
                Submit Profile Details
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
