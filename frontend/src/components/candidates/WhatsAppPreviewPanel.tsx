import { useEffect, useMemo, useRef, useState } from 'react';

import { ArrowLeft, Pencil, Send, Video, Phone, MoreVertical, Smile, Paperclip, Camera, CheckCheck, Trash2, Link, Loader2 } from 'lucide-react';
import type { Candidate } from '../../types';
import { formatTime } from '../../lib/dateTime';
import { Button, Input, Modal, Select } from '../ui';
import {
  buildWhatsAppMessage,
  canSendWhatsAppInvite,
  formatVisitDate,
  isWhatsAppUrl,
  mergeWhatsAppVars,
  openWhatsAppChat,
  positionForWhatsApp,
  sanitizeWhatsAppPosition,
  splitMessageLinks,
  storeTemplateVars,
  toDateInputValue,
  whatsappInviteFieldErrors,
  type WhatsAppTemplateVars,
} from '../../lib/whatsappTemplate';
import { WhatsAppSendChoices } from './WhatsAppSendChoices';
import { useAuth } from '../../auth';
import { toast } from 'sonner';
import { cn, extractError, isAbortError, copyTextToClipboard } from '../../lib/utils';
import { sendPreForm, sendWhatsAppInvite, saveWhatsAppTemplate, confirmWhatsAppInvite } from '../../api/candidates';
import {
  createLocation,
  deleteLocation,
  listLocations,
  type LocationTemplateRow,
  createTouchpoint,
  deleteTouchpoint,
  listTouchpoints,
  type TouchpointTemplateRow,
} from '../../api/settings';
interface WhatsAppPreviewPanelProps {
  candidate: Candidate;
  className?: string;
  onUpdate?: () => void;
  isReadOnly?: boolean;
}

const FIELD_LABELS: Partial<Record<keyof WhatsAppTemplateVars, string>> = {
  candidateName: 'Candidate name',
  position: 'Position',
  visitDate: 'Visit date',
  arrivalTime: 'Arrival time',
  recruiterName: 'Recruiter name',
};

const EDITABLE_FIELDS: (keyof WhatsAppTemplateVars)[] = [
  'candidateName',
  'position',
  'arrivalTime',
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

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="text-xs text-danger mt-1" role="alert">
      {error}
    </p>
  );
}

function varsForCandidate(candidate: Candidate, recruiterName?: string | null): WhatsAppTemplateVars {
  return mergeWhatsAppVars({
    candidateId: candidate.id,
    fullName: candidate.full_name,
    positionAppliedFor: candidate.position_applied_for,
    department: candidate.department,
    experience: candidate.experience,
    shareUrl: candidate.share_url,
    visitBranch: candidate.visit_branch,
    visitDate: candidate.visit_date,
    visitTime: candidate.visit_time,
    visitMapsLink: candidate.visit_maps_link,
    visitInstructions: candidate.visit_instructions,
    extraInstructions: candidate.screening?.extra_instructions,
    storedTemplate: candidate.profile?.raw_data?.whatsapp_template || null,
    recruiterName,
  });
}

export function WhatsAppPreviewPanel({ candidate, className, onUpdate, isReadOnly = false }: WhatsAppPreviewPanelProps) {
  const { user } = useAuth();
  const branch = user?.branch_location || candidate.branch_location || null;
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [places, setPlaces] = useState<LocationTemplateRow[]>([]);
  const [touchpoints, setTouchpoints] = useState<TouchpointTemplateRow[]>([]);
  const [touchpointName, setTouchpointName] = useState('');
  const [showTouchPoint2, setShowTouchPoint2] = useState(false);

  const refreshPlaces = async () => {
    try {
      setPlaces(await listLocations(branch));
    } catch (err) {
      if (isAbortError(err)) return;
      toast.error(extractError(err, 'Failed to load locations'));
    }
  };

  const refreshTouchpoints = async () => {
    try {
      setTouchpoints(await listTouchpoints(branch));
    } catch (err) {
      if (isAbortError(err)) return;
      toast.error(extractError(err, 'Failed to load touch points'));
    }
  };

  const candidatePosition = () =>
    positionForWhatsApp({
      positionAppliedFor: candidate.position_applied_for,
      department: candidate.department,
      experience: candidate.experience,
    });

  const [vars, setVars] = useState<WhatsAppTemplateVars>(() => varsForCandidate(candidate, user?.full_name));
  const [draft, setDraft] = useState(vars);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [whatsAppOpened, setWhatsAppOpened] = useState(false);
  const awaitingWhatsAppReturn = useRef(false);

  useEffect(() => {
    const next = varsForCandidate(candidate, user?.full_name);
    setVars(next);
    if (!isEditing) setDraft(next);
  }, [
    candidate.id,
    candidate.full_name,
    candidate.share_url,
    candidate.position_applied_for,
    candidate.department,
    candidate.experience,
    candidate.visit_branch,
    candidate.visit_date,
    candidate.visit_time,
    candidate.visit_maps_link,
    candidate.visit_instructions,
    candidate.screening?.extra_instructions,
    candidate.profile?.raw_data,
    user?.full_name,
    isEditing,
  ]);

  const message = useMemo(() => buildWhatsAppMessage(vars), [vars]);
  const inviteErrors = whatsappInviteFieldErrors(vars);
  const draftErrors = whatsappInviteFieldErrors(draft);
  const readyToSend = canSendWhatsAppInvite(vars);
  const callLetterNotIssued =
    candidate.pre_form_status !== 'SENT' &&
    candidate.pre_form_status !== 'VIEWED' &&
    candidate.pre_form_status !== 'SUBMITTED';

  useEffect(() => {
    const onReturn = () => {
      if (!awaitingWhatsAppReturn.current) return;
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      awaitingWhatsAppReturn.current = false;
      setShowSendConfirm(true);
    };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, []);

  const openEditor = () => {
    const next = varsForCandidate(candidate, user?.full_name);
    setDraft(next);
    setShowTouchPoint2(!!next.touchPoint2.trim());
    setTouchpointName('');
    void refreshPlaces();
    void refreshTouchpoints();
    setIsEditing(true);
  };

  const updateDraft = (key: keyof WhatsAppTemplateVars, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const selectPlace = (id: string) => {
    const place = places.find((p) => p.id === id);
    if (!place) {
      setDraft((current) => ({ ...current, branchName: '', mapsLink: '' }));
      return;
    }
    setDraft((current) => ({
      ...current,
      branchName: place.name,
      mapsLink: place.location_or_link,
    }));
  };

  const handleSavePlace = async () => {
    if (!draft.branchName.trim() || !draft.mapsLink.trim()) {
      toast.error('Enter both location name and maps link');
      return;
    }
    try {
      const row = await createLocation({
        name: draft.branchName,
        location_or_link: draft.mapsLink,
        branch,
      });
      setPlaces(await listLocations(branch));
      const locationFields = { branchName: row.name, mapsLink: row.location_or_link };
      setDraft((current) => ({ ...current, ...locationFields }));
      const nextVars = { ...vars, ...locationFields };
      setVars(nextVars);
      storeTemplateVars(candidate.id, nextVars);
      toast.success('Location saved for this branch');
    } catch (err) {
      toast.error(extractError(err, 'Failed to save location'));
    }
  };

  const handleRemovePlace = async (place: LocationTemplateRow) => {
    try {
      await deleteLocation(place.id, branch);
      setPlaces(await listLocations(branch));
      if (draft.branchName.toLowerCase() === place.name.toLowerCase()) {
        setDraft((current) => ({ ...current, branchName: '', mapsLink: '' }));
      }
      toast.success('Location removed');
    } catch (err) {
      toast.error(extractError(err, 'Failed to remove location'));
    }
  };

  const selectTouchpoint = (id: string) => {
    const preset = touchpoints.find((p) => p.id === id);
    if (!preset) {
      setDraft((current) => ({ ...current, meetingPoint: '', touchPoint1: '', touchPoint2: '' }));
      setShowTouchPoint2(false);
      return;
    }
    const touchPoint2 = preset.touch_point_2_label
      ? [preset.touch_point_2_label, preset.touch_point_2_phone].filter(Boolean).join(' ')
      : '';
    setDraft((current) => ({
      ...current,
      meetingPoint: preset.meeting_point,
      touchPoint1: [preset.touch_point_1_label, preset.touch_point_1_phone].filter(Boolean).join(' '),
      touchPoint2,
    }));
    setShowTouchPoint2(!!touchPoint2);
  };

  const handleSaveTouchpoint = async () => {
    if (!touchpointName.trim()) {
      toast.error('Name this preset before saving (e.g. the branch name)');
      return;
    }
    if (!draft.meetingPoint.trim() || !draft.touchPoint1.trim()) {
      toast.error('Enter a Meeting Point and Touch Point 1');
      return;
    }
    try {
      const row = await createTouchpoint({
        name: touchpointName,
        meeting_point: draft.meetingPoint,
        touch_point_1_label: draft.touchPoint1,
        ...(showTouchPoint2 && draft.touchPoint2.trim() ? { touch_point_2_label: draft.touchPoint2 } : {}),
        branch,
      });
      setTouchpoints(await listTouchpoints(branch));
      const nextVars = {
        ...vars,
        meetingPoint: row.meeting_point,
        touchPoint1: [row.touch_point_1_label, row.touch_point_1_phone].filter(Boolean).join(' '),
        touchPoint2: row.touch_point_2_label
          ? [row.touch_point_2_label, row.touch_point_2_phone].filter(Boolean).join(' ')
          : '',
      };
      setVars(nextVars);
      storeTemplateVars(candidate.id, nextVars);
      toast.success('Meeting/Touch Points saved for this branch');
    } catch (err) {
      toast.error(extractError(err, 'Failed to save touch points'));
    }
  };

  const handleRemoveTouchpoint = async (preset: TouchpointTemplateRow) => {
    try {
      await deleteTouchpoint(preset.id, branch);
      setTouchpoints(await listTouchpoints(branch));
      toast.success('Touch point preset removed');
    } catch (err) {
      toast.error(extractError(err, 'Failed to remove touch point preset'));
    }
  };

  const applyFormLink = (url: string) => {
    updateDraft('formLink', url);
    setVars((current) => {
      const next = { ...current, formLink: url };
      storeTemplateVars(candidate.id, { ...draft, formLink: url });
      return next;
    });
  };

  const issuedFormLink =
    [candidate.share_url, draft.formLink, vars.formLink].find((value) => isWhatsAppUrl(value || '')) || '';

  const handleGenerateFormLink = async () => {
    if (generatingLink) return;
    setGeneratingLink(true);
    try {
      const updated = await sendPreForm(candidate.id);
      const url = updated?.share_url || '';
      if (!url) {
        toast.error('Link was issued but no URL came back.');
        return;
      }
      applyFormLink(url);
      toast.success(issuedFormLink ? 'Form link regenerated' : 'Form link generated');
      onUpdate?.();
    } catch (err) {
      toast.error(extractError(err, 'Failed to generate form link'));
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyFormLink = async () => {
    const url = issuedFormLink;
    if (!url) {
      toast.error('Generate the form link first');
      return;
    }
    const copiedOk = await copyTextToClipboard(url);
    if (copiedOk) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Form link copied');
    } else {
      toast.error('Failed to copy link');
    }
  };

  const persistTemplate = async (next: WhatsAppTemplateVars) => {
    storeTemplateVars(candidate.id, next);
    const saved = await saveWhatsAppTemplate(candidate.id, {
      ...next,
      visitDate: toDateInputValue(next.visitDate) || next.visitDate,
    });
    onUpdate?.();
    return saved;
  };

  const saveDraft = async () => {
    const next = {
      ...draft,
      position: sanitizeWhatsAppPosition(draft.position),
      branchName: draft.branchName.trim(),
      mapsLink: draft.mapsLink.trim(),
      formLink: candidate.share_url || draft.formLink,
    };
    setIsSaving(true);
    try {
      await persistTemplate(next);
      setVars(next);
      setIsEditing(false);
      toast.success('WhatsApp details saved for this candidate');
    } catch (err) {
      toast.error(extractError(err, 'Failed to save WhatsApp details'));
      return;
    } finally {
      setIsSaving(false);
    }

    if (next.branchName && next.mapsLink) {
      const alreadySaved = places.some(
        (place) =>
          place.name.toLowerCase() === next.branchName.toLowerCase() &&
          place.location_or_link.trim() === next.mapsLink
      );
      if (!alreadySaved) {
        void createLocation({
          name: next.branchName,
          location_or_link: next.mapsLink,
          branch,
        }).catch(() => {
          /* preview already saved locally */
        });
      }
    }
  };

  const sendViaDoubleTick = async () => {
    if (!canSendWhatsAppInvite(vars)) {
      return;
    }
    setIsSending(true);
    try {
      await sendWhatsAppInvite(candidate.id, vars as unknown as Record<string, string>);
      setShowSendConfirm(false);
      setWhatsAppOpened(false);
      toast.success('Call letter issued via DoubleTick');
      onUpdate?.();
    } catch (err: any) {
      console.error(err);
      toast.error(extractError(err, 'Failed to send WhatsApp invitation.'), { duration: 8000 });
    } finally {
      setIsSending(false);
    }
  };

  const openInWhatsApp = () => {
    if (!canSendWhatsAppInvite(vars)) {
      return;
    }
    if (!candidate.phone) {
      return;
    }
    const opened = openWhatsAppChat(candidate.phone, message);
    if (!opened) {
      toast.error('WhatsApp did not open. Allow pop-ups, then try again.');
      return;
    }
    awaitingWhatsAppReturn.current = true;
    setWhatsAppOpened(true);
    toast.success('Opened WhatsApp with the message ready to send');
  };

  const confirmWhatsAppSent = async () => {
    setConfirmingSend(true);
    try {
      await confirmWhatsAppInvite(candidate.id, vars as unknown as Record<string, string>);
      setShowSendConfirm(false);
      setWhatsAppOpened(false);
      toast.success('Call letter issued, waiting for candidate response');
      onUpdate?.();
    } catch (err) {
      toast.error(extractError(err, 'Failed to record that the WhatsApp message was sent'));
    } finally {
      setConfirmingSend(false);
    }
  };

  return (
    <>
      <aside
        className={cn(
          'w-full shrink-0 border-l border-border bg-[#f7f8fa] flex flex-col min-h-0 overflow-hidden',
          className
        )}
      >
        <div className="shrink-0 px-6 pt-5 pb-4 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-black/5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Send Call Letter</h2>
            <p className="mt-0.5 text-sm text-muted-foreground font-medium">
              Candidate&apos;s perspective
            </p>
          </div>
          {!isReadOnly && (
          <button
            type="button"
            onClick={openEditor}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-primary shadow-sm ring-1 ring-black/10 hover:bg-gray-50 hover:shadow transition-all"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          )}
        </div>

        <div className="flex-1 min-h-0 flex justify-center px-6 py-4 overflow-hidden">
          <div className="relative flex w-full max-w-[340px] h-full flex-col overflow-hidden rounded-[38px] border-[6px] border-[#18181b] bg-[#efeae2] shadow-[0_20px_40px_rgba(17,24,39,0.2)]">
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

              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 flex flex-col gap-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="mx-auto w-fit rounded-lg bg-[#E1F3FB] px-3 py-1.5 text-[11px] uppercase tracking-wide font-medium text-[#55656E] shadow-sm">
                  TODAY
                </div>

                <div className="relative max-w-[88%] rounded-xl rounded-tl-sm bg-white px-2.5 py-2 text-left text-[14.5px] leading-[1.3] text-[#111b21] shadow-sm mt-1">
                  <span className="absolute -left-2 top-0 h-0 w-0 border-r-[10px] border-t-[12px] border-r-white border-t-transparent" />
                  <div className="whitespace-pre-wrap break-words pb-4">
                    <WhatsAppMessageBody text={message} />
                  </div>
                  <div className="absolute bottom-1 right-2 flex items-center gap-1">
                    <p className="text-[10px] text-[#667781] whitespace-nowrap">{formatTime(new Date())}</p>
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
        </div>

        {!isReadOnly && (
        <div className="shrink-0 border-t border-border bg-white p-4 space-y-2">
          {(!readyToSend || !candidate.phone) && (
            <ul className="space-y-1 text-xs text-danger">
              {inviteErrors.position && <li>{inviteErrors.position} Set it in Edit.</li>}
              {inviteErrors.visitDate && <li>{inviteErrors.visitDate} Set it in Edit.</li>}
              {inviteErrors.branchName && <li>{inviteErrors.branchName} Set it in Edit.</li>}
              {!candidate.phone && <li>Phone number is required to open WhatsApp.</li>}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            {callLetterNotIssued
              ? 'Opening WhatsApp prepares the message. Confirm after you send it.'
              : 'Call letter issued, waiting for candidate response.'}
          </p>
          <WhatsAppSendChoices
            stacked
            onDoubleTick={() => void sendViaDoubleTick()}
            onOpenWhatsApp={openInWhatsApp}
            doubleTickLoading={isSending}
            disabled={!readyToSend}
            openWhatsAppDisabled={!candidate.phone}
          />
          {callLetterNotIssued && whatsAppOpened && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => void confirmWhatsAppSent()}
              isLoading={confirmingSend}
              disabled={confirmingSend || !readyToSend}
            >
              I sent this on WhatsApp
            </Button>
          )}
        </div>
        )}
      </aside>

      <Modal
        isOpen={showSendConfirm && callLetterNotIssued}
        onClose={() => setShowSendConfirm(false)}
        title="Did you send the WhatsApp message?"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-foreground">
            WhatsApp opened with the call letter ready. Confirm only if you actually sent it to {candidate.full_name}.
          </p>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setShowSendConfirm(false)} disabled={confirmingSend}>
              Not yet
            </Button>
            <Button onClick={() => void confirmWhatsAppSent()} isLoading={confirmingSend} disabled={confirmingSend}>
              Yes, I sent it
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit WhatsApp content"
        description="Changes are saved on this candidate so they show up on every computer."
        size="md"
      >
        <div className="max-h-[72vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label form-label-required">{FIELD_LABELS.visitDate}</label>
              <Input
                type="date"
                error={!!draftErrors.visitDate}
                value={toDateInputValue(draft.visitDate)}
                onChange={(event) => {
                  const raw = event.target.value;
                  updateDraft('visitDate', raw ? formatVisitDate(raw) : '');
                }}
              />
              <FieldError error={draftErrors.visitDate} />
            </div>

            {EDITABLE_FIELDS.map((key) => {
              const required = key === 'position';
              const fieldError = required ? draftErrors.position : undefined;
              return (
              <div
                key={key}
                className={key === 'extraInstructions' ? 'sm:col-span-2' : undefined}
              >
                <label className={cn('form-label', required && 'form-label-required')}>{FIELD_LABELS[key]}</label>
                {key === 'extraInstructions' ? (
                  <textarea
                    value={draft[key]}
                    onChange={(event) => updateDraft(key, event.target.value)}
                    className="min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <Input
                    value={draft[key]}
                    error={!!fieldError}
                    placeholder={key === 'position' ? 'Enter position applied for (e.g. Service Advisor)' : undefined}
                    onChange={(event) => updateDraft(key, event.target.value)}
                  />
                )}
                <FieldError error={fieldError} />
              </div>
              );
            })}

            <div className={cn(
              'sm:col-span-2 space-y-3 rounded-lg border p-3',
              draftErrors.branchName ? 'border-danger' : 'border-border'
            )}>
              <label className="form-label form-label-required">Location (name + maps link)</label>
              <Select
                value={places.find((p) => p.name === draft.branchName)?.id || ''}
                onChange={(event) => selectPlace(event.target.value)}
                searchable
                error={!!draftErrors.branchName}
              >
                <option value="">Select location…</option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </Select>

              <ul className="space-y-1">
                {places.map((place) => (
                  <li
                    key={place.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm"
                  >
                    <span className="truncate font-medium">{place.name}</span>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemovePlace(place)}
                      title={`Remove ${place.name}`}
                      aria-label={`Remove ${place.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  placeholder="Location name"
                  error={!!draftErrors.branchName}
                  value={draft.branchName}
                  onChange={(event) => updateDraft('branchName', event.target.value)}
                />
                <Input
                  placeholder="Maps link"
                  error={!!draftErrors.branchName}
                  value={draft.mapsLink}
                  onChange={(event) => updateDraft('mapsLink', event.target.value)}
                />
                <Button type="button" variant="secondary" onClick={handleSavePlace}>
                  Save
                </Button>
              </div>
              <FieldError error={draftErrors.branchName} />
              <p className="text-xs text-muted-foreground">
                Save remembers this location for the branch. Save changes stores the invite details for this candidate.
              </p>
            </div>

            <div className="sm:col-span-2 space-y-3 rounded-lg border border-border p-3">
              <label className="form-label">Meeting Point &amp; Touch Points</label>
              <Select
                value={
                  touchpoints.find(
                    (p) =>
                      p.meeting_point === draft.meetingPoint &&
                      [p.touch_point_1_label, p.touch_point_1_phone].filter(Boolean).join(' ') === draft.touchPoint1
                  )?.id || ''
                }
                onChange={(event) => selectTouchpoint(event.target.value)}
                searchable
              >
                <option value="">Select saved preset…</option>
                {touchpoints.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </Select>

              <ul className="space-y-1">
                {touchpoints.map((preset) => (
                  <li
                    key={preset.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm"
                  >
                    <span className="truncate font-medium">{preset.name}</span>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveTouchpoint(preset)}
                      title={`Remove ${preset.name}`}
                      aria-label={`Remove ${preset.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <Input
                placeholder="Meeting point (e.g. Floor 3rd - Sales Training Room / HR Department)"
                value={draft.meetingPoint}
                onChange={(event) => updateDraft('meetingPoint', event.target.value)}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Touch Point 1 (e.g. Sreehari (HRD) 8606986060)"
                  value={draft.touchPoint1}
                  onChange={(event) => updateDraft('touchPoint1', event.target.value)}
                />
                {showTouchPoint2 ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Touch Point 2 (e.g. Mathew (HRD) 9544286099)"
                      value={draft.touchPoint2}
                      onChange={(event) => updateDraft('touchPoint2', event.target.value)}
                    />
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setShowTouchPoint2(false);
                        updateDraft('touchPoint2', '');
                      }}
                      title="Remove Touch Point 2"
                      aria-label="Remove Touch Point 2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => setShowTouchPoint2(true)}>
                    + Add Touch Point 2
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  placeholder="Save this set as… (e.g. branch name)"
                  value={touchpointName}
                  onChange={(event) => setTouchpointName(event.target.value)}
                />
                <Button type="button" variant="secondary" onClick={handleSaveTouchpoint}>
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Save remembers Meeting Point + Touch Points for this branch — pick it instantly next time. Leave Touch Point 2 out if there's only one contact.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="form-label flex items-center gap-1.5">
                <img src="/link-icon.png" alt="Link" className="w-4 h-4 object-contain" />
                Job application form link
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={issuedFormLink}
                  readOnly
                  disabled
                  placeholder="Generate a link for this candidate"
                />
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateFormLink}
                    aria-busy={generatingLink}
                  >
                    {generatingLink ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Link className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {issuedFormLink ? 'Regenerate' : 'Generate link'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCopyFormLink}
                    disabled={!issuedFormLink}
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Generates this candidate&apos;s candidate form link. Regenerating replaces the old one.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={() => void saveDraft()} isLoading={isSaving} disabled={isSaving}>Save changes</Button>
          </div>
        </div>
      </Modal>

    </>
  );
}
