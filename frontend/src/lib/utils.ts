import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStageBadgeVariant(stage: string): string {
  if (['REJECTED'].includes(stage)) return 'destructive';
  if (['HIRED'].includes(stage)) return 'success';
  if (['FINALIZING'].includes(stage)) return 'teal';
  if (['HR_INTERVIEW', 'DEPARTMENT_INTERVIEW', 'GM_INTERVIEW'].includes(stage)) return 'indigo';
  if (['ON_HOLD'].includes(stage)) return 'warning';
  if (['SCREENING', 'CANDIDATE_FORM'].includes(stage)) return 'info';
  return 'secondary';
}
