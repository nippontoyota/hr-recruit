import type { ComponentProps } from 'react';
import type { CandidateFormData } from '../wizardTypes';
import { Input, Select } from '../../../../components/ui';
import { STUDY_MODES } from '../../../../lib/validation';
import { GRADUATION_COURSES, POST_GRADUATION_COURSES } from '../../../../lib/educationDegrees';
import { FormField, type FormSectionProps } from '../FormField';

function EduInput({
  field,
  data,
  update,
  errors,
  onBlurField,
  ...rest
}: {
  field: keyof CandidateFormData;
  data: CandidateFormData;
  update: FormSectionProps['update'];
  errors: NonNullable<FormSectionProps['errors']>;
  onBlurField: NonNullable<FormSectionProps['onBlurField']>;
} & Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur' | 'error'>) {
  return (
    <FormField field={field} error={errors[field]}>
      <Input
        value={String(data[field] ?? '')}
        onChange={(e) => update(field, e.target.value)}
        onBlur={() => onBlurField(field)}
        error={!!errors[field]}
        {...rest}
      />
    </FormField>
  );
}

function EduSelect({
  field,
  data,
  update,
  errors,
  onBlurField,
  placeholder,
  options,
}: {
  field: keyof CandidateFormData;
  data: CandidateFormData;
  update: FormSectionProps['update'];
  errors: NonNullable<FormSectionProps['errors']>;
  onBlurField: NonNullable<FormSectionProps['onBlurField']>;
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <FormField field={field} error={errors[field]}>
      <Select
        value={String(data[field] ?? '')}
        onChange={(e) => {
          update(field, e.target.value);
          setTimeout(() => onBlurField(field), 0);
        }}
        error={!!errors[field]}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </Select>
    </FormField>
  );
}

function EduMode({
  field,
  data,
  update,
  errors,
  onBlurField,
}: {
  field: keyof CandidateFormData;
  data: CandidateFormData;
  update: FormSectionProps['update'];
  errors: NonNullable<FormSectionProps['errors']>;
  onBlurField: NonNullable<FormSectionProps['onBlurField']>;
}) {
  return (
    <FormField field={field} error={errors[field]}>
      <Select
        value={String(data[field] ?? '')}
        onChange={(e) => {
          update(field, e.target.value);
          setTimeout(() => onBlurField(field), 0);
        }}
        error={!!errors[field]}
      >
        <option value="" disabled>Mode of Study</option>
        {STUDY_MODES.map((mode) => (
          <option key={mode} value={mode}>{mode}</option>
        ))}
      </Select>
    </FormField>
  );
}

export const EducationForm = ({ data, update, errors = {}, onBlurField = () => {} }: FormSectionProps) => {
  const bind = { data, update, errors, onBlurField };
  return (
    <div className="space-y-8 pb-6">
      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">10th Standard</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EduInput field="class10School" placeholder="School Name (e.g. St. Albert's High School)" {...bind} />
          <EduInput field="class10Board" placeholder="Board (e.g. State Board / CBSE / ICSE)" {...bind} />
          <EduInput field="class10Percentage" type="number" placeholder="Percentage / CGPA (e.g. 85.5)" min={0} max={100} step="0.01" {...bind} />
          <EduInput field="class10PassingYear" type="number" placeholder="Passing Year (e.g. 2018)" min={1970} max={new Date().getFullYear()} {...bind} />
          <EduMode field="class10Mode" {...bind} />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">12th Standard</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EduInput field="class12School" placeholder="School / College Name (e.g. Model HSS)" {...bind} />
          <EduInput field="class12Stream" placeholder="Stream (e.g. Science / Commerce / Humanities)" {...bind} />
          <EduInput field="class12Percentage" type="number" placeholder="Percentage / CGPA (e.g. 82.0)" min={0} max={100} step="0.01" {...bind} />
          <EduInput field="class12PassingYear" type="number" placeholder="Passing Year (e.g. 2020)" min={1970} max={new Date().getFullYear()} {...bind} />
          <EduMode field="class12Mode" {...bind} />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Graduation (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EduSelect
            field="gradCourse"
            placeholder="Select Degree / Diploma"
            options={GRADUATION_COURSES}
            {...bind}
          />
          <EduInput field="gradStream" placeholder="Specialization (e.g. Automobile / Mechanical / CSE / B.Com)" {...bind} />
          <EduInput field="gradCollege" placeholder="College / University (e.g. CUSAT / MG University)" {...bind} />
          <EduInput field="gradPercentage" type="number" placeholder="Percentage / CGPA (e.g. 78.5)" min={0} max={100} step="0.01" {...bind} />
          <EduInput field="gradPassingYear" type="number" placeholder="Passing Year (e.g. 2023)" min={1970} max={new Date().getFullYear() + 4} {...bind} />
          <EduMode field="gradMode" {...bind} />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Post Graduation (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EduSelect
            field="postGradCourse"
            placeholder="Select Master's / PG Degree"
            options={POST_GRADUATION_COURSES}
            {...bind}
          />
          <EduInput field="postGradStream" placeholder="Specialization (e.g. Marketing / Finance / HR)" {...bind} />
          <EduInput field="postGradCollege" placeholder="College / University (e.g. Rajagiri / CUSAT)" {...bind} />
          <EduInput field="postGradPercentage" type="number" placeholder="Percentage / CGPA (e.g. 80.0)" min={0} max={100} step="0.01" {...bind} />
          <EduInput field="postGradPassingYear" type="number" placeholder="Passing Year (e.g. 2025)" min={1970} max={new Date().getFullYear() + 4} {...bind} />
          <EduMode field="postGradMode" {...bind} />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Computer Knowledge</h4>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ['compWord', 'MS Word'],
              ['compExcel', 'MS Excel'],
              ['compPowerPoint', 'PowerPoint'],
              ['compTally', 'Tally'],
              ['compOther', 'Other'],
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
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Other Software / Certifications
          </label>
          <Input
            value={data.softwareCerts}
            onChange={(e) => update('softwareCerts', e.target.value)}
            placeholder="e.g. SAP, AutoX, Photoshop, Dealer Management Software"
          />
        </div>
      </div>
    </div>
  );
};
