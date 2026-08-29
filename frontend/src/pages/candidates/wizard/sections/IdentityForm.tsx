import type { CandidateFormData } from '../wizardTypes';
import { Input } from '../../../../components/ui';
import { FormField, type FormSectionProps } from '../FormField';

export const IdentityForm = ({ data, update, patch, errors = {}, onBlurField = () => {} }: FormSectionProps) => {
  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-4">
        <FormField field="hasValidDrivingLicense" error={errors.hasValidDrivingLicense}>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Do you have a Valid Driver&apos;s License? <span className="text-danger">*</span>
          </label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="radio"
                name="hasValidDrivingLicense"
                checked={data.hasValidDrivingLicense === true}
                onChange={() => {
                  update('hasValidDrivingLicense', true);
                  onBlurField('hasValidDrivingLicense');
                }}
                className="text-primary focus:ring-primary"
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="radio"
                name="hasValidDrivingLicense"
                checked={data.hasValidDrivingLicense === false}
                onChange={() => {
                  const next = {
                    hasValidDrivingLicense: false,
                    confidentToDrive: false,
                    drive2Wheeler: false,
                    drive3Wheeler: false,
                    drive4Wheeler: false,
                    driveHeavy: false,
                  };
                  if (patch) patch(next);
                  else Object.entries(next).forEach(([field, value]) => update(field as keyof CandidateFormData, value));
                  onBlurField('hasValidDrivingLicense');
                }}
                className="text-primary focus:ring-primary"
              />
              No
            </label>
          </div>
        </FormField>

        {data.hasValidDrivingLicense && (
          <div className="pt-4 border-t border-border/40 space-y-4 animate-in fade-in duration-300">
            <FormField field="confidentToDrive" error={errors.confidentToDrive}>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Are you confident driving? <span className="text-danger">*</span>
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
        )}
      </div>

      <div className="pt-4 border-t border-border/40 space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Languages Known</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField field="languagesRead" error={errors.languagesRead}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Languages to Read <span className="text-danger">*</span>
            </label>
            <Input
              value={data.languagesRead}
              onChange={(e) => update('languagesRead', e.target.value)}
              onBlur={() => onBlurField('languagesRead')}
              error={!!errors.languagesRead}
              placeholder="e.g. English, Malayalam"
            />
          </FormField>

          <FormField field="languagesWrite" error={errors.languagesWrite}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Languages to Write <span className="text-danger">*</span>
            </label>
            <Input
              value={data.languagesWrite}
              onChange={(e) => update('languagesWrite', e.target.value)}
              onBlur={() => onBlurField('languagesWrite')}
              error={!!errors.languagesWrite}
              placeholder="e.g. English"
            />
          </FormField>

          <FormField field="languagesSpeak" error={errors.languagesSpeak}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Languages to Speak <span className="text-danger">*</span>
            </label>
            <Input
              value={data.languagesSpeak}
              onChange={(e) => update('languagesSpeak', e.target.value)}
              onBlur={() => onBlurField('languagesSpeak')}
              error={!!errors.languagesSpeak}
              placeholder="e.g. English, Malayalam, Hindi"
            />
          </FormField>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Other Languages
          </label>
          <Input
            value={data.languagesOther}
            onChange={(e) => update('languagesOther', e.target.value)}
            onBlur={() => onBlurField('languagesOther')}
            placeholder="Optional — any other languages"
          />
        </div>
      </div>
    </div>
  );
};
