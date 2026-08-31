import { AlertCircle, CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Candidate } from '../../types';
import { resendHeadOfficeForwardingEmail } from '../../api/candidates';
import { extractError } from '../../lib/utils';
import { Button } from '../ui';
import { formatDateTime } from '../../lib/dateTime';
import { useState } from 'react';

interface HeadOfficeForwardingEmailStatusProps {
  candidate: Candidate;
  onUpdate?: () => void;
}

export function HeadOfficeForwardingEmailStatus({ candidate, onUpdate }: HeadOfficeForwardingEmailStatusProps) {
  const [resending, setResending] = useState(false);
  const raw = candidate.profile?.raw_data;
  const status = String(raw?.headOfficeForwardingEmailStatus || '');
  const error = String(raw?.headOfficeForwardingEmailError || '');
  const sentAt = String(raw?.headOfficeForwardingEmailSentAt || '');
  const sentLabel = sentAt ? formatDateTime(sentAt) : '';
  const sent = status === 'SENT';

  const resend = async () => {
    setResending(true);
    try {
      await resendHeadOfficeForwardingEmail(candidate.id);
      toast.success('Head Office forwarding email sent again.');
      onUpdate?.();
    } catch (err) {
      toast.error(extractError(err, 'Could not send the Head Office forwarding email.'));
      onUpdate?.();
    } finally {
      setResending(false);
    }
  };

  return (
    <section className={`mb-6 rounded-xl border p-4 sm:p-5 ${sent ? 'border-success/25 bg-success/5' : 'border-danger/25 bg-danger/5'}`} aria-labelledby="head-office-forwarding-email-title">
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
            <h3 id="head-office-forwarding-email-title" className="mt-1 text-base font-bold text-text-primary">
              {sent ? 'Head Office forwarding email sent' : 'Head Office forwarding email needs attention'}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {sent
                ? `The interview update was sent to ${candidate.email || 'the candidate email address'}${sentLabel ? ` on ${sentLabel}` : ''}.`
                : error || 'The candidate was moved to Head Office, but the email was not sent.'}
            </p>
          </div>
        </div>
        <Button type="button" variant={sent ? 'secondary' : 'danger'} onClick={() => void resend()} isLoading={resending} disabled={!candidate.email}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {sent ? 'Send again' : 'Resend email'}
        </Button>
      </div>
      {!candidate.email && <p className="mt-3 text-xs font-medium text-danger">Add the candidate email address before retrying.</p>}
      <p className="mt-3 text-[11px] text-text-secondary">Subject: Update Regarding Interview – Nippon Toyota</p>
    </section>
  );
}
