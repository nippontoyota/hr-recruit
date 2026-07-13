import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button, Modal, LoadingSpinner, EmptyState, Badge } from '../../components/ui';
import { Plus, Link, RefreshCw, Trash } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getCandidates, deleteCandidate } from '../../api/candidates';
import { getStageBadgeVariant } from '../../lib/utils';
import type { Candidate } from '../../types';
import { AddCandidateForm } from '../../components/candidates/AddCandidateForm';
import { toast } from 'sonner';

export default function CandidatesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchCandidatesList = async () => {
    try {
      setLoading(true);
      const list = await getCandidates();
      setCandidates(list);
    } catch (err) {
      console.error('Failed to load candidates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCandidate(candidateToDelete.id);
      setCandidateToDelete(null);
      await fetchCandidatesList();
      toast.success('Candidate deleted successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete candidate.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchCandidatesList();
  }, []);

  const handleCopyLink = () => {
    if (!user) return;
    const url = `${window.location.origin}/apply?hr=${user.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Recruiter link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenAddModal = () => {
    setIsAddOpen(true);
  };


  return (
    <>
      <PageHeader
        title="Candidates"
        action={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleCopyLink}>
              <Link className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Recruiter Link'}
            </Button>
            <Button onClick={handleOpenAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Candidate
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="No Candidates Found"
            description="No candidates have applied or been registered under your recruiter profile yet."
            icon={<RefreshCw className="w-8 h-8 opacity-50" />}
            action={
              <Button onClick={handleOpenAddModal}>
                <Plus className="w-4 h-4 mr-2" /> Register Candidate
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-[12px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-muted/30">
                <tr className="border-b border-border text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <th className="px-4 py-3 sticky top-0 bg-muted/30">Candidate</th>
                  <th className="px-4 py-3 sticky top-0 bg-muted/30">Position</th>
                  <th className="px-4 py-3 sticky top-0 bg-muted/30">Stage</th>
                  <th className="px-4 py-3 sticky top-0 bg-muted/30">Source</th>
                  <th className="px-4 py-3 sticky top-0 bg-muted/30 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface text-sm text-text-primary">
                {candidates.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary">{candidate.full_name}</span>
                        <span className="text-xs text-text-secondary">+91 {candidate.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-medium">
                      {candidate.position_applied_for || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStageBadgeVariant(candidate.current_stage) as any} className="font-semibold px-2.5 py-0.5 rounded-[10px]">
                        {candidate.current_stage.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <span className="px-2 py-1 bg-background border border-border rounded-[10px] text-xs font-medium">
                        {candidate.source || 'Direct'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user?.role as string) ? (
                        <button
                          type="button"
                          className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors rounded-[10px] focus:outline-none"
                          onClick={(e) => { e.stopPropagation(); setCandidateToDelete(candidate); }}
                          title="Delete Candidate"
                        >
                          <Trash className="w-4 h-4" strokeWidth={2} />
                        </button>
                      ) : (
                        <span className="text-text-secondary/50 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!candidateToDelete}
        onClose={() => setCandidateToDelete(null)}
        title="Delete Candidate"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to permanently delete <strong>{candidateToDelete?.full_name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button variant="ghost" onClick={() => setCandidateToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteCandidate} isLoading={isDeleting}>
              Delete Candidate
            </Button>
          </div>
        </div>
      </Modal>

      <AddCandidateForm
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => fetchCandidatesList()}
      />
    </>
  );
}
