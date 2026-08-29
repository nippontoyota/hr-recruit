import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { initialCandidateData } from './wizard/wizardTypes';
import type { CandidateFormData } from './wizard/wizardTypes';
import { publicGetFullStatus, publicApplyFullCandidate } from '../../api/candidates';
import { Button } from '../../components/ui';
import { extractError, isAbortError } from '../../lib/utils';
import {
  validatePreFormFields,
  validateOnePreFormField,
  type PreFormFieldErrors,
} from '../../lib/validatePreForm';
import { clearPreFormDraft, loadDraftFiles, loadPreFormDraft, savePreFormDraft } from '../../lib/preFormDraft';
import { PublicShell } from '../../components/layout/PublicShell';
import { PublicStatusPanel } from '../../components/candidates/PublicStatusPanel';
import { formatDateTime } from '../../lib/dateTime';

import { PersonalInfoForm } from './wizard/sections/PersonalInfoForm';
import { AddressForm } from './wizard/sections/AddressForm';
import { IdentityForm } from './wizard/sections/IdentityForm';
import { EducationForm } from './wizard/sections/EducationForm';
import { FamilyForm } from './wizard/sections/FamilyForm';
import { EmploymentForm } from './wizard/sections/EmploymentForm';
import { RecruitmentForm } from './wizard/sections/RecruitmentForm';
import { MedicalForm } from './wizard/sections/MedicalForm';
import { EmergencySocialForm } from './wizard/sections/EmergencySocialForm';

export default function PreFormPage() {
  const { token } = useParams<{ token: string }>();

  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CandidateFormData>(initialCandidateData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [errorText, setErrorText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<PreFormFieldErrors>({});
  const photoRef = useRef<File | null>(null);
  const resumeRef = useRef<File | null>(null);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  useEffect(() => {
    if (!token) {
      setStatusError('Missing token. Please use the link provided by your HR recruiter.');
      setLoading(false);
      return;
    }

    const draft = loadPreFormDraft(token);
    publicGetFullStatus(token)
      .then(async (res) => {
        if (!res.is_awaiting_full_fill) {
          if (res.pre_form_status === 'SUBMITTED') {
            setCandidateName(res.full_name);
            setSubmitSuccess(res.full_name);
          } else {
            setStatusError(
              res.pre_form_status === 'NOT_SENT'
                ? 'This candidate application form is not yet open.'
                : 'This candidate application form is not available on this link.'
            );
          }
        } else {
          setCandidateName(res.full_name);
          setExpiresAt(res.pre_form_expires_at || null);
          const files = await loadDraftFiles(token);
          photoRef.current = files.photoFileObject;
          resumeRef.current = files.resumeFileObject;
          setFormData((prev) => ({
            ...prev,
            ...(draft || {}),
            fullName: res.full_name || draft?.fullName || prev.fullName,
            positionAppliedFor: res.position_applied_for || draft?.positionAppliedFor || prev.positionAppliedFor,
            branchName: res.branch_location || draft?.branchName || prev.branchName,
            photoFileObject: files.photoFileObject || prev.photoFileObject,
            resumeFileObject: files.resumeFileObject || prev.resumeFileObject,
          }));
        }
        setLoading(false);
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setStatusError(extractError(err, 'Invalid candidate reference URL.'));
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (!token || loading || statusError || submitSuccess) return;
    savePreFormDraft(token, formData);
    setLastSavedAt(new Date());
  }, [token, formData, loading, statusError, submitSuccess]);

  const handleUpdateField = useCallback((field: keyof CandidateFormData, value: any) => {
    if (field === 'photoFileObject') photoRef.current = value || null;
    if (field === 'resumeFileObject') resumeRef.current = value || null;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      photoFileObject: field === 'photoFileObject' ? value : photoRef.current || prev.photoFileObject,
      resumeFileObject: field === 'resumeFileObject' ? value : resumeRef.current || prev.resumeFileObject,
    }));
  }, []);

  const handlePatch = useCallback((next: Partial<CandidateFormData>) => {
    if ('photoFileObject' in next) photoRef.current = (next.photoFileObject as File | null) || null;
    if ('resumeFileObject' in next) resumeRef.current = (next.resumeFileObject as File | null) || null;
    setFormData((prev) => ({
      ...prev,
      ...next,
      photoFileObject: photoRef.current || next.photoFileObject || prev.photoFileObject,
      resumeFileObject: resumeRef.current || next.resumeFileObject || prev.resumeFileObject,
    }));
  }, []);

  const handleBlurField = useCallback((field: keyof CandidateFormData) => {
    const current = {
      ...formDataRef.current,
      photoFileObject: photoRef.current || formDataRef.current.photoFileObject,
      resumeFileObject: resumeRef.current || formDataRef.current.resumeFileObject,
    };
    const message = validateOnePreFormField(field, current);
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const merged: CandidateFormData = {
      ...formData,
      declarationDate: todayStr,
      photoFileObject: photoRef.current || formData.photoFileObject,
      resumeFileObject: resumeRef.current || formData.resumeFileObject,
    };
    if (merged.sameAsPermanent) {
      merged.presHouseName = merged.permHouseName;
      merged.presPostOffice = merged.permPostOffice;
      merged.presLandmark = merged.permLandmark;
      merged.presDistrict = merged.permDistrict;
      merged.presPinCode = merged.permPinCode;
    }
    const fieldErrors = validatePreFormFields(merged);
    setErrors(fieldErrors);
    const firstKey = (Object.keys(fieldErrors)[0] || '') as keyof CandidateFormData;
    if (firstKey) {
      setErrorText(fieldErrors[firstKey] || 'Please fix the highlighted fields.');
      requestAnimationFrame(() => {
        document.querySelector(`[data-field="${firstKey}"]`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
      return;
    }

    setIsSubmitting(true);
    setErrorText('');
    setUploadError(null);

    try {
      const { resumeFile: _resumeFile, resumeUrl: _resumeUrl, resumeFileObject: _resumeFileObject, photoFileObject: _photoFileObject, profilePicture: _profilePicture, ...applicationData } = merged;
      
      const candidateObj = await publicApplyFullCandidate(token, applicationData, {
        resume: merged.resumeFileObject || null,
        photo: merged.photoFileObject || null,
      });

      clearPreFormDraft(token);
      setSubmitSuccess(candidateObj.full_name);
    } catch (err: any) {
      setErrorText(err?.response?.data?.detail || err.message || 'Failed to submit application details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <PublicShell maxWidth="2xl" title="Candidate form" step="Checking link"><PublicStatusPanel kind="loading" message="Checking your form link…" /></PublicShell>;
  }

  if (statusError) {
    return <PublicShell maxWidth="2xl" title="Candidate form"><PublicStatusPanel kind="expired" message={`${statusError} Please ask your HR recruiter for a new link or clarification.`} /></PublicShell>;
  }

  if (submitSuccess) {
    return (
      <PublicShell maxWidth="2xl" title="Candidate form">
        <PublicStatusPanel
          kind="submitted"
          title="Application submitted"
          message={`Thank you, ${candidateName || submitSuccess}. Your candidate form is complete. Your recruiter will review it and contact you about next steps.`}
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell maxWidth="2xl" title="Candidate form">
      <div className="page-card p-6 sm:p-8">
        <div className="mb-8 pb-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Candidate form</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Welcome, <span className="font-medium text-text-primary">{candidateName}</span>. Complete every section before submitting.
            </p>
            <p className="mt-2 text-xs text-text-secondary">Required fields are marked in each section. Your progress is saved locally in this browser; local save is not submission.</p>
            {expiresAt && <p className="mt-1 text-xs text-warning">This link is available until {formatDateTime(expiresAt)}.</p>}
          </div>

        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Personal details</h2>
            <PersonalInfoForm data={formData} update={handleUpdateField} patch={handlePatch} errors={errors} onBlurField={handleBlurField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Address details</h2>
            <AddressForm data={formData} update={handleUpdateField} errors={errors} onBlurField={handleBlurField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Driving &amp; languages</h2>
            <IdentityForm data={formData} update={handleUpdateField} errors={errors} onBlurField={handleBlurField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Education</h2>
            <EducationForm data={formData} update={handleUpdateField} errors={errors} onBlurField={handleBlurField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Family details</h2>
            <FamilyForm data={formData} update={handleUpdateField} errors={errors} onBlurField={handleBlurField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Employment history</h2>
            <EmploymentForm data={formData} update={handleUpdateField} patch={handlePatch} errors={errors} onBlurField={handleBlurField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Recruitment details</h2>
            <RecruitmentForm data={formData} update={handleUpdateField} errors={errors} onBlurField={handleBlurField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">General information</h2>
            <MedicalForm data={formData} update={handleUpdateField} errors={errors} onBlurField={handleBlurField} />
          </section>

          <section className="pb-8 border-b border-border">
            <h2 className="section-heading mb-6">Emergency, social &amp; declaration</h2>
            <EmergencySocialForm data={formData} update={handleUpdateField} errors={errors} onBlurField={handleBlurField} />
          </section>

          <div className="pt-2 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="flex-1 space-y-1">
              {uploadError && <p role="alert" className="text-sm text-warning bg-warning/5 p-3 rounded-lg border border-warning/20">{uploadError}</p>}
              {errorText && (
              <p role="alert" className="text-sm text-danger bg-danger/5 p-3 rounded-lg border border-danger/20 flex-1">{errorText}</p>
              )}
            </div>
            <Button type="submit" className="w-full sm:ml-auto sm:w-auto px-8" isLoading={isSubmitting}>
              Submit application
            </Button>
          </div>
        </form>
      </div>
    </PublicShell>
  );
}
