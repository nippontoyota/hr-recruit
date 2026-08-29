import { useState } from 'react';
import type { CandidateFormData } from '../wizardTypes';
import { Input, Button } from '../../../../components/ui';
import { digitsOnly } from '../../../../lib/validation';
import { FormField, type FormSectionProps } from '../FormField';

type MemberPrefix = 'father' | 'mother' | 'spouse' | 'child1' | 'child2' | 'sibling1' | 'sibling2';

const memberFields = (prefix: MemberPrefix) =>
  ({
    name: `${prefix}Name`,
    age: `${prefix}Age`,
    occupation: `${prefix}Occupation`,
    company: `${prefix}Company`,
    phone: `${prefix}Phone`,
  }) as const satisfies Record<string, keyof CandidateFormData>;

function FamilyMemberRow({
  title,
  prefix,
  required,
  showRelation,
  data,
  update,
  errors = {},
  onBlurField = () => {},
}: {
  title: string;
  prefix: MemberPrefix;
  required?: boolean;
  showRelation?: boolean;
  data: CandidateFormData;
  update: FormSectionProps['update'];
  errors?: FormSectionProps['errors'];
  onBlurField?: FormSectionProps['onBlurField'];
}) {
  const fields = memberFields(prefix);
  const relationKey = showRelation
    ? (`${prefix}Relation` as keyof CandidateFormData)
    : null;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-4">
      <h5 className="text-sm font-semibold text-text-primary">
        {title}
        {required && <span className="text-danger"> *</span>}
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {relationKey && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Relation</label>
            <Input
              value={String(data[relationKey] ?? '')}
              onChange={(e) => update(relationKey, e.target.value)}
              placeholder="e.g. Son / Daughter / Brother"
            />
          </div>
        )}
        <FormField field={fields.name} error={errors[fields.name]}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Name {required && <span className="text-danger">*</span>}
          </label>
          <Input
            value={data[fields.name]}
            onChange={(e) => update(fields.name, e.target.value)}
            onBlur={() => onBlurField(fields.name)}
            error={!!errors[fields.name]}
            placeholder="Full Name"
          />
        </FormField>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Age</label>
          <Input
            type="number"
            value={data[fields.age]}
            onChange={(e) => update(fields.age, e.target.value)}
            min={0}
            max={120}
            placeholder="e.g. 52"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Occupation</label>
          <Input
            value={data[fields.occupation]}
            onChange={(e) => update(fields.occupation, e.target.value)}
            placeholder="e.g. Teacher / Business / Retired"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Company / Institution</label>
          <Input
            value={data[fields.company]}
            onChange={(e) => update(fields.company, e.target.value)}
            placeholder="e.g. Govt School / Self Employed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Phone</label>
          <Input
            value={data[fields.phone]}
            onChange={(e) => update(fields.phone, digitsOnly(e.target.value, 10))}
            inputMode="numeric"
            maxLength={10}
            placeholder="e.g. 9876543210"
          />
        </div>
      </div>
    </div>
  );
}

function hasAnyChild(data: CandidateFormData, n: 1 | 2): boolean {
  const prefix = `child${n}` as const;
  return !!(
    data[`${prefix}Name`] ||
    data[`${prefix}Age`] ||
    data[`${prefix}Occupation`] ||
    data[`${prefix}Company`] ||
    data[`${prefix}Phone`] ||
    data[`${prefix}Relation`]
  );
}

function hasAnySibling(data: CandidateFormData, n: 1 | 2): boolean {
  const prefix = `sibling${n}` as const;
  return !!(
    data[`${prefix}Name`] ||
    data[`${prefix}Age`] ||
    data[`${prefix}Occupation`] ||
    data[`${prefix}Company`] ||
    data[`${prefix}Phone`] ||
    data[`${prefix}Relation`]
  );
}

export const FamilyForm = ({ data, update, errors = {}, onBlurField = () => {} }: FormSectionProps) => {
  const married = data.maritalStatus === 'Married';
  const [showChild1, setShowChild1] = useState(() => hasAnyChild(data, 1));
  const [showChild2, setShowChild2] = useState(() => hasAnyChild(data, 2));
  const [showSibling1, setShowSibling1] = useState(() => hasAnySibling(data, 1));
  const [showSibling2, setShowSibling2] = useState(() => hasAnySibling(data, 2));

  return (
    <div className="space-y-6 pb-6">
      <FamilyMemberRow title="Father" prefix="father" required data={data} update={update} errors={errors} onBlurField={onBlurField} />
      <FamilyMemberRow title="Mother" prefix="mother" required data={data} update={update} errors={errors} onBlurField={onBlurField} />

      {married && (
        <div className="animate-in fade-in duration-300">
          <FamilyMemberRow title="Spouse" prefix="spouse" required data={data} update={update} errors={errors} onBlurField={onBlurField} />
        </div>
      )}

      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Children (optional)</h4>
        {showChild1 && (
          <FamilyMemberRow title="Child 1" prefix="child1" showRelation data={data} update={update} />
        )}
        {showChild2 && (
          <FamilyMemberRow title="Child 2" prefix="child2" showRelation data={data} update={update} />
        )}
        <div className="flex flex-wrap gap-2">
          {!showChild1 && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowChild1(true)}>
              Add child
            </Button>
          )}
          {showChild1 && !showChild2 && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowChild2(true)}>
              Add child
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Siblings (optional)</h4>
        {showSibling1 && (
          <FamilyMemberRow title="Sibling 1" prefix="sibling1" showRelation data={data} update={update} />
        )}
        {showSibling2 && (
          <FamilyMemberRow title="Sibling 2" prefix="sibling2" showRelation data={data} update={update} />
        )}
        <div className="flex flex-wrap gap-2">
          {!showSibling1 && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowSibling1(true)}>
              Add sibling
            </Button>
          )}
          {showSibling1 && !showSibling2 && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowSibling2(true)}>
              Add sibling
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
