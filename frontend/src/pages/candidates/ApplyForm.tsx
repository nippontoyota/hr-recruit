import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRecruiterPublic, publicApplyCandidate, publicGetBasicCandidate, publicUpdateBasicCandidate, uploadResume } from '../../api/candidates';
import { LoadingSpinner, Button, Input, Select } from '../../components/ui';
import { UploadCloud, FileText } from 'lucide-react';

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
          setSource(candidate.source_channel || '');
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
    if (!fullName.trim() || !phone.trim() || !email.trim() || !source.trim()) {
      setFormError('All fields (Name, Phone, Email, and Source) are required.');
      return;
    }
    if (!candidateId && !resumeFile) {
      setFormError('Please upload your resume.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      let candidateObj;
      if (candidateId) {
        // Update basic info
        candidateObj = await publicUpdateBasicCandidate(candidateId, {
          full_name: fullName,
          phone: phone,
          email: email,
          source_channel: source,
        });
        if (resumeFile) {
          await uploadResume(candidateId, resumeFile);
        }
      } else if (hrId) {
        // Create new candidate
        candidateObj = await publicApplyCandidate({
          full_name: fullName,
          phone: phone,
          email: email,
          source_channel: source,
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
          <p className="mt-4 text-text-secondary">Loading form...</p>
        </div>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-surface border border-border/80 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">Link Error</h2>
          <p className="text-text-secondary leading-relaxed mb-6">{errorText}</p>
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
          <h2 className="text-3xl font-bold text-text-primary mb-3">Details Submitted!</h2>
          <p className="text-text-secondary leading-relaxed mb-6">
            Thank you, {submitSuccess.name}. Your basic details have been updated successfully.
          </p>
          <div className="bg-background border rounded-xl p-4 mb-6">
            <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mb-1">Candidate reference ID</p>
            <p className="text-2xl font-extrabold text-primary">{submitSuccess.candidateId}</p>
          </div>
          <p className="text-sm text-text-secondary">Please retain this ID for your onboarding records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-surface border border-border/80 rounded-2xl p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Candidate Registration</h1>
          {recruiterName ? (
            <p className="mt-2 text-sm text-text-secondary">
              Applying via recruiter: <span className="font-semibold text-primary">{recruiterName}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-text-secondary">Update your candidate application profile details</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Full Name <span className="text-danger">*</span>
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Phone Number <span className="text-danger">*</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Email Address <span className="text-danger">*</span>
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
              Source <span className="text-danger">*</span>
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
              Resume Document <span className="text-danger">{candidateId ? '' : '*'}</span>
            </label>
            <div className="border-2 border-dashed border-border/80 rounded-xl p-4 bg-background text-center relative hover:border-primary/40 transition-colors">
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
            <p className="text-xs text-danger text-center font-medium">{formError}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3"
            isLoading={isSubmitting}
          >
            Submit Details
          </Button>
        </form>
      </div>
    </div>
  );
}
