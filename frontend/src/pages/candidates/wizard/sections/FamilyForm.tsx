import type { CandidateFormData, FamilyMember } from '../wizardTypes';
import {
  EMPTY_FAMILY_MEMBER,
  familyMembersFromForm,
  familyMembersPatch,
} from '../wizardTypes';
import { Input, Button } from '../../../../components/ui';
import { digitsOnly } from '../../../../lib/validation';
import { FormField, type FormSectionProps } from '../FormField';

function hasContent(member: FamilyMember): boolean {
  return [member.relation, member.name, member.age, member.occupation, member.company, member.phone]
    .some((value) => value.trim() !== '');
}

function coreMembers(data: CandidateFormData): FamilyMember[] {
  const members = familyMembersFromForm(data);
  const married = data.maritalStatus === 'Married';
  const father = members.find((member) => member.relation.trim().toLowerCase() === 'father') || members[0];
  const mother = members.find((member) => member.relation.trim().toLowerCase() === 'mother') || members[1];
  const spouse = married
    ? members.find((member) => member.relation.trim().toLowerCase() === 'spouse') || members[2]
    : undefined;
  const optional = members.filter((member) => member !== father && member !== mother && member !== spouse);
  return [
    father || { ...EMPTY_FAMILY_MEMBER, relation: 'Father' },
    mother || { ...EMPTY_FAMILY_MEMBER, relation: 'Mother' },
    ...(married
      ? [spouse || { ...EMPTY_FAMILY_MEMBER, relation: 'Spouse' }]
      : []),
    ...optional,
  ];
}

function FamilyMemberRow({
  member,
  index,
  required,
  updateMember,
  removeMember,
  errors,
  onBlurField,
}: {
  member: FamilyMember;
  index: number;
  required: boolean;
  updateMember: (index: number, patch: Partial<FamilyMember>) => void;
  removeMember?: () => void;
  errors: FormSectionProps['errors'];
  onBlurField: FormSectionProps['onBlurField'];
}) {
  const relation = member.relation.trim().toLowerCase();
  const nameField = relation === 'father' ? 'fatherName' : relation === 'mother' ? 'motherName' : undefined;

  return (
    <div className="space-y-3 rounded-lg border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h5 className="text-sm font-semibold text-text-primary">
          {member.relation || `Family member ${index + 1}`}
          {required && <span className="text-danger"> *</span>}
        </h5>
        {removeMember && (
          <Button type="button" variant="ghost" size="sm" onClick={removeMember}>
            Remove
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Relation</label>
          <Input
            value={member.relation}
            onChange={(e) => updateMember(index, { relation: e.target.value })}
            placeholder="e.g. Father / Sister"
          />
        </div>
        <FormField field={nameField || `familyMembers.${index}.name`} error={nameField ? errors?.[nameField] : undefined}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Name {required && <span className="text-danger">*</span>}
          </label>
          <Input
            value={member.name}
            onChange={(e) => updateMember(index, { name: e.target.value })}
            onBlur={nameField ? () => onBlurField?.(nameField) : undefined}
            error={!!(nameField && errors?.[nameField])}
            placeholder="Full Name"
          />
        </FormField>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Age</label>
          <Input
            type="number"
            value={member.age}
            onChange={(e) => updateMember(index, { age: e.target.value })}
            min={0}
            max={120}
            placeholder="e.g. 52"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Occupation</label>
          <Input
            value={member.occupation}
            onChange={(e) => updateMember(index, { occupation: e.target.value })}
            placeholder="e.g. Teacher / Business / Retired"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Company / Institution</label>
          <Input
            value={member.company}
            onChange={(e) => updateMember(index, { company: e.target.value })}
            placeholder="e.g. Govt School / Self Employed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Phone</label>
          <Input
            value={member.phone}
            onChange={(e) => updateMember(index, { phone: digitsOnly(e.target.value, 10) })}
            inputMode="numeric"
            maxLength={10}
            placeholder="e.g. 9876543210"
          />
        </div>
      </div>
    </div>
  );
}

export const FamilyForm = ({ data, update, patch, errors = {}, onBlurField = () => {} }: FormSectionProps) => {
  const members = coreMembers(data);
  const requiredCount = data.maritalStatus === 'Married' ? 3 : 2;

  const writeMembers = (next: FamilyMember[]) => {
    const nextFields = familyMembersPatch(next);
    if (patch) {
      patch(nextFields);
      return;
    }
    (Object.entries(nextFields) as [keyof CandidateFormData, CandidateFormData[keyof CandidateFormData]][]).forEach(
      ([field, value]) => update(field, value),
    );
  };

  const updateMember = (index: number, memberPatch: Partial<FamilyMember>) => {
    writeMembers(members.map((member, memberIndex) => (
      memberIndex === index ? { ...member, ...memberPatch } : member
    )));
  };

  const removeMember = (index: number) => {
    if (index < requiredCount) return;
    writeMembers(members.filter((_, memberIndex) => memberIndex !== index));
  };

  return (
    <div className="space-y-6 pb-6" data-field="familyMembers">
      {members.map((member, index) => (
        <FamilyMemberRow
          key={`${member.relation}-${index}`}
          member={member}
          index={index}
          required={index < requiredCount}
          updateMember={updateMember}
          removeMember={index >= requiredCount ? () => removeMember(index) : undefined}
          errors={errors}
          onBlurField={onBlurField}
        />
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => writeMembers([...members, { ...EMPTY_FAMILY_MEMBER, relation: 'Family Member' }])}
      >
        Add family member
      </Button>
      {errors.familyMembers && <p className="text-xs text-danger" role="alert">{errors.familyMembers}</p>}
      {members.some(hasContent) && <p className="text-xs text-text-secondary">Add as many family members as needed.</p>}
    </div>
  );
};
