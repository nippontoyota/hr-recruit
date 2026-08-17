import type { ComponentProps } from 'react';
import type { CandidateFormData } from '../wizardTypes';
import { Input, Select } from '../../../../components/ui';
import { STUDY_MODES } from '../../../../lib/validation';
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
        <option value="">Mode of Study</option>
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
          <EduInput field="class10School" placeholder="School Name" {...bind} />
          <EduInput field="class10Board" placeholder="Board (e.g. CBSE)" {...bind} />
          <EduInput field="class10Percentage" type="number" placeholder="Percentage/CGPA" min={0} max={100} step="0.01" {...bind} />
          <EduInput field="class10PassingYear" type="number" placeholder="Passing Year" min={1970} max={new Date().getFullYear()} {...bind} />
          <EduMode field="class10Mode" {...bind} />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">12th Standard</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EduInput field="class12School" placeholder="School/College Name" {...bind} />
          <EduInput field="class12Stream" placeholder="Stream (Science, Arts...)" {...bind} />
          <EduInput field="class12Percentage" type="number" placeholder="Percentage/CGPA" min={0} max={100} step="0.01" {...bind} />
          <EduInput field="class12PassingYear" type="number" placeholder="Passing Year" min={1970} max={new Date().getFullYear()} {...bind} />
          <EduMode field="class12Mode" {...bind} />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Graduation</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EduInput field="gradCourse" placeholder="Course Name" {...bind} />
          <EduInput field="gradCollege" placeholder="College/University" {...bind} />
          <EduInput field="gradPercentage" type="number" placeholder="Percentage/CGPA" min={0} max={100} step="0.01" {...bind} />
          <EduInput field="gradPassingYear" type="number" placeholder="Passing Year" min={1970} max={new Date().getFullYear() + 4} {...bind} />
          <EduMode field="gradMode" {...bind} />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Post Graduation (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EduInput field="postGradCourse" placeholder="Course Name" {...bind} />
          <EduInput field="postGradCollege" placeholder="College/University" {...bind} />
          <EduInput field="postGradPercentage" type="number" placeholder="Percentage/CGPA" min={0} max={100} step="0.01" {...bind} />
          <EduInput field="postGradPassingYear" type="number" placeholder="Passing Year" min={1970} max={new Date().getFullYear() + 4} {...bind} />
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
            placeholder="Optional — list software or certificates"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Languages Known</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Languages to Read <span className="text-danger">*</span>
            </label>
            <p className="text-xs text-text-secondary mb-3">Languages you can read.</p>
            <EduInput field="languagesRead" placeholder="e.g. English, Malayalam" {...bind} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Languages to Write <span className="text-danger">*</span>
            </label>
            <p className="text-xs text-text-secondary mb-3">Languages you can write.</p>
            <EduInput field="languagesWrite" placeholder="e.g. English" {...bind} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Languages to Speak <span className="text-danger">*</span>
            </label>
            <p className="text-xs text-text-secondary mb-3">Languages you can speak fluently.</p>
            <EduInput field="languagesSpeak" placeholder="e.g. English, Malayalam, Hindi" {...bind} />
          </div>
        </div>
      </div>
    </div>
  );
};
