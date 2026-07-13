import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRecruiterPublic, publicApplyCandidate, publicGetBasicCandidate, publicUpdateBasicCandidate, uploadResume } from '../../api/candidates';
import { LoadingSpinner, Button, Input, Select } from '../../components/ui';
import { UploadCloud } from 'lucide-react';
import { digitsOnly, validateResumeFile } from '../../lib/validation';
import { validateBasicCandidateForm } from '../../lib/validatePreForm';

export default function ApplyForm() {
  const [searchParams] = useSearchParams();
  const hrId = searchParams.get('hr');
  const candidateId = searchParams.get('candidate');

  const [recruiterName, setRecruiterName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [position, setPosition] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [existingResumeName, setExistingResumeName] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<{ candidateId: string; name: string } | null>(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const initPage = async () => {
      try {
        if (candidateId) {
          // Update Mode: Fetch candidate basic details publicly
          const candidate = await publicGetBasicCandidate(candidateId);
          setFullName(candidate.full_name);
          setPhone(candidate.phone);
          setEmail(candidate.email || '');
          setSource(candidate.source || '');
          setPosition(candidate.position_applied_for || '');
          if (candidate.has_resume) {
            setExistingResumeName('Existing Resume Document');
          }
        } else if (hrId) {
          // Referral Mode: Verify recruiter exists
          const recruiter = await getRecruiterPublic(hrId);
          setRecruiterName(recruiter.full_name);
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
  }, [hrId, candidateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateBasicCandidateForm({
      fullName,
      phone,
      email,
      emailRequired: true,
      position,
      source,
      sourceRequired: true,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const resumeError = validateResumeFile(resumeFile);
    if (resumeError.ok === false) {
      setFormError(resumeError.message);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      let candidateObj;
      const normalizedPhone = digitsOnly(phone);
      if (candidateId) {
        // Update basic info
        candidateObj = await publicUpdateBasicCandidate(candidateId, {
          full_name: fullName.trim(),
          phone: normalizedPhone,
          email: email.trim(),
          source: source,
          position_applied_for: position.trim(),
        });
        if (resumeFile) {
          await uploadResume(candidateId, resumeFile);
        }
      } else if (hrId) {
        // Create new candidate
        candidateObj = await publicApplyCandidate({
          full_name: fullName.trim(),
          phone: normalizedPhone,
          email: email.trim(),
          source: source,
          position_applied_for: position.trim(),
        }, hrId);
        if (resumeFile) {
          await uploadResume(candidateObj.id, resumeFile);
        }
      }

      if (candidateObj) {
        setSubmitSuccess({
          candidateId: candidateObj.candidate_id,
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto w-full text-center mt-10">
          <div className="w-16 h-16 bg-muted text-foreground border border-border rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-text-primary mb-3 tracking-tight">Link Error</h2>
          <p className="text-text-secondary leading-relaxed mb-6">{errorText}</p>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto w-full text-center mt-10">
          <div className="w-16 h-16 bg-foreground text-background rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-text-primary mb-3 tracking-tight">Details Submitted!</h2>
          <p className="text-text-secondary leading-relaxed mb-8">
            Thank you, <span className="font-semibold text-foreground">{submitSuccess.name}</span>. Your basic details have been updated successfully.
          </p>
          <div className="py-6 border-y border-border mb-8">
            <p className="text-xs text-text-secondary uppercase tracking-widest font-bold mb-2">Candidate reference ID</p>
            <p className="text-3xl font-extrabold text-foreground">{submitSuccess.candidateId}</p>
          </div>
          <p className="text-sm text-text-secondary">Please retain this ID for your onboarding records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto w-full">
        <div className="mb-10 pb-6 border-b border-border">
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Candidate Registration</h1>
          {recruiterName ? (
            <p className="mt-2 text-sm text-text-secondary">
              Applying via recruiter: <span className="font-semibold text-foreground">{recruiterName}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">Update your candidate application profile details</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Full Name <span className="text-foreground">*</span>
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Phone Number <span className="text-foreground">*</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(digitsOnly(e.target.value, 10))}
              placeholder="e.g. 9876543210"
              inputMode="numeric"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Email Address <span className="text-foreground">*</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Position Applied For <span className="text-foreground">*</span>
            </label>
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Sales Executive"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Source <span className="text-foreground">*</span>
            </label>
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Select how you found this opening</option>
              <option value="WALK_IN">Walk-In</option>
              <option value="INDEED">Indeed</option>
              <option value="REFERRAL">Referral</option>
              <option value="CAMPUS">Campus</option>
              <option value="OTHER">Other / LinkedIn</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Resume Document
            </label>
            <div className="border-2 border-dashed border-border/80 rounded-xl p-4 bg-background text-center relative hover:border-foreground transition-colors">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setResumeFile(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center pointer-events-none">
                <UploadCloud className="w-8 h-8 text-text-secondary mb-2" />
                <span className="text-xs text-text-secondary">
                  {resumeFile ? resumeFile.name : (existingResumeName || 'Select your PDF or Word resume')}
                </span>
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-foreground text-center font-bold bg-muted p-2 rounded-lg border border-border">{formError}</p>
          )}

          <Button
            type="submit"
            className="w-full py-3 bg-foreground text-background hover:bg-foreground/90 font-bold transition-all"
            isLoading={isSubmitting}
          >
            Submit Details
          </Button>
        </form>
      </div>
    </div>
  );
}
