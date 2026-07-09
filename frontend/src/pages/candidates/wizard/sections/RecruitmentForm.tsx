import type { CandidateFormData } from '../wizardTypes';
import { Input, Select } from '../../../../components/ui';

interface RecruitmentFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

export const RecruitmentForm = ({ data, update }: RecruitmentFormProps) => {
  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Source of Opening <span className="text-danger">*</span>
          </label>
          <Select
            value={data.sourceOfOpening}
            onChange={(e) => update('sourceOfOpening', e.target.value)}
          >
            <option value="">Select Source</option>
            <option value="Advertisement">Advertisement</option>
            <option value="Agency">Agency</option>
            <option value="Employee Referral">Employee Referral</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Social Media">Social Media</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Referred By (if applicable) <span className="text-danger">*</span>
          </label>
          <Input
            value={data.referredBy}
            onChange={(e) => update('referredBy', e.target.value)}
            placeholder="Name or ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Preferred Region <span className="text-danger">*</span>
          </label>
          <Input
            value={data.preferredRegion}
            onChange={(e) => update('preferredRegion', e.target.value)}
            placeholder="e.g. Kochi, Trivandrum"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Expected Joining Date <span className="text-danger">*</span>
          </label>
          <Input
            type="date"
            value={data.expectedJoiningDate}
            onChange={(e) => update('expectedJoiningDate', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
