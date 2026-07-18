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
          'w-full lg:w-[480px] xl:w-[520px] shrink-0 border-l border-border bg-[#f7f8fa] relative flex flex-col min-h-0 overflow-hidden',
          className
        )}
      >
        {/* Floating Header */}
        <div className="absolute top-0 inset-x-0 z-30 px-6 pt-5 pb-4 flex items-center justify-between bg-white/60 backdrop-blur-xl border-b border-black/5 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-foreground drop-shadow-sm">Live Preview</h2>
            <p className="mt-0.5 text-sm text-muted-foreground font-medium">
              Candidate&apos;s perspective
            </p>
          </div>
          <button
            type="button"
            onClick={openEditor}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-primary shadow-sm ring-1 ring-black/10 hover:bg-gray-50 hover:shadow transition-all"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        </div>

        {/* Full-size Phone Mockup */}
        <div className="absolute inset-0 z-10 flex justify-center py-8">
          <div className="relative flex w-full max-w-[380px] h-full flex-col overflow-hidden rounded-[48px] border-[14px] border-[#111] bg-[#EFE6DD] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)]">
            <div className="absolute top-[-2px] left-1/2 -translate-x-1/2 h-[28px] w-[140px] bg-[#111] rounded-b-[20px] z-20 flex items-center justify-center gap-3 pb-1">
              <div className="h-[10px] w-[10px] rounded-full bg-[#18181b] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] border border-white/5"></div>
              <div className="h-[6px] w-[44px] rounded-full bg-[#18181b] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] border border-white/5"></div>
            </div>

            <div className="flex h-[80px] shrink-0 items-end justify-between gap-1 bg-[#008069] px-3 pb-3 text-white z-10 shadow-md relative pt-6">
              <div className="flex items-center gap-1 cursor-pointer">
                <div className="flex items-center text-white" aria-label="Back">
                  <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ml-0.5 border border-white/20 shadow-sm">
                  <img src="/toyota-HR-profile.jpeg" alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 text-left ml-2.5">
                  <p className="truncate text-[16px] font-semibold leading-tight tracking-tight">Nippon Toyota HR</p>
                  <p className="text-[12px] leading-tight text-white/80 font-medium">Official Business Account</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-white mr-1 mb-1">
                <Video className="h-[22px] w-[22px]" fill="currentColor" strokeWidth={0} />
                <Phone className="h-[19px] w-[19px]" fill="currentColor" strokeWidth={0} />
                <MoreVertical className="h-5 w-5" />
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#EFE6DD]">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.4]"
                style={{
                  backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                  backgroundSize: '360px',
                  backgroundRepeat: 'repeat',
                }}
              />

              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-6 flex flex-col gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="mx-auto w-fit rounded-lg bg-[#F5F8FA] px-3 py-1.5 text-[11.5px] uppercase tracking-wider font-semibold text-[#54656F] shadow-sm ring-1 ring-black/5">
                  TODAY
                </div>

                <div className="relative max-w-[88%] animate-in slide-in-from-bottom-2 fade-in duration-300 rounded-2xl rounded-tl-sm bg-white p-3 text-left text-[15px] leading-relaxed text-[#111B21] shadow-sm ring-1 ring-black/5 mt-2 mb-4">
                  <svg viewBox="0 0 8 13" width="8" height="13" className="absolute -left-[8px] top-0 text-white fill-current drop-shadow-sm">
                    <path d="M5.188 1H0v11.156l4.969-4.72c1.781-1.687 3.031-4.03 3.031-6.436z" />
                  </svg>
                  <div className="whitespace-pre-wrap break-words pb-4">
                    <WhatsAppMessageBody text={message} />
                  </div>
                  <div className="absolute bottom-1.5 right-2.5 flex items-center gap-1.5">
                    <p className="text-[11px] font-medium text-[#667781] whitespace-nowrap">{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date()).toLowerCase()}</p>
                    <CheckCheck className="h-4 w-4 text-[#53BDEB]" strokeWidth={2.5} />
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 inset-x-0 z-10 flex shrink-0 items-end gap-2 p-3 bg-gradient-to-t from-[#EFE6DD] via-[#EFE6DD] to-transparent pb-6 pt-12 pointer-events-none">
                <div className="flex min-h-[44px] flex-1 items-center gap-2 rounded-[22px] bg-white px-3 py-1 shadow-sm ring-1 ring-black/5 pointer-events-auto">
                  <div className="p-1 text-[#8696A0] hover:text-[#54656F] transition-colors"><Smile className="h-6 w-6" /></div>
                  <div className="flex-1 text-[15px] text-[#8696A0] px-1 py-1 font-medium">Message</div>
                  <div className="p-1 text-[#8696A0] hover:text-[#54656F] transition-colors"><Paperclip className="h-5 w-5" /></div>
                  <div className="p-1 text-[#8696A0] hover:text-[#54656F] transition-colors"><Camera className="h-6 w-6" /></div>
                </div>
                <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white shadow-md hover:bg-[#008F6F] transition-colors cursor-pointer pointer-events-auto">
                  <Send className="h-5 w-5 mr-0.5" fill="currentColor" strokeWidth={0} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Footer */}
        <div className="absolute bottom-0 inset-x-0 z-30 p-5 bg-white/60 backdrop-blur-xl border-t border-black/5 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <Button
            className="w-full !bg-[#08796b] hover:!bg-[#06685c] h-12 text-[15px] rounded-xl shadow-lg shadow-[#08796b]/20"
            onClick={() => setIsConfirming(true)}
            isLoading={isSending}
          >
            <Send className="mr-2 h-5 w-5" />
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
