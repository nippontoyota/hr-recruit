import { AlertCircle, CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Candidate } from '../../types';
import { resendOnHoldEmail, resendRejectionEmail } from '../../api/candidates';
import { extractError } from '../../lib/utils';
import { Button } from '../ui';
import { formatDateTime } from '../../lib/dateTime';
import { useState } from 'react';

interface StageEmailStatusProps {
  candidate: Candidate;
  kind: 'REJECTED' | 'ON_HOLD';
  onUpdate?: () => void;
}

const COPY = {
  REJECTED: {
    statusKey: 'rejectionEmailStatus',
    errorKey: 'rejectionEmailError',
    sentAtKey: 'rejectionEmailSentAt',
    subject: 'Update on Your Application',
    sentTitle: 'Rejection email sent',
    failedTitle: 'Rejection email needs attention',
    resend: resendRejectionEmail,
    successToast: 'Rejection email sent again.',
    failToast: 'Could not send the rejection email.',
  },
  ON_HOLD: {
    statusKey: 'onHoldEmailStatus',
    errorKey: 'onHoldEmailError',
    sentAtKey: 'onHoldEmailSentAt',
    subject: 'Update on Your Application',
    sentTitle: 'On-hold email sent',
    failedTitle: 'On-hold email needs attention',
    resend: resendOnHoldEmail,
    successToast: 'On-hold email sent again.',
    failToast: 'Could not send the on-hold email.',
  },
} as const;

export function StageEmailStatus({ candidate, kind, onUpdate }: StageEmailStatusProps) {
  const [resending, setResending] = useState(false);
  const copy = COPY[kind];
  const raw = candidate.profile?.raw_data;
  const status = String(raw?.[copy.statusKey] || '');
  const error = String(raw?.[copy.errorKey] || '');
  const sentAt = String(raw?.[copy.sentAtKey] || '');
  const sentLabel = sentAt ? formatDateTime(sentAt) : '';
  const sent = status === 'SENT';

  if (!status) return null;

  const resend = async () => {
    setResending(true);
    try {
      await copy.resend(candidate.id);
      toast.success(copy.successToast);
      onUpdate?.();
    } catch (err) {
      toast.error(extractError(err, copy.failToast));
      onUpdate?.();
    } finally {
      setResending(false);
    }
  };

  return (
    <section className={`mb-6 rounded-xl border p-4 sm:p-5 ${sent ? 'border-success/25 bg-success/5' : 'border-danger/25 bg-danger/5'}`} aria-labelledby="stage-email-status-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 rounded-full p-2 ${sent ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {sent ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-text-secondary" />
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Candidate notification</p>
            </div>
            <h3 id="stage-email-status-title" className="mt-1 text-base font-bold text-text-primary">
              {sent ? copy.sentTitle : copy.failedTitle}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {sent
                ? `The notification was sent to ${candidate.email || 'the candidate email address'}${sentLabel ? ` on ${sentLabel}` : ''}.`
                : error || 'The candidate status was updated, but the email was not sent.'}
            </p>
          </div>
        </div>
        <Button type="button" variant={sent ? 'secondary' : 'danger'} onClick={() => void resend()} isLoading={resending} disabled={!candidate.email}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {sent ? 'Send again' : 'Resend email'}
        </Button>
      </div>
      {!candidate.email && <p className="mt-3 text-xs font-medium text-danger">Add the candidate email address before retrying.</p>}
      <p className="mt-3 text-[11px] text-text-secondary">Subject: {copy.subject}</p>
    </section>
  );
}
