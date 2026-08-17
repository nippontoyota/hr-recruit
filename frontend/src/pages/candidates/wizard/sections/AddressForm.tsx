import type { CandidateFormData } from '../wizardTypes';
import { Input } from '../../../../components/ui';
import { digitsOnly } from '../../../../lib/validation';
import { FormField, type FormSectionProps } from '../FormField';

function AddressInput({
  field,
  label,
  data,
  update,
  errors,
  onBlurField,
  numeric,
}: {
  field: keyof CandidateFormData;
  label: string;
  data: CandidateFormData;
  update: FormSectionProps['update'];
  errors: NonNullable<FormSectionProps['errors']>;
  onBlurField: NonNullable<FormSectionProps['onBlurField']>;
  numeric?: boolean;
}) {
  return (
    <FormField field={field} error={errors[field]}>
      <label className="block text-sm font-medium text-text-primary mb-1">
        {label} <span className="text-danger">*</span>
      </label>
      <Input
        value={String(data[field] ?? '')}
        onChange={(e) => update(field, numeric ? digitsOnly(e.target.value, 6) : e.target.value)}
        onBlur={() => onBlurField(field)}
        error={!!errors[field]}
        inputMode={numeric ? 'numeric' : undefined}
        maxLength={numeric ? 6 : undefined}
      />
    </FormField>
  );
}

export const AddressForm = ({ data, update, errors = {}, onBlurField = () => {} }: FormSectionProps) => {
  return (
    <div className="space-y-8 pb-6">
      <div className="space-y-6">
        <h4 className="text-lg font-medium text-text-primary border-b border-border pb-2">Permanent Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AddressInput field="permHouseName" label="House Name" data={data} update={update} errors={errors} onBlurField={onBlurField} />
          <AddressInput field="permPostOffice" label="Post Office" data={data} update={update} errors={errors} onBlurField={onBlurField} />
          <AddressInput field="permLandmark" label="Landmark" data={data} update={update} errors={errors} onBlurField={onBlurField} />
          <AddressInput field="permDistrict" label="District" data={data} update={update} errors={errors} onBlurField={onBlurField} />
          <AddressInput field="permPinCode" label="PIN Code" data={data} update={update} errors={errors} onBlurField={onBlurField} numeric />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h4 className="text-lg font-medium text-text-primary">Present Address</h4>
          <label className="flex items-center space-x-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={data.sameAsPermanent}
              onChange={(e) => update('sameAsPermanent', e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>Same as Permanent</span>
          </label>
        </div>

        {!data.sameAsPermanent && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            <AddressInput field="presHouseName" label="House Name" data={data} update={update} errors={errors} onBlurField={onBlurField} />
            <AddressInput field="presPostOffice" label="Post Office" data={data} update={update} errors={errors} onBlurField={onBlurField} />
            <AddressInput field="presLandmark" label="Landmark" data={data} update={update} errors={errors} onBlurField={onBlurField} />
            <AddressInput field="presDistrict" label="District" data={data} update={update} errors={errors} onBlurField={onBlurField} />
            <AddressInput field="presPinCode" label="PIN Code" data={data} update={update} errors={errors} onBlurField={onBlurField} numeric />
          </div>
        )}
      </div>
    </div>
  );
};
