import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { initialCandidateData } from './wizard/wizardTypes';
import type { CandidateFormData } from './wizard/wizardTypes';
import { publicGetFullStatus, publicApplyFullCandidate } from '../../api/candidates';
import { LoadingSpinner, Button } from '../../components/ui';

import { PersonalInfoForm } from './wizard/sections/PersonalInfoForm';
import { AddressForm } from './wizard/sections/AddressForm';
import { IdentityForm } from './wizard/sections/IdentityForm';
import { EducationForm } from './wizard/sections/EducationForm';
import { EmploymentForm } from './wizard/sections/EmploymentForm';
import { RecruitmentForm } from './wizard/sections/RecruitmentForm';
import { MedicalForm } from './wizard/sections/MedicalForm';

export default function PreFormPage() {
  const { token } = useParams<{ token: string }>();

  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CandidateFormData>(initialCandidateData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!token) {
      setStatusError('Missing token. Please use the link provided by your HR recruiter.');
      setLoading(false);
      return;
    }

    publicGetFullStatus(token)
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
  }, [token]);

  const handleUpdateField = (field: keyof CandidateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    setErrorText('');

    try {
      const { resumeFile: _resumeFile, resumeUrl: _resumeUrl, resumeFileObject: _resumeFileObject, profilePicture: _profilePicture, ...applicationData } = formData;
      const candidateObj = await publicApplyFullCandidate(token, applicationData);
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
        </div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mt-10">
          <div className="w-16 h-16 bg-muted text-foreground border border-border rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold font-heading text-text-primary mb-3 tracking-tight">Link Invalid</h2>
          <p className="text-text-secondary leading-relaxed text-base">{statusError}</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mt-10">
          <div className="w-16 h-16 bg-foreground text-background rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold font-heading text-text-primary mb-3 tracking-tight">Onboarding Submitted!</h2>
          <p className="text-text-secondary leading-relaxed mb-8 text-base">
            Thank you, <span className="font-semibold text-foreground">{candidateName}</span>. Your comprehensive onboarding profile has been registered.
          </p>
          <div className="py-6 border-y border-border mb-8">
            <p className="text-xs text-text-secondary uppercase tracking-widest font-bold mb-2">Onboarding Reference ID</p>
            <p className="text-3xl font-extrabold text-foreground">{submitSuccess}</p>
          </div>
          <p className="text-sm text-text-secondary">Your recruiter will contact you shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10 pb-6 border-b border-border">
          <div>
            <h1 className="text-3xl font-extrabold font-heading text-text-primary tracking-tight">
              Pre-Interview Form
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Welcome, <span className="font-semibold text-foreground">{candidateName}</span>. Please complete all sections below.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          <div className="pb-8 border-b border-border">
            <h2 className="text-xl font-bold font-heading text-text-primary mb-6 pb-4 border-b border-border tracking-tight">Personal Details</h2>
            <PersonalInfoForm data={formData} update={handleUpdateField} />
          </div>

          <div className="pb-8 border-b border-border">
            <h2 className="text-xl font-bold font-heading text-text-primary mb-6 pb-4 border-b border-border tracking-tight">Address Details</h2>
            <AddressForm data={formData} update={handleUpdateField} />
          </div>

          <div className="pb-8 border-b border-border">
            <h2 className="text-xl font-bold font-heading text-text-primary mb-6 pb-4 border-b border-border tracking-tight">Identity Documents</h2>
            <IdentityForm data={formData} update={handleUpdateField} />
          </div>

          <div className="pb-8 border-b border-border">
            <h2 className="text-xl font-bold font-heading text-text-primary mb-6 pb-4 border-b border-border tracking-tight">Education</h2>
            <EducationForm data={formData} update={handleUpdateField} />
          </div>

          <div className="pb-8 border-b border-border">
            <h2 className="text-xl font-bold font-heading text-text-primary mb-6 pb-4 border-b border-border tracking-tight">Employment History</h2>
            <EmploymentForm data={formData} update={handleUpdateField} />
          </div>

          <div className="pb-8 border-b border-border">
            <h2 className="text-xl font-bold font-heading text-text-primary mb-6 pb-4 border-b border-border tracking-tight">Recruitment Details</h2>
            <RecruitmentForm data={formData} update={handleUpdateField} />
          </div>

          <div className="pb-8 border-b border-border">
            <h2 className="text-xl font-bold font-heading text-text-primary mb-6 pb-4 border-b border-border tracking-tight">Medical / Declaration</h2>
            <MedicalForm data={formData} update={handleUpdateField} />
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            {errorText && (
              <p className="text-sm text-foreground font-bold text-center sm:text-left bg-muted p-2 rounded-lg border border-border">{errorText}</p>
            )}
            <div className="w-full sm:w-auto sm:ml-auto">
              <Button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 text-base bg-foreground text-background hover:bg-foreground/90 font-bold transition-all"
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
