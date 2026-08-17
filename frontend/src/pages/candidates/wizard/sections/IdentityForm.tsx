import type { CandidateFormData } from '../wizardTypes';
import { Input } from '../../../../components/ui';
import { alphanumericOnly, digitsOnly } from '../../../../lib/validation';
import { FormField, type FormSectionProps } from '../FormField';

export const IdentityForm = ({ data, update, patch, errors = {}, onBlurField = () => {} }: FormSectionProps) => {
  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField field="aadhaarNumber" error={errors.aadhaarNumber}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Aadhaar Number <span className="text-danger">*</span>
          </label>
          <Input
            value={data.aadhaarNumber}
            onChange={(e) => update('aadhaarNumber', digitsOnly(e.target.value, 12))}
            onBlur={() => onBlurField('aadhaarNumber')}
            error={!!errors.aadhaarNumber}
            placeholder="0000 0000 0000"
            inputMode="numeric"
            maxLength={12}
          />
        </FormField>

        <FormField field="panNumber" error={errors.panNumber}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            PAN Number <span className="text-danger">*</span>
          </label>
          <Input
            value={data.panNumber}
            onChange={(e) => update('panNumber', alphanumericOnly(e.target.value, 10))}
            onBlur={() => onBlurField('panNumber')}
            error={!!errors.panNumber}
            placeholder="ABCDE1234F"
            className="uppercase"
            maxLength={10}
          />
        </FormField>

        <FormField field="drivingLicenseNumber" error={errors.drivingLicenseNumber}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Driving License Number <span className="text-danger">*</span>
          </label>
          <Input
            value={data.drivingLicenseNumber}
            onChange={(e) => update('drivingLicenseNumber', alphanumericOnly(e.target.value, 20))}
            onBlur={() => onBlurField('drivingLicenseNumber')}
            error={!!errors.drivingLicenseNumber}
            className="uppercase"
            maxLength={20}
          />
        </FormField>

        <FormField field="passportNumber" error={errors.passportNumber}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Passport Number
          </label>
          <Input
            value={data.passportNumber}
            onChange={(e) => update('passportNumber', alphanumericOnly(e.target.value, 8))}
            onBlur={() => onBlurField('passportNumber')}
            error={!!errors.passportNumber}
            className="uppercase"
            maxLength={8}
          />
        </FormField>
      </div>

      <div className="space-y-4 pt-2 border-t border-border/40">
        <FormField field="confidentToDrive" error={errors.confidentToDrive}>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Confident to Drive <span className="text-danger">*</span>
          </label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="radio"
                name="confidentToDrive"
                checked={data.confidentToDrive === true}
                onChange={() => {
                  update('confidentToDrive', true);
                  onBlurField('confidentToDrive');
                }}
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
                  const next = {
                    confidentToDrive: false,
                    drive2Wheeler: false,
                    drive3Wheeler: false,
                    drive4Wheeler: false,
                    driveHeavy: false,
                  };
                  if (patch) patch(next);
                  else Object.entries(next).forEach(([field, value]) => update(field as keyof CandidateFormData, value));
                  onBlurField('confidentToDrive');
                }}
                className="text-primary focus:ring-primary"
              />
              No
            </label>
          </div>
        </FormField>

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
