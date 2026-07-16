import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Link, Clipboard, UserCheck, Award, FileText, CheckCircle, Star, Send, Share2, MapPin, Video, Clock, CheckCheck, ArrowLeft, Phone, MoreVertical, Smile, Paperclip, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Button, LoadingSpinner, Modal, Input } from '../ui';
import { getCandidateEvaluations, scheduleEvaluation, generateEvaluationToken, submitScorecardDirect, sendEvaluationWhatsAppInvite } from '../../api/evaluations';
import { updateCandidateStage } from '../../api/candidates';
import type { Candidate, Evaluation, EvaluationVerdict, PipelineStage } from '../../types';
import { cn, extractError } from '../../lib/utils';
import { useAuth } from '../../auth/AuthContext';
import { format, parseISO } from 'date-fns';


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
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [remarksId, setRemarksId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // WhatsApp Share Modal State
  const [shareEval, setShareEval] = useState<Evaluation | null>(null);
  const [recipientType, setRecipientType] = useState<'INTERVIEWER' | 'CANDIDATE'>('INTERVIEWER');
  
  // Share form states
  const [interviewerPhone, setInterviewerPhone] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  
  const [shareDate, setShareDate] = useState('');
  const [shareTime, setShareTime] = useState('');
  const [shareMode, setShareMode] = useState<'PHYSICAL' | 'ONLINE'>('PHYSICAL');
  const [shareLocation, setShareLocation] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  const openShareModal = (ev: Evaluation) => {
    setShareEval(ev);
    setRecipientType('INTERVIEWER');
    setInterviewerPhone('');
    setInterviewerName('');
    setRecruiterName(user?.full_name || '');
    
    if (ev.scheduled_time) {
      const parts = ev.scheduled_time.split('T');
      if (parts.length === 2) {
        setShareDate(parts[0]);
        setShareTime(parts[1].substring(0, 5));
      } else {
        try {
          const d = new Date(ev.scheduled_time);
          const pad = (n: number) => n.toString().padStart(2, '0');
          setShareDate(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
          setShareTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
        } catch {
          setShareDate('');
          setShareTime('');
        }
      }
    } else {
      setShareDate('');
      setShareTime('');
    }
    setShareMode(ev.interview_mode || 'PHYSICAL');
    setShareLocation(ev.location_or_link || '');
  };
  const generateRandomMeetLink = (target: 'schedule' | 'share') => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const randStr = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const code = `${randStr(3)}-${randStr(4)}-${randStr(3)}`;
    const url = `https://meet.google.com/${code}`;
    if (target === 'schedule') {
      setLocation(url);
    } else {
      setShareLocation(url);
    }
    toast.success('Generated open Google Meet link!');
  };


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

  const handleSendWhatsApp = async () => {
    if (!shareEval) return;
    
    let toPhone = '';
    if (recipientType === 'INTERVIEWER') {
      if (!interviewerPhone.trim()) {
        toast.error('Please enter interviewer phone number');
        return;
      }
      toPhone = interviewerPhone;
    } else {
      toPhone = candidate.phone;
    }

    setSendingInvite(true);
    try {
      let finalLink = shareLocation;
      
      if (recipientType === 'INTERVIEWER') {
        const tokenData = await generateEvaluationToken(shareEval.id);
        finalLink = `${window.location.origin}/#/eval/${tokenData.token}`;
      }

      let dateStr = 'TBD';
      let timeStr = 'TBD';
      if (shareDate && shareTime) {
        try {
          const parsedDate = new Date(`${shareDate}T${shareTime}`);
          if (!isNaN(parsedDate.getTime())) {
            dateStr = format(parsedDate, 'dd MMM yyyy');
            timeStr = format(parsedDate, 'h:mm a');
          }
        } catch (e) {
          console.error(e);
        }
      }

      const displayMode = shareMode === 'PHYSICAL' ? 'Walk-in' : 'Online';

      await sendEvaluationWhatsAppInvite(shareEval.id, {
        to_phone: toPhone,
        variables: {
          candidateName: recipientType === 'INTERVIEWER' ? (interviewerName || 'Interviewer') : candidate.full_name,
          position: candidate.position_applied_for || 'Unknown Position',
          date: dateStr,
          time: timeStr,
          mode: displayMode,
          locationOrLink: finalLink || 'TBD',
          recruiterName: recruiterName || 'HR Team',
        }
      });

      toast.success('WhatsApp invitation sent successfully!');
      setShareEval(null);
    } catch (err) {
      toast.error(extractError(err, 'Failed to send WhatsApp invitation'));
    } finally {
      setSendingInvite(false);
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
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[9px] font-bold uppercase text-muted-foreground">
                                {mode === 'ONLINE' ? 'Google Meet / Zoom Link' : 'Location Room/Cabin'}
                              </label>
                              {mode === 'ONLINE' && (
                                <button
                                  type="button"
                                  onClick={() => generateRandomMeetLink('schedule')}
                                  className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                                >
                                  Auto-generate Meet
                                </button>
                              )}
                            </div>
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
                            <Button variant="ghost" size="sm" className="border border-border text-xs" onClick={() => openShareModal(ev)}>
                              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
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

      {/* WhatsApp Share Modal */}
      <Modal
        isOpen={!!shareEval}
        onClose={() => setShareEval(null)}
        title="Share Interview Invite / Evaluation Link"
        size="lg"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 h-[75vh] overflow-hidden bg-background">
          {/* Left panel: Form */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-y-auto p-6 justify-between">
            <div className="space-y-5">
              {/* Recipient Selector Tabs */}
              <div className="flex bg-muted/40 p-1 rounded-xl border border-border">
                <button
                  onClick={() => setRecipientType('INTERVIEWER')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    recipientType === 'INTERVIEWER' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Send to Interviewer
                </button>
                <button
                  onClick={() => setRecipientType('CANDIDATE')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    recipientType === 'CANDIDATE' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Send to Candidate
                </button>
              </div>

              {recipientType === 'INTERVIEWER' ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Send a secure evaluation link to the interviewer's mobile. They can review candidate info, prior remarks, and enter scorecards from their phone.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Interviewer Phone <span className="text-danger">*</span></label>
                      <Input
                        placeholder="e.g. 9876543210"
                        value={interviewerPhone}
                        onChange={(e) => setInterviewerPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Interviewer Name</label>
                      <Input
                        placeholder="e.g. John Doe"
                        value={interviewerName}
                        onChange={(e) => setInterviewerName(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Your Name (Recruiter)</label>
                      <Input
                        value={recruiterName}
                        onChange={(e) => setRecruiterName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Send scheduled interview timings, mode, and meet/location link to the candidate's phone.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Candidate Phone</label>
                      <Input
                        value={candidate.phone}
                        disabled
                        className="bg-muted/40 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Your Name (Recruiter)</label>
                      <Input
                        value={recruiterName}
                        onChange={(e) => setRecruiterName(e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
                      <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Interview Timing & Mode</h4>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Date</label>
                      <input
                        type="date"
                        value={shareDate}
                        onChange={(e) => setShareDate(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Time</label>
                      <input
                        type="time"
                        value={shareTime}
                        onChange={(e) => setShareTime(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 text-foreground"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1.5">Mode</label>
                      <div className="flex bg-muted/40 p-0.5 rounded-lg border border-border w-fit text-xs">
                        <button
                          type="button"
                          onClick={() => setShareMode('PHYSICAL')}
                          className={cn("px-4 py-1.5 rounded-md font-bold transition-all", shareMode === 'PHYSICAL' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                          Physical / In-Person
                        </button>
                        <button
                          type="button"
                          onClick={() => setShareMode('ONLINE')}
                          className={cn("px-4 py-1.5 rounded-md font-bold transition-all", shareMode === 'ONLINE' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        >
                          Online / Video Call
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider">
                          {shareMode === 'ONLINE' ? 'Google Meet Link' : 'Interview Location Cabin/Branch'}
                        </label>
                        {shareMode === 'ONLINE' && (
                          <button
                            type="button"
                            onClick={() => generateRandomMeetLink('share')}
                            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors bg-muted/50 px-2 py-0.5 rounded border shadow-xs"
                          >
                            <Video className="w-3.5 h-3.5" /> Auto-generate Meet
                          </button>
                        )}
                      </div>
                      {shareMode === 'ONLINE' ? (
                        <div className="flex bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 overflow-hidden">
                          <span className="bg-muted px-3 flex items-center border-r border-border text-xs text-muted-foreground select-none">
                            https://meet.google.com/
                          </span>
                          <input
                            type="text"
                            value={shareLocation.startsWith('https://meet.google.com/') ? shareLocation.substring(24) : shareLocation}
                            onChange={(e) => {
                              const val = e.target.value;
                              setShareLocation(val.startsWith('https://') ? val : 'https://meet.google.com/' + val);
                            }}
                            placeholder="abc-defg-hij"
                            className="w-full p-3 text-sm text-foreground focus:outline-none"
                          />
                        </div>
                      ) : (
                        <Input
                          placeholder="e.g. Enchakkal Branch, 1st Floor Cabin A"
                          value={shareLocation}
                          onChange={(e) => setShareLocation(e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Row */}
            <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
              <Button variant="ghost" onClick={() => setShareEval(null)}>
                Cancel
              </Button>
              <Button onClick={handleSendWhatsApp} isLoading={sendingInvite} className="!bg-[#08796b] hover:!bg-[#06685c] text-white">
                <Send className="w-4 h-4 mr-2" /> Send via WhatsApp
              </Button>
            </div>
          </div>

          {/* Right panel: Phone Mockup */}
          <div className="lg:col-span-5 bg-[#f7f8fa] p-4 flex flex-col items-center justify-center border-l border-border h-full overflow-hidden">
            {/* WhatsApp Device Mockup */}
            <div className="flex h-[490px] w-[275px] shrink-0 flex-col overflow-hidden rounded-[30px] border-[5px] border-[#18181b] bg-[#efeae2] shadow-md relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[14px] w-[80px] bg-[#18181b] rounded-b-[10px] z-20"></div>

              <div className="flex h-[52px] shrink-0 items-center justify-between gap-1 bg-[#075E54] px-2 pt-3.5 text-white z-10 shadow-sm relative">
                <div className="flex items-center gap-1">
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-white/80" />
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ml-0.5 border border-white/20">
                    <img src="/toyota-HR-profile.jpeg" alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 text-left ml-1">
                    <p className="truncate text-[11px] font-bold leading-tight">Nippon Toyota HR</p>
                    <p className="text-[8px] leading-tight text-white/80">Business Account</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/95 mr-1">
                  <Video className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
                  <Phone className="h-[12px] w-[12px]" fill="currentColor" strokeWidth={0} />
                  <MoreVertical className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#efeae2]">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.20]"
                  style={{
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                    backgroundSize: '200px',
                    backgroundRepeat: 'repeat',
                  }}
                />
                <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 pt-3 flex flex-col gap-2">
                  <div className="mx-auto w-fit rounded-lg bg-[#E1F3FB] px-2 py-0.5 text-[8px] uppercase tracking-wide font-bold text-[#55656E] shadow-sm select-none">
                    TODAY
                  </div>

                  <div className="relative max-w-[85%] rounded-lg rounded-tl-none bg-white px-2 py-1.5 text-left text-[11px] leading-[1.25] text-[#111b21] shadow-xs mt-1">
                    <span className="absolute -left-1.5 top-0 h-0 w-0 border-r-[6px] border-t-[8px] border-r-white border-t-transparent" />
                    <div className="whitespace-pre-wrap break-words pb-3 select-all">
                      {(() => {
                        let dStr = 'TBD';
                        let tStr = 'TBD';
                        if (shareDate && shareTime) {
                          try {
                            const parsedDate = new Date(`${shareDate}T${shareTime}`);
                            if (!isNaN(parsedDate.getTime())) {
                              dStr = format(parsedDate, 'dd MMM yyyy');
                              tStr = format(parsedDate, 'h:mm a');
                            }
                          } catch (e) {}
                        }
                        const displayMode = shareMode === 'PHYSICAL' ? 'Walk-in' : 'Online';
                        const targetName = recipientType === 'INTERVIEWER' ? (interviewerName || 'Interviewer') : candidate.full_name;
                        const finalLink = recipientType === 'INTERVIEWER' ? 'https://recruitment.nippontoyota.com/#/eval/token-xyz' : (shareLocation || 'TBD');

                        const previewMessage = `Dear *${targetName}*,

Your HR interview for the position of *${candidate.position_applied_for || 'Unknown Position'}* is scheduled.

*Date:* ${dStr}
*Time:* ${tStr}
*Mode:* ${displayMode}
*Location/Link:* ${finalLink}

Please be on time.

Best Regards,
*${recruiterName || 'HR Team'}*
Nippon Toyota`;

                        return previewMessage.split('\n').map((line, i) => (
                          <span key={i}>
                            {line.split(/\*(.*?)\*/g).map((part, j) => 
                              j % 2 === 1 ? <strong key={j} className="font-bold">{part}</strong> : (
                                part.startsWith('http') ? (
                                  <a key={j} href={part} target="_blank" rel="noreferrer" className="text-[#027eb5] underline hover:text-[#026aa3] break-all">{part}</a>
                                ) : <span key={j}>{part}</span>
                              )
                            )}
                            <br />
                          </span>
                        ));
                      })()}
                    </div>
                    <div className="absolute bottom-0.5 right-1.5 flex items-center gap-0.5">
                      <p className="text-[8px] text-[#667781] whitespace-nowrap">{format(new Date(), 'h:mm a')}</p>
                      <CheckCheck className="h-[10px] w-[10px] text-[#34B7F1]" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex shrink-0 items-end gap-1 p-1 bg-transparent pb-1.5">
                  <div className="flex min-h-[28px] flex-1 items-center gap-1 rounded-full bg-white px-2 py-0.5 shadow-sm">
                    <Smile className="h-[14px] w-[14px] text-[#8696A0]" />
                    <div className="flex-1 text-[10px] text-[#8696A0] px-0.5">Message</div>
                    <Paperclip className="h-3 w-3 text-[#8696A0]" />
                    <Camera className="h-[14px] w-[14px] text-[#8696A0]" />
                  </div>
                  <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-sm">
                    <Send className="h-[12px] w-[12px] mr-0.5" fill="currentColor" strokeWidth={0} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

    </div>
  );
}
