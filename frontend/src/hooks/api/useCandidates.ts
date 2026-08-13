import { useState, useCallback, useEffect } from 'react';
import { getCandidates, deleteCandidate, bulkDeleteCandidates, unholdCandidate } from '../../api/candidates';
import { useAsync } from './useAsync';
import type { Candidate, PipelineStage } from '../../types';
import { toast } from 'sonner';

export function useCandidatesList(initialPage = 1, limit = 50) {
  const [page, setPage] = useState(initialPage);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | ''>('');

  const { data, loading, error, execute: fetchCandidates } = useAsync(
    () => getCandidates(page, limit, searchQuery, stageFilter),
    { immediate: false }
  );

  // Fetch when dependencies change
  useEffect(() => {
    fetchCandidates();
  }, [page, limit, searchQuery, stageFilter, fetchCandidates]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, stageFilter]);

  const removeCandidateLocally = useCallback((id: string) => {
    // We can't mutate `data` directly easily since it's {data, total_count}
    // Easiest is just to refetch for accuracy of pagination.
    fetchCandidates();
  }, [fetchCandidates]);

  return {
    candidates: data?.data || [],
    totalCount: data?.total_count || 0,
    loading,
    error,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    stageFilter,
    setStageFilter,
    limit,
    refetch: fetchCandidates,
    removeCandidateLocally
  };
}
