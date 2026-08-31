import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, FileDown, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, LoadingSpinner, EmptyState, Select } from '../ui';
import { InterviewFormCard } from './InterviewFormCard';
import {
  getCandidateEvaluations,
  peekCandidateEvaluations,
  generateEvaluationToken,
  sendEvaluationWhatsAppInvite,
  createEvaluation,
  getDepartmentQuestions,
} from '../../api/evaluations';
import { updateCandidateDepartment } from '../../api/candidates';
import type { Candidate, Evaluation } from '../../types';
import { cn, extractError, isAbortError, copyTextToClipboard } from '../../lib/utils';
import { formatDate, formatTime } from '../../lib/dateTime';
import { catalogPosition, positionsFor } from '../../lib/positions';
import { usePrint } from '../../hooks/usePrint';
import { useAuth } from '../../auth';
import { buildTechnicalTestWhatsAppMessage, evalScheduleLabels, openWhatsAppChat } from '../../lib/whatsappTemplate';
import { WhatsAppShareModal } from './WhatsAppSendChoices';
import { downloadInterviewCommentSheetPdf } from '../../lib/generateInterviewCommentSheetPdf';

const SINGLE_CARD_TYPES = new Set(['BRANCH_HR', 'HQ_INTERVIEW_1']);

interface EvaluationStageWidgetProps {
  candidate: Candidate;
  evalTypes: string[];
  onUpdate: (opts?: { candidate?: boolean }) => void;
  isReadOnly?: boolean;
}

function extraDeptType(evalTypes: string[]) {
  if (evalTypes.includes('HQ_INTERVIEW_2')) return 'HQ_INTERVIEW_2';
  if (evalTypes.includes('DEPT_HEAD')) return 'DEPT_HEAD';
  return null;
}

export function EvaluationStageWidget({
  candidate,
  evalTypes,
  onUpdate,
  isReadOnly = false,
}: EvaluationStageWidgetProps) {
  const { user } = useAuth();
  const cached = ((candidate.evaluations ?? peekCandidateEvaluations(candidate.id)) ?? []).filter((e) => evalTypes.includes(e.type));
  const stageReady = evalTypes.every((type) => cached.some((e) => e.type === type));
  const [evaluations, setEvaluations] = useState<Evaluation[]>(cached);
  const [loading, setLoading] = useState(!stageReady);
  const [submitting, setSubmitting] = useState(false);
  const [generatingLinkId, setGeneratingLinkId] = useState<string | null>(null);
  const [technicalQuestions, setTechnicalQuestions] = useState<any[] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [designation, setDesignation] = useState(
    catalogPosition(candidate.department, candidate.position_applied_for) || candidate.position_applied_for || ''
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [waShareEv, setWaShareEv] = useState<Evaluation | null>(null);
  const [waShareLink, setWaShareLink] = useState('');
  const [waSending, setWaSending] = useState(false);
  const autoCreatedRef = useRef<Set<string>>(new Set());
  const deptType = extraDeptType(evalTypes);
  const deptCount = deptType ? evaluations.filter((e) => e.type === deptType).length : 0;

  useEffect(() => {
    setDesignation(
      catalogPosition(candidate.department, candidate.position_applied_for) || candidate.position_applied_for || ''
    );
  }, [candidate.id, candidate.department, candidate.position_applied_for]);

  const handleDesignationChange = async (newDesignation: string) => {
    setDesignation(newDesignation);
    if (!newDesignation || newDesignation === candidate.position_applied_for) return;
    try {
      await updateCandidateDepartment(
        candidate.id,
        candidate.department,
        newDesignation,
        candidate.experience,
        candidate.source,
        candidate.source_reference
      );
      toast.success(`Designation updated to ${newDesignation}`);
      onUpdate({ candidate: true });
    } catch (err) {
      console.error(err);
      toast.error(extractError(err, 'Failed to save designation'));
    }
  };

  useEffect(() => {
    if (!evalTypes.includes('TECHNICAL_TEST')) {
      setTechnicalQuestions(null);
      return;
    }
    let cancelled = false;
    setLoadingQuestions(true);
    getDepartmentQuestions({
      candidateId: candidate.id,
      department: candidate.department,
      position: designation,
      experience: candidate.experience,
    })
      .then((qs) => {
        if (!cancelled) setTechnicalQuestions(qs);
      })
      .catch((err) => {
        if (cancelled || isAbortError(err)) return;
        setTechnicalQuestions([]);
        toast.error(extractError(err, 'Failed to load questions'));
      })
      .finally(() => {
        if (!cancelled) setLoadingQuestions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [evalTypes, designation, candidate.id, candidate.department, candidate.experience]);

  const fetchEvaluations = async () => {
    const cachedAll = peekCandidateEvaluations(candidate.id) ?? [];
    const haveTypes = evalTypes.every((type) => cachedAll.some((e) => e.type === type));
    if (!haveTypes) setLoading(true);
    try {
      const data = await getCandidateEvaluations(candidate.id);
      setEvaluations(data.filter((e) => evalTypes.includes(e.type)));
    } catch (err) {
      if (isAbortError(err)) return;
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
    if (isReadOnly || loading || submitting) return;
    const missingType = evalTypes.find((type) => !evaluations.some((e) => e.type === type));
    if (!missingType || autoCreatedRef.current.has(`${candidate.id}:${missingType}`)) return;
    autoCreatedRef.current.add(`${candidate.id}:${missingType}`);
    setSubmitting(true);
    createEvaluation(candidate.id, missingType)
      .then(() => fetchEvaluations())
      .catch(() => autoCreatedRef.current.delete(`${candidate.id}:${missingType}`))
      .finally(() => setSubmitting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluations, loading, submitting, candidate.id, JSON.stringify(evalTypes)]);

  const handleAddDeptInterview = async () => {
    if (!deptType || deptCount >= 5) return;
    try {
      setSubmitting(true);
      await createEvaluation(candidate.id, deptType);
      toast.success('Department interview added');
      await fetchEvaluations();
    } catch (err) {
      toast.error(extractError(err, 'Failed to add department interview'));
    } finally {
      setSubmitting(false);
    }
  };

  const requireDesignation = () => {
    if (designation) return true;
    toast.error('Select a designation for this technical test');
    return false;
  };

  const handleCopyLink = async (evalId: string, isTest = false) => {
    if (isTest && !requireDesignation()) return;
    if (generatingLinkId) return;
    setGeneratingLinkId(evalId);
    try {
      const tokenData = await generateEvaluationToken(evalId, isTest ? designation : undefined);
      const path = isTest ? 'test' : 'eval';
      const url = `${window.location.origin}/${path}/${tokenData.token}`;
      const copiedOk = await copyTextToClipboard(url);
      if (copiedOk) {
        toast.success('Link generated and copied to clipboard!');
        setCopiedId(evalId);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        toast.error('Failed to copy link');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate secure link');
    } finally {
      setGeneratingLinkId(null);
    }
  };

  const handleInstantWhatsAppShare = async (ev: Evaluation) => {
    if (!requireDesignation()) return;
    try {
      const tokenData = await generateEvaluationToken(ev.id, designation);
      const path = ev.type === 'TECHNICAL_TEST' ? 'test' : 'eval';
      setWaShareLink(`${window.location.origin}/${path}/${tokenData.token}`);
      setWaShareEv(ev);
    } catch (err) {
      toast.error(extractError(err, 'Failed to generate test link'));
    }
  };

  const sendTechnicalTestDoubleTick = async () => {
    if (!waShareEv || waSending) return;
    setWaSending(true);
    try {
      const { dateStr, timeStr } = evalScheduleLabels(waShareEv.scheduled_time);
      const displayMode = waShareEv.interview_mode === 'PHYSICAL' ? 'Walk-in' : 'Online';
      await sendEvaluationWhatsAppInvite(waShareEv.id, {
        to_phone: candidate.phone,
        recipient_type: 'CANDIDATE',
        variables: {
          candidateName: candidate.full_name,
          position: designation || candidate.department || 'Unknown Position',
          date: dateStr,
          time: timeStr,
          mode: displayMode,
          locationOrLink: waShareLink,
          recruiterName: user?.full_name || 'HR Team',
        },
      });
      toast.success('WhatsApp invitation sent successfully!');
      setWaShareEv(null);
    } catch (err) {
      toast.error(extractError(err, 'Failed to send WhatsApp invitation'));
    } finally {
      setWaSending(false);
    }
  };

  const openTechnicalTestWhatsApp = () => {
    if (!candidate.phone) {
      toast.error('Candidate phone number is missing');
      return;
    }
    const { dateStr, timeStr } = evalScheduleLabels(waShareEv?.scheduled_time);
    openWhatsAppChat(
      candidate.phone,
      buildTechnicalTestWhatsAppMessage({
        candidateName: candidate.full_name,
        position: designation || candidate.department || 'the role',
        link: waShareLink,
        date: dateStr,
        time: timeStr,
      }),
    );
    setWaShareEv(null);
  };

  const waitingForCards =
    loading || (!isReadOnly && evalTypes.some((type) => !evaluations.some((e) => e.type === type)));

  if (waitingForCards) {
    return (
      <div className="w-full flex justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const hoEmpty = isReadOnly && evalTypes.includes('HQ_INTERVIEW_1');

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1">
        {evaluations.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-10 h-10 text-muted-foreground/30" />}
            title={hoEmpty ? 'Waiting on Head Office' : 'No evaluation found'}
            description={
              hoEmpty
                ? 'Head Office has not recorded this interview yet. Check back to see updates.'
                : 'There are no active evaluations matching this type for the candidate.'
            }
          />
        ) : (
          evaluations
            .slice()
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .filter((ev, _idx, arr) => {
              if (ev.type === 'TECHNICAL_TEST') {
                const techEvals = arr.filter((e) => e.type === 'TECHNICAL_TEST');
                const preferred = techEvals.find((e) => e.status === 'EVALUATED') ?? techEvals[0];
                return ev.id === preferred?.id;
              }
              if (SINGLE_CARD_TYPES.has(ev.type)) {
                return ev.id === arr.find((e) => e.type === ev.type)?.id;
              }
              return true;
            })
            .map((ev) => {
              if (ev.type !== 'TECHNICAL_TEST') {
                return (
                  <InterviewFormCard
                    key={ev.id}
                    ev={ev}
                    index={evaluations.filter((e) => e.type === ev.type).findIndex((e) => e.id === ev.id)}
                    candidate={candidate}
                    onUpdate={(opts) => {
                      fetchEvaluations();
                      onUpdate(opts);
                    }}
                    isReadOnly={isReadOnly}
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
                    designation={designation}
                    onDesignationChange={handleDesignationChange}
                    technicalQuestions={technicalQuestions}
                    loadingQuestions={loadingQuestions}
                    handleInstantWhatsAppShare={handleInstantWhatsAppShare}
                    handleCopyLink={handleCopyLink}
                    copiedId={copiedId}
                    generatingLinkId={generatingLinkId}
                    isReadOnly={isReadOnly}
                  />
                </motion.div>
              );
            })
        )}

        {!isReadOnly && deptType && deptCount > 0 && deptCount < 5 && (
          <div className="flex justify-center mt-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddDeptInterview}
              isLoading={submitting}
              className="border-dashed border-2 hover:bg-muted/50 text-muted-foreground w-full max-w-sm"
            >
              + Add Another Department Interview
            </Button>
          </div>
        )}
      </div>

      <WhatsAppShareModal
        isOpen={!!waShareEv}
        onClose={() => setWaShareEv(null)}
        title="Send technical test"
        description={
          <>
            Share the test link with <span className="font-semibold">{candidate.full_name}</span>
            {candidate.phone ? ` (+91 ${candidate.phone})` : ''}.
          </>
        }
        preview={waShareLink}
        onDoubleTick={() => void sendTechnicalTestDoubleTick()}
        onOpenWhatsApp={openTechnicalTestWhatsApp}
        doubleTickLoading={waSending}
      />
    </div>
  );
}


function TechnicalTestPaperWidget({ ev, candidate, designation, onDesignationChange, technicalQuestions, loadingQuestions, handleInstantWhatsAppShare, handleCopyLink, copiedId, generatingLinkId, isReadOnly }: any) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = usePrint({
    contentRef: printRef,
    documentTitle: `TechnicalTest_${candidate.full_name}`,
  });
  const roles = positionsFor(candidate.department || '');
  const [downloadingCommentSheet, setDownloadingCommentSheet] = useState(false);
  const handleDownloadCommentSheet = async () => {
    if (downloadingCommentSheet) return;
    setDownloadingCommentSheet(true);
    try {
      await downloadInterviewCommentSheetPdf(candidate, ev);
    } catch (err) {
      console.error('Error generating interview comment sheet:', err);
      toast.error('Could not create the PDF. Please try again.');
    } finally {
      setDownloadingCommentSheet(false);
    }
  };
  return (
    <div>
      {/* Action Buttons — outside QP so they don't print */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8 print:hidden">
          {ev.status !== 'EVALUATED' && !isReadOnly && (
            <>
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                Designation
                <div className="min-w-[14rem] w-56">
                  <Select
                    className="h-8 text-xs font-semibold normal-case tracking-normal"
                    value={designation}
                    onChange={(e) => onDesignationChange(e.target.value)}
                  >
                    <option value="" disabled>
                      Select designation
                    </option>
                    {roles.map((role: string) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </Select>
                </div>
              </label>
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
            onClick={() => void handleDownloadCommentSheet()}
            disabled={downloadingCommentSheet}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-foreground bg-white border border-gray-300 hover:bg-gray-100 rounded-sm shadow-sm transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" /> {downloadingCommentSheet ? 'Creating PDF...' : 'Download sample comment sheet'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (ev.status !== 'EVALUATED' && !designation) {
                toast.error('Select a designation for this technical test');
                return;
              }
              handlePrint();
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-black hover:bg-gray-800 rounded-sm shadow-md transition-colors whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" /> Print Paper
          </button>
        </div>

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
                                <div className="border-b-2 border-black p-0.5 font-medium flex justify-between"><span>Date:</span> <span className="underline decoration-dashed underline-offset-4 text-gray-800 flex-1 ml-1 text-right">{formatDate(new Date())}</span></div>
                                <div className="p-0.5 font-medium flex justify-between"><span>Time:</span> <span className="underline decoration-dashed underline-offset-4 text-gray-800 flex-1 ml-1 text-right">{formatTime(new Date())}</span></div>
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
                                <span className="flex-1 border-b-2 border-black text-xs pl-2 pb-0.5 text-blue-900" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", sans-serif' }}>{designation || candidate.department || ''}</span>
                              </div>
                            </div>
                            
                            <div className="border-2 border-black p-0.5 text-center font-bold uppercase tracking-widest text-[11px] ">
                              Question Paper - {designation || candidate.department || 'Select designation'}
                            </div>

                            {/* Questions Table */}
                            {loadingQuestions ? (
                              <div className="flex justify-center py-12 border-x-2 border-b-2 border-black"><LoadingSpinner size="md" /></div>
                            ) : technicalQuestions?.length === 0 ? (
                              <div className="text-center py-12 border-x-2 border-b-2 border-black text-gray-500 font-semibold">
                                {designation ? 'No questions found.' : 'Select a designation to load the question paper.'}
                              </div>
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
                                    const qid = String(q.id);
                                    const submittedAns =
                                      ev.scores?.candidate_answers?.[qid] ?? ev.scores?.candidate_answers?.[q.id];
                                    const qScore =
                                      ev.scores?.question_scores?.[qid] ?? ev.scores?.question_scores?.[q.id];
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
