import type { CandidateFormData } from '../wizardTypes';
import { Input, Select } from '../../../../components/ui';

interface PersonalInfoFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
  errors?: Partial<Record<keyof CandidateFormData, string>>;
  onBlurField?: (field: keyof CandidateFormData) => void;
}

export const PersonalInfoForm = ({ data, update, errors = {}, onBlurField = () => {} }: PersonalInfoFormProps) => {
  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
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
          {errors.nameAadhaar && <p className="text-xs text-danger mt-1">{errors.nameAadhaar}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Gender <span className="text-danger">*</span>
          </label>
          <Select
            value={data.gender}
            onChange={(e) => {
              update('gender', e.target.value);
              // Select component wraps standard select, trigger validation on change too since blur might not trigger standard on native wrapper
              setTimeout(() => onBlurField('gender'), 0);
            }}
            error={!!errors.gender}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </Select>
          {errors.gender && <p className="text-xs text-danger mt-1">{errors.gender}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Date of Birth <span className="text-danger">*</span>
          </label>
          <Input
            type="date"
            value={data.dateOfBirth}
            onChange={(e) => update('dateOfBirth', e.target.value)}
            onBlur={() => onBlurField('dateOfBirth')}
            error={!!errors.dateOfBirth}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            min={new Date(new Date().setFullYear(new Date().getFullYear() - 65)).toISOString().split('T')[0]}
          />
          {errors.dateOfBirth && <p className="text-xs text-danger mt-1">{errors.dateOfBirth}</p>}
        </div>

        <div>
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
          {errors.age && <p className="text-xs text-danger mt-1">{errors.age}</p>}
        </div>

        <div>
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
          {errors.maritalStatus && <p className="text-xs text-danger mt-1">{errors.maritalStatus}</p>}
        </div>

        <div>
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
          {errors.bloodGroup && <p className="text-xs text-danger mt-1">{errors.bloodGroup}</p>}
        </div>

        <div>
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
          {errors.height && <p className="text-xs text-danger mt-1">{errors.height}</p>}
        </div>

        <div>
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
          {errors.weight && <p className="text-xs text-danger mt-1">{errors.weight}</p>}
        </div>

        <div>
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
          {errors.religionCaste && <p className="text-xs text-danger mt-1">{errors.religionCaste}</p>}
        </div>
      </div>
    </div>
  );
};
