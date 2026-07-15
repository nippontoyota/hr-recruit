import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Link, Clipboard, UserCheck, Award, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button, LoadingSpinner } from '../ui';
import { getCandidateEvaluations, scheduleEvaluation, generateEvaluationToken, submitScorecardDirect } from '../../api/evaluations';
import { updateCandidateStage } from '../../api/candidates';
import type { Candidate, Evaluation, EvaluationVerdict } from '../../types';
import { cn, extractError } from '../../lib/utils';

interface BranchEvaluationDashboardProps {
  candidate: Candidate;
  onUpdate: () => void;
}

export function BranchEvaluationDashboard({ candidate, onUpdate }: BranchEvaluationDashboardProps) {
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
      const url = `${window.location.origin}/${path}/${tokenData.token}`;
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

  const handleSendToHQ = async () => {
    setSubmitting(true);
    try {
      await updateCandidateStage(candidate.id, 'HQ_EVALUATION', 'All local branch evaluations completed successfully. Recommending candidate to HQ.');
      toast.success('Candidate package successfully sent to HQ!');
      onUpdate();
    } catch (err) {
      toast.error(extractError(err, 'Failed to send package to HQ'));
    } finally {
      setSubmitting(false);
    }
  };

  const isAllEvaluationsDone = () => {
    if (evaluations.length < 4) return false;
    const branchTypes = ['BRANCH_HR', 'DEPT_HEAD', 'GM_LEVEL', 'TECHNICAL_TEST'];
    const completed = evaluations.filter(e => branchTypes.includes(e.type) && e.status === 'EVALUATED');
    return completed.length === 4;
  };

  const StarInput = ({ label, val, setVal }: { label: string; val: number; setVal: (v: number) => void }) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setVal(s)}
            className="text-yellow-400 focus:outline-none"
          >
            <span className="text-xl">{s <= val ? '★' : '☆'}</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <div className="h-[400px] flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  const branchHR = evaluations.find(e => e.type === 'BRANCH_HR');
  const deptHead = evaluations.find(e => e.type === 'DEPT_HEAD');
  const gmLevel = evaluations.find(e => e.type === 'GM_LEVEL');
  const techTest = evaluations.find(e => e.type === 'TECHNICAL_TEST');

  return (
    <div className="space-y-6 mt-6">
      <div className="border border-border rounded-2xl bg-surface/50 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-1">Local Branch Evaluations</h2>
        <p className="text-sm text-muted-foreground mb-6">Complete all 4 branch interviews and test criteria to recommend the candidate to HQ.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Helper Generator */}
          {[
            { key: 'BRANCH_HR', title: '1. Branch HR Interview', data: branchHR },
            { key: 'DEPT_HEAD', title: '2. Department Head Interview', data: deptHead },
            { key: 'GM_LEVEL', title: '3. GM Level Interview', data: gmLevel },
            { key: 'TECHNICAL_TEST', title: '4. Technical Test', data: techTest }
          ].map((item) => {
            const ev = item.data;
            if (!ev) return null;

            const isEditingSchedule = schedulingId === ev.id;
            const isEnteringRemarks = remarksId === ev.id;
            const isCompleted = ev.status === 'EVALUATED';

            return (
              <div key={item.key} className={cn("border border-border rounded-xl bg-background p-5 flex flex-col justify-between shadow-sm relative overflow-hidden transition-all duration-200", isCompleted && "border-success/30 bg-success/[0.01]")}>
                {isCompleted && (
                  <div className="absolute top-0 right-0 w-8 h-8 bg-success/10 text-success rounded-bl-xl flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}

                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2 mb-3">
                    {item.title}
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold border", 
                      isCompleted ? "bg-success/10 text-success border-success/20" : 
                      ev.status === 'SCHEDULED' ? "bg-info/10 text-info border-info/20" : 
                      "bg-muted text-muted-foreground border-border"
                    )}>
                      {isCompleted ? 'Completed' : ev.status === 'SCHEDULED' ? 'Scheduled' : 'Pending'}
                    </span>
                  </h3>

                  {/* Scheduled state content */}
                  {!isCompleted && ev.status === 'SCHEDULED' && !isEditingSchedule && (
                    <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-xs space-y-1.5 mb-4">
                      <p className="font-medium text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {new Date(ev.scheduled_time!).toLocaleString()}
                      </p>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Mode:</strong> {ev.interview_mode === 'PHYSICAL' ? 'Physical (In-Person)' : 'Online (Virtual)'}
                      </p>
                      {ev.location_or_link && (
                        <p className="text-muted-foreground truncate">
                          <strong className="text-foreground">{ev.interview_mode === 'ONLINE' ? 'Link:' : 'Location:'}</strong>{' '}
                          {ev.location_or_link.startsWith('http') ? (
                            <a href={ev.location_or_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{ev.location_or_link}</a>
                          ) : ev.location_or_link}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Completed details content */}
                  {isCompleted && (
                    <div className="space-y-3 text-xs mb-4">
                      <div className="flex flex-wrap gap-2 text-foreground font-semibold">
                        <span>Verdict:</span>
                        <span className={cn(ev.verdict === 'SELECTED' || ev.verdict === 'PASS' ? "text-success" : ev.verdict === 'ON_HOLD' ? "text-warning" : "text-danger")}>
                          {ev.verdict}
                        </span>
                        {ev.scores?.percentage !== undefined && (
                          <span className="bg-muted px-2 py-0.5 rounded border text-muted-foreground font-bold">
                            Score: {ev.scores.percentage}%
                          </span>
                        )}
                      </div>
                      
                      {ev.scores && ev.type !== 'TECHNICAL_TEST' && (
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-muted/30 p-2 rounded">
                          <div>Tech: <span className="font-bold text-foreground">{ev.scores.technical}/5</span></div>
                          <div>Comm: <span className="font-bold text-foreground">{ev.scores.communication}/5</span></div>
                          <div>Exp: <span className="font-bold text-foreground">{ev.scores.experience}/5</span></div>
                          <div>Fit: <span className="font-bold text-foreground">{ev.scores.cultural_fit}/5</span></div>
                        </div>
                      )}

                      <p className="text-muted-foreground italic bg-muted/20 border border-border/50 p-2.5 rounded-lg line-clamp-3">
                        "{ev.remarks || 'No remarks left.'}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Actions / Forms */}
                <div>
                  <AnimatePresence mode="wait">
                    {isEditingSchedule ? (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 pt-3 border-t border-border mt-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Mode</label>
                            <select value={mode} onChange={(e) => setMode(e.target.value as 'PHYSICAL' | 'ONLINE')} className="w-full bg-background border border-border rounded-lg p-2 focus:ring-1 focus:ring-primary">
                              <option value="PHYSICAL">Physical</option>
                              <option value="ONLINE">Online</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Date & Time</label>
                            <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2 focus:ring-1 focus:ring-primary" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Location or Meeting Link</label>
                          <input type="text" placeholder={mode === 'ONLINE' ? 'e.g. Google Meet link' : 'e.g. Floor 2, Room 3'} value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2 focus:ring-1 focus:ring-primary" />
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <Button variant="ghost" size="sm" onClick={() => setSchedulingId(null)}>Cancel</Button>
                          <Button variant="primary" size="sm" onClick={() => handleSchedule(ev.id)} isLoading={submitting}>Save</Button>
                        </div>
                      </motion.div>
                    ) : isEnteringRemarks ? (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 pt-3 border-t border-border mt-3 text-xs">
                        {ev.type === 'TECHNICAL_TEST' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">Test Score (0-100)</label>
                              <input type="number" placeholder="85" value={testScore} onChange={(e) => setTestScore(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2" />
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
                              <textarea value={testRemarks} onChange={(e) => setTestRemarks(e.target.value)} placeholder="Paper test evaluation notes..." className="w-full min-h-[60px] bg-background border border-border rounded-lg p-2 resize-y" />
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
                    ) : (
                      // Main card action buttons
                      !isCompleted && (
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
                      )
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommend Package Panel */}
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
            <h4 className="font-bold text-foreground text-sm sm:text-base">Recommend Candidate to Head Office</h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {isAllEvaluationsDone() 
                ? "All branch interviews and test logs are completed. Ready to submit candidate package to HQ HR."
                : "Complete all 4 branch interviews and tech test marks to unlock HQ review recommendation."
              }
            </p>
          </div>
        </div>
        <Button 
          variant="primary" 
          disabled={!isAllEvaluationsDone()} 
          onClick={handleSendToHQ}
          isLoading={submitting}
          className="w-full sm:w-auto shadow-sm shrink-0"
        >
          <CheckCircle className="w-4 h-4 mr-2" /> Recommend & Send to HQ
        </Button>
      </div>
    </div>
  );
}
