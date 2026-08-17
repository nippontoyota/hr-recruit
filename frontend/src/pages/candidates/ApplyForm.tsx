import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRecruiterPublic, publicApplyCandidate, publicGetBasicCandidate, publicUpdateBasicCandidate, uploadResume } from '../../api/candidates';
import { Button, Input, Select } from '../../components/ui';
import { UploadCloud } from 'lucide-react';
import { validateEmail, validateFullName, validatePhone, validateResumeFile, validateSelect, validateTextField, SOURCES } from '../../lib/validation';
import { PublicShell } from '../../components/layout/PublicShell';
import { clearJsonDraft, getStoredFile, loadJsonDraft, putStoredFile, saveJsonDraft } from '../../lib/preFormDraft';
import { FieldRequirement, FormField } from './wizard/FormField';
import { PublicStatusPanel } from '../../components/candidates/PublicStatusPanel';

export default function ApplyForm() {
  const [searchParams] = useSearchParams();
  const hrId = searchParams.get('hr');
  const formToken = searchParams.get('token');

  const [recruiterName, setRecruiterName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [position, setPosition] = useState('');
  const [experience, setExperience] = useState('Fresher');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [existingResumeName, setExistingResumeName] = useState<string | null>(null);
  const resumeRef = useRef<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{ name: string } | null>(null);
  const [formError, setFormError] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Partial<Record<'fullName' | 'phone' | 'email' | 'source' | 'position' | 'resumeFile', string>>>({});
  const draftKey = `apply-draft:${formToken || hrId || 'new'}`;
  const resumeKey = `${draftKey}:resume`;


  useEffect(() => {
    const initPage = async () => {
      try {
        const storedDraftKey = `apply-draft:${formToken || hrId || 'new'}`;
        const storedResumeKey = `${storedDraftKey}:resume`;
        const draft = loadJsonDraft<{
          fullName?: string;
          phone?: string;
          email?: string;
          source?: string;
          position?: string;
          experience?: string;
        }>(storedDraftKey);
        const storedResume = await getStoredFile(storedResumeKey);
        if (storedResume) {
          resumeRef.current = storedResume;
          setResumeFile(storedResume);
        }
        if (formToken) {
          const candidate = await publicGetBasicCandidate(formToken);
          setFullName(draft?.fullName || candidate.full_name);
          setPhone(draft?.phone || candidate.phone);
          setEmail(draft?.email || candidate.email || '');
          setSource(draft?.source || candidate.source || '');
          setPosition(draft?.position || candidate.position_applied_for || '');
          setExperience(draft?.experience || 'Fresher');
          if (candidate.has_resume) {
            setExistingResumeName('Existing Resume Document');
          }
        } else if (hrId) {
          const recruiter = await getRecruiterPublic(hrId);
          setRecruiterName(recruiter.full_name);
          if (draft) {
            setFullName(draft.fullName || '');
            setPhone(draft.phone || '');
            setEmail(draft.email || '');
            setSource(draft.source || '');
            setPosition(draft.position || '');
            setExperience(draft.experience || 'Fresher');
          }
        } else {
          setErrorText('Missing reference parameters. Please use the link provided by your HR recruiter.');
        }
      } catch (err: any) {
        setErrorText(err?.response?.data?.detail || 'Invalid recruiter or candidate link.');
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [hrId, formToken]);

  useEffect(() => {
    if (loading || errorText) return;
    saveJsonDraft(draftKey, { fullName, phone, email, source, position, experience });
    void putStoredFile(resumeKey, resumeRef.current);
    setLastSavedAt(new Date());
  }, [fullName, phone, email, source, position, experience, resumeFile, loading, errorText, draftKey, resumeKey]);

  const validateApplyFields = () => {
    const next: typeof errors = {};
    const nameErr = validateFullName(fullName);
    if (nameErr.ok === false) next.fullName = nameErr.message;
    const phoneErr = validatePhone(phone);
    if (phoneErr.ok === false) next.phone = phoneErr.message;
    const emailErr = validateEmail(email, true);
    if (emailErr.ok === false) next.email = emailErr.message;
    const positionErr = validateTextField(position, 'Position applied for', 2, 100);
    if (positionErr.ok === false) next.position = positionErr.message;
    const sourceErr = validateSelect(source, SOURCES, 'Source');
    if (sourceErr.ok === false) next.source = sourceErr.message;
    const file = resumeRef.current || resumeFile;
    const resumeErr = validateResumeFile(file, !existingResumeName);
    if (resumeErr.ok === false) next.resumeFile = resumeErr.message;
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors = validateApplyFields();
    setErrors(fieldErrors);
    const firstKey = Object.keys(fieldErrors)[0] as keyof typeof fieldErrors | undefined;
    if (firstKey) {
      setFormError(fieldErrors[firstKey] || 'Please fix the highlighted fields.');
      requestAnimationFrame(() => {
        document.querySelector(`[data-field="${firstKey}"]`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    setUploadError(null);

    try {
      let candidateObj;
      const payload = {
        full_name: fullName.trim(),
        phone,
        email: email.trim(),
        source,
        experience,
        position_applied_for: position.trim(),
      };
      const file = resumeRef.current || resumeFile;
      if (formToken) {
        candidateObj = await publicUpdateBasicCandidate(formToken, payload);
        if (file) {
          try {
            await uploadResume(formToken, file, { public: true });
          } catch (uploadErr) {
            setUploadError('Your details were saved, but the resume upload failed. Check the file and retry submission.');
            throw uploadErr;
          }
        }
      } else if (hrId) {
        candidateObj = await publicApplyCandidate(payload, hrId);
        if (file) {
          try {
            await uploadResume(candidateObj.token || '', file, { public: true });
          } catch (uploadErr) {
            setUploadError('Your details were saved, but the resume upload failed. Check the file and retry submission.');
            throw uploadErr;
          }
        }
      }

      if (candidateObj) {
        clearJsonDraft(draftKey);
        void putStoredFile(resumeKey, null);
        setSubmitSuccess({
          name: candidateObj.full_name,
        });
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Failed to submit candidate details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <PublicShell title="Candidate registration"><PublicStatusPanel kind="loading" message="Checking your candidate link…" /></PublicShell>;
  }

  if (errorText) {
    return <PublicShell title="Candidate registration"><PublicStatusPanel kind="expired" title="Link unavailable" message={`${errorText} Please request a fresh link from your HR recruiter if the problem continues.`} /></PublicShell>;
  }

  if (submitSuccess) {
    return (
      <PublicShell title="Candidate registration">
        <PublicStatusPanel
          kind="submitted"
          title="Details submitted"
          message={`Thank you, ${submitSuccess.name}. Your information has been saved. Your recruiter will review it and contact you about next steps.`}
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell title="Candidate registration">
      <div className="page-card p-6 sm:p-8">
        <div className="mb-8 pb-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Candidate registration</h1>
            {recruiterName ? (
              <p className="mt-2 text-sm text-text-secondary">
                Referred by <span className="font-medium text-text-primary">{recruiterName}</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">Update your application details below.</p>
            )}
          </div>

        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField field="fullName" error={errors.fullName}>
            <label className="form-label form-label-required">Full name <FieldRequirement required /></label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => {
                const result = validateFullName(fullName);
                setErrors((prev) => ({ ...prev, fullName: result.ok === false ? result.message : undefined }));
              }}
              error={!!errors.fullName}
              placeholder="Enter your full name"
              maxLength={100}
            />
          </FormField>

          <FormField field="phone" error={errors.phone}>
            <label className="form-label form-label-required">Phone number <FieldRequirement required /></label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              onBlur={() => {
                const result = validatePhone(phone);
                setErrors((prev) => ({ ...prev, phone: result.ok === false ? result.message : undefined }));
              }}
              error={!!errors.phone}
              placeholder="e.g. 9876543210"
              inputMode="numeric"
              maxLength={10}
            />
          </FormField>

          <FormField field="email" error={errors.email}>
            <label className="form-label form-label-required">Email address <FieldRequirement required /></label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => {
                const result = validateEmail(email, true);
                setErrors((prev) => ({ ...prev, email: result.ok === false ? result.message : undefined }));
              }}
              error={!!errors.email}
              placeholder="e.g. email@example.com"
            />
          </FormField>

          <FormField field="position" error={errors.position}>
            <label className="form-label form-label-required">Position applied for <FieldRequirement required /></label>
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              onBlur={() => {
                const result = validateTextField(position, 'Position applied for', 2, 100);
                setErrors((prev) => ({ ...prev, position: result.ok === false ? result.message : undefined }));
              }}
              error={!!errors.position}
              placeholder="e.g. Sales Executive"
              maxLength={100}
            />
          </FormField>

          <FormField field="source" error={errors.source}>
            <label className="form-label form-label-required">How did you hear about this role? <FieldRequirement required /></label>
            <Select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                const result = validateSelect(e.target.value, SOURCES, 'Source');
                setErrors((prev) => ({ ...prev, source: result.ok === false ? result.message : undefined }));
              }}
              error={!!errors.source}
            >
              <option value="">Select how you found this opening</option>
              <option value="WALK_IN">Walk-In</option>
              <option value="INDEED">Indeed</option>
              <option value="REFERRAL">Referral</option>
              <option value="CAMPUS">Campus</option>
              <option value="OTHER">Other / LinkedIn</option>
            </Select>
          </FormField>

          <FormField field="resumeFile" error={errors.resumeFile}>
            <label className="form-label">Resume (PDF or Word) <FieldRequirement /></label>
            <div className={`border border-dashed ${errors.resumeFile ? 'border-danger' : 'border-border'} rounded-lg p-5 bg-content text-center relative hover:border-primary/40 transition-colors min-w-0 overflow-hidden`}>
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  resumeRef.current = file;
                  setResumeFile(file);
                  const result = validateResumeFile(file, true);
                  setErrors((prev) => ({ ...prev, resumeFile: result.ok === false ? result.message : undefined }));
                }}
              />
              <div className="flex flex-col items-center justify-center pointer-events-none min-w-0 w-full">
                <UploadCloud className="w-8 h-8 text-text-secondary mb-2 shrink-0" />
                <span className="text-xs text-text-secondary w-full min-w-0 break-all">
                  {resumeFile ? resumeFile.name : (existingResumeName || 'Select your PDF or Word resume')}
                </span>
              </div>
            </div>
          </FormField>

          <p className="text-xs text-text-secondary">Your entries are saved locally in this browser. Local save is not submission.</p>
          {lastSavedAt && <p className="text-xs text-primary">Saved locally at {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
          {uploadError && <p role="alert" className="text-sm text-warning bg-warning/5 p-3 rounded-lg border border-warning/20">{uploadError}</p>}
          {formError && <p role="alert" className="text-sm text-danger bg-danger/5 p-3 rounded-lg border border-danger/20">{formError}</p>}

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Submit details
          </Button>
        </form>
      </div>
    </PublicShell>
  );
}
