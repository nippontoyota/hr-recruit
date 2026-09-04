import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getCandidates } from '../../api/candidates';
import type { Candidate, PipelineStage } from '../../types';
import { extractError, isAbortError } from '../../lib/utils';
import { emptyCandidateListQuery, type CandidateListQueryState } from '../../lib/candidateListQuery';

export function useCandidatesList(initialPage = 1, initialLimit = 50) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | ''>('');
  const [advancedQuery, setAdvancedQuery] = useState<CandidateListQueryState>(emptyCandidateListQuery);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const refetch = useCallback(async (signal?: AbortSignal) => {
    if (!loadedRef.current) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await getCandidates(page, limit, {
        ...advancedQuery,
        search: debouncedSearch,
        stages: stageFilter ? [stageFilter] : advancedQuery.stages,
      }, signal);
      if (signal?.aborted) return;
      setCandidates(res.data);
      setTotalCount(res.total_count);
      setLoadError(null);
      loadedRef.current = true;
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) return;
      const message = extractError(err, 'Failed to load candidates');
      if (!message) return;
      setLoadError(message);
      if (!loadedRef.current) {
        setCandidates([]);
        setTotalCount(0);
      }
      toast.error(message);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, limit, debouncedSearch, stageFilter, advancedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    void refetch(controller.signal);
    return () => controller.abort();
  }, [refetch]);

  return {
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
    activeFilterCount: [searchQuery, stageFilter, advancedQuery.stages.length, advancedQuery.offerStatuses.length, advancedQuery.branches.length, advancedQuery.sources.length, advancedQuery.position, advancedQuery.nextActions.length, advancedQuery.createdDate, advancedQuery.sentDate].filter(Boolean).length,
    limit,
    refetch,
  };
}
