import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCircle, Link, Loader2, Pencil, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Select } from '../ui';
import {
  submitScorecardDirect,
  deleteEvaluation,
  updateEvaluationTitle,
  updateEvaluationInterviewer,
  generateEvaluationToken,
  sendEvaluationWhatsAppInvite,
} from '../../api/evaluations';
import { canRenameInterview, defaultInterviewTitle, interviewTitle } from '../../lib/interviewTitle';
import {
  createInterviewer,
  updateInterviewerPhone,
  type InterviewerNameRow,
} from '../../api/settings';
import { buildInterviewerWhatsAppMessage, openWhatsAppChat } from '../../lib/whatsappTemplate';
import { WhatsAppShareModal } from './WhatsAppSendChoices';
import { InterviewerPicker } from './InterviewerPicker';
import { cn, extractError, isAbortError, copyTextToClipboard } from '../../lib/utils';
import { useAuth } from '../../auth';
import { digitsOnly, validatePhone } from '../../lib/validation';
import { formatDate, formatTime } from '../../lib/dateTime';

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
  onUpdate: (opts?: { candidate?: boolean }) => void;
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
          aria-label={`${star} out of ${maxStars} stars`}
          aria-pressed={star === val}
          className="min-h-11 min-w-11 rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
  const isHQInterview = ev.type === 'HQ_INTERVIEW_1' || ev.type === 'HQ_INTERVIEW_2' || ev.type === 'HQ_INTERVIEW';
  const branch = isHQInterview
    ? 'Head Office'
    : user?.role === 'LOCAL_HR'
    ? user.branch_location || candidate.branch_location || null
    : candidate.branch_location || 'Head Office';

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
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [pendingLink, setPendingLink] = useState('');
  const [sendPhone, setSendPhone] = useState('');
  const [sendPhoneError, setSendPhoneError] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const skipTitleSaveRef = useRef(false);

  const requireInterviewer =
    ev.type === 'BRANCH_HR' ||
    ev.type === 'DEPT_HEAD' ||
    ev.type === 'HQ_INTERVIEW_1' ||
    ev.type === 'HQ_INTERVIEW_2' ||
    ev.type === 'HQ_INTERVIEW';

  const showForm = !isCompleted || isEditing;

  const handleEdit = () => {
    setVerdict(ev.verdict as EvaluationVerdict);
    setRemarksText(ev.remarks || '');
    setInterviewerName(String((ev.scores as any)?.interviewer_name || '').trim());
    if (ev.scores) {
      setAttitudeScore((ev.scores as any).attitude || 0);
      setCommScore((ev.scores as any).communication || 0);
      setKnowledgeScore((ev.scores as any).knowledge || 0);
    }
    setIsEditing(true);
  };

  const startRename = () => {
    if (isReadOnly || !canRenameInterview(ev.type)) return;
    setTitleDraft(interviewTitle(ev));
    setEditingTitle(true);
  };

  const saveTitle = async () => {
    if (savingTitle) return;
    if (skipTitleSaveRef.current) {
      skipTitleSaveRef.current = false;
      setEditingTitle(false);
      return;
    }
    const next = titleDraft.trim();
    const current = interviewTitle(ev);
    if (!next || next === current) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      await updateEvaluationTitle(ev.id, next);
      setEditingTitle(false);
      onUpdate({ candidate: false });
    } catch (err) {
      toast.error(extractError(err, 'Failed to rename interview'));
    } finally {
      setSavingTitle(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEvaluation(ev.id);
      toast.success('Interview deleted successfully');
      onUpdate({ candidate: false });
    } catch (err) {
      toast.error(extractError(err, 'Failed to delete interview'));
    } finally {
      setDeleting(false);
    }
  };

  const [selectedInterviewer, setSelectedInterviewer] = useState<InterviewerNameRow | null>(null);
  const selectedPhone = String(selectedInterviewer?.phone || '').trim();

  const persistInterviewerName = async (name: string) => {
    setInterviewerName(name);
    try {
      await updateEvaluationInterviewer(ev.id, name);
    } catch {
      /* still usable locally */
    }
  };

  const buildEvalLink = async () => {
    const tokenData = await generateEvaluationToken(ev.id);
    return `${window.location.origin}/eval/${tokenData.token}`;
  };

  const handleCopyLink = async () => {
    if (generatingLink) return;
    setGeneratingLink(true);
    try {
      const url = await buildEvalLink();
      const copiedOk = await copyTextToClipboard(url);
      if (copiedOk) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Interviewer link copied');
      } else {
        toast.error('Failed to copy link');
      }
    } catch (err) {
      toast.error(extractError(err, 'Failed to copy link'));
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleOpenWhatsApp = async () => {
    if (!interviewerName.trim()) {
      toast.error('Select or add an interviewer first');
      return;
    }
    setGeneratingLink(true);
    try {
      const url = await buildEvalLink();
      await updateEvaluationInterviewer(ev.id, interviewerName.trim());
      const phoneToUse = selectedInterviewer?.phone || sendPhone || '';
      setPendingLink(url);
      setSendPhone(phoneToUse);
      setSendPhoneError('');
      setWhatsappOpen(true);
    } catch (err) {
      toast.error(extractError(err, 'Failed to generate link'));
    } finally {
      setGeneratingLink(false);
    }
  };

  const interviewerMessage = () =>
    buildInterviewerWhatsAppMessage({
      interviewerName,
      candidateName: candidate.full_name,
      interviewTitle: interviewTitle(ev),
      link: pendingLink,
    });

  const resolveSendPhone = () => {
    const phoneCheck = validatePhone(sendPhone, 'Interviewer phone');
    if (!phoneCheck.ok) {
      setSendPhoneError(phoneCheck.message);
      toast.error(phoneCheck.message);
      return null;
    }
    setSendPhoneError('');
    return digitsOnly(sendPhone);
  };

  const persistSendPhone = async (phone: string) => {
    const name = interviewerName.trim();
    if (!name) return;
    try {
      if (selectedInterviewer) {
        if (selectedInterviewer.phone !== phone) {
          await updateInterviewerPhone(selectedInterviewer.id, phone, branch);
        }
        return;
      }
      await createInterviewer(name, branch, phone);
    } catch (err) {
      toast.error(extractError(err, 'Failed to save interviewer phone'));
    }
  };

  const handleSendWhatsApp = async () => {
    const phone = resolveSendPhone();
    if (!phone || sendingWhatsApp) return;
    setSendingWhatsApp(true);
    try {
      await persistSendPhone(phone);
      const scheduled = ev.scheduled_time ? new Date(ev.scheduled_time) : null;
      const dateStr = scheduled ? formatDate(scheduled) : 'as discussed';
      const timeStr = scheduled ? formatTime(scheduled) : '';
      await sendEvaluationWhatsAppInvite(ev.id, {
        to_phone: phone,
        recipient_type: 'INTERVIEWER',
        variables: {
          interviewerName,
          candidateName: candidate.full_name,
          position: candidate.position_applied_for || candidate.department || 'the role',
          date: dateStr,
          time: timeStr,
          mode: interviewTitle(ev),
          locationOrLink: pendingLink,
          recruiterName: user?.full_name || 'HR Team',
        },
      });
      toast.success(`WhatsApp sent to ${interviewerName}`);
      setWhatsappOpen(false);
    } catch (err) {
      toast.error(extractError(err, 'Failed to send WhatsApp'));
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleOpenWhatsAppChat = async () => {
    const phone = resolveSendPhone();
    if (!phone) return;
    await persistSendPhone(phone);
    openWhatsAppChat(phone, interviewerMessage());
    setWhatsappOpen(false);
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
      if (name && !selectedInterviewer) {
        await createInterviewer(name, branch, selectedPhone || undefined);
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

      toast.success(`${interviewTitle(ev)} saved successfully`);
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      toast.error(extractError(err, 'Failed to submit scorecard'));
    } finally {
      setSubmitting(false);
    }
  };

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
          <div className="flex items-center gap-3 min-w-0">
            {editingTitle ? (
              <Input
                autoFocus
                value={titleDraft}
                maxLength={80}
                disabled={savingTitle}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => void saveTitle()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void saveTitle();
                  }
                  if (e.key === 'Escape') {
                    skipTitleSaveRef.current = true;
                    setEditingTitle(false);
                  }
                }}
                className="h-9 max-w-sm font-bold"
                placeholder={defaultInterviewTitle(ev.type)}
              />
            ) : (
              <h3 className="font-bold text-lg tracking-wide text-foreground truncate">
                {interviewTitle(ev)}
              </h3>
            )}
            {canRenameInterview(ev.type) && !isReadOnly && !editingTitle && (
              <button
                type="button"
                onClick={startRename}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
                title="Rename interview"
                aria-label="Rename interview"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {isCompleted && !isEditing && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase shadow-sm whitespace-nowrap bg-success/10 text-success border-success/20">
                Evaluated
              </span>
            )}
            {(ev.type === 'DEPT_HEAD' || ev.type === 'HQ_INTERVIEW_2') && index > 0 && !isReadOnly && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="ml-2 text-muted-foreground hover:text-danger transition-colors p-1"
                title="Delete this interview"
                aria-label="Delete this interview"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {!isCompleted && !isReadOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                disabled={generatingLink}
                aria-label={copied ? 'Interview link copied' : 'Copy interview link'}
                className="flex min-h-11 items-center gap-2 px-3 py-1.5 text-xs font-bold text-foreground bg-background border border-border hover:bg-muted rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {generatingLink ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copied ? (
                  <CheckCircle className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Link className="w-3.5 h-3.5" />
                )}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <button
                type="button"
                onClick={() => void handleOpenWhatsApp()}
                disabled={generatingLink}
                title={!interviewerName.trim() ? 'Select an interviewer first' : 'Send form on WhatsApp'}
                aria-label="Send interview form on WhatsApp"
                className="flex min-h-11 items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-[#075E54] hover:bg-[#064c44] rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <img src="/whatsapp.webp" alt="" className="w-3.5 h-3.5 object-contain" />
                WhatsApp
              </button>
            </div>
          )}
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
                  {ev.verdict === 'ON_HOLD' && !isReadOnly && (
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
            <div className="rounded-xl border border-border/80 bg-surface/40 p-4 shadow-xs">
              <InterviewerPicker
                label="Interviewer"
                value={interviewerName}
                onChange={(name) => void persistInterviewerName(name)}
                branch={branch}
                disabled={!!isReadOnly}
                required={requireInterviewer}
                onInterviewerChange={(int) => {
                  setSelectedInterviewer(int);
                  if (int?.phone) {
                    setSendPhone(int.phone);
                    setSendPhoneError('');
                  }
                }}
              />
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
                  <div className="flex flex-wrap gap-1.5 p-3 pt-1 border-t border-transparent">
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
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider mb-1 text-center">
                Final Verdict
              </label>
              <div className="flex flex-wrap items-center justify-center gap-3">
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

            <button
              type="button"
              onClick={handleSubmitScorecard}
              disabled={submitting}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-lg font-bold uppercase tracking-widest text-[11px] shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
            >
              {submitting ? 'SAVING...' : 'SAVE EVALUATION'}
            </button>

            {isEditing && (
              <div className="flex gap-2 justify-center pt-1">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      <WhatsAppShareModal
        isOpen={whatsappOpen}
        onClose={() => setWhatsappOpen(false)}
        title="Send interviewer form"
        description={
          <>
            Send the evaluation link to <span className="font-semibold">{interviewerName || 'the interviewer'}</span> for{' '}
            <span className="font-semibold">{candidate.full_name}</span>. Phone is required to send.
          </>
        }
        preview={pendingLink}
        onDoubleTick={() => void handleSendWhatsApp()}
        onOpenWhatsApp={() => void handleOpenWhatsAppChat()}
        doubleTickLoading={sendingWhatsApp}
        sendDisabled={!validatePhone(sendPhone).ok}
      >
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Interviewer phone <span className="text-danger">*</span>
          </label>
          <Input
            autoFocus={!selectedPhone}
            placeholder="10-digit mobile"
            inputMode="numeric"
            maxLength={10}
            value={sendPhone}
            error={!!sendPhoneError}
            onChange={(e) => {
              const next = digitsOnly(e.target.value, 10);
              setSendPhone(next);
              const check = validatePhone(next, 'Interviewer phone');
              setSendPhoneError(check.ok ? '' : check.message);
            }}
          />
          {sendPhoneError ? (
            <p className="text-xs text-danger mt-1" role="alert">
              {sendPhoneError}
            </p>
          ) : sendPhone ? (
            <p className="text-xs text-muted-foreground mt-1">Will send to +91 {digitsOnly(sendPhone)}</p>
          ) : null}
        </div>
      </WhatsAppShareModal>
    </motion.div>
  );
}
