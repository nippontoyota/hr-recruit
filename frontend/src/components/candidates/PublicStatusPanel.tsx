import { AlertCircle, CheckCircle2, Clock3, Loader2, RefreshCw, Save } from 'lucide-react';
import { Button } from '../ui';

export type PublicStatusKind = 'loading' | 'error' | 'expired' | 'saved' | 'submitted' | 'retry';

const statusConfig: Record<PublicStatusKind, { icon: typeof Loader2; tone: string; title: string }> = {
  loading: { icon: Loader2, tone: 'text-text-secondary bg-muted/40', title: 'Loading' },
  error: { icon: AlertCircle, tone: 'text-danger bg-danger/10', title: 'Something went wrong' },
  expired: { icon: Clock3, tone: 'text-warning bg-warning/10', title: 'Link unavailable' },
  saved: { icon: Save, tone: 'text-primary bg-primary/10', title: 'Saved locally' },
  submitted: { icon: CheckCircle2, tone: 'text-success bg-success/10', title: 'Submitted' },
  retry: { icon: RefreshCw, tone: 'text-warning bg-warning/10', title: 'Action needs a retry' },
};

export function PublicStatusPanel({
  kind,
  title,
  message,
  actionLabel,
  onAction,
  className = '',
}: {
  kind: PublicStatusKind;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  const config = statusConfig[kind];
  const Icon = config.icon;
  return (
    <section className={`page-card p-6 sm:p-8 ${className}`} role={kind === 'loading' ? undefined : 'status'} aria-live="polite">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${config.tone}`}>
        <Icon className={`h-6 w-6 ${kind === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-center text-xl font-semibold text-text-primary">{title || config.title}</h1>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-6 text-text-secondary">{message}</p>
      {actionLabel && onAction && (
        <div className="mt-5 flex justify-center">
          <Button type="button" variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
      <p className="mt-5 text-center text-xs text-text-secondary">
        If you think this is unexpected, contact the HR recruiter who sent this link and mention the page you were trying to open.
      </p>
    </section>
  );
}
