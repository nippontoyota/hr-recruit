import type { ReactNode } from 'react';
import type { CandidateFormData } from './wizardTypes';

export type FormSectionProps = {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
  patch?: (next: Partial<CandidateFormData>) => void;
  errors?: Partial<Record<keyof CandidateFormData, string>>;
  onBlurField?: (field: keyof CandidateFormData) => void;
};

export function FieldRequirement({ required = false }: { required?: boolean }) {
  return (
    <span className="ml-1 text-xs font-normal text-text-secondary">
      {required ? '(required)' : '(optional)'}
    </span>
  );
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="text-xs text-danger mt-1" role="alert">
      {error}
    </p>
  );
}

export function FormField({
  field,
  error,
  children,
  required,
}: {
  field: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div data-field={field} className="min-w-0">
      {children}
      {required !== undefined && <FieldRequirement required={required} />}
      <FieldError error={error} />
    </div>
  );
}
