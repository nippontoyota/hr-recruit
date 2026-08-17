import { useState } from 'react';
import { Check, Pause, Play, Send, XCircle } from 'lucide-react';
import { Button, Modal } from '../ui';
import type { Candidate } from '../../types';
import { getCandidateActionKey, getCandidateWorkState } from '../../lib/candidateWork';

interface CandidateActionPanelProps {
  candidate: Candidate;
  readOnly?: boolean;
  loading?: boolean;
  onReject?: () => void;
  onHold?: (remarks: string) => Promise<void>;
  onSendToHo?: () => Promise<void>;
  onAdvance?: () => Promise<void>;
  onResume?: () => Promise<void>;
}

const ACTION_HINT: Record<string, string> = {
  SEND_TO_HO: 'Hands this candidate to Head Office HR and locks further branch edits.',
  RESUME_HOLD: 'Returns this candidate to the previous stage so work can continue.',
  ADVANCE_STAGE: 'Marks this stage done and moves the candidate to the next stage.',
  WORKSPACE: 'Finish this in Current task below. Hold and reject stay available here.',
  NONE: 'Pauses or ends this candidate without using the stage workspace below.',
};

export function CandidateActionPanel({
  candidate,
  readOnly = false,
  loading = false,
  onReject,
  onHold,
  onSendToHo,
  onAdvance,
  onResume,
}: CandidateActionPanelProps) {
  const [showHold, setShowHold] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [holding, setHolding] = useState(false);
  const [sending, setSending] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [resuming, setResuming] = useState(false);

  const workState = getCandidateWorkState(candidate);
  const actionKey = getCandidateActionKey(candidate);
  const terminal = ['REJECTED', 'HIRED'].includes(candidate.current_stage);
  const canHold = Boolean(onHold) && candidate.current_stage !== 'ON_HOLD';
  const canReject = Boolean(onReject);
  const canSend = actionKey === 'SEND_TO_HO' && Boolean(onSendToHo);
  const canAdvance = actionKey === 'ADVANCE_STAGE' && Boolean(onAdvance);
  const canResume = actionKey === 'RESUME_HOLD' && Boolean(onResume);
  const showWorkspaceHint = actionKey === 'WORKSPACE';

  if (readOnly || terminal || (!canHold && !canReject && !canSend && !canAdvance && !canResume && !showWorkspaceHint)) {
    return null;
  }

  const submitHold = async () => {
    if (!remarks.trim() || !onHold) return;
    setHolding(true);
    try {
      await onHold(remarks.trim());
      setRemarks('');
      setShowHold(false);
    } finally {
      setHolding(false);
    }
  };

  const submitSend = async () => {
    if (!onSendToHo) return;
    setSending(true);
    try {
      await onSendToHo();
      setShowSend(false);
    } finally {
      setSending(false);
    }
  };

  const submitAdvance = async () => {
    if (!onAdvance) return;
    setAdvancing(true);
    try {
      await onAdvance();
    } finally {
      setAdvancing(false);
    }
  };

  const submitResume = async () => {
    if (!onResume) return;
    setResuming(true);
    try {
      await onResume();
    } finally {
      setResuming(false);
    }
  };

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-4" aria-labelledby="candidate-actions-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="candidate-actions-title" className="text-sm font-bold text-foreground">
            {workState.next_action}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ACTION_HINT[actionKey] || ACTION_HINT.NONE}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSend && (
            <Button onClick={() => setShowSend(true)} disabled={loading}>
              <Send className="mr-1.5 h-3.5 w-3.5" /> {workState.next_action}
            </Button>
          )}
          {canAdvance && (
            <Button onClick={() => void submitAdvance()} disabled={loading} isLoading={advancing}>
              <Check className="mr-1.5 h-3.5 w-3.5" /> {workState.next_action}
            </Button>
          )}
          {canResume && (
            <Button onClick={() => void submitResume()} disabled={loading} isLoading={resuming}>
              <Play className="mr-1.5 h-3.5 w-3.5" /> {workState.next_action}
            </Button>
          )}
          {canHold && (
            <Button variant="secondary" size="sm" onClick={() => setShowHold(true)} disabled={loading}>
              <Pause className="mr-1.5 h-3.5 w-3.5" /> Hold candidate
            </Button>
          )}
          {canReject && (
            <Button variant="danger" size="sm" onClick={onReject} disabled={loading}>
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject candidate
            </Button>
          )}
        </div>
      </div>
      <Modal isOpen={showSend} onClose={() => setShowSend(false)} title="Send to Head Office HR" size="md">
        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
            You are about to send <strong>{candidate.full_name}</strong> to Head Office HR. This hands ownership to Head Office and locks branch edits.
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setShowSend(false)}>Cancel</Button>
            <Button onClick={() => void submitSend()} disabled={sending} isLoading={sending}>
              Send {candidate.full_name} to Head Office
            </Button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={showHold} onClose={() => setShowHold(false)} title="Place candidate on hold" description="This pauses active work until someone resumes the candidate." size="sm">
        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <strong>{candidate.full_name}</strong> will move to On Hold. Existing record history remains available, and the candidate can be resumed to the previous stage.
          </div>
          <label className="block text-sm font-semibold text-foreground">
            Hold reason <span className="text-danger">*</span>
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-border bg-background p-3 font-normal" placeholder="Explain why work is paused" />
          </label>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setShowHold(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => void submitHold()} disabled={!remarks.trim() || holding} isLoading={holding}>Place on hold</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
