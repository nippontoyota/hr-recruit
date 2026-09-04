import type { CandidateFormData, PreviousJob } from '../wizardTypes';
import {
  EMPTY_PREVIOUS_JOB,
  MAX_PREVIOUS_JOBS,
  previousJobsFromForm,
  previousJobsPatch,
} from '../wizardTypes';
import { Input, Button } from '../../../../components/ui';
import { digitsOnly } from '../../../../lib/validation';
import { FormField, type FormSectionProps } from '../FormField';

function JobFields({
  title,
  job,
  required,
  onChange,
  onRemove,
}: {
  title: string;
  job: PreviousJob;
  required?: boolean;
  onChange: (patch: Partial<PreviousJob>) => void;
  onRemove?: () => void;
}) {
  const star = required ? <span className="text-danger">*</span> : null;
  return (
    <div className="space-y-4 rounded-lg border border-border/60 p-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-3">
        <h5 className="text-sm font-semibold text-text-primary">{title}</h5>
        {onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-primary mb-1">
            Company &amp; Address {star}
          </label>
          <Input
            value={job.company}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder="e.g. Popular Vehicles & Services, Edappally, Kochi"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Position {star}
          </label>
          <Input
            value={job.position}
            onChange={(e) => onChange({ position: e.target.value })}
            placeholder="e.g. Service Advisor / Customer Relations Executive"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Reporting Person Name {star}
          </label>
          <Input
            value={job.reporting}
            onChange={(e) => onChange({ reporting: e.target.value })}
            placeholder="e.g. Manoj Kumar"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Reporting Person&apos;s Designation {star}
          </label>
          <Input
            value={job.reportingDesignation}
            onChange={(e) => onChange({ reportingDesignation: e.target.value })}
            placeholder="e.g. Service Manager"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Reporting Person&apos;s Phone {star}
          </label>
          <Input
            type="tel"
            value={job.reportingPhone}
            onChange={(e) => onChange({ reportingPhone: digitsOnly(e.target.value, 10) })}
            placeholder="e.g. 9876543210"
            inputMode="numeric"
            maxLength={10}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            From {star}
          </label>
          <Input
            type="date"
            value={job.fromDate}
            onChange={(e) => onChange({ fromDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            To {star}
          </label>
          <Input
            type="date"
            value={job.toDate}
            onChange={(e) => onChange({ toDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Last Salary {star}
          </label>
          <Input
            value={job.salary}
            onChange={(e) => onChange({ salary: digitsOnly(e.target.value, 8) })}
            placeholder="₹ e.g. 25000"
            inputMode="numeric"
            maxLength={8}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Reason for Leaving {star}
          </label>
          <Input
            value={job.reason}
            onChange={(e) => onChange({ reason: e.target.value })}
            placeholder="e.g. Career Growth / Better Opportunity"
          />
        </div>
      </div>
    </div>
  );
}

export const EmploymentForm = ({ data, update, patch, errors = {}, onBlurField = () => {} }: FormSectionProps) => {
  const jobs = data.previousExperience
    ? (data.previousJobs?.length ? data.previousJobs : previousJobsFromForm(data))
    : [];
  const visibleJobs = data.previousExperience && jobs.length === 0 ? [EMPTY_PREVIOUS_JOB] : jobs;

  const writeJobs = (next: PreviousJob[]) => {
    const nextFields = previousJobsPatch(next);
    if (patch) {
      patch(nextFields);
      return;
    }
    (Object.entries(nextFields) as [keyof CandidateFormData, CandidateFormData[keyof CandidateFormData]][]).forEach(
      ([field, value]) => update(field, value),
    );
  };

  const handleExperienceToggle = (checked: boolean) => {
    if (!checked) {
      update('previousExperience', false);
      update('totalExperience', '');
      writeJobs([]);
      return;
    }
    const existing = data.previousJobs?.length ? data.previousJobs : previousJobsFromForm(data);
    const nextJobs = existing.length ? existing : [{ ...EMPTY_PREVIOUS_JOB }];
    if (patch) {
      patch({
        previousExperience: true,
        totalExperience: data.totalExperience,
        ...previousJobsPatch(nextJobs),
      });
      return;
    }
    update('previousExperience', true);
    writeJobs(nextJobs);
  };

  const updateJob = (index: number, jobPatch: Partial<PreviousJob>) => {
    const next = visibleJobs.map((job, i) => (i === index ? { ...job, ...jobPatch } : job));
    writeJobs(next);
  };

  const addJob = () => {
    if (visibleJobs.length >= MAX_PREVIOUS_JOBS) return;
    writeJobs([...visibleJobs, { ...EMPTY_PREVIOUS_JOB }]);
  };

  const removeJob = (index: number) => {
    if (visibleJobs.length <= 1) return;
    writeJobs(visibleJobs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center space-x-2 pb-2">
        <label className="flex items-center space-x-2 text-sm font-medium text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={data.previousExperience}
            onChange={(e) => handleExperienceToggle(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span>I have previous work experience</span>
        </label>
      </div>

      {data.previousExperience && (
        <div className="space-y-4" data-field="previousJobs">
          {errors.previousJobs && (
            <p className="text-xs text-danger" role="alert">{errors.previousJobs}</p>
          )}
          {visibleJobs.map((job, index) => (
            <JobFields
              key={index}
              title={`Previous Employer ${index + 1}`}
              job={job}
              required={index === 0}
              onChange={(patch) => updateJob(index, patch)}
              onRemove={visibleJobs.length > 1 ? () => removeJob(index) : undefined}
            />
          ))}

          {visibleJobs.length < MAX_PREVIOUS_JOBS && (
            <Button type="button" variant="secondary" size="sm" onClick={addJob}>
              Add previous employer
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.previousExperience && (
          <FormField field="totalExperience" error={errors.totalExperience}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Total Experience (Years/Months) <span className="text-danger">*</span>
            </label>
            <Input
              value={data.totalExperience}
              onChange={(e) => update('totalExperience', e.target.value)}
              onBlur={() => onBlurField('totalExperience')}
              error={!!errors.totalExperience}
              placeholder="e.g. 2 Years 3 Months"
            />
          </FormField>
        )}

        <FormField field="expectedSalary" error={errors.expectedSalary}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Expected Salary <span className="text-danger">*</span>
          </label>
          <Input
            value={data.expectedSalary}
            onChange={(e) => update('expectedSalary', digitsOnly(e.target.value, 8))}
            onBlur={() => onBlurField('expectedSalary')}
            error={!!errors.expectedSalary}
            placeholder="₹"
            inputMode="numeric"
            maxLength={8}
          />
        </FormField>
      </div>
    </div>
  );
};
