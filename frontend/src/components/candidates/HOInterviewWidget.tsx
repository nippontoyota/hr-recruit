import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, LoadingSpinner, Modal, EmptyState } from '../ui';
import { InterviewFormCard } from './InterviewFormCard';
import { getCandidateEvaluations, scheduleEvaluation, generateEvaluationToken, submitScorecardDirect, sendEvaluationWhatsAppInvite, createEvaluation } from '../../api/evaluations';
import type { Candidate, Evaluation, EvaluationVerdict } from '../../types';
import { cn, extractError } from '../../lib/utils';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../../auth/AuthContext';

interface HOInterviewWidgetProps {
  candidate: Candidate;
  evalTypes: string[];
  onUpdate: () => void;
  isReadOnly?: boolean;
}

// Simple global cache to allow stale-while-revalidate (instant loading)
const evaluationsCache: Record<string, Evaluation[]> = {};


export function HOInterviewWidget({
  candidate,
  evalTypes,
  onUpdate,
  isReadOnly = false
}: HOInterviewWidgetProps) {
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
        getDepartmentQuestions(candidate.department || 'Telecalling Customer Support')
          .then(setTechnicalQuestions)
          .catch(() => toast.error('Failed to load questions'))
          .finally(() => setLoadingQuestions(false));
      });
    }
  }, [evalTypes, technicalQuestions, loadingQuestions, candidate.department]);

  const [copiedId, setCopiedId] = useState<string | null>(null);




  // Schedule functionality removed for simpler UI

  // Remarks form state
  const [verdict, setVerdict] = useState<EvaluationVerdict | null>(null);
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

    // Auto-create missing evaluations so the cards are always visible
    if (!loading && !submitting) {
      let missingType = evalTypes.find(type => !evaluations.some(e => e.type === type));
      if (missingType) {
        setSubmitting(true);
        createEvaluation(candidate.id, missingType)
          .then(() => fetchEvaluations())
          .finally(() => setSubmitting(false));
      }
    }
  }, [evaluations, loading, remarksId, evalTypes, candidate.id, submitting]);

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
          position: candidate.department || 'Unknown Position',
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




  if (loading) {
    return (
      <div className="w-full flex justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">


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
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .filter((ev, _idx, arr) => {
                // Deduplicate BRANCH_HR: only keep the first one
                // Deduplicate TECHNICAL_TEST: prefer EVALUATED status
                if (ev.type === 'TECHNICAL_TEST') {
                  const techEvals = arr.filter(e => e.type === 'TECHNICAL_TEST');
                  const preferred = techEvals.find(e => e.status === 'EVALUATED') ?? techEvals[0];
                  if (ev.id !== preferred?.id) return false;
                  return true;
                }
                
                // For all other types, just keep the first one
                const firstOfType = arr.find(e => e.type === ev.type);
                if (ev.id !== firstOfType?.id) return false;

                return true;
              })
              .map((ev) => {
                if (ev.type !== 'TECHNICAL_TEST') {
                  return (
                    <InterviewFormCard 
                      key={ev.id} 
                      ev={ev} 
                      index={evaluations.filter(e => e.type === ev.type).findIndex(e => e.id === ev.id)} 
                      candidate={candidate} 
                      onUpdate={() => { fetchEvaluations(); onUpdate(); }} 
                    />
                  );
                }

                const isCompleted = ev.status === 'EVALUATED';
                return (
                  <motion.div 
                    key={ev.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mb-12"
                  >
                    <div className="flex flex-col items-center justify-center mb-6 gap-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-extrabold text-2xl uppercase tracking-widest text-foreground">
                          TECHNICAL TEST
                        </h3>
                        {isCompleted && (
                          <span className="text-[11px] font-bold px-3 py-1 rounded-full border uppercase shadow-sm whitespace-nowrap bg-emerald-100 text-emerald-800 border-emerald-200">
                            Evaluated
                          </span>
                        )}
                      </div>
                    </div>
                    
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
                      setRemarksId={setRemarksId}
                    />

                    <div className="mt-3">
                      <AnimatePresence mode="wait">
                        {remarksId === ev.id && (
                          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-3 pt-3 border-t border-border mt-3">
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
                            <div className="flex gap-2 justify-end pt-2">
                              {isCompleted && (
                                <Button variant="ghost" size="sm" onClick={() => setRemarksId(null)}>Cancel</Button>
                              )}
                              <Button variant="primary" size="sm" onClick={() => handleSubmitScorecard(ev.id, ev, true)} isLoading={submitting}>Submit Test</Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
            })}
          </AnimatePresence>

          {evalTypes.includes('DEPT_HEAD') && (
            <div className="flex justify-center mt-2 mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSubmitting(true);
                  createEvaluation(candidate.id, 'DEPT_HEAD').then(() => {
                    fetchEvaluations();
                  }).catch(err => {
                    console.error('Failed to add DEPT_HEAD:', err);
                  }).finally(() => setSubmitting(false));
                }}
                isLoading={submitting}
                className="border-dashed border-2 hover:bg-muted/50 text-muted-foreground w-full max-w-sm"
              >
                + Add Another Department Interview
              </Button>
            </div>
          )}
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


function TechnicalTestPaperWidget({ ev, candidate, technicalQuestions, loadingQuestions, handleInstantWhatsAppShare, handleCopyLink, copiedId, generatingLinkId, remarksId, setRemarksId }: any) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `TechnicalTest_${candidate.full_name}`,
  });

  return (
    <div>
      {/* Action Buttons — outside QP so they don't print */}
      {!remarksId && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8 print:hidden">
          {ev.status !== 'EVALUATED' && (
            <>
              <button
                type="button"
                onClick={() => handleCopyLink(ev.id, true)}
                disabled={generatingLinkId === ev.id}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-foreground bg-background border border-border hover:bg-muted rounded-sm shadow-sm transition-colors whitespace-nowrap ${generatingLinkId === ev.id ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-[#075E54] hover:bg-[#064c44] rounded-sm shadow-md transition-colors whitespace-nowrap"
              >
                <img src="/whatsapp.webp" alt="WhatsApp" className="w-3.5 h-3.5 object-contain" /> Send Link
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => handlePrint()}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-sm shadow-md transition-colors whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" /> Print Paper
          </button>
          <button
            type="button"
            onClick={() => setRemarksId(ev.id)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-sm shadow-md transition-colors whitespace-nowrap"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Evaluate Manually
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
                                <span className="flex-1 border-b-2 border-black text-xs pl-2 pb-0.5 text-blue-900" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>{candidate.department}</span>
                              </div>
                            </div>
                            
                            <div className="border-2 border-black p-0.5 text-center font-bold uppercase tracking-widest text-[11px] ">
                              Question Paper - {candidate.department || 'Call Centre'}
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
