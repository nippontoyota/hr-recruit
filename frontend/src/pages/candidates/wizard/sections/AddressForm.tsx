import type { CandidateFormData } from '../wizardTypes';
import { Input } from '../../../../components/ui';
import { digitsOnly } from '../../../../lib/validation';

interface AddressFormProps {
  data: CandidateFormData;
  update: (field: keyof CandidateFormData, value: any) => void;
}

export const AddressForm = ({ data, update }: AddressFormProps) => {
  return (
    <div className="space-y-8 pb-6">
      {/* Permanent Address */}
      <div className="space-y-6">
        <h4 className="text-lg font-medium text-text-primary border-b border-border pb-2">Permanent Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">House Name <span className="text-danger">*</span></label>
            <Input value={data.permHouseName} onChange={(e) => update('permHouseName', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Post Office <span className="text-danger">*</span></label>
            <Input value={data.permPostOffice} onChange={(e) => update('permPostOffice', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Landmark <span className="text-danger">*</span></label>
            <Input value={data.permLandmark} onChange={(e) => update('permLandmark', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">District <span className="text-danger">*</span></label>
            <Input value={data.permDistrict} onChange={(e) => update('permDistrict', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">PIN Code <span className="text-danger">*</span></label>
            <Input value={data.permPinCode} onChange={(e) => update('permPinCode', digitsOnly(e.target.value, 6))} inputMode="numeric" maxLength={6} />
          </div>
        </div>
      </div>

      {/* Present Address */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h4 className="text-lg font-medium text-text-primary">Present Address</h4>
          <label className="flex items-center space-x-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={data.sameAsPermanent}
              onChange={(e) => update('sameAsPermanent', e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>Same as Permanent</span>
          </label>
        </div>

        {!data.sameAsPermanent && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">House Name <span className="text-danger">*</span></label>
              <Input value={data.presHouseName} onChange={(e) => update('presHouseName', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Post Office <span className="text-danger">*</span></label>
              <Input value={data.presPostOffice} onChange={(e) => update('presPostOffice', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Landmark <span className="text-danger">*</span></label>
              <Input value={data.presLandmark} onChange={(e) => update('presLandmark', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">District <span className="text-danger">*</span></label>
              <Input value={data.presDistrict} onChange={(e) => update('presDistrict', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">PIN Code <span className="text-danger">*</span></label>
              <Input value={data.presPinCode} onChange={(e) => update('presPinCode', digitsOnly(e.target.value, 6))} inputMode="numeric" maxLength={6} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
