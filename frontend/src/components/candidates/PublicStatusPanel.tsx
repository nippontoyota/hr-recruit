import { useState } from 'react';
import { AlertCircle, Check, CheckCircle2, ChevronDown, ChevronUp, Clock3, Copy, Loader2, RefreshCw, Save, Terminal } from 'lucide-react';
import { Button } from '../ui';
import { copyTextToClipboard, type DiagnosticErrorInfo } from '../../lib/utils';
import { toast } from 'sonner';

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
  diagnosticInfo,
  actionLabel,
  onAction,
  className = '',
}: {
  kind: PublicStatusKind;
  title?: string;
  message: string;
  diagnosticInfo?: DiagnosticErrorInfo;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = statusConfig[kind];
  const Icon = config.icon;

  const handleCopyDiagnostics = () => {
    if (!diagnosticInfo) return;
    const lines = [
      '=== HR RECRUIT DIAGNOSTIC REPORT ===',
      `Timestamp: ${diagnosticInfo.timestamp}`,
      `Title: ${diagnosticInfo.title}`,
      `Message: ${diagnosticInfo.message}`,
      diagnosticInfo.statusCode ? `Status Code: ${diagnosticInfo.statusCode}` : null,
      diagnosticInfo.detail ? `Server Detail: ${diagnosticInfo.detail}` : null,
      diagnosticInfo.endpoint ? `Endpoint: ${diagnosticInfo.endpoint}` : null,
      diagnosticInfo.url ? `URL: ${diagnosticInfo.url}` : null,
      `Device Online: ${diagnosticInfo.isOffline ? 'No (Offline)' : 'Yes (Online)'}`,
      diagnosticInfo.tokenSnippet ? `Token Reference: ${diagnosticInfo.tokenSnippet}` : null,
      diagnosticInfo.rawError ? `Raw Error: ${diagnosticInfo.rawError}` : null,
      '====================================',
    ].filter(Boolean).join('\n');

    void copyTextToClipboard(lines).then((ok) => {
      if (ok) {
        setCopied(true);
        toast.success('Diagnostic details copied to clipboard!');
        setTimeout(() => setCopied(false), 2500);
      } else {
        toast.error('Failed to copy to clipboard.');
      }
    });
  };

  return (
    <section className={`page-card p-6 sm:p-8 ${className}`} role={kind === 'loading' ? undefined : 'status'} aria-live="polite">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${config.tone}`}>
        <Icon className={`h-6 w-6 ${kind === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-center text-xl font-semibold text-text-primary">{title || config.title}</h1>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-6 text-text-secondary">{message}</p>

      {diagnosticInfo && (
        <div className="mt-5 max-w-lg mx-auto text-left w-full border border-border/80 rounded-lg overflow-hidden bg-muted/20">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              Technical / Diagnostic Details
            </span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDetails && (
            <div className="p-3.5 border-t border-border/60 bg-muted/40 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-border/40">
                <span className="text-[11px] uppercase tracking-wider text-text-secondary font-bold">Error Diagnosis</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyDiagnostics}
                  className="h-7 text-xs px-2 gap-1 text-primary hover:text-primary"
                >
                  {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy details'}
                </Button>
              </div>
              <div className="space-y-1.5 text-text-primary">
                {diagnosticInfo.statusCode ? (
                  <div className="flex gap-2">
                    <span className="text-text-secondary shrink-0 w-24">Status Code:</span>
                    <span className="font-semibold">{diagnosticInfo.statusCode}</span>
                  </div>
                ) : null}
                {diagnosticInfo.detail && (
                  <div className="flex gap-2">
                    <span className="text-text-secondary shrink-0 w-24">Server Detail:</span>
                    <span className="text-danger break-all">{diagnosticInfo.detail}</span>
                  </div>
                )}
                {diagnosticInfo.endpoint && (
                  <div className="flex gap-2">
                    <span className="text-text-secondary shrink-0 w-24">Endpoint:</span>
                    <span className="break-all">{diagnosticInfo.endpoint}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-text-secondary shrink-0 w-24">Connection:</span>
                  <span>{diagnosticInfo.isOffline ? 'Offline' : 'Online'}</span>
                </div>
                {diagnosticInfo.tokenSnippet && (
                  <div className="flex gap-2">
                    <span className="text-text-secondary shrink-0 w-24">Token:</span>
                    <span>{diagnosticInfo.tokenSnippet}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-text-secondary shrink-0 w-24">Timestamp:</span>
                  <span>{new Date(diagnosticInfo.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
