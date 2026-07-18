import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Link, UserCheck, FileText, CheckCircle, Star, Send, Video, Clock, CheckCheck, ArrowLeft, Phone, MoreVertical, Smile, Paperclip, Camera, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button, LoadingSpinner, Modal, Input, EmptyState } from '../ui';
import { getCandidateEvaluations, scheduleEvaluation, generateEvaluationToken, submitScorecardDirect, sendEvaluationWhatsAppInvite } from '../../api/evaluations';
import type { Candidate, Evaluation, EvaluationVerdict, User } from '../../types';
import { cn, extractError } from '../../lib/utils';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../auth/AuthContext';



interface EvaluationStageWidgetProps {
  candidate: Candidate;
  evalTypes: string[];
  title: string;
  onUpdate: () => void;
}

// Simple global cache to allow stale-while-revalidate (instant loading)
const evaluationsCache: Record<string, Evaluation[]> = {};

export function EvaluationStageWidget({
  candidate,
  evalTypes,
  title,
  onUpdate
}: EvaluationStageWidgetProps) {
  const { user } = useAuth();
  const cached = evaluationsCache[candidate.id];
  const [evaluations, setEvaluations] = useState<Evaluation[]>(cached ? cached.filter(e => evalTypes.includes(e.type)) : []);
  const [loading, setLoading] = useState(!cached);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [remarksId, setRemarksId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // WhatsApp Share Modal State
  const [shareEval, setShareEval] = useState<Evaluation | null>(null);
  const [recipientType, setRecipientType] = useState<'INTERVIEWER' | 'CANDIDATE'>('CANDIDATE');

  // Cancel Schedule Confirm State
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [technicalQuestions, setTechnicalQuestions] = useState<any[] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [activeType, setActiveType] = useState(evalTypes[0]);



  useEffect(() => {
    if (activeType === 'TECHNICAL_TEST' && technicalQuestions === null && !loadingQuestions) {
      setLoadingQuestions(true);
      import('../../api/evaluations').then(({ getDepartmentQuestions }) => {
        getDepartmentQuestions(candidate.position_applied_for || 'Telecalling Customer Support')
          .then(setTechnicalQuestions)
          .catch(() => toast.error('Failed to load questions'))
          .finally(() => setLoadingQuestions(false));
      });
    }
  }, [activeType, technicalQuestions, loadingQuestions, candidate.position_applied_for]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    setRecipientType('CANDIDATE');
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
          setShareDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
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
  const [interviewerId, setInterviewerId] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    let isMounted = true;
    import('../../api/users').then(({ getInterviewers }) => {
      getInterviewers().then(users => {
        if (isMounted) setAllUsers(users);
      }).catch(err => {
        console.error(err);
        toast.error('Failed to load interviewers');
      });
    });
    return () => { isMounted = false; };
  }, []);

  const handleOpenSchedule = (id: string) => {
    setSchedulingId(id);
    setLocation('Training room');
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(9, 0, 0, 0);
    setTime((() => { const d = tomorrow; const pad = (n: number) => n.toString().padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; })());
  };

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
  const fetchEvaluations = async () => {
    if (!evaluationsCache[candidate.id]) {
      setLoading(true);
    }
    try {
      const data = await getCandidateEvaluations(candidate.id);
      evaluationsCache[candidate.id] = data;
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
        location_or_link: location,
        interviewer_id: interviewerId || null
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

  const handleRemoveSchedule = async (id: string) => {
    try {
      await scheduleEvaluation(id, {
        interview_mode: null,
        scheduled_time: null,
        location_or_link: null
      });
      toast.success('Schedule cancelled successfully');
      setCancelConfirmId(null);
      fetchEvaluations();
      onUpdate();
    } catch (err: any) {
      toast.error(extractError(err, 'Failed to cancel schedule'));
    }
  };


  const handleCopyLink = async (evalId: string, isTest = false) => {
    try {
      const tokenData = await generateEvaluationToken(evalId);
      const path = isTest ? 'test' : 'eval';
      const url = `${window.location.origin}/#/${path}/${tokenData.token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link generated and copied to clipboard!');
      setCopiedId(evalId);
      setTimeout(() => setCopiedId(null), 2000);
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
            dateStr = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsedDate);
            timeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(parsedDate).toLowerCase();
          }
        } catch (e) {
          console.error(e);
        }
      }

      const displayMode = shareMode === 'PHYSICAL' ? 'Walk-in' : 'Online';

      await sendEvaluationWhatsAppInvite(shareEval.id, {
        to_phone: toPhone,
        recipient_type: recipientType,
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
  const handleInstantWhatsAppShare = (ev: Evaluation) => {
    const mockEv = { ...ev, scheduled_time: new Date().toISOString(), interview_mode: 'ONLINE' };
    openShareModal(mockEv as Evaluation);
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


  const StarInput = ({ label, val, setVal }: { label: string; val: number; setVal: (v: number) => void }) => (
    <div className="flex flex-col p-3 bg-background border border-border rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{label}</span>
        <span className="text-xs font-semibold text-muted-foreground">{val}/5</span>
      </div>
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setVal(star)}
            className="p-1 transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={cn(
                "w-5 h-5 transition-all duration-200",
                star <= val ? "fill-primary text-primary drop-shadow-sm" : "fill-muted text-muted-foreground/30"
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
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
        
        {evalTypes.length > 1 && (
          <div className="flex bg-muted/30 p-1 rounded-xl mb-6 w-fit mx-auto relative border border-border/50">
            {evalTypes.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={cn(
                  "relative px-6 py-2.5 text-sm font-bold rounded-lg transition-colors z-10",
                  activeType === type ? "text-white" : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                {activeType === type && (
                  <motion.div
                    layoutId={`eval-toggle-${title.replace(/\s+/g, '-')}`}
                    className="absolute inset-0 bg-primary shadow-md border border-primary rounded-lg -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-4 grid-cols-1">
          <AnimatePresence mode="wait">
            {evaluations.filter((ev) => evalTypes.length === 1 || ev.type === activeType).length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState
                  icon={<FileText className="w-10 h-10 text-muted-foreground/30" />}
                  title="No evaluation found"
                  description="There are no active evaluations matching this type for the candidate."
                />
              </motion.div>
            ) : evaluations
              .filter((ev) => evalTypes.length === 1 || ev.type === activeType)
              // Deduplicate: for TECHNICAL_TEST only keep the first (prefer EVALUATED status)
              .filter((ev, _idx, arr) => {
                if (ev.type !== 'TECHNICAL_TEST') return true;
                const techEvals = arr.filter(e => e.type === 'TECHNICAL_TEST');
                const preferred = techEvals.find(e => e.status === 'EVALUATED') ?? techEvals[0];
                return ev.id === preferred?.id;
              })
              .map((ev) => {
                const isCompleted = ev.status === 'EVALUATED';
                return (
                  <motion.div 
                    key={ev.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col justify-between py-2"
                  >
                <div>
                  {ev.type !== 'TECHNICAL_TEST' && (
                  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg uppercase tracking-wider text-foreground">
                        {ev.type.replace(/_/g, ' ')}
                      </h3>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase shadow-sm whitespace-nowrap",
                        isCompleted ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/30"
                      )}>
                        {isCompleted ? 'Evaluated' : 'Result Pending'}
                      </span>
                    </div>

                    {!isCompleted && !schedulingId && !remarksId && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => handleCopyLink(ev.id)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-foreground bg-background border border-border hover:bg-muted rounded-xl transition-all shadow-sm whitespace-nowrap">
                          {copiedId === ev.id ? <CheckCircle className="w-4 h-4 text-success" /> : <Link className="w-4 h-4" />}
                          {copiedId === ev.id ? 'Copied' : 'Copy Link'}
                        </button>
                        <button type="button" onClick={() => openShareModal(ev)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#075E54] hover:bg-[#064c44] rounded-xl transition-all shadow-sm whitespace-nowrap">
                          <img src="/whatsapp.webp" alt="WhatsApp" className="w-4 h-4 object-contain" /> Send Invite
                        </button>
                        <button type="button" onClick={() => handleOpenSchedule(ev.id)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-all shadow-sm whitespace-nowrap">
                          <Calendar className="w-4 h-4" /> Schedule Evaluation
                        </button>
                        <button type="button" onClick={() => setRemarksId(ev.id)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-md whitespace-nowrap">
                          <UserCheck className="w-4 h-4" /> Enter Evaluation Result
                        </button>
                      </div>
                    )}
                  </div>
                  )}

                  {isCompleted && remarksId !== ev.id && ev.type !== 'TECHNICAL_TEST' ? (
                    <div className="mt-4 p-5 bg-background border border-border/80 rounded-xl shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-4 mb-4">
                         <div>
                            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Final Verdict</span>
                            <div className="flex items-center gap-2">
                              <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-bold border uppercase shadow-xs",
                                 ev.verdict === 'SELECTED' || ev.verdict === 'PASS' ? "bg-success/10 text-success border-success/30" :
                                   ev.verdict === 'ON_HOLD' ? "bg-warning/10 text-warning border-warning/30" :
                                     "bg-danger/10 text-danger border-danger/30"
                               )}>
                                 {ev.verdict?.replace(/_/g, ' ') || 'EVALUATED'}
                              </span>
                              {ev.verdict === 'ON_HOLD' && (
                                <button type="button" onClick={() => {
                                  setVerdict(ev.verdict as EvaluationVerdict);
                                  setTestVerdict(ev.verdict as EvaluationVerdict);
                                  setRemarksText(ev.remarks || '');
                                  setTestRemarks(ev.remarks || '');
                                  if (ev.scores) {
                                    setCommScore((ev.scores as any).communication || 0);
                                    setTechScore((ev.scores as any).technical || 0);
                                    setExpScore((ev.scores as any).experience || 0);
                                    setFitScore((ev.scores as any).cultural_fit || 0);
                                    setTestScore((ev.scores as any).percentage?.toString() || '');
                                  }
                                  setRemarksId(ev.id);
                                }} className="text-[10px] font-bold text-primary hover:underline px-2 py-1">
                                  Edit
                                </button>
                              )}
                            </div>
                         </div>
                         {ev.scores?.percentage !== undefined && (
                            <div className="text-right">
                              <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Test Score</span>
                              <span className="text-xl font-black text-foreground tracking-tight">
                                {ev.scores.percentage}%
                              </span>
                              {ev.scores.correct_answers !== undefined && (
                                <span className="text-xs text-muted-foreground ml-1 font-semibold">({ev.scores.correct_answers}/{ev.scores.total_questions})</span>
                              )}
                            </div>
                         )}
                      </div>
                      
                      {ev.scores && ev.scores.technical !== undefined && (
                         <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5 pb-5 border-b border-border/50">
                            {['technical', 'communication', 'experience', 'cultural_fit'].map(k => (
                               (ev.scores as any)[k] !== undefined ? (
                                  <div key={k}>
                                    <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{k.replace('_', ' ')}</span>
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map(s => (
                                         <Star key={s} className={cn("w-4 h-4 transition-colors", s <= (ev.scores as any)[k] ? "fill-[#075E54] text-[#075E54]" : "fill-muted text-muted-foreground/30")} />
                                      ))}
                                    </div>
                                  </div>
                               ) : null
                            ))}
                         </div>
                      )}

                      <div>
                         <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Evaluation Remarks</span>
                         <p className="text-sm text-foreground leading-relaxed bg-muted/10 p-3 rounded-lg border border-border/30">
                           {ev.remarks ? `"${ev.remarks}"` : <span className="text-muted-foreground italic">No remarks provided.</span>}
                         </p>
                      </div>
                    </div>
                  ) : null}

                  {ev.type === 'TECHNICAL_TEST' ? (
                    <TechnicalTestPaperWidget 
                      ev={ev} 
                      candidate={candidate} 
                      technicalQuestions={technicalQuestions} 
                      loadingQuestions={loadingQuestions} 
                      handleInstantWhatsAppShare={handleInstantWhatsAppShare} 
                      handleCopyLink={handleCopyLink}
                      remarksId={remarksId} 
                    />
                  ) : !isCompleted ? (
                    <>
                      {ev.scheduled_time && !schedulingId && !remarksId ? (
                        <div className="mt-5 p-4 bg-background border border-border rounded-xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 shadow-sm">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 flex-1 w-full">
                              {/* Date */}
                              <div className="flex flex-col">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Scheduled Date</span>
                                <div className="text-sm font-bold text-foreground">
                                  {new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(ev.scheduled_time))}
                                </div>
                              </div>

                              {/* Time */}
                              <div className="flex flex-col">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Time</span>
                                <div className="text-sm font-bold text-foreground">
                                  {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(ev.scheduled_time)).toLowerCase()}
                                </div>
                              </div>

                              {/* Location */}
                              <div className="flex flex-col col-span-2 md:col-span-1">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                  {ev.interview_mode === 'ONLINE' ? 'Meeting Link' : 'Location'}
                                </span>
                                <div className="text-sm font-bold text-foreground truncate max-w-full" title={ev.location_or_link || ''}>
                                  {ev.location_or_link ? (
                                    ev.interview_mode === 'ONLINE' ? (
                                      <a href={ev.location_or_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline transition-colors truncate block">
                                        {ev.location_or_link}
                                      </a>
                                    ) : (
                                      ev.location_or_link
                                    )
                                  ) : (
                                    <span className="text-muted-foreground/50 font-medium">TBD</span>
                                  )}
                                </div>
                              </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-3 w-full xl:w-auto pt-4 xl:pt-0 border-t border-border/50 xl:border-none justify-end">
                              <button type="button" onClick={() => handleCopyLink(ev.id)} className="flex flex-1 xl:flex-none justify-center items-center gap-2 px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted rounded-lg transition-colors border border-border shadow-sm">
                                {copiedId === ev.id ? <CheckCircle className="w-4 h-4 text-success" /> : <Link className="w-4 h-4" />}
                                {copiedId === ev.id ? 'Copied' : 'Copy'}
                              </button>
                              <button type="button" onClick={() => openShareModal(ev)} className="flex flex-1 xl:flex-none justify-center items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#075E54] hover:bg-[#064c44] rounded-lg transition-colors shadow-sm">
                                <img src="/whatsapp.webp" alt="WhatsApp" className="w-4 h-4 object-contain" /> Send Invite
                              </button>
                              <button type="button" onClick={() => setCancelConfirmId(ev.id)} className="flex flex-none justify-center items-center p-2 text-danger/80 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors" title="Cancel Schedule">
                                <XCircle className="w-5 h-5" />
                              </button>
                          </div>
                        </div>
                      ) : (
                        !schedulingId && !remarksId && (
                          <div className="flex flex-col items-center justify-center py-10 px-4 mt-6 bg-muted/20 border border-dashed border-border/60 rounded-2xl">
                            <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
                            <h3 className="text-base font-bold text-muted-foreground mb-1">Not scheduled yet</h3>
                            <p className="text-sm text-muted-foreground/60 text-center max-w-sm">
                              Click the "Schedule" button above to set the date, time, and location for this evaluation.
                            </p>
                          </div>
                        )
                      )}
                    </>
                  ) : null}
                </div>

                {/* Scheduling Forms */}
                <div className="mt-3">
                  <AnimatePresence mode="wait">
                    {schedulingId === ev.id && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-4 pt-4 border-t border-border mt-4">
                        <h4 className="font-bold text-sm uppercase tracking-wider text-foreground">Schedule Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Mode</label>
                            <div className="flex bg-muted/40 p-1 rounded-xl border border-border/50 relative">
                              <button
                                type="button"
                                onClick={() => setMode('PHYSICAL')}
                                className={cn(
                                  "flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-colors relative z-10",
                                  mode === 'PHYSICAL' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                              >
                                {mode === 'PHYSICAL' && (
                                  <motion.div layoutId={`mode-bg-${ev.id}`} className="absolute inset-0 bg-primary rounded-lg shadow-md border border-border/50" style={{ zIndex: -1 }} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                                )}
                                {ev.type === 'TECHNICAL_TEST' ? 'Physical / Paper' : 'Physical / Walk-in'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setMode('ONLINE')}
                                className={cn(
                                  "flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-colors relative z-10",
                                  mode === 'ONLINE' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                              >
                                {mode === 'ONLINE' && (
                                  <motion.div layoutId={`mode-bg-${ev.id}`} className="absolute inset-0 bg-primary rounded-lg shadow-md border border-border/50" style={{ zIndex: -1 }} transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                                )}
                                {ev.type === 'TECHNICAL_TEST' ? 'Online Exam Link' : 'Online Meeting'}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Date & Time</label>
                            <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-background border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 transition-all text-foreground font-medium" />
                          </div>
                          <div className="sm:col-span-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                {mode === 'ONLINE' ? (ev.type === 'TECHNICAL_TEST' ? 'Exam Link URL' : 'Google Meet / Zoom Link') : (ev.type === 'TECHNICAL_TEST' ? 'Location (if any)' : 'Location Room/Cabin')}
                              </label>
                              {mode === 'ONLINE' && (
                                <button
                                  type="button"
                                  onClick={() => generateRandomMeetLink('schedule')}
                                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md"
                                >
                                  <Video className="w-3.5 h-3.5" /> Auto-generate Meet
                                </button>
                              )}
                            </div>
                            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={mode === 'ONLINE' ? 'https://meet.google.com/...' : 'Conference Room A'} className="w-full bg-background border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 transition-all text-foreground" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Assign Interviewer</label>
                            <select
                              value={interviewerId}
                              onChange={(e) => setInterviewerId(e.target.value)}
                              className="w-full bg-background border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 transition-all text-foreground font-medium"
                            >
                              <option value="">-- Select Interviewer --</option>
                              {allUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.full_name} ({u.role.replace(/_/g, ' ')}) {u.department ? `- ${u.department}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-2 border-t border-border/50">
                          <Button variant="ghost" onClick={() => setSchedulingId(null)} className="font-semibold">Cancel</Button>
                          <Button variant="primary" onClick={() => handleSchedule(ev.id)} isLoading={submitting} className="font-bold shadow-sm px-6">Save Schedule</Button>
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
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <StarInput label="Communication" val={commScore} setVal={setCommScore} />
                              <StarInput label="Technical" val={techScore} setVal={setTechScore} />
                              <StarInput label="Experience" val={expScore} setVal={setExpScore} />
                              <StarInput label="Culture Fit" val={fitScore} setVal={setFitScore} />
                            </div>

                            <div className="h-px w-full bg-border" />

                            <div>
                              <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-2">Remarks & Key Takeaways</label>
                              <textarea value={remarksText} onChange={(e) => setRemarksText(e.target.value)} placeholder="Summary of interview..." className="w-full min-h-[80px] bg-background border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/20 resize-y transition-all" />
                            </div>

                            <div className="grid grid-cols-3 gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setVerdict('SELECTED')}
                                className={cn(
                                  "flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg font-bold text-xs transition-all border",
                                  verdict === 'SELECTED'
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/30"
                                    : "bg-background text-foreground border-border hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-900/20"
                                )}
                              >
                                <CheckCircle2 className="w-4 h-4" /> Selected
                              </button>
                              <button
                                type="button"
                                onClick={() => setVerdict('ON_HOLD')}
                                className={cn(
                                  "flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg font-bold text-xs transition-all border",
                                  verdict === 'ON_HOLD'
                                    ? "bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30"
                                    : "bg-background text-foreground border-border hover:bg-amber-50 hover:border-amber-200 dark:hover:bg-amber-900/20"
                                )}
                              >
                                <Clock className="w-4 h-4" /> Hold
                              </button>
                              <button
                                type="button"
                                onClick={() => setVerdict('REJECTED')}
                                className={cn(
                                  "flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg font-bold text-xs transition-all border",
                                  verdict === 'REJECTED'
                                    ? "bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-600/30"
                                    : "bg-background text-foreground border-border hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-900/20"
                                )}
                              >
                                <XCircle className="w-4 h-4" /> Reject
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 justify-end pt-1">
                          <Button variant="ghost" size="sm" onClick={() => setRemarksId(null)}>Cancel</Button>
                          <Button variant="primary" size="sm" onClick={() => handleSubmitScorecard(ev.id, ev.type === 'TECHNICAL_TEST')} isLoading={submitting}>Submit</Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      </div>

      {/* Cancel Schedule Confirm Modal */}
      <Modal
        isOpen={!!cancelConfirmId}
        onClose={() => setCancelConfirmId(null)}
        title="Cancel Schedule"
        size="sm"
      >
        <div className="p-6 flex flex-col gap-5">
          <p className="text-sm text-foreground font-medium">Are you sure you want to cancel this interview schedule? This action cannot be undone.</p>
          <div className="flex gap-3 justify-end mt-2">
            <Button variant="ghost" onClick={() => setCancelConfirmId(null)} className="font-semibold">No, Keep it</Button>
            <Button variant="primary" onClick={() => cancelConfirmId && handleRemoveSchedule(cancelConfirmId)} className="font-bold bg-danger hover:bg-danger/90 text-white border-transparent">Yes, Cancel</Button>
          </div>
        </div>
      </Modal>

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
              <div className="flex bg-muted/40 p-1.5 rounded-xl border border-border gap-1 relative">
                <button
                  type="button"
                  onClick={() => setRecipientType('CANDIDATE')}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors relative z-10",
                    recipientType === 'CANDIDATE' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {recipientType === 'CANDIDATE' && (
                    <motion.div
                      layoutId="recipientToggle"
                      className="absolute inset-0 bg-primary rounded-lg shadow-md -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  Send to Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('INTERVIEWER')}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors relative z-10",
                    recipientType === 'INTERVIEWER' ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {recipientType === 'INTERVIEWER' && (
                    <motion.div
                      layoutId="recipientToggle"
                      className="absolute inset-0 bg-primary rounded-lg shadow-md -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  Send to Interviewer
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
                      <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Scheduled Interview Details</h4>
                      <div className="bg-muted/20 border border-border/60 rounded-xl p-4 flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                             <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Date</span>
                             <span className="text-sm font-semibold text-foreground">
                               {shareEval?.scheduled_time ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(shareEval.scheduled_time)) : 'TBD'}
                             </span>
                           </div>
                           <div>
                             <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Time</span>
                             <span className="text-sm font-semibold text-foreground">
                               {shareEval?.scheduled_time ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(shareEval.scheduled_time)).toLowerCase() : 'TBD'}
                             </span>
                           </div>
                        </div>
                        <div>
                             <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                               {shareEval?.interview_mode === 'ONLINE' ? 'Meeting Link' : 'Location'} 
                               <span className="text-muted-foreground ml-1 font-normal capitalize">({shareEval?.interview_mode?.toLowerCase() || 'Walk-in'})</span>
                             </span>
                             <span className="text-sm font-semibold text-foreground break-all">
                               {shareEval?.location_or_link || 'TBD'}
                             </span>
                        </div>
                      </div>
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
                              dStr = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsedDate);
                              tStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(parsedDate).toLowerCase();
                            }
                          } catch (e) { }
                        }
                        const displayMode = shareMode === 'PHYSICAL' ? 'Walk-in' : 'Online';
                        const targetName = recipientType === 'INTERVIEWER' ? (interviewerName || 'Interviewer') : candidate.full_name;
                        const finalLink = recipientType === 'INTERVIEWER' ? 'https://recruitment.nippontoyota.com/#/eval/token-xyz' : (shareLocation || 'TBD');

                        const previewMessage = recipientType === 'INTERVIEWER' ? 
`Dear *${targetName}*,

An interview has been scheduled for candidate *${candidate.full_name}* for the position of *${candidate.position_applied_for || 'Unknown Position'}*.

*Date:* ${dStr}
*Time:* ${tStr}
*Mode:* ${displayMode}

Please use the secure link below to access the candidate's profile and submit your evaluation promptly after the interview.

*Evaluation Link:* ${finalLink}

Best Regards,
*${recruiterName || 'HR Team'}*
Nippon Toyota` 
: 
`Dear *${targetName}*,

We are pleased to invite you for an interview at Nippon Toyota for the position of *${candidate.position_applied_for || 'Unknown Position'}*.

*Date:* ${dStr}
*Time:* ${tStr}
*Mode:* ${displayMode}
*Location/Link:* ${finalLink}

Please ensure you are available on time. If you have any questions, please reply to this message.

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
                      <p className="text-[8px] text-[#667781] whitespace-nowrap">{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date()).toLowerCase()}</p>
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


function TechnicalTestPaperWidget({ ev, candidate, technicalQuestions, loadingQuestions, handleInstantWhatsAppShare, remarksId }: any) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `TechnicalTest_${candidate.full_name}`,
  });

  return (
    <div className="mt-5 bg-white shadow-xl rounded-sm w-full max-w-4xl mx-auto text-black font-sans relative overflow-hidden ring-1 ring-black/5" ref={printRef}>
                          {/* Floating Actions */}
                          {!remarksId && (
                            <div className="absolute top-4 right-4 flex gap-2 print:hidden z-10">
                              <button type="button" onClick={() => handlePrint()} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-black hover:bg-gray-800 rounded shadow-md transition-colors whitespace-nowrap">
                                <FileText className="w-3.5 h-3.5" /> Print Paper
                              </button>
                              <button type="button" onClick={() => handleInstantWhatsAppShare(ev)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-[#075E54] hover:bg-[#064c44] rounded shadow-md transition-colors whitespace-nowrap">
                                <img src="/whatsapp.webp" alt="WhatsApp" className="w-3.5 h-3.5 object-contain" /> Send Link
                              </button>
                            </div>
                          )}

                          <div className="p-1">
                            {/* Header Section */}
                            <div className="flex justify-between items-start border-2 border-black border-b-0">
                              <div className="p-1">
                                <h1 className="font-bold text-xl tracking-widest uppercase mb-0 leading-none">Toyota</h1>
                                <h2 className="font-semibold text-[9px] uppercase leading-tight">Motor Corporation</h2>
                                <p className="text-[8px] italic mt-0.5 text-gray-700">For candidates with one year experience and above</p>
                              </div>
                              <div className="border-l-2 border-black flex flex-col w-32 text-[10px]">
                                <div className="border-b-2 border-black p-0.5 text-center font-bold tracking-wide">Series B</div>
                                <div className="border-b-2 border-black p-0.5 text-center font-bold text-[9px] tracking-wide">Version 2020.1</div>
                                <div className="border-b-2 border-black p-0.5 font-medium flex justify-between"><span>Date:</span> <span className="underline decoration-dashed underline-offset-4 text-gray-800 flex-1 ml-1 text-right">{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())}</span></div>
                                <div className="p-0.5 font-medium flex justify-between"><span>Time:</span> <span className="underline decoration-dashed underline-offset-4 text-gray-800 flex-1 ml-1 text-right">{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())}</span></div>
                              </div>
                            </div>
                            
                            <div className="border-2 border-black border-b-0 p-0.5 text-center font-bold uppercase tracking-widest text-[11px] ">
                              Human Resources Department
                            </div>
                            
                            <div className="border-2 border-black border-b-0 p-1 text-[11px] flex flex-col gap-1">
                              <div className="flex items-end">
                                <span className="w-28 font-semibold">Name of the Candidate:</span>
                                <span className="flex-1 border-b-2 border-black text-xs pl-2 pb-0.5 text-blue-900" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>{candidate.full_name}</span>
                              </div>
                              <div className="flex items-end">
                                <span className="w-28 font-semibold">Position Applied For:</span>
                                <span className="flex-1 border-b-2 border-black text-xs pl-2 pb-0.5 text-blue-900" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>{candidate.position_applied_for}</span>
                              </div>
                            </div>
                            
                            <div className="border-2 border-black p-0.5 text-center font-bold uppercase tracking-widest text-[11px] ">
                              Question Paper - {candidate.position_applied_for || 'Call Centre'}
                            </div>

                            {/* Questions Table */}
                            {loadingQuestions ? (
                              <div className="flex justify-center py-12 border-x-2 border-b-2 border-black"><LoadingSpinner size="md" /></div>
                            ) : technicalQuestions?.length === 0 ? (
                              <div className="text-center py-12 border-x-2 border-b-2 border-black text-gray-500 font-semibold">No questions found.</div>
                            ) : (
                              <table className="w-full border-collapse border-2 border-t-0 border-black text-sm">
                                <thead>
                                  <tr>
                                    <th className="border-2 border-t-0 border-black w-8 p-0"></th>
                                    <th className="border-2 border-t-0 border-black p-0"></th>
                                    <th className="border-2 border-t-0 border-black w-12 text-center text-[10px] p-1 leading-tight">Max.<br/>Marks</th>
                                    <th className="border-2 border-t-0 border-black w-14 text-center text-[10px] p-1 leading-tight">Marks<br/>Obtained</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {technicalQuestions?.map((q: any, idx: number) => {
                                    const submittedAns = ev.scores?.candidate_answers?.[q.id];
                                    const qScore = ev.scores?.question_scores?.[String(q.id)];
                                    return (
                                      <tr key={q.id || idx}>
                                        <td className="border-2 border-black text-center align-top py-1.5 text-xs font-semibold text-gray-800">{idx + 1}</td>
                                        <td className="border-2 border-black p-0 align-top">
                                          <div className="border-b-2 border-black p-1 text-[12px] font-bold text-gray-900 leading-snug">
                                            {q.text}
                                          </div>
                                          <div className="p-1 min-h-[2rem] text-gray-800 flex flex-col justify-center">
                                            {q.options && Object.keys(q.options).length > 0 ? (
                                              <div className="flex flex-col gap-1.5">
                                                {Object.entries(q.options).map(([key, val]) => (
                                                  <div key={key} className={cn("flex gap-1.5 text-[11px]", submittedAns === key ? "font-bold text-black" : "")}>
                                                    <span className="font-semibold w-4">{key}.</span> 
                                                    <span>{val as React.ReactNode}</span>
                                                    {submittedAns === key && (
                                                      <span className="ml-1 italic text-green-700 font-bold text-sm leading-none align-middle" style={{ transform: 'rotate(-10deg)', display: 'inline-block' }}>✓</span>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="text-gray-500 italic h-4 flex items-end">
                                                {submittedAns ? <span className="text-blue-900 font-semibold text-sm leading-none block border-b border-dashed border-gray-400 w-full pb-0.5" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>{submittedAns}</span> : ""}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                        <td className="border-2 border-black text-center align-middle font-bold text-[13px] text-gray-800">1</td>
                                        <td className="border-2 border-black text-center align-middle relative">
                                          {qScore !== undefined ? (
                                            <span
                                              className="font-bold text-lg"
                                              style={{
                                                color: qScore === 1 ? '#16a34a' : '#dc2626',
                                                fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif'
                                              }}
                                            >
                                              {qScore}
                                            </span>
                                          ) : null}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
    </div>
  );
}
