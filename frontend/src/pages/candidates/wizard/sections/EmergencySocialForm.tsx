import type { CandidateFormData } from '../wizardTypes';
import { Input } from '../../../../components/ui';
import { digitsOnly } from '../../../../lib/validation';
import { FormField, type FormSectionProps } from '../FormField';

function EmergencyBlock({
  title,
  required,
  relation,
  name,
  address,
  contact,
  data,
  update,
  errors = {},
  onBlurField = () => {},
}: {
  title: string;
  required?: boolean;
  relation: keyof CandidateFormData;
  name: keyof CandidateFormData;
  address: keyof CandidateFormData;
  contact: keyof CandidateFormData;
  data: CandidateFormData;
  update: FormSectionProps['update'];
  errors?: FormSectionProps['errors'];
  onBlurField?: FormSectionProps['onBlurField'];
}) {
  const star = required ? <span className="text-danger">*</span> : null;
  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-4">
      <h5 className="text-sm font-semibold text-text-primary">
        {title}
        {required && <span className="text-danger"> *</span>}
        {!required && (
          <span className="text-muted-foreground font-normal"> (optional)</span>
        )}
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField field={relation} error={errors[relation]}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Relation {star}
          </label>
          <Input
            value={String(data[relation] ?? '')}
            onChange={(e) => update(relation, e.target.value)}
            onBlur={() => onBlurField(relation)}
            error={!!errors[relation]}
            placeholder="e.g. Uncle / Friend"
          />
        </FormField>
        <FormField field={name} error={errors[name]}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Name {star}
          </label>
          <Input
            value={String(data[name] ?? '')}
            onChange={(e) => update(name, e.target.value)}
            onBlur={() => onBlurField(name)}
            error={!!errors[name]}
          />
        </FormField>
        <FormField field={address} error={errors[address]} >
          <label className="block text-sm font-medium text-text-primary mb-1">
            Address {star}
          </label>
          <Input
            value={String(data[address] ?? '')}
            onChange={(e) => update(address, e.target.value)}
            onBlur={() => onBlurField(address)}
            error={!!errors[address]}
          />
        </FormField>
        <FormField field={contact} error={errors[contact]}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Contact Number {star}
          </label>
          <Input
            type="tel"
            value={String(data[contact] ?? '')}
            onChange={(e) => update(contact, digitsOnly(e.target.value, 10))}
            onBlur={() => onBlurField(contact)}
            error={!!errors[contact]}
            placeholder="9876543210"
            inputMode="numeric"
            maxLength={10}
          />
        </FormField>
      </div>
    </div>
  );
}

export const EmergencySocialForm = ({ data, update, errors = {}, onBlurField = () => {} }: FormSectionProps) => {
  return (
    <div className="space-y-8 pb-6">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
          Emergency contacts
        </h4>
        <EmergencyBlock
          title="Emergency contact 1"
          required
          relation="emergency1Relation"
          name="emergency1Name"
          address="emergency1Address"
          contact="emergency1Contact"
          data={data}
          update={update}
          errors={errors}
          onBlurField={onBlurField}
        />
        <EmergencyBlock
          title="Emergency contact 2"
          relation="emergency2Relation"
          name="emergency2Name"
          address="emergency2Address"
          contact="emergency2Contact"
          data={data}
          update={update}
          errors={errors}
          onBlurField={onBlurField}
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
          Social media <span className="text-muted-foreground font-normal">(optional)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Facebook</label>
            <Input
              value={data.facebookUrl}
              onChange={(e) => update('facebookUrl', e.target.value)}
              placeholder="Profile name or URL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Instagram</label>
            <Input
              value={data.instagramUrl}
              onChange={(e) => update('instagramUrl', e.target.value)}
              placeholder="Handle or URL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Twitter / X</label>
            <Input
              value={data.twitterUrl}
              onChange={(e) => update('twitterUrl', e.target.value)}
              placeholder="Handle or URL"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
          Email &amp; declaration
        </h4>
        <FormField field="emailId" error={errors.emailId}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Email ID <span className="text-danger">*</span>
          </label>
          <Input
            type="email"
            value={data.emailId}
            onChange={(e) => update('emailId', e.target.value)}
            onBlur={() => onBlurField('emailId')}
            error={!!errors.emailId}
            placeholder="you@example.com"
          />
        </FormField>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-text-secondary leading-relaxed">
          I hereby declare that the particulars furnished above are true and correct to the best of
          my knowledge and belief. I understand that any false information or suppression of facts
          may lead to rejection of my candidature or termination of employment if already engaged.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField field="declarationPlace" error={errors.declarationPlace}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Place <span className="text-danger">*</span>
            </label>
            <Input
              value={data.declarationPlace}
              onChange={(e) => update('declarationPlace', e.target.value)}
              onBlur={() => onBlurField('declarationPlace')}
              error={!!errors.declarationPlace}
              placeholder="e.g. Kochi"
            />
          </FormField>
          <FormField field="declarationDate" error={errors.declarationDate}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Date <span className="text-danger">*</span>
            </label>
            <Input
              type="date"
              value={data.declarationDate}
              onChange={(e) => update('declarationDate', e.target.value)}
              onBlur={() => onBlurField('declarationDate')}
              error={!!errors.declarationDate}
            />
          </FormField>
          <FormField field="declarationName" error={errors.declarationName}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Name (acknowledgment) <span className="text-danger">*</span>
            </label>
            <Input
              value={data.declarationName}
              onChange={(e) => update('declarationName', e.target.value)}
              onBlur={() => onBlurField('declarationName')}
              error={!!errors.declarationName}
              placeholder="Type your full name"
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};
