import type { CandidateFormData } from '../wizardTypes';
import { Input } from '../../../../components/ui';
import { alphanumericOnly, digitsOnly } from '../../../../lib/validation';

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
            onChange={(e) => update('aadhaarNumber', digitsOnly(e.target.value, 12))}
            placeholder="0000 0000 0000"
            inputMode="numeric"
            maxLength={12}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            PAN Number <span className="text-danger">*</span>
          </label>
          <Input
            value={data.panNumber}
            onChange={(e) => update('panNumber', alphanumericOnly(e.target.value, 10))}
            placeholder="ABCDE1234F"
            className="uppercase"
            maxLength={10}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Driving License Number <span className="text-danger">*</span>
          </label>
          <Input
            value={data.drivingLicenseNumber}
            onChange={(e) => update('drivingLicenseNumber', alphanumericOnly(e.target.value, 20))}
            className="uppercase"
            maxLength={20}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Passport Number
          </label>
          <Input
            value={data.passportNumber}
            onChange={(e) => update('passportNumber', alphanumericOnly(e.target.value, 8))}
            className="uppercase"
            maxLength={8}
          />
        </div>
      </div>
    </div>
  );
};
