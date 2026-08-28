import { formatDate, formatTime } from './dateTime';

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

const DEFAULT_EXTRA =
  'Meeting Point – Floor 3rd – Sales Training Room / HR Department\nTouch Point 1 – Sreehari (HRD) 8606986060\nTouch Point 2 – Mathew (HRD) 9544286099';

const UNSET_POSITIONS = new Set(['', 'unknown', 'unknown position', 'the applied']);

export function sanitizeWhatsAppPosition(value?: string | null): string {
  const text = (value || '').trim();
  if (!text || UNSET_POSITIONS.has(text.toLowerCase())) return '';
  return text;
}

export function consideringForLabel(department?: string | null, experience?: string | null): string {
  return [department?.trim(), experience?.trim()].filter(Boolean).join(' - ');
}

/** Real role, else considering-for. Never "Unknown". */
export function positionForWhatsApp(input: {
  positionAppliedFor?: string | null;
  department?: string | null;
  experience?: string | null;
}): string {
  const role = sanitizeWhatsAppPosition(input.positionAppliedFor);
  if (role) return role;
  return '';
}

export function buildWhatsAppMessage(vars: WhatsAppTemplateVars): string {
  const dateLabel = vars.visitDate.trim() || '(select visit date)';
  const branchLabel = vars.branchName.trim() || '(select location)';
  const maps = vars.mapsLink.trim() || '(select location link)';
  const extra = vars.extraInstructions.trim() || DEFAULT_EXTRA;
  const positionLabel = sanitizeWhatsAppPosition(vars.position) || '(select position)';

  return [
    `Dear ${vars.candidateName},`,
    '',
    `"Greetings from Nippon HRD"`,
    '',
    `This is to inform you that, pertaining to your application for *${positionLabel}*, we have scheduled a direct interview on *${dateLabel}* at Nippon Toyota, *${branchLabel}*. Please bring an updated bio-data and a passport size photo.`,
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
  return formatDate(d);
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

export function whatsappInviteFieldErrors(
  vars: WhatsAppTemplateVars
): Partial<Record<keyof WhatsAppTemplateVars, string>> {
  const errors: Partial<Record<keyof WhatsAppTemplateVars, string>> = {};
  if (!sanitizeWhatsAppPosition(vars.position)) {
    errors.position = 'Position is required.';
  }
  if (!vars.visitDate.trim()) {
    errors.visitDate = 'Visit date is required.';
  }
  if (!vars.branchName.trim() || !vars.mapsLink.trim()) {
    errors.branchName = 'Location is required.';
  }
  return errors;
}

export function canSendWhatsAppInvite(vars: WhatsAppTemplateVars): boolean {
  return Object.keys(whatsappInviteFieldErrors(vars)).length === 0;
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
    position: sanitizeWhatsAppPosition(input.position),
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

function filled(value?: string | null): string {
  return (value || '').trim();
}

function visitDateLabel(value?: string | Date | null): string {
  if (!value) return '';
  const label = formatVisitDate(value);
  return !label || label === '-' ? '' : label;
}

/** Server visit fields win; this-browser localStorage only fills gaps from older saves. */
export function mergeWhatsAppVars(input: {
  candidateId: string;
  fullName: string;
  positionAppliedFor?: string | null;
  department?: string | null;
  experience?: string | null;
  shareUrl?: string | null;
  visitBranch?: string | null;
  visitDate?: string | Date | null;
  visitTime?: string | null;
  visitMapsLink?: string | null;
  visitInstructions?: string | null;
  extraInstructions?: string | null;
  storedTemplate?: Partial<WhatsAppTemplateVars> | null;
  recruiterName?: string | null;
}): WhatsAppTemplateVars {
  const local = loadStoredTemplateVars(input.candidateId) || {};
  const stored = input.storedTemplate || {};
  const defaults = defaultTemplateVars({
    candidateName: input.fullName,
    position: positionForWhatsApp({
      positionAppliedFor: input.positionAppliedFor,
      department: input.department,
      experience: input.experience,
    }),
    formLink: input.shareUrl || '',
    extraInstructions: input.extraInstructions,
    recruiterName: input.recruiterName,
  });
  return {
    ...defaults,
    ...local,
    ...stored,
    candidateName: filled(input.fullName) || defaults.candidateName,
    position:
      sanitizeWhatsAppPosition(input.positionAppliedFor) ||
      sanitizeWhatsAppPosition(stored.position) ||
      sanitizeWhatsAppPosition(local.position) ||
      defaults.position,
    formLink: filled(input.shareUrl) || filled(stored.formLink) || filled(local.formLink) || defaults.formLink,
    branchName: filled(input.visitBranch) || filled(stored.branchName) || filled(local.branchName),
    mapsLink: filled(input.visitMapsLink) || filled(stored.mapsLink) || filled(local.mapsLink),
    visitDate: visitDateLabel(input.visitDate) || filled(stored.visitDate) || filled(local.visitDate),
    arrivalTime: filled(input.visitTime) || filled(stored.arrivalTime) || filled(local.arrivalTime) || defaults.arrivalTime,
    extraInstructions:
      filled(input.visitInstructions) ||
      filled(stored.extraInstructions) ||
      filled(local.extraInstructions) ||
      defaults.extraInstructions,
    recruiterName: filled(stored.recruiterName) || filled(local.recruiterName) || defaults.recruiterName,
  };
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function isWhatsAppUrl(text: string): boolean {
  return /^https?:\/\//i.test(text);
}

/** Split message into text and URL segments for preview rendering */
export function splitMessageLinks(text: string): string[] {
  return text.split(URL_REGEX).filter((part) => part.length > 0);
}

export function indianWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length >= 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function openWhatsAppChat(phone: string, message: string): Window | null {
  const to = indianWhatsAppNumber(phone);
  if (!to) return null;
  return window.open(`https://wa.me/${to}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

export function buildInterviewerWhatsAppMessage(input: {
  interviewerName: string;
  candidateName: string;
  interviewTitle: string;
  link: string;
}): string {
  return [
    `Hi ${input.interviewerName},`,
    '',
    `Please complete the evaluation form for *${input.candidateName}* (${input.interviewTitle}):`,
    input.link,
    '',
    'Nippon Toyota HR',
  ].join('\n');
}

export function evalScheduleLabels(scheduledTime?: string | null): { dateStr: string; timeStr: string } {
  let dateStr = 'TBD';
  let timeStr = 'TBD';
  const targetTime = scheduledTime || new Date().toISOString();
  const parsedDate = new Date(targetTime);
  if (!Number.isNaN(parsedDate.getTime())) {
    dateStr = formatDate(parsedDate);
    timeStr = formatTime(parsedDate);
  }
  return { dateStr, timeStr };
}

export function buildTechnicalTestWhatsAppMessage(input: {
  candidateName: string;
  position: string;
  link: string;
  date?: string;
  time?: string;
}): string {
  const lines = [
    `Dear ${input.candidateName},`,
    '',
    `Please complete your technical test for *${input.position}*:`,
    input.link,
  ];
  if (input.date && input.date !== 'TBD') lines.push('', `Date: ${input.date}`);
  if (input.time && input.time !== 'TBD') lines.push(`Time: ${input.time}`);
  lines.push('', 'Nippon Toyota HR');
  return lines.join('\n');
}

export function buildHeadOfficeInterviewWhatsAppMessage(input: {
  candidateName: string;
  position: string;
  date: string;
  time: string;
  mode: string;
  locationOrLink: string;
  recruiterName: string;
}): string {
  return [
    `Dear ${input.candidateName},`,
    '',
    `Your Head Office interview for *${input.position}* is scheduled.`,
    '',
    `Date: *${input.date}*`,
    `Reporting time: *${input.time}*`,
    `Mode: ${input.mode}`,
    `Location/Link: ${input.locationOrLink}`,
    '',
    'Please bring an updated bio-data and a passport size photo.',
    'Dress Code - Formal Wear with Proper Grooming (Mandatory)',
    'Please be on time.',
    '',
    'Regards',
    input.recruiterName,
    'Nippon Toyota HR',
  ].join('\n');
}
