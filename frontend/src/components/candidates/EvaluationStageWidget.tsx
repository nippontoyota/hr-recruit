import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Link, Clipboard, UserCheck, Award, FileText, CheckCircle, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button, LoadingSpinner } from '../ui';
import { getCandidateEvaluations, scheduleEvaluation, generateEvaluationToken, submitScorecardDirect } from '../../api/evaluations';
import { updateCandidateStage } from '../../api/candidates';
import type { Candidate, Evaluation, EvaluationVerdict, PipelineStage } from '../../types';
import { cn, extractError } from '../../lib/utils';

interface EvaluationStageWidgetProps {
  candidate: Candidate;
  evalTypes: string[];
  title: string;
  nextStage: PipelineStage;
  nextStageRemarks: string;
  onUpdate: () => void;
}

export function EvaluationStageWidget({
  candidate,
  evalTypes,
  title,
  nextStage,
  nextStageRemarks,
  onUpdate
}: EvaluationStageWidgetProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [remarksId, setRemarksId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Schedule form state
  const [mode, setMode] = useState<'PHYSICAL' | 'ONLINE'>('PHYSICAL');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  // Remarks form state
  const [verdict, setVerdict] = useState<EvaluationVerdict>('SELECTED');
  const [remarksText, setRemarksText] = useState('');
  const [commScore, setCommScore] = useState(0);
  const [techScore, setTechScore] = useState(0);
  const [expScore, setExpScore] = useState(0);
  const [fitScore, setFitScore] = useState(0);

  // Technical Test manual scorecard state
  const [testScore, setTestScore] = useState('');
  const [testVerdict, setTestVerdict] = useState<EvaluationVerdict>('PASS');
  const [testRemarks, setTestRemarks] = useState('');
  const [testMode, setTestMode] = useState<'PAPER' | 'ONLINE'>('ONLINE');

  const fetchEvaluations = async () => {
    try {
      const data = await getCandidateEvaluations(candidate.id);
      // Filter evaluations to only matching types
      const filtered = data.filter(e => evalTypes.includes(e.type));
      setEvaluations(filtered);
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
  }, [candidate.id, JSON.stringify(evalTypes)]);

  const handleSchedule = async (evalId: string) => {
    if (!time) {
      toast.error('Please select date and time');
      return;
    }
    setSubmitting(true);
    try {
      await scheduleEvaluation(evalId, {
        interview_mode: mode,
        scheduled_time: new Date(time).toISOString(),
        location_or_link: location
      });
      toast.success('Interview scheduled successfully');
      setSchedulingId(null);
      setTime('');
      setLocation('');
      fetchEvaluations();
    } catch (err) {
      toast.error(extractError(err, 'Failed to schedule interview'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async (evalId: string, isTest = false) => {
    try {
      const tokenData = await generateEvaluationToken(evalId);
      const path = isTest ? 'test' : 'eval';
      const url = `${window.location.origin}/#/${path}/${tokenData.token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link generated and copied to clipboard!');
    } catch (err) {
      toast.error('Failed to generate secure link');
    }
  };

  const handleSubmitScorecard = async (evalId: string, isTechTest = false) => {
    setSubmitting(true);
    try {
      if (isTechTest) {
        await submitScorecardDirect(evalId, {
          verdict: testVerdict,
          remarks: testRemarks,
          scores: { percentage: Number(testScore) }
        });
      } else {
        await submitScorecardDirect(evalId, {
          verdict,
          remarks: remarksText,
          scores: {
            communication: commScore,
            technical: techScore,
            experience: expScore,
            cultural_fit: fitScore
          }
        });
      }
      toast.success('Evaluation submitted');
      setRemarksId(null);
      setRemarksText('');
      setCommScore(0);
      setTechScore(0);
      setExpScore(0);
      setFitScore(0);
      setTestScore('');
      fetchEvaluations();
    } catch (err) {
      toast.error(extractError(err, 'Failed to submit scorecard'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransitionStage = async () => {
    setSubmitting(true);
    try {
      await updateCandidateStage(candidate.id, nextStage, nextStageRemarks);
      toast.success(`Candidate recommended for ${nextStage.replace(/_/g, ' ')}!`);
      onUpdate();
    } catch (err) {
      toast.error(extractError(err, `Failed to move candidate to ${nextStage}`));
    } finally {
      setSubmitting(false);
    }
  };

  const isAllEvaluationsDone = () => {
    if (evaluations.length === 0) return false;
    const completed = evaluations.filter(e => e.status === 'EVALUATED');
    return completed.length === evaluations.length;
  };

  const StarInput = ({ label, val, setVal }: { label: string; val: number; setVal: (v: number) => void }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setVal(star)}
            className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={cn(
                "w-4 h-4 transition-all duration-200",
                star <= val ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="w-full flex justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border border-border bg-surface/50 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evaluations.map((ev) => {
            const isCompleted = ev.status === 'EVALUATED';
            return (
              <div key={ev.id} className="border border-border/80 bg-background/50 rounded-xl p-4 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                      {ev.type.replace(/_/g, ' ')}
                    </h3>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase",
                      isCompleted ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                    )}>
                      {isCompleted ? 'Evaluated' : 'Pending'}
                    </span>
                  </div>

                  {isCompleted ? (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                        <span>Verdict:</span>
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] border uppercase",
                          ev.verdict === 'SELECTED' || ev.verdict === 'PASS' ? "bg-success/10 text-success border-success/20" :
                          ev.verdict === 'ON_HOLD' ? "bg-warning/10 text-warning border-warning/20" :
                          "bg-danger/10 text-danger border-danger/20"
                        )}>
                          {ev.verdict}
                        </span>
                      </div>
                      {ev.remarks && (
                        <p className="text-xs text-muted-foreground italic bg-muted/20 border border-border/40 p-2.5 rounded-lg mt-1">
                          "{ev.remarks}"
                        </p>
                      )}
                      {ev.scores?.percentage !== undefined && (
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Grade: {ev.scores.percentage}% {ev.scores.correct_answers !== undefined && `(${ev.scores.correct_answers}/${ev.scores.total_questions})`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground space-y-1.5 mt-2">
                      {ev.scheduled_time ? (
                        <>
                          <div className="flex justify-between">
                            <span>Scheduled:</span>
                            <strong className="text-foreground">{new Date(ev.scheduled_time).toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Mode:</span>
                            <strong className="text-foreground uppercase">{ev.interview_mode}</strong>
                          </div>
                          {ev.location_or_link && (
                            <div className="flex justify-between truncate max-w-full">
                              <span>Link/Place:</span>
                              <a href={ev.location_or_link} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold max-w-[180px] truncate">
                                {ev.location_or_link}
                              </a>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="italic text-[11px] py-1">Not scheduled yet.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Scheduling Forms */}
                <div className="mt-3">
                  <AnimatePresence mode="wait">
                    {schedulingId === ev.id && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-3 pt-3 border-t border-border mt-3">
                        <h4 className="font-bold text-[10px] uppercase text-foreground">Schedule Details</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-muted-foreground mb-1">Mode</label>
                            <select value={mode} onChange={(e) => setMode(e.target.value as 'PHYSICAL' | 'ONLINE')} className="w-full bg-background border border-border rounded-lg p-2">
                              <option value="PHYSICAL">Physical</option>
                              <option value="ONLINE">Online Meeting</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-muted-foreground mb-1">Date & Time</label>
                            <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-background border border-border rounded-lg p-1.5" />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[9px] font-bold uppercase text-muted-foreground mb-1">
                              {mode === 'ONLINE' ? 'Google Meet / Zoom Link' : 'Location Room/Cabin'}
                            </label>
                            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={mode === 'ONLINE' ? 'https://meet.google.com/...' : 'Conference Room A'} className="w-full bg-background border border-border rounded-lg p-2" />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <Button variant="ghost" size="sm" onClick={() => setSchedulingId(null)}>Cancel</Button>
                          <Button variant="primary" size="sm" onClick={() => handleSchedule(ev.id)} isLoading={submitting}>Save</Button>
                        </div>
                      </motion.div>
                    )}

                    {remarksId === ev.id && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-3 pt-3 border-t border-border mt-3">
                        <h4 className="font-bold text-[10px] uppercase text-foreground">Submit Scorecard Direct</h4>
                        {ev.type === 'TECHNICAL_TEST' ? (
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Score %</label>
                              <input type="number" min="0" max="100" value={testScore} onChange={(e) => setTestScore(e.target.value)} placeholder="80" className="w-full bg-background border border-border rounded-lg p-2" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Verdict</label>
                              <select value={testVerdict} onChange={(e) => setTestVerdict(e.target.value as EvaluationVerdict)} className="w-full bg-background border border-border rounded-lg p-2">
                                <option value="PASS">Pass</option>
                                <option value="FAIL">Fail</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Remarks</label>
                              <textarea value={testRemarks} onChange={(e) => setTestRemarks(e.target.value)} placeholder="Technical test notes..." className="w-full min-h-[60px] bg-background border border-border rounded-lg p-2 resize-y" />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <StarInput label="Technical" val={techScore} setVal={setTechScore} />
                              <StarInput label="Communication" val={commScore} setVal={setCommScore} />
                              <StarInput label="Experience" val={expScore} setVal={setExpScore} />
                              <StarInput label="Culture Fit" val={fitScore} setVal={setFitScore} />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Verdict</label>
                                <select value={verdict} onChange={(e) => setVerdict(e.target.value as EvaluationVerdict)} className="w-full bg-background border border-border rounded-lg p-2">
                                  <option value="SELECTED">Selected / Recommended</option>
                                  <option value="ON_HOLD">On Hold</option>
                                  <option value="REJECTED">Reject Candidate</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Remarks</label>
                              <textarea value={remarksText} onChange={(e) => setRemarksText(e.target.value)} placeholder="Summary of interview..." className="w-full min-h-[60px] bg-background border border-border rounded-lg p-2 resize-y" />
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 justify-end pt-1">
                          <Button variant="ghost" size="sm" onClick={() => setRemarksId(null)}>Cancel</Button>
                          <Button variant="primary" size="sm" onClick={() => handleSubmitScorecard(ev.id, ev.type === 'TECHNICAL_TEST')} isLoading={submitting}>Submit</Button>
                        </div>
                      </motion.div>
                    )}

                    {!isCompleted && !schedulingId && !remarksId && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-border mt-3 justify-end">
                        {ev.type === 'TECHNICAL_TEST' ? (
                          <div className="w-full flex flex-col gap-2">
                            <div className="flex bg-muted/40 p-0.5 rounded-lg border border-border w-fit text-[11px] self-end mb-1">
                              <button type="button" onClick={() => setTestMode('ONLINE')} className={cn("px-2.5 py-1 rounded font-semibold", testMode === 'ONLINE' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Online</button>
                              <button type="button" onClick={() => setTestMode('PAPER')} className={cn("px-2.5 py-1 rounded font-semibold", testMode === 'PAPER' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Paper</button>
                            </div>
                            <div className="flex justify-end gap-2">
                              {testMode === 'ONLINE' ? (
                                <Button variant="ghost" size="sm" className="border border-border text-xs" onClick={() => handleCopyLink(ev.id, true)}>
                                  <Clipboard className="w-3.5 h-3.5 mr-1.5" /> Copy Test Link
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" className="border border-border text-xs" onClick={() => setRemarksId(ev.id)}>
                                  <FileText className="w-3.5 h-3.5 mr-1.5" /> Enter Paper Score
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" className="border border-border text-xs" onClick={() => setSchedulingId(ev.id)}>
                              <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule
                            </Button>
                            <Button variant="ghost" size="sm" className="border border-border text-xs" onClick={() => handleCopyLink(ev.id)}>
                              <Link className="w-3.5 h-3.5 mr-1.5" /> Get Copy Link
                            </Button>
                            <Button variant="ghost" size="sm" className="border border-border text-xs" onClick={() => setRemarksId(ev.id)}>
                              <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Direct Remarks
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Recommendation panel */}
      <div className={cn("border rounded-2xl bg-surface/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300",
        isAllEvaluationsDone() ? "border-primary bg-primary/5" : "border-border opacity-70"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
            isAllEvaluationsDone() ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-sm sm:text-base">Recommend Candidate to Next Stage</h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {isAllEvaluationsDone()
                ? `Ready to transition the candidate to ${nextStage.replace(/_/g, ' ')}.`
                : `Complete all evaluations for this stage to unlock stage recommendation.`
              }
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          disabled={!isAllEvaluationsDone()}
          onClick={handleTransitionStage}
          isLoading={submitting}
          className="w-full sm:w-auto shadow-sm shrink-0"
        >
          <CheckCircle className="w-4 h-4 mr-2" /> Transition Stage
        </Button>
      </div>
    </div>
  );
}
