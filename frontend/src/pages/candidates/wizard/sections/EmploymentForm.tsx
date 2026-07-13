import type { CandidateFormData } from '../wizardTypes';
import { Input } from '../../../../components/ui';
import { digitsOnly } from '../../../../lib/validation';

interface EmploymentFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

export const EmploymentForm = ({ data, update }: EmploymentFormProps) => {
  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center space-x-2 pb-2">
        <label className="flex items-center space-x-2 text-sm font-medium text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={data.previousExperience}
            onChange={(e) => update('previousExperience', e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span>I have previous work experience</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.previousExperience && (
          <>
            <div className="animate-in fade-in duration-300">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Previous Company Name <span className="text-danger">*</span>
              </label>
              <Input
                value={data.prevCompanyName}
                onChange={(e) => update('prevCompanyName', e.target.value)}
              />
            </div>
            <div className="animate-in fade-in duration-300">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Previous Position <span className="text-danger">*</span>
              </label>
              <Input
                value={data.prevPosition}
                onChange={(e) => update('prevPosition', e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Total Experience (Years/Months) <span className="text-danger">*</span>
          </label>
          <Input
            value={data.totalExperience}
            onChange={(e) => update('totalExperience', e.target.value)}
            placeholder="e.g. 2 Years 3 Months"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Expected Salary <span className="text-danger">*</span>
          </label>
          <Input
            value={data.expectedSalary}
            onChange={(e) => update('expectedSalary', digitsOnly(e.target.value, 8))}
            placeholder="₹"
            inputMode="numeric"
            maxLength={8}
          />
        </div>
      </div>
    </div>
  );
};
