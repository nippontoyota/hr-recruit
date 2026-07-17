import { useEffect, useMemo, useState } from 'react';

import { ArrowLeft, Pencil, Send, Video, Phone, MoreVertical, Smile, Paperclip, Camera, CheckCheck } from 'lucide-react';
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
import { sendWhatsAppInvite } from '../../api/candidates';

interface WhatsAppPreviewPanelProps {
  candidate: Candidate;
  className?: string;
  inviteType?: 'pre' | 'post';
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

function renderWhatsAppFormatting(text: string) {
  const parts = text.split(/\*(.*?)\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-bold">{part}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

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

        return <span key={`text-${index}`}>{renderWhatsAppFormatting(segment)}</span>;
      })}
    </>
  );
}

export function WhatsAppPreviewPanel({ candidate, className, inviteType = 'pre' }: WhatsAppPreviewPanelProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [vars, setVars] = useState<WhatsAppTemplateVars>(() => {
    const linkToUse = inviteType === 'post' ? candidate.post_share_url : candidate.share_url;
    const defaults = defaultTemplateVars({
      candidateName: candidate.full_name,
      position: candidate.position_applied_for,
      formLink: linkToUse || `${window.location.origin}/#/${inviteType}-form/pending`,
      branchName: 'Nippon Toyota Kochi - Edappally',
      mapsLink: 'https://maps.google.com/?q=Nippon+Toyota+Kochi+Edappally',
      recruiterName: user?.full_name,
      inviteType,
    });

    return {
      ...defaults,
      ...loadStoredTemplateVars(candidate.id),
      formLink: linkToUse || defaults.formLink,
      inviteType,
    };
  });
  const [draft, setDraft] = useState(vars);

  useEffect(() => {
    const linkToUse = inviteType === 'post' ? candidate.post_share_url : candidate.share_url;
    if (!linkToUse) return;
    setVars((current) => ({ ...current, formLink: linkToUse! }));
  }, [candidate.share_url, candidate.post_share_url, inviteType]);

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
    const linkToUse = inviteType === 'post' ? candidate.post_share_url : candidate.share_url;
    setVars({ ...draft, formLink: linkToUse || draft.formLink });
    setIsEditing(false);
    toast.success('Preview updated');
  };

  const confirmSend = async () => {
    setIsConfirming(false);
    setIsSending(true);
    try {
      await sendWhatsAppInvite(candidate.id, vars as unknown as Record<string, string>);
      toast.success('WhatsApp invitation sent successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Failed to send WhatsApp invitation.');
    } finally {
      setIsSending(false);
    }
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
          <div className="mx-auto flex min-h-[640px] w-full max-w-[340px] flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[38px] border-[6px] border-[#18181b] bg-[#efeae2] shadow-[0_20px_40px_rgba(17,24,39,0.2)] relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[20px] w-[110px] bg-[#18181b] rounded-b-[16px] z-20"></div>

              <div className="flex h-[64px] shrink-0 items-center justify-between gap-1 bg-[#075E54] px-2 pt-4 text-white z-10 shadow-sm relative">
                <div className="flex items-center gap-1 cursor-pointer">
                  <div className="flex items-center text-white ml-0.5" aria-label="Back">
                    <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ml-0.5 border border-white/20">
                    <img src="/toyota-HR-profile.jpeg" alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 text-left ml-2">
                    <p className="truncate text-[15px] font-medium leading-tight">Nippon Toyota HR</p>
                    <p className="text-[11px] leading-tight text-white/90">Official Business Account</p>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 text-white mr-2">
                  <Video className="h-5 w-5" fill="currentColor" strokeWidth={0} />
                  <Phone className="h-[18px] w-[18px]" fill="currentColor" strokeWidth={0} />
                  <MoreVertical className="h-5 w-5" />
                </div>
              </div>

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#efeae2]">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.25]"
                  style={{
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                    backgroundSize: '300px',
                    backgroundRepeat: 'repeat',
                  }}
                />

                <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 flex flex-col gap-3">
                  <div className="mx-auto w-fit rounded-lg bg-[#E1F3FB] px-3 py-1.5 text-[11px] uppercase tracking-wide font-medium text-[#55656E] shadow-sm">
                    TODAY
                  </div>

                  <div className="relative max-w-[88%] rounded-xl rounded-tl-sm bg-white px-2.5 py-2 text-left text-[14.5px] leading-[1.3] text-[#111b21] shadow-sm mt-1">
                    <span className="absolute -left-2 top-0 h-0 w-0 border-r-[10px] border-t-[12px] border-r-white border-t-transparent" />
                    <div className="whitespace-pre-wrap break-words pb-4">
                      <WhatsAppMessageBody text={message} />
                    </div>
                    <div className="absolute bottom-1 right-2 flex items-center gap-1">
                      <p className="text-[10px] text-[#667781] whitespace-nowrap">{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date()).toLowerCase()}</p>
                      <CheckCheck className="h-[15px] w-[15px] text-[#34B7F1]" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex shrink-0 items-end gap-1.5 p-2 bg-transparent pb-3">
                  <div className="flex min-h-[42px] flex-1 items-center gap-2 rounded-full bg-white px-2 py-1 shadow-sm">
                    <div className="p-1.5 text-[#8696A0]"><Smile className="h-[22px] w-[22px]" /></div>
                    <div className="flex-1 text-[15px] text-[#8696A0] px-1 py-1">Message</div>
                    <div className="p-1.5 text-[#8696A0]"><Paperclip className="h-5 w-5" /></div>
                    <div className="p-1.5 text-[#8696A0]"><Camera className="h-[22px] w-[22px]" /></div>
                  </div>
                  <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-sm mb-[2px]">
                    <Send className="h-[18px] w-[18px] mr-0.5" fill="currentColor" strokeWidth={0} />
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
            isLoading={isSending}
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
        description="Changes update this preview only."
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
              <label className="form-label flex items-center gap-1.5">
                <img src="/link-icon.png" alt="Link" className="w-4 h-4 object-contain" />
                Candidate form link
              </label>
              <Input value={(inviteType === 'post' ? candidate.post_share_url : candidate.share_url) || draft.formLink} readOnly disabled />
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
            Review the preview before confirming.
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
