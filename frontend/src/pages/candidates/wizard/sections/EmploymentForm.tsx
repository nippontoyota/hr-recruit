import { useState } from 'react';
import type { CandidateFormData } from '../wizardTypes';
import { Input, Button } from '../../../../components/ui';
import { digitsOnly } from '../../../../lib/validation';

interface EmploymentFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

function hasPrevJob(data: CandidateFormData, n: 2 | 3 | 4): boolean {
  const prefix = `prev${n}` as const;
  return !!(
    data[`${prefix}Name`] ||
    data[`${prefix}Position`] ||
    data[`${prefix}Reporting`] ||
    data[`${prefix}From`] ||
    data[`${prefix}To`] ||
    data[`${prefix}Salary`] ||
    data[`${prefix}Reason`]
  );
}

function JobFields({
  title,
  companyField,
  positionField,
  reportingField,
  fromField,
  toField,
  salaryField,
  reasonField,
  required,
  data,
  update,
}: {
  title: string;
  companyField: keyof CandidateFormData;
  positionField: keyof CandidateFormData;
  reportingField: keyof CandidateFormData;
  fromField: keyof CandidateFormData;
  toField: keyof CandidateFormData;
  salaryField: keyof CandidateFormData;
  reasonField: keyof CandidateFormData;
  required?: boolean;
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}) {
  const star = required ? <span className="text-danger">*</span> : null;
  return (
    <div className="space-y-4 rounded-lg border border-border/60 p-4 animate-in fade-in duration-300">
      <h5 className="text-sm font-semibold text-text-primary">{title}</h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-primary mb-1">
            Company &amp; Address {star}
          </label>
          <Input
            value={String(data[companyField] ?? '')}
            onChange={(e) => update(companyField, e.target.value)}
            placeholder="Company name and address"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Position {star}
          </label>
          <Input
            value={String(data[positionField] ?? '')}
            onChange={(e) => update(positionField, e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Reporting To {star}
          </label>
          <Input
            value={String(data[reportingField] ?? '')}
            onChange={(e) => update(reportingField, e.target.value)}
            placeholder="Manager / supervisor name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            From {star}
          </label>
          <Input
            type="month"
            value={String(data[fromField] ?? '')}
            onChange={(e) => update(fromField, e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            To {star}
          </label>
          <Input
            type="month"
            value={String(data[toField] ?? '')}
            onChange={(e) => update(toField, e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Last Salary {star}
          </label>
          <Input
            value={String(data[salaryField] ?? '')}
            onChange={(e) => update(salaryField, digitsOnly(e.target.value, 8))}
            placeholder="₹"
            inputMode="numeric"
            maxLength={8}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Reason for Leaving {star}
          </label>
          <Input
            value={String(data[reasonField] ?? '')}
            onChange={(e) => update(reasonField, e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export const EmploymentForm = ({ data, update }: EmploymentFormProps) => {
  const [extraJobs, setExtraJobs] = useState(() => {
    if (hasPrevJob(data, 4)) return 3;
    if (hasPrevJob(data, 3)) return 2;
    if (hasPrevJob(data, 2)) return 1;
    return 0;
  });

  const handleExperienceToggle = (checked: boolean) => {
    update('previousExperience', checked);
    if (!checked) {
      update('totalExperience', 'Fresher');
      setExtraJobs(0);
    } else if (data.totalExperience === 'Fresher' || !data.totalExperience) {
      update('totalExperience', '');
    }
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
        <div className="space-y-4">
          <JobFields
            title="Previous Employer 1"
            companyField="prevCompanyName"
            positionField="prevPosition"
            reportingField="prev1Reporting"
            fromField="prev1From"
            toField="prev1To"
            salaryField="prev1Salary"
            reasonField="prev1Reason"
            required
            data={data}
            update={update}
          />

          {extraJobs >= 1 && (
            <JobFields
              title="Previous Employer 2"
              companyField="prev2Name"
              positionField="prev2Position"
              reportingField="prev2Reporting"
              fromField="prev2From"
              toField="prev2To"
              salaryField="prev2Salary"
              reasonField="prev2Reason"
              data={data}
              update={update}
            />
          )}
          {extraJobs >= 2 && (
            <JobFields
              title="Previous Employer 3"
              companyField="prev3Name"
              positionField="prev3Position"
              reportingField="prev3Reporting"
              fromField="prev3From"
              toField="prev3To"
              salaryField="prev3Salary"
              reasonField="prev3Reason"
              data={data}
              update={update}
            />
          )}
          {extraJobs >= 3 && (
            <JobFields
              title="Previous Employer 4"
              companyField="prev4Name"
              positionField="prev4Position"
              reportingField="prev4Reporting"
              fromField="prev4From"
              toField="prev4To"
              salaryField="prev4Salary"
              reasonField="prev4Reason"
              data={data}
              update={update}
            />
          )}

          {extraJobs < 3 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setExtraJobs((n) => Math.min(3, n + 1))}
            >
              Add previous employer
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Total Experience (Years/Months) <span className="text-danger">*</span>
          </label>
          <Input
            value={data.totalExperience}
            onChange={(e) => update('totalExperience', e.target.value)}
            placeholder={data.previousExperience ? 'e.g. 2 Years 3 Months' : 'Fresher'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Expected Salary <span className="text-danger">*</span>
          </label>
          <Input
            value={data.expectedSalary}
            onChange={(e) => update('expectedSalary', digitsOnly(e.target.value, 8))}
            placeholder="₹"
            inputMode="numeric"
            maxLength={8}
          />
        </div>
      </div>
    </div>
  );
};
