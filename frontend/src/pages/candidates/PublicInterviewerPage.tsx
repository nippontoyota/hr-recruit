import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Star,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Landmark,
  Calendar,
  ClipboardList,
  Clock,
  BookOpen,
  ThumbsUp,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Button, LoadingSpinner } from '../../components/ui';
import { getPublicEvaluation, submitPublicEvaluation } from '../../api/evaluations';
import type { EvaluationPublicDetails, EvaluationVerdict } from '../../types';
import { cn, extractError } from '../../lib/utils';
import { toast } from 'sonner';

const HIDDEN_RAW_KEYS = new Set(['whatsapp_invite', 'resumeFileObject', 'resume_file', 'resume']);

// Field groupings for candidate form data audit
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

const VERDICTS = [
  { id: 'SELECTED', label: 'Recommended', desc: 'Pass to next evaluation round', icon: ThumbsUp, colorClass: 'bg-success/5 border-success text-success font-semibold' },
  { id: 'ON_HOLD', label: 'On Hold', desc: 'Save for potential future fit', icon: Clock, colorClass: 'bg-warning/5 border-warning text-warning font-semibold' },
  { id: 'REJECTED', label: 'Rejected', desc: 'Candidate is not suitable', icon: AlertCircle, colorClass: 'bg-danger/5 border-danger text-danger font-semibold' }
] as const;

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

export default function PublicInterviewerPage() {
  const { token } = useParams<{ token: string }>();
  const [details, setDetails] = useState<EvaluationPublicDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Layout & Navigation State
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'scorecard'>('details');
  const [accordionOpen, setAccordionOpen] = useState({
    profile: true,
    questionnaire: false,
    history: true,
  });

  // Form State
  const [verdict, setVerdict] = useState<EvaluationVerdict>('SELECTED');
  const [remarks, setRemarks] = useState('');
  const [techScore, setTechScore] = useState(0);
  const [commScore, setCommScore] = useState(0);
  const [expScore, setExpScore] = useState(0);
  const [fitScore, setFitScore] = useState(0);

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchDetails = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getPublicEvaluation(token);
      setDetails(res);
      if (res.is_already_submitted) {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(extractError(err, 'This evaluation link is invalid, expired, or has already been used.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!remarks.trim()) {
      toast.error('Please fill in your evaluation remarks');
      return;
    }
    if (techScore === 0 || commScore === 0 || expScore === 0 || fitScore === 0) {
      toast.error('Please complete all rating criteria scores');
      return;
    }
    setSubmitting(true);
    try {
      await submitPublicEvaluation(token, {
        verdict,
        remarks,
        scores: {
          technical: techScore,
          communication: commScore,
          experience: expScore,
          cultural_fit: fitScore,
        },
      });
      setSubmitted(true);
      toast.success('Evaluation scorecard submitted successfully');
    } catch (err) {
      toast.error(extractError(err, 'Failed to submit scorecard'));
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (val: number) =>
    ['Not Rated', 'Needs Improvement', 'Below Average', 'Average / Good', 'Very Good', 'Outstanding'][val] || 'Not Rated';

  const StarRating = ({
    label,
    description,
    val,
    setVal,
  }: {
    label: string;
    description: string;
    val: number;
    setVal: (v: number) => void;
  }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-background border border-border/50 rounded-xl hover:border-border transition-all duration-200">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-muted-foreground">{description}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onClick={() => setVal(star)}
              className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
            >
              <Star
                className={cn(
                  "w-5.5 h-5.5 transition-all duration-200",
                  star <= val
                    ? "fill-yellow-400 text-yellow-400 drop-shadow-xs"
                    : "fill-muted text-muted-foreground/20"
                )}
              />
            </button>
          ))}
        </div>
        <span
          className={cn(
            "text-[9px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 min-w-[100px] text-center",
            val > 0 ? "bg-primary/5 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border/80"
          )}
        >
          {getRatingLabel(val)}
        </span>
      </div>
    </div>
  );

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex items-start gap-3 p-3 bg-muted/20 border border-border/30 rounded-xl">
      <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
          {label}
        </span>
        <span className="text-sm font-bold text-foreground truncate block">{value}</span>
      </div>
    </div>
  );

  const renderCategoryFields = (title: string, fieldKeys: string[] | Set<string>) => {
    if (!details || !details.candidate_raw_data) return null;

    const keysArray = Array.from(fieldKeys);
    const activeFields = Object.entries(details.candidate_raw_data)
      .filter(([key, val]) => keysArray.includes(key) && val !== null && val !== undefined && val !== '');

    if (activeFields.length === 0) return null;

    return (
      <div className="space-y-3.5 pt-4 border-t border-border/40 first:pt-0 first:border-t-0">
        <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider">
          {title}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {activeFields.map(([key, val]) => {
            const strVal = String(val);
            const isLongText = strVal.length > 50 || strVal.includes('\n');
            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col gap-1 rounded-xl p-3.5 border",
                  isLongText
                    ? "col-span-2 bg-muted/20 border-border/40"
                    : "col-span-2 sm:col-span-1 bg-muted/10 border-border/30"
                )}
              >
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {formatFieldKey(key)}
                </span>
                <span
                  className={cn(
                    "text-sm text-foreground block leading-relaxed",
                    isLongText ? "font-medium whitespace-pre-wrap" : "font-bold"
                  )}
                >
                  {formatFieldValue(val)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-surface border border-border p-8 rounded-2xl shadow-lg flex flex-col items-center">
          <div className="w-14 h-14 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-4 animate-pulse">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Link Expired or Invalid</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {error || 'This evaluation link has expired, already been completed, or is invalid. Please ask Branch HR for a new evaluation link.'}
          </p>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nippon Toyota — HR Team</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-surface border border-success/30 p-8 rounded-2xl shadow-lg flex flex-col items-center">
          <div className="w-14 h-14 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-success">Scorecard Submitted!</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed">
            Thank you! Your scorecard remarks for <strong className="text-foreground">{details.candidate_name}</strong> have been recorded successfully.
          </p>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nippon Toyota — HR Team</p>
        </div>
      </div>
    );
  }

  // Get keys in raw_data that aren't categorized yet
  const otherKeys = details.candidate_raw_data
    ? Object.keys(details.candidate_raw_data).filter(
        (key) => !ALL_CATEGORIZED_KEYS.has(key) && !HIDDEN_RAW_KEYS.has(key)
      )
    : [];

  return (
    <div className="h-[100dvh] overflow-hidden bg-background flex flex-col font-sans text-foreground">
      {/* Header */}
      <header className="h-20 sm:h-24 border-b border-border/60 px-4 sm:px-8 lg:px-12 flex items-center justify-between shrink-0 bg-surface/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#075E54]/90 block">
              Nippon Toyota Recruitment
            </span>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Candidate Scorecard
            </h1>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/5 text-primary border border-primary/10">
            {details.candidate_position}
          </span>
          {details.candidate_resume_url && (
            <Button
              variant="ghost"
              size="sm"
              className="border border-border/80 text-xs font-bold shrink-0 shadow-2xs hover:bg-muted/50 cursor-pointer"
              onClick={() => window.open(details.candidate_resume_url, '_blank')}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Resume
            </Button>
          )}
        </div>
      </header>

      {/* Mobile Tabbed Navigation */}
      <div className="lg:hidden shrink-0 bg-background/95 backdrop-blur-md border-b border-border/80 z-10 px-4 py-3 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={cn(
            "flex-1 py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all duration-200 cursor-pointer",
            activeTab === 'details'
              ? "bg-primary/5 text-primary border-primary/20 shadow-xs"
              : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
          )}
        >
          Candidate Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn(
            "flex-1 py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all duration-200 cursor-pointer",
            activeTab === 'history'
              ? "bg-primary/5 text-primary border-primary/20 shadow-xs"
              : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
          )}
        >
          Stage History
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scorecard')}
          className={cn(
            "flex-1 py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all duration-200 cursor-pointer",
            activeTab === 'scorecard'
              ? "bg-[#075E54]/5 text-[#075E54] border-[#075E54]/20 shadow-xs"
              : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
          )}
        >
          Scorecard
        </button>
      </div>

      {/* Main split dashboard layout */}
      <main className="flex-1 flex flex-col lg:flex-row w-full max-w-[1920px] mx-auto min-h-0 overflow-hidden bg-muted/5">
        
        {/* LEFT: Candidate Context & Prior Remarks */}
        <div
          className={cn(
            "flex-1 lg:flex-none lg:w-1/2 h-full overflow-y-auto border-r border-border/60",
            activeTab === 'details' || activeTab === 'history' ? 'block' : 'hidden lg:block'
          )}
        >
          <div className="flex flex-col gap-6 p-4 sm:p-8 lg:p-12">
            {/* Accordion 1: Candidate Profile */}
            <div
              className={cn(
                "border border-border/80 rounded-2xl overflow-hidden bg-surface shadow-xs transition-all duration-200",
                activeTab === 'history' && 'hidden lg:block'
              )}
            >
            <button
              type="button"
              onClick={() => setAccordionOpen(p => ({ ...p, profile: !p.profile }))}
              className="w-full px-5 py-4 flex items-center justify-between font-bold text-foreground bg-muted/20 hover:bg-muted/40 transition-colors text-left focus:outline-none cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm">Candidate Profile</span>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  accordionOpen.profile && "rotate-180"
                )}
              />
            </button>

            {accordionOpen.profile && (
              <div className="p-5 bg-background border-t border-border/40 space-y-6">
                {/* Profile Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow icon={User} label="Full Name" value={details.candidate_name} />
                  <InfoRow icon={Briefcase} label="Position" value={details.candidate_position} />
                  <InfoRow icon={Award} label="Experience" value={details.candidate_experience || 'Fresher'} />
                  <InfoRow icon={BookOpen} label="Highest Qualification" value={details.candidate_education || 'N/A'} />

                  {details.candidate_email && (
                    <InfoRow icon={Mail} label="Email Address" value={details.candidate_email} />
                  )}
                  {details.candidate_phone && (
                    <InfoRow icon={Phone} label="Phone Number" value={`+91 ${details.candidate_phone}`} />
                  )}
                  {details.candidate_location && (
                    <InfoRow icon={MapPin} label="Location" value={details.candidate_location} />
                  )}
                  {details.candidate_source && (
                    <InfoRow
                      icon={Landmark}
                      label="Source"
                      value={details.candidate_source.replace(/_/g, ' ')}
                    />
                  )}

                  {details.candidate_current_salary && (
                    <InfoRow icon={Landmark} label="Current Salary" value={details.candidate_current_salary} />
                  )}
                  {details.candidate_expected_salary && (
                    <InfoRow icon={Landmark} label="Expected Salary" value={details.candidate_expected_salary} />
                  )}
                  {details.candidate_notice_period && (
                    <InfoRow icon={Calendar} label="Notice Period" value={details.candidate_notice_period} />
                  )}
                </div>

                {/* Skills */}
                {details.candidate_skills && (
                  <div className="pt-4 border-t border-border/50">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                      Skills & Competencies
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {details.candidate_skills.split(',').map((skill, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-primary/5 border border-primary/10 rounded-lg text-xs font-semibold text-primary"
                        >
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume View Button for Mobile */}
                {details.candidate_resume_url && (
                  <div className="pt-4 border-t border-border/50 sm:hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full border border-border shadow-xs text-xs font-bold hover:bg-muted/50 cursor-pointer"
                      onClick={() => window.open(details.candidate_resume_url, '_blank')}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Resume in New Tab
                    </Button>
                  </div>
                )}
                <div className="pt-4 border-t border-border/50 flex justify-center mt-2">
                  <button type="button" onClick={() => setAccordionOpen(p => ({ ...p, profile: false }))} className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer border border-transparent hover:border-border/60">
                    <ChevronUp className="w-4 h-4" /> Close Section
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Accordion 2: Pre-Interview Responses */}
          {details.candidate_raw_data && Object.keys(details.candidate_raw_data).length > 0 && (
            <div
              className={cn(
                "border border-border/80 rounded-2xl overflow-hidden bg-surface shadow-xs transition-all duration-200",
                activeTab === 'history' && 'hidden xl:block'
              )}
            >
              <button
                type="button"
                onClick={() => setAccordionOpen(p => ({ ...p, questionnaire: !p.questionnaire }))}
                className="w-full px-5 py-4 flex items-center justify-between font-bold text-foreground bg-muted/20 hover:bg-muted/40 transition-colors text-left focus:outline-none cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <span className="text-sm">Pre-Interview Responses (All Form Details)</span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200",
                    accordionOpen.questionnaire && "rotate-180"
                  )}
                />
              </button>

              {accordionOpen.questionnaire && (
                <div className="p-5 bg-background border-t border-border/40 space-y-6">
                  {renderCategoryFields("Personal Details", PERSONAL_FIELDS)}
                  {renderCategoryFields("Address & Contact Details", ADDRESS_FIELDS)}
                  {renderCategoryFields("Education Details", EDUCATION_FIELDS)}
                  {renderCategoryFields("Employment History", EMPLOYMENT_FIELDS)}
                  {renderCategoryFields("Family Details", FAMILY_FIELDS)}
                  {renderCategoryFields("Identity Documents & Skills", IDENTITY_FIELDS)}
                  {renderCategoryFields("References & General Questions", REFERENCES_FIELDS)}
                  {renderCategoryFields("Medical & Declarations", MEDICAL_FIELDS)}
                  {otherKeys.length > 0 && renderCategoryFields("Other Responses", otherKeys)}
                  <div className="pt-4 border-t border-border/50 flex justify-center mt-2">
                    <button type="button" onClick={() => setAccordionOpen(p => ({ ...p, questionnaire: false }))} className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer border border-transparent hover:border-border/60">
                      <ChevronUp className="w-4 h-4" /> Close Section
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accordion 3: Prior Evaluation History */}
          <div
            className={cn(
              "border border-border/80 rounded-2xl overflow-hidden bg-surface shadow-xs transition-all duration-200",
              activeTab === 'details' && 'hidden xl:block'
            )}
          >
            <button
              type="button"
              onClick={() => setAccordionOpen(p => ({ ...p, history: !p.history }))}
              className="w-full px-5 py-4 flex items-center justify-between font-bold text-foreground bg-muted/20 hover:bg-muted/40 transition-colors text-left focus:outline-none cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm">Prior Evaluations History</span>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  accordionOpen.history && "rotate-180"
                )}
              />
            </button>

            {accordionOpen.history && (
              <div className="p-5 bg-background border-t border-border/40">
                {details.previous_remarks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/5 border border-dashed border-border rounded-xl">
                    <Clock className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground italic">
                      No prior evaluation stages recorded for this candidate.
                    </p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6">
                    {/* Vertical timeline path */}
                    <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 bg-border/60" />

                    {details.previous_remarks.map((rem, i) => {
                      const isSelect = rem.verdict === 'SELECTED' || rem.verdict === 'PASS' || rem.verdict === 'APPROVED';
                      const isHold = rem.verdict === 'ON_HOLD' || rem.verdict === 'PENDING';
                      return (
                        <div key={i} className="relative group">
                          {/* Timeline bullet dot */}
                          <div
                            className={cn(
                              "absolute -left-[23.5px] top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-background z-10 transition-transform group-hover:scale-125",
                              isSelect
                                ? "border-success"
                                : isHold
                                ? "border-warning"
                                : "border-danger"
                            )}
                          />

                          <div className="bg-background border border-border/80 p-4 rounded-xl hover:shadow-2xs transition-all duration-200 space-y-2.5">
                            <div className="flex justify-between items-center gap-2 pb-2 border-b border-border/40">
                              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                {rem.type ? rem.type.replace(/_/g, ' ') : 'Stage'}
                              </span>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border",
                                  isSelect
                                    ? "bg-success/5 text-success border-success/20"
                                    : isHold
                                    ? "bg-warning/5 text-warning border-warning/20"
                                    : "bg-danger/5 text-danger border-danger/20"
                                )}
                              >
                                {rem.verdict || 'No Verdict'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed italic bg-muted/10 p-3 rounded-lg border-l border-border">
                              "{rem.remarks}"
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="pt-4 border-t border-border/50 flex justify-center mt-2">
                  <button type="button" onClick={() => setAccordionOpen(p => ({ ...p, history: false }))} className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer border border-transparent hover:border-border/60">
                    <ChevronUp className="w-4 h-4" /> Close Section
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* RIGHT: Scorecard Entry Form */}
        <div
          className={cn(
            "flex-1 lg:flex-none lg:w-1/2 h-full overflow-y-auto bg-background",
            activeTab === 'scorecard' ? 'block' : 'hidden lg:block'
          )}
        >
          <div className="flex flex-col p-4 sm:p-8 lg:p-12">
            <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
              {/* Form Title Card */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Scorecard Submission
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTechScore(5);
                  setCommScore(5);
                  setExpScore(5);
                  setFitScore(5);
                }}
                className="text-[10px] font-bold uppercase tracking-wider text-[#075E54] hover:text-[#064c44] flex items-center gap-1 bg-[#075E54]/5 hover:bg-[#075E54]/10 px-2.5 py-1.5 rounded-lg transition-all border border-[#075E54]/15 shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 fill-[#075E54]/20" /> Auto-fill 5/5
              </button>
            </div>

            {/* Ratings Block */}
            <div className="space-y-3.5 bg-muted/10 border border-border/40 p-4 sm:p-5 rounded-2xl">
              <StarRating
                label="Technical Skills"
                description="Core coding, design & problem-solving capability"
                val={techScore}
                setVal={setTechScore}
              />
              <StarRating
                label="Communication"
                description="Clarity, articulation, and language capabilities"
                val={commScore}
                setVal={setCommScore}
              />
              <StarRating
                label="Experience & Fit"
                description="Role alignment, past achievements, relevance"
                val={expScore}
                setVal={setExpScore}
              />
              <StarRating
                label="Cultural Fit"
                description="Values alignment, team dynamics, attitude"
                val={fitScore}
                setVal={setFitScore}
              />
            </div>

            <div className="h-px w-full bg-border/50" />

            {/* Verdict Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Interviewer Verdict
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {VERDICTS.map((v) => {
                  const Icon = v.icon;
                  const isSelected = verdict === v.id;
                  return (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => setVerdict(v.id as EvaluationVerdict)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4.5 rounded-xl border text-center transition-all duration-200 focus:outline-none cursor-pointer hover:shadow-xs",
                        isSelected
                          ? v.colorClass
                          : "bg-background border-border/80 text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 hover:bg-muted/10"
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider block">{v.label}</span>
                      <span className="text-[10px] opacity-80 leading-tight block">{v.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Remarks Textarea */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Evaluation Remarks <span className="text-danger">*</span>
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                required
                placeholder="Provide a detailed assessment of candidate strengths, critical areas of concern, and specific justifications for the chosen verdict..."
                className="w-full min-h-[160px] bg-background border border-border/80 focus:border-[#075E54] rounded-xl p-4 focus:ring-4 focus:ring-[#075E54]/5 outline-none transition-all shadow-xs resize-y text-sm leading-relaxed"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "w-full bg-[#075E54] hover:bg-[#064c44] text-white py-3.5 rounded-xl font-bold tracking-wide shadow-md transition-all duration-200 flex justify-center items-center gap-2 hover:shadow-lg active:scale-99.5 cursor-pointer",
                  submitting ? "opacity-70 cursor-not-allowed" : ""
                )}
              >
                {submitting ? <LoadingSpinner size="sm" /> : <CheckCircle2 className="w-5 h-5" />}
                {submitting ? 'Submitting Scorecard...' : 'Submit Evaluation Scorecard'}
              </button>
            </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
