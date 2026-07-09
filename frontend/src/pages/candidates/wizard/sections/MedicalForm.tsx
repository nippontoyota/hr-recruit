import type { CandidateFormData } from '../wizardTypes';

interface MedicalFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

export const MedicalForm = ({ data, update }: MedicalFormProps) => {
  
  const toggleOptions = [
    {
      id: 'prevTerminated',
      label: 'Have you been previously terminated from any employment?',
      value: data.prevTerminated
    },
    {
      id: 'physicalDisability',
      label: 'Do you have any physical disability?',
      value: data.physicalDisability
    },
    {
      id: 'nervousDisorder',
      label: 'Have you ever suffered from any nervous disorder?',
      value: data.nervousDisorder
    },
    {
      id: 'eyeVision',
      label: 'Do you have any eye/vision related issues (other than wearing glasses)?',
      value: data.eyeVision
    },
    {
      id: 'criminalConviction',
      label: 'Have you ever been convicted of a criminal offense?',
      value: data.criminalConviction
    }
  ] as const;

  return (
    <div className="space-y-6 pb-6 max-w-3xl">
      <p className="text-sm text-text-secondary mb-4">
        Please answer the following questions truthfully. Select "Yes" if the statement applies to you.
      </p>

      <div className="space-y-4">
        {toggleOptions.map((opt) => (
          <div key={opt.id} className="flex items-start sm:items-center justify-between p-4 bg-surface border border-border rounded-lg">
            <span className="text-sm font-medium text-text-primary pr-4">
              {opt.label}
            </span>
            <div className="flex items-center space-x-4 flex-shrink-0 mt-2 sm:mt-0">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={opt.id}
                  checked={opt.value === true}
                  onChange={() => update(opt.id, true)}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={opt.id}
                  checked={opt.value === false}
                  onChange={() => update(opt.id, false)}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
