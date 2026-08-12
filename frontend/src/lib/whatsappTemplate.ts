export interface WhatsAppTemplateVars {
  candidateName: string;
  position: string;
  formLink: string;
  branchName: string;
  visitDate: string;
  arrivalTime: string;
  mapsLink: string;
  recruiterName: string;
  extraInstructions: string;
}

/** DoubleTick template name for the interview call letter */
export const DOUBLETICK_TEMPLATE_NAME = 'nippon_interview_call_letter';

/**
 * Placeholder order for DoubleTick {{1}}…{{9}}.
 * Keep in sync with backend candidates_actions.send_whatsapp_invite.
 */
export const DOUBLETICK_VARIABLE_KEYS: (keyof WhatsAppTemplateVars)[] = [
  'candidateName',
  'position',
  'visitDate',
  'branchName',
  'formLink',
  'arrivalTime',
  'extraInstructions',
  'mapsLink',
  'recruiterName',
];

const DEFAULT_EXTRA =
  'Meeting Point – Floor 3rd – Sales Training Room / HR Department\nTouch Point 1 – Sreehari (HRD) 8606986060\nTouch Point 2 – Mathew (HRD) 9544286099';

export function buildWhatsAppMessage(vars: WhatsAppTemplateVars): string {
  const dateLabel = vars.visitDate.trim() || '(select visit date)';
  const branchLabel = vars.branchName.trim() || '(select location)';
  const maps = vars.mapsLink.trim() || '(select location link)';
  const extra = vars.extraInstructions.trim() || DEFAULT_EXTRA;

  return [
    `Dear ${vars.candidateName},`,
    '',
    `"Greetings from Nippon HRD"`,
    '',
    `This is to inform you that, pertaining to your application for *${vars.position}*, we have scheduled a direct interview on *${dateLabel}* at Nippon Toyota, *${branchLabel}*. Please bring an updated bio-data and a passport size photo.`,
    '',
    'Also complete the Job Application Form using the link below without fail:',
    vars.formLink,
    '',
    `Reporting Time – *${vars.arrivalTime}*`,
    'Dress Code – Formal Wear with Proper Grooming (Mandatory)',
    extra,
    '',
    'Location Link –',
    maps,
    '',
    'Regards',
    vars.recruiterName,
    'Talent Acquisition Team',
    'Nippon Toyota',
  ].join('\n');
}

export function formatVisitDate(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return typeof input === 'string' ? input : '';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** ISO date (yyyy-mm-dd) for <input type="date"> from display string or ISO. */
export function toDateInputValue(visitDate: string): string {
  if (!visitDate.trim()) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) return visitDate;
  const d = new Date(visitDate);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function canSendWhatsAppInvite(vars: WhatsAppTemplateVars): boolean {
  return Boolean(vars.visitDate.trim() && vars.branchName.trim() && vars.mapsLink.trim());
}

export function defaultTemplateVars(input: {
  candidateName: string;
  position?: string;
  formLink?: string;
  branchName?: string;
  visitDate?: Date | string | null;
  mapsLink?: string | null;
  recruiterName?: string;
  arrivalTime?: string;
  extraInstructions?: string;
}): WhatsAppTemplateVars {
  const visitDate =
    input.visitDate == null || input.visitDate === ''
      ? ''
      : formatVisitDate(input.visitDate);

  return {
    candidateName: input.candidateName,
    position: input.position?.trim() || 'the applied',
    formLink: input.formLink || '(form link will appear after save)',
    // Location + maps chosen explicitly via place picker
    branchName: '',
    visitDate,
    arrivalTime: input.arrivalTime?.trim() || '9:15 AM',
    mapsLink: '',
    recruiterName: input.recruiterName || 'HR Team',
    extraInstructions: input.extraInstructions?.trim() || DEFAULT_EXTRA,
  };
}

export function loadStoredTemplateVars(candidateId: string): Partial<WhatsAppTemplateVars> | null {
  try {
    const raw = localStorage.getItem(`whatsapp-template:${candidateId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WhatsAppTemplateVars> & { inviteType?: string };
    delete parsed.inviteType;
    return parsed;
  } catch {
    return null;
  }
}

export function storeTemplateVars(candidateId: string, vars: WhatsAppTemplateVars) {
  localStorage.setItem(`whatsapp-template:${candidateId}`, JSON.stringify(vars));
}

export function whatsappSendUrl(phone: string, message: string): string {
  const normalized = phone.replace(/\D/g, '').replace(/^0/, '');
  const withCountry = normalized.startsWith('91') ? normalized : `91${normalized}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function isWhatsAppUrl(text: string): boolean {
  return /^https?:\/\//i.test(text);
}

/** Split message into text and URL segments for preview rendering */
export function splitMessageLinks(text: string): string[] {
  return text.split(URL_REGEX).filter((part) => part.length > 0);
}
