import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button, LoadingSpinner, EmptyState } from '../../components/ui';
import { ArrowLeft, User, Phone, Mail, Link, Check, X, FileText, CheckCircle2 } from 'lucide-react';
import { getCandidateById, updateCandidateStage } from '../../api/candidates';
import type { Candidate } from '../../types';

export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copiedBasic, setCopiedBasic] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);

  const fetchCandidate = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await getCandidateById(id);
      if (res) {
        setCandidate(res);
      } else {
        setError('Candidate not found.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to fetch candidate details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const handleCopyBasicLink = () => {
    if (!candidate) return;
    const url = `${window.location.origin}/apply?candidate=${candidate.id}`;
    navigator.clipboard.writeText(url);
    setCopiedBasic(true);
    setTimeout(() => setCopiedBasic(false), 2000);
  };

  const handleCopyFullLink = () => {
    if (!candidate) return;
    const url = `${window.location.origin}/apply/full?candidate=${candidate.id}`;
    navigator.clipboard.writeText(url);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const handleScreening = async (passed: boolean) => {
    if (!candidate) return;
    setIsUpdatingStage(true);
    try {
      const nextStage = passed ? 'AWAITING_PRE_INTERVIEW_FORM_FILL' : 'REJECTED';
      const reason = passed ? 'Passed initial basic details screening' : 'Failed screening';
      await updateCandidateStage(candidate.id, nextStage, reason);
      await fetchCandidate();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update candidate screening status.');
    } finally {
      setIsUpdatingStage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-text-secondary">Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<X className="w-12 h-12 text-danger" />}
          title="Error Loading Profile"
          description={error || 'Candidate profile not found.'}
          action={
            <Button onClick={() => navigate('/candidates')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Candidates
            </Button>
          }
        />
      </div>
    );
  }

  // Safely parse application data
  const appData = (candidate as any).application_data || {};

  return (
    <div className="space-y-6 pb-12">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/candidates')} className="-ml-3">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Candidates
        </Button>
      </div>

      {/* Main Profile Info Card */}
      <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{candidate.full_name}</h1>
              <p className="text-sm text-text-secondary mt-1">ID: {candidate.candidate_id}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              {candidate.current_stage.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Basic Contact Info row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-border/40 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-text-secondary/60" />
            <span>{candidate.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-text-secondary/60" />
            <span>{candidate.email || 'No email provided'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-secondary/80">Source:</span>
            <span>{candidate.source_channel}</span>
          </div>
        </div>
      </div>

      {/* Screening Panel */}
      {candidate.current_stage === 'NEW_APPLICATION' && (
        <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-text-primary">Initial Screening Panel</h3>
            <p className="text-sm text-text-secondary">
              Review basic candidate details. You can copy the update link to send to the candidate, or pass/reject their screening.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Button variant="secondary" onClick={handleCopyBasicLink} className="flex-1 md:flex-none">
              <Link className="w-4 h-4 mr-2" />
              {copiedBasic ? 'Copied Update Link!' : 'Copy Update Link'}
            </Button>
            <Button variant="primary" onClick={() => handleScreening(true)} isLoading={isUpdatingStage} className="bg-success hover:bg-success/90 border-none flex-1 md:flex-none">
              <Check className="w-4 h-4 mr-2" /> Pass
            </Button>
            <Button variant="danger" onClick={() => handleScreening(false)} isLoading={isUpdatingStage} className="flex-1 md:flex-none">
              <X className="w-4 h-4 mr-2" /> Reject
            </Button>
          </div>
        </div>
      )}

      {/* Awaiting Onboarding Panel */}
      {candidate.current_stage === 'AWAITING_PRE_INTERVIEW_FORM_FILL' && (
        <div className="bg-surface border border-border/80 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-text-primary">Awaiting Pre-Interview Form</h3>
            <p className="text-sm text-text-secondary">
              The candidate has passed initial screening. Copy and share the Phase 2 profile link with the candidate.
            </p>
          </div>
          <div className="w-full md:w-auto">
            <Button variant="primary" onClick={handleCopyFullLink} className="w-full md:w-auto">
              <Link className="w-4 h-4 mr-2" />
              {copiedFull ? 'Copied Profile Link!' : 'Copy Profile Link'}
            </Button>
          </div>
        </div>
      )}

      {/* Full Onboarding details display (if filled) */}
      {candidate.current_stage !== 'NEW_APPLICATION' && candidate.current_stage !== 'AWAITING_PRE_INTERVIEW_FORM_FILL' && candidate.current_stage !== 'REJECTED' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column 1 */}
          <div className="space-y-6">
            {/* Personal Details */}
            <div className="bg-surface border border-border/80 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-text-primary mb-4 pb-2 border-b border-border/40">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs text-text-secondary">Name on Aadhaar</span>
                  <span className="font-semibold text-text-primary">{appData.nameAadhaar || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-text-secondary">Gender</span>
                  <span className="font-semibold text-text-primary">{appData.gender || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-text-secondary">Date of Birth</span>
                  <span className="font-semibold text-text-primary">{appData.dateOfBirth || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-text-secondary">Age</span>
                  <span className="font-semibold text-text-primary">{appData.age || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-text-secondary">Marital Status</span>
                  <span className="font-semibold text-text-primary">{appData.maritalStatus || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-text-secondary">Blood Group</span>
                  <span className="font-semibold text-text-primary">{appData.bloodGroup || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-text-secondary">Height / Weight</span>
                  <span className="font-semibold text-text-primary">
                    {appData.height ? `${appData.height} cm` : 'N/A'} / {appData.weight ? `${appData.weight} kg` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-text-secondary">Religion & Caste</span>
                  <span className="font-semibold text-text-primary">{appData.religionCaste || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Education Info */}
            <div className="bg-surface border border-border/80 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-text-primary mb-4 pb-2 border-b border-border/40">Education Details</h3>
              <div className="space-y-4 text-sm">
                {appData.gradCourse && (
                  <div>
                    <span className="block text-xs text-text-secondary">Graduation</span>
                    <span className="font-semibold text-text-primary">{appData.gradCourse}</span>
                    <span className="block text-xs text-text-secondary">{appData.gradCollege} ({appData.gradPassingYear} - {appData.gradPercentage}%)</span>
                  </div>
                )}
                {appData.class12School && (
                  <div>
                    <span className="block text-xs text-text-secondary">Class 12 / Higher Secondary</span>
                    <span className="font-semibold text-text-primary">{appData.class12Stream}</span>
                    <span className="block text-xs text-text-secondary">{appData.class12School} ({appData.class12PassingYear} - {appData.class12Percentage}%)</span>
                  </div>
                )}
                {appData.class10School && (
                  <div>
                    <span className="block text-xs text-text-secondary">Class 10 / High School</span>
                    <span className="font-semibold text-text-primary">{appData.class10School} ({appData.class10PassingYear} - {appData.class10Percentage}%)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
            {/* Employment History */}
            <div className="bg-surface border border-border/80 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-text-primary mb-4 pb-2 border-b border-border/40">Employment History</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <span className="block text-xs text-text-secondary">Previous Experience</span>
                  <span className="font-semibold text-text-primary">{appData.previousExperience ? 'Yes' : 'No'}</span>
                </div>
                {appData.previousExperience && (
                  <>
                    <div>
                      <span className="block text-xs text-text-secondary">Company Name</span>
                      <span className="font-semibold text-text-primary">{appData.prevCompanyName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-text-secondary">Previous Position</span>
                      <span className="font-semibold text-text-primary">{appData.prevPosition || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-text-secondary">Total Experience</span>
                      <span className="font-semibold text-text-primary">{appData.totalExperience || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-text-secondary">Expected Salary</span>
                      <span className="font-semibold text-text-primary">{appData.expectedSalary || 'N/A'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* References */}
            <div className="bg-surface border border-border/80 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-text-primary mb-4 pb-2 border-b border-border/40">References</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs text-text-secondary">Reference Name</span>
                  <span className="font-semibold text-text-primary">{appData.refName || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-text-secondary">Reference Role</span>
                  <span className="font-semibold text-text-primary">{appData.refRole || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-text-secondary">Contact Number</span>
                  <span className="font-semibold text-text-primary">{appData.refContactNumber || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
