import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRecruiterPublic, publicApplyCandidate, publicGetBasicCandidate, publicUpdateBasicCandidate, uploadResume } from '../../api/candidates';
import { LoadingSpinner, Button, Input, Select } from '../../components/ui';
import { UploadCloud } from 'lucide-react';
import { validateResumeFile } from '../../lib/validation';
import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { validateBasicCandidateForm } from '../../lib/validatePreForm';
import { PublicShell } from '../../components/layout/PublicShell';

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

  const handleAutofill = () => {
    setFullName('Rahul Sharma');
    setPhone('9876543210');
    setEmail('rahul.sharma@example.test');
    setSource('WALK_IN');
    setPosition('Sales Executive');
    const blob = new Blob(['%PDF-1.4 ... dummy pdf content ...'], { type: 'application/pdf' });
    const dummyFile = new File([blob], 'dummy_resume.pdf', { type: 'application/pdf' });
    setResumeFile(dummyFile);
  };

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
      const normalizedPhone = phone;
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
          await uploadResume(candidateId, resumeFile, { public: true });
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
          await uploadResume(candidateObj.id, resumeFile, { public: true });
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
      <PublicShell>
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      </PublicShell>
    );
  }

  if (errorText) {
    return (
      <PublicShell>
        <div className="text-center py-8">
          <div className="status-icon-error">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-text-primary mb-2">Invalid link</h2>
          <p className="text-text-secondary max-w-md mx-auto">{errorText}</p>
        </div>
      </PublicShell>
    );
  }

  if (submitSuccess) {
    return (
      <PublicShell>
        <motion.div 
          className="text-center py-16 sm:py-24 max-w-lg mx-auto px-6"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full w-24 h-24 mx-auto animate-pulse"></div>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
              className="relative z-10 w-20 h-20 bg-background rounded-full p-1.5 shadow-lg flex items-center justify-center"
            >
              <CheckCircle2 className="w-10 h-10 text-primary" strokeWidth={2.5} />
            </motion.div>
          </div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-3xl font-bold tracking-tight text-text-primary mb-3"
          >
            Details submitted
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-text-secondary text-lg leading-relaxed mb-8"
          >
            Thank you, <span className="font-semibold text-text-primary">{submitSuccess.name}</span>. Your information has been securely saved.
          </motion.p>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="text-sm font-medium text-text-secondary px-4 py-3 bg-muted/50 rounded-xl"
          >
            Your recruiter will review your details and contact you for next steps.
          </motion.p>
        </motion.div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAutofill}
            className="self-start sm:self-center"
          >
            Autofill Dummy Data
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label form-label-required">Full name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              maxLength={100}
            />
          </div>

          <div>
            <label className="form-label form-label-required">Phone number</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="e.g. 9876543210"
              inputMode="numeric"
              maxLength={10}
            />
          </div>

          <div>
            <label className="form-label form-label-required">Email address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. email@example.com"
            />
          </div>

          <div>
            <label className="form-label form-label-required">Position applied for</label>
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Sales Executive"
              maxLength={100}
            />
          </div>

          <div>
            <label className="form-label form-label-required">How did you hear about this role?</label>
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
            <label className="form-label">Resume (PDF or Word)</label>
            <div className="border border-dashed border-border rounded-lg p-5 bg-content text-center relative hover:border-primary/40 transition-colors">
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
            <p role="alert" className="text-sm text-danger bg-danger/5 p-3 rounded-lg border border-danger/20">{formError}</p>
          )}

          <Button type="submit" className="w-full h-10" isLoading={isSubmitting}>
            Submit details
          </Button>
        </form>
      </div>
    </PublicShell>
  );
}
