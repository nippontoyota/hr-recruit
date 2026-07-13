import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Mic, Pencil, Send } from 'lucide-react';
import type { Candidate } from '../../types';
import { Button, Input, Modal } from '../ui';
import {
  buildWhatsAppMessage,
  defaultTemplateVars,
  isWhatsAppUrl,
  loadStoredTemplateVars,
  splitMessageLinks,
  storeTemplateVars,
  type WhatsAppTemplateVars,
} from '../../lib/whatsappTemplate';
import { useAuth } from '../../auth';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface WhatsAppPreviewPanelProps {
  candidate: Candidate;
  className?: string;
}

const FIELD_LABELS: Partial<Record<keyof WhatsAppTemplateVars, string>> = {
  candidateName: 'Candidate name',
  position: 'Position',
  visitDate: 'Arrival date',
  arrivalTime: 'Arrival time',
  branchName: 'Location',
  mapsLink: 'Google Maps link',
  extraInstructions: 'Instructions',
  recruiterName: 'Recruiter name',
};

const EDITABLE_FIELDS: (keyof WhatsAppTemplateVars)[] = [
  'candidateName',
  'position',
  'visitDate',
  'arrivalTime',
  'branchName',
  'mapsLink',
  'extraInstructions',
  'recruiterName',
];

function WhatsAppMessageBody({ text }: { text: string }) {
  const segments = splitMessageLinks(text);

  return (
    <>
      {segments.map((segment, index) => {
        if (isWhatsAppUrl(segment)) {
          return (
            <a
              key={`${segment}-${index}`}
              href={segment}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#027eb5] underline underline-offset-2 break-all hover:text-[#026aa3]"
            >
              {segment}
            </a>
          );
        }

        return <span key={`text-${index}`}>{segment}</span>;
      })}
    </>
  );
}

export function WhatsAppPreviewPanel({ candidate, className }: WhatsAppPreviewPanelProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const [vars, setVars] = useState<WhatsAppTemplateVars>(() => {
    const defaults = defaultTemplateVars({
      candidateName: candidate.full_name,
      position: candidate.position_applied_for,
      formLink: candidate.share_url || `${window.location.origin}/pre-form/pending`,
      branchName: 'Nippon Toyota Kochi - Edappally',
      mapsLink: 'https://maps.google.com/?q=Nippon+Toyota+Kochi+Edappally',
      recruiterName: user?.full_name,
    });

    return {
      ...defaults,
      visitDate: '18 July 2026',
      arrivalTime: '10:30 AM',
      ...loadStoredTemplateVars(candidate.id),
      formLink: candidate.share_url || defaults.formLink,
    };
  });
  const [draft, setDraft] = useState(vars);

  useEffect(() => {
    if (!candidate.share_url) return;
    setVars((current) => ({ ...current, formLink: candidate.share_url! }));
  }, [candidate.share_url]);

  useEffect(() => {
    storeTemplateVars(candidate.id, vars);
  }, [candidate.id, vars]);

  const message = useMemo(() => buildWhatsAppMessage(vars), [vars]);

  const openEditor = () => {
    setDraft(vars);
    setIsEditing(true);
  };

  const updateDraft = (key: keyof WhatsAppTemplateVars, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveDraft = () => {
    setVars({ ...draft, formLink: candidate.share_url || draft.formLink });
    setIsEditing(false);
    toast.success('Preview updated');
  };

  const confirmSend = () => {
    setIsConfirming(false);
    toast.info('Send backend is not connected yet.');
  };

  return (
    <>
      <aside
        className={cn(
          'w-full lg:w-[480px] xl:w-[520px] shrink-0 border-l border-border bg-[#f7f8fa] flex flex-col min-h-0',
          className
        )}
      >
        <div className="shrink-0 px-6 pt-5 pb-3 text-center">
          <h2 className="text-xl font-bold text-foreground">Live Preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This is how it appears on the candidate&apos;s phone.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 pb-3">
          <div className="mx-auto flex min-h-0 w-full max-w-[400px] flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[38px] border-[4px] border-[#343536] bg-[#efeae2] shadow-[0_18px_35px_rgba(17,24,39,0.18)]">
              <div className="flex h-[58px] shrink-0 items-center gap-2 bg-[#08796b] px-3 text-white">
                <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
                  <img src="/favicon.svg" alt="" className="h-6 w-6 object-contain" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-bold leading-tight">Nippon Toyota HR</p>
                  <p className="text-[10px] leading-tight text-white/85">Official Business Account</p>
                </div>
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#efeae2]">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.12]"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 10px 10px, #6d665f 0 3px, transparent 3.5px)',
                    backgroundSize: '28px 28px',
                  }}
                />

                <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-3">
                  <div className="mx-auto mb-4 w-fit rounded-full border border-[#d3d9dc] bg-[#e5f4fb] px-4 py-1 text-[10px] font-medium text-[#53636b] shadow-sm">
                    TODAY
                  </div>

                  <div className="relative max-w-[94%] rounded-lg rounded-tl-none bg-white px-3 py-3 text-left text-[12px] leading-[1.55] text-[#111b21] shadow-sm">
                    <span className="absolute -left-2 top-0 h-0 w-0 border-r-[9px] border-t-[9px] border-r-white border-t-transparent" />
                    <div className="whitespace-pre-wrap break-words">
                      <WhatsAppMessageBody text={message} />
                    </div>
                    <p className="mt-1 text-right text-[9px] text-[#667781]">{format(new Date(), 'h:mm a')}</p>
                  </div>
                </div>

                <div className="relative z-10 flex shrink-0 items-center gap-2 bg-[#f0f2f5] p-2">
                  <div className="flex h-9 flex-1 items-center rounded-full bg-white px-4 text-left text-xs text-[#8b98a1]">
                    Type a message
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white">
                    <Mic className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-center py-1">
              <button
                type="button"
                onClick={openEditor}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="h-4 w-4" />
                Edit content
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-white p-4">
          <Button
            className="w-full !bg-[#08796b] hover:!bg-[#06685c]"
            onClick={() => setIsConfirming(true)}
          >
            <Send className="mr-2 h-4 w-4" />
            Send to candidate
          </Button>
        </div>
      </aside>

      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit WhatsApp content"
        description="Changes update this preview only. Sending remains disconnected."
        size="md"
      >
        <div className="max-h-[72vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {EDITABLE_FIELDS.map((key) => (
              <div
                key={key}
                className={key === 'mapsLink' || key === 'extraInstructions' ? 'sm:col-span-2' : undefined}
              >
                <label className="form-label">{FIELD_LABELS[key]}</label>
                {key === 'extraInstructions' ? (
                  <textarea
                    value={draft[key]}
                    onChange={(event) => updateDraft(key, event.target.value)}
                    className="min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <Input value={draft[key]} onChange={(event) => updateDraft(key, event.target.value)} />
                )}
              </div>
            ))}

            <div className="sm:col-span-2">
              <label className="form-label">Candidate form link</label>
              <Input value={candidate.share_url || draft.formLink} readOnly disabled />
              <p className="mt-1.5 text-xs text-muted-foreground">Uses this candidate&apos;s generated form link.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={saveDraft}>Save changes</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isConfirming}
        onClose={() => setIsConfirming(false)}
        title="Send WhatsApp message?"
        description={`Send this message to ${candidate.full_name} at +91 ${candidate.phone}?`}
        size="sm"
      >
        <div className="p-6">
          <p className="text-sm leading-6 text-muted-foreground">
            Review the preview before confirming. The messaging backend is not connected yet.
          </p>
          <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setIsConfirming(false)}>No, go back</Button>
            <Button className="!bg-[#08796b] hover:!bg-[#06685c]" onClick={confirmSend}>
              Yes, send
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
