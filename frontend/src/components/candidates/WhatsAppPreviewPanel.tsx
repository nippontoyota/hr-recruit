import { useEffect, useMemo, useState } from 'react';

import { ArrowLeft, Pencil, Send, Video, Phone, MoreVertical, Smile, Paperclip, Camera, CheckCheck, Trash2 } from 'lucide-react';
import type { Candidate } from '../../types';
import { Button, Input, Modal } from '../ui';
import {
  buildWhatsAppMessage,
  canSendWhatsAppInvite,
  defaultTemplateVars,
  formatVisitDate,
  isWhatsAppUrl,
  loadStoredTemplateVars,
  splitMessageLinks,
  storeTemplateVars,
  toDateInputValue,
  type WhatsAppTemplateVars,
} from '../../lib/whatsappTemplate';
import { useAuth } from '../../auth';
import { toast } from 'sonner';
import { cn, extractError } from '../../lib/utils';
import { sendWhatsAppInvite } from '../../api/candidates';
import {
  createLocation,
  deleteLocation,
  listLocations,
  type LocationTemplateRow,
} from '../../api/settings';
interface WhatsAppPreviewPanelProps {
  candidate: Candidate;
  className?: string;
}

const FIELD_LABELS: Partial<Record<keyof WhatsAppTemplateVars, string>> = {
  candidateName: 'Candidate name',
  position: 'Position',
  visitDate: 'Visit date',
  arrivalTime: 'Arrival time',
  extraInstructions: 'Instructions',
  recruiterName: 'Recruiter name',
};

const EDITABLE_FIELDS: (keyof WhatsAppTemplateVars)[] = [
  'candidateName',
  'position',
  'arrivalTime',
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

export function WhatsAppPreviewPanel({ candidate, className }: WhatsAppPreviewPanelProps) {
  const { user } = useAuth();
  const branch = user?.branch_location || candidate.branch_location || null;
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [places, setPlaces] = useState<LocationTemplateRow[]>([]);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceUrl, setNewPlaceUrl] = useState('');

  const refreshPlaces = async () => {
    try {
      setPlaces(await listLocations(branch));
    } catch (err) {
      toast.error(extractError(err, 'Failed to load locations'));
    }
  };

  const [vars, setVars] = useState<WhatsAppTemplateVars>(() => {
    const screening = candidate.screening;
    const defaults = defaultTemplateVars({
      candidateName: candidate.full_name,
      position: candidate.position_applied_for || candidate.department,
      formLink: candidate.share_url || `${window.location.origin}/#/apply/pending`,
      extraInstructions: screening?.extra_instructions,
      recruiterName: user?.full_name,
    });

    const stored = loadStoredTemplateVars(candidate.id);
    return {
      ...defaults,
      ...stored,
      candidateName: candidate.full_name || defaults.candidateName,
      position: candidate.position_applied_for || candidate.department || defaults.position,
      formLink: candidate.share_url || defaults.formLink,
      // Never auto-fill date / maps — user must pick
      visitDate: stored?.visitDate?.trim() || '',
      branchName: stored?.branchName?.trim() || '',
      mapsLink: stored?.mapsLink?.trim() || '',
      arrivalTime: stored?.arrivalTime?.trim() || '9:15 AM',
    };
  });
  const [draft, setDraft] = useState(vars);

  useEffect(() => {
    setVars((current) => ({
      ...current,
      candidateName: candidate.full_name || current.candidateName,
      position: candidate.position_applied_for || candidate.department || current.position,
      formLink: candidate.share_url || current.formLink,
      ...(candidate.screening?.extra_instructions
        ? { extraInstructions: candidate.screening.extra_instructions }
        : {}),
    }));
  }, [
    candidate.full_name,
    candidate.position_applied_for,
    candidate.department,
    candidate.share_url,
    candidate.screening?.extra_instructions,
  ]);

  useEffect(() => {
    storeTemplateVars(candidate.id, vars);
  }, [candidate.id, vars]);

  const message = useMemo(() => buildWhatsAppMessage(vars), [vars]);
  const readyToSend = canSendWhatsAppInvite(vars);

  const openEditor = () => {
    setDraft(vars);
    void refreshPlaces();
    setNewPlaceName('');
    setNewPlaceUrl('');
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
    if (!newPlaceName.trim() || !newPlaceUrl.trim()) {
      toast.error('Enter both location name and maps link');
      return;
    }
    try {
      const row = await createLocation({
        name: newPlaceName,
        location_or_link: newPlaceUrl,
        branch,
      });
      setPlaces(await listLocations(branch));
      setDraft((current) => ({
        ...current,
        branchName: row.name,
        mapsLink: row.location_or_link,
      }));
      setNewPlaceName('');
      setNewPlaceUrl('');
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

  const saveDraft = () => {
    setVars({ ...draft, formLink: candidate.share_url || draft.formLink });
    setIsEditing(false);
    toast.success('Preview updated');
  };

  const trySend = () => {
    if (!canSendWhatsAppInvite(vars)) {
      toast.error('Set visit date and location before sending');
      return;
    }
    setIsConfirming(true);
  };

  const confirmSend = async () => {
    if (!canSendWhatsAppInvite(vars)) {
      toast.error('Set visit date and location before sending');
      return;
    }
    setIsConfirming(false);
    setIsSending(true);
    try {
      await sendWhatsAppInvite(candidate.id, vars as unknown as Record<string, string>);
      toast.success('WhatsApp invitation sent successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(extractError(err, 'Failed to send WhatsApp invitation.'), { duration: 8000 });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <aside
        className={cn(
          'w-full lg:w-[400px] xl:w-[440px] shrink-0 border-l border-border bg-[#f7f8fa] flex flex-col min-h-0 overflow-hidden',
          className
        )}
      >
        <div className="shrink-0 px-6 pt-5 pb-4 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-black/5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Live Preview</h2>
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
        </div>

        <div className="shrink-0 border-t border-border bg-white p-4 space-y-2">
          {!readyToSend && (
            <p className="text-xs text-muted-foreground text-center">
              Set visit date and location in Edit before sending.
            </p>
          )}
          <Button
            className="w-full !bg-[#08796b] hover:!bg-[#06685c]"
            onClick={trySend}
            isLoading={isSending}
            disabled={!readyToSend}
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
            <div>
              <label className="form-label">{FIELD_LABELS.visitDate}</label>
              <Input
                type="date"
                value={toDateInputValue(draft.visitDate)}
                onChange={(event) => {
                  const raw = event.target.value;
                  updateDraft('visitDate', raw ? formatVisitDate(raw) : '');
                }}
              />
            </div>

            {EDITABLE_FIELDS.map((key) => (
              <div
                key={key}
                className={key === 'extraInstructions' ? 'sm:col-span-2' : undefined}
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

            <div className="sm:col-span-2 space-y-3 rounded-lg border border-border p-3">
              <label className="form-label">Location (name + maps link)</label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={places.find((p) => p.name === draft.branchName)?.id || ''}
                onChange={(event) => selectPlace(event.target.value)}
              >
                <option value="">Select location…</option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </select>
              {draft.mapsLink ? (
                <p className="text-xs text-muted-foreground break-all">{draft.mapsLink}</p>
              ) : (
                <p className="text-xs text-muted-foreground">No maps link selected.</p>
              )}

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
                  placeholder="New location name"
                  value={newPlaceName}
                  onChange={(event) => setNewPlaceName(event.target.value)}
                />
                <Input
                  placeholder="Maps link"
                  value={newPlaceUrl}
                  onChange={(event) => setNewPlaceUrl(event.target.value)}
                />
                <Button type="button" variant="secondary" onClick={handleSavePlace}>
                  Save
                </Button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="form-label flex items-center gap-1.5">
                <img src="/link-icon.png" alt="Link" className="w-4 h-4 object-contain" />
                Job application form link
              </label>
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
