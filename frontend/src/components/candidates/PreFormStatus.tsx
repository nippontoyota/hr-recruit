import { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button, Input, Modal } from '../ui';
import { CheckCircle2, Pencil, Printer, Save, X, RefreshCw, Link } from 'lucide-react';
import type { Candidate } from '../../types';
import { toast } from 'sonner';
import { updateCandidateRawData, sendPreForm } from '../../api/candidates';
import { WhatsAppPreviewPanel } from './WhatsAppPreviewPanel';
import { InterviewApplicationFormDocument } from './InterviewApplicationFormDocument';
import { cn } from '../../lib/utils';

interface PreFormStatusProps {
  candidate: Candidate;
  onUpdate?: () => void;
}

const HIDDEN_RAW_KEYS = new Set(['whatsapp_invite', 'resumeFileObject', 'resume_file', 'resume']);

// Thematic categorizations for candidate responses
const PERSONAL_FIELDS = ['age', 'gender', 'height', 'weight', 'bloodGroup', 'maritalStatus', 'religionCaste', 'dateOfBirth'];
const ADDRESS_FIELDS = ['permHouseName', 'permPostOffice', 'permLandmark', 'permDistrict', 'permPinCode', 'presHouseName', 'presPostOffice', 'presLandmark', 'presDistrict', 'presPinCode', 'sameAsPermanent'];
const EDUCATION_FIELDS = [
  'class10School', 'class10Board', 'class10Percentage', 'class10PassingYear', 'class10Mode',
  'class12School', 'class12Stream', 'class12Percentage', 'class12PassingYear', 'class12Mode',
  'gradCourse', 'gradCollege', 'gradPercentage', 'gradPassingYear', 'gradMode',
  'postGradCourse', 'postGradCollege', 'postGradPercentage', 'postGradPassingYear', 'postGradMode'
];
const EMPLOYMENT_FIELDS = [
  'prevCompanyName', 'prevPosition', 'totalExperience', 'expectedSalary', 'currentSalary', 'noticePeriod',
  'prev1From', 'prev1To', 'prev1Salary', 'prev1Reason', 'prev1Reporting',
  'prev2Name', 'prev2From', 'prev2To', 'prev2Salary', 'prev2Reason', 'prev2Position', 'prev2Reporting',
  'prev3Name', 'prev3From', 'prev3To', 'prev3Salary', 'prev3Reason', 'prev3Position', 'prev3Reporting',
  'prev4Name', 'prev4From', 'prev4To', 'prev4Salary', 'prev4Reason', 'prev4Position', 'prev4Reporting',
  'previousExperience'
];
const IDENTITY_FIELDS = ['aadhaarNumber', 'panNumber', 'drivingLicenseNumber', 'passportNumber', 'languagesRead', 'languagesWrite', 'languagesSpeak', 'languagesOther', 'hobbies'];
const FAMILY_FIELDS = [
  'fatherName', 'fatherAge', 'fatherPhone', 'fatherCompany', 'fatherOccupation',
  'motherName', 'motherAge', 'motherPhone', 'motherCompany', 'motherOccupation',
  'spouseName', 'spouseAge', 'spousePhone', 'spouseCompany', 'spouseOccupation',
  'sibling1Name', 'sibling1Age', 'sibling1Phone', 'sibling1Company', 'sibling1Relation', 'sibling1Occupation',
  'sibling2Name', 'sibling2Age', 'sibling2Phone', 'sibling2Company', 'sibling2Relation', 'sibling2Occupation',
  'sibling3Name', 'sibling3Age', 'sibling3Phone', 'sibling3Company', 'sibling3Relation', 'sibling3Occupation',
  'child1Name', 'child1Age', 'child1Phone', 'child1Company', 'child1Relation', 'child1Occupation',
  'child2Name', 'child2Age', 'child2Phone', 'child2Company', 'child2Relation', 'child2Occupation',
  'child3Name', 'child3Age', 'child3Phone', 'child3Company', 'child3Relation', 'child3Occupation'
];
const REFERENCES_FIELDS = ['refName', 'refRole', 'refContactNumber', 'refPanchayat', 'hasReference', 'referredBy', 'sourceOfOpening', 'preferredRegion', 'expectedJoiningDate'];
const MEDICAL_FIELDS = ['medicalRemarks', 'physicalDisability', 'nervousDisorder', 'criminalConviction', 'prevTerminated', 'compWord', 'compExcel', 'compPowerPoint', 'compTally', 'compOther', 'softwareCerts', 'drive2Wheeler', 'drive3Wheeler', 'drive4Wheeler', 'driveHeavy', 'emergency1Name', 'emergency1Contact', 'emergency1Address', 'emergency1Relation', 'emergency2Name', 'emergency2Contact', 'emergency2Address', 'emergency2Relation'];

const ALL_CATEGORIZED_KEYS = new Set([
  ...PERSONAL_FIELDS,
  ...ADDRESS_FIELDS,
  ...EDUCATION_FIELDS,
  ...EMPLOYMENT_FIELDS,
  ...IDENTITY_FIELDS,
  ...FAMILY_FIELDS,
  ...REFERENCES_FIELDS,
  ...MEDICAL_FIELDS,
]);

function formatFieldKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '-';
  return String(value);
}

export function PreFormStatus({ candidate, onUpdate }: PreFormStatusProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `ApplicationForm_${candidate.full_name}`,
  });

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const status = candidate.pre_form_status || 'NOT_SENT';
  const [localRawData, setLocalRawData] = useState<Record<string, any>>(candidate.profile?.raw_data ?? {});
  
  useEffect(() => {
    setLocalRawData(candidate.profile?.raw_data ?? {});
  }, [candidate.profile?.raw_data]);

  const printCandidate: Candidate = {
    ...candidate,
    profile: {
      ...(candidate.profile || {}),
      raw_data: localRawData,
    } as any,
  };

  const formEntries = Object.entries(localRawData).filter(
    ([key, value]) => !HIDDEN_RAW_KEYS.has(key) && value !== null && value !== undefined && typeof value !== 'object'
  );

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditData({ ...localRawData });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateCandidateRawData(candidate.id, editData);
      toast.success('Application form updated successfully');
      setLocalRawData({ ...editData });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update application form');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setEditData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };



  const renderCategorySection = (title: string, keys: string[]) => {
    const activeEntries = Object.entries(localRawData).filter(
      ([key, val]) => keys.includes(key) && !HIDDEN_RAW_KEYS.has(key) && val !== null && val !== undefined && val !== ''
    );

    if (activeEntries.length === 0 && !isEditing) return null;

    const entriesToShow = isEditing 
      ? Object.entries(editData).filter(([key]) => keys.includes(key) && !HIDDEN_RAW_KEYS.has(key))
      : activeEntries;

    if (entriesToShow.length === 0) return null;

    return (
      <div className="border-t border-border/60 first:border-t-0 p-6 print:p-2 print-item space-y-4 print:space-y-2">
        <h4 className="text-xs font-black text-[#075E54] uppercase tracking-wider print:text-[10px]">
          {title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 print:grid-cols-3 print:gap-x-4 print:gap-y-3 print-grid">
          {entriesToShow.map(([key, value]) => {
            const strVal = String(value);
            const isLongText = strVal.length > 50 || strVal.includes('\n');
            return (
              <div 
                key={key} 
                className={cn(
                  "flex flex-col gap-1 rounded-xl p-3.5 border border-border/30 bg-muted/5 hover:bg-muted/10 transition-colors",
                  isLongText && "col-span-1 md:col-span-2 lg:col-span-3 bg-muted/20 border-border/50",
                  "print:p-1 print:gap-1 print:bg-transparent print:border-none"
                )}
              >
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider block print:text-[10px] print:text-black">
                  {formatFieldKey(key)}
                </span>
                {isEditing ? (
                  <Input 
                    value={editData[key] !== undefined && editData[key] !== null ? String(editData[key]) : ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="h-9 text-sm w-full bg-white border-primary/40 focus:border-primary shadow-sm"
                  />
                ) : (
                  <div className={cn(
                    "w-full rounded-md border border-border/50 bg-white px-3 py-2 text-sm text-foreground font-medium shadow-sm break-words",
                    isLongText && "min-h-[80px]",
                    "print:py-1.5 print:px-3 print:text-xs print:font-bold print:shadow-none print:border-black/30 print:min-h-0"
                  )}>
                    {formatFieldValue(value)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (status === 'SUBMITTED') {
    const otherKeys = Object.keys(localRawData).filter(
      (key) => !ALL_CATEGORIZED_KEYS.has(key) && !HIDDEN_RAW_KEYS.has(key)
    );

    return (
      <div className="py-8 w-full max-w-4xl mx-auto print-container">
        <div className="flex flex-col items-center mb-8 no-print">
          <CheckCircle2 className="w-10 h-10 text-success mb-3" />
          <h3 className="text-2xl font-bold text-foreground">Form Submitted</h3>
          <p className="text-text-secondary mt-1">Pre-interview responses from the candidate</p>
        </div>

        {/* Off-screen print target (`hidden`/`opacity-0` can break react-to-print clones) */}
        <div className="fixed top-0 left-[-9999px] pointer-events-none w-[210mm]">
          <div ref={componentRef}>
            <InterviewApplicationFormDocument candidate={printCandidate} />
          </div>
        </div>

        {formEntries.length > 0 ? (
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden print-no-border">
            <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center justify-between no-print">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Application details</h4>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={handlePrint} className="h-8 bg-muted text-text-secondary hover:bg-muted/80 hover:text-text-primary font-semibold">
                      <Printer className="w-4 h-4 mr-1.5" />
                      Print
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleEditToggle} className="h-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-semibold">
                      <Pencil className="w-4 h-4 mr-1.5" />
                      Edit
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleEditToggle} disabled={isSaving} className="h-8">
                      <X className="w-4 h-4 mr-1.5" />
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving} className="h-8">
                      <Save className="w-4 h-4 mr-1.5" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="divide-y divide-border/60">
              {renderCategorySection("Personal Details", PERSONAL_FIELDS)}
              {renderCategorySection("Address & Contact Details", ADDRESS_FIELDS)}
              {renderCategorySection("Education Details", EDUCATION_FIELDS)}
              {renderCategorySection("Employment History", EMPLOYMENT_FIELDS)}
              {renderCategorySection("Family Details", FAMILY_FIELDS)}
              {renderCategorySection("Identity Documents & Skills", IDENTITY_FIELDS)}
              {renderCategorySection("References & General Questions", REFERENCES_FIELDS)}
              {renderCategorySection("Medical & Declarations", MEDICAL_FIELDS)}
              {otherKeys.length > 0 && renderCategorySection("Other Details", otherKeys)}
            </div>
          </div>
        ) : candidate.profile ? (
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-muted/30 border-b border-border">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Profile summary</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 p-6">
              {[
                ['Current location', candidate.profile.current_location],
                ['Experience level', candidate.profile.experience_level],
                ['Total experience', candidate.profile.total_experience],
                ['Current company', candidate.profile.current_company],
                ['Expected salary', candidate.profile.expected_salary],
                ['Joining date', candidate.profile.joining_date],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">{label}</p>
                  <p className="text-sm text-foreground font-medium">{formatFieldValue(value)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-text-secondary text-center">Form responses are not available yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="py-8 max-w-2xl mx-auto w-full space-y-6">
      <div className="py-2">
        <div className="mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Pre-interview form</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {status === 'SENT'
                ? 'Link generated. Share via WhatsApp using the preview on the right.'
                : 'Form link is ready to be sent.'}
            </p>
          </div>
        </div>

        {candidate.share_url ? (
          <div className="space-y-3">
            <label className="form-label flex items-center gap-1.5">
              <Link className="w-4 h-4" />
              CALL LETTER link
            </label>
            <div className="flex items-center gap-2 w-full bg-background border border-border p-1.5 rounded-xl">
              <input
                type="text"
                readOnly
                value={candidate.share_url}
                className="flex-1 bg-transparent border-none px-3 text-sm font-mono text-muted-foreground focus:outline-none min-w-0"
              />
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(candidate.share_url || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    toast.error('Failed to copy link.');
                  }
                }}
                className="h-9 px-4 shrink-0"
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            {candidate.pre_form_sent_at && (
              <p className="text-xs text-muted-foreground">
                Sent {new Date(candidate.pre_form_sent_at).toLocaleString('en-IN')}
              </p>
            )}
            {(status === 'SENT' || status === 'VIEWED') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowResendModal(true)}
                className="w-fit gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Resend Link
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Form link will appear here.</p>
            <Button
              variant="secondary"
              size="sm"
              isLoading={isGeneratingLink}
              onClick={async () => {
                try {
                  setIsGeneratingLink(true);
                  await sendPreForm(candidate.id);
                  toast.success('Form link generated successfully');
                  if (onUpdate) onUpdate();
                } catch (err: any) {
                  toast.error(err.response?.data?.detail || 'Failed to generate link');
                } finally {
                  setIsGeneratingLink(false);
                }
              }}
              className="w-fit gap-2"
            >
              <Link className="w-3.5 h-3.5" /> Generate Link
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground text-center">
        Responses will appear here automatically once the candidate submits the form.
      </div>

      <Modal
        isOpen={showResendModal}
        onClose={() => setShowResendModal(false)}
        title="Resend Pre-interview Form Link"
        size="lg"
      >
        <div className="flex justify-center p-6 bg-background h-[75vh] overflow-y-auto">
          <WhatsAppPreviewPanel 
            candidate={candidate} 
            className="!w-full border-none bg-transparent" 
          />
        </div>
      </Modal>
    </div>
  );
}
