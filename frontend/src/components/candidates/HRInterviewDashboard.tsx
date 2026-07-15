import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';import { getHRInterview, submitHRInterview, getCandidateResume } from '../../api/candidates';
import type { Candidate, ResumeDocument, InterviewMode, InterviewStatus } from '../../types';
import { Button, PdfViewer, LoadingSpinner } from '../ui';
import { toast } from 'sonner';
import { cn, extractError } from '../../lib/utils';
import { Star, AlertCircle, FileText, ExternalLink } from 'lucide-react';
import { HRInterviewWhatsAppPreview } from './HRInterviewWhatsAppPreview';

function toLocalDatetimeString(dateString?: string) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface HRInterviewDashboardProps {
  candidate: Candidate;
  onUpdate: () => void;
}

function isPdfDocument(doc: ResumeDocument): boolean {
  return (
    doc.content_type === 'application/pdf' ||
    doc.file_name.toLowerCase().endsWith('.pdf')
  );
}

export function HRInterviewDashboard({ candidate, onUpdate }: HRInterviewDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeDoc, setResumeDoc] = useState<ResumeDocument | null>(null);

  // Scheduling State
  const [interviewMode, setInterviewMode] = useState<InterviewMode | ''>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [locationOrLink, setLocationOrLink] = useState<string>('');
  const [status, setStatus] = useState<InterviewStatus>('PENDING_SCHEDULE');

  // Form State
  const [communicationScore, setCommunicationScore] = useState<number>(0);
  const [technicalScore, setTechnicalScore] = useState<number>(0);
  const [experienceScore, setExperienceScore] = useState<number>(0);
  const [culturalFitScore, setCulturalFitScore] = useState<number>(0);
  
  const [currentSalary, setCurrentSalary] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('');
  
  const [verdict, setVerdict] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  
  const [leftPanelTab, setLeftPanelTab] = useState<'CONTEXT' | 'SCHEDULE'>('SCHEDULE');

  useEffect(() => {
    fetchData();
    if (candidate.has_resume) {
      fetchResume();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getHRInterview(candidate.id);
      if (data) {
        setInterviewMode(data.interview_mode || '');
        setScheduledTime(toLocalDatetimeString(data.scheduled_time));
        setLocationOrLink(data.location_or_link || '');
        setStatus(data.status || 'PENDING_SCHEDULE');

        setCommunicationScore(data.communication_score || 0);
        setTechnicalScore(data.technical_score || 0);
        setExperienceScore(data.experience_score || 0);
        setCulturalFitScore(data.cultural_fit_score || 0);
        setCurrentSalary(data.current_salary || '');
        setExpectedSalary(data.expected_salary || '');
        setNoticePeriod(data.notice_period || '');
        setVerdict(data.verdict || null);
        setRemarks(data.remarks || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResume = async () => {
    setResumeLoading(true);
    try {
      const resume = await getCandidateResume(candidate.id);
      setResumeDoc(resume);
    } catch (err) {
      console.error("Failed to load resume", err);
    } finally {
      setResumeLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    setIsSubmitting(true);
    try {
      await submitHRInterview(candidate.id, {
        interview_mode: (interviewMode as InterviewMode) || undefined,
        scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : undefined,
        location_or_link: locationOrLink || undefined,
      });
      fetchData(); // refresh to get new status
      onUpdate();
      toast.success('Interview scheduled');
    } catch (err) {
      toast.error(extractError(err, 'Failed to schedule interview'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async (finalVerdict?: string) => {
    setIsSubmitting(true);
    const submissionVerdict = finalVerdict || verdict;
    
    try {
      await submitHRInterview(candidate.id, {
        communication_score: communicationScore || undefined,
        technical_score: technicalScore || undefined,
        experience_score: experienceScore || undefined,
        cultural_fit_score: culturalFitScore || undefined,
        current_salary: currentSalary || undefined,
        expected_salary: expectedSalary || undefined,
        notice_period: noticePeriod || undefined,
        verdict: (submissionVerdict as "SELECTED" | "REJECTED" | "ON_HOLD") || undefined,
        remarks: remarks || undefined,
      });
      
      onUpdate();
      if (submissionVerdict) {
        toast.success(`Candidate ${submissionVerdict.replace('_', ' ').toLowerCase()}`);
      } else {
        toast.success('Interview scorecard saved');
      }
    } catch (err) {
      console.error(err);
      toast.error(extractError(err, 'Failed to save interview data'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="p-1 transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={cn(
                "w-6 h-6 transition-all duration-200",
                star <= value ? "fill-yellow-400 text-yellow-400 drop-shadow-sm" : "fill-muted text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <div className="h-[400px] flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 xl:divide-x divide-border min-h-[800px] border-y border-border">
      
      {/* LEFT PANEL: Context & Scheduling */}
      <div className="flex flex-col overflow-hidden">
        <div className="h-14 border-b border-border bg-sidebar flex items-center justify-center px-4 shrink-0">
          <div className="flex bg-muted/40 p-1 rounded-full w-48 border border-border relative shadow-inner">
            <button
              onClick={() => setLeftPanelTab('SCHEDULE')}
              className={cn(
                "flex-1 py-1 text-[11px] font-bold rounded-full transition-colors uppercase tracking-wider relative z-10",
                leftPanelTab === 'SCHEDULE' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {leftPanelTab === 'SCHEDULE' && (
                <motion.div
                  layoutId="dashboard-tab-indicator"
                  className="absolute inset-0 bg-primary rounded-full shadow-sm -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              Send Invite
            </button>
            <button
              onClick={() => setLeftPanelTab('CONTEXT')}
              className={cn(
                "flex-1 py-1 text-[11px] font-bold rounded-full transition-colors uppercase tracking-wider relative z-10",
                leftPanelTab === 'CONTEXT' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {leftPanelTab === 'CONTEXT' && (
                <motion.div
                  layoutId="dashboard-tab-indicator"
                  className="absolute inset-0 bg-primary rounded-full shadow-sm -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              Biodata
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-background p-4 flex flex-col items-center">
          {leftPanelTab === 'CONTEXT' && (
            <div className="w-full h-full flex flex-col items-center">
              {candidate.has_resume ? (
                resumeLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner />
                  </div>
                ) : resumeDoc ? (
                  isPdfDocument(resumeDoc) ? (
                    <div className="w-full h-full min-h-[600px] overflow-hidden flex flex-col">
                      <PdfViewer url={resumeDoc.download_url} />
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center mt-20">
                      <FileText className="w-12 h-12 text-primary" />
                      <div>
                        <p className="text-lg font-semibold text-text-primary">{resumeDoc.file_name}</p>
                        <p className="text-sm text-text-secondary mt-1">Word documents open in a new tab for preview.</p>
                      </div>
                      <Button variant="primary" onClick={() => window.open(resumeDoc.download_url, '_blank')}>
                        <ExternalLink className="w-4 h-4 mr-2" /> Open Biodata
                      </Button>
                    </div>
                  )
                ) : (
                  <p className="text-muted-foreground mt-20">Biodata could not be loaded.</p>
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 mt-20 opacity-60">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-foreground">No Biodata Uploaded</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                    This candidate did not provide a biodata. Rely on the details submitted in the candidate form.
                  </p>
                </div>
              )}
            </div>
          )}

          {leftPanelTab === 'SCHEDULE' && (
            <div className="w-full flex justify-center py-4">
              <HRInterviewWhatsAppPreview 
                candidate={candidate}
                scheduledTime={scheduledTime}
                setScheduledTime={setScheduledTime}
                interviewMode={interviewMode}
                setInterviewMode={setInterviewMode}
                locationOrLink={locationOrLink}
                setLocationOrLink={setLocationOrLink}
                onSaveSchedule={handleSaveSchedule}
                isSavingSchedule={isSubmitting}
              />
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Scorecard */}
      <div className="flex flex-col gap-6 h-full">
        <div className={cn(
          "flex flex-col overflow-hidden flex-1 relative transition-all duration-300",
          status === 'PENDING_SCHEDULE' && "opacity-60 pointer-events-none grayscale-[0.2]"
        )}>
          {status === 'PENDING_SCHEDULE' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[2px]">
              <div className="bg-background border border-border rounded-xl p-4 shadow-lg text-center flex flex-col items-center">
                <AlertCircle className="w-8 h-8 text-warning mb-2" />
                <p className="font-bold text-foreground">Scorecard Locked</p>
                <p className="text-sm text-muted-foreground">Please schedule the interview first.</p>
              </div>
            </div>
          )}
          
          <div className="h-14 border-b border-border bg-sidebar flex items-center px-4 shrink-0 justify-between">
            <h3 className="font-bold text-sm text-foreground">Interview Scorecard</h3>
            <Button variant="ghost" size="sm" onClick={() => handleSave()} isLoading={isSubmitting}>
              Save Draft
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background">
            <div className="grid grid-cols-2 gap-6">
              <StarRating label="Communication" value={communicationScore} onChange={setCommunicationScore} />
              <StarRating label="Technical Skills" value={technicalScore} onChange={setTechnicalScore} />
              <StarRating label="Experience" value={experienceScore} onChange={setExperienceScore} />
              <StarRating label="Cultural Fit" value={culturalFitScore} onChange={setCulturalFitScore} />
            </div>

            <div className="h-px w-full bg-border" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">Current Salary</label>
                <input
                  type="text"
                  value={currentSalary}
                  onChange={(e) => setCurrentSalary(e.target.value)}
                  placeholder="e.g. 5 LPA"
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">Expected Salary</label>
                <input
                  type="text"
                  value={expectedSalary}
                  onChange={(e) => setExpectedSalary(e.target.value)}
                  placeholder="e.g. 7 LPA"
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">Notice Period</label>
                <input
                  type="text"
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                  placeholder="e.g. 30 Days (Negotiable)"
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="h-px w-full bg-border" />

            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">Interview Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Detailed feedback and notes from the interview..."
                className="w-full min-h-[120px] bg-background border border-border rounded-xl p-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider text-center">Final Verdict</p>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="ghost"
                  onClick={() => handleSave('SELECTED')}
                  className={cn(
                    "border border-border",
                    verdict === 'SELECTED' ? "!bg-success !text-white border-transparent" : "hover:bg-success/10"
                  )}
                >
                  Selected
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleSave('ON_HOLD')}
                  className={cn(
                    "border border-border",
                    verdict === 'ON_HOLD' ? "!bg-warning !text-warning-foreground border-transparent" : "hover:bg-warning/10"
                  )}
                >
                  Hold
                </Button>
                <Button
                  variant={verdict === 'REJECTED' ? 'danger' : 'ghost'}
                  onClick={() => handleSave('REJECTED')}
                  className={cn(
                    "border border-border",
                    verdict === 'REJECTED' ? "!bg-danger !text-white border-transparent" : "hover:bg-danger/10"
                  )}
                >
                  Reject
                </Button>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}