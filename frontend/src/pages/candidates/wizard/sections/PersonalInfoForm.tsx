import { Input, Select } from '../../../../components/ui';
import { UploadCloud } from 'lucide-react';
import { FormField, type FormSectionProps } from '../FormField';

export const PersonalInfoForm = ({
  data,
  update,
  patch,
  errors = {},
  onBlurField = () => {},
}: FormSectionProps) => {
  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField field="photoFileObject" error={errors.photoFileObject}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Candidate Photo (PNG/JPEG) <span className="text-danger">*</span>
            </label>
            <div className={`border border-dashed ${errors.photoFileObject ? 'border-danger' : 'border-border'} rounded-lg p-5 bg-content text-center relative hover:border-primary/40 transition-colors min-w-0 overflow-hidden`}>
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept="image/png, image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  update('photoFileObject', file);
                  onBlurField('photoFileObject');
                }}
              />
              <div className="flex flex-col items-center justify-center pointer-events-none min-w-0 w-full">
                <UploadCloud className="w-8 h-8 text-text-secondary mb-2 shrink-0" />
                <span className="text-xs text-text-secondary w-full min-w-0 break-all">
                  {data.photoFileObject ? data.photoFileObject.name : 'Select your photo (PNG or JPEG)'}
                </span>
              </div>
            </div>
          </FormField>

          <FormField field="resumeFileObject" error={errors.resumeFileObject}>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Resume (PDF or Word) <span className="text-danger">*</span>
            </label>
            <div className={`border border-dashed ${errors.resumeFileObject ? 'border-danger' : 'border-border'} rounded-lg p-5 bg-content text-center relative hover:border-primary/40 transition-colors min-w-0 overflow-hidden`}>
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  update('resumeFileObject', file);
                  onBlurField('resumeFileObject');
                }}
              />
              <div className="flex flex-col items-center justify-center pointer-events-none min-w-0 w-full">
                <UploadCloud className="w-8 h-8 text-text-secondary mb-2 shrink-0" />
                <span className="text-xs text-text-secondary w-full min-w-0 break-all">
                  {data.resumeFileObject ? data.resumeFileObject.name : 'Select your PDF or Word resume'}
                </span>
              </div>
            </div>
          </FormField>
        </div>
        <FormField field="nameAadhaar" error={errors.nameAadhaar}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Name (As per Aadhaar) <span className="text-danger">*</span>
          </label>
          <Input
            value={data.nameAadhaar}
            onChange={(e) => update('nameAadhaar', e.target.value)}
            onBlur={() => onBlurField('nameAadhaar')}
            error={!!errors.nameAadhaar}
            maxLength={100}
          />
        </FormField>

        <FormField field="gender" error={errors.gender}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Gender <span className="text-danger">*</span>
          </label>
          <Select
            value={data.gender}
            onChange={(e) => {
              update('gender', e.target.value);
              setTimeout(() => onBlurField('gender'), 0);
            }}
            error={!!errors.gender}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </Select>
        </FormField>

        <FormField field="dateOfBirth" error={errors.dateOfBirth}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Date of Birth <span className="text-danger">*</span>
          </label>
          <Input
            type="date"
            value={data.dateOfBirth}
            onChange={(e) => {
              const newDob = e.target.value;
              let age = '';
              if (newDob) {
                const dobDate = new Date(newDob);
                const today = new Date();
                let calculatedAge = today.getFullYear() - dobDate.getFullYear();
                const m = today.getMonth() - dobDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
                  calculatedAge--;
                }
                age = calculatedAge.toString();
              }
              if (patch) patch({ dateOfBirth: newDob, age });
              else {
                update('dateOfBirth', newDob);
                update('age', age);
              }
            }}
            onBlur={() => onBlurField('dateOfBirth')}
            error={!!errors.dateOfBirth}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            min={new Date(new Date().setFullYear(new Date().getFullYear() - 65)).toISOString().split('T')[0]}
          />
        </FormField>

        <FormField field="age" error={errors.age}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Age <span className="text-danger">*</span>
          </label>
          <Input
            type="number"
            value={data.age}
            onChange={(e) => update('age', e.target.value)}
            onBlur={() => onBlurField('age')}
            error={!!errors.age}
            min={18}
            max={65}
          />
        </FormField>

        <FormField field="maritalStatus" error={errors.maritalStatus}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Marital Status <span className="text-danger">*</span>
          </label>
          <Select
            value={data.maritalStatus}
            onChange={(e) => {
              update('maritalStatus', e.target.value);
              setTimeout(() => onBlurField('maritalStatus'), 0);
            }}
            error={!!errors.maritalStatus}
          >
            <option value="">Select Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </Select>
        </FormField>

        <FormField field="bloodGroup" error={errors.bloodGroup}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Blood Group <span className="text-danger">*</span>
          </label>
          <Select
            value={data.bloodGroup}
            onChange={(e) => {
              update('bloodGroup', e.target.value);
              setTimeout(() => onBlurField('bloodGroup'), 0);
            }}
            error={!!errors.bloodGroup}
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </Select>
        </FormField>

        <FormField field="height" error={errors.height}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Height (cm) <span className="text-danger">*</span>
          </label>
          <Input
            type="number"
            value={data.height}
            onChange={(e) => update('height', e.target.value)}
            onBlur={() => onBlurField('height')}
            error={!!errors.height}
            min={100}
            max={250}
          />
        </FormField>

        <FormField field="weight" error={errors.weight}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Weight (kg) <span className="text-danger">*</span>
          </label>
          <Input
            type="number"
            value={data.weight}
            onChange={(e) => update('weight', e.target.value)}
            onBlur={() => onBlurField('weight')}
            error={!!errors.weight}
            min={30}
            max={200}
          />
        </FormField>

        <FormField field="religionCaste" error={errors.religionCaste}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Religion & Caste <span className="text-danger">*</span>
          </label>
          <Input
            value={data.religionCaste}
            onChange={(e) => update('religionCaste', e.target.value)}
            onBlur={() => onBlurField('religionCaste')}
            error={!!errors.religionCaste}
            placeholder="e.g. Hindu / General"
          />
        </FormField>

        <FormField field="positionSuitable" error={errors.positionSuitable}>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Position Suitable
          </label>
          <Input
            value={data.positionSuitable}
            onChange={(e) => update('positionSuitable', e.target.value)}
            onBlur={() => onBlurField('positionSuitable')}
            error={!!errors.positionSuitable}
            placeholder="Optional — other role you may suit"
            maxLength={100}
          />
        </FormField>
      </div>
    </div>
  );
};
