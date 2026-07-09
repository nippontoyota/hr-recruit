import type { CandidateFormData } from '../wizardTypes';
import { Input, Select } from '../../../../components/ui';

interface ReferenceFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

export const ReferenceForm = ({ data, update }: ReferenceFormProps) => {
  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Role of Reference <span className="text-danger">*</span>
          </label>
          <Select
            value={data.refRole}
            onChange={(e) => update('refRole', e.target.value)}
          >
            <option value="">Select Role</option>
            <option value="Manager">Previous Manager</option>
            <option value="Colleague">Colleague</option>
            <option value="Professor">Professor / Teacher</option>
            <option value="Relative">Relative</option>
            <option value="Other">Other</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Name <span className="text-danger">*</span>
          </label>
          <Input
            value={data.refName}
            onChange={(e) => update('refName', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Panchayat / Location <span className="text-danger">*</span>
          </label>
          <Input
            value={data.refPanchayat}
            onChange={(e) => update('refPanchayat', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Contact Number <span className="text-danger">*</span>
          </label>
          <Input
            type="tel"
            value={data.refContactNumber}
            onChange={(e) => update('refContactNumber', e.target.value)}
            placeholder="+91 "
          />
        </div>
      </div>
    </div>
  );
};
