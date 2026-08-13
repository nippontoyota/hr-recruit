import type { CandidateFormData } from '../wizardTypes';
import { Input } from '../../../../components/ui';
import { digitsOnly } from '../../../../lib/validation';

interface EmergencySocialFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

function EmergencyBlock({
  title,
  required,
  relation,
  name,
  address,
  contact,
  data,
  update,
}: {
  title: string;
  required?: boolean;
  relation: keyof CandidateFormData;
  name: keyof CandidateFormData;
  address: keyof CandidateFormData;
  contact: keyof CandidateFormData;
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
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
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Relation {star}
          </label>
          <Input
            value={String(data[relation] ?? '')}
            onChange={(e) => update(relation, e.target.value)}
            placeholder="e.g. Uncle / Friend"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Name {star}
          </label>
          <Input
            value={String(data[name] ?? '')}
            onChange={(e) => update(name, e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-primary mb-1">
            Address {star}
          </label>
          <Input
            value={String(data[address] ?? '')}
            onChange={(e) => update(address, e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Contact Number {star}
          </label>
          <Input
            type="tel"
            value={String(data[contact] ?? '')}
            onChange={(e) => update(contact, digitsOnly(e.target.value, 10))}
            placeholder="9876543210"
            inputMode="numeric"
            maxLength={10}
          />
        </div>
      </div>
    </div>
  );
}

export const EmergencySocialForm = ({ data, update }: EmergencySocialFormProps) => {
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
        />
        <EmergencyBlock
          title="Emergency contact 2"
          relation="emergency2Relation"
          name="emergency2Name"
          address="emergency2Address"
          contact="emergency2Contact"
          data={data}
          update={update}
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
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Email ID <span className="text-danger">*</span>
          </label>
          <Input
            type="email"
            value={data.emailId}
            onChange={(e) => update('emailId', e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-text-secondary leading-relaxed">
          I hereby declare that the particulars furnished above are true and correct to the best of
          my knowledge and belief. I understand that any false information or suppression of facts
          may lead to rejection of my candidature or termination of employment if already engaged.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Place <span className="text-danger">*</span>
            </label>
            <Input
              value={data.declarationPlace}
              onChange={(e) => update('declarationPlace', e.target.value)}
              placeholder="e.g. Kochi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Date <span className="text-danger">*</span>
            </label>
            <Input
              type="date"
              value={data.declarationDate}
              onChange={(e) => update('declarationDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Name (acknowledgment) <span className="text-danger">*</span>
            </label>
            <Input
              value={data.declarationName}
              onChange={(e) => update('declarationName', e.target.value)}
              placeholder="Type your full name"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
