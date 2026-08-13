import type { CandidateFormData } from '../wizardTypes';
import { Input, Select } from '../../../../components/ui';
import { STUDY_MODES } from '../../../../lib/validation';

interface EducationFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

export const EducationForm = ({ data, update }: EducationFormProps) => {
  return (
    <div className="space-y-8 pb-6">
      {/* 10th Standard */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">10th Standard</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="School Name" value={data.class10School} onChange={(e) => update('class10School', e.target.value)} />
          <Input placeholder="Board (e.g. CBSE)" value={data.class10Board} onChange={(e) => update('class10Board', e.target.value)} />
          <Input type="number" placeholder="Percentage/CGPA" value={data.class10Percentage} onChange={(e) => update('class10Percentage', e.target.value)} min={0} max={100} step="0.01" />
          <Input type="number" placeholder="Passing Year" value={data.class10PassingYear} onChange={(e) => update('class10PassingYear', e.target.value)} min={1970} max={new Date().getFullYear()} />
          <Select value={data.class10Mode} onChange={(e) => update('class10Mode', e.target.value)}>
            <option value="">Mode of Study</option>
            {STUDY_MODES.map((mode) => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* 12th Standard */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">12th Standard</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input placeholder="School/College Name" value={data.class12School} onChange={(e) => update('class12School', e.target.value)} />
          <Input placeholder="Stream (Science, Arts...)" value={data.class12Stream} onChange={(e) => update('class12Stream', e.target.value)} />
          <Input type="number" placeholder="Percentage/CGPA" value={data.class12Percentage} onChange={(e) => update('class12Percentage', e.target.value)} min={0} max={100} step="0.01" />
          <Input type="number" placeholder="Passing Year" value={data.class12PassingYear} onChange={(e) => update('class12PassingYear', e.target.value)} min={1970} max={new Date().getFullYear()} />
          <Select value={data.class12Mode} onChange={(e) => update('class12Mode', e.target.value)}>
            <option value="">Mode of Study</option>
            {STUDY_MODES.map((mode) => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Graduation */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Graduation</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input placeholder="Course Name" value={data.gradCourse} onChange={(e) => update('gradCourse', e.target.value)} />
          <Input placeholder="College/University" value={data.gradCollege} onChange={(e) => update('gradCollege', e.target.value)} />
          <Input type="number" placeholder="Percentage/CGPA" value={data.gradPercentage} onChange={(e) => update('gradPercentage', e.target.value)} min={0} max={100} step="0.01" />
          <Input type="number" placeholder="Passing Year" value={data.gradPassingYear} onChange={(e) => update('gradPassingYear', e.target.value)} min={1970} max={new Date().getFullYear()} />
          <Select value={data.gradMode} onChange={(e) => update('gradMode', e.target.value)}>
            <option value="">Mode of Study</option>
            {STUDY_MODES.map((mode) => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Post Graduation */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Post Graduation (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input placeholder="Course Name" value={data.postGradCourse} onChange={(e) => update('postGradCourse', e.target.value)} />
          <Input placeholder="College/University" value={data.postGradCollege} onChange={(e) => update('postGradCollege', e.target.value)} />
          <Input type="number" placeholder="Percentage/CGPA" value={data.postGradPercentage} onChange={(e) => update('postGradPercentage', e.target.value)} min={0} max={100} step="0.01" />
          <Input type="number" placeholder="Passing Year" value={data.postGradPassingYear} onChange={(e) => update('postGradPassingYear', e.target.value)} min={1970} max={new Date().getFullYear()} />
          <Select value={data.postGradMode} onChange={(e) => update('postGradMode', e.target.value)}>
            <option value="">Mode of Study</option>
            {STUDY_MODES.map((mode) => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Computer knowledge */}
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

      {/* Languages */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-text-primary border-b border-border pb-2">Languages Known</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Languages to Read <span className="text-danger">*</span>
            </label>
            <p className="text-xs text-text-secondary mb-3">Languages you can read.</p>
            <Input
              value={data.languagesRead}
              onChange={(e) => update('languagesRead', e.target.value)}
              placeholder="e.g. English, Malayalam"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Languages to Write <span className="text-danger">*</span>
            </label>
            <p className="text-xs text-text-secondary mb-3">Languages you can write.</p>
            <Input
              value={data.languagesWrite}
              onChange={(e) => update('languagesWrite', e.target.value)}
              placeholder="e.g. English"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Languages to Speak <span className="text-danger">*</span>
            </label>
            <p className="text-xs text-text-secondary mb-3">Languages you can speak fluently.</p>
            <Input
              value={data.languagesSpeak}
              onChange={(e) => update('languagesSpeak', e.target.value)}
              placeholder="e.g. English, Malayalam, Hindi"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
