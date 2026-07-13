import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, LoadingSpinner, EmptyState, Modal } from '../../components/ui';
import { ArrowLeft, X, FileText, ChevronRight, XCircle, MapPin, Phone, Mail } from 'lucide-react';
import { getCandidateById, updateCandidateStage } from '../../api/candidates';
import type { Candidate, PipelineStage } from '../../types';
import { toast } from 'sonner';
import { ScreeningChecklist } from '../../components/candidates/ScreeningChecklist';
import { PreFormStatus } from '../../components/candidates/PreFormStatus';


const LINEAR_STAGES: PipelineStage[] = [
  'SCREENING', 'CANDIDATE_FORM', 'HR_INTERVIEW', 'DEPARTMENT_INTERVIEW', 'FINAL_APPROVAL', 'HIRED', 'REJECTED', 'ON_HOLD'
];


export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);


  const fetchCandidate = async () => {
    if (!id) return;
    try {
      const res = await getCandidateById(id);
      if (res) {
        setCandidate(res);
      } else {
        setError('Candidate not found.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to fetch candidate details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchCandidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = () => {
    fetchCandidate();
  };

  const handleNextStage = async () => {
    if (!candidate) return;
    const currentIndex = LINEAR_STAGES.indexOf(candidate.current_stage);
    if (currentIndex === -1) return;
    
    // Stop progression if they are at or past the end of linear progression (HIRED)
    const hiredIndex = LINEAR_STAGES.indexOf('HIRED');
    if (currentIndex >= hiredIndex) {
      toast.info('Cannot advance stage further.');
      return;
    }

    const nextStage = LINEAR_STAGES[currentIndex + 1];
    setLoading(true);
    try {
      await updateCandidateStage(candidate.id, nextStage, '');
      handleUpdate();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update stage.');
    }
  };

  const handlePreviousStage = async () => {
    if (!candidate) return;
    const currentIndex = LINEAR_STAGES.indexOf(candidate.current_stage);
    if (currentIndex <= 0) return;
    
    const prevStage = LINEAR_STAGES[currentIndex - 1];
    setLoading(true);
    try {
      await updateCandidateStage(candidate.id, prevStage, '');
      handleUpdate();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update stage.');
    }
  };

  const handleReject = async () => {
    if (!candidate) return;
    if (!rejectRemarks.trim()) {
      toast.error('Remarks are required to reject a candidate.');
      return;
    }
    setIsRejecting(true);
    try {
      await updateCandidateStage(candidate.id, 'REJECTED', rejectRemarks);
      handleUpdate();
      setShowRejectModal(false);
      setRejectRemarks('');
      toast.success('Candidate rejected');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to reject candidate.');
    } finally {
      setIsRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<X className="w-12 h-12 text-danger" />}
          title="Error Loading Profile"
          description={error || 'Candidate profile not found.'}
          action={
            <Button onClick={() => navigate('/candidates')} variant="ghost" className="border border-border">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Candidates
            </Button>
          }
        />
      </div>
    );
  }


  const stage = candidate.current_stage;

  return (
    <div className="flex items-start w-full min-h-screen">

      {/* ── LEFT: Main Workspace ── */}
      <div className="flex-1 flex flex-col pl-4 sm:pl-6 lg:pl-8 pt-4 lg:pt-6 pr-0 lg:pr-8 pb-4 min-w-0 transition-all duration-300 ease-in-out">

        {/* ── TOP NAVIGATION ROW ── */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/candidates')} variant="ghost" className="h-10 px-4 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all flex items-center font-medium text-sm group shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" /> Back to Candidates
            </Button>
            {stage !== 'REJECTED' && stage !== 'HIRED' && stage !== 'SCREENING' && (
              <Button onClick={handlePreviousStage} variant="ghost" className="h-10 px-4 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all flex items-center font-medium text-sm group shadow-sm">
                <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" /> Previous Stage
              </Button>
            )}
          </div>
          <div>
            {stage !== 'REJECTED' && stage !== 'HIRED' && (
              <Button onClick={handleNextStage} className="h-10 px-5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-all shadow-md hover:shadow-lg flex items-center font-semibold text-sm group">
                Next Stage <ChevronRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
              </Button>
            )}
          </div>
        </div>

        {/* ── CANDIDATE HEADER ── */}
        <div className="pb-8 mb-6 border-b border-border">
          <div className="flex flex-col items-center justify-center text-center gap-5">
            
            {/* Info */}
            <div className="flex flex-col items-center space-y-4">
              {/* Name & Position */}
              <div>
                <div className="flex flex-wrap items-center justify-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">{candidate.full_name}</h1>
                  {candidate.is_duplicate_flagged && (
                    <span className="text-[10px] font-semibold text-warning bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded-[4px]">
                      Duplicate
                    </span>
                  )}
                </div>
                {candidate.position_applied_for && (
                  <p className="text-lg font-medium text-muted-foreground mt-1">
                    {candidate.position_applied_for}
                  </p>
                )}
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-sm">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  +91 {candidate.phone}
                </span>
                {candidate.email && (
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {candidate.email}
                  </span>
                )}
              </div>

              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs pt-1">
                {candidate.source && (
                  <div className="flex items-center gap-1.5 bg-muted/50 border border-border/50 px-2.5 py-1 rounded-md text-muted-foreground">
                    {candidate.source === 'INDEED' ? (
                      <img src="/indeed.png" alt="Indeed" className="h-4 object-contain" />
                    ) : candidate.source === 'NAUKRI' ? (
                      <img src="/naukri.png" alt="Naukri" className="h-4 object-contain" />
                    ) : (
                      <>
                        <span className="font-medium">Source:</span>
                        <strong className="text-foreground uppercase">{candidate.source.replace(/_/g, ' ')}</strong>
                      </>
                    )}
                  </div>
                )}
                {candidate.branch_location && (
                  <div className="flex items-center gap-1.5 bg-muted/50 border border-border/50 px-2.5 py-1 rounded-md text-foreground font-medium">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    {candidate.branch_location}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <a
                href={`tel:+91${candidate.phone}`}
                className="flex items-center justify-center gap-2 h-9 px-4 text-sm font-bold rounded-lg border border-border hover:bg-muted transition-colors text-foreground shadow-sm"
              >
                <img src="/phone.png" className="w-4 h-4 opacity-80" alt="Call" /> Call
              </a>
              <a
                href={`https://wa.me/91${candidate.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 h-9 px-4 text-sm font-bold rounded-lg border border-border hover:bg-muted transition-colors text-foreground shadow-sm"
              >
                <img src="/whatsapp.webp" className="w-4 h-4" alt="WhatsApp" /> WhatsApp
              </a>
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="flex items-center justify-center gap-2 h-9 px-4 text-sm font-bold rounded-lg border border-border hover:bg-muted transition-colors text-foreground shadow-sm"
                >
                  <img src="/gmail.webp" className="w-4 h-4" alt="Email" /> Email
                </a>
              )}
              {candidate.has_resume && (
                <button
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted transition-colors text-foreground cursor-pointer shadow-sm h-9"
                  onClick={() => toast.info('Resume viewer coming soon')}
                >
                  <FileText className="w-4 h-4" /> Resume
                </button>
              )}
            </div>
            
          </div>
        </div>

        {/* ── DYNAMIC STAGE WORKSPACE ── */}
        <div>
          {stage === 'SCREENING' && (
            <ScreeningChecklist candidateId={candidate.id} onUpdate={handleUpdate} />
          )}

          {stage === 'CANDIDATE_FORM' && (
            <PreFormStatus candidate={candidate} onUpdate={handleUpdate} />
          )}


        </div>
      </div>


      {/* ── REJECT MODAL ── */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Candidate" size="sm">
        <div className="space-y-4 p-6">
          <div className="p-3 bg-danger/5 border border-danger/20 rounded-[10px] flex items-start gap-3">
            <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">This will move the candidate to <strong className="text-danger">Rejected</strong> status. This can be reversed later.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Rejection Reason <span className="text-danger">*</span>
            </label>
            <textarea
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              className="w-full bg-background border border-border rounded-[10px] p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-danger/40 focus:border-transparent transition-all duration-200 min-h-[100px] resize-y"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} isLoading={isRejecting}>Reject Candidate</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
