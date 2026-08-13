import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input } from '../ui';
import { submitScorecardDirect, deleteEvaluation } from '../../api/evaluations';
import {
  createInterviewer,
  deleteInterviewer,
  listInterviewers,
  type InterviewerNameRow,
} from '../../api/settings';
import type { Candidate, Evaluation, EvaluationVerdict } from '../../types';
import { cn, extractError } from '../../lib/utils';
import { useAuth } from '../../auth';

const PREDEFINED_REMARKS = [
  'Excellent candidate, highly recommended.',
  'Good communication, but lacks technical depth.',
  'Great cultural fit, average technical skills.',
  'Not a good fit for this role at the moment.',
];

interface InterviewFormCardProps {
  ev: Evaluation;
  index: number;
  candidate: Candidate;
  onUpdate: () => void;
  isReadOnly?: boolean;
}

const StarInput = ({
  label,
  val,
  setVal,
  maxStars = 5,
}: {
  label: string;
  val: number;
  setVal: (v: number) => void;
  maxStars?: number;
}) => (
  <div className="flex flex-col">
    <div className="flex justify-between items-center mb-1">
      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-muted-foreground">
        {val}/{maxStars}
      </span>
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
              'w-8 h-8 transition-all duration-200',
              star <= val
                ? 'fill-amber-400 text-amber-500 drop-shadow-sm'
                : 'fill-muted text-muted-foreground/30'
            )}
          />
        </button>
      ))}
    </div>
  </div>
);

export function InterviewFormCard({ ev, index, onUpdate, isReadOnly, candidate }: InterviewFormCardProps) {
  const { user } = useAuth();
  const branch = user?.branch_location || candidate.branch_location || null;

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isCompleted = ev.status === 'EVALUATED';
  const [isEditing, setIsEditing] = useState(false);

  const [verdict, setVerdict] = useState<EvaluationVerdict | null>(null);
  const [remarksText, setRemarksText] = useState('');
  const [attitudeScore, setAttitudeScore] = useState(0);
  const [commScore, setCommScore] = useState(0);
  const [knowledgeScore, setKnowledgeScore] = useState(0);
  const [interviewerName, setInterviewerName] = useState(() =>
    String((ev.scores as any)?.interviewer_name || '').trim()
  );
  const [savedNames, setSavedNames] = useState<InterviewerNameRow[]>([]);
  const [newNameDraft, setNewNameDraft] = useState('');
  const [loadingNames, setLoadingNames] = useState(true);

  const requireInterviewer =
    ev.type === 'BRANCH_HR' ||
    ev.type === 'DEPT_HEAD' ||
    ev.type === 'HQ_INTERVIEW_1' ||
    ev.type === 'HQ_INTERVIEW_2' ||
    ev.type === 'HQ_INTERVIEW';

  const refreshNames = async () => {
    try {
      setSavedNames(await listInterviewers(branch));
    } catch (err) {
      toast.error(extractError(err, 'Failed to load interviewer names'));
    } finally {
      setLoadingNames(false);
    }
  };

  useEffect(() => {
    void refreshNames();
  }, [branch]);

  const handleEdit = () => {
    setVerdict(ev.verdict as EvaluationVerdict);
    setRemarksText(ev.remarks || '');
    setInterviewerName(String((ev.scores as any)?.interviewer_name || '').trim());
    void refreshNames();
    if (ev.scores) {
      setAttitudeScore((ev.scores as any).attitude || 0);
      setCommScore((ev.scores as any).communication || 0);
      setKnowledgeScore((ev.scores as any).knowledge || 0);
    }
    setIsEditing(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEvaluation(ev.id);
      toast.success('Interview deleted successfully');
      onUpdate();
    } catch (err) {
      toast.error(extractError(err, 'Failed to delete interview'));
    } finally {
      setDeleting(false);
    }
  };

  const handleAddInterviewerName = async () => {
    if (!newNameDraft.trim()) {
      toast.error('Enter an interviewer name');
      return;
    }
    try {
      const row = await createInterviewer(newNameDraft, branch);
      setSavedNames(await listInterviewers(branch));
      setInterviewerName(row.name);
      setNewNameDraft('');
      toast.success('Interviewer name saved for this branch');
    } catch (err) {
      toast.error(extractError(err, 'Failed to save interviewer name'));
    }
  };

  const handleRemoveSavedName = async (row: InterviewerNameRow) => {
    try {
      await deleteInterviewer(row.id, branch);
      setSavedNames(await listInterviewers(branch));
      if (interviewerName.toLowerCase() === row.name.toLowerCase()) {
        setInterviewerName('');
      }
      toast.success('Interviewer name removed');
    } catch (err) {
      toast.error(extractError(err, 'Failed to remove interviewer name'));
    }
  };

  const handleSubmitScorecard = async () => {
    if (attitudeScore === 0 || commScore === 0 || knowledgeScore === 0 || !verdict) {
      toast.error('Please complete all star ratings and select a verdict');
      return;
    }
    if (requireInterviewer && !interviewerName.trim()) {
      toast.error('Select or add the interviewer name');
      return;
    }

    setSubmitting(true);
    try {
      const name = interviewerName.trim();
      if (name) {
        await createInterviewer(name, branch);
        setSavedNames(await listInterviewers(branch));
      }
      await submitScorecardDirect(ev.id, {
        verdict: verdict as EvaluationVerdict,
        remarks: remarksText,
        scores: {
          ...(ev.scores || {}),
          attitude: attitudeScore,
          communication: commScore,
          knowledge: knowledgeScore,
          total_score: attitudeScore + commScore + knowledgeScore,
          interviewer_name: name || undefined,
        },
      });

      const evalName =
        ev.type === 'BRANCH_HR'
          ? 'HR INTERVIEW'
          : ev.type === 'DEPT_HEAD'
            ? 'DEPARTMENT INTERVIEW'
            : ev.type === 'HQ_INTERVIEW_1'
              ? 'HEAD OFFICE INTERVIEW'
              : ev.type === 'HQ_INTERVIEW_2'
                ? 'CMD INTERVIEW'
                : ev.type.replace(/_/g, ' ');
      toast.success(`${evalName} saved successfully`);
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      toast.error(extractError(err, 'Failed to submit scorecard'));
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = !isCompleted || isEditing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col justify-between p-6 bg-background border border-border shadow-sm rounded-xl mb-4"
    >
      <div>
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-4 gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-lg uppercase tracking-wider text-foreground">
              {ev.type === 'BRANCH_HR'
                ? 'HR INTERVIEW'
                : ev.type === 'DEPT_HEAD'
                  ? 'DEPARTMENT INTERVIEW'
                  : ev.type === 'HQ_INTERVIEW_1'
                    ? 'HEAD OFFICE INTERVIEW'
                    : ev.type === 'HQ_INTERVIEW_2'
                      ? 'CMD INTERVIEW'
                      : ev.type.replace(/_/g, ' ')}
            </h3>
            {isCompleted && !isEditing && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase shadow-sm whitespace-nowrap bg-success/10 text-success border-success/20">
                Evaluated
              </span>
            )}
            {ev.type === 'DEPT_HEAD' && index > 0 && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="ml-2 text-muted-foreground hover:text-danger transition-colors p-1"
                title="Delete this interview"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isCompleted && !isEditing ? (
          <div className="mt-4 p-5 bg-background border border-border/80 rounded-xl shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-4 mb-4">
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Final Verdict
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-bold border uppercase shadow-xs',
                      ev.verdict === 'SELECTED' || ev.verdict === 'PASS'
                        ? 'bg-success/10 text-success border-success/30'
                        : ev.verdict === 'ON_HOLD'
                          ? 'bg-warning/10 text-warning border-warning/30'
                          : 'bg-danger/10 text-danger border-danger/30'
                    )}
                  >
                    {ev.verdict?.replace(/_/g, ' ') || 'EVALUATED'}
                  </span>
                  {ev.verdict === 'ON_HOLD' && (
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="text-[10px] font-bold text-primary hover:underline px-2 py-1"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              {(ev.scores as any)?.interviewer_name && (
                <div>
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Interviewer
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {(ev.scores as any).interviewer_name}
                  </p>
                </div>
              )}
            </div>

            {ev.scores && (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5 pb-5 border-b border-border/50">
                {[
                  { key: 'attitude', max: 4 },
                  { key: 'communication', max: 3 },
                  { key: 'knowledge', max: 3 },
                ].map(({ key: k, max }) =>
                  (ev.scores as any)[k] !== undefined ? (
                    <div key={k}>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {k}
                      </span>
                      <div className="flex gap-1">
                        {Array.from({ length: max }, (_, i) => i + 1).map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              'w-5 h-5 transition-colors',
                              s <= (ev.scores as any)[k]
                                ? 'fill-amber-400 text-amber-500'
                                : 'fill-muted text-muted-foreground/30'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}

            <div>
              <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Evaluation Remarks
              </span>
              <p className="text-sm text-foreground leading-relaxed bg-muted/10 p-3 rounded-lg border border-border/30">
                {ev.remarks ? (
                  `"${ev.remarks}"`
                ) : (
                  <span className="text-muted-foreground italic">No remarks provided.</span>
                )}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {showForm && (
        <div className="mt-3">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-4 mt-2"
          >
            <div className="rounded-lg border border-border p-3 space-y-2">
              <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider">
                Interviewer name{requireInterviewer ? ' *' : ''}
              </label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                disabled={!!isReadOnly || loadingNames}
              >
                <option value="">{loadingNames ? 'Loading…' : 'Select interviewer…'}</option>
                {savedNames.map((row) => (
                  <option key={row.id} value={row.name}>
                    {row.name}
                  </option>
                ))}
                {interviewerName &&
                  !savedNames.some((n) => n.name.toLowerCase() === interviewerName.toLowerCase()) && (
                    <option value={interviewerName}>{interviewerName}</option>
                  )}
              </select>

              {savedNames.length > 0 && (
                <ul className="space-y-1 max-h-28 overflow-y-auto">
                  {savedNames.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1 text-sm"
                    >
                      <button
                        type="button"
                        className="truncate text-left font-medium hover:text-primary"
                        onClick={() => setInterviewerName(row.name)}
                      >
                        {row.name}
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleRemoveSavedName(row)}
                        title={`Remove ${row.name}`}
                        aria-label={`Remove ${row.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Add new interviewer name"
                  value={newNameDraft}
                  onChange={(e) => setNewNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInterviewerName();
                    }
                  }}
                  disabled={!!isReadOnly}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddInterviewerName}
                  disabled={!!isReadOnly}
                >
                  Save name
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col gap-3">
                <div className="flex justify-start mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAttitudeScore(4);
                      setCommScore(3);
                      setKnowledgeScore(3);
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary hover:text-primary/80 transition-colors bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md shadow-sm"
                  >
                    <Star className="w-3.5 h-3.5 fill-current" /> Give Full Marks
                  </button>
                </div>
                <StarInput label="Attitude" val={attitudeScore} setVal={setAttitudeScore} maxStars={4} />
                <StarInput label="Communication" val={commScore} setVal={setCommScore} maxStars={3} />
                <StarInput label="Knowledge" val={knowledgeScore} setVal={setKnowledgeScore} maxStars={3} />
              </div>

              <div className="h-full flex flex-col">
                <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-2">
                  Remarks
                </label>
                <div className="flex-1 flex flex-col bg-muted/10 border border-border rounded-lg focus-within:ring-2 focus-within:ring-primary/30 transition-all shadow-inner overflow-hidden min-h-[220px]">
                  <textarea
                    value={remarksText}
                    onChange={(e) => setRemarksText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitScorecard();
                      }
                    }}
                    placeholder="Write your remarks here..."
                    className="w-full flex-1 bg-transparent border-0 p-4 text-base font-medium text-foreground/90 leading-relaxed resize-none focus:ring-0 outline-none"
                  />
                  <div className="flex justify-between items-end p-3 pt-1 border-t border-transparent">
                    <div className="flex flex-wrap gap-1.5 max-w-[65%]">
                      {PREDEFINED_REMARKS.map((remark, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setRemarksText((prev) => (prev ? `${prev.trim()} ${remark}` : remark))
                          }
                          className="text-[10px] bg-background/80 hover:bg-muted/80 text-foreground px-2 py-1 rounded-md border border-border/60 transition-colors font-medium whitespace-nowrap shadow-sm"
                          title={remark}
                        >
                          + {remark.substring(0, 20)}...
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleSubmitScorecard}
                      disabled={submitting}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold uppercase tracking-widest text-[11px] shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center min-w-[160px]"
                    >
                      {submitting ? 'SAVING...' : 'SAVE EVALUATION'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1">
                Final Verdict
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer transition-all',
                    verdict === 'SELECTED'
                      ? 'border-success bg-success/5'
                      : 'border-border bg-background hover:bg-muted/50'
                  )}
                >
                  <input
                    type="radio"
                    className="hidden"
                    checked={verdict === 'SELECTED'}
                    onChange={() => setVerdict('SELECTED')}
                  />
                  <div
                    className={cn(
                      'w-4 h-4 border rounded flex items-center justify-center transition-colors',
                      verdict === 'SELECTED'
                        ? 'bg-success border-success text-white'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {verdict === 'SELECTED' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider',
                      verdict === 'SELECTED' ? 'text-success' : 'text-muted-foreground'
                    )}
                  >
                    Selected
                  </span>
                </label>

                <label
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer transition-all',
                    verdict === 'ON_HOLD'
                      ? 'border-warning bg-warning/5'
                      : 'border-border bg-background hover:bg-muted/50'
                  )}
                >
                  <input
                    type="radio"
                    className="hidden"
                    checked={verdict === 'ON_HOLD'}
                    onChange={() => setVerdict('ON_HOLD')}
                  />
                  <div
                    className={cn(
                      'w-4 h-4 border rounded flex items-center justify-center transition-colors',
                      verdict === 'ON_HOLD'
                        ? 'bg-warning border-warning text-white'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {verdict === 'ON_HOLD' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider',
                      verdict === 'ON_HOLD' ? 'text-warning' : 'text-muted-foreground'
                    )}
                  >
                    Hold
                  </span>
                </label>

                <label
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer transition-all',
                    verdict === 'REJECTED'
                      ? 'border-danger bg-danger/5'
                      : 'border-border bg-background hover:bg-muted/50'
                  )}
                >
                  <input
                    type="radio"
                    className="hidden"
                    checked={verdict === 'REJECTED'}
                    onChange={() => setVerdict('REJECTED')}
                  />
                  <div
                    className={cn(
                      'w-4 h-4 border rounded flex items-center justify-center transition-colors',
                      verdict === 'REJECTED'
                        ? 'bg-danger border-danger text-white'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {verdict === 'REJECTED' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider',
                      verdict === 'REJECTED' ? 'text-danger' : 'text-muted-foreground'
                    )}
                  >
                    Rejected
                  </span>
                </label>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
