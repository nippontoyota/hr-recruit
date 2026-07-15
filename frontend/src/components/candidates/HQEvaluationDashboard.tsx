import { useState, useEffect } from 'react';
import { Calendar, Video, CheckCircle, Clock, ShieldCheck, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button, LoadingSpinner } from '../ui';
import { getCandidateEvaluations, scheduleEvaluation, submitScorecardDirect } from '../../api/evaluations';
import type { Candidate, Evaluation, EvaluationVerdict } from '../../types';
import { cn, extractError } from '../../lib/utils';

interface HQEvaluationDashboardProps {
  candidate: Candidate;
  onUpdate: () => void;
}

export function HQEvaluationDashboard({ candidate, onUpdate }: HQEvaluationDashboardProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // HQ Schedule state
  const [mode, setMode] = useState<'PHYSICAL' | 'ONLINE'>('ONLINE');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  // HQ Scorecard state
  const [remarks, setRemarks] = useState('');

  const fetchEvaluations = async () => {
    try {
      const data = await getCandidateEvaluations(candidate.id);
      setEvaluations(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.id]);

  const hqInterview = evaluations.find(e => e.type === 'HQ_INTERVIEW');
  const branchEvals = evaluations.filter(e => e.type !== 'HQ_INTERVIEW' && e.status === 'EVALUATED');

  const handleSchedule = async () => {
    if (!hqInterview) return;
    if (!time) {
      toast.error('Please select date and time');
      return;
    }
    setSubmitting(true);
    try {
      await scheduleEvaluation(hqInterview.id, {
        interview_mode: mode,
        scheduled_time: new Date(time).toISOString(),
        location_or_link: location
      });
      toast.success('HQ Interview scheduled successfully');
      setTime('');
      setLocation('');
      fetchEvaluations();
    } catch (err) {
      toast.error(extractError(err, 'Failed to schedule HQ interview'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitScorecard = async (finalVerdict: EvaluationVerdict) => {
    if (!hqInterview) return;
    setSubmitting(true);
    try {
      await submitScorecardDirect(hqInterview.id, {
        verdict: finalVerdict,
        remarks
      });
      toast.success(`Candidate status updated to: ${finalVerdict}`);
      onUpdate();
    } catch (err) {
      toast.error(extractError(err, 'Failed to submit HQ verdict'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="h-[400px] flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  const isScheduled = hqInterview?.status === 'SCHEDULED' || hqInterview?.status === 'EVALUATED';
  const isCompleted = hqInterview?.status === 'EVALUATED';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
      
      {/* LEFT: Branch Wrap-up Sheet */}
      <div className="xl:col-span-2 border border-border rounded-2xl bg-surface/50 overflow-hidden shadow-sm flex flex-col justify-between">
        <div>
          <div className="h-14 border-b border-border bg-sidebar flex items-center px-6">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-primary" />
              Local Branch Evaluation Sheet
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
            {branchEvals.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-8">No branch evaluations logs found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branchEvals.map((ev) => (
                  <div key={ev.id} className="border border-border/60 bg-background rounded-xl p-4 text-xs space-y-2.5">
                    <div className="flex justify-between items-center border-b border-border/40 pb-2">
                      <span className="font-bold text-foreground">{ev.type.replace(/_/g, ' ')}</span>
                      <span className={cn("px-2 py-0.5 rounded font-semibold text-[10px] uppercase border", 
                        ev.verdict === 'SELECTED' || ev.verdict === 'PASS' ? "bg-success/10 text-success border-success/20" : 
                        ev.verdict === 'ON_HOLD' ? "bg-warning/10 text-warning border-warning/20" : 
                        "bg-danger/10 text-danger border-danger/20"
                      )}>
                        {ev.verdict}
                      </span>
                    </div>

                    {ev.scores && ev.type !== 'TECHNICAL_TEST' && (
                      <div className="grid grid-cols-4 gap-1 text-[9px] bg-muted/30 p-1.5 rounded text-center font-semibold">
                        <div>Tech: {ev.scores.technical}/5</div>
                        <div>Comm: {ev.scores.communication}/5</div>
                        <div>Exp: {ev.scores.experience}/5</div>
                        <div>Fit: {ev.scores.cultural_fit}/5</div>
                      </div>
                    )}
                    
                    {ev.scores?.percentage !== undefined && (
                      <div className="text-[10px] text-muted-foreground font-semibold">
                        Marks Secured: <span className="text-foreground font-bold">{ev.scores.percentage}%</span>
                      </div>
                    )}

                    <p className="text-muted-foreground italic line-clamp-3">"{ev.remarks || 'No remarks provided.'}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {candidate.has_resume && (
          <div className="p-6 border-t border-border/50 bg-muted/10 flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
              <FileText className="w-4 h-4" /> Candidate Resume is available.
            </span>
            <Button variant="ghost" size="sm" className="border border-border bg-background shadow-xs font-bold" onClick={() => window.open(`/api/v1/candidates/${candidate.id}/resume`, '_blank')}>
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> View Resume
            </Button>
          </div>
        )}
      </div>

      {/* RIGHT: HQ Scheduling & Review Panel */}
      <div className="space-y-6">
        
        {/* 1. Schedule Card */}
        <div className="border border-border rounded-2xl bg-surface/50 overflow-hidden shadow-sm">
          <div className="h-14 border-b border-border bg-sidebar flex items-center px-5 justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-primary" />
              1. Schedule HQ Interview
            </h3>
            {!isCompleted && (
              <Button variant="primary" size="sm" onClick={handleSchedule} isLoading={submitting}>
                Save Schedule
              </Button>
            )}
          </div>
          <div className="p-5 bg-background space-y-4 text-xs">
            {isCompleted ? (
              <div className="bg-success/5 border border-success/10 rounded-xl p-3.5 flex items-start gap-3">
                <CheckCircle className="w-4.5 h-4.5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-success">HQ Interview Scheduled & Completed</p>
                  <p className="text-muted-foreground mt-0.5">The online review has been conducted and evaluated.</p>
                </div>
              </div>
            ) : isScheduled ? (
              <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center font-bold text-foreground">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-muted-foreground" /> Scheduled Time</span>
                  <button onClick={() => { setTime(hqInterview?.scheduled_time ? hqInterview.scheduled_time.slice(0, 16) : ''); }} className="text-primary text-[10px] hover:underline font-semibold">Change</button>
                </div>
                <p className="font-semibold text-foreground text-sm">{new Date(hqInterview?.scheduled_time!).toLocaleString()}</p>
                <p className="text-muted-foreground">Mode: <strong className="text-foreground">{hqInterview?.interview_mode}</strong></p>
                {hqInterview?.location_or_link && (
                  <p className="text-muted-foreground truncate">
                    Link/Location:{' '}
                    <a href={hqInterview.location_or_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">{hqInterview.location_or_link}</a>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Mode</label>
                    <select value={mode} onChange={(e) => setMode(e.target.value as 'PHYSICAL' | 'ONLINE')} className="w-full bg-background border border-border rounded-lg p-2.5">
                      <option value="ONLINE">Online (Meet)</option>
                      <option value="PHYSICAL">Physical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Date & Time</label>
                    <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider">Meeting Link or Location</label>
                    {mode === 'ONLINE' && (
                      <button onClick={() => window.open('https://meet.google.com/new', '_blank')} className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1">
                        <Video className="w-3 h-3" /> Create GMeet
                      </button>
                    )}
                  </div>
                  <input type="text" placeholder={mode === 'ONLINE' ? 'e.g. https://meet.google.com/...' : 'e.g. HQ Boardroom'} value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2.5" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Evaluation Card */}
        <div className={cn("border border-border rounded-2xl bg-surface/50 overflow-hidden shadow-sm relative transition-opacity duration-200", !isScheduled && "opacity-50 pointer-events-none")}>
          {!isScheduled && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-[1px]">
              <div className="bg-background border border-border rounded-xl p-4 shadow-md text-center max-w-[200px]">
                <Clock className="w-6 h-6 text-warning mx-auto mb-1.5" />
                <p className="font-bold text-foreground text-xs">Awaiting Schedule</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Please schedule the HQ interview first.</p>
              </div>
            </div>
          )}

          <div className="h-14 border-b border-border bg-sidebar flex items-center px-5">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-primary" />
              2. HQ HR Evaluation
            </h3>
          </div>
          
          <div className="p-5 bg-background space-y-4 text-xs">
            {isCompleted ? (
              <div className="space-y-3">
                <div>
                  <span className="font-bold text-foreground">Final Company Decision: </span>
                  <span className={cn("font-bold text-sm uppercase", hqInterview.verdict === 'SELECTED' ? "text-success" : hqInterview.verdict === 'ON_HOLD' ? "text-warning" : "text-danger")}>
                    {hqInterview.verdict === 'SELECTED' ? 'APPROVED & HIRED' : hqInterview.verdict}
                  </span>
                </div>
                <p className="text-muted-foreground italic bg-muted/20 border border-border/50 p-3 rounded-lg">
                  "{hqInterview.remarks}"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Decision Remarks</label>
                  <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Final notes from Head Office..." className="w-full min-h-[100px] bg-background border border-border rounded-lg p-3 resize-y" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="ghost" className="border border-border text-success hover:bg-success/10 font-bold" onClick={() => handleSubmitScorecard('SELECTED')} isLoading={submitting}>
                    Approve
                  </Button>
                  <Button variant="ghost" className="border border-border text-warning hover:bg-warning/10 font-bold" onClick={() => handleSubmitScorecard('ON_HOLD')} isLoading={submitting}>
                    Hold
                  </Button>
                  <Button variant="ghost" className="border border-border text-danger hover:bg-danger/10 font-bold" onClick={() => handleSubmitScorecard('REJECTED')} isLoading={submitting}>
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
      
    </div>
  );
}
