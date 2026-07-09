import type { CandidateFormData } from '../wizardTypes';
import { Input } from '../../../../components/ui';

interface IdentityFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

export const IdentityForm = ({ data, update }: IdentityFormProps) => {
  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Aadhaar Number <span className="text-danger">*</span>
          </label>
          <Input
            value={data.aadhaarNumber}
            onChange={(e) => update('aadhaarNumber', e.target.value)}
            placeholder="0000 0000 0000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            PAN Number <span className="text-danger">*</span>
          </label>
          <Input
            value={data.panNumber}
            onChange={(e) => update('panNumber', e.target.value)}
            placeholder="ABCDE1234F"
            className="uppercase"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Driving License Number <span className="text-danger">*</span>
          </label>
          <Input
            value={data.drivingLicenseNumber}
            onChange={(e) => update('drivingLicenseNumber', e.target.value)}
            className="uppercase"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Passport Number
          </label>
          <Input
            value={data.passportNumber}
            onChange={(e) => update('passportNumber', e.target.value)}
            className="uppercase"
          />
        </div>
      </div>
    </div>
  );
};
