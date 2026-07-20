import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, LoadingSpinner, EmptyState, Modal, PipelineStepper } from '../../components/ui';
import { ArrowLeft, X, XCircle, MapPin, Phone, Mail, Trophy, ChevronLeft, ChevronRight, Pause, Play, History, Edit2 } from 'lucide-react';
import { getCandidateById, updateCandidateStage, unholdCandidate } from '../../api/candidates';
import { getCandidateEvaluations } from '../../api/evaluations';
import type { Candidate, PipelineStage } from '../../types';
import { toast } from 'sonner';
import { validateRejectRemarks } from '../../lib/validation';
import { stageLabel, stageColor } from '../../lib/stages';
import { cn } from '../../lib/utils';
import { PreFormStatus } from '../../components/candidates/PreFormStatus';
import { WhatsAppPreviewPanel } from '../../components/candidates/WhatsAppPreviewPanel';
import { ResumeButton } from '../../components/candidates/ResumeButton';
import { EvaluationStageWidget } from '../../components/candidates/EvaluationStageWidget';
import { FinalApprovalWidget } from '../../components/candidates/FinalApprovalWidget';
import { ActivityTimeline } from '../../components/candidates/ActivityTimeline';
import { extractError } from '../../lib/utils';


const LINEAR_STAGES: PipelineStage[] = [
  'CANDIDATE_FORM', 'BRANCH_INTERVIEW', 'TEST', 'FINAL_APPROVAL', 'HIRED'
];


// Simple global cache to allow stale-while-revalidate (instant loading)
const profileCache: Record<string, Candidate> = {};

export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const cachedCandidate = id ? profileCache[id] : null;
  const [candidate, setCandidate] = useState<Candidate | null>(cachedCandidate);
  const [initialLoading, setInitialLoading] = useState(!cachedCandidate);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [evaluations, setEvaluations] = useState<any[]>([]);



  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [editStageSelection, setEditStageSelection] = useState<PipelineStage>('CANDIDATE_FORM');
  const [editStageRemarks, setEditStageRemarks] = useState('');
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [resumeStage, setResumeStage] = useState<PipelineStage>('CANDIDATE_FORM');
  const [isResuming, setIsResuming] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [viewedStage, setViewedStage] = useState<PipelineStage | null>(null);

  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (candidate && !initialLoading) {
      const timer = setTimeout(() => {
        workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [candidate, initialLoading]);


  const fetchCandidate = async (showLoading = true) => {
    if (!id) return;
    try {
      if (showLoading && !profileCache[id]) {
        setInitialLoading(true);
      } else if (showLoading) {
        setIsUpdating(true);
      }

      const [res, evals] = await Promise.all([
        getCandidateById(id),
        getCandidateEvaluations(id).catch(() => []),
      ]);

      if (res) {
        profileCache[id] = res;
        setCandidate(res);
        setEvaluations(evals);
      } else {
        setError('Candidate not found.');
      }
    } catch (err: any) {
      setError(extractError(err, 'Failed to fetch candidate details.'));
    } finally {
      setInitialLoading(false);
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchCandidate(true);

    const intervalId = setInterval(() => {
      fetchCandidate(false);
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCandidate(false);
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = () => {
    fetchCandidate(true);
  };

  const handleStageClick = async (clickedStage: PipelineStage) => {
    if (!candidate) return;
    // Prevent accidentally navigating into side/terminal states via the stepper
    if (clickedStage === 'REJECTED' || clickedStage === 'ON_HOLD' || clickedStage === 'HIRED') return;

    const currentIdx = LINEAR_STAGES.indexOf(candidate.current_stage);
    const clickedIdx = LINEAR_STAGES.indexOf(clickedStage);

    // Always update the viewed tab
    setViewedStage(clickedStage);

    // Only update the database if we are moving FORWARD in the pipeline
    if (clickedIdx > currentIdx) {
      setIsUpdating(true);
      try {
        await updateCandidateStage(candidate.id, clickedStage, '');
        handleUpdate();
      } catch (err: any) {
        toast.error(extractError(err, 'Failed to update stage.'));
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleReject = async () => {
    if (!candidate) return;
    const validation = validateRejectRemarks(rejectRemarks);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    setIsRejecting(true);
    try {
      await updateCandidateStage(candidate.id, 'REJECTED', rejectRemarks);
      handleUpdate();
      setShowRejectModal(false);
      setRejectRemarks('');
      toast.success('Candidate rejected');
    } catch (err: any) {
      toast.error(extractError(err, 'Failed to reject candidate.'));
    } finally {
      setIsRejecting(false);
    }
  };

  const handleEditStage = async () => {
    if (!candidate) return;
    if (!editStageSelection) {
      toast.error('Please select a stage');
      return;
    }
    setIsEditingStage(true);
    try {
      await updateCandidateStage(candidate.id, editStageSelection, editStageRemarks);
      handleUpdate();
      setShowEditStageModal(false);
      setEditStageRemarks('');
      toast.success('Candidate stage updated successfully');
    } catch (err: any) {
      toast.error(extractError(err, 'Failed to update candidate stage.'));
    } finally {
      setIsEditingStage(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
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
            <Button onClick={() => navigate('/candidates')} variant="ghost" className="border border-border">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Candidates
            </Button>
          }
        />
      </div>
    );
  }


  const actualStage = candidate.current_stage;
  const stageToView = viewedStage || actualStage;
  const showWhatsAppSidebar = stageToView === 'CANDIDATE_FORM' && candidate.pre_form_status !== 'SUBMITTED';

  const stepperStages = LINEAR_STAGES.filter((s): s is Exclude<PipelineStage, 'HIRED'> => s !== 'HIRED');
  const viewedIdx = stepperStages.findIndex((s) => s === stageToView);
  const isPrevDisabled = viewedIdx <= 0 || isUpdating;
  const isNextDisabled = viewedIdx === -1 || viewedIdx >= stepperStages.length - 1 || isUpdating;

  const completedStages: PipelineStage[] = [];
  const skippedStages: PipelineStage[] = [];
  const heldStages: PipelineStage[] = [];

  if (candidate) {
    // 1. CANDIDATE_FORM
    if (candidate.pre_form_status === 'SUBMITTED') {
      completedStages.push('CANDIDATE_FORM');
    }

    // 3. BRANCH_INTERVIEW
    const hrEval = evaluations.find(e => e.type === 'BRANCH_HR');
    if (hrEval && hrEval.verdict) {
      if (hrEval.verdict === 'ON_HOLD') heldStages.push('BRANCH_INTERVIEW');
      else completedStages.push('BRANCH_INTERVIEW');
    }

    // 5. TEST
    const testEval = evaluations.find(e => e.type === 'TECHNICAL_TEST');
    if (testEval && testEval.verdict) {
      if (testEval.verdict === 'ON_HOLD') heldStages.push('TEST');
      else completedStages.push('TEST');
    }

    // 6. FINAL_APPROVAL
    const hqEval = evaluations.find(e => e.type === 'HQ_INTERVIEW');
    if (hqEval && hqEval.verdict) {
      if (hqEval.verdict === 'ON_HOLD') heldStages.push('FINAL_APPROVAL');
      else completedStages.push('FINAL_APPROVAL');
    }

    // 7. HIRED
    if (candidate.current_stage === 'HIRED') {
      completedStages.push('HIRED');
    }

    // A stage is skipped if it is not completed and not held, but the candidate's current stage is past it in the linear sequence!
    const currentIdx = LINEAR_STAGES.indexOf(candidate.current_stage);
    LINEAR_STAGES.forEach((stage, idx) => {
      if (idx < currentIdx && !completedStages.includes(stage) && !heldStages.includes(stage)) {
        skippedStages.push(stage);
      }
    });
  }

  const handlePrevStep = () => {
    if (!isPrevDisabled && viewedIdx > 0) {
      handleStageClick(stepperStages[viewedIdx - 1]);
    }
  };

  const handleNextStep = () => {
    if (!isNextDisabled && viewedIdx >= 0 && viewedIdx < stepperStages.length - 1) {
      handleStageClick(stepperStages[viewedIdx + 1]);
    }
  };

  return (
    <div className="flex items-start w-full min-h-screen">

      {/* ── LEFT: Main Workspace ── */}
      <div className="flex-1 flex flex-col pl-4 sm:pl-6 lg:pl-8 pt-4 lg:pt-6 pr-0 lg:pr-8 pb-4 min-w-0 transition-all duration-300 ease-in-out">

        {/* ── CANDIDATE HEADER ── */}
        <div className="pb-6 mb-6 border-b border-border">
          <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => navigate('/candidates')}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Back to Candidates"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-muted-foreground">Candidates</span>
              <span className="text-sm font-medium text-muted-foreground">/</span>
              <span className="text-sm font-medium text-foreground">{candidate.full_name}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              {/* Left Column: Title & Metadata */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{candidate.full_name}</h1>
                  <span className={cn('shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase shadow-sm', stageColor(actualStage))}>
                    {stageLabel(actualStage)}
                  </span>
                  {candidate.is_duplicate_flagged && (
                    <span className="text-[10px] font-semibold text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-md">
                      Duplicate
                    </span>
                  )}
                  {actualStage === 'ON_HOLD' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!candidate) return;
                        setIsResuming(true);
                        try {
                          await unholdCandidate(candidate.id, 'Resumed from On Hold');
                          toast.success('Candidate resumed to previous stage');
                          handleUpdate();
                        } catch (err: any) {
                          toast.error(extractError(err, 'Failed to resume candidate.'));
                        } finally {
                          setIsResuming(false);
                        }
                      }}
                      isLoading={isResuming}
                      className="h-7 px-3 text-xs gap-1.5 bg-warning/90 hover:bg-warning text-white"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume to previous
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  {candidate.position_applied_for && (
                    <div className="text-sm">
                      <span className="text-muted-foreground font-medium">Applying for: </span>
                      <strong className="text-foreground">{candidate.position_applied_for}</strong>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0" />
                      <span className="text-foreground font-medium">+91 {candidate.phone}</span>
                    </span>
                    {candidate.email && (
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4 shrink-0" />
                        <span className="text-foreground font-medium">{candidate.email}</span>
                      </span>
                    )}
                    {candidate.branch_location && (
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="text-foreground font-medium">{candidate.branch_location}</span>
                      </span>
                    )}
                    {candidate.source && (
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium">Source: </span>
                        <span className="text-foreground font-medium">
                          {candidate.source === 'INDEED' ? 'Indeed' : candidate.source === 'NAUKRI' ? 'Naukri' : candidate.source.replace(/_/g, ' ')}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => setIsActivityOpen(true)}
                  className="flex items-center justify-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground shadow-sm"
                >
                  <History className="w-4 h-4 text-muted-foreground" /> Activity Log
                </Button>
                <a
                  href={`https://wa.me/91${candidate.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground shadow-sm"
                >
                  <img src="/whatsapp.webp" className="w-4 h-4 object-contain" alt="WhatsApp" /> WhatsApp
                </a>
                {candidate.email && (
                  <a
                    href={`mailto:${candidate.email}`}
                    className="flex items-center justify-center gap-2 h-9 px-4 text-sm font-semibold rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground shadow-sm"
                  >
                    <img src="/gmail.webp" className="w-4 h-4 object-contain" alt="Email" /> Email
                  </a>
                )}
                {candidate.has_resume && (
                  <ResumeButton
                    candidateId={candidate.id}
                    candidateName={candidate.full_name}
                    hasResume={candidate.has_resume}
                  />
                )}
                {actualStage !== 'REJECTED' && actualStage !== 'HIRED' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowRejectModal(true)}
                    className="h-9 px-4 text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm font-medium"
                  >
                    Reject Candidate
                  </Button>
                )}

              </div>
            </div>

            {/* Stepper block */}
            <div className="mt-8 pt-6 border-t border-border flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isPrevDisabled}
                onClick={handlePrevStep}
                className={cn(
                  "h-9 w-9 rounded-md border border-border bg-background shadow-sm shrink-0 flex items-center justify-center transition-all",
                  !isPrevDisabled ? "hover:bg-muted hover:text-foreground text-muted-foreground" : "opacity-40 cursor-not-allowed"
                )}
                title="Previous Step"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex-1 min-w-0">
                <PipelineStepper
                  stages={stepperStages}
                  currentStage={stageToView}
                  actualStage={actualStage}
                  onStageClick={handleStageClick}
                  isLoading={isUpdating}
                  completedStages={completedStages}
                  skippedStages={skippedStages}
                  heldStages={heldStages}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isNextDisabled}
                onClick={handleNextStep}
                className={cn(
                  "h-9 w-9 rounded-md border border-border bg-background shadow-sm shrink-0 flex items-center justify-center transition-all",
                  !isNextDisabled ? "hover:bg-muted hover:text-foreground text-muted-foreground" : "opacity-40 cursor-not-allowed"
                )}
                title="Next Step"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── DYNAMIC STAGE WORKSPACE ── */}
        <div ref={workspaceRef} className="relative min-h-[400px] scroll-mt-8">
          {isUpdating && (
            <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center rounded-xl transition-all duration-300">
              <LoadingSpinner size="md" className="text-primary/70" />
            </div>
          )}

          <div className={cn("transition-opacity duration-300", isUpdating ? "opacity-50 pointer-events-none" : "opacity-100")}>
            {stageToView === 'CANDIDATE_FORM' && (
              <PreFormStatus candidate={candidate} onUpdate={handleUpdate} />
            )}

            {showWhatsAppSidebar && (
              <WhatsAppPreviewPanel candidate={candidate} className="lg:hidden mt-6 rounded-xl border border-border overflow-hidden" />
            )}

            {stageToView === 'BRANCH_INTERVIEW' && (
              <EvaluationStageWidget
                candidate={candidate}
                evalTypes={['BRANCH_HR', 'DEPT_HEAD']}
                onUpdate={handleUpdate}
              />
            )}

            {stageToView === 'TEST' && (
              <EvaluationStageWidget
                candidate={candidate}
                evalTypes={['TECHNICAL_TEST']}
                onUpdate={handleUpdate}
              />
            )}

            {stageToView === 'FINAL_APPROVAL' && (
              <FinalApprovalWidget
                candidate={candidate}
                onUpdate={handleUpdate}
              />
            )}


            {actualStage === 'ON_HOLD' && (
              <div className="bg-warning/5 border border-warning/20 p-8 rounded-xl mt-6 flex flex-col items-center">
                <div className="w-16 h-16 bg-warning rounded-full flex items-center justify-center shadow-lg mb-4">
                  <Pause className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-warning">Candidate On Hold</h3>
                <p className="text-warning/80 mt-2 max-w-md mx-auto font-medium text-center">
                  This candidate has been placed on hold. Select a stage below to resume their pipeline.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                  <select
                    value={resumeStage}
                    onChange={(e) => setResumeStage(e.target.value as PipelineStage)}
                    className="flex-1 w-full sm:w-auto bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-warning/40"
                  >
                    {LINEAR_STAGES.filter(s => s !== 'HIRED').map(s => (
                      <option key={s} value={s}>{stageLabel(s)}</option>
                    ))}
                  </select>
                  <Button
                    onClick={async () => {
                      setIsResuming(true);
                      try {
                        await updateCandidateStage(candidate.id, resumeStage, 'Resumed from On Hold');
                        toast.success(`Candidate resumed to ${stageLabel(resumeStage)}`);
                        handleUpdate();
                      } catch (err: any) {
                        toast.error(extractError(err, 'Failed to resume candidate.'));
                      } finally {
                        setIsResuming(false);
                      }
                    }}
                    isLoading={isResuming}
                    className="gap-2 bg-warning hover:bg-warning/90 text-white shrink-0"
                  >
                    <Play className="w-4 h-4" /> Resume
                  </Button>
                </div>
              </div>
            )}

            {actualStage === 'HIRED' && (
              <div className="bg-success/5 border border-success/20 p-8 rounded-xl text-center mt-6 flex flex-col items-center">
                <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center shadow-lg mb-4">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-success">Candidate Hired!</h3>
                <p className="text-success/80 mt-2 max-w-md mx-auto font-medium">
                  Congratulations! The recruitment pipeline is complete and the candidate has been successfully hired.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {showWhatsAppSidebar && (
        <WhatsAppPreviewPanel candidate={candidate} className="hidden lg:flex sticky top-0 h-screen" />
      )}

      {/* ── ACTIVITY TIMELINE SIDEBAR ── */}
      <AnimatePresence>
        {isActivityOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 350, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ ease: 'easeInOut', duration: 0.3 }}
            className="flex-shrink-0 h-screen sticky top-0 bg-background border-l border-border flex flex-col overflow-hidden shadow-sm z-40"
          >
            <div className="w-[350px] flex flex-col h-full">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-border/50 bg-muted/20 shrink-0">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-base font-bold text-foreground uppercase tracking-wider">Activity Log</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsActivityOpen(false)} className="hover:bg-muted/50 rounded-full h-8 w-8 shrink-0">
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-background">
                <ActivityTimeline candidateId={candidate.id} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── REJECT MODAL ── */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Candidate" size="sm">
        <div className="space-y-4 p-6">
          <div className="p-3 bg-danger/5 border border-danger/20 rounded-[10px] flex items-start gap-3">
            <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">This will move the candidate to <strong className="text-danger">Rejected</strong> status. This can be reversed later.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Rejection Reason <span className="text-danger">*</span>
            </label>
            <textarea
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              className="w-full bg-background border border-border rounded-[10px] p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-danger/40 focus:border-transparent transition-all duration-200 min-h-[100px] resize-y"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} isLoading={isRejecting}>Reject Candidate</Button>
          </div>
        </div>
      </Modal>

      {/* 📝 EDIT STAGE MODAL 📝 */}
      <Modal isOpen={showEditStageModal} onClose={() => setShowEditStageModal(false)} title="Edit Candidate Stage" size="sm">
        <div className="space-y-4 p-6">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-[10px] flex items-start gap-3">
            <Edit2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">Manually overriding the candidate's stage will update their current status in the pipeline.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                New Stage
              </label>
              <select
                value={editStageSelection}
                onChange={(e) => setEditStageSelection(e.target.value as PipelineStage)}
                className="w-full bg-background border border-border rounded-[10px] p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                <option value="CANDIDATE_FORM">CALL LETTER</option>
                <option value="BRANCH_INTERVIEW">INTERVIEW</option>
                <option value="TEST">Technical Test</option>
                <option value="FINAL_APPROVAL">Final Approval</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="REJECTED">Rejected</option>
                <option value="HIRED">Hired</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Remarks (Optional)
              </label>
              <textarea
                value={editStageRemarks}
                onChange={(e) => setEditStageRemarks(e.target.value)}
                placeholder="Reason for editing stage..."
                className="w-full bg-background border border-border rounded-[10px] p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-200 min-h-[80px] resize-y"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setShowEditStageModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditStage} isLoading={isEditingStage}>Save Stage</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
