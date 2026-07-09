import type { CandidateFormData } from '../wizardTypes';
import { Input } from '../../../../components/ui';

interface LanguagesFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

export const LanguagesForm = ({ data, update }: LanguagesFormProps) => {
  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Languages to Read <span className="text-danger">*</span>
          </label>
          <p className="text-xs text-text-secondary mb-3">Languages you can read.</p>
          <Input
            value={data.languagesRead}
            onChange={(e) => update('languagesRead', e.target.value)}
            placeholder="e.g. English, Malayalam"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Languages to Write <span className="text-danger">*</span>
          </label>
          <p className="text-xs text-text-secondary mb-3">Languages you can write.</p>
          <Input
            value={data.languagesWrite}
            onChange={(e) => update('languagesWrite', e.target.value)}
            placeholder="e.g. English"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Languages to Speak <span className="text-danger">*</span>
          </label>
          <p className="text-xs text-text-secondary mb-3">Languages you can speak fluently.</p>
          <Input
            value={data.languagesSpeak}
            onChange={(e) => update('languagesSpeak', e.target.value)}
            placeholder="e.g. English, Malayalam, Hindi"
          />
        </div>
      </div>
    </div>
  );
};
