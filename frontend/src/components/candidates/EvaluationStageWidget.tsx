import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, FileText, CheckCircle, Check, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, LoadingSpinner, Modal, EmptyState } from '../ui';
import { getCandidateEvaluations, scheduleEvaluation, generateEvaluationToken, submitScorecardDirect, sendEvaluationWhatsAppInvite, createEvaluation } from '../../api/evaluations';
import type { Candidate, Evaluation, EvaluationVerdict } from '../../types';
import { cn, extractError } from '../../lib/utils';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../auth/AuthContext';

interface EvaluationStageWidgetProps {
  candidate: Candidate;
  evalTypes: string[];
  onUpdate: () => void;
}

// Simple global cache to allow stale-while-revalidate (instant loading)
const evaluationsCache: Record<string, Evaluation[]> = {};

export function EvaluationStageWidget({
  candidate,
  evalTypes,
  onUpdate
}: EvaluationStageWidgetProps) {
  const { user } = useAuth();
  const cached = evaluationsCache[candidate.id];
  const [evaluations, setEvaluations] = useState<Evaluation[]>(cached ? cached.filter(e => evalTypes.includes(e.type)) : []);
  const [loading, setLoading] = useState(!cached);
  const [remarksId, setRemarksId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);



  // Cancel Schedule Confirm State
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [generatingLinkId, setGeneratingLinkId] = useState<string | null>(null);
  const [technicalQuestions, setTechnicalQuestions] = useState<any[] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  // No activeType needed since we show all



  useEffect(() => {
    if (evalTypes.includes('TECHNICAL_TEST') && technicalQuestions === null && !loadingQuestions) {
      setLoadingQuestions(true);
      import('../../api/evaluations').then(({ getDepartmentQuestions }) => {
        getDepartmentQuestions(candidate.position_applied_for || 'Telecalling Customer Support')
          .then(setTechnicalQuestions)
          .catch(() => toast.error('Failed to load questions'))
          .finally(() => setLoadingQuestions(false));
      });
    }
  }, [evalTypes, technicalQuestions, loadingQuestions, candidate.position_applied_for]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [sendingInvite, setSendingInvite] = useState(false);


  // Schedule functionality removed for simpler UI

  // Remarks form state
  const [verdict, setVerdict] = useState<EvaluationVerdict | null>(null);
  const [remarksText, setRemarksText] = useState('');
  const [attitudeScore, setAttitudeScore] = useState(0);
  const [commScore, setCommScore] = useState(0);
  const [knowledgeScore, setKnowledgeScore] = useState(0);

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

  useEffect(() => {
    if (!loading && !remarksId) {
      const pending = evaluations.find(e => e.status !== 'EVALUATED' && e.type !== 'TECHNICAL_TEST');
      if (pending) setRemarksId(pending.id);
    }
  }, [evaluations, loading, remarksId]);

  const handleAddDeptInterview = async () => {
    try {
      setSubmitting(true);
      await createEvaluation(candidate.id, 'DEPT_HEAD');
      toast.success('Department Interview added');
      fetchEvaluations();
    } catch (err) {
      toast.error(extractError(err, 'Failed to add department interview'));
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
    if (generatingLinkId) return;
    setGeneratingLinkId(evalId);
    try {
      const tokenData = await generateEvaluationToken(evalId);
      const path = isTest ? 'test' : 'eval';
      const url = `${window.location.origin}/#/${path}/${tokenData.token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link generated and copied to clipboard!');
      setCopiedId(evalId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate secure link');
    } finally {
      setGeneratingLinkId(null);
    }
  };


  const handleInstantWhatsAppShare = async (ev: Evaluation) => {
    setSendingInvite(true);
    const mockId = toast.loading('Sending WhatsApp invite to candidate...');
    try {
      const tokenData = await generateEvaluationToken(ev.id);
      const path = ev.type === 'TECHNICAL_TEST' ? 'test' : 'eval';
      const finalLink = `${window.location.origin}/#/${path}/${tokenData.token}`;

      let dateStr = 'TBD';
      let timeStr = 'TBD';
      const targetTime = ev.scheduled_time || new Date().toISOString();
      try {
        const parsedDate = new Date(targetTime);
        if (!isNaN(parsedDate.getTime())) {
          dateStr = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsedDate);
          timeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(parsedDate).toLowerCase();
        }
      } catch (e) { console.error(e); }

      const displayMode = ev.interview_mode === 'PHYSICAL' ? 'Walk-in' : 'Online';

      await sendEvaluationWhatsAppInvite(ev.id, {
        to_phone: candidate.phone,
        recipient_type: 'CANDIDATE',
        variables: {
          candidateName: candidate.full_name,
          position: candidate.position_applied_for || 'Unknown Position',
          date: dateStr,
          time: timeStr,
          mode: displayMode,
          locationOrLink: finalLink,
          recruiterName: user?.full_name || 'HR Team',
        }
      });
      toast.success('WhatsApp invitation sent successfully!', { id: mockId });
    } catch (err) {
      toast.error(extractError(err, 'Failed to send WhatsApp invitation'), { id: mockId });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSubmitScorecard = async (evalId: string, ev: Evaluation, isTechTest = false) => {
    if (isTechTest) {
      if (!testScore || !testVerdict) {
        toast.error('Please enter the score and select a verdict');
        return;
      }
    } else {
      if (attitudeScore === 0 || commScore === 0 || knowledgeScore === 0 || !verdict) {
        toast.error('Please complete all star ratings and select a verdict');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isTechTest) {
        await submitScorecardDirect(evalId, {
          verdict: testVerdict as EvaluationVerdict,
          remarks: testRemarks,
          scores: { percentage: Number(testScore) }
        });
      } else {
        await submitScorecardDirect(evalId, {
          verdict: verdict as EvaluationVerdict,
          remarks: remarksText,
          scores: {
            attitude: attitudeScore,
            communication: commScore,
            knowledge: knowledgeScore,
            total_score: attitudeScore + commScore + knowledgeScore
          }
        });
      }
      
      const evalName = ev.type === 'BRANCH_HR' ? 'HR INTERVIEW' : ev.type === 'DEPT_HEAD' ? 'DEPARTMENT INTERVIEW' : ev.type.replace(/_/g, ' ');
      toast.success(`${evalName} saved successfully`);
      setRemarksId(null);
      setVerdict(null);
      setAttitudeScore(0);
      setCommScore(0);
      setKnowledgeScore(0);
      setTestScore('');
      fetchEvaluations();
    } catch (err) {
      toast.error(extractError(err, 'Failed to submit scorecard'));
    } finally {
      setSubmitting(false);
    }
  };


  const StarInput = ({ label, val, setVal, maxStars = 5 }: { label: string; val: number; setVal: (v: number) => void; maxStars?: number }) => (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{label}</span>
        <span className="text-xs font-semibold text-muted-foreground">{val}/{maxStars}</span>
      </div>
      <div className="flex items-center justify-start gap-1.5">
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setVal(star)}
            className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={cn(
                "w-8 h-8 transition-all duration-200",
                star <= val ? "fill-amber-400 text-amber-500 drop-shadow-sm" : "fill-muted text-muted-foreground/30"
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

        


        <div className="grid gap-4 grid-cols-1">
          <AnimatePresence mode="wait">
            {evaluations.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState
                  icon={<FileText className="w-10 h-10 text-muted-foreground/30" />}
                  title="No evaluation found"
                  description="There are no active evaluations matching this type for the candidate."
                />
              </motion.div>
            ) : evaluations
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
                        {ev.type === 'BRANCH_HR' ? 'HR INTERVIEW' : ev.type === 'DEPT_HEAD' ? 'DEPARTMENT INTERVIEW' : ev.type.replace(/_/g, ' ')}
                      </h3>
                      {isCompleted && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase shadow-sm whitespace-nowrap bg-success/10 text-success border-success/20">
                          Evaluated
                        </span>
                      )}
                    </div>

                    {!isCompleted && (
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <button type="button" onClick={() => {
                          const meetLink = `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
                          handleInstantWhatsAppShare({ ...ev, interview_mode: 'ONLINE', location_or_link: meetLink } as any);
                        }} disabled={sendingInvite} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-[#075E54] hover:bg-[#064c44] rounded-sm transition-all shadow-sm whitespace-nowrap disabled:opacity-50 uppercase tracking-wider">
                          <img src="/whatsapp.webp" alt="WhatsApp" className="w-3.5 h-3.5 object-contain" /> SEND GMEET LINK
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
                                      setAttitudeScore((ev.scores as any).attitude || 0);
                                      setCommScore((ev.scores as any).communication || 0);
                                      setKnowledgeScore((ev.scores as any).knowledge || 0);
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
                                    <div className="flex gap-1">
                                      {[1, 2, 3, 4, 5].map(s => (
                                         <Star key={s} className={cn("w-5 h-5 transition-colors", s <= (ev.scores as any)[k] ? "fill-amber-400 text-amber-500" : "fill-muted text-muted-foreground/30")} />
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
                      copiedId={copiedId}
                      generatingLinkId={generatingLinkId}
                      remarksId={remarksId} 
                    />
                  ) : null}
                </div>

                <div className="mt-3">
                  <AnimatePresence mode="wait">
                    {remarksId === ev.id && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-3 pt-3 border-t border-border mt-3">

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
                            <div className="flex justify-end -mb-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setAttitudeScore(4);
                                  setCommScore(3);
                                  setKnowledgeScore(3);
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary hover:text-primary/80 transition-colors bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" /> Give Full Marks
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                              <div className="flex flex-col gap-4">
                                <StarInput label="Attitude" val={attitudeScore} setVal={setAttitudeScore} maxStars={4} />
                                <StarInput label="Communication" val={commScore} setVal={setCommScore} maxStars={3} />
                                <StarInput label="Knowledge" val={knowledgeScore} setVal={setKnowledgeScore} maxStars={3} />
                              </div>

                              <div className="h-full flex flex-col">
                                <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-2">Remarks & Key Takeaways</label>
                                <textarea value={remarksText} onChange={(e) => setRemarksText(e.target.value)} placeholder="Summary of interview..." className="w-full h-full min-h-[140px] bg-background border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/20 resize-none transition-all" />
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                              <div className="flex items-center gap-10">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <div className={cn("w-6 h-6 border-2 flex items-center justify-center shrink-0 transition-colors", verdict === 'SELECTED' ? "border-success bg-success/10" : "border-border bg-background group-hover:border-success/50")}>
                                    {verdict === 'SELECTED' && <Check className="w-5 h-5 text-success stroke-[3]" />}
                                  </div>
                                  <span className="text-sm font-bold uppercase tracking-wider text-foreground">Selected</span>
                                  <input type="radio" className="hidden" checked={verdict === 'SELECTED'} onChange={() => setVerdict('SELECTED')} />
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <div className={cn("w-6 h-6 border-2 flex items-center justify-center shrink-0 transition-colors", verdict === 'ON_HOLD' ? "border-success bg-success/10" : "border-border bg-background group-hover:border-success/50")}>
                                    {verdict === 'ON_HOLD' && <Check className="w-5 h-5 text-success stroke-[3]" />}
                                  </div>
                                  <span className="text-sm font-bold uppercase tracking-wider text-foreground">Hold</span>
                                  <input type="radio" className="hidden" checked={verdict === 'ON_HOLD'} onChange={() => setVerdict('ON_HOLD')} />
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <div className={cn("w-6 h-6 border-2 flex items-center justify-center shrink-0 transition-colors", verdict === 'REJECTED' ? "border-success bg-success/10" : "border-border bg-background group-hover:border-success/50")}>
                                    {verdict === 'REJECTED' && <Check className="w-5 h-5 text-success stroke-[3]" />}
                                  </div>
                                  <span className="text-sm font-bold uppercase tracking-wider text-foreground">Rejected</span>
                                  <input type="radio" className="hidden" checked={verdict === 'REJECTED'} onChange={() => setVerdict('REJECTED')} />
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 justify-end pt-1">
                          {isCompleted && (
                             <Button variant="ghost" size="sm" onClick={() => setRemarksId(null)}>Cancel</Button>
                          )}
                          <Button variant="primary" size="sm" onClick={() => handleSubmitScorecard(ev.id, ev, ev.type === 'TECHNICAL_TEST')} isLoading={submitting}>Submit</Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>

          {evalTypes.includes('DEPT_HEAD') && evaluations.filter(e => e.type === 'DEPT_HEAD').length > 0 && evaluations.filter(e => e.type === 'DEPT_HEAD').length < 5 && (
            <div className="flex justify-start mt-2">
              <Button variant="primary" size="sm" onClick={handleAddDeptInterview} isLoading={submitting} className="bg-primary/10 text-primary hover:bg-primary/20 border-0 shadow-none">
                <span className="font-bold text-[10px] uppercase tracking-wider">+ Add Another Dept Interview</span>
              </Button>
            </div>
          )}
        </div>
      </div>

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



    </div>
  );
}


function TechnicalTestPaperWidget({ ev, candidate, technicalQuestions, loadingQuestions, handleInstantWhatsAppShare, handleCopyLink, copiedId, generatingLinkId, remarksId }: any) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `TechnicalTest_${candidate.full_name}`,
  });

  return (
    <div>
      {/* Action Buttons — outside QP so they don't print */}
      {!remarksId && (
        <div className="flex gap-2 justify-end mb-3 print:hidden">
          {ev.status !== 'EVALUATED' && (
            <>
              <button
                type="button"
                onClick={() => handleCopyLink(ev.id, true)}
                disabled={generatingLinkId === ev.id}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-foreground bg-background border border-border hover:bg-muted rounded shadow-sm transition-colors whitespace-nowrap ${generatingLinkId === ev.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {generatingLinkId === ev.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copiedId === ev.id ? (
                  <CheckCircle className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Link className="w-3.5 h-3.5" />
                )}
                {generatingLinkId === ev.id ? 'Generating...' : copiedId === ev.id ? 'Copied!' : 'Copy Test Link'}
              </button>
              <button
                type="button"
                onClick={() => handleInstantWhatsAppShare(ev)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-[#075E54] hover:bg-[#064c44] rounded shadow-md transition-colors whitespace-nowrap"
              >
                <img src="/whatsapp.webp" alt="WhatsApp" className="w-3.5 h-3.5 object-contain" /> Send Link
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-black hover:bg-gray-800 rounded shadow-md transition-colors whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" /> Print Paper
          </button>
        </div>
      )}

      <div className="bg-white shadow-xl rounded-sm w-full max-w-4xl mx-auto text-black font-sans relative overflow-hidden ring-1 ring-black/5" ref={printRef}>
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
    </div>
  );
}
