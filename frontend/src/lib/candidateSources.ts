export const SOURCE_OPTIONS = [
  { value: 'WALK_IN', label: 'Walk-In' },
  { value: 'INDEED', label: 'Indeed' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'CAMPUS', label: 'Campus' },
  { value: 'OTHER', label: 'Other / LinkedIn' },
] as const;

export type CandidateSourceValue = (typeof SOURCE_OPTIONS)[number]['value'];

export const SOURCE_REFERENCE_LABELS: Partial<Record<CandidateSourceValue, string>> = {
  REFERRAL: 'Referred By',
  OTHER: 'Specify Source',
};

export function sourceNeedsReference(source: string): source is keyof typeof SOURCE_REFERENCE_LABELS {
  return source in SOURCE_REFERENCE_LABELS;
}
