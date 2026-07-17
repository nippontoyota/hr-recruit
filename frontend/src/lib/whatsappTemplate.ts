import { findBranch } from './branchLocations';

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
  inviteType?: 'pre' | 'post';
}

export const DOUBLETICK_TEMPLATE_NAME = 'nippon_pre_interview_invite';

/** Variable order for DoubleTick template mapping */
export const DOUBLETICK_VARIABLE_KEYS: (keyof WhatsAppTemplateVars)[] = [
  'candidateName',
  'position',
  'formLink',
  'branchName',
  'visitDate',
  'arrivalTime',
  'mapsLink',
  'recruiterName',
  'extraInstructions',
];

export function buildWhatsAppMessage(vars: WhatsAppTemplateVars): string {
  const branch = findBranch(vars.branchName);
  const maps = vars.mapsLink || branch?.mapsUrl || '';

  return [
    `Hello ${vars.candidateName},`,
    '',
    `Thank you for your interest in the *${vars.position}* role at Nippon Toyota.`,
    '',
    vars.inviteType === 'post'
      ? 'Congratulations on clearing the interview! Please complete your Candidate Information form using the link below:'
      : 'Please complete your pre-interview form using the link below:',
    vars.formLink,
    '',
    vars.extraInstructions.trim() ? vars.extraInstructions.trim() : 'Fill all sections carefully. Incomplete forms may delay your application.',
    '',
    `Date: *${vars.visitDate}*`,
    `Arrival time: *${vars.arrivalTime}*`,
    `Location: *${vars.branchName}*`,
    '',
    'Google Maps:',
    maps,
    '',
    `Regards,`,
    `${vars.recruiterName}`,
    'Nippon Toyota — HR Team',
  ].join('\n');
}

export function defaultTemplateVars(input: {
  candidateName: string;
  position?: string;
  formLink?: string;
  branchName?: string;
  visitDate?: Date;
  mapsLink?: string;
  recruiterName?: string;
  inviteType?: 'pre' | 'post';
}): WhatsAppTemplateVars {
  const branch = findBranch(input.branchName);
  const visit = input.visitDate ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  return {
    candidateName: input.candidateName,
    position: input.position || 'the applied',
    formLink: input.formLink || '(form link will appear after save)',
    branchName: branch?.name ?? input.branchName ?? 'Kalamassery (Nippon Towers)',
    visitDate: new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(visit),
    arrivalTime: '10:30 AM',
    mapsLink: input.mapsLink || branch?.mapsUrl || '',
    recruiterName: input.recruiterName || 'HR Team',
    extraInstructions:
      'Bring a copy of your resume and valid ID proof when you visit the branch.',
    inviteType: input.inviteType || 'pre',
  };
}

export function loadStoredTemplateVars(candidateId: string): Partial<WhatsAppTemplateVars> | null {
  try {
    const raw = localStorage.getItem(`whatsapp-template:${candidateId}`);
    return raw ? (JSON.parse(raw) as Partial<WhatsAppTemplateVars>) : null;
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
