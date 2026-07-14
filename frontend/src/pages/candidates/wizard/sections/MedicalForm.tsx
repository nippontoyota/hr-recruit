import type { CandidateFormData } from '../wizardTypes';

interface MedicalFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

export const MedicalForm = ({ data, update }: MedicalFormProps) => {
  return (
    <div className="space-y-6 pb-6 max-w-3xl">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Remarks / Declaration <span className="text-muted-foreground">(if any)</span>
        </label>
        <textarea
          value={data.medicalRemarks || ''}
          onChange={(e) => update('medicalRemarks', e.target.value)}
          className="w-full bg-surface border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[150px] text-foreground resize-y placeholder:text-muted-foreground/50 shadow-inner shadow-black/[0.02]"
          placeholder="Enter any medical conditions, disabilities, or relevant remarks here..."
        />
      </div>
    </div>
  );
};
