import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { initialCandidateData } from './wizard/wizardTypes';
import type { CandidateFormData } from './wizard/wizardTypes';
import { publicGetFullStatus, publicApplyFullCandidate } from '../../api/candidates';
import { LoadingSpinner, Button } from '../../components/ui';
import { validatePreForm } from '../../lib/validatePreForm';
import { PublicShell } from '../../components/layout/PublicShell';

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

    const validationError = validatePreForm(formData);
    if (validationError) {
      setErrorText(validationError);
      return;
    }

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
      <PublicShell maxWidth="2xl">
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      </PublicShell>
    );
  }

  if (statusError) {
    return (
      <PublicShell maxWidth="2xl">
        <div className="text-center py-8">
          <div className="status-icon-error">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-text-primary mb-2">Link unavailable</h2>
          <p className="text-text-secondary max-w-lg mx-auto">{statusError}</p>
        </div>
      </PublicShell>
    );
  }

  if (submitSuccess) {
    return (
      <PublicShell maxWidth="2xl">
        <div className="text-center py-8">
          <div className="status-icon-success">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-text-primary mb-2">Application submitted</h2>
          <p className="text-text-secondary mb-8">
            Thank you, <span className="font-medium text-text-primary">{candidateName}</span>. Your pre-interview form is complete.
          </p>
          <div className="py-5 border-y border-border mb-6 max-w-sm mx-auto">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">Reference ID</p>
            <p className="text-2xl font-semibold text-text-primary tabular-nums">{submitSuccess}</p>
          </div>
          <p className="text-sm text-text-secondary">Your recruiter will review your details and contact you about next steps.</p>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell maxWidth="2xl">
      <div className="page-card p-6 sm:p-8">
        <div className="mb-8 pb-6 border-b border-border">
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Pre-interview form</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Welcome, <span className="font-medium text-text-primary">{candidateName}</span>. Complete every section before submitting.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Personal details</h2>
            <PersonalInfoForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Address details</h2>
            <AddressForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Identity documents</h2>
            <IdentityForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Education</h2>
            <EducationForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Employment history</h2>
            <EmploymentForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Recruitment details</h2>
            <RecruitmentForm data={formData} update={handleUpdateField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Medical and declaration</h2>
            <MedicalForm data={formData} update={handleUpdateField} />
          </section>

          <div className="pt-2 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            {errorText && (
              <p role="alert" className="text-sm text-danger bg-danger/5 p-3 rounded-lg border border-danger/20 flex-1">{errorText}</p>
            )}
            <Button type="submit" className="w-full sm:w-auto sm:ml-auto h-10 px-8" isLoading={isSubmitting}>
              Submit application
            </Button>
          </div>
        </form>
      </div>
    </PublicShell>
  );
}
