import { Input, Select } from '../../../../components/ui';
import { digitsOnly } from '../../../../lib/validation';
import { FormField, type FormSectionProps } from '../FormField';

export const RecruitmentForm = ({ data, update, errors = {}, onBlurField = () => {} }: FormSectionProps) => {
  const referralRequired = data.sourceOfOpening === 'Employee Referral';

  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField field="sourceOfOpening" error={errors.sourceOfOpening}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Source of Opening <span className="text-danger">*</span>
          </label>
          <Select
            value={data.sourceOfOpening}
            onChange={(e) => {
              update('sourceOfOpening', e.target.value);
              setTimeout(() => onBlurField('sourceOfOpening'), 0);
            }}
            error={!!errors.sourceOfOpening}
          >
            <option value="">Select Source</option>
            <option value="Advertisement">Advertisement</option>
            <option value="Agency">Agency</option>
            <option value="Employee Referral">Employee Referral</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Social Media">Social Media</option>
          </Select>
        </FormField>

        <FormField field="referredBy" error={errors.referredBy}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Referred By {referralRequired && <span className="text-danger">*</span>}
            {!referralRequired && (
              <span className="text-muted-foreground font-normal"> (if applicable)</span>
            )}
          </label>
          <Input
            value={data.referredBy}
            onChange={(e) => update('referredBy', e.target.value)}
            onBlur={() => onBlurField('referredBy')}
            error={!!errors.referredBy}
            placeholder="Name or ID"
          />
        </FormField>

        <FormField field="preferredRegion" error={errors.preferredRegion}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Ready to work in below-mentioned branches <span className="text-danger">*</span>
          </label>
          <Input
            value={data.preferredRegion}
            onChange={(e) => update('preferredRegion', e.target.value)}
            onBlur={() => onBlurField('preferredRegion')}
            error={!!errors.preferredRegion}
            placeholder="e.g. Kalamassery, Cochin, Thrissur, Kottayam, Trivandrum"
          />
        </FormField>

        <FormField field="expectedJoiningDate" error={errors.expectedJoiningDate}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            If selected, when can you join? <span className="text-danger">*</span>
          </label>
          <Input
            type="date"
            value={data.expectedJoiningDate}
            onChange={(e) => update('expectedJoiningDate', e.target.value)}
            onBlur={() => onBlurField('expectedJoiningDate')}
            error={!!errors.expectedJoiningDate}
            min={new Date().toISOString().split('T')[0]}
          />
        </FormField>
      </div>

      <div className="pt-6 border-t border-border/40">
        <h4 className="text-sm font-semibold text-text-primary mb-1">Reference details for verification</h4>
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          Choose someone who can verify your address and character. If you have work experience, you can use a previous manager or colleague. If you are a fresher, you can use a ward member, panchayat member, or another trusted person from your area. This is different from the &quot;Referred By&quot; field above.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField field="refRole" error={errors.refRole}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Type of Reference <span className="text-danger">*</span>
            </label>
            <Select
              value={data.refRole}
              onChange={(e) => {
                update('refRole', e.target.value);
                setTimeout(() => onBlurField('refRole'), 0);
              }}
              error={!!errors.refRole}
            >
              <option value="" disabled>Select reference type</option>
              <option value="__local_reference" disabled>Local area reference</option>
              <option value="Ward Member">Ward Member</option>
              <option value="Panchayat Member">Panchayat Member</option>
              <option value="Municipality Councillor">Municipality Councillor</option>
              <option value="Corporation Councillor">Corporation Councillor</option>
              <option value="Other">Other trusted local person</option>
              <option value="__work_reference" disabled>Work or personal reference</option>
              <option value="Manager">Previous Manager / Supervisor</option>
              <option value="Colleague">Previous Colleague</option>
              <option value="Professor">Professor / Teacher</option>
              <option value="Relative">Relative</option>
            </Select>
          </FormField>

          <FormField field="refName" error={errors.refName}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Representative&apos;s Name <span className="text-danger">*</span>
            </label>
            <Input
              value={data.refName}
              onChange={(e) => update('refName', e.target.value)}
              onBlur={() => onBlurField('refName')}
              error={!!errors.refName}
              placeholder="e.g. Rajesh Nair"
            />
          </FormField>

          <FormField field="refPanchayat" error={errors.refPanchayat}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Area / Locality / Workplace <span className="text-danger">*</span>
            </label>
            <Input
              value={data.refPanchayat}
              onChange={(e) => update('refPanchayat', e.target.value)}
              onBlur={() => onBlurField('refPanchayat')}
              error={!!errors.refPanchayat}
              placeholder="e.g. Ward 12, Aluva Panchayat or Nippon Toyota Kalamassery"
            />
          </FormField>

          <FormField field="refContactNumber" error={errors.refContactNumber}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Representative&apos;s Contact Number <span className="text-danger">*</span>
            </label>
            <Input
              type="tel"
              value={data.refContactNumber}
              onChange={(e) => update('refContactNumber', digitsOnly(e.target.value, 10))}
              onBlur={() => onBlurField('refContactNumber')}
              error={!!errors.refContactNumber}
              placeholder="e.g. 9876543210"
              inputMode="numeric"
              maxLength={10}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};
