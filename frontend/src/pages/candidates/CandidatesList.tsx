import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button, Modal, LoadingSpinner, EmptyState, Badge } from '../../components/ui';
import { Plus,  RefreshCw, Trash, Search, X, CheckSquare, Square, Minus, Play } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getCandidates, deleteCandidate, bulkDeleteCandidates, unholdCandidate } from '../../api/candidates';
import { getStageBadgeVariant, stageLabel, formatSource } from '../../lib/stages';
import type { Candidate, PipelineStage } from '../../types';
import { AddCandidateForm } from '../../components/candidates/AddCandidateForm';
import { ResumeButton } from '../../components/candidates/ResumeButton';
import { toast } from 'sonner';
import { cn, extractError } from '../../lib/utils';

const PIPELINE_STAGES: PipelineStage[] = [
  'SCREENING', 'CANDIDATE_FORM', 'BRANCH_INTERVIEW',
  'TEST', 'FINAL_APPROVAL', 'HIRED', 'REJECTED', 'ON_HOLD',
];

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Simple global cache to allow stale-while-revalidate (instant loading)
let candidatesCache: Candidate[] = [];

export default function CandidatesList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canDelete = ['SUPER_ADMIN', 'HR'].includes(user?.role as string);

  // Data
  const [candidates, setCandidates] = useState<Candidate[]>(candidatesCache);
  const [loading, setLoading] = useState(candidatesCache.length === 0);
  const [resumingId, setResumingId] = useState<string | null>(null);
  

  // Filters
  const location = useLocation();
  const activeTab = location.pathname === '/updates' ? 'UPDATES' : 'ALL';
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | ''>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CURRENT' | 'ON_HOLD' | 'REJECTED'>('ALL');

  // Single delete
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Add form
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchCandidatesList = useCallback(async (showLoading = true) => {
    try {
      if (showLoading && candidatesCache.length === 0) setLoading(true);
      const list = await getCandidates();
      candidatesCache = list;
      setCandidates(list);
    } catch (err) {
      console.error('Failed to load candidates', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidatesList(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchCandidatesList(false);
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [fetchCandidatesList]);

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()); }, [searchQuery, stageFilter, statusFilter]);

  const filteredCandidates = candidates.filter((c) => {
    if (activeTab === 'UPDATES') {
      if (c.current_stage === 'CANDIDATE_FORM' && c.pre_form_status === 'SUBMITTED') return true;
      if (c.current_stage === 'BRANCH_INTERVIEW' && !c.has_resume) return true;
      return false;
    }

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.candidate_id && c.candidate_id.toLowerCase().includes(q));
    const matchesStage = !stageFilter || c.current_stage === stageFilter;
    
    const matchesStatus = 
      statusFilter === 'ALL' ? true :
      statusFilter === 'CURRENT' ? !['REJECTED', 'ON_HOLD', 'HIRED'].includes(c.current_stage) :
      statusFilter === 'ON_HOLD' ? c.current_stage === 'ON_HOLD' :
      statusFilter === 'REJECTED' ? c.current_stage === 'REJECTED' : true;
      
    return matchesSearch && matchesStage && matchesStatus;
  });

  // Select-all derived state
  const allVisibleIds = filteredCandidates.map((c) => c.id);
  const selectedVisibleCount = allVisibleIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = allVisibleIds.length > 0 && selectedVisibleCount === allVisibleIds.length;
  const someSelected = selectedVisibleCount > 0 && !allSelected;

  function toggleSelectAll() {
    if (allSelected) {
      // Deselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all visible
      setSelectedIds((prev) => new Set([...prev, ...allVisibleIds]));
    }
  }

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Single delete
  const handleDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCandidate(candidateToDelete.id);
      setCandidateToDelete(null);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(candidateToDelete.id); return n; });
      await fetchCandidatesList();
      toast.success('Candidate deleted successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete candidate.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnhold = async (candidate: Candidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setResumingId(candidate.id);
    try {
      await unholdCandidate(candidate.id, 'Resumed from candidates list');
      toast.success(`${candidate.full_name} resumed to previous stage`);
      await fetchCandidatesList();
    } catch (err: any) {
      toast.error(extractError(err, 'Failed to resume candidate'));
    } finally {
      setResumingId(null);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    const ids = [...selectedIds];
    
    try {
      const { success_count, failed_ids } = await bulkDeleteCandidates(ids);
      
      await fetchCandidatesList();
      // Keep failed ones selected so HR can retry
      setSelectedIds(new Set(failed_ids));
      setShowBulkDeleteConfirm(false);
      
      if (failed_ids.length === 0) {
        toast.success(`${success_count} candidate${success_count > 1 ? 's' : ''} deleted`);
      } else {
        toast.error(`${success_count} deleted, ${failed_ids.length} failed — still selected`);
      }
    } catch (err) {
      toast.error(extractError(err, 'Failed to bulk delete candidates'));
    } finally {
      setIsBulkDeleting(false);
    }
  };


  return (
    <>
      <PageHeader
        title={activeTab === 'UPDATES' ? 'Updates' : 'Candidates'}
        description={activeTab === 'UPDATES' ? 'Candidates needing your attention' : 'All applicants linked to your recruiter profile. Click a row to open the full profile and manage pipeline stages.'}
        action={
          <div className="flex gap-3">
            <Button onClick={() => setIsAddOpen(true)}>
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
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Register Candidate
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">

          {/* ── Search + Filter bar ── */}
          <div className="flex flex-wrap items-center gap-3 px-1 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            >
              <option value="ALL">All Status</option>
              <option value="CURRENT">Current Candidates</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as PipelineStage | '')}
              className="h-9 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
            >
              <option value="">All stages</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>{stageLabel(s)}</option>
              ))}
            </select>

            {(searchQuery || stageFilter || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setStageFilter(''); setStatusFilter('ALL'); }}
                className="text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-2"
              >
                Clear filters
              </button>
            )}

            <span className="ml-auto text-xs text-muted-foreground font-medium">
              {filteredCandidates.length} of {candidates.length}
            </span>
          </div>

          {/* ── Table ── */}
          <div className="page-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr>
                    {/* Select-all checkbox */}
                    <th className="w-10 px-3">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        title={allSelected ? 'Deselect all' : 'Select all visible'}
                      >
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : someSelected ? (
                          <Minus className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th>Candidate</th>
                    <th>Position</th>
                    <th>Stage</th>
                    <th>Source</th>
                    <th>Date Added</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                        No candidates match your search.
                      </td>
                    </tr>
                  ) : filteredCandidates.map((candidate) => {
                    const isSelected = selectedIds.has(candidate.id);
                    const isOnHold = candidate.current_stage === 'ON_HOLD';
                    return (
                      <tr
                        key={candidate.id}
                        onClick={() => navigate(`/candidates/${candidate.id}`)}
                        className={cn(
                          "group border-b border-border transition-colors hover:bg-muted/50 cursor-pointer",
                          isSelected ? "bg-primary/5" : isOnHold ? "bg-warning/5 hover:bg-warning/10" : ""
                        )}
                      >
                        {/* Row checkbox */}
                        <td className="w-10 px-3" onClick={(e) => toggleSelect(candidate.id, e)}>
                          <div className="flex items-center justify-center">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                            )}
                          </div>
                        </td>

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
                          <Badge variant={getStageBadgeVariant(candidate.current_stage)} className="font-semibold px-2.5 py-0.5 rounded-lg">
                            {stageLabel(candidate.current_stage)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          <span className="px-2 py-1 bg-background border border-border rounded-[10px] text-xs font-medium">
                            {formatSource(candidate.source)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-medium">
                          {formatDate(candidate.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <ResumeButton
                              candidateId={candidate.id}
                              candidateName={candidate.full_name}
                              hasResume={candidate.has_resume}
                              variant="icon"
                              onClick={(e) => e.stopPropagation()}
                            />
                            {isOnHold && (
                              <button
                                type="button"
                                className="p-1.5 text-warning hover:text-white hover:bg-warning transition-colors rounded-[10px] focus:outline-none flex items-center justify-center"
                                onClick={(e) => handleUnhold(candidate, e)}
                                disabled={resumingId === candidate.id}
                                title="Remove from hold"
                              >
                                {resumingId === candidate.id ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current" strokeWidth={2} />
                                )}
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors rounded-[10px] focus:outline-none"
                                onClick={(e) => { e.stopPropagation(); setCandidateToDelete(candidate); }}
                                title="Delete Candidate"
                              >
                                <Trash className="w-4 h-4" strokeWidth={2} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center gap-3 bg-foreground text-background rounded-2xl shadow-2xl px-5 py-3 border border-border/10">
            {/* Count + deselect */}
            <span className="text-sm font-bold tabular-nums">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-background/60 hover:text-background font-medium underline underline-offset-2 transition-colors"
            >
              Clear
            </button>

            <div className="h-4 w-px bg-background/20" />

            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="h-8 px-4 gap-2 bg-danger hover:bg-danger/90 text-white border-0 shadow-none"
              >
                <Trash className="w-3.5 h-3.5" />
                Delete {selectedIds.size > 1 ? `${selectedIds.size} candidates` : 'candidate'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Single delete modal ── */}
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

      {/* ── Bulk delete confirmation modal ── */}
      <Modal
        isOpen={showBulkDeleteConfirm}
        onClose={() => !isBulkDeleting && setShowBulkDeleteConfirm(false)}
        title={`Delete ${selectedIds.size} candidate${selectedIds.size > 1 ? 's' : ''}?`}
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-secondary">
            This will permanently delete <strong>{selectedIds.size}</strong> candidate record{selectedIds.size > 1 ? 's' : ''} and all associated data. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button variant="ghost" onClick={() => setShowBulkDeleteConfirm(false)} disabled={isBulkDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDelete} isLoading={isBulkDeleting}>
              Delete {selectedIds.size} {selectedIds.size > 1 ? 'Candidates' : 'Candidate'}
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
