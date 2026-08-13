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

      <div className="space-y-4 pt-2 border-t border-border/40">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Confident to Drive <span className="text-danger">*</span>
          </label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="radio"
                name="confidentToDrive"
                checked={data.confidentToDrive === true}
                onChange={() => update('confidentToDrive', true)}
                className="text-primary focus:ring-primary"
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="radio"
                name="confidentToDrive"
                checked={data.confidentToDrive === false}
                onChange={() => {
                  update('confidentToDrive', false);
                  update('drive2Wheeler', false);
                  update('drive3Wheeler', false);
                  update('drive4Wheeler', false);
                  update('driveHeavy', false);
                }}
                className="text-primary focus:ring-primary"
              />
              No
            </label>
          </div>
        </div>

        {data.confidentToDrive && (
          <div className="animate-in fade-in duration-300">
            <label className="block text-sm font-medium text-text-primary mb-2">
              Vehicle types (optional)
            </label>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ['drive2Wheeler', '2 Wheeler'],
                  ['drive3Wheeler', '3 Wheeler'],
                  ['drive4Wheeler', '4 Wheeler'],
                  ['driveHeavy', 'Heavy'],
                ] as const
              ).map(([field, label]) => (
                <label
                  key={field}
                  className="flex items-center gap-2 text-sm text-text-primary cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={data[field]}
                    onChange={(e) => update(field, e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Other Languages
        </label>
        <Input
          value={data.languagesOther}
          onChange={(e) => update('languagesOther', e.target.value)}
          placeholder="Optional — languages beyond read/write/speak above"
        />
      </div>
    </div>
  );
};
