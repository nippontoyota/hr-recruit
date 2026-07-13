import type { CandidateFormData } from '../wizardTypes';
import { Input, Select } from '../../../../components/ui';
interface PersonalInfoFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

export const PersonalInfoForm = ({ data, update }: PersonalInfoFormProps) => {
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
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Gender <span className="text-danger">*</span>
          </label>
          <Select
            value={data.gender}
            onChange={(e) => update('gender', e.target.value)}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Date of Birth <span className="text-danger">*</span>
          </label>
          <Input
            type="date"
            value={data.dateOfBirth}
            onChange={(e) => update('dateOfBirth', e.target.value)}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            min={new Date(new Date().setFullYear(new Date().getFullYear() - 65)).toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Age <span className="text-danger">*</span>
          </label>
          <Input
            type="number"
            value={data.age}
            onChange={(e) => update('age', e.target.value)}
            min={18}
            max={65}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Marital Status <span className="text-danger">*</span>
          </label>
          <Select
            value={data.maritalStatus}
            onChange={(e) => update('maritalStatus', e.target.value)}
          >
            <option value="">Select Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Blood Group <span className="text-danger">*</span>
          </label>
          <Select
            value={data.bloodGroup}
            onChange={(e) => update('bloodGroup', e.target.value)}
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
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Height (cm) <span className="text-danger">*</span>
          </label>
          <Input
            type="number"
            value={data.height}
            onChange={(e) => update('height', e.target.value)}
            min={100}
            max={250}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Weight (kg) <span className="text-danger">*</span>
          </label>
          <Input
            type="number"
            value={data.weight}
            onChange={(e) => update('weight', e.target.value)}
            min={30}
            max={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Religion & Caste <span className="text-danger">*</span>
          </label>
          <Input
            value={data.religionCaste}
            onChange={(e) => update('religionCaste', e.target.value)}
            placeholder="e.g. Hindu / General"
          />
        </div>
      </div>
    </div>
  );
};
