import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, LoadingSpinner, EmptyState, Modal, PipelineStepper, Select } from '../../components/ui';
import { ArrowLeft, Home, X, XCircle, MapPin, Phone, Mail, Trophy, Pause, Play, History, Edit2, Check } from 'lucide-react';
import { getCandidateById, updateCandidateStage, unholdCandidate, resolveDuplicateCandidate, updateCandidateDepartment, setCachedCandidate } from '../../api/candidates';
import type { Candidate, PipelineStage } from '../../types';
import { HO_LINEAR_STAGES, HO_POST_SEND_STAGES } from '../../types';
import { CANDIDATE_DEPARTMENTS } from '../../types';
import { EXPERIENCE_LEVELS } from '../../lib/positions';
import { SOURCE_OPTIONS, SOURCE_REFERENCE_LABELS, sourceNeedsReference } from '../../lib/candidateSources';
import { toast } from 'sonner';
import { validateRejectRemarks } from '../../lib/validation';
import { formatSource, stageLabel } from '../../lib/stages';
import { cn } from '../../lib/utils';
import { PreFormStatus } from '../../components/candidates/PreFormStatus';
import { WhatsAppPreviewPanel } from '../../components/candidates/WhatsAppPreviewPanel';
import { ResumeButton } from '../../components/candidates/ResumeButton';
import { EvaluationStageWidget } from '../../components/candidates/EvaluationStageWidget';
import { ApplicationStageWidget } from '../../components/candidates/ApplicationStageWidget';
import { HeadOfficeInvitePanel } from '../../components/candidates/HeadOfficeInvitePanel';
import { HeadOfficeForwardingEmailStatus } from '../../components/candidates/HeadOfficeForwardingEmailStatus';
import { StageEmailStatus } from '../../components/candidates/StageEmailStatus';
import { FinalApprovalWidget } from '../../components/candidates/FinalApprovalWidget';
import { OfferResponseStageWidget } from '../../components/candidates/OfferResponseStageWidget';
import { BackgroundVerificationWidget } from '../../components/candidates/BackgroundVerificationWidget';
import { ActivityTimeline } from '../../components/candidates/ActivityTimeline';
import { CommunicationTimeline } from '../../components/candidates/CommunicationTimeline';
import { extractError, isAbortError } from '../../lib/utils';
import { CSSStageWidget } from '../../components/candidates/CSSStageWidget';
import { SalarySheetStageWidget } from '../../components/candidates/SalarySheetStageWidget';
import { WorkQueue } from '../../components/candidates/WorkQueue';
import { SalarySheetUpload } from '../../components/candidates/SalarySheetUpload';
import { CandidateHeader } from '../../components/candidates/CandidateHeader';
import { CandidateRecordSections } from '../../components/candidates/CandidateRecordSections';
import { getCandidateWorkState } from '../../lib/candidateWork';


import { useAuth } from '../../auth';

const LINEAR_STAGES: PipelineStage[] = [
  'CALL_LETTER', 'INTERVIEWS', 'TEST', 'BACKGROUND_VERIFICATION', 'APPLICATION'
];

const LOCAL_FOLLOW_STAGES: PipelineStage[] = [
  ...LINEAR_STAGES,
  ...HO_LINEAR_STAGES,
];

function mappedPipelineStage(stage: PipelineStage): PipelineStage {
  if (stage === 'HO_HR_INTERVIEW' || stage === 'HO_DEPT_INTERVIEW') return 'HO_INTERVIEWS';
  return stage;
}

function nextStageAfter(current: PipelineStage, stages: PipelineStage[]): PipelineStage | null {
  const mapped = mappedPipelineStage(current);
  const idx = stages.indexOf(mapped);
  if (idx === -1 || idx >= stages.length - 1) return null;
  return stages[idx + 1];
}

// Simple global cache to allow stale-while-revalidate (instant loading)
const profileCache: Record<string, Candidate> = {};

function ConsiderationEditor({
  candidate,
  readOnly,
  onSaved,
  compact,
}: {
  candidate: Candidate;
  readOnly?: boolean;
  onSaved: (c: Candidate) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [department, setDepartment] = useState(candidate.department || '');
  const [experience, setExperience] = useState(candidate.experience || 'Fresher');
  const [source, setSource] = useState(candidate.source || '');
  const [sourceReference, setSourceReference] = useState(candidate.source_reference || '');
  const [saving, setSaving] = useState(false);

  const openEditor = () => {
    setDepartment(candidate.department || '');
    setExperience(candidate.experience || 'Fresher');
    setSource(candidate.source || '');
    setSourceReference(candidate.source_reference || '');
    setOpen(true);
  };

  const save = async () => {
    if (!department.trim()) {
      toast.error('Select a department');
      return;
    }
    if (!source.trim()) {
      toast.error('Select a source');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateCandidateDepartment(
        candidate.id,
        department.trim(),
        undefined,
        experience,
        source,
        sourceNeedsReference(source) ? sourceReference.trim() : undefined,
      );
      profileCache[candidate.id] = updated;
      onSaved(updated);
      setOpen(false);
      toast.success(`Now considering for ${updated.department}`);
    } catch (err: any) {
      toast.error(extractError(err, 'Failed to update consideration'));
    } finally {
      setSaving(false);
    }
  };

  const label = [candidate.department, candidate.experience]
    .filter(Boolean)
    .join(' · ') || '-';

  return (
    <>
      <div className={cn('flex items-center gap-2', compact ? 'text-sm' : 'text-base')}>
        <span className="text-muted-foreground font-medium whitespace-nowrap">
          {compact ? 'Considering:' : 'Considering for:'}
        </span>
        <strong className="text-foreground">{label}</strong>
        {!readOnly && (
          <button
            type="button"
            onClick={openEditor}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <Edit2 className="w-3 h-3" /> Change
          </button>
        )}
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Edit candidate details"
        description="Update consideration and hiring source without reopening the original intake flow."
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="consideration-department" className="form-label">Department</label>
            <Select
              id="consideration-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="" disabled>
                Select department
              </option>
              {CANDIDATE_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              {department && !(CANDIDATE_DEPARTMENTS as readonly string[]).includes(department) && (
                <option value={department}>{department}</option>
              )}
            </Select>
          </div>
          <div>
            <label htmlFor="consideration-experience" className="form-label">Experience</label>
            <Select
              id="consideration-experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="consideration-source" className="form-label">Source</label>
            <Select
              id="consideration-source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                if (!sourceNeedsReference(e.target.value)) setSourceReference('');
              }}
            >
              <option value="" disabled>
                Select source
              </option>
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {source && !SOURCE_OPTIONS.some((option) => option.value === source) && (
                <option value={source}>{formatSource(source)}</option>
              )}
            </Select>
          </div>
          {sourceNeedsReference(source) && (
            <div>
              <label htmlFor="consideration-source-reference" className="form-label">{SOURCE_REFERENCE_LABELS[source]}</label>
              <Input
                id="consideration-source-reference"
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
                maxLength={100}
                placeholder={source === 'REFERRAL' ? 'Employee or contact name' : 'LinkedIn, website, etc.'}
              />
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} isLoading={saving}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function CandidateProfileSkeleton() {
  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150" aria-hidden="true">
      {/* Header bar skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="skeleton h-6 w-48 rounded-md" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="skeleton h-4 w-32 rounded-md" />
              <div className="skeleton h-4 w-24 rounded-md" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="skeleton h-9 w-28 rounded-lg" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Stepper bar skeleton */}
      <div className="page-card p-4">
        <div className="flex items-center justify-between gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div className="skeleton h-7 w-7 rounded-full shrink-0" />
              <div className="skeleton h-4 w-20 hidden md:block rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Main stage card skeleton */}
      <div className="page-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="skeleton h-6 w-40 rounded-md" />
          <div className="skeleton h-8 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton h-24 rounded-xl" />
          <div className="skeleton h-24 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const cachedCandidate = id ? profileCache[id] : null;
  const [candidate, setCandidate] = useState<Candidate | null>(cachedCandidate);
  const [initialLoading, setInitialLoading] = useState(!cachedCandidate);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [evaluations, setEvaluations] = useState<any[]>([]);



  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdRemarks, setHoldRemarks] = useState('');
  const [isHolding, setIsHolding] = useState(false);

  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [editStageSelection, setEditStageSelection] = useState<PipelineStage>('CALL_LETTER');
  const [editStageRemarks, setEditStageRemarks] = useState('');
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [resumeStage, setResumeStage] = useState<PipelineStage>('CALL_LETTER');
  const [isResuming, setIsResuming] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const stageParam = searchParams.get('stage') as PipelineStage | null;
  const [viewedStage, setViewedStage] = useState<PipelineStage | null>(stageParam);

  const navigateToStage = (stage: PipelineStage) => {
    setViewedStage(stage);
    setSearchParams(prev => { prev.set('stage', stage); return prev; }, { replace: true });
  };

  const goneRef = useRef(false);
  const candidateRef = useRef(candidate);
  candidateRef.current = candidate;

  const fetchCandidate = async (opts?: { candidate?: boolean; signal?: AbortSignal }) => {
    if (!id || goneRef.current) return;
    const signal = opts?.signal;
    const hasData = !!(profileCache[id] || candidateRef.current);
    const skipCandidate = opts?.candidate === false && hasData;
    try {
      if (!hasData) setInitialLoading(true);

      const res = skipCandidate
        ? (candidateRef.current ?? profileCache[id])
        : await getCandidateById(id, signal);

      if (signal?.aborted || goneRef.current) return;

      if (res) {
        if (!skipCandidate) profileCache[id] = res;
        if (
          ['HO_INTERVIEW_INTIMATION', 'OFFER_RESPONSE'].includes(res.current_stage)
          && candidateRef.current?.current_stage !== res.current_stage
        ) {
          navigateToStage(res.current_stage);
        }
        setCandidate(res);
        if (res.evaluations) setEvaluations(res.evaluations);
        setError(null);
      } else if (!hasData) {
        setError('Candidate not found.');
      }
    } catch (err: any) {
      if (signal?.aborted || isAbortError(err) || goneRef.current) return;
      if (err?.response?.status === 404) {
        goneRef.current = true;
        delete profileCache[id];
        toast.error('This candidate no longer exists.');
        navigate('/candidates', { replace: true });
        return;
      }
      const message = extractError(err, 'Failed to fetch candidate details.');
      if (!message) return;
      if (!hasData) setError(message);
      else toast.error(message);
    } finally {
      if (!signal?.aborted) setInitialLoading(false);
    }
  };

  useEffect(() => {
    goneRef.current = false;
    const controller = new AbortController();
    void fetchCandidate({ signal: controller.signal });
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = (updated?: Candidate | { candidate?: boolean }) => {
    if (updated && 'id' in updated) {
      profileCache[updated.id] = updated;
      setCachedCandidate(updated);
      setCandidate(updated);
      if (updated.evaluations) setEvaluations(updated.evaluations);
      return;
    }
    void fetchCandidate(updated);
  };

  const handleStageClick = (clickedStage: PipelineStage) => {
    if (!candidate) return;
    if (clickedStage === 'REJECTED' || clickedStage === 'ON_HOLD' || clickedStage === 'HIRED') return;
    navigateToStage(clickedStage);
  };

  const handleMarkStageComplete = async () => {
    if (!candidate) return;
    if (user?.role === 'ADMIN') return;
    const localHr = user?.role === 'LOCAL_HR';
    const sentToHo = HO_POST_SEND_STAGES.includes(candidate.current_stage) || !!candidate.handed_over_to_ho;
    if (localHr && sentToHo) return;
    if (['REJECTED', 'HIRED', 'ON_HOLD'].includes(candidate.current_stage)) return;
    if (localHr && candidate.current_stage === 'APPLICATION') {
      toast.error('Use Send to Head Office to finish this stage.');
      return;
    }

    const stages = user?.role === 'HO_HR'
      ? HO_LINEAR_STAGES
      : localHr && sentToHo
        ? LOCAL_FOLLOW_STAGES
        : LINEAR_STAGES;
    const next = nextStageAfter(candidate.current_stage, stages);
    if (!next) return;

    setIsUpdating(true);
    try {
      await updateCandidateStage(candidate.id, next, '');
      navigateToStage(next);
      handleUpdate();
      toast.success(getCandidateWorkState(candidate).next_action);
    } catch (err: unknown) {
      toast.error(extractError(err, 'Failed to mark stage complete.'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendToHO = async () => {
    if (!candidate) return;
    setIsUpdating(true);
    try {
      await updateCandidateStage(candidate.id, 'HO_INTERVIEW_INTIMATION', 'Application transferred to Head Office for interview intimation.');
      navigateToStage('HO_INTERVIEW_INTIMATION');
      handleUpdate();
      toast.success('Application sent to Head Office successfully!');
    } catch (err: unknown) {
      toast.error(extractError(err, 'Failed to send to Head Office'));
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResume = async () => {
    if (!candidate) return;
    setIsResuming(true);
    try {
      await unholdCandidate(candidate.id, 'Resumed from On Hold');
      toast.success('Candidate resumed to previous stage');
      handleUpdate();
    } catch (err: unknown) {
      toast.error(extractError(err, 'Failed to resume candidate.'));
      throw err;
    } finally {
      setIsResuming(false);
    }
  };

  const handleHold = async (remarks: string) => {
    if (!candidate) return;
    setIsUpdating(true);
    try {
      const updated = await updateCandidateStage(candidate.id, 'ON_HOLD', remarks);
      handleUpdate();
      if (updated.profile?.raw_data?.onHoldEmailStatus === 'FAILED') {
        toast.warning('Candidate placed on hold, but the notification email could not be sent. See the notice below to retry.');
      } else {
        toast.success('Candidate placed on hold and notified by email');
      }
    } catch (err: unknown) {
      toast.error(extractError(err, 'Failed to place candidate on hold.'));
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!candidate) return;
    const validation = validateRejectRemarks(rejectRemarks);
    if (!validation.ok) {
      toast.error('message' in validation ? validation.message : 'Rejection reason is required.');
      return;
    }
    setIsRejecting(true);
    try {
      const updated = await updateCandidateStage(candidate.id, 'REJECTED', rejectRemarks);
      handleUpdate();
      setShowRejectModal(false);
      setRejectRemarks('');
      if (updated.profile?.raw_data?.rejectionEmailStatus === 'FAILED') {
        toast.warning('Candidate rejected, but the notification email could not be sent. See the notice below to retry.');
      } else {
        toast.success('Candidate rejected and notified by email');
      }
    } catch (err: any) {
      toast.error(extractError(err, 'Failed to reject candidate.'));
    } finally {
      setIsRejecting(false);
    }
  };

  const handleResolveDuplicate = async (action: 'MERGE' | 'NOT_DUPLICATE') => {
    if (!candidate) return;
    setIsUpdating(true);
    try {
      await resolveDuplicateCandidate(candidate.id, action);
      handleUpdate();
      toast.success(action === 'MERGE' ? 'Archived as duplicate' : 'Marked as not a duplicate');
    } catch (err: any) {
      toast.error(extractError(err, 'Failed to resolve duplicate.'));
    } finally {
      setIsUpdating(false);
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
    return <CandidateProfileSkeleton />;
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
  const isAdmin = user?.role === 'ADMIN';
  const isHO = user?.role === 'HO_HR';
  const isLocalHR = user?.role === 'LOCAL_HR';
  const showWhatsAppSidebar =
    !isAdmin &&
    stageToView === 'CALL_LETTER' &&
    candidate.pre_form_status !== 'SENT' &&
    candidate.pre_form_status !== 'VIEWED' &&
    candidate.pre_form_status !== 'SUBMITTED';
  const hasBeenSentToHO = HO_POST_SEND_STAGES.includes(candidate.current_stage) || !!candidate.handed_over_to_ho;
  const isReadOnly = (isLocalHR && hasBeenSentToHO) || isAdmin;
  const followsHoPipeline = isHO || isAdmin;
  const effectiveStages = followsHoPipeline
    ? HO_LINEAR_STAGES
    : isLocalHR && hasBeenSentToHO
      ? LOCAL_FOLLOW_STAGES
      : LINEAR_STAGES;
  const stepperStages = effectiveStages.filter((s): s is Exclude<PipelineStage, 'HIRED'> => s !== 'HIRED');

  const completedStages: PipelineStage[] = [];
  const skippedStages: PipelineStage[] = [];
  const heldStages: PipelineStage[] = [];

  if (candidate) {
    // 1. CALL_LETTER
    if (candidate.pre_form_status === 'SUBMITTED') {
      completedStages.push('CALL_LETTER');
    }

    // 3. INTERVIEWS
    const hrEval = evaluations.find(e => e.type === 'BRANCH_HR');
    if (hrEval && hrEval.verdict) {
      if (hrEval.verdict === 'ON_HOLD') heldStages.push('INTERVIEWS');
      else completedStages.push('INTERVIEWS');
    }

    // 5. TEST
    const testEval = evaluations.find(e => e.type === 'TECHNICAL_TEST');
    if (testEval && testEval.verdict) {
      if (testEval.verdict === 'ON_HOLD') heldStages.push('TEST');
      else completedStages.push('TEST');
    }

    // 6. BACKGROUND_VERIFICATION
    const bgData = candidate.profile?.raw_data?.bg_verification as any;
    const bgCompleted = Boolean(bgData?.meta?.completedAt);
    const bgPastStage = [
      'APPLICATION',
      'SENT_TO_HO',
      'HO_INTERVIEW_INTIMATION',
      'HO_HR_INTERVIEW',
      'HO_DEPT_INTERVIEW',
      'HO_INTERVIEWS',
      'CSS',
      'SALARY_DETAILS',
      'FINAL_APPROVAL',
      'OFFER_RESPONSE',
      'HIRED',
    ].includes(candidate.current_stage);

    if (bgCompleted || bgPastStage) {
      completedStages.push('BACKGROUND_VERIFICATION');
    }

    // HO interview completion markers (HO HR is mandatory, HO Dept is optional)
    const hoHrEval = evaluations.find(e => e.type === 'HQ_INTERVIEW_1');
    const hoDeptEval = evaluations.find(e => e.type === 'HQ_INTERVIEW_2');
    if (hoHrEval?.verdict === 'ON_HOLD' || hoDeptEval?.verdict === 'ON_HOLD') {
      heldStages.push('HO_INTERVIEWS');
    } else if (hoHrEval?.verdict && (!hoDeptEval || !!hoDeptEval?.verdict)) {
      completedStages.push('HO_INTERVIEWS');
    }

    if (['CSS', 'SALARY_DETAILS', 'FINAL_APPROVAL', 'OFFER_RESPONSE', 'HIRED'].includes(candidate.current_stage)) {
      completedStages.push('CSS');
    }
    if (['SALARY_DETAILS', 'FINAL_APPROVAL', 'OFFER_RESPONSE', 'HIRED'].includes(candidate.current_stage)) {
      completedStages.push('SALARY_DETAILS');
    }

    // 6. FINAL_APPROVAL (legacy HQ eval marker)
    const hqEval = evaluations.find(e => e.type === 'HQ_INTERVIEW');
    if (hqEval && hqEval.verdict) {
      if (hqEval.verdict === 'ON_HOLD') heldStages.push('FINAL_APPROVAL');
      else completedStages.push('FINAL_APPROVAL');
    }
    if (['OFFER_RESPONSE', 'HIRED'].includes(candidate.current_stage)) {
      completedStages.push('FINAL_APPROVAL');
    }

    // 7. HIRED
    if (candidate.current_stage === 'HIRED') {
      completedStages.push('HIRED');
    }

    if (hasBeenSentToHO) {
      completedStages.push('APPLICATION');
      if (candidate.current_stage !== 'SENT_TO_HO') {
        completedStages.push('SENT_TO_HO');
      }
      if (!['SENT_TO_HO', 'HO_INTERVIEW_INTIMATION'].includes(candidate.current_stage)) {
        completedStages.push('HO_INTERVIEW_INTIMATION');
      }
    }

    // A stage is skipped if it is not completed and not held, but the candidate's current stage is past it in the linear sequence!
    const currentIdx = effectiveStages.indexOf(mappedPipelineStage(candidate.current_stage));
    effectiveStages.forEach((stage, idx) => {
      if (idx < currentIdx && !completedStages.includes(stage) && !heldStages.includes(stage)) {
        skippedStages.push(stage);
      }
    });
  }

  const mappedActual = mappedPipelineStage(actualStage);
  const mappedView = mappedPipelineStage(stageToView);
  const nextStage = nextStageAfter(actualStage, effectiveStages);
  const viewIdx = (stepperStages as PipelineStage[]).indexOf(mappedView);
  const actualIdx = (stepperStages as PipelineStage[]).indexOf(mappedActual);
  const viewedStageComplete =
    completedStages.includes(mappedView) ||
    (viewIdx !== -1 && actualIdx !== -1 && viewIdx < actualIdx);
  const canAdvanceCurrent =
    !isReadOnly &&
    !!nextStage &&
    actualStage !== 'REJECTED' &&
    actualStage !== 'HIRED' &&
    actualStage !== 'ON_HOLD' &&
    actualStage !== 'OFFER_RESPONSE' &&
    !(isLocalHR && actualStage === 'APPLICATION');

  return (
    <div className="flex items-start w-full min-h-screen">

      {/* ── LEFT: Main Workspace ── */}
      <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-4 lg:py-6 min-w-0 transition-all duration-300 ease-in-out w-full max-w-7xl mx-auto">

        {/* ── CANDIDATE HEADER ── */}
        <div className="pb-4 mb-4">
          <div className="w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/candidates')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 font-bold text-xs shadow-xs transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer active:scale-95 shrink-0"
                  title="Return to Candidates Dashboard"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/candidates')}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/70 shrink-0"
                  title="Back to Candidates"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 text-sm">
                  <span
                    className="text-muted-foreground hover:text-primary cursor-pointer font-medium transition-colors"
                    onClick={() => navigate('/candidates')}
                  >
                    Candidates
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-sm font-semibold text-foreground truncate max-w-[160px] sm:max-w-xs md:max-w-md">
                    {candidate.full_name}
                  </span>
                </div>
              </div>

              {/* Context Tag / Branch Badge */}
              <div className="flex items-center gap-2 text-xs">
                {isLocalHR && user?.branch_location && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                    <MapPin className="w-3 h-3" />
                    {user.branch_location} Branch
                  </span>
                )}
                {isHO && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                    Head Office HR
                  </span>
                )}
              </div>
            </div>

            {/* ── PIPELINE STEPPER ── */}
            <div className="w-full mb-4 py-2">
              <PipelineStepper
                stages={stepperStages}
                currentStage={mappedView}
                actualStage={mappedActual}
                onStageClick={handleStageClick}
                isLoading={isUpdating}
                completedStages={completedStages}
                skippedStages={skippedStages}
                heldStages={heldStages}
                customLabels={followsHoPipeline ? {
                  'SENT_TO_HO': 'CANDIDATE APPLICATION',
                  'HO_INTERVIEW_INTIMATION': 'INTERVIEW INTIMATION',
                  'HO_INTERVIEWS': 'INTERVIEWS',
                  'FINAL_APPROVAL': 'OFFER LETTER',
                  'OFFER_RESPONSE': 'OFFER RESPONSE',
                } : isLocalHR && hasBeenSentToHO ? {
                  'SENT_TO_HO': 'SENT TO HO',
                  'HO_INTERVIEW_INTIMATION': 'INTERVIEW INTIMATION',
                  'HO_INTERVIEWS': 'HO INTERVIEWS',
                  'FINAL_APPROVAL': 'OFFER',
                  'OFFER_RESPONSE': 'OFFER RESPONSE',
                } : undefined}
              />
            </div>

            {/* ── HOLD & REJECT ACTIONS ── */}
            {actualStage !== 'REJECTED' && actualStage !== 'HIRED' && actualStage !== 'ON_HOLD' && actualStage !== 'CSS' && actualStage !== 'SALARY_DETAILS' && actualStage !== 'FINAL_APPROVAL' && actualStage !== 'OFFER_RESPONSE' && !isReadOnly && (
              <div className="mb-4 flex items-center justify-end gap-2 w-full">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowHoldModal(true)}
                  className="h-8 px-3 font-semibold text-xs tracking-wider uppercase border border-border"
                >
                  <Pause className="mr-1.5 h-3.5 w-3.5" /> Hold Candidate
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowRejectModal(true)}
                  className="h-8 px-3 text-white bg-[#DC143C] hover:bg-[#B21030] transition-colors shadow-sm font-extrabold uppercase rounded-sm tracking-wider text-xs"
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject Candidate
                </Button>
              </div>
            )}

            {isLocalHR && hasBeenSentToHO && (
              <div className="mb-4 rounded-lg border border-info/20 bg-info/5 px-4 py-3 text-sm font-medium text-info">
                Already sent to Head Office. You can follow HO updates on the pipeline below, but you cannot edit this candidate.
              </div>
            )}

            {candidate.is_duplicate_flagged && (
              <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-orange-800">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Duplicate Candidate Detected</h3>
                    <p className="text-xs opacity-90 mt-0.5">This candidate was flagged as a duplicate of another application.</p>
                  </div>
                </div>
                {!isReadOnly && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleResolveDuplicate('NOT_DUPLICATE')} disabled={isUpdating} className="border border-orange-200 hover:bg-orange-100 text-orange-700 bg-white">Not a Duplicate</Button>
                  <Button variant="primary" size="sm" onClick={() => setShowArchiveModal(true)} disabled={isUpdating} className="bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-sm">Archive as Duplicate</Button>
                </div>
                )}
              </div>
            )}

            {/* ── CANDIDATE HEADER ── */}
            <div className="mb-6">
              <CandidateHeader
                candidate={candidate}
                isReadOnly={isReadOnly}
                onUpdate={handleUpdate}
                actions={(
                  <>
                    <div className="flex items-center h-8 px-2.5 rounded-md border border-border bg-background shadow-xs">
                      <ConsiderationEditor
                        candidate={candidate}
                        readOnly={isReadOnly}
                        onSaved={setCandidate}
                        compact
                      />
                    </div>
                    {candidate.email && (
                      <a
                        href={`mailto:${candidate.email}`}
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md border border-border bg-background hover:bg-muted transition-colors text-foreground shadow-xs"
                      >
                        <img src="/gmail.webp" className="w-3.5 h-3.5 object-contain" alt="Email" /> Email
                      </a>
                    )}
                    {candidate.has_resume && (
                      <ResumeButton
                        candidateId={candidate.id}
                        candidateName={candidate.full_name}
                        hasResume={candidate.has_resume}
                        allowReplace={!isReadOnly}
                        onReplaced={handleUpdate}
                      />
                    )}
                  </>
                )}
              />
            </div>
          </div>
        </div>

        {/* ── WORK QUEUE (HO HR + Admin) ── */}
        {(isHO || user?.role === 'ADMIN') && (
          <div className="mb-6 space-y-3">
            <SalarySheetUpload candidateId={candidate.id} onDone={handleUpdate} compact />
            {typeof candidate.salary_data?._uploaded_by === 'string' && (
              <p className="text-xs text-muted-foreground">
                Salary uploaded by {String(candidate.salary_data._uploaded_by)}
                {typeof candidate.salary_data._uploaded_at === 'string'
                  ? ` on ${new Date(String(candidate.salary_data._uploaded_at)).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : ''}
              </p>
            )}
            {hasBeenSentToHO && <WorkQueue candidate={candidate} evaluations={evaluations} />}
          </div>
        )}

        {/* ── DYNAMIC STAGE WORKSPACE ── */}
        <CandidateRecordSections
          taskContent={(
            <div className="relative min-h-[400px]">
          {isUpdating && (
            <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-sm flex items-center justify-center rounded-xl transition-all duration-300">
              <LoadingSpinner size="md" className="text-primary/70" />
            </div>
          )}

          <div className={cn("transition-opacity duration-300", isUpdating ? "opacity-50 pointer-events-none" : "opacity-100")}>
            {viewedStageComplete && (
              <div className="flex justify-center mb-6">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="w-11 h-11 rounded-full border-2 border-success bg-success/10 text-success flex items-center justify-center shadow-sm">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-success">
                    Stage complete
                  </span>
                </div>
              </div>
            )}

            {isAdmin && !hasBeenSentToHO && (
              <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
                Still in the branch pipeline. Admin work starts after Local HR sends this candidate to Head Office.
              </div>
            )}

            {!isAdmin && stageToView === 'CALL_LETTER' && (
              <PreFormStatus candidate={candidate} onUpdate={handleUpdate} isReadOnly={isReadOnly} />
            )}

            {showWhatsAppSidebar && (
              <WhatsAppPreviewPanel candidate={candidate} onUpdate={handleUpdate} isReadOnly={isReadOnly} className="xl:hidden mt-6 rounded-xl border border-border overflow-hidden max-w-2xl ml-auto" />
            )}

            {!isAdmin && stageToView === 'INTERVIEWS' && (
              <EvaluationStageWidget
                candidate={candidate}
                evalTypes={['BRANCH_HR', 'DEPT_HEAD']}
                onUpdate={handleUpdate}
                isReadOnly={isReadOnly}
              />
            )}

            {!isAdmin && stageToView === 'TEST' && (
              <EvaluationStageWidget
                candidate={candidate}
                evalTypes={['TECHNICAL_TEST']}
                onUpdate={handleUpdate}
                isReadOnly={isReadOnly}
              />
            )}

            {!isAdmin && stageToView === 'BACKGROUND_VERIFICATION' && (
              <BackgroundVerificationWidget
                candidate={candidate}
                onUpdate={handleUpdate}
                navigateToStage={navigateToStage}
                isReadOnly={isReadOnly}
              />
            )}

            {!isAdmin && stageToView === 'APPLICATION' && (
              <ApplicationStageWidget
                candidate={candidate}
                evaluations={evaluations}
                onUpdate={handleUpdate}
                isReadOnly={isReadOnly}
              />
            )}

            {!isAdmin && stageToView === 'SENT_TO_HO' && (
              <ApplicationStageWidget
                candidate={candidate}
                evaluations={evaluations}
                onUpdate={handleUpdate}
                isReadOnly={isReadOnly}
              />
            )}

            {(stageToView === 'SENT_TO_HO' || stageToView === 'HO_INTERVIEW_INTIMATION') && (
              <HeadOfficeForwardingEmailStatus
                candidate={candidate}
                onUpdate={handleUpdate}
              />
            )}

            {!isAdmin && stageToView === 'HO_INTERVIEW_INTIMATION' && evaluations.find((e) => e.type === 'HQ_INTERVIEW_1') && (
              <HeadOfficeInvitePanel
                candidate={candidate}
                evaluation={evaluations.find((e) => e.type === 'HQ_INTERVIEW_1')!}
                onUpdate={handleUpdate}
                onSent={() => navigateToStage('HO_INTERVIEWS')}
                isReadOnly={isReadOnly}
              />
            )}

            {!isAdmin && (stageToView === 'HO_INTERVIEWS' ||
              stageToView === 'HO_HR_INTERVIEW' ||
              stageToView === 'HO_DEPT_INTERVIEW') && (
              <EvaluationStageWidget
                candidate={candidate}
                evalTypes={['HQ_INTERVIEW_1', 'HQ_INTERVIEW_2']}
                onUpdate={handleUpdate}
                isReadOnly={isReadOnly}
              />
            )}

            {!isAdmin && stageToView === 'CSS' && (
              <CSSStageWidget
                candidate={candidate}
                evaluations={evaluations}
                onUpdate={handleUpdate}
              />
            )}

            {isAdmin && stageToView === 'CSS' && (
              <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
                CSS is prepared by Head Office HR.
              </div>
            )}

            {!isAdmin && stageToView === 'SALARY_DETAILS' && (
              <SalarySheetStageWidget
                candidate={candidate}
                onUpdate={handleUpdate}
                isReadOnly={isReadOnly}
              />
            )}

            {isAdmin && stageToView === 'SALARY_DETAILS' && (
              <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
                The salary setting sheet is prepared by Head Office HR.
              </div>
            )}

            {stageToView === 'FINAL_APPROVAL' && !isLocalHR && (
              <FinalApprovalWidget
                candidate={candidate}
                onUpdate={handleUpdate}
              />
            )}
            {stageToView === 'FINAL_APPROVAL' && isLocalHR && (
              <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
                Offer letter and salary details are handled by Head Office.
              </div>
            )}

            {stageToView === 'OFFER_RESPONSE' && (
              <OfferResponseStageWidget
                candidate={candidate}
                onUpdate={handleUpdate}
                isReadOnly={isLocalHR}
              />
            )}


            {(actualStage === 'REJECTED' || actualStage === 'ON_HOLD') && (
              <StageEmailStatus candidate={candidate} kind={actualStage} onUpdate={handleUpdate} />
            )}

            {actualStage === 'ON_HOLD' && (
              <div className="bg-warning/5 border border-warning/20 p-8 rounded-xl mt-6 flex flex-col items-center">
                <div className="w-16 h-16 bg-warning rounded-full flex items-center justify-center shadow-lg mb-4">
                  <Pause className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-warning">Candidate On Hold</h3>
                <p className="text-warning/80 mt-2 max-w-md mx-auto font-medium text-center">
                  {isReadOnly
                    ? 'This candidate has been placed on hold at Head Office. Local HR cannot change the record.'
                    : 'This candidate has been placed on hold. Select a stage below to resume their pipeline.'}
                </p>
                {!isReadOnly && (
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                  <Select
                    value={resumeStage}
                    onChange={(e) => setResumeStage(e.target.value as PipelineStage)}
                    className="font-medium"
                  >
                    {effectiveStages.filter(s => s !== 'HIRED').map(s => (
                      <option key={s} value={s}>{stageLabel(s)}</option>
                    ))}
                  </Select>
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
                )}
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
          )}
        />

      </div>

      {showWhatsAppSidebar && (
        <WhatsAppPreviewPanel candidate={candidate} onUpdate={handleUpdate} isReadOnly={isReadOnly} className="hidden xl:flex sticky top-0 h-screen w-[320px] 2xl:w-[380px] shrink-0" />
      )}

      {/* ── ACTIVITY TIMELINE SIDEBAR ── */}
      <AnimatePresence>
        {isActivityOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 350, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 38, mass: 0.8 }}
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
              <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-background space-y-8">
                <CommunicationTimeline candidateId={candidate.id} candidate={candidate} />
                <div className="border-t border-border pt-6">
                  <h3 className="mb-2 text-sm font-bold">Activity history</h3>
                  <ActivityTimeline candidateId={candidate.id} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HOLD MODAL ── */}
      <Modal isOpen={showHoldModal} onClose={() => setShowHoldModal(false)} title="Place Candidate on Hold" size="sm">
        <div className="space-y-4 p-6">
          <div className="p-3 bg-warning/5 border border-warning/20 rounded-[10px] flex items-start gap-3">
            <Pause className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              This pauses active work for <strong className="text-foreground">{candidate.full_name}</strong> and emails them an on-hold notification. The candidate can be resumed later.
            </p>
          </div>
          <div>
            <label htmlFor="hold-reason" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Hold Reason <span className="text-danger">*</span>
            </label>
            <textarea
              id="hold-reason"
              value={holdRemarks}
              onChange={(e) => setHoldRemarks(e.target.value)}
              placeholder="Explain why work is paused..."
              className="w-full bg-background border border-border rounded-[10px] p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-warning/40 focus:border-transparent transition-all duration-200 min-h-[100px] resize-y"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setShowHoldModal(false)}>Cancel</Button>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!holdRemarks.trim()) {
                  toast.error('Hold reason is required.');
                  return;
                }
                setIsHolding(true);
                try {
                  await handleHold(holdRemarks.trim());
                  setShowHoldModal(false);
                  setHoldRemarks('');
                } finally {
                  setIsHolding(false);
                }
              }}
              isLoading={isHolding}
              disabled={!holdRemarks.trim()}
            >
              Place on Hold
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── REJECT MODAL ── */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Candidate" size="sm">
        <div className="space-y-4 p-6">
          <div className="p-3 bg-danger/5 border border-danger/20 rounded-[10px] flex items-start gap-3">
            <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">This will move the candidate to <strong className="text-danger">Rejected</strong> status and email them a rejection notice. This can be reversed later.</p>
          </div>
          <div>
            <label htmlFor="rejection-reason" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Rejection Reason <span className="text-danger">*</span>
            </label>
            <textarea
              id="rejection-reason"
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

      <Modal isOpen={showArchiveModal} onClose={() => setShowArchiveModal(false)} title="Archive duplicate candidate" description="Confirm this administrative correction before changing the record." size="sm">
        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
            Archive <strong>{candidate.full_name}</strong> as a duplicate. The candidate will leave the active workflow, while the record and audit history remain available. If this is wrong, use the duplicate-resolution controls or ask an administrator to restore it.
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setShowArchiveModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={async () => { setShowArchiveModal(false); await handleResolveDuplicate('MERGE'); }}>Archive duplicate</Button>
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
              <label htmlFor="new-stage" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                New Stage
              </label>
              <Select
                id="new-stage"
                value={editStageSelection}
                onChange={(e) => setEditStageSelection(e.target.value as PipelineStage)}
              >
                <option value="CALL_LETTER">Initial Review</option>
                <option value="INTERVIEWS">Interviews</option>
                <option value="TEST">Technical Test</option>
                <option value="BACKGROUND_VERIFICATION">Background Verification</option>
                <option value="APPLICATION">Application</option>
                <option value="SENT_TO_HO">Sent to Head Office</option>
                <option value="FINAL_APPROVAL">Final Approval</option>
                <option value="OFFER_RESPONSE">Offer Response</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="REJECTED">Rejected</option>
                <option value="HIRED">Hired</option>
              </Select>
            </div>
            <div>
              <label htmlFor="stage-remarks" className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Remarks (Optional)
              </label>
              <textarea
                id="stage-remarks"
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

