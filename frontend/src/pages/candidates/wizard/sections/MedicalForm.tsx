import type { CandidateFormData } from '../wizardTypes';
import type { FormSectionProps } from '../FormField';

const GENERAL_QUESTIONS: {
  field: keyof CandidateFormData;
  letter: string;
  label: string;
}[] = [
  {
    field: 'prevTerminated',
    letter: 'a',
    label: 'Have you ever been terminated from any previous employment?',
  },
  {
    field: 'nervousDisorder',
    letter: 'b',
    label: 'Have you ever suffered from any nervous disorder?',
  },
  {
    field: 'physicalDisability',
    letter: 'c',
    label: 'Do you have any physical disability?',
  },
  {
    field: 'eyeVision',
    letter: 'd',
    label: 'Do you have any eye / colour / night blindness?',
  },
  {
    field: 'criminalConviction',
    letter: 'e',
    label: 'Have you ever been convicted of any criminal offence?',
  },
];

function YesNoRow({
  name,
  label,
  letter,
  value,
  onChange,
}: {
  name: string;
  label: string;
  letter: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-border/40 last:border-b-0">
      <p className="text-sm text-text-primary flex-1">
        <span className="font-medium mr-1">({letter})</span>
        {label} <span className="text-danger">*</span>
      </p>
      <div className="flex items-center gap-6 shrink-0">
        <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
          <input
            type="radio"
            name={name}
            checked={value === true}
            onChange={() => onChange(true)}
            className="text-primary focus:ring-primary"
          />
          Yes
        </label>
        <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
          <input
            type="radio"
            name={name}
            checked={value === false}
            onChange={() => onChange(false)}
            className="text-primary focus:ring-primary"
          />
          No
        </label>
      </div>
    </div>
  );
}

export const MedicalForm = ({ data, update }: FormSectionProps) => {
  return (
    <div className="space-y-8 pb-6 max-w-3xl">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
          Additional information
        </h4>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Achievements <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            value={data.achievements || ''}
            onChange={(e) => update('achievements', e.target.value)}
            className="w-full bg-surface border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px] text-foreground resize-y placeholder:text-muted-foreground/50"
            placeholder="Awards, distinctions, notable accomplishments..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Hobbies <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            value={data.hobbies || ''}
            onChange={(e) => update('hobbies', e.target.value)}
            className="w-full bg-surface border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[80px] text-foreground resize-y placeholder:text-muted-foreground/50"
            placeholder="Sports, reading, music..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
          General information
        </h4>
        {GENERAL_QUESTIONS.map((q) => (
          <YesNoRow
            key={q.field}
            name={q.field}
            letter={q.letter}
            label={q.label}
            value={Boolean(data[q.field])}
            onChange={(next) => update(q.field, next)}
          />
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Medical remarks <span className="text-muted-foreground font-normal">(if any)</span>
        </label>
        <textarea
          value={data.medicalRemarks || ''}
          onChange={(e) => update('medicalRemarks', e.target.value)}
          className="w-full bg-surface border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px] text-foreground resize-y placeholder:text-muted-foreground/50"
          placeholder="Enter any medical conditions or relevant remarks here..."
        />
      </div>
    </div>
  );
};
