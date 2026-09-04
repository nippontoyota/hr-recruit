import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button, Modal, LoadingSpinner, EmptyState, Badge } from '../../components/ui';
import { Plus, RefreshCw, Trash, CheckSquare, Square, Minus, Play, Users, Download, ArrowDown, ArrowUp } from 'lucide-react';
import { useAuth } from '../../auth';
import { deleteCandidate, bulkDeleteCandidates, unholdCandidate, downloadCandidatesCsv } from '../../api/candidates';
import { getStageBadgeVariant, stageLabel, formatSource, isCandidateQueue, matchesQueue, type CandidateQueue } from '../../lib/stages';
import type { Candidate } from '../../types';
import { PIPELINE_STAGES, HO_PIPELINE_STAGES, HO_POST_SEND_STAGES } from '../../types';
import { AddCandidateForm } from '../../components/candidates/AddCandidateForm';
import { ResumeButton } from '../../components/candidates/ResumeButton';
import { SalarySheetUpload } from '../../components/candidates/SalarySheetUpload';
import { RecentOpeningsCard } from '../../components/candidates/RecentOpeningsCard';
import { CandidateFilters } from '../../components/candidates/CandidateFilters';
import { WorkQueueSummary } from '../../components/candidates/WorkQueueSummary';
import { cn, extractError } from '../../lib/utils';
import { formatDateDmy } from '../../lib/dateTime';
import { getCandidateWorkState } from '../../lib/candidateWork';
import { useCandidatesList } from '../../hooks/api/useCandidates';
import { toast } from 'sonner';
import { CandidateTableFilter } from '../../components/candidates/CandidateTableFilter';
import { cycleSort, type CandidateSortField } from '../../lib/candidateListQuery';

function CandidatesTableSkeleton() {
  return (
    <div className="page-card overflow-hidden" aria-hidden="true">
      <div className="divide-y divide-border">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3.5">
            <div className="skeleton h-4 w-4" />
            <div className="skeleton h-4 w-40" />
            <div className="skeleton hidden h-4 w-28 sm:block" />
            <div className="skeleton h-5 w-24" />
            <div className="skeleton ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HeaderSort({ label, field, query, onSort }: { label: string; field: CandidateSortField; query: { sortBy: string; sortDirection: 'asc' | 'desc' }; onSort: () => void }) {
  const active = query.sortBy === field;
  return <button type="button" onClick={(event) => { event.stopPropagation(); onSort(); }} className="inline-flex items-center gap-1 font-semibold hover:text-primary" aria-label={`Sort by ${label}`} aria-sort={active ? (query.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
    {label}{active && (query.sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
  </button>;
}


export default function CandidatesList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedQueue: CandidateQueue | '' = isCandidateQueue(searchParams.get('queue')) ? searchParams.get('queue') as CandidateQueue : '';
  const { user } = useAuth();
  const canRegister = user?.role === 'LOCAL_HR';
  const canExport = user?.role === 'HO_HR' || user?.role === 'ADMIN';
  const canDelete = ['ADMIN', 'HO_HR', 'LOCAL_HR'].includes(user?.role as string);
  const isLocalHrLocked = (c: Candidate) =>
    user?.role === 'LOCAL_HR' && (HO_POST_SEND_STAGES.includes(c.current_stage) || !!c.handed_over_to_ho);

  // Data & Filters from hook
  const {
    candidates,
    totalCount,
    loading,
    refreshing,
    loadError,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    stageFilter,
    setStageFilter,
    advancedQuery,
    setAdvancedQuery,
    activeFilterCount,
    limit,
    refetch: fetchCandidatesList
  } = useCandidatesList(1, 50);

  const [resumingId, setResumingId] = useState<string | null>(null);

  // Single delete
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Add form
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const setAdvanced = (update: Partial<typeof advancedQuery>) => {
    setAdvancedQuery((previous) => ({ ...previous, ...update }));
    setPage(1);
  };

  const handleCsvExport = async () => {
    setIsExporting(true);
    try {
      const blob = await downloadCandidatesCsv({
        ...advancedQuery,
        search: searchQuery,
        stages: stageFilter ? [stageFilter] : advancedQuery.stages,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nippon-toyota-candidates.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Candidate CSV downloaded');
    } catch (error) {
      toast.error(extractError(error, 'Could not download candidates CSV'));
    } finally {
      setIsExporting(false);
    }
  };

  // Clear selection when filters change
  useEffect(() => { setSelectedIds(new Set()); }, [searchQuery, stageFilter, selectedQueue]);

  function setQueue(queue: CandidateQueue | '') {
    const next = new URLSearchParams(searchParams);
    if (queue) next.set('queue', queue);
    else next.delete('queue');
    setSearchParams(next);
  }

  // The backend filters and paginates; queue filtering is derived from the loaded page.
  const filteredCandidates = useMemo(
    () => selectedQueue ? candidates.filter((candidate) => matchesQueue(candidate, selectedQueue)) : candidates,
    [candidates, selectedQueue]
  );

  // Select-all derived state
  const allVisibleIds = useMemo(() => filteredCandidates.map((c) => c.id), [filteredCandidates]);
  const selectedVisibleCount = useMemo(() => allVisibleIds.filter((id) => selectedIds.has(id)).length, [allVisibleIds, selectedIds]);
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
        toast.error(`${success_count} deleted, ${failed_ids.length} failed. Still selected.`);
      }
    } catch (err) {
      toast.error(extractError(err, 'Failed to bulk delete candidates'));
    } finally {
      setIsBulkDeleting(false);
    }
  };


  const filtersActive = Boolean(searchQuery || stageFilter || selectedQueue || activeFilterCount);
  const showEmptyRoster = !loading && !loadError && candidates.length === 0 && !filtersActive;
  const noMatches = !loading && !loadError && candidates.length > 0 && filteredCandidates.length === 0;
  const resultSummary = loading
    ? 'Loading candidates'
    : `${filteredCandidates.length} candidate${filteredCandidates.length === 1 ? '' : 's'} shown${totalCount !== filteredCandidates.length && !selectedQueue ? ` of ${totalCount}` : ''}`;

  return (
    <>
      <PageHeader
        title="Candidates"
        action={
          <>
            {canExport && (
              <Button variant="secondary" onClick={() => void handleCsvExport()} disabled={isExporting}>
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Preparing CSV…' : 'Download CSV'}
              </Button>
            )}
            {canRegister && (
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add candidate
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-4">
          <RecentOpeningsCard />

          {['HO_HR', 'ADMIN'].includes(user?.role || '') && (
            <SalarySheetUpload
              variant="banner"
              onDone={() => void fetchCandidatesList()}
            />
          )}

          <WorkQueueSummary
            candidates={candidates}
            selectedQueue={selectedQueue}
            onQueueChange={setQueue}
          />
          <CandidateFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            stageFilter={stageFilter}
            onStageChange={(value) => { setAdvancedQuery((previous) => ({ ...previous, stages: [] })); setStageFilter(value); setPage(1); }}
            stages={PIPELINE_STAGES.filter((stage) => user?.role === 'HO_HR' || user?.role === 'ADMIN'
              ? HO_PIPELINE_STAGES.includes(stage) || stage === 'REJECTED'
              : true)}
            hasActiveFilters={filtersActive}
            onClear={() => { setSearchQuery(''); setStageFilter(''); setAdvancedQuery((previous) => ({ ...previous, stages: [], offerStatuses: [], branches: [], sources: [], position: '', nextActions: [], createdDate: '', sentDate: '' })); setQueue(''); setPage(1); }}
          />
          <p className="px-1 text-xs text-muted-foreground" aria-live="polite">{resultSummary}</p>
          <div className="sr-only" aria-live="polite">{loading ? 'Loading candidates.' : `${filteredCandidates.length} candidates available.`}</div>

          {loading && candidates.length === 0 ? (
            <div role="status" aria-label="Loading candidates">
              <CandidatesTableSkeleton />
              <span className="sr-only">Loading candidates</span>
            </div>
          ) : loadError && candidates.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="Could not load candidates"
                description={loadError}
                icon={<RefreshCw className="w-8 h-8 opacity-50" />}
                action={
                  <Button onClick={() => void fetchCandidatesList()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Try again
                  </Button>
                }
              />
            </div>
          ) : showEmptyRoster ? (
            <div className="py-12">
              <EmptyState
                title="No candidates yet"
                description={
                  canRegister
                    ? 'No candidates have applied or been registered under your recruiter profile yet.'
                    : 'No Head Office candidates yet. Salary sheets apply after HO interviews.'
                }
                icon={<Users className="w-8 h-8 opacity-50" />}
                action={
                  canRegister ? (
                  <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Register candidate
                  </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
          <div className={cn('page-card overflow-hidden', refreshing && 'opacity-60 pointer-events-none')}>
            <div className="overflow-x-auto">
              <table className="data-table w-full min-w-245 text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr>
                    {/* Select-all checkbox */}
                    <th className="w-10 px-3">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={allSelected ? 'Deselect all visible candidates' : 'Select all visible candidates'}
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
                    <th><HeaderSort label="Candidate" field="full_name" query={advancedQuery} onSort={() => setAdvancedQuery(cycleSort(advancedQuery, 'full_name'))} /><CandidateTableFilter label="Candidate" values={[]} textValue={advancedQuery.search} onChange={() => undefined} onTextChange={(value) => { setSearchQuery(value); setPage(1); }} /></th>
                    <th><HeaderSort label="Position" field="position_applied_for" query={advancedQuery} onSort={() => setAdvancedQuery(cycleSort(advancedQuery, 'position_applied_for'))} /><CandidateTableFilter label="Position" values={[]} onChange={() => undefined} textValue={advancedQuery.position} onTextChange={(value) => setAdvanced({ position: value })} /></th>
                    <th><HeaderSort label="Stage" field="current_stage" query={advancedQuery} onSort={() => setAdvancedQuery(cycleSort(advancedQuery, 'current_stage'))} /><CandidateTableFilter label="Stage" values={advancedQuery.stages} onChange={(values) => { setStageFilter(''); setAdvanced({ stages: values as typeof advancedQuery.stages }); }} options={PIPELINE_STAGES.map((value) => ({ value, label: stageLabel(value) }))} /></th>
                    <th><HeaderSort label="Offer response" field="offer_status" query={advancedQuery} onSort={() => setAdvancedQuery(cycleSort(advancedQuery, 'offer_status'))} /><CandidateTableFilter label="Offer response" values={advancedQuery.offerStatuses} onChange={(values) => setAdvanced({ offerStatuses: values })} options={[{ value: 'SENT', label: 'Pending' }, { value: 'ACCEPTED', label: 'Accepted' }, { value: 'DECLINED', label: 'Rejected' }]} /></th>
                    <th><HeaderSort label="Branch" field="branch_location" query={advancedQuery} onSort={() => setAdvancedQuery(cycleSort(advancedQuery, 'branch_location'))} /><CandidateTableFilter label="Branch" values={advancedQuery.branches} onChange={(values) => setAdvanced({ branches: values })} options={['Trivandrum', 'Kollam', 'Pathanamthitta', 'Kayamkulam', 'Kottayam', 'Muvattupuzha', 'Kalamassery', 'Cochin', 'Thrissur'].map((value) => ({ value, label: value }))} /></th>
                    <th><HeaderSort label="Next action" field="current_stage" query={advancedQuery} onSort={() => setAdvancedQuery(cycleSort(advancedQuery, 'current_stage'))} /><CandidateTableFilter label="Next action" values={advancedQuery.nextActions} onChange={(values) => setAdvanced({ nextActions: values })} options={['Call letter to be sent', 'Call letter issued, waiting for candidate response', 'Review application & schedule interview', 'Review hold', 'Offer sent. Awaiting candidate response', 'Offer accepted. Complete onboarding', 'Offer declined. No further action', 'Continue to offer letter', 'Prepare offer', 'Send to Head Office', 'Complete Head Office interview', 'Complete interviews', 'Complete technical test', 'Complete background verification', 'Advance candidate'].map((value) => ({ value, label: value }))} /></th>
                    <th><HeaderSort label="Source" field="source" query={advancedQuery} onSort={() => setAdvancedQuery(cycleSort(advancedQuery, 'source'))} /><CandidateTableFilter label="Source" values={advancedQuery.sources} onChange={(values) => setAdvanced({ sources: values })} options={['WALK_IN', 'INDEED', 'NAUKRI', 'REFERRAL', 'CAMPUS', 'LINKEDIN', 'OTHER'].map((value) => ({ value, label: formatSource(value) }))} /></th>
                    <th><HeaderSort label="Date added" field="created_at" query={advancedQuery} onSort={() => setAdvancedQuery(cycleSort(advancedQuery, 'created_at'))} /><CandidateTableFilter label="Date added" values={[]} onChange={() => undefined} dateValue={advancedQuery.createdDate} onDateChange={(value) => setAdvanced({ createdDate: value })} /><CandidateTableFilter label="Application form sent" values={[]} onChange={() => undefined} dateValue={advancedQuery.sentDate} onDateChange={(value) => setAdvanced({ sentDate: value })} /></th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {noMatches ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                        No candidates match the selected search, stage, or queue. Try clearing a filter.
                      </td>
                    </tr>
                  ) : filteredCandidates.map((candidate) => {
                    const isSelected = selectedIds.has(candidate.id);
                    const isOnHold = candidate.current_stage === 'ON_HOLD';
                    const workState = getCandidateWorkState(candidate);
                    return (
                      <tr
                        key={candidate.id}
                        onClick={() => navigate(`/candidates/${candidate.id}`)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/candidates/${candidate.id}`);
                          }
                        }}
                        tabIndex={0}
                        aria-label={`Open ${candidate.full_name} candidate profile`}
                        className={cn(
                          'group cursor-pointer border-b border-border transition-colors hover:bg-muted/50 focus:outline-none focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                          isSelected ? 'bg-primary/5' : isOnHold ? 'bg-warning/5 hover:bg-warning/10' : ''
                        )}
                      >
                        {/* Row checkbox */}
                        <td className="w-10 px-3">
                          <button
                            type="button"
                            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${candidate.full_name}`}
                            aria-pressed={isSelected}
                            onClick={(event) => toggleSelect(candidate.id, event)}
                            className="flex items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" aria-hidden="true" />
                            )}
                          </button>
                        </td>

                        <td className="px-4 py-2">
                          <div className="flex flex-col">
                            <a
                              href={`/candidates/${candidate.id}`}
                              onClick={(event) => { event.preventDefault(); event.stopPropagation(); navigate(`/candidates/${candidate.id}`); }}
                              className="font-semibold text-text-primary underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              {candidate.full_name}
                            </a>
                            <span className="text-xs text-text-secondary">{candidate.candidate_id} · +91 {candidate.phone}</span>
                            <details className="mt-1 md:hidden">
                              <summary className="cursor-pointer text-xs font-medium text-primary">Work details</summary>
                              <div className="mt-2 space-y-1 whitespace-normal text-xs text-muted-foreground">
                                <p><span className="font-semibold text-text-secondary">Next:</span> {workState.next_action}</p>
                                <p><span className="font-semibold text-text-secondary">Stage age:</span> {workState.days_in_stage} day{workState.days_in_stage === 1 ? '' : 's'}</p>
                                {workState.blockers.length > 0 && <p><span className="font-semibold text-text-secondary">Blockers:</span> {workState.blockers.join(', ')}</p>}
                              </div>
                            </details>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-text-secondary font-medium">
                          {candidate.position_applied_for || candidate.experience || '-'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant={getStageBadgeVariant(candidate.current_stage)}>
                              {stageLabel(candidate.current_stage)}
                            </Badge>
                            {isLocalHrLocked(candidate) && candidate.current_stage !== 'SENT_TO_HO' && (
                              <span className="text-[11px] font-medium text-info">
                                Sent to HO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {candidate.offer_status === 'ACCEPTED' ? (
                            <Badge variant="success">Accepted</Badge>
                          ) : candidate.offer_status === 'DECLINED' ? (
                            <Badge variant="destructive">Rejected</Badge>
                          ) : candidate.offer_status === 'SENT' ? (
                            <Badge variant="warning">Pending</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-text-secondary font-medium">
                          {candidate.branch_location || '-'}
                        </td>
                        <td className="hidden max-w-64 px-4 py-2 md:table-cell">
                          <div className="flex max-w-64 flex-col gap-1 whitespace-normal">
                            <span className="text-sm font-semibold text-text-primary">{workState.next_action}</span>
                            <span className="text-xs text-muted-foreground">{workState.days_in_stage} day{workState.days_in_stage === 1 ? '' : 's'} in stage</span>
                            {workState.blockers.length > 0 && <span className="text-xs text-amber-700 dark:text-amber-300">Blocked: {workState.blockers.join(', ')}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-text-secondary">
                          <span className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium">
                            {formatSource(candidate.source)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground font-medium">
                          {formatDateDmy(candidate.created_at)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <ResumeButton
                              candidateId={candidate.id}
                              candidateName={candidate.full_name}
                              hasResume={candidate.has_resume}
                              variant="icon"
                              allowReplace={!isLocalHrLocked(candidate)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {isOnHold && !isLocalHrLocked(candidate) && (
                              <button
                                type="button"
                                className="p-1.5 text-warning hover:text-white hover:bg-warning transition-colors rounded-sm focus:outline-none flex items-center justify-center"
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
                            {canDelete && !isLocalHrLocked(candidate) && (
                              <button
                                type="button"
                                className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors rounded-sm focus:outline-none"
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10 text-xs font-medium text-muted-foreground">
              <span>Showing {candidates.length === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} candidates</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button size="sm" variant="secondary" disabled={page * limit >= totalCount} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          </div>
          )}
      </div>

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-5 left-1/2 z-[var(--z-sticky)] -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-md">
            <span className="text-sm font-medium tabular-nums text-text-primary">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-medium text-text-secondary underline underline-offset-2 transition-colors hover:text-text-primary"
            >
              Clear
            </button>

            <div className="h-4 w-px bg-border" />

            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="gap-2"
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
            This permanently deletes <strong>{candidateToDelete?.full_name}</strong>, their resume, activity history, and stage history. This cannot be undone. Use this only when the record must be removed rather than archived.
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
            This permanently deletes <strong>{selectedIds.size}</strong> candidate record{selectedIds.size > 1 ? 's' : ''}, resumes, activity history, and stage history. This cannot be undone. Use this only when the record must be removed rather than archived.
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
