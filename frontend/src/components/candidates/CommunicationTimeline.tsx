import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Clock3, Mail, MessageCircle, Paperclip, RefreshCw, UserRound } from 'lucide-react';
import type { Candidate } from '../../types';
import { getCandidateCommunications, type CommunicationRecord } from '../../api/candidates';
import { LoadingSpinner } from '../ui';
import { cn } from '../../lib/utils';
import { formatDateTime } from '../../lib/dateTime';

interface CommunicationTimelineProps {
  candidateId: string;
  candidate?: Candidate;
}

function statusLabel(status: CommunicationRecord['status']) {
  return status === 'SENT' ? 'Accepted by provider' : status.toLowerCase().replace('_', ' ');
}

function statusClass(status: CommunicationRecord['status']) {
  if (status === 'FAILED') return 'border-danger/30 bg-danger/5 text-danger';
  if (status === 'PENDING') return 'border-warning/30 bg-warning/5 text-warning-foreground';
  return 'border-success/30 bg-success/5 text-success';
}

function channelIcon(channel: CommunicationRecord['channel']) {
  return channel === 'EMAIL' ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />;
}

function formatDate(value: string) {
  return formatDateTime(value);
}

function ChecklistItem({ label, ready, detail }: { label: string; ready: boolean; detail: string }) {
  return (
    <li className="flex items-start gap-2 text-xs">
      {ready ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> : <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />}
      <span><strong>{label}:</strong> {detail}</span>
    </li>
  );
}

function OfferReadinessChecklist({ candidate }: { candidate: Candidate }) {
  const hasSalary = Boolean(candidate.salary_data && Object.keys(candidate.salary_data).length);
  const hasBlockers = (candidate.offer_blockers?.length ?? 0) > 0;
  return (
    <section className="mb-4 rounded-lg border border-border bg-muted/20 p-3" aria-labelledby="offer-readiness-heading">
      <div className="mb-2 flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <h4 id="offer-readiness-heading" className="text-xs font-bold uppercase tracking-wide">Offer communication readiness</h4>
      </div>
      <ul className="space-y-2 text-muted-foreground">
        <ChecklistItem label="Email" ready={Boolean(candidate.email)} detail={candidate.email ? `Recipient ${candidate.email}` : 'Candidate email is missing.'} />
        <ChecklistItem label="CC" ready={false} detail="Server CC recipients are not exposed; verify configuration before sending." />
        <ChecklistItem label="Attachment" ready={hasSalary && !hasBlockers} detail={hasSalary && !hasBlockers ? 'Offer data is available for PDF generation.' : 'Salary data or offer prerequisites are missing.'} />
        <ChecklistItem label="WhatsApp" ready={false} detail={candidate.phone ? 'Phone is present; server provider configuration still needs verification.' : 'Candidate phone is missing.'} />
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">This checklist describes local readiness only. It does not confirm delivery.</p>
    </section>
  );
}

export function CommunicationTimeline({ candidateId, candidate }: CommunicationTimelineProps) {
  const [items, setItems] = useState<CommunicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    getCandidateCommunications(candidateId)
      .then((data) => { if (active) setItems(data); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [candidateId]);

  return (
    <section aria-labelledby="communication-timeline-heading">
      {candidate && <OfferReadinessChecklist candidate={candidate} />}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id="communication-timeline-heading" className="text-sm font-bold">Communication history</h3>
        <span className="text-[11px] text-muted-foreground">Newest first</span>
      </div>
      {loading && <div className="flex justify-center py-6" role="status" aria-label="Loading communication history"><LoadingSpinner size="sm" /></div>}
      {!loading && failed && <p className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-xs text-danger">Communication history could not be loaded.</p>}
      {!loading && !failed && items.length === 0 && (
        <p className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" />No communication records yet.</p>
      )}
      {!loading && !failed && items.length > 0 && (
        <ol className="space-y-3" aria-label="Candidate communication history">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-muted-foreground" aria-hidden="true">{channelIcon(item.channel)}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{item.type.replace('_', ' ')} · {item.direction.toLowerCase()}</p>
                    <p className="truncate text-[11px] text-muted-foreground">To: {item.recipient || 'Recipient not recorded'}</p>
                  </div>
                </div>
                <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', statusClass(item.status))}>
                  {statusLabel(item.status)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-foreground">{item.preview || item.content_preview}</p>
              <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                <p>{item.sent_at ? 'Sent' : 'Created'}: {formatDate(item.sent_at || item.created_at)}</p>
                {item.sender && <p className="flex items-center gap-1"><UserRound className="h-3 w-3" />Sender: {item.sender}</p>}
                {item.failure_reason && <p className="text-danger">Failure reason: {item.failure_reason}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground"><RefreshCw className="h-3 w-3" />Use the action in the relevant stage to resend a failed message.</p>
    </section>
  );
}
